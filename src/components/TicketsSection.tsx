'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Headphones,
  Image as ImageIcon,
  LifeBuoy,
  MessageSquare,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Tag,
  UploadCloud,
  User as UserIcon,
  Users,
  Wallet,
  X,
  ZoomIn,
} from 'lucide-react';
import { CrmDatabase, Role, SupportTicket, User } from '@/types/crm';
import { fileToDataUrl, Modal, ROLE_META } from './ui';

export function TicketsSection({
  db,
  currentUser,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const role = currentUser.role;
  const isSupport = role === 'SUPPORT';
  const isAgent = role === 'AGENT';
  const isBilling = role === 'BILLING';
  const isManager = role === 'ADMIN' || role === 'ACCOUNT_MANAGER';

  const allTickets: SupportTicket[] = db.supportTickets || [];

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [targetRoleFilter, setTargetRoleFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Create Ticket Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<Role>('SUPPORT');
  const [onboardingId, setOnboardingId] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [serviceCategory, setServiceCategory] = useState('SMS / RCS Delivery');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [screenshotName, setScreenshotName] = useState('');

  // Ticket Detail / Thread Modal State
  const [activeThreadTicket, setActiveThreadTicket] = useState<SupportTicket | null>(null);
  const [threadReplyText, setThreadReplyText] = useState('');
  const [threadReplyScreenshot, setThreadReplyScreenshot] = useState('');
  const [threadReplyScreenshotName, setThreadReplyScreenshotName] = useState('');

  // Resolve Modal State
  const [resolvingTicket, setResolvingTicket] = useState<SupportTicket | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [riseMenuOpen, setRiseMenuOpen] = useState(false);
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});

  // Zoom Lightbox Modal
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);

  // Eligible client accounts to raise tickets for
  const eligibleAccounts = (db.onboardingRequests || []).filter(
    (o) => o.status === 'ACCOUNT_CREATED' || o.status === 'APPROVED_FOR_SUPPORT'
  );

  // Ctrl+V Paste handler for screenshot (Compressed via fileToDataUrl)
  const handlePasteScreenshot = (
    e: React.ClipboardEvent<any>,
    setter: (url: string) => void,
    nameSetter: (name: string) => void
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          fileToDataUrl(file).then((url) => {
            setter(url);
            nameSetter('pasted-screenshot-' + Date.now() + '.jpg');
          });
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleOpenCreateModal = (defaultTarget: Role = 'SUPPORT') => {
    setTargetRole(defaultTarget);
    const firstAcc = eligibleAccounts[0];
    setOnboardingId(firstAcc?.id || '');
    setManualUsername(firstAcc?.username || '');
    setManualCompany(firstAcc?.companyName || '');

    if (defaultTarget === 'BILLING') {
      setServiceCategory('Billing Entity & GST Discrepancy');
      setSubject('Work Order / Billing Verification');
    } else if (defaultTarget === 'AGENT') {
      setServiceCategory('Commercial Rate & Work Order Clarification');
      setSubject('Clarification on Client Account');
    } else {
      setServiceCategory('SMS / RCS Delivery');
      setSubject('');
    }

    setPriority('HIGH');
    setDescription('');
    setScreenshotDataUrl('');
    setScreenshotName('');
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetOnb = eligibleAccounts.find((o) => o.id === onboardingId);

    const clientUser = targetOnb ? targetOnb.username : manualUsername || 'inhouse_general';
    const compName = targetOnb ? targetOnb.companyName : manualCompany || 'General Internal Query';

    const ok = await onAction('CREATE_SUPPORT_TICKET', {
      onboardingId: targetOnb?.id,
      username: clientUser,
      companyName: compName,
      targetRole,
      serviceCategory,
      priority,
      subject: subject || `${serviceCategory} regarding @${clientUser}`,
      description,
      screenshotDataUrl: screenshotDataUrl || undefined,
      screenshotName: screenshotName || undefined,
    });

    if (ok) {
      setCreateModalOpen(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadTicket) return;

    const ok = await onAction('REPLY_TICKET_MESSAGE', {
      ticketId: activeThreadTicket.id,
      text: threadReplyText,
      screenshotDataUrl: threadReplyScreenshot || undefined,
      screenshotName: threadReplyScreenshotName || undefined,
    });

    if (ok) {
      setThreadReplyText('');
      setThreadReplyScreenshot('');
      setThreadReplyScreenshotName('');
      // Optimistic update
      const updated = (db.supportTickets || []).find((t) => t.id === activeThreadTicket.id);
      if (updated) setActiveThreadTicket(updated);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    const ok = await onAction('RESOLVE_SUPPORT_TICKET', {
      ticketId: resolvingTicket.id,
      resolutionNote: resolutionNote || 'Query resolved & verified across departments.',
    });
    if (ok) {
      setResolvingTicket(null);
      if (activeThreadTicket?.id === resolvingTicket.id) {
        setActiveThreadTicket(null);
      }
    }
  };

  // Filter tickets
  const filteredTickets = allTickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (targetRoleFilter !== 'ALL' && t.targetRole !== targetRoleFilter) return false;
    if (categoryFilter !== 'ALL' && t.serviceCategory !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchUsername = (t.username || '').toLowerCase().includes(q);
      const matchCompany = (t.companyName || '').toLowerCase().includes(q);
      const matchFrom = (t.fromUserName || '').toLowerCase().includes(q);
      const matchAgent = (t.agentName || '').toLowerCase().includes(q);
      const matchSubject = (t.subject || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchUsername && !matchCompany && !matchFrom && !matchAgent && !matchSubject && !matchDesc) return false;
    }
    return true;
  });

  // Ticket stats
  const totalCount = allTickets.length;
  const openCount = allTickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = allTickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = allTickets.filter((t) => t.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Header Bar with Action Shortcuts */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-700">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Cross-Department Ticket Eco-System
                {openCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-extrabold animate-pulse">
                    {openCount} Open
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Inter-department ticket routing between <strong>Agent</strong>, <strong>Account Manager</strong>, <strong>Billing</strong>, and <strong>Support</strong> with full <strong>Admin &amp; Account audit logs</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setRiseMenuOpen((v) => !v)}
            className="px-4 py-2.5 rounded-xl bg-[#F2591F] hover:bg-[#d94a14] text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Rise Ticket</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {riseMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setRiseMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setRiseMenuOpen(false);
                    handleOpenCreateModal('SUPPORT');
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-indigo-50 text-xs font-bold text-indigo-800 flex items-center gap-2"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-indigo-600" />
                  Ticket to Support
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRiseMenuOpen(false);
                    handleOpenCreateModal('BILLING');
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-2"
                >
                  <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                  Ticket to Billing
                </button>
                {(isBilling || isSupport || isManager) && (
                  <button
                    type="button"
                    onClick={() => {
                      setRiseMenuOpen(false);
                      handleOpenCreateModal('AGENT');
                    }}
                    className="w-full px-3 py-2 rounded-xl hover:bg-amber-50 text-xs font-bold text-amber-800 flex items-center gap-2"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-amber-600" />
                    Ticket to Sales Agent
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setRiseMenuOpen(false);
                    handleOpenCreateModal('ACCOUNT_MANAGER');
                  }}
                  className="w-full px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-bold text-[#0A1B3F] flex items-center gap-2"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#0A1B3F]" />
                  Ticket to AM / Admin
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'ALL'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Eco-System Tickets</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <MessageSquare className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tracked with Account Logs</div>
        </div>

        <div
          onClick={() => setStatusFilter('OPEN')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'OPEN'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Open Tickets</span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-800 mt-2">{openCount}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">Pending action from department</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-700">In Discussion / Progress</span>
            <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <LifeBuoy className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-sky-800 mt-2">{inProgressCount}</div>
          <div className="text-[11px] text-sky-600 font-medium mt-0.5">Active thread discussion</div>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Resolved &amp; Closed</span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-2">{resolvedCount}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Verified across teams</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by @username, company, sender, subject..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Target Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Dept:</span>
          </div>
          <select
            value={targetRoleFilter}
            onChange={(e) => setTargetRoleFilter(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Departments</option>
            <option value="SUPPORT">To Support</option>
            <option value="BILLING">To Billing</option>
            <option value="AGENT">To Agent</option>
            <option value="ACCOUNT_MANAGER">To Account Manager</option>
            <option value="ADMIN">To Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved Only</option>
          </select>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">No tickets found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Raise a cross-department ticket between Agent, Billing, Support or Account Manager.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticket, Client &amp; Routing</th>
                  <th className="py-3 px-4">Subject &amp; Issue</th>
                  <th className="py-3 px-4">Category &amp; Priority</th>
                  <th className="py-3 px-4 text-right">Status &amp; Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((tkt) => {
                  const isOpen = tkt.status !== 'RESOLVED';
                  const fromRoleMeta = ROLE_META[tkt.fromUserRole || 'AGENT'] || { label: tkt.fromUserRole };
                  const targetRoleMeta = ROLE_META[tkt.targetRole || 'SUPPORT'] || { label: tkt.targetRole };

                  return (
                    <tr key={tkt.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3.5 px-4 space-y-1.5 min-w-[230px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-700 text-[11px]">
                            {tkt.id.toUpperCase()}
                          </span>
                          <span className="font-extrabold font-mono text-slate-900 bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                            @{tkt.username}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[130px]">
                            ({tkt.companyName})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 font-bold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200">
                            {fromRoleMeta.label}{tkt.fromUserName ? ` (${tkt.fromUserName})` : ''}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-extrabold border border-purple-200">
                            {targetRoleMeta.label}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400">
                          Loop: AM ({tkt.accountManagerName || 'Neha Kapoor'}), Admin
                          {tkt.agentName ? ` • Agent: ${tkt.agentName}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 text-xs">
                          {tkt.subject}
                        </div>
                        {tkt.description && (
                          <div className="mt-0.5">
                            <p
                              className={`text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap ${
                                expandedDescIds[tkt.id] ? '' : 'line-clamp-2'
                              }`}
                            >
                              {tkt.description}
                            </p>
                            {tkt.description.length > 70 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedDescIds((prev) => ({
                                    ...prev,
                                    [tkt.id]: !prev[tkt.id],
                                  }))
                                }
                                className="text-[10px] font-bold text-[#F2591F] hover:underline mt-0.5"
                              >
                                {expandedDescIds[tkt.id] ? 'Show Less ▲' : 'Read More ▼'}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Thread message count pill */}
                        {tkt.messages && tkt.messages.length > 1 && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-flex">
                            <MessageSquare className="w-3 h-3" />
                            {tkt.messages.length} messages in discussion thread
                          </div>
                        )}

                        {/* Screenshot thumbnail if attached */}
                        {tkt.screenshotDataUrl && (
                          <div className="mt-2 flex items-center gap-2">
                            <div
                              onClick={() => setZoomedScreenshot(tkt.screenshotDataUrl || null)}
                              className="cursor-pointer group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 text-[10px] font-bold transition"
                              title="Click to view attached screenshot"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View Screenshot</span>
                              <ZoomIn className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                            </div>
                          </div>
                        )}

                        {tkt.supportResolutionNote && (
                          <div className="mt-2 p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] border border-emerald-200">
                            <strong>Resolution Note:</strong> {tkt.supportResolutionNote}
                            {tkt.resolvedBy && <span className="text-[10px] text-emerald-600 block mt-0.5">— Resolved by {tkt.resolvedBy}</span>}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap space-y-1.5">
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {tkt.serviceCategory}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              tkt.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                : tkt.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : tkt.priority === 'MEDIUM'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tkt.priority}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-y-1.5">
                        <div className="flex justify-end">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 ${
                              tkt.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : tkt.status === 'IN_PROGRESS'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {tkt.status === 'RESOLVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {tkt.status === 'OPEN' && <Clock className="w-3 h-3 text-amber-600" />}
                            {tkt.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveThreadTicket(tkt);
                              setThreadReplyText('');
                              setThreadReplyScreenshot('');
                              setThreadReplyScreenshotName('');
                            }}
                            title="Open Ticket Discussion Thread"
                            className="px-2.5 py-1 rounded-lg bg-[#0A1B3F] hover:bg-[#0F2A5F] text-white text-[11px] font-bold transition inline-flex items-center gap-1 shadow-2xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Thread
                          </button>

                          {/* Allow Resolve if user is target role or Admin/Account Manager */}
                          {(currentUser.role === tkt.targetRole || isManager) && isOpen && (
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingTicket(tkt);
                                setResolutionNote(`Issue addressed for @${tkt.username}. Verified and tested.`);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Resolve
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

      {/* Rise Cross-Department Ticket Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Rise Cross-Department Ticket"
        subtitle="Route queries between Agent, Billing, Support, and Account Management. All actions are logged under the client account for Admin & AM audit."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Target Department Selection */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
              1. Select Destination Department *
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetRole('SUPPORT');
                  setServiceCategory('SMS / RCS Delivery');
                }}
                className={`p-2.5 rounded-xl border text-left transition ${
                  targetRole === 'SUPPORT'
                    ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-sm'
                    : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                }`}
              >
                <div className="text-xs">🛠️ Support</div>
                <div className="text-[10px] opacity-80 mt-0.5">DLT, SMS, WhatsApp, IVR</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRole('BILLING');
                  setServiceCategory('Billing Entity & GST Discrepancy');
                }}
                className={`p-2.5 rounded-xl border text-left transition ${
                  targetRole === 'BILLING'
                    ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                    : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                }`}
              >
                <div className="text-xs">🧾 Billing</div>
                <div className="text-[10px] opacity-80 mt-0.5">Rates, GST, Invoices</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRole('AGENT');
                  setServiceCategory('Commercial Rate & Work Order Clarification');
                }}
                className={`p-2.5 rounded-xl border text-left transition ${
                  targetRole === 'AGENT'
                    ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-sm'
                    : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                }`}
              >
                <div className="text-xs">💼 Sales Agent</div>
                <div className="text-[10px] opacity-80 mt-0.5">Work Order, Client Query</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRole('ACCOUNT_MANAGER');
                  setServiceCategory('Account Strategy & Approval');
                }}
                className={`p-2.5 rounded-xl border text-left transition ${
                  targetRole === 'ACCOUNT_MANAGER'
                    ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-sm'
                    : 'bg-white/10 text-slate-200 border-white/20 hover:bg-white/20'
                }`}
              >
                <div className="text-xs">👔 Account Mgr</div>
                <div className="text-[10px] opacity-80 mt-0.5">Approvals, Client Terms</div>
              </button>
            </div>
          </div>

          {/* Client Account Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Client Account (Identified by @Username) *
            </label>
            <select
              value={onboardingId}
              onChange={(e) => {
                setOnboardingId(e.target.value);
                const matched = eligibleAccounts.find((o) => o.id === e.target.value);
                if (matched) {
                  setManualUsername(matched.username);
                  setManualCompany(matched.companyName);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
            >
              {eligibleAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  @{acc.username} — {acc.companyName} (Agent: {acc.agentName})
                </option>
              ))}
              <option value="">Other / General Internal Query</option>
            </select>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
              >
                {targetRole === 'SUPPORT' && (
                  <>
                    <option value="SMS / RCS Delivery">SMS / RCS Delivery &amp; Routes</option>
                    <option value="WhatsApp Business API">WhatsApp WABA &amp; Templates</option>
                    <option value="Cloud Telephony (IVR)">Cloud Telephony (IVR)</option>
                    <option value="Voice OBD / Blast">Voice OBD / Blast</option>
                    <option value="DLT Template / Sender ID">DLT Template / Sender ID</option>
                    <option value="SMPP / Gateway Error">SMPP / Gateway Error</option>
                  </>
                )}
                {targetRole === 'BILLING' && (
                  <>
                    <option value="Billing Entity & GST Discrepancy">Billing Entity &amp; GST Discrepancy</option>
                    <option value="Commercial Rate Verification">Commercial Rate Verification</option>
                    <option value="Tax Invoice Generation">Tax Invoice Generation</option>
                    <option value="Payment UTR Verification">Payment UTR Verification</option>
                  </>
                )}
                {targetRole === 'AGENT' && (
                  <>
                    <option value="Commercial Rate & Work Order Clarification">Commercial Rate &amp; Work Order Clarification</option>
                    <option value="Client Requirement Confirmation">Client Requirement Confirmation</option>
                    <option value="Billing Entity & PO Collection">Billing Entity &amp; PO Collection</option>
                  </>
                )}
                {targetRole === 'ACCOUNT_MANAGER' && (
                  <>
                    <option value="Account Strategy & Approval">Account Strategy &amp; Approval</option>
                    <option value="Special Commercial Approval">Special Commercial Approval</option>
                    <option value="Escalation / Client Retention">Escalation / Client Retention</option>
                  </>
                )}
                <option value="General Support">General Support</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Level *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
              >
                <option value="LOW">Low (General Query)</option>
                <option value="MEDIUM">Medium (Standard Request)</option>
                <option value="HIGH">High (Active Campaign / Delivery Delay)</option>
                <option value="URGENT">Urgent (Down / Immediate Attention)</option>
              </select>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ticket Subject *
            </label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Billing Entity mismatch in Work Order, or SMS 5101 error"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
            />
          </div>

          {/* Description with Ctrl+V */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Detailed Query / Remark *
              </label>
              <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Tip: Press Ctrl+V here to paste screenshot
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={(e) => handlePasteScreenshot(e, setScreenshotDataUrl, setScreenshotName)}
              placeholder="Enter exact requirement, query, affected numbers, error codes or invoice details... (Ctrl+V se screenshot bhi paste kar sakte hain)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Screenshot Paste / Upload Container */}
          <div
            onPaste={(e) => handlePasteScreenshot(e, setScreenshotDataUrl, setScreenshotName)}
            tabIndex={0}
            className={`p-3.5 rounded-2xl border-2 border-dashed transition outline-none ${
              screenshotDataUrl
                ? 'bg-emerald-50/60 border-emerald-300'
                : 'bg-slate-50 border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:bg-indigo-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                Attach Screenshot (Error / Work Order / Invoice / Client Query)
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                Ctrl+C karke direct Ctrl+V karein
              </span>
            </div>

            {screenshotDataUrl ? (
              <div className="space-y-2">
                <div className="relative group rounded-xl overflow-hidden border border-emerald-300 bg-white max-h-48 flex items-center justify-center p-2">
                  <img
                    src={screenshotDataUrl}
                    alt="Pasted screenshot"
                    className="max-h-44 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZoomedScreenshot(screenshotDataUrl)}
                      className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-xs font-bold flex items-center gap-1 shadow-md"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> View Full
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotDataUrl('');
                        setScreenshotName('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                  <span className="truncate flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Attached: {screenshotName || 'Pasted Screenshot'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshotDataUrl('');
                      setScreenshotName('');
                    }}
                    className="text-rose-600 font-bold hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <div className="flex items-center justify-center gap-2 text-indigo-600 mb-1">
                  <UploadCloud className="w-6 h-6" />
                  <span className="text-xs font-bold">Screenshot Paste (Ctrl+V) ya Click to Browse</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Snipping Tool ya WhatsApp web se screenshot copy karke yaha paste kar dein
                </p>
                <label className="inline-block mt-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs">
                  <span>Browse Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (uploadEvent) => {
                          setScreenshotDataUrl(uploadEvent.target?.result as string);
                          setScreenshotName(file.name);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Ticket to {ROLE_META[targetRole]?.label || targetRole}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ticket Discussion Thread Modal */}
      <Modal
        open={Boolean(activeThreadTicket)}
        onClose={() => setActiveThreadTicket(null)}
        title={activeThreadTicket ? `Ticket Thread: ${activeThreadTicket.id.toUpperCase()} — @${activeThreadTicket.username}` : 'Ticket Thread'}
        subtitle={activeThreadTicket ? `${activeThreadTicket.subject} (${activeThreadTicket.serviceCategory})` : ''}
      >
        {activeThreadTicket && (
          <div className="space-y-4 max-h-[75vh] flex flex-col">
            {/* Header Summary Strip */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Routing:</span>
                <span className="font-bold text-slate-900">
                  {ROLE_META[activeThreadTicket.fromUserRole]?.label || activeThreadTicket.fromUserRole} ({activeThreadTicket.fromUserName}) → {ROLE_META[activeThreadTicket.targetRole]?.label || activeThreadTicket.targetRole}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Client Account:</span>
                <span className="font-extrabold font-mono text-indigo-900">
                  @{activeThreadTicket.username} ({activeThreadTicket.companyName})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loop:</span>
                <span className="text-slate-600 font-medium">
                  Account Manager ({activeThreadTicket.accountManagerName || 'Neha Kapoor'}), Admin (Full Log Recorded)
                </span>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[40vh]">
              {(activeThreadTicket.messages || [
                {
                  id: 'init',
                  senderId: activeThreadTicket.fromUserId,
                  senderName: activeThreadTicket.fromUserName,
                  senderRole: activeThreadTicket.fromUserRole,
                  text: activeThreadTicket.description,
                  screenshotDataUrl: activeThreadTicket.screenshotDataUrl,
                  createdAt: activeThreadTicket.createdAt,
                },
              ]).map((msg, idx) => {
                const isMe = msg.senderId === currentUser.id;
                const roleMeta = ROLE_META[msg.senderRole || 'AGENT'] || { label: msg.senderRole };

                return (
                  <div
                    key={msg.id || idx}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isMe
                        ? 'bg-indigo-50/70 border-indigo-200 ml-6'
                        : 'bg-white border-slate-200 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-900">{msg.senderName}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">
                          {roleMeta.label}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </p>

                    {msg.screenshotDataUrl && (
                      <div className="pt-1">
                        <div
                          onClick={() => setZoomedScreenshot(msg.screenshotDataUrl || null)}
                          className="cursor-pointer group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-indigo-700 text-[10px] font-bold w-fit shadow-2xs hover:bg-indigo-50"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>View Attached Screenshot</span>
                          <ZoomIn className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form */}
            {activeThreadTicket.status !== 'RESOLVED' ? (
              <form onSubmit={handleSendReply} className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Send Reply / Additional Remarks:</span>
                  <span className="text-indigo-600 font-bold">Ctrl+V anywhere to paste screenshot</span>
                </div>
                <textarea
                  required
                  rows={2}
                  value={threadReplyText}
                  onChange={(e) => setThreadReplyText(e.target.value)}
                  onPaste={(e) => handlePasteScreenshot(e, setThreadReplyScreenshot, setThreadReplyScreenshotName)}
                  placeholder="Type your response or update here... (Ctrl+V se screenshot paste karein)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />

                {threadReplyScreenshot && (
                  <div className="flex items-center justify-between text-[11px] bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1 font-semibold truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Attached: {threadReplyScreenshotName || 'Screenshot ready'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setThreadReplyScreenshot('')}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      <span>Attach Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setThreadReplyScreenshot(ev.target?.result as string);
                              setThreadReplyScreenshotName(file.name);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {(currentUser.role === activeThreadTicket.targetRole || isManager) && (
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingTicket(activeThreadTicket);
                          setResolutionNote(`Resolved after discussion on thread.`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark Resolved
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Reply
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
                <span>This ticket has been marked as Resolved.</span>
                <span className="text-[11px] text-emerald-700 font-normal">
                  {activeThreadTicket.supportResolutionNote} ({activeThreadTicket.resolvedBy})
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Resolve Ticket Modal */}
      <Modal
        open={Boolean(resolvingTicket)}
        onClose={() => setResolvingTicket(null)}
        title="Resolve Cross-Department Ticket"
        subtitle="Confirm resolution. A permanent log entry will be saved under the client account for Admin & Account Manager."
      >
        {resolvingTicket && (
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Ticket ID:</span>
                <span className="font-mono font-bold text-indigo-700">{resolvingTicket.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Client @Username:</span>
                <span className="font-extrabold font-mono text-indigo-900">@{resolvingTicket.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-bold text-purple-800">
                  {ROLE_META[resolvingTicket.fromUserRole]?.label} → {ROLE_META[resolvingTicket.targetRole]?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subject:</span>
                <span className="font-semibold text-slate-800">{resolvingTicket.subject}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Final Resolution Remark (Saved to Account Logs) *
              </label>
              <textarea
                required
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Explain what steps, rate verification, template or route adjustment was completed..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Resolution &amp; Update Account Log
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Screenshot Lightbox Modal */}
      <Modal
        open={Boolean(zoomedScreenshot)}
        onClose={() => setZoomedScreenshot(null)}
        title="Attached Ticket Screenshot"
      >
        {zoomedScreenshot && (
          <div className="space-y-3">
            <div className="max-h-[75vh] overflow-auto rounded-xl bg-slate-900/90 p-2 flex items-center justify-center">
              <img
                src={zoomedScreenshot}
                alt="Enlarged screenshot"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setZoomedScreenshot(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
