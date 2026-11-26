'use client';

import React, { useMemo, useState } from 'react';
import {
  PieChart as PieIcon,
  Calendar,
  Filter,
  Users,
  PhoneCall,
  CheckCircle2,
  TrendingUp,
  Percent,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CrmDatabase, User } from '@/types/crm';
import { formatINR } from './ui';

interface Props {
  db: CrmDatabase;
  currentUser: User;
}

type DateFilterType = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

interface Slice {
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export function AgentAnalyticsSection({ db, currentUser }: Props) {
  const isManager = currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNT_MANAGER';
  const agents = useMemo(() => db.users.filter((u) => u.role === 'AGENT'), [db.users]);

  const [selectedAgentId, setSelectedAgentId] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('WEEK');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [chartMode, setChartMode] = useState<'STATUS' | 'CALL_STATUS'>('STATUS');

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().slice(0, 10);

    return db.leads.filter((lead) => {
      // 1. Agent Filter
      if (selectedAgentId !== 'ALL' && lead.assignedToAgentId !== selectedAgentId) {
        return false;
      }

      // 2. Date Filter (Check leadDate or createdAt or agentCallDate)
      const targetDate = (lead.agentCallDate || lead.leadDate || lead.createdAt || '').slice(0, 10);
      if (!targetDate) return true;

      if (dateFilter === 'TODAY') {
        return targetDate === todayStr;
      }
      if (dateFilter === 'WEEK') {
        return targetDate >= weekAgoStr && targetDate <= todayStr;
      }
      if (dateFilter === 'MONTH') {
        return targetDate >= monthAgoStr && targetDate <= todayStr;
      }
      if (dateFilter === 'CUSTOM') {
        if (customStart && targetDate < customStart) return false;
        if (customEnd && targetDate > customEnd) return false;
      }
      return true;
    });
  }, [db.leads, selectedAgentId, dateFilter, customStart, customEnd]);

  // Aggregate Metrics
  const totalAssigned = filteredLeads.length;

  const connectedCount = filteredLeads.filter((l) => l.callConnectStatus === 'CONNECTED').length;
  const ringingCount = filteredLeads.filter((l) => l.callConnectStatus === 'RINGING').length;
  const notConnectedCount = filteredLeads.filter(
    (l) => l.callConnectStatus === 'NOT_CONNECTED' || (!l.callConnectStatus && l.status === 'NEW')
  ).length;

  const hotCount = filteredLeads.filter((l) => l.status === 'HOT').length;
  const warmCount = filteredLeads.filter((l) => l.status === 'WARM').length;
  const onboardedCount = filteredLeads.filter((l) => l.status === 'ONBOARDED').length;
  const coldCount = filteredLeads.filter((l) => l.status === 'COLD').length;
  const newCount = filteredLeads.filter((l) => l.status === 'NEW').length;

  // Potential pipeline and realized sales
  const quotedLeads = filteredLeads.filter((l) => l.quotationSent || l.quotation);
  const totalPipelineQuoteAmount = quotedLeads.reduce(
    (sum, l) => sum + (l.quotation?.totalAmount || l.quotationAmount || 0),
    0
  );

  // Filtered Onboarding accounts & Sales
  const filteredSalesAmount = useMemo(() => {
    return db.rechargeRequests
      .filter((r) => {
        if (r.status !== 'BILLED' && r.status !== 'RECHARGE_COMPLETED') return false;
        if (selectedAgentId !== 'ALL' && r.agentId !== selectedAgentId) return false;
        const rDate = (r.supportCompletedAt || r.billingCompletedAt || r.createdAt || '').slice(0, 10);
        if (dateFilter === 'TODAY' && rDate !== new Date().toISOString().slice(0, 10)) return false;
        if (dateFilter === 'CUSTOM') {
          if (customStart && rDate < customStart) return false;
          if (customEnd && rDate > customEnd) return false;
        }
        return true;
      })
      .reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [db.rechargeRequests, selectedAgentId, dateFilter, customStart, customEnd]);

  // Pie Slices computation
  const statusSlices: Slice[] = useMemo(() => {
    const raw = [
      { label: 'Onboarded (Won)', count: onboardedCount, color: '#10b981' }, // Emerald
      { label: 'Hot (Ready to Close)', count: hotCount, color: '#f97316' }, // Orange
      { label: 'Warm (Follow-up)', count: warmCount, color: '#8b5cf6' }, // Violet
      { label: 'New / Fresh', count: newCount, color: '#38bdf8' }, // Sky
      { label: 'Cold / Not Int.', count: coldCount, color: '#94a3b8' }, // Slate
    ];
    const total = raw.reduce((s, r) => s + r.count, 0) || 1;
    return raw.map((r) => ({
      ...r,
      percentage: Math.round((r.count / total) * 100),
    }));
  }, [onboardedCount, hotCount, warmCount, newCount, coldCount]);

  const callSlices: Slice[] = useMemo(() => {
    const raw = [
      { label: 'Connected Calls', count: connectedCount, color: '#10b981' },
      { label: 'Ringing (Retry)', count: ringingCount, color: '#f59e0b' },
      { label: 'Not Connected / Unreachable', count: notConnectedCount, color: '#f43f5e' },
    ];
    const total = raw.reduce((s, r) => s + r.count, 0) || 1;
    return raw.map((r) => ({
      ...r,
      percentage: Math.round((r.count / total) * 100),
    }));
  }, [connectedCount, ringingCount, notConnectedCount]);

  const activeSlices = chartMode === 'STATUS' ? statusSlices : callSlices;

  // SVG Pie Generator (Clean SVG, Zero external heavy library dependency)
  const piePaths = useMemo(() => {
    const total = activeSlices.reduce((s, sl) => s + sl.count, 0);
    if (total === 0) return [];

    let cumulativeAngle = 0;
    const radius = 90;
    const cx = 110;
    const cy = 110;

    return activeSlices.map((slice) => {
      if (slice.count === 0) return null;
      const angle = (slice.count / total) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle += angle;

      // Handle 100% full circle
      if (angle >= 359.9) {
        return {
          ...slice,
          path: `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.001} ${cy - radius} Z`,
        };
      }

      const x1 = cx + radius * Math.cos((Math.PI * (startAngle - 90)) / 180);
      const y1 = cy + radius * Math.sin((Math.PI * (startAngle - 90)) / 180);
      const x2 = cx + radius * Math.cos((Math.PI * (endAngle - 90)) / 180);
      const y2 = cy + radius * Math.sin((Math.PI * (endAngle - 90)) / 180);
      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      return {
        ...slice,
        path: pathData,
      };
    });
  }, [activeSlices]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <PieIcon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Agent Performance & Lead Review Analytics
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Track assigned leads, call connectivity, conversion ratio & closed sales
              </p>
            </div>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Agent Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Agents ({agents.length})</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
            {(
              [
                { id: 'ALL', label: 'All Time' },
                { id: 'TODAY', label: 'Today' },
                { id: 'WEEK', label: 'This Week' },
                { id: 'MONTH', label: 'This Month' },
                { id: 'CUSTOM', label: 'Custom' },
              ] as const
            ).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setDateFilter(b.id)}
                className={`px-3 py-1 rounded-lg transition ${
                  dateFilter === b.id
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Scorecard Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100">
          <div className="text-[11px] font-bold text-sky-800 flex items-center justify-between">
            <span>Total Assigned Leads</span>
            <Users className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-950 mt-1">{totalAssigned}</div>
          <div className="text-[11px] text-sky-700 mt-0.5">
            {connectedCount} connected ({totalAssigned > 0 ? Math.round((connectedCount / totalAssigned) * 100) : 0}%)
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
          <div className="text-[11px] font-bold text-emerald-800 flex items-center justify-between">
            <span>Clients Onboarded</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1">{onboardedCount}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            Won rate: {totalAssigned > 0 ? Math.round((onboardedCount / totalAssigned) * 100) : 0}%
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-100">
          <div className="text-[11px] font-bold text-orange-800 flex items-center justify-between">
            <span>Potential to Onboard</span>
            <Flame className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-950 mt-1">{hotCount + warmCount}</div>
          <div className="text-[11px] text-orange-700 mt-0.5 font-medium">
            {hotCount} Hot • {warmCount} Warm
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
          <div className="text-[11px] font-bold text-indigo-800 flex items-center justify-between">
            <span>Billed Sales Revenue</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-950 mt-1">{formatINR(filteredSalesAmount)}</div>
          <div className="text-[11px] text-indigo-700 mt-0.5">
            Pipeline: {formatINR(totalPipelineQuoteAmount)}
          </div>
        </div>
      </div>

      {/* Row 2: Pie Chart & Funnel Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Pie Visualizer (Left Column) */}
        <div className="lg:col-span-5 flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between w-full mb-2 px-2">
            <span className="text-xs font-bold text-slate-800">
              {chartMode === 'STATUS' ? 'Lead Disposition Distribution' : 'Call Connectivity Ratio'}
            </span>
            <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setChartMode('STATUS')}
                className={`px-2 py-0.5 rounded ${
                  chartMode === 'STATUS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Lead Status
              </button>
              <button
                type="button"
                onClick={() => setChartMode('CALL_STATUS')}
                className={`px-2 py-0.5 rounded ${
                  chartMode === 'CALL_STATUS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                Calls Ratio
              </button>
            </div>
          </div>

          {/* SVG Donut / Pie Chart */}
          <div className="relative w-[220px] h-[220px] flex items-center justify-center">
            {totalAssigned === 0 ? (
              <div className="text-center text-xs text-slate-400">No leads in selected range</div>
            ) : (
              <svg width="220" height="220" viewBox="0 0 220 220" className="rotate-[-90deg]">
                {piePaths.map((p, idx) =>
                  p ? (
                    <path
                      key={idx}
                      d={p.path}
                      fill={p.color}
                      className="hover:opacity-85 transition-opacity cursor-pointer"
                    >
                      <title>{`${p.label}: ${p.count} (${p.percentage}%)`}</title>
                    </path>
                  ) : null
                )}
                {/* Center hole for donut look */}
                <circle cx="110" cy="110" r="50" fill="#f8fafc" />
              </svg>
            )}

            {/* Center Summary Counter */}
            {totalAssigned > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 leading-none">{totalAssigned}</span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Leads
                </span>
              </div>
            )}
          </div>

          {/* Color Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-3 pt-3 border-t border-slate-200 text-xs">
            {activeSlices.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-700 font-medium truncate">{s.label}</span>
                </div>
                <span className="font-bold text-slate-900 ml-1">
                  {s.count} <span className="text-slate-400 font-normal">({s.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Review Meeting Insights */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
            <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Account Manager Review Summary
            </h4>
            <div className="space-y-1.5 text-xs text-indigo-900/90 leading-relaxed">
              <p>
                • <strong>Total Assigned:</strong> <strong>{totalAssigned}</strong> leads assigned to{' '}
                {selectedAgentId === 'ALL' ? 'sales team' : agents.find((a) => a.id === selectedAgentId)?.name || 'Agent'}.
              </p>
              <p>
                • <strong>Connectivity:</strong> <strong>{connectedCount}</strong> connected calls (
                {totalAssigned > 0 ? Math.round((connectedCount / totalAssigned) * 100) : 0}% connect rate).{' '}
                {ringingCount > 0 && <span className="text-amber-700 font-medium">({ringingCount} need retry).</span>}
              </p>
              <p>
                • <strong>Conversion Pipeline:</strong> <strong>{onboardedCount}</strong> clients onboarded. Unlocked sales{' '}
                <strong>{formatINR(filteredSalesAmount)}</strong> with an active quotation pipeline of{' '}
                <strong>{formatINR(totalPipelineQuoteAmount)}</strong>.
              </p>
              <p>
                • <strong>Immediate Revenue Scope:</strong> <strong>{hotCount} Hot leads</strong> are ready to close. Following up on them can add estimated revenue quickly.
              </p>
            </div>
          </div>

          {/* Quick Conversion Rate Progress Bar */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Conversion Funnel Progress</span>
              <span className="text-indigo-600">
                {totalAssigned > 0 ? Math.round(((onboardedCount + hotCount) / totalAssigned) * 100) : 0}% High Potential
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalAssigned > 0 ? (onboardedCount / totalAssigned) * 100 : 0}%` }}
                className="bg-emerald-500 h-full"
                title={`Onboarded: ${onboardedCount}`}
              />
              <div
                style={{ width: `${totalAssigned > 0 ? (hotCount / totalAssigned) * 100 : 0}%` }}
                className="bg-orange-500 h-full"
                title={`Hot: ${hotCount}`}
              />
              <div
                style={{ width: `${totalAssigned > 0 ? (warmCount / totalAssigned) * 100 : 0}%` }}
                className="bg-violet-500 h-full"
                title={`Warm: ${warmCount}`}
              />
              <div
                style={{ width: `${totalAssigned > 0 ? (newCount / totalAssigned) * 100 : 0}%` }}
                className="bg-sky-400 h-full"
                title={`New: ${newCount}`}
              />
              <div
                style={{ width: `${totalAssigned > 0 ? (coldCount / totalAssigned) * 100 : 0}%` }}
                className="bg-slate-300 h-full"
                title={`Cold: ${coldCount}`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 mt-2 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Onboarded: {onboardedCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Hot: {hotCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-500" /> Warm: {warmCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> New: {newCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" /> Cold: {coldCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
