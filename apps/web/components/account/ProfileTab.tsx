'use client';

import { useState, useEffect, useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faSpinnerThird,
  faBadgeCheck,
} from '@fortawesome/pro-solid-svg-icons';
import { User } from '@parking-ticket-pal/db/types';
import { Address } from '@parking-ticket-pal/types';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import SignatureInput from '@/components/SignatureInput/SignatureInput';
import { toast } from 'sonner';

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
    .nullable()
    .or(z.literal('')),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  postcode: z
    .string()
    .regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, {
      message: 'Please enter a valid UK postcode',
    })
    .optional()
    .or(z.literal('')),
  signatureDataUrl: z.string().optional().nullable(),
});

type ProfileTabProps = {
  user: Partial<User>;
};

const ProfileTab = ({ user }: ProfileTabProps) => {
  const [showAddressInput, setShowAddressInput] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
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

  const [, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      setIsSaving(true);
      try {
        const result = await updateUserProfile(user.id!, formData);
        if (result?.success) {
          setShowSuccess(true);
          toast.success('Profile updated successfully');
          setTimeout(() => setShowSuccess(false), 2000);
        }
        return result;
      } finally {
        setIsSaving(false);
      }
    },
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

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      {/* Profile Picture Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-6">
          <Avatar className="h-24 w-24 md:h-28 md:w-28">
            <AvatarImage
              src={user?.image || undefined}
              alt={user?.name || 'User'}
            />
            <AvatarFallback className="bg-teal/10 text-2xl font-semibold text-teal">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold text-dark">
              {user?.name || 'Your Name'}
            </h3>
            <p className="text-sm text-gray">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold text-dark">
          Personal Information
        </h3>
        <p className="mt-1 text-sm text-gray">Update your personal details.</p>

        <Form {...form}>
          <form action={formAction} className="mt-6 space-y-5">
            <input
              type="hidden"
              name="signatureDataUrl"
              value={signatureDataUrl || ''}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-dark">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      className="h-11 rounded-lg border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email (read-only with verified badge) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                Email
              </label>
              <div className="relative">
                <Input
                  value={user?.email || ''}
                  disabled
                  className="h-11 rounded-lg border-border bg-light pr-24"
                />
                {user?.emailVerified && (
                  <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal">
                    <FontAwesomeIcon icon={faBadgeCheck} />
                    Verified
                  </span>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-dark">
                    Phone Number <span className="text-gray">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="07123456789"
                      className="h-11 rounded-lg border-border"
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

            <Button
              type="submit"
              disabled={isSaving}
              className="h-11 bg-teal text-white hover:bg-teal-dark"
            >
              {isSaving ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="mr-2 animate-spin"
                  />
                  Saving...
                </>
              ) : showSuccess ? (
                <>
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Address Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold text-dark">Address</h3>
        <p className="mt-1 text-sm text-gray">
          Your billing and correspondence address.
        </p>

        <Form {...form}>
          <form action={formAction} className="mt-6 space-y-5">
            {showAddressInput && (
              <div>
                <FormLabel className="text-sm font-medium text-dark">
                  Find your address
                </FormLabel>
                <AddressInput
                  onSelect={handleAddressSelect}
                  className="mt-1.5 w-full"
                />
                <p className="mt-2 text-xs text-gray">
                  Start typing to search, or{' '}
                  <button
                    type="button"
                    onClick={() => setShowAddressInput(false)}
                    className="text-teal hover:underline"
                  >
                    enter manually
                  </button>
                </p>
              </div>
            )}

            {!showAddressInput && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowAddressInput(true)}
                className="mb-4"
              >
                Search for address
              </Button>
            )}

            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-dark">
                    Address Line 1
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 High Street"
                      className="h-11 rounded-lg border-border"
                      {...field}
                    />
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
                  <FormLabel className="text-sm font-medium text-dark">
                    Address Line 2 <span className="text-gray">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Flat 4B"
                      className="h-11 rounded-lg border-border"
                      {...field}
                    />
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
                    <FormLabel className="text-sm font-medium text-dark">
                      City / Town
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="London"
                        className="h-11 rounded-lg border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-dark">
                      Postcode
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="SW1A 1AA"
                        className="h-11 rounded-lg border-border"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-dark">
                    County <span className="text-gray">(Optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Greater London"
                      className="h-11 rounded-lg border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Country is fixed for UK */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark">
                Country
              </label>
              <Input
                value="United Kingdom"
                disabled
                className="h-11 rounded-lg border-border bg-light"
              />
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="h-11 bg-teal text-white hover:bg-teal-dark"
            >
              {isSaving ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    className="mr-2 animate-spin"
                  />
                  Saving...
                </>
              ) : (
                'Save Address'
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Signature Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold text-dark">Your Signature</h3>
        <p className="mt-1 text-sm text-gray">
          Used for appeal letters. Draw your signature below.
        </p>

        <div className="mt-6">
          <SignatureInput
            onSignatureChange={(newSignatureDataUrl) =>
              setSignatureDataUrl(newSignatureDataUrl)
            }
            signatureUrl={user?.signatureUrl || null}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
