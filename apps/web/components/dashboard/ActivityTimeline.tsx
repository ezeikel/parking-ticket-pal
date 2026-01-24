'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrophy,
  faXmark,
  faFileLines,
  faPaperPlane,
  faClock,
  faCamera,
  faCreditCard,
  faTriangleExclamation,
} from '@fortawesome/pro-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import Link from 'next/link';

type ActivityType =
  | 'appeal_won'
  | 'appeal_lost'
  | 'letter_generated'
  | 'challenge_submitted'
  | 'reminder'
  | 'ticket_uploaded'
  | 'payment'
  | 'deadline_warning';

type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  metadata?: string;
  timestamp: string;
  group: string;
};

type ActivityTimelineProps = {
  activities?: Activity[];
};

type ActivityConfig = {
  icon: IconDefinition;
  iconBg: string;
  iconColor: string;
};

const activityConfig: Record<ActivityType, ActivityConfig> = {
  appeal_won: {
    icon: faTrophy,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  appeal_lost: {
    icon: faXmark,
    iconBg: 'bg-coral/10',
    iconColor: 'text-coral',
  },
  letter_generated: {
    icon: faFileLines,
    iconBg: 'bg-teal/10',
    iconColor: 'text-teal',
  },
  challenge_submitted: {
    icon: faPaperPlane,
    iconBg: 'bg-teal/10',
    iconColor: 'text-teal',
  },
  reminder: {
    icon: faClock,
    iconBg: 'bg-amber/10',
    iconColor: 'text-amber',
  },
  ticket_uploaded: {
    icon: faCamera,
    iconBg: 'bg-light',
    iconColor: 'text-gray',
  },
  payment: {
    icon: faCreditCard,
    iconBg: 'bg-light',
    iconColor: 'text-gray',
  },
  deadline_warning: {
    icon: faTriangleExclamation,
    iconBg: 'bg-coral/10',
    iconColor: 'text-coral',
  },
};

const ActivityTimeline = ({ activities = [] }: ActivityTimelineProps) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  // Group activities
  const groups = activities.reduce(
    (acc, activity) => {
      if (!acc[activity.group]) {
        acc[activity.group] = [];
      }
      acc[activity.group].push(activity);
      return acc;
    },
    {} as Record<string, Activity[]>,
  );

  if (activities.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-dark">Recent Activity</h2>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-gray">No recent activity to show.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-dark">Recent Activity</h2>
        <Link href="/activity" className="text-sm text-teal hover:underline">
          View All
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        {Object.entries(groups).map(([group, groupActivities], groupIndex) => (
          <div key={group} className={groupIndex > 0 ? 'mt-6' : ''}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: groupIndex * 0.2 }}
              className="mb-3 flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-teal" />
              <span className="text-sm font-semibold text-dark">{group}</span>
            </motion.div>

            <div className="space-y-0">
              {groupActivities.map((activity, index) => {
                const config = activityConfig[activity.type];
                const isLast = index === groupActivities.length - 1;

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={
                      isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }
                    }
                    transition={{ delay: groupIndex * 0.2 + index * 0.1 }}
                    className="flex gap-3"
                  >
                    {/* Left column: dot + line */}
                    <div className="flex flex-col items-center">
                      {/* Dot */}
                      <div
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 border-white ${config.iconBg}`}
                      >
                        <FontAwesomeIcon
                          icon={config.icon}
                          className={`text-[10px] ${config.iconColor}`}
                        />
                      </div>
                      {/* Vertical line (only if not last item) */}
                      {!isLast && <div className="w-0.5 flex-1 bg-border" />}
                    </div>

                    {/* Right column: content */}
                    <div className={`min-w-0 flex-1 ${!isLast ? 'pb-5' : ''}`}>
                      <p className="text-sm font-medium text-dark">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 text-sm text-gray">
                        {activity.description}
                      </p>
                      {activity.metadata && (
                        <p className="mt-0.5 text-xs text-gray/70">
                          {activity.metadata}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray/50">
                        {activity.timestamp}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
