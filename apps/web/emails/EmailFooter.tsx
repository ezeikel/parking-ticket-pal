import { Section, Text, Link, Hr } from '@react-email/components';

const footer = {
  marginTop: '48px',
};

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '24px 0',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  margin: '8px 0',
};

const link = {
  color: '#266696',
  textDecoration: 'underline',
};

const copyright = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '16px',
};

const EmailFooter = () => (
  <Section style={footer}>
    <Hr style={divider} />
    <Text style={footerText}>
      Need help? Contact us at{' '}
      <Link href="mailto:support@parkingticketpal.com" style={link}>
        support@parkingticketpal.com
      </Link>
    </Text>
    <Text style={footerText}>
      <Link
        href="https://parkingticketpal.com/dashboard"
        style={link}
      >
        View Dashboard
      </Link>
      {' • '}
      <Link href="https://parkingticketpal.com/privacy" style={link}>
        Privacy Policy
      </Link>
      {' • '}
      <Link href="https://parkingticketpal.com/terms" style={link}>
        Terms of Service
      </Link>
    </Text>
    <Text style={copyright}>
      © {new Date().getFullYear()} Parking Ticket Pal. All rights reserved.
    </Text>
  </Section>
);

export default EmailFooter;
