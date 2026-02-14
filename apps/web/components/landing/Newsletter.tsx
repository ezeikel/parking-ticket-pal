'use client';

import { useRef, useState, useTransition } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpenText } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { subscribeNewsletter } from '@/app/actions/newsletter';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const Newsletter = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  return (
    <section ref={ref} className="bg-light py-16 md:py-20">
      <div className="mx-auto max-w-xl px-6 text-center">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="flex flex-col items-center"
        >
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
            <FontAwesomeIcon
              icon={faEnvelopeOpenText}
              className="text-2xl text-teal"
            />
          </div>

          {/* Content */}
          <h2 className="mt-6 text-2xl font-bold text-dark md:text-3xl">
            Stay ahead of UK parking law changes
          </h2>
          <p className="mt-3 text-base text-gray">
            Get monthly tips, tribunal insights, and success stories. No spam,
            ever.
          </p>

          {/* Form */}
          {status === 'success' ? (
            <p className="mt-8 text-base font-medium text-teal">
              You&apos;re in! We&apos;ll be in touch.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await subscribeNewsletter(email);
                  if (result.success) {
                    setStatus('success');
                    setEmail('');
                  } else {
                    setStatus('error');
                  }
                });
              }}
              className="mt-8 flex w-full flex-col gap-3 sm:flex-row"
            >
              <Input
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
                {isPending ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>
          )}

          {status === 'error' && (
            <p className="mt-3 text-sm text-red-500">
              Something went wrong. Please try again.
            </p>
          )}

          {/* Trust text */}
          {status !== 'success' && (
            <p className="mt-4 text-sm text-gray">
              Join 8,000+ drivers who fight smarter
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;
