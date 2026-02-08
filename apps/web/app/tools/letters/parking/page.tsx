'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faArrowLeft, faEnvelope } from '@fortawesome/pro-solid-svg-icons';
import TemplateCard from '@/components/tools/letters/TemplateCard';
import { parkingTemplates } from '@/data/templates';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const ParkingTemplatesPage = () => {
  const heroRef = useRef(null);
  const templatesRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true });
  const templatesInView = useInView(templatesRef, {
    once: true,
    margin: '-100px',
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section ref={heroRef} className="bg-light py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Breadcrumb */}
          <motion.div
            initial="hidden"
            animate={heroInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-8"
          >
            <Link
              href="/tools/letters"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Letter Templates
            </Link>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={heroInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="text-center"
          >
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-teal/10">
              <FontAwesomeIcon icon={faGavel} className="text-2xl text-teal" />
            </div>
            <h1 className="text-3xl font-bold text-dark md:text-4xl">
              Parking Appeal Letter Templates
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-gray">
              Free templates for challenging parking tickets at every stage of
              the appeal process. From informal challenges to tribunal appeals.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Templates Grid */}
      <section ref={templatesRef} className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {parkingTemplates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                isInView={templatesInView}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-16 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Want a Personalised Letter?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray">
            Our AI writes custom appeal letters tailored to your specific ticket
            and circumstances, using arguments that have won at tribunal.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            <FontAwesomeIcon icon={faEnvelope} />
            Upload Your Ticket
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ParkingTemplatesPage;
