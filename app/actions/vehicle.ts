import { revalidatePath } from 'next/cache';
import { Prisma, VerificationStatus, VerificationType } from '@prisma/client';
import getVehicleInfo from '@/utils/getVehicleInfo';
import { db } from '@/lib/prisma';
import { getUserId } from './user';

type VerificationInput = {
  type: 'VEHICLE' | 'TICKET';
  status: 'VERIFIED' | 'UNVERIFIED' | 'FAILED';
  verifiedAt: Date | null;
  metadata?: Record<string, unknown>;
};

export const createVehicle = async (data: {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  color: string;
  bodyType?: string;
  fuelType?: string;
  notes?: string;
  verification?: VerificationInput;
}) => {
  const userId = await getUserId('create a vehicle');

  if (!userId) {
    return null;
  }

  const vehicleInfo = await getVehicleInfo(data.registrationNumber);

  const vehicleVerified = vehicleInfo.verification.status === 'VERIFIED';

  try {
    const vehicle = await db.vehicle.create({
      data: {
        registrationNumber: data.registrationNumber,
        // TODO: spread data first?
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        color: vehicleInfo.color,
        bodyType: vehicleInfo.bodyType,
        fuelType: vehicleInfo.fuelType,
        notes: data.notes || '',
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

    if (data.verification) {
      await db.verification.create({
        data: {
          type: data.verification.type,
          status: data.verification.status,
          verifiedAt: data.verification.verifiedAt,
          metadata:
            (data.verification.metadata as Prisma.JsonValue) || undefined,
          vehicleId: vehicle.id,
        },
      });
    }

    revalidatePath('/vehicles');
    return vehicle;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return null;
  }
};

export async function updateVehicle(
  id: string,
  data: {
    registrationNumber: string;
    make: string;
    model: string;
    year: string;
    color: string;
    bodyType?: string;
    fuelType?: string;
    notes?: string;
    verification?: VerificationInput;
  },
) {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    const vehicle = await db.vehicle.update({
      where: {
        id,
        userId,
      },
      data: {
        registrationNumber: data.registrationNumber,
        make: data.make,
        model: data.model,
        year: parseInt(data.year, 10),
        color: data.color,
        bodyType: data.bodyType || '',
        fuelType: data.fuelType || '',
        notes: data.notes,
      },
    });

    if (data.verification) {
      await db.verification.upsert({
        where: {
          vehicleId: vehicle.id,
        },
        create: {
          type: data.verification.type,
          status: data.verification.status,
          verifiedAt: data.verification.verifiedAt,
          metadata:
            (data.verification.metadata as Prisma.JsonValue) || undefined,
          vehicleId: vehicle.id,
        },
        update: {
          status: data.verification.status,
          verifiedAt: data.verification.verifiedAt,
          metadata:
            (data.verification.metadata as Prisma.JsonValue) || undefined,
        },
      });
    }

    revalidatePath('/vehicles');
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw new Error('Failed to update vehicle');
  }
}

export const deleteVehicle = async (id: string) => {
  const userId = await getUserId('delete a vehicle');

  if (!userId) {
    return null;
  }

  try {
    const vehicle = await db.vehicle.delete({
      where: {
        id,
        userId,
      },
    });

    revalidatePath('/vehicles');
    return vehicle;
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return null;
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
