'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/pro-solid-svg-icons';
import { Button } from '@/components/ui/button';

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const FinalCTA = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section ref={ref} className="bg-dark py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="flex flex-col items-center"
        >
          {/* Headline */}
          <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-[40px]">
            Your deadline is already counting down.
          </h2>
          <p className="mt-4 text-lg text-white/70">
            {
              'Upload your ticket now — it takes less than 30 seconds to see your options and protect yourself from a fine increase.'
            }
          </p>

          {/* CTA Button */}
          <motion.div
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: 'reverse',
            }}
          >
            <Button
              size="lg"
              onClick={scrollToHero}
              className="mt-8 h-14 gap-2 bg-teal px-8 text-lg font-semibold text-white hover:bg-teal-dark"
            >
              <FontAwesomeIcon icon={faCamera} />
              Upload Your Ticket Now
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
