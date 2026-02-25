'use client';

import { ChangeEvent, useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TanstackFormItem,
  TanstackFormLabel,
  TanstackFormControl,
  TanstackFormMessage,
} from '@/components/ui/tanstack-form';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import cn from '@/utils/cn';
import { format } from 'date-fns';
import {
  ticketFormSchema,
  type TicketFormData,
} from '@parking-ticket-pal/types';
import { createTicket } from '@/app/actions/ticket';
import {
  faCalendar,
  faCamera,
  faSpinnerThird,
} from '@fortawesome/pro-regular-svg-icons';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import ContraventionCodeSelect from '@/components/forms/inputs/ContraventionCodeSelect';
import { toast } from 'sonner';
import { extractOCRTextWithVision } from '@/app/actions/ocr';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import { compressImage } from '@/utils/compressImage';
import createUTCDate from '@/utils/createUTCDate';
import useLogger from '@/lib/use-logger';

type CreateTicketFormProps = {
  tier?: 'premium' | null;
  source?: string | null;
};

const CreateTicketForm = ({ tier, source }: CreateTicketFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | undefined>();
  const [tempImagePath, setTempImagePath] = useState<string | undefined>();
  const [extractedText, setExtractedText] = useState<string>('');
  const router = useRouter();
  const { track } = useAnalytics();
  const logger = useLogger({ page: 'create-ticket' });

  // Track when user lands on this page with a tier selected from pricing
  useEffect(() => {
    if (tier && source) {
      track(TRACKING_EVENTS.PRICING_TIER_SELECTED, {
        tier,
        source,
      });
    }
  }, [tier, source, track]);

  const form = useForm({
    defaultValues: {
      vehicleReg: '',
      pcnNumber: '',
      issuedAt: undefined,
      contraventionCode: '',
      initialAmount: 0,
      issuer: '',
      location: undefined,
    } as unknown as TicketFormData,
    validators: {
      onSubmit: ticketFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);

      try {
        const ticket = await createTicket({
          ...value,
          tempImageUrl,
          tempImagePath,
          extractedText,
        });

        if (ticket) {
          await track(TRACKING_EVENTS.TICKET_CREATED, {
            ticketId: ticket.id,
            pcnNumber: ticket.pcnNumber,
            issuer: ticket.issuer,
            issuerType: ticket.issuerType,
            prefilled: !!ticket.extractedText,
          });

          // Track if ticket was created with a tier from pricing page
          if (tier && source) {
            await track(TRACKING_EVENTS.PRICING_TICKET_CREATED_WITH_TIER, {
              ticketId: ticket.id,
              tier,
              source,
            });
          }

          toast.success('Ticket created successfully');

          // If tier is selected from pricing page, redirect to checkout
          if (tier) {
            const checkoutParams = new URLSearchParams({
              ticketId: ticket.id,
              tier,
            });
            if (source) {
              checkoutParams.append('source', source);
            }
            router.push(`/checkout?${checkoutParams.toString()}`);
          } else {
            router.push('/');
          }
        } else {
          throw new Error('Failed to create ticket');
        }
      } catch (error) {
        logger.error(
          'Error creating ticket',
          {
            tier,
            source,
            hasImage: !!tempImageUrl,
          },
          error instanceof Error ? error : undefined,
        );
        toast.error('Failed to create ticket. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
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
        toast.error(result.message || 'Failed to parse ticket image');
        return;
      }

      // store the temporary image information for later use
      setTempImageUrl(result.imageUrl);
      setTempImagePath(result.tempImagePath);

      if (!result.data) {
        toast.error('Failed to parse ticket image');
        return;
      }

      // store the extracted text for later use
      setExtractedText(result.data.extractedText || '');

      // prefill form with parsed data
      form.setFieldValue('pcnNumber', result.data.pcnNumber);
      form.setFieldValue('vehicleReg', result.data.vehicleReg);
      form.setFieldValue('issuedAt', new Date(result.data.issuedAt));
      form.setFieldValue('contraventionCode', result.data.contraventionCode);
      form.setFieldValue('initialAmount', result.data.initialAmount);
      form.setFieldValue('issuer', result.data.issuer);
      form.setFieldValue('location', result.data.location);

      toast.success('Form prefilled with ticket details');
    } catch (error) {
      logger.error(
        'Error uploading image',
        {},
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
      className="space-y-6"
    >
      <div className="flex items-center justify-center w-full mb-4">
        <label
          htmlFor="ticket-file-upload"
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
            id="ticket-file-upload"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field name="vehicleReg">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>Vehicle Registration</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="AB12 CDE"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="pcnNumber">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>PCN Number</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="PCN12345678"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="issuedAt">
            {(field) => (
              <TanstackFormItem field={field} className="flex flex-col">
                <TanstackFormLabel>Date Issued</TanstackFormLabel>
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
                          icon={faCalendar}
                          className="ml-auto h-4 w-4 opacity-50"
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
                          // create timezone-safe date immediately when user selects
                          const safeDate = createUTCDate(date);
                          logger.debug('Calendar selection', {
                            userSelected: date.toDateString(),
                            safeDate: safeDate.toISOString(),
                          });
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

          <form.Field name="contraventionCode">
            {(field) => (
              <TanstackFormItem
                field={field}
                className="col-span-1 md:col-span-2"
              >
                <TanstackFormLabel>Contravention</TanstackFormLabel>
                <TanstackFormControl>
                  <ContraventionCodeSelect
                    value={field.state.value}
                    onChange={(val) => field.handleChange(val)}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="initialAmount">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>Initial Amount (£)</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    type="number"
                    placeholder="70"
                    value={
                      field.state.value === 0
                        ? undefined
                        : field.state.value / 100
                    }
                    onChange={(e) =>
                      field.handleChange(
                        Math.round(Number(e.target.value) * 100),
                      )
                    }
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="issuer">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>Issuer</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="Local Council"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="location">
            {(field) => (
              <TanstackFormItem field={field} className="col-span-2">
                <TanstackFormLabel>Location</TanstackFormLabel>
                <TanstackFormControl>
                  <AddressInput
                    onSelect={(address) => {
                      field.handleChange(address);
                    }}
                    className="w-full"
                    initialValue={
                      field.state.value?.line1
                        ? `${field.state.value.line1}, ${field.state.value.city}, ${field.state.value.postcode}`
                        : undefined
                    }
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
};

export default CreateTicketForm;
