'use client';

import { Button } from '@/components/ui/button';
import { faEdit } from '@fortawesome/pro-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFormStatus } from 'react-dom';

type EditButtonProps = {
  label?: string;
  loadingLabel?: string;
  onClick?: () => void;
  className?: string;
};

const EditButton = ({
  label = 'Edit',
  loadingLabel = 'Editing...',
  onClick,
  className = '',
}: EditButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="button"
      variant="outline"
      className={`flex items-center gap-2 ${className}`}
      disabled={pending}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={faEdit} size="lg" />
      <span>{pending ? loadingLabel : label}</span>
    </Button>
  );
};

export default EditButton;
