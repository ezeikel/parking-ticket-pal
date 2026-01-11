'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFile,
  faSpinnerThird,
  faTrash,
  faX,
} from '@fortawesome/pro-solid-svg-icons';
import { uploadEvidence, deleteEvidence } from '@/app/actions/evidence';
import { evidenceTypeOptions } from '@/constants/evidence';
import { cn } from '@/lib/utils';
import { Media, EvidenceType } from '@parking-ticket-pal/db/types';
import { faCloudArrowUp } from '@fortawesome/pro-regular-svg-icons';

type StagedFile = {
  file: File;
  previewUrl: string;
  type: EvidenceType | null;
  description: string;
};

const UploadedFileItem = ({
  item,
  onDelete,
  isPending,
}: {
  item: Pick<Media, 'id' | 'url' | 'description' | 'evidenceType'>;

  onDelete: (item: Pick<Media, 'id' | 'url'>) => void;
  isPending: boolean;
}) => {
  const typeLabel =
    evidenceTypeOptions.find((opt) => opt.value === item.evidenceType)?.label ||
    'File';

  return (
    <li className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border bg-background p-4">
      <div className="flex items-start gap-4 overflow-hidden">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          {item.url.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
            <img
              src={item.url || '/placeholder.svg'}
              alt={item.description || ''}
              className="h-16 w-16 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
              <FontAwesomeIcon
                icon={faFile}
                size="lg"
                className="text-muted-foreground"
              />
            </div>
          )}
        </a>
        <div className="flex-grow overflow-hidden">
          <Badge variant="secondary">{typeLabel}</Badge>
          <p className="mt-1 text-sm font-medium text-foreground truncate">
            {item.description}
          </p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline truncate block"
          >
            {item.url.split('/').pop()}
          </a>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(item)}
        disabled={isPending}
        className="flex-shrink-0 text-red-500 hover:text-red-600 self-end sm:self-center"
      >
        <FontAwesomeIcon icon={faTrash} size="lg" className="mr-2" />
        Delete
      </Button>
    </li>
  );
};

type EvidenceUploaderProps = {
  ticketId: string;
  evidence: Pick<Media, 'id' | 'url' | 'description' | 'evidenceType'>[];
};

const EvidenceUploader = ({
  ticketId,
  evidence: initialEvidence,
}: EvidenceUploaderProps) => {
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFile, setStagedFile] = useState<StagedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line arrow-body-style
  useEffect(() => {
    // clean up blob URLs
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Evidence</CardTitle>
        <CardDescription>
          Upload photos, documents, or any other evidence to support your case.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!stagedFile ? (
          <div
            className={cn(
              'relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-colors',
              isDragging ? 'border-primary bg-primary/10' : 'border-border',
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
          >
            <FontAwesomeIcon
              icon={faCloudArrowUp}
              size="2xl"
              className="text-muted-foreground"
            />
            <p className="mt-4 text-lg font-semibold text-center">
              Drag & drop a file here or{' '}
              <button
                type="button"
                className="text-primary cursor-pointer hover:underline"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF, PNG, JPG, etc. (Max 10MB)
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
          <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Prepare Your Evidence</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStagedFile(null)}
              >
                <FontAwesomeIcon icon={faX} size="lg" />
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 w-full md:w-48">
                {stagedFile.file.type.startsWith('image/') ? (
                  <img
                    src={stagedFile.previewUrl || '/placeholder.svg'}
                    alt="Preview"
                    className="w-full h-auto object-cover rounded-md border"
                  />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center bg-background rounded-md border">
                    <FontAwesomeIcon
                      icon={faFile}
                      size="lg"
                      className="text-muted-foreground"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {stagedFile.file.name}
                </p>
              </div>
              <div className="flex-grow space-y-4">
                <div>
                  <Label htmlFor="doc-type">Document Type</Label>
                  <Select
                    value={stagedFile.type || ''}
                    onValueChange={(value) =>
                      setStagedFile((prev) =>
                        prev ? { ...prev, type: value as EvidenceType } : null,
                      )
                    }
                  >
                    <SelectTrigger id="doc-type">
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="e.g., Photo showing unclear signage at location"
                    value={stagedFile.description}
                    onChange={(e) =>
                      setStagedFile((prev) =>
                        prev ? { ...prev, description: e.target.value } : null,
                      )
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleUpload} disabled={isPending}>
                {isPending && (
                  <FontAwesomeIcon
                    icon={faSpinnerThird}
                    size="lg"
                    className="mr-2 animate-spin"
                  />
                )}
                Upload File
              </Button>
            </div>
          </div>
        )}

        {initialEvidence.length > 0 && (
          <div className="space-y-4 border-t pt-6">
            <h4 className="font-medium">Uploaded Files</h4>
            <ul className="space-y-4">
              {initialEvidence.map((item) => (
                <UploadedFileItem
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  isPending={isPending}
                />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EvidenceUploader;
