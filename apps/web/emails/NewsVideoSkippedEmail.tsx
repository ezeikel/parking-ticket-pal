import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';

type NewsVideoSkippedEmailProps = {
  checkedAt: string;
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const infoBox = {
  backgroundColor: '#fefce8',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const infoText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const timestampText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '16px 0 0 0',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const NewsVideoSkippedEmail = ({
  checkedAt = new Date().toISOString(),
}: NewsVideoSkippedEmailProps) => (
  <Html>
    <Head />
    <Preview>News Video Pipeline: No new articles found</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="No New Articles Found" />

        <Text style={text}>
          The news video pipeline ran but didn&apos;t find any new articles to
          create a video from.
        </Text>

        <Section style={infoBox}>
          <Text style={infoText}>
            This is normal — the pipeline deduplicates against previously used
            articles to avoid posting the same story twice. If no fresh UK
            motorist news is available, it will try again at the next scheduled
            run.
          </Text>
        </Section>

        <Text style={timestampText}>
          Checked at:{' '}
          {new Date(checkedAt).toLocaleString('en-GB', {
            timeZone: 'Europe/London',
          })}
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

export default NewsVideoSkippedEmail;
