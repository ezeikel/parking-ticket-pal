import { View, Text, ScrollView } from 'react-native';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import ScoreGauge from '@/components/ScoreGauge/ScoreGauge';
import Loader from '@/components/Loader/Loader';
import type { PredictionData, ChallengeWizardData } from '../types';

type ReviewStepProps = {
  wizardData: ChallengeWizardData;
  prediction?: PredictionData;
  isLoading: boolean;
  onGenerate: () => void;
};

const ReviewStep = ({ wizardData, prediction, isLoading, onGenerate }: ReviewStepProps) => {
  const hasPrediction = prediction && prediction.numberOfCases > 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Summary Card */}
      <View className="rounded-xl border-2 border-gray-200 p-4 mb-4">
        <Text className="font-jakarta-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">
          Your Challenge
        </Text>

        <View className="mb-3">
          <Text className="font-jakarta text-xs text-gray-400 mb-0.5">Reason</Text>
          <Text className="font-jakarta-semibold text-base text-gray-900">
            {wizardData.selectedReasonLabel}
          </Text>
        </View>

        {wizardData.additionalDetails.length > 0 && (
          <View className="mb-3">
            <Text className="font-jakarta text-xs text-gray-400 mb-0.5">Additional details</Text>
            <Text className="font-jakarta text-sm text-gray-700">
              {wizardData.additionalDetails}
            </Text>
          </View>
        )}

        {/* Score Gauge */}
        {hasPrediction && (
          <View className="items-center pt-3 border-t border-gray-100">
            <ScoreGauge score={prediction.percentage} size="sm" showLabel />
            <Text className="font-jakarta text-xs text-gray-500 mt-1">
              Success prediction
            </Text>
          </View>
        )}
      </View>

      {/* Tribunal data note */}
      {hasPrediction && (
        <Text className="font-jakarta text-xs text-gray-500 text-center mb-4">
          Your letter will be crafted using data from {prediction.numberOfCases.toLocaleString()} similar tribunal cases
        </Text>
      )}

      {/* Generate Button */}
      <SquishyPressable onPress={onGenerate} disabled={isLoading}>
        <View
          className={`rounded-lg p-4 items-center justify-center ${
            isLoading ? 'bg-dark/70' : 'bg-dark'
          }`}
        >
          {isLoading ? (
            <View className="flex-row items-center">
              <Loader size={20} color="#ffffff" />
              <Text className="text-white font-jakarta-semibold ml-2">Generating...</Text>
            </View>
          ) : (
            <Text className="text-white font-jakarta-semibold text-base">
              Generate & Email Letter
            </Text>
          )}
        </View>
      </SquishyPressable>

      <Text className="text-xs text-gray-500 text-center mt-4 mb-8">
        The letter will be emailed to you as a PDF attachment
      </Text>
    </ScrollView>
  );
};

export default ReviewStep;
