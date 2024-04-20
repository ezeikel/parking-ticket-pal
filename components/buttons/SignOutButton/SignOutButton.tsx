'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

type SignOutButtonProps = {
  className?: string;
};

const SignOutButton = ({ className }: SignOutButtonProps) => (
  <Button onClick={() => signOut()} className={className} variant="ghost">
    Sign out
  </Button>
);

export default SignOutButton;
