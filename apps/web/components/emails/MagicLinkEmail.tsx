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

const securityBox = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const securityText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const linkBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  margin: '16px 0',
  wordBreak: 'break-all' as const,
};

const linkText = {
  color: '#266696',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
  fontFamily: 'monospace',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const MagicLinkEmail = ({ magicLink }: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Sign in to Parking Ticket Pal</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Sign In to Your Account" />

        <Text style={greeting}>Welcome back!</Text>

        <Text style={text}>
          Click the button below to securely sign in to your Parking Ticket Pal account.
        </Text>

        <EmailButton href={magicLink}>
          Sign In Now
        </EmailButton>

        <Section style={securityBox}>
          <Text style={securityText}>
            🔒 <strong>Security Notice:</strong> This link will expire in 15 minutes for your security.
          </Text>
          <Text style={securityText}>
            If you didn&apos;t request this email, you can safely ignore it.
          </Text>
        </Section>

        <Text style={text}>
          If the button doesn&apos;t work, copy and paste this link into your browser:
        </Text>

        <Section style={linkBox}>
          <Text style={linkText}>{magicLink}</Text>
        </Section>

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

export default MagicLinkEmail;
