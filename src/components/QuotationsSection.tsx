'use client';

import React, { useState } from 'react';
import { ExternalLink, FileText, Globe, RefreshCw, ShieldCheck } from 'lucide-react';
import { User } from '@/types/crm';

const QUOTATION_APP_URL = 'https://quotation-secure-app.netlify.app/';

export function QuotationsSection({
  currentUser,
}: {
  currentUser: User;
}) {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const handleRefresh = () => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0A1B3F] to-[#1E3A8A] text-white flex items-center justify-center shadow-md shadow-[#0A1B3F]/20 shrink-0">
            <FileText className="w-5 h-5 text-[#F2591F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Quotation Manager & PDF Generator
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Online
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate official Immense Air quotations for Bulk SMS, OTP SMS, and RCS Messaging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            title="Reload Quotation App"
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
          <a
            href={QUOTATION_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-[#0A1B3F] hover:bg-[#152B5B] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Full Window</span>
          </a>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 text-[#F2591F] animate-spin" />
            <span className="text-xs font-bold text-slate-600">
              Loading Immense Quotation App...
            </span>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={QUOTATION_APP_URL}
          title="Immense Air Quotation App"
          onLoad={() => setLoading(false)}
          className="w-full h-[calc(100vh-210px)] min-h-[680px] border-0"
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
}
