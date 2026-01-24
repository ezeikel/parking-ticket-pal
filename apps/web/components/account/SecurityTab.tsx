'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLink,
  faLinkSlash,
  faDesktop,
  faMobileScreen,
  faLocationDot,
  faCircleCheck,
  faCircleXmark,
  faSpinnerThird,
} from '@fortawesome/pro-solid-svg-icons';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { User } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ConnectedAccount = {
  id: string;
  provider: 'google' | 'apple';
  name: string;
  icon: typeof faGoogle;
  connected: boolean;
  email?: string;
};

type ActiveSession = {
  id: string;
  device: string;
  deviceType: 'desktop' | 'mobile';
  location: string;
  lastActive: string;
  isCurrent: boolean;
};

type SecurityTabProps = {
  user: Partial<User>;
};

const SecurityTab = ({ user }: SecurityTabProps) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Mock data - in production this would come from the user's account
  // In production, this would come from the user's linked accounts
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([
    {
      id: 'google',
      provider: 'google',
      name: 'Google',
      icon: faGoogle,
      connected: true, // Assume connected if they signed in with OAuth
      email: user?.email || undefined,
    },
    {
      id: 'apple',
      provider: 'apple',
      name: 'Apple',
      icon: faApple,
      connected: false,
    },
  ]);

  // Mock sessions - in production this would come from auth provider
  const sessions: ActiveSession[] = [
    {
      id: '1',
      device: 'Chrome on Mac',
      deviceType: 'desktop',
      location: 'London, UK',
      lastActive: 'Now',
      isCurrent: true,
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      deviceType: 'mobile',
      location: 'London, UK',
      lastActive: '2 hours ago',
      isCurrent: false,
    },
  ];

  const handleConnect = async (provider: 'google' | 'apple') => {
    setIsConnecting(provider);
    try {
      // TODO: Implement OAuth connection
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setConnectedAccounts((prev) =>
        prev.map((acc) =>
          acc.provider === provider ? { ...acc, connected: true } : acc
        )
      );
      toast.success(`${provider === 'google' ? 'Google' : 'Apple'} account connected`);
    } catch {
      toast.error('Failed to connect account');
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'apple') => {
    setIsConnecting(provider);
    try {
      // TODO: Implement disconnect
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setConnectedAccounts((prev) =>
        prev.map((acc) =>
          acc.provider === provider ? { ...acc, connected: false } : acc
        )
      );
      toast.success(`${provider === 'google' ? 'Google' : 'Apple'} account disconnected`);
    } catch {
      toast.error('Failed to disconnect account');
    } finally {
      setIsConnecting(null);
    }
  };

  const handleSignOutAll = async () => {
    setIsSigningOut(true);
    try {
      // TODO: Implement sign out all sessions
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Signed out of all other sessions');
    } catch {
      toast.error('Failed to sign out sessions');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connected Accounts Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold text-dark">Connected Accounts</h3>
        <p className="mt-1 text-sm text-gray">
          Connect your accounts for easy sign-in.
        </p>

        <div className="mt-6 space-y-4">
          {connectedAccounts.map((account) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    account.provider === 'google' ? 'bg-red-50' : 'bg-gray-100'
                  }`}
                >
                  <FontAwesomeIcon
                    icon={account.icon}
                    className={`text-2xl ${
                      account.provider === 'google' ? 'text-red-500' : 'text-dark'
                    }`}
                  />
                </div>
                <div>
                  <p className="font-medium text-dark">{account.name}</p>
                  {account.connected ? (
                    <div className="flex items-center gap-1.5 text-sm text-teal">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                      {account.email ? `Connected as ${account.email}` : 'Connected'}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-gray">
                      <FontAwesomeIcon icon={faCircleXmark} className="text-xs" />
                      Not connected
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant={account.connected ? 'outline' : 'default'}
                size="sm"
                onClick={() =>
                  account.connected
                    ? handleDisconnect(account.provider)
                    : handleConnect(account.provider)
                }
                disabled={isConnecting !== null}
                className={
                  account.connected
                    ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
                    : 'bg-teal text-white hover:bg-teal-dark'
                }
              >
                {isConnecting === account.provider ? (
                  <FontAwesomeIcon icon={faSpinnerThird} className="animate-spin" />
                ) : account.connected ? (
                  <>
                    <FontAwesomeIcon icon={faLinkSlash} className="mr-1.5" />
                    Disconnect
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faLink} className="mr-1.5" />
                    Connect
                  </>
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Sessions Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-dark">Active Sessions</h3>
            <p className="mt-1 text-sm text-gray">
              Manage devices where you&apos;re signed in.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOutAll}
            disabled={isSigningOut || sessions.filter((s) => !s.isCurrent).length === 0}
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            {isSigningOut ? (
              <FontAwesomeIcon icon={faSpinnerThird} className="animate-spin" />
            ) : (
              'Sign Out All Others'
            )}
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between rounded-xl border p-4 ${
                session.isCurrent ? 'border-teal bg-teal/5' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    session.isCurrent ? 'bg-teal/10' : 'bg-light'
                  }`}
                >
                  <FontAwesomeIcon
                    icon={session.deviceType === 'desktop' ? faDesktop : faMobileScreen}
                    className={session.isCurrent ? 'text-teal' : 'text-gray'}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-dark">{session.device}</p>
                    {session.isCurrent && (
                      <span className="rounded-full bg-teal px-2 py-0.5 text-xs font-medium text-white">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray">
                    <FontAwesomeIcon icon={faLocationDot} className="text-xs" />
                    {session.location} · {session.lastActive}
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  Sign Out
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Security Tips */}
      <div className="rounded-2xl border border-border bg-light/50 p-6">
        <h4 className="font-medium text-dark">Security Tips</h4>
        <ul className="mt-3 space-y-2 text-sm text-gray">
          <li className="flex items-start gap-2">
            <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 text-teal" />
            Connect multiple accounts for backup sign-in options
          </li>
          <li className="flex items-start gap-2">
            <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 text-teal" />
            Regularly review your active sessions and sign out unknown devices
          </li>
          <li className="flex items-start gap-2">
            <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 text-teal" />
            Use strong, unique passwords for your connected accounts
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityTab;
