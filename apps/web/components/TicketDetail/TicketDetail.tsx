import { MediaSource, TicketTier } from '@parking-ticket-pal/db/types';
import TicketUpsellCTA from '@/components/TicketUpsellCTA/TicketUpsellCTA';
import TicketDetailsCard from '@/components/TicketDetailsCard/TicketDetailsCard';
import ChallengeTicket from '@/components/ChallengeTicket/ChallengeTicket';
import TicketHistory from '@/components/TicketHistory/TicketHistory';
import TicketImages from '@/components/TicketImages/TicketImages';
import AdvancedForms from '@/components/AdvancedForms/AdvancedForms';
import RemindersCard from '@/components/RemindersCard/RemindersCard';
import ProFeatureLock from '@/components/ProFeatureLock/ProFeatureLock';
import EvidenceUploader from '@/components/EvidenceUploader/EvidenceUploader';
import { TicketWithRelations } from '@/types';

type TicketDetailProps = {
  ticket: TicketWithRelations;
};

const TicketDetail = ({ ticket }: TicketDetailProps) => {
  const letterEvents = ticket.letters.map((l) => ({
    type: 'letter' as const,
    date: l.sentAt,
    data: l,
  }));
  const formEvents = ticket.forms.map((f) => ({
    type: 'form' as const,
    date: f.createdAt,
    data: f,
  }));
  const challengeEvents = ticket.challenges.map((c) => ({
    type: 'challenge' as const,
    date: c.submittedAt || c.createdAt,
    data: c,
  }));
  const historyEvents = [
    ...letterEvents,
    ...formEvents,
    ...challengeEvents,
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  const ticketImages = ticket.media.filter(
    (m) => m.source === MediaSource.TICKET,
  );
  const userEvidence = ticket.media.filter(
    (m) => m.source === MediaSource.EVIDENCE,
  );

  const hasSignature = !!ticket.vehicle.user.signatureUrl;
  const isPremiumTier = ticket.tier === TicketTier.PREMIUM;

  return (
    <>
      <TicketUpsellCTA
        ticket={ticket}
        successRate={ticket.prediction?.percentage ?? 50}
      />

      <TicketDetailsCard ticket={ticket} />

      <RemindersCard tier={ticket.tier} reminders={ticket.reminders} />

      {isPremiumTier ? (
        <>
          <ChallengeTicket ticket={ticket} issuerType={ticket.issuerType} />
          <AdvancedForms ticket={ticket} hasSignature={hasSignature} />
        </>
      ) : (
        <>
          <ProFeatureLock>
            <ChallengeTicket ticket={ticket} issuerType={ticket.issuerType} />
          </ProFeatureLock>
          <ProFeatureLock>
            <AdvancedForms ticket={ticket} hasSignature={hasSignature} />
          </ProFeatureLock>
        </>
      )}
      <TicketImages images={ticketImages} />
      <EvidenceUploader ticketId={ticket.id} evidence={userEvidence} />
      <TicketHistory events={historyEvents} />
    </>
  );
};

export default TicketDetail;
