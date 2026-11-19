const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/lib/db.ts', 'utf8');

// Update SUPPORT sanitization in db.ts:
// Support receives:
// - Account Username
// - Agent Name
// - Services to provision
// - WhatsApp Marketing Rate & Utility Rate (if configured)
// - OBD Rate (if configured)
// Stripped: Total Deal Amount, Billing Entity, Billing Type, paymentType, taxType, gstNumber, postpaidCycle, AND general unitPrice / other service rates.

const oldSanitize = `    const maskedOnboarding: OnboardingRequest[] = db.onboardingRequests
      .filter(
        (o) =>
          o.status === 'APPROVED_FOR_SUPPORT' || o.status === 'ACCOUNT_CREATED'
      )
      .map((o) => {
        const copy = { ...o };
        delete copy.totalDealAmount;
        delete copy.billingEntity;
        delete copy.billingType;
        delete copy.paymentType;
        delete copy.taxType;
        delete copy.gstNumber;
        delete copy.postpaidCycle;
        return copy;
      });`;

const newSanitize = `    const maskedOnboarding: OnboardingRequest[] = db.onboardingRequests
      .filter(
        (o) =>
          o.status === 'APPROVED_FOR_SUPPORT' || o.status === 'ACCOUNT_CREATED'
      )
      .map((o) => {
        const copy = { ...o };
        delete copy.totalDealAmount;
        delete copy.billingEntity;
        delete copy.billingType;
        delete copy.paymentType;
        delete copy.taxType;
        delete copy.gstNumber;
        delete copy.postpaidCycle;
        // Support only receives WhatsApp & OBD panel configuration rates:
        // Do not leak overall deal rate string or other service rates.
        delete copy.unitPrice;
        delete copy.serviceItems;
        return copy;
      });`;

code = code.replace(oldSanitize, newSanitize);

fs.writeFileSync('D:/sale-crm/src/lib/db.ts', code, 'utf8');
console.log('Successfully updated sanitizeForRole in db.ts!');
