import cn from '@/utils/cn';

type DueDateProps = {
  date: string;
  showMessage?: boolean;
  daysMessage?: string;
  colorClass: string;
  className?: string;
};

/**
 * A component that displays a date with a status indicator
 */
const DueDate = ({
  date,
  daysMessage,
  colorClass,
  className,
  showMessage = true,
}: DueDateProps) => (
    <div className={cn('flex flex-col', className)}>
      <p className="font-medium">{date}</p>
      {showMessage && daysMessage && (
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full w-fit mt-1 font-medium',
            {
              'bg-green-100 text-green-700': colorClass === 'green',
              'bg-amber-100 text-amber-700': colorClass === 'amber',
              'bg-red-100 text-red-700': colorClass === 'red',
              'bg-gray-100 text-gray-700': !colorClass,
            },
          )}
        >
          {daysMessage}
        </span>
      )}
    </div>
  );

export default DueDate;
