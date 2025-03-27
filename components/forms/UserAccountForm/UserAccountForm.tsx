'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormState } from 'react-dom';
import { updateUserProfile } from '@/app/actions/user';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import SignatureInput from '@/components/SignatureInput';
import { User } from '@prisma/client';
import { Address } from '@/types';

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
    .optional()
    .nullable(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z
    .string()
    .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, {
      message: 'Please enter a valid UK postcode',
    })
    .optional(),
  signatureDataUrl: z.string().optional().nullable(),
});

type UserAccountFormProps = {
  user: Partial<User>;
};

const UserAccountForm = ({ user }: UserAccountFormProps) => {
  const [showAddressInput, setShowAddressInput] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name,
      phoneNumber: user?.phoneNumber || '',
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
      signatureDataUrl: user?.signatureUrl || undefined,
    },
  });

  // Use `useFormState` to bind the form to the server action
  const [_, formAction] = useFormState(
    async (_: any, formData: FormData) => updateUserProfile(user.id!, formData),
    null,
  );

  const handleAddressSelect = (address: Address) => {
    form.setValue('addressLine1', address.line1, { shouldValidate: true });
    if (address.line2) {
      form.setValue('addressLine2', address.line2, { shouldValidate: true });
    }
    form.setValue('city', address.city, { shouldValidate: true });
    if (address.county) {
      form.setValue('county', address.county, { shouldValidate: true });
    }
    form.setValue('postcode', address.postcode, { shouldValidate: true });

    setShowAddressInput(false);
  };

  useEffect(() => {
    if (signatureDataUrl) {
      form.setValue('signatureDataUrl', signatureDataUrl);
    }
  }, [signatureDataUrl, form]);

  useEffect(() => {
    if (user?.signatureUrl) {
      setSignatureDataUrl(user.signatureUrl);
    }
  }, [user]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-8">
        <input
          type="hidden"
          name="signatureDataUrl"
          value={signatureDataUrl || ''}
        />

        <div className="space-y-6">
          <h3 className="text-lg font-medium">Personal Details</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="07123456789"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6 pt-6 border-t">
          <h3 className="text-lg font-medium">Address Information</h3>

          {showAddressInput && (
            <div className="mb-6">
              <FormLabel>Find your address</FormLabel>
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

          <FormField
            control={form.control}
            name="addressLine1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1</FormLabel>
                <FormControl>
                  <Input placeholder="123 High Street" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="addressLine2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2 (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Apartment, floor, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City / Town</FormLabel>
                  <FormControl>
                    <Input placeholder="London" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Greater London" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="postcode"
            render={({ field }) => (
              <FormItem className="max-w-[200px]">
                <FormLabel>Postcode</FormLabel>
                <FormControl>
                  <Input placeholder="SW1A 1AA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-6 pt-6 border-t">
          <h3 className="text-lg font-medium">Your Signature</h3>
          <SignatureInput
            onSignatureChange={(signatureDataUrl) =>
              setSignatureDataUrl(signatureDataUrl)
            }
            signatureUrl={user?.signatureUrl || null}
          />
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UserAccountForm;
