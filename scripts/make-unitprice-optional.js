const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/types/crm.ts', 'utf8');

code = code.replace(
  '  unitPrice: string;',
  '  unitPrice?: string;'
);

fs.writeFileSync('D:/sale-crm/src/types/crm.ts', code, 'utf8');
console.log('Made unitPrice optional in OnboardingRequest in crm.ts');
