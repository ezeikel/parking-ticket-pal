'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faPencil,
  faTrash,
  faXmark,
} from '@fortawesome/pro-regular-svg-icons';
import DynamicSignatureCanvas, {
  SignatureCanvasHandle,
} from '../SignatureCanvas/DynamicSignatureCanvas';

type SignatureInputProps = {
  onSignatureChange: (dataUrl: string | null) => void;
  signatureUrl?: string | null;
  width?: number;
  height?: number;
  className?: string;
  description?: string;
  warningText?: string;
};

const SignatureInput = ({
  onSignatureChange,
  signatureUrl = null,
  width = 500,
  height = 200,
  className = '',
  description = 'Add your signature below. This will be saved with your profile and used when filling out forms.',
  warningText = 'Your signature will be used on forms. Draw your signature above.',
}: SignatureInputProps) => {
  const [isEditing, setIsEditing] = useState<boolean>(!signatureUrl);
  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
  const [_, setCurrentSignature] = useState<string | null>(signatureUrl);
  const canvasRef = useRef<SignatureCanvasHandle>(null);

  // Handle signature changes from the canvas
  const handleSignatureChange = (dataUrl: string | null) => {
    setCurrentSignature(dataUrl);
    onSignatureChange(dataUrl);
  };

  // Start editing the signature
  const startEditing = () => {
    setIsEditing(true);
  };

  // Clear the signature
  const clearSignature = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
    setCurrentSignature(null);
    onSignatureChange(null);
  };

  // Cancel editing and revert to the original signature
  const cancelEditing = () => {
    // Revert to the original signature if we had one
    onSignatureChange(signatureUrl);
    setIsEditing(false);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="space-y-2 mb-4">
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {signatureUrl && !isEditing ? (
        // Display the saved signature image
        <div className="relative border rounded-md border-input overflow-hidden">
          <Image
            src={signatureUrl}
            alt="Your signature"
            width={width}
            height={height}
            className="w-full h-auto"
          />
          <div className="absolute top-2 right-2">
            <Button
              type="button"
              onClick={startEditing}
              variant="secondary"
              size="sm"
              className="flex items-center"
            >
              <FontAwesomeIcon icon={faPencil} size="lg" className="mr-2" />
              Create New Signature
            </Button>
          </div>
        </div>
      ) : (
        // Show signature canvas for editing or creating a signature
        <div className="signature-container border rounded-md border-input p-2">
          <DynamicSignatureCanvas
            ref={canvasRef}
            onSignatureChange={handleSignatureChange}
            width={width}
            height={height}
            showClearButton={false}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              type="button"
              onClick={cancelEditing}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <FontAwesomeIcon icon={faXmark} size="lg" className="mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={clearSignature}
              variant="secondary"
              size="sm"
              className="flex items-center"
            >
              <FontAwesomeIcon icon={faTrash} size="lg" className="mr-2" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center text-orange-500 mt-4">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="mr-2 h-4 w-4"
          />
          <p className="text-sm font-medium">{warningText}</p>
        </div>
      )}
    </div>
  );
};

export default SignatureInput;
