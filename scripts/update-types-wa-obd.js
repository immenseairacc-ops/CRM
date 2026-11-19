const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/types/crm.ts', 'utf8');

const target = `  services: string[];
  serviceItems?: ServicePriceItem[];
  unitPrice: string;`;

const replacement = `  services: string[];
  serviceItems?: ServicePriceItem[];
  whatsappMarketingRate?: number; // Rate for WhatsApp Marketing (per msg)
  whatsappUtilityRate?: number;   // Rate for WhatsApp Utility (per msg)
  obdRate?: number;               // Rate for OBD / Voice (per call/pulse)
  unitPrice: string;`;

code = code.replace(target, replacement);

fs.writeFileSync('D:/sale-crm/src/types/crm.ts', code, 'utf8');
console.log('Successfully added whatsapp & obd rate fields to OnboardingRequest in crm.ts');
