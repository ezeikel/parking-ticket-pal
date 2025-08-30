import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';

type FormEmailProps = {
  formType: string;
  userName: string;
  downloadUrl: string;
};

// styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const FormEmail = ({ formType, userName, downloadUrl }: FormEmailProps) => (
  <Html>
    <Head />
    <Preview>Your {formType} Form is Ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your {formType} Form is Ready</Heading>
        <Text style={text}>Hello {userName},</Text>
        <Text style={text}>
          Your {formType} form has been generated and is attached to this email.
        </Text>
        <Text style={text}>
          You can also download it directly from{' '}
          <Link href={downloadUrl}>this link</Link> or from your account
          dashboard.
        </Text>
        <Text style={text}>
          Regards,
          <br />
          Parking Ticket Pal Team
        </Text>
      </Container>
    </Body>
  </Html>
);

export default FormEmail;
