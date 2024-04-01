/* eslint-disable import/prefer-default-export */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export const middleware = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // skip middleware for API routes, images, static files, and specific assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // redirect authenticated users away from sign-in page
  if (pathname === '/sign-in') {
    // TODO: this seems to cause a timeout when deployed to Vercel
    const session = await auth();
    const userId = session?.userId;

    if (userId) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
};
