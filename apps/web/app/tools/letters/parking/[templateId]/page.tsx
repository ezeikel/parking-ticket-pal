import type { Metadata } from 'next';
import { parkingTemplates } from '@/data/templates';
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
  return <ParkingTemplateClient templateId={templateId} />;
};

export default ParkingTemplatePage;
