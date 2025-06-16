import type { Metadata } from 'next';
import PageWrap from '@/components/PageWrap/PageWrap';

export const metadata: Metadata = {
  title: 'Privacy Policy - Parking Ticket Pal',
  description:
    'Privacy Policy for Parking Ticket Pal - Learn how we collect, use, and protect your data.',
};

const PrivacyPolicy = () => (
  <PageWrap className="max-w-4xl mx-auto py-12 px-4">
    <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
    <p className="text-gray-600 mb-8">
      Last updated: {new Date().toLocaleDateString()}
    </p>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
      <p className="mb-4">
        Welcome to Parking Ticket Pal, operated by Chewy Bytes Limited
        (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We respect
        your privacy and are committed to protecting your personal data. This
        privacy policy will inform you about how we look after your personal
        data when you visit our website and tell you about your privacy rights
        and how the law protects you.
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
      <h2 className="text-2xl font-semibold mb-4">3. Data We Collect</h2>
      <h3 className="text-xl font-medium mb-2">3.1 Personal Data</h3>
      <p className="mb-4">
        We may collect, use, store and transfer different kinds of personal data
        about you:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Identity Data: includes name, username</li>
        <li>Contact Data: includes email address</li>
        <li>Vehicle Data: includes vehicle registration numbers and details</li>
        <li>Ticket Data: includes parking ticket information and history</li>
        <li>
          Technical Data: includes internet protocol (IP) address, browser type
          and version, time zone setting and location, browser plug-in types and
          versions, operating system and platform
        </li>
        <li>
          Usage Data: includes information about how you use our website and
          services
        </li>
        <li>
          Marketing and Communications Data: includes your preferences in
          receiving marketing from us
        </li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Data</h2>
      <p className="mb-4">
        We use your personal data for the following purposes:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>To provide and maintain our service</li>
        <li>To notify you about changes to our service</li>
        <li>To provide customer support</li>
        <li>To manage your parking tickets and appeals</li>
        <li>To send you reminders about upcoming deadlines</li>
        <li>
          To gather analysis or valuable information so that we can improve our
          service
        </li>
        <li>To monitor the usage of our service</li>
        <li>To detect, prevent and address technical issues</li>
        <li>
          To provide you with news, special offers and general information about
          other goods, services and events
        </li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
      <h3 className="text-xl font-medium mb-2">5.1 Analytics and Tracking</h3>
      <p className="mb-4">
        We use the following services to analyze and improve our website:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Vercel Analytics</li>
        <li>Plausible Analytics</li>
        <li>Sentry for error tracking</li>
      </ul>

      <h3 className="text-xl font-medium mb-2">5.2 Email Services</h3>
      <p className="mb-4">
        We use the following services for email communications:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Resend for transactional emails</li>
        <li>Mailchimp for marketing communications</li>
      </ul>

      <h3 className="text-xl font-medium mb-2">5.3 Payment Processing</h3>
      <p className="mb-4">
        We use Stripe for processing payments and managing subscriptions.
      </p>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">6. Data Storage</h2>
      <p className="mb-4">Your data is stored using the following services:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Neon Database (PostgreSQL) for user data and application data</li>
        <li>Cloudflare R2 for file storage</li>
        <li>Vercel Blob Storage for temporary file storage</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
      <p className="mb-4">
        Under data protection laws, you have rights including:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Your right of access</li>
        <li>Your right to rectification</li>
        <li>Your right to erasure</li>
        <li>Your right to restrict processing</li>
        <li>Your right to data portability</li>
        <li>Your right to object</li>
      </ul>
    </section>

    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
      <p className="mb-4">
        If you have any questions about this privacy policy or our privacy
        practices, please contact us at:
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
          href="https://www.parkingticketpal.com?utm_source=privacy-policy&utm_medium=legal-pages&utm_campaign=legal"
          className="text-blue-600 underline"
        >
          https://www.parkingticketpal.com
        </a>
      </p>
    </section>
  </PageWrap>
);

export default PrivacyPolicy;
