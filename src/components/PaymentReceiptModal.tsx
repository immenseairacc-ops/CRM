'use client';

import React, { useState } from 'react';
import { CheckCircle2, Copy, Download, Printer, ShieldCheck, X } from 'lucide-react';
import { RechargeRequest } from '@/types/crm';
import { formatINR, getPaymentBreakdown } from './ui';

function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        ' Hundred' +
        (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '')
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        ' Thousand' +
        (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '')
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        ' Lakh' +
        (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '')
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '')
    );
  }

  return inWords(Math.floor(num)) + ' Rupees Only';
}

export function PaymentReceiptModal({
  recharge,
  onClose,
}: {
  recharge: RechargeRequest;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pb = getPaymentBreakdown(recharge);
  const receiptNo = `IA/RCP/${(recharge.billingCompletedAt || recharge.updatedAt || recharge.createdAt)
    .slice(0, 10)
    .replace(/-/g, '')}/${recharge.id.slice(-4).toUpperCase()}`;
  const receiptDate = new Date(
    recharge.paymentUpdatedAt || recharge.billingCompletedAt || recharge.createdAt
  ).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const amountReceived = pb.paid > 0 ? pb.paid : pb.total;
  const amountInWords = numberToIndianWords(amountReceived);

  const handleCopyWhatsApp = () => {
    const text = `🧾 *OFFICIAL PAYMENT RECEIPT — IMMENSE AIR PVT LTD*
══════════════════════════
*Receipt No:* ${receiptNo}
*Date:* ${receiptDate}
*Received From:* ${recharge.billingEntity || recharge.companyName}
*Contact Person:* ${recharge.clientName || 'N/A'} (${recharge.clientPhone || recharge.username})

💰 *AMOUNT DETAILS:*
*Amount Received:* ₹${amountReceived.toLocaleString('en-IN')}
*In Words:* ${amountInWords}
*Payment Status:* ${pb.status === 'PAID' ? '✅ FULLY PAID' : '⏳ PARTIALLY PAID'}
*Balance Due:* ₹${pb.balance.toLocaleString('en-IN')}

📌 *AGAINST BILL / SERVICE:*
*Invoice No:* ${recharge.billingInvoiceNumber || 'Pending'}
*Service:* ${recharge.service} (${recharge.creditCount ? recharge.creditCount.toLocaleString('en-IN') + ' Credits' : ''})
*Commercial Basis:* ${recharge.rechargeBasis === 'ON_SUBMISSION' ? 'On Submission' : 'On Delivery'}
${recharge.billingPaymentNote ? `*Payment Note:* ${recharge.billingPaymentNote}` : ''}

══════════════════════════
_Thank you for your business with Immense Air Pvt Ltd._
_Support Desk: support@immenseair.in | Accounts: billing@immenseair.in_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Control Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Official Payment Receipt
              </h2>
              <p className="text-[11px] text-slate-500">
                Receipt #{receiptNo} • Immense Air Accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-sm"
              title="Copy formatted receipt text for WhatsApp"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'WhatsApp Copy'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 bg-white" id="printable-receipt">
          {/* Company Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-5">
            <div>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/immense-logo.jpg"
                  alt="Immense Air Logo"
                  className="w-12 h-12 rounded-xl object-contain border border-slate-200"
                />
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                    IMMENSE AIR PVT LTD
                  </h1>
                  <p className="text-xs font-medium text-emerald-700 tracking-wide mt-0.5">
                    Stronger Reach. Stronger Results.
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Enterprise Cloud Communication: Bulk SMS (DLT), WhatsApp Business API, RCS, OBD Voice & IVR
              </p>
              <p className="text-[11px] text-slate-500">
                Email: billing@immenseair.in • Web: www.immenseair.in
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider bg-emerald-600 text-white">
                Money Receipt
              </span>
              <div className="text-xs font-mono font-bold text-slate-900 mt-2">
                {receiptNo}
              </div>
              <div className="text-xs text-slate-500">
                Date: <span className="font-semibold text-slate-800">{receiptDate}</span>
              </div>
            </div>
          </div>

          {/* Receipt Details Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px] block">
                  Received With Thanks From:
                </span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {recharge.billingEntity || recharge.companyName}
                </span>
                <span className="text-slate-600 block">
                  Contact: {recharge.clientName || 'Authorized Executive'} {recharge.clientPhone ? `(${recharge.clientPhone})` : ''}
                </span>
                <span className="text-slate-500 font-mono text-[11px] block">
                  Username: @{recharge.username}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px] block">
                  Against Tax Invoice / Service:
                </span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">
                  {recharge.billingInvoiceNumber ? `Invoice #${recharge.billingInvoiceNumber}` : 'Tax Invoice (Pending)'}
                </span>
                <span className="text-slate-600 block">
                  Service: {recharge.service} {recharge.creditCount ? `(${recharge.creditCount.toLocaleString('en-IN')} Credits)` : ''}
                </span>
                <span className="text-indigo-700 font-semibold text-[11px] block">
                  Route: {recharge.rechargeBasis === 'ON_SUBMISSION' ? '📤 On Submission Route' : '🚚 On Delivery Route'}
                </span>
              </div>
            </div>

            {/* Amount Box */}
            <div className="border-t border-slate-200 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Amount Received (In Words):
                </span>
                <span className="text-xs font-bold text-slate-800 italic">
                  {amountInWords}
                </span>
              </div>

              <div className="bg-white border-2 border-emerald-500 rounded-2xl px-5 py-2.5 text-right shrink-0">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Amount Received
                </span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {formatINR(amountReceived)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Ledger Status */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Bill Value
              </span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                {formatINR(pb.total)}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Payment Received
              </span>
              <span className="text-sm font-extrabold text-emerald-700 mt-0.5 block">
                {formatINR(amountReceived)}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${
              pb.balance > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                Balance Due
              </span>
              <span className="text-sm font-bold mt-0.5 block">
                {formatINR(pb.balance)}
              </span>
            </div>
          </div>

          {recharge.billingPaymentNote && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
              <span className="font-bold text-slate-700">Accounts Note / Ref: </span>
              {recharge.billingPaymentNote}
            </div>
          )}

          {/* Verification Seal & Signatures */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-emerald-600/80 flex flex-col items-center justify-center text-center p-1 bg-emerald-50/50">
                <span className="text-[8px] font-black uppercase text-emerald-800 leading-none">
                  IMMENSE AIR
                </span>
                <span className="text-[7px] font-bold text-emerald-600 leading-none mt-0.5">
                  VERIFIED
                </span>
                <span className="text-[7px] text-slate-500 leading-none mt-0.5">
                  ACCOUNTS
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                <div className="font-semibold text-slate-700">Digitally Verified Voucher</div>
                <div>Issued by Immense Air Accounts Dept.</div>
              </div>
            </div>

            <div className="text-right">
              <div className="h-10"></div>
              <div className="text-xs font-bold text-slate-900 border-t border-slate-300 pt-1 px-4">
                Authorized Signatory
              </div>
              <div className="text-[10px] text-slate-400">Immense Air Pvt Ltd</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
