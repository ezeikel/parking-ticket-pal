import { useEffect, useState } from 'react';
import type { AuthData } from '@/shared/types';
import LoginScreen from './screens/LoginScreen';
import AwaitingVerification from './screens/AwaitingVerification';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';

type Screen = 'login' | 'awaiting' | 'home' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH' }, (response) => {
      if (response?.data) {
        setAuth(response.data);
        setScreen('home');
      }
      setLoading(false);
    });
  }, []);

  // Listen for auth changes from content script relay
  useEffect(() => {
    const listener = (message: { type: string; data?: AuthData }) => {
      if (message.type === 'AUTH_STATE' && message.data) {
        setAuth(message.data);
        setScreen('home');
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleMagicLinkSent = (email: string) => {
    setPendingEmail(email);
    setScreen('awaiting');
  };

  const handleLogout = () => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      setAuth(null);
      setScreen('login');
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-teal border-t-transparent" />
      </div>
    );
  }

  switch (screen) {
    case 'login':
      return <LoginScreen onMagicLinkSent={handleMagicLinkSent} />;
    case 'awaiting':
      return (
        <AwaitingVerification
          email={pendingEmail}
          onBack={() => setScreen('login')}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          auth={auth!}
          onBack={() => setScreen('home')}
          onLogout={handleLogout}
        />
      );
    case 'home':
    default:
      return (
        <HomeScreen
          auth={auth!}
          onSettings={() => setScreen('settings')}
        />
      );
  }
}
