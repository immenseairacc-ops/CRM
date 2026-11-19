'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  ExternalLink,
  Plus,
  Search,
  Shield,
  User as UserIcon,
  Video,
  X,
} from 'lucide-react';
import { CrmDatabase, Lead, User } from '@/types/crm';
import { Modal, StatusBadge } from './ui';

function getPlatformRedirectUrl(m: { platform: string; meetLink?: string }): string {
  if (m.meetLink && m.meetLink.trim()) return m.meetLink.trim();
  const p = m.platform.toLowerCase();
  if (p.includes('zoom')) return 'https://zoom.us/join';
  if (p.includes('team')) return 'https://teams.microsoft.com';
  if (p.includes('meet') || p.includes('google')) return 'https://meet.google.com';
  return 'https://meet.google.com';
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

function PlatformBadgeButton({
  platform,
  meetLink,
}: {
  platform: string;
  meetLink?: string;
}) {
  const p = platform.toLowerCase();
  const url = getPlatformRedirectUrl({ platform, meetLink });

  // Google Meet
  if (p.includes('meet') || p.includes('google')) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title="Open Google Meet in new tab"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white text-slate-800 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 shadow-sm transition group"
      >
        {/* Google Meet official SVG Icon */}
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#00832d" d="M14 12l4 4V8l-4 4z" />
          <path fill="#0066da" d="M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <path fill="#e94235" d="M14 6.5l4-3.5v5l-4-1.5z" />
          <path fill="#2684fc" d="M3 17a2 2 0 0 0 2 2h9v-5H3v3z" />
          <path fill="#00ac47" d="M14 17.5l4 3.5v-5l-4 1.5z" />
          <path fill="#ffba00" d="M3 7a2 2 0 0 1 2-2h9v5H3V7z" />
        </svg>
        <span>Google Meet</span>
        <ExternalLink className="w-3 h-3 text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
      </a>
    );
  }

  // Zoom
  if (p.includes('zoom')) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title="Open Zoom in new tab"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-sm transition group"
      >
        {/* Zoom Camera SVG Icon */}
        <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
          <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h7a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 16.5v-9zm13 2.1l3.3-2.2c.7-.5 1.7 0 1.7.9v7.4c0 .9-1 1.4-1.7.9l-3.3-2.2v-4.8z" />
        </svg>
        <span>Zoom Meet</span>
        <ExternalLink className="w-3 h-3 text-blue-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
      </a>
    );
  }

  // Microsoft Teams
  if (p.includes('team')) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title="Open Microsoft Teams in new tab"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#464EB8] text-white hover:bg-[#3b429d] shadow-sm transition group"
      >
        {/* Teams SVG Icon */}
        <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
          <path d="M19.5 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm1.5 3h-4a1 1 0 0 0-1 1v4.5a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-5.5a1 1 0 0 0-1-1zm-9-4a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm2 5h-7a1.5 1.5 0 0 0-1.5 1.5v6a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 14 11.5z" />
        </svg>
        <span>MS Teams</span>
        <ExternalLink className="w-3 h-3 text-indigo-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
      </a>
    );
  }

  // AnyDesk
  if (p.includes('anydesk')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
        AnyDesk Remote
      </span>
    );
  }

  // UltraViewer
  if (p.includes('ultraviewer')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
        UltraViewer Remote
      </span>
    );
  }

  // Default fallback
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
      <Video className="w-3 h-3" /> {platform}
    </span>
  );
}

