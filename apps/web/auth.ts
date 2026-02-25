import NextAuth from 'next-auth';
import type { Profile, Account, User } from '@auth/core/types';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AppleProvider from 'next-auth/providers/apple';
import Resend from 'next-auth/providers/resend';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { cookies } from 'next/headers';
import { db } from '@parking-ticket-pal/db';
import { createServerLogger } from '@/lib/logger';
import { generateAppleClientSecret } from '@/lib/apple';
import { render } from '@react-email/render';
import MagicLinkEmail from '@/components/emails/MagicLinkEmail';
import WelcomeEmail from '@/emails/WelcomeEmail';
import resendClient from '@/lib/resend';
import {
  attributeReferral,
  issueReferralCredits,
} from '@/lib/referral-attribution';

type AppleProfile = Profile & {
  user?: {
    firstName?: string;
    lastName?: string;
  };
};

const clientSecret = await generateAppleClientSecret({
  teamId: process.env.APPLE_TEAM_ID as string,
  keyId: process.env.APPLE_KEY_ID as string,
  clientId: process.env.APPLE_CLIENT_ID as string,
  privateKey: (process.env.APPLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
});

const logger = createServerLogger({ action: 'auth' });

const sendWelcomeEmail = async (email: string, name?: string) => {
  try {
    const emailHtml = await render(WelcomeEmail({ name }));

    await resendClient.emails.send({
      from: `Parking Ticket Pal <${process.env.DEFAULT_FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to Parking Ticket Pal',
      html: emailHtml,
    });
  } catch (error) {
    logger.error(
      'Failed to send welcome email',
      { email },
      error instanceof Error ? error : undefined,
    );
  }
};

const handleReferralAttribution = async (
  userId: string,
  userEmail: string | null,
) => {
  try {
    const cookieStore = await cookies();
    const referralCode = cookieStore.get('ptp_referral_code')?.value;
    const capturedAt = cookieStore.get('ptp_referral_captured_at')?.value;

    if (!referralCode) return;

    const referralId = await attributeReferral(
      userId,
      userEmail,
      referralCode,
      capturedAt,
    );

    if (referralId) {
      // OAuth and magic link users have verified emails — issue credits immediately
      await issueReferralCredits(referralId);
    }

    // Delete referral cookies after attribution attempt
    cookieStore.delete('ptp_referral_code');
    cookieStore.delete('ptp_referral_captured_at');
  } catch (error) {
    logger.error(
      'Error during referral attribution',
      { userId },
      error instanceof Error ? error : undefined,
    );
  }
};

const config = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    verifyRequest: '/auth/verify-request', // Custom "check your email" page
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CONSUMER_APP_ID as string,
      clientSecret: process.env.FACEBOOK_CONSUMER_APP_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: 'public_profile email',
        },
      },
    }),
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY as string,
      from: process.env.DEFAULT_FROM_EMAIL,
      async sendVerificationRequest({ identifier: email, url }) {
        try {
          const emailHtml = await render(MagicLinkEmail({ magicLink: url }));

          await resendClient.emails.send({
            from: `Parking Ticket Pal <${process.env.DEFAULT_FROM_EMAIL}>`,
            to: email,
            subject: 'Sign in to Parking Ticket Pal',
            html: emailHtml,
          });
        } catch (error) {
          logger.error(
            'Failed to send verification email',
            { email },
            error instanceof Error ? error : undefined,
          );
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // If the url is relative, prefix with baseUrl
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // If same origin, allow
      if (new URL(url).origin === baseUrl) return url;
      // Default: send to dashboard
      return `${baseUrl}/dashboard`;
    },
    async signIn({
      account,
      profile,
      email,
    }: {
      user: User;
      account: Account | null;
      profile?: Profile;
      email?: { verificationRequest?: boolean };
    }) {
      // handle magic link request
      if (email?.verificationRequest) {
        return true;
      }

      if (
        account?.provider === 'google' ||
        account?.provider === 'apple' ||
        account?.provider === 'facebook'
      ) {
        const appleProfile = profile as AppleProfile;
        const existingUser = profile?.email
          ? await db.user.findUnique({ where: { email: profile.email } })
          : null;

        if (existingUser) {
          return true;
        }

        let name;

        if (
          account?.provider === 'google' ||
          account?.provider === 'facebook'
        ) {
          name = profile?.name;
        } else if (account?.provider === 'apple' && appleProfile?.user) {
          // Apple only returns the user object this first time the user authorises the app - subsequent authorisations don't return the user object
          name = `${appleProfile.user.firstName} ${appleProfile.user.lastName}`;
        }

        const newUser = await db.user.create({
          data: {
            email: profile?.email as string,
            name: name as string,
          },
        });

        sendWelcomeEmail(profile?.email as string, name as string).catch(
          () => {},
        );

        // Referral attribution for OAuth signups
        handleReferralAttribution(newUser.id, profile?.email as string).catch(
          () => {},
        );

        return true;
      }

      if (account?.provider === 'resend') {
        const userEmail = account.providerAccountId;

        if (!userEmail) return false;

        const existingUser = await db.user.findUnique({
          where: { email: userEmail },
        });

        if (existingUser) {
          return true;
        }

        const newMagicLinkUser = await db.user.create({
          data: {
            email: userEmail,
          },
        });

        sendWelcomeEmail(userEmail).catch(() => {});

        // Referral attribution for magic link signups
        handleReferralAttribution(newMagicLinkUser.id, userEmail).catch(
          () => {},
        );

        return true;
      }

      return false;
    },
  },
  secret: process.env.NEXT_AUTH_SECRET,
};

// pass the config to NextAuth
export const {
  handlers,
  auth,
  signIn,
  signOut,
  // @ts-expect-error - Type 'typeof import("next-auth")' has no call signatures
} = NextAuth(config);
