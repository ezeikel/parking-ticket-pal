import Hero from '@/components/Hero/Hero';
import ProblemPain from '@/components/ProblemPain/ProblemPain';
import HowItWorks from '@/components/HowItWorks/HowItWorks';
import PricingTeaser from '@/components/PricingTeaser/PricingTeaser';
import SocialProof from '@/components/SocialProof/SocialProof';
import FakeNotifications from '@/components/FakeNotications/FakeNotications';
// import FinalCTA from '@/components/FinalCTA/FinalCTA';

const HomePage = () => (
  <>
    <div className="flex flex-col gap-12 md:gap-16 pb-12 pt-12 md:pt-24">
      <Hero />
      <ProblemPain />
      <HowItWorks />
      <PricingTeaser />
      <SocialProof />
      {/* <FinalCTA /> */}
    </div>
    <FakeNotifications />
  </>
);

export default HomePage;
