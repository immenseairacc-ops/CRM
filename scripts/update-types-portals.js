const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/types/crm.ts', 'utf8');

const target = `export type OnboardingStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED_FOR_SUPPORT'
  | 'ACCOUNT_CREATED'
  | 'REJECTED';`;

const replacement = `export type OnboardingStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED_FOR_SUPPORT'
  | 'ACCOUNT_CREATED'
  | 'REJECTED';

export interface ServicePortalCredential {
  serviceKey: 'SMS_RCS' | 'WHATSAPP' | 'IVR' | 'OBD' | 'EMAIL';
  serviceName: string;
  portalUrl: string;
  username: string;
  password?: string;
  configuredAt?: string;
  configuredBy?: string;
  supportNote?: string;
}`;

code = code.replace(target, replacement);

const targetOnb = `  credentialsSentDate?: string; // Date/Time when email was sent to Agent, AM, Admin`;

const replacementOnb = `  credentialsSentDate?: string; // Date/Time when email was sent to Agent, AM, Admin
  portalCredentials?: ServicePortalCredential[]; // Distinct credentials per service portal`;

code = code.replace(targetOnb, replacementOnb);

fs.writeFileSync('D:/sale-crm/src/types/crm.ts', code, 'utf8');
console.log('Successfully added ServicePortalCredential and portalCredentials to crm.ts');