export function MeetsSection({
  db,
  currentUser,
  prefillLead,
  onClearPrefill,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  prefillLead?: Lead | null;
  onClearPrefill?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const role = currentUser.role;
  const hotLeads = db.leads.filter((l) => l.status === 'HOT');
  const allLeads = db.leads;

  const [openModal, setOpenModal] = useState(false);
  const [leadId, setLeadId] = useState(hotLeads[0]?.id || allLeads[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  );
  const [scheduledTime, setScheduledTime] = useState('14:30');
  const [platform, setPlatform] = useState('Google Meet');
  const [meetLink, setMeetLink] = useState('');
  const [anydeskAddress, setAnydeskAddress] = useState('');
  const [ultraviewerId, setUltraviewerId] = useState('');
  const [ultraviewerPassword, setUltraviewerPassword] = useState('');
  const [agenda, setAgenda] = useState('');

  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [supportNotes, setSupportNotes] = useState('');

  // Reschedule Propose modal (Support Team)
  const [rescheduleTargetId, setRescheduleTargetId] = useState<string | null>(null);
  const [proposedDate, setProposedDate] = useState(
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  );
  const [proposedTime, setProposedTime] = useState('16:00');
  const [rescheduleReason, setRescheduleReason] = useState('Support team busy in another demo slot.');

  // Confirm Reschedule modal (Agent)
  const [confirmTargetMeet, setConfirmTargetMeet] = useState<any | null>(null);
  const [meetTimelineTab, setMeetTimelineTab] = useState<'ALL' | 'TODAY' | 'FUTURE' | 'PAST'>('ALL');
  const [meetSearch, setMeetSearch] = useState('');
  const [meetFromDate, setMeetFromDate] = useState('');
  const [meetToDate, setMeetToDate] = useState('');

  useEffect(() => {
    if (prefillLead) {
      setLeadId(prefillLead.id);
      setOpenModal(true);
    }
  }, [prefillLead]);

  const handleSubmitMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onAction('CREATE_MEET', {
      leadId: leadId || hotLeads[0]?.id || allLeads[0]?.id,
      scheduledDate,
      scheduledTime,
      platform,
      meetLink: (platform === 'Google Meet' || platform === 'Zoom' || platform === 'Microsoft Teams') ? meetLink : undefined,
      anydeskAddress: platform === 'AnyDesk' ? anydeskAddress : undefined,
      ultraviewerId: platform === 'UltraViewer' ? ultraviewerId : undefined,
      ultraviewerPassword: platform === 'UltraViewer' ? ultraviewerPassword : undefined,
      agenda,
    });
    if (ok) {
      setOpenModal(false);
      onClearPrefill?.();
      setAgenda('');
      setMeetLink('');
      setAnydeskAddress('');
      setUltraviewerId('');
      setUltraviewerPassword('');
    }
  };

  const approvedSchedule = [...db.meetRequests]
    .filter((m) => m.status === 'APPROVED' || m.status === 'COMPLETED')
    .sort((a, b) =>
      `${a.scheduledDate} ${a.scheduledTime}`.localeCompare(
        `${b.scheduledDate} ${b.scheduledTime}`
      )
    );

  const pendingApprovals = db.meetRequests.filter(
    (m) => m.status === 'PENDING_APPROVAL' || m.status === 'RESCHEDULE_PROPOSED'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {role === 'SUPPORT'
              ? 'Support Meet Schedule & Incoming Alerts'
              : 'Hot Lead Meetings & Approvals'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {role === 'AGENT'
              ? 'Schedule meetings for Hot leads. Request notifies Account Manager, Admin, and Support; once approved, it syncs into Support Schedule.'
              : role === 'SUPPORT'
              ? 'Confirmed meetings approved by Admin/Account Manager appear in your Support Schedule below.'
              : 'Approve Agent Meet requests to automatically publish them onto Support’s schedule.'}
          </p>
        </div>

        {(role === 'AGENT' || role === 'ADMIN' || role === 'ACCOUNT_MANAGER') && (
          <button
            onClick={() => {
              setLeadId(hotLeads[0]?.id || allLeads[0]?.id || '');
              setOpenModal(true);
            }}
            disabled={allLeads.length === 0}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            Schedule Hot Lead Meet
          </button>
        )}
      </div>

      {/* Pending Approval Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Pending Meet Approvals ({pendingApprovals.length})
          </h3>
          {role === 'SUPPORT' && (
            <span className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
              Accept when free or click Propose Reschedule if busy
            </span>
          )}
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">
            No pending meet requests right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingApprovals.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  m.status === 'RESCHEDULE_PROPOSED'
                    ? 'border-purple-300 bg-purple-50/50'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 text-base">
                      {m.clientName} — {m.companyName}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                        <UserIcon className="w-3 h-3 text-indigo-600" />
                        Sales Agent: {m.agentName}
                      </span>
                      <PlatformBadgeButton platform={m.platform} meetLink={m.meetLink} />
                    </div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    {m.scheduledDate}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    {m.scheduledTime}
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <strong>Agenda:</strong> {m.agenda}
                </p>

                {/* Connection details for Support & Team */}
                {m.meetLink && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs flex items-center justify-between gap-2">
                    <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-indigo-600" /> Meeting Link:
                    </span>
                    <a
                      href={m.meetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 font-bold hover:underline truncate max-w-xs"
                    >
                      {m.meetLink}
                    </a>
                  </div>
                )}
                {m.anydeskAddress && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs flex items-center justify-between">
                    <span className="font-semibold text-rose-900">AnyDesk Address:</span>
                    <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                      {m.anydeskAddress}
                    </span>
                  </div>
                )}
                {m.ultraviewerId && (
                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs flex items-center justify-between">
                    <span className="font-semibold text-purple-900">UltraViewer:</span>
                    <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                      ID: {m.ultraviewerId} • Password: {m.ultraviewerPassword || '-'}
                    </span>
                  </div>
                )}

                {/* Reschedule proposed alert */}
                {m.status === 'RESCHEDULE_PROPOSED' && (
                  <div className="p-3 bg-purple-100/80 border border-purple-200 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-purple-900 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-700" /> Support Team Busy — Proposed New Slot:
                    </div>
                    <div className="text-purple-800 font-medium">
                      📅 {m.proposedDate} at ⏰ {m.proposedTime}
                    </div>
                    {m.rescheduleReason && (
                      <div className="text-purple-700 italic">
                        Reason: &quot;{m.rescheduleReason}&quot;
                      </div>
                    )}
                  </div>
                )}

                {/* Support actions: Accept or Propose Reschedule */}
                {role === 'SUPPORT' && m.status === 'PENDING_APPROVAL' && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setApproveTargetId(m.id);
                        setSupportNotes('Support engineer accepted slot. Ready for client demo.');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept & Lock in Schedule
                    </button>
                    <button
                      onClick={() => {
                        setRescheduleTargetId(m.id);
                        setProposedDate(m.scheduledDate);
                        setProposedTime(m.scheduledTime);
                        setRescheduleReason('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Support Busy: Propose Reschedule
                    </button>
                  </div>
                )}

                {/* Agent actions: Confirm Reschedule with Client */}
                {(role === 'AGENT' || role === 'ADMIN' || role === 'ACCOUNT_MANAGER') && m.status === 'RESCHEDULE_PROPOSED' && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      onClick={async () => {
                        await onAction('CONFIRM_RESCHEDULE_MEET', { meetId: m.id });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Client Agreed: Confirm Reschedule
                    </button>
                    <button
                      onClick={() =>
                        onAction('REJECT_MEET', {
                          meetId: m.id,
                          reason: 'Client did not agree to rescheduled slot',
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel Meet
                    </button>
                  </div>
                )}

                {/* Admin / Team Leader Actions */}
                {(role === 'ADMIN' || role === 'ACCOUNT_MANAGER') && (
                  <div className="pt-1 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-2">
                    <span className="text-[11px] font-semibold text-slate-500">TL / Admin Action:</span>
                    {m.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => {
                          setApproveTargetId(m.id);
                          setSupportNotes('Approved by Team Leader/Admin. Assigned to Support.');
                        }}
                        className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Direct Approve
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setRescheduleTargetId(m.id);
                        setProposedDate(m.scheduledDate);
                        setProposedTime(m.scheduledTime);
                        setRescheduleReason('');
                      }}
                      className="px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-medium flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" /> Reschedule
                    </button>
                    <button
                      onClick={() =>
                        onAction('REJECT_MEET', {
                          meetId: m.id,
                          reason: 'Cancelled by TL/Admin',
                        })
                      }
                      className="px-2.5 py-1 rounded-md bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Meets: Past, Present (Today) & Future */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#0A1B3F] flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#F2591F]" />
            All Meets — Past, Today &amp; Future ({approvedSchedule.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const todayCount = approvedSchedule.filter((m) => m.scheduledDate === todayStr).length;
              const futureCount = approvedSchedule.filter((m) => m.scheduledDate > todayStr).length;
              const pastCount = approvedSchedule.filter((m) => m.scheduledDate < todayStr).length;
              return (
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(
                    [
                      { id: 'ALL', label: `All (${approvedSchedule.length})` },
                      { id: 'TODAY', label: `📍 Today (${todayCount})` },
                      { id: 'FUTURE', label: `📅 Future (${futureCount})` },
                      { id: 'PAST', label: `🕘 Past (${pastCount})` },
                    ] as { id: typeof meetTimelineTab; label: string }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMeetTimelineTab(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        meetTimelineTab === t.id
                          ? 'bg-[#0A1B3F] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              );
            })()}

            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={meetSearch}
                onChange={(e) => setMeetSearch(e.target.value)}
                placeholder="Search client, agent..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={meetFromDate}
                onChange={(e) => setMeetFromDate(e.target.value)}
                title="From Date"
                className="px-2 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
              <span className="text-[11px] text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={meetToDate}
                onChange={(e) => setMeetToDate(e.target.value)}
                title="To Date"
                className="px-2 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
              {(meetFromDate || meetToDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setMeetFromDate('');
                    setMeetToDate('');
                  }}
                  className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold hover:bg-rose-100"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {(() => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const filteredMeets = approvedSchedule.filter((m) => {
            if (meetTimelineTab === 'TODAY' && m.scheduledDate !== todayStr) return false;
            if (meetTimelineTab === 'FUTURE' && m.scheduledDate <= todayStr) return false;
            if (meetTimelineTab === 'PAST' && m.scheduledDate >= todayStr) return false;
            if (meetFromDate && m.scheduledDate < meetFromDate) return false;
            if (meetToDate && m.scheduledDate > meetToDate) return false;
            if (meetSearch.trim()) {
              const q = meetSearch.toLowerCase();
              return (
                m.companyName.toLowerCase().includes(q) ||
                m.clientName.toLowerCase().includes(q) ||
                m.agentName.toLowerCase().includes(q) ||
                m.platform.toLowerCase().includes(q)
              );
            }
            return true;
          });

          if (filteredMeets.length === 0) {
            return (
              <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">
                No meetings found for this filter.
              </div>
            );
          }

          return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMeets.map((m) => {
              const timelineTag =
                m.scheduledDate === todayStr
                  ? { label: '📍 TODAY', cls: 'bg-[#F2591F] text-white' }
                  : m.scheduledDate > todayStr
                  ? { label: '📅 UPCOMING', cls: 'bg-indigo-100 text-indigo-800 border border-indigo-200' }
                  : { label: '🕘 PAST', cls: 'bg-slate-100 text-slate-600 border border-slate-200' };
              return (
              <div
                key={m.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:shadow-md transition flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${timelineTag.cls}`}>
                      {timelineTag.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {m.scheduledDate} • {m.scheduledTime}
                    </span>
                    <StatusBadge status={m.status} />
                    <PlatformBadgeButton platform={m.platform} meetLink={m.meetLink} />
                  </div>
                  <div className="text-sm font-medium text-slate-800">
                    {m.clientName} ({m.companyName})
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                      <UserIcon className="w-3 h-3 text-indigo-600" />
                      Sales Agent: {m.agentName}
                    </span>
                    <span>• Approved by: {m.approvedBy || 'Support/AM/Admin'}</span>
                    {m.clientPhone ? <span>• {m.clientPhone}</span> : null}
                  </div>
                  <p className="text-xs text-slate-600 pt-1">
                    <strong>Agenda:</strong> {m.agenda}
                  </p>
                  {m.meetLink && (
                    <div className="text-xs text-indigo-700 font-semibold pt-0.5 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" /> Link:{' '}
                      <a href={m.meetLink} target="_blank" rel="noreferrer" className="underline truncate max-w-sm">
                        {m.meetLink}
                      </a>
                    </div>
                  )}
                  {m.anydeskAddress && (
                    <div className="text-xs text-rose-700 font-mono font-semibold pt-0.5">
                      AnyDesk: {m.anydeskAddress}
                    </div>
                  )}
                  {m.ultraviewerId && (
                    <div className="text-xs text-purple-700 font-mono font-semibold pt-0.5">
                      UltraViewer ID: {m.ultraviewerId} | Pass: {m.ultraviewerPassword || '-'}
                    </div>
                  )}
                  {m.supportNotes && (
                    <p className="text-xs text-emerald-700">
                      <strong>Support Note:</strong> {m.supportNotes}
                    </p>
                  )}
                </div>

                {m.status === 'APPROVED' &&
                  (role === 'SUPPORT' || role === 'ADMIN') && (() => {
                    const canComplete = isMeetTimePassed(m.scheduledDate, m.scheduledTime) || role === 'ADMIN';
                    return (
                      <div className="flex flex-col items-end gap-1 shrink-0 self-start md:self-center">
                        <button
                          type="button"
                          disabled={!canComplete}
                          onClick={() =>
                            onAction('COMPLETE_MEET', {
                              meetId: m.id,
                              supportNotes:
                                'Demo & technical walkthrough completed with client.',
                            })
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
                            canComplete
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80'
                          }`}
                          title={
                            canComplete
                              ? 'Click to complete & acknowledge this demo'
                              : `Meet ka time (${m.scheduledTime}) hone ke baad hi complete kar sakte hain`
                          }
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark Completed
                        </button>

                      </div>
                    );
                  })()}
              </div>
              );
            })}
          </div>
          );
        })()}
      </div>

      {/* Schedule Meet Modal */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Schedule Meet with Client"
        subtitle="Hot leads are prioritized. Sends alert to Account Manager, Admin & Support."
      >
        <form onSubmit={handleSubmitMeet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Client Lead (Hot Leads First)
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              required
            >
              {hotLeads.length > 0 && (
                <optgroup label="Hot Leads">
                  {hotLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      [HOT] {l.clientName} — {l.companyName}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Other Assigned Leads">
                {allLeads
                  .filter((l) => l.status !== 'HOT')
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.clientName} — {l.companyName} ({l.status})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Preferred Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Preferred Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Meeting Platform / Demo Mode
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="Google Meet">Google Meet (GMeet)</option>
              <option value="Zoom">Zoom Meet</option>
              <option value="Microsoft Teams">Microsoft Teams</option>
              <option value="UltraViewer">UltraViewer (Remote Screen Share)</option>
              <option value="AnyDesk">AnyDesk (Remote Screen Share)</option>
              <option value="Phone Conference">Phone Conference / Direct Call</option>
            </select>
          </div>

          {/* Conditional Input based on platform */}
          {(platform === 'Google Meet' || platform === 'Zoom' || platform === 'Microsoft Teams') && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-indigo-950">
                {platform} Link (URL) *
              </label>
              <input
                type="url"
                value={meetLink}
                onChange={(e) => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs"
                required
              />
            </div>
          )}

          {platform === 'UltraViewer' && (
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-purple-950">
                UltraViewer Connection Credentials
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    UltraViewer ID *
                  </label>
                  <input
                    type="text"
                    value={ultraviewerId}
                    onChange={(e) => setUltraviewerId(e.target.value)}
                    placeholder="e.g. 45 876 211"
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    UltraViewer Password *
                  </label>
                  <input
                    type="text"
                    value={ultraviewerPassword}
                    onChange={(e) => setUltraviewerPassword(e.target.value)}
                    placeholder="e.g. 8921"
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {platform === 'AnyDesk' && (
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-rose-950">
                AnyDesk Address / 9-Digit ID *
              </label>
              <input
                type="text"
                value={anydeskAddress}
                onChange={(e) => setAnydeskAddress(e.target.value)}
                placeholder="e.g. 123 456 789"
                className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs font-mono"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Discussion Agenda / Client Requirements
            </label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={3}
              placeholder="e.g., Technical demo of WhatsApp API, DLT template walkthrough..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
            >
              Send Meet Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Approve Meet Note Modal */}
      <Modal
        open={Boolean(approveTargetId)}
        onClose={() => setApproveTargetId(null)}
        title="Approve Meet & Update Support Schedule"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Support Assignment / Schedule Note
            </label>
            <textarea
              value={supportNotes}
              onChange={(e) => setSupportNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setApproveTargetId(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!approveTargetId) return;
                const ok = await onAction('APPROVE_MEET', {
                  meetId: approveTargetId,
                  supportNotes,
                });
                if (ok) setApproveTargetId(null);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
            >
              Confirm Approval
            </button>
          </div>
        </div>
      </Modal>

      {/* Propose Reschedule Modal */}
      <Modal
        open={Boolean(rescheduleTargetId)}
        onClose={() => setRescheduleTargetId(null)}
        title="Support Busy: Propose Reschedule Slot"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Agar Support Team scheduled slot par busy hai to alternative date and time select karein. Agent client se confirm karega to finalize hoga.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proposed Date
              </label>
              <input
                type="date"
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proposed Time
              </label>
              <input
                type="time"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Reschedule
            </label>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              rows={3}
              placeholder="e.g., Existing client onboarding demo in progress; available post 4:00 PM."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setRescheduleTargetId(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!rescheduleTargetId || !proposedDate || !proposedTime) return;
                const ok = await onAction('PROPOSE_RESCHEDULE_MEET', {
                  meetId: rescheduleTargetId,
                  proposedDate,
                  proposedTime,
                  rescheduleReason: rescheduleReason || 'Support team is occupied with another demo.',
                });
                if (ok) setRescheduleTargetId(null);
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold"
            >
              Submit Proposed Slot
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
