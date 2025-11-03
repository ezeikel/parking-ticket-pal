import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Picker } from '@react-native-picker/picker';
import { IssuerType } from '@parking-ticket-pal/types';
import { getChallengeReasons } from '@/constants/challenges';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import Loader from '@/components/Loader/Loader';
import { generateChallengeLetter } from '@/api';

interface ChallengeLetterBottomSheetProps {
  pcnNumber: string;
  issuerType: IssuerType;
  onSuccess: () => void;
}

const ChallengeLetterBottomSheet = forwardRef<BottomSheet, ChallengeLetterBottomSheetProps>(
  ({ pcnNumber, issuerType, onSuccess }, ref) => {
    const snapPoints = useMemo(() => ['75%', '90%'], []);
    const challengeReasons = useMemo(() => getChallengeReasons(issuerType), [issuerType]);
    const reasonsArray = useMemo(() => Object.values(challengeReasons), [challengeReasons]);

    const [selectedReason, setSelectedReason] = useState<string>('');
    const [additionalDetails, setAdditionalDetails] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
      if (!selectedReason) {
        Alert.alert('Required Field', 'Please select a challenge reason');
        return;
      }

      setIsLoading(true);
      try {
        console.log('Generating challenge letter...', { pcnNumber, selectedReason });
        const result = await generateChallengeLetter(pcnNumber, selectedReason, additionalDetails);
        console.log('Challenge letter result:', result);

        // Check if the result indicates success
        if (result && result.success) {
          Alert.alert(
            'Success!',
            'Your challenge letter has been generated and sent to your email address.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Reset form
                  setSelectedReason('');
                  setAdditionalDetails('');
                  onSuccess();
                },
              },
            ]
          );
        } else {
          // API returned but indicated failure
          console.error('Challenge letter generation failed:', result);
          Alert.alert(
            'Error',
            result?.message || 'Failed to generate challenge letter. Please try again.'
          );
        }
      } catch (error: any) {
        console.error('Error generating challenge letter:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        Alert.alert(
          'Error',
          error.response?.data?.error || error.response?.data?.message || 'Failed to generate challenge letter. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 16 }}>
          <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              Generate Challenge Letter
            </Text>
            <Text className="text-sm text-gray-600 mb-6">
              Select a reason and provide any additional details to generate your appeal letter
            </Text>

            {/* Challenge Reason Picker */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Challenge Reason <Text className="text-red-500">*</Text>
              </Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <Picker
                  selectedValue={selectedReason}
                  onValueChange={(itemValue) => setSelectedReason(itemValue)}
                  enabled={!isLoading}
                >
                  <Picker.Item label="Select a reason..." value="" />
                  {reasonsArray.map((reason) => (
                    <Picker.Item key={reason.id} label={reason.label} value={reason.id} />
                  ))}
                </Picker>
              </View>
              {selectedReason && (
                <Text className="text-xs text-gray-500 mt-2">
                  {reasonsArray.find((r) => r.id === selectedReason)?.description}
                </Text>
              )}
            </View>

            {/* Additional Details */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Additional Details (Optional)
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white text-gray-900 min-h-[120px]"
                placeholder="Add any extra context that supports your challenge..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={additionalDetails}
                onChangeText={setAdditionalDetails}
                editable={!isLoading}
              />
              <Text className="text-xs text-gray-500 mt-2">
                This information will be used to strengthen your appeal letter
              </Text>
            </View>

            {/* Generate Button */}
            <SquishyPressable onPress={handleGenerate} disabled={isLoading}>
              <View
                className={`rounded-lg p-4 items-center justify-center ${
                  isLoading ? 'bg-blue-400' : 'bg-blue-600'
                }`}
              >
                {isLoading ? (
                  <View className="flex-row items-center">
                    <Loader size={20} color="#ffffff" />
                    <Text className="text-white font-semibold ml-2">Generating...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-semibold text-base">Generate & Email</Text>
                )}
              </View>
            </SquishyPressable>

            <Text className="text-xs text-gray-500 text-center mt-4 mb-8">
              The letter will be emailed to you as a PDF attachment
            </Text>
          </KeyboardAwareScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

ChallengeLetterBottomSheet.displayName = 'ChallengeLetterBottomSheet';

export default ChallengeLetterBottomSheet;
