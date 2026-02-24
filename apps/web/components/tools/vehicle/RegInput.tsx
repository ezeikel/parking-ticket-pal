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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.toUpperCase();
    // Allow typing with spaces, limit length
    if (input.length <= 8) {
      setValue(input);
      setError(null);
    }
  }, []);

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
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full rounded-xl border border-gray/20 bg-white px-5 py-4 font-plate text-2xl tracking-wider text-dark shadow-sm placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-gray/50 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 disabled:opacity-50"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !value}
          className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-xl bg-teal text-lg text-white shadow-sm transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <FontAwesomeIcon icon={faSpinnerThird} className="animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faSearch} />
          )}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-coral">{error}</p>}
    </form>
  );
};

export default RegInput;
