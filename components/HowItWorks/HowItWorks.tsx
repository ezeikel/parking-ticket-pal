import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarLines,
  faCamera,
  faCircleCheck,
  faPaperPlane,
  faSparkles,
} from '@fortawesome/pro-regular-svg-icons';

const HowItWorks = () => {
  const steps = [
    {
      icon: faCamera,
      title: '1. Upload Your Ticket',
      description:
        'Simply snap clear photos of the front and back of your parking ticket. Our system makes it quick and easy.',
    },
    {
      icon: faSparkles,
      title: '2. AI-Powered Analysis & Draft',
      description:
        "Our intelligent AI gets to work, analysing your ticket's details, contravention code, and relevant legal precedents to draft a strong, customised appeal letter.",
    },
    {
      icon: faPaperPlane,
      title: '3. Review & Submit',
      description:
        'Review your personalised appeal. You can then submit it directly, or for many common fines, let us handle the submission process for you.',
    },
    {
      icon: faCalendarLines,
      title: '4. Track Deadlines & Get Reminders',
      description:
        "Forget stressing about dates. We monitor crucial deadlines and send you timely SMS or email reminders so you're always in the loop.",
    },
    {
      icon: faCircleCheck,
      title: '5. Receive Your Outcome',
      description:
        'Get notified of the decision on your appeal. Many users successfully challenge their fines and end up paying nothing!',
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-800/30">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center mb-12 md:mb-16 leading-tight text-slate-800 dark:text-slate-100">
          How It Works
        </h2>
        <div className="flex flex-col gap-y-10 md:gap-y-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-center md:items-start gap-6 md:gap-8 p-6 rounded-lg bg-white dark:bg-slate-800/50 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex-shrink-0 flex items-center justify-center size-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4 sm:mb-0">
                <FontAwesomeIcon icon={step.icon} size="2xl" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl md:text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
