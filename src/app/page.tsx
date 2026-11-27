'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlarmClock,
  BarChart3,
  Bell,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Headphones,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Phone,
  MessageSquare,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { CrmDatabase, Lead, RechargeRequest, User } from '@/types/crm';
import { NavTab, OverviewSection } from '@/components/OverviewSection';
import { LeadsSection } from '@/components/LeadsSection';
import { InboxSection } from '@/components/InboxSection';
import { RemindersSection } from '@/components/RemindersSection';
import { MeetsSection } from '@/components/MeetsSection';
import { OnboardingSection } from '@/components/OnboardingSection';
import { RechargeSection } from '@/components/RechargeSection';
import { BillingSection } from '@/components/BillingSection';
import { TicketsSection } from '@/components/TicketsSection';
import { SalesSection } from '@/components/SalesSection';
import { LoginScreen } from '@/components/LoginScreen';
import { TeamManagementSection } from '@/components/TeamManagementSection';
const ErrorCodeHubSection = dynamic(
  () => import('@/components/ErrorCodeHubSection').then((m) => m.ErrorCodeHubSection),
  { ssr: false }
);
import {
  CuteAgentAvatar,
  formatDateTime,
  getPaymentBreakdown,
  playReminderChime,
  ROLE_META,
  RoleBadge,
} from '@/components/ui';

