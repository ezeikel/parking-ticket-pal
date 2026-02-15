import React, { forwardRef, useMemo, useState, useRef } from 'react';
import { View, Text, Alert, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrash, faXmark, faExclamationTriangle } from '@fortawesome/pro-regular-svg-icons';
import DrawPad, { type DrawPadHandle } from 'expo-drawpad';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import { ActionButton, ActionButtonGroup } from './ActionButton';
import SignatureSvg from './SignatureSvg';

interface SignatureBottomSheetProps {
  onSave: (signatureData: string) => void;
  onCancel: () => void;
  existingSignatureUrl?: string | null;
}

const { width: screenWidth } = Dimensions.get('window');
const canvasWidth = screenWidth - 64; // Account for padding
const canvasHeight = 200;

const SignatureBottomSheet = forwardRef<BottomSheet, SignatureBottomSheetProps>(
  ({ onSave, onCancel, existingSignatureUrl }, ref) => {
    const snapPoints = useMemo(() => ['65%', '85%'], []);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [showExisting, setShowExisting] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const drawPadRef = useRef<DrawPadHandle>(null);

    const handleClear = () => {
      if (drawPadRef.current) {
        drawPadRef.current.erase();
        setHasDrawn(false);
      }
    };

    const handleSave = async () => {
      if (!hasDrawn) {
        Alert.alert('No Signature', 'Please draw your signature before saving');
        return;
      }

      try {
        setIsSaving(true);

        if (!drawPadRef.current || !drawPadRef.current.getSVG) {
          Alert.alert('Error', 'Failed to access signature canvas');
          return;
        }

        // Get the SVG data from DrawPad (it's a Promise!)
        const svgData = await drawPadRef.current.getSVG();

        if (!svgData) {
          Alert.alert('Error', 'Failed to export signature');
          return;
        }

        // Convert SVG to JSON string format (matching web implementation)
        const signatureDataString = JSON.stringify({ svg: svgData });

        onSave(signatureDataString);
      } catch (error) {
        console.error('Error exporting signature:', error);
        Alert.alert('Error', 'Failed to export signature');
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancel = () => {
      // Reset state when canceling
      setShowExisting(true);
      setHasDrawn(false);
      if (drawPadRef.current) {
        drawPadRef.current.erase();
      }
      onCancel();
    };

    const handleDrawEnd = () => {
      setHasDrawn(true);
      setShowExisting(false);
    };

    const handleStartNew = () => {
      setShowExisting(false);
      setHasDrawn(false);
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={(index) => {
          // Reset state when sheet is closed
          if (index === -1) {
            setShowExisting(true);
            setHasDrawn(false);
            if (drawPadRef.current) {
              drawPadRef.current.erase();
            }
          }
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
          />
        )}
      >
        <BottomSheetView style={{ flex: 1, padding: 16 }}>
          <View className="flex-1">
            {/* Header */}
            <View className="mb-4">
              <Text className="font-jakarta-semibold text-xl text-gray-900">
                Add Signature
              </Text>
            </View>

            {/* Description */}
            <Text className="font-jakarta text-sm text-gray-600 mb-4">
              {showExisting && existingSignatureUrl
                ? 'Your current signature is shown below. Tap "Create New Signature" to replace it.'
                : 'Draw your signature below. This will be saved with your profile and used when filling out forms and generating letters.'}
            </Text>

            {/* Existing Signature Preview */}
            {showExisting && existingSignatureUrl ? (
              <View className="mb-4">
                <Text className="font-jakarta text-xs text-gray-500 mb-2">Current Signature:</Text>
                <View className="border border-gray-300 rounded-lg bg-white" style={{ height: canvasHeight }}>
                  <SignatureSvg
                    uri={existingSignatureUrl}
                    width={canvasWidth}
                    height={canvasHeight}
                  />
                </View>
                <View className="mt-4">
                  <SquishyPressable
                    onPress={handleStartNew}
                    style={{
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      backgroundColor: '#3b82f6',
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                  >
                    <Text className="font-jakarta-semibold text-sm text-white">Create New Signature</Text>
                  </SquishyPressable>
                </View>
              </View>
            ) : (
              /* Drawing Canvas */
              <View className="border border-gray-300 rounded-lg mb-4 bg-white" style={{ height: canvasHeight }}>
                <DrawPad
                  ref={drawPadRef}
                  stroke="#000000"
                  strokeWidth={2}
                  onDrawEnd={handleDrawEnd}
                />
                <View className="absolute bottom-2 left-0 right-0 pointer-events-none">
                  <Text className="font-jakarta text-xs text-gray-400 text-center">
                    Sign here
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons - Only show when user has drawn something */}
            {hasDrawn && (
              <ActionButtonGroup align="space-between" gap={8}>
                <View className="flex-row" style={{ gap: 8 }}>
                  <ActionButton
                    onPress={handleCancel}
                    icon={faXmark}
                    label="Cancel"
                    variant="secondary"
                    disabled={isSaving}
                  />
                  <ActionButton
                    onPress={handleClear}
                    icon={faTrash}
                    label="Clear"
                    variant="danger"
                    disabled={isSaving}
                  />
                </View>
                <ActionButton
                  onPress={handleSave}
                  label="Save Changes"
                  variant="primary"
                  disabled={isSaving}
                  loading={isSaving}
                />
              </ActionButtonGroup>
            )}

            {/* Warning */}
            <View className="flex-row items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size={16}
                color="#f97316"
                style={{ marginRight: 8 }}
              />
              <Text className="font-jakarta text-xs text-orange-700 flex-1">
                Your signature will be used on official forms and letters. Please ensure it matches your legal signature.
              </Text>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

SignatureBottomSheet.displayName = 'SignatureBottomSheet';

export default SignatureBottomSheet;
