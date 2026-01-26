import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

const VerifyRequestPage = () => (
  <div className="min-h-screen bg-light flex items-center justify-center px-4">
    <div className="max-w-md w-full">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <Image
            src="/logos/ptp.svg"
            alt="Parking Ticket Pal"
            width={48}
            height={48}
            className="mx-auto"
          />
        </div>

        {/* Email Icon */}
        <div className="mb-6">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
            <FontAwesomeIcon
              icon={faEnvelope}
              size="2x"
              className="text-teal"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-dark mb-3">Check your email</h1>

        {/* Description */}
        <p className="text-gray mb-2">
          A sign in link has been sent to your email address.
        </p>
        <p className="text-gray mb-8">
          Click the link in your email to sign in to your Parking Ticket Pal
          account.
        </p>

        {/* Security Notice */}
        <div className="bg-light rounded-xl p-4 mb-8">
          <p className="text-sm text-gray">
            The link will expire in{' '}
            <span className="font-semibold text-dark">15 minutes</span> for
            security.
          </p>
        </div>

        {/* Back to Sign In */}
        <Link href="/signin">
          <Button variant="outline" className="w-full h-12 bg-transparent">
            Back to Sign In
          </Button>
        </Link>

        {/* Help Text */}
        <p className="text-xs text-gray mt-6">
          Didn&apos;t receive the email? Check your spam folder or{' '}
          <Link
            href="/signin"
            className="text-teal underline hover:no-underline"
          >
            request a new link
          </Link>
        </p>
      </div>
    </div>
  </div>
);

export default VerifyRequestPage;
