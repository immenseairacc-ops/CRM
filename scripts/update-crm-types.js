const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/types/crm.ts', 'utf8');

const target = `  services: string[];
  unitPrice: string;`;

const replacement = `  services: string[];
  serviceItems?: ServicePriceItem[];
  unitPrice: string;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('D:/sale-crm/src/types/crm.ts', code, 'utf8');
  console.log('Successfully added serviceItems to OnboardingRequest in crm.ts');
} else {
  console.error('Target not found in crm.ts');
  process.exit(1);
}
