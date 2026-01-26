import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import EmailHeader from './EmailHeader';
import EmailFooter from './EmailFooter';
import EmailButton from './EmailButton';

type TicketReminderEmailProps = {
  pcnNumber: string;
  dueDate: string;
  amount: string;
};

// Airbnb-inspired styles
const main = {
  backgroundColor: '#F7F7F7',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '40px 32px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 20px 0',
};

const urgentBox = {
  backgroundColor: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: '12px',
  padding: '24px',
  margin: '28px 0',
  textAlign: 'center' as const,
};

const urgentIcon = {
  fontSize: '36px',
  margin: '0 0 12px 0',
};

const urgentTitle = {
  color: '#991B1B',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  margin: '0 0 8px 0',
};

const urgentText = {
  color: '#7F1D1D',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
  lineHeight: '24px',
};

const amountDisplay = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const amountLabel = {
  color: '#717171',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px 0',
};

const amountValue = {
  color: '#222222',
  fontSize: '48px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-1px',
};

const detailsBox = {
  backgroundColor: '#FAFAFA',
  borderRadius: '12px',
  padding: '24px',
  margin: '28px 0',
};

const detailLabel = {
  color: '#717171',
  fontSize: '12px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const detailValue = {
  color: '#222222',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
};

const tipBox = {
  backgroundColor: '#F0FDF9',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
};

const tipText = {
  color: '#065F46',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const signature = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 0 0',
};

const signatureName = {
  color: '#222222',
  fontSize: '16px',
  fontWeight: '600',
  margin: '8px 0 0 0',
};

const TicketReminderEmail = ({
  pcnNumber,
  dueDate,
  amount,
}: TicketReminderEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Action required: Parking ticket {pcnNumber} due {dueDate}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={card}>
          <EmailHeader
            title="Payment Due Soon"
            subtitle="Take action to avoid additional charges"
          />

          <Section style={urgentBox}>
            <Text style={urgentIcon}>⚠️</Text>
            <Text style={urgentTitle}>Deadline Approaching</Text>
            <Text style={urgentText}>
              Act before {dueDate} to avoid late penalties
            </Text>
          </Section>

          <Section style={amountDisplay}>
            <Text style={amountLabel}>Amount Due</Text>
            <Text style={amountValue}>£{amount}</Text>
          </Section>

          <Section style={detailsBox}>
            <Row>
              <Column style={{ width: '50%', textAlign: 'center' }}>
                <Text style={detailLabel}>PCN Number</Text>
                <Text style={detailValue}>{pcnNumber}</Text>
              </Column>
              <Column style={{ width: '50%', textAlign: 'center' }}>
                <Text style={detailLabel}>Due Date</Text>
                <Text style={detailValue}>{dueDate}</Text>
              </Column>
            </Row>
          </Section>

          <Text style={text}>
            Your parking ticket is due soon. Log in to your dashboard to view
            the full details, check if you&apos;re eligible to appeal, or manage
            your payment options.
          </Text>

          <EmailButton href="https://parkingticketpal.com/dashboard">
            View in Dashboard
          </EmailButton>

          <Section style={tipBox}>
            <Text style={tipText}>
              <strong>Did you know?</strong> You may be able to challenge this
              ticket. Log in to check your appeal eligibility.
            </Text>
          </Section>

          <Text style={signature}>Best regards,</Text>
          <Text style={signatureName}>The Parking Ticket Pal Team</Text>

          <EmailFooter />
        </div>
      </Container>
    </Body>
  </Html>
);

TicketReminderEmail.PreviewProps = {
  pcnNumber: 'ZY10071578',
  dueDate: '29 January 2026',
  amount: '65.00',
} as TicketReminderEmailProps;

export default TicketReminderEmail;
