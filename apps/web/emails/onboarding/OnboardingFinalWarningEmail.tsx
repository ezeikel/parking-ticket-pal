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

type OnboardingFinalWarningEmailProps = {
  name?: string;
  pcnNumber: string;
  ticketId: string;
  discountAmount: string;
  fullAmount: string;
  deadlineDate: string;
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

const urgencyBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '2px solid #f59e0b',
};

const urgencyTitle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 12px 0',
};

const optionText = {
  color: '#78350f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
};

const optionNumber = {
  fontWeight: '700',
  color: '#92400e',
};

const warningText = {
  color: '#991b1b',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
  fontWeight: '600',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://parkingticketpal.com';

const OnboardingFinalWarningEmail = ({
  name,
  pcnNumber,
  ticketId,
  discountAmount,
  fullAmount,
  deadlineDate,
}: OnboardingFinalWarningEmailProps) => (
  <Html>
    <Head />
    <Preview>Last chance — your fine doubles on {deadlineDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Last chance" subtitle={`Ticket ${pcnNumber}`} />

        <Text style={greeting}>Hi {name || 'there'},</Text>

        <Text style={text}>
          Your discount deadline is <strong>{deadlineDate}</strong>. After that,
          your fine increases from £{discountAmount} to £{fullAmount}.
        </Text>

        <Section style={urgencyBox}>
          <Text style={urgencyTitle}>You have two options:</Text>

          <Text style={optionText}>
            <span style={optionNumber}>1.</span> <strong>Challenge it</strong> —
            generate an AI appeal letter for £2.99. If it works, you pay
            nothing. If it doesn&apos;t, you still get 14 days to pay the
            reduced rate.
          </Text>

          <Text style={optionText}>
            <span style={optionNumber}>2.</span> <strong>Pay it</strong> — but
            pay the reduced amount (£{discountAmount}) before {deadlineDate}.
          </Text>
        </Section>

        <Text style={warningText}>
          Either way, don&apos;t let it sit. Ignoring it is the most expensive
          option.
        </Text>

        <EmailButton href={`${APP_URL}/tickets/${ticketId}`}>
          Challenge Now
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

export default OnboardingFinalWarningEmail;
