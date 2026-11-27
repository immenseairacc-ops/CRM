'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Role } from '@/types/crm';

export const ROLE_META: Record<
  Role,
  { label: string; short: string; color: string; bg: string; desc: string }
> = {
  ADMIN: {
    label: 'Admin',
    short: 'Admin',
    color: 'text-indigo-700 border-indigo-200',
    bg: 'bg-indigo-50',
    desc: 'Full control: Lead upload/distribution, approvals & all reports',
  },
  ACCOUNT_MANAGER: {
    label: 'Account Manager',
    short: 'Acct Mgr',
    color: 'text-violet-700 border-violet-200',
    bg: 'bg-violet-50',
    desc: 'Lead distribution, live agent monitor, meet/onboarding/recharge approvals',
  },
  AGENT: {
    label: 'Sales Agent',
    short: 'Agent',
    color: 'text-emerald-700 border-emerald-200',
    bg: 'bg-emerald-50',
    desc: 'Call/mail leads, Hot/Warm/Cold updates, reminders, meets, onboarding & recharge',
  },
  SUPPORT: {
    label: 'Technical Support',
    short: 'Support',
    color: 'text-amber-700 border-amber-200',
    bg: 'bg-amber-50',
    desc: 'SMS, RCS, WhatsApp, OBD, SMPP technical support, client demo calls & panel account creation',
  },
  BILLING: {
    label: 'Billing Team',
    short: 'Billing',
    color: 'text-sky-700 border-sky-200',
    bg: 'bg-sky-50',
    desc: 'Tax invoice upload, invoice numbering & payment status updates',
  },
};

