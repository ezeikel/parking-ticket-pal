/* eslint-disable import-x/prefer-default-export */
import { NextRequest, NextResponse } from 'next/server';
import { isPathAuthenticated } from './utils/isAuthenticatedPath';
import { decrypt } from './app/lib/session';

export const proxy = async (req: NextRequest) => {
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
    pathname === '/monitoring' || // Sentry proxy route
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

    // skip auth middleware for mobile auth routes (no token required)
    if (pathname.startsWith('/api/auth/mobile')) {
      return NextResponse.next();
    }

    // skip JWT processing for blog generation route (uses CRON_SECRET)
    if (
      pathname === '/api/blog/generate' ||
      pathname === '/api/cron/generate-blog'
    ) {
      return NextResponse.next();
    }

    // skip JWT processing for social media posting route (uses CRON_SECRET)
    if (pathname === '/api/social/post') {
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

      const reqHeaders = new Headers(req.headers);

      // Handle device token (has userId) or legacy session token (has id)
      const userId = (payload?.userId ?? payload?.id) as string | undefined;
      const email = payload?.email as string | undefined;

      if (userId) {
        reqHeaders.set('x-user-id', userId);
        if (email) {
          reqHeaders.set('x-user-email', email);
        }
      }

      return NextResponse.next({
        request: {
          headers: reqHeaders,
        },
      });
    } catch (_error) {
      // Token is invalid or expired — let the request through without user headers.
      // The route handler will see no x-user-id and can return 401 itself.
      return NextResponse.next();
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
