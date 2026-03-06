import { useState } from 'react';
import type { ScrapedData } from '@/shared/types';

interface DetectedTicketScreenProps {
  data: ScrapedData;
  onClose: () => void;
}

export default function DetectedTicketScreen({ data, onClose }: DetectedTicketScreenProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleImport = () => {
    setImporting(true);
    chrome.runtime.sendMessage(
      { type: 'IMPORT_TICKET', data },
      (response) => {
        setImporting(false);
        setResult({
          success: response?.success ?? false,
          error: response?.error,
        });
      },
    );
  };

  const { ticket, evidence } = data;

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-dark">Ticket Detected</h2>
        <button onClick={onClose} className="text-gray hover:text-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Ticket details */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
        <div className="space-y-2">
          {ticket.pcnNumber && (
            <div className="flex justify-between text-xs">
              <span className="text-gray">PCN</span>
              <span className="font-medium text-dark">{ticket.pcnNumber}</span>
            </div>
          )}
          {ticket.vehicleReg && (
            <div className="flex justify-between text-xs">
              <span className="text-gray">Vehicle</span>
              <span className="font-medium text-dark">{ticket.vehicleReg}</span>
            </div>
          )}
          {ticket.issuerDisplayName && (
            <div className="flex justify-between text-xs">
              <span className="text-gray">Issuer</span>
              <span className="font-medium text-dark">{ticket.issuerDisplayName}</span>
            </div>
          )}
          {ticket.initialAmount !== null && (
            <div className="flex justify-between text-xs">
              <span className="text-gray">Amount</span>
              <span className="font-medium text-dark">
                £{(ticket.initialAmount / 100).toFixed(2)}
              </span>
            </div>
          )}
          {evidence.length > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-gray">Evidence</span>
              <span className="font-medium text-teal">
                {evidence.length} image{evidence.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`mb-4 rounded-xl p-3 text-xs ${
            result.success
              ? 'bg-teal/10 text-teal'
              : 'bg-coral/10 text-coral'
          }`}
        >
          {result.success
            ? result.error || 'Ticket imported successfully!'
            : result.error || 'Import failed'}
        </div>
      )}

      {/* Import button */}
      {!result?.success && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full rounded-xl bg-teal py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-dark disabled:opacity-50"
        >
          {importing ? 'Importing...' : 'Import to Parking Ticket Pal'}
        </button>
      )}

      {result?.success && (
        <a
          href={`https://www.parkingticketpal.com/dashboard`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-teal py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
        >
          View in Dashboard
        </a>
      )}
    </div>
  );
}
