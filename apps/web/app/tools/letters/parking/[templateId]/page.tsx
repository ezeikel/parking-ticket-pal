import type { Metadata } from 'next';
import { parkingTemplates } from '@/data/templates';
import JsonLd, {
  createFAQSchema,
  createHowToSchema,
  createBreadcrumbSchema,
} from '@/components/JsonLd/JsonLd';
import ParkingTemplateClient from './ParkingTemplateClient';

type ParkingTemplatePageProps = {
  params: Promise<{ templateId: string }>;
};

export async function generateMetadata({
  params,
}: ParkingTemplatePageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = parkingTemplates.find((t) => t.id === templateId);

  if (!template) {
    return {
      title: 'Template Not Found | Parking Ticket Pal',
    };
  }

  return {
    title: `${template.title} | Free Parking Appeal Template | Parking Ticket Pal`,
    description: `${template.description} Download this free template to challenge your parking ticket.`,
    keywords: [
      template.title.toLowerCase(),
      'parking ticket appeal',
      'pcn challenge letter',
      'free parking template',
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
  return parkingTemplates.map((template) => ({
    templateId: template.id,
  }));
}

const ParkingTemplatePage = async ({ params }: ParkingTemplatePageProps) => {
  const { templateId } = await params;
  const template = parkingTemplates.find((t) => t.id === templateId);

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
            'Fill in the required fields with your details (name, address, PCN number, etc.), preview the completed letter, then click "Get Letter via Email" to receive a ready-to-send PDF.',
        },
        {
          question: 'Will this template work for my parking ticket?',
          answer: template.whenToUse.join(' '),
        },
      ]
    : [];

  const howToSteps = template
    ? [
        {
          name: 'Fill in your details',
          text: 'Enter your personal details, PCN number, and the specific grounds for your appeal into the template fields.',
        },
        {
          name: 'Preview the letter',
          text: 'Review the completed letter to make sure all details are correct and the arguments are relevant to your case.',
        },
        {
          name: 'Get it via email',
          text: 'Click "Get Letter via Email", enter your email address, and receive a professionally formatted PDF.',
        },
        {
          name: 'Print and send',
          text: 'Print the letter and send it to the issuing authority by post, or use the text to submit your appeal online.',
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
          name: 'Parking Appeals',
          url: 'https://parkingticketpal.co.uk/tools/letters/parking',
        },
        {
          name: template.title,
          url: `https://parkingticketpal.co.uk/tools/letters/parking/${template.id}`,
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
              `Step-by-step guide to using the free ${template.title} to challenge your parking ticket.`,
              howToSteps,
            )}
          />
          <JsonLd data={createBreadcrumbSchema(breadcrumbs)} />
        </>
      )}
      <ParkingTemplateClient templateId={templateId} />
    </>
  );
};

export default ParkingTemplatePage;
