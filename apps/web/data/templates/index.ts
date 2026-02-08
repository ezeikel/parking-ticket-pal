import type { LetterTemplate, TemplateCollection } from './types';
import { parkingTemplates } from './parking';
import { bailiffTemplates } from './bailiff';
import { motoringTemplates } from './motoring';

export * from './types';
export { parkingTemplates } from './parking';
export { bailiffTemplates } from './bailiff';
export { motoringTemplates } from './motoring';

export const allTemplates: TemplateCollection = {
  parking: parkingTemplates,
  bailiff: bailiffTemplates,
  motoring: motoringTemplates,
};

export const getTemplateById = (id: string): LetterTemplate | undefined => {
  const allTemplatesList = [
    ...parkingTemplates,
    ...bailiffTemplates,
    ...motoringTemplates,
  ];
  return allTemplatesList.find((t) => t.id === id);
};

export const getTemplatesByCategory = (
  category: keyof TemplateCollection,
): LetterTemplate[] => {
  return allTemplates[category] || [];
};

export const templateCategoryInfo = {
  parking: {
    title: 'Parking Appeal Letters',
    description:
      'Free letter templates for challenging parking tickets at every stage of the appeal process.',
    icon: 'faGavel',
  },
  bailiff: {
    title: 'Bailiff Response Letters',
    description:
      'Templates for dealing with enforcement agents, disputing fees, and requesting payment plans.',
    icon: 'faScaleBalanced',
  },
  motoring: {
    title: 'General Motoring Letters',
    description:
      'Templates for DVLA matters, insurance disputes, dealer complaints, and more.',
    icon: 'faCar',
  },
};
