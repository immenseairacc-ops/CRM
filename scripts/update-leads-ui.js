const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/LeadsSection.tsx', 'utf8');

// 1. Assignable targets: allow agents + account managers
const oldAgentsDef = "const agents = db.users.filter((u) => u.role === 'AGENT');";
const newAgentsDef = `const agents = db.users.filter((u) => u.role === 'AGENT');
  const assignableUsers = db.users.filter((u) => u.role === 'AGENT' || u.role === 'ACCOUNT_MANAGER');`;

if (code.includes(oldAgentsDef)) {
  code = code.replace(oldAgentsDef, newAgentsDef);
  console.log('Replaced agents definition');
} else {
  console.log('agents definition not matched');
}

// 2. Open distribute modal default assignments: use assignableUsers
const oldOpenDist = `  const openDistributeModal = () => {
    const defaults: Record<string, number> = {};
    if (distMode === 'COUNT') {
      agents.forEach((a, i) => {
        defaults[a.id] = i === 0 ? Math.ceil(poolForDistribution.length / 2) : Math.floor(poolForDistribution.length / Math.max(1, agents.length));
      });
    } else {
      agents.forEach((a, i) => {
        defaults[a.id] = i === 0 ? 50 : i === 1 ? 30 : 20;
      });
    }
    setAllocations(defaults);
    setDistOpen(true);
  };`;

const newOpenDist = `  const openDistributeModal = () => {
    const defaults: Record<string, number> = {};
    const targetList = assignableUsers.length > 0 ? assignableUsers : agents;
    if (distMode === 'COUNT') {
      targetList.forEach((a, i) => {
        defaults[a.id] = i === 0 ? Math.ceil(poolForDistribution.length / 2) : Math.floor(poolForDistribution.length / Math.max(1, targetList.length));
      });
    } else {
      targetList.forEach((a, i) => {
        defaults[a.id] = i === 0 ? 50 : i === 1 ? 30 : 20;
      });
    }
    setAllocations(defaults);
    setDistOpen(true);
  };`;

if (code.includes(oldOpenDist)) {
  code = code.replace(oldOpenDist, newOpenDist);
  console.log('Replaced openDistributeModal');
} else {
  console.log('oldOpenDist not matched');
}

// 3. Update totalAllocationValue
const oldTotalAlloc = `  const totalAllocationValue = agents.reduce(
    (s, a) => s + (Number(allocations[a.id]) || 0),
    0
  );`;

const newTotalAlloc = `  const totalAllocationValue = assignableUsers.reduce(
    (s, a) => s + (Number(allocations[a.id]) || 0),
    0
  );`;

if (code.includes(oldTotalAlloc)) {
  code = code.replace(oldTotalAlloc, newTotalAlloc);
  console.log('Replaced totalAllocationValue');
} else {
  console.log('oldTotalAlloc not matched');
}

// 4. Update Distribute Modal list rendering
const oldDistList = `{agents.map((agent) => {
              const val = Number(allocations[agent.id]) || 0;`;

const newDistList = `{assignableUsers.map((agent) => {
              const val = Number(allocations[agent.id]) || 0;`;

if (code.includes(oldDistList)) {
  code = code.replace(oldDistList, newDistList);
  console.log('Replaced Distribute Modal list rendering');
} else {
  console.log('oldDistList not matched');
}

// 5. In Distribute Modal, show badge if agent is Account Manager
const oldDistItemTitle = `<div className="text-sm font-semibold text-slate-900">
                      {agent.name}
                    </div>`;

const newDistItemTitle = `<div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">{agent.name}</span>
                      <span className={\`px-1.5 py-0.2 rounded text-[10px] font-bold \${agent.role === 'ACCOUNT_MANAGER' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'}\`}>
                        {agent.role === 'ACCOUNT_MANAGER' ? 'Account Manager (TL)' : 'Sales Agent'}
                      </span>
                    </div>`;

if (code.includes(oldDistItemTitle)) {
  code = code.replace(oldDistItemTitle, newDistItemTitle);
  console.log('Replaced distItemTitle');
} else {
  console.log('oldDistItemTitle not matched');
}

// 6. Update Filter Bar with Segments & View Tabs
const oldFilterBar = `      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'NEW', 'HOT', 'WARM', 'COLD', 'ONBOARDED'] as const).map((st) => {
            const count =
              st === 'ALL'
                ? db.leads.filter((l) => l.status !== 'ONBOARDED').length
                : db.leads.filter((l) => l.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={\`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 \${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }\`}
              >
                {st === 'HOT' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/hot.png" alt="Hot" className="w-3.5 h-3.5 object-contain" />
                )}
                {st === 'WARM' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/warm.png" alt="Warm" className="w-3.5 h-3.5 object-contain" />
                )}
                {st === 'COLD' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/cold.png" alt="Cold" className="w-3.5 h-3.5 object-contain" />
                )}
                {st} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white"
            >
              <option value="ALL">All Agents & Unassigned</option>
              <option value="UNASSIGNED">
                Unassigned Only ({unassignedLeads.length})
              </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, company, phone..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>`;

