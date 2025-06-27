'use client';

import { ChangeEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import cn from '@/utils/cn';
import { format } from 'date-fns';
import { CONTRAVENTION_CODES_OPTIONS } from '@/constants';
import { ticketFormSchema } from '@/types';
import { createTicket } from '@/app/actions/ticket';
import {
  faCalendar,
  faCamera,
  faSpinner,
} from '@fortawesome/pro-regular-svg-icons';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import { toast } from 'sonner';
import { uploadImage } from '@/app/actions/ocr';

const CreateTicketForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | undefined>();
  const [tempImagePath, setTempImagePath] = useState<string | undefined>();
  const router = useRouter();

  const [contraventionSearch, setContraventionSearch] = useState('');

  const filteredContraventionCodes = CONTRAVENTION_CODES_OPTIONS.filter(
    (code) =>
      code.label.toLowerCase().includes(contraventionSearch.toLowerCase()),
  );

  const form = useForm<z.infer<typeof ticketFormSchema>>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      vehicleReg: '',
      pcnNumber: '',
      issuedAt: undefined,
      contraventionCode: '',
      initialAmount: 0,
      issuer: '',
      location: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof ticketFormSchema>) => {
    setIsLoading(true);

    try {
      await createTicket({
        ...values,
        tempImageUrl,
        tempImagePath,
      });
      toast.success('Ticket created successfully');
      router.push('/');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const result = await uploadImage(formData);

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

      // prefill form with parsed data
      form.setValue('pcnNumber', result.data.pcnNumber);
      form.setValue('vehicleReg', result.data.vehicleReg);
      form.setValue('issuedAt', new Date(result.data.issuedAt));
      form.setValue('contraventionCode', result.data.contraventionCode);
      form.setValue('initialAmount', result.data.initialAmount);
      form.setValue('issuer', result.data.issuer);
      form.setValue('location', result.data.location);

      toast.success('Form prefilled with ticket details');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-center w-full mb-4">
          <label
            htmlFor="ticket-file-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isLoading ? (
                <FontAwesomeIcon
                  icon={faSpinner}
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
            <FontAwesomeIcon icon={faSpinner} spin size="3x" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vehicleReg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Registration</FormLabel>
                  <FormControl>
                    <Input placeholder="AB12 CDE" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pcnNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PCN Number</FormLabel>
                  <FormControl>
                    <Input placeholder="PCN12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issuedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Issued</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
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
                            icon={faCalendar}
                            className="ml-auto h-4 w-4 opacity-50"
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

            <FormField
              control={form.control}
              name="contraventionCode"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Contravention</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contravention code" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <input
                        className="px-2 py-1 mb-2 border rounded"
                        placeholder="Search contraventions..."
                        value={contraventionSearch}
                        onChange={(e) => setContraventionSearch(e.target.value)}
                      />
                      {filteredContraventionCodes.map((code) => (
                        <SelectItem key={code.value} value={code.value}>
                          {code.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Amount (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="70"
                      {...field}
                      onChange={(e) =>
                        field.onChange(Math.round(Number(e.target.value) * 100))
                      }
                      value={field.value === 0 ? undefined : field.value / 100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issuer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issuer</FormLabel>
                  <FormControl>
                    <Input placeholder="Local Council" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <AddressInput
                      onSelect={(address) => {
                        field.onChange(address);
                      }}
                      className="w-full"
                      initialValue={
                        field.value?.line1
                          ? `${field.value.line1}, ${field.value.city}, ${field.value.postcode}`
                          : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateTicketForm;
