'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import cn from '@/utils/cn';
import { faCheck } from '@fortawesome/pro-regular-svg-icons';
import { ReactNode } from 'react';

type SubscriptionPlanProps = {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  isActive: boolean;
  isDisabled: boolean;
  badge?: string;
  onSelect?: () => void;
  footer?: ReactNode;
};

const SubscriptionPlan = ({
  name,
  description,
  price,
  period,
  features,
  isActive,
  isDisabled,
  badge,
  onSelect,
  footer,
}: SubscriptionPlanProps) => {
  return (
    <Card
      className={cn(
        'flex flex-col border-2 relative transition-all flex-1',
        isActive ? 'border-primary shadow-md' : 'border-muted',
        isDisabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:border-primary/80 hover:shadow-sm',
        onSelect && !isDisabled ? 'cursor-pointer' : '',
      )}
      onClick={isDisabled || !onSelect ? undefined : onSelect}
    >
      {badge && (
        <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
          {badge}
        </Badge>
      )}

      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-4">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-muted-foreground ml-1">/ {period}</span>
        </div>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <FontAwesomeIcon
                icon={faCheck}
                className="h-4 w-4 text-green-500 mr-2 mt-1"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {footer
          ? footer
          : isActive && (
              <Badge variant="outline" className="w-full py-1 justify-center">
                Current Plan
              </Badge>
            )}
      </CardFooter>
    </Card>
  );
};

export default SubscriptionPlan;
