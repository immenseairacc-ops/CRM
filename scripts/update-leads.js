const fs = require('fs');

const file = 'D:/sale-crm/src/components/LeadsSection.tsx';
let content = fs.readFileSync(file, 'utf8');

// Target 1: The block starting with `{/* Direct Send on Mail & WhatsApp after quotation is generated */}` up to the closing tags
const marker1Start = '                {/* Direct Send on Mail & WhatsApp after quotation is generated */}';
const marker1End = '              </div>\n            </div>\n          )}\n\n          {/* Step 3: Remark */}';

const pos1 = content.indexOf(marker1Start);
const pos1End = content.indexOf(marker1End);

if (pos1 !== -1 && pos1End !== -1) {
  content = content.substring(0, pos1) + '</div>\n            </div>\n          )}\n\n          {/* Step 3: Remark */}' + content.substring(pos1End + marker1End.length);
  console.log('Successfully removed upper Mail & WhatsApp section!');
} else {
  console.log('Could not find exact block for Target 1', pos1, pos1End);
}

// Target 2: Footer buttons
const marker2 = `<div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveLead(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            {!draftQuotation && (
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm transition"
              >
                Save Call &amp; Lead Update
              </button>
            )}
          </div>`;

const newFooter = `{/* Action Buttons below Remark */}
          {draftQuotation ? (
            /* When quotation is generated: 3 options (Cancel, Send on Mail, Send on WhatsApp) */
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleCancelCallModalWithQuotation}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
              >
                Cancel
              </button>

              <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={handleSendMailAndSave}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Mail className="w-4 h-4" />
                  Send on Mail
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsAppAndSave}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Send className="w-4 h-4" />
                  Send on WhatsApp
                </button>
              </div>
            </div>
          ) : (
            /* When NO quotation is generated: Cancel & Save Call & Lead Update */
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveLead(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-sm transition"
              >
                Save Call &amp; Lead Update
              </button>
            </div>
          )}`;

const pos2 = content.indexOf(marker2);
if (pos2 !== -1) {
  content = content.replace(marker2, newFooter);
  console.log('Successfully updated footer with 3 buttons below remark!');
} else {
  console.log('Could not find marker2');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Updated LeadsSection.tsx successfully');
