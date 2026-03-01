import {
  Html,
  Head,
  Preview,
  Body,
  Text,
  Container,
  Section,
  Row,
  Column,
} from '@react-email/components';
import EmailHeader from './EmailHeader';
import EmailFooter from './EmailFooter';
import EmailButton from './EmailButton';
import {
  main,
  container,
  card,
  greeting,
  text,
  signature,
  signatureName,
} from './styles';

type ReminderEmailProps = {
  name: string;
  reminderType: '14-day' | '28-day';
  pcnNumber: string;
  vehicleRegistration: string;
  issueDate: string;
  issuer: string | null;
};

const urgentBox = {
  backgroundColor: '#FFFBEB',
  border: '1px solid #FCD34D',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '28px 0',
  textAlign: 'center' as const,
};

const urgentIcon = {
  fontSize: '32px',
  margin: '0 0 12px 0',
};

const urgentTitle = {
  color: '#92400E',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  margin: '0 0 8px 0',
};

const urgentText = {
  color: '#78350F',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '24px',
};

const detailsBox = {
  backgroundColor: '#FAFAFA',
  borderRadius: '12px',
  padding: '24px',
  margin: '28px 0',
};

const detailsTitle = {
  color: '#222222',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const detailRow = {
  marginBottom: '12px',
};

const detailLabel = {
  color: '#717171',
  fontSize: '13px',
  fontWeight: '500',
  margin: '0',
  lineHeight: '20px',
};

const detailValue = {
  color: '#222222',
  fontSize: '15px',
  fontWeight: '600',
  margin: '2px 0 0 0',
  lineHeight: '22px',
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

const ReminderEmail = ({
  name,
  reminderType,
  pcnNumber,
  vehicleRegistration,
  issueDate,
  issuer,
}: ReminderEmailProps) => {
  const is14Day = reminderType === '14-day';
  const deadlineText = is14Day
    ? '14-Day Reduced Payment Deadline'
    : '28-Day Final Payment Deadline';

  const headerSubtitle = is14Day
    ? 'Pay now to save 50% on your fine'
    : 'Final deadline approaching';

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {is14Day ? 'Save 50%' : 'Final reminder'}: Your ticket deadline is
        approaching
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={card}>
            <EmailHeader title="Deadline Reminder" subtitle={headerSubtitle} />

            <Text style={greeting}>Hi {name || 'there'},</Text>

            <Section style={urgentBox}>
              <Text style={urgentIcon}>⏰</Text>
              <Text style={urgentTitle}>Action Required</Text>
              <Text style={urgentText}>{deadlineText}</Text>
            </Section>

            <Text style={text}>
              Your parking ticket is approaching an important deadline. Taking
              action now can help you avoid additional charges
              {is14Day && ' and save 50% with the reduced payment period'}.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsTitle}>Ticket Details</Text>
              <Row>
                <Column style={{ width: '50%' }}>
                  <div style={detailRow}>
                    <Text style={detailLabel}>PCN Number</Text>
                    <Text style={detailValue}>{pcnNumber}</Text>
                  </div>
                  <div style={detailRow}>
                    <Text style={detailLabel}>Vehicle</Text>
                    <Text style={detailValue}>{vehicleRegistration}</Text>
                  </div>
                </Column>
                <Column style={{ width: '50%' }}>
                  <div style={detailRow}>
                    <Text style={detailLabel}>Issue Date</Text>
                    <Text style={detailValue}>{issueDate}</Text>
                  </div>
                  <div style={detailRow}>
                    <Text style={detailLabel}>Issuing Authority</Text>
                    <Text style={detailValue}>{issuer}</Text>
                  </div>
                </Column>
              </Row>
            </Section>

            <EmailButton href="https://parkingticketpal.com/dashboard">
              View My Dashboard
            </EmailButton>

            <Section style={tipBox}>
              <Text style={tipText}>
                <strong>Tip:</strong> Log in to review your options, check
                appeal eligibility, or generate a challenge letter.
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
};

ReminderEmail.PreviewProps = {
  name: 'Sarah',
  reminderType: '14-day',
  pcnNumber: 'ZY10071578',
  vehicleRegistration: 'AB12 CDE',
  issueDate: '15 January 2026',
  issuer: 'Lewisham Council',
} as ReminderEmailProps;

export default ReminderEmail;