export function RoleBadge({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    NEW: 'bg-slate-100 text-slate-700 border-slate-200',
    HOT: 'bg-rose-50 text-rose-700 border-rose-200',
    WARM: 'bg-amber-50 text-amber-700 border-amber-200',
    COLD: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    LOST: 'bg-slate-100 text-slate-600 border-slate-300',
    RINGING: 'bg-amber-50 text-amber-700 border-amber-200',
    CONNECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    NOT_CONNECTED: 'bg-slate-100 text-slate-600 border-slate-300',
    QUOTATION_SENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200',
    RESCHEDULE_PROPOSED: 'bg-purple-50 text-purple-700 border-purple-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    APPROVED_FOR_SUPPORT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ACCOUNT_CREATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    RECHARGE_COMPLETED: 'bg-violet-50 text-violet-700 border-violet-200',
    BILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  const labelMap: Record<string, string> = {
    NEW: 'New',
    HOT: 'Hot Lead',
    WARM: 'Warm Lead',
    COLD: 'Cold Lead',
    LOST: 'Closed / Lost',
    RINGING: 'Ringing',
    CONNECTED: 'Connected',
    NOT_CONNECTED: 'Not Connected',
    QUOTATION_SENT: 'Quotation Sent',
    PENDING_APPROVAL: 'Pending Approval',
    RESCHEDULE_PROPOSED: 'Reschedule Proposed',
    APPROVED: 'Approved',
    APPROVED_FOR_SUPPORT: 'Sent to Support',
    ACCOUNT_CREATED: 'Account Created',
    RECHARGE_COMPLETED: 'Recharged -> Billing',
    BILLED: 'Billed & Invoiced',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    PAID: 'Paid',
    PARTIAL: 'Partial Paid',
    PENDING: 'Payment Pending',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${cls}`}
    >
      {labelMap[status] || status}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className={`w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8`}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function formatINR(amount?: number | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      // Automatically compress images (>150KB) to keep JSON database fast and lightweight!
      if (file.type.startsWith('image/') && !file.type.includes('svg') && rawDataUrl.length > 150000) {
        const img = new window.Image();
        img.onload = () => {
          try {
            const maxDim = 1280;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const isPng = file.type === 'image/png';
              if (isPng) {
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/png');
                resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
                return;
              } else {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', 0.80);
                resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
                return;
              }
            }
          } catch {
            // fallback to rawDataUrl
          }
          resolve(rawDataUrl);
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      } else {
        resolve(rawDataUrl);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function triggerDirectDownload(dataUrl?: string, filename?: string) {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename || 'document-proof.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCsvLeads(csvText: string) {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const splitRow = (row: string) =>
    row.split(',').map((cell) => cell.replace(/^["']|["']$/g, '').trim());

  const firstCells = splitRow(lines[0]).map((c) => c.toLowerCase());
  const hasHeader = firstCells.some(
    (c) =>
      c.includes('name') ||
      c.includes('phone') ||
      c.includes('contact') ||
      c.includes('email') ||
      c.includes('date')
  );

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const todayStr = new Date().toISOString().slice(0, 10);

  return dataLines
    .map((line) => {
      const cols = splitRow(line);
      if (cols.every((c) => !c)) return null;

      // Support 9-column format:
      // leadDate,companyName,designation,clientName,phone,email,linkedinUrl,cityLocation,feedbackRemark
      const looksLikeDate = /^\d{4}-\d{2}-\d{2}$/.test(cols[0] || '');
      if (cols.length >= 7 || looksLikeDate) {
        return {
          leadDate: cols[0] || todayStr,
          companyName: cols[1] || 'Independent',
          designation: cols[2] || '',
          clientName: cols[3] || 'Unnamed Lead',
          phone: cols[4] || '',
          email: cols[5] || '',
          linkedinUrl: cols[6] || '',
          cityLocation: cols[7] || '',
          feedbackRemark: cols[8] || '',
          serviceInterest: 'Bulk SMS / WhatsApp API',
          source: 'CSV Upload',
        };
      }

      // Backward-compatible 6-column format fallback
      return {
        leadDate: todayStr,
        clientName: cols[0] || 'Unnamed Lead',
        companyName: cols[1] || 'Independent',
        designation: '',
        phone: cols[2] || '',
        email: cols[3] || '',
        linkedinUrl: '',
        cityLocation: '',
        feedbackRemark: '',
        serviceInterest: cols[4] || 'WhatsApp API / Bulk SMS',
        source: cols[5] || 'CSV Upload',
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export function playReminderChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [880, 1174.66];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.16);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.16 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.16);
      osc.stop(ctx.currentTime + i * 0.16 + 0.3);
    });
  } catch {
    // Ignore autoplay restriction errors gracefully
  }
}

export function CuteAgentAvatar({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 animate-agent-float select-none"
      title="Immense Air Smart Agent"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Antenna */}
        <line x1="32" y1="6" x2="32" y2="14" stroke="#F2591F" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="5" r="3.5" fill="#F2591F" />
        {/* Head */}
        <rect x="10" y="14" width="44" height="36" rx="14" fill="#0A1B3F" stroke="#ffffff" strokeWidth="2.5" />
        {/* Visor */}
        <rect x="16" y="22" width="32" height="18" rx="8" fill="#13295B" />
        {/* Cute Blinking Eyes */}
        <g className="animate-agent-blink">
          <circle cx="25" cy="31" r="3.5" fill="#ffffff" />
          <circle cx="39" cy="31" r="3.5" fill="#ffffff" />
          <circle cx="26" cy="30" r="1.2" fill="#F2591F" />
          <circle cx="40" cy="30" r="1.2" fill="#F2591F" />
        </g>
        {/* Cute Smile */}
        <path d="M27 43 Q32 46.5 37 43" stroke="#F2591F" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

export function getPaymentBreakdown(item?: {
  amount?: number;
  billingPaymentStatus?: string;
  paymentMode?: string;
  paidAmount?: number;
  balanceAmount?: number;
} | null) {
  if (!item) return { total: 0, paid: 0, balance: 0, status: 'PENDING' };
  const total = Number(item.amount || 0);
  const status =
    item.billingPaymentStatus || (item.paymentMode === 'POSTPAID' ? 'PENDING' : 'PAID');
  const paid =
    item.paidAmount !== undefined
      ? Number(item.paidAmount)
      : status === 'PAID'
      ? total
      : status === 'PENDING'
      ? 0
      : Math.round(total / 2);
  const balance =
    item.balanceAmount !== undefined
      ? Number(item.balanceAmount)
      : Math.max(0, total - paid);
  return { total, paid, balance, status };
}

