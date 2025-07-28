/* eslint-disable import/prefer-default-export */
import { NextRequest, NextResponse } from 'next/server';
import { isPathAuthenticated } from './utils/isAuthenticatedPath';
import { decrypt } from './app/lib/session';

export const middleware = async (req: NextRequest) => {
  // object added to req from next-auth wrapper this function
  const { pathname } = req.nextUrl;

  // https://stackoverflow.com/a/76749457/2491630
  const session = !!(
    req.cookies.get('authjs.session-token') ||
    // in production it seems to get prefixed with __Secure-
    req.cookies.get('__Secure-authjs.session-token')
  );

  // skip middleware for API routes, images, static files, and specific assets
  if (
    pathname.startsWith('/images') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/monitoring' ||
    pathname.startsWith('/relay-hyx5') // PostHog proxy route
  ) {
    return NextResponse.next();
  }

  // middleware for api routes
  if (pathname.startsWith('/api')) {
    // skip auth middleware if we have authjs session token
    if (session) {
      return NextResponse.next();
    }

    // skip auth middleware for mobile auth route (no token required)
    if (pathname === '/api/auth/mobile') {
      return NextResponse.next();
    }

    // check request for token in authorization header
    const token = req.headers.get('authorization')?.split(' ')[1];

    // TODO: should probably check if request is from mobile app and route requires token but not proivded - return 401
    // skip auth middleware if no token is provided
    if (!token) {
      return NextResponse.next();
    }

    try {
      const payload = await decrypt(token);
      const { id, email } = payload || {};

      const reqHeaders = new Headers(req.headers);

      // for api requests from mobile app add user id and email to response headers
      if (id && email) {
        // add user id and email to request headers
        reqHeaders.set('x-user-id', id as string);
        reqHeaders.set('x-user-email', email as string);
      }

      return NextResponse.next({
        request: {
          // new request headers
          headers: reqHeaders,
        },
      });
    } catch (error) {
      console.error('Failed to verify token', error);
      return NextResponse.error();
    }
  }

  if (pathname === '/') {
    // redirect authenticated users away from landing page
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  }

  if (isPathAuthenticated(pathname)) {
    // users must sign in to access pages that require authentication
    if (!session) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
};
