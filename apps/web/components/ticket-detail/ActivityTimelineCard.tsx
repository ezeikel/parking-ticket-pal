'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/pro-solid-svg-icons';
import type { HistoryEvent } from '@/types';

type ActivityTimelineCardProps = {
  events: HistoryEvent[];
};

type TimelineEventType = 'upload' | 'letter' | 'submit' | 'response' | 'deadline' | 'payment' | 'form' | 'challenge';

const timelineTypeConfig: Record<TimelineEventType, { icon: string; color: string; bg: string }> = {
  upload: { icon: 'fa-cloud-arrow-up', color: 'text-teal', bg: 'bg-teal/10' },
  letter: { icon: 'fa-file-lines', color: 'text-teal', bg: 'bg-teal/10' },
  submit: { icon: 'fa-paper-plane', color: 'text-success', bg: 'bg-success/10' },
  response: { icon: 'fa-envelope', color: 'text-teal', bg: 'bg-teal/10' },
  deadline: { icon: 'fa-clock', color: 'text-amber', bg: 'bg-amber/10' },
  payment: { icon: 'fa-credit-card', color: 'text-gray', bg: 'bg-light' },
  form: { icon: 'fa-file-contract', color: 'text-teal', bg: 'bg-teal/10' },
  challenge: { icon: 'fa-gavel', color: 'text-success', bg: 'bg-success/10' },
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getEventTitle = (event: HistoryEvent): string => {
  switch (event.type) {
    case 'letter':
      return `Appeal letter ${event.data.type.toLowerCase().replace(/_/g, ' ')}`;
    case 'form':
      return `${event.data.formType} form generated`;
    case 'challenge':
      return `Challenge ${event.data.status.toLowerCase()}`;
    default:
      return 'Activity';
  }
};

const getEventDescription = (event: HistoryEvent): string | undefined => {
  switch (event.type) {
    case 'letter':
      return event.data.summary || undefined;
    case 'form':
      return `Generated ${event.data.formType} form`;
    case 'challenge':
      return event.data.reason || undefined;
    default:
      return undefined;
  }
};

const ActivityTimelineCard = ({ events }: ActivityTimelineCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between md:cursor-default"
      >
        <h2 className="text-lg font-semibold text-dark">Activity Timeline</h2>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-gray transition-transform md:hidden ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div className={`mt-4 ${isExpanded ? 'block' : 'hidden md:block'}`}>
        {events.length === 0 ? (
          <p className="text-sm text-gray">No activity yet</p>
        ) : (
        <div className="relative space-y-4 pl-6">
          {/* Timeline Line */}
          <div className="absolute bottom-4 left-[7px] top-4 w-0.5 bg-border" />

          {events.map((event, index) => {
            const config = timelineTypeConfig[event.type];
            const title = getEventTitle(event);
            const description = getEventDescription(event);

            return (
              <motion.div
                key={`${event.type}-${event.date.getTime()}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="relative"
              >
                {/* Dot */}
                <div
                  className={`absolute -left-6 flex h-4 w-4 items-center justify-center rounded-full ${config.bg} ring-4 ring-white`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${config.color.replace('text-', 'bg-')}`}
                  />
                </div>

                <div>
                  <p className="text-xs text-gray">
                    {formatDate(event.date)} at {formatTime(event.date)}
                  </p>
                  <p className="mt-0.5 font-medium text-dark">{title}</p>
                  {description && (
                    <p className="mt-0.5 text-sm text-gray">{description}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>
    </motion.div>
  );
};

export default ActivityTimelineCard;
