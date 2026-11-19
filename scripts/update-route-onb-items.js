const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/app/api/crm/route.ts', 'utf8');

const oldTarget = `        const totalDealAmount = Number(payload.totalDealAmount) || 0;
        const billingType = (payload.billingType || payload.paymentType || 'PREPAID') as BillingType;`;

const newTarget = `        const totalDealAmount = Number(payload.totalDealAmount) || 0;
        const serviceItems = Array.isArray(payload.serviceItems) ? payload.serviceItems : undefined;
        const billingType = (payload.billingType || payload.paymentType || 'PREPAID') as BillingType;`;

code = code.replace(oldTarget, newTarget);

const oldOnbInsert = `          services,
          unitPrice,`;

const newOnbInsert = `          services,
          serviceItems,
          unitPrice,`;

code = code.replace(oldOnbInsert, newOnbInsert);

fs.writeFileSync('D:/sale-crm/src/app/api/crm/route.ts', code, 'utf8');
console.log('Successfully updated CREATE_ONBOARDING in route.ts');
