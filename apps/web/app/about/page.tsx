import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Parking Ticket Pal | Who We Are & Why We Built This',
  description:
    'Parking Ticket Pal was built in South London to help UK drivers fight unfair parking tickets. Learn about our mission, how we work, and why thousands of drivers trust us.',
};

const AboutPage = () => (
  <div className="min-h-screen bg-white">
    {/* Hero */}
    <section className="bg-light py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-dark md:text-5xl">
            The parking system is broken. We&apos;re here to fix it.
          </h1>
          <p className="mt-6 text-lg text-gray">
            Over 8 million parking tickets are issued in the UK every year. Most
            people just pay up — not because they&apos;re guilty, but because
            the process is confusing, stressful, and deliberately hard to
            navigate. We built Parking Ticket Pal to change that.
          </p>
        </div>
      </div>
    </section>

    {/* Why We Exist */}
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-6 text-3xl font-bold text-dark">Why we exist</h2>
        <div className="space-y-4 text-gray">
          <p>
            It started with a parking ticket in South London. An unclear sign, a
            confusing restriction, and a fine that doubled before the appeal
            deadline. The process to challenge it was buried across council
            websites, different forms, and conflicting advice.
          </p>
          <p>
            We looked for a tool that could help — something that would track
            deadlines, explain the process, and help draft a proper appeal. It
            didn&apos;t exist. So we built it.
          </p>
          <p>
            Parking Ticket Pal started as a side project to solve a real
            problem. Today it helps thousands of UK drivers track their tickets,
            avoid unnecessary fine increases, and challenge penalties they
            believe are unfair.
          </p>
        </div>
      </div>
    </section>

    {/* What We Do */}
    <section className="bg-light py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-6 text-3xl font-bold text-dark">What we do</h2>
        <div className="space-y-4 text-gray">
          <p>
            We give drivers the tools and information they need to deal with
            parking tickets properly — from the moment you receive a PCN to the
            final resolution.
          </p>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark">
              Deadline tracking
            </h3>
            <p className="text-sm text-gray">
              Every ticket has critical deadlines. Miss the 14-day window and
              your fine jumps 50%. Miss a later deadline and you lose your right
              to appeal. We track every date and send reminders via email and
              SMS.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark">
              Success prediction
            </h3>
            <p className="text-sm text-gray">
              We&apos;ve studied thousands of real tribunal outcomes across the
              UK. For each contravention code, we know what arguments have
              worked historically and use that data to give you a success score
              before you commit to challenging.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark">
              AI-assisted appeal letters
            </h3>
            <p className="text-sm text-gray">
              Tell us what happened and our system drafts a formal appeal letter
              tailored to your specific contravention, issuer, and
              circumstances. You review and approve everything before it goes
              anywhere.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark">
              Direct portal submission
            </h3>
            <p className="text-sm text-gray">
              For 40+ supported councils and issuers — including Lewisham,
              Camden, Westminster, TfL, Horizon, and APCOA — we submit your
              challenge directly on the issuer&apos;s website. No forms, no
              queues.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* How We're Different */}
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-6 text-3xl font-bold text-dark">
          How we&apos;re different
        </h2>
        <div className="space-y-4 text-gray">
          <p>
            Most parking ticket services either give you generic advice or
            charge a solicitor&apos;s fee to write a letter. We take a different
            approach.
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="border-l-4 border-teal pl-6">
            <h3 className="mb-1 font-semibold text-dark">
              Built on real data, not guesswork
            </h3>
            <p className="text-sm text-gray">
              Our success scores and appeal strategies are based on thousands of
              actual UK parking tribunal decisions. We analyse real outcomes —
              what arguments won, what evidence mattered, which issuers have
              higher overturn rates — and use that to guide every
              recommendation.
            </p>
          </div>
          <div className="border-l-4 border-teal pl-6">
            <h3 className="mb-1 font-semibold text-dark">
              You stay in control
            </h3>
            <p className="text-sm text-gray">
              We draft appeal letters and pre-fill forms, but nothing is
              submitted without your review and approval. This is your ticket
              and your decision — we just make the process easier.
            </p>
          </div>
          <div className="border-l-4 border-teal pl-6">
            <h3 className="mb-1 font-semibold text-dark">
              Covers every stage of the process
            </h3>
            <p className="text-sm text-gray">
              From initial PCN through formal representation (PE2), rejection
              appeal (PE3), tribunal (TE7), and even out-of-time applications
              (TE9) — we handle the full lifecycle. Most services stop after the
              first letter.
            </p>
          </div>
          <div className="border-l-4 border-teal pl-6">
            <h3 className="mb-1 font-semibold text-dark">
              Works with councils, TfL, and private operators
            </h3>
            <p className="text-sm text-gray">
              Council PCNs, TfL penalties, and private parking charges from
              companies like APCOA, Horizon, and UK Parking Control all work
              differently. We support all of them.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* Who We Are */}
    <section className="bg-light py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-6 text-3xl font-bold text-dark">Who we are</h2>
        <div className="space-y-4 text-gray">
          <p>
            Parking Ticket Pal is built and operated by{' '}
            <strong className="text-dark">Chewy Bytes Limited</strong>, a
            software company registered in the United Kingdom.
          </p>
          <p>
            We&apos;re a small, focused team based in South London. We combine
            software engineering, data analysis, and a deep understanding of UK
            parking law to build tools that actually work. Every feature we ship
            is tested against real council portals and real tribunal outcomes.
          </p>
          <p>
            We&apos;re drivers too. We&apos;ve dealt with the same confusing
            signs, the same opaque council websites, and the same feeling of not
            knowing whether it&apos;s worth fighting. That experience drives
            everything we build.
          </p>
        </div>
      </div>
    </section>

    {/* Our Approach to Data */}
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-6 text-3xl font-bold text-dark">
          Our approach to data
        </h2>
        <div className="space-y-4 text-gray">
          <p>
            We take data seriously — both the tribunal data that powers our
            recommendations and the personal data you trust us with.
          </p>
          <p>
            Our success scores are derived from thousands of real UK parking
            tribunal cases. We continuously analyse new decisions to keep our
            data current and our recommendations accurate.
          </p>
          <p>
            Your personal data is protected with bank-level encryption. We
            comply with UK GDPR, never share your information with third
            parties, and will delete your data on request. Full details are in
            our{' '}
            <Link
              href="/privacy"
              className="text-teal underline hover:text-teal-dark"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="bg-dark py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-4 text-3xl font-bold text-white">
          Got a parking ticket?
        </h2>
        <p className="mb-8 text-lg text-gray-300">
          Upload it now to see your deadlines, check your options, and find out
          if it&apos;s worth challenging. It&apos;s free to start.
        </p>
        <Link
          href="/new"
          className="inline-block rounded-full bg-teal px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          Upload Your Ticket
        </Link>
      </div>
    </section>
  </div>
);

export default AboutPage;
