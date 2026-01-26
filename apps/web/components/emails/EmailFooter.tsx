import { Section, Text, Link } from '@react-email/components';

const footer = {
  marginTop: '48px',
  paddingTop: '32px',
  borderTop: '1px solid #EBEBEB',
};

const supportSection = {
  backgroundColor: '#F7F7F7',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const supportText = {
  color: '#222222',
  fontSize: '15px',
  fontWeight: '500',
  margin: '0 0 4px 0',
};

const supportLink = {
  color: '#1ABC9C',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
};

const linksContainer = {
  textAlign: 'center' as const,
  margin: '0 0 20px 0',
};

const link = {
  color: '#717171',
  fontSize: '13px',
  textDecoration: 'none',
  margin: '0 12px',
};

const dividerDot = {
  color: '#DDDDDD',
  fontSize: '13px',
};

const copyrightSection = {
  textAlign: 'center' as const,
  paddingTop: '20px',
  borderTop: '1px solid #EBEBEB',
};

const copyright = {
  color: '#B0B0B0',
  fontSize: '12px',
  margin: '0 0 8px 0',
  lineHeight: '18px',
};

const address = {
  color: '#B0B0B0',
  fontSize: '11px',
  margin: '0',
  lineHeight: '16px',
};

const EmailFooter = () => (
  <Section style={footer}>
    <div style={supportSection}>
      <Text style={supportText}>Questions? We&apos;re here to help.</Text>
      <Link href="mailto:support@parkingticketpal.com" style={supportLink}>
        support@parkingticketpal.com
      </Link>
    </div>

    <div style={linksContainer}>
      <Link href="https://parkingticketpal.com/dashboard" style={link}>
        Dashboard
      </Link>
      <span style={dividerDot}>•</span>
      <Link href="https://parkingticketpal.com/privacy" style={link}>
        Privacy
      </Link>
      <span style={dividerDot}>•</span>
      <Link href="https://parkingticketpal.com/terms" style={link}>
        Terms
      </Link>
    </div>

    <div style={copyrightSection}>
      <Text style={copyright}>
        © {new Date().getFullYear()} Parking Ticket Pal. All rights reserved.
      </Text>
      <Text style={address}>
        Parking Ticket Pal Ltd • London, United Kingdom
      </Text>
    </div>
  </Section>
);

export default EmailFooter;
