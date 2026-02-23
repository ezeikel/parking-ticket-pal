'use client';

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
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
import { useRouter } from 'next/navigation';
import VerifiedBadge from '@/components/VerifiedBadge/VerifiedBadge';
import { VerificationStatus } from '@parking-ticket-pal/db/types';
import { logger } from '@/lib/logger';

const vehicleFormSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.string().min(1, 'Year is required'),
  color: z.string().min(1, 'Color is required'),
  bodyType: z.string().optional(),
  fuelType: z.string().optional(),
  notes: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

type VehicleFormProps = {
  initialData: VehicleFormValues;
  onSubmit: (data: VehicleFormValues) => Promise<void>;
  submitLabel?: string;
  vehicleId?: string;
  verificationStatus?: VerificationStatus;
};

const VehicleForm = ({
  initialData,
  onSubmit,
  submitLabel = 'Add Vehicle',
  vehicleId,
  verificationStatus,
}: VehicleFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: initialData,
    validators: {
      onSubmit: vehicleFormSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      try {
        await onSubmit(value);
      } catch (error) {
        logger.error(
          'Error submitting form',
          { page: 'vehicle-form' },
          error instanceof Error ? error : undefined,
        );
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
      <div className="flex items-center gap-2">
        <form.Field name="registrationNumber">
          {(field) => (
            <TanstackFormItem field={field} className="flex-1">
              <TanstackFormLabel>Registration Number</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="Enter registration number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>
        <VerifiedBadge status={verificationStatus || 'UNVERIFIED'} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="make">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Make</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="Enter make"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>

        <form.Field name="model">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Model</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="Enter model"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="year">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Year</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  type="number"
                  placeholder="Enter year"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>

        <form.Field name="color">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Color</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="Enter color"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="bodyType">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Body Type</TanstackFormLabel>
              <Select
                onValueChange={(val) => field.handleChange(val)}
                defaultValue={field.state.value}
              >
                <TanstackFormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select body type" />
                  </SelectTrigger>
                </TanstackFormControl>
                <SelectContent>
                  <SelectItem value="hatchback">Hatchback</SelectItem>
                  <SelectItem value="saloon">Saloon</SelectItem>
                  <SelectItem value="estate">Estate</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                </SelectContent>
              </Select>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>

        <form.Field name="fuelType">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Fuel Type</TanstackFormLabel>
              <Select
                onValueChange={(val) => field.handleChange(val)}
                defaultValue={field.state.value}
              >
                <TanstackFormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                </TanstackFormControl>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                </SelectContent>
              </Select>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>
      </div>

      <form.Field name="notes">
        {(field) => (
          <TanstackFormItem field={field}>
            <TanstackFormLabel>Notes</TanstackFormLabel>
            <TanstackFormControl>
              <Textarea
                placeholder="Enter any additional notes"
                className="resize-none"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </TanstackFormControl>
            <TanstackFormMessage />
          </TanstackFormItem>
        )}
      </form.Field>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            router.push(vehicleId ? `/vehicles/${vehicleId}` : '/vehicles')
          }
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default VehicleForm;
