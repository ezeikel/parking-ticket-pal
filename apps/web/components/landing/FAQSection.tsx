'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FAQ = {
  question: string;
  answer: string;
};

const faqs: FAQ[] = [
  {
    question: 'What types of tickets can you help with?',
    answer:
      'We support council PCNs (Penalty Charge Notices), TfL tickets, and private parking charges from companies like APCOA and UK Parking Control. Our system covers 30+ contravention codes across all major UK parking violations.',
  },
  {
    question: 'How does the AI know my appeal will succeed?',
    answer:
      "We've analyzed thousands of real tribunal decisions from London and other UK tribunals. For each contravention code, we know what arguments have worked historically and use that to both predict your success rate and craft your appeal letter.",
  },
  {
    question: 'What are PE2, PE3, TE7, and TE9 forms?',
    answer:
      'These are official appeal forms used at different stages. PE2 is your initial formal representation, PE3 is for appealing a rejection, TE7 is for tribunal appeals, and TE9 is for out-of-time applications. We pre-fill all of these for you.',
  },
  {
    question: 'Can you actually submit the appeal for me?',
    answer:
      "Yes! For supported councils (Lewisham, Horizon Parking authorities, and more), our Premium tier uses browser automation to submit your challenge directly on the council's website. For others, we generate the forms and letters for you to submit.",
  },
  {
    question: 'What if my appeal fails?',
    answer:
      "If your Standard or Premium appeal is rejected and you followed our process, we offer a money-back guarantee. Plus, we'll help you escalate to tribunal (TE7 form) if you want to continue fighting.",
  },
  {
    question: 'How long does the process take?',
    answer:
      'Uploading and generating your appeal letter takes about 2 minutes. Council response times vary from 2 days to 8 weeks depending on the authority.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes. We use bank-level encryption, never share your data with third parties, and comply with UK GDPR. Your ticket images and personal details are stored securely and deleted upon request.',
  },
  {
    question: 'Do I need to create an account?',
    answer:
      "You can upload and analyze a ticket without an account, but you'll need one to save your tickets, track deadlines, and access premium features.",
  },
];

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
            {faqs.map((faq, index) => (
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
