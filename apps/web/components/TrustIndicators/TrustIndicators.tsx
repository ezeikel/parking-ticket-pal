'use client';

import { useRef } from 'react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import LambethLogo from '@/components/svgs/operators/LambethLogo';
import LewishamLogo from '@/components/svgs/operators/LewishamLogo';
import TfLLogo from '@/components/svgs/operators/TfL';

type LogoComponentProps = {
  fill?: string;
  secondaryFill?: string;
  textFill?: string;
  width?: number;
  height?: number;
  className?: string;
};

type EntityLogo = {
  id: number;
  name: string;
  type: 'council' | 'private' | 'tfl';
  logoComponent: React.ComponentType<LogoComponentProps>;
};

const entityLogos: EntityLogo[] = [
  {
    id: 1,
    name: 'Lewisham Council',
    type: 'council',
    logoComponent: LewishamLogo,
  },
  {
    id: 2,
    name: 'Lambeth Council',
    type: 'tfl',
    logoComponent: LambethLogo,
  },
  {
    id: 3,
    name: 'Transport for London (TfL)',
    type: 'tfl',
    logoComponent: TfLLogo,
  },
  {
    id: 4,
    name: 'Lewisham Council',
    type: 'council',
    logoComponent: LewishamLogo,
  },
  {
    id: 5,
    name: 'Lambeth Council',
    type: 'tfl',
    logoComponent: LambethLogo,
  },
  {
    id: 6,
    name: 'Transport for London (TfL)',
    type: 'tfl',
    logoComponent: TfLLogo,
  },
];

const TrustIndicators = () => {
  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true }),
  );

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-12 md:mb-16 leading-tight text-slate-800 dark:text-slate-100">
            Supported Authorities & Operators
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400 sm:mt-4">
            Parking Ticket Pal helps you manage fines from a wide range of UK
            councils, private parking companies, and Transport for London (TfL).
          </p>
        </div>

        <Carousel
          plugins={[plugin.current]}
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent className="-ml-8">
            {entityLogos.map((logo) => {
              const LogoComponent = logo.logoComponent;
              const mutedColor = '#94A3B8';
              const props: LogoComponentProps = {};

              props.className = 'h-full w-auto max-h-1/4 md:max-h-1/2';

              if (logo.logoComponent === LewishamLogo) {
                props.fill = 'transparent';
                props.secondaryFill = mutedColor;
                props.textFill = mutedColor;
                props.className = 'h-full w-auto max-h-1/2';
              } else {
                props.fill = mutedColor;
                props.className = 'h-full w-auto max-h-1/4 md:max-h-1/2';
              }

              return (
                <CarouselItem
                  key={logo.id}
                  className="pl-8 basis-1/1 md:basis-1/3 lg:basis-1/4"
                >
                  <div className="flex items-center justify-center h-64">
                    <LogoComponent {...props} />
                    <span className="sr-only">{logo.name}</span>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t see a specific authority or operator?{' '}
          <a
            href="mailto:support@parkingticketpal.com"
            className="underline hover:text-primary"
          >
            Let us know
          </a>
          , we&apos;re always working to add more.
        </p>
      </div>
    </section>
  );
};

export default TrustIndicators;
