'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faSpinnerThird,
  faCalendar,
  faEnvelope,
  faTicket,
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
import { getTicketByPcnNumber } from '@/app/actions/ticket';
import createUTCDate from '@/utils/createUTCDate';

export type LetterExtractedData = {
  pcnNumber?: string;
  vehicleReg?: string;
  letterType?: string;
  summary?: string;
  sentAt?: Date;
  issuedAt?: Date;
  currentAmount?: number | null;
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
  issuer?: string;
  issuerType?: string;
  location?: any; // Address object from OCR
  initialAmount?: number;
  contraventionCode?: string;
};

export type LetterWizardFormData = {
  pcnNumber: string;
  vehicleReg: string;
  type: LetterType;
  summary: string;
  sentAt: Date;
  issuedAt?: Date;
  currentAmount?: number | null;
  imageUrl?: string;
  tempImagePath?: string;
  extractedText?: string;
  issuer?: string;
  issuerType?: string;
  location?: any; // Address object from OCR
  initialAmount?: number;
  contraventionCode?: string;
};

type MatchedTicket = {
  id: string;
  pcnNumber: string;
  issuer: string | null;
  status: string;
};

type AddLetterWizardProps = {
  isOpen: boolean;
  onClose: () => void;
  extractedData?: LetterExtractedData;
  onSubmit: (data: LetterWizardFormData) => Promise<void>;
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

const AddLetterWizard = ({
  isOpen,
  onClose,
  extractedData,
  onSubmit,
}: AddLetterWizardProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
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

  // PCN lookup state
  const [matchedTicket, setMatchedTicket] = useState<MatchedTicket | null>(
    null,
  );
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);

  const lookupPcn = useCallback(async (pcn: string) => {
    if (!pcn.trim()) {
      setMatchedTicket(null);
      setLookupDone(true);
      return;
    }

    setIsLookingUp(true);
    try {
      const ticket = await getTicketByPcnNumber(pcn.trim());
      if (ticket) {
        setMatchedTicket({
          id: ticket.id,
          pcnNumber: ticket.pcnNumber,
          issuer: ticket.issuer,
          status: ticket.status,
        });
      } else {
        setMatchedTicket(null);
      }
    } catch {
      setMatchedTicket(null);
    } finally {
      setIsLookingUp(false);
      setLookupDone(true);
    }
  }, []);

  // Auto-lookup on mount if we have a PCN
  useEffect(() => {
    if (extractedData?.pcnNumber) {
      lookupPcn(extractedData.pcnNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFormValid = pcnNumber.trim() && vehicleReg.trim() && summary.trim();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        pcnNumber: pcnNumber.trim(),
        vehicleReg: vehicleReg.trim(),
        type: letterType,
        summary: summary.trim(),
        sentAt,
        issuedAt: extractedData?.issuedAt,
        currentAmount: currentAmount ?? null,
        imageUrl: extractedData?.imageUrl,
        tempImagePath: extractedData?.tempImagePath,
        extractedText: extractedData?.extractedText,
        issuer: extractedData?.issuer,
        issuerType: extractedData?.issuerType,
        location: extractedData?.location,
        initialAmount: extractedData?.initialAmount,
        contraventionCode: extractedData?.contraventionCode,
      });
    } finally {
      setIsSubmitting(false);
    }
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
              Confirm Letter Details
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
          <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-teal/10 px-3 py-1.5 text-sm font-medium text-teal">
            <FontAwesomeIcon icon={faCheckCircle} />
            Details extracted from your scan
          </div>

          <h2 className="text-xl font-bold text-dark">Review letter details</h2>
          <p className="mt-1 text-sm text-gray">
            Check and edit the extracted information before adding.
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

            {/* PCN Number with lookup */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                PCN Number *
              </label>
              <Input
                value={pcnNumber}
                onChange={(e) => {
                  setPcnNumber(e.target.value);
                  setLookupDone(false);
                  setMatchedTicket(null);
                }}
                onBlur={() => lookupPcn(pcnNumber)}
                placeholder="e.g. WK12345678"
                className="h-11"
              />
              {/* Ticket match indicator */}
              {isLookingUp && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray">
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="animate-spin"
                  />
                  Looking up ticket...
                </p>
              )}
              {lookupDone && matchedTicket && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-teal/20 bg-teal/5 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/10">
                    <FontAwesomeIcon
                      icon={faTicket}
                      className="text-sm text-teal"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark">
                      Existing ticket found
                    </p>
                    <p className="text-xs text-gray">
                      {matchedTicket.issuer && `${matchedTicket.issuer} · `}
                      {matchedTicket.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              )}
              {lookupDone && !matchedTicket && pcnNumber.trim() && (
                <p className="mt-1.5 text-xs text-gray">
                  No existing ticket found — a new ticket will be created.
                </p>
              )}
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
            disabled={!isFormValid || isSubmitting}
            className="mt-6 h-11 w-full bg-teal text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="mr-2 animate-spin"
                />
                Adding letter...
              </>
            ) : (
              <>
                Add Letter
                <FontAwesomeIcon icon={faCheckCircle} className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddLetterWizard;
