import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';
import Purchases from 'react-native-purchases';
import { useRouter } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import * as Sentry from '@sentry/react-native';
import { getCurrentUser, signIn as signInApi, signInWithFacebook, signInWithApple, sendMagicLink } from '@/api';
import { usePurchases } from './purchases';

// define the shape of the context
type AuthContextType = {
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  getToken: () => Promise<string | null>;
}

type AuthContextProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  signIn: async () => { },
  signInWithFacebook: async () => { },
  signInWithApple: async () => { },
  sendMagicLink: async () => { },
  signOut: async () => { },
  isLoading: false,
  getToken: async () => null
});

export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const posthog = usePostHog();
  const { isConfigured: isPurchasesConfigured } = usePurchases();

  const conifgureGoogleSignIn = () => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }

  useEffect(() => {
    conifgureGoogleSignIn();
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const token = await SecureStore.getItemAsync('sessionToken');

        if (token) {
          const { user } = await getCurrentUser();

          if (user) {
            setIsAuthenticated(true);

            // Identify user with PostHog
            if (user.id) {
              try {
                posthog.identify(user.id, {
                  email: user.email,
                  name: user.name,
                  created_at: user.createdAt,
                  subscription_type: user.subscription?.type,
                  subscription_source: user.subscription?.source,
                });
                console.log('[Auth] User identified with PostHog:', user.id);
              } catch (error) {
                console.error('[Auth] Error identifying user with PostHog:', error);
              }
            }

            // Identify user with Sentry
            if (user.id) {
              try {
                Sentry.setUser({
                  id: user.id,
                  email: user.email,
                  username: user.name,
                });
                console.log('[Auth] User identified with Sentry:', user.id);
              } catch (error) {
                console.error('[Auth] Error identifying user with Sentry:', error);
              }
            }

            // Identify user with RevenueCat only if SDK is configured
            if (user.id && isPurchasesConfigured) {
              try {
                await Purchases.logIn(user.id);
                console.log('[Auth] User identified with RevenueCat:', user.id);
              } catch (error) {
                console.error('[Auth] Error identifying user with RevenueCat:', error);
              }
            }
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking token validity', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up periodic checks every 10 minutes
    const intervalId = setInterval(checkAuth, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [isPurchasesConfigured]);

  const signIn = async () => {
    try {
      const { sessionToken } = await signInApi();
      await SecureStore.setItemAsync('sessionToken', sessionToken);
      setIsAuthenticated(true);

      // Get user info to identify with PostHog and RevenueCat
      const { user } = await getCurrentUser();

      // Identify user with PostHog
      if (user?.id) {
        try {
          posthog.identify(user.id, {
            email: user.email,
            name: user.name,
          });
          console.log('[Auth] User identified with PostHog:', user.id);
        } catch (error) {
          console.error('[Auth] Error identifying user with PostHog:', error);
        }
      }

      // Identify user with Sentry
      if (user?.id) {
        try {
          Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.name,
          });
          console.log('[Auth] User identified with Sentry:', user.id);
        } catch (error) {
          console.error('[Auth] Error identifying user with Sentry:', error);
        }
      }

      // Identify user with RevenueCat only if SDK is configured
      if (user?.id && isPurchasesConfigured) {
        try {
          await Purchases.logIn(user.id);
          console.log('[Auth] User logged in to RevenueCat:', user.id);
        } catch (error) {
          console.error('[Auth] Error logging in to RevenueCat:', error);
        }
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.info('User cancelled sign-in');
      } else {
        console.error('Sign-in error', error);
      }
      setIsAuthenticated(false);
    }
  };

  const signInWithFacebookMethod = async () => {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

      if (result.isCancelled) {
        console.info('User cancelled Facebook sign-in');
        return;
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('No Facebook access token received');
      }

      const { sessionToken } = await signInWithFacebook(data.accessToken);
      await SecureStore.setItemAsync('sessionToken', sessionToken);
      setIsAuthenticated(true);

      // Get user info to identify with PostHog and RevenueCat
      const { user } = await getCurrentUser();

      // Identify user with PostHog
      if (user?.id) {
        try {
          posthog.identify(user.id, {
            email: user.email,
            name: user.name,
            created_at: user.createdAt,
            subscription_type: user.subscription?.type,
            subscription_source: user.subscription?.source,
          });
          console.log('[Auth] User identified with PostHog:', user.id);
        } catch (error) {
          console.error('[Auth] Error identifying user with PostHog:', error);
        }
      }

      // Identify user with Sentry
      if (user?.id) {
        try {
          Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.name,
          });
          console.log('[Auth] User identified with Sentry:', user.id);
        } catch (error) {
          console.error('[Auth] Error identifying user with Sentry:', error);
        }
      }

      // Identify user with RevenueCat only if SDK is configured
      if (user?.id && isPurchasesConfigured) {
        try {
          await Purchases.logIn(user.id);
          console.log('[Auth] User logged in to RevenueCat:', user.id);
        } catch (error) {
          console.error('[Auth] Error logging in to RevenueCat:', error);
        }
      }
    } catch (error) {
      console.error('Facebook sign-in error', error);
      setIsAuthenticated(false);
    }
  };

  const signInWithAppleMethod = async () => {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);

      if (credentialState === appleAuth.State.AUTHORIZED) {
        const { sessionToken } = await signInWithApple(
          appleAuthRequestResponse.identityToken || '',
          appleAuthRequestResponse.authorizationCode || ''
        );
        await SecureStore.setItemAsync('sessionToken', sessionToken);
        setIsAuthenticated(true);

        // Get user info to identify with RevenueCat only if SDK is configured
        const { user } = await getCurrentUser();
        if (user?.id && isPurchasesConfigured) {
          try {
            await Purchases.logIn(user.id);
            console.log('[Auth] User logged in to RevenueCat:', user.id);
          } catch (error) {
            console.error('[Auth] Error logging in to RevenueCat:', error);
          }
        }
      }
    } catch (error) {
      console.error('Apple sign-in error', error);
      setIsAuthenticated(false);
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

      // Reset PostHog user identity
      try {
        posthog.reset();
        console.log('[Auth] User identity reset in PostHog');
      } catch (error) {
        console.error('[Auth] Error resetting PostHog:', error);
      }

      // Clear Sentry user identity
      try {
        Sentry.setUser(null);
        console.log('[Auth] User identity cleared in Sentry');
      } catch (error) {
        console.error('[Auth] Error clearing Sentry user:', error);
      }

      // Only log out from RevenueCat if it's configured
      if (isPurchasesConfigured) {
        try {
          await Purchases.logOut();
          console.log('[Auth] User logged out from RevenueCat');
        } catch (error) {
          console.error('[Auth] Error logging out from RevenueCat:', error);
        }
      }

      await SecureStore.deleteItemAsync('sessionToken');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const getToken = async () => {
    return await SecureStore.getItemAsync('sessionToken');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        signIn,
        signInWithFacebook: signInWithFacebookMethod,
        signInWithApple: signInWithAppleMethod,
        sendMagicLink: sendMagicLinkMethod,
        signOut,
        isLoading,
        getToken
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
