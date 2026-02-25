'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccountContext } from '@/contexts/account';

const FundAccountDialog = () => {
  const { isFundAccountDialogOpen, setIsFundAccountDialogOpen } =
    useAccountContext();

  return (
    <Dialog
      open={isFundAccountDialogOpen}
      onOpenChange={setIsFundAccountDialogOpen}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-sans">Upgrade to Premium</DialogTitle>
          <DialogDescription>
            This feature requires a Premium upgrade for this ticket. Upgrade for
            just £14.99 to unlock all premium features.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button asChild className="w-full">
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsFundAccountDialogOpen(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FundAccountDialog;
