'use client';

import React, { useState } from 'react';
import {
  Building2,
  Check,
  Edit3,
  Layers,
  Lock,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { CrmDatabase, Role, Team, User } from '@/types/crm';
import { Modal, RoleBadge } from './ui';

export function TeamManagementSection({
  db,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const teams: Team[] = db.teams || [
    { id: 'team-a', name: 'Team A (Core Sales & Ops)', createdAt: '' },
  ];
  const managers = db.users.filter((u) => u.role === 'ACCOUNT_MANAGER');

  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  // Create Team Modal State
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Create User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('123456');
  const [uRole, setURole] = useState<Role>('AGENT');
  const [uPhone, setUPhone] = useState('');
  const [uDesignation, setUDesignation] = useState('');
  const [uTeamId, setUTeamId] = useState(teams[0]?.id || 'team-a');
  const [uManagerId, setUManagerId] = useState(managers[0]?.id || '');

  // Edit / Map User Modal State
  const [editUserTarget, setEditUserTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [editManagerId, setEditManagerId] = useState('');
  const [editRole, setEditRole] = useState<Role>('AGENT');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const getTeamName = (teamId?: string) =>
    teams.find((t) => t.id === teamId)?.name || 'All Teams (Admin)';

  const getManagerName = (managerId?: string) =>
    db.users.find((u) => u.id === managerId)?.name || '—';

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onAction('ADMIN_CREATE_TEAM', {
      name: newTeamName,
      description: newTeamDesc,
    });
    if (ok) {
      setNewTeamName('');
      setNewTeamDesc('');
      setTeamModalOpen(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onAction('ADMIN_CREATE_USER', {
      name: uName,
      email: uEmail,
      password: uPassword,
      role: uRole,
      phone: uPhone,
      designation: uDesignation,
      teamId: uRole === 'ADMIN' ? undefined : uTeamId,
      managerId:
        uRole === 'ADMIN' || uRole === 'ACCOUNT_MANAGER'
          ? undefined
          : uManagerId || undefined,
    });
    if (ok) {
      setUName('');
      setUEmail('');
      setUPassword('123456');
      setUPhone('');
      setUDesignation('');
      setUserModalOpen(false);
    }
  };

  const openEditMapping = (user: User) => {
    setEditUserTarget(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditTeamId(user.teamId || teams[0]?.id || 'team-a');
    setEditManagerId(user.managerId || '');
    setEditPassword(user.password || '123456');
    setEditIsActive(user.isActive !== false);
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserTarget) return;
    const ok = await onAction('ADMIN_UPDATE_USER_MAPPING', {
      targetUserId: editUserTarget.id,
      name: editName,
      email: editEmail,
      role: editRole,
      teamId: editRole === 'ADMIN' ? undefined : editTeamId,
      managerId:
        editRole === 'ADMIN' || editRole === 'ACCOUNT_MANAGER'
          ? undefined
          : editManagerId || undefined,
      password: editPassword || undefined,
      isActive: editIsActive,
    });
    if (ok) setEditUserTarget(null);
  };

  const filteredUsers = db.users.filter((u) => {
    if (teamFilter === 'ALL') return true;
    return u.teamId === teamFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            Admin Team Isolation, Accounts &amp; Agent Mapping
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create isolated Teams (Team A, Team B, Team C), create AM / Agent / Support / Billing accounts, and map Agents to their Account Manager. Each team&apos;s data stays 100% separate; Admin sees everything.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTeamModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            + Create New Team
          </button>
          <button
            type="button"
            onClick={() => setUserModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Create Account (AM / Agent / Support / Billing)
          </button>
        </div>
      </div>

      {/* Teams Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {teams.map((t) => {
          const members = db.users.filter((u) => u.teamId === t.id);
          const amCount = members.filter((u) => u.role === 'ACCOUNT_MANAGER').length;
          const agentCount = members.filter((u) => u.role === 'AGENT').length;
          const supportCount = members.filter((u) => u.role === 'SUPPORT').length;
          const billingCount = members.filter((u) => u.role === 'BILLING').length;
          const isSelected = teamFilter === t.id;

          return (
            <div
              key={t.id}
              onClick={() => setTeamFilter(isSelected ? 'ALL' : t.id)}
              className={`cursor-pointer p-4 rounded-2xl border transition ${
                isSelected
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/20'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  {t.name}
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                  Isolated Data
                </span>
              </div>
              {t.description && (
                <p className="text-[11px] text-slate-500 mt-1">{t.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  AM: {amCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  Agents: {agentCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                  Support: {supportCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800">
                  Billing: {billingCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Directory & Agent Mapping Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            All Team Accounts &amp; Mapping ({filteredUsers.length})
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTeamFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold ${
                teamFilter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Teams ({db.users.length})
            </button>
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTeamFilter(t.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  teamFilter === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">User &amp; Login Email</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4">Assigned Team</th>
                <th className="py-3 px-4">Mapped Account Manager</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Map / Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center">
                        {u.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-bold border border-slate-200">
                      {u.password || '123456'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {u.role === 'ADMIN' ? (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold">
                        All Teams (Global Admin)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold">
                        {getTeamName(u.teamId)}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                    {u.role === 'ADMIN' || u.role === 'ACCOUNT_MANAGER'
                      ? '—'
                      : getManagerName(u.managerId)}
                  </td>

                  <td className="py-3.5 px-4">
                    {u.isActive !== false ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                        Deactivated
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEditMapping(u)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold inline-flex items-center gap-1 border border-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Map Team / Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Team Modal */}
      <Modal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        title="Create New Isolated Team"
        subtitle="Each team has its own Account Manager, Agents, Support & Billing with zero data mixing."
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Team Name *
            </label>
            <input
              required
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g., Team B (Enterprise West)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <input
              value={newTeamDesc}
              onChange={(e) => setNewTeamDesc(e.target.value)}
              placeholder="e.g., Dedicated team for Delhi / Enterprise clients"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTeamModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Create Team
            </button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Create New CRM Account"
        subtitle="Create Account Manager, Sales Agent, Support, or Billing login and map to a Team."
      >
        <form onSubmit={handleCreateUser} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                required
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                placeholder="e.g., Rohit Verma"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role *
              </label>
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
              >
                <option value="ACCOUNT_MANAGER">Account Manager</option>
                <option value="AGENT">Sales Agent</option>
                <option value="SUPPORT">Support Engineer</option>
                <option value="BILLING">Billing / Accounts</option>
                <option value="ADMIN">Admin (All Teams)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Login Email *
              </label>
              <input
                type="email"
                required
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                placeholder="e.g., rohit.b@immenseair.in"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Login Password *
              </label>
              <input
                type="text"
                required
                value={uPassword}
                onChange={(e) => setUPassword(e.target.value)}
                placeholder="Set password"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>
          </div>

          {uRole !== 'ADMIN' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div>
                <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                  Assign to Team *
                </label>
                <select
                  value={uTeamId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setUTeamId(tid);
                    const teamAm = managers.find((m) => m.teamId === tid);
                    if (teamAm) setUManagerId(teamAm.id);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs font-bold"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {uRole !== 'ACCOUNT_MANAGER' && (
                <div>
                  <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                    Map to Account Manager
                  </label>
                  <select
                    value={uManagerId}
                    onChange={(e) => setUManagerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs font-bold"
                  >
                    <option value="">-- Select Account Manager --</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({getTeamName(m.teamId)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                value={uPhone}
                onChange={(e) => setUPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation (Optional)
              </label>
              <input
                value={uDesignation}
                onChange={(e) => setUDesignation(e.target.value)}
                placeholder="e.g., Sales Executive"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit / Map Team & Manager Modal */}
      <Modal
        open={Boolean(editUserTarget)}
        onClose={() => setEditUserTarget(null)}
        title={`Map Team & Settings: ${editUserTarget?.name || ''}`}
        subtitle={editUserTarget?.email || ''}
      >
        {editUserTarget && (
          <form onSubmit={handleSaveMapping} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                >
                  <option value="ACCOUNT_MANAGER">Account Manager</option>
                  <option value="AGENT">Sales Agent</option>
                  <option value="SUPPORT">Support Engineer</option>
                  <option value="BILLING">Billing / Accounts</option>
                  <option value="ADMIN">Admin (All Teams)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  value={editIsActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setEditIsActive(e.target.value === 'ACTIVE')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                >
                  <option value="ACTIVE">Active (Can Login)</option>
                  <option value="INACTIVE">Deactivated (Blocked)</option>
                </select>
              </div>
            </div>

            {editRole !== 'ADMIN' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                <div>
                  <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                    Assigned Team *
                  </label>
                  <select
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs font-bold"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {editRole !== 'ACCOUNT_MANAGER' && (
                  <div>
                    <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                      Mapped Account Manager
                    </label>
                    <select
                      value={editManagerId}
                      onChange={(e) => setEditManagerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs font-bold"
                    >
                      <option value="">-- Select Account Manager --</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({getTeamName(m.teamId)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Reset Password (Leave blank to keep current)
              </label>
              <input
                type="text"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Enter new password if resetting"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditUserTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Save Mapping
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
