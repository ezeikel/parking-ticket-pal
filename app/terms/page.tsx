import type { Metadata } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Terms of Service - Parking Ticket Pal',
  description:
    'Terms of Service for Parking Ticket Pal - Learn about our terms, conditions, and subscription plans.',
};

const TermsOfService = () => (
  <PageWrap className="max-w-4xl mx-auto py-12 px-4">
    <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
    <p className="text-gray-600 mb-8">
      Last updated: {new Date().toLocaleDateString()}
    </p>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
      <p className="mb-4">
        By accessing or using Parking Ticket Pal, operated by Chewy Bytes
        Limited (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), you
        agree to be bound by these Terms of Service and all applicable laws and
        regulations. If you do not agree with any of these terms, you are
        prohibited from using or accessing this site.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">2. Company Information</h2>
      <p className="mb-4">
        Chewy Bytes Limited is a company registered in the United Kingdom.
      </p>
      <p className="mb-4">
        Registered Address:
        <br />
        71-75 Shelton Street
        <br />
        London
        <br />
        WC2H 9JQ
        <br />
        United Kingdom
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">3. Subscription Plans</h2>
      <p className="mb-4">We offer the following subscription plans:</p>

      <h3 className="text-xl font-medium mb-2">3.1 Basic Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £4.99/month</li>
        <li>Annual: £49.99/year (save 15%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>Track up to 2 vehicles</li>
            <li>Basic ticket management</li>
            <li>Email notifications</li>
            <li>Basic appeal assistance</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.2 Pro Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £9.99/month</li>
        <li>Annual: £99.99/year (save 15%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>All Basic Plan features</li>
            <li>Track up to 5 vehicles</li>
            <li>Advanced ticket management</li>
            <li>Priority appeal assistance</li>
            <li>Calendar integration</li>
          </ul>
        </li>
      </ul>

      <h3 className="text-xl font-medium mb-2">3.3 Business Plan</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Monthly: £19.99/month</li>
        <li>Annual: £199.99/year (save 15%)</li>
        <li>
          Features:
          <ul className="list-disc pl-6 mt-2">
            <li>All Pro Plan features</li>
            <li>Track unlimited vehicles</li>
            <li>Team management</li>
            <li>Advanced reporting</li>
            <li>Priority support</li>
          </ul>
        </li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">4. Payment Terms</h2>
      <p className="mb-4">
        All payments are processed securely through Stripe. By subscribing to
        any of our plans, you agree to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Pay the subscription fee in advance for the billing period</li>
        <li>Provide accurate and complete billing information</li>
        <li>
          Authorize us to charge your payment method for the subscription fee
        </li>
        <li>Understand that subscription fees are non-refundable</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">5. User Content</h2>
      <p className="mb-4">
        By using our service, you retain all rights to your content. However,
        you grant us a license to:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Store and process your content to provide the service</li>
        <li>Use your content for service improvement and development</li>
        <li>Display your content as part of the service</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">6. Prohibited Uses</h2>
      <p className="mb-4">You agree not to:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Use the service for any illegal purpose</li>
        <li>Violate any laws in your jurisdiction</li>
        <li>Infringe upon the rights of others</li>
        <li>
          Attempt to gain unauthorized access to any portion of the service
        </li>
        <li>Interfere with or disrupt the service or servers</li>
        <li>Submit false or misleading information about parking tickets</li>
        <li>Use the service to harass or intimidate others</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
      <p className="mb-4">
        We may terminate or suspend your access to the service immediately,
        without prior notice or liability, for any reason whatsoever, including
        without limitation if you breach the Terms.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        8. Limitation of Liability
      </h2>
      <p className="mb-4">
        In no event shall Chewy Bytes Limited, nor its directors, employees,
        partners, agents, suppliers, or affiliates, be liable for any indirect,
        incidental, special, consequential or punitive damages, including
        without limitation, loss of profits, data, use, goodwill, or other
        intangible losses. We do not guarantee the success of any parking ticket
        appeals or the accuracy of legal advice provided through the service.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">9. Changes to Terms</h2>
      <p className="mb-4">
        We reserve the right to modify or replace these Terms at any time. If a
        revision is material, we will provide at least 30 days notice prior to
        any new terms taking effect.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
      <p className="mb-4">
        If you have any questions about these Terms, please contact us at:
      </p>
      <p className="mb-4">
        Email:{' '}
        <a
          href="mailto:support@parkingticketpal.com"
          className="text-blue-600 underline"
        >
          support@parkingticketpal.com
        </a>
        <br />
        Website:{' '}
        <a
          href="https://www.parkingticketpal.com?utm_source=terms-of-service&utm_medium=legal-pages&utm_campaign=legal"
          className="text-blue-600 underline"
        >
          https://www.parkingticketpal.com
        </a>
      </p>
    </section>
  </PageWrap>
);

export default TermsOfService;
