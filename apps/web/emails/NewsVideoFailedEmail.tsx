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

type NewsVideoFailedEmailProps = {
  failedAt: string;
  errorMessage: string;
  videoId?: string;
  headline?: string;
  stage?: string;
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

const errorBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const errorText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '12px 0 4px 0',
};

const detailValue = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px 0',
};

const codeBlock = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
  margin: '8px 0',
  fontSize: '12px',
  lineHeight: '18px',
  color: '#374151',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  fontFamily: 'monospace',
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

const NewsVideoFailedEmail = ({
  failedAt = new Date().toISOString(),
  errorMessage = 'Unknown error',
  videoId,
  headline,
  stage,
}: NewsVideoFailedEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>News Video Pipeline FAILED: {errorMessage.slice(0, 80)}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Pipeline Error" />

        <Text style={text}>
          The news video pipeline encountered an error and could not complete.
        </Text>

        <Section style={errorBox}>
          <Text style={errorText}>
            <strong>Error:</strong> {errorMessage}
          </Text>
        </Section>

        {stage && (
          <>
            <Text style={detailLabel}>Failed at stage</Text>
            <Text style={detailValue}>{stage}</Text>
          </>
        )}

        {headline && (
          <>
            <Text style={detailLabel}>Article headline</Text>
            <Text style={detailValue}>{headline}</Text>
          </>
        )}

        {videoId && (
          <>
            <Text style={detailLabel}>Video record ID</Text>
            <Text style={codeBlock}>{videoId}</Text>
          </>
        )}

        <Text style={timestampText}>
          Failed at:{' '}
          {new Date(failedAt).toLocaleString('en-GB', {
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

export default NewsVideoFailedEmail;
