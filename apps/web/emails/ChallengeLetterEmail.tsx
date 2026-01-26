import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import EmailHeader from './EmailHeader';
import EmailFooter from './EmailFooter';
import EmailButton from './EmailButton';

type ChallengeLetterEmailProps = {
  userName: string;
  pcnNumber: string;
  issuer: string;
  vehicleRegistration?: string;
  downloadUrl?: string;
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

const greeting = {
  color: '#222222',
  fontSize: '18px',
  fontWeight: '400',
  margin: '32px 0 20px 0',
  lineHeight: '26px',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 20px 0',
};

const highlightBox = {
  backgroundColor: '#F0FDF9',
  border: '1px solid #D1FAE5',
  borderRadius: '12px',
  padding: '24px',
  margin: '28px 0',
};

const highlightTitle = {
  color: '#065F46',
  fontSize: '13px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
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

const infoSection = {
  backgroundColor: '#FAFAFA',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
};

const infoText = {
  color: '#717171',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const steps = {
  margin: '28px 0',
};

const stepItem = {
  display: 'flex' as const,
  marginBottom: '16px',
};

const stepNumber = {
  backgroundColor: '#1ABC9C',
  color: '#ffffff',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  fontSize: '14px',
  fontWeight: '600',
  textAlign: 'center' as const,
  lineHeight: '28px',
  marginRight: '12px',
  flexShrink: 0,
};

const stepText = {
  color: '#484848',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '2px 0 0 0',
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

const linkStyle = {
  color: '#1ABC9C',
  textDecoration: 'none',
  fontWeight: '500',
};

const ChallengeLetterEmail = ({
  userName = 'Sarah',
  pcnNumber = 'ZY10071578',
  issuer = 'Lewisham Council',
  vehicleRegistration = 'AB12 CDE',
  downloadUrl = 'https://parkingticketpal.com/download/challenge-letter.pdf',
}: ChallengeLetterEmailProps) => (
  <Html>
    <Head />
    <Preview>Your challenge letter for PCN {pcnNumber} is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={card}>
          <EmailHeader
            title="Your Challenge Letter is Ready"
            subtitle="We've prepared everything you need"
          />

          <Text style={greeting}>Hi {userName || 'there'},</Text>

          <Text style={text}>
            Great news! Your challenge letter has been generated and is attached
            to this email as a PDF. We&apos;ve done the heavy lifting — now
            it&apos;s time to submit your appeal.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightTitle}>Ticket Details</Text>
            <div style={detailRow}>
              <Text style={detailLabel}>PCN Number</Text>
              <Text style={detailValue}>{pcnNumber}</Text>
            </div>
            <div style={detailRow}>
              <Text style={detailLabel}>Issuing Authority</Text>
              <Text style={detailValue}>{issuer}</Text>
            </div>
            {vehicleRegistration && (
              <div style={detailRow}>
                <Text style={detailLabel}>Vehicle Registration</Text>
                <Text style={detailValue}>{vehicleRegistration}</Text>
              </div>
            )}
          </Section>

          <Text style={{ ...text, fontWeight: '600', color: '#222222' }}>
            What to do next:
          </Text>

          <Section style={steps}>
            <Row style={stepItem}>
              <Column style={{ width: '40px' }}>
                <div style={stepNumber}>1</div>
              </Column>
              <Column>
                <Text style={stepText}>
                  Review the attached PDF and make any necessary edits
                </Text>
              </Column>
            </Row>
            <Row style={stepItem}>
              <Column style={{ width: '40px' }}>
                <div style={stepNumber}>2</div>
              </Column>
              <Column>
                <Text style={stepText}>
                  Submit your letter to {issuer} following their guidelines
                </Text>
              </Column>
            </Row>
            <Row style={stepItem}>
              <Column style={{ width: '40px' }}>
                <div style={stepNumber}>3</div>
              </Column>
              <Column>
                <Text style={stepText}>
                  Keep a copy of your submission for your records
                </Text>
              </Column>
            </Row>
          </Section>

          {downloadUrl && (
            <EmailButton href={downloadUrl}>Download Letter</EmailButton>
          )}

          <Section style={infoSection}>
            <Text style={infoText}>
              You can also access this letter anytime from your{' '}
              <Link
                href="https://parkingticketpal.com/dashboard"
                style={linkStyle}
              >
                dashboard
              </Link>
              . If you need to make changes, you can regenerate the letter with
              updated information.
            </Text>
          </Section>

          <Text style={signature}>Best of luck with your appeal!</Text>
          <Text style={signatureName}>The Parking Ticket Pal Team</Text>

          <EmailFooter />
        </div>
      </Container>
    </Body>
  </Html>
);

export default ChallengeLetterEmail;
