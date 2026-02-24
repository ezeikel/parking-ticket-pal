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

type OnboardingSocialProofEmailProps = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  ticketId: string;
  issuerAllowedCount: number;
  issuerTotalCases: number;
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

const statBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #bbf7d0',
  textAlign: 'center' as const,
};

const statNumber = {
  color: '#15803d',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 4px 0',
};

const statLabel = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const OnboardingSocialProofEmail = ({
  name,
  pcnNumber,
  issuer,
  ticketId,
  issuerAllowedCount,
  issuerTotalCases,
}: OnboardingSocialProofEmailProps) => (
  <Html>
    <Head />
    <Preview>Tickets like yours — what the data shows</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader
          title="What the data shows"
          subtitle={`Ticket ${pcnNumber}`}
        />

        <Text style={greeting}>Hi {name || 'there'},</Text>

        <Text style={text}>
          {issuer} has had {issuerTotalCases.toLocaleString()} tickets taken to
          tribunal. {issuerAllowedCount.toLocaleString()} were overturned.
        </Text>

        <Section style={statBox}>
          <Text style={statNumber}>{issuerAllowedCount.toLocaleString()}</Text>
          <Text style={statLabel}>
            tickets overturned out of {issuerTotalCases.toLocaleString()} cases
            involving {issuer}
          </Text>
        </Section>

        <Text style={text}>
          This is public tribunal data — not your personalised Success Score.
        </Text>

        <Text style={text}>
          Your ticket&apos;s specific chances depend on your contravention code,
          location, and circumstances. That&apos;s what your personalised
          Success Score calculates.
        </Text>

        <EmailButton href={`${APP_URL}/tickets/${ticketId}`}>
          Unlock Your Success Score
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

export default OnboardingSocialProofEmail;
