'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type SignInButtonProps = {
  text?: string;
  className?: string;
};

const SignInButton = ({ text, className }: SignInButtonProps) => (
  <Button onClick={() => signIn('google')} className={className}>
    {text || 'Sign in'}
  </Button>
);

export default SignInButton;
