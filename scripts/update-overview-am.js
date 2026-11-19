const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/OverviewSection.tsx', 'utf8');

// 1. Add state for amScheduleScopeFilter
const oldAdminFilterState = `  // Admin filter state for Today's Schedule & Reminders
  const [adminScheduleRoleFilter, setAdminScheduleRoleFilter] = useState<
    'ALL' | 'AGENT' | 'ACCOUNT_MANAGER' | 'SUPPORT' | 'BILLING'
  >('ALL');
  const [adminScheduleUserFilter, setAdminScheduleUserFilter] = useState<string>('ALL');`;

const newAdminFilterState = `  // Admin filter state for Today's Schedule & Reminders
  const [adminScheduleRoleFilter, setAdminScheduleRoleFilter] = useState<
    'ALL' | 'AGENT' | 'ACCOUNT_MANAGER' | 'SUPPORT' | 'BILLING'
  >('ALL');
  const [adminScheduleUserFilter, setAdminScheduleUserFilter] = useState<string>('ALL');

  // Account Manager filter state for Today's Schedule & Reminders (My Schedule vs Team Agent Schedule)
  const [amScheduleScopeFilter, setAmScheduleScopeFilter] = useState<'ALL' | 'MY' | 'AGENT'>('ALL');
  const [amScheduleAgentFilter, setAmScheduleAgentFilter] = useState<string>('ALL');`;

if (code.includes(oldAdminFilterState)) {
  code = code.replace(oldAdminFilterState, newAdminFilterState);
  console.log('Added AM schedule filter state');
} else {
  console.log('oldAdminFilterState not found');
  process.exit(1);
}

// 2. Update ACCOUNT_MANAGER scheduleItems generation to tag owner and differentiate
const oldAmBlock = `    // 4. ACCOUNT MANAGER (TL) ROLE SPECIFIC SCHEDULE
    else if (role === 'ACCOUNT_MANAGER') {
      // GMeet / Demos scheduled
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          items.push({
            id: \`am-meet-\${m.id}\`,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} — \${m.companyName}\`,
            subtitle: \`\${m.agenda} (Agent: \${m.agentName})\`,
            badge: m.status === 'APPROVED' ? 'GMeet / Demo' : 'Need Approval',
            kind: 'MEET',
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
          items.push({
            id: \`am-rem-\${l.id}\`,
            time: formatTimeOnly(l.reminder!.datetime) || 'Today',
            title: isSiteVisit
              ? \`Site Visit — \${l.companyName}\`
              : \`Client Call / Quotation Followup — \${l.companyName}\`,
            subtitle: \`\${note} (\${l.clientName} • Agent: \${l.assignedToAgentName || 'Unassigned'})\`,
            badge: isSiteVisit ? 'Site Visit' : 'Quotation / Call',
            kind: isSiteVisit ? 'VISIT' : 'REMINDER',
            tab: 'reminders',
          });
        });
    }`;

const newAmBlock = `    // 4. ACCOUNT MANAGER (TL) ROLE SPECIFIC SCHEDULE: My Tasks vs Agent Tasks
    else if (role === 'ACCOUNT_MANAGER') {
      // GMeet / Demos scheduled
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          const isMyMeet = m.agentId === currentUser.id || m.agentName === currentUser.name;
          items.push({
            id: \`am-meet-\${m.id}\`,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} — \${m.companyName}\`,
            subtitle: \`\${m.agenda} (\${isMyMeet ? 'Your Direct Demo' : \`Agent: \${m.agentName}\`})\`,
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
            id: \`am-rem-\${l.id}\`,
            time: formatTimeOnly(l.reminder!.datetime) || 'Today',
            title: isSiteVisit
              ? \`Site Visit — \${l.companyName}\`
              : isQuote
              ? \`Quotation Followup — \${l.companyName}\`
              : \`Client Call — \${l.companyName}\`,
            subtitle: \`\${note} (\${l.clientName} • \${isMyLead ? '⭐ My Direct Lead' : \`Agent: \${l.assignedToAgentName || 'Unassigned'}\`})\`,
            badge: isMyLead ? '⭐ My Task' : (isSiteVisit ? 'Agent Visit' : isQuote ? 'Agent Quote' : 'Agent Call'),
            kind: isSiteVisit ? 'VISIT' : 'REMINDER',
            ownerRole: isMyLead ? 'ACCOUNT_MANAGER' : 'AGENT',
            ownerName: l.assignedToAgentName || 'Unassigned',
            isMyTask: isMyLead,
            tab: 'reminders',
          });
        });
    }`;

if (code.includes(oldAmBlock)) {
  code = code.replace(oldAmBlock, newAmBlock);
  console.log('Replaced AM scheduleItems logic');
} else {
  console.log('oldAmBlock not found');
  process.exit(1);
}

// 3. Apply AM filter at return of scheduleItems
const oldFilterReturn = `    // If Admin, apply active role & user filters
    if (role === 'ADMIN') {
      let filtered = items;
      if (adminScheduleRoleFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.ownerRole === adminScheduleRoleFilter);
      }
      if (adminScheduleUserFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.ownerName === adminScheduleUserFilter);
      }
      return filtered.slice(0, 8);
    }

    return items.slice(0, 5);
  }, [
    role,
    adminScheduleRoleFilter,
    adminScheduleUserFilter,
    currentUser.id,
    currentUser.name,
    db.meetRequests,
    db.onboardingRequests,
    db.rechargeRequests,
    db.leads,
  ]);`;

const newFilterReturn = `    // If Admin, apply active role & user filters
    if (role === 'ADMIN') {
      let filtered = items;
      if (adminScheduleRoleFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.ownerRole === adminScheduleRoleFilter);
      }
      if (adminScheduleUserFilter !== 'ALL') {
        filtered = filtered.filter((i) => i.ownerName === adminScheduleUserFilter);
      }
      return filtered.slice(0, 8);
    }

    // If Account Manager, apply My Schedule vs Team Agent Schedule filters
    if (role === 'ACCOUNT_MANAGER') {
      let filtered = items;
      if (amScheduleScopeFilter === 'MY') {
        filtered = filtered.filter((i: any) => i.isMyTask);
      } else if (amScheduleScopeFilter === 'AGENT') {
        filtered = filtered.filter((i: any) => !i.isMyTask);
      }
      if (amScheduleAgentFilter !== 'ALL') {
        filtered = filtered.filter((i: any) => i.ownerName === amScheduleAgentFilter);
      }
      return filtered.slice(0, 8);
    }

    return items.slice(0, 5);
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
  ]);`;

if (code.includes(oldFilterReturn)) {
  code = code.replace(oldFilterReturn, newFilterReturn);
  console.log('Replaced filter return logic');
} else {
  console.log('oldFilterReturn not found');
  process.exit(1);
}

// 4. In Overview JSX, render filter controls for Account Manager as well!
const oldAdminJsxFilter = `          {/* Admin Role & User Filters */}
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
          )}`;

const newAdminJsxFilter = `          {/* Admin Role & User Filters */}
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
          )}`;

if (code.includes(oldAdminJsxFilter)) {
  code = code.replace(oldAdminJsxFilter, newAdminJsxFilter);
  console.log('Replaced Admin & AM JSX filters in OverviewSection');
} else {
  console.log('oldAdminJsxFilter not found');
  process.exit(1);
}

fs.writeFileSync('D:/sale-crm/src/components/OverviewSection.tsx', code, 'utf8');
console.log('Finished updating OverviewSection!');
