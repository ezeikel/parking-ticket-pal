'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';
import { LOADING_TEXT } from '@/constants';
import { LoaderType } from '@/types';

type LoaderProps = {
  type?: LoaderType;
  className?: string;
};

const Loader = ({ type, className }: LoaderProps) => {
  const [message, setMessage] = useState<string>(() => {
    if (type === LoaderType.GENERATING_CHALLENGE_LETTER) {
      return 'Getting challenge letter...';
    }

    return 'Loading...';
  });

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
