import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faEnvelope,
  faTicket,
  faCheck,
  faArrowLeft,
  faChevronDown,
  faCalendar,
  faSpinnerThird,
} from '@fortawesome/pro-solid-svg-icons';
import { useMutation } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { lookupTicketByPcn, createLetterForTicket } from '@/api';
import { useAnalytics } from '@/lib/analytics';
import { toast } from '@/lib/toast';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { OCRProcessingResult } from '@/hooks/api/useOCR';

type TicketMatch = {
  id: string;
  pcnNumber: string;
  issuer: string | null;
  status: string;
  hasTicketImage: boolean;
};

type LetterFlowProps = {
  ocrData: OCRProcessingResult;
  onComplete: (ticketId: string) => void;
  onCancel: () => void;
};

const LETTER_TYPES = [
  { value: 'INITIAL_NOTICE', label: 'Initial Notice' },
  { value: 'NOTICE_TO_OWNER', label: 'Notice to Owner (NTO)' },
  { value: 'CHARGE_CERTIFICATE', label: 'Charge Certificate' },
  { value: 'ORDER_FOR_RECOVERY', label: 'Order for Recovery' },
  { value: 'CCJ_NOTICE', label: 'CCJ Notice' },
  { value: 'FINAL_DEMAND', label: 'Final Demand' },
  { value: 'BAILIFF_NOTICE', label: 'Bailiff Notice' },
  { value: 'APPEAL_RESPONSE', label: 'Appeal Response' },
  { value: 'APPEAL_ACCEPTED', label: 'Appeal Accepted' },
  { value: 'APPEAL_REJECTED', label: 'Appeal Rejected' },
  { value: 'TE_FORM_RESPONSE', label: 'Revoking Order (TE7/TE9)' },
  { value: 'PE_FORM_RESPONSE', label: 'Revoking Order (PE2/PE3)' },
  { value: 'GENERIC', label: 'Other Letter' },
] as const;

const LETTER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  LETTER_TYPES.map(({ value, label }) => [value, label]),
);

