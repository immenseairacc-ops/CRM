'use client';

import React, { useState } from 'react';
import {
  AlarmClock,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Phone,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import { CrmDatabase, Lead, User } from '@/types/crm';
import { formatDateTime, Modal, StatusBadge } from './ui';

export function RemindersSection({
  db,
  currentUser,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const [openWorkModal, setOpenWorkModal] = useState(false);
  const [workTitle, setWorkTitle] = useState('');
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [workTime, setWorkTime] = useState('11:00');
  const [workNote, setWorkNote] = useState('');

  const myPersonalReminders = (db.personalReminders || []).filter(
    (p) => currentUser.role === 'ADMIN' || p.userId === currentUser.id
  );
  const activePersonalReminders = myPersonalReminders.filter((p) => !p.completed);

  const handleAddWorkReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTitle.trim() || !workDate) return;
    const ok = await onAction('ADD_PERSONAL_REMINDER', {
      title: workTitle.trim(),
      datetime: `${workDate}T${workTime || '11:00'}:00`,
      note: workNote.trim(),
    });
    if (ok) {
      setWorkTitle('');
      setWorkNote('');
      setOpenWorkModal(false);
    }
  };

  const leadsWithReminders = db.leads.filter((l) => l.reminder);
  const nowMs = Date.now();

  const dueNow = leadsWithReminders.filter(
    (l) => l.reminder && !l.reminder.completed && new Date(l.reminder.datetime).getTime() <= nowMs
  );
  const upcoming = leadsWithReminders.filter(
    (l) => l.reminder && !l.reminder.completed && new Date(l.reminder.datetime).getTime() > nowMs
  );
  const completed = leadsWithReminders.filter((l) => l.reminder?.completed);

  const handleQuickDemoReminder = async () => {
    const candidate: Lead | undefined = db.leads[0];
    if (!candidate) return;
    const in5Seconds = new Date(Date.now() + 5000).toISOString();
    await onAction('SET_REMINDER', {
      leadId: candidate.id,
      datetime: in5Seconds,
      note: `Live Demo Callback: Follow up with ${candidate.clientName} (${candidate.companyName})`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Follow-up Callback Reminders
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            When a client asks to call back later, scheduled reminders trigger an instant popup + sound notification at the exact time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setOpenWorkModal(true)}
            className="px-4 py-2 rounded-xl bg-[#F2591F] hover:bg-[#d94a14] text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Work Reminder
          </button>

          {currentUser.role === 'AGENT' && db.leads.length > 0 && (
            <button
              onClick={handleQuickDemoReminder}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Test 5-Sec Live Reminder
            </button>
          )}
        </div>
      </div>

      {/* Personal / Account Work Reminders (Also synced to Today's Schedule & Reminders) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0A1B3F] flex items-center gap-2">
            <AlarmClock className="w-4 h-4 text-[#F2591F]" />
            Work &amp; Task Reminders ({activePersonalReminders.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Automatically synced to Today&apos;s Schedule &amp; Reminders
          </span>
        </div>

        {activePersonalReminders.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No pending work reminders. Click <strong>+ Add Work Reminder</strong> to save any task with date &amp; time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activePersonalReminders.map((p) => {
              const isDue = new Date(p.datetime).getTime() <= nowMs;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                    isDue ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{p.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isDue ? 'bg-rose-600 text-white' : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {isDue ? 'DUE NOW' : formatDateTime(p.datetime)}
                      </span>
                    </div>
                    {p.note && <p className="text-[11px] text-slate-600">{p.note}</p>}
                    <div className="text-[10px] text-slate-400">
                      By {p.userName} • {formatDateTime(p.datetime)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAction('COMPLETE_PERSONAL_REMINDER', { reminderId: p.id })}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Done
                    </button>
                    <button
                      type="button"
                      onClick={() => onAction('DELETE_PERSONAL_REMINDER', { reminderId: p.id })}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Due Now */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-rose-700 flex items-center gap-2">
          <BellRing className="w-4 h-4" />
          Due / Overdue Callbacks ({dueNow.length})
        </h3>
        {dueNow.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
            No overdue follow-up reminders right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dueNow.map((lead) => (
              <div
                key={lead.id}
                className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {lead.clientName}{' '}
                      <span className="text-slate-500 font-normal">
                        • {lead.companyName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                      <Phone className="w-3 h-3" /> {lead.phone}
                    </div>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
                <p className="mt-2.5 text-sm text-rose-900 bg-white/80 rounded-xl p-2.5 border border-rose-100">
                  {lead.reminder?.note}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-rose-700 flex items-center gap-1">
                    <AlarmClock className="w-3.5 h-3.5" />
                    Due: {formatDateTime(lead.reminder?.datetime)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onAction('SNOOZE_REMINDER', { leadId: lead.id, minutes: 10 })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                    >
                      Snooze +10m
                    </button>
                    <button
                      onClick={() =>
                        onAction('COMPLETE_REMINDER', { leadId: lead.id })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
                    >
                      Mark Called / Done
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          Upcoming Reminders ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
            No upcoming reminders scheduled. Open any lead to set a callback time.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((lead) => (
              <div
                key={lead.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {lead.clientName}{' '}
                      <span className="text-slate-500 font-normal">
                        • {lead.companyName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Agent: {lead.assignedToAgentName || 'Unassigned'} • {lead.phone}
                    </div>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
                <p className="mt-2.5 text-sm text-slate-700 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  {lead.reminder?.note}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-indigo-700 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(lead.reminder?.datetime)}
                  </span>
                  <button
                    onClick={() =>
                      onAction('COMPLETE_REMINDER', { leadId: lead.id })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-medium transition"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Completed Reminders ({completed.length})
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {completed.map((lead) => (
              <div
                key={lead.id}
                className="p-3.5 flex items-center justify-between text-xs text-slate-600"
              >
                <div>
                  <span className="font-semibold text-slate-900">
                    {lead.clientName}
                  </span>{' '}
                  ({lead.companyName}) — {lead.reminder?.note}
                </div>
                <span className="text-emerald-700 font-semibold">Done</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Add Work Reminder Modal */}
      <Modal
        open={openWorkModal}
        onClose={() => setOpenWorkModal(false)}
        title="Add Work / Task Reminder"
        subtitle="Set date & time so it shows in Today's Schedule & Reminders."
      >
        <form onSubmit={handleAddWorkReminder} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Work / Task Title *
            </label>
            <input
              required
              value={workTitle}
              onChange={(e) => setWorkTitle(e.target.value)}
              placeholder="e.g., Send DLT template to client / Check GST invoice"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={workTime}
                onChange={(e) => setWorkTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              rows={2}
              value={workNote}
              onChange={(e) => setWorkNote(e.target.value)}
              placeholder="Any extra details..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpenWorkModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#F2591F] hover:bg-[#d94a14] text-white text-xs font-bold"
            >
              Save Work Reminder
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
