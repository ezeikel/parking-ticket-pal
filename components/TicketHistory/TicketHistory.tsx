'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines, faFilePdf } from '@fortawesome/pro-regular-svg-icons';
import type { HistoryEvent } from '@/types';

type TicketHistoryProps = {
  events: HistoryEvent[];
};

const EventIcon = ({ type }: { type: 'letter' | 'form' | 'challenge' }) => {
  let icon = faFileLines; // default

  if (type === 'letter') {
    icon = faFileLines;
  } else if (type === 'form') {
    icon = faFilePdf;
  } else if (type === 'challenge') {
    icon = faFileLines;
  }
  return (
    <div className="absolute -left-4 mt-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <FontAwesomeIcon icon={icon} size="1x" />
    </div>
  );
};

const TicketHistory = ({ events }: TicketHistoryProps) => {
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No letters or forms have been recorded for this ticket yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket History</CardTitle>
        <CardDescription>
          A chronological record of all letters and forms related to this
          ticket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-border ml-4">
          {events.map((event) => (
            <li key={`${event.type}-${event.data.id}`} className="mb-10 ml-8">
              <EventIcon type={event.type} />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {(() => {
                    if (event.type === 'letter') {
                      return event.data.type.replace(/_/g, ' ');
                    }
                    if (event.type === 'form') {
                      return `${event.data.formType} Form Generated`;
                    }
                    return `${event.data.type} Challenge Submitted`;
                  })()}
                </h3>
                <time className="text-sm font-normal leading-none text-muted-foreground">
                  {event.date.toLocaleDateString()} at{' '}
                  {event.date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <div className="mt-2 rounded-lg border bg-background p-4">
                {(() => {
                  if (event.type === 'letter') {
                    return (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {event.data.summary}
                        </p>
                        <Button variant="outline" size="sm">
                          {event.data.type === 'CHALLENGE_LETTER'
                            ? 'Download Letter'
                            : 'View Letter Image'}
                        </Button>
                      </div>
                    );
                  }
                  if (event.type === 'form') {
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox id={`emailed-${event.data.id}`} />
                          <Label htmlFor={`emailed-${event.data.id}`}>
                            Mark as Emailed to TEC
                          </Label>
                        </div>
                        <Button variant="secondary" size="sm">
                          Download Form
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Reason: {event.data.reason}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Status:{' '}
                          {event.data.status.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      </div>
                      {event.data.type === 'AUTO_CHALLENGE' && (
                        <Button variant="outline" size="sm">
                          View Screenshot
                        </Button>
                      )}
                      {event.data.type === 'LETTER' && (
                        <Button variant="outline" size="sm">
                          Download Letter
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

export default TicketHistory;
