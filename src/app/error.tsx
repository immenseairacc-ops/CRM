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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg">
        <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl mx-auto flex items-center justify-center text-rose-600 font-bold text-2xl mb-4">
          ⚠️
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          CRM Workspace Refresh Required
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Application chunks updated. Click below to reload the CRM workspace with the latest version.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                sessionStorage.clear();
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            🔄 Reload Workspace Now
          </button>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
