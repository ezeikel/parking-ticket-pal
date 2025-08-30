'use client';

import { useState, useEffect, useMemo, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendFeedback } from '@/app/actions/feedback';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheckCircle } from '@fortawesome/pro-regular-svg-icons';

type Category = 'issue' | 'idea' | 'other';

const categoryDetails: Record<
  Category,
  { emoji: string; title: string; placeholder: string }
> = {
  issue: {
    emoji: '⚠️',
    title: 'Report an issue',
    placeholder: 'I noticed that...',
  },
  idea: {
    emoji: '💡',
    title: 'Share an idea',
    placeholder: 'I would love...',
  },
  other: {
    emoji: '🤔',
    title: 'Tell us anything!',
    placeholder: 'What do you want us to know?',
  },
};

type FeedbackDialogProps = {
  userEmail?: string;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Sending...' : 'Send feedback'}
    </Button>
  );
};

const FeedbackDialog = ({
  userEmail,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: FeedbackDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [view, setView] = useState<'category' | 'form' | 'success'>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const initialState = { message: '' };
  const [state, dispatch] = useActionState(sendFeedback, initialState);

  useEffect(() => {
    if ('success' in state && state.success) {
      setView('success');
      const timer = setTimeout(() => {
        setOpen(false);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      // no-op
    };
  }, [state]);

  // Reset state when dialog is closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setView('category');
        setSelectedCategory(null);
      }, 200); // Delay to allow closing animation
    }
  }, [open]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setView('form');
  };

  const handleBack = () => {
    setView('category');
    setSelectedCategory(null);
  };

  const currentCategoryDetails = useMemo(
    () => (selectedCategory ? categoryDetails[selectedCategory] : null),
    [selectedCategory],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {view === 'category' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                What&apos;s on your mind?
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-4">
              {(Object.keys(categoryDetails) as Category[]).map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  className="flex flex-col h-24 bg-transparent"
                  onClick={() => handleCategorySelect(key)}
                >
                  <span className="text-3xl mb-2">
                    {categoryDetails[key].emoji}
                  </span>
                  <span className="capitalize">{key}</span>
                </Button>
              ))}
            </div>
          </>
        )}

        {view === 'form' && currentCategoryDetails && (
          <form action={dispatch}>
            <input type="hidden" name="category" value={selectedCategory!} />
            {userEmail && (
              <input type="hidden" name="userEmail" value={userEmail} />
            )}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleBack}
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                  <span className="sr-only">Back</span>
                </Button>
                <span className="text-2xl">{currentCategoryDetails.emoji}</span>
                {currentCategoryDetails.title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                name="text"
                placeholder={currentCategoryDetails.placeholder}
                className="min-h-[120px]"
                required
              />
              {'errors' in state && (state as any).errors?.text && (
                <p className="text-sm text-red-500 mt-1">
                  {(state as any).errors.text[0]}
                </p>
              )}
            </div>
            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
        )}

        {view === 'success' && (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <FontAwesomeIcon
              icon={faCheckCircle}
              className="text-green-500 text-5xl mb-4"
            />
            <h3 className="text-xl font-semibold">Thank you!</h3>
            <p className="text-muted-foreground">
              Your feedback has been sent.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
