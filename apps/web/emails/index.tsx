import { Html, Head, Body, Container, Text, Heading } from '@react-email/components';

// This is a placeholder component for the index page
// The actual email templates are in separate files:
// - FormEmail.tsx
// - MagicLinkEmail.tsx
// - ReminderEmail.tsx
// - TicketReminderEmail.tsx

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '580px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
};

const heading = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  textAlign: 'center' as const,
  margin: '0 0 24px 0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const listItem = {
  color: '#266696',
  fontSize: '16px',
  margin: '8px 0',
};

export default function IndexEmail() {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Parking Ticket Pal Email Templates</Heading>
          <Text style={text}>
            Select a template from the sidebar to preview:
          </Text>
          <ul>
            <li style={listItem}><strong>FormEmail</strong> - Form ready for download notification</li>
            <li style={listItem}><strong>MagicLinkEmail</strong> - Sign-in authentication email</li>
            <li style={listItem}><strong>ReminderEmail</strong> - Ticket deadline reminder (14-day/28-day)</li>
            <li style={listItem}><strong>TicketReminderEmail</strong> - Payment deadline warning</li>
          </ul>
          <Text style={text}>
            All templates feature consistent branding with the Parking Ticket Pal color scheme.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
