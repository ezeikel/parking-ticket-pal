'use client';

import { deleteVehicle } from '@/app/actions';
import { useRouter } from 'next/navigation';
import DeleteButton from '../DeleteButton/DeleteButton';

type DeleteVehicleButtonProps = {
  vehicleId: string;
};

const DeleteVehicleButton = ({ vehicleId }: DeleteVehicleButtonProps) => {
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteVehicle(vehicleId);
      router.push('/vehicles');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      // You might want to show a toast notification here
    }
  };

  return (
    <form action={handleDelete}>
      <DeleteButton label="Delete Vehicle" loadingLabel="Deleting Vehicle..." />
    </form>
  );
};

export default DeleteVehicleButton;
