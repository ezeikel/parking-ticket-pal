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

type FormEmailProps = {
  formType: string;
  userName: string;
  downloadUrl: string;
};

const highlightBox = {
  backgroundColor: '#F0FDF9',
  border: '1px solid #D1FAE5',
  borderRadius: '12px',
  padding: '24px',
  margin: '28px 0',
  textAlign: 'center' as const,
};

const formTypeLabel = {
  color: '#065F46',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  margin: '0 0 8px 0',
};

const formTypeValue = {
  color: '#222222',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0',
};

const infoSection = {
  backgroundColor: '#FAFAFA',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
};

const infoText = {
  color: '#717171',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const linkStyle = {
  color: '#1ABC9C',
  textDecoration: 'none',
  fontWeight: '500',
};

const FormEmail = ({ formType, userName, downloadUrl }: FormEmailProps) => (
  <Html lang="en">
    <Head />
    <Preview>Your {formType} Form is Ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={card}>
          <EmailHeader
            title="Your Form is Ready"
            subtitle="Download it now or access it anytime"
          />

          <Text style={greeting}>Hi {userName || 'there'},</Text>

          <Text style={text}>
            Great news! Your form has been successfully generated and is ready
            for download. Click the button below to get your document.
          </Text>

          <Section style={highlightBox}>
            <Text style={formTypeLabel}>Form Type</Text>
            <Text style={formTypeValue}>{formType}</Text>
          </Section>

          <EmailButton href={downloadUrl}>Download Your Form</EmailButton>

          <Section style={infoSection}>
            <Text style={infoText}>
              You can access this form anytime from your{' '}
              <Link
                href="https://parkingticketpal.com/dashboard"
                style={linkStyle}
              >
                dashboard
              </Link>
              . Forms are saved to your account for easy retrieval.
            </Text>
          </Section>

          <Text style={signature}>Best regards,</Text>
          <Text style={signatureName}>The Parking Ticket Pal Team</Text>

          <EmailFooter />
        </div>
      </Container>
    </Body>
  </Html>
);

FormEmail.PreviewProps = {
  formType: 'PE2 Appeal',
  userName: 'Sarah',
  downloadUrl: 'https://parkingticketpal.com/download/form.pdf',
} as FormEmailProps;

export default FormEmail;
