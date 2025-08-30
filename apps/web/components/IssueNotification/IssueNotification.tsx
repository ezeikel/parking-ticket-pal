'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faX } from '@fortawesome/pro-solid-svg-icons';

type IssueNotificationProps = {
  issueCount: number;
};

const IssueNotification = ({ issueCount }: IssueNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || issueCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-white shadow-lg animate-pulse">
        <FontAwesomeIcon icon={faTriangleExclamation} size="lg" />
        <span className="text-sm font-medium">
          {issueCount}{' '}
          {issueCount === 1 ? 'vehicle requires' : 'vehicles require'} attention
        </span>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="ml-2 rounded-full hover:bg-red-700/50 p-0.5"
        >
          <FontAwesomeIcon icon={faX} size="lg" />
          <span className="sr-only">Close notification</span>
        </button>
      </div>
    </div>
  );
};

export default IssueNotification;
