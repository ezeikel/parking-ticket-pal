import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
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

type FreeTemplateEmailProps = {
  firstName: string;
  templateTitle: string;
  templateCategory: 'parking' | 'bailiff' | 'motoring';
};

const highlightBox = {
  backgroundColor: '#F0FDF9',
  border: '1px solid #D1FAE5',
  borderRadius: '12px',
  padding: '24px',
  margin: '28px 0',
};

const highlightTitle = {
  color: '#065F46',
  fontSize: '13px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  margin: '0 0 12px 0',
};

const highlightText = {
  color: '#065F46',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0',
  lineHeight: '22px',
};

const steps = {
  margin: '28px 0',
};

const stepItem = {
  display: 'flex' as const,
  marginBottom: '16px',
};

const stepNumber = {
  backgroundColor: '#1ABC9C',
  color: '#ffffff',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  fontSize: '14px',
  fontWeight: '600',
  textAlign: 'center' as const,
  lineHeight: '28px',
  marginRight: '12px',
  flexShrink: 0,
};

const stepText = {
  color: '#484848',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '2px 0 0 0',
};

const promoBox = {
  backgroundColor: '#222222',
  borderRadius: '12px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center' as const,
};

const promoTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const promoText = {
  color: '#B0B0B0',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px 0',
};

const categoryTips: Record<'parking' | 'bailiff' | 'motoring', string[]> = {
  parking: [
    'Print and sign the letter before sending',
    'Send via recorded delivery for proof of postage',
    'Keep a copy for your records',
    'Note the deadline - you usually have 28 days to respond',
  ],
  bailiff: [
    'Send via recorded delivery to prove receipt',
    'Keep copies of all correspondence',
    'Note dates and times of any contact',
    'Consider getting free debt advice if needed',
  ],
  motoring: [
    'Check the specific requirements for your situation',
    'Include any supporting documents mentioned',
    'Keep copies of everything you send',
    "Follow up if you don't receive a response",
  ],
};

const FreeTemplateEmail = ({
  firstName = 'there',
  templateTitle = 'Informal Challenge Letter',
  templateCategory = 'parking',
}: FreeTemplateEmailProps) => {
  const tips = categoryTips[templateCategory];

  return (
    <Html lang="en">
      <Head />
      <Preview>Your {templateTitle} is attached</Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={card}>
            <EmailHeader
              title="Your Letter Template is Ready"
              subtitle="Attached to this email as a PDF"
            />

            <Text style={greeting}>Hi {firstName},</Text>

            <Text style={text}>
              Your letter template is attached to this email as a PDF.
              We&apos;ve filled in your details - just review it, print it, and
              send it off!
            </Text>

            <Section style={highlightBox}>
              <Text style={highlightTitle}>Template</Text>
              <Text style={highlightText}>{templateTitle}</Text>
            </Section>

            <Text style={{ ...text, fontWeight: '600', color: '#222222' }}>
              Tips for success:
            </Text>

            <Section style={steps}>
              {tips.map((tip, index) => (
                <Row key={index} style={stepItem}>
                  <Column style={{ width: '40px' }}>
                    <div style={stepNumber}>{index + 1}</div>
                  </Column>
                  <Column>
                    <Text style={stepText}>{tip}</Text>
                  </Column>
                </Row>
              ))}
            </Section>

            {templateCategory === 'parking' && (
              <Section style={promoBox}>
                <Text style={promoTitle}>Want a better chance of success?</Text>
                <Text style={promoText}>
                  Our AI writes personalised letters using real tribunal wins.
                  Upload your ticket to see your predicted success rate.
                </Text>
                <EmailButton href="https://parkingticketpal.co.uk">
                  Upload Your Ticket
                </EmailButton>
              </Section>
            )}

            <Text style={signature}>Good luck!</Text>
            <Text style={signatureName}>The Parking Ticket Pal Team</Text>

            <EmailFooter />
          </div>
        </Container>
      </Body>
    </Html>
  );
};

export default FreeTemplateEmail;
