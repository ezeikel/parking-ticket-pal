'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateLetterValues, letterFormSchema } from '@/types';
import { createLetter } from '@/app/actions/letter';
import { LetterType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

const CreateLetterForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | undefined>();
  const [tempImagePath, setTempImagePath] = useState<string | undefined>();
  const [extractedText, setExtractedText] = useState<string>('');
  const { track } = useAnalytics();

  const form = useForm<CreateLetterValues>({
    resolver: zodResolver(letterFormSchema),
    defaultValues: {
      pcnNumber: '',
      vehicleReg: '',
      type: LetterType.INITIAL_NOTICE,
      summary: '',
      sentAt: new Date(),
    },
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

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
      form.setValue('pcnNumber', result.data.pcnNumber);
      form.setValue('vehicleReg', result.data.vehicleReg);
      form.setValue('summary', result.data.summary || '');
      form.setValue('sentAt', new Date(result.data.sentAt || ''));

      setExtractedText(result.data.extractedText || '');

      toast.success('Form prefilled with letter details');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: CreateLetterValues) => {
    try {
      setIsLoading(true);
      const letter = await createLetter({
        ...values,
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
      console.error('Error creating letter:', error);
      toast.error('Failed to create letter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <FormField
              control={form.control}
              name="pcnNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PCN Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter PCN number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleReg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Registration</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter vehicle registration"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Letter Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select letter type" />
                      </SelectTrigger>
                    </FormControl>
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
                      <SelectItem value={LetterType.GENERIC}>
                        Generic
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter a summary of the letter contents"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sentAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Sent</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <FontAwesomeIcon
                            icon={faCalendarDays}
                            size="lg"
                            className="ml-auto opacity-50"
                          />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Letter'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateLetterForm;
