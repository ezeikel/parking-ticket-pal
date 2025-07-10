import NextAuth from 'next-auth';
 
import type {
  AuthConfig,
  Account,
  Profile,
  Session,
  User,
} from '@auth/core/types';
import GoogleProvider from 'next-auth/providers/google';
import type { JWT } from 'next-auth/jwt';
import { db } from './lib/prisma';

const config = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({
      account,
      profile,
    }: {
      user: User;
      account?: Account | null;
      profile?: Profile;
    }) {
      if (account?.provider === 'google') {
        const existingUser = profile?.email
          ? await db.user.findUnique({ where: { email: profile.email } })
          : null;

        if (existingUser) {
          return true;
        }

        await db.user.create({
          data: {
            email: profile?.email as string,
            name: profile?.name as string,
          },
        });
        return true;
      }
      return false;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      const dbUser = token.email
        ? await db.user.findUnique({
            where: { email: token.email as string },
          })
        : null;

      return {
        ...session,
        user: {
          ...session.user,
          dbId: dbUser?.id,
        },
      };
    },
  },
  secret: process.env.NEXT_AUTH_SECRET,
} satisfies AuthConfig;

// pass the config to NextAuth
export const {
  handlers,
  auth,
  signIn,
  signOut,
  // @ts-expect-error - Type 'typeof import("next-auth")' has no call signatures
} = NextAuth(config);
