'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGavel, faArrowLeft, faEnvelope } from '@fortawesome/pro-solid-svg-icons';
import TemplateViewer from '@/components/tools/letters/TemplateViewer';
import { parkingTemplates } from '@/data/templates';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

type ParkingTemplateClientProps = {
  templateId: string;
};

const ParkingTemplateClient = ({ templateId }: ParkingTemplateClientProps) => {
  const template = parkingTemplates.find((t) => t.id === templateId);

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  if (!template) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section ref={heroRef} className="bg-light py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6">
          {/* Breadcrumb */}
          <motion.div
            initial="hidden"
            animate={heroInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
            className="mb-6"
          >
            <Link
              href="/tools/letters/parking"
              className="inline-flex items-center gap-2 text-sm text-gray hover:text-teal"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Parking Templates
            </Link>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={heroInView ? 'visible' : 'hidden'}
            variants={fadeUpVariants}
          >
            <div className="flex items-center gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-teal/10">
                <FontAwesomeIcon icon={faGavel} className="text-xl text-teal" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark md:text-3xl">
                  {template.title}
                </h1>
                <p className="mt-1 text-gray">{template.description}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Template Content */}
      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto max-w-[900px] px-6">
          {/* When to Use */}
          <div className="mb-8 rounded-xl bg-light p-6">
            <h2 className="font-bold text-dark">When to use this template</h2>
            <ul className="mt-3 space-y-2">
              {template.whenToUse.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Template Viewer */}
          <TemplateViewer template={template} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-dark py-12 md:py-16">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <h2 className="text-xl font-bold text-white md:text-2xl">
            Want a Personalised Letter?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-gray">
            Our AI writes custom appeal letters tailored to your specific ticket,
            using arguments that have won at tribunal.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            <FontAwesomeIcon icon={faEnvelope} />
            Upload Your Ticket
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ParkingTemplateClient;