const LetterFlow = ({ ocrData, onComplete, onCancel }: LetterFlowProps) => {
  const insets = useSafeAreaInsets();
  const { trackEvent } = useAnalytics();

  // Form state — prefilled from OCR
  const [letterType, setLetterType] = useState(ocrData.data?.letterType || 'GENERIC');
  const [pcnNumber, setPcnNumber] = useState(ocrData.data?.pcnNumber || '');
  const [vehicleReg, setVehicleReg] = useState(ocrData.data?.vehicleReg || '');
  const [summary, setSummary] = useState(ocrData.data?.summary || '');
  const [sentAt, setSentAt] = useState<Date>(
    ocrData.data?.sentAt ? new Date(ocrData.data.sentAt) : new Date(),
  );
  const [currentAmount, setCurrentAmount] = useState(
    ocrData.data?.currentAmount
      ? String(ocrData.data.currentAmount / 100)
      : '',
  );

  // UI state
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [matchedTicket, setMatchedTicket] = useState<TicketMatch | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  // PCN lookup
  const lookupPcn = useCallback(async (pcn: string) => {
    if (!pcn.trim()) {
      setMatchedTicket(null);
      setLookupDone(true);
      return;
    }
    setIsLookingUp(true);
    try {
      const result = await lookupTicketByPcn(pcn.trim());
      if (result.ticket) {
        setMatchedTicket(result.ticket);
      } else {
        setMatchedTicket(null);
      }
    } catch {
      setMatchedTicket(null);
    } finally {
      setIsLookingUp(false);
      setLookupDone(true);
    }
  }, []);

  // Auto-lookup on mount if we have a PCN
  useEffect(() => {
    if (pcnNumber) {
      lookupPcn(pcnNumber);
    }
  }, []);

  // Create letter mutation
  const createLetterMutation = useMutation({
    mutationFn: async () => {
      const amountInPence = currentAmount
        ? Math.round(Number(currentAmount) * 100)
        : undefined;

      const result = await createLetterForTicket({
        pcnNumber: pcnNumber.trim(),
        vehicleReg: vehicleReg.trim(),
        letterType,
        summary: summary.trim() || 'Letter from council',
        sentAt: sentAt.toISOString(),
        issuedAt: ocrData.data?.issuedAt
          ? new Date(ocrData.data.issuedAt).toISOString()
          : undefined,
        tempImageUrl: ocrData.imageUrl,
        tempImagePath: ocrData.tempImagePath,
        extractedText: ocrData.data?.extractedText,
        currentAmount: amountInPence ?? null,
        issuer: ocrData.data?.issuer || undefined,
        issuerType: ocrData.data?.issuerType || undefined,
        location: ocrData.data?.location || undefined,
        initialAmount: ocrData.data?.initialAmount || undefined,
        contraventionCode: ocrData.data?.contraventionCode || undefined,
      });
      return result;
    },
    onSuccess: (result) => {
      if (result.success && result.letter) {
        trackEvent('letter_created', {
          screen: 'letter_flow',
          letter_type: letterType,
          matched_existing: !!matchedTicket,
        });
        const letterLabel = LETTER_TYPE_LABELS[letterType] || 'Letter';
        toast.success('Letter added', `${letterLabel} attached to ticket`);
        const ticketId = matchedTicket?.id || result.letter.ticketId;
        onComplete(ticketId);
      } else {
        toast.error('Error', 'Failed to add letter');
      }
    },
    onError: () => {
      toast.error('Error', 'Failed to add letter');
    },
  });

  const handleSubmit = useCallback(() => {
    if (!pcnNumber.trim() || !vehicleReg.trim() || !summary.trim()) {
      toast.error('Missing fields', 'Please fill in all required fields');
      return;
    }
    createLetterMutation.mutate();
  }, [pcnNumber, vehicleReg, summary, createLetterMutation]);

  const isSubmitting = createLetterMutation.isPending;
  const isFormValid = pcnNumber.trim() && vehicleReg.trim() && summary.trim();

  if (isSubmitting) {
    return (
      <View className="flex-1 items-center justify-center bg-white" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#1ABC9C" />
        <Text className="font-jakarta-medium text-base text-gray-500 mt-4">
          Adding letter to ticket...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <SquishyPressable onPress={onCancel} className="flex-row items-center gap-x-2">
          <FontAwesomeIcon icon={faArrowLeft} size={14} color="#6B7280" />
          <Text className="font-jakarta-medium text-sm text-gray-500">Back</Text>
        </SquishyPressable>
        <View className="flex-row items-center gap-x-2">
          <FontAwesomeIcon icon={faEnvelope} size={14} color="#1ABC9C" />
          <Text className="font-jakarta-semibold text-sm text-gray-900">
            Confirm Letter Details
          </Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Extracted badge */}
        <View className="flex-row items-center gap-x-2 bg-teal-50 rounded-full px-3 py-1.5 self-start mb-4">
          <FontAwesomeIcon icon={faCheck} size={12} color="#1ABC9C" />
          <Text className="font-jakarta-medium text-xs text-teal-600">
            Details extracted from your scan
          </Text>
        </View>

        <Text className="font-jakarta-bold text-xl text-gray-900 mb-1">
          Review letter details
        </Text>
        <Text className="font-jakarta text-sm text-gray-500 mb-6">
          Check and edit the extracted information before adding.
        </Text>

        {/* Letter Type Picker */}
        <View className="mb-4">
          <Text className="font-jakarta-semibold text-sm text-gray-700 mb-2">
            Letter Type *
          </Text>
          <SquishyPressable
            onPress={() => setShowTypePicker(!showTypePicker)}
            className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row items-center justify-between"
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="font-jakarta text-base text-gray-900">
              {LETTER_TYPE_LABELS[letterType] || 'Select type'}
            </Text>
            <FontAwesomeIcon icon={faChevronDown} size={12} color="#6B7280" />
          </SquishyPressable>

          {showTypePicker && (
            <View
              className="bg-white rounded-xl border border-gray-200 mt-1 overflow-hidden"
              style={{ borderCurve: 'continuous', maxHeight: 250 }}
            >
              <ScrollView nestedScrollEnabled>
                {LETTER_TYPES.map(({ value, label }) => (
                  <SquishyPressable
                    key={value}
                    onPress={() => {
                      setLetterType(value);
                      setShowTypePicker(false);
                    }}
                    className={`px-4 py-3 border-b border-gray-100 ${
                      value === letterType ? 'bg-teal-50' : ''
                    }`}
                  >
                    <Text
                      className={`font-jakarta text-sm ${
                        value === letterType ? 'text-teal-600 font-jakarta-semibold' : 'text-gray-900'
                      }`}
                    >
                      {label}
                    </Text>
                  </SquishyPressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* PCN Number */}
        <View className="mb-4">
          <Text className="font-jakarta-semibold text-sm text-gray-700 mb-2">
            PCN Number *
          </Text>
          <TextInput
            className="bg-gray-50 rounded-xl px-4 py-3 font-jakarta text-base text-gray-900 border border-gray-200"
            style={{ borderCurve: 'continuous' }}
            value={pcnNumber}
            onChangeText={(text) => {
              setPcnNumber(text);
              setLookupDone(false);
              setMatchedTicket(null);
            }}
            onBlur={() => lookupPcn(pcnNumber)}
            placeholder="e.g. WK12345678"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {isLookingUp && (
            <View className="flex-row items-center gap-x-1.5 mt-1.5">
              <ActivityIndicator size="small" color="#6B7280" />
              <Text className="font-jakarta text-xs text-gray-500">
                Looking up ticket...
              </Text>
            </View>
          )}
          {lookupDone && matchedTicket && (
            <View
              className="mt-2 flex-row items-center gap-x-3 rounded-xl border border-teal-200 bg-teal-50 p-3"
              style={{ borderCurve: 'continuous' }}
            >
              <View className="w-8 h-8 rounded-full bg-teal-100 items-center justify-center">
                <FontAwesomeIcon icon={faTicket} size={14} color="#1ABC9C" />
              </View>
              <View className="flex-1">
                <Text className="font-jakarta-semibold text-sm text-gray-900">
                  Existing ticket found
                </Text>
                <Text className="font-jakarta text-xs text-gray-500">
                  {matchedTicket.issuer ? `${matchedTicket.issuer} · ` : ''}
                  {matchedTicket.status.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
          )}
          {lookupDone && !matchedTicket && pcnNumber.trim() !== '' && (
            <Text className="font-jakarta text-xs text-gray-500 mt-1.5">
              No existing ticket found — a new ticket will be created.
            </Text>
          )}
        </View>

        {/* Vehicle Registration */}
        <View className="mb-4">
          <Text className="font-jakarta-semibold text-sm text-gray-700 mb-2">
            Vehicle Registration *
          </Text>
          <TextInput
            className="bg-gray-50 rounded-xl px-4 py-3 font-jakarta text-base text-gray-900 border border-gray-200"
            style={{ borderCurve: 'continuous' }}
            value={vehicleReg}
            onChangeText={(text) => setVehicleReg(text.toUpperCase())}
            placeholder="e.g. AB12 CDE"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        {/* Letter Date */}
        <View className="mb-4">
          <Text className="font-jakarta-semibold text-sm text-gray-700 mb-2">
            Letter Date *
          </Text>
          <SquishyPressable
            onPress={() => setShowDatePicker(!showDatePicker)}
            className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row items-center gap-x-2"
            style={{ borderCurve: 'continuous' }}
          >
            <FontAwesomeIcon icon={faCalendar} size={14} color="#6B7280" />
            <Text className="font-jakarta text-base text-gray-900">
              {format(sentAt, 'dd MMM yyyy')}
            </Text>
          </SquishyPressable>
          {showDatePicker && (
            <DateTimePicker
              value={sentAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (selectedDate) setSentAt(selectedDate);
              }}
            />
          )}
        </View>

        {/* Amount Due */}
        <View className="mb-4">
          <Text className="font-jakarta-semibold text-sm text-gray-700 mb-2">
            Amount Due (optional)
          </Text>
          <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200" style={{ borderCurve: 'continuous' }}>
            <Text className="font-jakarta-semibold text-base text-gray-500 pl-4">
              £
            </Text>
            <TextInput
              className="flex-1 px-2 py-3 font-jakarta text-base text-gray-900"
              value={currentAmount}
              onChangeText={setCurrentAmount}
              placeholder="e.g. 130"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
          </View>
          <Text className="font-jakarta text-xs text-gray-500 mt-1">
            The amount currently due as shown on the letter
          </Text>
        </View>

        {/* Summary */}
        <View className="mb-6">
          <Text className="font-jakarta-semibold text-sm text-gray-700 mb-2">
            Summary *
          </Text>
          <TextInput
            className="bg-gray-50 rounded-xl px-4 py-3 font-jakarta text-base text-gray-900 border border-gray-200"
            style={{ borderCurve: 'continuous', minHeight: 80, textAlignVertical: 'top' }}
            value={summary}
            onChangeText={setSummary}
            placeholder="Brief description of the letter contents"
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>

        {/* Submit Button */}
        <SquishyPressable
          onPress={handleSubmit}
          disabled={!isFormValid}
          className={`rounded-xl py-4 flex-row items-center justify-center gap-x-2 ${
            isFormValid ? 'bg-teal-500' : 'bg-gray-200'
          }`}
          style={{ borderCurve: 'continuous' }}
        >
          <Text
            className={`font-jakarta-semibold text-base ${
              isFormValid ? 'text-white' : 'text-gray-400'
            }`}
          >
            Add Letter
          </Text>
          <FontAwesomeIcon icon={faCheck} size={14} color={isFormValid ? 'white' : '#9CA3AF'} />
        </SquishyPressable>
      </ScrollView>
    </View>
  );
};

export default LetterFlow;
