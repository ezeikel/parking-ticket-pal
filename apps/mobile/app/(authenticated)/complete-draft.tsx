import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import TicketWizard from '@/components/TicketWizard/TicketWizard';
import { convertDraftTicket } from '@/api';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import type { WizardResult } from '@/components/TicketWizard/types';

const CompleteDraftScreen = () => {
  const { draftTicketId } = useLocalSearchParams<{ draftTicketId: string }>();
  const queryClient = useQueryClient();

  // Redirect if no draftTicketId — must be in useEffect, not during render
  useEffect(() => {
    if (!draftTicketId) {
      toast.error('Error', 'No draft ticket ID provided');
      router.back();
    }
  }, [draftTicketId]);

  const handleWizardComplete = useCallback(
    async (result: WizardResult) => {
      if (!draftTicketId) return;

      try {
        // The wizard already created the ticket — now apply PREMIUM and delete the draft
        await convertDraftTicket(draftTicketId, result.ticketId);
        logger.info('Draft ticket converted successfully', {
          action: 'complete-draft',
          draftTicketId,
          ticketId: result.ticketId,
        });
      } catch (error) {
        logger.error(
          'Failed to convert draft ticket',
          { action: 'complete-draft', draftTicketId },
          error instanceof Error ? error : new Error(String(error)),
        );
        // Don't block navigation — ticket was created, just PREMIUM upgrade failed
      }

      // Invalidate queries so the list refreshes
      await queryClient.invalidateQueries({ queryKey: ['draftTickets'] });
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });

      // Navigate to the new ticket
      router.replace(`/ticket/${result.ticketId}`);
    },
    [draftTicketId, queryClient],
  );

  const handleCancel = useCallback(() => {
    router.back();
  }, []);

  if (!draftTicketId) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1 }}>
        <TicketWizard
          ocrData={null}
          onComplete={handleWizardComplete}
          onCancel={handleCancel}
        />
      </View>
    </SafeAreaView>
  );
};

export default CompleteDraftScreen;
