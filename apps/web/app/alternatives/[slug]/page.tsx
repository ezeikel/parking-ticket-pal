import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck } from '@fortawesome/pro-solid-svg-icons';
import type { Metadata } from 'next';
import JsonLd, {
  createBreadcrumbSchema,
  createFAQSchema,
} from '@/components/JsonLd/JsonLd';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  competitors,
  getCompetitorByAlternativeSlug,
  getAllAlternativeSlugs,
} from '@/data/competitors';
import CompetitorSidebar from '@/components/competitors/CompetitorSidebar';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllAlternativeSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competitor = getCompetitorByAlternativeSlug(slug);

  if (!competitor) {
    return { title: 'Alternatives Not Found | Parking Ticket Pal' };
  }

  const year = new Date().getFullYear();
  const title = `Best ${competitor.name} Alternatives for UK Parking Tickets (${year})`;
  const description = `Looking for alternatives to ${competitor.name}? Compare the best options for appealing UK parking tickets, including Parking Ticket Pal's AI-powered approach.`;

  return {
    title,
    description,
    keywords: competitor.alternativeSearchTerms,
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function AlternativesDetailPage({ params }: Props) {
  const { slug } = await params;
  const year = new Date().getFullYear();
  const competitor = getCompetitorByAlternativeSlug(slug);

  if (!competitor) {
    notFound();
  }

  const otherOptions = competitors.filter((c) => c.id !== competitor.id);

  const breadcrumbs = [
    { name: 'Home', url: 'https://www.parkingticketpal.com' },
    {
      name: 'Alternatives',
      url: 'https://www.parkingticketpal.com/alternatives',
    },
    {
      name: `${competitor.shortName} Alternatives`,
      url: `https://www.parkingticketpal.com/alternatives/${slug}`,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />
      <JsonLd data={createFAQSchema(competitor.faqs)} />

      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/alternatives"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              All Alternatives
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-dark md:text-4xl">
            Best {competitor.name} Alternatives ({year})
          </h1>
          <p className="mt-4 max-w-3xl text-gray">
            Looking for an alternative to {competitor.name} for your UK parking
            ticket? Here are the best options available, and why Parking Ticket
            Pal is the top choice.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column */}
            <div className="space-y-8 lg:col-span-2">
              {/* Why look for alternatives */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="text-lg font-bold text-dark">
                  Why Look for {competitor.shortName} Alternatives?
                </h2>
                <ul className="mt-4 space-y-3">
                  {competitor.whyLookForAlternatives.map((reason) => (
                    <li
                      key={reason}
                      className="flex items-start gap-2 text-sm text-gray"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Top Alternative: PTP */}
              <div className="rounded-xl border-2 border-teal/30 bg-teal/5 p-6">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal px-2.5 py-1 text-xs font-bold text-white">
                    #1 Alternative
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold text-dark">
                  Parking Ticket Pal
                </h2>
                <p className="mt-2 text-gray">
                  Purpose-built for UK parking tickets. Our AI analyses your
                  specific contravention code, predicts your success chances
                  using real tribunal data, and generates a professional appeal
                  letter in minutes.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    'AI-generated appeal letters citing relevant case law',
                    'Success score prediction based on real tribunal data',
                    'Auto-submit to council portals',
                    'Contravention code database with specific appeal strategies',
                    'Free tier available — pay only if you want premium features',
                  ].map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray"
                    >
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="mt-0.5 shrink-0 text-teal"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
                >
                  Try Parking Ticket Pal Free
                </Link>
              </div>

              {/* Other Alternatives */}
              <div>
                <h2 className="mb-4 text-xl font-bold text-dark">
                  Other Alternatives to {competitor.shortName}
                </h2>
                <div className="space-y-4">
                  {otherOptions.map((option, index) => (
                    <div
                      key={option.id}
                      className="rounded-xl border border-border p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray">
                            #{index + 2}
                          </span>
                          <h3 className="text-lg font-bold text-dark">
                            {option.name}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray">
                        {option.description}
                      </p>
                      <p className="mt-3 text-sm">
                        <strong className="text-dark">Best for:</strong>{' '}
                        <span className="text-gray">{option.bestFor}</span>
                      </p>
                      <Link
                        href={`/compare/${option.compareSlug}`}
                        className="mt-3 inline-flex text-sm font-medium text-teal hover:underline"
                      >
                        See PTP vs {option.shortName} comparison
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* How PTP Compares */}
              <div className="rounded-xl border border-border bg-light/50 p-6">
                <h2 className="text-lg font-bold text-dark">
                  How Parking Ticket Pal Compares to {competitor.shortName}
                </h2>
                <p className="mt-2 text-gray">{competitor.verdict}</p>
              </div>

              {/* FAQ */}
              {competitor.faqs.length > 0 && (
                <div>
                  <h2 className="mb-4 text-xl font-bold text-dark">
                    Frequently Asked Questions
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {competitor.faqs.map((faq, index) => (
                      <AccordionItem key={faq.question} value={`faq-${index}`}>
                        <AccordionTrigger className="text-left text-dark">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <CompetitorSidebar current={competitor} variant="alternative" />
          </div>
        </div>
      </section>
    </div>
  );
}
