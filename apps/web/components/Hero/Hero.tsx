'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { faBolt, faCheck } from '@fortawesome/pro-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

const HERO_VIDEOS = [
  '/videos/hero-london-01-box-junction.mp4',
  '/videos/hero-london-02-double-yellow-warden.mp4',
  '/videos/hero-london-03-bus-lane.mp4',
  '/videos/hero-london-04-resident-bay-permit.mp4',
];

const HERO_IMAGES = [
  '/images/hero-london-01-box-junction.png',
  '/images/hero-london-02-double-yellow-warden.png',
  '/images/hero-london-03-bus-lane.png',
  '/images/hero-london-04-resident-bay-permit.png',
];

const IMAGE_INTERVAL = 5000; // 5 seconds for mobile image carousel
const FADE_DURATION = 1500; // 1.5 second fade transition

const Hero = () => {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Handle video end - start next video and fade
  const handleVideoEnded = (index: number) => {
    if (index !== activeVideoIndex) return;

    const nextIndex = (index + 1) % HERO_VIDEOS.length;

    // Start playing the next video before transitioning
    const nextVideo = videoRefs.current[nextIndex];
    if (nextVideo) {
      nextVideo.currentTime = 0;
      nextVideo.play().catch(() => {});
    }

    setActiveVideoIndex(nextIndex);
  };

  // Initial setup - play first video and preload others
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === 0) {
          video.play().catch(() => {});
        } else {
          // Preload other videos
          video.load();
        }
      }
    });
  }, []);

  // Image carousel for mobile - cycle every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, IMAGE_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-[100dvh] w-[calc(100%+2rem)] -mx-4 -mt-[72px] overflow-hidden">
      {/* Desktop Video Background - All videos stacked, toggle opacity */}
      <div className="absolute inset-0 hidden md:block bg-black">
        {HERO_VIDEOS.map((src, index) => (
          <video
            key={src}
            ref={(el) => {
              videoRefs.current[index] = el;
            }}
            className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
            style={{
              transitionDuration: `${FADE_DURATION}ms`,
              opacity: index === activeVideoIndex ? 1 : 0,
              zIndex: index === activeVideoIndex ? 1 : 0,
            }}
            muted
            playsInline
            preload="auto"
            onEnded={() => handleVideoEnded(index)}
          >
            <source src={src} type="video/mp4" />
          </video>
        ))}
      </div>

      {/* Mobile Image Background */}
      <div className="absolute inset-0 md:hidden bg-black">
        {HERO_IMAGES.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={`London parking scene ${index + 1}`}
            fill
            priority={index === 0}
            className="object-cover transition-opacity ease-in-out"
            style={{
              transitionDuration: `${FADE_DURATION}ms`,
              opacity: index === currentImageIndex ? 1 : 0,
            }}
          />
        ))}
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50 z-[2]" />

      {/* Content Overlay */}
      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <div className="flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
            <span className="relative inline-block">
              Don&apos;t
              <span className="absolute -bottom-1 left-0 h-[5px] w-full -rotate-1 animate-draw-line bg-red-500" />
            </span>{' '}
            pay that{' '}
            <span className="mx-1 rounded-md bg-parking-ticket-yellow px-2 py-1 leading-loose text-black">
              ticket
            </span>{' '}
            yet
          </h1>

          <p className="mt-6 max-w-xl text-lg text-white/90 md:text-xl">
            Don&apos;t just pay it - challenge it with AI in minutes. Upload
            your ticket, get a solid legal appeal letter, and we&apos;ll even
            submit it for you.
          </p>

          <ul className="mt-8 flex flex-col gap-y-3 text-left text-base text-white/90">
            <li className="flex items-center">
              <FontAwesomeIcon
                icon={faCheck}
                size="lg"
                className="mr-3 text-green-400"
              />
              Works for both council & private PCNs
            </li>
            <li className="flex items-center">
              <FontAwesomeIcon
                icon={faCheck}
                size="lg"
                className="mr-3 text-green-400"
              />
              Tracks deadlines and sends reminders
            </li>
            <li className="flex items-center">
              <FontAwesomeIcon
                icon={faCheck}
                size="lg"
                className="mr-3 text-green-400"
              />
              Over 70% of appeals succeed at tribunal
            </li>
          </ul>

          <div className="mt-10 flex flex-col items-center gap-2">
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
            <p className="mt-2 text-sm text-white/80">
              <span className="font-bold uppercase underline">Free</span> to add
              a ticket. Upgrades from £2.99.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
