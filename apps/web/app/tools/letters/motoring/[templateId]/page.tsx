import type { Metadata } from 'next';
import { motoringTemplates } from '@/data/templates';
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
  return <MotoringTemplateClient templateId={templateId} />;
};

export default MotoringTemplatePage;
