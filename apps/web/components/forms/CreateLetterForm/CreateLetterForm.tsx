'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { CreateLetterValues, letterFormSchema } from '@/types';
import { createLetter } from '@/app/actions/letter';
import { LetterType } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import {
  TanstackFormItem,
  TanstackFormLabel,
  TanstackFormControl,
  TanstackFormMessage,
} from '@/components/ui/tanstack-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCamera,
  faSpinnerThird,
  faCalendarDays,
} from '@fortawesome/pro-regular-svg-icons';
import { extractOCRTextWithVision } from '@/app/actions/ocr';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { compressImage } from '@/utils/compressImage';
import createUTCDate from '@/utils/createUTCDate';
import { logger } from '@/lib/logger';

const CreateLetterForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | undefined>();
  const [tempImagePath, setTempImagePath] = useState<string | undefined>();
  const [extractedText, setExtractedText] = useState<string>('');
  const { track } = useAnalytics();

  const form = useForm({
    defaultValues: {
      pcnNumber: '',
      vehicleReg: '',
      type: LetterType.INITIAL_NOTICE,
      summary: '',
      sentAt: new Date(),
    } as CreateLetterValues,
    validators: {
      onSubmit: letterFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        setIsLoading(true);
        const letter = await createLetter({
          ...value,
          extractedText,
          tempImageUrl,
          tempImagePath,
        });

        if (!letter) {
          toast.error('Failed to create letter. Please try again.');
          return;
        }

        await track(TRACKING_EVENTS.LETTER_CREATED, {
          letterType: letter.type,
          ticketId: letter.ticketId,
        });

        toast.success('Letter created successfully');
        form.reset();

        // navigate to related ticket
        router.push(`/tickets/${letter.ticketId}`);
      } catch (error) {
        logger.error(
          'Error creating letter',
          { page: 'create-letter' },
          error instanceof Error ? error : undefined,
        );
        toast.error('Failed to create letter. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    // Compress image before upload
    let uploadFile: File = file;
    try {
      const compressed = await compressImage(file);
      uploadFile = compressed.file;
    } catch {
      // Compression failed — use original file
    }

    try {
      const formData = new FormData();
      formData.append('image', uploadFile);

      const result = await extractOCRTextWithVision(formData);

      if (!result.success) {
        toast.error(result.message || 'Failed to parse letter image');
        return;
      }

      // store the temporary image information for later use
      setTempImageUrl(result.imageUrl);
      setTempImagePath(result.tempImagePath);

      if (!result.data) {
        toast.error('Failed to parse letter image');
        return;
      }

      // prefill form with parsed data
      form.setFieldValue('pcnNumber', result.data.pcnNumber);
      form.setFieldValue('vehicleReg', result.data.vehicleReg);
      form.setFieldValue('summary', result.data.summary || '');
      form.setFieldValue('sentAt', new Date(result.data.sentAt || ''));

      setExtractedText(result.data.extractedText || '');

      toast.success('Form prefilled with letter details');
    } catch (error) {
      logger.error(
        'Error uploading image',
        { page: 'create-letter' },
        error instanceof Error ? error : undefined,
      );
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="flex items-center justify-center w-full mb-4">
        <label
          htmlFor="letter-file-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isLoading ? (
              <FontAwesomeIcon
                icon={faSpinnerThird}
                className="w-8 h-8 mb-4 text-gray-500 animate-spin"
              />
            ) : (
              <FontAwesomeIcon
                icon={faCamera}
                className="w-8 h-8 mb-4 text-gray-500"
              />
            )}
            <p className="text-sm text-gray-500">
              {isLoading
                ? 'Processing image...'
                : 'Upload image to pre-fill form'}
            </p>
          </div>
          <input
            id="letter-file-upload"
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <FontAwesomeIcon icon={faSpinnerThird} spin size="3x" />
        </div>
      ) : (
        <>
          <form.Field name="pcnNumber">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>PCN Number</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="Enter PCN number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="vehicleReg">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>Vehicle Registration</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="Enter vehicle registration"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="type">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>Letter Type</TanstackFormLabel>
                <Select
                  onValueChange={(val) => field.handleChange(val as LetterType)}
                  defaultValue={field.state.value}
                >
                  <TanstackFormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select letter type" />
                    </SelectTrigger>
                  </TanstackFormControl>
                  <SelectContent>
                    <SelectItem value={LetterType.INITIAL_NOTICE}>
                      Initial Notice
                    </SelectItem>
                    <SelectItem value={LetterType.NOTICE_TO_OWNER}>
                      Notice to Owner
                    </SelectItem>
                    <SelectItem value={LetterType.CHARGE_CERTIFICATE}>
                      Charge Certificate
                    </SelectItem>
                    <SelectItem value={LetterType.ORDER_FOR_RECOVERY}>
                      Order for Recovery
                    </SelectItem>
                    <SelectItem value={LetterType.CCJ_NOTICE}>
                      CCJ Notice
                    </SelectItem>
                    <SelectItem value={LetterType.FINAL_DEMAND}>
                      Final Demand
                    </SelectItem>
                    <SelectItem value={LetterType.BAILIFF_NOTICE}>
                      Bailiff Notice
                    </SelectItem>
                    <SelectItem value={LetterType.APPEAL_RESPONSE}>
                      Appeal Response
                    </SelectItem>
                    <SelectItem value={LetterType.GENERIC}>Generic</SelectItem>
                  </SelectContent>
                </Select>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="summary">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>Summary</TanstackFormLabel>
                <TanstackFormControl>
                  <Textarea
                    placeholder="Enter a summary of the letter contents"
                    className="min-h-[100px]"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="sentAt">
            {(field) => (
              <TanstackFormItem field={field} className="flex flex-col">
                <TanstackFormLabel>Date Sent</TanstackFormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <TanstackFormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.state.value && 'text-muted-foreground',
                        )}
                      >
                        {field.state.value ? (
                          format(field.state.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <FontAwesomeIcon
                          icon={faCalendarDays}
                          size="lg"
                          className="ml-auto opacity-50"
                        />
                      </Button>
                    </TanstackFormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.state.value}
                      onSelect={(date) => {
                        if (date) {
                          const safeDate = createUTCDate(date);
                          field.handleChange(safeDate);
                        }
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>
        </>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Letter'}
        </Button>
      </div>
    </form>
  );
};

export default CreateLetterForm;
