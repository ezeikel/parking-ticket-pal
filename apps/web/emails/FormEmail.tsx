import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import EmailHeader from '@/components/emails/EmailHeader';
import EmailFooter from '@/components/emails/EmailFooter';
import EmailButton from '@/components/emails/EmailButton';

type FormEmailProps = {
  formType: string;
  userName: string;
  downloadUrl: string;
};

// Styles
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

const infoBox = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const infoValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const linkStyle = {
  color: '#266696',
  textDecoration: 'underline',
};

const signature = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '32px 0 0 0',
};

const FormEmail = ({
  formType = 'TE9 Appeal',
  userName = 'John Smith',
  downloadUrl = 'https://parkingticketpal.com/download/form-123'
}: FormEmailProps) => (
  <Html>
    <Head />
    <Preview>Your {formType} Form is Ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailHeader title="Form Ready for Download" />

        <Text style={greeting}>Hello {userName},</Text>

        <Text style={text}>
          Great news! Your {formType} form has been successfully generated and is ready for download.
        </Text>

        <Section style={infoBox}>
          <Text style={infoLabel}>Form Type</Text>
          <Text style={infoValue}>{formType}</Text>
        </Section>

        <EmailButton href={downloadUrl}>
          Download Your Form
        </EmailButton>

        <Text style={text}>
          You can also access this form anytime from your{' '}
          <Link href="https://parkingticketpal.com/dashboard" style={linkStyle}>
            account dashboard
          </Link>.
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

export default FormEmail;
