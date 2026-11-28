'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Headphones,
  Layers,
  ListChecks,
  Mail,
  MailOpen,
  Plus,
  TrendingUp,
} from 'lucide-react';
import errorsData from '@/data/errors.json';
import { CrmDatabase, Role, User } from '@/types/crm';
import { formatINR, getPaymentBreakdown, ROLE_META, StatusBadge } from './ui';
import { AgentAnalyticsSection } from './AgentAnalyticsSection';
import { AdminLatencyRadarSection } from './AdminLatencyRadarSection';
import { EodReportModal } from './EodReportModal';

export type NavTab =
  | 'overview'
  | 'sales'
  | 'teams'
  | 'errors'
  | 'leads'
  | 'chat'
  | 'inbox'
  | 'reminders'
  | 'meets'
  | 'onboarding'
  | 'recharges'
  | 'tickets'
  | 'billing'
  | 'quotations';

function formatShortDateTime(iso?: string | null): string {
  if (!iso) return 'Not scheduled';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}


function isMeetTimePassed(scheduledDate?: string, scheduledTime?: string): boolean {
  if (!scheduledDate || !scheduledTime) return false;
  try {
    const meetDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const now = new Date();
    return now.getTime() >= meetDateTime.getTime();
  } catch {
    return false;
  }
}

