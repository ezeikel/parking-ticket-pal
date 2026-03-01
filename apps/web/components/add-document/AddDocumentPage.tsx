'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { LetterType } from '@parking-ticket-pal/db/types';
import { extractOCRTextWithVision } from '@/app/actions/ocr';
import { createTicket, getTicketByPcnNumber } from '@/app/actions/ticket';
import { createLetter } from '@/app/actions/letter';
import { compressImage } from '@/utils/compressImage';
import { useAnalytics } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants/events';
import useLogger from '@/lib/use-logger';
import UploadSection from './UploadSection';
import ProcessingState from './ProcessingState';
import AddDocumentWizard, {
  type ExtractedData,
  type WizardFormData,
} from './AddDocumentWizard';
import SuccessState from './SuccessState';
import DuplicateTicketState from './DuplicateTicketState';

type DocumentType = 'ticket' | 'letter' | 'unknown';

type PageState = 'upload' | 'processing' | 'wizard' | 'success' | 'duplicate';

type SuccessData = {
  ticketId: string;
  pcnNumber: string;
  documentType: DocumentType;
};

type ExistingTicketData = {
  ticketId: string;
  pcnNumber: string;
  issuer?: string;
};

const AddDocumentPage = () => {
  const { track } = useAnalytics();
  const logger = useLogger({ page: 'add-document' });

  const [pageState, setPageState] = useState<PageState>('upload');
  const [extractedData, setExtractedData] = useState<ExtractedData | undefined>(
    undefined,
  );
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [existingTicket, setExistingTicket] =
    useState<ExistingTicketData | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setPageState('processing');

      // Compress image before upload
      let uploadFile = file;
      try {
        const compressed = await compressImage(file);
        uploadFile = compressed.file;
      } catch {
        // Compression failed — use original file
      }

      try {
        const formData = new FormData();
        formData.append('image', uploadFile);

        const result = await extractOCRTextWithVision(formData);

        if (result.success && result.data) {
          // Determine document type from OCR result
          const detectedType =
            (result.data.documentType as DocumentType) || 'ticket';

          // Check if we have a PCN and if a ticket with this PCN already exists
          if (result.data.pcnNumber) {
            const existingTicketData = await getTicketByPcnNumber(
              result.data.pcnNumber,
            );

            if (existingTicketData) {
              // Found an existing ticket with this PCN
              setExistingTicket({
                ticketId: existingTicketData.id,
                pcnNumber: existingTicketData.pcnNumber,
                issuer: existingTicketData.issuer || undefined,
              });

              // Store extracted data for potential letter attachment
              setExtractedData({
                pcnNumber: result.data.pcnNumber,
                vehicleReg: result.data.vehicleReg,
                issuedAt: result.data.issuedAt
                  ? new Date(result.data.issuedAt)
                  : undefined,
                location: result.data.location,
                initialAmount: result.data.initialAmount,
                issuer: result.data.issuer,
                contraventionCode: result.data.contraventionCode,
                imageUrl: result.imageUrl || undefined,
                tempImagePath: result.tempImagePath || undefined,
                extractedText: result.data.extractedText || undefined,
                issuerType: 'council',
                ticketStage: 'initial',
              });

              if (detectedType === 'letter') {
                // It's a letter - automatically add it to the existing ticket
                // Map OCR letterType string to LetterType enum, fallback to GENERIC
                const detectedLetterType =
                  (result.data.letterType as keyof typeof LetterType) &&
                  LetterType[result.data.letterType as keyof typeof LetterType]
                    ? LetterType[
                        result.data.letterType as keyof typeof LetterType
                      ]
                    : LetterType.GENERIC;

                try {
                  const letter = await createLetter({
                    pcnNumber: existingTicketData.pcnNumber,
                    vehicleReg: result.data.vehicleReg || '',
                    type: detectedLetterType,
                    summary: result.data.summary || 'Letter from council',
                    sentAt: result.data.sentAt
                      ? new Date(result.data.sentAt)
                      : new Date(),
                    tempImageUrl: result.imageUrl || undefined,
                    tempImagePath: result.tempImagePath || undefined,
                    extractedText: result.data.extractedText || undefined,
                    currentAmount: result.data.currentAmount || undefined,
                  });

                  if (letter) {
                    await track(TRACKING_EVENTS.LETTER_UPLOADED, {
                      ticket_id: existingTicketData.id,
                      letter_type: letter.type,
                    });

                    toast.success('Letter added to ticket');
                    setSuccessData({
                      ticketId: existingTicketData.id,
                      pcnNumber: existingTicketData.pcnNumber,
                      documentType: 'letter',
                    });
                    setPageState('success');
                  } else {
                    throw new Error('Failed to create letter');
                  }
                } catch (error) {
                  logger.error(
                    'Error adding letter to ticket',
                    { pcnNumber: existingTicketData.pcnNumber },
                    error instanceof Error ? error : undefined,
                  );
                  toast.error('Failed to add letter. Please try again.');
                  setPageState('upload');
                }
                return;
              }
              // It's a ticket - show duplicate warning
              setPageState('duplicate');
              toast.info('This ticket is already in your account');

              return;
            }
          }

          // No existing ticket found - proceed with normal wizard flow
          setExtractedData({
            pcnNumber: result.data.pcnNumber,
            vehicleReg: result.data.vehicleReg,
            issuedAt: result.data.issuedAt
              ? new Date(result.data.issuedAt)
              : undefined,
            location: result.data.location,
            initialAmount: result.data.initialAmount,
            issuer: result.data.issuer,
            contraventionCode: result.data.contraventionCode,
            imageUrl: result.imageUrl || undefined,
            tempImagePath: result.tempImagePath || undefined,
            extractedText: result.data.extractedText || undefined,
            issuerType: 'council',
            ticketStage: 'initial',
          });
          setPageState('wizard');
          toast.success(
            detectedType === 'letter'
              ? 'Letter details extracted'
              : 'Ticket details extracted',
          );
        } else {
          // OCR failed, but let user continue with manual entry
          logger.warn('OCR extraction failed', {
            message: result.message,
          });
          toast.error(
            result.message ||
              'Could not read document. Please enter details manually.',
          );
          setExtractedData({
            imageUrl: result.imageUrl || undefined,
            tempImagePath: result.tempImagePath || undefined,
          });
          setPageState('wizard');
        }
      } catch (error) {
        logger.error(
          'Error processing image',
          {},
          error instanceof Error ? error : undefined,
        );
        toast.error('Failed to process image. Please try again.');
        setPageState('upload');
      }
    },
    [logger, track],
  );

  const handleManualEntry = useCallback(() => {
    setExtractedData(undefined);
    setPageState('wizard');
  }, []);

  const handleWizardClose = useCallback(() => {
    setPageState('upload');
    setExtractedData(undefined);
  }, []);

  const handleWizardSubmit = useCallback(
    async (data: WizardFormData) => {
      try {
        // Provide default location if not specified
        const defaultLocation = {
          line1: 'Unknown',
          city: 'Unknown',
          postcode: 'Unknown',
          country: 'United Kingdom',
          coordinates: { latitude: 51.5074, longitude: -0.1278 }, // London default
        };

        const result = await createTicket({
          vehicleReg: data.vehicleReg,
          pcnNumber: data.pcnNumber,
          issuedAt: data.issuedAt || new Date(),
          contraventionCode: data.contraventionCode || '',
          initialAmount: data.initialAmount || 0,
          issuer: data.issuer || '',
          location: data.location || defaultLocation,
          tempImageUrl: data.imageUrl,
          tempImagePath: data.tempImagePath,
          extractedText: data.extractedText,
        });

        if (result && 'error' in result) {
          toast.error(result.error);
          return;
        }

        if (result) {
          const ticket = result;
          await track(TRACKING_EVENTS.TICKET_CREATED, {
            ticket_id: ticket.id,
            pcn_number: ticket.pcnNumber,
            issuer: ticket.issuer,
            issuer_type: ticket.issuerType,
            prefilled: !!data.extractedText,
          });

          setSuccessData({
            ticketId: ticket.id,
            pcnNumber: ticket.pcnNumber,
            documentType: 'ticket',
          });
          setPageState('success');
          toast.success('Ticket created successfully');
        } else {
          throw new Error('Failed to create ticket');
        }
      } catch (error) {
        logger.error(
          'Error creating ticket',
          {},
          error instanceof Error ? error : undefined,
        );
        toast.error('Failed to create ticket. Please try again.');
      }
    },
    [track, logger],
  );

  const handleAddAnother = useCallback(() => {
    setPageState('upload');
    setExtractedData(undefined);
    setSuccessData(null);
    setExistingTicket(null);
  }, []);

  return (
    <div className="min-h-screen bg-light">
      <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          {pageState === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <UploadSection
                onFileSelect={handleFileSelect}
                onManualEntry={handleManualEntry}
              />
            </motion.div>
          )}

          {pageState === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-white shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
            >
              <ProcessingState />
            </motion.div>
          )}

          {pageState === 'success' && successData && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
            >
              <SuccessState
                ticketId={successData.ticketId}
                pcnNumber={successData.pcnNumber}
                documentType={successData.documentType}
                onAddAnother={handleAddAnother}
              />
            </motion.div>
          )}

          {pageState === 'duplicate' && existingTicket && (
            <motion.div
              key="duplicate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-white p-8 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.06)]"
            >
              <DuplicateTicketState
                ticketId={existingTicket.ticketId}
                pcnNumber={existingTicket.pcnNumber}
                issuer={existingTicket.issuer}
                onUploadDifferent={handleAddAnother}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard Modal */}
        <AddDocumentWizard
          isOpen={pageState === 'wizard'}
          onClose={handleWizardClose}
          extractedData={extractedData}
          onSubmit={handleWizardSubmit}
        />
      </div>
    </div>
  );
};

export default AddDocumentPage;
