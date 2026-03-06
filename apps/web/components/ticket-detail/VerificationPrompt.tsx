'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldExclamation,
  faSpinnerThird,
} from '@fortawesome/pro-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { verifyTicket } from '@/app/actions/ticket';
import { Button } from '@/components/ui/button';

type VerificationPromptProps = {
  ticketId: string;
  pcnNumber: string;
};

const VerificationPrompt = ({
  ticketId,
  pcnNumber,
}: VerificationPromptProps) => {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const success = await verifyTicket(pcnNumber, ticketId);
      if (success) {
        toast.success('Ticket verified successfully');
        router.refresh();
      } else {
        toast.error(
          'Verification failed. The issuer portal may be unavailable.',
        );
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-amber/20 bg-amber/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-amber-dark">
        <FontAwesomeIcon icon={faShieldExclamation} className="h-4 w-4" />
        <span>This ticket hasn&apos;t been verified yet</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="bg-transparent text-xs"
        onClick={handleVerify}
        disabled={isVerifying}
      >
        {isVerifying ? (
          <>
            <FontAwesomeIcon
              icon={faSpinnerThird}
              className="h-3 w-3 animate-spin"
            />
            Verifying...
          </>
        ) : (
          'Verify Now'
        )}
      </Button>
    </div>
  );
};

export default VerificationPrompt;
