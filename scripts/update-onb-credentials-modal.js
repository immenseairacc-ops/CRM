const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', 'utf8');

// 1. Update lucide-react imports to include Globe, Key, Send
code = code.replace(
  "  X,\n} from 'lucide-react';",
  "  Globe,\n  Key,\n  Send,\n  X,\n} from 'lucide-react';"
);

// 2. Add state variables for Support modal inputs:
// panelUrl, panelUsername, panelPassword
const oldStateBlock = `  const [supportNoteTargetId, setSupportNoteTargetId] = useState<string | null>(
    null
  );
  const [supportAccountNote, setSupportAccountNote] = useState('');`;

const newStateBlock = `  const [supportNoteTargetId, setSupportNoteTargetId] = useState<string | null>(
    null
  );
  const [supportAccountNote, setSupportAccountNote] = useState('');
  const [supportPanelUrl, setSupportPanelUrl] = useState('https://portal.immenseair.in');
  const [supportPanelUsername, setSupportPanelUsername] = useState('');
  const [supportPanelPassword, setSupportPanelPassword] = useState('');`;

code = code.replace(oldStateBlock, newStateBlock);

// 3. Update the click handler on Mark Account Created button in Support card:
const oldCardBtn = `                {item.status === 'APPROVED_FOR_SUPPORT' && (
                  <button
                    onClick={() => {
                      setSupportNoteTargetId(item.id);
                      const noteParts = [\`Account "\${item.username}" created and provisioned.\`];
                      if (item.whatsappMarketingRate || item.whatsappUtilityRate) {
                        noteParts.push(\`WhatsApp Marketing: ₹\${item.whatsappMarketingRate || '0.80'}, Utility: ₹\${item.whatsappUtilityRate || '0.40'}\`);
                      }
                      if (item.obdRate) {
                        noteParts.push(\`OBD: ₹\${item.obdRate}\`);
                      }
                      setSupportAccountNote(noteParts.join(' • '));
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    Mark Account Created
                  </button>
                )}`;

const newCardBtn = `                {item.status === 'APPROVED_FOR_SUPPORT' && (
                  <button
                    onClick={() => {
                      setSupportNoteTargetId(item.id);
                      setSupportPanelUsername(item.username);
                      const randomPass = \`Immense@\${Math.floor(1000 + Math.random() * 9000)}\`;
                      setSupportPanelPassword(randomPass);
                      setSupportPanelUrl('https://portal.immenseair.in');
                      const noteParts = [\`Portal account created on https://portal.immenseair.in for @\${item.username}.\`];
                      if (item.whatsappMarketingRate || item.whatsappUtilityRate) {
                        noteParts.push(\`WhatsApp Marketing: ₹\${item.whatsappMarketingRate || '0.80'}, Utility: ₹\${item.whatsappUtilityRate || '0.40'}\`);
                      }
                      if (item.obdRate) {
                        noteParts.push(\`OBD: ₹\${item.obdRate}\`);
                      }
                      setSupportAccountNote(noteParts.join(' • '));
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    Create Portal Account & Dispatch Credentials
                  </button>
                )}`;

code = code.replace(oldCardBtn, newCardBtn);

// 4. Update the Support Confirm Modal:
// Replace simple note modal with full Portal Credentials Form:
// - Portal URL
// - Username
// - Password (with regenerate button)
// - Dispatch target notice (Sends to Agent, CC: Account Manager & Admin)
const oldModalJsx = `      {/* Support Confirm Account Created Modal */}
      <Modal
        open={Boolean(supportNoteTargetId)}
        onClose={() => setSupportNoteTargetId(null)}
        title="Confirm Account Provisioning"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Creation Confirmation Note
            </label>
            <textarea
              rows={3}
              value={supportAccountNote}
              onChange={(e) => setSupportAccountNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSupportNoteTargetId(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!supportNoteTargetId) return;
                const ok = await onAction('COMPLETE_ONBOARDING_SUPPORT', {
                  onboardingId: supportNoteTargetId,
                  supportAccountNote,
                });
                if (ok) setSupportNoteTargetId(null);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
            >
              Confirm Account Created
            </button>
          </div>
        </div>
      </Modal>`;

const newModalJsx = `      {/* Support Create & Dispatch Portal Account Modal */}
      <Modal
        open={Boolean(supportNoteTargetId)}
        onClose={() => setSupportNoteTargetId(null)}
        title="Create Client Portal Account & Send Credentials"
        subtitle="Support panel account setup. Credentials will be emailed directly to the Sales Agent with Account Manager and Admin in CC loop."
      >
        {supportNoteTargetId && (() => {
          const targetOnb = db.onboardingRequests.find((o) => o.id === supportNoteTargetId);
          return (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!supportNoteTargetId) return;
                const ok = await onAction('COMPLETE_ONBOARDING_SUPPORT', {
                  onboardingId: supportNoteTargetId,
                  panelUrl: supportPanelUrl,
                  panelPassword: supportPanelPassword,
                  supportAccountNote,
                });
                if (ok) setSupportNoteTargetId(null);
              }}
              className="space-y-4"
            >
              {/* Recipient summary strip */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Client:</span>
                  <span className="font-bold text-slate-900">{targetOnb?.companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">To Agent:</span>
                  <span className="font-bold text-indigo-700">{targetOnb?.agentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">CC Loop:</span>
                  <span className="font-medium text-slate-600">Account Manager ({targetOnb?.accountManagerName || 'Neha Kapoor'}), Admin</span>
                </div>
              </div>

              {/* Portal URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  Portal / Panel Login URL *
                </label>
                <input
                  type="url"
                  required
                  value={supportPanelUrl}
                  onChange={(e) => setSupportPanelUrl(e.target.value)}
                  placeholder="https://portal.immenseair.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800"
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                    Portal Username *
                  </label>
                  <input
                    required
                    readOnly
                    value={supportPanelUsername}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-sm font-mono font-bold text-slate-900 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Approved panel username</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-600" />
                      Generated Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setSupportPanelPassword(\`Immense@\${Math.floor(1000 + Math.random() * 9000)}\`)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    required
                    value={supportPanelPassword}
                    onChange={(e) => setSupportPanelPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-indigo-50/30 text-sm font-mono font-bold text-indigo-950"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default generated or custom password</span>
                </div>
              </div>

              {/* Technical / Support Handover Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Handover / Configuration Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={supportAccountNote}
                  onChange={(e) => setSupportAccountNote(e.target.value)}
                  placeholder="e.g. DLT templates mapped, WhatsApp sender id approved..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSupportNoteTargetId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Save &amp; Send Credentials to Agent (CC: AM &amp; Admin)
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>`;

code = code.replace(oldModalJsx, newModalJsx);

fs.writeFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', code, 'utf8');
console.log('Successfully updated OnboardingSection with URL, Username, Password modal and mail dispatch!');
