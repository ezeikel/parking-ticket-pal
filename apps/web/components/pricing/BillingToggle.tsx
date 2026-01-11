'use client';

import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

export interface BillingToggleProps {
  value: 'monthly' | 'yearly';
  onChange: (value: 'monthly' | 'yearly') => void;
  tab?: 'subscriptions' | 'business';
}

const BillingToggle = ({
  value,
  onChange,
  tab = 'subscriptions',
}: BillingToggleProps) => {
  const { track } = useAnalytics();
  const isYearly = value === 'yearly';

  const handleToggle = (checked: boolean) => {
    const newValue = checked ? 'yearly' : 'monthly';
    onChange(newValue);
    track(TRACKING_EVENTS.PRICING_BILLING_TOGGLE_CHANGED, {
      billingPeriod: newValue,
      tab,
    });
  };

  return (
    <div className="flex items-center justify-center gap-3 p-4">
      <span
        className={`text-sm font-medium transition-colors ${!isYearly ? 'text-foreground' : 'text-muted-foreground'
          }`}
      >
        Monthly
      </span>
      <Switch
        checked={isYearly}
        onCheckedChange={handleToggle}
        aria-label="Toggle between monthly and yearly billing"
      />
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium transition-colors ${isYearly ? 'text-foreground' : 'text-muted-foreground'
            }`}
        >
          Yearly
        </span>
        <Badge variant="secondary" className="text-xs">
          Save up to 16%
        </Badge>
      </div>
    </div>
  );
};

export default BillingToggle;