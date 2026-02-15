import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';
import Purchases from 'react-native-purchases';
import { usePostHog } from 'posthog-react-native';
import * as Sentry from '@sentry/react-native';
import {
  getCurrentUser,
  signIn as signInApi,
  signInWithFacebook,
  signInWithApple,
  sendMagicLink,
  ensureRegistered,
} from '@/api';
import {
  getDeviceId,
  getSessionToken,
  setSessionToken,
  setUserId,
  logout as authLogout,
} from '@/lib/auth';
import { usePurchases } from './purchases';

type User = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  subscription?: { type: string; source: string } | null;
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
            subscription_type: userData.subscription?.type,
            subscription_source: userData.subscription?.source,
            is_anonymous: !userData.email,
          });
          console.log('[Auth] User identified with PostHog:', userData.id);
        } catch (error) {
          console.error('[Auth] Error identifying user with PostHog:', error);
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
          Sentry.setTag('subscription_type', userData.subscription?.type || 'free');
          Sentry.setTag('subscription_source', userData.subscription?.source || 'none');
          Sentry.setTag('is_anonymous', (!userData.email).toString());
          console.log('[Auth] User identified with Sentry:', userData.id);
        } catch (error) {
          console.error('[Auth] Error identifying user with Sentry:', error);
        }
      }

      // RevenueCat
      if (userData.id && isPurchasesConfigured) {
        try {
          await Purchases.logIn(userData.id);
          console.log('[Auth] User identified with RevenueCat:', userData.id);
        } catch (error) {
          console.error('[Auth] Error identifying user with RevenueCat:', error);
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
        console.error('Error checking auth', error);
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

  const signIn = async () => {
    try {
      const deviceId = await getDeviceId();
      const { sessionToken } = await signInApi(deviceId);
      await handlePostSignIn(sessionToken);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        console.info('User cancelled sign-in');
      } else {
        console.error('Sign-in error', error);
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
        console.info('User cancelled Facebook sign-in');
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('No Facebook access token received');
      }

      const deviceId = await getDeviceId();
      const { sessionToken } = await signInWithFacebook(
        data.accessToken,
        deviceId,
      );
      await handlePostSignIn(sessionToken);
    } catch (error) {
      console.error('Facebook sign-in error', error);
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
        const { sessionToken } = await signInWithApple(
          appleAuthRequestResponse.identityToken || '',
          appleAuthRequestResponse.authorizationCode || '',
          deviceId,
        );
        await handlePostSignIn(sessionToken);
      }
    } catch (error) {
      console.error('Apple sign-in error', error);
      throw error;
    }
  };

  const sendMagicLinkMethod = async (email: string) => {
    try {
      await sendMagicLink(email);
    } catch (error) {
      console.error('Magic link error', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      await LoginManager.logOut();

      try {
        posthog.reset();
      } catch (error) {
        console.error('[Auth] Error resetting PostHog:', error);
      }

      try {
        Sentry.setUser(null);
      } catch (error) {
        console.error('[Auth] Error clearing Sentry user:', error);
      }

      if (isPurchasesConfigured) {
        try {
          await Purchases.logOut();
        } catch (error) {
          console.error('[Auth] Error logging out from RevenueCat:', error);
        }
      }

      await authLogout();
      setIsLinked(false);
      setUser(null);
      // Don't set isAuthenticated to false — device will re-register on next API call
      // This triggers a re-check which will create a new anonymous user
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out: ', error);
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
