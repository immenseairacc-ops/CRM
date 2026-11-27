'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled CRM Client Exception:', error);
  }, [error]);

  const handleHardReset = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // silent
      }
      window.location.href = window.location.origin + window.location.pathname + '?reset=' + Date.now();
    } else {
      reset();
    }
  };

  const handleSoftReload = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('crm_active_tab');
      } catch {
        // silent
      }
      window.location.href = window.location.origin + window.location.pathname + '?reload=' + Date.now();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg">
        <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl mx-auto flex items-center justify-center text-emerald-600 font-bold text-2xl mb-4">
          ✨
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          CRM Workspace Refresh Required
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Application chunks or session data updated. Click below to reload the CRM workspace with a clean cache.
        </p>

        {error?.message && (
          <div className="mb-4 text-left">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-mono text-rose-800 break-all leading-relaxed max-h-32 overflow-y-auto">
              <strong>Error:</strong> {error.message}
            </div>
            {error.digest && (
              <div className="text-[10px] text-slate-400 font-mono mt-1 px-1">
                Digest: {error.digest}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleHardReset}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
          >
            🔄 Clear Cache & Reload CRM
          </button>
          <button
            onClick={handleSoftReload}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Reload Tab
          </button>
          <button
            onClick={() => reset()}
            className="w-full py-1.5 px-4 text-slate-400 hover:text-slate-600 text-[11px] transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
