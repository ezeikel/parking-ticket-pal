'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faCalendar,
  faEnvelope,
} from '@fortawesome/pro-solid-svg-icons';
import { format } from 'date-fns';
import { LetterType } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import createUTCDate from '@/utils/createUTCDate';

export type GuestLetterExtractedData = {
  pcnNumber?: string;
  vehicleReg?: string;
  letterType?: string;
  summary?: string;
  sentAt?: Date;
  currentAmount?: number | null;
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
};

export type GuestLetterWizardCompleteData = {
  pcnNumber: string;
  vehicleReg: string;
  letterType: string;
  summary: string;
  sentAt: Date;
  currentAmount?: number | null;
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
};

type GuestLetterWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  extractedData?: GuestLetterExtractedData;
  onComplete: (data: GuestLetterWizardCompleteData) => void;
};

const LETTER_TYPE_LABELS: Record<string, string> = {
  [LetterType.INITIAL_NOTICE]: 'Initial Notice',
  [LetterType.NOTICE_TO_OWNER]: 'Notice to Owner (NTO)',
  [LetterType.CHARGE_CERTIFICATE]: 'Charge Certificate',
  [LetterType.ORDER_FOR_RECOVERY]: 'Order for Recovery',
  [LetterType.CCJ_NOTICE]: 'CCJ Notice',
  [LetterType.FINAL_DEMAND]: 'Final Demand',
  [LetterType.BAILIFF_NOTICE]: 'Bailiff Notice',
  [LetterType.APPEAL_RESPONSE]: 'Appeal Response',
  [LetterType.APPEAL_ACCEPTED]: 'Appeal Accepted',
  [LetterType.APPEAL_REJECTED]: 'Appeal Rejected',
  [LetterType.TE_FORM_RESPONSE]: 'Revoking Order (TE7/TE9)',
  [LetterType.PE_FORM_RESPONSE]: 'Revoking Order (PE2/PE3)',
  [LetterType.GENERIC]: 'Other Letter',
};

function resolveLetterType(raw?: string): LetterType {
  if (!raw) return LetterType.GENERIC;
  if (raw in LetterType) return LetterType[raw as keyof typeof LetterType];
  return LetterType.GENERIC;
}

const GuestLetterWizard = ({
  isOpen,
  onClose,
  extractedData,
  onComplete,
}: GuestLetterWizardProps) => {
  const [letterType, setLetterType] = useState<LetterType>(
    resolveLetterType(extractedData?.letterType),
  );
  const [pcnNumber, setPcnNumber] = useState(extractedData?.pcnNumber || '');
  const [vehicleReg, setVehicleReg] = useState(extractedData?.vehicleReg || '');
  const [sentAt, setSentAt] = useState<Date>(
    extractedData?.sentAt || new Date(),
  );
  const [summary, setSummary] = useState(extractedData?.summary || '');
  const [currentAmount, setCurrentAmount] = useState<number | undefined>(
    extractedData?.currentAmount ?? undefined,
  );

  const isFormValid = pcnNumber.trim() && vehicleReg.trim() && summary.trim();

  const handleSubmit = () => {
    onComplete({
      pcnNumber: pcnNumber.trim(),
      vehicleReg: vehicleReg.trim(),
      letterType,
      summary: summary.trim(),
      sentAt,
      currentAmount: currentAmount ?? null,
      imageUrl: extractedData?.imageUrl,
      tempImagePath: extractedData?.tempImagePath,
      extractedText: extractedData?.extractedText,
    });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faEnvelope} className="text-teal" />
            <span className="text-sm font-medium text-dark">
              Letter Details
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray hover:text-dark"
          >
            Cancel
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          {extractedData && (
            <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal">
              <FontAwesomeIcon icon={faCheckCircle} />
              Details extracted from your scan
            </div>
          )}

          <h2 className="text-xl font-bold text-dark">Review letter details</h2>
          <p className="mt-1 text-sm text-gray">
            Check and edit the information below, then sign up to track your
            case.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {/* Letter Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                Letter Type *
              </label>
              <Select
                value={letterType}
                onValueChange={(v) => setLetterType(v as LetterType)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LETTER_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PCN Number */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                PCN Number *
              </label>
              <Input
                value={pcnNumber}
                onChange={(e) => setPcnNumber(e.target.value)}
                placeholder="e.g. WK12345678"
                className="h-11"
              />
            </div>

            {/* Vehicle Reg */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                Vehicle Registration *
              </label>
              <Input
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                placeholder="e.g. AB12 CDE"
                className="h-11 uppercase"
              />
            </div>

            {/* Sent Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                Letter Date *
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background text-dark"
                  >
                    <FontAwesomeIcon
                      icon={faCalendar}
                      className="mr-2 text-gray"
                    />
                    {format(sentAt, 'dd MMM yyyy')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={sentAt}
                    onSelect={(day) => {
                      if (day) setSentAt(createUTCDate(day));
                    }}
                    disabled={{ after: new Date() }}
                    defaultMonth={sentAt}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Current Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                Amount Due (£)
              </label>
              <Input
                type="number"
                value={currentAmount ? currentAmount / 100 : ''}
                onChange={(e) =>
                  setCurrentAmount(
                    e.target.value
                      ? Math.round(Number(e.target.value) * 100)
                      : undefined,
                  )
                }
                placeholder="e.g. 130"
                min="0"
                step="0.01"
                className="h-11"
              />
              <p className="mt-1 text-xs text-gray">
                The amount currently due as shown on the letter (optional)
              </p>
            </div>

            {/* Summary */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                Summary *
              </label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Brief description of the letter contents"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="mt-6 h-11 w-full bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
          >
            Continue
            <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GuestLetterWizard;
