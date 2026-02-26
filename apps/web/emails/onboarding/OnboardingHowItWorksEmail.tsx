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

type OnboardingHowItWorksEmailProps = {
  name?: string;
  pcnNumber: string;
  issuer: string;
  ticketId: string;
  fullAmount: string;
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

const comparisonBox = {
  borderRadius: '8px',
  margin: '24px 0',
  overflow: 'hidden' as const,
};

const comparisonHeader = {
  padding: '12px 20px',
  fontWeight: '600',
  fontSize: '14px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const manualHeader = {
  ...comparisonHeader,
  backgroundColor: '#fef2f2',
  color: '#991b1b',
  margin: '0',
};

const ptpHeader = {
  ...comparisonHeader,
  backgroundColor: '#f0fdf4',
  color: '#15803d',
  margin: '0',
};

const comparisonBody = {
  padding: '16px 20px',
  fontSize: '15px',
  lineHeight: '24px',
  color: '#374151',
};

const manualBody = {
  ...comparisonBody,
  backgroundColor: '#fff5f5',
  margin: '0',
};

const ptpBody = {
  ...comparisonBody,
  backgroundColor: '#f0fdf9',
  margin: '0',
};

const pricingText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '16px 0',
};

const bold = {
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

const OnboardingHowItWorksEmail = ({
  name,
  pcnNumber,
  ticketId,
  fullAmount,
  unsubscribeUrl,
}: OnboardingHowItWorksEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>Challenge your ticket in under 3 minutes</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Under 3 minutes" subtitle={`Ticket ${pcnNumber}`} />

        <Text style={greeting}>Hi {name || 'there'},</Text>

        <Text style={text}>
          Challenging a parking ticket manually is tedious. Here&apos;s how it
          compares:
        </Text>

        <Section style={comparisonBox}>
          <Text style={manualHeader}>Manual Process</Text>
          <Text style={manualBody}>
            Research similar cases. Write a formal letter. Navigate the
            council&apos;s portal. Track deadlines. Hope you got the wording
            right.
          </Text>

          <Text style={ptpHeader}>With Parking Ticket Pal</Text>
          <Text style={ptpBody}>
            Your ticket is already uploaded. AI generates your appeal letter in
            30 seconds. Auto-submit available for supported councils.
          </Text>
        </Section>

        <Text style={pricingText}>
          <span style={bold}>Standard (£2.99):</span> Get the AI appeal letter.
          <br />
          <span style={bold}>Premium (£9.99):</span> We submit it for you.
          <br />
          <br />
          Both are a fraction of the £{fullAmount} fine.
        </Text>

        <EmailButton href={`${APP_URL}/tickets/${ticketId}`}>
          Get My Appeal Letter
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

export default OnboardingHowItWorksEmail;
