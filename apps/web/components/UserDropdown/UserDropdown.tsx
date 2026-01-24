'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User } from '@parking-ticket-pal/db/types';
import { signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCreditCard,
  faSignOut,
  faUser,
  faCommentDots,
  faBars,
} from '@fortawesome/pro-regular-svg-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FeedbackDialog from '@/components/FeedbackDialog/FeedbackDialog';
import cn from '@/utils/cn';

type DropdownItem = {
  icon?: typeof faUser;
  label?: string;
  href?: string;
  action?: () => Promise<void>;
  separator?: boolean;
  external?: boolean;
  specialAction?: 'feedback';
};

const DROPDOWN_ITEMS: DropdownItem[] = [
  { icon: faUser, label: 'Account', href: '/account' },
  { icon: faCreditCard, label: 'Billing', href: '/account?tab=billing' },
  {
    icon: faCommentDots,
    label: 'Help & Feedback',
    specialAction: 'feedback',
  },
  { separator: true },
  {
    icon: faSignOut,
    label: 'Sign out',
    action: async () => {
      await signOut({ callbackUrl: '/' });
    },
  },
];

type UserDropdownProps = {
  user: Partial<User>;
  isScrolled?: boolean;
  isHomePage?: boolean;
};

const UserDropdown = ({ user, isScrolled = true, isHomePage = false }: UserDropdownProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleFeedbackClick = () => {
    setDropdownOpen(false);
    setTimeout(() => setFeedbackOpen(true), 100);
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  // Airbnb-style: pill button with hamburger + avatar
  const buttonStyle = cn(
    'flex items-center gap-2 rounded-full border px-2 py-1.5 transition-all',
    'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal/20',
    !isScrolled && isHomePage
      ? 'border-white/30 bg-white/10 hover:bg-white/20'
      : 'border-border bg-white hover:bg-light'
  );

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(buttonStyle, 'hidden md:flex')}>
            <FontAwesomeIcon
              icon={faBars}
              className={cn(
                'w-4 text-sm',
                !isScrolled && isHomePage ? 'text-white' : 'text-gray'
              )}
            />
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-teal text-xs font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56 rounded-xl border-border p-2 shadow-lg"
          sideOffset={8}
        >
          {/* User Info Header */}
          <div className="mb-2 flex items-center gap-3 rounded-lg bg-light/50 px-3 py-2.5">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-teal font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-medium text-dark">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-gray">{user?.email}</p>
            </div>
          </div>

          <DropdownMenuSeparator className="my-2" />

          {DROPDOWN_ITEMS.map((item, idx) => {
            const key = item.separator
              ? `separator-${idx}`
              : item.label || `item-${idx}`;

            if (item.separator) {
              return <DropdownMenuSeparator key={key} className="my-2" />;
            }

            const itemClassName = cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer',
              'transition-colors hover:bg-light focus:bg-light',
              item.label === 'Sign out' && 'text-red-500 hover:text-red-600'
            );

            if (item.specialAction === 'feedback') {
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={handleFeedbackClick}
                  className={itemClassName}
                >
                  <FontAwesomeIcon icon={item.icon!} className="w-4 text-gray" />
                  <span>{item.label}</span>
                </DropdownMenuItem>
              );
            }

            if (item.href) {
              return (
                <DropdownMenuItem key={key} asChild className={itemClassName}>
                  {item.external ? (
                    <a href={item.href} rel="noopener noreferrer">
                      <FontAwesomeIcon icon={item.icon!} className="w-4 text-gray" />
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <Link href={item.href}>
                      <FontAwesomeIcon icon={item.icon!} className="w-4 text-gray" />
                      <span>{item.label}</span>
                    </Link>
                  )}
                </DropdownMenuItem>
              );
            }

            if (item.action) {
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={item.action}
                  className={itemClassName}
                >
                  <FontAwesomeIcon
                    icon={item.icon!}
                    className={cn('w-4', item.label === 'Sign out' ? 'text-red-400' : 'text-gray')}
                  />
                  <span>{item.label}</span>
                </DropdownMenuItem>
              );
            }

            return null;
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <FeedbackDialog
        userEmail={user.email ?? undefined}
        userName={user.name ?? undefined}
        trigger={<span />}
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
    </>
  );
};

export default UserDropdown;
