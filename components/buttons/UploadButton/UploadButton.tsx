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
import { FileWithPreview } from '@/types';

const UploadButton = () => {
  const [imageFile, setImageFile] = useState<FileWithPreview | undefined>();
  const [convertingImage, setConvertingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <Dialog>
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
          <DialogTitle>Upload a ticket</DialogTitle>
          <DialogDescription>
            Take a photo of the front and back of the ticket.
          </DialogDescription>
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
          <Button
            variant="outline"
            className="font-sans flex gap-x-2 items-center"
            onClick={handleButtonClick}
          >
            Select
          </Button>
          <MediaPreview
            files={imageFile ? [imageFile] : []}
            convertingImage={convertingImage}
          />
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
                await createTicket(formData);
              } catch (error) {
                console.error('Error creating ticket:', error);
              }
            }}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadButton;
