/* eslint-disable import/prefer-default-export */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { AUTHENTICATED_PATHS } from './constants';

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

  if (pathname === '/') {
    // TODO: this seems to cause a timeout when deployed to Vercel
    const session = await auth();
    const userId = session?.userId;

    // home for authenticated users should be dashboard
    if (userId) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // home for unauthenticated users should be sign-in
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  if (AUTHENTICATED_PATHS.includes(pathname)) {
    // TODO: this seems to cause a timeout when deployed to Vercel
    const session = await auth();
    const userId = session?.userId;

    // users must sign in to access pages that require authentication
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
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
