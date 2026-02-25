'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import {
  PRICING_TIERS,
  FAQ_ITEMS,
  COMPARISON_FEATURES,
  PRICING_COPY,
} from '@/lib/pricing-data';

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const PricingPage = () => {
  const { track } = useAnalytics();

  useEffect(() => {
    track(TRACKING_EVENTS.PRICING_PAGE_VIEWED, {});
  }, [track]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pb-12 pt-8 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="text-4xl font-bold text-dark md:text-5xl"
          >
            {PRICING_COPY.header.title}
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-gray"
          >
            {PRICING_COPY.header.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            {PRICING_TIERS.map((tier, index) => (
              <motion.div
                key={tier.title}
                initial="hidden"
                animate="visible"
                variants={fadeUpVariants}
                transition={{ delay: 0.1 * index }}
                className={`relative flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.08)] md:p-8 ${
                  tier.variant === 'highlighted'
                    ? 'ring-2 ring-dark'
                    : 'ring-1 ring-border'
                }`}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center rounded-full bg-dark px-3 py-1 text-xs font-semibold text-white">
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-dark">{tier.title}</h3>
                  {tier.subtitle && (
                    <p className="mt-1 text-sm text-gray">{tier.subtitle}</p>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-dark">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-gray">/{tier.period}</span>
                    )}
                  </div>
                </div>

                {/* Price anchoring for Premium */}
                {tier.title === 'Premium' && (
                  <p className="mb-2 text-xs font-medium text-teal">
                    Challenge your £100 ticket for just £14.99
                  </p>
                )}

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="mt-0.5 text-sm text-teal"
                      />
                      <span className="text-sm text-dark">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className="h-12 w-full text-base font-semibold bg-dark text-white hover:bg-dark/90"
                  asChild
                >
                  <Link href={tier.href}>{tier.ctaLabel}</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare Plans Table */}
      <section id="compare" className="bg-light py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="mb-12 text-center text-3xl font-bold text-dark"
          >
            Compare Plans
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="overflow-x-auto"
          >
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-4 text-left text-sm font-medium text-gray">
                    Feature
                  </th>
                  <th className="pb-4 text-center">
                    <div className="text-sm font-semibold text-dark">Free</div>
                    <div className="text-xs text-gray">£0</div>
                  </th>
                  <th className="pb-4 text-center">
                    <div className="text-sm font-semibold text-dark">
                      Premium
                    </div>
                    <div className="text-xs text-gray">£14.99/ticket</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature, index) => (
                  <tr
                    key={feature.name}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-transparent'}
                  >
                    <td className="py-4 text-sm text-dark">{feature.name}</td>
                    <td className="py-4 text-center">
                      {feature.free ? (
                        <FontAwesomeIcon icon={faCheck} className="text-teal" />
                      ) : (
                        <FontAwesomeIcon
                          icon={faXmark}
                          className="text-gray/40"
                        />
                      )}
                    </td>
                    <td className="py-4 text-center">
                      {feature.premium ? (
                        <FontAwesomeIcon icon={faCheck} className="text-teal" />
                      ) : (
                        <FontAwesomeIcon
                          icon={faXmark}
                          className="text-gray/40"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td className="pt-6" />
                  <td className="pt-6 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-sm font-semibold"
                      asChild
                    >
                      <Link href="/new">Start Free</Link>
                    </Button>
                  </td>
                  <td className="pt-6 text-center">
                    <Button
                      size="sm"
                      className="bg-dark text-sm font-semibold text-white hover:bg-dark/90"
                      asChild
                    >
                      <Link href="/new?tier=premium&source=pricing">
                        Upgrade to Premium
                      </Link>
                    </Button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="mb-12 text-center text-3xl font-bold text-dark"
          >
            Frequently Asked Questions
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
          >
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-base font-semibold text-dark hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            className="text-3xl font-bold text-white md:text-4xl"
          >
            Ready to challenge your ticket?
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-lg text-white/70"
          >
            Start free. Upgrade when you need to challenge.
          </motion.p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUpVariants}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Button
              size="lg"
              className="h-12 bg-teal px-8 text-base font-semibold text-white hover:bg-teal-dark"
              asChild
            >
              <Link href="/new">Upload Your First Ticket Free</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
