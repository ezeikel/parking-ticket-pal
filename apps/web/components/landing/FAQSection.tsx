'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HOMEPAGE_FAQS } from '@/lib/faq-data';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="faq" ref={ref} className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold text-dark md:text-4xl">
            Frequently Asked Questions
          </h2>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          transition={{ delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {HOMEPAGE_FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold text-dark hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-gray">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
