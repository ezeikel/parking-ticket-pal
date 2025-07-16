'use client';

// import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faEnvelope, faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import {
  faGoogle,
  // faApple
} from '@fortawesome/free-brands-svg-icons';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// eslint-disable-next-line arrow-body-style
const SignInOptions = () => {
  // const [email, setEmail] = useState('');
  // const [isLoading, setIsLoading] = useState(false);

  // const handleMagicLinkSignIn = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   try {
  //     await signIn('resend', { email, callbackUrl: '/' });
  //   } catch (error) {
  //     console.error('Error signing in with magic link:', error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Choose your preferred sign in method</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          variant="outline"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full"
        >
          <FontAwesomeIcon icon={faGoogle} size="lg" className="mr-2" />
          Continue with Google
        </Button>
        {/* <Button
          variant="outline"
          onClick={() => signIn('apple', { callbackUrl: '/' })}
          className="w-full"
        >
          <FontAwesomeIcon icon={faApple} size="lg" className="mr-2" />
          Continue with Apple
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <form onSubmit={handleMagicLinkSignIn} className="grid gap-2">
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="mr-2 h-4 w-4 animate-spin"
                />
                Sending link...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faEnvelope} size="lg" className="mr-2" />
                Sign in with Email
              </>
            )}
          </Button>
        </form> */}
      </CardContent>
      <CardFooter className="flex flex-col items-center text-sm text-muted-foreground">
        <p>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardFooter>
    </Card>
  );
};

export default SignInOptions;
