'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faPaperPlane } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

type MobileStickyFooterProps = {
  currentAmount: number;
  onPay?: () => void;
  onChallenge?: () => void;
};

const formatAmount = (pence: number) =>
  `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MobileStickyFooter = ({
  currentAmount,
  onPay,
  onChallenge,
}: MobileStickyFooterProps) => {
  return (
    <div className="sticky bottom-0 border-t border-border bg-white p-4 md:hidden">
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 bg-transparent"
          onClick={onPay}
        >
          <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
          Pay {formatAmount(currentAmount)}
        </Button>
        <Button
          className="flex-1 bg-teal text-white hover:bg-teal-dark"
          onClick={onChallenge}
        >
          <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
          Challenge
        </Button>
      </div>
    </div>
  );
};

export default MobileStickyFooter;
