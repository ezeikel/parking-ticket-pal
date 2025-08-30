'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMediaQuery } from 'react-responsive';
import { NAVIGATION_ITEMS } from '@/constants/index';
import { isPathAuthenticated } from '@/utils/isAuthenticatedPath';

const NavigationItems = () => {
  const { status } = useSession();
  const isNotMobile = useMediaQuery({ minWidth: 768 });

  return (
    <ul className="flex gap-x-4 md:gap-x-8 items-center">
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
            {isNotMobile ? item.label : null}
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default NavigationItems;
