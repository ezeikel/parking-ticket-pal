'use client';

import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { signIn } from 'next-auth/react';

const FinalCTA = () => (
  <section className="py-16 md:py-24 bg-slate-100 dark:bg-slate-800/60">
    {' '}
    {/* Light background for the whole section */}
    <div className="container mx-auto px-4 md:px-6">
      <div className="bg-white dark:bg-slate-900 text-center py-12 md:py-16 px-6 md:px-10 rounded-xl shadow-2xl max-w-4xl mx-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <Bot className="h-16 w-16 text-primary mx-auto mb-6" />{' '}
          {/* Icon color now primary for light background */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold font-slab leading-tight text-slate-800 dark:text-slate-100">
            Ready to Take Control?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Stop letting unfair fines dictate your day. Upload your ticket now,
            let our AI analyze it, and get your personalized appeal strategy in
            minutes.
          </p>
          <Button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            size="lg"
            className="text-lg px-8 py-3 h-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md transition-transform hover:scale-105" // Primary button
          >
            Challenge Your Fine Free
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            It&apos;s free to start. See your options before you decide on more
            help.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;
