import { useEffect, useState } from 'react';
import type { AuthData, RecentImport } from '@/shared/types';

interface HomeScreenProps {
  auth: AuthData;
  onSettings: () => void;
}

export default function HomeScreen({ auth, onSettings }: HomeScreenProps) {
  const [imports, setImports] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_RECENT_IMPORTS' }, (response) => {
      if (response?.imports) {
        setImports(response.imports);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="../icons/logo.png" alt="PTP" className="h-8 w-8 rounded-lg" />
          <span className="font-bold text-dark">Parking Ticket Pal</span>
        </div>
        <button
          onClick={onSettings}
          className="rounded-lg p-2 text-gray hover:bg-dark/5"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>

      {/* Status card */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1abc9c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-dark">Signed in</p>
            <p className="text-xs text-gray">{auth.email}</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)]">
        <h3 className="mb-2 text-sm font-semibold text-dark">How to import</h3>
        <ol className="space-y-2 text-xs text-gray">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-bold text-teal">1</span>
            Visit your council&apos;s parking portal
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-bold text-teal">2</span>
            Look up your ticket on the portal
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/10 text-[10px] font-bold text-teal">3</span>
            Click &quot;Import&quot; on the PTP banner that appears
          </li>
        </ol>
      </div>

      {/* Recent imports */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-dark">Recent imports</h3>
        {loading ? (
          <p className="text-xs text-gray">Loading...</p>
        ) : imports.length === 0 ? (
          <p className="text-xs text-gray">No imports yet. Visit a supported council portal to get started.</p>
        ) : (
          <div className="space-y-2">
            {imports.slice(0, 5).map((imp) => (
              <div
                key={imp.id}
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <div>
                  <p className="text-xs font-medium text-dark">{imp.pcnNumber}</p>
                  <p className="text-[10px] text-gray">{imp.issuer}</p>
                </div>
                <p className="text-[10px] text-gray">
                  {new Date(imp.importedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
