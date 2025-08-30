import { Button } from '@/components/ui/button';
import { faTrash } from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormStatus } from 'react-dom';

type DeleteButtonProps = {
  label?: string;
  loadingLabel?: string;
  className?: string;
};

const DeleteButton = ({
  label = 'Delete',
  loadingLabel = 'Deleting...',
  className = '',
}: DeleteButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className={`flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 ${className}`}
      disabled={pending}
    >
      <FontAwesomeIcon icon={faTrash} size="lg" />
      <span>{pending ? loadingLabel : label}</span>
    </Button>
  );
};

export default DeleteButton;
