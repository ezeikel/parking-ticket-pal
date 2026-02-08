'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faFileLines } from '@fortawesome/pro-solid-svg-icons';
import type { LetterTemplate } from '@/data/templates';

type TemplateCardProps = {
  template: LetterTemplate;
  index?: number;
  isInView?: boolean;
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const cardHover = {
  y: -4,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  transition: { duration: 0.2 },
};

const TemplateCard = ({
  template,
  index = 0,
  isInView = true,
}: TemplateCardProps) => {
  return (
    <motion.div
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeUpVariants}
      transition={{ delay: index * 0.1 }}
      whileHover={cardHover}
    >
      <Link
        href={`/tools/letters/${template.category}/${template.id}`}
        className="group block h-full rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-light">
            <FontAwesomeIcon icon={faFileLines} className="text-xl text-dark" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-dark group-hover:text-teal">
              {template.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-gray">
              {template.description}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-gray">When to use:</p>
          <ul className="mt-2 space-y-1">
            {template.whenToUse.slice(0, 2).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal" />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal">
          View template
          <FontAwesomeIcon
            icon={faArrowRight}
            className="text-xs transition-transform group-hover:translate-x-1"
          />
        </div>
      </Link>
    </motion.div>
  );
};

export default TemplateCard;
