const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/types/crm.ts', 'utf8');

const target = `  supportAccountNote?: string;
  supportCreatedBy?: string;
  supportCreatedAt?: string;`;

const replacement = `  supportAccountNote?: string;
  supportCreatedBy?: string;
  supportCreatedAt?: string;
  panelUrl?: string;            // Portal / Panel Login URL (e.g. https://portal.immenseair.in)
  panelPassword?: string;       // Generated Panel Password
  credentialsSentDate?: string; // Date/Time when email was sent to Agent, AM, Admin`;

code = code.replace(target, replacement);

fs.writeFileSync('D:/sale-crm/src/types/crm.ts', code, 'utf8');
console.log('Successfully added panelUrl, panelPassword, credentialsSentDate to OnboardingRequest in crm.ts');
