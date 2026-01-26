import { Button, Section } from '@react-email/components';

type EmailButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
};

const EmailButton = ({
  href,
  children,
  variant = 'primary',
  fullWidth = false,
}: EmailButtonProps) => {
  const baseStyles = {
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
    display: 'inline-block',
    textAlign: 'center' as const,
    letterSpacing: '0.3px',
    width: fullWidth ? '100%' : 'auto',
  };

  const styles = {
    primary: {
      ...baseStyles,
      backgroundColor: '#1ABC9C',
      color: '#ffffff',
      border: 'none',
    },
    secondary: {
      ...baseStyles,
      backgroundColor: '#222222',
      color: '#ffffff',
      border: 'none',
    },
    outline: {
      ...baseStyles,
      backgroundColor: 'transparent',
      color: '#222222',
      border: '2px solid #222222',
    },
  };

  const containerStyle = {
    textAlign: 'center' as const,
    margin: '24px 0',
  };

  return (
    <Section style={containerStyle}>
      <Button href={href} style={styles[variant]}>
        {children}
      </Button>
    </Section>
  );
};

export default EmailButton;
