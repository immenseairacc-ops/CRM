const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/LeadsSection.tsx', 'utf8');

// 1. Add viewScope state
const oldState = "const [agentFilter, setAgentFilter] = useState<string>('ALL');";
const newState = "const [agentFilter, setAgentFilter] = useState<string>('ALL');\n  const [viewScope, setViewScope] = useState<'ALL' | 'MY' | 'AGENT' | 'UNASSIGNED'>('ALL');";

if (code.includes(oldState)) {
  code = code.replace(oldState, newState);
  console.log('Added viewScope state');
} else {
  console.error('oldState not found!');
  process.exit(1);
}

// 2. Update filteredLeads filtering
const oldFilter = `      if (agentFilter === 'UNASSIGNED' && l.assignedToAgentId) return false;
      if (
        agentFilter !== 'ALL' &&
        agentFilter !== 'UNASSIGNED' &&
        l.assignedToAgentId !== agentFilter
      ) {
        return false;
      }`;

const newFilter = `      // View scope for Manager / AM
      if (viewScope === 'MY' && l.assignedToAgentId !== currentUser.id) return false;
      if (viewScope === 'AGENT' && (!l.assignedToAgentId || l.assignedToAgentId === currentUser.id)) return false;
      if (viewScope === 'UNASSIGNED' && l.assignedToAgentId) return false;

      // Specific agent dropdown filter
      if (agentFilter === 'UNASSIGNED' && l.assignedToAgentId) return false;
      if (agentFilter === 'MY' && l.assignedToAgentId !== currentUser.id) return false;
      if (
        agentFilter !== 'ALL' &&
        agentFilter !== 'MY' &&
        agentFilter !== 'UNASSIGNED' &&
        l.assignedToAgentId !== agentFilter
      ) {
        return false;
      }`;

if (code.includes(oldFilter)) {
  code = code.replace(oldFilter, newFilter);
  console.log('Updated filteredLeads');
} else {
  console.error('oldFilter not found');
  process.exit(1);
}

// Update dependency array for filteredLeads
const oldDeps = '}, [db.leads, statusFilter, agentFilter, search]);';
const newDeps = '}, [db.leads, statusFilter, agentFilter, viewScope, currentUser.id, search]);';
if (code.includes(oldDeps)) {
  code = code.replace(oldDeps, newDeps);
  console.log('Updated filteredLeads deps');
} else {
  console.error('oldDeps not found');
  process.exit(1);
}

fs.writeFileSync('D:/sale-crm/src/components/LeadsSection.tsx', code, 'utf8');
console.log('Successfully updated LeadsSection with viewScope!');
