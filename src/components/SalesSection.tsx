'use client';

import React, { useMemo, useState } from 'react';
import {
  AlarmClock,
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Mail,
  Phone,
  Search,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { CrmDatabase, PaymentStatus, RechargeRequest, User } from '@/types/crm';
import { formatDateTime, formatINR, Modal, StatusBadge } from './ui';

type DateRangeFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

interface PerformanceRow {
  user: User;
  leadsCount: number;
  onboardedCount: number;
  billsCount: number;
  totalSales: number;
  totalReceived: number;
  totalOutstanding: number;
  leadFollowUpsCount: number;
  paymentFollowUpsCount: number;
  bills: RechargeRequest[];
}

interface ClientPerformanceRow {
  username: string;
  companyName: string;
  billingEntity: string;
  clientPhone?: string;
  clientEmail?: string;
  agentName: string;
  accountManagerName: string;
  billsCount: number;
  totalSales: number;
  totalReceived: number;
  totalOutstanding: number;
  paymentFollowUpsCount: number;
  nextCallbackDate?: string;
  bills: RechargeRequest[];
}

export function SalesSection({
  db,
  currentUser,
}: {
  db: CrmDatabase;
  currentUser: User;
}) {
  const isAgent = currentUser.role === 'AGENT';
  const [viewMode, setViewMode] = useState<'CLIENT' | 'AGENT' | 'AM'>(
    currentUser.role === 'ADMIN' ? 'AGENT' : 'CLIENT'
  );
  const [dateRange, setDateRange] = useState<DateRangeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [drilldownRow, setDrilldownRow] = useState<PerformanceRow | null>(null);
  const [drilldownClient, setDrilldownClient] = useState<ClientPerformanceRow | null>(null);

  const isWithinDateRange = (isoDate?: string) => {
    if (dateRange === 'ALL' || !isoDate) return true;
    const t = new Date(isoDate).getTime();
    if (Number.isNaN(t)) return true;
    const now = new Date();
    if (dateRange === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return t >= start;
    }
    if (dateRange === 'WEEK') {
      return t >= Date.now() - 7 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === 'MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return t >= start;
    }
    return true;
  };

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

  // All valid billed / completed sales (excluding DEMO)
  const validSalesBills = useMemo(
    () =>
      db.rechargeRequests.filter(
        (r) =>
          r.paymentMode !== 'DEMO' &&
          (r.status === 'BILLED' || Boolean(r.billingInvoiceNumber) || r.status === 'RECHARGE_COMPLETED') &&
          isWithinDateRange(r.billingCompletedAt || r.createdAt)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db.rechargeRequests, dateRange]
  );

  // Map username -> onboardingRequest for quick AM fallback lookup
  const onboardByUsername = useMemo(() => {
    const map = new Map<string, (typeof db.onboardingRequests)[number]>();
    db.onboardingRequests.forEach((o) => {
      if (o.username) map.set(o.username.toLowerCase(), o);
    });
    return map;
  }, [db.onboardingRequests]);

  const agents = useMemo(() => db.users.filter((u) => u.role === 'AGENT'), [db.users]);
  const managers = useMemo(() => db.users.filter((u) => u.role === 'ACCOUNT_MANAGER'), [db.users]);

  const buildRows = (mode: 'AGENT' | 'AM'): PerformanceRow[] => {
    const targetUsers = mode === 'AGENT' ? agents : managers;
    const defaultAmName = managers[0]?.name || 'Neha Kapoor';

    return targetUsers
      .map((u) => {
        const userLeads = db.leads.filter((l) => {
          if (!isWithinDateRange(l.createdAt)) return false;
          if (mode === 'AGENT') return l.assignedToAgentId === u.id;
          return u.name === defaultAmName;
        });

        const userOnboarded = db.onboardingRequests.filter((o) => {
          if (!isWithinDateRange(o.createdAt)) return false;
          if (mode === 'AGENT') return o.agentId === u.id;
          const amName = o.accountManagerName || o.approvedBy || defaultAmName;
          return amName.toLowerCase() === u.name.toLowerCase();
        });

        const userBills = validSalesBills.filter((r) => {
          if (mode === 'AGENT') return r.agentId === u.id;
          const ob = onboardByUsername.get((r.username || '').toLowerCase());
          const amName = r.accountManagerName || ob?.accountManagerName || defaultAmName;
          return amName.toLowerCase() === u.name.toLowerCase();
        });

        let totalSales = 0;
        let totalReceived = 0;
        let totalOutstanding = 0;
        let paymentFollowUpsCount = 0;

        userBills.forEach((b) => {
          const { total, paid, balance } = getPaymentBreakdown(b);
          totalSales += total;
          totalReceived += paid;
          totalOutstanding += balance;
          if (balance > 0) paymentFollowUpsCount += 1;
        });

        const leadFollowUpsCount = db.leads.filter((l) => {
          const belongsToUser =
            mode === 'AGENT'
              ? l.assignedToAgentId === u.id
              : u.name === defaultAmName;
          if (!belongsToUser) return false;
          return Boolean(l.reminder && !l.reminder.completed);
        }).length;

        return {
          user: u,
          leadsCount: userLeads.length,
          onboardedCount: userOnboarded.length,
          billsCount: userBills.length,
          totalSales,
          totalReceived,
          totalOutstanding,
          leadFollowUpsCount,
          paymentFollowUpsCount,
          bills: userBills,
        };
      })
      .filter((row) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          row.user.name.toLowerCase().includes(q) ||
          row.user.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalSales - a.totalSales);
  };

  const rows = useMemo(
    () => (viewMode === 'CLIENT' ? [] : buildRows(viewMode)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewMode, db, validSalesBills, search, dateRange]
  );

  // Client-Wise Sales & Outstanding Breakdown (for Agent, Account Manager & Admin)
  const clientRows: ClientPerformanceRow[] = useMemo(() => {
    const map = new Map<string, ClientPerformanceRow>();
    const defaultAmName = managers[0]?.name || 'Neha Kapoor';

    // Seed with onboarded clients so even clients with 0 bills show up cleanly
    db.onboardingRequests.forEach((ob) => {
      const key = (ob.username || ob.companyName).toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          username: ob.username,
          companyName: ob.companyName,
          billingEntity: ob.billingEntity || ob.companyName,
          clientPhone: ob.clientPhone,
          clientEmail: ob.clientEmail,
          agentName: ob.agentName,
          accountManagerName: ob.accountManagerName || ob.approvedBy || defaultAmName,
          billsCount: 0,
          totalSales: 0,
          totalReceived: 0,
          totalOutstanding: 0,
          paymentFollowUpsCount: 0,
          bills: [],
        });
      }
    });

    validSalesBills.forEach((b) => {
      const key = (b.username || b.companyName).toLowerCase();
      const ob = onboardByUsername.get(key);
      if (!map.has(key)) {
        map.set(key, {
          username: b.username,
          companyName: b.companyName,
          billingEntity: b.billingEntity || ob?.billingEntity || b.companyName,
          clientPhone: b.clientPhone || ob?.clientPhone,
          clientEmail: b.clientEmail || ob?.clientEmail,
          agentName: b.agentName,
          accountManagerName: b.accountManagerName || ob?.accountManagerName || defaultAmName,
          billsCount: 0,
          totalSales: 0,
          totalReceived: 0,
          totalOutstanding: 0,
          paymentFollowUpsCount: 0,
          bills: [],
        });
      }
      const entry = map.get(key)!;
      const { total, paid, balance } = getPaymentBreakdown(b);
      entry.billsCount += 1;
      entry.totalSales += total;
      entry.totalReceived += paid;
      entry.totalOutstanding += balance;
      if (balance > 0) entry.paymentFollowUpsCount += 1;
      if (b.paymentCallbackReminder && !b.paymentCallbackReminder.completed) {
        if (
          !entry.nextCallbackDate ||
          new Date(b.paymentCallbackReminder.datetime).getTime() <
            new Date(entry.nextCallbackDate).getTime()
        ) {
          entry.nextCallbackDate = b.paymentCallbackReminder.datetime;
        }
      }
      if (!entry.clientPhone && b.clientPhone) entry.clientPhone = b.clientPhone;
      if (!entry.clientEmail && b.clientEmail) entry.clientEmail = b.clientEmail;
      entry.bills.push(b);
    });

    return Array.from(map.values())
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase().trim();
        return (
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.billingEntity || '').toLowerCase().includes(q) ||
          (c.username || '').toLowerCase().includes(q) ||
          (c.clientPhone || '').toLowerCase().includes(q) ||
          (c.agentName || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (b.totalOutstanding !== a.totalOutstanding) {
          return b.totalOutstanding - a.totalOutstanding;
        }
        return b.totalSales - a.totalSales;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.onboardingRequests, validSalesBills, search, managers, onboardByUsername]);

  // Overall Summary KPIs across all validSalesBills
  const totals = useMemo(() => {
    let sales = 0;
    let received = 0;
    let outstanding = 0;
    let paymentFollowUps = 0;

    validSalesBills.forEach((b) => {
      const { total, paid, balance } = getPaymentBreakdown(b);
      sales += total;
      received += paid;
      outstanding += balance;
      if (balance > 0) paymentFollowUps += 1;
    });

    const leadFollowUps = db.leads.filter(
      (l) => Boolean(l.reminder && !l.reminder.completed)
    ).length;

    const collectionPct = sales > 0 ? Math.round((received / sales) * 100) : 100;

    return {
      sales,
      received,
      outstanding,
      paymentFollowUps,
      leadFollowUps,
      collectionPct,
      onboarded: db.onboardingRequests.length,
    };
  }, [validSalesBills, db.leads, db.onboardingRequests.length]);

  const exportCsv = () => {
    const header =
      viewMode === 'CLIENT'
        ? [
            'Client / Billing Entity',
            'Username',
            'Phone',
            'Email',
            'Agent',
            'Account Manager',
            'Total Bills',
            'Total Sales (INR)',
            'Payment Received (INR)',
            'Outstanding Balance (INR)',
            'Pending Bills',
          ]
        : [
            viewMode === 'AGENT' ? 'Sales Agent' : 'Account Manager',
            'Leads',
            'Onboarded Clients',
            'Total Bills',
            'Total Sales (INR)',
            'Payment Received (INR)',
            'Outstanding Balance (INR)',
            'Lead Follow-Ups',
            'Payment Follow-Ups',
          ];

    const lines =
      viewMode === 'CLIENT'
        ? clientRows.map((c) => [
            `"${c.billingEntity}"`,
            `"@${c.username}"`,
            `"${c.clientPhone || ''}"`,
            `"${c.clientEmail || ''}"`,
            `"${c.agentName}"`,
            `"${c.accountManagerName}"`,
            c.billsCount,
            c.totalSales,
            c.totalReceived,
            c.totalOutstanding,
            c.paymentFollowUpsCount,
          ])
        : rows.map((r) => [
            `"${r.user.name}"`,
            r.leadsCount,
            r.onboardedCount,
            r.billsCount,
            r.totalSales,
            r.totalReceived,
            r.totalOutstanding,
            r.leadFollowUpsCount,
            r.paymentFollowUpsCount,
          ]);

    const csv = [header.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-tracker-${viewMode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Sales, Collection &amp; Follow-Up Tracker
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { id: 'ALL', label: 'All Time' },
                  { id: 'MONTH', label: 'This Month' },
                  { id: 'WEEK', label: 'Last 7 Days' },
                  { id: 'TODAY', label: 'Today' },
                ] as { id: DateRangeFilter; label: string }[]
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateRange(d.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    dateRange === d.id
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* View Mode Switcher: Client-Wise / Agent-Wise / Account Manager-Wise */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('CLIENT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                viewMode === 'CLIENT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {isAgent ? 'My Client-Wise Sales & Outstanding' : 'Client-Wise Sales & Outstanding'} ({clientRows.length})
            </button>

            {!isAgent && (
              <>
                <button
                  type="button"
                  onClick={() => setViewMode('AGENT')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    viewMode === 'AGENT'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Agent-Wise Sales ({agents.length})
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('AM')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    viewMode === 'AM'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Account Manager-Wise Sales ({managers.length})
                </button>
              </>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                viewMode === 'CLIENT'
                  ? 'Search client, @user, phone...'
                  : `Search ${viewMode === 'AGENT' ? 'agent' : 'account manager'}...`
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* 5 Clean KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Sales (Billed)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1.5">
            {formatINR(totals.sales)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {validSalesBills.length} Tally Bills
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Payment Received</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-800 mt-1.5">
            {formatINR(totals.received)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            {totals.collectionPct}% Collection Rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700">
            <span>Total Outstanding</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-800 mt-1.5">
            {formatINR(totals.outstanding)}
          </div>
          <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
            {totals.paymentFollowUps} Bills in Payment Follow-Up
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Active Follow-Ups</span>
            <AlarmClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-1.5">
            {totals.leadFollowUps + totals.paymentFollowUps}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5">
            {totals.leadFollowUps} Lead • {totals.paymentFollowUps} Payment
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Onboarded Clients</span>
            <Building2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1.5">
            {totals.onboarded}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Active Production Accounts
          </div>
        </div>
      </div>

      {/* CLIENT-WISE SALES & OUTSTANDING TABLE */}
      {viewMode === 'CLIENT' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              {isAgent
                ? `My Client-Wise Sales, Collection & Outstanding (${clientRows.length})`
                : `Client-Wise Sales, Collection & Outstanding (${clientRows.length})`}
            </h3>
            <span className="text-[11px] text-slate-500">
              Sorted by Highest Outstanding first
            </span>
          </div>

          {clientRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No clients found for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Client &amp; @Username</th>
                    <th className="py-3 px-4">Contact (Phone &amp; Email)</th>
                    <th className="py-3 px-4">Total Sales (Billed)</th>
                    <th className="py-3 px-4">Received</th>
                    <th className="py-3 px-4">Outstanding</th>
                    <th className="py-3 px-4">Payment Follow-Up</th>
                    <th className="py-3 px-4 text-right">Bills</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientRows.map((c) => {
                    const pct =
                      c.totalSales > 0
                        ? Math.min(100, Math.round((c.totalReceived / c.totalSales) * 100))
                        : 100;

                    return (
                      <tr key={c.username} className="hover:bg-slate-50/70 align-middle">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{c.billingEntity}</div>
                          <div className="text-xs font-mono font-bold text-indigo-700">
                            @{c.username}
                          </div>
                          {!isAgent && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Agent: {c.agentName} • AM: {c.accountManagerName}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <div className="space-y-0.5">
                            {c.clientPhone && (
                              <a
                                href={`tel:${c.clientPhone}`}
                                className="flex items-center gap-1 font-mono font-bold text-indigo-700 hover:underline"
                              >
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {c.clientPhone}
                              </a>
                            )}
                            {c.clientEmail && (
                              <a
                                href={`mailto:${c.clientEmail}`}
                                className="flex items-center gap-1 text-slate-600 hover:underline"
                              >
                                <Mail className="w-3 h-3 text-sky-600" />
                                {c.clientEmail}
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900 text-sm">
                            {formatINR(c.totalSales)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.billsCount} Tally Bills
                          </div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-black text-emerald-700">
                              {formatINR(c.totalReceived)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                              c.totalOutstanding > 0
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {formatINR(c.totalOutstanding)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {c.paymentFollowUpsCount > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                                💳 {c.paymentFollowUpsCount} Bill Pending
                              </span>
                              {c.nextCallbackDate && (
                                <div className="text-[10px] font-bold text-amber-800">
                                  ⏰ Call: {formatDateTime(c.nextCallbackDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                              ✅ All Clear
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDrilldownClient(c)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Bills
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
      /* Agent-Wise / Account Manager-Wise Performance Table */
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-600" />
            {viewMode === 'AGENT'
              ? `Agent-Wise Sales, Collection & Follow-Up Report (${rows.length})`
              : `Account Manager-Wise Sales, Collection & Follow-Up Report (${rows.length})`}
          </h3>
          <span className="text-[11px] text-slate-500">
            Click &ldquo;View Breakdown&rdquo; for client-wise bills
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No matching {viewMode === 'AGENT' ? 'agents' : 'account managers'} found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">
                    {viewMode === 'AGENT' ? 'Sales Agent' : 'Account Manager'}
                  </th>
                  <th className="py-3 px-4">Leads &amp; Clients</th>
                  <th className="py-3 px-4">Total Sales (Billed)</th>
                  <th className="py-3 px-4">Payment Received</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4">Follow-Ups (Lead + Payment)</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const pct =
                    row.totalSales > 0
                      ? Math.min(100, Math.round((row.totalReceived / row.totalSales) * 100))
                      : 100;

                  return (
                    <tr key={row.user.id} className="hover:bg-slate-50/70 align-middle">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{row.user.name}</div>
                        <div className="text-[11px] text-slate-500">{row.user.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-800">
                          {row.leadsCount} Leads
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          {row.onboardedCount} Onboarded
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm">
                          {formatINR(row.totalSales)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.billsCount} Tally Bills
                        </div>
                      </td>

                      <td className="py-3.5 px-4 min-w-[170px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-black text-emerald-700">
                            {formatINR(row.totalReceived)}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                            row.totalOutstanding > 0
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {formatINR(row.totalOutstanding)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                            📞 {row.leadFollowUpsCount} Lead
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                              row.paymentFollowUpsCount > 0
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            💳 {row.paymentFollowUpsCount} Payment
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDrilldownRow(row)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Breakdown
                        </button>
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

      {/* Client-Wise Breakdown Drill-Down Modal */}
      <Modal
        open={Boolean(drilldownRow)}
        onClose={() => setDrilldownRow(null)}
        title={`Sales Breakdown: ${drilldownRow?.user.name || ''}`}
        subtitle={`Total Sales: ${formatINR(drilldownRow?.totalSales)} • Received: ${formatINR(drilldownRow?.totalReceived)} • Outstanding: ${formatINR(drilldownRow?.totalOutstanding)}`}
        maxWidth="max-w-3xl"
      >
        {drilldownRow && (
          <div className="space-y-4">
            {drilldownRow.bills.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No Tally bills recorded for this {viewMode === 'AGENT' ? 'agent' : 'account manager'} in the selected period.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Bill # &amp; Date</th>
                      <th className="py-2.5 px-3">Client &amp; Contact</th>
                      <th className="py-2.5 px-3">Total Bill</th>
                      <th className="py-2.5 px-3">Received / Due</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldownRow.bills.map((b) => {
                      const { total, paid, balance, status } = getPaymentBreakdown(b);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-slate-900">
                              {b.billingInvoiceNumber || 'Pending #'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatDateTime(b.billingCompletedAt || b.createdAt)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {b.billingEntity || b.companyName} (@{b.username})
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                              {b.clientPhone && (
                                <span className="inline-flex items-center gap-0.5 font-mono">
                                  <Phone className="w-2.5 h-2.5 text-emerald-600" /> {b.clientPhone}
                                </span>
                              )}
                              {b.clientEmail && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Mail className="w-2.5 h-2.5 text-sky-600" /> {b.clientEmail}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {formatINR(total)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-emerald-700 font-bold">Paid: {formatINR(paid)}</div>
                            <div className={`font-black ${balance > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                              Due: {formatINR(balance)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={status} />
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
      </Modal>

      {/* Single Client Bills Breakdown Modal */}
      <Modal
        open={Boolean(drilldownClient)}
        onClose={() => setDrilldownClient(null)}
        title={`Client Bills: ${drilldownClient?.billingEntity || ''} (@${drilldownClient?.username || ''})`}
        subtitle={`Total Sales: ${formatINR(drilldownClient?.totalSales)} • Received: ${formatINR(drilldownClient?.totalReceived)} • Outstanding: ${formatINR(drilldownClient?.totalOutstanding)}`}
        maxWidth="max-w-3xl"
      >
        {drilldownClient && (
          <div className="space-y-4">
            {drilldownClient.bills.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No Tally bills recorded for this client yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Bill # &amp; Date</th>
                      <th className="py-2.5 px-3">Service &amp; Mode</th>
                      <th className="py-2.5 px-3">Total Bill</th>
                      <th className="py-2.5 px-3">Received / Due</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldownClient.bills.map((b) => {
                      const { total, paid, balance, status } = getPaymentBreakdown(b);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-slate-900">
                              {b.billingInvoiceNumber || 'Pending #'}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatDateTime(b.billingCompletedAt || b.createdAt)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{b.service}</div>
                            <div className="text-[10px] text-slate-500">{b.paymentMode || 'PREPAID'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {formatINR(total)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-emerald-700 font-bold">Paid: {formatINR(paid)}</div>
                            <div className={`font-black ${balance > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                              Due: {formatINR(balance)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={status} />
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
      </Modal>
    </div>
  );
}
