'use client';

import React, { useState } from 'react';
import { ExternalLink, FileText, Laptop, Cloud, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { User } from '@/types/crm';

const LOCAL_APP_URL = 'http://localhost:5173/';
const CLOUD_APP_URL = 'https://quotation-secure-app.netlify.app/';

export function QuotationsSection({
  currentUser,
}: {
  currentUser: User;
}) {
  const [selectedSource, setSelectedSource] = useState<'LOCAL' | 'CLOUD'>('LOCAL');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const activeUrl = selectedSource === 'LOCAL' ? LOCAL_APP_URL : CLOUD_APP_URL;

  const handleRefresh = () => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleSourceChange = (source: 'LOCAL' | 'CLOUD') => {
    setSelectedSource(source);
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0A1B3F] to-[#1E3A8A] text-white flex items-center justify-center shadow-md shadow-[#0A1B3F]/20 shrink-0">
            <FileText className="w-5 h-5 text-[#F2591F]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Quotation Manager & PDF Generator
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {selectedSource === 'LOCAL' ? 'Updated Format (localhost:5173)' : 'Cloud Netlify App'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Updated Multi-Product Format:</span>
              <strong className="text-slate-700 font-semibold">Bulk SMS • Bulk WhatsApp • Voice Calls • RCS SMS • Digital Marketing</strong>
            </p>
          </div>
        </div>

        {/* Source Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Source Toggle Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => handleSourceChange('LOCAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                selectedSource === 'LOCAL'
                  ? 'bg-white text-[#0A1B3F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-[#F2591F]" />
              <span>Updated Format (5173)</span>
            </button>

            <button
              onClick={() => handleSourceChange('CLOUD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                selectedSource === 'CLOUD'
                  ? 'bg-white text-[#0A1B3F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Netlify Cloud</span>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            title="Reload Quotation App"
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          <a
            href={activeUrl}
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
          <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 text-[#F2591F] animate-spin" />
            <span className="text-xs font-bold text-slate-700">
              Loading Immense Quotation App ({activeUrl})...
            </span>
          </div>
        )}

        <iframe
          key={`${selectedSource}-${iframeKey}`}
          src={activeUrl}
          title="Immense Air Quotation App"
          onLoad={() => setLoading(false)}
          className="w-full h-[calc(100vh-210px)] min-h-[700px] border-0"
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
}
