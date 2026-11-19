const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', 'utf8');

// 1. Update button text in Support card:
const oldSupportBtn = `<button
                  type="button"
                  onClick={() => setViewHistoryItem(item)}
                  className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-indigo-200"
                >
                  <History className="w-3.5 h-3.5" />
                  View Lead Lifecycle & Call Logs
                </button>`;

const newSupportBtn = `<button
                  type="button"
                  onClick={() => setViewHistoryItem(item)}
                  className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-indigo-200"
                >
                  <History className="w-3.5 h-3.5" />
                  View Support Operations & Setup Logs
                </button>`;

code = code.replace(oldSupportBtn, newSupportBtn);

// 2. In History Modal:
// Title based on isSupport:
const oldTitle = `title={
          viewHistoryItem
            ? \`Client Complete Lifecycle & Activity History: \${viewHistoryItem.companyName}\`
            : 'Client History'
        }`;

const newTitle = `title={
          viewHistoryItem
            ? isSupport
              ? \`Support Operations & Technical Logs: \${viewHistoryItem.companyName}\`
              : \`Client Complete Lifecycle & Activity History: \${viewHistoryItem.companyName}\`
            : 'Client History'
        }`;

code = code.replace(oldTitle, newTitle);

// 3. Filter logs: If isSupport, show ONLY Support logs! If Agent, Account Manager, or Admin, show ALL logs!
const oldLogsExtraction = `          const matchedLead: Lead | undefined =
            (viewHistoryItem.leadId ? db.leads.find((l) => l.id === viewHistoryItem.leadId) : undefined) ||
            db.leads.find((l) => l.companyName.toLowerCase() === viewHistoryItem.companyName.toLowerCase()) ||
            viewHistoryItem.leadData;

          const logs = matchedLead?.callLogs || [];`;

const newLogsExtraction = `          const matchedLead: Lead | undefined =
            (viewHistoryItem.leadId ? db.leads.find((l) => l.id === viewHistoryItem.leadId) : undefined) ||
            db.leads.find((l) => l.companyName.toLowerCase() === viewHistoryItem.companyName.toLowerCase()) ||
            viewHistoryItem.leadData;

          const allLogs = matchedLead?.callLogs || [];

          // For Support role: Show ONLY Support related logs (Account provisioned, demo completed, support notes, recharge execution)
          // For Agent, Account Manager, Admin: Show ALL logs (Lead creation, calls, quotations, meets, onboarding)
          const logs = isSupport
            ? allLogs.filter((log) => {
                const s = (log.summary || '').toLowerCase();
                const by = (log.createdBy || '').toLowerCase();
                const role = log.creatorRole;
                return (
                  role === 'SUPPORT' ||
                  by.includes('karan') ||
                  by.includes('support') ||
                  s.includes('support') ||
                  s.includes('provisioned') ||
                  s.includes('demo') ||
                  s.includes('meeting completed') ||
                  s.includes('walkthrough')
                );
              })
            : allLogs;`;

code = code.replace(oldLogsExtraction, newLogsExtraction);

// 4. In Overview card of modal: mask commercial fields if isSupport
const oldModalOverview = `                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Client Name</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {viewHistoryItem.clientName || matchedLead?.clientName || '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Assigned Agent</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {viewHistoryItem.agentName || matchedLead?.assignedToAgentName || '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Account Username</div>
                    <div className="font-semibold text-indigo-300 font-mono mt-0.5 truncate">
                      @{viewHistoryItem.username}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Quotation Status</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {matchedLead?.quotationSent ? \`Sent (\${matchedLead.quotationSentDate ? matchedLead.quotationSentDate.slice(0, 10) : 'Yes'})\` : 'No Quote'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Meet Date & Mode</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {matchedLead?.meetDate || 'Completed / Verified'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Services & Rate</div>
                    <div className="font-semibold text-emerald-300 mt-0.5 truncate">
                      {viewHistoryItem.unitPrice || '—'}
                    </div>
                  </div>
                </div>`;

const newModalOverview = `                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Client Name</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {viewHistoryItem.clientName || matchedLead?.clientName || '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Assigned Agent</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {viewHistoryItem.agentName || matchedLead?.assignedToAgentName || '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Account Username</div>
                    <div className="font-semibold text-indigo-300 font-mono mt-0.5 truncate">
                      @{viewHistoryItem.username}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">Meet Date & Mode</div>
                    <div className="font-semibold text-white mt-0.5 truncate">
                      {matchedLead?.meetDate || 'Completed / Verified'}
                    </div>
                  </div>
                  {isSupport ? (
                    <>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400">Services</div>
                        <div className="font-semibold text-white mt-0.5 truncate">
                          {viewHistoryItem.services?.join(', ') || '—'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400">Panel Rates</div>
                        <div className="font-semibold text-emerald-300 mt-0.5 truncate">
                          {viewHistoryItem.whatsappMarketingRate ? \`WA: ₹\${viewHistoryItem.whatsappMarketingRate}\` : (viewHistoryItem.obdRate ? \`OBD: ₹\${viewHistoryItem.obdRate}\` : 'Standard')}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400">Quotation Status</div>
                        <div className="font-semibold text-white mt-0.5 truncate">
                          {matchedLead?.quotationSent ? \`Sent (\${matchedLead.quotationSentDate ? matchedLead.quotationSentDate.slice(0, 10) : 'Yes'})\` : 'No Quote'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-[10px] text-slate-400">Commercial Deal</div>
                        <div className="font-semibold text-emerald-300 mt-0.5 truncate">
                          {formatINR(viewHistoryItem.totalDealAmount)} ({viewHistoryItem.billingType || 'PREPAID'})
                        </div>
                      </div>
                    </>
                  )}
                </div>`;

code = code.replace(oldModalOverview, newModalOverview);

// 5. Update subtitle and section header in modal:
const oldHeader = `              {/* Timeline Logs List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Detailed Interaction History ({logs.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    From Lead Creation to Onboarding
                  </span>
                </div>`;

const newHeader = `              {/* Timeline Logs List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    {isSupport
                      ? \`Support & Technical Logs (\${logs.length})\`
                      : \`Detailed Interaction History (\${logs.length})\`}
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {isSupport
                      ? 'Filtered for Technical Support & Setup'
                      : 'From Lead Creation to Onboarding (Full Lifecycle)'}
                  </span>
                </div>`;

code = code.replace(oldHeader, newHeader);

// 6. In log row: if isSupport, hide quotation amount if any
const oldQuoteInLog = `{log.quotationAmount && (
                          <div className="text-[11px] text-indigo-700 font-semibold pt-0.5">
                            Quotation Value: ₹{log.quotationAmount.toLocaleString('en-IN')}
                          </div>
                        )}`;

const newQuoteInLog = `{!isSupport && log.quotationAmount && (
                          <div className="text-[11px] text-indigo-700 font-semibold pt-0.5">
                            Quotation Value: ₹{log.quotationAmount.toLocaleString('en-IN')}
                          </div>
                        )}`;

code = code.replace(oldQuoteInLog, newQuoteInLog);

fs.writeFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', code, 'utf8');
console.log('Successfully updated OnboardingSection with role-based log filtering!');
