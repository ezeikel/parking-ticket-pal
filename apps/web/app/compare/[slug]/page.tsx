import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/pro-solid-svg-icons';
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
  getCompetitorByCompareSlug,
  getAllCompareSlugs,
} from '@/data/competitors';
import ComparisonTable from '@/components/competitors/ComparisonTable';
import ProConList from '@/components/competitors/ProConList';
import CompetitorSidebar from '@/components/competitors/CompetitorSidebar';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllCompareSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competitor = getCompetitorByCompareSlug(slug);

  if (!competitor) {
    return { title: 'Comparison Not Found | Parking Ticket Pal' };
  }

  const year = new Date().getFullYear();
  const title = `Parking Ticket Pal vs ${competitor.name} (${year}) | Honest Comparison`;
  const description = `Compare Parking Ticket Pal with ${competitor.name} for UK parking ticket appeals. See features, pros, cons, and which is better for fighting your parking fine.`;

  return {
    title,
    description,
    keywords: competitor.keywords,
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function CompareDetailPage({ params }: Props) {
  const { slug } = await params;
  const competitor = getCompetitorByCompareSlug(slug);

  if (!competitor) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', url: 'https://www.parkingticketpal.com' },
    { name: 'Compare', url: 'https://www.parkingticketpal.com/compare' },
    {
      name: `PTP vs ${competitor.shortName}`,
      url: `https://www.parkingticketpal.com/compare/${slug}`,
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
              href="/compare"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              All Comparisons
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-dark md:text-4xl">
            Parking Ticket Pal vs {competitor.name}
          </h1>
          <p className="mt-4 max-w-3xl text-gray">{competitor.description}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column */}
            <div className="space-y-8 lg:col-span-2">
              {/* Quick Verdict */}
              <div className="rounded-xl border border-teal/20 bg-teal/5 p-6">
                <h2 className="text-lg font-bold text-dark">Quick Verdict</h2>
                <p className="mt-2 text-gray">{competitor.verdict}</p>
              </div>

              {/* Feature Comparison Table */}
              <div>
                <h2 className="mb-4 text-xl font-bold text-dark">
                  Feature Comparison
                </h2>
                <ComparisonTable
                  features={competitor.features}
                  competitorName={competitor.shortName}
                />
              </div>

              {/* About the Competitor */}
              <div className="rounded-xl border border-border p-6">
                <h2 className="text-lg font-bold text-dark">
                  About {competitor.name}
                </h2>
                <p className="mt-2 text-gray">{competitor.description}</p>
                <p className="mt-3 text-sm text-gray">
                  <strong className="text-dark">Best for:</strong>{' '}
                  {competitor.bestFor}
                </p>
              </div>

              {/* Pros and Cons */}
              <div>
                <h2 className="mb-4 text-xl font-bold text-dark">
                  {competitor.shortName} Pros & Cons
                </h2>
                <ProConList
                  pros={competitor.pros}
                  cons={competitor.cons}
                  name={competitor.shortName}
                />
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
            <CompetitorSidebar current={competitor} variant="compare" />
          </div>
        </div>
      </section>
    </div>
  );
}
