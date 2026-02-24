import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faMapLocationDot,
} from '@fortawesome/pro-solid-svg-icons';
import type { Metadata } from 'next';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';
import { getAllRegions, getCouncilsByRegion } from '@/data/regions';

export const metadata: Metadata = {
  title: 'UK Parking Issuers by Region | Parking Ticket Pal',
  description:
    'Browse parking ticket issuers by English region. Find councils in London, South East, North West, and all 9 regions of England to help with your parking appeal.',
  keywords: [
    'parking issuers by region',
    'UK parking councils',
    'regional parking enforcement',
    'council parking tickets',
    'parking appeal by region',
  ],
  openGraph: {
    title: 'UK Parking Issuers by Region | Parking Ticket Pal',
    description:
      'Browse parking ticket issuers by English region. Find councils in London, South East, North West, and all 9 regions of England.',
    type: 'website',
  },
};

const breadcrumbs = [
  { name: 'Home', url: 'https://parkingticketpal.co.uk' },
  { name: 'Tools', url: 'https://parkingticketpal.co.uk/tools' },
  {
    name: 'Issuer Directory',
    url: 'https://parkingticketpal.co.uk/tools/reference/issuers',
  },
  {
    name: 'By Region',
    url: 'https://parkingticketpal.co.uk/tools/reference/issuers/region',
  },
];

export default function RegionIndexPage() {
  const regions = getAllRegions();

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />

      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-6">
            <Link
              href="/tools/reference/issuers"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              All Issuers
            </Link>
          </div>

          <div className="text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-white">
              <FontAwesomeIcon
                icon={faMapLocationDot}
                className="text-2xl text-dark"
              />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              Parking Issuers by Region
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Browse UK parking ticket issuers organised by the 9 English
              regions. Find your local council and learn about parking
              enforcement in your area.
            </p>
          </div>
        </div>
      </section>

      {/* Regions Grid */}
      <section className="bg-white py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((region) => {
              const councilCount = getCouncilsByRegion(region.slug).length;

              return (
                <Link
                  key={region.slug}
                  href={`/tools/reference/issuers/region/${region.slug}`}
                  className="group rounded-xl border border-border bg-white p-6 transition-colors hover:border-dark/20"
                >
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-bold text-dark group-hover:text-teal">
                      {region.name}
                    </h2>
                    <span className="rounded-full bg-light px-2.5 py-1 text-xs font-semibold text-dark">
                      {councilCount} councils
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray line-clamp-2">
                    {region.description}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal">
                    View councils
                    <FontAwesomeIcon
                      icon={faArrowRight}
                      className="text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <h2 className="text-xl font-bold text-white md:text-2xl">
            Got a Parking Ticket?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray">
            Upload your PCN and our AI will write a personalised appeal letter
            tailored to your specific issuer and circumstances.
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
