'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faTrashCan,
  faSpinnerThird,
  faCircleXmark,
} from '@fortawesome/pro-solid-svg-icons';
import { User } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type DeleteAccountTabProps = {
  user: Partial<User>;
};

const DeleteAccountTab = ({ user: _user }: DeleteAccountTabProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const CONFIRM_PHRASE = 'DELETE';

  const handleDeleteAccount = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      toast.error(`Please type "${CONFIRM_PHRASE}" to confirm`);
      return;
    }

    setIsDeleting(true);
    try {
      // TODO: Implement account deletion
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast.success('Account deleted. Redirecting...');
      // Redirect to home after deletion
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-red-200 bg-red-50 p-6"
      >
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xl text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-700">Delete Your Account</h3>
            <p className="mt-2 text-sm text-red-600">
              This action is <strong>permanent</strong> and cannot be undone. Once you delete
              your account:
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2 text-sm text-red-600">
                <FontAwesomeIcon icon={faCircleXmark} className="mt-0.5 text-red-400" />
                All your tickets and appeal letters will be permanently deleted
              </li>
              <li className="flex items-start gap-2 text-sm text-red-600">
                <FontAwesomeIcon icon={faCircleXmark} className="mt-0.5 text-red-400" />
                Your subscription will be cancelled immediately with no refund
              </li>
              <li className="flex items-start gap-2 text-sm text-red-600">
                <FontAwesomeIcon icon={faCircleXmark} className="mt-0.5 text-red-400" />
                All your vehicle and personal data will be erased
              </li>
              <li className="flex items-start gap-2 text-sm text-red-600">
                <FontAwesomeIcon icon={faCircleXmark} className="mt-0.5 text-red-400" />
                You will lose access to any ongoing appeals
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-red-200 pt-6">
          <Button
            variant="destructive"
            onClick={() => setShowConfirmDialog(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <FontAwesomeIcon icon={faTrashCan} className="mr-2" />
            Delete My Account
          </Button>
        </div>
      </motion.div>

      {/* Alternatives Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]">
        <h4 className="font-semibold text-dark">Before you go...</h4>
        <p className="mt-2 text-sm text-gray">
          If you&apos;re having issues with Parking Ticket Pal, we&apos;d love to help. Consider
          these alternatives:
        </p>
        <ul className="mt-4 space-y-3">
          <li className="rounded-lg bg-light p-3">
            <p className="font-medium text-dark">Contact Support</p>
            <p className="text-sm text-gray">
              We can help resolve any issues you&apos;re experiencing.{' '}
              <a
                href="mailto:support@parkticketpal.com"
                className="text-teal hover:underline"
              >
                Email us
              </a>
            </p>
          </li>
          <li className="rounded-lg bg-light p-3">
            <p className="font-medium text-dark">Pause Your Subscription</p>
            <p className="text-sm text-gray">
              Taking a break? You can cancel your subscription without deleting your account
              and data.
            </p>
          </li>
          <li className="rounded-lg bg-light p-3">
            <p className="font-medium text-dark">Download Your Data</p>
            <p className="text-sm text-gray">
              Export a copy of your tickets and letters before deleting.{' '}
              <button type="button" className="text-teal hover:underline">
                Request data export
              </button>
            </p>
          </li>
        </ul>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <FontAwesomeIcon icon={faTrashCan} className="text-2xl text-red-500" />
            </div>
            <DialogTitle className="text-center text-xl">Are you absolutely sure?</DialogTitle>
            <DialogDescription className="text-center">
              This will permanently delete your account and all associated data. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-dark">
              Type <span className="font-mono font-bold text-red-600">{CONFIRM_PHRASE}</span> to
              confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder={CONFIRM_PHRASE}
              className="h-11 font-mono uppercase"
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmText('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmText !== CONFIRM_PHRASE || isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <FontAwesomeIcon icon={faSpinnerThird} className="mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrashCan} className="mr-2" />
                  Delete Account Forever
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeleteAccountTab;
