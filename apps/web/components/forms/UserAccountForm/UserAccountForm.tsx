'use client';

import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { updateUserProfile } from '@/app/actions/user';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TanstackFormItem,
  TanstackFormLabel,
  TanstackFormControl,
  TanstackFormMessage,
  TanstackFormDescription,
} from '@/components/ui/tanstack-form';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import SignatureInput from '@/components/SignatureInput/SignatureInput';
import { User } from '@parking-ticket-pal/db/types';
import { Address } from '@parking-ticket-pal/types';
import { Label } from '@/components/ui/label';

// Define an interface for the user address structure
type UserAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z
    .string()
    .regex(/^((\+44)|0)?7\d{9}$/, {
      message: 'Please enter a valid UK phone number.',
    })
    .nullable()
    .or(z.literal('')),
  addressLine1: z.string().or(z.literal('')).or(z.literal(undefined)),
  addressLine2: z.string().or(z.literal('')).or(z.literal(undefined)),
  city: z.string().or(z.literal('')).or(z.literal(undefined)),
  county: z.string().or(z.literal('')).or(z.literal(undefined)),
  postcode: z
    .string()
    .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, {
      message: 'Please enter a valid UK postcode',
    })
    .or(z.literal(''))
    .or(z.literal(undefined)),
  signatureDataUrl: z.string().nullable().or(z.literal(undefined)),
});

type UserAccountFormProps = {
  user: Partial<User>;
};

const UserAccountForm = ({ user }: UserAccountFormProps) => {
  const [showAddressInput, setShowAddressInput] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
    user?.signatureUrl ?? null,
  );

  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      phoneNumber: (user?.phoneNumber || '') as string | null | undefined,
      addressLine1: user?.address
        ? (user.address as UserAddress).line1
        : undefined,
      addressLine2: user?.address
        ? (user.address as UserAddress).line2
        : undefined,
      city: user?.address ? (user.address as UserAddress).city : undefined,
      county: user?.address ? (user.address as UserAddress).county : undefined,
      postcode: user?.address
        ? (user.address as UserAddress).postcode
        : undefined,
      signatureDataUrl: (user?.signatureUrl || undefined) as
        | string
        | null
        | undefined,
    },
    validators: {
      onSubmit: profileFormSchema,
    },
    onSubmit: async ({ value }) => {
      // Build FormData to pass to the server action (maintaining compatibility)
      const formData = new FormData();
      formData.set('name', value.name);
      if (value.phoneNumber) formData.set('phoneNumber', value.phoneNumber);
      if (value.addressLine1) formData.set('addressLine1', value.addressLine1);
      if (value.addressLine2) formData.set('addressLine2', value.addressLine2);
      if (value.city) formData.set('city', value.city);
      if (value.county) formData.set('county', value.county);
      if (value.postcode) formData.set('postcode', value.postcode);
      if (signatureDataUrl) formData.set('signatureDataUrl', signatureDataUrl);

      await updateUserProfile(user.id!, formData);
    },
  });

  const handleAddressSelect = (address: Address) => {
    form.setFieldValue('addressLine1', address.line1);
    if (address.line2) {
      form.setFieldValue('addressLine2', address.line2);
    }
    form.setFieldValue('city', address.city);
    if (address.county) {
      form.setFieldValue('county', address.county);
    }
    form.setFieldValue('postcode', address.postcode);

    setShowAddressInput(false);
  };

  useEffect(() => {
    if (signatureDataUrl) {
      form.setFieldValue('signatureDataUrl', signatureDataUrl);
    }
  }, [signatureDataUrl, form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-8"
    >
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Personal Details</h3>

        <form.Field
          name="name"
          validators={{
            onBlur: profileFormSchema.shape.name,
          }}
        >
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Full Name</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="John Doe"
                  name="name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormDescription>
                Used on official forms and letters
              </TanstackFormDescription>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>

        <form.Field
          name="phoneNumber"
          validators={{
            onBlur: profileFormSchema.shape.phoneNumber,
          }}
        >
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Phone Number</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="07123456789"
                  name="phoneNumber"
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormDescription>
                UK mobile: 07xxx xxxxxx
              </TanstackFormDescription>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>
      </div>

      <div className="space-y-6 pt-6 border-t">
        <h3 className="text-lg font-medium">Address Information</h3>

        {showAddressInput && (
          <div className="mb-6">
            <Label>Find your address</Label>
            <AddressInput
              onSelect={handleAddressSelect}
              className="w-full mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Start typing your address to use autocomplete, or enter your
              address manually below.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowAddressInput(false)}
              type="button"
            >
              Enter manually
            </Button>
          </div>
        )}

        {!showAddressInput && (
          <Button
            variant="outline"
            size="sm"
            className="mb-6"
            onClick={() => setShowAddressInput(true)}
            type="button"
          >
            Find address
          </Button>
        )}

        <form.Field name="addressLine1">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Address Line 1</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="123 High Street"
                  name="addressLine1"
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>

        <form.Field name="addressLine2">
          {(field) => (
            <TanstackFormItem field={field}>
              <TanstackFormLabel>Address Line 2 (Optional)</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="Apartment, floor, etc."
                  name="addressLine2"
                  value={field.state.value || ''}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="city">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>City / Town</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="London"
                    name="city"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <form.Field name="county">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel>County (Optional)</TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="Greater London"
                    name="county"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>
        </div>

        <form.Field
          name="postcode"
          validators={{
            onBlur: profileFormSchema.shape.postcode,
          }}
        >
          {(field) => (
            <TanstackFormItem field={field} className="max-w-[200px]">
              <TanstackFormLabel>Postcode</TanstackFormLabel>
              <TanstackFormControl>
                <Input
                  placeholder="SW1A 1AA"
                  name="postcode"
                  value={field.state.value || ''}
                  onChange={(e) =>
                    field.handleChange(e.target.value.toUpperCase())
                  }
                  onBlur={field.handleBlur}
                />
              </TanstackFormControl>
              <TanstackFormMessage />
            </TanstackFormItem>
          )}
        </form.Field>
      </div>

      <div className="space-y-6 pt-6 border-t">
        <h3 className="text-lg font-medium">Your Signature</h3>
        <SignatureInput
          onSignatureChange={(newSignatureDataUrl) =>
            setSignatureDataUrl(newSignatureDataUrl)
          }
          signatureUrl={user?.signatureUrl || null}
        />
      </div>

      <div className="pt-6">
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};

export default UserAccountForm;
