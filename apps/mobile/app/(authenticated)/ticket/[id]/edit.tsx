import { View, Text, TextInput, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { KeyboardToolbar } from 'react-native-keyboard-controller';
import BottomSheet from '@gorhom/bottom-sheet';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faChevronDown } from '@fortawesome/pro-solid-svg-icons';
import type { Address } from '@parking-ticket-pal/types';
import { CONTRAVENTION_CODES } from '@parking-ticket-pal/constants';
import useTicket from '@/hooks/api/useTicket';
import { updateTicket } from '@/api';
import { toast } from '@/lib/toast';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import IssuerInput from '@/components/IssuerInput/IssuerInput';
import AddressInput from '@/components/AddressInput/AddressInput';
import ContraventionCodePicker from '@/components/ContraventionCodePicker/ContraventionCodePicker';

export default function EditTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading: isLoadingTicket } = useTicket(id!);
  const queryClient = useQueryClient();

  if (isLoadingTicket || !data?.ticket) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Loader />
      </SafeAreaView>
    );
  }

  return <EditForm ticket={data.ticket} ticketId={id!} queryClient={queryClient} />;
}

function EditForm({
  ticket,
  ticketId,
  queryClient,
}: {
  ticket: any;
  ticketId: string;
  queryClient: any;
}) {
  const ticketData = ticket as any;
  const location = ticketData.location as Address | null;

  const [pcnNumber, setPcnNumber] = useState(ticket.pcnNumber || '');
  const [vehicleReg, setVehicleReg] = useState(
    ticket.vehicle?.registrationNumber || ticket.vehicle?.vrm || '',
  );
  const [issuer, setIssuer] = useState(ticket.issuer || '');
  const [issuedAt, setIssuedAt] = useState<Date>(new Date(ticket.issuedAt));
  const [amountText, setAmountText] = useState(
    ticket.initialAmount ? String(ticket.initialAmount / 100) : '',
  );
  const [contraventionCode, setContraventionCode] = useState(
    ticket.contraventionCode || '',
  );
  const [ticketLocation, setTicketLocation] = useState<Address | null>(location);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const codePickerRef = useRef<BottomSheet>(null);

  const parsedAmount = parseFloat(amountText);
  const amountInPence =
    !isNaN(parsedAmount) && parsedAmount > 0 ? Math.round(parsedAmount * 100) : 0;

  const isValid =
    pcnNumber.trim().length > 0 &&
    vehicleReg.trim().length > 0 &&
    issuer.length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      updateTicket(ticketId, {
        pcnNumber: pcnNumber.trim(),
        vehicleReg: vehicleReg.trim(),
        issuer,
        issuedAt,
        initialAmount: amountInPence || undefined,
        contraventionCode: contraventionCode.trim() || null,
        location: ticketLocation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket updated');
      router.back();
    },
    onError: () => {
      toast.error('Update failed', 'Could not update ticket. Please try again.');
    },
  });

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border">
          <SquishyPressable onPress={() => router.back()}>
            <View className="flex-row items-center">
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#717171" />
              <Text className="ml-2 font-jakarta text-gray">Back</Text>
            </View>
          </SquishyPressable>
          <Text className="font-jakarta-semibold text-lg text-dark ml-4">
            Edit Ticket
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        >
          {/* PCN Number */}
          <View className="mb-4">
            <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
              PCN / Reference Number
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base font-jakarta"
              placeholder="e.g. WK12345678"
              value={pcnNumber}
              onChangeText={setPcnNumber}
              autoCapitalize="characters"
            />
          </View>

          {/* Vehicle Registration */}
          <View className="mb-4">
            <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
              Vehicle Registration
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base font-jakarta uppercase"
              placeholder="e.g. AB12 CDE"
              value={vehicleReg}
              onChangeText={(text) => setVehicleReg(text.toUpperCase())}
              autoCapitalize="characters"
            />
          </View>

          {/* Issuer Name */}
          <View className="mb-4">
            <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
              Issuer Name
            </Text>
            <IssuerInput
              onSelect={setIssuer}
              initialValue={issuer}
              placeholder="Search for council or company"
            />
          </View>

          {/* Issue Date */}
          <View className="mb-4">
            <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
              Date Issued
            </Text>
            {Platform.OS === 'ios' ? (
              <View className="border border-gray-300 rounded-lg overflow-hidden">
                <DateTimePicker
                  value={issuedAt}
                  mode="date"
                  display="inline"
                  onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                    if (selectedDate) setIssuedAt(selectedDate);
                  }}
                  maximumDate={new Date()}
                  minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
                  style={{ height: 320 }}
                />
              </View>
            ) : (
              <>
                <SquishyPressable
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text className="text-base font-jakarta text-gray-900">
                    {issuedAt.toLocaleDateString('en-GB')}
                  </Text>
                </SquishyPressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={issuedAt}
                    mode="date"
                    display="default"
                    onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                      setShowDatePicker(false);
                      if (selectedDate) setIssuedAt(selectedDate);
                    }}
                    maximumDate={new Date()}
                    minimumDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)}
                  />
                )}
              </>
            )}
          </View>

          {/* Amount */}
          <View className="mb-4">
            <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
              Amount ({'\u00A3'})
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base font-jakarta"
              placeholder="e.g. 65"
              value={amountText}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                const parts = cleaned.split('.');
                const sanitized =
                  parts.length > 2
                    ? parts[0] + '.' + parts.slice(1).join('')
                    : cleaned;
                setAmountText(sanitized);
              }}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
          </View>

          {/* Contravention Code */}
          <View className="mb-4">
            <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
              Contravention Code
            </Text>
            <SquishyPressable
              className="border border-gray-300 rounded-lg px-4 py-3 flex-row items-center justify-between"
              onPress={() => codePickerRef.current?.snapToIndex(0)}
            >
              {contraventionCode ? (
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="bg-gray-100 rounded px-2 py-0.5 mr-2">
                    <Text className="font-jakarta-bold text-sm text-gray-900">
                      {contraventionCode}
                    </Text>
                  </View>
                  <Text
                    className="font-jakarta text-sm text-gray-600 flex-1"
                    numberOfLines={1}
                  >
                    {CONTRAVENTION_CODES[contraventionCode]?.description ?? ''}
                  </Text>
                </View>
              ) : (
                <Text className="font-jakarta text-base text-gray-400">
                  Select contravention code
                </Text>
              )}
              <FontAwesomeIcon icon={faChevronDown} size={14} color="#9CA3AF" />
            </SquishyPressable>
            <Text className="font-jakarta text-xs text-gray-400 mt-1">
              The code on the ticket describing the offence
            </Text>
          </View>

          {/* Location */}
          <View className="mb-6">
            <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
              Location
            </Text>
            <AddressInput
              onSelect={setTicketLocation}
              initialValue={
                ticketLocation
                  ? `${ticketLocation.line1}, ${ticketLocation.postcode}`
                  : ''
              }
              placeholder="Search for the location"
            />
          </View>

          {/* Save Button */}
          <SquishyPressable
            onPress={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="py-4 rounded-xl items-center justify-center mb-8"
            style={{ backgroundColor: isValid && !mutation.isPending ? '#1ABC9C' : '#D1D5DB' }}
          >
            {mutation.isPending ? (
              <Loader size={20} color="white" />
            ) : (
              <Text
                className="font-jakarta-semibold text-lg"
                style={{ color: isValid ? '#fff' : '#9CA3AF' }}
              >
                Save Changes
              </Text>
            )}
          </SquishyPressable>
        </ScrollView>
      </SafeAreaView>
      <KeyboardToolbar />
      <ContraventionCodePicker
        ref={codePickerRef}
        value={contraventionCode}
        onSelect={setContraventionCode}
      />
    </View>
  );
}
