'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScaleUnbalanced,
  faArrowRight,
} from '@fortawesome/pro-regular-svg-icons';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/getCurrentAmountDue';
import ChallengeStats from '@/components/ChallengeStats/ChallengeStats';
import { TicketWithRelations } from '@/types';
import { TicketTier } from '@prisma/client';
import { createTicketCheckoutSession } from '@/app/actions/stripe';

type TicketUpsellCTAProps = {
  ticket: TicketWithRelations;
  successRate: number;
};

const TicketUpsellCTA = ({ ticket, successRate }: TicketUpsellCTAProps) => {
  const handleCheckout = async (tier: Omit<TicketTier, 'FREE'>) => {
    const result = await createTicketCheckoutSession(tier, ticket.id);

    if (result?.url) {
      window.location.href = result.url;
    } else {
      console.error('Failed to create checkout session');
    }
  };

  const handleScrollToChallenge = () => {
    document
      .getElementById('challenge-section')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const messages: Record<TicketTier, string> = {
    [TicketTier.FREE]:
      'Track your ticket for free — upgrade to get reminders or challenge it and save.',
    [TicketTier.STANDARD]:
      "You've unlocked reminders — upgrade to challenge this ticket the smart way.",
    [TicketTier.PREMIUM]:
      'You have full access. Challenge this ticket and save money.',
  };

  const renderUserControls = () => {
    switch (ticket.tier) {
      case TicketTier.FREE:
        return (
          <div className="flex items-center gap-2">
            <Button
              className="cursor-pointer"
              size="sm"
              onClick={() => handleCheckout(TicketTier.STANDARD)}
            >
              Get Reminders (£2.99)
            </Button>
            <Button
              className="cursor-pointer"
              variant="secondary"
              size="sm"
              onClick={() => handleCheckout(TicketTier.PREMIUM)}
            >
              Challenge Ticket (£9.99)
            </Button>
          </div>
        );
      case TicketTier.STANDARD:
        return (
          <Button size="sm" onClick={() => handleCheckout(TicketTier.PREMIUM)}>
            Upgrade to Challenge (£7.00)
          </Button>
        );
      case TicketTier.PREMIUM:
        return (
          <Button size="sm" onClick={handleScrollToChallenge}>
            Challenge Now
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" size="sm" />
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 dark:from-gray-800/20 dark:via-gray-900/50 dark:to-gray-800/20 border border-blue-200/50 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left">
          <div className="flex-shrink-0">
            <FontAwesomeIcon
              icon={faScaleUnbalanced}
              className="text-blue-600 dark:text-blue-400"
              size="lg"
            />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {messages[ticket.tier]}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ChallengeStats
            tier={ticket.tier}
            successRate={successRate}
            potentialSavings={formatCurrency(ticket.initialAmount / 2)}
            onUnlock={() => handleCheckout(TicketTier.PREMIUM)}
          />
          {renderUserControls()}
        </div>
      </div>
    </div>
  );
};

export default TicketUpsellCTA;
