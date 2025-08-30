'use server';

import { revalidatePath } from 'next/cache';
import { Prisma, VerificationStatus, VerificationType } from '@prisma/client';
import getVehicleInfo from '@/utils/getVehicleInfo';
import { track } from '@/utils/analytics-server';
import { db } from '@/lib/prisma';
import { TRACKING_EVENTS } from '@/constants/events';
import { getUserId } from '@/utils/user';
import type { VehicleInfo } from '@/utils/getVehicleInfo';
import { afterVehicleUpdate } from '@/services/vehicle-service';

export const createVehicle = async (
  _prevState: { success: boolean; error?: string; data?: any } | null,
  formData: FormData,
) => {
  const userId = await getUserId('create a vehicle');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const registrationNumber = formData.get('registrationNumber') as string;
  const make = formData.get('make') as string;
  const model = formData.get('model') as string;
  const color = formData.get('color') as string;
  const year = formData.get('year') as string;
  const bodyType = formData.get('bodyType') as string;
  const fuelType = formData.get('fuelType') as string;
  const notes = formData.get('notes') as string;

  if (!registrationNumber || !make || !model) {
    return {
      success: false,
      error: 'Registration number, make, and model are required.',
    };
  }

  try {
    // Get vehicle info from the API to ensure we have the most up-to-date information
    const vehicleInfo = await getVehicleInfo(registrationNumber);
    const vehicleVerified = vehicleInfo.verification.status === 'VERIFIED';

    const vehicle = await db.vehicle.create({
      data: {
        registrationNumber: registrationNumber.toUpperCase(),
        make: make || vehicleInfo.make,
        model: model || vehicleInfo.model,
        year: parseInt(year || vehicleInfo.year.toString(), 10),
        color: color || vehicleInfo.color,
        bodyType: bodyType || vehicleInfo.bodyType || '',
        fuelType: fuelType || vehicleInfo.fuelType || '',
        notes: notes || '',
        verification: vehicleVerified
          ? {
              create: {
                type: VerificationType.VEHICLE,
                status: VerificationStatus.VERIFIED,
                verifiedAt: new Date(),
                metadata:
                  (vehicleInfo.verification.metadata as Prisma.JsonValue) ||
                  undefined,
              },
            }
          : undefined,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    // Handle additional verification if provided
    const verificationType = formData.get('verificationType') as string;
    const verificationStatus = formData.get('verificationStatus') as string;

    if (verificationType && verificationStatus) {
      await db.verification.create({
        data: {
          type: verificationType as VerificationType,
          status: verificationStatus as VerificationStatus,
          verifiedAt: new Date(),
          metadata: undefined,
          vehicleId: vehicle.id,
        },
      });
    }

    await track(TRACKING_EVENTS.VEHICLE_ADDED, {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      verified: vehicleVerified,
    });

    if (vehicleVerified) {
      await track(TRACKING_EVENTS.VEHICLE_VERIFIED, {
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        automated: true,
        lookupSuccess: true,
      });
    }

    revalidatePath('/vehicles');
    return { success: true, data: vehicle };
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return { success: false, error: 'Failed to create vehicle' };
  }
};

export const updateVehicle = async (
  _prevState: { success: boolean; error?: string; data?: any } | null,
  formData: FormData,
) => {
  const userId = await getUserId('update a vehicle');
  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const id = formData.get('id') as string;
  const registrationNumber = formData.get('registrationNumber') as string;
  const make = formData.get('make') as string;
  const model = formData.get('model') as string;
  const color = formData.get('color') as string;
  const year = formData.get('year') as string;
  const notes = formData.get('notes') as string;

  if (!id || !registrationNumber || !make || !model) {
    return {
      success: false,
      error: 'Vehicle ID, registration number, make, and model are required.',
    };
  }

  try {
    // Get current vehicle data before update to compare registration number
    const currentVehicle = await db.vehicle.findUnique({
      where: { id, userId },
      select: { registrationNumber: true },
    });

    if (!currentVehicle) {
      return { success: false, error: 'Vehicle not found' };
    }

    const oldRegistrationNumber = currentVehicle.registrationNumber;
    const newRegistrationNumber = registrationNumber.toUpperCase();

    const vehicle = await db.vehicle.update({
      where: {
        id,
        userId,
      },
      data: {
        registrationNumber: newRegistrationNumber,
        make,
        model,
        year: parseInt(year, 10),
        color,
        notes: notes || '',
      },
    });

    // handle post-update tasks e.g re-verification if registration changed
    await afterVehicleUpdate(
      vehicle.id,
      oldRegistrationNumber,
      newRegistrationNumber,
    );

    await track(TRACKING_EVENTS.VEHICLE_UPDATED, {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      hasNotes: !!vehicle.notes,
    });

    revalidatePath('/vehicles');
    return { success: true, data: vehicle };
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return { success: false, error: 'Failed to update vehicle' };
  }
};

export const deleteVehicle = async (
  _prevState: { success: boolean; error?: string; data?: any } | null,
  formData: FormData,
) => {
  const userId = await getUserId('delete a vehicle');

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const id = formData.get('id') as string;

  if (!id) {
    return { success: false, error: 'Vehicle ID is required' };
  }

  try {
    const vehicleToDelete = await db.vehicle.findUnique({
      where: { id, userId },
      include: {
        tickets: { select: { id: true } },
      },
    });

    if (!vehicleToDelete) {
      return { success: false, error: 'Vehicle not found' };
    }

    const vehicle = await db.vehicle.delete({
      where: {
        id,
        userId,
      },
    });

    await track(TRACKING_EVENTS.VEHICLE_DELETED, {
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      ticketCount: vehicleToDelete.tickets.length,
    });

    revalidatePath('/vehicles');
    return { success: true, data: vehicle };
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return { success: false, error: 'Failed to delete vehicle' };
  }
};

export const getVehicles = async () => {
  const userId = await getUserId('get vehicles');

  if (!userId) {
    return null;
  }

  const vehicles = await db.vehicle.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      registrationNumber: true,
      make: true,
      model: true,
      year: true,
      color: true,
      tickets: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return vehicles;
};

export const getVehicle = async (id: string) => {
  const userId = await getUserId('get a vehicle');

  if (!userId) {
    return null;
  }

  const vehicle = await db.vehicle.findUnique({
    where: {
      id,
      userId,
    },
    include: {
      tickets: {
        select: {
          id: true,
          pcnNumber: true,
          issuedAt: true,
          initialAmount: true,
          status: true,
          issuer: true,
        },
      },
      verification: {
        select: {
          status: true,
          verifiedAt: true,
          metadata: true,
        },
      },
    },
  });

  return vehicle;
};

export const getVehicleDetails = async (
  // The first argument to a formAction is the previous state, which we aren't using here.
  // The second is the FormData.
  _prevState: any,
  formData: FormData,
): Promise<{
  success: boolean;
  data?: VehicleInfo;
  error?: string;
}> => {
  const registrationNumber = formData.get('registrationNumber') as string;
  if (!registrationNumber || registrationNumber.length < 2) {
    return {
      success: false,
      error: 'Please enter a valid registration number.',
    };
  }

  const vehicleInfo = await getVehicleInfo(registrationNumber);

  await track(TRACKING_EVENTS.VEHICLE_VERIFIED, {
    registrationNumber: registrationNumber.toUpperCase(),
    automated: false,
    lookupSuccess:
      vehicleInfo.verification.status === VerificationStatus.VERIFIED,
  });

  if (vehicleInfo.verification.status === 'FAILED') {
    return {
      success: false,
      error: 'Could not find vehicle details. Please enter them manually.',
    };
  }

  return { success: true, data: vehicleInfo };
};
