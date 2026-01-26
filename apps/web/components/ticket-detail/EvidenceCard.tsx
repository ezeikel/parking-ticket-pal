'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faExpand,
  faCloudArrowUp,
  faFile,
  faX,
  faSpinnerThird,
  faTrash,
} from '@fortawesome/pro-solid-svg-icons';
import { Media, EvidenceType } from '@parking-ticket-pal/db/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { uploadEvidence, deleteEvidence } from '@/app/actions/evidence';
import { evidenceTypeOptions } from '@/constants/evidence';

type StagedFile = {
  file: File;
  previewUrl: string;
  type: EvidenceType | null;
  description: string;
};

type EvidenceCardProps = {
  ticketId: string;
  evidence: Pick<Media, 'id' | 'url' | 'description' | 'evidenceType'>[];
  onImageClick?: (imageUrl: string) => void;
};

const EvidenceCard = ({
  ticketId,
  evidence,
  onImageClick,
}: EvidenceCardProps) => {
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
        description: '',
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

    const { file, type, description } = stagedFile;
    if (!type || !description) {
      toast.error('Please select a document type and add a description.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', type);
    formData.append('description', description);

    startTransition(async () => {
      const result = await uploadEvidence(ticketId, formData);
      if (result.success) {
        toast.success('Evidence uploaded successfully.');
        setStagedFile(null);
        setShowUploadForm(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    });
  };

  const handleDelete = (media: Pick<Media, 'id' | 'url'>) => {
    startTransition(async () => {
      const result = await deleteEvidence(ticketId, media.id, media.url);
      if (result.success) {
        toast.success('Evidence deleted successfully.');
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

  const isImage = (url: string) => {
    return url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border bg-white p-5 md:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-dark">
          Evidence & Documents
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent"
          onClick={() => setShowUploadForm(true)}
        >
          <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
          Add Evidence
        </Button>
      </div>

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
                Drag and drop files or click to upload
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                disabled={isPending}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-dark">
                  Prepare Your Evidence
                </h4>
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
                      htmlFor="doc-type"
                      className="text-sm font-medium text-gray"
                    >
                      Document Type
                    </Label>
                    <Select
                      value={stagedFile.type || ''}
                      onValueChange={(value) =>
                        setStagedFile((prev) =>
                          prev
                            ? { ...prev, type: value as EvidenceType }
                            : null,
                        )
                      }
                    >
                      <SelectTrigger id="doc-type" className="mt-1 bg-white">
                        <SelectValue placeholder="Select a type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {evidenceTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-gray"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      className="mt-1 bg-white"
                      placeholder="e.g., Photo showing unclear signage at location"
                      value={stagedFile.description}
                      onChange={(e) =>
                        setStagedFile((prev) =>
                          prev
                            ? { ...prev, description: e.target.value }
                            : null,
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
                  Upload
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Grid */}
      {evidence.length > 0 ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {evidence.map((item) => (
            <div key={item.id} className="group relative">
              <button
                type="button"
                onClick={() => onImageClick?.(item.url)}
                className="relative aspect-square w-full overflow-hidden rounded-lg bg-light transition-transform hover:scale-105"
              >
                {isImage(item.url) ? (
                  <img
                    src={item.url}
                    alt={item.description || 'Evidence'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <FontAwesomeIcon
                      icon={faFile}
                      className="text-2xl text-gray/40"
                    />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-dark/0 transition-colors group-hover:bg-dark/40">
                  <FontAwesomeIcon
                    icon={faExpand}
                    className="text-white opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                disabled={isPending}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-coral text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faTrash} className="text-xs" />
              </button>
            </div>
          ))}

          {/* Upload Dropzone */}
          {!showUploadForm && (
            <button
              type="button"
              onClick={() => setShowUploadForm(true)}
              className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border bg-light/50 text-gray transition-colors hover:border-teal hover:text-teal"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xl" />
            </button>
          )}
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
            icon={faCloudArrowUp}
            className="text-2xl text-gray/40"
          />
          <p className="mt-2 text-sm text-gray">Add supporting evidence</p>
        </div>
      ) : null}
    </motion.div>
  );
};

export default EvidenceCard;
