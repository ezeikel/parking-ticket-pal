'use server';

import { headers } from 'next/headers';
import { auth, signOut } from '@/auth';
import { db } from '@/lib/prisma';
import { del, put, list } from '@vercel/blob';
import { STORAGE_PATHS } from '@/constants';
import { CurrentUser } from '@/types';

type Point = {
  x: number;
  y: number;
  time: number;
};

// convert point group data to SVG path
const pointsToSvg = (pointGroups: Point[][]): string => {
  try {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 500 200">`;

    pointGroups.forEach((points) => {
      if (points.length === 0) return;

      let path = `<path d="M ${points[0].x} ${points[0].y}`;

      // add line segments to each point
      for (let i = 1; i < points.length; i += 1) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }

      // close the path
      path += `" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
      svg += path;
    });

    // close SVG
    svg += `</svg>`;

    return svg;
  } catch (error) {
    console.error('Error in pointsToSvg:', error);
    throw error;
  }
};

const convertSignaturePointsToSvg = async (
  jsonString: string,
): Promise<string> => {
  try {
    const pointGroups = JSON.parse(jsonString);

    const svg = pointsToSvg(pointGroups);

    return svg;
  } catch (error) {
    console.error('Error in convertSignaturePointsToSvg:', error);
    throw new Error('Invalid signature point data format');
  }
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
    console.error('Error deleting existing signature files:', error);
  }
};

export const getUserId = async (action?: string) => {
  const session = await auth();
  const headersList = await headers();

  const userId = session?.user.dbId || headersList.get('x-user-id');

  // TODO: create action constants
  if (action === 'get the current user') {
    return userId;
  }

  if (!userId) {
    console.error(
      `You need to be logged in to ${action || 'perform this action'}. `,
    );

    return null;
  }

  return userId;
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const userId = await getUserId('get the current user');

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      phoneNumber: true,
      signatureUrl: true,
    },
  });

  return user;
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
        console.error('Error processing signature:', error);
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

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
};

export const signOutAction = async () => {
  await signOut();
};
