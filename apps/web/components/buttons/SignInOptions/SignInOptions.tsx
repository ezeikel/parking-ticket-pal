'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import { faEnvelope } from '@fortawesome/pro-solid-svg-icons';
import {
  faGoogle,
  faApple,
  faFacebook,
} from '@fortawesome/free-brands-svg-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAnalytics } from '@/utils/analytics-client';

const SignInOptions = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { track } = useAnalytics();

  const handleSignIn = (provider: 'google' | 'apple' | 'facebook') => {
    track('auth_method_selected', {
      method: provider,
      location: 'sign_in_page',
    });
    signIn(provider, { callbackUrl: '/' });
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      track('auth_method_selected', {
        method: 'magic_link',
        location: 'sign_in_page',
      });
      await signIn('resend', { email, callbackUrl: '/' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-dark">Welcome back</h1>
        <p className="mt-2 text-gray">Sign in to manage your parking tickets</p>
      </div>

      {/* Social Sign In Options */}
      <div className="space-y-3">
        <Button
          variant="outline"
          onClick={() => handleSignIn('google')}
          className="h-12 w-full rounded-xl border-border bg-white text-dark hover:bg-light"
        >
          <FontAwesomeIcon icon={faGoogle} className="mr-3 text-lg" />
          Continue with Google
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSignIn('apple')}
          className="h-12 w-full rounded-xl border-dark bg-dark text-white hover:bg-dark/90 hover:text-white"
        >
          <FontAwesomeIcon icon={faApple} className="mr-3 text-xl" />
          Continue with Apple
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSignIn('facebook')}
          className="h-12 w-full rounded-xl border-[#1877F2] bg-[#1877F2] text-white hover:bg-[#1877F2]/90 hover:text-white"
        >
          <FontAwesomeIcon icon={faFacebook} className="mr-3 text-lg" />
          Continue with Facebook
        </Button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-gray">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Magic Link Form */}
      <form onSubmit={handleMagicLinkSignIn} className="space-y-3">
        <div className="relative">
          <FontAwesomeIcon
            icon={faEnvelope}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray"
          />
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl border-border bg-light pl-11 text-dark placeholder:text-gray/60 focus:border-teal focus:ring-teal"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-xl bg-teal text-base font-semibold text-white hover:bg-teal-dark"
        >
          {isLoading ? (
            <>
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="mr-2 h-4 w-4 animate-spin"
              />
              Sending link...
            </>
          ) : (
            'Send magic link'
          )}
        </Button>
      </form>

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-gray">
        By continuing, you agree to our{' '}
        <a href="/terms" className="font-medium text-dark hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="font-medium text-dark hover:underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
};

export default SignInOptions;
