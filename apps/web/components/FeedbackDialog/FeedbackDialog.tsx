'use client';

import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheckCircle,
  faSpinnerThird,
} from '@fortawesome/pro-solid-svg-icons';
import {
  faBug,
  faLightbulb,
  faCircleQuestion,
  faCommentDots,
} from '@fortawesome/pro-regular-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';

type FeedbackType = 'bug' | 'idea' | 'help' | 'other';

const feedbackTypes: Record<
  FeedbackType,
  {
    icon: typeof faBug;
    label: string;
    color: string;
    bgColor: string;
    placeholder: string;
  }
> = {
  bug: {
    icon: faBug,
    label: 'Report a bug',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    placeholder:
      'What went wrong? Please include steps to reproduce if possible...',
  },
  idea: {
    icon: faLightbulb,
    label: 'Suggest a feature',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    placeholder: 'What would you like to see? How would it help you?',
  },
  help: {
    icon: faCircleQuestion,
    label: 'Get help',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    placeholder: 'What do you need help with?',
  },
  other: {
    icon: faCommentDots,
    label: 'Something else',
    color: 'text-teal',
    bgColor: 'bg-teal/10',
    placeholder: 'What would you like to tell us?',
  },
};

type FeedbackDialogProps = {
  userEmail?: string;
  userName?: string;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultType?: FeedbackType;
};

const FeedbackDialog = ({
  userEmail,
  userName,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  defaultType,
}: FeedbackDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [view, setView] = useState<'type' | 'form' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(
    defaultType || null,
  );
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setView(defaultType ? 'form' : 'type');
        setSelectedType(defaultType || null);
        setMessage('');
        if (!userEmail) setEmail('');
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, defaultType, userEmail]);

  // If defaultType is set, start on form view
  useEffect(() => {
    if (defaultType) {
      setSelectedType(defaultType);
      setView('form');
    }
  }, [defaultType]);

  const handleTypeSelect = (type: FeedbackType) => {
    setSelectedType(type);
    setView('form');
  };

  const handleBack = () => {
    if (defaultType) {
      setOpen(false);
    } else {
      setView('type');
      setSelectedType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !message.trim()) return;

    setIsSubmitting(true);

    try {
      // Send to PostHog as a survey response
      posthog.capture('feedback_submitted', {
        feedback_type: selectedType,
        feedback_message: message,
        user_email: email || undefined,
        user_name: userName || undefined,
        page_url:
          typeof window !== 'undefined' ? window.location.href : undefined,
        $set: email ? { email } : undefined,
      });

      setView('success');

      // Auto-close after success
      setTimeout(() => {
        setOpen(false);
      }, 2000);
    } catch (error) {
      logger.error(
        'Failed to submit feedback',
        { page: 'feedback' },
        error instanceof Error ? error : undefined,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentType = selectedType ? feedbackTypes[selectedType] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl font-semibold text-center">
                  How can we help?
                </DialogTitle>
                <p className="text-sm text-gray text-center mt-1">
                  We read every message and respond as quickly as we can.
                </p>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 mt-2">
                {(Object.keys(feedbackTypes) as FeedbackType[]).map((type) => {
                  const config = feedbackTypes[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeSelect(type)}
                      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-5 text-center transition-all hover:border-teal hover:bg-teal/5 focus:outline-none focus:ring-2 focus:ring-teal/20"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${config.bgColor}`}
                      >
                        <FontAwesomeIcon
                          icon={config.icon}
                          className={`text-lg ${config.color}`}
                        />
                      </div>
                      <span className="text-sm font-medium text-dark">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === 'form' && currentType && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 pb-0">
                <DialogHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-light"
                    >
                      <FontAwesomeIcon
                        icon={faArrowLeft}
                        className="text-gray"
                      />
                    </button>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${currentType.bgColor}`}
                    >
                      <FontAwesomeIcon
                        icon={currentType.icon}
                        className={currentType.color}
                      />
                    </div>
                    <DialogTitle className="text-lg font-semibold">
                      {currentType.label}
                    </DialogTitle>
                  </div>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="p-6 pt-2">
                <div className="space-y-4">
                  <div>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={currentType.placeholder}
                      className="min-h-[140px] resize-none rounded-xl border-border focus:border-teal focus:ring-teal/20"
                      required
                      autoFocus
                    />
                  </div>

                  {!userEmail && (
                    <div>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Your email (optional, for follow-up)"
                        className="h-11 rounded-xl border-border focus:border-teal focus:ring-teal/20"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full h-12 rounded-xl bg-teal text-white font-medium hover:bg-teal-dark disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <FontAwesomeIcon
                          icon={faSpinnerThird}
                          className="mr-2 animate-spin"
                        />
                        Sending...
                      </>
                    ) : (
                      'Send message'
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-8"
            >
              <div className="flex flex-col items-center justify-center text-center py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal/10 mb-4">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="text-3xl text-teal"
                  />
                </div>
                <h3 className="text-xl font-semibold text-dark">
                  Thanks for your feedback!
                </h3>
                <p className="text-gray mt-2">
                  We appreciate you taking the time to help us improve.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
