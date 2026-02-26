import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Text,
  Section,
} from '@react-email/components';
import EmailHeader from '../EmailHeader';
import EmailFooter from '../EmailFooter';
import EmailButton from '../EmailButton';

type OnboardingMathsEmailProps = {
  name?: string;
  pcnNumber: string;
  ticketId: string;
  discountAmount: string;
  fullAmount: string;
  daysUntilDiscount: number;
  unsubscribeUrl?: string;
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

const mathBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #bfdbfe',
};

const mathRow = {
  color: '#1e3a5f',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '4px 0',
};

const mathHighlight = {
  color: '#15803d',
  fontSize: '18px',
  lineHeight: '28px',
  margin: '12px 0 0 0',
  fontWeight: '700',
};

const daysBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '12px 20px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const daysText = {
  color: '#92400e',
  fontSize: '15px',
  fontWeight: '600',
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

const OnboardingMathsEmail = ({
  name,
  pcnNumber,
  ticketId,
  discountAmount,
  fullAmount,
  daysUntilDiscount,
  unsubscribeUrl,
}: OnboardingMathsEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>£2.99 vs £{fullAmount} — simple maths</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Simple maths" subtitle={`Ticket ${pcnNumber}`} />

        <Text style={greeting}>Hi {name || 'there'},</Text>

        <Text style={text}>Here&apos;s the cost-benefit breakdown:</Text>

        <Section style={mathBox}>
          <Text style={mathRow}>
            AI appeal letter: <strong>£2.99</strong>
          </Text>
          <Text style={mathRow}>
            If it works, you save:{' '}
            <strong>
              £{discountAmount}–£{fullAmount}
            </strong>
          </Text>
          <Text style={mathRow}>
            If it doesn&apos;t, you&apos;ve lost: <strong>£2.99</strong>
          </Text>
          <Text style={mathHighlight}>
            And you still have time to pay the reduced amount.
          </Text>
        </Section>

        <Section style={daysBox}>
          <Text style={daysText}>
            {daysUntilDiscount} days remaining before your fine doubles
          </Text>
        </Section>

        <EmailButton href={`${APP_URL}/tickets/${ticketId}`}>
          Challenge for £2.99
        </EmailButton>

        <Text style={signature}>
          Best regards,
          <br />
          The Parking Ticket Pal Team
        </Text>

        <EmailFooter unsubscribeUrl={unsubscribeUrl} />
      </Container>
    </Body>
  </Html>
);

export default OnboardingMathsEmail;
