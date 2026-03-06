import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support - Parking Ticket Pal',
  description:
    'Get help with Parking Ticket Pal. Contact our support team for assistance with your parking tickets, appeals, or account.',
};

const SupportPage = () => (
  <div className="mx-auto max-w-4xl px-4 py-12">
    <h1 className="mb-8 text-4xl font-bold">Support</h1>
    <p className="mb-8 text-lg text-gray">
      Need help? We&apos;re here for you. Reach out and we&apos;ll get back to
      you as soon as we can.
    </p>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold">Contact Us</h2>
      <p className="mb-4">
        Email us at{' '}
        <a
          href="mailto:support@parkingticketpal.com"
          className="text-teal underline hover:text-teal-dark"
        >
          support@parkingticketpal.com
        </a>
      </p>
      <p className="text-gray">
        We aim to respond to all enquiries within 24 hours.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-semibold">Common Questions</h2>
      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-lg font-medium">
            How do I challenge a parking ticket?
          </h3>
          <p className="text-gray">
            Once you&apos;ve added a ticket to your account, go to the ticket
            detail page and select &ldquo;Challenge&rdquo;. We&apos;ll guide you
            through the process and generate an appeal letter tailored to your
            situation.
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-lg font-medium">
            How do I use the Chrome extension?
          </h3>
          <p className="text-gray">
            Install the extension from the Chrome Web Store, sign in with your
            Parking Ticket Pal account, then visit your council&apos;s parking
            evidence portal. The extension will detect the page and let you
            import ticket details with one click.
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-lg font-medium">
            How do I delete my account?
          </h3>
          <p className="text-gray">
            Email{' '}
            <a
              href="mailto:support@parkingticketpal.com"
              className="text-teal underline hover:text-teal-dark"
            >
              support@parkingticketpal.com
            </a>{' '}
            and we&apos;ll process your request within 48 hours.
          </p>
        </div>
      </div>
    </section>
  </div>
);

export default SupportPage;
