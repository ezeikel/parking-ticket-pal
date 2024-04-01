'use client';

import { useSession } from 'next-auth/react';
import SignInButton from '../SignInButton/SignInButton';
import SignOutButton from '../SignOutButton/SignOutButton';

const AuthButton = () => {
  const { status } = useSession();
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'authenticated') {
    return <SignOutButton className="font-sans" />;
  }

  return <SignInButton className="font-sans" />;
};

export default AuthButton;
