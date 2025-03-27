import PageWrap from '@/components/PageWrap/PageWrap';
import { faCheckCircle } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';

const SubscriptionSuccessPage = () => (
  <PageWrap className="items-center">
    <div className="h-full flex-1 flex flex-col items-center max-w-md w-full space-y-8">
      <div className="text-center">
        <FontAwesomeIcon
          icon={faCheckCircle}
          className="text-green-500 mb-6"
          size="4x"
        />
        <h2 className="font-sans mb-4 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Subscription setup complete
        </h2>
        <p className="mt-2 text-center text-lg text-gray-600 dark:text-gray-400">
          Thanks for believing in Parking Ticket Pal and starting your
          subscription. This means a lot to the team. You will receive an email
          receipt for this.
        </p>
      </div>
      <div className="mt-5 flex justify-center">
        <Link href="/" className="w-full hover:underline">
          Back home
        </Link>
      </div>
    </div>
  </PageWrap>
);

export default SubscriptionSuccessPage;
