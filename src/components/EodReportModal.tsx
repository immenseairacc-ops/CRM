'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  Headphones,
  Printer,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { CrmDatabase, Role, User } from '@/types/crm';
import { formatINR, getPaymentBreakdown } from './ui';

function getISTDateString(d: Date = new Date()): string {
  try {
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function toISTDate(iso?: string | null): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return (iso || '').slice(0, 10);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
  } catch {
    return (iso || '').slice(0, 10);
  }
}

export function EodReportModal({
  db,
  currentUser,
  onClose,
}: {
  db: CrmDatabase;
  currentUser: User;
  onClose: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string>(getISTDateString());
  const [copied, setCopied] = useState(false);

  const todayStr = getISTDateString();
  const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getISTDateString(yesterdayDate);

  // Filter Data for Selected Date
  const allLeads = db.leads || [];
  const allRecharges = db.rechargeRequests || [];
  const allMeets = db.meetRequests || [];
  const allOnboarding = db.onboardingRequests || [];
  const allUsers = db.users || [];
  const allTickets = db.supportTickets || [];

  const agents = allUsers.filter((u) => u.role === 'AGENT');

  // Metrics for selectedDate
  const leadsAdded = allLeads.filter(
    (l) => toISTDate(l.createdAt) === selectedDate || toISTDate(l.leadDate) === selectedDate
  );

  // Calls logged on selectedDate across all leads
  const callsLogged = allLeads.reduce(
    (sum, lead) =>
      sum +
      (lead.callLogs || []).filter((cl) => toISTDate(cl.createdAt) === selectedDate).length,
    0
  );

  // Meets on selectedDate
  const meetsConducted = allMeets.filter(
    (m) =>
      m.scheduledDate === selectedDate ||
      toISTDate(m.createdAt) === selectedDate
  );
  const confirmedDemos = meetsConducted.filter((m) => m.status === 'APPROVED' || m.status === 'COMPLETED');

  // Onboardings created/approved on selectedDate
  const onboardingsToday = allOnboarding.filter(
    (o) =>
      toISTDate(o.createdAt) === selectedDate ||
      toISTDate(o.updatedAt) === selectedDate
  );
  const accountsLiveToday = onboardingsToday.filter(
    (o) => o.status === 'ACCOUNT_CREATED'
  );

  // Invoiced / Billed Recharges on selectedDate
  const rechargesToday = allRecharges.filter(
    (r) =>
      toISTDate(r.billingCompletedAt || r.updatedAt || r.createdAt) === selectedDate
  );

  const billedRechargesToday = rechargesToday.filter(
    (r) => r.status === 'BILLED' || Boolean(r.billingInvoiceNumber)
  );

  const totalInvoicedAmount = billedRechargesToday.reduce((sum, r) => sum + r.amount, 0);

  // Payment collected today
  const paymentsCollectedToday = billedRechargesToday.reduce((sum, r) => {
    const pb = getPaymentBreakdown(r);
    return sum + (pb.paid || 0);
  }, 0);

  // Outstanding on today's bills
  const totalOutstandingToday = billedRechargesToday.reduce((sum, r) => {
    const pb = getPaymentBreakdown(r);
    return sum + (pb.balance || 0);
  }, 0);

  // Route breakdown
  const onDeliveryRecharges = billedRechargesToday.filter((r) => r.rechargeBasis !== 'ON_SUBMISSION');
  const onDeliveryAmount = onDeliveryRecharges.reduce((s, r) => s + r.amount, 0);

  const onSubmissionRecharges = billedRechargesToday.filter((r) => r.rechargeBasis === 'ON_SUBMISSION');
  const onSubmissionAmount = onSubmissionRecharges.reduce((s, r) => s + r.amount, 0);

  // Tickets resolved/active
  const ticketsToday = allTickets.filter(
    (t) => toISTDate(t.createdAt) === selectedDate || toISTDate(t.updatedAt) === selectedDate
  );

  // Agent Performance Breakdown for this Date
  const agentPerformance = useMemo(() => {
    return agents.map((agent) => {
      const assigned = allLeads.filter(
        (l) =>
          l.assignedToAgentId === agent.id &&
          (toISTDate(l.createdAt) === selectedDate || toISTDate(l.leadDate) === selectedDate)
      ).length;

      const calls = allLeads.reduce(
        (sum, lead) =>
          sum +
          (lead.callLogs || []).filter(
            (cl) => cl.createdBy === agent.name && toISTDate(cl.createdAt) === selectedDate
          ).length,
        0
      );

      const meets = allMeets.filter(
        (m) =>
          (m.agentId === agent.id || m.agentName === agent.name) &&
          (m.scheduledDate === selectedDate || toISTDate(m.createdAt) === selectedDate)
      ).length;

      const onb = allOnboarding.filter(
        (o) =>
          o.agentId === agent.id &&
          (toISTDate(o.createdAt) === selectedDate || toISTDate(o.updatedAt) === selectedDate) &&
          o.status === 'ACCOUNT_CREATED'
      ).length;

      const agentBilledRecs = billedRechargesToday.filter((r) => r.agentId === agent.id);
      const billedRev = agentBilledRecs.reduce((s, r) => s + r.amount, 0);
      const collected = agentBilledRecs.reduce((s, r) => {
        const pb = getPaymentBreakdown(r);
        return s + (pb.paid || 0);
      }, 0);

      return {
        agent,
        assigned,
        calls,
        meets,
        onb,
        billedRev,
        collected,
      };
    });
  }, [agents, allLeads, allMeets, allOnboarding, billedRechargesToday, selectedDate]);

  // Copy WhatsApp Formatted Report
  const handleCopyWhatsApp = () => {
    const formattedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const agentRows = agentPerformance
      .map(
        (ap) =>
          `• *${ap.agent.name}:* ${ap.calls} calls | ${ap.meets} demos | ${ap.onb} onb | Invoiced: ₹${ap.billedRev.toLocaleString('en-IN')}`
      )
      .join('\n');

    const text = `📊 *IMMENSE AIR PVT LTD — EOD BUSINESS REPORT*
📅 *Date:* ${formattedDate}
══════════════════════════════

💰 *FINANCIAL & BILLING SUMMARY:*
• *Invoices Raised Today:* ₹${totalInvoicedAmount.toLocaleString('en-IN')} (${billedRechargesToday.length} bills)
• *Payment Collected Today:* ₹${paymentsCollectedToday.toLocaleString('en-IN')}
• *Outstanding Balance Due:* ₹${totalOutstandingToday.toLocaleString('en-IN')}

🚚 *COMMERCIAL ROUTE BREAKDOWN:*
• *🚚 On Delivery (DLR Route):* ${onDeliveryRecharges.length} (₹${onDeliveryAmount.toLocaleString('en-IN')})
• *📤 On Submission (Submit Route):* ${onSubmissionRecharges.length} (₹${onSubmissionAmount.toLocaleString('en-IN')})

🚀 *OPERATIONS & LEAD CONVERSION:*
• *New Leads Received:* ${leadsAdded.length}
• *Client Calls & Touchpoints:* ${callsLogged}
• *Demos & Meetings:* ${confirmedDemos.length}
• *Live Accounts Onboarded:* ${accountsLiveToday.length}
• *Support Tickets Handled:* ${ticketsToday.length}

👥 *AGENT DAILY PERFORMANCE:*
${agentRows}

══════════════════════════════
_Generated via Immense Air CRM Suite by ${currentUser.name} (${currentUser.role})_
_Generated on ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Report Date',
      'Agent Name',
      'Assigned Leads',
      'Calls Logged',
      'Demos Conducted',
      'Onboardings Live',
      'Billed Revenue (INR)',
      'Collected Payment (INR)',
    ];

    const rows = agentPerformance.map((ap) => [
      selectedDate,
      ap.agent.name,
      ap.assigned,
      ap.calls,
      ap.meets,
      ap.onb,
      ap.billedRev,
      ap.collected,
    ]);

    // Summary totals row
    rows.push([
      'TOTAL',
      'All Agents Summary',
      leadsAdded.length,
      callsLogged,
      confirmedDemos.length,
      accountsLiveToday.length,
      totalInvoicedAmount,
      paymentsCollectedToday,
    ]);

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map((r) => r.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ImmenseAir_EOD_Report_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <TrendingUp className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">
                  End of Day (EOD) Business Report
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase">
                  Management
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Daily Revenue, Cash Inflow, Leads &amp; Operations Reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm"
              title="Copy formatted EOD report for WhatsApp leadership group"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied for WhatsApp!' : 'Copy for WhatsApp'}
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Export EOD summary as CSV/Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Excel / CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-100/80 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Select Report Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedDate === todayStr
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⚡ Today
            </button>
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedDate === yesterdayStr
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Yesterday
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto" id="printable-eod">
          {/* Company Mini Brand Header in Print */}
          <div className="hidden print:flex items-center justify-between border-b pb-4 mb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900">IMMENSE AIR PVT LTD</h1>
              <p className="text-xs text-slate-500">Daily Operations &amp; Accounts Reconciliation Report</p>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold">Report Date: {selectedDate}</div>
              <div className="text-slate-400">Generated on: {new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Section 1: Financial & Revenue High-Level KPIs */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              1. Financial &amp; Billing Reconciliation ({selectedDate})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-sky-50 border border-sky-200/90 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block">
                  Total Invoiced Revenue
                </span>
                <span className="text-2xl font-black text-sky-950 block mt-1">
                  {formatINR(totalInvoicedAmount)}
                </span>
                <span className="text-[11px] text-sky-600 mt-1 block">
                  {billedRechargesToday.length} Tax Invoices Raised Today
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Payment Collected Today
                </span>
                <span className="text-2xl font-black text-emerald-950 block mt-1">
                  {formatINR(paymentsCollectedToday)}
                </span>
                <span className="text-[11px] text-emerald-600 mt-1 block">
                  Actual Bank / UPI Credits Realized
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                  Outstanding Dues Generated
                </span>
                <span className="text-2xl font-black text-amber-950 block mt-1">
                  {formatINR(totalOutstandingToday)}
                </span>
                <span className="text-[11px] text-amber-600 mt-1 block">
                  Pending client collections from today
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Commercial Recharge Route Breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Commercial Basis Route Split:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    🚚 ON DELIVERY ROUTE (DLR Refund)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {onDeliveryRecharges.length} recharge orders
                  </span>
                </div>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatINR(onDeliveryAmount)}
                </span>
              </div>

              <div className="bg-white border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    📤 ON SUBMISSION ROUTE (Submit Deduct)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {onSubmissionRecharges.length} recharge orders
                  </span>
                </div>
                <span className="text-sm font-extrabold text-indigo-700">
                  {formatINR(onSubmissionAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Operations & Sales Pipeline Movement */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              2. Sales &amp; Operations Pipeline Movement ({selectedDate})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  New Leads
                </span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">
                  {leadsAdded.length}
                </span>
                <span className="text-[10px] text-slate-500">Received today</span>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Client Calls
                </span>
                <span className="text-xl font-black text-indigo-700 mt-0.5 block">
                  {callsLogged}
                </span>
                <span className="text-[10px] text-slate-500">Logged interactions</span>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Demos / Meets
                </span>
                <span className="text-xl font-black text-amber-700 mt-0.5 block">
                  {confirmedDemos.length}
                </span>
                <span className="text-[10px] text-slate-500">Client presentations</span>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Onboardings
                </span>
                <span className="text-xl font-black text-teal-700 mt-0.5 block">
                  {accountsLiveToday.length}
                </span>
                <span className="text-[10px] text-slate-500">Accounts created</span>
              </div>

              <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Support Tickets
                </span>
                <span className="text-xl font-black text-rose-700 mt-0.5 block">
                  {ticketsToday.length}
                </span>
                <span className="text-[10px] text-slate-500">Handled / active</span>
              </div>
            </div>
          </div>

          {/* Section 4: Agent Contribution Breakdown */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-violet-600" />
              3. Sales Agent Daily Activity &amp; Billing Contribution
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Sales Agent</th>
                    <th className="py-2.5 px-3">Calls Done</th>
                    <th className="py-2.5 px-3">Leads Assigned</th>
                    <th className="py-2.5 px-3">Demos Conducted</th>
                    <th className="py-2.5 px-3">Onboarded</th>
                    <th className="py-2.5 px-3">Invoiced Revenue</th>
                    <th className="py-2.5 pl-3 pr-4">Collected Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentPerformance.map((ap) => (
                    <tr key={ap.agent.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                            {ap.agent.avatar}
                          </span>
                          <span className="font-semibold text-slate-900">{ap.agent.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-indigo-700">{ap.calls}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700">{ap.assigned}</td>
                      <td className="py-3 px-3 text-slate-700">{ap.meets}</td>
                      <td className="py-3 px-3 text-slate-700">{ap.onb}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatINR(ap.billedRev)}
                      </td>
                      <td className="py-3 pl-3 pr-4 font-bold text-emerald-700">
                        {formatINR(ap.collected)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>
            IMMENSE AIR PVT LTD • Accounts &amp; Operations Suite
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
