'use client';

import type React from 'react';
import { useState } from 'react';
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
import { createTicket } from '@/app/actions';
import {
  faCalendar,
  faCamera,
  faSpinner,
} from '@fortawesome/pro-regular-svg-icons';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';

type UploadFormProps = {
  type: 'ticket' | 'letter';
};

const UploadDocumentForm = ({ type }: UploadFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
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
      ticketNumber: '',
      issuedAt: undefined,
      contraventionCode: '',
      amountDue: 0,
      issuer: '',
      location: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof ticketFormSchema>) {
    setIsLoading(true);

    await createTicket(values);

    setIsLoading(false);
    router.push('/');
  }

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      // TODO: add OCR processing + openAI API call to extract data from image
      // simulate API call for OCR processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // TODO: use extracted data to pre-fill form where possible

      setIsLoading(false);
    }
  };

  if (type === 'letter') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="letter-file-upload"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FontAwesomeIcon
                icon={faCamera}
                className="w-8 h-8 mb-4 text-gray-500"
              />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 10MB)</p>
            </div>
            <input
              id="letter-file-upload"
              type="file"
              className="hidden"
              accept="image/*,.pdf"
            />
          </label>
        </div>
        <Button className="w-full" onClick={() => router.push('/')}>
          Add Letter
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-center w-full mb-4">
          <label
            htmlFor="ticket-file-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FontAwesomeIcon
                icon={faCamera}
                className="w-8 h-8 mb-4 text-gray-500"
              />
              <p className="text-sm text-gray-500">
                Upload image to pre-fill form
              </p>
            </div>
            <input
              id="ticket-file-upload"
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
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
              name="ticketNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Number</FormLabel>
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
              name="amountDue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Due (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="70"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      value={field.value === 0 ? '' : field.value}
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

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Ticket'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UploadDocumentForm;
