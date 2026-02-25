'use server';

import { signOut } from '@/auth';
import { db } from '@parking-ticket-pal/db';
import { del, put, list } from '@/lib/storage';
import { track } from '@/utils/analytics-server';
import { STORAGE_PATHS } from '@/constants';
import { TRACKING_EVENTS } from '@/constants/events';
import { convertSignaturePointsToSvg } from '@/utils/signature';
import { createServerLogger } from '@/lib/logger';
import type { Address } from '@parking-ticket-pal/types';

const logger = createServerLogger({ action: 'user' });

type UpdateUserData = {
  name?: string;
  phoneNumber?: string;
  address?: Address;
  // Legacy flat address fields for backward compatibility
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  signatureDataUrl?: string;
};

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
    logger.error(
      'Error deleting existing signature files',
      {
        userId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
  }
};

/**
 * Internal function to update user profile
 * Shared between server actions and API routes
 */
const updateUserProfileInternal = async (
  userId: string,
  data: UpdateUserData,
) => {
  if (!userId) {
    return {
      success: false as const,
      error: 'User ID is required',
      user: null,
    };
  }

  try {
    const {
      name,
      phoneNumber,
      address,
      addressLine1,
      addressLine2,
      city,
      county,
      postcode,
      signatureDataUrl: signaturePoints,
    } = data;

    let signatureUrl = null;

    // Process signature if provided
    if (signaturePoints && signaturePoints.trim() !== '') {
      try {
        // Convert signature points to SVG
        const svgData = await convertSignaturePointsToSvg(signaturePoints);

        const svgBuffer = Buffer.from(svgData, 'utf-8');

        // Delete any existing signature files
        await deleteExistingSignature(userId);

        // Save to R2 storage
        // New path: users/{userId}/signature.svg
        const storagePath = STORAGE_PATHS.USER_SIGNATURE.replace('%s', userId);
        const signatureBlob = await put(storagePath, svgBuffer, {
          contentType: 'image/svg+xml',
        });

        // Get the URL from the newly created blob
        signatureUrl = signatureBlob.url;
      } catch (error) {
        logger.error(
          'Error processing signature',
          {
            userId,
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // Handle address - support both full Address object and legacy flat fields
    let addressData = null;
    if (address) {
      // New format: full Address object with coordinates
      addressData = address;
    } else if (addressLine1 || addressLine2 || city || county || postcode) {
      // Legacy format: flat fields (for backward compatibility)
      addressData = {
        line1: addressLine1,
        line2: addressLine2,
        city,
        county,
        postcode,
      };
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name,
        phoneNumber,
        address: addressData || undefined,
        signatureUrl: signatureUrl || undefined,
      },
    });

    await track(TRACKING_EVENTS.USER_PROFILE_UPDATED, {
      name: !!name,
      phone_number: !!phoneNumber,
      address: !!(addressLine1 || addressLine2 || city || county || postcode),
      signature: !!signatureUrl,
    });

    return { success: true as const, user: updatedUser };
  } catch (error) {
    logger.error(
      'Error updating profile',
      {
        userId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false as const,
      error: 'Failed to update profile',
      user: null,
    };
  }
};

/**
 * Server action to update user profile (for use in forms)
 */
export const updateUserProfile = async (userId: string, formData: FormData) => {
  const data: UpdateUserData = {
    name: formData.get('name') as string,
    phoneNumber: (formData.get('phoneNumber') as string | null) || undefined,
    addressLine1: (formData.get('addressLine1') as string | null) || undefined,
    addressLine2: (formData.get('addressLine2') as string | null) || undefined,
    city: (formData.get('city') as string | null) || undefined,
    county: (formData.get('county') as string | null) || undefined,
    postcode: (formData.get('postcode') as string | null) || undefined,
    signatureDataUrl:
      (formData.get('signatureDataUrl') as string | null) || undefined,
  };

  return updateUserProfileInternal(userId, data);
};

/**
 * Update user profile by user ID (for API routes)
 * Includes authentication check to ensure user can only update their own profile
 */
export const updateUserById = async (
  requestedUserId: string,
  authenticatedUserId: string,
  data: UpdateUserData,
) => {
  // Verify the authenticated user is updating their own profile
  if (requestedUserId !== authenticatedUserId) {
    logger.error('Unauthorized user profile update attempt', {
      requestedUserId,
      authenticatedUserId,
    });
    return {
      success: false as const,
      error: "Unauthorized - cannot update another user's profile",
      user: null,
    };
  }

  return updateUserProfileInternal(requestedUserId, data);
};

/**
 * Get user by ID (for API routes)
 * Includes authentication check to ensure user can only access their own profile
 */
export const getUserById = async (
  requestedUserId: string,
  authenticatedUserId: string,
) => {
  // Verify the authenticated user is accessing their own profile
  if (requestedUserId !== authenticatedUserId) {
    logger.error('Unauthorized user profile access attempt', {
      requestedUserId,
      authenticatedUserId,
    });
    return {
      success: false,
      error: "Unauthorized - cannot access another user's profile",
      user: null,
    };
  }

  try {
    const user = await db.user.findUnique({
      where: { id: requestedUserId },
    });

    if (!user) {
      return { success: false, error: 'User not found', user: null };
    }

    return { success: true, user };
  } catch (error) {
    logger.error(
      'Error fetching user',
      {
        userId: requestedUserId,
      },
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: 'Failed to fetch user', user: null };
  }
};

/**
 * Delete user account by ID (for API routes)
 * Includes authentication check to ensure user can only delete their own account
 */
export const deleteUserById = async (
  requestedUserId: string,
  authenticatedUserId: string,
) => {
  // Verify the authenticated user is deleting their own account
  if (requestedUserId !== authenticatedUserId) {
    logger.error('Unauthorized user account deletion attempt', {
      requestedUserId,
      authenticatedUserId,
    });
    return {
      success: false as const,
      error: "Unauthorized - cannot delete another user's account",
    };
  }

  try {
    // 1. Delete user's R2 files (signatures, evidence, etc.)
    try {
      const { blobs } = await list({
        prefix: `users/${requestedUserId}/`,
      });

      if (blobs.length > 0) {
        await Promise.all(blobs.map((blob) => del(blob.url)));
      }
    } catch (storageError) {
      logger.error(
        'Error deleting user R2 files during account deletion',
        { userId: requestedUserId },
        storageError instanceof Error
          ? storageError
          : new Error(String(storageError)),
      );
      // Continue with deletion even if R2 cleanup fails
    }

    // 2. Delete User — all other relations cascade automatically
    await db.user.delete({
      where: { id: requestedUserId },
    });

    await track(TRACKING_EVENTS.USER_ACCOUNT_DELETED, {
      user_id: requestedUserId,
    });

    logger.info('User account deleted successfully', {
      userId: requestedUserId,
    });

    return { success: true as const };
  } catch (error) {
    logger.error(
      'Error deleting user account',
      { userId: requestedUserId },
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      success: false as const,
      error: 'Failed to delete account',
    };
  }
};

export const signOutAction = async () => {
  await signOut();
};
