'use client';

import { User } from '@prisma/client';
import { signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCreditCard,
  faHeadset,
  faSignOut,
  faUser,
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

type DropdownItem = {
  icon?: any;
  label?: string;
  href?: string;
  action?: () => Promise<void>;
  separator?: boolean;
  external?: boolean;
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

const UserDropdown = ({ user }: UserDropdownProps) => (
  <DropdownMenu>
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
        if (item.separator) {
          return <DropdownMenuSeparator key={idx} />;
        }

        if (item.href) {
          return (
            <DropdownMenuItem key={idx} asChild>
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
              key={idx}
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
);

export default UserDropdown;
