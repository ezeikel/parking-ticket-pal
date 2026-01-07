'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@prisma/client';
import {
  faUpload,
  faTicketPerforated,
  faCarSide,
  faCreditCard,
  faHeadset,
  faRightToBracket,
  faHome,
  faUser,
  faSignOut,
  faTag,
  faCommentDots,
  faNewspaper,
} from '@fortawesome/pro-regular-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import cn from '@/utils/cn';
import MobileMenu from '@/components/MobileMenu/MobileMenu';
import UserDropdown from '@/components/UserDropdown/UserDropdown';
import Image from 'next/image';

type HeaderProps = {
  className?: string;
  user?: Partial<User> | null;
};

export type Visibility = 'always' | 'authenticated' | 'unauthenticated';

export type NavItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  liClass?: string;
  component?: (user: Partial<User>) => React.ReactNode;
  visibility: Visibility;
};

export type MobileNavItem = {
  label: string;
  iconName?: IconDefinition;
  href?: string;
  liClass?: string;
  action?: 'signout';
  component?: React.ReactNode;
  isFeedback?: boolean;
};

const ITEMS: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    visibility: 'always',
  },
  {
    label: 'Pricing',
    href: '/pricing',
    visibility: 'unauthenticated',
  },
  {
    label: 'Support',
    href: 'mailto:support@parkticketpal.com',
    visibility: 'unauthenticated',
  },
  {
    label: 'Tickets',
    href: '/tickets',
    visibility: 'authenticated',
  },
  {
    label: 'Vehicles',
    href: '/vehicles',
    visibility: 'authenticated',
  },
  {
    label: 'Add Document',
    href: '/new',
    visibility: 'authenticated',
  },
  {
    label: 'Blog',
    href: '/blog',
    visibility: 'always',
  },
  {
    label: 'UserDropdown',
    liClass: 'p-0 flex',
    component: (user: Partial<User>) => <UserDropdown user={user} />,
    visibility: 'authenticated',
  },
];

const getMobileNav = (user: Partial<User> | null): MobileNavItem[] => {
  if (!user) {
    return [
      { label: 'Home', iconName: faHome, href: '/' },
      { label: 'Pricing', iconName: faTag, href: '/pricing' },
      { label: 'Blog', iconName: faNewspaper, href: '/blog' },
      {
        label: 'Support',
        iconName: faHeadset,
        href: 'mailto:support@parkticketpal.com',
      },
      { label: 'Give Feedback', iconName: faCommentDots, isFeedback: true },
      { label: 'Sign in', iconName: faRightToBracket, href: '/signin' },
    ];
  }

  return [
    { label: 'Home', iconName: faHome, href: '/' },
    { label: 'Add Document', iconName: faUpload, href: '/new' },
    { label: 'Tickets', iconName: faTicketPerforated, href: '/tickets' },
    { label: 'Vehicles', iconName: faCarSide, href: '/vehicles' },
    { label: 'Account', iconName: faUser, href: '/account' },
    { label: 'Billing', iconName: faCreditCard, href: '/account/billing' },
    { label: 'Blog', iconName: faNewspaper, href: '/blog' },
    {
      label: 'Support',
      iconName: faHeadset,
      href: 'mailto:support@parkticketpal.com',
    },
    { label: 'Give Feedback', iconName: faCommentDots, isFeedback: true },
    { label: 'Sign out', iconName: faSignOut, action: 'signout' },
  ];
};

const renderNavLink = (
  item: NavItem,
  user: Partial<User> | null,
  isScrolled: boolean,
  isHomePage: boolean,
) => {
  const textColorClass =
    !isScrolled && isHomePage ? 'text-white' : 'text-foreground';

  if (item.href?.startsWith('mailto:')) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('flex items-center gap-2 transition-colors', textColorClass)}
      >
        {item.label}
      </a>
    );
  }

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={cn('flex items-center gap-2 transition-colors', textColorClass)}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {item.component?.(user as Partial<User>)}
    </div>
  );
};

const Header = ({ className, user }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const mobileItems = getMobileNav(user ?? null);

  const renderItems = () => {
    const visibleItems = ITEMS.filter((item) => {
      switch (item.visibility) {
        case 'always':
          return true;
        case 'authenticated':
          return !!user;
        case 'unauthenticated':
          return !user;
        default:
          return false;
      }
    });

    const textColorClass =
      !isScrolled && isHomePage ? 'text-white' : 'text-foreground';

    if (user) {
      return (
        <div className="flex items-center gap-4">
          <ul className="hidden md:flex gap-8">
            {visibleItems.map((item) => (
              <li
                key={item.href || item.label}
                className={cn('p-2', item.liClass)}
              >
                {renderNavLink(item, user, isScrolled, isHomePage)}
              </li>
            ))}
          </ul>
          <MobileMenu
            items={mobileItems}
            hamburgerClassName={
              !isScrolled && isHomePage
                ? 'hover:bg-white/20'
                : 'hover:bg-muted/50'
            }
            hamburgerIconClassName={
              !isScrolled && isHomePage ? 'text-white' : 'text-foreground'
            }
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4">
        <ul className="hidden md:flex gap-8">
          {visibleItems.map((item) => (
            <li
              key={item.href || item.label}
              className={cn('p-2', item.liClass)}
            >
              {renderNavLink(item, null, isScrolled, isHomePage)}
            </li>
          ))}
        </ul>
        <Link
          href="/signin"
          className={cn(
            'hidden md:flex items-center gap-2 font-medium px-4 py-2 rounded transition-colors',
            textColorClass,
            isScrolled || !isHomePage ? 'hover:bg-muted/50' : 'hover:bg-white/20',
          )}
        >
          Sign in
        </Link>
        <MobileMenu
          items={mobileItems}
          hamburgerClassName={
            !isScrolled && isHomePage
              ? 'hover:bg-white/20'
              : 'hover:bg-muted/50'
          }
          hamburgerIconClassName={
            !isScrolled && isHomePage ? 'text-white' : 'text-foreground'
          }
        />
      </div>
    );
  };

  return (
    <header
      className={cn(
        'flex items-center justify-between p-4 fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled || !isHomePage
          ? 'bg-white border-b shadow-sm'
          : 'bg-transparent border-transparent',
        className,
      )}
    >
      <Link href="/" className="flex items-center gap-x-4">
        <Image
          src="/logos/ptp.svg"
          alt="Parking Ticket Pal logo"
          height={40}
          width={35}
        />
        <span
          className={cn(
            'font-display font-bold text-2xl transition-colors duration-300',
            !isScrolled && isHomePage ? 'text-white' : 'text-foreground',
          )}
        >
          Parking Ticket Pal
        </span>
      </Link>
      {renderItems()}
    </header>
  );
};

export default Header;
