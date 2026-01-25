'use client';

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faEye } from '@fortawesome/pro-solid-svg-icons';
import type { Form } from '@parking-ticket-pal/db/types';

type GeneratedFormsCardProps = {
  forms: Pick<Form, 'id' | 'formType' | 'fileName' | 'fileUrl' | 'createdAt'>[];
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getFormDescription = (formType: string): string => {
  const descriptions: Record<string, string> = {
    TE7: 'Notice of Appeal to Traffic Penalty Tribunal',
    TE9: 'Witness Statement for Tribunal',
    PE2: 'Informal Representation Form',
    PE3: 'Formal Representation Form',
  };
  return descriptions[formType] || `${formType} Form`;
};

const GeneratedFormsCard = ({ forms }: GeneratedFormsCardProps) => {
  if (forms.length === 0) {
    return null;
  }

  // Group forms by type and get the latest of each
  const latestFormsByType = forms.reduce(
    (acc, form) => {
      const existing = acc[form.formType];
      if (!existing || new Date(form.createdAt) > new Date(existing.createdAt)) {
        acc[form.formType] = form;
      }
      return acc;
    },
    {} as Record<string, (typeof forms)[0]>,
  );

  const uniqueForms = Object.values(latestFormsByType).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <h2 className="text-lg font-semibold text-dark">Generated Forms</h2>

      <p className="mt-2 text-sm text-gray">
        {forms.length === 1
          ? '1 appeal form has been generated'
          : `${forms.length} appeal forms have been generated`}
      </p>

      <div className="mt-4 space-y-3">
        {uniqueForms.map((form) => (
          <div
            key={form.id}
            className="flex items-center justify-between rounded-lg border border-border bg-light/50 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-dark">{form.formType}</p>
              <p className="truncate text-sm text-gray">
                {getFormDescription(form.formType)}
              </p>
              <p className="mt-1 text-xs text-gray/70">
                Generated {formatDate(form.createdAt)}
              </p>
            </div>
            <div className="ml-3 flex gap-2">
              <a
                href={form.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray transition-colors hover:bg-teal hover:text-white"
                title="View"
              >
                <FontAwesomeIcon icon={faEye} className="text-sm" />
              </a>
              <a
                href={form.fileUrl}
                download={form.fileName}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray transition-colors hover:bg-teal hover:text-white"
                title="Download"
              >
                <FontAwesomeIcon icon={faDownload} className="text-sm" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {forms.length > uniqueForms.length && (
        <p className="mt-3 text-center text-xs text-gray">
          Showing latest version of each form type ({forms.length} total
          generated)
        </p>
      )}
    </motion.div>
  );
};

export default GeneratedFormsCard;
