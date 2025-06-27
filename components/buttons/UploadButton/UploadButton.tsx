'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { faUpload } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import MediaPreview from '@/components/MediaPreview/MediaPreview';
import { FileWithPreview, LoaderType } from '@/types';
import Loader from '@/components/Loader/Loader';
import { toast } from 'sonner';
import { refresh } from '@/app/actions';
import { uploadImage } from '@/app/actions/ocr';
// import { useAccountContext } from '@/contexts/account';

// type UploadButtonProps = {
//   hasProSubscription: boolean;
//   numberOfTickets: number;
// };

const UploadButton = () => {
  const [imageFile, setImageFile] = useState<FileWithPreview | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const { setIsFundAccountDialogOpen } = useAccountContext();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // handles dialog open state and checks if user is subscribed or has gets ridirected to pay before opening dialog
  const onOpenDialogChange = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false);
      return;
    }

    setIsDialogOpen(true);

    // TODO: figure out flow for letting users upload tickets/pay
    // if (hasProSubscription || numberOfTickets === 0) {
    //   setIsDialogOpen(true);
    // } else {
    //   // open dialog to subscribe or pay for a ticket
    //   setIsFundAccountDialogOpen(true);
    // }
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      console.error('No file selected.');
      return;
    }

    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file as Blob),
    }) as FileWithPreview;

    setImageFile(fileWithPreview);
  };

  useEffect(() => {
    if (!isDialogOpen) {
      setImageFile(undefined);
    }
  }, [isDialogOpen]);

  const handleSubmit = async () => {
    if (!imageFile) {
      console.error('No image file selected.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', imageFile, imageFile.name);
      setIsLoading(true);

      const result = await uploadImage(formData);

      if (!result.success) {
        toast.error(result.message || 'Failed to upload ticket');
        return;
      }

      // FIX: revalidarPath from route handler seemed to have no effect
      await refresh('/dashboard');

      setIsLoading(false);

      // reset image file
      setImageFile(undefined);

      // close dialog
      setIsDialogOpen(false);

      // show success toast
      toast.success('Your ticket has been successfully uploaded');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to upload ticket. Please try again.');
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={onOpenDialogChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="font-sans flex gap-x-2 items-center"
        >
          Upload New Ticket
          <FontAwesomeIcon icon={faUpload} className="font-sans" size="lg" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Uploading ticket' : 'Upload a ticket'}
          </DialogTitle>
          {isLoading ? (
            <DialogDescription>
              <Loader type={LoaderType.UPLOADING_TICKET_IMAGES} />
            </DialogDescription>
          ) : (
            <DialogDescription>
              Take a photo of the front and back of the ticket.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-y-4">
          <Input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleChange}
            className="hidden"
            ref={fileInputRef}
          />
          {isLoading ? null : (
            <>
              <Button
                variant="outline"
                className="font-sans flex gap-x-2 items-center"
                onClick={handleButtonClick}
                disabled={isLoading}
              >
                Select
              </Button>
              <MediaPreview files={imageFile ? [imageFile] : []} />
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            className="font-sans"
            onClick={handleSubmit}
            disabled={!imageFile || isLoading}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadButton;
