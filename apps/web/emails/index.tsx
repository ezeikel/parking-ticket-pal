import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Section,
} from '@react-email/components';

// This is a placeholder component for the index page
// The actual email templates are in separate files:
// - ChallengeLetterEmail.tsx - Challenge letter notification
// - FormEmail.tsx - Form ready for download notification
// - MagicLinkEmail.tsx - Sign-in authentication email
// - ReminderEmail.tsx - Ticket deadline reminder (14-day/28-day)
// - TicketReminderEmail.tsx - Payment deadline warning

const main = {
  backgroundColor: '#F7F7F7',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '40px 32px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
};

const heading = {
  color: '#222222',
  fontSize: '26px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '0 0 8px 0',
  letterSpacing: '-0.5px',
};

const subtitle = {
  color: '#717171',
  fontSize: '16px',
  textAlign: 'center' as const,
  margin: '0 0 32px 0',
};

const divider = {
  width: '48px',
  height: '4px',
  backgroundColor: '#1ABC9C',
  margin: '24px auto',
  borderRadius: '2px',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 24px 0',
};

const templateList = {
  backgroundColor: '#FAFAFA',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 0 24px 0',
};

const templateItem = {
  marginBottom: '16px',
  paddingBottom: '16px',
  borderBottom: '1px solid #EBEBEB',
};

const templateItemLast = {
  marginBottom: '0',
  paddingBottom: '0',
  borderBottom: 'none',
};

const templateName = {
  color: '#1ABC9C',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px 0',
};

const templateDesc = {
  color: '#717171',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const IndexEmail = () => (
  <Html lang="en">
    <Head />
    <Body style={main}>
      <Container style={container}>
        <div style={card}>
          <Heading style={heading}>Email Templates</Heading>
          <Text style={subtitle}>Parking Ticket Pal</Text>
          <div style={divider} />

          <Text style={text}>
            Select a template from the sidebar to preview. All templates feature
            the Airbnb-inspired design system.
          </Text>

          <Section style={templateList}>
            <div style={templateItem}>
              <Text style={templateName}>ChallengeLetterEmail</Text>
              <Text style={templateDesc}>
                Challenge letter notification with PDF attachment
              </Text>
            </div>
            <div style={templateItem}>
              <Text style={templateName}>MagicLinkEmail</Text>
              <Text style={templateDesc}>
                Sign-in authentication link email
              </Text>
            </div>
            <div style={templateItem}>
              <Text style={templateName}>FormEmail</Text>
              <Text style={templateDesc}>
                Form ready for download notification
              </Text>
            </div>
            <div style={templateItem}>
              <Text style={templateName}>ReminderEmail</Text>
              <Text style={templateDesc}>
                14-day or 28-day deadline reminder
              </Text>
            </div>
            <div style={templateItemLast}>
              <Text style={templateName}>TicketReminderEmail</Text>
              <Text style={templateDesc}>
                Payment deadline warning with amount
              </Text>
            </div>
          </Section>
        </div>
      </Container>
    </Body>
  </Html>
);

export default IndexEmail;
