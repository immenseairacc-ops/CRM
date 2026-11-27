'use client';

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  FileText,
  RefreshCw,
  Sparkles,
  Layers,
  MessageSquare,
  PhoneCall,
  Send,
  TrendingUp,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User } from '@/types/crm';

const DEFAULT_QUOTATION_URL =
  process.env.NEXT_PUBLIC_QUOTATION_APP_URL || 'http://localhost:5173/';

export function QuotationsSection({
  currentUser,
}: {
  currentUser: User;
}) {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  const activeUrl = DEFAULT_QUOTATION_URL;

  // Check health of localhost:5173 dev server
  useEffect(() => {
    let isMounted = true;
    const checkServer = async () => {
      try {
        const res = await fetch(activeUrl, { method: 'HEAD', mode: 'no-cors' });
        if (isMounted) setIsOnline(true);
      } catch {
        if (isMounted) setIsOnline(false);
      }
    };
    checkServer();
    return () => {
      isMounted = false;
    };
  }, [iframeKey, activeUrl]);

  const handleRefresh = () => {
    setLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#061E44] via-[#0A2A5E] to-[#F2591F] text-white flex items-center justify-center shadow-md shadow-[#061E44]/20 shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Quotation Manager & PDF Generator
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Updated 13-Page Format • Multi-Product Edition
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Supported Products:
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                <Send className="w-3 h-3 text-[#0066d6]" /> Bulk SMS
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                <KeyRound className="w-3 h-3 text-amber-600" /> OTP SMS
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp API
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                <PhoneCall className="w-3 h-3 text-blue-600" /> Voice Calls (OBD)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                <Layers className="w-3 h-3 text-[#0080ff]" /> RCS SMS
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3 h-3 text-indigo-600" /> Digital Marketing
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleRefresh}
            title="Reload Quotation Manager"
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#061E44] to-[#1E3A8A] hover:from-[#0A2A5E] hover:to-[#2546A5] text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-[#061E44]/20 active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#F2591F]" />
            <span>Open in Full Window</span>
          </a>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-inner">
              <RefreshCw className="w-6 h-6 text-[#F2591F] animate-spin" />
            </div>
            <div className="text-center">
              <span className="text-sm font-bold text-slate-800 block">
                Loading Immense Quotation Manager...
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Connecting to updated format at {activeUrl}
              </span>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={activeUrl}
          title="Immense Smart Solution Quotation Manager"
          onLoad={() => setLoading(false)}
          className="w-full h-[calc(100vh-210px)] min-h-[740px] border-0"
          allow="clipboard-write; clipboard-read"
        />
      </div>
    </div>
  );
}
