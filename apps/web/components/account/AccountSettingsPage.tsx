'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faBell,
  faCreditCard,
  faShieldHalved,
  faTrashCan,
} from '@fortawesome/pro-solid-svg-icons';
import { User } from '@parking-ticket-pal/db/types';
import cn from '@/utils/cn';
import ProfileTab from './ProfileTab';
import NotificationsTab from './NotificationsTab';
import BillingTab from './BillingTab';
import SecurityTab from './SecurityTab';
import DeleteAccountTab from './DeleteAccountTab';

type Tab = 'profile' | 'notifications' | 'billing' | 'security' | 'delete';

const VALID_TABS: Tab[] = ['profile', 'notifications', 'billing', 'security', 'delete'];

type TabConfig = {
  id: Tab;
  label: string;
  icon: typeof faUser;
  component: React.ComponentType<{ user: Partial<User> }>;
};

const TABS: TabConfig[] = [
  { id: 'profile', label: 'Profile', icon: faUser, component: ProfileTab },
  { id: 'notifications', label: 'Notifications', icon: faBell, component: NotificationsTab },
  { id: 'billing', label: 'Billing', icon: faCreditCard, component: BillingTab },
  { id: 'security', label: 'Security', icon: faShieldHalved, component: SecurityTab },
  { id: 'delete', label: 'Delete Account', icon: faTrashCan, component: DeleteAccountTab },
];

type AccountSettingsPageProps = {
  user: Partial<User>;
  initialTab?: Tab;
};

const AccountSettingsPage = ({ user, initialTab = 'profile' }: AccountSettingsPageProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active tab from URL, falling back to initialTab prop
  const tabParam = searchParams.get('tab');
  const activeTab: Tab = tabParam && VALID_TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : initialTab;

  const handleTabChange = useCallback((tab: Tab) => {
    // Build new URL
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'profile') {
      params.delete('tab'); // Default tab doesn't need URL param
    } else {
      params.set('tab', tab);
    }
    const newUrl = params.toString() ? `/account?${params.toString()}` : '/account';

    // Use replace for shallow navigation that updates searchParams
    router.replace(newUrl, { scroll: false });
  }, [router, searchParams]);

  const ActiveComponent = TABS.find((tab) => tab.id === activeTab)?.component || ProfileTab;

  return (
    <div className="min-h-screen bg-light">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Header */}
        <h1 className="text-2xl font-bold text-dark md:text-3xl">Account Settings</h1>

        <div className="mt-8 flex flex-col gap-8 md:flex-row">
          {/* Desktop Sidebar Navigation */}
          <nav className="hidden w-56 shrink-0 md:block">
            <ul className="space-y-1">
              {TABS.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all',
                      activeTab === tab.id
                        ? 'bg-teal/10 text-teal'
                        : 'text-gray hover:bg-light hover:text-dark',
                      tab.id === 'delete' && activeTab !== 'delete' && 'text-red-500 hover:text-red-600',
                      tab.id === 'delete' && activeTab === 'delete' && 'bg-red-50 text-red-600'
                    )}
                  >
                    <FontAwesomeIcon
                      icon={tab.icon}
                      className={cn(
                        'w-4',
                        activeTab === tab.id ? 'text-teal' : '',
                        tab.id === 'delete' && 'text-red-500'
                      )}
                    />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Horizontal Tabs */}
          <nav className="md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-teal text-white'
                      : 'bg-white text-gray shadow-sm',
                    tab.id === 'delete' && activeTab !== 'delete' && 'text-red-500',
                    tab.id === 'delete' && activeTab === 'delete' && 'bg-red-500 text-white'
                  )}
                >
                  <FontAwesomeIcon icon={tab.icon} className="w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ActiveComponent user={user} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
