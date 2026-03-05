import { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronDown, faChevronUp, faLightbulb } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { PredictionData, ChallengeWizardData } from '../types';
import { PATTERN_TO_REASON } from '../types';

type DetailsStepProps = {
  wizardData: ChallengeWizardData;
  prediction?: PredictionData;
  onNext: (updates: Pick<ChallengeWizardData, 'additionalDetails'>) => void;
  onChangeDetails: (text: string) => void;
};

const REASON_PLACEHOLDERS: Record<string, string> = {
  CONTRAVENTION_DID_NOT_OCCUR: 'Describe why the contravention did not occur (e.g. you were loading, had a valid permit, etc.)...',
  NOT_VEHICLE_OWNER: 'Provide details about when you sold or transferred the vehicle...',
  VEHICLE_STOLEN: 'Describe the circumstances and when you reported the vehicle stolen...',
  HIRE_FIRM: 'Provide the hirer details and hire agreement reference...',
  EXCEEDED_AMOUNT: 'Explain why you believe the penalty amount is incorrect...',
  ALREADY_PAID: 'Provide your payment reference and date of payment...',
  INVALID_TMO: 'Explain why you believe the Traffic Management Order is invalid...',
  PROCEDURAL_IMPROPRIETY: 'Describe the procedural error (e.g. incorrect details on the PCN, notice not properly served)...',
  NO_BREACH_CONTRACT: 'Explain why no breach of the parking terms occurred...',
  UNCLEAR_SIGNAGE: 'Describe the signage issues you observed at the location...',
  BROKEN_EQUIPMENT: 'Describe which equipment was faulty and when you noticed...',
  MITIGATING_CIRCUMSTANCES: 'Describe the emergency or exceptional circumstance...',
  EXCESSIVE_CHARGE: 'Explain why you believe the charge is not a genuine pre-estimate of loss...',
};

const DetailsStep = ({ wizardData, prediction, onNext, onChangeDetails }: DetailsStepProps) => {
  const [showAvoidSection, setShowAvoidSection] = useState(false);

  const placeholder = REASON_PLACEHOLDERS[wizardData.selectedReason] ||
    'Add any extra context that supports your challenge...';

  // Get contextual winning/losing tips based on selected reason and prediction data
  const { winningTips, losingTips } = useMemo(() => {
    if (!prediction?.metadata) return { winningTips: [] as string[], losingTips: [] as string[] };

    const { winningPatterns = [], losingPatterns = [] } = prediction.metadata;

    // Find winning patterns that map to the selected reason
    const relevantWinning = winningPatterns
      .filter((p) => PATTERN_TO_REASON[p.pattern] === wizardData.selectedReason)
      .map((p) => p.pattern.replace(/_/g, ' ').toLowerCase());

    // Find losing patterns that map to the selected reason
    const relevantLosing = losingPatterns
      .filter((p) => PATTERN_TO_REASON[p.pattern] === wizardData.selectedReason)
      .map((p) => p.pattern.replace(/_/g, ' ').toLowerCase());

    return { winningTips: relevantWinning, losingTips: relevantLosing };
  }, [prediction, wizardData.selectedReason]);

  const handleContinue = () => {
    onNext({ additionalDetails: wizardData.additionalDetails });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Contextual guidance */}
      {winningTips.length > 0 && (
        <View className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#F0FDF9' }}>
          <View className="flex-row items-center mb-2">
            <FontAwesomeIcon icon={faLightbulb} size={14} color="#1ABC9C" />
            <Text className="font-jakarta-semibold text-sm ml-2" style={{ color: '#1ABC9C' }}>
              Tips for a stronger case
            </Text>
          </View>
          <Text className="font-jakarta text-sm text-gray-700">
            For this type of contravention, successful challenges often mention:{' '}
            <Text className="font-jakarta-semibold">{winningTips.join(', ')}</Text>
          </Text>
        </View>
      )}

      {/* Losing patterns (collapsed by default) */}
      {losingTips.length > 0 && (
        <View className="mb-4">
          <Pressable
            onPress={() => setShowAvoidSection(!showAvoidSection)}
            className="flex-row items-center"
          >
            <Text className="font-jakarta-medium text-sm text-amber-600">
              Arguments to avoid
            </Text>
            <FontAwesomeIcon
              icon={showAvoidSection ? faChevronUp : faChevronDown}
              size={10}
              color="#D97706"
              style={{ marginLeft: 6 }}
            />
          </Pressable>
          {showAvoidSection && (
            <View className="rounded-xl bg-amber-50 p-4 mt-2">
              <Text className="font-jakarta text-sm text-amber-800">
                These arguments tend to lose for similar cases: {losingTips.join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Additional Details Input */}
      <View className="mb-6">
        <Text className="text-sm font-jakarta-semibold text-gray-700 mb-2">
          Additional Details (Optional)
        </Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 bg-white text-gray-900 min-h-[120px]"
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          value={wizardData.additionalDetails}
          onChangeText={onChangeDetails}
        />
        <Text className="text-xs text-gray-500 mt-2">
          Just jot down the key facts — your letter will be professionally written for you
        </Text>
      </View>

      {/* Continue Button */}
      <SquishyPressable onPress={handleContinue}>
        <View className="rounded-lg p-4 items-center justify-center bg-dark">
          <Text className="text-white font-jakarta-semibold text-base">Continue</Text>
        </View>
      </SquishyPressable>

      <View className="h-8" />
    </ScrollView>
  );
};

export default DetailsStep;
