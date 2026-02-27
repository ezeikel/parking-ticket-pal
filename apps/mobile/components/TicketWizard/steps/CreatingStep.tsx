import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleExclamation } from '@fortawesome/pro-solid-svg-icons';
import * as Notifications from 'expo-notifications';
import useCreateTicket from '@/hooks/api/useUploadTicket';
import { useAnalytics } from '@/lib/analytics';
import { registerForPushNotifications } from '@/lib/notifications';
import Loader from '@/components/Loader/Loader';
import SquishyPressable from '@/components/SquishyPressable/SquishyPressable';
import type { WizardData, WizardResult } from '../types';

type CreatingStepProps = {
  wizardData: WizardData;
  onComplete: (result: WizardResult) => void;
};

const CreatingStep = ({ wizardData, onComplete }: CreatingStepProps) => {
  const createTicketMutation = useCreateTicket();
  const { trackEvent, trackError } = useAnalytics();
  const [error, setError] = useState<string | null>(null);

  const createTicket = async () => {
    setError(null);

    try {
      trackEvent('wizard_creating_ticket', { screen: 'onboarding' });

      const ticketData = {
        pcnNumber: wizardData.pcnNumber,
        vehicleReg: wizardData.vehicleReg,
        issuedAt: wizardData.issuedAt ?? new Date(),
        contraventionCode: wizardData.contraventionCode,
        initialAmount: wizardData.initialAmount,
        issuer: wizardData.issuer,
        location: wizardData.location ?? {
          line1: '',
          city: '',
          postcode: '',
          country: 'United Kingdom',
          coordinates: { latitude: 0, longitude: 0 },
        },
        tempImageUrl: wizardData.imageUrl,
        tempImagePath: wizardData.tempImagePath,
        extractedText: wizardData.extractedText,
      };

      const result = await createTicketMutation.mutateAsync(ticketData);

      if (result.success && result.ticket?.id) {
        trackEvent('wizard_ticket_created', {
          screen: 'onboarding',
          ticket_id: result.ticket.id,
          intent: wizardData.intent ?? undefined,
        });

        // Prompt for push notifications after first ticket creation
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          registerForPushNotifications();
        }

        onComplete({
          ticketId: result.ticket.id,
          intent: wizardData.intent ?? 'track',
        });
      } else {
        setError(result.error || 'Failed to create ticket.');
        trackError(result.error || 'Ticket creation failed', {
          screen: 'onboarding',
          action: 'wizard_create_ticket',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      trackError(err instanceof Error ? err : new Error(message), {
        screen: 'onboarding',
        action: 'wizard_create_ticket',
      });
    }
  };

  useEffect(() => {
    createTicket();
  }, []);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <FontAwesomeIcon icon={faCircleExclamation} size={28} color="#EF4444" />
          </View>
          <Text className="font-jakarta-bold text-xl text-gray-900 text-center mb-2">
            Something went wrong
          </Text>
          <Text className="font-jakarta text-base text-gray-500 text-center mb-6">{error}</Text>
          <SquishyPressable
            onPress={createTicket}
            className="py-3 px-8 rounded-xl items-center justify-center"
            style={{ backgroundColor: '#1ABC9C' }}
          >
            <Text className="font-jakarta-semibold text-white text-base">Try Again</Text>
          </SquishyPressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Animated.View entering={FadeInUp.duration(600)} className="items-center">
        <Loader size={48} color="#1ABC9C" />
        <Text className="font-jakarta-bold text-xl text-gray-900 text-center mt-6 mb-2">
          Creating your ticket...
        </Text>
        <Text className="font-jakarta text-base text-gray-500 text-center">
          This will only take a moment
        </Text>
      </Animated.View>
    </View>
  );
};

export default CreatingStep;
