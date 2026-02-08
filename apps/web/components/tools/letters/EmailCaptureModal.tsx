'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faXmark,
  faEnvelope,
  faSpinnerThird,
  faCircleCheck,
} from '@fortawesome/pro-solid-svg-icons';

type EmailCaptureModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, firstName: string) => Promise<void>;
  templateTitle: string;
};

const EmailCaptureModal = ({
  isOpen,
  onClose,
  onSubmit,
  templateTitle,
}: EmailCaptureModalProps) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(email, firstName);
      setIsSuccess(true);
      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset state after modal closes
        setTimeout(() => {
          setIsSuccess(false);
          setEmail('');
          setFirstName('');
        }, 300);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset state after modal closes
      setTimeout(() => {
        setIsSuccess(false);
        setError(null);
        setEmail('');
        setFirstName('');
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-dark/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
          >
            <div className="rounded-2xl bg-white p-6 shadow-xl">
              {/* Close button */}
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="absolute right-4 top-4 p-2 text-gray transition-colors hover:text-dark disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>

              {isSuccess ? (
                /* Success State */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
                    <FontAwesomeIcon
                      icon={faCircleCheck}
                      className="text-3xl text-teal"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-dark">
                    Check Your Email!
                  </h3>
                  <p className="mt-2 text-sm text-gray">
                    Your letter is on its way as a PDF attachment.
                  </p>
                </motion.div>
              ) : (
                /* Form State */
                <>
                  {/* Header */}
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-teal/10">
                      <FontAwesomeIcon
                        icon={faEnvelope}
                        className="text-xl text-teal"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-dark">
                      Get Your Letter
                    </h3>
                    <p className="mt-2 text-sm text-gray">
                      We&apos;ll send your &ldquo;{templateTitle}&rdquo; to your
                      inbox as a PDF, ready to print and use.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="mb-1 block text-sm font-medium text-dark"
                      >
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        required
                        disabled={isSubmitting}
                        className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-dark placeholder:text-gray/50 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1 block text-sm font-medium text-dark"
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        required
                        disabled={isSubmitting}
                        className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-dark placeholder:text-gray/50 focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal disabled:opacity-50"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-coral">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-teal py-3 text-center font-semibold text-white transition-colors hover:bg-teal-dark disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <FontAwesomeIcon
                          icon={faSpinnerThird}
                          className="animate-spin"
                        />
                      ) : (
                        'Send to My Email'
                      )}
                    </button>

                    <p className="text-center text-xs text-gray">
                      We respect your privacy. Unsubscribe anytime.
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EmailCaptureModal;