const newFilterBar = `      {/* Manager Lead Segments: My Leads (AM Leads) vs Agent Leads (Team Leads) */}
      {isManager && (
        <div className="bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Lead View:
            </span>
            <button
              type="button"
              onClick={() => { setViewScope('ALL'); setAgentFilter('ALL'); }}
              className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 \${
                viewScope === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }\`}
            >
              <Users className="w-3.5 h-3.5" />
              All Leads ({db.leads.filter((l) => l.status !== 'ONBOARDED').length})
            </button>

            <button
              type="button"
              onClick={() => { setViewScope('MY'); setAgentFilter('ALL'); }}
              className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 \${
                viewScope === 'MY'
                  ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-300'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }\`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {role === 'ACCOUNT_MANAGER' ? 'My Leads (Account Manager)' : 'My Leads (Admin Direct)'} (
              {db.leads.filter((l) => l.assignedToAgentId === currentUser.id && l.status !== 'ONBOARDED').length})
            </button>

            <button
              type="button"
              onClick={() => { setViewScope('AGENT'); setAgentFilter('ALL'); }}
              className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 \${
                viewScope === 'AGENT'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
              }\`}
            >
              <Users className="w-3.5 h-3.5" />
              Agent Leads (Team Pipeline) (
              {db.leads.filter((l) => l.assignedToAgentId && l.assignedToAgentId !== currentUser.id && l.status !== 'ONBOARDED').length})
            </button>

            <button
              type="button"
              onClick={() => { setViewScope('UNASSIGNED'); setAgentFilter('UNASSIGNED'); }}
              className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 \${
                viewScope === 'UNASSIGNED'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }\`}
            >
              Unassigned ({unassignedLeads.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Filter By Person:</span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Assignees</option>
              <option value="MY">⭐ {currentUser.name} (My Direct Leads)</option>
              <option value="UNASSIGNED">Unassigned Only ({unassignedLeads.length})</option>
              <optgroup label="Sales Team Agents">
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Agent)
                  </option>
                ))}
              </optgroup>
              {db.users.filter((u) => u.role === 'ACCOUNT_MANAGER' && u.id !== currentUser.id).length > 0 && (
                <optgroup label="Account Managers">
                  {db.users
                    .filter((u) => u.role === 'ACCOUNT_MANAGER' && u.id !== currentUser.id)
                    .map((am) => (
                      <option key={am.id} value={am.id}>
                        {am.name} (Account Manager)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'NEW', 'HOT', 'WARM', 'COLD', 'ONBOARDED'] as const).map((st) => {
            const count =
              st === 'ALL'
                ? db.leads.filter((l) => l.status !== 'ONBOARDED').length
                : db.leads.filter((l) => l.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={\`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 \${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }\`}
              >
                {st === 'HOT' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/hot.png" alt="Hot" className="w-3.5 h-3.5 object-contain" />
                )}
                {st === 'WARM' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/warm.png" alt="Warm" className="w-3.5 h-3.5 object-contain" />
                )}
                {st === 'COLD' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/cold.png" alt="Cold" className="w-3.5 h-3.5 object-contain" />
                )}
                {st} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, company, phone..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>`;

if (code.includes(oldFilterBar)) {
  code = code.replace(oldFilterBar, newFilterBar);
  console.log('Replaced filter bar with Manager Lead Segments');
} else {
  console.log('oldFilterBar not matched');
}

// 7. Assigned Agent Column: Distinct badge if assigned to AM vs Agent
const oldAgentBadge = `<td className="py-3.5 px-4">
                      {lead.assignedToAgentName ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium">
                          {lead.assignedToAgentName}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium">
                          Unassigned
                        </span>
                      )}
                    </td>`;

const newAgentBadge = `<td className="py-3.5 px-4">
                      {lead.assignedToAgentName ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold \${
                              lead.assignedToAgentId === currentUser.id
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-800'
                            }\`}
                          >
                            {lead.assignedToAgentName}
                            {lead.assignedToAgentId === currentUser.id && (
                              <span className="text-[10px] text-purple-600 font-bold">(You)</span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {lead.assignedToAgentId === currentUser.id
                              ? (role === 'ACCOUNT_MANAGER' ? 'Account Manager Lead' : 'Admin Lead')
                              : 'Agent Lead'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                          Unassigned
                        </span>
                      )}
                    </td>`;

if (code.includes(oldAgentBadge)) {
  code = code.replace(oldAgentBadge, newAgentBadge);
  console.log('Replaced assigned agent badge in table');
} else {
  console.log('oldAgentBadge not matched');
}

fs.writeFileSync('D:/sale-crm/src/components/LeadsSection.tsx', code, 'utf8');
console.log('Finished updating LeadsSection!');
