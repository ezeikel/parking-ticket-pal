'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { NAVIGATION_ITEMS } from '@/constants';
import { isPathAuthenticated } from '@/utils/isAuthenticatedPath';

const NavigationItems = () => {
  const { status } = useSession();

  return (
    <ul className="flex gap-x-8 items-center">
      {NAVIGATION_ITEMS.filter((item) => {
        if (isPathAuthenticated(item.href)) {
          return status === 'authenticated';
        }

        return true;
      }).map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex flex-col gap-y-1 items-center font-sans text-sm font-semibold cursor-pointer"
          >
            {item.component}
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default NavigationItems;