function formatTimeOnly(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function getISTDay(d: Date = new Date()): string {
  try {
    const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function toISTDay(isoString?: string | null): string {
  if (!isoString) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) return isoString;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return (isoString || '').slice(0, 10);
    const istTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return istTime.toISOString().slice(0, 10);
  } catch {
    return (isoString || '').slice(0, 10);
  }
}

export type DashboardDateRange = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME';

function isDateInDashboardRange(dateString?: string | null, range: DashboardDateRange = 'TODAY'): boolean {
  if (!dateString) return false;
  if (range === 'ALL_TIME') return true;

  const targetDay = toISTDay(dateString);
  if (!targetDay) return false;

  const now = new Date();
  const todayDay = getISTDay(now);

  if (range === 'TODAY') {
    return targetDay === todayDay;
  }

  if (range === 'YESTERDAY') {
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    return targetDay === getISTDay(yesterday);
  }

  if (range === 'THIS_WEEK') {
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    return targetDay >= getISTDay(sevenDaysAgo) && targetDay <= todayDay;
  }

  if (range === 'THIS_MONTH') {
    return targetDay.slice(0, 7) === todayDay.slice(0, 7);
  }

  return true;
}

function PngIcon({
  src,
  alt,
  className = 'w-5 h-5',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt={alt} className={`${className} object-contain shrink-0`} />
  );
}

export function OverviewSection({
  db,
  currentUser,
  onNavigate,
  onOpenLeadUpload,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  onNavigate: (tab: NavTab) => void;
  onOpenLeadUpload: (mode: 'CSV' | 'MANUAL') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const role: Role = currentUser.role;
  const isManager = role === 'ADMIN' || role === 'ACCOUNT_MANAGER';
  const isSupport = role === 'SUPPORT';
  const isBilling = role === 'BILLING';
  const agents = db.users.filter((u) => u.role === 'AGENT');

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  // Admin filter state for Today's Schedule & Reminders
  const [adminScheduleRoleFilter, setAdminScheduleRoleFilter] = useState<
    'ALL' | 'AGENT' | 'ACCOUNT_MANAGER' | 'SUPPORT' | 'BILLING'
  >('ALL');
  const [adminScheduleUserFilter, setAdminScheduleUserFilter] = useState<string>('ALL');

  // Account Manager filter state for Today's Schedule & Reminders (My Schedule vs Team Agent Schedule)
  const [amScheduleScopeFilter, setAmScheduleScopeFilter] = useState<'ALL' | 'MY' | 'AGENT'>('ALL');
  const [amScheduleAgentFilter, setAmScheduleAgentFilter] = useState<string>('ALL');
  const [scheduleTab, setScheduleTab] = useState<'ALL' | 'FOLLOWUP' | 'MEET' | 'PENDING_45'>('ALL');

  // Main Dashboard Data Horizon Filter (Defaults to TODAY)
  const [dashboardDateRange, setDashboardDateRange] = useState<DashboardDateRange>('TODAY');
  const [showEodModal, setShowEodModal] = useState(false);

  // Segmented Dashboard Sub-Tab View Mode (Compact, Focused, Non-Messy Mobile & Desktop UX)
  type DashboardViewMode = 'SNAPSHOT' | 'TASKS' | 'RADAR' | 'ANALYTICS' | 'ALL';
  const [viewMode, setViewMode] = useState<DashboardViewMode>('SNAPSHOT');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const isCollapsed = (key: string) => Boolean(collapsedSections[key]);
  const toggleCollapse = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Filter leads based on selected Dashboard date range
  const filteredLeads = useMemo(() => {
    return db.leads.filter((l) =>
      dashboardDateRange === 'ALL_TIME'
        ? true
        : isDateInDashboardRange(l.leadDate || l.createdAt, dashboardDateRange)
    );
  }, [db.leads, dashboardDateRange]);

  const totalLeads = db.leads.length;
  const displayLeadsCount =
    dashboardDateRange === 'ALL_TIME' ? totalLeads : filteredLeads.length;

  // Pipeline counts in selected range
  const newLeads = filteredLeads.filter((l) => l.status === 'NEW').length;
  const warmLeads = filteredLeads.filter((l) => l.status === 'WARM').length;
  const hotLeads = filteredLeads.filter((l) => l.status === 'HOT').length;
  const coldLeads = filteredLeads.filter((l) => l.status === 'COLD').length;

  // Overall active hot leads
  const totalHotOverall = db.leads.filter((l) => l.status === 'HOT').length;

  // Reminders in range
  const activeReminders = db.leads.filter(
    (l) => l.reminder && !l.reminder.completed
  );
  const remindersInRange = activeReminders.filter((l) =>
    dashboardDateRange === 'ALL_TIME'
      ? true
      : isDateInDashboardRange(l.reminder?.datetime, dashboardDateRange)
  );
  const dueReminders = activeReminders.filter(
    (l) =>
      l.reminder?.datetime &&
      !isNaN(new Date(l.reminder.datetime).getTime()) &&
      new Date(l.reminder.datetime).getTime() <= Date.now()
  );

  // Meets in range
  const meetsInRange = db.meetRequests.filter((m) =>
    dashboardDateRange === 'ALL_TIME'
      ? true
      : isDateInDashboardRange(m.scheduledDate || m.createdAt, dashboardDateRange)
  );
  const meetCount =
    role === 'SUPPORT'
      ? meetsInRange.filter((m) => m.status === 'APPROVED').length
      : meetsInRange.length;
  const scheduledMeetsCount = meetsInRange.filter(
    (m) => m.status === 'PENDING_APPROVAL' || m.status === 'APPROVED'
  ).length;

  // Onboardings in range
  const onboardingsInRange = db.onboardingRequests.filter((o) =>
    dashboardDateRange === 'ALL_TIME'
      ? true
      : isDateInDashboardRange(o.createdAt || o.updatedAt, dashboardDateRange)
  );
  const onboardCount = onboardingsInRange.length;
  const onboardCreatedCount = onboardingsInRange.filter(
    (o) => o.status === 'ACCOUNT_CREATED'
  ).length;
  const totalOnboardOverall = db.onboardingRequests.filter(
    (o) => o.status === 'ACCOUNT_CREATED'
  ).length;

  // Quotations in range
  const quotationsSentCount = db.leads.filter(
    (l) =>
      l.quotationSent &&
      (dashboardDateRange === 'ALL_TIME'
        ? true
        : isDateInDashboardRange(l.quotationSentDate || l.updatedAt, dashboardDateRange))
  ).length;

  // Recharges in range
  const rechargesInRange = db.rechargeRequests.filter((r) =>
    dashboardDateRange === 'ALL_TIME'
      ? true
      : isDateInDashboardRange(r.createdAt || r.updatedAt, dashboardDateRange)
  );
  const rechargeCount = rechargesInRange.length;
  const pendingRechargeCount = rechargesInRange.filter(
    (r) => r.status === 'PENDING_APPROVAL'
  ).length;
  const supportRechargeQueue = rechargesInRange.filter(
    (r) => r.status === 'APPROVED_FOR_SUPPORT'
  ).length;
  const billingQueueCount = rechargesInRange.filter(
    (r) => r.status === 'RECHARGE_COMPLETED'
  ).length;
  const billedRevenueInRange = rechargesInRange
    .filter((r) => r.status === 'BILLED')
    .reduce((s, r) => s + r.amount, 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const supportTodayFollowUpsCount = db.leads.filter(
    (l) =>
      l.reminder &&
      !l.reminder.completed &&
      isDateInDashboardRange(l.reminder.datetime, dashboardDateRange) &&
      (l.reminder.reminderType === 'SUPPORT_CALL' ||
        l.reminder.targetRole === 'SUPPORT' ||
        l.status === 'HOT')
  ).length;
  const supportTodayMeetsCount = meetsInRange.filter(
    (m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL'
  ).length;
  const totalErrorCodesCount = (errorsData as unknown as unknown[]).length;
  const ticketsInRange = (db.supportTickets || []).filter((t) =>
    dashboardDateRange === 'ALL_TIME'
      ? true
      : isDateInDashboardRange(t.createdAt || t.updatedAt, dashboardDateRange)
  );
  const totalTicketsCount = ticketsInRange.length;
  const openTicketsCount = ticketsInRange.filter(
    (t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  ).length;

  // Row 1: KPI Cards using PNG icons (Tailored specifically for SUPPORT role)
  const kpiCards = isSupport
    ? [
        {
          label: dashboardDateRange === 'TODAY' ? "Today's Tickets" : 'Total Tickets',
          value: totalTicketsCount,
          sub: `${openTicketsCount} Open / Active`,
          subColor: 'text-orange-600',
          cardCls: 'bg-orange-50/80 border-orange-200/80',
          iconWrap: 'bg-orange-100/90',
          iconSrc: '/icons/hot.png',
          tab: 'tickets' as NavTab,
        },
        {
          label: dashboardDateRange === 'TODAY' ? 'Support Follow-ups Today' : 'Support Follow-ups',
          value: supportTodayFollowUpsCount,
          sub: 'Technical & queries due',
          subColor: supportTodayFollowUpsCount > 0 ? 'text-rose-600' : 'text-violet-600',
          cardCls: 'bg-violet-50/75 border-violet-200/80',
          iconWrap: 'bg-violet-100/90',
          iconSrc: '/icons/followup.png',
          tab: 'reminders' as NavTab,
        },
        {
          label: 'Error Codes',
          value: totalErrorCodesCount,
          sub: 'All Operators (Jio, Airtel, Vi, etc.)',
          subColor: 'text-indigo-600',
          cardCls: 'bg-indigo-50/75 border-indigo-200/80',
          iconWrap: 'bg-indigo-100/90',
          iconSrc: '/icons/pipeline.png',
          tab: 'errors' as NavTab,
        },
        {
          label: dashboardDateRange === 'TODAY' ? "Today's Meets" : 'Meetings / Demos',
          value: supportTodayMeetsCount,
          sub: 'Demos & walkthroughs',
          subColor: 'text-amber-700',
          cardCls: 'bg-amber-50/80 border-amber-200/80',
          iconWrap: 'bg-amber-100/90',
          iconSrc: '/icons/meeting.png',
          tab: 'meets' as NavTab,
        },
        {
          label: dashboardDateRange === 'TODAY' ? "Today's Top-Ups" : 'Recharge Requests',
          value: supportRechargeQueue,
          sub: `${supportRechargeQueue} ready to credit`,
          subColor: 'text-cyan-700',
          cardCls: 'bg-cyan-50/80 border-cyan-200/80',
          iconWrap: 'bg-cyan-100/90',
          iconSrc: '/icons/recharge.png',
          tab: 'recharges' as NavTab,
        },
      ]
    : [
    {
      label:
        role === 'AGENT'
          ? (dashboardDateRange === 'TODAY' ? "Today's Leads" : 'My Leads')
          : isBilling
          ? (dashboardDateRange === 'TODAY' ? "Today's Accounts" : 'Active Accounts')
          : (dashboardDateRange === 'TODAY' ? "Today's Leads" : 'Total Leads'),
      value: isBilling ? onboardCreatedCount : displayLeadsCount,
      sub: dashboardDateRange === 'TODAY'
        ? `${totalLeads} total in CRM`
        : !isBilling
        ? `${displayLeadsCount} leads in period`
        : 'Provisioned clients',
      subColor: 'text-emerald-600',
      cardCls: 'bg-sky-50/80 border-sky-200/80',
      iconWrap: 'bg-sky-100/90',
      iconSrc: '/icons/leads.png',
      tab: (isBilling ? 'onboarding' : 'leads') as NavTab,
    },
    {
      label: dashboardDateRange === 'TODAY' ? "Today's Hot Leads" : 'Hot Leads',
      value: hotLeads > 0 ? hotLeads : totalHotOverall,
      sub: hotLeads > 0 ? `${totalHotOverall} total hot leads` : 'Ready for meet / deal',
      subColor: 'text-orange-600',
      cardCls: 'bg-orange-50/75 border-orange-200/80',
      iconWrap: 'bg-orange-100/90',
      iconSrc: '/icons/hot.png',
      tab: 'leads' as NavTab,
    },
    {
      label: dashboardDateRange === 'TODAY' ? "Today's Follow-ups" : 'Follow-ups',
      value: remindersInRange.length,
      sub:
        dueReminders.length > 0
          ? `${dueReminders.length} due right now`
          : dashboardDateRange === 'TODAY'
          ? 'Callbacks scheduled today'
          : 'Callbacks scheduled',
      subColor: dueReminders.length > 0 ? 'text-rose-600' : 'text-violet-600',
      cardCls: 'bg-violet-50/75 border-violet-200/80',
      iconWrap: 'bg-violet-100/90',
      iconSrc: '/icons/followup.png',
      tab: (isBilling ? 'overview' : 'reminders') as NavTab,
    },
    {
      label: dashboardDateRange === 'TODAY' ? "Today's Meetings" : 'Meetings / Visits',
      value: meetCount,
      sub: `${scheduledMeetsCount} client demos`,
      subColor: 'text-amber-700',
      cardCls: 'bg-amber-50/80 border-amber-200/80',
      iconWrap: 'bg-amber-100/90',
      iconSrc: '/icons/meeting.png',
      tab: (isBilling ? 'billing' : 'meets') as NavTab,
    },
    {
      label: dashboardDateRange === 'TODAY' ? "Today's Onboardings" : 'Onboardings',
      value: onboardCount,
      sub: `${onboardCreatedCount} live accounts (${totalOnboardOverall} total)`,
      subColor: 'text-indigo-600',
      cardCls: 'bg-indigo-50/75 border-indigo-200/80',
      iconWrap: 'bg-indigo-100/90',
      iconSrc: '/icons/onboarding.png',
      tab: 'onboarding' as NavTab,
    },
    {
      label: isBilling
        ? (dashboardDateRange === 'TODAY' ? "Today's Billing Queue" : 'Billing Queue')
        : (dashboardDateRange === 'TODAY' ? "Today's Recharges" : 'Recharge Requests'),
      value: isBilling ? billingQueueCount : rechargeCount,
      sub: billedRevenueInRange > 0
        ? `${formatINR(billedRevenueInRange)} billed`
        : isBilling
        ? 'Ready for Tax Invoice'
        : `${pendingRechargeCount} Pending Approval`,
      subColor: 'text-amber-600',
      cardCls: 'bg-cyan-50/80 border-cyan-200/80',
      iconWrap: 'bg-cyan-100/90',
      iconSrc: '/icons/recharge.png',
      tab: (isBilling ? 'billing' : 'recharges') as NavTab,
    },
  ];

  // Pipeline bar chart data (shows period leads if present, else active pipeline)
  const pipelineDataSource = filteredLeads.length > 0 ? filteredLeads : db.leads;
  const pNew = pipelineDataSource.filter((l) => l.status === 'NEW').length;
  const pWarm = pipelineDataSource.filter((l) => l.status === 'WARM').length;
  const pHot = pipelineDataSource.filter((l) => l.status === 'HOT').length;
  const pCold = pipelineDataSource.filter((l) => l.status === 'COLD').length;

  const pipelineRows = [
    { label: 'New', count: pNew, bar: 'bg-sky-400' },
    { label: 'Warm / Contacted', count: pWarm, bar: 'bg-violet-400' },
    { label: 'Hot / Interested', count: pHot, bar: 'bg-emerald-400' },
    { label: 'Quotation Sent', count: quotationsSentCount, bar: 'bg-indigo-400' },
    { label: 'Meet Scheduled', count: scheduledMeetsCount, bar: 'bg-amber-400' },
    { label: 'Onboarded / Won', count: onboardCreatedCount, bar: 'bg-teal-400' },
    { label: 'Cold / On Hold', count: pCold, bar: 'bg-slate-400' },
  ];
  const maxPipeline = Math.max(1, ...pipelineRows.map((p) => p.count));

  // Support Tickets Breakdown & Pipeline (Tailored specifically for SUPPORT role)
  // Kitna Aaya, Kitna Resolve Hua, In Progress, Open, Urgent Escalations
  const ticketsDataSource = (db.supportTickets && db.supportTickets.length > 0)
    ? (ticketsInRange.length > 0 ? ticketsInRange : db.supportTickets)
    : [];
  const sTicketsReceived = ticketsDataSource.length;
  const sTicketsResolved = ticketsDataSource.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
  ).length;
  const sTicketsInProgress = ticketsDataSource.filter(
    (t) => t.status === 'IN_PROGRESS'
  ).length;
  const sTicketsOpen = ticketsDataSource.filter(
    (t) => t.status === 'OPEN'
  ).length;
  const sTicketsUrgent = ticketsDataSource.filter(
    (t) =>
      (t.priority === 'URGENT' || t.priority === 'HIGH') &&
      t.status !== 'RESOLVED' &&
      t.status !== 'CLOSED'
  ).length;
  const sResolutionRate = sTicketsReceived > 0
    ? Math.round((sTicketsResolved / sTicketsReceived) * 100)
    : 100;

  const supportTicketRows = [
    {
      label: 'Total Tickets Aaya (Received)',
      count: sTicketsReceived,
      bar: 'bg-indigo-500',
      dot: 'bg-indigo-500',
      badge: 'Total',
      badgeCls: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Resolve Hua (Solved & Closed)',
      count: sTicketsResolved,
      bar: 'bg-emerald-500',
      dot: 'bg-emerald-500',
      badge: sTicketsReceived > 0 ? `${sResolutionRate}%` : '0%',
      badgeCls: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'In Progress (Active Work)',
      count: sTicketsInProgress,
      bar: 'bg-blue-500',
      dot: 'bg-blue-500',
      badge: 'Working',
      badgeCls: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Open / Pending Action',
      count: sTicketsOpen,
      bar: 'bg-amber-500',
      dot: 'bg-amber-500',
      badge: 'Pending',
      badgeCls: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Urgent & High Priority',
      count: sTicketsUrgent,
      bar: 'bg-rose-500',
      dot: 'bg-rose-500',
      badge: 'Priority',
      badgeCls: 'bg-rose-50 text-rose-700',
    },
  ];
  const maxSupportTickets = Math.max(1, sTicketsReceived, ...supportTicketRows.map((r) => r.count));

  // Schedule & Reminders Timeline - Role-wise Tailored
  const scheduleItems = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const items: Array<{
      id: string;
      meetId?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      time: string;
      title: string;
      subtitle: string;
      badge?: string;
      kind: 'MEET' | 'REMINDER' | 'BILLING' | 'ONBOARDING' | 'VISIT';
      category?: 'FOLLOWUP' | 'MEET' | 'PENDING_45';
      ownerRole?: string;
      ownerName?: string;
      isMyTask?: boolean;
      tab: NavTab;
      hasJoin?: boolean;
      joinUrl?: string;
      canCompleteMeet?: boolean;
    }> = [];

    // 1. BILLING ROLE SPECIFIC SCHEDULE
    if (role === 'BILLING') {
      // Accounts Payment Callback Reminders ("Client said call me on this date")
      db.rechargeRequests
        .filter((r) => r.paymentCallbackReminder && !r.paymentCallbackReminder.completed)
        .forEach((r) => {
          const rem = r.paymentCallbackReminder!;
          items.push({
            id: `bill-paycb-${r.id}`,
            time: formatTimeOnly(rem.datetime) || 'Today',
            title: `Payment Call — ${r.billingEntity || r.companyName}`,
            subtitle: `${rem.note} • ${r.clientPhone || '@' + r.username} (Bill #${r.billingInvoiceNumber || 'Pending'})`,
            badge: rem.datetime.slice(0, 10) <= todayStr ? 'Call Due Today' : `Call ${rem.datetime.slice(0, 10)}`,
            kind: 'BILLING',
            category: 'FOLLOWUP',
            ownerRole: 'BILLING',
            tab: 'billing',
          });
        });

      // Payment follow-up reminders or Client requests to call for billing
      db.leads
        .filter((l) => l.reminder && !l.reminder.completed)
        .forEach((l) => {
          const rem = l.reminder!;
          items.push({
            id: `bill-rem-${l.id}`,
            time: formatTimeOnly(rem.datetime) || 'Today',
            title: `Payment Follow-up — ${l.companyName}`,
            subtitle: `${rem.note} (Client: ${l.clientName} • ${l.phone})`,
            badge: 'Payment Call',
            kind: 'BILLING',
            category: 'FOLLOWUP',
            ownerRole: 'BILLING',
            tab: 'billing',
          });
        });

      // Pending tax invoices to raise
      db.rechargeRequests
        .filter((r) => r.status === 'RECHARGE_COMPLETED' || r.status === 'PENDING_APPROVAL')
        .forEach((r) => {
          items.push({
            id: `bill-raise-${r.id}`,
            time: formatTimeOnly(r.updatedAt || r.createdAt) || 'Today',
            title: `Raise Tax Invoice — ${r.companyName}`,
            subtitle: `${r.service} (${formatINR(r.amount)}) • ${r.billingInvoiceNumber ? `Inv: ${r.billingInvoiceNumber}` : 'Tax Invoice Pending'}`,
            badge: 'Invoice Raise',
            kind: 'BILLING',
            category: 'FOLLOWUP',
            ownerRole: 'BILLING',
            tab: 'billing',
          });
        });

      // Billing Meetings / GMeets / UltraViewer / Teams / AnyDesk / Site Visit
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' && (m.scheduledDate === todayStr || !m.scheduledDate))
        .forEach((m) => {
          items.push({
            id: `bill-meet-${m.id}`,
            time: m.scheduledTime || 'Today',
            title: `${m.platform} — ${m.companyName}`,
            subtitle: m.agenda,
            badge: m.platform || 'Meet',
            kind: 'MEET',
            category: 'MEET',
            ownerRole: 'BILLING',
            tab: 'meets',
            hasJoin: true,
            joinUrl: m.meetLink,
          });
        });
    }

    // 2. SUPPORT ROLE SPECIFIC SCHEDULE
    else if (role === 'SUPPORT') {
      // Confirmed Demo Meets for Support today (Completed meets are automatically removed)
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          items.push({
            id: `sup-meet-${m.id}`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: `${m.platform} Demo — ${m.companyName}`,
            subtitle: `${m.agenda} (Agent: ${m.agentName})`,
            badge: m.status === 'APPROVED' ? 'Confirmed Demo' : 'Pending Review',
            kind: 'MEET',
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
            canCompleteMeet: m.status === 'APPROVED',
          });
        });

      // Onboarding account setup / credentials dispatch
      db.onboardingRequests
        .filter((o) => o.status === 'APPROVED_FOR_SUPPORT')
        .forEach((o) => {
          items.push({
            id: `sup-onb-${o.id}`,
            time: formatTimeOnly(o.createdAt) || 'Today',
            title: `Onboarding Setup — @${o.username}`,
            subtitle: `${o.companyName} (${o.services.join(', ')})`,
            badge: 'Account Setup',
            kind: 'ONBOARDING',
            tab: 'onboarding',
          });
        });

      // Support panel recharge top-ups (highlighting ON DELIVERY vs ON SUBMISSION)
      db.rechargeRequests
        .filter((r) => r.status === 'APPROVED_FOR_SUPPORT')
        .forEach((r) => {
          items.push({
            id: `sup-rec-${r.id}`,
            time: formatTimeOnly(r.updatedAt || r.createdAt) || 'Today',
            title: `Panel Top-Up — @${r.username}`,
            subtitle: `${r.service} • ${r.creditCount ? r.creditCount.toLocaleString('en-IN') + ' Credits • ' : ''}${r.rechargeBasis === 'ON_SUBMISSION' ? '📤 On Submission Route' : '🚚 On Delivery Route'}`,
            badge: r.rechargeBasis === 'ON_SUBMISSION' ? 'On Submission' : 'On Delivery',
            kind: 'BILLING',
            tab: 'recharges',
            ownerRole: 'SUPPORT',
          });
        });

      // Client Support Calls / Technical queries & Open Support Tickets
      db.leads
        .filter((l) => l.reminder && !l.reminder.completed && (l.reminder.reminderType === 'SUPPORT_CALL' || l.reminder.targetRole === 'SUPPORT' || l.status === 'HOT'))
        .forEach((l) => {
          items.push({
            id: `sup-call-${l.id}`,
            time: formatTimeOnly(l.reminder?.datetime) || 'Today',
            title: `Client Support Follow-Up — ${l.companyName}`,
            subtitle: `${l.reminder?.note || 'Technical setup walkthrough'} (${l.clientName})`,
            badge: 'Support Call',
            kind: 'REMINDER',
            category: 'FOLLOWUP',
            ownerRole: 'SUPPORT',
            tab: 'reminders',
          });
        });

      (db.supportTickets || [])
        .filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (t.targetRole === 'SUPPORT' || t.fromUserRole === 'SUPPORT'))
        .forEach((t) => {
          items.push({
            id: `sup-tkt-${t.id}`,
            time: formatTimeOnly(t.createdAt) || 'Today',
            title: `Support Ticket — @${t.username}`,
            subtitle: `${t.subject} (${t.serviceCategory})`,
            badge: t.priority,
            kind: 'REMINDER',
            category: 'FOLLOWUP',
            ownerRole: 'SUPPORT',
            tab: 'tickets',
          });
        });
    }

    // 3. ADMIN ROLE: CAN VIEW EVERYTHING OR FILTER BY ROLE / USER
    else if (role === 'ADMIN') {
      // Demos & Meets (Completed meets removed from Today's Schedule)
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          items.push({
            id: `admin-meet-${m.id}`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: `${m.platform} Demo — ${m.companyName}`,
            subtitle: `${m.agenda} • Agent: ${m.agentName}`,
            badge: m.status === 'APPROVED' ? 'GMeet / Demo' : 'Pending Approval',
            kind: 'MEET',
            ownerRole: 'AGENT',
            ownerName: m.agentName,
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
            canCompleteMeet: m.status === 'APPROVED',
          });
        });

      // Reminders: Client Calls, Quotation Follow-ups, Site Visits
      db.leads
        .filter((l) => l.reminder && !l.reminder.completed)
        .forEach((l) => {
          const note = l.reminder!.note || '';
          const isSiteVisit = note.toLowerCase().includes('site') || note.toLowerCase().includes('visit');
          const isQuote = l.quotationSent || note.toLowerCase().includes('quote') || note.toLowerCase().includes('proposal');
          items.push({
            id: `admin-rem-${l.id}`,
            time: formatTimeOnly(l.reminder!.datetime) || 'Today',
            title: isSiteVisit
              ? `Site Visit — ${l.companyName}`
              : isQuote
              ? `Quotation Follow-up — ${l.companyName}`
              : `Client Call — ${l.companyName}`,
            subtitle: `${note} (${l.clientName} • Agent: ${l.assignedToAgentName || 'Unassigned'})`,
            badge: isSiteVisit ? 'Site Visit' : isQuote ? 'Quotation Follow-up' : 'Call Client',
            kind: isSiteVisit ? 'VISIT' : 'REMINDER',
            ownerRole: 'AGENT',
            ownerName: l.assignedToAgentName || 'Unassigned',
            tab: 'reminders',
          });
        });

      // Support Onboarding Setups
      db.onboardingRequests
        .filter((o) => o.status === 'APPROVED_FOR_SUPPORT')
        .forEach((o) => {
          items.push({
            id: `admin-onb-${o.id}`,
            time: formatTimeOnly(o.createdAt) || 'Today',
            title: `Support Onboarding — @${o.username}`,
            subtitle: `${o.companyName} (${o.services.join(', ')})`,
            badge: 'Support Setup',
            kind: 'ONBOARDING',
            ownerRole: 'SUPPORT',
            ownerName: 'Support Team',
            tab: 'onboarding',
          });
        });

      // Billing: Tax Invoices & Payment Callback Reminders
      db.rechargeRequests
        .filter((r) => r.paymentCallbackReminder && !r.paymentCallbackReminder.completed)
        .forEach((r) => {
          const rem = r.paymentCallbackReminder!;
          items.push({
            id: `admin-paycb-${r.id}`,
            time: formatTimeOnly(rem.datetime) || 'Today',
            title: `Billing Payment Call — ${r.billingEntity || r.companyName}`,
            subtitle: `${rem.note} • ${r.clientPhone || '@' + r.username}`,
            badge: 'Payment Follow-Up',
            kind: 'BILLING',
            category: 'FOLLOWUP',
            ownerRole: 'BILLING',
            ownerName: 'Billing Team',
            tab: 'billing',
          });
        });

      db.rechargeRequests
        .filter((r) => r.status === 'RECHARGE_COMPLETED' || r.status === 'PENDING_APPROVAL')
        .forEach((r) => {
          items.push({
            id: `admin-bill-${r.id}`,
            time: formatTimeOnly(r.updatedAt || r.createdAt) || 'Today',
            title: `Billing Tax Invoice — ${r.companyName}`,
            subtitle: `${r.service} (${formatINR(r.amount)}) • ${r.billingInvoiceNumber ? `Inv: ${r.billingInvoiceNumber}` : 'Tax Invoice Pending'}`,
            badge: 'Billing Raise',
            kind: 'BILLING',
            category: 'FOLLOWUP',
            ownerRole: 'BILLING',
            ownerName: 'Billing Team',
            tab: 'billing',
          });
        });
    }

    // 4. ACCOUNT MANAGER (TL) ROLE SPECIFIC SCHEDULE: My Tasks vs Agent Tasks
    else if (role === 'ACCOUNT_MANAGER') {
      // GMeet / Demos scheduled (Completed removed from Today's Schedule)
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          const isMyMeet = m.agentId === currentUser.id || m.agentName === currentUser.name;
          items.push({
            id: `am-meet-${m.id}`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: `${m.platform} — ${m.companyName}`,
            subtitle: `${m.agenda} (${isMyMeet ? 'Your Direct Demo' : `Agent: ${m.agentName}`})`,
            badge: isMyMeet ? 'My GMeet' : (m.status === 'APPROVED' ? 'Agent GMeet' : 'Need Approval'),
            kind: 'MEET',
            ownerRole: isMyMeet ? 'ACCOUNT_MANAGER' : 'AGENT',
            ownerName: m.agentName,
            isMyTask: isMyMeet,
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });

      // Client Calls, Quotation follow-ups & Site Visits
      db.leads
        .filter((l) => l.reminder && !l.reminder.completed)
        .forEach((l) => {
          const note = l.reminder!.note || '';
          const isSiteVisit = note.toLowerCase().includes('site') || note.toLowerCase().includes('visit');
          const isMyLead = l.assignedToAgentId === currentUser.id;
          const isQuote = l.quotationSent || note.toLowerCase().includes('quote') || note.toLowerCase().includes('proposal');
          items.push({
            id: `am-rem-${l.id}`,
            time: formatTimeOnly(l.reminder!.datetime) || 'Today',
            title: isSiteVisit
              ? `Site Visit — ${l.companyName}`
              : isQuote
              ? `Quotation Followup — ${l.companyName}`
              : `Client Call — ${l.companyName}`,
            subtitle: `${note} (${l.clientName} • ${isMyLead ? '⭐ My Direct Lead' : `Agent: ${l.assignedToAgentName || 'Unassigned'}`})`,
            badge: isMyLead ? '⭐ My Task' : (isSiteVisit ? 'Agent Visit' : isQuote ? 'Agent Quote' : 'Agent Call'),
            kind: isSiteVisit ? 'VISIT' : 'REMINDER',
            ownerRole: isMyLead ? 'ACCOUNT_MANAGER' : 'AGENT',
            ownerName: l.assignedToAgentName || 'Unassigned',
            isMyTask: isMyLead,
            tab: 'reminders',
          });
        });
    }

    // 4. AGENT ROLE SPECIFIC SCHEDULE
    else {
      // Agent's own GMeet / Zoom / Teams demos (Completed removed from Today's Schedule)
      db.meetRequests
        .filter(
          (m) =>
            (m.agentId === currentUser.id || m.agentName === currentUser.name) &&
            m.status !== 'COMPLETED' &&
            m.status !== 'REJECTED'
        )
        .forEach((m) => {
          items.push({
            id: `agent-meet-${m.id}`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: `${m.platform} Demo — ${m.companyName}`,
            subtitle: m.agenda,
            badge: m.status === 'APPROVED' ? 'Confirmed GMeet' : 'Pending Support',
            kind: 'MEET',
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });

      // Agent's client call reminders, quotation followups, site visits
      db.leads
        .filter(
          (l) =>
            l.reminder &&
            !l.reminder.completed &&
            (l.assignedToAgentId === currentUser.id || !l.assignedToAgentId)
        )
        .forEach((l) => {
          const note = l.reminder!.note || '';
          const isSiteVisit = note.toLowerCase().includes('site') || note.toLowerCase().includes('visit');
          const isQuote = l.quotationSent || note.toLowerCase().includes('quote') || note.toLowerCase().includes('proposal');
          items.push({
            id: `agent-rem-${l.id}`,
            time: formatTimeOnly(l.reminder!.datetime) || 'Today',
            title: isSiteVisit
              ? `Site Visit — ${l.companyName}`
              : isQuote
              ? `Quotation Follow-up — ${l.companyName}`
              : `Client Callback — ${l.companyName}`,
            subtitle: `${note} (Contact: ${l.clientName} • ${l.phone})`,
            badge: isSiteVisit ? 'Site Visit' : isQuote ? 'Quotation Follow-up' : 'Call Client',
            kind: isSiteVisit ? 'VISIT' : 'REMINDER',
            tab: 'reminders',
          });
        });

      // Agent's client outstanding payment recovery follow-ups & callback reminders
      (db.rechargeRequests || [])
        .filter((r) => {
          const isMyClient =
            r.agentId === currentUser.id ||
            r.agentName?.toLowerCase() === currentUser.name?.toLowerCase();
          if (!isMyClient) return false;
          const br = getPaymentBreakdown(r);
          const hasActiveCallback =
            r.paymentCallbackReminder && !r.paymentCallbackReminder.completed;
          return hasActiveCallback || (r.status === 'BILLED' && br.balance > 0);
        })
        .forEach((r) => {
          const br = getPaymentBreakdown(r);
          const hasCallback =
            r.paymentCallbackReminder && !r.paymentCallbackReminder.completed;
          const isDue =
            hasCallback &&
            new Date(r.paymentCallbackReminder!.datetime).getTime() <= Date.now();
          const callbackTime = hasCallback
            ? formatTimeOnly(r.paymentCallbackReminder!.datetime)
            : 'Today';

          items.push({
            id: `agent-out-${r.id}`,
            time: callbackTime,
            title: `💰 Outstanding Payment — ${r.companyName}`,
            subtitle: `Balance Due: ₹${br.balance.toLocaleString(
              'en-IN'
            )} (Bill #${r.billingInvoiceNumber || 'Pending'})${
              hasCallback
                ? ` • Remark: ${r.paymentCallbackReminder!.note}`
                : ' • Call client to collect overdue payment'
            }`,
            badge: isDue
              ? 'Payment Due Now'
              : br.balance > 0
              ? 'Payment Recovery'
              : 'Payment Call',
            kind: 'REMINDER',
            tab: 'reminders',
            ownerRole: 'AGENT',
            ownerName: r.agentName,
          });
        });
    }

    // Add Personal / Account Work Reminders to Today's Schedule & Reminders
    (db.personalReminders || [])
      .filter((p) => !p.completed && (role === 'ADMIN' || p.userId === currentUser.id))
      .forEach((p) => {
        items.push({
          id: `prem-${p.id}`,
          time: formatTimeOnly(p.datetime) || 'Today',
          title: p.title,
          subtitle: `${p.note || 'Work reminder'} • ${p.userName}`,
          badge: 'Work Reminder',
          kind: 'REMINDER',
          category: 'FOLLOWUP',
          ownerRole: p.userRole,
          ownerName: p.userName,
          tab: 'reminders',
        });
      });

    // Add >45 Minutes Pending Work (Demo, Support, Billing) across all roles!
    const FORTY_FIVE_MIN_MS = 45 * 60 * 1000;
    const nowMs = Date.now();
    const formatOverdue = (createdAt?: string) => {
      if (!createdAt) return '>45m';
      const diffMins = Math.floor((nowMs - new Date(createdAt).getTime()) / 60000);
      if (diffMins < 60) return `${diffMins}m pending`;
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hrs}h ${mins}m pending`;
    };

    // Pending Demo / Meet Approvals >45m
    db.meetRequests
      .filter(
        (m) =>
          (m.status === 'PENDING_APPROVAL' || m.status === 'APPROVED') &&
          nowMs - new Date(m.createdAt).getTime() >= FORTY_FIVE_MIN_MS
      )
      .forEach((m) => {
        items.push({
          id: `p45-meet-${m.id}`,
          time: formatOverdue(m.createdAt),
          title: `Pending Demo (${m.platform}) — ${m.companyName}`,
          subtitle: `${m.agenda} • Agent: ${m.agentName}`,
          badge: 'DEMO >45m',
          kind: 'MEET',
          category: 'PENDING_45',
          ownerRole: 'SUPPORT',
          ownerName: m.agentName,
          tab: 'meets',
        });
      });

    // Pending Support Onboarding / Recharges / Tickets >45m
    db.onboardingRequests
      .filter(
        (o) =>
          (o.status === 'PENDING_APPROVAL' || o.status === 'APPROVED_FOR_SUPPORT') &&
          nowMs - new Date(o.createdAt).getTime() >= FORTY_FIVE_MIN_MS
      )
      .forEach((o) => {
        items.push({
          id: `p45-onb-${o.id}`,
          time: formatOverdue(o.createdAt),
          title: `Pending Support Setup — @${o.username}`,
          subtitle: `${o.companyName} (${o.services.join(', ')})`,
          badge: 'SUPPORT >45m',
          kind: 'ONBOARDING',
          category: 'PENDING_45',
          ownerRole: 'SUPPORT',
          ownerName: 'Support Team',
          tab: 'onboarding',
        });
      });

    (db.supportTickets || [])
      .filter(
        (t) =>
          t.status !== 'RESOLVED' &&
          t.status !== 'CLOSED' &&
          nowMs - new Date(t.createdAt).getTime() >= FORTY_FIVE_MIN_MS
      )
      .forEach((t) => {
        items.push({
          id: `p45-tkt-${t.id}`,
          time: formatOverdue(t.createdAt),
          title: `Pending Ticket — @${t.username}`,
          subtitle: `${t.subject} (${t.targetRole})`,
          badge: 'TICKET >45m',
          kind: 'REMINDER',
          category: 'PENDING_45',
          ownerRole: t.targetRole,
          ownerName: t.targetUserName || t.targetRole,
          tab: 'tickets',
        });
      });

    // Pending Billing Tally Bills >45m (hidden from Support)
    if (role !== 'SUPPORT') {
      db.rechargeRequests
        .filter(
          (r) =>
            r.paymentMode !== 'DEMO' &&
            (r.status === 'PENDING_APPROVAL' || r.status === 'RECHARGE_COMPLETED') &&
            nowMs - new Date(r.createdAt).getTime() >= FORTY_FIVE_MIN_MS
        )
        .forEach((r) => {
          items.push({
            id: `p45-bill-${r.id}`,
            time: formatOverdue(r.createdAt),
            title: `Pending Billing — ${r.companyName}`,
            subtitle: `${r.service} (${formatINR(r.amount)}) • @${r.username}`,
            badge: 'BILLING >45m',
            kind: 'BILLING',
            category: 'PENDING_45',
            ownerRole: 'BILLING',
            ownerName: 'Billing Team',
            tab: 'billing',
          });
        });
    }

    // Tag any un-categorized items cleanly as MEET or FOLLOWUP
    const normalizedItems = items.map((it) => ({
      ...it,
      category:
        it.category ||
        (it.kind === 'MEET' ? ('MEET' as const) : ('FOLLOWUP' as const)),
    }));

    // If Admin, apply active role & user filters
    if (role === 'ADMIN') {
      let filtered = normalizedItems;
      if (adminScheduleRoleFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.ownerRole === adminScheduleRoleFilter);
      }
      if (adminScheduleUserFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.ownerName === adminScheduleUserFilter);
      }
      return filtered;
    }

    // If Account Manager, apply My Schedule vs Team Agent Schedule filters
    if (role === 'ACCOUNT_MANAGER') {
      let filtered = normalizedItems;
      if (amScheduleScopeFilter === 'MY') {
        filtered = filtered.filter((i: any) => i.isMyTask || i.category === 'PENDING_45');
      } else if (amScheduleScopeFilter === 'AGENT') {
        filtered = filtered.filter((i: any) => !i.isMyTask);
      }
      if (amScheduleAgentFilter !== 'ALL') {
        filtered = filtered.filter((i: any) => i.ownerName === amScheduleAgentFilter || i.category === 'PENDING_45');
      }
      return filtered;
    }

    return normalizedItems;
  }, [
    role,
    adminScheduleRoleFilter,
    adminScheduleUserFilter,
    amScheduleScopeFilter,
    amScheduleAgentFilter,
    currentUser.id,
    currentUser.name,
    db.meetRequests,
    db.onboardingRequests,
    db.rechargeRequests,
    db.leads,
  ]);

  // Pending Work / Tasks list
  const pendingTasks = useMemo(() => {
    const tasks: Array<{
      id: string;
      leadId?: string;
      label: string;
      badge: string;
      tab: NavTab;
      isReminder?: boolean;
    }> = [];

    dueReminders.forEach((l) => {
      tasks.push({
        id: `task-rem-${l.id}`,
        leadId: l.id,
        label: `Follow-up — ${l.companyName}`,
        badge: 'Due Now',
        tab: 'reminders',
        isReminder: true,
      });
    });

    if (isManager) {
      db.onboardingRequests
        .filter((o) => o.status === 'PENDING_APPROVAL')
        .forEach((o) => {
          tasks.push({
            id: `task-onb-${o.id}`,
            label: `Approve onboarding — ${o.companyName}`,
            badge: 'Pending',
            tab: 'onboarding',
          });
        });
      db.rechargeRequests
        .filter((r) => r.status === 'PENDING_APPROVAL')
        .forEach((r) => {
          tasks.push({
            id: `task-rec-${r.id}`,
            label: `Approve recharge — ${r.companyName}`,
            badge: formatINR(r.amount),
            tab: 'recharges',
          });
        });
      db.meetRequests
        .filter((m) => m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          tasks.push({
            id: `task-meet-${m.id}`,
            label: `Approve meet — ${m.companyName}`,
            badge: m.scheduledTime,
            tab: 'meets',
          });
        });
    }

    if (isSupport) {
      db.onboardingRequests
        .filter((o) => o.status === 'APPROVED_FOR_SUPPORT')
        .forEach((o) => {
          tasks.push({
            id: `task-sup-onb-${o.id}`,
            label: `Create account @${o.username}`,
            badge: 'Approved',
            tab: 'onboarding',
          });
        });
      db.rechargeRequests
        .filter((r) => r.status === 'APPROVED_FOR_SUPPORT')
        .forEach((r) => {
          tasks.push({
            id: `task-sup-rec-${r.id}`,
            label: `Execute recharge — @${r.username}`,
            badge: formatINR(r.amount),
            tab: 'recharges',
          });
        });
    }

    if (isBilling) {
      db.rechargeRequests
        .filter((r) => r.status === 'RECHARGE_COMPLETED')
        .forEach((r) => {
          tasks.push({
            id: `task-bill-${r.id}`,
            label: `Raise Tax Invoice — ${r.companyName}`,
            badge: formatINR(r.amount),
            tab: 'billing',
          });
        });
    }

    if (role === 'AGENT') {
      db.leads
        .filter((l) => l.status === 'NEW')
        .slice(0, 3)
        .forEach((l) => {
          tasks.push({
            id: `task-lead-${l.id}`,
            label: `Call & update lead — ${l.companyName}`,
            badge: 'New Lead',
            tab: 'leads',
          });
        });
    }

    return tasks
      .filter((t) => !completedTaskIds.includes(t.id))
      .slice(0, 5);
  }, [
    dueReminders,
    isManager,
    isSupport,
    isBilling,
    role,
    db.onboardingRequests,
    db.rechargeRequests,
    db.meetRequests,
    db.leads,
    completedTaskIds,
  ]);

  // Recent communication logs across leads
  const recentComms = useMemo(() => {
    const logs: Array<{
      id: string;
      company: string;
      summary: string;
      type: 'CALL' | 'EMAIL' | 'NOTE' | 'STATUS_CHANGE';
      time: string;
      createdAt: string;
    }> = [];
    for (const l of db.leads) {
      for (const log of l.callLogs) {
        logs.push({
          id: log.id,
          company: l.companyName,
          summary: log.summary,
          type: log.type,
          time: formatTimeOnly(log.createdAt),
          createdAt: log.createdAt,
        });
      }
    }
    return logs
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4);
  }, [db.leads]);

  // Quick Action Tiles matching reference image Row 3 (using PNG icons)
  const quickActionTiles = useMemo(() => {
    if (isSupport) {
      return [
        {
          title: 'Support Meet Schedule',
          sub: 'Confirmed demos',
          iconSrc: '/icons/video.png',
          cls: 'bg-sky-50 border-sky-200/80 hover:border-sky-300',
          onClick: () => onNavigate('meets'),
        },
        {
          title: 'Provision Account',
          sub: 'Masked pricing queue',
          iconSrc: '/icons/onboarding.png',
          cls: 'bg-purple-50 border-purple-200/80 hover:border-purple-300',
          onClick: () => onNavigate('onboarding'),
        },
        {
          title: 'Execute Recharge',
          sub: 'Send entry to Billing',
          iconSrc: '/icons/recharge.png',
          cls: 'bg-amber-50 border-amber-200/80 hover:border-amber-300',
          onClick: () => onNavigate('recharges'),
        },
      ];
    }

    if (isBilling) {
      return [
        {
          title: 'Raise Tax Invoice',
          sub: `${billingQueueCount} waiting from Support`,
          iconSrc: '/icons/onboarding.png',
          cls: 'bg-sky-50 border-sky-200/80 hover:border-sky-300',
          onClick: () => onNavigate('billing'),
        },
        {
          title: 'Client Accounts',
          sub: 'GST & billing entities',
          iconSrc: '/icons/leads.png',
          cls: 'bg-purple-50 border-purple-200/80 hover:border-purple-300',
          onClick: () => onNavigate('onboarding'),
        },
      ];
    }

    return [
      {
        title: 'Add Lead',
        sub: 'Single client entry',
        iconSrc: '/icons/add-lead.png',
        cls: 'bg-emerald-50/90 border-emerald-200/80 hover:border-emerald-300',
        onClick: () => onOpenLeadUpload('MANUAL'),
      },
      {
        title: 'Upload Lead File',
        sub: 'Import .CSV / sheet',
        iconSrc: '/icons/upload-file.png',
        cls: 'bg-teal-50/90 border-teal-200/80 hover:border-teal-300',
        onClick: () => onOpenLeadUpload('CSV'),
      },
      {
        title: 'Client Onboarding',
        sub: 'Account & services',
        iconSrc: '/icons/onboarding.png',
        cls: 'bg-purple-50/90 border-purple-200/80 hover:border-purple-300',
        onClick: () => onNavigate('onboarding'),
      },
      {
        title: 'Request Recharge',
        sub: 'Approval by Account Mgr',
        iconSrc: '/icons/recharge.png',
        cls: 'bg-amber-50/90 border-amber-200/80 hover:border-amber-300',
        onClick: () => onNavigate('recharges'),
      },
      {
        title: 'New Communication',
        sub: 'Call / Email log',
        iconSrc: '/icons/communication.png',
        cls: 'bg-sky-50/90 border-sky-200/80 hover:border-sky-300',
        onClick: () => onNavigate('leads'),
      },
      {
        title: 'Schedule Meeting',
        sub: 'Hot lead demo',
        iconSrc: '/icons/calendar.png',
        cls: 'bg-violet-50/90 border-violet-200/80 hover:border-violet-300',
        onClick: () => onNavigate('meets'),
      },
    ];
  }, [isSupport, isBilling, billingQueueCount, onNavigate, onOpenLeadUpload]);

  return (
    <div className="space-y-4">
      {/* Subtle Workspace Greeting Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {ROLE_META[role].label} Dashboard — {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500">{ROLE_META[role].desc}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {(role === 'ADMIN' || role === 'ACCOUNT_MANAGER' || role === 'BILLING') && (
            <button
              onClick={() => setShowEodModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-sm transition"
              title="Open End of Day (EOD) Operations & Accounts Report"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              EOD Daily Report
            </button>
          )}
          <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
            Live Workspace • Auto-syncing every 5s
          </span>
        </div>
      </div>

      {/* Date Horizon Filter Strip (Defaults to TODAY) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-800">
            Dashboard View:
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {dashboardDateRange === 'TODAY' && '⚡ Aaj Ka Live Data (Today)'}
            {dashboardDateRange === 'YESTERDAY' && '📅 Kal Ka Data (Yesterday)'}
            {dashboardDateRange === 'THIS_WEEK' && '📅 Is Hafte Ka Data (This Week)'}
            {dashboardDateRange === 'THIS_MONTH' && '📅 Is Mahine Ka Data (This Month)'}
            {dashboardDateRange === 'ALL_TIME' && '🌐 All Time (Overall Total Data)'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-medium self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setDashboardDateRange('TODAY')}
            className={`px-3 py-1.5 rounded-lg transition-all font-semibold shrink-0 ${
              dashboardDateRange === 'TODAY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            ⚡ Today (Aaj)
          </button>
          <button
            onClick={() => setDashboardDateRange('YESTERDAY')}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              dashboardDateRange === 'YESTERDAY'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            Yesterday (Kal)
          </button>
          <button
            onClick={() => setDashboardDateRange('THIS_WEEK')}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              dashboardDateRange === 'THIS_WEEK'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setDashboardDateRange('THIS_MONTH')}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              dashboardDateRange === 'THIS_MONTH'
                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setDashboardDateRange('ALL_TIME')}
            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              dashboardDateRange === 'ALL_TIME'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Overview Dashboard Segmented Sub-Tabs Strip (Clean, Focused, Non-Messy Mobile & Desktop UX) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
        <button
          type="button"
          onClick={() => setViewMode('SNAPSHOT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
            viewMode === 'SNAPSHOT'
              ? 'bg-[#0A1B3F] text-white shadow-md shadow-[#0A1B3F]/20'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
          }`}
        >
          <span className="text-sm">📊</span>
          <span>Snapshot</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('TASKS')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
            viewMode === 'TASKS'
              ? 'bg-[#0A1B3F] text-white shadow-md shadow-[#0A1B3F]/20'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
          }`}
        >
          <span className="text-sm">⏰</span>
          <span>Tasks &amp; Schedule</span>
          {scheduleItems.length + pendingTasks.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                viewMode === 'TASKS' ? 'bg-[#F2591F] text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {scheduleItems.length + pendingTasks.length}
            </span>
          )}
        </button>

        {(role === 'ADMIN' || (db.supportTickets || []).length > 0) && (
          <button
            type="button"
            onClick={() => setViewMode('RADAR')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
              viewMode === 'RADAR'
                ? 'bg-[#0A1B3F] text-white shadow-md shadow-[#0A1B3F]/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            <span className="text-sm">⚡</span>
            <span>SLA Radar &amp; Tickets</span>
            {(db.supportTickets || []).filter((t) => t.status !== 'RESOLVED').length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  viewMode === 'RADAR' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {(db.supportTickets || []).filter((t) => t.status !== 'RESOLVED').length}
              </span>
            )}
          </button>
        )}

        {isManager && (
          <button
            type="button"
            onClick={() => setViewMode('ANALYTICS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
              viewMode === 'ANALYTICS'
                ? 'bg-[#0A1B3F] text-white shadow-md shadow-[#0A1B3F]/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            <span className="text-sm">👥</span>
            <span>Team Analytics</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setViewMode('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
            viewMode === 'ALL'
              ? 'bg-[#0A1B3F] text-white shadow-md shadow-[#0A1B3F]/20'
              : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs'
          }`}
          title="Show all sections together"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Full View</span>
        </button>
      </div>

      {/* ROW 1: Pastel KPI Cards (Visible in SNAPSHOT or ALL mode) */}
      {(viewMode === 'SNAPSHOT' || viewMode === 'ALL') && (
        <div
          className={
            isSupport
              ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5'
              : 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5'
          }
        >
          {kpiCards.map((card) => (
            <button
              key={card.label}
              onClick={() => onNavigate(card.tab)}
              className={`text-left rounded-2xl border p-4 transition hover:shadow-md ${card.cardCls}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${card.iconWrap}`}
                >
                  <PngIcon src={card.iconSrc} alt={card.label} className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-extrabold text-slate-900 leading-none">
                    {card.value}
                  </div>
                  <div className="text-xs font-semibold text-slate-700 mt-1 truncate">
                    {card.label}
                  </div>
                  <div
                    className={`text-[11px] font-semibold mt-0.5 truncate ${card.subColor}`}
                  >
                    {card.sub}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ROW 2: 3-Column Middle Widgets (Pipeline, Schedule, Pending Tasks) */}
      {(viewMode === 'SNAPSHOT' || viewMode === 'TASKS' || viewMode === 'ALL') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Card 1: Support Tickets Pipeline (for SUPPORT) OR Lead Pipeline & Stage Funnel (for Sales/AM/Admin) */}
          {(viewMode === 'SNAPSHOT' || viewMode === 'ALL') && (
            isSupport ? (
              <div className={`${viewMode === 'SNAPSHOT' ? 'lg:col-span-12' : 'lg:col-span-4'} bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between transition-all`}>
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCollapse('pipeline')}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                        title={isCollapsed('pipeline') ? 'Expand section' : 'Collapse section'}
                      >
                        {isCollapsed('pipeline') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Headphones className="w-4 h-4 text-purple-600" />
                        Support Tickets &amp; Resolution
                      </h3>
                    </div>
                    <button
                      onClick={() => onNavigate('tickets')}
                      className="text-[11px] font-semibold text-purple-600 hover:underline flex items-center gap-1"
                    >
                      View Tickets →
                    </button>
                  </div>

                  {!isCollapsed('pipeline') && (
                    <div className="space-y-3">
                      {supportTicketRows.map((row) => {
                        const pct = Math.round((row.count / maxSupportTickets) * 100);
                        return (
                          <div key={row.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                                {row.label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900">{row.count}</span>
                                {row.badge && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${row.badgeCls}`}>
                                    {row.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${row.bar}`}
                                style={{ width: `${Math.max(row.count > 0 ? 8 : 0, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isCollapsed('pipeline') && (
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Resolution: <strong className="text-emerald-700 font-bold">{sResolutionRate}%</strong> ({sTicketsResolved}/{sTicketsReceived} Resolved)
                    </span>
                    <button
                      onClick={() => onNavigate('tickets')}
                      className="text-xs font-bold text-purple-600 hover:underline"
                    >
                      Open Ticket Desk →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={`${viewMode === 'SNAPSHOT' ? 'lg:col-span-12' : 'lg:col-span-4'} bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between transition-all`}>
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCollapse('pipeline')}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                        title={isCollapsed('pipeline') ? 'Expand section' : 'Collapse section'}
                      >
                        {isCollapsed('pipeline') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <PngIcon src="/icons/pipeline.png" alt="Lead Pipeline" className="w-4 h-4" />
                        Lead Pipeline &amp; Conversion
                      </h3>
                    </div>
                    <button
                      onClick={() => onNavigate('leads')}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      View Leads →
                    </button>
                  </div>

                  {!isCollapsed('pipeline') && (
                    <div className="space-y-3">
                      {pipelineRows.map((row) => {
                        const pct = Math.round((row.count / maxPipeline) * 100);
                        return (
                          <div key={row.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">{row.label}</span>
                              <span className="font-extrabold text-slate-900">{row.count}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${row.bar}`}
                                style={{ width: `${Math.max(row.count > 0 ? 8 : 0, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!isCollapsed('pipeline') && (
                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Total Active Leads: <strong className="text-slate-800">{pipelineDataSource.length}</strong>
                    </span>
                    <button
                      onClick={() => onNavigate('leads')}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Open Distribution →
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          {/* Card 2: Today's Schedule & Reminders */}
          {(viewMode === 'TASKS' || viewMode === 'ALL') && (
            <div className={`${viewMode === 'TASKS' ? 'lg:col-span-7' : 'lg:col-span-4'} bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCollapse('schedule')}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                    title={isCollapsed('schedule') ? 'Expand section' : 'Collapse section'}
                  >
                    {isCollapsed('schedule') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PngIcon src="/icons/calendar.png" alt="Schedule" className="w-4 h-4" />
                    Today&apos;s Schedule &amp; Reminders
                  </h3>
                </div>
                <button
                  onClick={() => onNavigate(isBilling ? 'billing' : 'meets')}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Schedule →
                </button>
              </div>

              {!isCollapsed('schedule') && (
                <>
                  {/* Admin Role & User Filters */}
                  {role === 'ADMIN' && (
                    <div className="mb-3 p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Filter Schedule by Role / Person</span>
                        <span className="text-indigo-600 font-semibold">{scheduleItems.length} items</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={adminScheduleRoleFilter}
                          onChange={(e) => {
                            setAdminScheduleRoleFilter(e.target.value as any);
                            setAdminScheduleUserFilter('ALL');
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                        >
                          <option value="ALL">All Roles</option>
                          <option value="AGENT">Agents (Calls/Meets)</option>
                          <option value="SUPPORT">Support Team</option>
                          <option value="BILLING">Billing Team</option>
                        </select>

                        <select
                          value={adminScheduleUserFilter}
                          onChange={(e) => setAdminScheduleUserFilter(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 truncate"
                        >
                          <option value="ALL">All Team Members</option>
                          {db.users.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name} ({ROLE_META[u.role].short})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Account Manager View Segment: My Schedule vs Team Agent Schedule */}
                  {role === 'ACCOUNT_MANAGER' && (
                    <div className="mb-3 p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Schedule Scope: AM vs Agents</span>
                        <span className="text-indigo-600 font-semibold">{scheduleItems.length} shown</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={amScheduleScopeFilter}
                          onChange={(e) => {
                            setAmScheduleScopeFilter(e.target.value as any);
                            setAmScheduleAgentFilter('ALL');
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700"
                        >
                          <option value="ALL">All (My + Agent Leads)</option>
                          <option value="MY">⭐ My Schedule (AM Direct)</option>
                          <option value="AGENT">Team Agents Schedule</option>
                        </select>

                        <select
                          value={amScheduleAgentFilter}
                          onChange={(e) => setAmScheduleAgentFilter(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 truncate"
                        >
                          <option value="ALL">All Agents</option>
                          {agents.map((a) => (
                            <option key={a.id} value={a.name}>
                              {a.name} (Agent)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Clean Category Switcher: All | Today Follow-Up | Today's Meets | >45m Pending */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {(
                      [
                        { id: 'ALL', label: `All (${scheduleItems.length})` },
                        {
                          id: 'FOLLOWUP',
                          label: `📞 Follow-Up (${scheduleItems.filter((i) => i.category === 'FOLLOWUP').length})`,
                        },
                        {
                          id: 'MEET',
                          label: `🎥 Meets (${scheduleItems.filter((i) => i.category === 'MEET').length})`,
                        },
                        {
                          id: 'PENDING_45',
                          label: `⏳ >45m (${scheduleItems.filter((i) => i.category === 'PENDING_45').length})`,
                        },
                      ] as { id: typeof scheduleTab; label: string }[]
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setScheduleTab(t.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          scheduleTab === t.id
                            ? t.id === 'PENDING_45'
                              ? 'bg-[#F2591F] text-white shadow-2xs'
                              : 'bg-[#0A1B3F] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const visibleSchedule = scheduleItems
                      .filter((i) => scheduleTab === 'ALL' || i.category === scheduleTab)
                      .slice(0, 8);
                    if (visibleSchedule.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                          No items in this category right now.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-0.5">
                        {visibleSchedule.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                            <span className="text-[11px] font-semibold text-slate-500 w-14 shrink-0">
                              {item.time}
                            </span>
                            <PngIcon
                              src={
                                item.kind === 'MEET'
                                  ? '/icons/video.png'
                                  : item.kind === 'VISIT'
                                  ? '/icons/calendar.png'
                                  : item.kind === 'ONBOARDING'
                                  ? '/icons/onboarding.png'
                                  : item.kind === 'BILLING'
                                  ? '/icons/recharge.png'
                                  : '/icons/phone.png'
                              }
                              alt={item.kind}
                              className="w-7 h-7 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.hasJoin && (
                              item.joinUrl ? (
                                <a
                                  href={item.joinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                                >
                                  Join <ArrowUpRight className="w-3 h-3" />
                                </a>
                              ) : (
                                <button
                                  onClick={() => onNavigate(item.tab)}
                                  className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                                >
                                  Join <ArrowUpRight className="w-3 h-3" />
                                </button>
                              )
                            )}

                            {/* Support / Admin Complete button directly on Schedule item */}
                            {item.kind === 'MEET' && item.canCompleteMeet && item.meetId && (role === 'SUPPORT' || role === 'ADMIN') ? (() => {
                              const canComplete = isMeetTimePassed(item.scheduledDate, item.scheduledTime) || role === 'ADMIN';
                              return (
                                <button
                                  type="button"
                                  disabled={!canComplete}
                                  onClick={async () => {
                                    if (!canComplete) return;
                                    await onAction('COMPLETE_MEET', {
                                      meetId: item.meetId,
                                      supportNotes: 'Demo & walkthrough completed by Support engineer.',
                                    });
                                  }}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                                    canComplete
                                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
                                  }`}
                                  title={
                                    canComplete
                                      ? 'Mark meet completed (will remove from Today Schedule)'
                                      : `Meet time (${item.scheduledTime}) hone ke baad hi complete kar sakte hain`
                                  }
                                >
                                  <Check className="w-3 h-3" />
                                  Complete
                                </button>
                              );
                            })() : (
                              <button
                                onClick={() => onNavigate(item.tab)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
                                aria-label="Open item"
                              >
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Card 3: Pending Work (My Tasks) */}
          {(viewMode === 'TASKS' || viewMode === 'ALL') && (
            <div className={`${viewMode === 'TASKS' ? 'lg:col-span-5' : 'lg:col-span-4'} bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm transition-all`}>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCollapse('pendingTasks')}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                    title={isCollapsed('pendingTasks') ? 'Expand section' : 'Collapse section'}
                  >
                    {isCollapsed('pendingTasks') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PngIcon src="/icons/tasks.png" alt="Pending Tasks" className="w-4 h-4" />
                    Pending Work (My Tasks)
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {pendingTasks.length}
                    </span>
                  </h3>
                </div>
              </div>
              {!isCollapsed('pendingTasks') && (
                pendingTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-emerald-700 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    All caught up! No pending actions right now.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-b-0"
                      >
                        <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={async () => {
                              if (task.isReminder && task.leadId) {
                                await onAction('COMPLETE_REMINDER', {
                                  leadId: task.leadId,
                                });
                              } else {
                                setCompletedTaskIds((prev) => [...prev, task.id]);
                                onNavigate(task.tab);
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                          />
                          <span
                            onClick={() => onNavigate(task.tab)}
                            className="text-xs font-medium text-slate-800 hover:text-indigo-600 truncate"
                          >
                            {task.label}
                          </span>
                        </label>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {task.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Support Tickets (Ticket Rise) Overview Widget */}
      {(viewMode === 'RADAR' || viewMode === 'ALL') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => toggleCollapse('supportTickets')}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                title={isCollapsed('supportTickets') ? 'Expand section' : 'Collapse section'}
              >
                {isCollapsed('supportTickets') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-700">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Support Tickets (Ticket Rise)
                  {((db.supportTickets || []).filter((t) => t.status !== 'RESOLVED')).length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold animate-pulse">
                      {((db.supportTickets || []).filter((t) => t.status !== 'RESOLVED')).length} Open
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Raise, track and manage support tickets (SMPP, RCS, WhatsApp, IVR, Billing, etc.)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('tickets')}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Rise New Ticket
              </button>
              <button
                onClick={() => onNavigate('tickets')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                View All Tickets →
              </button>
            </div>
          </div>

          {!isCollapsed('supportTickets') && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left mini counters */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-2">
                <div
                  onClick={() => onNavigate('tickets')}
                  className="cursor-pointer p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 hover:bg-purple-100/70 transition"
                >
                  <div className="text-[11px] font-semibold text-purple-700">Total Tickets</div>
                  <div className="text-xl font-black text-purple-950 mt-1">
                    {(db.supportTickets || []).length}
                  </div>
                </div>

                <div
                  onClick={() => onNavigate('tickets')}
                  className="cursor-pointer p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/70 transition"
                >
                  <div className="text-[11px] font-semibold text-amber-700">Open</div>
                  <div className="text-xl font-black text-amber-950 mt-1">
                    {(db.supportTickets || []).filter((t) => t.status === 'OPEN').length}
                  </div>
                </div>

                <div
                  onClick={() => onNavigate('tickets')}
                  className="cursor-pointer p-3 rounded-xl bg-sky-50/70 border border-sky-200/80 hover:bg-sky-100/70 transition"
                >
                  <div className="text-[11px] font-semibold text-sky-700">In Progress</div>
                  <div className="text-xl font-black text-sky-950 mt-1">
                    {(db.supportTickets || []).filter((t) => t.status === 'IN_PROGRESS').length}
                  </div>
                </div>

                <div
                  onClick={() => onNavigate('tickets')}
                  className="cursor-pointer p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 hover:bg-emerald-100/70 transition"
                >
                  <div className="text-[11px] font-semibold text-emerald-700">Resolved</div>
                  <div className="text-xl font-black text-emerald-950 mt-1">
                    {(db.supportTickets || []).filter((t) => t.status === 'RESOLVED').length}
                  </div>
                </div>
              </div>

              {/* Right quick table of recent tickets */}
              <div className="lg:col-span-8 overflow-x-auto">
                {(!db.supportTickets || db.supportTickets.length === 0) ? (
                  <div className="h-full flex items-center justify-center p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No support tickets raised yet. Click &quot;Rise New Ticket&quot; to submit a technical issue.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Ticket ID</th>
                        <th className="py-2 px-3">Subject / Issue</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Priority</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(db.supportTickets || []).slice(0, 4).map((tkt) => (
                        <tr
                          key={tkt.id}
                          onClick={() => onNavigate('tickets')}
                          className="cursor-pointer hover:bg-slate-50 transition"
                        >
                          <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                            {tkt.id.toUpperCase()}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                              {tkt.subject}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              @{tkt.username}
                            </div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {tkt.serviceCategory}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tkt.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : tkt.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {tkt.priority}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${
                                tkt.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tkt.status === 'IN_PROGRESS'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {tkt.status === 'RESOLVED' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />}
                              {tkt.status === 'OPEN' && <Clock className="w-2.5 h-2.5 text-amber-600" />}
                              {tkt.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                            {formatShortDateTime(tkt.updatedAt || tkt.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Operations SLA & Work Latency Monitor (Zero-Delay Radar) */}
      {(viewMode === 'RADAR' || viewMode === 'ALL') && currentUser.role === 'ADMIN' && (
        <AdminLatencyRadarSection db={db} currentUser={currentUser} onNavigate={onNavigate} />
      )}

      {/* Visual Analytics & Review Pie Chart (Day/Week/Custom) for Admin & Account Manager */}
      {(viewMode === 'ANALYTICS' || viewMode === 'ALL') && isManager && (
        <AgentAnalyticsSection db={db} currentUser={currentUser} />
      )}

      {/* Team Disposition Breakdown for Admin & Account Manager */}
      {(viewMode === 'ANALYTICS' || viewMode === 'ALL') && isManager && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCollapse('agentPerformance')}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                title={isCollapsed('agentPerformance') ? 'Expand section' : 'Collapse section'}
              >
                {isCollapsed('agentPerformance') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Agent Performance &amp; Lead Disposition
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time Hot / Warm / Cold visibility across your sales team
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Manage Distribution →
            </button>
          </div>

          {!isCollapsed('agentPerformance') && (
            <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left font-semibold text-slate-500 uppercase">
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 px-3">
                    Assigned {dashboardDateRange === 'TODAY' ? '(Today)' : ''}
                  </th>
                  <th className="py-2 px-3">
                    Calls {dashboardDateRange === 'TODAY' ? '(Today)' : ''}
                  </th>
                  <th className="py-2 px-3">Hot</th>
                  <th className="py-2 px-3">Warm</th>
                  <th className="py-2 px-3">Cold</th>
                  <th className="py-2 px-3">
                    Onboarded {dashboardDateRange === 'TODAY' ? '(Today)' : ''}
                  </th>
                  <th className="py-2 pl-3">
                    Billed Revenue {dashboardDateRange === 'TODAY' ? '(Today)' : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((agent) => {
                  const agentLeadsTotal = db.leads.filter(
                    (l) => l.assignedToAgentId === agent.id
                  );
                  const agentLeadsInRange = agentLeadsTotal.filter((l) =>
                    dashboardDateRange === 'ALL_TIME'
                      ? true
                      : isDateInDashboardRange(l.leadDate || l.createdAt || l.updatedAt, dashboardDateRange)
                  );
                  const agentCallsInRange = db.leads.reduce(
                    (sum, lead) =>
                      sum +
                      (lead.callLogs || []).filter(
                        (cl) =>
                          cl.createdBy === agent.name &&
                          (dashboardDateRange === 'ALL_TIME'
                            ? true
                            : isDateInDashboardRange(cl.createdAt, dashboardDateRange))
                      ).length,
                    0
                  );
                  const agentHotInRange = agentLeadsTotal.filter(
                    (l) =>
                      l.status === 'HOT' &&
                      (dashboardDateRange === 'ALL_TIME'
                        ? true
                        : isDateInDashboardRange(l.updatedAt || l.createdAt, dashboardDateRange))
                  ).length;
                  const agentOnbTotal = db.onboardingRequests.filter(
                    (o) => o.agentId === agent.id && o.status === 'ACCOUNT_CREATED'
                  ).length;
                  const agentOnbInRange = db.onboardingRequests.filter(
                    (o) =>
                      o.agentId === agent.id &&
                      o.status === 'ACCOUNT_CREATED' &&
                      (dashboardDateRange === 'ALL_TIME'
                        ? true
                        : isDateInDashboardRange(o.createdAt || o.updatedAt, dashboardDateRange))
                  ).length;
                  const agentRevTotal = db.rechargeRequests
                    .filter(
                      (r) => r.agentId === agent.id && r.status === 'BILLED'
                    )
                    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
                  const agentRevInRange = db.rechargeRequests
                    .filter(
                      (r) =>
                        r.agentId === agent.id &&
                        r.status === 'BILLED' &&
                        (dashboardDateRange === 'ALL_TIME'
                          ? true
                          : isDateInDashboardRange(r.updatedAt || r.createdAt, dashboardDateRange))
                    )
                    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

                  const displayAssigned =
                    dashboardDateRange === 'ALL_TIME'
                      ? agentLeadsTotal.length
                      : agentLeadsInRange.length;
                  const displayOnb =
                    dashboardDateRange === 'ALL_TIME'
                      ? agentOnbTotal
                      : agentOnbInRange;
                  const displayRev =
                    dashboardDateRange === 'ALL_TIME'
                      ? agentRevTotal
                      : agentRevInRange;

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center justify-center">
                            {agent.avatar}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {agent.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {agent.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-800">
                          {displayAssigned}
                        </span>
                        {dashboardDateRange !== 'ALL_TIME' && (
                          <span className="text-[10px] text-slate-400 block">
                            {agentLeadsTotal.length} total
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          agentCallsInRange > 0
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {agentCallsInRange} calls
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700">
                          {agentHotInRange > 0 ? agentHotInRange : agentLeadsTotal.filter((l) => l.status === 'HOT').length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">
                          {agentLeadsTotal.filter((l) => l.status === 'WARM').length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-cyan-50 text-cyan-700">
                          {agentLeadsTotal.filter((l) => l.status === 'COLD').length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-700">
                          {displayOnb}
                        </span>
                        {dashboardDateRange !== 'ALL_TIME' && agentOnbTotal > 0 && (
                          <span className="text-[10px] text-slate-400 block">
                            {agentOnbTotal} total
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pl-3">
                        <span className="font-semibold text-emerald-700">
                          {formatINR(displayRev)}
                        </span>
                        {dashboardDateRange !== 'ALL_TIME' && agentRevTotal > 0 && (
                          <span className="text-[10px] text-slate-400 block">
                            {formatINR(agentRevTotal)} total
                          </span>
                        )}
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

      {/* End of Day (EOD) Operations & Accounts Report Modal */}
      {showEodModal && (
        <EodReportModal
          db={db}
          currentUser={currentUser}
          onClose={() => setShowEodModal(false)}
        />
      )}
    </div>
  );
}
