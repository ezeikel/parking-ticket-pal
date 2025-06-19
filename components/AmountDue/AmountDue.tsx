import cn from '@/utils/cn';

type AmountDueProps = {
  amount: number;
  showMessage?: boolean;
  message?: string;
  status: 'discount' | 'standard' | 'overdue';
  className?: string;
  compact?: boolean;
};

/**
 * A component that displays the amount due with a status indicator
 */
const AmountDue = ({
  amount,
  showMessage = true,
  message,
  status,
  className,
  compact = false,
}: AmountDueProps) => (
    <div className={cn('flex flex-col', className)}>
      <p className={cn('font-medium', compact ? 'text-sm' : '')}>
        £{(amount / 100).toFixed(2)}
      </p>
      {showMessage && message && (
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full w-fit mt-1 font-medium',
            {
              'bg-green-100 text-green-700': status === 'discount',
              'bg-amber-100 text-amber-700': status === 'standard',
              'bg-red-100 text-red-700': status === 'overdue',
            },
            compact && 'px-1.5 py-0.5 text-[10px]',
          )}
        >
          {message}
        </span>
      )}
    </div>
  );

export default AmountDue;
