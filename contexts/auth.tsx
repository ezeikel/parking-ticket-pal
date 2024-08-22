import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { getCurrentUser, signIn as signInApi } from '@/api';

// define the shape of the context
type AuthContextType = {
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
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
      webClientId: '1069305445287-1m5mhd9lkm8c1trksbhlqd2cia0itjpj.apps.googleusercontent.com',
      iosClientId: '1069305445287-b0q6oltds0955okb9hg2b3pqvm735di4.apps.googleusercontent.com',
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
            router.replace('/');
          } else {
            setIsAuthenticated(false);
            router.replace('/sign-in');
          }
        } else {
          setIsAuthenticated(false);
          router.replace('/sign-in');
        }
      } catch (error) {
        console.error('Error checking token validity', error);
        setIsAuthenticated(false);
        router.replace('/sign-in');
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
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.info('User cancelled sign-in');
      } else {
        console.error('Sign-in error', error);
      }
      setIsAuthenticated(false);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
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
