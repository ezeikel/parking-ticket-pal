import Hero from '@/components/Hero/Hero';
import StatsBar from '@/components/landing/StatsBar';
import ProblemSection from '@/components/landing/ProblemSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import NotificationSection from '@/components/landing/NotificationSection';
// TODO: Add <Testimonials /> back once we have real user reviews
// import Testimonials from '@/components/landing/Testimonials';
import UseCases from '@/components/landing/UseCases';
import Authorities from '@/components/landing/Authorities';
import FAQSection from '@/components/landing/FAQSection';
import Newsletter from '@/components/landing/Newsletter';
import FinalCTA from '@/components/landing/FinalCTA';

const HomePage = () => (
  <>
    {/* Hero takes full viewport - no padding */}
    <Hero />
    <StatsBar />
    <ProblemSection />
    <HowItWorksSection />
    <FeaturesSection />
    <NotificationSection />
    <UseCases />
    <Authorities />
    <FAQSection />
    <Newsletter />
    <FinalCTA />
  </>
);

export default HomePage;
