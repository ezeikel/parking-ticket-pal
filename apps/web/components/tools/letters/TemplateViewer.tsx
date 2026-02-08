'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLightbulb,
  faTriangleExclamation,
  faEnvelope,
  faCalendarDays,
} from '@fortawesome/pro-solid-svg-icons';
import { format } from 'date-fns';
import type {
  LetterTemplate,
  TemplatePlaceholder,
  PlaceholderInputType,
} from '@/data/templates';
import EmailCaptureModal from './EmailCaptureModal';
import { sendFreeLetterEmail } from '@/app/actions/tools';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import AddressInput from '@/components/forms/inputs/AddressInput';
import StatutoryGroundsSelect from '@/components/forms/inputs/StatutoryGroundsSelect';
import { formatStatutoryGrounds } from '@/constants/statutory-grounds';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import type { Address } from '@parking-ticket-pal/types';
import cn from '@/utils/cn';

type TemplateViewerProps = {
  template: LetterTemplate;
};

// Helper to format UK date with ordinal suffix
const formatDateWithOrdinal = (date: Date): string => {
  const day = date.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? 'st'
      : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
          ? 'rd'
          : 'th';
  return `${day}${suffix} ${format(date, 'MMMM yyyy')}`;
};

// Helper to format address for letter
const formatAddressForLetter = (address: Address): string => {
  const lines = [address.line1];
  if (address.line2) lines.push(address.line2);
  lines.push(`${address.city}, ${address.postcode}`);
  return lines.join('\n');
};

// Text input component
const TextInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: TemplatePlaceholder;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-dark">
      {placeholder.label}
      {placeholder.required && <span className="ml-0.5 text-coral">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder.example}
      className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
    />
    <p className="text-xs text-gray">{placeholder.description}</p>
  </div>
);

// Textarea input component
const TextareaInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: TemplatePlaceholder;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-dark">
      {placeholder.label}
      {placeholder.required && <span className="ml-0.5 text-coral">*</span>}
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder.example}
      rows={4}
      className="w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
    />
    <p className="text-xs text-gray">{placeholder.description}</p>
  </div>
);

// Currency input component (with £ prefix)
const CurrencyInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: TemplatePlaceholder;
  value: string;
  onChange: (value: string) => void;
}) => {
  // Store the raw number value, display with £ prefix
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    // Format with £ prefix for the stored value
    onChange(rawValue ? `£${rawValue}` : '');
  };

  // Extract the number part for the input display
  const displayValue = value.replace(/^£/, '');

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-dark">
        {placeholder.label}
        {placeholder.required && <span className="ml-0.5 text-coral">*</span>}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray">
          £
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder.example?.replace(/^£/, '') || '0.00'}
          className="w-full rounded-lg border border-border bg-white py-2 pl-7 pr-3 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
        />
      </div>
      <p className="text-xs text-gray">{placeholder.description}</p>
    </div>
  );
};

// Date input component
const DateInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: TemplatePlaceholder;
  value: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  // Parse the display string back to a Date if needed
  const selectedDate = useMemo(() => {
    if (!value) return undefined;
    // Try to parse the formatted date string
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value]);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-dark">
        {placeholder.label}
        {placeholder.required && <span className="ml-0.5 text-coral">*</span>}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-left text-sm transition-colors',
              'focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal',
              !value && 'text-gray',
            )}
          >
            <span>{value || placeholder.example}</span>
            <FontAwesomeIcon
              icon={faCalendarDays}
              className="size-4 text-gray"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(formatDateWithOrdinal(date));
                setOpen(false);
              }
            }}
            disabled={(date) =>
              date > new Date() || date < new Date('1900-01-01')
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <p className="text-xs text-gray">{placeholder.description}</p>
    </div>
  );
};

// Address input component wrapper
const AddressInputWrapper = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: TemplatePlaceholder;
  value: string;
  onChange: (value: string) => void;
}) => {
  const handleAddressSelect = (address: Address) => {
    const formatted = formatAddressForLetter(address);
    onChange(formatted);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-dark">
        {placeholder.label}
        {placeholder.required && <span className="ml-0.5 text-coral">*</span>}
      </label>
      <AddressInput
        onSelect={handleAddressSelect}
        initialValue={value}
        className="[&_.mapboxgl-ctrl-geocoder]:rounded-lg [&_.mapboxgl-ctrl-geocoder]:border-border [&_.mapboxgl-ctrl-geocoder]:focus-within:border-teal [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-1 [&_.mapboxgl-ctrl-geocoder]:focus-within:ring-teal [&_.mapboxgl-ctrl-geocoder--input]:text-sm"
      />
      <p className="text-xs text-gray">{placeholder.description}</p>
    </div>
  );
};

