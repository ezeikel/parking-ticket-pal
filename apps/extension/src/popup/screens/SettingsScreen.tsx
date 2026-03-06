import type { AuthData } from '@/shared/types';

interface SettingsScreenProps {
  auth: AuthData;
  onBack: () => void;
  onLogout: () => void;
}

export default function SettingsScreen({ auth, onBack, onLogout }: SettingsScreenProps) {
  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onBack} className="text-gray hover:text-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-dark">Settings</h2>
      </div>

      {/* Account */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-dark">Account</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray">Email</span>
            <span className="font-medium text-dark">{auth.email}</span>
          </div>
        </div>
      </div>

      {/* Supported portals */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
        <h3 className="mb-3 text-sm font-semibold text-dark">Supported portals</h3>
        <ul className="space-y-2 text-xs text-gray">
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal" />
            Lewisham Council
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray/30" />
            Horizon Parking (coming soon)
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray/30" />
            Westminster Council (coming soon)
          </li>
        </ul>
      </div>

      {/* Sign out */}
      <button
        onClick={onLogout}
        className="w-full rounded-xl border border-coral/20 py-3 text-sm font-medium text-coral transition-colors hover:bg-coral/5"
      >
        Sign out
      </button>
    </div>
  );
}
