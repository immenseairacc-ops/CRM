const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/app/api/crm/route.ts', 'utf8');

// We want to add creatorRole: actorRole to all log creations in route.ts so the role is always stored
code = code.replace(
  /createdBy: actor\.name,/g,
  'createdBy: actor.name,\n            creatorRole: actorRole,'
);

fs.writeFileSync('D:/sale-crm/src/app/api/crm/route.ts', code, 'utf8');
console.log('Successfully stamped creatorRole on all ActivityLogs in route.ts');
