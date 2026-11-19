const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/types/crm.ts', 'utf8');

const target = `  createdBy: string;
  createdAt: string;`;

const replacement = `  createdBy: string;
  creatorRole?: Role;
  createdAt: string;`;

code = code.replace(target, replacement);

fs.writeFileSync('D:/sale-crm/src/types/crm.ts', code, 'utf8');
console.log('Added creatorRole to ActivityLog in crm.ts');
