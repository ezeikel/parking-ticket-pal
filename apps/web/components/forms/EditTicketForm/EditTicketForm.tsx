'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
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
import { TicketWithRelations } from '@/types';
import {
  Address,
  ticketFormSchema,
  type TicketFormData,
} from '@parking-ticket-pal/types';
import {
  refreshTicket,
  refreshTickets,
  updateTicket,
} from '@/app/actions/ticket';
import { faCalendar, faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import { toast } from 'sonner';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import ContraventionCodeSelect from '@/components/forms/inputs/ContraventionCodeSelect';
import { useRouter } from 'next/navigation';
import createUTCDate from '@/utils/createUTCDate';

type EditTicketFormProps = {
  ticket: TicketWithRelations;
};

const EditTicketForm = ({ ticket }: EditTicketFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      vehicleReg: ticket.vehicle.registrationNumber,
      pcnNumber: ticket.pcnNumber,
      issuedAt: new Date(ticket.issuedAt),
      contraventionCode: ticket.contraventionCode,
      initialAmount: ticket.initialAmount,
      issuer: ticket.issuer,
      location: ticket.location as Address,
    } as TicketFormData,
    validators: {
      onSubmit: ticketFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);

      try {
        const updatedTicket = await updateTicket(ticket.id, value);

        if (!updatedTicket) {
          throw new Error('Failed to update ticket');
        }

        await refreshTicket(ticket.id);
        await refreshTickets();

        toast.success('Ticket updated successfully');
        router.push(`/tickets/${ticket.id}`);
      } catch {
        toast.error('Failed to update ticket. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.Field name="pcnNumber">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>PCN Number</TanstackFormLabel>
              <TanstackFormControl>
                <Input
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
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
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
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
                  step="0.01"
                  value={
                    field.state.value === 0
                      ? undefined
                      : field.state.value / 100
                  }
                  onChange={(e) =>
                    field.handleChange(Math.round(Number(e.target.value) * 100))
                  }
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

        <form.Field name="contraventionCode">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Contravention Code</TanstackFormLabel>
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
      </div>

      <form.Field name="location">
        {(field) => (
          <div className="space-y-2">
            <TanstackFormLabel>Location</TanstackFormLabel>
            <AddressInput
              onSelect={(address) => field.handleChange(address)}
              className="w-full"
            />
            {field.state.value && (
              <div className="text-sm text-muted-foreground mt-2">
                Current location: {field.state.value.line1},{' '}
                {field.state.value.city}, {field.state.value.postcode}
              </div>
            )}
          </div>
        )}
      </form.Field>

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
  );
};

export default EditTicketForm;
