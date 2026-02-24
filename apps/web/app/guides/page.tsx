import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faBookOpen,
  faClock,
} from '@fortawesome/pro-solid-svg-icons';
import type { Metadata } from 'next';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';
import { getAllGuides } from '@/data/guides';

export const metadata: Metadata = {
  title: 'Parking Ticket Appeal Guides | How to Appeal | Parking Ticket Pal',
  description:
    'Free guides on how to appeal parking tickets in the UK. Learn about council PCNs, private parking fines, bus lane penalties, tribunal hearings, and appeal deadlines.',
  keywords: [
    'how to appeal parking ticket',
    'parking ticket appeal guide',
    'parking fine appeal',
    'PCN appeal guide',
    'parking tribunal guide',
    'private parking fine appeal',
    'bus lane pcn appeal',
  ],
  openGraph: {
    title: 'Parking Ticket Appeal Guides | Parking Ticket Pal',
    description:
      'Free guides on how to appeal parking tickets in the UK. Council PCNs, private fines, bus lane penalties, and more.',
    type: 'website',
  },
};

const breadcrumbs = [
  { name: 'Home', url: 'https://parkingticketpal.co.uk' },
  { name: 'Guides', url: 'https://parkingticketpal.co.uk/guides' },
];

export default function GuidesIndexPage() {
  const guides = getAllGuides();

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />

      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white">
              <FontAwesomeIcon
                icon={faBookOpen}
                className="text-2xl text-dark"
              />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              Parking Ticket Appeal Guides
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Free, comprehensive guides to help you understand your rights and
              appeal parking tickets in the UK. Written by experts, backed by
              legislation.
            </p>
          </div>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="bg-white py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex flex-col rounded-xl border border-border bg-white p-6 transition-colors hover:border-dark/20"
              >
                <h2 className="text-lg font-bold text-dark group-hover:text-teal">
                  {guide.title}
                </h2>
                <p className="mt-2 flex-1 text-sm text-gray line-clamp-3">
                  {guide.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-gray">
                    <FontAwesomeIcon icon={faClock} className="text-xs" />
                    {guide.readingTime} min read
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-teal">
                    Read guide
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <h2 className="text-xl font-bold text-white md:text-2xl">
            Need Help With Your Appeal?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray">
            Our AI analyses real tribunal cases to write personalised appeal
            letters. Upload your ticket and get started in minutes.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Upload Your Ticket
          </Link>
        </div>
      </section>
    </div>
  );
}
