'use client';

import { signIn } from 'next-auth/react';
import { faBolt, faCheck } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const Hero = () => (
  <section className="flex flex-col md:flex-row gap-12 max-w-7xl mx-auto">
    <Image
      alt="Happy adult Asian mother in car together with crop child"
      className="aspect-video overflow-hidden rounded-xl object-cover object-center order-first lg:order-last"
      height={310}
      src="/images/woman-parking-ticket.png"
      width={550}
    />
    <div className="flex flex-col justify-center space-y-4">
      <div className="flex flex-col gap-y-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="relative inline-block">
            Don&apos;t
            <span className="absolute -bottom-1 left-0 w-full h-[5px] bg-red-500 transform -rotate-1 animate-draw-line" />
          </span>{' '}
          pay that{' '}
          <span className="bg-parking-ticket-yellow text-black px-2 py-1 rounded-md mx-1 leading-loose">
            ticket
          </span>{' '}
          yet
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Don&apos;t just pay it — challenge it with AI in minutes. Upload your
          ticket, get a solid legal appeal letter, and we&apos;ll even submit it
          for you.
        </p>
        <ul className="flex flex-col gap-y-2 text-muted-foreground text-base">
          <li>
            <FontAwesomeIcon
              icon={faCheck}
              size="lg"
              className="mr-2 text-green-600"
            />
            Works for both council & private PCNs
          </li>
          <li>
            <FontAwesomeIcon
              icon={faCheck}
              size="lg"
              className="mr-2 text-green-600"
            />
            Tracks deadlines and sends reminders
          </li>
          <li>
            <FontAwesomeIcon
              icon={faCheck}
              size="lg"
              className="mr-2 text-green-600"
            />
            Over 70% of appeals succeed at tribunal
          </li>
        </ul>
        <div className="flex flex-col gap-1">
          <Button
            onClick={() => signIn('google')}
            className="w-3xs px-6 py-6 bg-parking-teal text-white font-semibold text-md cursor-pointer"
          >
            <FontAwesomeIcon
              icon={faBolt}
              size="lg"
              className="text-yellow-300"
            />
            <span>Try It Out</span>
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-bold uppercase underline">Free</span> to add a
            ticket. Upgrades from £2.99.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
