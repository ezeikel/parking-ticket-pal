'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/pro-regular-svg-icons';
import { signOut } from 'next-auth/react';
import { User } from '@parking-ticket-pal/db/types';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import cn from '@/utils/cn';
import FeedbackDialog from '@/components/FeedbackDialog/FeedbackDialog';

type MobileNavItem = {
  label: string;
  iconName?: IconDefinition;
  href?: string;
  liClass?: string;
  action?: 'signout';
  component?: React.ReactNode;
  isFeedback?: boolean;
};

type MobileMenuProps = {
  items: MobileNavItem[];
  user?: Partial<User>;
  hamburgerClassName?: string;
  hamburgerIconClassName?: string;
};

const MobileMenu = ({ items, user, hamburgerClassName, hamburgerIconClassName }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const renderMenuItem = (item: MobileNavItem) => {
    if (item.isFeedback) {
      return (
        <FeedbackDialog
          userEmail={user?.email ?? undefined}
          trigger={
            <button
              className="flex items-center gap-2 p-2 w-full text-left hover:bg-muted/50 rounded-lg transition-colors"
              type="button"
            >
              {item.label}
            </button>
          }
        />
      );
    }

    if (item.component) {
      return (
        <div className="flex items-center gap-2 p-2">
          {item.component}
        </div>
      );
    }

    if (item.action === 'signout') {
      return (
        <button
          type="button"
          className="flex items-center gap-2 p-2 w-full text-left hover:bg-muted/50 rounded-lg transition-colors"
          onClick={async () => {
            setIsOpen(false);
            await signOut({ callbackUrl: '/' });
          }}
        >
          {item.label}
        </button>
      );
    }

    if (item.href) {
      if (item.href.startsWith('mailto:')) {
        return (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors"
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </a>
        );
      }

      return (
        <Link
          href={item.href}
          className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg transition-colors"
          onClick={() => setIsOpen(false)}
        >
          {item.label}
        </Link>
      );
    }

    return (
      <div className="flex items-center gap-2 p-2">
        {item.label}
      </div>
    );
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          hamburgerClassName,
        )}
        aria-label="Open menu"
      >
        <FontAwesomeIcon icon={faBars} size="lg" className={hamburgerIconClassName} />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-background shadow-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Menu</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:bg-muted/50 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faXmark} size="lg" />
              </button>
            </div>

            <nav className="p-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li
                    key={item.href || item.label}
                    className={cn(item.liClass)}
                  >
                    {renderMenuItem(item)}
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
