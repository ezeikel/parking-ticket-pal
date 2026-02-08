'use client';

import { useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinnerThird } from '@fortawesome/pro-solid-svg-icons';
import { normalizeRegistration, isValidRegistration } from '@/lib/dvla';

type RegInputProps = {
  onSubmit: (registration: string) => void;
  isLoading?: boolean;
  placeholder?: string;
};

const RegInput = ({
  onSubmit,
  isLoading = false,
  placeholder = 'Enter reg (e.g. AB12 CDE)',
}: RegInputProps) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value.toUpperCase();
      // Allow typing with spaces, limit length
      if (input.length <= 8) {
        setValue(input);
        setError(null);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const normalized = normalizeRegistration(value);

      if (!normalized) {
        setError('Please enter a registration number');
        return;
      }

      if (!isValidRegistration(normalized)) {
        setError('Please enter a valid UK registration');
        return;
      }

      setError(null);
      onSubmit(normalized);
    },
    [value, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="relative">
        <div className="flex overflow-hidden rounded-lg border-2 border-dark bg-white shadow-lg focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2">
          {/* UK number plate styling */}
          <div className="flex items-center bg-[#003399] px-3">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full border border-yellow bg-[#003399]">
                <div className="flex h-full items-center justify-center">
                  <span className="text-[6px] font-bold text-yellow">★</span>
                </div>
              </div>
              <span className="mt-0.5 text-[8px] font-bold text-white">GB</span>
            </div>
          </div>

          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-yellow px-4 py-3 font-plate text-2xl tracking-wider text-dark placeholder:text-dark/40 focus:outline-none disabled:opacity-50"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
          />

          <button
            type="submit"
            disabled={isLoading || !value}
            className="bg-teal px-6 text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <FontAwesomeIcon icon={faSpinnerThird} className="animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faSearch} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-coral">{error}</p>
      )}
    </form>
  );
};

export default RegInput;
