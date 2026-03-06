interface AwaitingVerificationProps {
  email: string;
  onBack: () => void;
}

export default function AwaitingVerification({ email, onBack }: AwaitingVerificationProps) {
  return (
    <div className="p-6 text-center">
      {/* Email icon */}
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1abc9c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
        </svg>
      </div>

      <h2 className="text-lg font-bold text-dark">Check your email</h2>
      <p className="mt-2 text-sm text-gray">
        We sent a sign-in link to{' '}
        <span className="font-medium text-dark">{email}</span>
      </p>
      <p className="mt-4 text-xs text-gray">
        Click the link in your email to sign in. This tab will update automatically.
      </p>

      <button
        onClick={onBack}
        className="mt-6 text-sm font-medium text-teal hover:text-teal-dark"
      >
        Use a different email
      </button>
    </div>
  );
}
