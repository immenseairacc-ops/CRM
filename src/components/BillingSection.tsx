'use client';

import React, { useState } from 'react';
import {
  AlarmClock,
  AlertCircle,
  BellRing,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Mail,
  Megaphone,
  Paperclip,
  Phone,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UploadCloud,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { CrmDatabase, PaymentStatus, RechargeRequest, User } from '@/types/crm';
import {
  fileToDataUrl,
  formatDateTime,
  formatINR,
  Modal,
  StatusBadge,
  triggerDirectDownload,
} from './ui';

function buildSampleTaxInvoiceSvg(
  req: RechargeRequest,
  invoiceNum: string,
  paymentStatus: PaymentStatus
) {
  const taxable = (req.amount / 1.18).toFixed(2);
  const total = req.amount.toLocaleString('en-IN');
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="0" y="0" width="600" height="68" fill="#0f172a"/>
      <text x="28" y="34" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">TAX INVOICE</text>
      <text x="28" y="54" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">Invoice #: ${invoiceNum} • Account: ${req.username}</text>
      <text x="28" y="104" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">Billed To: ${req.companyName}</text>
      <text x="28" y="124" font-family="Arial, sans-serif" font-size="12" fill="#475569">Service: ${req.service} | Agent: ${req.agentName}</text>
      <rect x="28" y="148" width="544" height="32" fill="#f1f5f9"/>
      <text x="40" y="169" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Description</text>
      <text x="350" y="169" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Taxable</text>
      <text x="470" y="169" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Total (Incl. GST)</text>
      <text x="40" y="206" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">${req.service}</text>
      <text x="350" y="206" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">₹${taxable}</text>
      <text x="470" y="206" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹${total}</text>
      <rect x="28" y="256" width="180" height="34" rx="6" fill="#dcfce7" stroke="#86efac"/>
      <text x="44" y="278" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#15803d">PAYMENT: ${paymentStatus}</text>
    </svg>`)
  );
}

export function BillingSection({
  db,
  currentUser,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const role = currentUser.role;
  const canBill = role === 'BILLING' || role === 'ADMIN' || role === 'ACCOUNT_MANAGER';

  // Requests awaiting Tally Bill (either newly raised by Agent in PENDING_APPROVAL, or legacy RECHARGE_COMPLETED without invoice)
  const pendingBilling = db.rechargeRequests.filter(
    (r) =>
      r.paymentMode !== 'DEMO' &&
      (r.status === 'PENDING_APPROVAL' ||
        (r.status === 'RECHARGE_COMPLETED' && !r.billingInvoiceNumber))
  );

  // Requests that have Tally Bill created OR are completed
  const billedHistory = db.rechargeRequests.filter(
    (r) =>
      r.paymentMode !== 'DEMO' &&
      (r.status === 'BILLED' || Boolean(r.billingInvoiceNumber))
  );

  const [billingTarget, setBillingTarget] = useState<RechargeRequest | null>(
    null
  );
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('PAID');
  const [initialPaidAmount, setInitialPaidAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState('');
  const [taxInvoiceDataUrl, setTaxInvoiceDataUrl] = useState('');
  const [taxInvoiceName, setTaxInvoiceName] = useState('');

  // Accounts Payment Collection Update Modal State (Full / Partial / Pending + Proof + Callback Date)
  const [paymentEditTarget, setPaymentEditTarget] = useState<RechargeRequest | null>(null);
  const [editPayStatus, setEditPayStatus] = useState<PaymentStatus>('PAID');
  const [editPaidAmt, setEditPaidAmt] = useState<string>('0');
  const [editPayNote, setEditPayNote] = useState<string>('');
  const [editPayProofUrl, setEditPayProofUrl] = useState<string>('');
  const [editPayProofName, setEditPayProofName] = useState<string>('');
  const [editCallbackDate, setEditCallbackDate] = useState<string>('');
  const [editCallbackTime, setEditCallbackTime] = useState<string>('11:00');

  // Ledger Filter & Search
  const [billingTab, setBillingTab] = useState<'followup' | 'pending' | 'ledger' | 'master'>(
    pendingBilling.length > 0 ? 'pending' : 'followup'
  );
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'PENDING'>('ALL');
  const [billSearch, setBillSearch] = useState('');
  const [followUpSearch, setFollowUpSearch] = useState('');

  const [viewInvoiceReq, setViewInvoiceReq] = useState<RechargeRequest | null>(
    null
  );
  const [viewSupportProofReq, setViewSupportProofReq] = useState<RechargeRequest | null>(
    null
  );

  // Helper to compute exact paid & balance due for any billed item
  const getPaymentBreakdown = (item: RechargeRequest) => {
    const total = Number(item.amount || 0);
    const status: PaymentStatus =
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
  };

  // Financial Ledger Summary Totals across billedHistory
  const ledgerSummary = billedHistory.reduce(
    (acc, item) => {
      const { total, paid, balance, status } = getPaymentBreakdown(item);
      acc.totalBilled += total;
      acc.totalReceived += paid;
      acc.totalBalanceDue += balance;
      if (status === 'PAID') acc.paidCount += 1;
      else if (status === 'PARTIAL') acc.partialCount += 1;
      else acc.pendingCount += 1;
      return acc;
    },
    {
      totalBilled: 0,
      totalReceived: 0,
      totalBalanceDue: 0,
      paidCount: 0,
      partialCount: 0,
      pendingCount: 0,
    }
  );

  const filteredBilledHistory = billedHistory.filter((item) => {
    const { status } = getPaymentBreakdown(item);
    if (paymentFilter !== 'ALL' && status !== paymentFilter) return false;
    if (billSearch) {
      const q = billSearch.toLowerCase();
      return (
        (item.billingInvoiceNumber || '').toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        (item.billingEntity || '').toLowerCase().includes(q) ||
        item.agentName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openBillModal = (req: RechargeRequest) => {
    const nextNum = `TALLY-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    setBillingTarget(req);
    setInvoiceNumber(nextNum);
    const defStatus: PaymentStatus = req.paymentMode === 'POSTPAID' ? 'PENDING' : 'PAID';
    setPaymentStatus(defStatus);
    setInitialPaidAmount(defStatus === 'PAID' ? String(req.amount || 0) : '0');
    setPaymentNote(`Tally Bill generated for ${req.billingEntity || req.companyName}.`);
    setTaxInvoiceDataUrl('');
    setTaxInvoiceName('');
  };

  const openPaymentUpdateModal = (req: RechargeRequest) => {
    const { paid, status } = getPaymentBreakdown(req);
    setPaymentEditTarget(req);
    setEditPayStatus(status);
    setEditPaidAmt(String(paid));
    setEditPayNote(req.billingPaymentNote || '');
    setEditPayProofUrl(req.paymentProofDataUrl || '');
    setEditPayProofName(req.paymentProofName || '');
    if (req.paymentCallbackReminder && !req.paymentCallbackReminder.completed) {
      const dt = req.paymentCallbackReminder.datetime;
      setEditCallbackDate(dt.slice(0, 10));
      setEditCallbackTime(dt.slice(11, 16) || '11:00');
    } else {
      setEditCallbackDate('');
      setEditCallbackTime('11:00');
    }
  };

  const handlePayProofPaste = (e: React.ClipboardEvent<any>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type.indexOf('image') !== -1) {
        const file = it.getAsFile();
        if (file) {
          fileToDataUrl(file).then((url) => {
            setEditPayProofUrl(url);
            setEditPayProofName('accounts-payment-proof-' + Date.now() + '.jpg');
          });
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleInvoiceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setTaxInvoiceDataUrl(url);
    setTaxInvoiceName(file.name);
  };

  const handlePublishBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingTarget) return;
    const dataUrl =
      taxInvoiceDataUrl ||
      buildSampleTaxInvoiceSvg(billingTarget, invoiceNumber, paymentStatus);
    const fileName = taxInvoiceName || `${invoiceNumber}.svg`;

    const ok = await onAction('BILLING_CREATE_TALLY_AND_FORWARD', {
      rechargeId: billingTarget.id,
      billingInvoiceNumber: invoiceNumber,
      billingTaxInvoiceDataUrl: dataUrl,
      billingTaxInvoiceName: fileName,
      billingPaymentStatus: paymentStatus,
      paidAmount: Number(initialPaidAmount) || 0,
      billingPaymentNote: paymentNote,
    });
    if (ok) setBillingTarget(null);
  };

  const handlePaymentUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentEditTarget) return;
    const callbackDateTime = editCallbackDate
      ? `${editCallbackDate}T${editCallbackTime || '11:00'}:00`
      : undefined;

    const ok = await onAction('UPDATE_BILLING_PAYMENT', {
      rechargeId: paymentEditTarget.id,
      billingPaymentStatus: editPayStatus,
      paidAmount: Number(editPaidAmt) || 0,
      billingPaymentNote: editPayNote,
      paymentProofDataUrl: editPayProofUrl || undefined,
      paymentProofName: editPayProofName || undefined,
      callbackDateTime,
      callbackNote: editPayNote,
    });
    if (ok) setPaymentEditTarget(null);
  };

  // Active Payment Follow-Up Callback Reminders for Accounts Team
  const activePaymentCallbacks = db.rechargeRequests.filter(
    (r) => r.paymentCallbackReminder && !r.paymentCallbackReminder.completed
  );

  // Automatic Outstanding Bills (Every Tally Bill where Balance Due > 0)
  const outstandingBills = billedHistory
    .filter((item) => getPaymentBreakdown(item).balance > 0)
    .filter((item) => {
      if (!followUpSearch) return true;
      const q = followUpSearch.toLowerCase();
      return (
        (item.billingInvoiceNumber || '').toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        (item.billingEntity || '').toLowerCase().includes(q) ||
        (item.clientPhone || '').toLowerCase().includes(q) ||
        (item.clientEmail || '').toLowerCase().includes(q) ||
        item.agentName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aRem = a.paymentCallbackReminder && !a.paymentCallbackReminder.completed ? new Date(a.paymentCallbackReminder.datetime).getTime() : Infinity;
      const bRem = b.paymentCallbackReminder && !b.paymentCallbackReminder.completed ? new Date(b.paymentCallbackReminder.datetime).getTime() : Infinity;
      if (aRem !== bRem) return aRem - bRem;
      return getPaymentBreakdown(b).balance - getPaymentBreakdown(a).balance;
    });

  const dueCallbacksCount = activePaymentCallbacks.filter(
    (r) => new Date(r.paymentCallbackReminder!.datetime).getTime() <= Date.now()
  ).length;

  return (
    <div className="space-y-5">
      {/* Clean Header + Organized Sub-Tab Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Billing, Tax Invoices &amp; Accounts Payment Follow-Up
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Organized workspace: Outstanding bills automatically move to <strong>Payment Follow-Up</strong> until 100% settled.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                const headers = ['Company', 'Client', 'Invoice No', 'Total Amount', 'Paid', 'Balance', 'Status', 'Date'];
                const rows = billedHistory.map((item) => {
                  const br = getPaymentBreakdown(item);
                  return [
                    item.companyName || '',
                    item.clientName || '',
                    item.billingInvoiceNumber || item.id || '',
                    String(br.total || 0),
                    String(br.paid || 0),
                    String(br.balance || 0),
                    br.balance > 0 ? 'PENDING' : 'PAID',
                    (item.createdAt || '').slice(0, 10),
                  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
                });
                const csv = [headers.join(','), ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `immense-billing-export-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV (GST/CA)
            </button>
            {dueCallbacksCount > 0 && (
              <button
                type="button"
                onClick={() => setBillingTab('followup')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1.5 animate-pulse shadow-xs"
              >
                <AlarmClock className="w-4 h-4" />
                {dueCallbacksCount} Payment Call Due Today!
              </button>
            )}
          </div>
        </div>

        {/* Clean 4-Tab Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setBillingTab('followup')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              billingTab === 'followup'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Payment Follow-Up (Auto Outstanding)</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                billingTab === 'followup' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-900'
              }`}
            >
              {billedHistory.filter((i) => getPaymentBreakdown(i).balance > 0).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBillingTab('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              billingTab === 'pending'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Pending Tally Bills</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                billingTab === 'pending' ? 'bg-white/20 text-white' : 'bg-sky-200 text-sky-900'
              }`}
            >
              {pendingBilling.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBillingTab('ledger')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              billingTab === 'ledger'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All Tally Bills &amp; Ledger</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                billingTab === 'ledger' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {billedHistory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBillingTab('master')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              billingTab === 'master'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Client Billing Master</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                billingTab === 'master' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {db.onboardingRequests.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: AUTOMATIC PAYMENT FOLLOW-UP (OUTSTANDING BILLS + CALLBACK REMINDERS) */}
      {billingTab === 'followup' && (
        <div className="space-y-5">
          {/* Scheduled Callback Alerts (Compact Grid) */}
          {activePaymentCallbacks.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  <AlarmClock className="w-4 h-4 text-amber-700 animate-bounce" />
                  Scheduled Client Callbacks ({activePaymentCallbacks.length})
                </h3>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                  Promised Payment Call Dates
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activePaymentCallbacks.map((req) => {
                  const rem = req.paymentCallbackReminder!;
                  const { balance } = getPaymentBreakdown(req);
                  const isDue = new Date(rem.datetime).getTime() <= Date.now();

                  return (
                    <div
                      key={`pay-rem-${req.id}`}
                      className={`p-3 rounded-xl border bg-white flex flex-col justify-between gap-2 ${
                        isDue ? 'border-rose-400 ring-2 ring-rose-200' : 'border-amber-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {req.billingEntity || req.companyName} (@{req.username})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isDue
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {isDue ? '🔔 CALL NOW (DUE)' : `⏰ Call on: ${formatDateTime(rem.datetime)}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-700 pt-0.5">
                          {req.clientPhone && (
                            <a
                              href={`tel:${req.clientPhone}`}
                              className="font-bold text-indigo-700 hover:underline inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {req.clientPhone}
                            </a>
                          )}
                          {req.clientEmail && (
                            <a
                              href={`mailto:${req.clientEmail}`}
                              className="font-semibold text-slate-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3 text-sky-600" />
                              {req.clientEmail}
                            </a>
                          )}
                          <span className="font-extrabold text-rose-700">
                            Balance Due: {formatINR(balance)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200/80">
                          <strong>Remark:</strong> {rem.note}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        {canBill && (
                          <>
                            <button
                              type="button"
                              onClick={() => openPaymentUpdateModal(req)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                            >
                              Update Payment / Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onAction('COMPLETE_PAYMENT_CALLBACK_REMINDER', { rechargeId: req.id })
                              }
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Automatic Outstanding Follow-Up Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/70 to-white">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Automatic Outstanding Payment Follow-Up Queue ({outstandingBills.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Every Unpaid or Partial bill automatically lands here with Client Phone &amp; Email. Once 100% Paid, it clears automatically.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-extrabold text-rose-800">
                  Total Outstanding: {formatINR(ledgerSummary.totalBalanceDue)}
                </div>
                <div className="relative w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={followUpSearch}
                    onChange={(e) => setFollowUpSearch(e.target.value)}
                    placeholder="Search client, phone, bill..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>

            {outstandingBills.length === 0 ? (
              <div className="p-10 text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Zero Outstanding Payments!</div>
                <p className="text-xs text-slate-500">All Tally bills are 100% settled. Any new Unpaid or Partial bill will automatically appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                    <tr>
                      <th className="py-3 px-4">Invoice &amp; Date</th>
                      <th className="py-3 px-4">Client, Phone &amp; Email</th>
                      <th className="py-3 px-4">Bill vs Received vs Balance</th>
                      <th className="py-3 px-4">Follow-Up Call Schedule</th>
                      <th className="py-3 px-4 text-right">Accounts Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outstandingBills.map((item) => {
                      const { total, paid, balance, status } = getPaymentBreakdown(item);
                      const rem = item.paymentCallbackReminder && !item.paymentCallbackReminder.completed ? item.paymentCallbackReminder : null;
                      const isDue = rem ? new Date(rem.datetime).getTime() <= Date.now() : false;

                      return (
                        <tr key={`out-${item.id}`} className={`hover:bg-slate-50/70 align-top ${isDue ? 'bg-rose-50/40' : ''}`}>
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-900">
                              {item.billingInvoiceNumber || 'Pending #'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatDateTime(item.billingCompletedAt || item.updatedAt)}
                            </div>
                            <span className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.paymentMode || 'PREPAID'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {item.billingEntity || item.companyName}
                            </div>
                            <div className="text-xs text-indigo-700 font-mono font-semibold">
                              @{item.username} • {item.service}
                            </div>
                            <div className="mt-1 flex flex-col gap-0.5 text-[11px]">
                              {item.clientPhone && (
                                <a
                                  href={`tel:${item.clientPhone}`}
                                  className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 hover:underline"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  {item.clientPhone}
                                </a>
                              )}
                              {item.clientEmail && (
                                <a
                                  href={`mailto:${item.clientEmail}`}
                                  className="inline-flex items-center gap-1 text-slate-600 hover:underline"
                                >
                                  <Mail className="w-3 h-3 text-sky-600" />
                                  {item.clientEmail}
                                </a>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={status} />
                              <span className="text-[11px] text-slate-500">Total: {formatINR(total)}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-emerald-700 font-bold">Paid: {formatINR(paid)}</span>
                              <span className="text-rose-700 font-black bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Due: {formatINR(balance)}
                              </span>
                            </div>
                            {item.billingPaymentNote && (
                              <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                {item.billingPaymentNote}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {rem ? (
                              <div
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                  isDue
                                    ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                                    : 'bg-amber-50 text-amber-900 border-amber-300'
                                }`}
                              >
                                <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                                <span>{isDue ? 'CALL DUE NOW!' : formatDateTime(rem.datetime)}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                No callback date set yet
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {canBill && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentUpdateModal(item)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  Update Payment / Set Call Date
                                </button>
                              )}
                              {item.billingTaxInvoiceDataUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    triggerDirectDownload(
                                      item.billingTaxInvoiceDataUrl!,
                                      item.billingTaxInvoiceName || `${item.billingInvoiceNumber || 'Invoice'}.svg`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Download Invoice
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: New Client Onboarding Billing & Commercial Configurations */}
      {billingTab === 'master' && (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-emerald-50/60 to-white">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              New Client Onboarding Billing Records ({db.onboardingRequests.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Client billing master: Entity Name, GSTIN, Client Phone &amp; Email (for payment follow-up), Payment Type, Postpaid Cycle &amp; Commercials.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            Billing &amp; Finance View
          </span>
        </div>

        {db.onboardingRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No onboarding records created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Billing Entity &amp; GSTIN</th>
                  <th className="py-3 px-4">Client Phone &amp; Email (Follow-Up)</th>
                  <th className="py-3 px-4">Account Panel Username</th>
                  <th className="py-3 px-4">Sales Agent &amp; AM</th>
                  <th className="py-3 px-4">Payment Type &amp; Cycle</th>
                  <th className="py-3 px-4">Services Provisioned</th>
                  <th className="py-3 px-4 text-right">Price / Deal Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.onboardingRequests.map((item) => {
                  const isPostpaid =
                    item.paymentType === 'POSTPAID' ||
                    item.billingType === 'POSTPAID';
                  const cycleDisplay = item.postpaidCycle
                    ? item.postpaidCycle.replace('_', ' ')
                    : '15 DAYS';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* Billing Entity & GSTIN */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {item.billingEntity || item.companyName}
                        </div>
                        <div className="text-xs mt-0.5 flex items-center gap-1.5">
                          {item.taxType === 'NON_GST' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Non-GST Client
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              GST: {item.gstNumber || 'Pending / Under Review'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Contact: <strong className="text-slate-600">{item.clientName || item.companyName}</strong>
                        </div>
                      </td>

                      {/* Client Contact Number & Email ID for Accounts Follow-up */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="space-y-1">
                          <a
                            href={`tel:${item.clientPhone || '+919820144500'}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item.clientPhone || '+91 98201 44500'}</span>
                          </a>
                          <a
                            href={`mailto:${item.clientEmail || `accounts@${item.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}`}
                            className="text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 truncate max-w-[190px]"
                          >
                            <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span className="truncate">
                              {item.clientEmail || `accounts@${item.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}
                            </span>
                          </a>
                        </div>
                      </td>

                      {/* Account Username */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-200 text-xs">
                          @{item.username}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          (SMS / RCS / WABA Panel)
                        </div>
                      </td>

                      {/* Sales Agent & Account Manager */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <span className="text-slate-400">Agent:</span> {item.agentName}
                        </div>
                        <div className="text-slate-600 mt-0.5 flex items-center gap-1">
                          <span className="text-slate-400">AM:</span>{' '}
                          <span className="font-medium text-slate-700">
                            {item.accountManagerName || item.approvedBy || 'Neha Kapoor'}
                          </span>
                        </div>
                      </td>

                      {/* Payment Type & Postpaid Cycle */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isPostpaid
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isPostpaid ? 'POSTPAID' : item.paymentType || item.billingType || 'PREPAID'}
                          </span>

                          {isPostpaid && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Calendar className="w-3 h-3 text-amber-600" />
                              Cycle: {cycleDisplay}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Services Provisioned */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.services.map((svc) => (
                            <span
                              key={svc}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200"
                            >
                              {svc}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Price / Deal Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatINR(item.totalDealAmount || 0)}
                        </div>
                        <div className="text-xs font-semibold text-emerald-700">
                          {item.unitPrice}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Status: <span className="font-medium">{item.status}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* TAB 2: Pending Billing Queue */}
      {billingTab === 'pending' && (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-sky-600" />
          Pending Tally Bill Queue (Raised by Sales Agent / AM) ({pendingBilling.length})
        </h3>

        {pendingBilling.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
            No recharges awaiting Tally Bill creation right now.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingBilling.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {req.billingEntity || req.companyName}
                    </span>
                    <span className="text-xs font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      @{req.username}
                    </span>
                    {req.isExternalCampaign && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                        <Megaphone className="w-3 h-3 text-amber-700" /> EXTERNAL CAMPAIGN LIVE • BILLING REMINDER
                      </span>
                    )}
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {req.paymentMode || 'PREPAID'}
                    </span>
                    {req.gstNumber && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                        GST: {req.gstNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    {req.creditCount ? (
                      <>
                        Credits: <strong className="text-indigo-900">{req.creditCount.toLocaleString('en-IN')}</strong> •{' '}
                      </>
                    ) : null}
                    Amount: <strong className="text-slate-900">{formatINR(req.amount)}</strong> • Service: {req.service} • Agent: {req.agentName}
                  </div>
                  {(req.clientPhone || req.clientEmail) && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                      {req.clientName && (
                        <span className="font-bold text-slate-700">Contact: {req.clientName}</span>
                      )}
                      {req.clientPhone && (
                        <a
                          href={`tel:${req.clientPhone}`}
                          className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-50"
                        >
                          <Phone className="w-3 h-3 text-indigo-600" />
                          {req.clientPhone}
                        </a>
                      )}
                      {req.clientEmail && (
                        <a
                          href={`mailto:${req.clientEmail}`}
                          className="inline-flex items-center gap-1 font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50"
                        >
                          <Mail className="w-3 h-3 text-slate-500" />
                          {req.clientEmail}
                        </a>
                      )}
                    </div>
                  )}
                  {req.campaignTitle && (
                    <div className="text-xs font-bold text-amber-900">
                      Campaign: {req.campaignTitle}
                    </div>
                  )}
                  {req.agentNotes && (
                    <div className="text-xs text-slate-700">
                      <strong>Agent Note:</strong> {req.agentNotes}
                    </div>
                  )}
                  {req.supportRechargeNote && (
                    <div className="text-xs text-emerald-700 font-semibold">
                      <strong>Support LIVE Confirmation ({req.supportConfirmedBy}):</strong> {req.supportRechargeNote}
                    </div>
                  )}
                </div>

                {canBill && (
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                    {req.isExternalCampaign && (
                      <button
                        type="button"
                        onClick={() =>
                          onAction('SEND_EXTERNAL_CAMPAIGN_BILLING_FOLLOWUP', {
                            rechargeId: req.id,
                            note: `Billing Reminder (#${(req.billingFollowUpCount || 0) + 1}): External Campaign (${req.service}) is LIVE for @${req.username}. Please confirm Billing Entity / PO / Payment details.`,
                          })
                        }
                        className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
                      >
                        <BellRing className="w-3.5 h-3.5 text-amber-700" />
                        Follow-Up Agent ({req.billingFollowUpCount || 0})
                      </button>
                    )}

                    <button
                      onClick={() => openBillModal(req)}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {req.isExternalCampaign
                        ? 'Raise Tally Bill for LIVE Campaign'
                        : 'Create Tally Bill & Send to Support'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* TAB 3: FINANCIAL PAYMENT COLLECTION & PARTIAL BALANCE LEDGER */}
      {billingTab === 'ledger' && (
      <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setPaymentFilter('ALL')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            paymentFilter === 'ALL'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Billed Value</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1.5">
            {formatINR(ledgerSummary.totalBilled)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across {billedHistory.length} Tally Bills
          </div>
        </div>

        <div
          onClick={() => setPaymentFilter('PAID')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            paymentFilter === 'PAID'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Total Payment Received</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1.5">
            {formatINR(ledgerSummary.totalReceived)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {ledgerSummary.paidCount} Fully Paid Bills
          </div>
        </div>

        <div
          onClick={() => setPaymentFilter('PARTIAL')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            paymentFilter === 'PARTIAL'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Partial Payment Bills</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1.5">
            {ledgerSummary.partialCount} Bills
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
            Click to view remaining balance
          </div>
        </div>

        <div
          onClick={() => setPaymentFilter('PENDING')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            paymentFilter === 'PENDING'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
            <span>Total Balance Due</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800 mt-1.5">
            {formatINR(ledgerSummary.totalBalanceDue)}
          </div>
          <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
            {ledgerSummary.pendingCount} Unpaid + {ledgerSummary.partialCount} Partial
          </div>
        </div>
      </div>

      {/* Published Tax Invoices, Payment Ledger & Support Recharge Proofs Table (Visible to Billing, Agent, AM, Admin) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tally Bills, Payment Collection Ledger (Paid / Partial / Pending Balance) ({filteredBilledHistory.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Accounts / Billing team updates full or partial payments received; live balance due is visible to Sales Agent, Account Manager &amp; Admin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            {(
              [
                { id: 'ALL', label: `All (${billedHistory.length})` },
                { id: 'PAID', label: `✅ Paid (${ledgerSummary.paidCount})` },
                { id: 'PARTIAL', label: `🌓 Partial (${ledgerSummary.partialCount})` },
                { id: 'PENDING', label: `⏳ Unpaid (${ledgerSummary.pendingCount})` },
              ] as { id: typeof paymentFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPaymentFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  paymentFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder="Search bill #, @user..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {filteredBilledHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No Tally bills match the selected payment filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Tally Bill #</th>
                  <th className="py-3 px-4">Client &amp; @Username</th>
                  <th className="py-3 px-4">Total Bill Value</th>
                  <th className="py-3 px-4">Payment Received &amp; Balance Due</th>
                  <th className="py-3 px-4">Recharge &amp; Proofs</th>
                  <th className="py-3 px-4 text-right">Invoice &amp; Accounts Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBilledHistory.map((item) => {
                  const isRechargeDone =
                    item.status === 'BILLED' ||
                    item.status === 'RECHARGE_COMPLETED' ||
                    Boolean(item.supportCompletedAt);

                  const { total, paid, balance, status } = getPaymentBreakdown(item);
                  const pctPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {item.billingInvoiceNumber || 'Pending Bill'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {formatDateTime(item.billingCompletedAt || item.updatedAt)}
                        </div>
                        {item.isExternalCampaign && (
                          <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            EXTERNAL CAMPAIGN
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {item.billingEntity || item.companyName}
                        </div>
                        <div className="text-xs text-slate-500">
                          <span className="font-mono font-bold text-indigo-700">@{item.username}</span> • {item.service}
                        </div>
                        {(item.clientPhone || item.clientEmail) && (
                          <div className="mt-1 space-y-0.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg px-2 py-1">
                            {item.clientName && (
                              <div className="text-[11px] font-bold text-slate-800">
                                Contact: {item.clientName}
                              </div>
                            )}
                            {item.clientPhone && (
                              <a
                                href={`tel:${item.clientPhone}`}
                                className="flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-700 hover:underline"
                              >
                                <Phone className="w-3 h-3 text-indigo-600 shrink-0" />
                                {item.clientPhone}
                              </a>
                            )}
                            {item.clientEmail && (
                              <a
                                href={`mailto:${item.clientEmail}`}
                                className="flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:underline break-all"
                              >
                                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                {item.clientEmail}
                              </a>
                            )}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-1">
                          Agent: <strong className="text-slate-700">{item.agentName}</strong> • AM:{' '}
                          <strong className="text-slate-700">{item.accountManagerName || 'Neha Kapoor'}</strong>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.creditCount && (
                          <div className="text-xs font-extrabold text-indigo-900">
                            {item.creditCount.toLocaleString('en-IN')} Credits
                          </div>
                        )}
                        <div className="text-base font-black text-slate-900">
                          {formatINR(total)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500">
                          Mode: {item.paymentMode || 'PREPAID'}
                        </div>
                      </td>

                      {/* Payment Collection Breakdown: Received vs Pending Balance Due */}
                      <td className="py-3.5 px-4 min-w-[230px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <StatusBadge status={status} />
                            <span className="text-[11px] font-extrabold text-slate-600">
                              {pctPaid}% Settled
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                status === 'PAID'
                                  ? 'bg-emerald-500'
                                  : status === 'PARTIAL'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${pctPaid}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-0.5">
                            <div className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                              <span className="text-[10px] text-emerald-700 block">Received:</span>
                              <span className="font-black text-emerald-900">{formatINR(paid)}</span>
                            </div>

                            <div
                              className={`px-2 py-1 rounded-lg border ${
                                balance > 0
                                  ? 'bg-rose-50 border-rose-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <span
                                className={`text-[10px] block ${
                                  balance > 0 ? 'text-rose-700 font-bold' : 'text-slate-400'
                                }`}
                              >
                                Balance Due:
                              </span>
                              <span
                                className={`font-black ${
                                  balance > 0 ? 'text-rose-800' : 'text-slate-500'
                                }`}
                              >
                                {formatINR(balance)}
                              </span>
                            </div>
                          </div>

                          {item.billingPaymentNote && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200/80">
                              <strong>Accounts Note:</strong> {item.billingPaymentNote}
                              {item.paymentUpdatedBy && (
                                <span className="text-[10px] text-slate-400 block">
                                  Updated by {item.paymentUpdatedBy}
                                </span>
                              )}
                            </div>
                          )}

                          {item.paymentCallbackReminder && !item.paymentCallbackReminder.completed && (
                            <div className="text-[11px] font-bold text-amber-950 bg-amber-100/90 border border-amber-300 px-2 py-1 rounded-lg flex items-center gap-1.5">
                              <CalendarClock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <div>
                                <span className="block text-[10px] uppercase tracking-wider text-amber-800">
                                  Scheduled Payment Call Reminder:
                                </span>
                                <span>{formatDateTime(item.paymentCallbackReminder.datetime)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Recharge Status & Proofs (1-Click Download) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {isRechargeDone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              RECHARGE DONE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold">
                              Sent to Support
                            </span>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {item.screenshotDataUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  triggerDirectDownload(
                                    item.screenshotDataUrl,
                                    item.screenshotName || `client-proof-${item.username}.png`
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs"
                                title="1-Click Download Client Supporting Proof"
                              >
                                <Download className="w-3 h-3 text-indigo-600" />
                                Client Proof
                              </button>
                            )}

                            {item.supportScreenshotDataUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  triggerDirectDownload(
                                    item.supportScreenshotDataUrl!,
                                    item.supportScreenshotName || `support-proof-${item.username}.png`
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs"
                                title="1-Click Download Support Panel Recharge Screenshot"
                              >
                                <Download className="w-3 h-3 text-emerald-600" />
                                Support Proof
                              </button>
                            )}

                            {item.paymentProofDataUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  triggerDirectDownload(
                                    item.paymentProofDataUrl!,
                                    item.paymentProofName || `payment-proof-${item.billingInvoiceNumber || item.username}.png`
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs"
                                title="1-Click Download Accounts Payment Receipt / Bank UTR Proof"
                              >
                                <Download className="w-3 h-3 text-sky-700" />
                                Payment Proof
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tally Tax Invoice & Accounts Payment Update Button */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {item.billingTaxInvoiceDataUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                triggerDirectDownload(
                                  item.billingTaxInvoiceDataUrl!,
                                  item.billingTaxInvoiceName || `${item.billingInvoiceNumber || 'Tally-Invoice'}.svg`
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Invoice #{item.billingInvoiceNumber}
                            </button>
                          )}

                          {/* Accounts / Billing / Admin Payment Collection Update Button */}
                          {canBill && (
                            <button
                              type="button"
                              onClick={() => openPaymentUpdateModal(item)}
                              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs transition"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                              Update Payment / Balance
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Billing Raise Invoice Modal */}
      <Modal
        open={Boolean(billingTarget)}
        onClose={() => setBillingTarget(null)}
        title={`Raise Tax Invoice: ${billingTarget?.companyName || ''}`}
        subtitle={`Account: @${billingTarget?.username || ''} • Amount: ${formatINR(billingTarget?.amount)}`}
      >
        <form onSubmit={handlePublishBill} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tax Invoice Number *
              </label>
              <input
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g., INV-2026-0842"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Status *
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => {
                  const st = e.target.value as PaymentStatus;
                  setPaymentStatus(st);
                  const tot = billingTarget?.amount || 0;
                  if (st === 'PAID') setInitialPaidAmount(String(tot));
                  else if (st === 'PENDING') setInitialPaidAmount('0');
                  else setInitialPaidAmount(String(Math.round(tot / 2)));
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
              >
                <option value="PAID">PAID (Full Received)</option>
                <option value="PARTIAL">PARTIAL (Part Payment Received)</option>
                <option value="PENDING">PENDING (Unpaid / Credit)</option>
              </select>
            </div>
          </div>

          {/* Paid vs Balance Due Calculator inside Create Tally Bill Modal */}
          {billingTarget && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-extrabold text-emerald-900 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  min={0}
                  max={billingTarget.amount || 99999999}
                  value={initialPaidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInitialPaidAmount(val);
                    const num = Number(val) || 0;
                    const tot = billingTarget.amount || 0;
                    if (num <= 0) setPaymentStatus('PENDING');
                    else if (num >= tot) setPaymentStatus('PAID');
                    else setPaymentStatus('PARTIAL');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-sm font-black text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-rose-900 mb-1">
                  Remaining Balance Due (₹)
                </label>
                <div className="w-full px-3 py-2 rounded-xl border border-rose-200 bg-rose-50/70 text-sm font-black text-rose-800">
                  {formatINR(
                    Math.max(0, (billingTarget.amount || 0) - (Number(initialPaidAmount) || 0))
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Upload Tax Invoice (PDF / Image) *
              </label>
              {billingTarget && (
                <button
                  type="button"
                  onClick={() => {
                    setTaxInvoiceDataUrl(
                      buildSampleTaxInvoiceSvg(
                        billingTarget,
                        invoiceNumber,
                        paymentStatus
                      )
                    );
                    setTaxInvoiceName(`${invoiceNumber}-tax-invoice.svg`);
                  }}
                  className="text-[11px] font-semibold text-sky-600 hover:underline"
                >
                  Generate Sample Tax Invoice
                </button>
              )}
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-sky-400 bg-slate-50">
              <Upload className="w-5 h-5 text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-600">
                {taxInvoiceName
                  ? `Selected: ${taxInvoiceName}`
                  : 'Upload PDF, PNG, JPG, or click Generate Sample above'}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleInvoiceFile}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Update / Reconciliation Note
            </label>
            <textarea
              rows={2}
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g., Received ₹15,000 via NEFT UTR..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBillingTarget(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Save Tally Bill &amp; Forward to Support
            </button>
          </div>
        </form>
      </Modal>

      {/* Accounts Team Payment Collection / Partial Balance Update Modal */}
      <Modal
        open={Boolean(paymentEditTarget)}
        onClose={() => setPaymentEditTarget(null)}
        title={`Update Payment Collection: ${paymentEditTarget?.billingInvoiceNumber || ''}`}
        subtitle={`Client: ${paymentEditTarget?.billingEntity || paymentEditTarget?.companyName || ''} (@${paymentEditTarget?.username || ''}) • Total Bill: ${formatINR(paymentEditTarget?.amount)}`}
      >
        {paymentEditTarget && (() => {
          const totalBill = Number(paymentEditTarget.amount || 0);
          const currentPaid = Number(editPaidAmt || 0);
          const currentBalance = Math.max(0, totalBill - currentPaid);

          return (
            <form onSubmit={handlePaymentUpdateSubmit} onPaste={handlePayProofPaste} className="space-y-4">
              {/* Direct Client Contact Follow-Up Strip for Accounts */}
              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 block">
                    Client Contact for Payment Follow-Up
                  </span>
                  <div className="text-xs font-black text-slate-900 mt-0.5">
                    {paymentEditTarget.clientName || paymentEditTarget.billingEntity || paymentEditTarget.companyName}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {paymentEditTarget.clientPhone ? (
                    <a
                      href={`tel:${paymentEditTarget.clientPhone}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-indigo-700 font-mono font-bold border border-indigo-200 hover:bg-indigo-100 shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
                      {paymentEditTarget.clientPhone}
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">No phone</span>
                  )}
                  {paymentEditTarget.clientEmail ? (
                    <a
                      href={`mailto:${paymentEditTarget.clientEmail}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-slate-700 font-medium border border-slate-200 hover:bg-slate-100 shadow-2xs"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      {paymentEditTarget.clientEmail}
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Quick Mode Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Select Payment Collection Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPayStatus('PAID');
                      setEditPaidAmt(String(totalBill));
                      setEditPayNote(`Full payment of ₹${totalBill.toLocaleString('en-IN')} received and settled.`);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      editPayStatus === 'PAID'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-extrabold">✅ Full Paid</div>
                    <div className="text-[10px] opacity-85">₹0 Balance Due</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPayStatus('PARTIAL');
                      const half = currentPaid > 0 && currentPaid < totalBill ? currentPaid : Math.round(totalBill / 2);
                      setEditPaidAmt(String(half));
                      setEditPayNote(`Partial payment of ₹${half.toLocaleString('en-IN')} received.`);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      editPayStatus === 'PARTIAL'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-extrabold">🌓 Partial Paid</div>
                    <div className="text-[10px] opacity-85">Partial Balance Due</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditPayStatus('PENDING');
                      setEditPaidAmt('0');
                      setEditPayNote(`Payment not received yet (Full ₹${totalBill.toLocaleString('en-IN')} pending).`);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      editPayStatus === 'PENDING'
                        ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-extrabold">⏳ Unpaid</div>
                    <div className="text-[10px] opacity-85">100% Pending</div>
                  </button>
                </div>
              </div>

              {/* Amount Received vs Pending Balance Calculator */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Total Bill Value
                  </span>
                  <div className="text-base font-black text-slate-900 mt-1">
                    {formatINR(totalBill)}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-emerald-700 mb-1">
                    2. Amount Received (₹) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={totalBill}
                    required
                    value={editPaidAmt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditPaidAmt(val);
                      const num = Number(val) || 0;
                      if (num <= 0) setEditPayStatus('PENDING');
                      else if (num >= totalBill) setEditPayStatus('PAID');
                      else setEditPayStatus('PARTIAL');
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-white text-sm font-black text-emerald-900"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-extrabold uppercase text-rose-700 block">
                    Balance Due (₹)
                  </span>
                  <div
                    className={`text-base font-black mt-1 ${
                      currentBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatINR(currentBalance)}
                  </div>
                </div>
              </div>

              {/* UTR / Payment Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Accounts Payment / UTR / Follow-Up Note *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editPayNote}
                  onChange={(e) => setEditPayNote(e.target.value)}
                  placeholder="e.g., Received ₹10,000 via NEFT UTR12345. Remaining ₹15,000 promised by Friday."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* 4. Upload / Paste Payment Receipt / Bank UTR Screenshot */}
              <div className="p-3.5 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-sky-600" />
                    4. Upload Payment Receipt / Bank UTR Screenshot (Ctrl+V Paste or Browse)
                  </span>
                  {editPayProofUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditPayProofUrl('');
                        setEditPayProofName('');
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Remove Proof
                    </button>
                  )}
                </div>

                {editPayProofUrl ? (
                  <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-sky-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editPayProofUrl}
                      alt="Payment Proof Preview"
                      className="h-14 w-20 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Payment Proof Attached
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
                        {editPayProofName || 'payment-proof.png'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2 text-center">
                    <p className="text-[11px] text-slate-600 mb-1.5">
                      Press <strong className="text-sky-800">Ctrl+V</strong> anywhere in this modal to paste payment screenshot, or browse file
                    </p>
                    <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 shadow-2xs">
                      Browse Payment Proof
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = await fileToDataUrl(file);
                          setEditPayProofUrl(url);
                          setEditPayProofName(file.name);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 5. Schedule Payment Follow-Up Callback Reminder (If client asked to call on a specific date) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4 text-amber-700" />
                      5. Client Said &ldquo;Call Me On This Date&rdquo;? (Schedule Accounts Payment Reminder)
                    </label>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Set callback date &amp; time — Accounts team will get a prominent reminder banner &amp; notification on that day to call the client.
                    </p>
                  </div>
                  {editCallbackDate && (
                    <button
                      type="button"
                      onClick={() => setEditCallbackDate('')}
                      className="text-[11px] font-bold text-rose-700 hover:underline shrink-0"
                    >
                      Clear Date
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-amber-900 mb-1">
                      Follow-Up Call Date
                    </label>
                    <input
                      type="date"
                      value={editCallbackDate}
                      onChange={(e) => setEditCallbackDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-amber-900 mb-1">
                      Follow-Up Call Time
                    </label>
                    <input
                      type="time"
                      value={editCallbackTime}
                      onChange={(e) => setEditCallbackTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentEditTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Payment Update (Notify Agent, AM &amp; Admin)
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Preview Tax Invoice Modal */}
      <Modal
        open={Boolean(viewInvoiceReq)}
        onClose={() => setViewInvoiceReq(null)}
        title={`Tally Tax Invoice: ${viewInvoiceReq?.billingInvoiceNumber || ''}`}
        subtitle={`${viewInvoiceReq?.billingEntity || viewInvoiceReq?.companyName || ''} • ${formatINR(viewInvoiceReq?.amount)}`}
        maxWidth="max-w-2xl"
      >
        {viewInvoiceReq?.billingTaxInvoiceDataUrl && (
          <div className="space-y-3">
            {viewInvoiceReq.billingTaxInvoiceDataUrl.startsWith(
              'data:application/pdf'
            ) ? (
              <iframe
                src={viewInvoiceReq.billingTaxInvoiceDataUrl}
                className="w-full h-[60vh] rounded-xl border border-slate-200"
                title="Tax Invoice PDF"
              />
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewInvoiceReq.billingTaxInvoiceDataUrl}
                  alt={viewInvoiceReq.billingTaxInvoiceName || 'Tax Invoice'}
                  className="max-h-[60vh] object-contain"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Preview Support Panel Recharge Screenshot Modal */}
      <Modal
        open={Boolean(viewSupportProofReq)}
        onClose={() => setViewSupportProofReq(null)}
        title={`Support Panel Recharge Screenshot — @${viewSupportProofReq?.username || ''}`}
        subtitle={`Recharged by Support (${viewSupportProofReq?.supportConfirmedBy || 'Support Team'}) • Status: RECHARGE DONE`}
        maxWidth="max-w-2xl"
      >
        {viewSupportProofReq?.supportScreenshotDataUrl && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 p-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewSupportProofReq.supportScreenshotDataUrl}
                alt="Support Panel Recharge Proof"
                className="max-h-[60vh] object-contain rounded"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>{viewSupportProofReq.supportRechargeNote}</span>
              <a
                href={viewSupportProofReq.supportScreenshotDataUrl}
                download={viewSupportProofReq.supportScreenshotName || 'panel-recharge-proof.png'}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Proof
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
