import { useState } from 'react';

interface LoginScreenProps {
  onMagicLinkSent: (email: string) => void;
}

export default function LoginScreen({ onMagicLinkSent }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    chrome.runtime.sendMessage(
      { type: 'SEND_MAGIC_LINK', email: email.trim() },
      (response) => {
        setLoading(false);
        if (response?.success) {
          onMagicLinkSent(email.trim());
        } else {
          setError(response?.error || 'Something went wrong');
        }
      },
    );
  };

  return (
    <div className="p-6">
      {/* Logo + brand */}
      <div className="mb-6 text-center">
        <img
          src="../icons/logo.png"
          alt="Parking Ticket Pal"
          className="mx-auto mb-3 h-14 w-14 rounded-2xl"
        />
        <h1 className="text-lg font-bold text-dark">Parking Ticket Pal</h1>
        <p className="mt-1 text-sm text-gray">
          Import tickets from council portals
        </p>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray/20 bg-white px-4 py-3 text-sm text-dark placeholder-gray/60 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          required
        />
        {error && (
          <p className="text-xs text-coral">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full rounded-xl bg-teal py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-dark disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Sign in with magic link'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray">
        We&apos;ll send you a sign-in link to your email.
      </p>
    </div>
  );
}
