import { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faTriangleExclamation } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { IssuerType } from '@/types';
import { getChallengeReasons } from '@/constants/challenges';
import type { PredictionData, ChallengeWizardData } from '../types';
import { PATTERN_TO_REASON } from '../types';

type ReasonStepProps = {
  issuerType: IssuerType;
  prediction?: PredictionData;
  onSelect: (updates: Pick<ChallengeWizardData, 'selectedReason' | 'selectedReasonLabel'>) => void;
};

type ReasonBadge = 'strong' | 'weak' | null;

const ReasonStep = ({ issuerType, prediction, onSelect }: ReasonStepProps) => {
  const challengeReasons = useMemo(() => getChallengeReasons(issuerType), [issuerType]);
  const reasonsArray = useMemo(() => Object.values(challengeReasons), [challengeReasons]);

  // Map patterns to reason IDs for badge display
  const reasonBadges = useMemo(() => {
    const badges: Record<string, ReasonBadge> = {};
    if (!prediction?.metadata) return badges;

    const { winningPatterns = [], losingPatterns = [] } = prediction.metadata;

    // Map winning patterns to reasons
    const strongReasons = new Set<string>();
    for (const wp of winningPatterns) {
      const reasonId = PATTERN_TO_REASON[wp.pattern];
      if (reasonId) strongReasons.add(reasonId);
    }

    // Map losing patterns to reasons
    const weakReasons = new Set<string>();
    for (const lp of losingPatterns) {
      const reasonId = PATTERN_TO_REASON[lp.pattern];
      if (reasonId) weakReasons.add(reasonId);
    }

    for (const reason of reasonsArray) {
      if (strongReasons.has(reason.id)) {
        badges[reason.id] = 'strong';
      } else if (weakReasons.has(reason.id)) {
        badges[reason.id] = 'weak';
      }
    }

    return badges;
  }, [prediction, reasonsArray]);

  const handleSelect = (reason: { id: string; label: string }) => {
    onSelect({ selectedReason: reason.id, selectedReasonLabel: reason.label });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text className="font-jakarta text-sm text-gray-500 mb-6">
        Select the reason that best matches your situation.
      </Text>

      <View className="gap-y-2 pb-8">
        {reasonsArray.map((reason) => {
          const badge = reasonBadges[reason.id];
          return (
            <SquishyPressable
              key={reason.id}
              onPress={() => handleSelect(reason)}
              className="rounded-xl border-2 border-gray-200 p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-jakarta-semibold text-base text-gray-900 flex-1 mr-2">
                  {reason.label}
                </Text>
                {badge === 'strong' && (
                  <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: '#E6FAF5' }}>
                    <FontAwesomeIcon icon={faCheck} size={10} color="#1ABC9C" />
                    <Text className="font-jakarta-medium text-xs ml-1" style={{ color: '#1ABC9C' }}>
                      Strong
                    </Text>
                  </View>
                )}
                {badge === 'weak' && (
                  <View className="flex-row items-center rounded-full bg-amber-50 px-2.5 py-1">
                    <FontAwesomeIcon icon={faTriangleExclamation} size={10} color="#D97706" />
                    <Text className="font-jakarta-medium text-xs text-amber-600 ml-1">
                      Rarely wins
                    </Text>
                  </View>
                )}
              </View>
              <Text className="font-jakarta text-sm text-gray-500 mt-0.5">
                {reason.description}
              </Text>
            </SquishyPressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default ReasonStep;
