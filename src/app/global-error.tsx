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
    console.error('Unhandled Global Root Error:', error);
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

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl mx-auto flex items-center justify-center text-emerald-600 font-bold text-3xl mb-4">
            🚀
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            CRM Workspace Updated
          </h2>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            The Immense Air CRM application was updated. Click below to load with a fresh cache.
          </p>

          {error?.message && (
            <div className="mb-4 text-left">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-mono text-rose-800 break-all leading-relaxed max-h-32 overflow-y-auto">
                <strong>Error:</strong> {error.message}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleHardReset}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
            >
              🔄 Clear Cache & Load CRM
            </button>
            <button
              onClick={() => reset()}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Retry Session
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
