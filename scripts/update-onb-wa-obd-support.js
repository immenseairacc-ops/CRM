const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', 'utf8');

// 1. Add state variables for whatsappMarketingRate, whatsappUtilityRate, obdRate
const oldStateBlock = `  const [serviceItems, setServiceItems] = useState<ServicePriceItem[]>([
    { service: 'Bulk SMS (DLT)', rate: 0.14, count: 100000, amount: 14000 },
  ]);
  const [unitPrice, setUnitPrice] = useState('₹0.14 / SMS');`;

const newStateBlock = `  const [serviceItems, setServiceItems] = useState<ServicePriceItem[]>([
    { service: 'Bulk SMS (DLT)', rate: 0.14, count: 100000, amount: 14000 },
  ]);
  const [whatsappMarketingRate, setWhatsappMarketingRate] = useState<string>('0.80');
  const [whatsappUtilityRate, setWhatsappUtilityRate] = useState<string>('0.40');
  const [obdRate, setObdRate] = useState<string>('0.095');
  const [unitPrice, setUnitPrice] = useState('₹0.14 / SMS');`;

code = code.replace(oldStateBlock, newStateBlock);

// 2. In useEffect for prefillLead: initialize rates
const oldEffectCalc = `      setServiceItems(quoteItems);
      setSelectedServices(quoteItems.map((it) => it.service));
      
      const calcTotal = quoteItems.reduce((acc, it) => acc + (it.amount || it.rate * it.count || 0), 0);
      setTotalDealAmount(String(Math.round(calcTotal || prefillLead.quotationAmount || 15000)));

      const summaryRates = quoteItems.map((it) => \`\${it.service}: ₹\${it.rate}\`).join(', ');
      setUnitPrice(summaryRates || '₹0.14 / SMS');

      setOpenForm(true);`;

const newEffectCalc = `      setServiceItems(quoteItems);
      setSelectedServices(quoteItems.map((it) => it.service));

      // Check if WhatsApp or OBD rates are present in quotation items
      const waItem = quoteItems.find((i) => i.service.toLowerCase().includes('whatsapp'));
      if (waItem) {
        setWhatsappMarketingRate(String(waItem.rate || '0.80'));
        setWhatsappUtilityRate(String(Number((waItem.rate * 0.5).toFixed(3)) || '0.40'));
      }
      const obdItem = quoteItems.find((i) => i.service.toLowerCase().includes('obd') || i.service.toLowerCase().includes('voice'));
      if (obdItem) {
        setObdRate(String(obdItem.rate || '0.095'));
      }
      
      const calcTotal = quoteItems.reduce((acc, it) => acc + (it.amount || it.rate * it.count || 0), 0);
      setTotalDealAmount(String(Math.round(calcTotal || prefillLead.quotationAmount || 15000)));

      const summaryRates = quoteItems.map((it) => \`\${it.service}: ₹\${it.rate}\`).join(', ');
      setUnitPrice(summaryRates || '₹0.14 / SMS');

      setOpenForm(true);`;

code = code.replace(oldEffectCalc, newEffectCalc);

// 3. In handleSubmit: pass rates to action
const oldSubmitAction = `    const ok = await onAction('CREATE_ONBOARDING', {
      leadId: prefillLead?.id,
      companyName,
      username,
      billingEntity,
      gstNumber: taxType === 'GST' ? gstNumber : undefined,
      taxType,
      paymentType: billingType,
      postpaidCycle: billingType === 'POSTPAID' ? postpaidCycle : undefined,
      services: selectedServices,
      serviceItems,
      unitPrice,
      totalDealAmount: Number(totalDealAmount) || 0,
      billingType,
    });`;

const newSubmitAction = `    const ok = await onAction('CREATE_ONBOARDING', {
      leadId: prefillLead?.id,
      companyName,
      username,
      billingEntity,
      gstNumber: taxType === 'GST' ? gstNumber : undefined,
      taxType,
      paymentType: billingType,
      postpaidCycle: billingType === 'POSTPAID' ? postpaidCycle : undefined,
      services: selectedServices,
      serviceItems,
      whatsappMarketingRate: selectedServices.some(s => s.toLowerCase().includes('whatsapp')) ? Number(whatsappMarketingRate) || 0.8 : undefined,
      whatsappUtilityRate: selectedServices.some(s => s.toLowerCase().includes('whatsapp')) ? Number(whatsappUtilityRate) || 0.4 : undefined,
      obdRate: selectedServices.some(s => s.toLowerCase().includes('obd') || s.toLowerCase().includes('voice')) ? Number(obdRate) || 0.095 : undefined,
      unitPrice,
      totalDealAmount: Number(totalDealAmount) || 0,
      billingType,
    });`;

code = code.replace(oldSubmitAction, newSubmitAction);

// 4. In Support View Banner: update explanation to match exact rule
const oldBannerDesc = `<p className="mt-0.5 text-amber-800">
              For Support, <strong>Total Deal Amount</strong>,{' '}
              <strong>Billing Entity</strong>, and <strong>Billing Type</strong>{' '}
              are strictly hidden at the API layer. Only{' '}
              <strong>Agent Name</strong>, <strong>Account Username</strong>,{' '}
              <strong>Services</strong>, and <strong>Unit/Service Rate</strong>{' '}
              are shown so you can configure the account accurately.
            </p>`;

const newBannerDesc = `<p className="mt-0.5 text-amber-800">
              Commercial privacy active: <strong>Total Deal Amount</strong> and <strong>Billing Entity</strong> are strictly hidden.
              Support panel only receives <strong>WhatsApp (Marketing & Utility)</strong> and <strong>OBD / Voice Rates</strong> required for panel configuration. All other commercial rates are masked.
            </p>`;

