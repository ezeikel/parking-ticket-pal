import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faTrash, faShieldAlt } from '@fortawesome/pro-regular-svg-icons';

const DeleteAccountPage = () => (
  <div className="container mx-auto max-w-4xl py-8 px-4">
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-4">User Data Deletion Instructions</h1>
      <p className="text-muted-foreground text-lg">
        If you&apos;ve logged into Parking Ticket Pal using your Facebook account and would like to delete your data, you can do so at any time.
      </p>
    </div>

    <div className="grid gap-6">
      {/* Method 1: In-App Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTrash} className="text-red-500" />
            Delete Account In-App
          </CardTitle>
          <CardDescription>
            If you have access to your account, you can delete it directly from within the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p>To delete your account and all associated data:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Sign in to your Parking Ticket Pal account</li>
              <li>Navigate to <strong>Settings → Account</strong></li>
              <li>Click <strong>Delete Account</strong></li>
              <li>Confirm the deletion</li>
            </ol>
            <Alert>
              <FontAwesomeIcon icon={faShieldAlt} className="h-4 w-4" />
              <AlertDescription>
                Your data will be permanently deleted from our systems immediately upon confirmation.
              </AlertDescription>
            </Alert>
            <Link href="/account">
              <Button variant="destructive" className="mt-4">
                Go to Account Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Method 2: Email Request */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faEnvelope} className="text-blue-500" />
            Email Deletion Request
          </CardTitle>
          <CardDescription>
            If you cannot access your account, email us to request deletion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p>To request deletion of your account and all associated data:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>
                Email us at{' '}
                <a
                  href="mailto:support@parkingticketpal.com?subject=Delete My Account"
                  className="text-blue-600 hover:underline font-medium"
                >
                  support@parkingticketpal.com
                </a>{' '}
                with the subject line &quot;Delete My Account&quot;
              </li>
              <li>Include the email address or Facebook ID associated with your account</li>
              <li>We will confirm the deletion request via email</li>
            </ol>
            <Alert>
              <AlertDescription>
                Your data will be permanently deleted from our systems within 7 business days of receiving your request.
              </AlertDescription>
            </Alert>
            <a href="mailto:support@parkingticketpal.com?subject=Delete My Account">
              <Button variant="outline" className="mt-4">
                <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                Send Deletion Request
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* What Gets Deleted */}
      <Card>
        <CardHeader>
          <CardTitle>What Data Gets Deleted</CardTitle>
          <CardDescription>
            When you delete your account, the following data is permanently removed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1">
            <li>Your user profile and account information</li>
            <li>All parking tickets and associated documents</li>
            <li>Vehicle information and registration details</li>
            <li>Payment and subscription history</li>
            <li>All uploaded photos and documents</li>
            <li>Account preferences and settings</li>
            <li>Authentication tokens and session data</li>
          </ul>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Data Protection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p>
              We take your privacy seriously. Account deletion is irreversible and complies with:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>General Data Protection Regulation (GDPR)</li>
              <li>Facebook Platform Terms of Service</li>
              <li>UK Data Protection Act 2018</li>
            </ul>
            <div className="mt-4 space-x-4">
              <Link href="/privacy">
                <Button variant="outline">View Privacy Policy</Button>
              </Link>
              <Link href="/terms">
                <Button variant="outline">View Terms of Service</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            For any questions about data deletion or our privacy practices, contact us:
          </p>
          <div className="space-y-2">
            <p>
              <strong>Email:</strong>{' '}
              <a
                href="mailto:support@parkingticketpal.com"
                className="text-blue-600 hover:underline"
              >
                support@parkingticketpal.com
              </a>
            </p>
            <p>
              <strong>Response Time:</strong> Within 24 hours
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default DeleteAccountPage;