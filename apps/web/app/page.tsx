import Hero from '@/components/Hero/Hero';
import {
  StatsBar,
  ProblemSection,
  HowItWorksSection,
  FeaturesSection,
  NotificationSection,
  Testimonials,
  Authorities,
  FAQSection,
  Newsletter,
  FinalCTA,
} from '@/components/landing';

const HomePage = () => (
  <>
    {/* Hero takes full viewport - no padding */}
    <Hero />
    <StatsBar />
    <ProblemSection />
    <HowItWorksSection />
    <FeaturesSection />
    <NotificationSection />
    <Testimonials />
    <Authorities />
    <FAQSection />
    <Newsletter />
    <FinalCTA />
  </>
);

export default HomePage;
