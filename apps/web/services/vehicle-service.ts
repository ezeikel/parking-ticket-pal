'use server';

import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import getVehicleInfo from '@/utils/getVehicleInfo';

/**
 * Handles post-update tasks for a vehicle (re-verifies if registration changed)
 */
// eslint-disable-next-line import/prefer-default-export
export const afterVehicleUpdate = async (
  vehicleId: string,
  oldRegistrationNumber: string | undefined,
  newRegistrationNumber: string | undefined,
) => {
  // If registration number was updated, verify the new information
  if (
    newRegistrationNumber &&
    oldRegistrationNumber &&
    newRegistrationNumber !== oldRegistrationNumber
  ) {
    try {
      const vehicleInfo = await getVehicleInfo(newRegistrationNumber);

      // Update vehicle with verified information
      await db.vehicle.update({
        where: { id: vehicleId },
        data: {
          make: vehicleInfo.make,
          model: vehicleInfo.model,
          bodyType: vehicleInfo.bodyType,
          fuelType: vehicleInfo.fuelType,
          color: vehicleInfo.color,
          year: vehicleInfo.year,
          verification: {
            upsert: {
              create: {
                type: vehicleInfo.verification.type,
                status: vehicleInfo.verification.status,
                verifiedAt:
                  vehicleInfo.verification.status === 'VERIFIED'
                    ? new Date()
                    : null,
                metadata: vehicleInfo.verification.metadata,
              },
              update: {
                status: vehicleInfo.verification.status,
                verifiedAt:
                  vehicleInfo.verification.status === 'VERIFIED'
                    ? new Date()
                    : null,
                metadata: vehicleInfo.verification.metadata,
              },
            },
          },
        } as Prisma.VehicleUpdateInput,
      });
    } catch (error) {
      console.error('Failed to verify vehicle:', error);
      // Don't throw - verification failure shouldn't break vehicle updates
    }
  }
};
