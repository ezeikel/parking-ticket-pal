'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const ProblemPain = () => {
  const painPoints = [
    {
      illustration: '/illustrations/1-crushing-deadlines.png',
      title: 'Crushing Deadlines',
      description:
        "You're up against the clock: just 14 days before the fine often doubles, adding to the stress.",
    },
    {
      illustration: '/illustrations/2-intentionally-confusing.png',
      title: 'Intentionally Confusing',
      description:
        'The appeals process feels like a maze, designed to make you stumble and give up.',
    },
    {
      illustration: '/illustrations/3-uncertain-chances.png',
      title: 'Uncertain Chances',
      description:
        "You're left guessing: Is an appeal worth it? Do I even have a case? The doubt is paralyzing.",
    },
  ];

  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  console.log('painPoints', painPoints);

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-gray-50 dark:bg-slate-800/30"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-4 leading-tight">
          Parking Tickets Are{' '}
          <span className="text-parking-teal">Designed</span> To Defeat You
        </h2>
        <p className="text-center text-muted-foreground text-lg md:text-xl mb-12 md:mb-16 max-w-2xl mx-auto">
          The system is stacked against you. Here&apos;s how they make it
          deliberately difficult.
        </p>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {painPoints.map((point, index) => (
            <div
              key={point.title}
              className={`flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1 ${isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
                }`}
              style={{
                transitionDelay: isVisible ? `${index * 150}ms` : '0ms',
              }}
            >
              <div className="relative w-full aspect-square overflow-hidden">
                <Image
                  src={point.illustration}
                  alt={point.title}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">
                  {point.title}
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 md:mt-24 text-center max-w-4xl mx-auto">
          <h3 className="font-bold tracking-tight text-2xl sm:text-3xl md:text-4xl mb-6">
            That&apos;s Where{' '}
            <span className="bg-parking-teal text-white font-display px-3 py-1.5 rounded-lg whitespace-nowrap">
              Parking Ticket Pal
            </span>{' '}
            Steps In
          </h3>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Stop feeling overwhelmed. Upload a photo of your ticket, and our
            AI-powered platform analyses your case, crafts compelling appeal
            letters, and guides you every step of the way.{' '}
            <strong className="text-parking-teal font-semibold">
              Turn the tables on unfair fines.
            </strong>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProblemPain;
