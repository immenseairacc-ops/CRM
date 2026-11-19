const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/MeetsSection.tsx', 'utf8');

const target = `                        {!canComplete && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> \${m.scheduledTime} ke baad enable hoga
                          </span>
                        )}`;

if (code.includes(target)) {
  code = code.replace(target, '');
  fs.writeFileSync('D:/sale-crm/src/components/MeetsSection.tsx', code, 'utf8');
  console.log('Successfully removed the badge from MeetsSection.tsx!');
} else {
  console.error('Target not found in MeetsSection.tsx');
  process.exit(1);
}
