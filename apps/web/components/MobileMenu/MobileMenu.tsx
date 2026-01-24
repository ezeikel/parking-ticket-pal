'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/pro-regular-svg-icons';
import { signOut } from 'next-auth/react';
import { User } from '@parking-ticket-pal/db/types';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { motion, AnimatePresence } from 'framer-motion';
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
    const baseClassName = cn(
      'flex items-center gap-4 px-2 py-4 w-full text-left text-lg font-medium text-dark',
      'border-b border-border/50 transition-colors active:bg-light',
      item.action === 'signout' && 'text-red-500 border-b-0'
    );

    if (item.isFeedback) {
      return (
        <FeedbackDialog
          userEmail={user?.email ?? undefined}
          userName={user?.name ?? undefined}
          trigger={
            <button className={baseClassName} type="button">
              {item.iconName && (
                <FontAwesomeIcon icon={item.iconName} className="w-5 text-gray" />
              )}
              {item.label}
            </button>
          }
        />
      );
    }

    if (item.component) {
      return (
        <div className={baseClassName}>
          {item.component}
        </div>
      );
    }

    if (item.action === 'signout') {
      return (
        <button
          type="button"
          className={baseClassName}
          onClick={async () => {
            setIsOpen(false);
            await signOut({ callbackUrl: '/' });
          }}
        >
          {item.iconName && (
            <FontAwesomeIcon icon={item.iconName} className="w-5 text-red-400" />
          )}
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
            className={baseClassName}
            onClick={() => setIsOpen(false)}
          >
            {item.iconName && (
              <FontAwesomeIcon icon={item.iconName} className="w-5 text-gray" />
            )}
            {item.label}
          </a>
        );
      }

      return (
        <Link
          href={item.href}
          className={baseClassName}
          onClick={() => setIsOpen(false)}
        >
          {item.iconName && (
            <FontAwesomeIcon icon={item.iconName} className="w-5 text-gray" />
          )}
          {item.label}
        </Link>
      );
    }

    return (
      <div className={baseClassName}>
        {item.iconName && (
          <FontAwesomeIcon icon={item.iconName} className="w-5 text-gray" />
        )}
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

      {/* Full Screen Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-white"
          >
            {/* Header with Logo and Close Button */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <Link
                href="/"
                className="flex items-center gap-x-3"
                onClick={() => setIsOpen(false)}
              >
                <Image
                  src="/logos/ptp.svg"
                  alt="Parking Ticket Pal logo"
                  height={36}
                  width={32}
                />
                <span className="font-display font-bold text-xl text-dark">
                  Parking Ticket Pal
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-light transition-colors"
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faXmark} size="xl" className="text-dark" />
              </button>
            </div>

            {/* Navigation Items */}
            <motion.nav
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="px-6 py-4"
            >
              <ul>
                {items.map((item) => (
                  <li key={item.href || item.label} className={cn(item.liClass)}>
                    {renderMenuItem(item)}
                  </li>
                ))}
              </ul>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileMenu;