export default function CrmAppPage() {
  const [db, setDb] = useState<CrmDatabase | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeUserId, setActiveUserId] = useState<string>('usr-agent-1');
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);

  const [prefillOnboardLead, setPrefillOnboardLead] = useState<Lead | null>(
    null
  );
  const [prefillMeetLead, setPrefillMeetLead] = useState<Lead | null>(null);
  const [initialUploadMode, setInitialUploadMode] = useState<
    'CSV' | 'MANUAL' | null
  >(null);

  // Live due reminder popup state
  const [dueAlertLead, setDueAlertLead] = useState<Lead | null>(null);
  const [dueAlertPayment, setDueAlertPayment] = useState<RechargeRequest | null>(null);
  const alertedIdsRef = useRef<Set<string>>(new Set());

  const currentUser: User | undefined = useMemo(() => {
    if (!db || !activeUserId) return undefined;
    return db.users.find((u) => u.id === activeUserId);
  }, [db, activeUserId]);

  const showToast = useCallback(
    (type: 'success' | 'error', message: string) => {
      setToast({ type, message });
      setTimeout(() => {
        setToast((prev) => (prev?.message === message ? null : prev));
      }, 4000);
    },
    []
  );

  const fetchState = useCallback(
    async (userObj?: User) => {
      try {
        const u = userObj || currentUser;
        const roleParam = u?.role || 'ADMIN';
        const userParam = u?.id || activeUserId;
        const res = await fetch(
          `/api/crm?role=${encodeURIComponent(roleParam)}&userId=${encodeURIComponent(userParam)}`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        if (json.ok) {
          if (json.buildVersion && typeof window !== 'undefined') {
            sessionStorage.setItem('crm_build_version', json.buildVersion);
          }
          setDb(json.data);
        }
      } catch {
        // silent network retry on polling
      } finally {
        setLoading(false);
      }
    },
    [activeUserId, currentUser]
  );

  useEffect(() => {
    const AUTH_SESSION_VERSION = '2026-11-20-v2';
    const currentVer = localStorage.getItem('crm_auth_version');
    if (currentVer !== AUTH_SESSION_VERSION) {
      localStorage.removeItem('crm_logged_in_user_id');
      localStorage.removeItem('crm_active_user_id');
      localStorage.setItem('crm_auth_version', AUTH_SESSION_VERSION);
      setAuthChecked(true);
      return;
    }
    const loggedInId = localStorage.getItem('crm_logged_in_user_id');
    const savedTab = localStorage.getItem('crm_active_tab') as NavTab | null;
    if (savedTab) setActiveTab(savedTab);
    if (loggedInId) {
      setActiveUserId(loggedInId);
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchState();
  }, [activeUserId, isAuthenticated, authChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoginSuccess = (user: User, loggedInDb: CrmDatabase) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_logged_in_user_id', user.id);
      localStorage.setItem('crm_active_user_id', user.id);
    }
    setActiveUserId(user.id);
    setDb(loggedInDb);
    setIsAuthenticated(true);
    setLoading(false);
    const defaultTab: NavTab =
      user.role === 'SUPPORT'
        ? 'onboarding'
        : user.role === 'BILLING'
        ? 'billing'
        : 'overview';
    setActiveTab(defaultTab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_active_tab', defaultTab);
    }
    showToast('success', `Welcome ${user.name}!`);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('crm_logged_in_user_id');
      localStorage.removeItem('crm_active_user_id');
      localStorage.removeItem('crm_active_tab');
    }
    setIsAuthenticated(false);
    setDb(null);
    setDueAlertLead(null);
    setRolePickerOpen(false);
    setNotifOpen(false);
  };

  // Keep user tab valid when switching roles
  const switchUser = async (user: User) => {
    setActiveUserId(user.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_active_user_id', user.id);
    }
    setRolePickerOpen(false);
    setNotifOpen(false);
    setDueAlertLead(null);

    let nextTab = activeTab;
    if (user.role === 'SUPPORT' && (activeTab === 'leads' || activeTab === 'billing' || activeTab === 'reminders')) {
      nextTab = 'onboarding';
      setActiveTab('onboarding');
    } else if (user.role === 'BILLING' && activeTab !== 'overview' && activeTab !== 'billing') {
      nextTab = 'billing';
      setActiveTab('billing');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_active_tab', nextTab);
    }

    await fetchState(user);
    showToast('success', `Switched workspace to ${user.name} (${ROLE_META[user.role].label})`);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_active_tab', tab);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAction = async (action: string, payload: Record<string, any> = {}) => {
    if (!currentUser) return false;
    setBusy(true);
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          actorId: currentUser.id,
          role: currentUser.role,
          payload,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        showToast('error', json.error || 'Action failed');
        return false;
      }
      setDb(json.data);
      if (action !== 'MARK_REMINDER_NOTIFIED' && action !== 'MARK_NOTIFICATIONS_READ') {
        showToast('success', 'Updated successfully');
      }
      return true;
    } catch {
      showToast('error', 'Network error while updating CRM');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Poll every 12 seconds (only when tab is visible) for smooth performance
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      fetchState();
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchState]);

  useEffect(() => {
    if (!db || !currentUser) return;
    const nowMs = Date.now();
    const dueLead = db.leads.find(
      (l) =>
        l.reminder &&
        !l.reminder.completed &&
        new Date(l.reminder.datetime).getTime() <= nowMs &&
        !alertedIdsRef.current.has(`${l.id}:${l.reminder.datetime}`)
    );

    if (dueLead && dueLead.reminder) {
      alertedIdsRef.current.add(`${dueLead.id}:${dueLead.reminder.datetime}`);
      setDueAlertLead(dueLead);
      playReminderChime();
      if (!dueLead.reminder.notified) {
        handleAction('MARK_REMINDER_NOTIFIED', { leadId: dueLead.id });
      }
    }

    // Check due Accounts Payment Follow-Up Callback Reminders for Billing / Admin / AM / AGENT
    const isPayReminderRole =
      currentUser.role === 'BILLING' ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'ACCOUNT_MANAGER' ||
      currentUser.role === 'AGENT';

    if (isPayReminderRole) {
      const duePayBill = (db.rechargeRequests || []).find((r) => {
        if (!r.paymentCallbackReminder || r.paymentCallbackReminder.completed || !r.paymentCallbackReminder.datetime) return false;
        const dt = new Date(r.paymentCallbackReminder.datetime).getTime();
        if (isNaN(dt) || dt > nowMs) return false;
        if (alertedIdsRef.current.has(`pay:${r.id}:${r.paymentCallbackReminder.datetime}`)) return false;
        // For Agent role, only alert for the agent's assigned clients
        if (currentUser.role === 'AGENT') {
          return r.agentId === currentUser.id || (r.agentName || '').toLowerCase() === (currentUser.name || '').toLowerCase();
        }
        return true;
      });

      if (duePayBill && duePayBill.paymentCallbackReminder) {
        alertedIdsRef.current.add(`pay:${duePayBill.id}:${duePayBill.paymentCallbackReminder.datetime}`);
        setDueAlertPayment(duePayBill);
        playReminderChime();
        const br = getPaymentBreakdown(duePayBill);
        showToast(
          'success',
          `💰 OUTSTANDING REMINDER: Call ${duePayBill.companyName} (${duePayBill.clientPhone || '@' + duePayBill.username}) — Balance: ₹${br.balance.toLocaleString('en-IN')}. Remark: ${duePayBill.paymentCallbackReminder.note}`
        );
      }
    }
  }, [db, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl border-4 border-[#F2591F]/25 border-t-[#F2591F] animate-spin" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/immense-logo.jpg"
              alt="Immense Air Pvt Ltd"
              className="w-14 h-14 rounded-xl object-contain bg-white p-1 shadow-sm"
            />
          </div>
          <p className="text-xs font-bold text-[#0A1B3F] tracking-wide">
            Loading Immense Air CRM...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (loading || !db || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl border-4 border-[#F2591F]/25 border-t-[#F2591F] animate-spin" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/immense-logo.jpg"
              alt="Immense Air Pvt Ltd"
              className="w-14 h-14 rounded-xl object-contain bg-white p-1 shadow-sm"
            />
          </div>
          <p className="text-xs font-bold text-[#0A1B3F] tracking-wide">
            Loading Immense Air CRM...
          </p>
        </div>
      </div>
    );
  }

  const role = currentUser.role;
  const unreadCount = (db.notifications || []).filter(
    (n) => !(n.readBy || []).includes(currentUser.id)
  ).length;

  const dueRemindersCount = useMemo(() => {
    if (!db || !currentUser) return 0;
    const now = Date.now();
    const leadReminders = (db.leads || []).filter((l) => {
      if (!l.reminder || l.reminder.completed || !l.reminder.datetime) return false;
      const dt = new Date(l.reminder.datetime).getTime();
      return (
        !isNaN(dt) &&
        dt <= now &&
        (currentUser.role !== 'AGENT' || !l.assignedToAgentId || l.assignedToAgentId === currentUser.id)
      );
    }).length;

    const paymentReminders = (db.rechargeRequests || []).filter((r) => {
      if (!r.paymentCallbackReminder || r.paymentCallbackReminder.completed || !r.paymentCallbackReminder.datetime) return false;
      const dt = new Date(r.paymentCallbackReminder.datetime).getTime();
      if (isNaN(dt) || dt > now) return false;
      if (currentUser.role === 'AGENT') {
        return r.agentId === currentUser.id || (r.agentName || '').toLowerCase() === (currentUser.name || '').toLowerCase();
      }
      return (
        currentUser.role === 'BILLING' ||
        currentUser.role === 'ADMIN' ||
        currentUser.role === 'ACCOUNT_MANAGER'
      );
    }).length;

    return leadReminders + paymentReminders;
  }, [db, currentUser]);

  const allNavItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    visible: boolean;
  }> = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'sales',
      label: role === 'AGENT' ? 'My Sales & Outstanding' : 'Sales & Collection',
      icon: BarChart3,
      visible: role === 'ADMIN' || role === 'ACCOUNT_MANAGER' || role === 'AGENT',
    },
    {
      id: 'teams',
      label: 'Teams & User Mapping',
      icon: ShieldCheck,
      visible: role === 'ADMIN',
    },
    {
      id: 'errors',
      label: 'Error Code Hub',
      icon: ShieldCheck,
      visible: role === 'SUPPORT' || role === 'ADMIN',
    },
    {
      id: 'leads',
      label:
        role === 'ADMIN' || role === 'ACCOUNT_MANAGER'
          ? 'Leads & Distribution'
          : 'My Assigned Leads',
      icon: Users,
      badge:
        role === 'ADMIN' || role === 'ACCOUNT_MANAGER'
          ? db.leads.filter((l) => !l.assignedToAgentId).length
          : db.leads.filter((l) => l.status === 'NEW').length,
      visible: role === 'ADMIN' || role === 'ACCOUNT_MANAGER' || role === 'AGENT',
    },
    {
      id: 'inbox',
      label: 'Mail Inbox',
      icon: Mail,
      visible: role === 'ADMIN' || role === 'ACCOUNT_MANAGER' || role === 'AGENT',
    },
    {
      id: 'reminders',
      label: 'Callback Reminders',
      icon: AlarmClock,
      badge: dueRemindersCount,
      visible: true,
    },
    {
      id: 'meets',
      label: role === 'SUPPORT' ? 'Support Meet Schedule' : 'Meet Scheduling',
      icon: CalendarCheck,
      badge:
        role === 'SUPPORT'
          ? db.meetRequests.filter((m) => m.status === 'APPROVED').length
          : db.meetRequests.filter((m) => m.status === 'PENDING_APPROVAL').length,
      visible: role !== 'BILLING',
    },
    {
      id: 'onboarding',
      label:
        role === 'SUPPORT'
          ? 'Account Creation (Masked)'
          : 'Client Onboarding',
      icon: UserPlus,
      badge:
        role === 'SUPPORT'
          ? db.onboardingRequests.filter(
              (o) => o.status === 'APPROVED_FOR_SUPPORT'
            ).length
          : db.onboardingRequests.filter((o) => o.status === 'PENDING_APPROVAL')
              .length,
      visible: true,
    },
    {
      id: 'recharges',
      label:
        role === 'SUPPORT'
          ? 'Support Recharge Queue'
          : role === 'BILLING'
          ? 'Recharge & Tally Queue'
          : 'Recharge Requests',
      icon: Wallet,
      badge:
        role === 'SUPPORT'
          ? db.rechargeRequests.filter(
              (r) => r.status === 'APPROVED_FOR_SUPPORT'
            ).length
          : role === 'BILLING' || role === 'ADMIN'
          ? db.rechargeRequests.filter((r) => r.status === 'PENDING_APPROVAL')
              .length
          : db.rechargeRequests.filter(
              (r) => r.status === 'PENDING_APPROVAL' || r.status === 'APPROVED_FOR_SUPPORT'
            ).length,
      visible: true,
    },
    {
      id: 'tickets',
      label: 'Ticket Rise',
      icon: Headphones,
      badge: (db.supportTickets || []).filter((t) => t.status !== 'RESOLVED').length,
      visible: true,
    },
    {
      id: 'billing',
      label: 'Billing & Tax Invoices',
      icon: Receipt,
      badge:
        role === 'BILLING' || role === 'ADMIN'
          ? db.rechargeRequests.filter(
              (r) => r.status === 'PENDING_APPROVAL' || r.status === 'RECHARGE_COMPLETED'
            ).length
          : undefined,
      visible: role !== 'SUPPORT',
    },
  ];
  const navItems = allNavItems.filter((item) => item.visible);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0A1B3F]/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 30% Deep Navy Blue Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A1B3F] text-slate-100 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 shadow-xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/immense-logo.jpg"
                alt="Immense Air Pvt Ltd"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-white flex items-center gap-1">
                <span>IMMENSE</span>
                <span className="text-[#F2591F]">AIR</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                Pvt Ltd • CRM
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleTabChange(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? 'bg-[#F2591F] text-white shadow-md shadow-[#F2591F]/25 font-bold'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      active
                        ? 'bg-white text-[#F2591F]'
                        : 'bg-[#F2591F]/20 text-[#FF8F66]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active User Footer */}
        <div className="p-4 border-t border-white/10 bg-[#071430] space-y-3">
          <div className="flex items-center gap-2.5">
            <CuteAgentAvatar size={38} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {ROLE_META[currentUser.role].label} • <span className="text-indigo-300 font-mono text-[10px]">{currentUser.mailConfig?.email || currentUser.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser.role === 'ADMIN' && (
              <button
                onClick={() => setRolePickerOpen(true)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Switch View
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex-1 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (50% Crisp White with Navy & Orange Brand Accents) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-[#0A1B3F] hover:bg-slate-50 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            {/* Mobile Brand Logo */}
            <div className="flex lg:hidden items-center gap-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/immense-logo.jpg"
                alt="Immense Air"
                className="w-7 h-7 rounded-lg object-contain border border-slate-200 bg-white shrink-0"
              />
              <span className="font-black text-xs tracking-tight text-[#0A1B3F] truncate">
                IMMENSE <span className="text-[#F2591F]">AIR</span>
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <CuteAgentAvatar size={28} />
              {/* Role badge hidden */}
              {currentUser.teamId && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold">
                  {(db.teams || []).find((t) => t.id === currentUser.teamId)?.name || currentUser.teamId}
                </span>
              )}
              <span className="text-xs text-slate-500">
                Logged in as <strong className="text-slate-800">{currentUser.name}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Quick View Switcher Pill (Admin only) */}
            {currentUser.role === 'ADMIN' && (
              <div className="relative">
                <button
                  onClick={() => setRolePickerOpen((v) => !v)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline">Switch Role:</span>
                  <span>{ROLE_META[currentUser.role].short}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

              {rolePickerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setRolePickerOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50">
                    <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Instant Role & User Switcher
                    </div>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {db.users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => switchUser(u)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-2 transition ${
                            u.id === currentUser.id
                              ? 'bg-indigo-50 border border-indigo-200'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {u.avatar}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {u.name}
                              </div>
                              <div className="text-[10px] text-indigo-600 font-medium truncate">
                                {u.mailConfig?.email || u.email}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {u.department}
                              </div>
                            </div>
                          </div>
                          {/* Role badge hidden */}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out / Logout"
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <span className="text-xs font-bold text-slate-900">
                        Notifications ({unreadCount} unread)
                      </span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => handleAction('MARK_NOTIFICATIONS_READ')}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {db.notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No notifications for this role yet.
                        </div>
                      ) : (
                        (db.notifications || []).slice(0, 15).map((n) => {
                          const isUnread = !(n.readBy || []).includes(currentUser.id);
                          return (
                            <div
                              key={n.id}
                              className={`p-3.5 text-xs ${
                                isUnread ? 'bg-indigo-50/40' : 'bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900">
                                  {n.title}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {n.type}
                                </span>
                              </div>
                              <p className="text-slate-600 mt-1">{n.message}</p>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {formatDateTime(n.createdAt)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => fetchState()}
              disabled={busy}
              title="Refresh data"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Reset all CRM data back to the clean initial demo dataset?'
                  )
                ) {
                  handleAction('RESET_DEMO_DATA');
                }
              }}
              title="Reset Demo Dataset"
              className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Due Reminder Urgent Banner */}
        {dueAlertLead && dueAlertLead.reminder && (
          <div className="mx-4 lg:mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-slate-950/15 animate-pulse">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider">
                  Callback Reminder Due Now!
                </div>
                <div className="text-sm font-bold">
                  {dueAlertLead.clientName} ({dueAlertLead.companyName}) —{' '}
                  {dueAlertLead.phone}
                </div>
                <p className="text-xs font-medium opacity-90">
                  {dueAlertLead.reminder.note}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dueAlertLead.phone && (
                <a
                  href={`tel:${dueAlertLead.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Client
                </a>
              )}
              <button
                onClick={async () => {
                  await handleAction('SNOOZE_REMINDER', {
                    leadId: dueAlertLead.id,
                    minutes: 10,
                  });
                  setDueAlertLead(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-900 text-xs font-semibold"
              >
                Snooze 10m
              </button>
              <button
                onClick={async () => {
                  await handleAction('COMPLETE_REMINDER', {
                    leadId: dueAlertLead.id,
                  });
                  setDueAlertLead(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
              </button>
              <button
                onClick={() => setDueAlertLead(null)}
                className="p-1.5 rounded-lg hover:bg-black/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Due Outstanding Payment Follow-Up Reminder Urgent Banner for Agent, Billing & Admin */}
        {dueAlertPayment && dueAlertPayment.paymentCallbackReminder && (
          <div className="mx-4 lg:mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3 border border-rose-400/40 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/20 animate-pulse text-amber-200 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-200 flex flex-wrap items-center gap-1.5">
                  <span>💰 Outstanding Payment Follow-Up Due!</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-bold">
                    Bill #{dueAlertPayment.billingInvoiceNumber || 'Pending'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-black/30 text-amber-300 text-[10px] font-bold">
                    Due: ₹{getPaymentBreakdown(dueAlertPayment).balance.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {dueAlertPayment.companyName} (@{dueAlertPayment.username})
                  {dueAlertPayment.clientPhone ? ` — 📞 ${dueAlertPayment.clientPhone}` : ''}
                </div>
                <p className="text-xs font-medium text-white/95 mt-0.5">
                  <strong>Remark:</strong> {dueAlertPayment.paymentCallbackReminder.note}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {dueAlertPayment.clientPhone && (
                <>
                  <a
                    href={`tel:${dueAlertPayment.clientPhone}`}
                    className="px-3 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Client
                  </a>
                  <a
                    href={`https://wa.me/${dueAlertPayment.clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hello ${dueAlertPayment.companyName}, this is regarding the outstanding payment of ₹${getPaymentBreakdown(
                        dueAlertPayment
                      ).balance.toLocaleString('en-IN')} for invoice #${
                        dueAlertPayment.billingInvoiceNumber || dueAlertPayment.id
                      } with Immense Air Pvt Ltd. Kindly share the payment update.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={async () => {
                  await handleAction('SNOOZE_PAYMENT_CALLBACK', {
                    rechargeId: dueAlertPayment.id,
                    minutes: 15,
                  });
                  setDueAlertPayment(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition"
              >
                Snooze 15m
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleAction('COMPLETE_PAYMENT_CALLBACK_REMINDER', {
                    rechargeId: dueAlertPayment.id,
                  });
                  setDueAlertPayment(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
              </button>
              <button
                type="button"
                onClick={() => setDueAlertPayment(null)}
                className="p-1.5 rounded-lg hover:bg-black/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Active Module Content (Extra bottom padding on mobile for bottom nav) */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewSection
              db={db}
              currentUser={currentUser}
              onNavigate={handleTabChange}
              onOpenLeadUpload={(mode) => {
                setInitialUploadMode(mode);
                handleTabChange('leads');
              }}
              onAction={handleAction}
            />
          )}

          {activeTab === 'leads' && (
            <LeadsSection
              db={db}
              currentUser={currentUser}
              initialUploadMode={initialUploadMode}
              onClearInitialUpload={() => setInitialUploadMode(null)}
              onAction={handleAction}
              onQuickOnboard={(lead) => {
                setPrefillOnboardLead(lead);
                handleTabChange('onboarding');
              }}
              onQuickMeet={(lead) => {
                setPrefillMeetLead(lead);
                handleTabChange('meets');
              }}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxSection currentUser={currentUser} onAction={handleAction} />
          )}

          {activeTab === 'reminders' && (
            <RemindersSection
              db={db}
              currentUser={currentUser}
              onAction={handleAction}
            />
          )}

          {activeTab === 'meets' && (
            <MeetsSection
              db={db}
              currentUser={currentUser}
              prefillLead={prefillMeetLead}
              onClearPrefill={() => setPrefillMeetLead(null)}
              onAction={handleAction}
            />
          )}

          {activeTab === 'onboarding' && (
            <OnboardingSection
              db={db}
              currentUser={currentUser}
              prefillLead={prefillOnboardLead}
              onClearPrefill={() => setPrefillOnboardLead(null)}
              onAction={handleAction}
            />
          )}

          {(activeTab === 'recharges' || (activeTab as string) === 'recharge') && (
            <RechargeSection
              db={db}
              currentUser={currentUser}
              onAction={handleAction}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketsSection
              db={db}
              currentUser={currentUser}
              onAction={handleAction}
            />
          )}

          {activeTab === 'billing' && (
            <BillingSection
              db={db}
              currentUser={currentUser}
              onAction={handleAction}
            />
          )}

          {activeTab === 'sales' && (
            <SalesSection db={db} currentUser={currentUser} />
          )}

          {activeTab === 'teams' && currentUser.role === 'ADMIN' && (
            <TeamManagementSection
              db={db}
              currentUser={currentUser}
              onAction={handleAction}
            />
          )}

          {activeTab === 'errors' && (role === 'SUPPORT' || role === 'ADMIN') && (
            <ErrorCodeHubSection />
          )}
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar (Phone Friendly) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(10,27,63,0.08)]">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={`mob-${item.id}`}
              type="button"
              onClick={() => handleTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[60px] transition relative ${
                active ? 'text-[#F2591F]' : 'text-[#0A1B3F]/70 hover:text-[#0A1B3F]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-bold mt-0.5 truncate max-w-[68px]">
                {item.label.split(' ')[0]}
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0.5 right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-[#F2591F] text-white text-[9px] font-black flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[60px] text-[#0A1B3F]/70 hover:text-[#0A1B3F]"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-0.5">More</span>
        </button>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-20 lg:bottom-5 right-4 lg:right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-[#0A1B3F]' : 'bg-rose-600'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
