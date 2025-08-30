/* eslint-disable import/prefer-default-export */

import { db } from '@/lib/prisma';

// longer duration to account for openai api calls
export const maxDuration = 30;

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: {
      id: id as string,
    },
  });

  return Response.json(
    { user },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  const body = await req.json();

  const user = await db.user.update({
    where: {
      id: id as string,
    },
    data: {
      name: body.name,
      phoneNumber: body.phoneNumber,
      address: {
        line1: body.addressLine1,
        line2: body.addressLine2,
        city: body.city,
        county: body.county,
        postcode: body.postcode,
      },
    },
  });

  return Response.json(
    { user },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      },
      status: 200,
    },
  );
};
