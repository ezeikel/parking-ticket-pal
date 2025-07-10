'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faCircleCheck,
  faClock,
} from '@fortawesome/pro-regular-svg-icons';
import { TicketTier, type Reminder } from '@prisma/client';

type RemindersCardProps = {
  tier: TicketTier;
  reminders: Reminder[];
};

const formatReminderType = (type: string) =>
  type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const RemindersCard = ({ tier, reminders }: RemindersCardProps) => {
  const hasRemindersAccess =
    tier === TicketTier.BASIC || tier === TicketTier.PRO;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faBell} className="text-primary" size="lg" />
          <div>
            <CardTitle>Deadline Reminders</CardTitle>
            <CardDescription>
              {hasRemindersAccess
                ? "We'll notify you via SMS and email before key deadlines."
                : 'Never miss a deadline. Upgrade to get SMS and email reminders.'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasRemindersAccess && (
          <div className="text-center">
            <p className="mb-4 text-muted-foreground">
              Stay on top of your ticket with timely notifications for payment
              and appeal windows.
            </p>
            <Button>Get Reminders (£2.99)</Button>
          </div>
        )}

        {hasRemindersAccess && reminders.length === 0 && (
          <p className="text-center text-muted-foreground">
            No reminders are currently scheduled for this ticket.
          </p>
        )}

        {hasRemindersAccess && reminders.length > 0 && (
          <ul className="space-y-3">
            {reminders.map((reminder) => {
              const isSent = !!reminder.sentAt;
              const statusIcon = isSent ? faCircleCheck : faClock;
              const statusColor = isSent ? 'text-green-500' : 'text-amber-500';
              const statusText = isSent
                ? `Sent on ${new Date(reminder.sentAt!).toLocaleDateString()}`
                : `Scheduled for ${new Date(reminder.sendAt).toLocaleDateString()}`;

              return (
                <li key={reminder.id} className="flex items-center gap-3">
                  <FontAwesomeIcon
                    icon={statusIcon}
                    className={`h-5 w-5 flex-shrink-0 ${statusColor}`}
                  />
                  <span className="font-medium flex-1">
                    {formatReminderType(reminder.type)}
                  </span>
                  <span
                    className={`text-sm font-medium ${isSent ? 'text-muted-foreground' : 'text-amber-600'}`}
                  >
                    {statusText}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default RemindersCard;
