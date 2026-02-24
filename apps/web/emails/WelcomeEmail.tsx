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

type WelcomeEmailProps = {
  name?: string;
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

const bulletList = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '16px 0',
  paddingLeft: '0',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Welcome to Parking Ticket Pal - fight your parking ticket with AI
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Welcome to Parking Ticket Pal" />

        <Text style={greeting}>Hi {name || 'there'},</Text>

        <Text style={text}>
          You&apos;re all set! Here&apos;s how Parking Ticket Pal helps you
          fight unfair parking tickets:
        </Text>

        <Text style={bulletList}>
          &bull; Scan or upload your parking ticket{'\n'}
          &bull; Get an AI-powered Success Score{'\n'}
          &bull; Generate appeal letters in minutes
        </Text>

        <EmailButton href={`${APP_URL}/new`}>
          Upload Your First Ticket
        </EmailButton>

        <Text style={text}>
          Need help? Reply to this email or visit our support page.
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

export default WelcomeEmail;
