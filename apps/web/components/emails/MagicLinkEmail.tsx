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

type MagicLinkEmailProps = {
  magicLink: string;
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

const securityBox = {
  backgroundColor: '#FAFAFA',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '28px 0',
};

const securityTitle = {
  color: '#222222',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  lineHeight: '20px',
};

const securityText = {
  color: '#717171',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const linkBox = {
  backgroundColor: '#F7F7F7',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  wordBreak: 'break-all' as const,
};

const linkLabel = {
  color: '#717171',
  fontSize: '12px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
};

const linkText = {
  color: '#1ABC9C',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  fontFamily:
    'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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

const MagicLinkEmail = ({ magicLink }: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Sign in to Parking Ticket Pal</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={card}>
          <EmailHeader
            title="Sign In to Your Account"
            subtitle="Click the button below to continue"
          />

          <Text style={greeting}>Welcome back!</Text>

          <Text style={text}>
            We received a request to sign in to your Parking Ticket Pal account.
            Click the button below to securely access your dashboard.
          </Text>

          <EmailButton href={magicLink}>Sign In to My Account</EmailButton>

          <Section style={securityBox}>
            <Text style={securityTitle}>Security Notice</Text>
            <Text style={securityText}>
              This link expires in 15 minutes for your protection. If you
              didn&apos;t request this email, you can safely ignore it — your
              account is secure.
            </Text>
          </Section>

          <Section style={linkBox}>
            <Text style={linkLabel}>Or copy this link</Text>
            <Text style={linkText}>{magicLink}</Text>
          </Section>

          <Text style={signature}>Happy travels!</Text>
          <Text style={signatureName}>The Parking Ticket Pal Team</Text>

          <EmailFooter />
        </div>
      </Container>
    </Body>
  </Html>
);

MagicLinkEmail.PreviewProps = {
  magicLink: 'https://parkingticketpal.com/auth/verify?token=abc123xyz',
} as MagicLinkEmailProps;

export default MagicLinkEmail;
