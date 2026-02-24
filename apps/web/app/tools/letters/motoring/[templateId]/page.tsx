import type { Metadata } from 'next';
import { motoringTemplates } from '@/data/templates';
import JsonLd, {
  createFAQSchema,
  createHowToSchema,
  createBreadcrumbSchema,
} from '@/components/JsonLd/JsonLd';
import MotoringTemplateClient from './MotoringTemplateClient';

type MotoringTemplatePageProps = {
  params: Promise<{ templateId: string }>;
};

export async function generateMetadata({
  params,
}: MotoringTemplatePageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = motoringTemplates.find((t) => t.id === templateId);

  if (!template) {
    return {
      title: 'Template Not Found | Parking Ticket Pal',
    };
  }

  return {
    title: `${template.title} | Free Motoring Letter Template | Parking Ticket Pal`,
    description: `${template.description} Download this free template to handle your motoring matter.`,
    keywords: [
      template.title.toLowerCase(),
      'motoring letter template',
      'dvla letter',
      'free motoring template',
      ...template.title.toLowerCase().split(' '),
    ],
    openGraph: {
      title: template.title,
      description: template.description,
      type: 'website',
    },
  };
}

export function generateStaticParams() {
  return motoringTemplates.map((template) => ({
    templateId: template.id,
  }));
}

const MotoringTemplatePage = async ({ params }: MotoringTemplatePageProps) => {
  const { templateId } = await params;
  const template = motoringTemplates.find((t) => t.id === templateId);

  const faqs = template
    ? [
        {
          question: `Is the ${template.title} free?`,
          answer:
            'Yes, this letter template is completely free to use. Fill in your details, preview the letter, and get it sent to your email as a PDF.',
        },
        {
          question: `How do I use the ${template.title}?`,
          answer:
            'Fill in the required fields with your details, preview the completed letter, then click "Get Letter via Email" to receive a ready-to-send PDF.',
        },
        {
          question: 'Will this template work for my situation?',
          answer: `${template.whenToUse.join('. ')}.`,
        },
      ]
    : [];

  const howToSteps = template
    ? [
        {
          name: 'Fill in your details',
          text: 'Enter your personal details and the specifics of your motoring matter into the template fields.',
        },
        {
          name: 'Preview the letter',
          text: 'Review the completed letter to ensure all details are accurate and relevant to your situation.',
        },
        {
          name: 'Get it via email',
          text: 'Click "Get Letter via Email", enter your email address, and receive a professionally formatted PDF.',
        },
        {
          name: 'Print and send',
          text: 'Print the letter and send it to the relevant authority, keeping a copy for your records.',
        },
      ]
    : [];

  const breadcrumbs = template
    ? [
        { name: 'Home', url: 'https://parkingticketpal.co.uk' },
        { name: 'Tools', url: 'https://parkingticketpal.co.uk/tools' },
        {
          name: 'Letter Templates',
          url: 'https://parkingticketpal.co.uk/tools/letters',
        },
        {
          name: 'Motoring Letters',
          url: 'https://parkingticketpal.co.uk/tools/letters/motoring',
        },
        {
          name: template.title,
          url: `https://parkingticketpal.co.uk/tools/letters/motoring/${template.id}`,
        },
      ]
    : [];

  return (
    <>
      {template && (
        <>
          <JsonLd data={createFAQSchema(faqs)} />
          <JsonLd
            data={createHowToSchema(
              `How to use the ${template.title}`,
              `Step-by-step guide to using the free ${template.title} for your motoring matter.`,
              howToSteps,
            )}
          />
          <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />
        </>
      )}
      <MotoringTemplateClient templateId={templateId} />
    </>
  );
};

export default MotoringTemplatePage;
