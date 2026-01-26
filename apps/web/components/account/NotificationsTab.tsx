'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faClock,
  faBell,
  faBullhorn,
} from '@fortawesome/pro-solid-svg-icons';
import { User } from '@parking-ticket-pal/db/types';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type NotificationSetting = {
  id: string;
  label: string;
  description: string;
  icon: typeof faEnvelope;
  enabled: boolean;
};

type NotificationsTabProps = {
  user: Partial<User>;
};

const NotificationsTab = ({ user: _user }: NotificationsTabProps) => {
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'deadlines',
      label: 'Ticket deadline reminders',
      description:
        "Get notified before your appeal deadlines so you don't miss them.",
      icon: faClock,
      enabled: true,
    },
    {
      id: 'status',
      label: 'Status updates',
      description: 'Receive updates when your ticket status changes.',
      icon: faBell,
      enabled: true,
    },
    {
      id: 'marketing',
      label: 'Tips & promotions',
      description:
        'Get helpful parking tips and occasional promotional offers.',
      icon: faBullhorn,
      enabled: false,
    },
  ]);

  const handleMasterToggle = (checked: boolean) => {
    setMasterEnabled(checked);
    if (!checked) {
      setSettings((prev) => prev.map((s) => ({ ...s, enabled: false })));
    }
  };

  const handleSettingToggle = (id: string, checked: boolean) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: checked } : s)),
    );
    // If enabling any setting, also enable master
    if (checked && !masterEnabled) {
      setMasterEnabled(true);
    }
  };

  const handleSave = () => {
    // TODO: Implement save to backend
    toast.success('Notification preferences saved');
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon
                icon={faEnvelope}
                className="text-xl text-teal"
              />
            </div>
            <div>
              <h3 className="font-semibold text-dark">Email Notifications</h3>
              <p className="text-sm text-gray">
                {masterEnabled
                  ? 'Notifications are enabled'
                  : 'All notifications are turned off'}
              </p>
            </div>
          </div>
          <Switch
            checked={masterEnabled}
            onCheckedChange={handleMasterToggle}
            className="data-[state=checked]:bg-teal"
          />
        </div>
      </div>

      {/* Individual Settings Card */}
      <motion.div
        animate={{ opacity: masterEnabled ? 1 : 0.5 }}
        className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
      >
        <h3 className="text-lg font-semibold text-dark">
          Notification Preferences
        </h3>
        <p className="mt-1 text-sm text-gray">
          Choose which emails you want to receive.
        </p>

        <div className="mt-6 space-y-1">
          {settings.map((setting, index) => (
            <motion.div
              key={setting.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-light/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-light">
                  <FontAwesomeIcon icon={setting.icon} className="text-gray" />
                </div>
                <div>
                  <p className="font-medium text-dark">{setting.label}</p>
                  <p className="text-sm text-gray">{setting.description}</p>
                </div>
              </div>
              <Switch
                checked={setting.enabled}
                onCheckedChange={(checked) =>
                  handleSettingToggle(setting.id, checked)
                }
                disabled={!masterEnabled}
                className="data-[state=checked]:bg-teal"
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <Button
            onClick={handleSave}
            className="h-11 bg-teal text-white hover:bg-teal-dark"
          >
            Save Preferences
          </Button>
        </div>
      </motion.div>

      {/* Info Card */}
      <div className="rounded-2xl border border-border bg-light/50 p-6">
        <p className="text-sm text-gray">
          <strong className="text-dark">Note:</strong> We&apos;ll always send
          you important account-related emails such as password resets and
          security alerts, regardless of your notification settings.
        </p>
      </div>
    </div>
  );
};

export default NotificationsTab;
