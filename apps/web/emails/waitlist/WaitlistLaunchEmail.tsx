import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Section,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';
import EmailButton from '@/components/emails/EmailButton';

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

const bold = {
  fontWeight: '600',
  color: '#1f2937',
};

const listContainer = {
  margin: '16px 0',
  padding: '0',
};

const listItem = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '0',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const divider = {
  borderTop: '1px solid #EBEBEB',
  margin: '32px 0',
};

const highlightBox = {
  backgroundColor: '#F0FDF9',
  borderRadius: '12px',
  padding: '20px 24px',
  border: '1px solid #D1FAE5',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const highlightText = {
  color: '#065F46',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const highlightSubtext = {
  color: '#047857',
  fontSize: '14px',
  margin: '8px 0 0 0',
};

const requestBox = {
  backgroundColor: '#F7F7F7',
  borderRadius: '12px',
  padding: '20px 24px',
  textAlign: 'center' as const,
};

const requestTitle = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const requestText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

type WaitlistLaunchEmailProps = {
  appStoreUrl?: string;
  playStoreUrl?: string;
};

const WaitlistLaunchEmail = ({
  appStoreUrl = '#',
  playStoreUrl = '#',
}: WaitlistLaunchEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Parking Ticket Pal is live on iPhone and Android — download now
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader
          title="The app is here"
          subtitle="Parking Ticket Pal is now on iPhone and Android"
        />

        <Text style={greeting}>Hi,</Text>

        <Text style={text}>
          It&apos;s launch day.{' '}
          <span style={bold}>
            Parking Ticket Pal is now available on the App Store and Google
            Play.
          </span>
        </Text>

        <Text style={text}>
          You were on the waitlist, so here&apos;s your early access:
        </Text>

        <EmailButton href={appStoreUrl}>Download for iPhone</EmailButton>
        <EmailButton href={playStoreUrl} variant="secondary">
          Download for Android
        </EmailButton>

        <Section style={highlightBox}>
          <Text style={highlightText}>
            As a thank you for waiting — £3 off your first premium ticket
          </Text>
          <Text style={highlightSubtext}>
            Just sign up with the same email you&apos;re reading this on.
          </Text>
        </Section>

        <Text style={{ ...text, fontWeight: '600', color: '#1f2937' }}>
          What you can do from Day 1:
        </Text>

        <Section style={listContainer}>
          <Text style={listItem}>
            <span style={bold}>Scan a parking ticket</span> with your camera
          </Text>
          <Text style={listItem}>
            <span style={bold}>Track deadlines</span> with push notifications
          </Text>
          <Text style={listItem}>
            <span style={bold}>Build a challenge letter</span> tailored to your
            ticket
          </Text>
          <Text style={listItem}>
            <span style={bold}>Pre-fill legal forms</span> (PE2, PE3, TE7, TE9)
            with your details
          </Text>
        </Section>

        <div style={divider} />

        <Section style={requestBox}>
          <Text style={requestTitle}>One small favour?</Text>
          <Text style={requestText}>
            If you find the app useful, a quick review on the App Store or
            Google Play makes a huge difference. It helps other drivers find the
            app when they need it most.
          </Text>
        </Section>

        <div style={divider} />

        <Text style={text}>
          <span style={bold}>Know someone with a parking ticket?</span> Share
          your referral code from the app — you&apos;ll both earn credit towards
          premium features.
        </Text>

        <Text style={signature}>
          Thanks for being an early supporter.
          <br />
          <br />
          The Parking Ticket Pal Team
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
);

export default WaitlistLaunchEmail;
