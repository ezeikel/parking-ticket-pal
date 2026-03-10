import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faWandMagicSparkles,
  faRotate,
  faChevronDown,
  faSpinnerThird,
  faCheck,
  faLock,
} from '@fortawesome/pro-solid-svg-icons';
import { faCopy } from '@fortawesome/pro-regular-svg-icons';
import { IssuerType, type Challenge } from '@/types';
import { getChallengeReasons } from '@/constants/challenges';
import { generateChallengeTextApi, saveChallengeTextApi } from '@/api';
import { toast } from '@/lib/toast';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import Loader from '@/components/Loader/Loader';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ChallengeArgumentCardProps = {
  ticketId: string;
  issuerType: IssuerType;
  isPremium: boolean;
  existingChallenge?: Challenge | null;
  onSendLetter?: () => void;
  onAutoChallenge?: () => void;
  onRefresh?: () => void;
  onUpgrade?: () => void;
};

export default function ChallengeArgumentCard({
  ticketId,
  issuerType,
  isPremium,
  existingChallenge,
  onSendLetter,
  onAutoChallenge,
  onRefresh,
  onUpgrade,
}: ChallengeArgumentCardProps) {
  const [challengeText, setChallengeText] = useState(
    existingChallenge?.challengeText || '',
  );
  const [additionalInfo, setAdditionalInfo] = useState(
    existingChallenge?.additionalInfo || '',
  );
  const [reason, setReason] = useState(existingChallenge?.reason || '');
  const [challengeId, setChallengeId] = useState(
    existingChallenge?.id || null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(
    !!existingChallenge?.challengeText,
  );
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(
    !!existingChallenge?.additionalInfo,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reasons = getChallengeReasons(issuerType);
  const reasonEntries = Object.entries(reasons);

  // Debounced auto-save
  const debouncedSave = useCallback(
    (text: string, info?: string) => {
      if (!challengeId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setIsSaving(true);
        try {
          await saveChallengeTextApi(ticketId, challengeId, {
            challengeText: text,
            ...(info !== undefined && { additionalInfo: info }),
          });
        } catch {
          // Silent fail for auto-save
        }
        setIsSaving(false);
      }, 1500);
    },
    [challengeId, ticketId],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!reason) {
      toast.error('Select a reason', 'Please select a challenge reason first');
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateChallengeTextApi(
        ticketId,
        reason,
        additionalInfo || undefined,
      );

      if (result.success && result.data) {
        setChallengeText(result.data.challengeText);
        setChallengeId(result.data.challengeId);
        setHasGenerated(true);
        onRefresh?.();
      } else {
        toast.error(
          'Generation failed',
          result.error || 'Please try again',
        );
      }
    } catch {
      toast.error('Something went wrong', 'Please try again');
    } finally {
      setIsGenerating(false);
    }
  }, [ticketId, reason, additionalInfo, onRefresh]);

  const handleCopy = useCallback(async () => {
    if (!challengeText) return;

    await Clipboard.setStringAsync(challengeText);
    setJustCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setJustCopied(false), 2000);
  }, [challengeText]);

  const toggleAdditionalInfo = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdditionalInfo((prev) => !prev);
  }, []);

  const selectedReasonLabel = reason
    ? reasonEntries.find(([key]) => key === reason)?.[1]?.label
    : null;

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="font-jakarta-semibold text-lg text-dark">
          Challenge Argument
        </Text>
        <View className="flex-row items-center">
          {isSaving && (
            <Text className="font-jakarta text-xs text-gray mr-2">
              Saving...
            </Text>
          )}
          {challengeText ? (
            <SquishyPressable onPress={handleCopy}>
              <View className="flex-row items-center px-2.5 py-1.5 rounded-lg">
                <FontAwesomeIcon
                  icon={justCopied ? faCheck : faCopy}
                  size={14}
                  color={justCopied ? '#00a699' : '#1abc9c'}
                />
                <Text
                  className="font-jakarta-medium text-sm ml-1.5"
                  style={{ color: justCopied ? '#00a699' : '#1abc9c' }}
                >
                  {justCopied ? 'Copied' : 'Copy'}
                </Text>
              </View>
            </SquishyPressable>
          ) : null}
        </View>
      </View>

      {/* Reason selector — only before first generation */}
      {!hasGenerated && (
        <View className="mb-3">
          <Text className="font-jakarta-medium text-xs text-gray mb-2">
            Challenge reason
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-1"
          >
            {reasonEntries.map(([key, value]) => {
              const isSelected = reason === key;
              return (
                <SquishyPressable key={key} onPress={() => setReason(key)}>
                  <View
                    className="mr-2 rounded-lg px-3 py-2 border"
                    style={{
                      borderColor: isSelected ? '#1abc9c' : '#e2e8f0',
                      backgroundColor: isSelected ? '#f0fdf9' : '#ffffff',
                    }}
                  >
                    <Text
                      className="font-jakarta-medium text-xs"
                      style={{ color: isSelected ? '#1abc9c' : '#717171' }}
                      numberOfLines={1}
                    >
                      {value.label}
                    </Text>
                  </View>
                </SquishyPressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Selected reason label (after generation) */}
      {hasGenerated && selectedReasonLabel && (
        <View className="mb-3">
          <View
            className="self-start rounded-lg px-3 py-1.5"
            style={{ backgroundColor: '#f0fdf9' }}
          >
            <Text
              className="font-jakarta-medium text-xs"
              style={{ color: '#1abc9c' }}
            >
              {selectedReasonLabel}
            </Text>
          </View>
        </View>
      )}

      {/* Main textarea */}
      {isGenerating ? (
        <View
          className="rounded-xl items-center justify-center"
          style={{ backgroundColor: '#f7f7f7', minHeight: 140 }}
        >
          <Loader size={20} />
          <Text className="font-jakarta text-sm text-gray mt-2">
            Generating your argument...
          </Text>
        </View>
      ) : (
        <TextInput
          value={challengeText}
          onChangeText={(text) => {
            setChallengeText(text);
            if (hasGenerated) debouncedSave(text);
          }}
          placeholder="Your challenge argument will appear here after generating..."
          placeholderTextColor="#a0aec0"
          multiline
          editable={hasGenerated}
          textAlignVertical="top"
          className="font-jakarta text-sm text-dark rounded-xl p-3 border border-border"
          style={{
            minHeight: 140,
            backgroundColor: hasGenerated ? '#ffffff' : '#f7f7f7',
          }}
        />
      )}

      {/* Additional information (collapsible) */}
      <SquishyPressable onPress={toggleAdditionalInfo}>
        <View className="flex-row items-center mt-3 mb-1">
          <FontAwesomeIcon
            icon={faChevronDown}
            size={10}
            color="#717171"
            style={{
              transform: [{ rotate: showAdditionalInfo ? '180deg' : '0deg' }],
            }}
          />
          <Text className="font-jakarta-medium text-sm text-gray ml-1.5">
            Additional information
          </Text>
          <Text className="font-jakarta text-xs text-gray ml-1">
            (optional)
          </Text>
        </View>
      </SquishyPressable>

      {showAdditionalInfo && (
        <TextInput
          value={additionalInfo}
          onChangeText={(text) => {
            setAdditionalInfo(text);
            if (hasGenerated && challengeId) {
              debouncedSave(challengeText, text);
            }
          }}
          placeholder="E.g. 'I was loading disabled passengers', 'the meter was broken'..."
          placeholderTextColor="#a0aec0"
          multiline
          textAlignVertical="top"
          className="font-jakarta text-sm text-dark rounded-xl p-3 border border-border mt-2"
          style={{ minHeight: 80, backgroundColor: '#ffffff' }}
        />
      )}

      {/* Generate / Regenerate button */}
      {isPremium ? (
        <SquishyPressable
          onPress={handleGenerate}
          disabled={isGenerating || (!reason && !hasGenerated)}
        >
          <View
            className="flex-row items-center justify-center rounded-xl py-3 mt-4"
            style={{
              backgroundColor:
                isGenerating || (!reason && !hasGenerated)
                  ? '#e2e8f0'
                  : '#1abc9c',
            }}
          >
            {isGenerating ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  size={16}
                  color="#ffffff"
                />
                <Text className="font-jakarta-semibold text-sm text-white ml-2">
                  Generating...
                </Text>
              </>
            ) : hasGenerated ? (
              <>
                <FontAwesomeIcon icon={faRotate} size={16} color="#ffffff" />
                <Text className="font-jakarta-semibold text-sm text-white ml-2">
                  Regenerate
                </Text>
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faWandMagicSparkles}
                  size={16}
                  color={!reason ? '#a0aec0' : '#ffffff'}
                />
                <Text
                  className="font-jakarta-semibold text-sm ml-2"
                  style={{ color: !reason ? '#a0aec0' : '#ffffff' }}
                >
                  Generate Argument
                </Text>
              </>
            )}
          </View>
        </SquishyPressable>
      ) : (
        <SquishyPressable onPress={onUpgrade}>
          <View
            className="flex-row items-center justify-center rounded-xl py-3.5 mt-4"
            style={{ backgroundColor: '#1abc9c' }}
          >
            <FontAwesomeIcon
              icon={faLock}
              size={14}
              color="#ffffff"
              style={{ marginRight: 8 }}
            />
            <Text className="font-jakarta-semibold text-sm text-white">
              Upgrade to Challenge Ticket
            </Text>
          </View>
        </SquishyPressable>
      )}

      {/* Secondary actions */}
      {hasGenerated && challengeText ? (
        <View className="flex-row items-center justify-center mt-4 pt-4 border-t border-border">
          <Text className="font-jakarta text-xs text-gray mr-3">
            Use this text:
          </Text>
          {onSendLetter && (
            <SquishyPressable onPress={onSendLetter}>
              <Text
                className="font-jakarta-medium text-sm"
                style={{ color: '#1abc9c' }}
              >
                Send as Letter
              </Text>
            </SquishyPressable>
          )}
          {onSendLetter && onAutoChallenge && (
            <Text className="font-jakarta text-xs text-gray mx-2">|</Text>
          )}
          {onAutoChallenge && (
            <SquishyPressable onPress={onAutoChallenge}>
              <Text
                className="font-jakarta-medium text-sm"
                style={{ color: '#1abc9c' }}
              >
                Auto-Submit
              </Text>
            </SquishyPressable>
          )}
        </View>
      ) : null}
    </View>
  );
}
