import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faArrowRight } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { PurchaseTracker } from '@/components/analytics/PurchaseTracker';

const PaymentSuccessPage = () => (
  <>
    {/* Track Facebook Pixel Purchase event */}
    <PurchaseTracker value={14.99} contentName="premium_ticket" />
    <div className="min-h-screen bg-light flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-teal/10">
              <FontAwesomeIcon
                icon={faCircleCheck}
                size="2x"
                className="text-teal"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-dark mb-3">
            Payment Successful!
          </h1>

          {/* Description */}
          <p className="text-gray mb-8">
            Your ticket has been upgraded to Premium. You now have access to all
            premium features for this ticket.
          </p>

          {/* What's Next Section */}
          <div className="bg-light rounded-xl p-4 mb-8 text-left">
            <h3 className="font-semibold text-dark mb-3">What&apos;s next?</h3>
            <ul className="space-y-2 text-sm text-gray">
              <li className="flex items-start gap-2">
                <span className="text-teal mt-0.5">•</span>
                <span>
                  Generate an AI-powered challenge letter for your ticket
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal mt-0.5">•</span>
                <span>View your detailed success prediction score</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal mt-0.5">•</span>
                <span>Auto-submit your challenge to supported councils</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/dashboard" className="block">
              <Button className="w-full h-12 bg-teal text-white hover:bg-teal-dark gap-2">
                Go to Dashboard
                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/new" className="block">
              <Button variant="outline" className="w-full h-12 bg-transparent">
                Upload a Ticket
              </Button>
            </Link>
          </div>

          {/* Email Notice */}
          <p className="text-xs text-gray mt-6">
            A confirmation email has been sent to your inbox with your receipt.
          </p>
        </div>
      </div>
    </div>
  </>
);

export default PaymentSuccessPage;
