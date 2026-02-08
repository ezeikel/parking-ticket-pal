import type { Metadata } from 'next';
import { bailiffTemplates } from '@/data/templates';
import BailiffTemplateClient from './BailiffTemplateClient';

type BailiffTemplatePageProps = {
  params: Promise<{ templateId: string }>;
};

export async function generateMetadata({
  params,
}: BailiffTemplatePageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = bailiffTemplates.find((t) => t.id === templateId);

  if (!template) {
    return {
      title: 'Template Not Found | Parking Ticket Pal',
    };
  }

  return {
    title: `${template.title} | Free Bailiff Response Template | Parking Ticket Pal`,
    description: `${template.description} Download this free template to respond to bailiffs effectively.`,
    keywords: [
      template.title.toLowerCase(),
      'bailiff response letter',
      'enforcement agent letter',
      'free bailiff template',
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
  return bailiffTemplates.map((template) => ({
    templateId: template.id,
  }));
}

const BailiffTemplatePage = async ({ params }: BailiffTemplatePageProps) => {
  const { templateId } = await params;
  return <BailiffTemplateClient templateId={templateId} />;
};

export default BailiffTemplatePage;
