'use server';

import { signOut } from '@/auth';
import { db } from '@/lib/prisma';
import { del, put, list } from '@vercel/blob';
import { track } from '@/utils/analytics-server';
import { STORAGE_PATHS } from '@/constants';
import { TRACKING_EVENTS } from '@/constants/events';
import { convertSignaturePointsToSvg } from '@/utils/signature';
import { createServerLogger } from '@/lib/logger';

const logger = createServerLogger({ action: 'user' });

const deleteExistingSignature = async (userId: string): Promise<void> => {
  try {
    const { blobs } = await list({
      prefix: `users/${userId}/`,
    });

    const signatureFiles = blobs.filter((blob) =>
      blob.pathname.includes('signature'),
    );

    await Promise.all(signatureFiles.map((file) => del(file.url)));
  } catch (error) {
    logger.error('Error deleting existing signature files', {
      userId
    }, error instanceof Error ? error : new Error(String(error)));
  }
};

export const updateUserProfile = async (userId: string, formData: FormData) => {
  try {
    const name = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string | null;
    const addressLine1 = formData.get('addressLine1') as string | null;
    const addressLine2 = formData.get('addressLine2') as string | null;
    const city = formData.get('city') as string | null;
    const county = formData.get('county') as string | null;
    const postcode = formData.get('postcode') as string | null;
    const signaturePoints = formData.get('signatureDataUrl') as string | null;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    let signatureUrl = null;

    // Process signature if provided
    if (signaturePoints && signaturePoints.trim() !== '') {
      try {
        // Convert signature points to SVG
        const svgData = await convertSignaturePointsToSvg(signaturePoints);

        const svgBuffer = Buffer.from(svgData, 'utf-8');

        // Delete any existing signature files
        await deleteExistingSignature(userId);

        // Save to Vercel Blob storage
        const blobPath = STORAGE_PATHS.USER_SIGNATURE.replace('%s', userId);
        const signatureBlob = await put(blobPath, svgBuffer, {
          access: 'public',
          contentType: 'image/svg+xml',
        });

        // Get the URL from the newly created blob
        signatureUrl = signatureBlob.url;
      } catch (error) {
        logger.error('Error processing signature', {
          userId
        }, error instanceof Error ? error : new Error(String(error)));
      }
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name,
        phoneNumber,
        address: {
          line1: addressLine1,
          line2: addressLine2,
          city,
          county,
          postcode,
        },
        signatureUrl: signatureUrl || undefined,
      },
    });

    await track(TRACKING_EVENTS.USER_PROFILE_UPDATED, {
      name: !!name,
      phoneNumber: !!phoneNumber,
      address: !!(addressLine1 || addressLine2 || city || county || postcode),
      signature: !!signatureUrl,
    });

    return { success: true, user: updatedUser };
  } catch (error) {
    logger.error('Error updating profile', {
      userId
    }, error instanceof Error ? error : new Error(String(error)));
    return { success: false, error: 'Failed to update profile' };
  }
};

export const signOutAction = async () => {
  await signOut();
};
