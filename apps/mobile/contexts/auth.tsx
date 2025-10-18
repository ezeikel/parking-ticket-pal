import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';
import { useRouter } from 'expo-router';
import { getCurrentUser, signIn as signInApi, signInWithFacebook, signInWithApple, sendMagicLink } from '@/api';

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
  }, []);

  const signIn = async () => {
    try {
      const { sessionToken } = await signInApi();
      await SecureStore.setItemAsync('sessionToken', sessionToken);
      setIsAuthenticated(true);
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
