'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faBellSlash } from '@fortawesome/pro-regular-svg-icons';
import { faBellOn } from '@fortawesome/pro-solid-svg-icons';

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
    subject: '🧾 Your challenge letter is ready',
    preview:
      "We've drafted your challenge letter for Southwark Council ticket AB938210. Review and submit it now.",
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
    subject: '✅ Challenge submitted successfully',
    preview:
      "Your TfL congestion charge ticket (XA298192) was auto-submitted. We'll track the response.",
  },
  {
    type: 'sms',
    sender: 'PTPal',
    message: 'Good news! Your Camden ticket has an 87% predicted success rate.',
  },
  {
    type: 'email',
    sender: 'Parking Ticket Pal',
    subject: '📊 Case analysis complete',
    preview:
      'AI found 3 strong grounds for challenge on your ParkingEye ticket (PE112398). View details.',
  },
  {
    type: 'sms',
    sender: 'PTPal',
    message:
      'Update: Hackney ticket result expected in 5 days. We’ll notify you.',
  },
  {
    type: 'email',
    sender: 'Parking Ticket Pal',
    subject: '🎉 Challenge successful – £120 saved!',
    preview:
      'Congratulations! Your Westminster ticket has been cancelled. No payment needed.',
  },
  {
    type: 'sms',
    sender: 'PTPal',
    message: 'New ticket uploaded. AI review starting now...',
  },
  {
    type: 'sms',
    sender: 'PTPal',
    message:
      'Final notice: Fine for ticket AB992311 increases tomorrow. Take action now.',
  },
];

const Wrapper = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`ios-notification-card w-[340px] flex items-start gap-3 ${className}`}
  >
    {children}
  </div>
);

const renderEmailNotification = (note: EmailNotification) => (
  <Wrapper>
    <div className="size-8 bg-white rounded-lg flex items-center justify-center self-center border border-slate-200">
      <Image
        src="/icons/gmail.svg"
        objectFit="contain"
        alt="Email"
        width={20}
        height={20}
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between">
        <span className="text-sm font-bold text-slate-900 truncate">
          {note.sender}
        </span>
        <span className="text-xs font-light text-slate-600">now</span>
      </div>
      <div className="flex flex-col gap-y-0.5">
        <h4 className="text-sm font-bold text-slate-800 mb-0 line-clamp-1">
          {note.subject}
        </h4>
        <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-tight">
          {note.preview}
        </p>
      </div>
    </div>
  </Wrapper>
);

const renderSMSNotification = (note: SMSNotification) => (
  <Wrapper className="flex items-center gap-3">
    <div className="size-8 bg-green-500 rounded-lg flex items-center justify-center self-center">
      <FontAwesomeIcon icon={faComment} size="lg" color="#FFFFFF" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-bold text-slate-800 mb-0">{note.sender}</h4>
      <p className="text-xs text-slate-700 line-clamp-2 leading-tight">
        {note.message}
      </p>
    </div>
    <span className="text-xs font-light text-slate-600">now</span>
  </Wrapper>
);

const renderNotification = (note: NotificationData) => {
  if (note.type === 'email') {
    return renderEmailNotification(note);
  }
  if (note.type === 'sms') {
    return renderSMSNotification(note);
  }
  // Fallback - should never reach here but ensures we always return a React element
  return <div>Unknown notification type</div>;
};

export const useFakeNotifications = (isSilenced: boolean) => {
  useEffect(() => {
    if (isSilenced) return; // Don't show notifications if silenced

    let index = 0;
    let timeoutId: NodeJS.Timeout;

    const showNextNotification = () => {
      const note = notifications[index];

      // Use the main toaster but with custom styling for fake notifications
      toast.custom(() => renderNotification(note), {
        duration: 5000,
        position: window.innerWidth <= 768 ? 'bottom-center' : 'top-right', // Bottom on mobile, top-right on desktop
        style: {
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          marginTop: window.innerWidth <= 768 ? '0' : '88px', // No top margin on mobile since it's at bottom
        },
        className: 'ios-toast',
      });

      index = (index + 1) % notifications.length;

      // Random interval between 4-8 seconds for more realistic timing
      const nextDelay = Math.random() * 4000 + 4000;
      timeoutId = setTimeout(showNextNotification, nextDelay);
    };

    // Start after a short delay
    const initialDelay = setTimeout(showNextNotification, 3000);

    return () => {
      clearTimeout(initialDelay);
      clearTimeout(timeoutId);
    };
  }, [isSilenced]);
};

const FakeNotifications = () => {
  const [isSilenced, setIsSilenced] = useState(false);

  useFakeNotifications(isSilenced);

  const toggleSilence = () => {
    setIsSilenced(!isSilenced);
  };

  return (
    <button
      onClick={toggleSilence}
      className="fixed bottom-4 right-4 z-[10000] w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer"
      title={
        isSilenced
          ? 'Enable dummy notifications'
          : 'Silence dummy notifications'
      }
    >
      <FontAwesomeIcon
        icon={isSilenced ? faBellSlash : faBellOn}
        className={`text-lg ${isSilenced ? 'text-gray-400' : 'text-[#FFD700]'}`}
      />
    </button>
  );
};

export default FakeNotifications;
