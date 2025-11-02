import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FormType, FORM_TYPES } from '@/constants/challenges';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { generateTE7Form, generateTE9Form, generatePE2Form, generatePE3Form } from '@/api';

interface FormsBottomSheetProps {
  pcnNumber: string;
  formType: FormType;
  onSuccess: () => void;
}

const FormsBottomSheet = forwardRef<BottomSheet, FormsBottomSheetProps>(
  ({ pcnNumber, formType, onSuccess }, ref) => {
    const snapPoints = useMemo(() => ['40%', '60%'], []);
    const formInfo = useMemo(() => FORM_TYPES[formType], [formType]);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
      setIsLoading(true);
      try {
        let result;
        switch (formType) {
          case 'TE7':
            result = await generateTE7Form(pcnNumber);
            break;
          case 'TE9':
            result = await generateTE9Form(pcnNumber);
            break;
          case 'PE2':
            result = await generatePE2Form(pcnNumber);
            break;
          case 'PE3':
            result = await generatePE3Form(pcnNumber);
            break;
          default:
            throw new Error('Invalid form type');
        }

        Alert.alert(
          'Success!',
          `Your ${formInfo.name} has been generated and sent to your email address.`,
          [
            {
              text: 'OK',
              onPress: onSuccess,
            },
          ]
        );
      } catch (error: any) {
        console.error(`Error generating ${formType} form:`, error);
        Alert.alert(
          'Error',
          error.response?.data?.message || `Failed to generate ${formInfo.name}. Please try again.`
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
      >
        <BottomSheetView style={{ flex: 1, paddingHorizontal: 16 }}>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Generate {formInfo.name}
          </Text>
          <Text className="text-sm text-gray-600 mb-6">
            {formInfo.description}
          </Text>

          {/* Form Information */}
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <Text className="text-sm text-blue-900 font-semibold mb-2">What happens next?</Text>
            <Text className="text-sm text-blue-800 leading-5">
              {'\u2022'} Your ticket information will be auto-filled into the form{'\n'}
              {'\u2022'} The completed form will be emailed to you as a PDF{'\n'}
              {'\u2022'} You can then review, sign (if required), and submit it
            </Text>
          </View>

          {/* Generate Button */}
          <SquishyPressable onPress={handleGenerate} disabled={isLoading}>
            <View
              className={`rounded-lg p-4 items-center justify-center ${
                isLoading ? 'bg-purple-400' : 'bg-purple-600'
              }`}
            >
              {isLoading ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text className="text-white font-semibold ml-2">Generating...</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">Generate & Email Form</Text>
              )}
            </View>
          </SquishyPressable>

          <Text className="text-xs text-gray-500 text-center mt-4">
            The form will be sent to your registered email address
          </Text>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

FormsBottomSheet.displayName = 'FormsBottomSheet';

export default FormsBottomSheet;
