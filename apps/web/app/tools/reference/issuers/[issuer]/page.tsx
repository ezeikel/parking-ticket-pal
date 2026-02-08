import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faBuilding,
  faTrain,
  faLock,
  faGlobe,
  faClock,
  faFileLines,
  faLightbulb,
  faScaleBalanced,
} from '@fortawesome/pro-solid-svg-icons';
import {
  LOCAL_AUTHORITY_IDS,
  PRIVATE_COMPANIES,
  TRANSPORT_AUTHORITIES,
  LOCAL_AUTHORITIES,
  AUTOMATIONS,
} from '@/constants';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ issuer: string }>;
};

type IssuerInfo = {
  id: string;
  name: string;
  type: 'council' | 'private' | 'tfl';
  region?: string;
  websiteUrl?: string;
  hasAutomation: boolean;
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

// Get issuer info
const getIssuerInfo = (issuerId: string): IssuerInfo | null => {
  // Check local authorities
  if (LOCAL_AUTHORITY_IDS.includes(issuerId as (typeof LOCAL_AUTHORITY_IDS)[number])) {
    const fullEntry = LOCAL_AUTHORITIES.find((la) => la.id === issuerId);
    return {
      id: issuerId,
      name: fullEntry?.name || slugToDisplayName(issuerId),
      type: 'council',
      region: fullEntry?.region,
      websiteUrl: fullEntry?.websiteUrl,
      hasAutomation: !!AUTOMATIONS[issuerId as keyof typeof AUTOMATIONS],
    };
  }

  // Check private companies
  const privateCompany = PRIVATE_COMPANIES.find((pc) => pc.id === issuerId);
  if (privateCompany) {
    return {
      id: privateCompany.id,
      name: privateCompany.name,
      type: 'private',
      hasAutomation: !!AUTOMATIONS[issuerId as keyof typeof AUTOMATIONS],
    };
  }

  // Check transport authorities
  const transportAuth = TRANSPORT_AUTHORITIES.find((ta) => ta.id === issuerId);
  if (transportAuth) {
    return {
      id: transportAuth.id,
      name: transportAuth.name,
      type: 'tfl',
      hasAutomation: !!AUTOMATIONS[issuerId as keyof typeof AUTOMATIONS],
    };
  }

  return null;
};

// Generate static params for all issuers
export async function generateStaticParams() {
  const councilIds = LOCAL_AUTHORITY_IDS.map((id) => ({ issuer: id }));
  const privateIds = PRIVATE_COMPANIES.map((pc) => ({ issuer: pc.id }));
  const transportIds = TRANSPORT_AUTHORITIES.map((ta) => ({ issuer: ta.id }));

  return [...councilIds, ...privateIds, ...transportIds];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { issuer: issuerId } = await params;
  const issuer = getIssuerInfo(issuerId);

  if (!issuer) {
    return {
      title: 'Issuer Not Found | Parking Ticket Pal',
    };
  }

  const typeLabel =
    issuer.type === 'council'
      ? 'Council'
      : issuer.type === 'private'
        ? 'Private Parking Company'
        : 'Transport Authority';

  const title = `${issuer.name} Parking Tickets | How to Appeal | Parking Ticket Pal`;
  const description = `Got a parking ticket from ${issuer.name}? Learn how to appeal ${typeLabel.toLowerCase()} parking tickets. Find appeal deadlines, contact information, and tips for challenging your PCN.`;

  return {
    title,
    description,
    keywords: [
      `${issuer.name} parking ticket`,
      `${issuer.name} pcn`,
      `${issuer.name} parking appeal`,
      `appeal parking ticket ${issuer.name}`,
      `${issuer.name} penalty charge notice`,
      typeLabel.toLowerCase(),
      'parking fine appeal',
      'how to appeal parking ticket',
    ],
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

const issuerTypeConfig = {
  council: {
    label: 'Local Council',
    icon: faBuilding,
    color: 'text-teal',
    bgColor: 'bg-teal/10',
  },
  private: {
    label: 'Private Company',
    icon: faLock,
    color: 'text-coral',
    bgColor: 'bg-coral/10',
  },
  tfl: {
    label: 'Transport Authority',
    icon: faTrain,
    color: 'text-amber',
    bgColor: 'bg-amber/10',
  },
};

export default async function IssuerPage({ params }: Props) {
  const { issuer: issuerId } = await params;
  const issuer = getIssuerInfo(issuerId);

  if (!issuer) {
    notFound();
  }

  const config = issuerTypeConfig[issuer.type];

  // Get related issuers (same type)
  const getRelatedIssuers = () => {
    if (issuer.type === 'council') {
      return LOCAL_AUTHORITY_IDS.filter((id) => id !== issuerId)
        .slice(0, 6)
        .map((id) => ({
          id,
          name: slugToDisplayName(id),
        }));
    }
    if (issuer.type === 'private') {
      return PRIVATE_COMPANIES.filter((pc) => pc.id !== issuerId).map((pc) => ({
        id: pc.id,
        name: pc.name,
      }));
    }
    return TRANSPORT_AUTHORITIES.filter((ta) => ta.id !== issuerId).map((ta) => ({
      id: ta.id,
      name: ta.name,
    }));
  };

  const relatedIssuers = getRelatedIssuers();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/tools/reference/issuers"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              All Issuers
            </Link>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            {/* Icon */}
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-white md:h-24 md:w-24`}
            >
              <FontAwesomeIcon
                icon={config.icon}
                className={`text-3xl ${config.color} md:text-4xl`}
              />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-dark md:text-3xl">
                {issuer.name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {/* Type badge */}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${config.bgColor} ${config.color}`}
                >
                  <FontAwesomeIcon icon={config.icon} className="text-xs" />
                  {config.label}
                </span>

                {/* Region badge (for councils) */}
                {issuer.region && (
                  <span className="rounded-full border border-border bg-white px-3 py-1 text-sm text-gray">
                    {issuer.region}
                  </span>
                )}

                {/* Automation badge */}
                {issuer.hasAutomation && (
                  <span className="rounded-full bg-teal/10 px-3 py-1 text-sm text-teal">
                    Auto-submit available
                  </span>
                )}
              </div>

              {/* Website link */}
              {issuer.websiteUrl && (
                <a
                  href={issuer.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-teal hover:underline"
                >
                  <FontAwesomeIcon icon={faGlobe} className="text-xs" />
                  {issuer.websiteUrl.replace('https://', '')}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Appeal Timeline */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
                  <FontAwesomeIcon icon={faClock} className="text-amber" />
                  Appeal Deadlines
                </h2>
                <div className="mt-4 space-y-4">
                  {issuer.type === 'council' || issuer.type === 'tfl' ? (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-bold text-teal">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-dark">Informal Challenge</p>
                          <p className="text-sm text-gray">
                            Within 14 days to keep your 50% discount while challenging
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-sm font-bold text-teal">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-dark">Formal Representation</p>
                          <p className="text-sm text-gray">
                            Within 28 days of receiving Notice to Owner (NTO)
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
                            Within 28 days of receiving Notice of Rejection
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral/10 text-sm font-bold text-coral">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-dark">Initial Appeal</p>
                          <p className="text-sm text-gray">
                            Within 28 days of receiving the parking charge notice
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral/10 text-sm font-bold text-coral">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-dark">POPLA/IAS Appeal</p>
                          <p className="text-sm text-gray">
                            If rejected, appeal to independent adjudicator within 28 days
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Appeal Tips */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
                  <FontAwesomeIcon icon={faLightbulb} className="text-amber" />
                  Tips for Appealing {issuer.name} Tickets
                </h2>
                <ul className="mt-4 space-y-3 text-gray">
                  {issuer.type === 'council' || issuer.type === 'tfl' ? (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span>
                          Check that all signs and road markings were clearly visible
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span>
                          Verify the Traffic Regulation Order (TRO) is in place
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span>
                          Request CEO witness statements if CCTV wasn&apos;t used
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                        <span>
                          Check for procedural errors in the PCN or NTO
                        </span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                        <span>
                          Verify the parking company is a member of BPA or IPC
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                        <span>
                          Check signage was adequate and clearly visible
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                        <span>
                          Ensure the charge reflects genuine pre-estimate of loss
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                        <span>
                          Check the keeper liability requirements were followed
                        </span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Your Rights */}
              <div className="rounded-xl border border-border bg-light/50 p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
                  <FontAwesomeIcon icon={faScaleBalanced} className="text-teal" />
                  Your Rights
                </h2>
                <div className="mt-4 space-y-3 text-gray">
                  {issuer.type === 'council' || issuer.type === 'tfl' ? (
                    <>
                      <p>
                        Council parking tickets (PCNs) are issued under the Traffic
                        Management Act 2004. You have the right to:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Challenge the ticket at any stage</li>
                        <li>See all evidence against you</li>
                        <li>Appeal to an independent tribunal (free)</li>
                        <li>Not pay until all appeals are exhausted</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <p>
                        Private parking charges are civil matters, not criminal offences.
                        Key protections include:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Charges must be a genuine pre-estimate of loss</li>
                        <li>Signage must be clear and prominent</li>
                        <li>Right to appeal to POPLA or IAS (independent)</li>
                        <li>No criminal record or points on licence</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="rounded-xl bg-dark p-6 text-white">
                <h3 className="text-lg font-bold">
                  Got a ticket from {issuer.name}?
                </h3>
                <p className="mt-2 text-sm text-white/80">
                  Upload your ticket and our AI will write a personalised appeal
                  letter using winning arguments for this issuer.
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

              {/* Related Issuers */}
              {relatedIssuers.length > 0 && (
                <div className="rounded-xl border border-border p-6">
                  <h3 className="font-bold text-dark">
                    Other {config.label}s
                  </h3>
                  <div className="mt-4 space-y-2">
                    {relatedIssuers.slice(0, 5).map((related) => (
                      <Link
                        key={related.id}
                        href={`/tools/reference/issuers/${related.id}`}
                        className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm transition-colors hover:bg-light"
                      >
                        <FontAwesomeIcon
                          icon={config.icon}
                          className={`text-xs ${config.color}`}
                        />
                        <span className="truncate text-gray">{related.name}</span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/tools/reference/issuers"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
                  >
                    View all issuers
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
