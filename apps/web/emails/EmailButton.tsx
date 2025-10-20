import { Button } from '@react-email/components';

type EmailButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
};

const EmailButton = ({
  href,
  children,
  variant = 'primary',
}: EmailButtonProps) => {
  const styles = {
    primary: {
      backgroundColor: '#266696',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '6px',
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '16px',
      display: 'inline-block',
      textAlign: 'center' as const,
      border: 'none',
      margin: '16px 0',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#266696',
      padding: '12px 24px',
      borderRadius: '6px',
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '16px',
      display: 'inline-block',
      textAlign: 'center' as const,
      border: '2px solid #266696',
      margin: '16px 0',
    },
  };

  return (
    <Button href={href} style={styles[variant]}>
      {children}
    </Button>
  );
};

export default EmailButton;
