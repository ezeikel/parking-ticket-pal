import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';
import EmailButton from '@/components/emails/EmailButton';

type OnboardingQuickWinEmailProps = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  numberOfCases: number;
  ticketId: string;
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

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const OnboardingQuickWinEmail = ({
  name,
  pcnNumber,
  issuer,
  numberOfCases,
  ticketId,
}: OnboardingQuickWinEmailProps) => (
  <Html>
    <Head />
    <Preview>Your ticket {pcnNumber} — we found something</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title={`Your ticket ${pcnNumber}`} />

        <Text style={greeting}>Hi {name || 'there'},</Text>

        <Text style={text}>
          We&apos;ve analysed {numberOfCases.toLocaleString()}+ real tribunal
          cases involving {issuer}.
        </Text>

        <Text style={text}>
          Tickets with your contravention code have a known pattern of outcomes
          — some get overturned, some don&apos;t. Your personalised Success
          Score tells you exactly where yours falls.
        </Text>

        <Text style={text}>Unlock it for just £2.99.</Text>

        <EmailButton href={`${APP_URL}/tickets/${ticketId}`}>
          See Your Chances
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

export default OnboardingQuickWinEmail;
