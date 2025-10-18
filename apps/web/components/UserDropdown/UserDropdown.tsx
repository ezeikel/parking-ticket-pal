'use client';

import { useState } from 'react';
import { User } from '@prisma/client';
import { signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCreditCard,
  faHeadset,
  faSignOut,
  faUser,
  faCommentDots,
} from '@fortawesome/pro-regular-svg-icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import FeedbackDialog from '@/components/FeedbackDialog/FeedbackDialog';

type DropdownItem = {
  icon?: React.ComponentType<{ className?: string }> | any;
  label?: string;
  href?: string;
  action?: () => Promise<void>;
  separator?: boolean;
  external?: boolean;
  specialAction?: 'feedback';
};

const DROPDOWN_ITEMS: DropdownItem[] = [
  { icon: faUser, label: 'Account', href: '/account' },
  { icon: faCreditCard, label: 'Billing', href: '/account/billing' },
  {
    icon: faHeadset,
    label: 'Support',
    href: 'mailto:support@parkticketpal.com',
    external: true,
  },
  {
    icon: faCommentDots,
    label: 'Send Feedback',
    specialAction: 'feedback',
  },
  { separator: true } as const,
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
};

const UserDropdown = ({ user }: UserDropdownProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleFeedbackClick = () => {
    setDropdownOpen(false); // Close dropdown first
    setTimeout(() => setFeedbackOpen(true), 100); // Small delay to allow dropdown to close
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full hidden md:flex"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user?.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('') || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {DROPDOWN_ITEMS.map((item, idx) => {
            const key = item.separator
              ? `separator-${idx}`
              : item.label || `item-${idx}`;

            if (item.separator) {
              return <DropdownMenuSeparator key={key} />;
            }

            if (item.specialAction === 'feedback') {
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={handleFeedbackClick}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FontAwesomeIcon icon={item.icon!} size="lg" />
                  <span className="text-base">{item.label}</span>
                </DropdownMenuItem>
              );
            }

            if (item.href) {
              return (
                <DropdownMenuItem key={key} asChild>
                  {item.external ? (
                    <a
                      href={item.href}
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={item.icon!} size="lg" />
                      <span className="text-base">{item.label}</span>
                    </a>
                  ) : (
                    <a href={item.href} className="flex items-center gap-2">
                      <FontAwesomeIcon icon={item.icon!} size="lg" />
                      <span className="text-base">{item.label}</span>
                    </a>
                  )}
                </DropdownMenuItem>
              );
            }

            if (item.action) {
              return (
                <DropdownMenuItem
                  key={key}
                  onClick={item.action}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FontAwesomeIcon icon={item.icon!} size="lg" />
                  <span className="text-base">{item.label}</span>
                </DropdownMenuItem>
              );
            }

            return null;
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <FeedbackDialog
        userEmail={user.email ?? undefined}
        trigger={<span />} // empty trigger since we manage state manually
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
    </>
  );
};

export default UserDropdown;
