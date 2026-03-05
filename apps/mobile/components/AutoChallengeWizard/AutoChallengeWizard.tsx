import { useState, useCallback } from 'react';
import { View, Text, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark, faRobot, faCircleInfo } from '@fortawesome/pro-regular-svg-icons';
import { faSpinnerThird } from '@fortawesome/pro-solid-svg-icons';
import { IssuerType } from '@/types';
import { getChallengeReasons } from '@/constants/challenges';
import { startAutoChallenge } from '@/api';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';

interface AutoChallengeWizardProps {
  visible: boolean;
  ticketId: string;
  issuerName: string;
  issuerType: IssuerType;
  onSuccess: () => void;
  onClose: () => void;
}

const AutoChallengeWizard = ({
  visible,
  ticketId,
  issuerName,
  issuerType,
  onSuccess,
  onClose,
}: AutoChallengeWizardProps) => {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const challengeReasons = getChallengeReasons(issuerType);

  const resetAndClose = useCallback(() => {
    setSelectedReason(null);
    setCustomReason('');
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      const result = await startAutoChallenge(
        ticketId,
        selectedReason,
        customReason.trim() || undefined,
      );

      if (result.success) {
        toast.success('Challenge Started', result.message);
        setSelectedReason(null);
        setCustomReason('');
        onSuccess();
      } else {
        toast.error('Challenge Failed', result.message);
      }
    } catch (error: any) {
      logger.error(
        'Error starting auto-challenge',
        {
          action: 'auto-challenge',
          screen: 'auto-challenge-wizard',
          ticketId,
        },
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error(
        'Challenge Failed',
        error.response?.data?.error || 'Please try again',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [ticketId, selectedReason, customReason, onSuccess]);

  const selectedReasonData = selectedReason
    ? challengeReasons[selectedReason as keyof typeof challengeReasons]
    : null;

  const canSubmit = selectedReason && !isSubmitting;

  return (
    <Modal
      visible={visible}
      presentationStyle="formSheet"
      animationType="slide"
      onRequestClose={isSubmitting ? undefined : resetAndClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <Pressable onPress={resetAndClose} hitSlop={8} disabled={isSubmitting}>
            <FontAwesomeIcon icon={faXmark} size={20} color="#6B7280" />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <FontAwesomeIcon icon={faRobot} size={16} color="#14b8a6" />
            <Text className="font-jakarta-semibold text-sm text-teal">
              Auto-Submit
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Text className="font-jakarta-bold text-2xl text-gray-900 mb-1">
            Auto-Submit Challenge
          </Text>
          <Text className="font-jakarta text-sm text-gray-500 mb-6">
            We'll submit your challenge to {issuerName} automatically
          </Text>

          {/* Reason Selection */}
          <Text className="font-jakarta-semibold text-sm text-gray-700 mb-3">
            Select your challenge reason
          </Text>

          {Object.entries(challengeReasons).map(([key, reason]) => {
            const isSelected = selectedReason === key;
            return (
              <SquishyPressable
                key={key}
                onPress={() => setSelectedReason(key)}
                className="mb-2"
              >
                <View
                  className={`border rounded-xl p-4 ${
                    isSelected
                      ? 'border-teal bg-teal/5'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-jakarta-semibold ${
                      isSelected ? 'text-teal' : 'text-gray-900'
                    }`}
                  >
                    {reason.label}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {reason.description}
                  </Text>
                </View>
              </SquishyPressable>
            );
          })}

          {/* Additional details (always visible when reason selected) */}
          {selectedReason && (
            <View className="mt-2 mb-4">
              <Text className="font-jakarta-semibold text-sm text-gray-700 mb-2">
                Additional Details (optional)
              </Text>
              <TextInput
                className="border border-gray-200 rounded-xl p-4 text-sm font-jakarta text-gray-900"
                placeholder="Add any specific details about your situation..."
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: 80 }}
              />
            </View>
          )}

          {/* Info box */}
          {selectedReason && (
            <View className="bg-teal/5 rounded-xl p-4 mt-4 mb-4">
              <View className="flex-row items-start gap-3">
                <FontAwesomeIcon icon={faCircleInfo} size={16} color="#14b8a6" />
                <View className="flex-1">
                  <Text className="font-jakarta-semibold text-sm text-gray-900 mb-2">
                    How it works
                  </Text>
                  <Text className="font-jakarta text-xs text-gray-600 leading-5">
                    {'\u2022'} We open the issuer's website{'\n'}
                    {'\u2022'} Fill in your PCN and vehicle details{'\n'}
                    {'\u2022'} Submit your challenge automatically{'\n'}
                    {'\u2022'} You'll receive confirmation when complete
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom CTA */}
        <View
          className="px-6 border-t border-gray-100"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}
        >
          <SquishyPressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            testID="auto-challenge-submit"
          >
            <View
              className={`rounded-xl py-4 flex-row items-center justify-center gap-2 ${
                canSubmit ? 'bg-teal' : 'bg-gray-200'
              }`}
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinnerThird} size={18} color="#FFFFFF" />
                  <Text className="font-jakarta-semibold text-base text-white">
                    Submitting...
                  </Text>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faRobot} size={18} color={canSubmit ? '#FFFFFF' : '#9CA3AF'} />
                  <Text
                    className={`font-jakarta-semibold text-base ${
                      canSubmit ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    Submit Challenge
                  </Text>
                </>
              )}
            </View>
          </SquishyPressable>
        </View>
      </View>
    </Modal>
  );
};

AutoChallengeWizard.displayName = 'AutoChallengeWizard';

export default AutoChallengeWizard;
