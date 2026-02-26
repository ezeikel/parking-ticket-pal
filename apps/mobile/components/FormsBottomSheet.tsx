import React, { forwardRef, useMemo, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { toast } from '@/lib/toast';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Checkbox from 'expo-checkbox';
import { FormType, FORM_TYPES } from '@/constants/challenges';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import Loader from '@/components/Loader/Loader';
import { generateTE7Form, generateTE9Form, generatePE2Form, generatePE3Form } from '@/api';
import { logger } from '@/lib/logger';

interface FormsBottomSheetProps {
  pcnNumber: string;
  formType: FormType;
  onSuccess: () => void;
}

const FormsBottomSheet = forwardRef<BottomSheet, FormsBottomSheetProps>(
  ({ pcnNumber, formType, onSuccess }, ref) => {
    const snapPoints = useMemo(() => ['75%', '90%'], []);
    const formInfo = useMemo(() => FORM_TYPES[formType], [formType]);
    const [isLoading, setIsLoading] = useState(false);

    // Form data states
    const [reasonText, setReasonText] = useState('');
    const [grounds, setGrounds] = useState({
      didNotReceiveNotice: false,
      madeRepresentations: false,
      hadNoResponse: false,
      appealNotDetermined: false,
      appealInFavour: false,
      paidInFull: false,
    });
    const [reasonTouched, setReasonTouched] = useState(false);
    const [groundsTouched, setGroundsTouched] = useState(false);

    const reasonError = reasonTouched && !reasonText.trim();
    const hasSelectedGround = Object.values(grounds).some(Boolean);
    const groundsError = groundsTouched && !hasSelectedGround;

    const handleGenerate = async () => {
      // Validate based on form type
      if ((formType === 'TE7' || formType === 'PE2') && !reasonText.trim()) {
        setReasonTouched(true);
        return;
      }

      if ((formType === 'TE9' || formType === 'PE3')) {
        if (!hasSelectedGround) {
          setGroundsTouched(true);
          return;
        }
      }

      setIsLoading(true);
      try {
        logger.debug('Generating form', { action: 'forms', screen: 'forms-bottom-sheet', formType, pcnNumber });
        let result;
        switch (formType) {
          case 'TE7':
            result = await generateTE7Form(pcnNumber, reasonText);
            break;
          case 'TE9':
            result = await generateTE9Form(pcnNumber, grounds);
            break;
          case 'PE2':
            result = await generatePE2Form(pcnNumber, reasonText);
            break;
          case 'PE3':
            result = await generatePE3Form(pcnNumber, grounds);
            break;
          default:
            throw new Error('Invalid form type');
        }
        logger.debug('Form generation result', { action: 'forms', screen: 'forms-bottom-sheet', formType, success: result?.success });

        // Check if the result indicates success
        if (result && result.success) {
          toast.success('Form Generated', 'Check your email');
          setReasonText('');
          setGrounds({
            didNotReceiveNotice: false,
            madeRepresentations: false,
            hadNoResponse: false,
            appealNotDetermined: false,
            appealInFavour: false,
            paidInFull: false,
          });
          setReasonTouched(false);
          setGroundsTouched(false);
          onSuccess();
        } else {
          // API returned but indicated failure
          logger.error('Form generation failed', { action: 'forms', screen: 'forms-bottom-sheet', formType, result });
          toast.error('Generation Failed', result?.error || `Failed to generate ${formInfo.name}`);
        }
      } catch (error: any) {
        logger.error(`Error generating ${formType} form`, {
          action: 'forms',
          screen: 'forms-bottom-sheet',
          formType,
          responseData: error.response?.data,
          responseStatus: error.response?.status,
        }, error instanceof Error ? error : new Error(String(error)));
        toast.error('Generation Failed', error.response?.data?.error || error.response?.data?.message || `Failed to generate ${formInfo.name}`);
      } finally {
        setIsLoading(false);
      }
    };

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    );

    const renderFormFields = () => {
      // TE7 and PE2 - Reason text field
      if (formType === 'TE7' || formType === 'PE2') {
        return (
          <View className="mb-6">
            <Text className="text-sm font-jakarta-semibold text-gray-700 mb-2">
              Reason for filing out of time <Text className="text-red-500">*</Text>
            </Text>
            <View className="bg-teal/10 border border-teal/20 rounded-lg p-3 mb-3">
              <Text className="text-xs text-teal-dark font-jakarta-semibold mb-1">Important</Text>
              <Text className="text-xs text-teal-dark leading-4">
                Do NOT give your reasons for appealing the original penalty charge here. Only explain why your statement is late.
              </Text>
            </View>
            <TextInput
              className={`border rounded-lg p-3 bg-white text-gray-900 min-h-[120px] ${reasonError ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Explain why you are filing this application late..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={reasonText}
              onChangeText={setReasonText}
              onBlur={() => setReasonTouched(true)}
              editable={!isLoading}
            />
            {reasonError && (
              <Text className="text-red-500 text-xs mt-1">
                Please provide a reason for filing out of time
              </Text>
            )}
          </View>
        );
      }

      // TE9 and PE3 - Checkboxes for grounds
      if (formType === 'TE9' || formType === 'PE3') {
        return (
          <View className="mb-6">
            <Text className="text-sm font-jakarta-semibold text-gray-700 mb-3">
              Grounds for statement <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-xs text-gray-600 mb-4">Select all that apply:</Text>
            {groundsError && (
              <Text className="text-red-500 text-xs mb-3">
                Please select at least one ground
              </Text>
            )}

            <View className="space-y-3">
              <View className="flex-row items-start mb-3">
                <Checkbox
                  value={grounds.didNotReceiveNotice}
                  onValueChange={(value) => {
                    if (!groundsTouched) setGroundsTouched(true);
                    setGrounds({ ...grounds, didNotReceiveNotice: value });
                  }}
                  color={grounds.didNotReceiveNotice ? '#9333ea' : undefined}
                  disabled={isLoading}
                />
                <Text className="flex-1 ml-3 text-sm text-gray-900">
                  I did not receive the penalty charge notice
                </Text>
              </View>

              <View className="flex-row items-start mb-3">
                <Checkbox
                  value={grounds.madeRepresentations}
                  onValueChange={(value) => {
                    if (!groundsTouched) setGroundsTouched(true);
                    setGrounds({ ...grounds, madeRepresentations: value });
                  }}
                  color={grounds.madeRepresentations ? '#9333ea' : undefined}
                  disabled={isLoading}
                />
                <Text className="flex-1 ml-3 text-sm text-gray-900">
                  I made representations but did not receive a rejection notice
                </Text>
              </View>

              <View className="flex-row items-start mb-3">
                <Checkbox
                  value={grounds.hadNoResponse}
                  onValueChange={(value) => {
                    if (!groundsTouched) setGroundsTouched(true);
                    setGrounds({ ...grounds, hadNoResponse: value });
                  }}
                  color={grounds.hadNoResponse ? '#9333ea' : undefined}
                  disabled={isLoading}
                />
                <Text className="flex-1 ml-3 text-sm text-gray-900">
                  I appealed to an adjudicator but had no response
                </Text>
              </View>

              <View className="flex-row items-start mb-3">
                <Checkbox
                  value={grounds.appealNotDetermined}
                  onValueChange={(value) => {
                    if (!groundsTouched) setGroundsTouched(true);
                    setGrounds({ ...grounds, appealNotDetermined: value });
                  }}
                  color={grounds.appealNotDetermined ? '#9333ea' : undefined}
                  disabled={isLoading}
                />
                <Text className="flex-1 ml-3 text-sm text-gray-900">
                  My appeal had not been determined
                </Text>
              </View>

              <View className="flex-row items-start mb-3">
                <Checkbox
                  value={grounds.appealInFavour}
                  onValueChange={(value) => {
                    if (!groundsTouched) setGroundsTouched(true);
                    setGrounds({ ...grounds, appealInFavour: value });
                  }}
                  color={grounds.appealInFavour ? '#9333ea' : undefined}
                  disabled={isLoading}
                />
                <Text className="flex-1 ml-3 text-sm text-gray-900">
                  An adjudicator decided my appeal in my favour
                </Text>
              </View>

              <View className="flex-row items-start mb-3">
                <Checkbox
                  value={grounds.paidInFull}
                  onValueChange={(value) => {
                    if (!groundsTouched) setGroundsTouched(true);
                    setGrounds({ ...grounds, paidInFull: value });
                  }}
                  color={grounds.paidInFull ? '#9333ea' : undefined}
                  disabled={isLoading}
                />
                <Text className="flex-1 ml-3 text-sm text-gray-900">
                  I paid the penalty charge in full
                </Text>
              </View>
            </View>
          </View>
        );
      }

      return null;
    };

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
            <Text className="text-xl font-jakarta-bold text-gray-900 mb-2">
              Generate {formInfo.name}
            </Text>
            <Text className="text-sm text-gray-600 mb-6">
              {formInfo.description}
            </Text>

            {/* Form Fields */}
            {renderFormFields()}

            {/* Form Information */}
            <View className="bg-teal/10 border border-teal/20 rounded-xl p-4 mb-6">
              <Text className="text-sm text-teal-dark font-jakarta-semibold mb-2">What happens next?</Text>
              <Text className="text-sm text-teal-dark leading-5">
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
                    <Loader size={20} color="#ffffff" />
                    <Text className="text-white font-jakarta-semibold ml-2">Generating...</Text>
                  </View>
                ) : (
                  <Text className="text-white font-jakarta-semibold text-base">Generate & Email Form</Text>
                )}
              </View>
            </SquishyPressable>

            <Text className="text-xs text-gray-500 text-center mt-4 mb-8">
              The form will be sent to your registered email address
            </Text>
          </KeyboardAwareScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

FormsBottomSheet.displayName = 'FormsBottomSheet';

export default FormsBottomSheet;
