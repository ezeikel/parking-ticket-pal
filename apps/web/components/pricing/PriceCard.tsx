'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/pro-regular-svg-icons';
import cn from '@/utils/cn';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { setPendingPricingAction } from '@/utils/pendingPricingAction';

export type PriceCardProps = {
  title: string;
  subtitle?: string;
  price: string;
  period?: string;
  features: string[];
  ctaLabel: string;
  href: string;
  dataAttrs?: Record<string, string>;
  badge?: string;
  disabled?: boolean;
  variant?: 'default' | 'highlighted';
  disclaimer?: string;
  location?: 'pricing_page' | 'homepage';
};

const PriceCard = ({
  title,
  subtitle,
  price,
  period,
  features,
  ctaLabel,
  href,
  dataAttrs = {},
  badge,
  disabled = false,
  variant = 'default',
  disclaimer,
  location = 'pricing_page',
}: PriceCardProps) => {
  const { track } = useAnalytics();
  const { status } = useSession();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    track(TRACKING_EVENTS.PRICING_PLAN_CLICKED, {
      planName: title,
      planType: 'one-time',
      price,
      location,
    });

    // If user is loading or already authenticated, let the default href work
    if (status === 'loading' || status === 'authenticated') {
      return;
    }

    // Only store pending action for premium tier (free tier doesn't need checkout)
    if (title.toLowerCase().includes('premium')) {
      e.preventDefault();

      setPendingPricingAction({
        type: 'one-time',
        tier: 'premium',
        source: location,
      });

      router.push('/signin');
    }
  };

  return (
    <Card
      className={cn(
        'flex flex-col h-full border-2 transition-all',
        variant === 'highlighted'
          ? 'border-primary shadow-lg scale-105'
          : 'border-border',
        disabled && 'opacity-75',
      )}
    >
      <CardHeader>
        {badge && (
          <Badge variant="default" className="w-fit mb-2">
            {badge}
          </Badge>
        )}
        <CardTitle className="flex flex-col gap-1">
          <span className="font-slab text-2xl">{title}</span>
          {subtitle && (
            <span className="text-base font-normal text-muted-foreground">
              {subtitle}
            </span>
          )}
        </CardTitle>
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{price}</span>
            {period && (
              <span className="text-sm text-muted-foreground">/{period}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <FontAwesomeIcon
                icon={faCheck}
                className="h-5 w-5 text-green-600 mt-0.5 shrink-0"
              />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        {disclaimer && (
          <p className="text-xs text-muted-foreground mt-4 italic">
            {disclaimer}
          </p>
        )}
      </CardContent>
      <CardFooter>
        {disabled ? (
          <Button className="w-full" variant="outline" disabled>
            {ctaLabel}
          </Button>
        ) : (
          <Button className="w-full" asChild size="lg">
            <a href={href} {...dataAttrs} onClick={handleClick}>
              {ctaLabel}
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PriceCard;
