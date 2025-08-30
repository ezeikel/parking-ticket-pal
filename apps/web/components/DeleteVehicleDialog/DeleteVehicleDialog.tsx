'use client';

import { useEffect, useActionState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteVehicle } from '@/app/actions/vehicle';
import { toast } from 'sonner';

type DeleteVehicleDialogProps = {
  vehicle: {
    id: string;
    registrationNumber: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DeleteVehicleDialog = ({
  vehicle,
  open,
  onOpenChange,
}: DeleteVehicleDialogProps) => {
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteVehicle,
    null,
  );

  useEffect(() => {
    if (deleteState?.success) {
      toast.success('Vehicle deleted successfully.');
      onOpenChange(false);
    } else if (deleteState?.error) {
      toast.error(deleteState.error);
    }
  }, [deleteState, onOpenChange]);

  const handleDelete = () => {
    const formData = new FormData();
    formData.append('id', vehicle.id);
    deleteAction(formData);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            vehicle{' '}
            <span className="font-semibold">{vehicle.registrationNumber}</span>{' '}
            and all of its associated tickets.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
          >
            {isDeleting ? 'Deleting...' : 'Yes, delete vehicle'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteVehicleDialog;
