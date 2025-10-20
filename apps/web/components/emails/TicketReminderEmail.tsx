import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import EmailHeader from './EmailHeader';
import EmailFooter from './EmailFooter';
import EmailButton from './EmailButton';

type TicketReminderEmailProps = {
  pcnNumber: string;
  dueDate: string;
  amount: string;
};

// Styles
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

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const urgentBox = {
  backgroundColor: '#fee2e2',
  border: '2px solid #ef4444',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const urgentTitle = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const urgentText = {
  color: '#7f1d1d',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const detailsBox = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const detailRow = {
  margin: '12px 0',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const detailValue = {
  color: '#1f2937',
  fontSize: '16px',
  margin: '0',
};

const amountValue = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const TicketReminderEmail = ({
  pcnNumber,
  dueDate,
  amount,
}: TicketReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>Reminder: Parking Ticket {pcnNumber} Due Soon</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Parking Ticket Due Soon" />

        <Section style={urgentBox}>
          <Text style={urgentTitle}>⚠️ Payment Deadline Approaching</Text>
          <Text style={urgentText}>
            Take action before {dueDate} to avoid additional charges
          </Text>
        </Section>

        <Text style={text}>
          Your parking ticket <strong>{pcnNumber}</strong> is due soon.
          Don&apos;t forget to take action before the deadline to avoid additional penalties.
        </Text>

        <Section style={detailsBox}>
          <div style={detailRow}>
            <Text style={detailLabel}>PCN Number</Text>
            <Text style={detailValue}>{pcnNumber}</Text>
          </div>
          <div style={detailRow}>
            <Text style={detailLabel}>Due Date</Text>
            <Text style={detailValue}>{dueDate}</Text>
          </div>
          <div style={detailRow}>
            <Text style={detailLabel}>Amount Due</Text>
            <Text style={amountValue}>£{amount}</Text>
          </div>
        </Section>

        <EmailButton href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}>
          View in Dashboard
        </EmailButton>

        <Text style={text}>
          Log in to your dashboard to view ticket details, check appeal options,
          or manage your payment.
        </Text>

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

export default TicketReminderEmail;
