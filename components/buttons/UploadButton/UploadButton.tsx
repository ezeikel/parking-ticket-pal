'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { faUpload } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import heic2any from 'heic2any';
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
import { createTicket } from '@/app/actions';
import MediaPreview from '@/components/MediaPreview/MediaPreview';
import { FileWithPreview, LoaderType } from '@/types';
import Loader from '@/components/Loader/Loader';
import { useToast } from '@/components/ui/use-toast';

const UploadButton = () => {
  const [imageFile, setImageFile] = useState<FileWithPreview | undefined>();
  const [convertingImage, setConvertingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleButtonClick = () => fileInputRef.current?.click();

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    let result;
    const file = event.target.files?.[0];

    if (!file) {
      console.error('No file selected.');
      return;
    }

    if (file.type === 'image/heic') {
      setConvertingImage(true);
      result = await heic2any({
        blob: file,
        toType: 'image/jpeg',
      });
      setConvertingImage(false);
    } else {
      result = file;
    }

    const fileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(result as Blob),
    }) as FileWithPreview;

    setImageFile(fileWithPreview);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            accept="image/*, image/heic"
            capture="user"
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
              <MediaPreview
                files={imageFile ? [imageFile] : []}
                convertingImage={convertingImage}
              />
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            className="font-sans"
            onClick={async () => {
              if (!imageFile) {
                console.error('No image file selected.');
                return;
              }

              try {
                const formData = new FormData();
                formData.append('imageFront', imageFile, imageFile.name);
                setIsLoading(true);

                await createTicket(formData);

                setIsLoading(false);

                // reset image file
                setImageFile(undefined);

                // close dialog
                setIsDialogOpen(false);

                // show success toast
                toast({
                  title: 'Ticket upload',
                  description: 'Your ticket has been successfully uploaded',
                });
              } catch (error) {
                console.error('Error creating ticket:', error);
              }
            }}
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
