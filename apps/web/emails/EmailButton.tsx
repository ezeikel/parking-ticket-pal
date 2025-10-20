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
      backgroundColor: '#1ABC9C',
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
      color: '#1ABC9C',
      padding: '12px 24px',
      borderRadius: '6px',
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '16px',
      display: 'inline-block',
      textAlign: 'center' as const,
      border: '2px solid #1ABC9C',
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
