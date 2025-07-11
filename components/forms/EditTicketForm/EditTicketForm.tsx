'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Address, ticketFormSchema, TicketWithPrediction } from '@/types';
import {
  refreshTicket,
  refreshTickets,
  updateTicket,
} from '@/app/actions/ticket';
import { faCalendar, faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import { toast } from 'sonner';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import { useRouter } from 'next/navigation';

type EditTicketFormProps = {
  ticket: TicketWithPrediction;
};

const EditTicketForm = ({ ticket }: EditTicketFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof ticketFormSchema>>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      vehicleReg: ticket.vehicle.registrationNumber,
      pcnNumber: ticket.pcnNumber,
      issuedAt: new Date(ticket.issuedAt),
      contraventionCode: ticket.contraventionCode,
      initialAmount: ticket.initialAmount,
      issuer: ticket.issuer,
      location: ticket.location as Address,
    },
  });

  const onSubmit = async (values: z.infer<typeof ticketFormSchema>) => {
    setIsLoading(true);

    try {
      const updatedTicket = await updateTicket(ticket.id, values);

      if (!updatedTicket) {
        throw new Error('Failed to update ticket');
      }

      await refreshTicket(ticket.id);
      await refreshTickets();

      toast.success('Ticket updated successfully');
      router.push(`/tickets/${ticket.id}`);
    } catch (error) {
      toast.error('Failed to update ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pcnNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PCN Number</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input {...field} />
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
                  <Input {...field} />
                </FormControl>
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
                    step="0.01"
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
            name="issuedAt"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Issued</FormLabel>
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
              <FormItem>
                <FormLabel>Contravention Code</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contravention code" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONTRAVENTION_CODES_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <FormLabel>Location</FormLabel>
          <AddressInput
            onSelect={(address) => form.setValue('location', address)}
            className="w-full"
          />
          {form.watch('location') && (
            <div className="text-sm text-muted-foreground mt-2">
              Current location: {form.watch('location').line1},{' '}
              {form.watch('location').city}, {form.watch('location').postcode}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/tickets/${ticket.id}`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  spin
                  className="mr-2 h-4 w-4"
                />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EditTicketForm;