code = code.replace(oldBannerDesc, newBannerDesc);

// 5. In Support View Card: show ONLY WhatsApp and OBD panel rates! Mask all other rates.
const oldSupportRateCard = `                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Agent Name</span>
                    <span className="font-semibold text-slate-900">
                      {item.agentName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      Service Rate to Set
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {item.unitPrice}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block mb-1">
                      Services to Provision
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.services.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>`;

const newSupportRateCard = `                <div className="space-y-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Sales Agent</span>
                      <span className="font-bold text-slate-900">{item.agentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Client Company</span>
                      <span className="font-bold text-slate-800">{item.companyName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 text-[11px] font-semibold">
                      Services to Provision (Account Setup)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.services.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 text-xs"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Panel Configuration Rates (Only WhatsApp & OBD allowed for Support) */}
                  <div className="border-t border-slate-200 pt-2.5 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span>Panel Rates to Configure</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        WhatsApp & OBD Rates Only
                      </span>
                    </div>

                    {item.services.some(s => s.toLowerCase().includes('whatsapp')) && (
                      <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                        <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp Panel Rates:
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                          <div className="bg-white p-2 rounded-lg border border-emerald-200">
                            <span className="text-slate-500 block text-[10px]">Marketing Msg Rate</span>
                            <span className="text-emerald-700 font-extrabold text-sm">
                              ₹{item.whatsappMarketingRate ?? '0.80'} / msg
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-emerald-200">
                            <span className="text-slate-500 block text-[10px]">Utility Msg Rate</span>
                            <span className="text-indigo-700 font-extrabold text-sm">
                              ₹{item.whatsappUtilityRate ?? '0.40'} / msg
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.services.some(s => s.toLowerCase().includes('obd') || s.toLowerCase().includes('voice')) && (
                      <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 flex items-center justify-between">
                        <div>
                          <span className="text-purple-900 font-bold text-xs block">OBD / Voice Rate</span>
                          <span className="text-[10px] text-purple-700">30-second pulse rate for panel</span>
                        </div>
                        <span className="text-purple-900 font-extrabold text-sm bg-white px-2.5 py-1 rounded-lg border border-purple-200">
                          ₹{item.obdRate ?? '0.095'} / call
                        </span>
                      </div>
                    )}

                    {!item.services.some(s => s.toLowerCase().includes('whatsapp') || s.toLowerCase().includes('obd') || s.toLowerCase().includes('voice')) && (
                      <div className="p-2 rounded-lg bg-slate-100 text-[11px] text-slate-500 italic">
                        SMS & Other service commercial rates are masked for security. Please provision account access with standard plan settings.
                      </div>
                    )}
                  </div>
                </div>`;

code = code.replace(oldSupportRateCard, newSupportRateCard);

// 6. In Support Note modal auto note: mention WhatsApp / OBD rate
const oldSupportNoteSetup = `                      setSupportAccountNote(
                        \`Account "\${item.username}" created with rate (\${item.unitPrice}) and services configured.\`
                      );`;

const newSupportNoteSetup = `                      const noteParts = [\`Account "\${item.username}" created and provisioned.\`];
                      if (item.whatsappMarketingRate || item.whatsappUtilityRate) {
                        noteParts.push(\`WhatsApp Marketing: ₹\${item.whatsappMarketingRate || '0.80'}, Utility: ₹\${item.whatsappUtilityRate || '0.40'}\`);
                      }
                      if (item.obdRate) {
                        noteParts.push(\`OBD: ₹\${item.obdRate}\`);
                      }
                      setSupportAccountNote(noteParts.join(' • '));`;

code = code.replace(oldSupportNoteSetup, newSupportNoteSetup);

// 7. In Onboarding Modal: Add dedicated inputs for WhatsApp Marketing & Utility rates and OBD rate!
const oldTotalDealGrid = `          {/* Commercial & Payment Type & Billing Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit / Service Rate *
              </label>
              <input
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="₹0.14 / SMS"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>`;

const newTotalDealGrid = `          {/* Dedicated WhatsApp & OBD Panel Rates (Configured by Agent for Support) */}
          {(selectedServices.some(s => s.toLowerCase().includes('whatsapp')) ||
            selectedServices.some(s => s.toLowerCase().includes('obd') || s.toLowerCase().includes('voice'))) && (
            <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span>Support Panel Rates (WhatsApp &amp; OBD Rate Configuration)</span>
                <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded">
                  Only these rates will be visible to Support
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedServices.some(s => s.toLowerCase().includes('whatsapp')) && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp Marketing Rate (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        value={whatsappMarketingRate}
                        onChange={(e) => setWhatsappMarketingRate(e.target.value)}
                        placeholder="0.80"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-bold text-emerald-800"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Marketing message rate</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp Utility Rate (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        required
                        value={whatsappUtilityRate}
                        onChange={(e) => setWhatsappUtilityRate(e.target.value)}
                        placeholder="0.40"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-bold text-indigo-800"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Utility / OTP / alert rate</span>
                    </div>
                  </>
                )}

                {selectedServices.some(s => s.toLowerCase().includes('obd') || s.toLowerCase().includes('voice')) && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      OBD / Voice Rate (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={obdRate}
                      onChange={(e) => setObdRate(e.target.value)}
                      placeholder="0.095"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-bold text-purple-800"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">30 sec pulse rate</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commercial & Payment Type & Billing Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Overall Rate Summary *
              </label>
              <input
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="₹0.14 / SMS"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>`;

code = code.replace(oldTotalDealGrid, newTotalDealGrid);

fs.writeFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', code, 'utf8');
console.log('Successfully updated OnboardingSection with WhatsApp (Marketing & Utility) and OBD rates for Support!');
