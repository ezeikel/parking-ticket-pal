import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Section,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';
import EmailButton from '@/components/emails/EmailButton';

type OnboardingDeadlineEmailProps = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  ticketId: string;
  discountAmount: string;
  fullAmount: string;
  discountDeadline: string;
  daysUntilDiscount: number;
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px',
  maxWidth: '580px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
};

const greeting = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 24px 0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const timelineBox = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
};

const timelineItem = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 0',
};

const timelineLabel = {
  fontWeight: '600',
  color: '#1f2937',
};

const highlight = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  fontWeight: '600',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const OnboardingDeadlineEmail = ({
  name,
  pcnNumber,
  ticketId,
  discountAmount,
  fullAmount,
  discountDeadline,
  daysUntilDiscount,
}: OnboardingDeadlineEmailProps) => (
  <Html>
    <Head />
    <Preview>{`${daysUntilDiscount} days before your fine doubles`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader
          title={`${String(daysUntilDiscount)} days left`}
          subtitle={`Ticket ${pcnNumber}`}
        />

        <Text style={greeting}>Hi {name || 'there'},</Text>

        <Text style={text}>
          Your parking ticket has a deadline approaching. Here&apos;s the
          timeline:
        </Text>

        <Section style={timelineBox}>
          <Text style={timelineItem}>
            <span style={timelineLabel}>Day 0–14:</span> Pay £{discountAmount}{' '}
            or challenge the ticket
          </Text>
          <Text style={timelineItem}>
            <span style={timelineLabel}>Day 14–28:</span> Pay £{fullAmount}{' '}
            (full amount)
          </Text>
          <Text style={timelineItem}>
            <span style={timelineLabel}>After Day 28:</span> Escalation — charge
            certificate, debt recovery
          </Text>
        </Section>

        <Text style={text}>
          Your discount deadline is <strong>{discountDeadline}</strong>.
        </Text>

        <Text style={highlight}>
          Challenging doesn&apos;t cost you the discount window. If your appeal
          is rejected, you still get 14 days to pay the reduced rate.
          There&apos;s no downside.
        </Text>

        <EmailButton href={`${APP_URL}/tickets/${ticketId}`}>
          Challenge This Ticket
        </EmailButton>

        <Text style={signature}>
          Best regards,
          <br />
          The Parking Ticket Pal Team
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
);

export default OnboardingDeadlineEmail;
