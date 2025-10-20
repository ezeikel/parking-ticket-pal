import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/pro-regular-svg-icons';
import Image from 'next/image';

const VerifyRequestPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <Card className="w-[500px]">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/logos/ptp.svg"
            alt="Parking Ticket Pal"
            width={64}
            height={64}
          />
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription className="text-base">
          A sign in link has been sent to your email address
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-parking-teal/10">
          <FontAwesomeIcon
            icon={faEnvelope}
            className="h-10 w-10 text-parking-teal"
          />
        </div>

        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Click the link in your email to sign in to your Parking Ticket Pal account.
          </p>
          <p className="text-sm text-muted-foreground">
            The link will expire in <strong>15 minutes</strong> for security.
          </p>
        </div>

        <div className="w-full pt-4 border-t">
          <p className="text-xs text-center text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <a href="/auth/signin" className="text-parking-teal underline hover:no-underline">
              request a new link
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default VerifyRequestPage;
