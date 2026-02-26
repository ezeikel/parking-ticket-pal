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
import {
  main,
  container,
  card,
  greeting,
  text,
  signature,
  signatureName,
} from './styles';

type MagicLinkEmailProps = {
  magicLink: string;
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

const MagicLinkEmail = ({ magicLink }: MagicLinkEmailProps) => (
  <Html lang="en">
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
