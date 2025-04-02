'use client';

import { useRouter } from 'next/navigation';
import { VerificationStatus } from '@prisma/client';
import { toast } from 'sonner';
import { createVehicle, updateVehicle } from '@/app/actions';
import VehicleForm from './VehicleForm';

type VehicleFormWrapperProps = {
  initialData: {
    registrationNumber: string;
    make: string;
    model: string;
    year: string;
    color: string;
    bodyType?: string;
    fuelType?: string;
    notes?: string | null;
  };
  vehicleId?: string;
  submitLabel?: string;
  verificationStatus?: VerificationStatus;
};

const VehicleFormWrapper = ({
  initialData,
  vehicleId,
  submitLabel,
  verificationStatus,
}: VehicleFormWrapperProps) => {
  const router = useRouter();

  const handleSubmit = async (data: typeof initialData) => {
    try {
      if (vehicleId) {
        await updateVehicle(vehicleId, {
          ...data,
          notes: data.notes || '',
        });
        toast.success('Vehicle updated successfully');
        router.push(`/vehicles/${vehicleId}`);
      } else {
        const newVehicle = await createVehicle({
          ...data,
          notes: data.notes || '',
        });
        if (newVehicle) {
          toast.success('Vehicle created successfully');
          router.push('/vehicles');
        } else {
          throw new Error('Failed to create vehicle');
        }
      }
    } catch (error) {
      console.error('Error submitting vehicle:', error);
      toast.error(
        vehicleId ? 'Failed to update vehicle' : 'Failed to create vehicle',
      );
    }
  };

  return (
    <VehicleForm
      initialData={{
        ...initialData,
        notes: initialData.notes || '',
      }}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      vehicleId={vehicleId}
      verificationStatus={verificationStatus}
    />
  );
};

export default VehicleFormWrapper;
