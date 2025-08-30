import Link from 'next/link';
import { User } from '@prisma/client';
import { faSquareParking } from '@fortawesome/pro-solid-svg-icons';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getCurrentUser } from '@/utils/user';
import cn from '@/utils/cn';
import MobileMenu from '@/components/MobileMenu/MobileMenu';
import UserDropdown from '@/components/UserDropdown/UserDropdown';

type HeaderProps = {
  className?: string;
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
    icon: <FontAwesomeIcon icon={faHome} size="lg" />,
    href: '/',
    visibility: 'always',
  },
  {
    label: 'Pricing',
    icon: <FontAwesomeIcon icon={faTag} size="lg" />,
    href: '/pricing',
    visibility: 'unauthenticated',
  },
  {
    label: 'Support',
    icon: <FontAwesomeIcon icon={faHeadset} size="lg" />,
    href: 'mailto:support@parkticketpal.com',
    visibility: 'unauthenticated',
  },
  {
    label: 'Tickets',
    icon: <FontAwesomeIcon icon={faTicketPerforated} size="lg" />,
    href: '/tickets',
    visibility: 'authenticated',
  },
  {
    label: 'Vehicles',
    icon: <FontAwesomeIcon icon={faCarSide} size="lg" />,
    href: '/vehicles',
    visibility: 'authenticated',
  },
  {
    label: 'Add Document',
    icon: <FontAwesomeIcon icon={faUpload} size="lg" />,
    href: '/new',
    visibility: 'authenticated',
  },
  {
    label: 'Blog',
    icon: <FontAwesomeIcon icon={faNewspaper} size="lg" />,
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

const renderNavLink = (item: NavItem, user: Partial<User> | null) => {
  if (item.href?.startsWith('mailto:')) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        {item.icon}
        {item.label}
      </a>
    );
  }

  if (item.href) {
    return (
      <Link href={item.href} className="flex items-center gap-2">
        {item.icon}
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {item.icon}
      {item.component?.(user as Partial<User>)}
    </div>
  );
};

const Header = async ({ className }: HeaderProps) => {
  const user = await getCurrentUser();

  const mobileItems = getMobileNav(user);

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

    if (user) {
      return (
        <div className="flex items-center gap-4">
          <ul className="hidden md:flex gap-8">
            {visibleItems.map((item) => (
              <li
                key={item.href || item.label}
                className={cn('p-2', item.liClass)}
              >
                {renderNavLink(item, user)}
              </li>
            ))}
          </ul>
          <MobileMenu items={mobileItems} />
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
              {renderNavLink(item, null)}
            </li>
          ))}
        </ul>
        <Link
          href="/signin"
          className="hidden md:flex items-center gap-2 font-medium px-4 py-2 rounded hover:bg-muted/50 transition-colors"
        >
          <FontAwesomeIcon icon={faRightToBracket} size="lg" />
          Sign in
        </Link>
        <MobileMenu items={mobileItems} />
      </div>
    );
  };

  return (
    <header
      className={cn(
        'flex items-center justify-between p-4 sticky top-0 z-50 bg-white border-b',
        className,
      )}
    >
      <Link href="/" className="flex items-center gap-x-2">
        <FontAwesomeIcon icon={faSquareParking} size="2x" color="#266696" />
        <span className="font-display font-bold text-2xl">
          Parking Ticket Pal
        </span>
      </Link>
      {renderItems()}
    </header>
  );
};

export default Header;
