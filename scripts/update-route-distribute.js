const fs = require('fs');
let code = fs.readFileSync('D:/sale-crm/src/app/api/crm/route.ts', 'utf8');

const oldTarget = `        const validAllocations = allocations
          .map((a) => ({
            agent: db.users.find((u) => u.id === a.agentId && u.role === 'AGENT'),
            value: Math.max(0, Number(a.value) || 0),
          }))
          .filter((a) => a.agent && a.value > 0);`;

const newTarget = `        const validAllocations = allocations
          .map((a) => ({
            agent: db.users.find((u) => u.id === a.agentId && (u.role === 'AGENT' || u.role === 'ACCOUNT_MANAGER')),
            value: Math.max(0, Number(a.value) || 0),
          }))
          .filter((a) => a.agent && a.value > 0);`;

if (code.includes(oldTarget)) {
  code = code.replace(oldTarget, newTarget);
  fs.writeFileSync('D:/sale-crm/src/app/api/crm/route.ts', code, 'utf8');
  console.log('Successfully updated route.ts to allow distributing to Account Manager as well!');
} else {
  console.log('Target not found in route.ts');
  process.exit(1);
}
