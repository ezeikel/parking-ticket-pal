import { Section, Img, Heading, Text } from '@react-email/components';

type EmailHeaderProps = {
  title?: string;
  subtitle?: string;
};

const header = {
  padding: '32px 0 24px 0',
  textAlign: 'center' as const,
};

const logoContainer = {
  marginBottom: '24px',
};

const logo = {
  display: 'block',
  margin: '0 auto',
  width: '56px',
  height: '56px',
};

const titleStyle = {
  color: '#222222',
  fontSize: '26px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '0 0 8px 0',
  lineHeight: '32px',
  letterSpacing: '-0.5px',
};

const subtitleStyle = {
  color: '#717171',
  fontSize: '16px',
  fontWeight: '400',
  textAlign: 'center' as const,
  margin: '0',
  lineHeight: '24px',
};

const divider = {
  width: '48px',
  height: '4px',
  backgroundColor: '#1ABC9C',
  margin: '24px auto 0 auto',
  borderRadius: '2px',
};

const EmailHeader = ({
  title: titleText,
  subtitle: subtitleText,
}: EmailHeaderProps) => (
  <Section style={header}>
    <div style={logoContainer}>
      <Img
        src="https://parkingticketpal.com/logos/ptp.png"
        alt="Parking Ticket Pal"
        style={logo}
        width={56}
        height={56}
      />
    </div>
    {titleText && (
      <>
        <Heading style={titleStyle}>{titleText}</Heading>
        {subtitleText && <Text style={subtitleStyle}>{subtitleText}</Text>}
        <div style={divider} />
      </>
    )}
  </Section>
);

export default EmailHeader;
