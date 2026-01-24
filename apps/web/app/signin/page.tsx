import Image from 'next/image';
import Link from 'next/link';
import SignInOptions from '@/components/buttons/SignInOptions/SignInOptions';

const SignInPage = () => (
  <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-light px-4 py-12">
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image
            src="/logos/ptp.svg"
            alt="Parking Ticket Pal"
            width={40}
            height={40}
          />
          <span className="font-display text-2xl font-bold text-dark">
            Parking Ticket Pal
          </span>
        </Link>
      </div>

      <SignInOptions />

      {/* Back to home link */}
      <p className="mt-8 text-center text-sm text-gray">
        <Link href="/" className="font-medium text-teal hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  </div>
);

export default SignInPage;
