import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuoteLeft,
  faStar as faStarOutline,
} from '@fortawesome/pro-regular-svg-icons';
import { faStar } from '@fortawesome/pro-solid-svg-icons';

const testimonials = [
  {
    name: 'Temi B.',
    location: 'Lewisham, London',
    quote:
      'Saved £65 in literally 2 minutes flat. The AI appeal was spot on. Worth every single penny!',
    avatarUrl: '/images/testimonials/temi.png',
    rating: 5,
  },
  {
    name: 'Maria S.',
    location: 'Croydon, London',
    quote:
      'I was so stressed and just ready to pay the fine to get it over with. Your tool gave me the confidence to appeal, and it worked! Thank you so much!',
    avatarUrl: '/images/testimonials/maria.png',
    rating: 5,
  },
  {
    name: 'David K.',
    location: 'Hackney, London',
    quote:
      'The deadline reminders alone are a lifesaver. Plus, understanding the jargon on these tickets is a nightmare – Parking Ticket Pal made it simple.',
    avatarUrl: '/images/testimonials/david.png',
    rating: 4,
  },
];

const SocialProof = () => (
  <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-800/30">
    <div className="container mx-auto px-4 md:px-6 max-w-5xl">
      <div className="text-center mb-12 md:mb-16">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-800 dark:text-slate-100">
          Don&apos;t Just Take Our Word For It
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          See how Parking Ticket Pal is helping drivers across the UK fight
          unfair fines and save money.
        </p>
      </div>

      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col"
          >
            <div className="flex items-center mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <FontAwesomeIcon
                  icon={i < testimonial.rating ? faStar : faStarOutline}
                  size="lg"
                  key={i}
                  className={`${i < testimonial.rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
                />
              ))}
            </div>
            <FontAwesomeIcon
              icon={faQuoteLeft}
              size="2x"
              className="text-primary mb-4 opacity-50"
            />
            <blockquote className="text-slate-700 dark:text-slate-300 italic text-base md:text-lg leading-relaxed mb-6 flex-grow">
              &quot;{testimonial.quote}&quot;
            </blockquote>
            <div className="flex items-center mt-auto">
              <Image
                src={testimonial.avatarUrl || '/images/placeholder.svg'}
                alt={`${testimonial.name} profile picture`}
                className="h-12 w-12 rounded-full mr-4 object-cover bg-slate-200 dark:bg-slate-700"
                height={48}
                width={48}
              />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {testimonial.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.location}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default SocialProof;
