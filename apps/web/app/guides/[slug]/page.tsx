import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faClock,
  faFileLines,
  faBookOpen,
} from '@fortawesome/pro-solid-svg-icons';
import type { Metadata } from 'next';
import JsonLd, {
  createBreadcrumbSchema,
  createFAQSchema,
  createHowToSchema,
  createArticleSchema,
} from '@/components/JsonLd/JsonLd';
import { getGuideBySlug, getAllGuideSlugs } from '@/data/guides';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return { title: 'Guide Not Found | Parking Ticket Pal' };
  }

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    keywords: guide.keywords,
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      type: 'article',
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = guide.relatedGuides
    .map((s) => getGuideBySlug(s))
    .filter(Boolean);

  const breadcrumbs = [
    { name: 'Home', url: 'https://parkingticketpal.co.uk' },
    { name: 'Guides', url: 'https://parkingticketpal.co.uk/guides' },
    {
      name: guide.title,
      url: `https://parkingticketpal.co.uk/guides/${guide.slug}`,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />
      <JsonLd data={createFAQSchema(guide.faqs)} />
      {guide.howToSteps && (
        <JsonLd
          data={createHowToSchema(
            guide.title,
            guide.metaDescription,
            guide.howToSteps,
          )}
        />
      )}
      <JsonLd
        data={createArticleSchema({
          title: guide.metaTitle,
          description: guide.metaDescription,
          url: `https://parkingticketpal.co.uk/guides/${guide.slug}`,
          datePublished: guide.lastUpdated,
          dateModified: guide.lastUpdated,
        })}
      />

      {/* Hero Section */}
      <section className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mb-6">
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              All Guides
            </Link>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-dark md:text-3xl lg:text-4xl">
              {guide.title}
            </h1>
            <p className="mt-4 text-gray">{guide.excerpt}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray">
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} className="text-xs" />
                {guide.readingTime} min read
              </span>
              <span>
                Last updated:{' '}
                {new Date(guide.lastUpdated).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Article Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Table of Contents */}
              <nav className="rounded-xl border border-border p-6">
                <h2 className="font-bold text-dark">In This Guide</h2>
                <ol className="mt-3 space-y-2">
                  {guide.sections.map((section, index) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="flex items-center gap-2 text-sm text-gray hover:text-teal"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-light text-xs font-bold text-dark">
                          {index + 1}
                        </span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a
                      href="#faq"
                      className="flex items-center gap-2 text-sm text-gray hover:text-teal"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-light text-xs font-bold text-dark">
                        ?
                      </span>
                      Frequently Asked Questions
                    </a>
                  </li>
                </ol>
              </nav>

              {/* Sections */}
              {guide.sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-8">
                  <h2 className="text-xl font-bold text-dark md:text-2xl">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-gray leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              ))}

              {/* FAQ Section */}
              <div
                id="faq"
                className="scroll-mt-8 rounded-xl border border-border p-6"
              >
                <h2 className="text-xl font-bold text-dark">
                  Frequently Asked Questions
                </h2>
                <div className="mt-4 divide-y divide-border">
                  {guide.faqs.map((faq, index) => (
                    <details
                      key={index}
                      className="group py-4 first:pt-0 last:pb-0"
                    >
                      <summary className="flex cursor-pointer items-center justify-between font-medium text-dark">
                        {faq.question}
                        <span className="ml-2 shrink-0 text-gray transition-transform group-open:rotate-180">
                          &#9662;
                        </span>
                      </summary>
                      <p className="mt-3 text-sm text-gray leading-relaxed">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* CTA Card */}
              <div className="rounded-xl bg-dark p-6 text-white">
                <h3 className="text-lg font-bold">Get a Personalised Appeal</h3>
                <p className="mt-2 text-sm text-white/80">
                  Upload your parking ticket and our AI will write a
                  personalised appeal letter based on real tribunal wins.
                </p>
                <Link
                  href="/"
                  className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
                >
                  Upload Your Ticket
                  <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                </Link>
              </div>

              {/* Related Tools */}
              {guide.relatedTools.length > 0 && (
                <div className="rounded-xl border border-border p-6">
                  <h3 className="flex items-center gap-2 font-bold text-dark">
                    <FontAwesomeIcon icon={faFileLines} className="text-gray" />
                    Related Tools
                  </h3>
                  <div className="mt-4 space-y-2">
                    {guide.relatedTools.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm transition-colors hover:bg-light"
                      >
                        <FontAwesomeIcon
                          icon={faArrowRight}
                          className="text-xs text-teal"
                        />
                        <span className="text-gray">{tool.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Guides */}
              {relatedGuides.length > 0 && (
                <div className="rounded-xl border border-border p-6">
                  <h3 className="flex items-center gap-2 font-bold text-dark">
                    <FontAwesomeIcon icon={faBookOpen} className="text-gray" />
                    Related Guides
                  </h3>
                  <div className="mt-4 space-y-2">
                    {relatedGuides.map((related) => (
                      <Link
                        key={related!.slug}
                        href={`/guides/${related!.slug}`}
                        className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm transition-colors hover:bg-light"
                      >
                        <FontAwesomeIcon
                          icon={faBookOpen}
                          className="text-xs text-teal"
                        />
                        <span className="text-gray">{related!.title}</span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href="/guides"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
                  >
                    View all guides
                    <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                  </Link>
                </div>
              )}

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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
