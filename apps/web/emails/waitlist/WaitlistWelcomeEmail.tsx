import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Link,
  Section,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';

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

const bold = {
  fontWeight: '600',
  color: '#1f2937',
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

const ctaSection = {
  backgroundColor: '#F7F7F7',
  borderRadius: '12px',
  padding: '20px 24px',
  textAlign: 'center' as const,
};

const ctaText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 16px 0',
};

const linkStyle = {
  color: '#1ABC9C',
  fontWeight: '600',
  textDecoration: 'none',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const WaitlistWelcomeEmail = () => (
  <Html>
    <Head />
    <Preview>
      You&apos;re on the list — we&apos;ll email you when the app is ready
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="You're on the list" />

        <Text style={greeting}>Hi there,</Text>

        <Text style={text}>
          Thanks for joining the Parking Ticket Pal waitlist. We&apos;re
          building an app that makes dealing with parking tickets as painless as
          possible — and you&apos;ll be among the first to get it.
        </Text>

        <Text style={{ ...text, fontWeight: '600', color: '#1f2937' }}>
          What you&apos;ll get when it launches:
        </Text>

        <Section style={listContainer}>
          <Text style={listItem}>
            <span style={bold}>Scan your ticket</span> with your phone camera —
            no typing
          </Text>
          <Text style={listItem}>
            <span style={bold}>Deadline reminders</span> so your fine never
            increases because you forgot
          </Text>
          <Text style={listItem}>
            <span style={bold}>Challenge letters &amp; forms</span> tailored to
            your ticket and issuer
          </Text>
          <Text style={listItem}>
            <span style={bold}>All your vehicles</span> tracked in one dashboard
          </Text>
        </Section>

        <Text style={text}>
          We&apos;ll email you the day it&apos;s available on the App Store and
          Google Play. That&apos;s it — no spam, no weekly newsletters from this
          list.
        </Text>

        <div style={divider} />

        <Section style={ctaSection}>
          <Text style={ctaText}>
            <span style={bold}>Got a ticket right now?</span> Don&apos;t wait
            for the app — the web version has everything you need.
          </Text>
          <Link
            href={`${APP_URL}?utm_source=email&utm_medium=waitlist&utm_campaign=welcome`}
            style={linkStyle}
          >
            Use Parking Ticket Pal now →
          </Link>
        </Section>

        <Text style={signature}>
          Cheers,
          <br />
          The Parking Ticket Pal Team
        </Text>

        <EmailFooter />
      </Container>
    </Body>
  </Html>
);

export default WaitlistWelcomeEmail;
