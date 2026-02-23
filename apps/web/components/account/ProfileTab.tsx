'use client';

import { useState, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
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
  TanstackFormItem,
  TanstackFormLabel,
  TanstackFormControl,
  TanstackFormMessage,
} from '@/components/ui/tanstack-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AddressInput from '@/components/forms/inputs/AddressInput/AddressInput';
import SignatureInput from '@/components/SignatureInput/SignatureInput';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

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

type ProfileTabProps = {
  user: Partial<User>;
};

const ProfileTab = ({ user }: ProfileTabProps) => {
  const [showAddressInput, setShowAddressInput] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
      setIsSaving(true);
      try {
        // Build FormData to pass to the server action
        const formData = new FormData();
        formData.set('name', value.name);
        if (value.phoneNumber) formData.set('phoneNumber', value.phoneNumber);
        if (value.addressLine1)
          formData.set('addressLine1', value.addressLine1);
        if (value.addressLine2)
          formData.set('addressLine2', value.addressLine2);
        if (value.city) formData.set('city', value.city);
        if (value.county) formData.set('county', value.county);
        if (value.postcode) formData.set('postcode', value.postcode);
        if (signatureDataUrl)
          formData.set('signatureDataUrl', signatureDataUrl);

        const result = await updateUserProfile(user.id!, formData);
        if (result?.success) {
          setShowSuccess(true);
          toast.success('Profile updated successfully');
          setTimeout(() => setShowSuccess(false), 2000);
        }
      } finally {
        setIsSaving(false);
      }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit();
  };

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

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <form.Field name="name">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel className="text-sm font-medium text-dark">
                  Full Name
                </TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="John Doe"
                    className="h-11 rounded-lg border-border"
                    name="name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

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

          <form.Field name="phoneNumber">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel className="text-sm font-medium text-dark">
                  Phone Number <span className="text-gray">(Optional)</span>
                </TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="07123456789"
                    className="h-11 rounded-lg border-border"
                    name="phoneNumber"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </TanstackFormControl>
                <TanstackFormMessage />
              </TanstackFormItem>
            )}
          </form.Field>

          <Button
            type="submit"
            disabled={isSaving}
            className="h-11 bg-teal text-white hover:bg-teal-dark"
          >
            {(() => {
              if (isSaving) {
                return (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinnerThird}
                      className="mr-2 animate-spin"
                    />
                    Saving...
                  </>
                );
              }
              if (showSuccess) {
                return (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Saved!
                  </>
                );
              }
              return 'Save Changes';
            })()}
          </Button>
        </form>
      </div>

      {/* Address Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <h3 className="text-lg font-semibold text-dark">Address</h3>
        <p className="mt-1 text-sm text-gray">
          Your billing and correspondence address.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {showAddressInput && (
            <div>
              <Label className="text-sm font-medium text-dark">
                Find your address
              </Label>
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

          <form.Field name="addressLine1">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel className="text-sm font-medium text-dark">
                  Address Line 1
                </TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="123 High Street"
                    className="h-11 rounded-lg border-border"
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
                <TanstackFormLabel className="text-sm font-medium text-dark">
                  Address Line 2 <span className="text-gray">(Optional)</span>
                </TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="Flat 4B"
                    className="h-11 rounded-lg border-border"
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
                  <TanstackFormLabel className="text-sm font-medium text-dark">
                    City / Town
                  </TanstackFormLabel>
                  <TanstackFormControl>
                    <Input
                      placeholder="London"
                      className="h-11 rounded-lg border-border"
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

            <form.Field name="postcode">
              {(field) => (
                <TanstackFormItem field={field}>
                  <TanstackFormLabel className="text-sm font-medium text-dark">
                    Postcode
                  </TanstackFormLabel>
                  <TanstackFormControl>
                    <Input
                      placeholder="SW1A 1AA"
                      className="h-11 rounded-lg border-border"
                      name="postcode"
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

          <form.Field name="county">
            {(field) => (
              <TanstackFormItem field={field}>
                <TanstackFormLabel className="text-sm font-medium text-dark">
                  County <span className="text-gray">(Optional)</span>
                </TanstackFormLabel>
                <TanstackFormControl>
                  <Input
                    placeholder="Greater London"
                    className="h-11 rounded-lg border-border"
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