// Statutory grounds input component
const StatutoryGroundsInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: TemplatePlaceholder;
  value: string;
  onChange: (value: string) => void;
}) => {
  // Parse the stored value back to an array of IDs
  const selectedIds = useMemo(() => {
    if (!value) return [];
    // Try to extract IDs from the formatted text or use as-is if it's a comma-separated list
    return value.includes('\n')
      ? [] // Already formatted, can't easily reverse
      : value.split(',').filter(Boolean);
  }, [value]);

  const [internalIds, setInternalIds] = useState<string[]>(selectedIds);

  const handleChange = (ids: string[]) => {
    setInternalIds(ids);
    const formatted = formatStatutoryGrounds(ids);
    onChange(formatted);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-dark">
        {placeholder.label}
        {placeholder.required && <span className="ml-0.5 text-coral">*</span>}
      </label>
      <StatutoryGroundsSelect
        value={internalIds}
        onChange={handleChange}
        placeholder="Select statutory ground(s)"
      />
      <p className="text-xs text-gray">{placeholder.description}</p>
    </div>
  );
};

// Main placeholder input that routes to the correct component
const PlaceholderInput = ({
  placeholder,
  value,
  onChange,
}: {
  placeholder: TemplatePlaceholder;
  value: string;
  onChange: (value: string) => void;
}) => {
  const inputType: PlaceholderInputType = placeholder.inputType || 'text';

  switch (inputType) {
    case 'address':
      return (
        <AddressInputWrapper
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      );
    case 'date':
      return (
        <DateInput placeholder={placeholder} value={value} onChange={onChange} />
      );
    case 'textarea':
      return (
        <TextareaInput
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      );
    case 'statutory-grounds':
      return (
        <StatutoryGroundsInput
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      );
    case 'currency':
      return (
        <CurrencyInput
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      );
    default:
      return (
        <TextInput placeholder={placeholder} value={value} onChange={onChange} />
      );
  }
};

const TemplateViewer = ({ template }: TemplateViewerProps) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showEmailModal, setShowEmailModal] = useState(false);
  const { track } = useAnalytics();

  // Track template view on mount
  useEffect(() => {
    track(TRACKING_EVENTS.LETTER_TEMPLATE_VIEWED, {
      templateId: template.id,
      templateCategory: template.category,
    });
  }, [template.id, template.category, track]);

  const handleValueChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const getFilledContent = useCallback(() => {
    let content = template.content;
    template.placeholders.forEach((p) => {
      const value = values[p.key] || `[${p.key}]`;
      content = content.replace(new RegExp(`\\[${p.key}\\]`, 'g'), value);
    });
    return content;
  }, [template, values]);

  const handleEmailSubmit = useCallback(
    async (email: string, firstName: string) => {
      track(TRACKING_EVENTS.LETTER_TEMPLATE_EMAIL_SUBMITTED, {
        templateId: template.id,
        templateCategory: template.category,
      });

      const result = await sendFreeLetterEmail(
        email,
        firstName,
        getFilledContent(),
        template.title,
        template.category,
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }
    },
    [template.id, template.title, template.category, getFilledContent, track],
  );

  const filledFieldsCount = Object.values(values).filter(Boolean).length;
  const totalFields = template.placeholders.length;
  const requiredFields = template.placeholders.filter((p) => p.required);
  const filledRequiredCount = requiredFields.filter(
    (p) => values[p.key],
  ).length;
  const allRequiredFilled = filledRequiredCount === requiredFields.length;

  return (
    <div className="space-y-6">
      {/* Tips Section */}
      <div className="rounded-xl bg-amber/10 p-4">
        <div className="flex items-start gap-3">
          <FontAwesomeIcon icon={faLightbulb} className="mt-0.5 text-amber" />
          <div>
            <p className="font-semibold text-dark">
              Tips for using this template
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray">
              {template.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Side-by-side layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Form */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-dark">Fill in your details</h3>
            <span className="text-sm text-gray">
              {filledFieldsCount}/{totalFields} completed
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {template.placeholders.map((placeholder) => (
              <PlaceholderInput
                key={placeholder.key}
                placeholder={placeholder}
                value={values[placeholder.key] || ''}
                onChange={(value) => handleValueChange(placeholder.key, value)}
              />
            ))}
          </motion.div>

          {/* Legal Disclaimer */}
          {template.legalDisclaimer && (
            <div className="rounded-lg border border-border bg-light/50 p-4">
              <p className="text-xs text-gray">
                <strong>Disclaimer:</strong> {template.legalDisclaimer}
              </p>
            </div>
          )}

          {/* Get Letter Button */}
          <div className="space-y-3 pt-2">
            {!allRequiredFilled && (
              <div className="flex items-center gap-2 text-sm text-amber">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                <span>
                  Fill in all required fields ({filledRequiredCount}/
                  {requiredFields.length})
                </span>
              </div>
            )}

            <button
              onClick={() => setShowEmailModal(true)}
              disabled={!allRequiredFilled}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal px-6 py-3 font-semibold text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faEnvelope} />
              Get Letter via Email
            </button>

            <p className="text-center text-xs text-gray">
              We&apos;ll email you a PDF of your completed letter
            </p>
          </div>
        </div>

        {/* Right Column - Live Preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-semibold text-dark">Letter Preview</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-dark">
                {getFilledContent()}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Email Capture Modal */}
      <EmailCaptureModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSubmit={handleEmailSubmit}
        templateTitle={template.title}
      />
    </div>
  );
};

export default TemplateViewer;
