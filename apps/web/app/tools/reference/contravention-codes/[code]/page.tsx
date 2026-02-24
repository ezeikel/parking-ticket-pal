import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faRoad,
  faSquareParking,
  faCar,
  faCircleInfo,
  faTriangleExclamation,
  faLightbulb,
  faFileLines,
} from '@fortawesome/pro-solid-svg-icons';
import {
  CONTRAVENTION_CODES,
  SUFFIX_DEFINITIONS,
  type CodeCategory,
  type PenaltyLevel,
} from '@parking-ticket-pal/constants';
import type { Metadata } from 'next';
import { parkingTemplates } from '@/data/templates';
import JsonLd, {
  createFAQSchema,
  createBreadcrumbSchema,
} from '@/components/JsonLd/JsonLd';

type Props = {
  params: Promise<{ code: string }>;
};

const categoryLabels: Record<CodeCategory, string> = {
  'on-street': 'On-Street Parking',
  'off-street': 'Off-Street Car Park',
  'moving-traffic': 'Moving Traffic',
};

const categoryIcons: Record<CodeCategory, typeof faRoad> = {
  'on-street': faRoad,
  'off-street': faSquareParking,
  'moving-traffic': faCar,
};

const penaltyLabels: Record<PenaltyLevel, string> = {
  higher: 'Higher Level',
  lower: 'Lower Level',
  'n/a': 'Fixed Penalty',
};

const penaltyBadgeClasses: Record<PenaltyLevel, string> = {
  higher: 'bg-coral/10 text-coral',
  lower: 'bg-amber/10 text-amber',
  'n/a': 'bg-gray/10 text-gray',
};

const penaltyAmounts: Record<PenaltyLevel, { full: string; reduced: string }> =
  {
    higher: { full: '£130', reduced: '£65 (if paid within 14 days)' },
    lower: { full: '£80', reduced: '£40 (if paid within 14 days)' },
    'n/a': { full: '£65-£130', reduced: 'Varies by authority' },
  };

