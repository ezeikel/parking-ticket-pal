/* eslint-disable import/prefer-default-export */
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  revalidateTag('/blog');
  revalidateTag('/blog/[slug]');

  return NextResponse.json({ revalidated: true, now: Date.now() });
};
