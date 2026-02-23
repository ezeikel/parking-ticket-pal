import Hero from '@/components/Hero/Hero';
import StatsBar from '@/components/landing/StatsBar';
import ProblemSection from '@/components/landing/ProblemSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import NotificationSection from '@/components/landing/NotificationSection';
import Testimonials from '@/components/landing/Testimonials';
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
    <Testimonials />
    <Authorities />
    <FAQSection />
    <Newsletter />
    <FinalCTA />
  </>
);

export default HomePage;
