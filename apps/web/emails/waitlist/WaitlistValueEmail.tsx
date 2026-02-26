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
import EmailHeader from '../EmailHeader';
import EmailFooter from '../EmailFooter';

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

const numberedList = {
  margin: '16px 0',
  padding: '0 0 0 20px',
};

const listItem = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '4px 0',
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

const resourcesSection = {
  backgroundColor: '#F7F7F7',
  borderRadius: '12px',
  padding: '20px 24px',
};

const resourcesTitle = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const resourceLink = {
  color: '#1ABC9C',
  fontSize: '15px',
  fontWeight: '500',
  textDecoration: 'none',
  display: 'block',
  margin: '8px 0',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const utm = 'utm_source=email&utm_medium=waitlist&utm_campaign=value';

const WaitlistValueEmail = ({
  unsubscribeUrl,
}: { unsubscribeUrl?: string } = {}) => (
  <Html lang="en">
    <Head />
    <Preview>Most parking ticket appeals don&apos;t need a solicitor</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="You don't need a solicitor" />

        <Text style={greeting}>Hi again,</Text>

        <Text style={text}>Quick update from the Parking Ticket Pal team.</Text>

        <Text style={text}>
          One thing we hear a lot: &quot;I&apos;d challenge my ticket, but I
          don&apos;t know where to start.&quot;
        </Text>

        <Text style={text}>
          Here&apos;s the thing —{' '}
          <span style={bold}>you don&apos;t need a solicitor</span>. Most
          successful appeals are written by the drivers themselves. The key is
          knowing:
        </Text>

        <ol style={numberedList}>
          <li style={listItem}>
            <span style={bold}>Your specific contravention code</span> — each
            one has known weak points
          </li>
          <li style={listItem}>
            <span style={bold}>What evidence to include</span> — photos,
            timestamps, witness statements
          </li>
          <li style={listItem}>
            <span style={bold}>Which form to use</span> — PE2, PE3, TE7... it
            depends on what stage you&apos;re at
          </li>
          <li style={listItem}>
            <span style={bold}>Your deadlines</span> — miss one and your options
            shrink fast
          </li>
        </ol>

        <Text style={text}>
          That&apos;s exactly what Parking Ticket Pal helps with. We track your
          deadlines, tell you which forms you need, and help you put together a
          proper challenge.
        </Text>

        <Text style={text}>
          We&apos;ve analysed thousands of real UK tribunal decisions to
          understand what works and what doesn&apos;t. When the app launches,
          you&apos;ll have all of that in your pocket.
        </Text>

        <div style={divider} />

        <Section style={resourcesSection}>
          <Text style={resourcesTitle}>
            Free resources you can use right now:
          </Text>
          <Link
            href={`${APP_URL}/tools/letters/parking?${utm}`}
            style={resourceLink}
          >
            → Appeal letter templates
          </Link>
          <Link
            href={`${APP_URL}/tools/reference/issuers?${utm}`}
            style={resourceLink}
          >
            → Look up your issuer
          </Link>
          <Link
            href={`${APP_URL}/tools/reference/contravention-codes?${utm}`}
            style={resourceLink}
          >
            → Contravention code guide
          </Link>
        </Section>

        <Text style={signature}>
          Speak soon,
          <br />
          The Parking Ticket Pal Team
        </Text>

        <EmailFooter unsubscribeUrl={unsubscribeUrl} />
      </Container>
    </Body>
  </Html>
);

export default WaitlistValueEmail;
