'use client';

import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faCheck,
  faShieldCheck,
} from '@fortawesome/pro-solid-svg-icons';
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons';

type Testimonial = {
  quote: string;
  name: string;
  location: string;
  saved: number;
  timeAgo: string;
};

const testimonials: Testimonial[] = [
  {
    quote:
      'I was about to pay a £130 Westminster fine until I tried this. The AI letter was so professional - they cancelled it in 3 days!',
    name: 'Sarah M.',
    location: 'Manchester',
    saved: 130,
    timeAgo: '2 weeks ago',
  },
  {
    quote:
      'The PE3 form was already filled out with my signature. All I had to do was send it. Brilliant.',
    name: 'James K.',
    location: 'Bristol',
    saved: 65,
    timeAgo: '1 week ago',
  },
  {
    quote:
      'Deadline reminders literally saved me. I had no idea I only had 14 days before it doubled!',
    name: 'Priya S.',
    location: 'London',
    saved: 110,
    timeAgo: '3 weeks ago',
  },
  {
    quote:
      'Used it for two TfL tickets. Both cancelled. The tribunal case analysis is genuinely useful.',
    name: 'Tom D.',
    location: 'Birmingham',
    saved: 180,
    timeAgo: '1 month ago',
  },
  {
    quote:
      'Better than any solicitor and a fraction of the price. The auto-submit feature is magic.',
    name: 'Emma L.',
    location: 'Leeds',
    saved: 70,
    timeAgo: '2 weeks ago',
  },
  {
    quote:
      'I was skeptical AI could help with legal stuff. The TE7 form it generated was perfect.',
    name: 'Michael R.',
    location: 'Edinburgh',
    saved: 95,
    timeAgo: '3 weeks ago',
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

const cardHover = {
  y: -4,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  transition: { duration: 0.2 },
};

const Testimonials = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="testimonials" ref={ref} className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6">
        {/* Header with Rating */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeUpVariants}
          className="mb-16 flex flex-col items-center justify-between gap-8 md:flex-row"
        >
          {/* Rating */}
          <div className="flex items-center gap-4">
            <span className="text-5xl font-extrabold text-dark">4.9</span>
            <div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStar}
                    className="text-amber"
                  />
                ))}
              </div>
              <p className="mt-1 text-sm text-gray">from 2,847 reviews</p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0">
              <FontAwesomeIcon
                icon={faShieldCheck}
                className="text-2xl text-[#00b67a]"
              />
              <span className="text-sm font-medium text-dark">Trustpilot</span>
            </div>
            <div className="flex items-center gap-2 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0">
              <FontAwesomeIcon icon={faApple} className="text-2xl" />
              <span className="text-sm font-medium text-dark">App Store</span>
            </div>
            <div className="flex items-center gap-2 opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0">
              <FontAwesomeIcon icon={faGooglePlay} className="text-xl" />
              <span className="text-sm font-medium text-dark">Google Play</span>
            </div>
          </div>
        </motion.div>

        {/* Testimonial Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={fadeUpVariants}
              transition={{ delay: index * 0.1 }}
              whileHover={cardHover}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]"
            >
              {/* Stars */}
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStar}
                    className="text-sm text-amber"
                  />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="mt-4 flex-1 text-base italic text-dark">
                {`"${testimonial.quote}"`}
              </blockquote>

              {/* Divider */}
              <div className="my-4 h-px bg-border" />

              {/* Author */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-dark">{testimonial.name}</p>
                  <p className="text-sm text-gray">{testimonial.location}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                    <FontAwesomeIcon icon={faCheck} />
                    Saved £{testimonial.saved}
                  </span>
                  <p className="mt-1 text-xs text-gray">
                    {testimonial.timeAgo}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
