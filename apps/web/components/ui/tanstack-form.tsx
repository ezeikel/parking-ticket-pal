'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import cn from '@/utils/cn';
import { Label } from '@/components/ui/label';

/** Minimal shape of a TanStack Form FieldApi — avoids 23-param generic. */
interface AnyFieldApi {
  name: string;
  state: {
    meta: {
      errors: unknown[];
    };
  };
}

// Context to pass field error state down to children
interface TanstackFieldContextValue {
  id: string;
  name: string;
  hasError: boolean;
  errorMessage: string | undefined;
}

const TanstackFieldContext = React.createContext<TanstackFieldContextValue>({
  id: '',
  name: '',
  hasError: false,
  errorMessage: undefined,
});

const useTanstackField = () => React.useContext(TanstackFieldContext);

// Wrapper for a field — provides context and layout
function TanstackFormItem({
  field,
  className,
  children,
  ...props
}: {
  field: AnyFieldApi;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const id = React.useId();
  const { errors } = field.state.meta;
  const hasError = errors.length > 0;
  const errorMessage = hasError ? String(errors[0]) : undefined;

  const value = React.useMemo(
    () => ({ id, name: field.name, hasError, errorMessage }),
    [id, field.name, hasError, errorMessage],
  );

  return (
    <TanstackFieldContext.Provider value={value}>
      <div className={cn('space-y-2', className)} {...props}>
        {children}
      </div>
    </TanstackFieldContext.Provider>
  );
}

// Label that turns red on error
const TanstackFormLabel = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { id, hasError } = useTanstackField();

  return (
    <Label
      ref={ref}
      className={cn(hasError && 'text-destructive', className)}
      htmlFor={`${id}-form-item`}
      {...props}
    />
  );
});
TanstackFormLabel.displayName = 'TanstackFormLabel';

// Slot-based control that wires up aria attributes
const TanstackFormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { id, hasError } = useTanstackField();

  return (
    <Slot
      ref={ref}
      id={`${id}-form-item`}
      aria-describedby={
        !hasError
          ? `${id}-form-item-description`
          : `${id}-form-item-description ${id}-form-item-message`
      }
      aria-invalid={hasError}
      {...props}
    />
  );
});
TanstackFormControl.displayName = 'TanstackFormControl';

// Displays the first validation error
const TanstackFormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { id, errorMessage } = useTanstackField();
  const body = errorMessage || children;

  if (!body) return null;

  return (
    <p
      ref={ref}
      id={`${id}-form-item-message`}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  );
});
TanstackFormMessage.displayName = 'TanstackFormMessage';

// Description text
const TanstackFormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { id } = useTanstackField();

  return (
    <p
      ref={ref}
      id={`${id}-form-item-description`}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
TanstackFormDescription.displayName = 'TanstackFormDescription';

export {
  TanstackFormItem,
  TanstackFormLabel,
  TanstackFormControl,
  TanstackFormMessage,
  TanstackFormDescription,
};
