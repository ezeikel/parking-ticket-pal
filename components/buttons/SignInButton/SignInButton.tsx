'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type SignInButtonProps = {
  className?: string;
};

const SignInButton = ({ className }: SignInButtonProps) => (
  <Button onClick={() => signIn('google')} className={className}>
    Sign in
  </Button>
);

export default SignInButton;
