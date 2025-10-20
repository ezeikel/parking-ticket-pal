'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const HowItWorks = () => {
  const steps = [
    {
      id: 'upload',
      stepNumber: '01',
      illustration: '/illustrations/1-upload-ticket.png',
      title: 'Upload Your Ticket',
      description:
        'Simply snap clear photos of the front and back of your parking ticket. Our system makes it quick and easy.',
    },
    {
      id: 'analysis',
      stepNumber: '02',
      illustration: '/illustrations/2-ai-helper.png',
      title: 'AI-Powered Analysis',
      description:
        "Our intelligent AI analyses your ticket's details, contravention code, and relevant legal precedents to draft a strong, customised appeal letter.",
    },
    {
      id: 'success',
      stepNumber: '03',
      illustration: '/illustrations/3-success.png',
      title: 'Review & Submit',
      description:
        'Review your personalised appeal and submit it directly. We track deadlines and keep you updated on your appeal status.',
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

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-white dark:bg-slate-900"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-4 leading-tight text-slate-900 dark:text-slate-100">
          How It Works
        </h2>
        <p className="text-center text-muted-foreground text-lg md:text-xl mb-12 md:mb-16 max-w-2xl mx-auto">
          Get from parking ticket to strong appeal in three simple steps.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex flex-col overflow-hidden rounded-2xl bg-gray-50 dark:bg-slate-800/50 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 150}ms` : '0ms',
              }}
            >
              <div className="relative w-full aspect-square overflow-hidden">
                <Image
                  src={step.illustration}
                  alt={step.title}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-parking-teal/10 mb-4">
                  <span className="text-2xl font-bold text-parking-teal">
                    {step.stepNumber}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 md:mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-parking-teal/10 text-parking-teal font-semibold text-sm mb-6">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Fast & Simple
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Most users complete the entire process in under 10 minutes. Our AI
            handles the complexity while you stay in control.{' '}
            <strong className="text-slate-900 dark:text-slate-100 font-semibold">
              Start fighting back today.
            </strong>
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
