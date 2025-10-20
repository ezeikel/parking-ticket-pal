import {
  Html,
  Head,
  Preview,
  Body,
  Text,
  Container,
  Section,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';
import EmailButton from '@/components/emails/EmailButton';

type ReminderEmailProps = {
  name: string;
  reminderType: '14-day' | '28-day';
  pcnNumber: string;
  vehicleRegistration: string;
  issueDate: string;
  issuer: string;
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

const urgentBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const urgentTitle = {
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const urgentText = {
  color: '#78350f',
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

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const ReminderEmail = ({
  name = 'Sarah Johnson',
  reminderType = '14-day',
  pcnNumber = 'PCN123456789',
  vehicleRegistration = 'AB12 CDE',
  issueDate = '15th October 2025',
  issuer = 'Transport for London',
}: ReminderEmailProps) => {
  const deadlineText = reminderType === '14-day'
    ? '14-Day Reduced Payment Deadline'
    : '28-Day Final Payment Deadline';

  return (
    <Html>
      <Head />
      <Preview>Reminder: Your ticket deadline is approaching</Preview>
      <Body style={main}>
        <Container style={container}>
          <EmailHeader title="Parking Ticket Reminder" />

          <Text style={greeting}>Hi {name},</Text>

          <Section style={urgentBox}>
            <Text style={urgentTitle}>⏰ Deadline Approaching</Text>
            <Text style={urgentText}>{deadlineText}</Text>
          </Section>

          <Text style={text}>
            This is a quick reminder that your parking ticket is approaching an important deadline.
            Taking action now can help you avoid additional charges.
          </Text>

          <Section style={detailsBox}>
            <div style={detailRow}>
              <Text style={detailLabel}>PCN Number</Text>
              <Text style={detailValue}>{pcnNumber}</Text>
            </div>
            <div style={detailRow}>
              <Text style={detailLabel}>Vehicle Registration</Text>
              <Text style={detailValue}>{vehicleRegistration}</Text>
            </div>
            <div style={detailRow}>
              <Text style={detailLabel}>Issue Date</Text>
              <Text style={detailValue}>{issueDate}</Text>
            </div>
            <div style={detailRow}>
              <Text style={detailLabel}>Issuing Authority</Text>
              <Text style={detailValue}>{issuer}</Text>
            </div>
          </Section>

          <EmailButton href="https://parkingticketpal.com/dashboard">
            View My Dashboard
          </EmailButton>

          <Text style={text}>
            Log in to review your options, check appeal eligibility, or manage your payment.
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
};

export default ReminderEmail;
