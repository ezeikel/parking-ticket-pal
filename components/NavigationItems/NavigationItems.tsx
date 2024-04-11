'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { NAVIGATION_ITEMS } from '@/constants';

const NavigationItems = () => {
  const { status } = useSession();

  return (
    <ul>
      {NAVIGATION_ITEMS.filter((item) => {
        if (item.href === '/account') {
          return status === 'authenticated';
        }

        return true;
      }).map((item) => (
        <li key={item.id}>
          <Link href={item.href}>{item.component}</Link>
        </li>
      ))}
    </ul>
  );
};

export default NavigationItems;
