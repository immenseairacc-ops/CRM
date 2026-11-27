'use client';

import React, { useMemo, useState } from 'react';
import {
  Timer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Users,
  ShieldAlert,
  Headphones,
  Receipt,
  ArrowRight,
  Filter,
  Flame,
} from 'lucide-react';
import { CrmDatabase, User } from '@/types/crm';
import { NavTab } from './OverviewSection';
import { formatINR } from './ui';

interface Props {
  db: CrmDatabase;
  currentUser: User;
  onNavigate: (tab: NavTab) => void;
}

export interface LatencyItem {
  id: string;
  category: 'AGENT_CALL' | 'CALLBACK_REMINDER' | 'SUPPORT_ONBOARDING' | 'SUPPORT_TICKET' | 'BILLING_INVOICE' | 'RECHARGE_CREDIT';
  title: string;
  subtitle: string;
  assignedToName: string;
  assignedRole: 'AGENT' | 'SUPPORT' | 'BILLING' | 'ACCOUNT_MANAGER';
  expectedDurationHours: number;
  actualElapsedMinutes: number;
  elapsedLabel: string;
  severity: 'ON_TIME' | 'WARNING' | 'CRITICAL';
  tab: NavTab;
  actionLabel: string;
}

export function AdminLatencyRadarSection({ db, currentUser, onNavigate }: Props) {
  if (currentUser.role !== 'ADMIN') return null;

  const [filterRole, setFilterRole] = useState<'ALL' | 'AGENT' | 'SUPPORT' | 'BILLING'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'DELAYED' | 'WARNING'>('DELAYED');

  const now = Date.now();

  // Compute Latency Items across all 4 departments
  const latencyItems = useMemo(() => {
    const list: LatencyItem[] = [];

    // 1. Agent Calling SLA: Leads assigned but not called (Ideal TAT: < 2 Hours)
    db.leads.forEach((l) => {
      if (l.status === 'NEW' && !l.agentCallDate && l.assignedToAgentId) {
        const assignedTime = new Date(l.createdAt).getTime();
        const elapsedMins = Math.max(0, Math.round((now - assignedTime) / 60000));
        const elapsedHours = (elapsedMins / 60).toFixed(1);

        let severity: LatencyItem['severity'] = 'ON_TIME';
        if (elapsedMins > 240) severity = 'CRITICAL'; // > 4 hours
        else if (elapsedMins > 120) severity = 'WARNING'; // > 2 hours

        if (severity !== 'ON_TIME') {
          list.push({
            id: `agent-lead-${l.id}`,
            category: 'AGENT_CALL',
            title: `Uncalled Fresh Lead: ${l.clientName} (${l.companyName})`,
            subtitle: `Lead assigned ${elapsedHours} hrs ago — no initial call logged yet.`,
            assignedToName: l.assignedToAgentName || 'Assigned Agent',
            assignedRole: 'AGENT',
            expectedDurationHours: 2,
            actualElapsedMinutes: elapsedMins,
            elapsedLabel: `${elapsedHours} hrs delay`,
            severity,
            tab: 'leads',
            actionLabel: 'View Lead',
          });
        }
      }

      // 2. Overdue Callback Reminders (Agent / Account Manager)
      if (l.reminder && !l.reminder.completed && l.reminder.datetime) {
        const dueTime = new Date(l.reminder.datetime).getTime();
        if (now > dueTime) {
          const delayMins = Math.round((now - dueTime) / 60000);
          const delayHours = (delayMins / 60).toFixed(1);

          let severity: LatencyItem['severity'] = 'WARNING';
          if (delayMins > 180) severity = 'CRITICAL'; // > 3 hrs past due

          list.push({
            id: `agent-rem-${l.id}`,
            category: 'CALLBACK_REMINDER',
            title: `Missed Follow-up Callback: ${l.companyName}`,
            subtitle: `Scheduled for ${new Date(l.reminder.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Note: "${l.reminder.note}"`,
            assignedToName: l.assignedToAgentName || 'Sales Agent',
            assignedRole: 'AGENT',
            expectedDurationHours: 0,
            actualElapsedMinutes: delayMins,
            elapsedLabel: `${delayHours} hrs overdue`,
            severity,
            tab: 'reminders',
            actionLabel: 'Call Now',
          });
        }
      }
    });

    // 3. Support Account Creation SLA (Onboarding Approved -> Creation TAT: < 45 Mins)
    db.onboardingRequests.forEach((o) => {
      if (o.status === 'APPROVED_FOR_SUPPORT') {
        const approvedTime = new Date(o.approvedAt || o.createdAt).getTime();
        const elapsedMins = Math.max(0, Math.round((now - approvedTime) / 60000));
        const elapsedHours = (elapsedMins / 60).toFixed(1);

        let severity: LatencyItem['severity'] = 'ON_TIME';
        if (elapsedMins > 120) severity = 'CRITICAL'; // > 2 hours
        else if (elapsedMins > 45) severity = 'WARNING'; // > 45 mins

        if (severity !== 'ON_TIME') {
          list.push({
            id: `sup-onb-${o.id}`,
            category: 'SUPPORT_ONBOARDING',
            title: `Account Creation Pending: @${o.username}`,
            subtitle: `Approved for support ${elapsedMins} mins ago • Services: ${o.services.join(', ')}`,
            assignedToName: 'Support Team',
            assignedRole: 'SUPPORT',
            expectedDurationHours: 0.75,
            actualElapsedMinutes: elapsedMins,
            elapsedLabel: `${elapsedHours} hrs waiting`,
            severity,
            tab: 'onboarding',
            actionLabel: 'Provision Account',
          });
        }
      }
    });

    // 4. Support Tickets SLA: Open ticket resolution (Ideal TAT: < 60 Mins)
    (db.supportTickets || []).forEach((t) => {
      if (t.status === 'OPEN' || t.status === 'IN_PROGRESS') {
        const createdTime = new Date(t.createdAt).getTime();
        const elapsedMins = Math.max(0, Math.round((now - createdTime) / 60000));
        const elapsedHours = (elapsedMins / 60).toFixed(1);

        let severity: LatencyItem['severity'] = 'ON_TIME';
        if (elapsedMins > 180) severity = 'CRITICAL'; // > 3 hours unresolved
        else if (elapsedMins > 60) severity = 'WARNING'; // > 1 hour

        if (severity !== 'ON_TIME') {
          list.push({
            id: `sup-tkt-${t.id}`,
            category: 'SUPPORT_TICKET',
            title: `Unresolved Support Ticket #${t.id}: ${t.subject}`,
            subtitle: `Client/Agent query for @${t.username} (${t.serviceCategory})`,
            assignedToName: t.targetUserName || 'Support Desk',
            assignedRole: 'SUPPORT',
            expectedDurationHours: 1,
            actualElapsedMinutes: elapsedMins,
            elapsedLabel: `${elapsedHours} hrs unresolved`,
            severity,
            tab: 'tickets',
            actionLabel: 'Open Ticket',
          });
        }
      }
    });

    // 5. Billing Team Invoice SLA: Recharge raised -> Tally Bill Upload (Ideal TAT: < 60 Mins)
    db.rechargeRequests.forEach((r) => {
      if (r.status === 'PENDING_APPROVAL' && !r.billingInvoiceNumber) {
        const reqTime = new Date(r.createdAt).getTime();
        const elapsedMins = Math.max(0, Math.round((now - reqTime) / 60000));
        const elapsedHours = (elapsedMins / 60).toFixed(1);

        let severity: LatencyItem['severity'] = 'ON_TIME';
        if (elapsedMins > 180) severity = 'CRITICAL'; // > 3 hours
        else if (elapsedMins > 60) severity = 'WARNING'; // > 1 hour

        if (severity !== 'ON_TIME') {
          list.push({
            id: `bill-inv-${r.id}`,
            category: 'BILLING_INVOICE',
            title: `Tally Bill Pending: @${r.username} (${formatINR(r.amount)})`,
            subtitle: `Raised by ${r.agentName} • Mode: ${r.paymentMode || 'POSTPAID'}`,
            assignedToName: 'Billing Team',
            assignedRole: 'BILLING',
            expectedDurationHours: 1,
            actualElapsedMinutes: elapsedMins,
            elapsedLabel: `${elapsedHours} hrs delay`,
            severity,
            tab: 'billing',
            actionLabel: 'Raise Bill',
          });
        }
      }

      // 6. Support Credit SLA: Billing approved -> Panel Top-Up (Ideal TAT: < 30 Mins)
      if (r.status === 'APPROVED_FOR_SUPPORT') {
        const approvedTime = new Date(r.approvedAt || r.createdAt).getTime();
        const elapsedMins = Math.max(0, Math.round((now - approvedTime) / 60000));
        const elapsedHours = (elapsedMins / 60).toFixed(1);

        let severity: LatencyItem['severity'] = 'ON_TIME';
        if (elapsedMins > 60) severity = 'CRITICAL'; // > 1 hour
        else if (elapsedMins > 30) severity = 'WARNING'; // > 30 mins

        if (severity !== 'ON_TIME') {
          list.push({
            id: `sup-rec-${r.id}`,
            category: 'RECHARGE_CREDIT',
            title: `Panel Top-Up Delay: @${r.username} (${formatINR(r.amount)})`,
            subtitle: `Billing verified • Waiting for Support to credit ${r.service} credits`,
            assignedToName: 'Support Team',
            assignedRole: 'SUPPORT',
            expectedDurationHours: 0.5,
            actualElapsedMinutes: elapsedMins,
            elapsedLabel: `${elapsedHours} hrs pending credit`,
            severity,
            tab: 'recharges',
            actionLabel: 'Credit Now',
          });
        }
      }
    });

    // Sort: Critical delays first, then longest elapsed time
    return list.sort((a, b) => {
      if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
      if (b.severity === 'CRITICAL' && a.severity !== 'CRITICAL') return 1;
      return b.actualElapsedMinutes - a.actualElapsedMinutes;
    });
  }, [db, now]);

  // Aggregate stats
  const criticalCount = latencyItems.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = latencyItems.filter((i) => i.severity === 'WARNING').length;
  const totalDelays = latencyItems.length;

  const agentDelays = latencyItems.filter((i) => i.assignedRole === 'AGENT').length;
  const supportDelays = latencyItems.filter((i) => i.assignedRole === 'SUPPORT').length;
  const billingDelays = latencyItems.filter((i) => i.assignedRole === 'BILLING').length;

  // Company On-Time Efficiency Score (100% minus delay penalty)
  const healthScore = Math.max(
    40,
    Math.min(100, Math.round(100 - criticalCount * 8 - warningCount * 3))
  );

  // Apply UI Filters
  const displayedItems = useMemo(() => {
    return latencyItems.filter((item) => {
      if (filterRole !== 'ALL' && item.assignedRole !== filterRole) return false;
      if (filterSeverity === 'DELAYED' && item.severity !== 'CRITICAL') return false;
      return true;
    });
  }, [latencyItems, filterRole, filterSeverity]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Top Banner: Health Meter & Speed Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              criticalCount > 0
                ? 'bg-rose-100 text-rose-700'
                : warningCount > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {criticalCount > 0 ? (
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            ) : warningCount > 0 ? (
              <Timer className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Live Operations SLA &amp; Latency Radar
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  criticalCount > 0
                    ? 'bg-rose-100 text-rose-800'
                    : warningCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {criticalCount > 0 ? `${criticalCount} Bottlenecks` : 'All On-Time'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Admin Zero-Delay Monitor: Calling SLA, Support Ticket/Creation TAT &amp; Tally Invoice Latency
            </p>
          </div>
        </div>

        {/* Speed Index Scorecard */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Company On-Time Index
            </div>
            <div className="text-xl font-black text-slate-900 leading-none mt-0.5">
              {healthScore}%
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs">
            {healthScore >= 90 ? '🟢' : healthScore >= 70 ? '🟡' : '🔴'}
          </div>
        </div>
      </div>

      {/* 4 Department Breakdown Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilterRole('ALL')}
          className={`p-3 rounded-xl border text-left transition ${
            filterRole === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">Total Operational Alerts</div>
          <div className="text-2xl font-black leading-none mt-1">{totalDelays}</div>
          <div className="text-[10px] mt-1 opacity-70">Across all teams</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterRole('AGENT')}
          className={`p-3 rounded-xl border text-left transition ${
            filterRole === 'AGENT'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">Sales Calling Delays</div>
          <div className="text-2xl font-black leading-none mt-1">{agentDelays}</div>
          <div className="text-[10px] mt-1 opacity-70">Lead uncalled &gt; 2 hrs</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterRole('SUPPORT')}
          className={`p-3 rounded-xl border text-left transition ${
            filterRole === 'SUPPORT'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/70'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">Support TAT Latency</div>
          <div className="text-2xl font-black leading-none mt-1">{supportDelays}</div>
          <div className="text-[10px] mt-1 opacity-70">Account setup &amp; Tickets</div>
        </button>

        <button
          type="button"
          onClick={() => setFilterRole('BILLING')}
          className={`p-3 rounded-xl border text-left transition ${
            filterRole === 'BILLING'
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-sky-50/70 border-sky-200 text-sky-900 hover:bg-sky-100/70'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">Billing Tally Delays</div>
          <div className="text-2xl font-black leading-none mt-1">{billingDelays}</div>
          <div className="text-[10px] mt-1 opacity-70">Tax Invoices pending &gt; 1 hr</div>
        </button>
      </div>

      {/* Latency Item List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 pt-1">
          <span>
            Real-Time Bottlenecks ({displayedItems.length}{' '}
            {filterRole !== 'ALL' ? `in ${filterRole}` : ''})
          </span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterSeverity('DELAYED')}
              className={`px-2 py-0.5 rounded-lg ${
                filterSeverity === 'DELAYED'
                  ? 'bg-rose-100 text-rose-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Critical Only ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterSeverity('ALL')}
              className={`px-2 py-0.5 rounded-lg ${
                filterSeverity === 'ALL'
                  ? 'bg-indigo-100 text-indigo-800 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Show All ({totalDelays})
            </button>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-emerald-950">
              Zero Operational Latency Detected!
            </div>
            <p className="text-xs text-emerald-700 max-w-md mx-auto">
              Every department is executing inside safe SLA limits. Calling, support provisioning and billing invoices are 100% on-time.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {displayedItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                  item.severity === 'CRITICAL'
                    ? 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
                    : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      item.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.severity === 'CRITICAL'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {item.elapsedLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                      {item.subtitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-slate-500">
                      <span>Owner: <strong className="text-slate-700">{item.assignedToName}</strong></span>
                      <span>•</span>
                      <span>Team: <strong className="text-slate-700">{item.assignedRole}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(item.tab)}
                  className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold shrink-0 shadow-2xs flex items-center gap-1 transition"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
