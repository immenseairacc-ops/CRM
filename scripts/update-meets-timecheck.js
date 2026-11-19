const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/MeetsSection.tsx', 'utf8');

// 1. Helper function to check if meet time has arrived
const helperFunction = `
function isMeetTimePassed(scheduledDate?: string, scheduledTime?: string): boolean {
  if (!scheduledDate || !scheduledTime) return false;
  try {
    const meetDateTime = new Date(\`\${scheduledDate}T\${scheduledTime}:00\`);
    const now = new Date();
    return now.getTime() >= meetDateTime.getTime();
  } catch {
    return false;
  }
}
`;

// Insert helperFunction right before function PlatformBadgeButton
code = code.replace('function PlatformBadgeButton', helperFunction + '\nfunction PlatformBadgeButton');

// 2. Update the Mark Meet Completed button in approvedSchedule table
const oldCompleteButton = `                {m.status === 'APPROVED' &&
                  (role === 'SUPPORT' || role === 'ADMIN') && (
                    <button
                      onClick={() =>
                        onAction('COMPLETE_MEET', {
                          meetId: m.id,
                          supportNotes:
                            'Demo & technical walkthrough completed with client.',
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap self-start md:self-center"
                    >
                      Mark Meet Completed
                    </button>
                  )}`;

const newCompleteButton = `                {m.status === 'APPROVED' &&
                  (role === 'SUPPORT' || role === 'ADMIN') && (() => {
                    const canComplete = isMeetTimePassed(m.scheduledDate, m.scheduledTime) || role === 'ADMIN';
                    return (
                      <div className="flex flex-col items-end gap-1 shrink-0 self-start md:self-center">
                        <button
                          type="button"
                          disabled={!canComplete}
                          onClick={() =>
                            onAction('COMPLETE_MEET', {
                              meetId: m.id,
                              supportNotes:
                                'Demo & technical walkthrough completed with client.',
                            })
                          }
                          className={\`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition \${
                            canComplete
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-80'
                          }\`}
                          title={
                            canComplete
                              ? 'Click to complete & acknowledge this demo'
                              : \`Meet ka time (\${m.scheduledTime}) hone ke baad hi complete kar sakte hain\`
                          }
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark Completed
                        </button>
                        {!canComplete && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> \${m.scheduledTime} ke baad enable hoga
                          </span>
                        )}
                      </div>
                    );
                  })()}`;

if (code.includes(oldCompleteButton)) {
  code = code.replace(oldCompleteButton, newCompleteButton);
  console.log('Replaced complete button in MeetsSection');
} else {
  console.error('oldCompleteButton not matched');
  process.exit(1);
}

fs.writeFileSync('D:/sale-crm/src/components/MeetsSection.tsx', code, 'utf8');
console.log('Successfully updated MeetsSection.tsx!');
