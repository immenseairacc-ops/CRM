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

  const handleHardReload = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
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
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-xl text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl mx-auto flex items-center justify-center text-emerald-600 font-bold text-3xl mb-4">
            🚀
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            CRM Workspace Updated
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            The Immense Air CRM application was updated with new features and optimizations. Click below to load the latest version.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleHardReload}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
            >
              🔄 Load Latest CRM Workspace
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
