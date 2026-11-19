const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/OverviewSection.tsx', 'utf8');

// 1. Add Check icon to lucide-react import
code = code.replace(
  "import { ArrowUpRight, Clock, Mail, MailOpen } from 'lucide-react';",
  "import { ArrowUpRight, Check, Clock, Mail, MailOpen } from 'lucide-react';"
);

// 2. Add helper function isMeetTimePassed in OverviewSection
const helperTimePassed = `
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

code = code.replace(
  'function formatTimeOnly',
  helperTimePassed + '\nfunction formatTimeOnly'
);

// 3. Add meetId, scheduledDate, scheduledTime to items interface
const oldScheduleItemType = `    const items: Array<{
      id: string;
      time: string;
      title: string;
      subtitle: string;
      badge?: string;
      kind: 'MEET' | 'REMINDER' | 'BILLING' | 'ONBOARDING' | 'VISIT';
      ownerRole?: string;
      ownerName?: string;
      isMyTask?: boolean;
      tab: NavTab;
      hasJoin?: boolean;
      joinUrl?: string;
    }> = [];`;

const newScheduleItemType = `    const items: Array<{
      id: string;
      meetId?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      time: string;
      title: string;
      subtitle: string;
      badge?: string;
      kind: 'MEET' | 'REMINDER' | 'BILLING' | 'ONBOARDING' | 'VISIT';
      ownerRole?: string;
      ownerName?: string;
      isMyTask?: boolean;
      tab: NavTab;
      hasJoin?: boolean;
      joinUrl?: string;
      canCompleteMeet?: boolean;
    }> = [];`;

code = code.replace(oldScheduleItemType, newScheduleItemType);

// 4. Update SUPPORT meets filter in scheduleItems:
// Filter out COMPLETED meets!
// Only include pending or approved meets:
const oldSupportMeets = `      // Confirmed Demo Meets for Support today
      db.meetRequests
        .filter((m) => (m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL'))
        .forEach((m) => {
          items.push({
            id: \`sup-meet-\${m.id}\`,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} Demo — \${m.companyName}\`,
            subtitle: \`\${m.agenda} (Agent: \${m.agentName})\`,
            badge: m.status === 'APPROVED' ? 'Confirmed Demo' : 'Pending Review',
            kind: 'MEET',
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });`;

const newSupportMeets = `      // Confirmed Demo Meets for Support today (Completed meets are automatically removed)
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          items.push({
            id: \`sup-meet-\${m.id}\`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} Demo — \${m.companyName}\`,
            subtitle: \`\${m.agenda} (Agent: \${m.agentName})\`,
            badge: m.status === 'APPROVED' ? 'Confirmed Demo' : 'Pending Review',
            kind: 'MEET',
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
            canCompleteMeet: m.status === 'APPROVED',
          });
        });`;

code = code.replace(oldSupportMeets, newSupportMeets);

// 5. Update ADMIN meets in scheduleItems (also exclude completed and add meetId & canCompleteMeet)
const oldAdminMeets = `      // Demos & Meets
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          items.push({
            id: \`admin-meet-\${m.id}\`,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} Demo — \${m.companyName}\`,
            subtitle: \`\${m.agenda} • Agent: \${m.agentName}\`,
            badge: m.status === 'APPROVED' ? 'GMeet / Demo' : 'Pending Approval',
            kind: 'MEET',
            ownerRole: 'AGENT',
            ownerName: m.agentName,
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });`;

const newAdminMeets = `      // Demos & Meets (Completed meets removed from Today's Schedule)
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          items.push({
            id: \`admin-meet-\${m.id}\`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} Demo — \${m.companyName}\`,
            subtitle: \`\${m.agenda} • Agent: \${m.agentName}\`,
            badge: m.status === 'APPROVED' ? 'GMeet / Demo' : 'Pending Approval',
            kind: 'MEET',
            ownerRole: 'AGENT',
            ownerName: m.agentName,
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
            canCompleteMeet: m.status === 'APPROVED',
          });
        });`;

code = code.replace(oldAdminMeets, newAdminMeets);

// 6. Update ACCOUNT_MANAGER meets in scheduleItems
const oldAmMeets = `      // GMeet / Demos scheduled
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          const isMyMeet = m.agentId === currentUser.id || m.agentName === currentUser.name;
          items.push({
            id: \`am-meet-\${m.id}\`,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} — \${m.companyName}\`,
            subtitle: \`\${m.agenda} (\${isMyMeet ? 'Your Direct Demo' : \`Agent: \${m.agentName}\`})\`,
            badge: isMyMeet ? 'My GMeet' : (m.status === 'APPROVED' ? 'Agent GMeet' : 'Need Approval'),
            kind: 'MEET',
            ownerRole: isMyMeet ? 'ACCOUNT_MANAGER' : 'AGENT',
            ownerName: m.agentName,
            isMyTask: isMyMeet,
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });`;

const newAmMeets = `      // GMeet / Demos scheduled (Completed removed from Today's Schedule)
      db.meetRequests
        .filter((m) => m.status === 'APPROVED' || m.status === 'PENDING_APPROVAL')
        .forEach((m) => {
          const isMyMeet = m.agentId === currentUser.id || m.agentName === currentUser.name;
          items.push({
            id: \`am-meet-\${m.id}\`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} — \${m.companyName}\`,
            subtitle: \`\${m.agenda} (\${isMyMeet ? 'Your Direct Demo' : \`Agent: \${m.agentName}\`})\`,
            badge: isMyMeet ? 'My GMeet' : (m.status === 'APPROVED' ? 'Agent GMeet' : 'Need Approval'),
            kind: 'MEET',
            ownerRole: isMyMeet ? 'ACCOUNT_MANAGER' : 'AGENT',
            ownerName: m.agentName,
            isMyTask: isMyMeet,
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });`;

code = code.replace(oldAmMeets, newAmMeets);

// 7. Update AGENT meets in scheduleItems
const oldAgentMeets = `      // Agent's own GMeet / Zoom / Teams demos
      db.meetRequests
        .filter((m) => m.agentId === currentUser.id || m.agentName === currentUser.name)
        .forEach((m) => {
          items.push({
            id: \`agent-meet-\${m.id}\`,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} Demo — \${m.companyName}\`,
            subtitle: m.agenda,
            badge: m.status === 'APPROVED' ? 'Confirmed GMeet' : 'Pending Support',
            kind: 'MEET',
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });`;

const newAgentMeets = `      // Agent's own GMeet / Zoom / Teams demos (Completed removed from Today's Schedule)
      db.meetRequests
        .filter(
          (m) =>
            (m.agentId === currentUser.id || m.agentName === currentUser.name) &&
            m.status !== 'COMPLETED' &&
            m.status !== 'REJECTED'
        )
        .forEach((m) => {
          items.push({
            id: \`agent-meet-\${m.id}\`,
            meetId: m.id,
            scheduledDate: m.scheduledDate,
            scheduledTime: m.scheduledTime,
            time: m.scheduledTime || 'Today',
            title: \`\${m.platform} Demo — \${m.companyName}\`,
            subtitle: m.agenda,
            badge: m.status === 'APPROVED' ? 'Confirmed GMeet' : 'Pending Support',
            kind: 'MEET',
            tab: 'meets',
            hasJoin: m.status === 'APPROVED',
            joinUrl: m.meetLink,
          });
        });`;

code = code.replace(oldAgentMeets, newAgentMeets);

// 8. Update JSX in Schedule card to render Quick Complete button for Support/Admin right from the widget if meet time has arrived!
const oldScheduleItemActions = `                  {item.hasJoin ? (
                    item.joinUrl ? (
                      <a
                        href={item.joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 shadow-sm"
                      >
                        Join <ArrowUpRight className="w-3 h-3" />
                      </a>
                    ) : (
                      <button
                        onClick={() => onNavigate(item.tab)}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 shadow-sm"
                      >
                        Join <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => onNavigate(item.tab)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium shrink-0"
                      aria-label="Open item"
                    >
                      View
                    </button>
                  )}`;

const newScheduleItemActions = `                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.hasJoin && (
                      item.joinUrl ? (
                        <a
                          href={item.joinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                        >
                          Join <ArrowUpRight className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          onClick={() => onNavigate(item.tab)}
                          className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
                        >
                          Join <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )
                    )}

                    {/* Support / Admin Complete button directly on Schedule item */}
                    {item.kind === 'MEET' && item.canCompleteMeet && item.meetId && (role === 'SUPPORT' || role === 'ADMIN') ? (() => {
                      const canComplete = isMeetTimePassed(item.scheduledDate, item.scheduledTime) || role === 'ADMIN';
                      return (
                        <button
                          type="button"
                          disabled={!canComplete}
                          onClick={async () => {
                            if (!canComplete) return;
                            await onAction('COMPLETE_MEET', {
                              meetId: item.meetId,
                              supportNotes: 'Demo & walkthrough completed by Support engineer.',
                            });
                          }}
                          className={\`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition \${
                            canComplete
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
                          }\`}
                          title={
                            canComplete
                              ? 'Mark meet completed (will remove from Today Schedule)'
                              : \`Meet time (\${item.scheduledTime}) hone ke baad hi complete kar sakte hain\`
                          }
                        >
                          <Check className="w-3 h-3" />
                          Complete
                        </button>
                      );
                    })() : (
                      <button
                        onClick={() => onNavigate(item.tab)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium"
                        aria-label="Open item"
                      >
                        View
                      </button>
                    )}
                  </div>`;

code = code.replace(oldScheduleItemActions, newScheduleItemActions);

fs.writeFileSync('D:/sale-crm/src/components/OverviewSection.tsx', code, 'utf8');
console.log('Successfully updated OverviewSection.tsx with time validation & instant complete!');
