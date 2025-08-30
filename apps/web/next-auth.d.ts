// types/next-auth.d.ts

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    userId?: string;
    user: {
      dbId?: string;
    } & DefaultSession['user'];
  }
}
