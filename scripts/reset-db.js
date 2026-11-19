const fs = require('fs');

const dbPath = 'D:/sale-crm/data/crm-db.json';
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  db.leads = [];
  db.meetRequests = [];
  db.onboardingRequests = [];
  db.rechargeRequests = [];
  db.notifications = [];
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('CRM Database successfully cleaned! Leads, meets, onboarding, recharges, and notifications are now empty for fresh testing.');
} else {
  console.log('crm-db.json not found at ' + dbPath);
}
