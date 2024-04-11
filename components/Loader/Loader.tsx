'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';
import {
  CREATING_CHALLENGE_LETTER_TEXT,
  UPLOADING_TICKET_TEXT,
} from '@/constants';
import { LoaderType } from '@/types';

type LoaderProps = {
  type?: LoaderType;
  className?: string;
};

const Loader = ({ type, className }: LoaderProps) => {
  const [message, setMessage] = useState<string>(() => {
    if (type === LoaderType.CREATING_CHALLENGE_LETTER) {
      return 'Getting challenge letter...';
    }

    if (type === LoaderType.UPLOADING_TICKET_IMAGES) {
      return 'Uploading ticket images...';
    }

    return 'Loading...';
  });

  let LOADING_TEXT: string[];

  if (type === LoaderType.CREATING_CHALLENGE_LETTER) {
    LOADING_TEXT = CREATING_CHALLENGE_LETTER_TEXT;
  } else if (type === LoaderType.UPLOADING_TICKET_IMAGES) {
    LOADING_TEXT = UPLOADING_TICKET_TEXT;
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      // set message to a random loading text
      const randomIndex = Math.floor(Math.random() * LOADING_TEXT.length);
      setMessage(LOADING_TEXT[randomIndex]);
    }, 1500); // change message every 1.5 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      className={cn('flex flex-col gap-y-4 items-center', {
        [className as string]: !!className,
      })}
    >
      <FontAwesomeIcon
        icon={faSpinnerThird}
        size="2xl"
        className="animate-spin"
      />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
};

export default Loader;
