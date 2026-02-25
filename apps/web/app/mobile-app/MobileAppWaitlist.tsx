'use client';

import { useRef, useState, useTransition, useEffect } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMobileScreen,
  faCamera,
  faBell,
  faFileLines,
  faCar,
  faChartPie,
  faCheckCircle,
} from '@fortawesome/pro-solid-svg-icons';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { joinWaitlist } from '@/app/actions/waitlist';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

type Feature = {
  icon: IconDefinition;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: faCamera,
    title: 'Scan Your Ticket',
    description:
      'Point your camera at any PCN. We extract the details instantly — no typing required.',
  },
  {
    icon: faBell,
    title: 'Deadline Reminders',
    description:
      'Never miss a deadline. Get push notifications before your fine increases or your appeal window closes.',
  },
  {
    icon: faFileLines,
    title: 'Challenge Letters & Forms',
    description:
      'Generate tailored appeal letters and pre-filled legal forms (PE2, PE3, TE7, TE9) right from your phone.',
  },
  {
    icon: faCar,
    title: 'All Vehicles, One Place',
    description:
      'Track tickets across all your vehicles. See statuses, deadlines, and next steps at a glance.',
  },
  {
    icon: faChartPie,
    title: 'Know Your Chances',
    description:
      'See a data-backed success score before you decide to challenge. Make informed decisions, not guesses.',
  },
  {
    icon: faMobileScreen,
    title: 'Manage on the Go',
    description:
      'Upload evidence, review letters, and track progress — wherever you are. No need to sit at a computer.',
  },
];

const MobileAppWaitlist = () => {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const screenshotsRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: '-100px' });
  const featuresInView = useInView(featuresRef, {
    once: true,
    margin: '-100px',
  });
  const screenshotsInView = useInView(screenshotsRef, {
    once: true,
    margin: '-100px',
  });

  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { track } = useAnalytics();

  useEffect(() => {
    track(TRACKING_EVENTS.WAITLIST_PAGE_VIEWED, {});
  }, [track]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    track(TRACKING_EVENTS.WAITLIST_SIGNUP_SUBMITTED, { email });
    startTransition(async () => {
      const result = await joinWaitlist(email);
      if (result.success) {
        setStatus('success');
        setEmail('');
        track(TRACKING_EVENTS.WAITLIST_SIGNUP_COMPLETED, { email });
      } else {
        setStatus('error');
        track(TRACKING_EVENTS.WAITLIST_SIGNUP_FAILED, { email });
      }
    });
  };

  const emailForm = (id: string) =>
    status === 'success' ? (
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faCheckCircle} className="text-xl text-teal" />
        <p className="text-base font-medium text-teal">
          You&apos;re on the list! We&apos;ll email you when the app is ready.
        </p>
      </div>
    ) : (
      <>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
        >
          <Input
            id={id}
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            className="h-12 flex-1"
            required
            disabled={isPending}
          />
          <Button
            type="submit"
            className="h-12 bg-teal px-8 font-semibold text-white hover:bg-teal-dark"
            disabled={isPending}
          >
            {isPending ? 'Joining...' : 'Notify Me'}
          </Button>
        </form>
        {status === 'error' && (
          <p className="mt-2 text-sm text-red-500">
            Something went wrong. Please try again.
          </p>
        )}
      </>
    );

  return (
    <>
      {/* Hero Section */}
      <section ref={heroRef} className="bg-dark py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Left — Copy */}
            <motion.div
              initial="hidden"
              animate={heroInView ? 'visible' : 'hidden'}
              variants={fadeUpVariants}
              className="flex flex-col"
            >
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-4 py-2">
                <FontAwesomeIcon
                  icon={faApple}
                  className="text-sm text-white"
                />
                <span className="text-sm text-white/80">+</span>
                <FontAwesomeIcon
                  icon={faGooglePlay}
                  className="text-sm text-white"
                />
                <span className="text-sm font-medium text-white">
                  Coming Soon
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-bold text-white md:text-5xl">
                Your parking tickets, sorted from your pocket
              </h1>
              <p className="mt-4 text-lg text-white/70">
                Track tickets, get deadline reminders, build challenge letters,
                and manage everything on the go. Be the first to know when the
                app launches.
              </p>

              <div className="mt-8">{emailForm('hero-email')}</div>
            </motion.div>

            {/* Right — Device Mockup Placeholder */}
            <motion.div
              initial="hidden"
              animate={heroInView ? 'visible' : 'hidden'}
              variants={fadeUpVariants}
              transition={{ delay: 0.2 }}
              className="flex justify-center"
            >
              {/* TODO: Replace with actual app screenshot in device frame */}
              <div className="relative h-[500px] w-[250px] rounded-[40px] border-4 border-white/20 bg-white/5 p-3">
                <div className="flex h-full w-full flex-col items-center justify-center rounded-[32px] bg-white/10">
                  <FontAwesomeIcon
                    icon={faMobileScreen}
                    className="text-5xl text-white/30"
                  />
                  <p className="mt-4 text-sm text-white/40">
                    App screenshot coming soon
                  </p>
                </div>
                {/* Notch */}
                <div className="absolute top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-white/10" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            animate={featuresInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold text-dark md:text-4xl">
              Everything you need to handle a parking ticket
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray">
              From the moment you get a ticket to a resolved outcome — managed
              from your phone.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                animate={featuresInView ? 'visible' : 'hidden'}
                variants={fadeUpVariants}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl bg-light p-6"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                  <FontAwesomeIcon
                    icon={feature.icon}
                    className="text-xl text-dark"
                  />
                </div>
                <h3 className="mt-4 text-lg font-bold text-dark">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots Section — Placeholder */}
      <section ref={screenshotsRef} className="bg-light py-20 md:py-28">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.div
            initial="hidden"
            animate={screenshotsInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold text-dark md:text-4xl">
              See it in action
            </h2>
          </motion.div>

          {/* TODO: Replace with real app screenshots in device frames */}
          <div className="grid gap-8 md:grid-cols-3">
            {[
              'Scan your ticket',
              'Track deadlines',
              'Build your challenge',
            ].map((label, index) => (
              <motion.div
                key={label}
                initial="hidden"
                animate={screenshotsInView ? 'visible' : 'hidden'}
                variants={fadeUpVariants}
                transition={{ delay: index * 0.15 }}
                className="flex flex-col items-center"
              >
                <div className="flex h-[400px] w-[200px] items-center justify-center rounded-[32px] border-2 border-border bg-white">
                  <p className="text-sm text-gray">Screenshot {index + 1}</p>
                </div>
                <p className="mt-4 text-base font-medium text-dark">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-dark py-16 md:py-20">
        <div className="mx-auto max-w-xl px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="flex flex-col items-center"
          >
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Be the first to get the app
            </h2>
            <p className="mt-3 text-base text-white/70">
              We&apos;ll email you the moment it&apos;s available on the App
              Store and Google Play.
            </p>
            <div className="mt-8">{emailForm('bottom-email')}</div>
            <p className="mt-6 text-sm text-white/50">
              Already have a ticket?{' '}
              <Link
                href="/"
                className="text-teal underline hover:text-teal-dark"
              >
                Use the web app now
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default MobileAppWaitlist;
