import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';
import Purchases from 'react-native-purchases';
import { usePostHog } from 'posthog-react-native';
import * as Sentry from '@sentry/react-native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentUser,
  signIn as signInApi,
  signInWithFacebook,
  signInWithApple,
  sendMagicLink,
  ensureRegistered,
  mobileLogout,
  resetRegistrationState,
} from '@/api';
import {
  getDeviceId,
  getSessionToken,
  setSessionToken,
  setUserId,
  logout as authLogout,
} from '@/lib/auth';
import { unregisterPushToken } from '@/lib/notifications';
import { logger } from '@/lib/logger';
import { usePurchases } from './purchases';

const REFERRAL_CODE_KEY = 'ptp_referral_code';

type User = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  lastPremiumPurchaseAt?: string | null;
  [key: string]: any;
};

type AuthContextType = {
  isAuthenticated: boolean;
  isLinked: boolean;
  user: User | null;
  signIn: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  getToken: () => Promise<string | null>;
};

type AuthContextProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLinked: false,
  user: null,
  signIn: async () => {},
  signInWithFacebook: async () => {},
  signInWithApple: async () => {},
  sendMagicLink: async () => {},
  signOut: async () => {},
  isLoading: true,
  getToken: async () => null,
});

export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const { isConfigured: isPurchasesConfigured } = usePurchases();

  const configureGoogleSignIn = () => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  };

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const identifyUser = useCallback(
    async (userData: User) => {
      // PostHog
      if (userData.id) {
        try {
          posthog.identify(userData.id, {
            email: userData.email,
            name: userData.name,
            created_at: userData.createdAt,
            has_premium_purchase: !!userData.lastPremiumPurchaseAt,
            is_anonymous: !userData.email,
          });
          logger.debug('User identified with PostHog', { action: 'auth', userId: userData.id });
        } catch (error) {
          logger.error('Error identifying user with PostHog', { action: 'auth', userId: userData.id }, error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Sentry
      if (userData.id) {
        try {
          Sentry.setUser({
            id: userData.id,
            email: userData.email || undefined,
            username: userData.name || undefined,
          });
          Sentry.setTag('has_premium_purchase', (!!userData.lastPremiumPurchaseAt).toString());
          Sentry.setTag('is_anonymous', (!userData.email).toString());
          logger.debug('User identified with Sentry', { action: 'auth', userId: userData.id });
        } catch (error) {
          logger.error('Error identifying user with Sentry', { action: 'auth', userId: userData.id }, error instanceof Error ? error : new Error(String(error)));
        }
      }

      // RevenueCat
      if (userData.id && isPurchasesConfigured) {
        try {
          await Purchases.logIn(userData.id);
          logger.debug('User identified with RevenueCat', { action: 'auth', userId: userData.id });
        } catch (error) {
          logger.error('Error identifying user with RevenueCat', { action: 'auth', userId: userData.id }, error instanceof Error ? error : new Error(String(error)));
        }
      }
    },
    [isPurchasesConfigured, posthog],
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);

        // Ensure device is registered (auto-creates anonymous user if needed)
        await ensureRegistered();

        const token = await getSessionToken();
        if (token) {
          const { user: userData, isLinked: linked } = await getCurrentUser();

          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            setIsLinked(linked);
            await setUserId(userData.id);
            await identifyUser(userData);
          } else {
            setIsAuthenticated(true);
            setIsLinked(false);
          }
        } else {
          setIsAuthenticated(false);
          setIsLinked(false);
        }
      } catch (error) {
        logger.error('Error checking auth', { action: 'auth' }, error instanceof Error ? error : new Error(String(error)));
        // Even on error, if we have a token we're "authenticated" (device auth)
        const token = await getSessionToken();
        setIsAuthenticated(!!token);
        setIsLinked(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const intervalId = setInterval(checkAuth, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [isPurchasesConfigured, identifyUser]);

  const handlePostSignIn = async (sessionToken: string) => {
    await setSessionToken(sessionToken);
    setIsAuthenticated(true);

    const { user: userData, isLinked: linked } = await getCurrentUser();
    if (userData) {
      setUser(userData);
      setIsLinked(linked);
      await setUserId(userData.id);
      await identifyUser(userData);
    }
  };

  const getAndClearReferralCode = async (): Promise<string | null> => {
    try {
      const code = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
      if (code) {
        await AsyncStorage.removeItem(REFERRAL_CODE_KEY);
      }
      return code;
    } catch {
      return null;
    }
  };

  const signIn = async () => {
    try {
      const deviceId = await getDeviceId();
      const referralCode = await getAndClearReferralCode();
      const { sessionToken } = await signInApi(deviceId, referralCode);
      await handlePostSignIn(sessionToken);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        logger.info('User cancelled sign-in', { action: 'auth', provider: 'google' });
      } else {
        logger.error('Sign-in error', { action: 'auth', provider: 'google' }, error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  };

  const signInWithFacebookMethod = async () => {
    try {
      const result = await LoginManager.logInWithPermissions([
        'public_profile',
        'email',
      ]);

      if (result.isCancelled) {
        logger.info('User cancelled Facebook sign-in', { action: 'auth', provider: 'facebook' });
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('No Facebook access token received');
      }

      const deviceId = await getDeviceId();
      const referralCode = await getAndClearReferralCode();
      const { sessionToken } = await signInWithFacebook(
        data.accessToken,
        deviceId,
        referralCode,
      );
      await handlePostSignIn(sessionToken);
    } catch (error) {
      logger.error('Facebook sign-in error', { action: 'auth', provider: 'facebook' }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const signInWithAppleMethod = async () => {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user,
      );

      if (credentialState === appleAuth.State.AUTHORIZED) {
        const deviceId = await getDeviceId();
        const referralCode = await getAndClearReferralCode();
        const { sessionToken } = await signInWithApple(
          appleAuthRequestResponse.identityToken || '',
          appleAuthRequestResponse.authorizationCode || '',
          deviceId,
          referralCode,
        );
        await handlePostSignIn(sessionToken);
      }
    } catch (error) {
      logger.error('Apple sign-in error', { action: 'auth', provider: 'apple' }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const sendMagicLinkMethod = async (email: string) => {
    try {
      await sendMagicLink(email);
    } catch (error) {
      logger.error('Magic link error', { action: 'auth', provider: 'magic-link' }, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // 1. Unregister push token before we lose the current auth context
      try {
        await unregisterPushToken();
      } catch (error) {
        logger.error('Error unregistering push token during sign-out', { action: 'auth' }, error instanceof Error ? error : new Error(String(error)));
      }

      // 2. Sign out from OAuth providers (local state only)
      try { await GoogleSignin.signOut(); } catch { /* ignore */ }
      try { LoginManager.logOut(); } catch { /* ignore */ }

      // 3. Call server to detach device and create new anonymous user
      const deviceId = await getDeviceId();
      const { token: newToken, userId: newUserId } = await mobileLogout(deviceId);

      // 4. Reset analytics/monitoring
      try { posthog.reset(); } catch { /* ignore */ }
      try { Sentry.setUser(null); } catch { /* ignore */ }
      if (isPurchasesConfigured) {
        try { await Purchases.logOut(); } catch { /* ignore */ }
      }

      // 5. Store the new anonymous token + userId (replace, not clear)
      await setSessionToken(newToken);
      await setUserId(newUserId);

      // 6. Reset the registration promise cache
      resetRegistrationState();

      // 7. Clear React Query cache (removes old user's tickets, vehicles, etc.)
      queryClient.clear();

      // 8. Fetch the new anonymous user data
      const { user: anonUser, isLinked: linked } = await getCurrentUser();

      // 9. Update state to reflect anonymous session
      setUser(anonUser || null);
      setIsLinked(linked);
      setIsAuthenticated(true); // Still authenticated — as anonymous device user

      // 10. Identify the new anonymous user in analytics
      if (anonUser) {
        await identifyUser(anonUser);
      }

      logger.info('Sign-out complete, switched to anonymous user', { action: 'auth', newUserId });
    } catch (error) {
      logger.error('Error during sign-out, falling back to local-only logout', { action: 'auth' }, error instanceof Error ? error : new Error(String(error)));

      // Fallback: clear local state. Next API call will trigger re-registration.
      await authLogout();
      resetRegistrationState();
      setIsLinked(false);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const getToken = async () => {
    return await getSessionToken();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLinked,
        user,
        signIn,
        signInWithFacebook: signInWithFacebookMethod,
        signInWithApple: signInWithAppleMethod,
        sendMagicLink: sendMagicLinkMethod,
        signOut,
        isLoading,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
