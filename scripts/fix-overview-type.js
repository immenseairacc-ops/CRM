const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/OverviewSection.tsx', 'utf8');

const oldType = `      ownerRole?: string;
      ownerName?: string;
      tab: NavTab;
      hasJoin?: boolean;
      joinUrl?: string;`;

const newType = `      ownerRole?: string;
      ownerName?: string;
      isMyTask?: boolean;
      tab: NavTab;
      hasJoin?: boolean;
      joinUrl?: string;`;

if (code.includes(oldType)) {
  code = code.replace(oldType, newType);
  fs.writeFileSync('D:/sale-crm/src/components/OverviewSection.tsx', code, 'utf8');
  console.log('Successfully updated schedule item interface in OverviewSection');
} else {
  console.log('oldType not matched');
  process.exit(1);
}
