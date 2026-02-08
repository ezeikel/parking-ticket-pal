'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEnvelope,
  faCloudArrowUp,
  faEye,
  faDownload,
  faTrash,
  faSpinnerThird,
  faX,
  faFile,
} from '@fortawesome/pro-solid-svg-icons';
import { LetterType, Media } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { uploadLetterToTicket, deleteLetter } from '@/app/actions/letterUpload';
import { compressImage } from '@/utils/compressImage';

type StagedFile = {
  file: File;
  previewUrl: string;
  type: LetterType | null;
  sentAt: string;
};

type LetterWithMedia = {
  id: string;
  type: LetterType;
  sentAt: Date;
  summary: string | null;
  extractedText: string | null;
  media: Pick<Media, 'id' | 'url'>[];
};

type UploadedLettersCardProps = {
  ticketId: string;
  letters: LetterWithMedia[];
  onViewLetter?: (letter: LetterWithMedia) => void;
  onImageClick?: (imageUrl: string) => void;
};

const letterTypeLabels: Record<LetterType, string> = {
  [LetterType.INITIAL_NOTICE]: 'Initial Notice',
  [LetterType.NOTICE_TO_OWNER]: 'Notice to Owner (NTO)',
  [LetterType.CHARGE_CERTIFICATE]: 'Charge Certificate',
  [LetterType.ORDER_FOR_RECOVERY]: 'Order for Recovery',
  [LetterType.CCJ_NOTICE]: 'County Court Judgment (CCJ)',
  [LetterType.FINAL_DEMAND]: 'Final Demand',
  [LetterType.BAILIFF_NOTICE]: 'Bailiff Notice',
  [LetterType.APPEAL_RESPONSE]: 'Appeal Response',
  [LetterType.GENERIC]: 'Other Letter',
  [LetterType.CHALLENGE_LETTER]: 'Challenge Letter',
};

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const UploadedLettersCard = ({
  ticketId,
  letters,
  onViewLetter,
  onImageClick,
}: UploadedLettersCardProps) => {
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFile, setStagedFile] = useState<StagedFile | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (stagedFile) {
        URL.revokeObjectURL(stagedFile.previewUrl);
      }
    };
  }, [stagedFile]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      if (stagedFile) {
        URL.revokeObjectURL(stagedFile.previewUrl);
      }

      setStagedFile({
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        type: null,
        sentAt: new Date().toISOString().split('T')[0],
      });
      setShowUploadForm(true);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (!stagedFile) return;

    const { file, type, sentAt } = stagedFile;
    if (!type) {
      toast.error('Please select a letter type.');
      return;
    }

    startTransition(async () => {
      // Compress image before upload
      let uploadFile: File = file;
      try {
        const compressed = await compressImage(file);
        uploadFile = compressed.file;
      } catch {
        // Compression failed — use original file
      }

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('letterType', type);
      formData.append('sentAt', sentAt);

      const result = await uploadLetterToTicket(ticketId, formData);
      if (result.success) {
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success('Letter uploaded successfully.');
        }
        setStagedFile(null);
        setShowUploadForm(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    });
  };

  const handleDelete = (letter: LetterWithMedia) => {
    startTransition(async () => {
      const result = await deleteLetter(letter.id);
      if (result.success) {
        toast.success('Letter deleted successfully.');
      } else {
        toast.error(`Delete failed: ${result.error}`);
      }
    });
  };

  const cancelUpload = () => {
    if (stagedFile) {
      URL.revokeObjectURL(stagedFile.previewUrl);
    }
    setStagedFile(null);
    setShowUploadForm(false);
  };

  // Filter to only show council letters (not challenge letters we generated)
  const councilLetters = letters.filter(
    (l) => l.type !== LetterType.CHALLENGE_LETTER,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">Letters Received</h2>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent"
          onClick={() => setShowUploadForm(true)}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
          Add Letter
        </Button>
      </div>
      <p className="mt-1 text-sm text-gray">
        Upload letters from the council (NTO, Charge Certificate, etc.)
      </p>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="mt-4 rounded-lg border border-border bg-light/50 p-4">
          {!stagedFile ? (
            <div
              className={cn(
                'relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer',
                isDragging
                  ? 'border-teal bg-teal/10'
                  : 'border-border hover:border-teal',
              )}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <FontAwesomeIcon
                icon={faCloudArrowUp}
                className="text-3xl text-gray/40"
              />
              <p className="mt-2 text-sm text-gray">
                Drag and drop a letter image or click to upload
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                disabled={isPending}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-dark">Letter Details</h4>
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                  <FontAwesomeIcon icon={faX} />
                </Button>
              </div>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="w-full flex-shrink-0 md:w-32">
                  {stagedFile.file.type.startsWith('image/') ? (
                    <img
                      src={stagedFile.previewUrl}
                      alt="Preview"
                      className="h-24 w-full rounded-lg border object-cover md:h-32"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center rounded-lg border bg-white md:h-32">
                      <FontAwesomeIcon
                        icon={faFile}
                        className="text-2xl text-gray/40"
                      />
                    </div>
                  )}
                  <p className="mt-1 truncate text-xs text-gray">
                    {stagedFile.file.name}
                  </p>
                </div>
                <div className="flex-grow space-y-3">
                  <div>
                    <Label
                      htmlFor="letter-type"
                      className="text-sm font-medium text-gray"
                    >
                      Letter Type
                    </Label>
                    <Select
                      value={stagedFile.type || ''}
                      onValueChange={(value) =>
                        setStagedFile((prev) =>
                          prev ? { ...prev, type: value as LetterType } : null,
                        )
                      }
                    >
                      <SelectTrigger id="letter-type" className="mt-1 bg-white">
                        <SelectValue placeholder="Select letter type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(letterTypeLabels)
                          .filter(
                            ([key]) => key !== LetterType.CHALLENGE_LETTER,
                          )
                          .map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="sent-at"
                      className="text-sm font-medium text-gray"
                    >
                      Letter Date
                    </Label>
                    <Input
                      id="sent-at"
                      type="date"
                      className="mt-1 bg-white"
                      value={stagedFile.sentAt}
                      onChange={(e) =>
                        setStagedFile((prev) =>
                          prev ? { ...prev, sentAt: e.target.value } : null,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={cancelUpload}
                  className="bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isPending}
                  className="bg-teal text-white hover:bg-teal-dark"
                >
                  {isPending && (
                    <FontAwesomeIcon
                      icon={faSpinnerThird}
                      className="mr-2 animate-spin"
                    />
                  )}
                  Upload Letter
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Letters List */}
      {councilLetters.length > 0 ? (
        <div className="mt-4 space-y-3">
          {councilLetters.map((letter) => (
            <div
              key={letter.id}
              className="group relative rounded-lg border border-border bg-light/50 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="text-lg text-teal"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-dark">
                      {letterTypeLabels[letter.type] || letter.type}
                    </h4>
                    <p className="text-xs text-gray">
                      Received {formatDate(letter.sentAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(letter)}
                  disabled={isPending}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-coral/10 text-coral opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-xs" />
                </button>
              </div>

              {/* Preview of extracted text */}
              {letter.extractedText && (
                <div className="relative mt-3 rounded-lg bg-white p-3">
                  <p className="line-clamp-2 text-sm text-dark/80">
                    {letter.extractedText}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-6 rounded-b-lg bg-gradient-to-t from-white to-transparent" />
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                {letter.extractedText && onViewLetter && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
                    onClick={() => onViewLetter(letter)}
                  >
                    <FontAwesomeIcon icon={faEye} className="mr-1.5" />
                    View Content
                  </Button>
                )}
                {letter.media.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      onClick={() => onImageClick?.(letter.media[0].url)}
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-1.5" />
                      View Image
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent"
                      asChild
                    >
                      <a href={letter.media[0].url} download>
                        <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
                        Download
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !showUploadForm ? (
        <div
          className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-6 transition-colors hover:border-teal"
          onClick={() => setShowUploadForm(true)}
          onKeyDown={(e) => e.key === 'Enter' && setShowUploadForm(true)}
          role="button"
          tabIndex={0}
        >
          <FontAwesomeIcon
            icon={faEnvelope}
            className="text-2xl text-gray/40"
          />
          <p className="mt-2 text-sm text-gray">
            Upload letters from the council
          </p>
        </div>
      ) : null}
    </motion.div>
  );
};

export default UploadedLettersCard;
