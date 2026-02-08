import type { Metadata } from 'next';
import JsonLd, {
  createBreadcrumbSchema,
  createFAQSchema,
} from '@/components/JsonLd/JsonLd';

export const metadata: Metadata = {
  title: 'UK Parking Contravention Codes | Full List & Meanings | Parking Ticket Pal',
  description:
    'Look up UK PCN contravention codes and what they mean. Complete list of on-street parking, off-street car park, and moving traffic codes with penalty levels.',
  keywords: [
    'contravention code',
    'pcn code',
    'parking code meaning',
    'pcn contravention',
    'parking fine code',
    'penalty charge notice code',
    'parking ticket code lookup',
    'what does pcn code mean',
  ],
  openGraph: {
    title: 'UK Parking Contravention Codes',
    description:
      'Look up what your PCN code means. Complete list of UK parking contravention codes.',
    type: 'website',
  },
};

type ContraventionCodesLayoutProps = {
  children: React.ReactNode;
};

const ContraventionCodesLayout = ({ children }: ContraventionCodesLayoutProps) => {
  const breadcrumbData = createBreadcrumbSchema([
    { name: 'Home', url: 'https://parkingticketpal.co.uk' },
    { name: 'Tools', url: 'https://parkingticketpal.co.uk/tools' },
    { name: 'Contravention Codes', url: 'https://parkingticketpal.co.uk/tools/reference/contravention-codes' },
  ]);

  const faqData = createFAQSchema([
    {
      question: 'What is a contravention code?',
      answer: 'A contravention code is a 2-digit number on your PCN that identifies the specific parking offence. Each code corresponds to a different type of parking violation.',
    },
    {
      question: 'What do the suffixes mean on a PCN code?',
      answer: 'Suffixes (like "a", "j", "c") provide additional detail about where or how the contravention occurred. For example, suffix "j" typically means a loading bay.',
    },
    {
      question: 'What is the difference between higher and lower penalty levels?',
      answer: 'Higher level penalties are for more serious contraventions (like parking on double yellow lines) and cost more. Lower level penalties are for less serious offences (like overstaying in a car park).',
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbData} />
      <JsonLd data={faqData} />
      {children}
    </>
  );
};

export default ContraventionCodesLayout;
