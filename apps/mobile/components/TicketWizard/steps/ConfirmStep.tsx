import { View, Text, TextInput, ScrollView } from 'react-native';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheckCircle, faChevronDown, faChevronUp } from '@fortawesome/pro-solid-svg-icons';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { WizardStepProps, IssuerType, TicketStage } from '../types';

const ConfirmStep = ({ wizardData, onNext }: WizardStepProps) => {
  const [pcnNumber, setPcnNumber] = useState(wizardData.pcnNumber);
  const [vehicleReg, setVehicleReg] = useState(wizardData.vehicleReg);
  const [issuerType, setIssuerType] = useState<IssuerType | null>(wizardData.issuerType);
  const [ticketStage, setTicketStage] = useState<TicketStage | null>(
    wizardData.ticketStage ?? 'initial',
  );
  const [showMore, setShowMore] = useState(false);
  const [pcnTouched, setPcnTouched] = useState(false);
  const [regTouched, setRegTouched] = useState(false);

  const isValid = pcnNumber.trim().length > 0 && vehicleReg.trim().length > 0;
  const pcnError = pcnTouched && !pcnNumber.trim();
  const regError = regTouched && !vehicleReg.trim();

  const stageLabels: Record<string, string> = {
    initial: 'Initial Ticket',
    nto: 'Notice to Owner',
    rejection: 'Rejection / Tribunal',
    charge_cert: 'Charge Certificate',
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Badge */}
      <View
        className="flex-row items-center gap-x-2 rounded-full px-3 py-1.5 self-start mb-4"
        style={{ backgroundColor: '#F0FDF4' }}
      >
        <FontAwesomeIcon icon={faCheckCircle} size={14} color="#1ABC9C" />
        <Text className="font-jakarta-medium text-xs" style={{ color: '#1ABC9C' }}>
          Details extracted from your photo
        </Text>
      </View>

      {/* Key fields */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">PCN Reference</Text>
        <TextInput
          testID="confirm-pcn"
          className={`border rounded-lg px-4 py-3 text-base font-jakarta ${pcnError ? 'border-red-500' : 'border-gray-300'}`}
          value={pcnNumber}
          onChangeText={setPcnNumber}
          onBlur={() => setPcnTouched(true)}
        />
        {pcnError ? (
          <Text className="font-jakarta text-xs text-red-500 mt-1">
            PCN number is required
          </Text>
        ) : (
          <Text className="font-jakarta text-xs text-gray-400 mt-1">
            The unique reference number on your penalty charge notice
          </Text>
        )}
      </View>

      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">
          Vehicle Registration
        </Text>
        <TextInput
          className={`border rounded-lg px-4 py-3 text-base font-jakarta uppercase ${regError ? 'border-red-500' : 'border-gray-300'}`}
          value={vehicleReg}
          onChangeText={(text) => setVehicleReg(text.toUpperCase())}
          onBlur={() => setRegTouched(true)}
          autoCapitalize="characters"
        />
        {regError ? (
          <Text className="font-jakarta text-xs text-red-500 mt-1">
            Vehicle registration is required
          </Text>
        ) : (
          <Text className="font-jakarta text-xs text-gray-400 mt-1">
            Found on the ticket. UK format: AB12 CDE
          </Text>
        )}
      </View>

      {/* Issuer type toggle */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">Ticket Type</Text>
        <View className="flex-row gap-x-2">
          <SquishyPressable
            onPress={() => setIssuerType('council')}
            className="flex-1 rounded-lg border-2 px-4 py-2.5 items-center"
            style={{
              borderColor: issuerType === 'council' ? '#1ABC9C' : '#E5E7EB',
              backgroundColor: issuerType === 'council' ? '#F0FDF4' : 'transparent',
            }}
          >
            <Text
              className="font-jakarta-medium text-sm"
              style={{ color: issuerType === 'council' ? '#1ABC9C' : '#6B7280' }}
            >
              Council PCN
            </Text>
          </SquishyPressable>
          <SquishyPressable
            onPress={() => setIssuerType('private')}
            className="flex-1 rounded-lg border-2 px-4 py-2.5 items-center"
            style={{
              borderColor: issuerType === 'private' ? '#1ABC9C' : '#E5E7EB',
              backgroundColor: issuerType === 'private' ? '#F0FDF4' : 'transparent',
            }}
          >
            <Text
              className="font-jakarta-medium text-sm"
              style={{ color: issuerType === 'private' ? '#1ABC9C' : '#6B7280' }}
            >
              Private PCN
            </Text>
          </SquishyPressable>
        </View>
      </View>

      {/* Stage selection */}
      <View className="mb-4">
        <Text className="font-jakarta-medium text-sm text-gray-900 mb-2">Current Stage</Text>
        <View className="gap-y-2">
          {(['initial', 'nto', 'rejection', 'charge_cert'] as const).map((stage) => (
            <SquishyPressable
              key={stage}
              onPress={() => setTicketStage(stage)}
              className="rounded-lg border-2 px-4 py-2.5"
              style={{
                borderColor: ticketStage === stage ? '#1ABC9C' : '#E5E7EB',
                backgroundColor: ticketStage === stage ? '#F0FDF4' : 'transparent',
              }}
            >
              <Text
                className="font-jakarta-medium text-sm"
                style={{ color: ticketStage === stage ? '#1ABC9C' : '#6B7280' }}
              >
                {stageLabels[stage]}
              </Text>
            </SquishyPressable>
          ))}
        </View>
      </View>

      {/* Collapsible secondary fields */}
      <SquishyPressable
        onPress={() => setShowMore(!showMore)}
        className="flex-row items-center justify-center gap-x-2 py-2 mb-2"
      >
        <Text className="font-jakarta-medium text-sm text-gray-400">
          {showMore ? 'Show less' : 'More details'}
        </Text>
        <FontAwesomeIcon
          icon={showMore ? faChevronUp : faChevronDown}
          size={12}
          color="#9CA3AF"
        />
      </SquishyPressable>

      {showMore && (
        <View className="mb-4">
          {wizardData.contraventionCode ? (
            <View className="mb-3">
              <Text className="font-jakarta-medium text-sm text-gray-900 mb-1">
                Contravention Code
              </Text>
              <Text className="font-jakarta text-sm text-gray-500">
                {wizardData.contraventionCode}
              </Text>
            </View>
          ) : null}
          {wizardData.initialAmount > 0 && (
            <View className="mb-3">
              <Text className="font-jakarta-medium text-sm text-gray-900 mb-1">Amount</Text>
              <Text className="font-jakarta text-sm text-gray-500">
                {'\u00A3'}
                {(wizardData.initialAmount / 100).toFixed(2)}
              </Text>
            </View>
          )}
          {wizardData.location?.line1 && (
            <View className="mb-3">
              <Text className="font-jakarta-medium text-sm text-gray-900 mb-1">Location</Text>
              <Text className="font-jakarta text-sm text-gray-500">
                {wizardData.location.line1}
                {wizardData.location.city ? `, ${wizardData.location.city}` : ''}
              </Text>
            </View>
          )}
          {wizardData.issuedAt && (
            <View className="mb-3">
              <Text className="font-jakarta-medium text-sm text-gray-900 mb-1">Date Issued</Text>
              <Text className="font-jakarta text-sm text-gray-500">
                {new Date(wizardData.issuedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      )}

      <SquishyPressable
        testID="confirm-continue"
        onPress={() =>
          onNext({
            pcnNumber: pcnNumber.trim(),
            vehicleReg: vehicleReg.trim(),
            issuerType,
            ticketStage,
          })
        }
        disabled={!isValid}
        className="py-4 rounded-xl items-center justify-center mb-8"
        style={{ backgroundColor: isValid ? '#1ABC9C' : '#D1D5DB' }}
      >
        <Text
          className="font-jakarta-semibold text-lg"
          style={{ color: isValid ? '#fff' : '#9CA3AF' }}
        >
          Continue
        </Text>
      </SquishyPressable>
    </ScrollView>
  );
};

export default ConfirmStep;
