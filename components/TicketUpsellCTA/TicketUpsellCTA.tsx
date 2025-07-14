'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScaleUnbalanced,
  faArrowRight,
} from '@fortawesome/pro-regular-svg-icons';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/getCurrentAmountDue';
import ChallengeStats from '@/components/ChallengeStats/ChallengeStats';
import { TicketWithPrediction } from '@/types';
import { TicketTier } from '@prisma/client';
import { createTicketCheckoutSession } from '@/app/actions/stripe';

type TicketUpsellCTAProps = {
  ticket: TicketWithPrediction;
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

  const messages = {
    FREE: 'Track your ticket for free — upgrade to get reminders or challenge it and save.',
    BASIC:
      "You've unlocked reminders — upgrade to challenge this ticket the smart way.",
    PRO: 'You have full access. Challenge this ticket and save money.',
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 dark:from-gray-800/20 dark:via-gray-900/50 dark:to-gray-800/20 border border-blue-200/50 dark:border-gray-700 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-4 text-left flex-1">
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

        <div className="flex-shrink-0">
          <ChallengeStats
            successRate={successRate}
            potentialSavings={formatCurrency(ticket.initialAmount / 2)}
            tier={ticket.tier}
          />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {ticket.tier === TicketTier.FREE && (
            <>
              <Button
                size="sm"
                onClick={() => handleCheckout(TicketTier.BASIC)}
              >
                Get Reminders (£2.99)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleCheckout(TicketTier.PRO)}
                className="border border-gray-300 dark:border-gray-700"
              >
                Challenge Ticket (£9.99)
              </Button>
            </>
          )}
          {ticket.tier === TicketTier.BASIC && (
            <Button size="sm" onClick={() => handleCheckout(TicketTier.PRO)}>
              Upgrade to Challenge (£7.00)
            </Button>
          )}
          {ticket.tier === TicketTier.PRO && (
            <Button size="sm" onClick={handleScrollToChallenge}>
              Challenge Now
              <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketUpsellCTA;
