'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird, faPen } from '@fortawesome/pro-solid-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import SignatureInput from '@/components/SignatureInput/SignatureInput';
import { updateUserProfile } from '@/app/actions/user';
import { toast } from 'sonner';

type SignatureGateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSignatureSaved: () => void;
  onSkip: () => void;
  userId: string;
  existingSignatureUrl?: string | null;
};

const SignatureGateModal = ({
  isOpen,
  onClose,
  onSignatureSaved,
  onSkip,
  userId,
  existingSignatureUrl,
}: SignatureGateModalProps) => {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndContinue = async () => {
    if (!signatureDataUrl) {
      toast.error('Please draw your signature first');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set('signatureDataUrl', signatureDataUrl);

      const result = await updateUserProfile(userId, formData);

      if (result.success) {
        toast.success('Signature saved to your profile');
        onSignatureSaved();
      } else {
        toast.error(result.error || 'Failed to save signature');
      }
    } catch {
      toast.error('Failed to save signature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
            <FontAwesomeIcon icon={faPen} className="h-5 w-5 text-teal" />
          </div>
          <DialogTitle className="text-center">Add Your Signature</DialogTitle>
          <DialogDescription className="text-center">
            Your signature will appear on your challenge letter. This makes your
            appeal look more professional and official.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <SignatureInput
            onSignatureChange={setSignatureDataUrl}
            signatureUrl={existingSignatureUrl}
            description="Draw your signature below. This will be saved to your profile for future use."
            warningText="Your signature will be used on challenge letters."
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSaveAndContinue}
            disabled={!signatureDataUrl || isSaving}
            className="w-full bg-teal text-white hover:bg-teal-dark"
          >
            {isSaving ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="mr-2 h-4 w-4 animate-spin"
                />
                Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSaving}
            className="w-full text-muted-foreground"
          >
            Skip for now (use typed name)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureGateModal;