export async function generateStaticParams() {
  return Object.keys(CONTRAVENTION_CODES).map((code) => ({
    code,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: codeParam } = await params;
  const codeData = CONTRAVENTION_CODES[codeParam];

  if (!codeData) {
    return {
      title: 'Code Not Found | Parking Ticket Pal',
    };
  }

  const title = `Code ${codeData.code} - ${codeData.description.slice(0, 50)}${codeData.description.length > 50 ? '...' : ''} | Parking Contravention Codes`;
  const penaltyDescriptions: Record<PenaltyLevel, string> = {
    higher: 'Higher level penalty (£130).',
    lower: 'Lower level penalty (£80).',
    'n/a': 'Fixed penalty notice.',
  };
  const description = `What does PCN code ${codeData.code} mean? ${codeData.description}. ${penaltyDescriptions[codeData.penaltyLevel]} Learn how to appeal.`;

  return {
    title,
    description,
    keywords: [
      `code ${codeData.code}`,
      `pcn code ${codeData.code}`,
      `contravention code ${codeData.code}`,
      'parking ticket',
      'pcn',
      'penalty charge notice',
      codeData.category.replace('-', ' '),
      'parking fine',
      'appeal parking ticket',
    ],
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function ContraventionCodePage({ params }: Props) {
  const { code: codeParam } = await params;
  const codeData = CONTRAVENTION_CODES[codeParam];

  if (!codeData) {
    notFound();
  }

  // Find related codes in the same category
  const relatedCodes = Object.values(CONTRAVENTION_CODES)
    .filter((c) => c.category === codeData.category && c.code !== codeData.code)
    .slice(0, 4);

  // Relevant templates based on category
  const relevantTemplateIds =
    codeData.category === 'moving-traffic'
      ? ['informal-challenge', 'formal-representation', 'tribunal-appeal']
      : ['informal-challenge', 'formal-representation', 'mitigation-hardship'];

  const relevantTemplates = parkingTemplates.filter((t) =>
    relevantTemplateIds.includes(t.id),
  );

  // FAQ schema
  const faqs = [
    {
      question: `What does contravention code ${codeData.code} mean?`,
      answer: codeData.description,
    },
    {
      question: `How much is the fine for code ${codeData.code}?`,
      answer: `Code ${codeData.code} is a ${penaltyLabels[codeData.penaltyLevel].toLowerCase()} penalty. The full amount is ${penaltyAmounts[codeData.penaltyLevel].full}, with a reduced amount of ${penaltyAmounts[codeData.penaltyLevel].reduced}.`,
    },
    {
      question: `Can I appeal a code ${codeData.code} parking ticket?`,
      answer:
        'Yes, you can appeal at multiple stages. First, make an informal challenge within 14 days (this preserves your 50% early payment discount). If rejected, you can make a formal representation within 28 days of the Notice to Owner. If that is also rejected, you can appeal to an independent tribunal within 28 days.',
    },
    {
      question: `What are the deadlines for appealing a code ${codeData.code} PCN?`,
      answer:
        'You have 14 days for an informal challenge (recommended to preserve the early payment discount), 28 days from the Notice to Owner (NTO) for a formal representation, and 28 days from the Notice of Rejection to appeal to the independent tribunal.',
    },
  ];

  // Breadcrumb schema
  const breadcrumbs = [
    { name: 'Home', url: 'https://parkingticketpal.co.uk' },
    { name: 'Tools', url: 'https://parkingticketpal.co.uk/tools' },
    {
      name: 'Contravention Codes',
      url: 'https://parkingticketpal.co.uk/tools/reference/contravention-codes',
    },
    {
      name: `Code ${codeData.code}`,
      url: `https://parkingticketpal.co.uk/tools/reference/contravention-codes/${codeData.code}`,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={createFAQSchema(faqs)} />
      <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />
      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/tools/reference/contravention-codes"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              All Contravention Codes
            </Link>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            {/* Code Badge */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-border bg-white md:h-32 md:w-32">
              <span className="text-4xl font-bold text-dark md:text-5xl">
                {codeData.code}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-dark md:text-3xl">
                {codeData.description}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {/* Category badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-sm">
                  <FontAwesomeIcon
                    icon={categoryIcons[codeData.category]}
                    className="text-xs text-gray"
                  />
                  {categoryLabels[codeData.category]}
                </span>

                {/* Penalty level badge */}
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${penaltyBadgeClasses[codeData.penaltyLevel]}`}
                >
                  {penaltyLabels[codeData.penaltyLevel]}
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
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Penalty Information */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="text-amber"
                  />
                  Penalty Information
                </h2>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between border-b border-border pb-3">
                    <span className="text-gray">Full penalty amount</span>
                    <span className="font-semibold text-dark">
                      {penaltyAmounts[codeData.penaltyLevel].full}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Reduced amount</span>
                    <span className="font-semibold text-teal">
                      {penaltyAmounts[codeData.penaltyLevel].reduced}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray">
                  Penalties in London may vary. Check your PCN for the exact
                  amount.
                </p>
              </div>

              {/* Notes */}
              {codeData.notes && (
                <div className="rounded-xl border border-border bg-light/50 p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
                    <FontAwesomeIcon
                      icon={faCircleInfo}
                      className="text-teal"
                    />
                    Important Notes
                  </h2>
                  <p className="mt-3 text-gray">{codeData.notes}</p>
                </div>
              )}

              {/* Suffixes */}
              {codeData.suffixes.length > 0 && (
                <div className="rounded-xl border border-border p-6">
                  <h2 className="text-lg font-bold text-dark">
                    Code Variations (Suffixes)
                  </h2>
                  <p className="mt-2 text-sm text-gray">
                    This code can have different suffixes indicating specific
                    circumstances:
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {codeData.suffixes.map((suffix) => (
                      <div
                        key={suffix}
                        className="flex items-center gap-3 rounded-lg border border-border bg-white p-3"
                      >
                        <span className="flex h-8 w-12 items-center justify-center rounded bg-light font-mono text-sm font-bold text-dark">
                          {codeData.code}
                          {suffix}
                        </span>
                        <span className="text-sm text-gray">
                          {SUFFIX_DEFINITIONS[suffix] || suffix}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Appeal Tips */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-dark">
                  <FontAwesomeIcon icon={faLightbulb} className="text-amber" />
                  Common Grounds for Appeal
                </h2>
                <ul className="mt-4 space-y-3 text-gray">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    <span>Signs were missing, obscured, or unclear</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    <span>Road markings were worn or not visible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    <span>
                      You had a valid permit or payment that wasn&apos;t
                      recorded correctly
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    <span>
                      There were mitigating circumstances (medical emergency,
                      breakdown)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    <span>
                      The PCN contains errors (wrong date, time, location,
                      vehicle)
                    </span>
                  </li>
                </ul>
                <p className="mt-4 text-sm text-gray">
                  The specific grounds that apply depend on your circumstances.
                  Our AI can help identify the strongest arguments for your
                  case.
                </p>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="rounded-xl bg-dark p-6 text-white">
                <h3 className="text-lg font-bold">Got Code {codeData.code}?</h3>
                <p className="mt-2 text-sm text-white/80">
                  Upload your PCN and our AI will write a personalised appeal
                  letter using real tribunal wins for this code.
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
                  Not ready for AI? Use our free fill-in-the-blank templates:
                </p>
                <div className="mt-4 space-y-2">
                  {relevantTemplates.map((template) => (
                    <Link
                      key={template.id}
                      href={`/tools/letters/parking/${template.id}`}
                      className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm transition-colors hover:bg-light"
                    >
                      <FontAwesomeIcon
                        icon={faFileLines}
                        className="shrink-0 text-xs text-teal"
                      />
                      <span className="text-gray">{template.shortTitle}</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/tools/letters/parking"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
                >
                  Browse all templates
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Link>
              </div>

              {/* Related Codes */}
              {relatedCodes.length > 0 && (
                <div className="rounded-xl border border-border p-6">
                  <h3 className="font-bold text-dark">Related Codes</h3>
                  <p className="mt-1 text-sm text-gray">
                    Other {categoryLabels[codeData.category].toLowerCase()}{' '}
                    codes
                  </p>
                  <div className="mt-4 space-y-2">
                    {relatedCodes.map((code) => (
                      <Link
                        key={code.code}
                        href={`/tools/reference/contravention-codes/${code.code}`}
                        className="flex items-center gap-3 rounded-lg border border-border p-2 transition-colors hover:bg-light"
                      >
                        <span className="flex h-8 w-10 items-center justify-center rounded bg-light text-sm font-bold text-dark">
                          {code.code}
                        </span>
                        <span className="flex-1 truncate text-sm text-gray">
                          {code.description.slice(0, 40)}...
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/tools/reference/contravention-codes"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
                  >
                    View all codes
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
