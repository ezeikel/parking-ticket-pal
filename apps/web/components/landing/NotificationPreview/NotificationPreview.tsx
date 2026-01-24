'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComment,
  faPlay,
  faPause,
} from '@fortawesome/pro-solid-svg-icons';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

type EmailNotification = {
  type: 'email';
  sender: string;
  subject: string;
  preview: string;
};

type SMSNotification = {
  type: 'sms';
  sender: string;
  message: string;
};

type NotificationData = EmailNotification | SMSNotification;

const notifications: NotificationData[] = [
  {
    type: 'email',
    sender: 'Parking Ticket Pal',
    subject: 'Your challenge letter is ready',
    preview:
      "We've drafted your challenge letter for Southwark Council ticket AB938210.",
  },
  {
    type: 'sms',
    sender: 'PTPal',
    message:
      'Reminder: Your Islington ticket doubles in 3 days. Tap to act now.',
  },
  {
    type: 'email',
    sender: 'Parking Ticket Pal',
    subject: 'Challenge submitted successfully',
    preview:
      "Your TfL congestion charge ticket was auto-submitted. We'll track the response.",
  },
  {
    type: 'sms',
    sender: 'PTPal',
    message:
      'Good news! Your Camden ticket has an 87% predicted success rate.',
  },
  {
    type: 'email',
    sender: 'Parking Ticket Pal',
    subject: 'Challenge successful - £120 saved!',
    preview:
      'Congratulations! Your Westminster ticket has been cancelled.',
  },
];

const NotificationCard = ({ notification, index }: { notification: NotificationData; index: number }) => {
  const isEmail = notification.type === 'email';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
        delay: index * 0.1,
      }}
      className="w-full rounded-2xl bg-white/95 backdrop-blur-md p-3 shadow-lg border border-white/20"
    >
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div
          className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
            isEmail ? 'bg-white border border-slate-200' : 'bg-green-500'
          }`}
        >
          {isEmail ? (
            <Image
              src="/icons/gmail.svg"
              alt="Email"
              width={18}
              height={18}
            />
          ) : (
            <FontAwesomeIcon icon={faComment} className="text-white text-sm" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 truncate">
              {isEmail ? (notification as EmailNotification).sender : (notification as SMSNotification).sender}
            </span>
            <span className="text-[10px] text-slate-500 ml-2">now</span>
          </div>
          {isEmail ? (
            <>
              <p className="text-xs font-medium text-slate-800 truncate mt-0.5">
                {(notification as EmailNotification).subject}
              </p>
              <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                {(notification as EmailNotification).preview}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-700 line-clamp-2 mt-0.5">
              {(notification as SMSNotification).message}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const NotificationPreview = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNotifications, setCurrentNotifications] = useState<NotificationData[]>([]);
  const [notificationIndex, setNotificationIndex] = useState(0);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false, margin: '-100px' });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { track } = useAnalytics();

  const addNotification = useCallback(() => {
    const newNotification = notifications[notificationIndex % notifications.length];

    setCurrentNotifications((prev) => {
      // Keep only the last 2 notifications + new one
      const updated = [newNotification, ...prev].slice(0, 3);
      return updated;
    });

    setNotificationIndex((prev) => prev + 1);
  }, [notificationIndex]);

  useEffect(() => {
    if (isPlaying && isInView) {
      // Add first notification immediately
      if (currentNotifications.length === 0) {
        addNotification();
      }

      intervalRef.current = setInterval(() => {
        addNotification();
      }, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isInView, addNotification, currentNotifications.length]);

  // Reset when leaving view
  useEffect(() => {
    if (!isInView) {
      setIsPlaying(false);
      setCurrentNotifications([]);
      setNotificationIndex(0);
    }
  }, [isInView]);

  const togglePlay = () => {
    if (!isPlaying) {
      setCurrentNotifications([]);
      setNotificationIndex(0);
      track(TRACKING_EVENTS.NOTIFICATION_DEMO_STARTED, {});
    } else {
      track(TRACKING_EVENTS.NOTIFICATION_DEMO_STOPPED, {});
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* iPhone Frame */}
      <div className="relative mx-auto w-[280px] h-[560px]">
        {/* Phone outer shell */}
        <div className="absolute inset-0 rounded-[3rem] bg-slate-900 shadow-2xl" />

        {/* Phone inner bezel */}
        <div className="absolute inset-[3px] rounded-[2.8rem] bg-slate-800" />

        {/* Screen */}
        <div className="absolute inset-[8px] rounded-[2.5rem] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-4">
            <span className="text-xs font-semibold text-slate-700">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px]">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className="w-[3px] bg-slate-700 rounded-sm"
                    style={{ height: `${bar * 2 + 4}px` }}
                  />
                ))}
              </div>
              <div className="ml-1 w-6 h-3 rounded-sm bg-slate-700 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[2px] w-[2px] h-2 bg-slate-700 rounded-r" />
              </div>
            </div>
          </div>

          {/* Dynamic Island / Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-slate-900 rounded-full" />

          {/* Notifications area */}
          <div className="mt-12 px-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {currentNotifications.map((notification, idx) => (
                <NotificationCard
                  key={`${notification.type}-${notificationIndex - idx}`}
                  notification={notification}
                  index={idx}
                />
              ))}
            </AnimatePresence>

            {/* Empty state */}
            {!isPlaying && currentNotifications.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="h-16 w-16 rounded-full bg-white/60 flex items-center justify-center mb-4">
                  <Image
                    src="/logos/ptp.svg"
                    alt="Parking Ticket Pal"
                    width={32}
                    height={32}
                  />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  Press play to see notifications
                </p>
              </motion.div>
            )}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-400 rounded-full" />
        </div>

        {/* Side buttons */}
        <div className="absolute left-0 top-28 w-[3px] h-8 bg-slate-700 rounded-l" />
        <div className="absolute left-0 top-44 w-[3px] h-16 bg-slate-700 rounded-l" />
        <div className="absolute left-0 top-64 w-[3px] h-16 bg-slate-700 rounded-l" />
        <div className="absolute right-0 top-36 w-[3px] h-20 bg-slate-700 rounded-r" />
      </div>

      {/* Play/Pause button */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
        <motion.button
          type="button"
          onClick={togglePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-dark text-white font-medium text-sm shadow-lg hover:bg-dark/90 transition-colors"
        >
          <FontAwesomeIcon
            icon={isPlaying ? faPause : faPlay}
            className="text-xs"
          />
          {isPlaying ? 'Pause' : 'Play Demo'}
        </motion.button>
      </div>
    </div>
  );
};

export default NotificationPreview;
