import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faBuilding,
  faFileLines,
  faMapLocationDot,
} from '@fortawesome/pro-solid-svg-icons';
import type { Metadata } from 'next';
import { LOCAL_AUTHORITIES } from '@/constants';
import JsonLd, { createBreadcrumbSchema } from '@/components/JsonLd/JsonLd';
import {
  getAllRegions,
  getAllRegionSlugs,
  getRegionBySlug,
  getCouncilsByRegion,
} from '@/data/regions';

type Props = {
  params: Promise<{ region: string }>;
};

// Helper to convert slug to display name
const slugToDisplayName = (slug: string): string => {
  const fullEntry = LOCAL_AUTHORITIES.find((la) => la.id === slug);
  if (fullEntry) return fullEntry.name;

  return slug
    .split('-')
    .map((word) => {
      if (['and', 'of', 'upon', 'in', 'the'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export async function generateStaticParams() {
  return getAllRegionSlugs().map((region) => ({ region }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { region: regionSlug } = await params;
  const region = getRegionBySlug(regionSlug);

  if (!region) {
    return { title: 'Region Not Found | Parking Ticket Pal' };
  }

  const councilCount = getCouncilsByRegion(region.slug).length;
  const title = `Parking Ticket Appeals in ${region.name} | ${councilCount} Councils | Parking Ticket Pal`;
  const description = `Find information about ${councilCount} councils that issue parking tickets in ${region.name}. Learn how to appeal parking fines from your local council.`;

  return {
    title,
    description,
    keywords: [
      `${region.name} parking ticket`,
      `${region.name} parking appeal`,
      `${region.name} councils`,
      `parking ticket ${region.name}`,
      'council parking fine',
      'how to appeal parking ticket',
    ],
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function RegionPage({ params }: Props) {
  const { region: regionSlug } = await params;
  const region = getRegionBySlug(regionSlug);

  if (!region) {
    notFound();
  }

  const councilIds = getCouncilsByRegion(region.slug);
  const councils = councilIds
    .map((id) => ({ id, name: slugToDisplayName(id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const otherRegions = getAllRegions().filter((r) => r.slug !== region.slug);

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
    {
      name: region.name,
      url: `https://parkingticketpal.co.uk/tools/reference/issuers/region/${region.slug}`,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />

      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-6">
            <Link
              href="/tools/reference/issuers/region"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              All Regions
            </Link>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-white md:h-24 md:w-24">
              <FontAwesomeIcon
                icon={faMapLocationDot}
                className="text-3xl text-teal md:text-4xl"
              />
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-dark md:text-3xl">
                Parking Tickets in {region.name}
              </h1>
              <p className="mt-3 text-gray">{region.description}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-teal/10 px-3 py-1 text-sm font-medium text-teal">
                  {councils.length} councils
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Council List */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
                  <FontAwesomeIcon icon={faBuilding} className="text-teal" />
                  Councils in {region.name}
                </h2>
                <p className="mt-2 text-sm text-gray">
                  {councils.length} local councils that issue parking tickets in
                  the {region.name} region.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {councils.map((council) => (
                    <Link
                      key={council.id}
                      href={`/tools/reference/issuers/${council.id}`}
                      className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-dark/20"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-light">
                        <FontAwesomeIcon
                          icon={faBuilding}
                          className="text-xs text-teal"
                        />
                      </div>
                      <span className="flex-1 truncate text-sm font-medium text-dark group-hover:text-teal">
                        {council.name}
                      </span>
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-xs text-gray opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Penalty Information */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="text-lg font-bold text-dark">
                  Penalty Charge Amounts
                </h2>
                <div className="mt-4 space-y-3">
                  {region.slug === 'london' ? (
                    <>
                      <div className="flex justify-between border-b border-border pb-3">
                        <span className="text-gray">Higher level PCN</span>
                        <span className="font-semibold text-dark">£130</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-3">
                        <span className="text-gray">Lower level PCN</span>
                        <span className="font-semibold text-dark">£80</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray">
                          Early payment discount
                        </span>
                        <span className="font-semibold text-teal">
                          50% if paid within 14 days
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between border-b border-border pb-3">
                        <span className="text-gray">Higher level PCN</span>
                        <span className="font-semibold text-dark">£70</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-3">
                        <span className="text-gray">Lower level PCN</span>
                        <span className="font-semibold text-dark">£50</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray">
                          Early payment discount
                        </span>
                        <span className="font-semibold text-teal">
                          50% if paid within 14 days
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <p className="mt-4 text-sm text-gray">
                  {region.slug === 'london'
                    ? 'London boroughs use the higher London penalty amounts. Appeals go to London Tribunals.'
                    : 'Councils outside London use the standard national penalty amounts. Appeals go to the Traffic Penalty Tribunal.'}
                </p>
              </div>

              {/* Appeal Process Overview */}
              <div className="rounded-xl border border-border bg-light/50 p-6">
                <h2 className="text-lg font-bold text-dark">
                  How to Appeal a Parking Ticket in {region.name}
                </h2>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-bold text-teal">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-dark">
                        Informal Challenge
                      </p>
                      <p className="text-sm text-gray">
                        Write to the council within 14 days to keep your 50%
                        discount. Include evidence and reasons for challenging.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-bold text-teal">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-dark">
                        Formal Representation
                      </p>
                      <p className="text-sm text-gray">
                        If rejected (or after receiving a Notice to Owner),
                        submit a formal representation within 28 days.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-bold text-teal">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-dark">Tribunal Appeal</p>
                      <p className="text-sm text-gray">
                        If the formal representation is rejected, appeal to the{' '}
                        {region.slug === 'london'
                          ? 'London Tribunals'
                          : 'Traffic Penalty Tribunal'}{' '}
                        within 28 days. This is free and independent.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="rounded-xl bg-dark p-6 text-white">
                <h3 className="text-lg font-bold">
                  Got a ticket in {region.name}?
                </h3>
                <p className="mt-2 text-sm text-white/80">
                  Upload your ticket and our AI will write a personalised appeal
                  letter using winning arguments for your council.
                </p>
                <Link
                  href="/"
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
                >
                  Upload Your Ticket
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Link>
              </div>

              {/* Free Templates */}
              <div className="rounded-xl border border-border p-6">
                <h3 className="flex items-center gap-2 font-bold text-dark">
                  <FontAwesomeIcon icon={faFileLines} className="text-gray" />
                  Free Appeal Templates
                </h3>
                <p className="mt-2 text-sm text-gray">
                  Download our free fill-in-the-blank appeal letter templates.
                </p>
                <Link
                  href="/tools/letters/parking"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
                >
                  Browse templates
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Link>
              </div>

              {/* Other Regions */}
              <div className="rounded-xl border border-border p-6">
                <h3 className="font-bold text-dark">Other Regions</h3>
                <div className="mt-4 space-y-2">
                  {otherRegions.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/tools/reference/issuers/region/${r.slug}`}
                      className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm transition-colors hover:bg-light"
                    >
                      <FontAwesomeIcon
                        icon={faMapLocationDot}
                        className="text-xs text-teal"
                      />
                      <span className="text-gray">{r.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
