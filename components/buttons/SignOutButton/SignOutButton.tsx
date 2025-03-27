'use client';

import { signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket } from '@fortawesome/pro-regular-svg-icons';

type SignOutButtonProps = {
  className?: string;
};

const SignOutButton = ({ className }: SignOutButtonProps) => (
  <div onClick={() => signOut()} className={className}>
    <FontAwesomeIcon icon={faRightFromBracket} className="mr-2 h-4 w-4" />
    <span>Sign Out</span>
  </div>
);

export default SignOutButton;
