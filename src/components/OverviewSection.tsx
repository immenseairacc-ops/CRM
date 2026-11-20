'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, CheckCircle2, Clock, Headphones, Mail, MailOpen, Plus } from 'lucide-react';
import { CrmDatabase, Role, User } from '@/types/crm';
import { formatINR, ROLE_META, StatusBadge } from './ui';

export type NavTab =
  | 'overview'
  | 'sales'
  | 'teams'
  | 'leads'
  | 'inbox'
  | 'reminders'
  | 'meets'
  | 'onboarding'
  | 'recharges'
  | 'tickets'
  | 'billing';

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
  const [inboxEmails, setInboxEmails] = useState<
    Array<{
      id: string;
      from: { name: string; address: string };
      subject: string;
      snippet: string;
      date: string;
      seen: boolean;
    }>
  >([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [mailConnected, setMailConnected] = useState<boolean>(
    Boolean(currentUser?.mailConfig?.email)
  );

  // Admin filter state for Today's Schedule & Reminders
  const [adminScheduleRoleFilter, setAdminScheduleRoleFilter] = useState<
    'ALL' | 'AGENT' | 'ACCOUNT_MANAGER' | 'SUPPORT' | 'BILLING'
  >('ALL');
  const [adminScheduleUserFilter, setAdminScheduleUserFilter] = useState<string>('ALL');

  // Account Manager filter state for Today's Schedule & Reminders (My Schedule vs Team Agent Schedule)
  const [amScheduleScopeFilter, setAmScheduleScopeFilter] = useState<'ALL' | 'MY' | 'AGENT'>('ALL');
  const [amScheduleAgentFilter, setAmScheduleAgentFilter] = useState<string>('ALL');
  const [scheduleTab, setScheduleTab] = useState<'ALL' | 'FOLLOWUP' | 'MEET' | 'PENDING_45'>('ALL');

  useEffect(() => {
    let isMounted = true;
    const loadInboxPreview = async () => {
      try {
        const url = currentUser ? `/api/inbox?userId=${encodeURIComponent(currentUser.id)}` : '/api/inbox';
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data.ok && Array.isArray(data.emails)) {
          const connected = data.mailConnected !== false && data.source !== 'NOT_LOGGED_IN';
          setMailConnected(connected);
          setInboxEmails(connected ? data.emails.slice(0, 3) : []);
        }
      } catch {
        // silent fallback
      } finally {
        if (isMounted) setInboxLoading(false);
      }
    };
    loadInboxPreview();
    const timer = setInterval(loadInboxPreview, 20000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [currentUser?.id, currentUser?.mailConfig?.email]);

  const totalLeads = db.leads.length;
  const newLeads = db.leads.filter((l) => l.status === 'NEW').length;
  const warmLeads = db.leads.filter((l) => l.status === 'WARM').length;
  const hotLeads = db.leads.filter((l) => l.status === 'HOT').length;
  const coldLeads = db.leads.filter((l) => l.status === 'COLD').length;

  const activeReminders = db.leads.filter(
    (l) => l.reminder && !l.reminder.completed
  );
  const dueReminders = activeReminders.filter(
    (l) => l.reminder && new Date(l.reminder.datetime).getTime() <= Date.now()
  );

  const meetCount =
    role === 'SUPPORT'
      ? db.meetRequests.filter((m) => m.status === 'APPROVED').length
      : db.meetRequests.length;
  const scheduledMeetsCount = db.meetRequests.filter(
    (m) => m.status === 'PENDING_APPROVAL' || m.status === 'APPROVED'
  ).length;

  const onboardCount = db.onboardingRequests.length;
  const onboardCreatedCount = db.onboardingRequests.filter(
    (o) => o.status === 'ACCOUNT_CREATED'
  ).length;
  const quotationsSentCount = db.leads.filter((l) => l.quotationSent).length;

  const rechargeCount = db.rechargeRequests.length;
  const pendingRechargeCount = db.rechargeRequests.filter(
    (r) => r.status === 'PENDING_APPROVAL'
  ).length;
  const supportRechargeQueue = db.rechargeRequests.filter(
    (r) => r.status === 'APPROVED_FOR_SUPPORT'
  ).length;
  const billingQueueCount = db.rechargeRequests.filter(
    (r) => r.status === 'RECHARGE_COMPLETED'
  ).length;

  // Row 1: 6 Pastel KPI Cards using PNG icons
  const kpiCards = [
    {
      label:
        role === 'AGENT'
          ? 'My Leads'
          : isSupport || isBilling
          ? 'Active Accounts'
          : 'Total Leads',
      value: isSupport || isBilling ? onboardCreatedCount : totalLeads,
      sub:
        !isSupport && !isBilling ? '+12% this month' : 'Provisioned clients',
      subColor: 'text-emerald-600',
      cardCls: 'bg-sky-50/80 border-sky-200/80',
      iconWrap: 'bg-sky-100/90',
      iconSrc: '/icons/leads.png',
      tab: (isSupport || isBilling ? 'onboarding' : 'leads') as NavTab,
    },
    {
      label: isSupport ? 'Open Tickets' : 'Hot Leads',
      value: isSupport
        ? (db.supportTickets || []).filter(
            (t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED'
          ).length
        : hotLeads,
      sub: isSupport ? 'Support / Panel queries' : 'Ready for meet / deal',
      subColor: 'text-orange-600',
      cardCls: 'bg-orange-50/75 border-orange-200/80',
      iconWrap: 'bg-orange-100/90',
      iconSrc: '/icons/hot.png',
      tab: (isSupport ? 'tickets' : 'leads') as NavTab,
    },
    {
      label: isSupport ? 'Pending Recharges' : 'Follow-ups',
      value: isSupport
        ? db.rechargeRequests.filter((r) => r.status === 'APPROVED_FOR_SUPPORT').length
        : activeReminders.length,
      sub: isSupport
        ? 'Awaiting panel top-up'
        : dueReminders.length > 0
        ? `${dueReminders.length} due right now`
        : 'Callbacks scheduled',
      subColor: isSupport
        ? 'text-violet-600'
        : dueReminders.length > 0
        ? 'text-rose-600'
        : 'text-violet-600',
      cardCls: 'bg-violet-50/75 border-violet-200/80',
      iconWrap: 'bg-violet-100/90',
      iconSrc: '/icons/followup.png',
      tab: (isSupport ? 'recharges' : isBilling ? 'overview' : 'reminders') as NavTab,
    },
    {
      label: 'Meetings / Visits',
      value: meetCount,
      sub: isSupport ? 'Confirmed schedule' : 'Client demos',
      subColor: 'text-amber-700',
      cardCls: 'bg-amber-50/80 border-amber-200/80',
      iconWrap: 'bg-amber-100/90',
      iconSrc: '/icons/meeting.png',
      tab: (isBilling ? 'billing' : 'meets') as NavTab,
    },
    {
      label: 'Onboardings',
      value: onboardCount,
      sub: isSupport ? 'Pricing masked' : `${onboardCreatedCount} live accounts`,
      subColor: 'text-indigo-600',
      cardCls: 'bg-indigo-50/75 border-indigo-200/80',
      iconWrap: 'bg-indigo-100/90',
      iconSrc: '/icons/onboarding.png',
      tab: 'onboarding' as NavTab,
    },
    {
      label: isBilling ? 'Billing Queue' : 'Recharge Requests',
      value: isBilling ? billingQueueCount : rechargeCount,
      sub: isBilling
        ? 'Ready for Tax Invoice'
        : isSupport
        ? `${supportRechargeQueue} ready to credit`
        : `${pendingRechargeCount} Pending Approval`,
      subColor: 'text-amber-600',
      cardCls: 'bg-cyan-50/80 border-cyan-200/80',
      iconWrap: 'bg-cyan-100/90',
      iconSrc: '/icons/recharge.png',
      tab: (isBilling ? 'billing' : 'recharges') as NavTab,
    },
  ];

  // Pipeline bar chart data
  const pipelineRows = [
    { label: 'New', count: newLeads, bar: 'bg-sky-400' },
    { label: 'Warm / Contacted', count: warmLeads, bar: 'bg-violet-400' },
    { label: 'Hot / Interested', count: hotLeads, bar: 'bg-emerald-400' },
    { label: 'Quotation Sent', count: quotationsSentCount, bar: 'bg-indigo-400' },
    { label: 'Meet Scheduled', count: scheduledMeetsCount, bar: 'bg-amber-400' },
    { label: 'Onboarded / Won', count: onboardCreatedCount, bar: 'bg-teal-400' },
    { label: 'Cold / On Hold', count: coldLeads, bar: 'bg-slate-400' },
  ];
  const maxPipeline = Math.max(1, ...pipelineRows.map((p) => p.count));

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
        <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full self-start sm:self-auto">
          Live Workspace • Auto-syncing every 5s
        </span>
      </div>

      {/* ROW 1: Pastel KPI Cards */}
      <div
        className={
          isSupport
            ? 'grid grid-cols-2 md:grid-cols-4 gap-3.5'
            : 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5'
        }
      >
        {kpiCards
          .filter(
            (c) =>
              !isSupport ||
              (c.label !== 'Active Accounts' && c.label !== 'Pending Recharges')
          )
          .map((card) => (
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

      {/* ROW 2: 3-Column Middle Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Mail Inbox (Replaced Lead Pipeline with same size) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PngIcon src="/icons/communication.png" alt="Mail Inbox" className="w-4 h-4" />
                Mail Inbox ({currentUser.mailConfig?.email || currentUser.email})
              </h3>
              <button
                onClick={() => onNavigate('inbox')}
                className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                Open Inbox →
              </button>
            </div>

            {inboxLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading messages...
              </div>
            ) : !mailConnected ? (
              <div className="py-8 px-4 text-center space-y-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/60">
                <div className="text-xs font-bold text-[#0A1B3F]">
                  Mail Account Not Logged In
                </div>
                <p className="text-[11px] text-slate-500">
                  Apna personal mailbox ({currentUser.email}) dekhne ke liye Mail Login karein.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('inbox')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#F2591F] hover:bg-[#d94a14] text-white text-xs font-bold shadow-xs"
                >
                  Login Mail Account →
                </button>
              </div>
            ) : inboxEmails.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No recent emails in inbox.
              </div>
            ) : (
              <div className="space-y-2.5">
                {inboxEmails.slice(0, 3).map((mail) => (
                  <div
                    key={mail.id}
                    onClick={() => onNavigate('inbox')}
                    className="p-3 rounded-2xl bg-slate-50/70 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 transition cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!mail.seen && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className={`truncate text-slate-900 ${!mail.seen ? 'font-bold' : 'font-semibold'}`}>
                          {mail.from.name || mail.from.address}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                        {formatTimeOnly(mail.date)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 font-bold truncate mt-1">
                      {mail.subject}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {mail.snippet}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            {mailConnected ? (
              <span className="text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                IMAP Connected
              </span>
            ) : (
              <span className="text-amber-700 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Mail Not Connected
              </span>
            )}
            <button
              onClick={() => onNavigate('inbox')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              {mailConnected ? 'View All Emails →' : 'Login Mail →'}
            </button>
          </div>
        </div>

        {/* Card 2: Today's Schedule & Reminders */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PngIcon src="/icons/calendar.png" alt="Schedule" className="w-4 h-4" />
              Today&apos;s Schedule &amp; Reminders
            </h3>
            <button
              onClick={() => onNavigate(isBilling ? 'billing' : 'meets')}
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Schedule →
            </button>
          </div>

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
        </div>

        {/* Card 3: Pending Work (My Tasks) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PngIcon src="/icons/tasks.png" alt="Pending Tasks" className="w-4 h-4" />
              Pending Work (My Tasks)
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {pendingTasks.length}
              </span>
            </h3>
          </div>
          {pendingTasks.length === 0 ? (
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
          )}
        </div>
      </div>

      {/* Support Tickets (Ticket Rise) Overview Widget (Hidden for Support role) */}
      {!isSupport && (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
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
      </div>
      )}

      {/* Team Disposition Breakdown for Admin & Account Manager */}
      {isManager && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Live Agent Performance &amp; Lead Disposition
              </h3>
              <p className="text-xs text-slate-500">
                Real-time Hot / Warm / Cold visibility across your sales team
              </p>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Manage Distribution →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left font-semibold text-slate-500 uppercase">
                  <th className="py-2 pr-4">Agent</th>
                  <th className="py-2 px-3">Assigned</th>
                  <th className="py-2 px-3">Hot</th>
                  <th className="py-2 px-3">Warm</th>
                  <th className="py-2 px-3">Cold</th>
                  <th className="py-2 px-3">Onboarded</th>
                  <th className="py-2 pl-3">Billed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((agent) => {
                  const agentLeads = db.leads.filter(
                    (l) => l.assignedToAgentId === agent.id
                  );
                  const agentOnb = db.onboardingRequests.filter(
                    (o) =>
                      o.agentId === agent.id && o.status === 'ACCOUNT_CREATED'
                  ).length;
                  const agentRev = db.rechargeRequests
                    .filter(
                      (r) => r.agentId === agent.id && r.status === 'BILLED'
                    )
                    .reduce((s, r) => s + r.amount, 0);

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
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {agentLeads.length}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700">
                          {agentLeads.filter((l) => l.status === 'HOT').length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">
                          {agentLeads.filter((l) => l.status === 'WARM').length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-cyan-50 text-cyan-700">
                          {agentLeads.filter((l) => l.status === 'COLD').length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {agentOnb}
                      </td>
                      <td className="py-2.5 pl-3 font-semibold text-emerald-700">
                        {formatINR(agentRev)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
