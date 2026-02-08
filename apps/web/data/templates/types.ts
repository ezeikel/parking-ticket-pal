export type TemplateCategory = 'parking' | 'bailiff' | 'motoring';

export type PlaceholderInputType =
  | 'text'
  | 'address'
  | 'date'
  | 'textarea'
  | 'statutory-grounds'
  | 'currency';

export type TemplatePlaceholder = {
  key: string;
  label: string;
  description: string;
  example: string;
  required: boolean;
  inputType?: PlaceholderInputType;
};

export type LetterTemplate = {
  id: string;
  title: string;
  shortTitle: string;
  category: TemplateCategory;
  description: string;
  whenToUse: string[];
  tips: string[];
  placeholders: TemplatePlaceholder[];
  content: string;
  legalDisclaimer?: string;
};

export type TemplateCollection = {
  parking: LetterTemplate[];
  bailiff: LetterTemplate[];
  motoring: LetterTemplate[];
};
