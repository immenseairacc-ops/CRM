const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/app/api/crm/route.ts', 'utf8');

const oldTarget = `        const totalDealAmount = Number(payload.totalDealAmount) || 0;
        const serviceItems = Array.isArray(payload.serviceItems) ? payload.serviceItems : undefined;`;

const newTarget = `        const totalDealAmount = Number(payload.totalDealAmount) || 0;
        const serviceItems = Array.isArray(payload.serviceItems) ? payload.serviceItems : undefined;
        const whatsappMarketingRate = payload.whatsappMarketingRate !== undefined ? Number(payload.whatsappMarketingRate) : undefined;
        const whatsappUtilityRate = payload.whatsappUtilityRate !== undefined ? Number(payload.whatsappUtilityRate) : undefined;
        const obdRate = payload.obdRate !== undefined ? Number(payload.obdRate) : undefined;`;

code = code.replace(oldTarget, newTarget);

const oldInsert = `          services,
          serviceItems,
          unitPrice,`;

const newInsert = `          services,
          serviceItems,
          whatsappMarketingRate,
          whatsappUtilityRate,
          obdRate,
          unitPrice,`;

code = code.replace(oldInsert, newInsert);

fs.writeFileSync('D:/sale-crm/src/app/api/crm/route.ts', code, 'utf8');
console.log('Successfully updated route.ts with whatsappMarketingRate, whatsappUtilityRate, obdRate');
