const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', 'utf8');

// 1. Update imports
const oldImports = `import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
  Lock,
  Plus,
  ShieldAlert,
  User as UserIcon,
  UserCheck,
  X,
} from 'lucide-react';
import { BillingType, CrmDatabase, Lead, PostpaidCycle, TaxType, User } from '@/types/crm';`;

const newImports = `import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
  Lock,
  Plus,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  UserCheck,
  X,
} from 'lucide-react';
import { BillingType, CrmDatabase, Lead, PostpaidCycle, ServicePriceItem, TaxType, User } from '@/types/crm';
import { SERVICE_DEFAULTS } from './QuotationModal';`;

code = code.replace(oldImports, newImports);

// 2. Expand AVAILABLE_SERVICES to include SMS, RCS, WhatsApp, etc.
const oldServices = `const AVAILABLE_SERVICES = [
  'Bulk SMS (DLT)',
  'WhatsApp Business API',
  'Cloud Telephony (IVR)',
  'Transactional Email',
  'Voice Blast',
  'Webhook / SMPP API',
];`;

const newServices = `const AVAILABLE_SERVICES = [
  'Bulk SMS (DLT)',
  'RCS Messaging',
  'WhatsApp Business API',
  'Cloud Telephony (IVR)',
  'Transactional Email',
  'Voice Blast',
  'Outbound Voice Calling (OBD)',
  'Webhook / SMPP API',
];`;

code = code.replace(oldServices, newServices);

// 3. Add serviceItems state and sync with prefillLead
const oldStateBlock = `  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Bulk SMS (DLT)',
  ]);
  const [unitPrice, setUnitPrice] = useState('₹0.14 / SMS');
  const [totalDealAmount, setTotalDealAmount] = useState('25000');`;

const newStateBlock = `  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Bulk SMS (DLT)',
  ]);
  const [serviceItems, setServiceItems] = useState<ServicePriceItem[]>([
    { service: 'Bulk SMS (DLT)', rate: 0.14, count: 100000, amount: 14000 },
  ]);
  const [unitPrice, setUnitPrice] = useState('₹0.14 / SMS');
  const [totalDealAmount, setTotalDealAmount] = useState('14000');`;

code = code.replace(oldStateBlock, newStateBlock);

// 4. Update useEffect for prefillLead to load quotation / lead items
const oldEffect = `  useEffect(() => {
    if (prefillLead) {
      setCompanyName(prefillLead.companyName);
      setBillingEntity(\`\${prefillLead.companyName} Pvt Ltd\`);
      const slug = prefillLead.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      setUsername(\`\${slug}_prod\`);
      setOpenForm(true);
    }
  }, [prefillLead]);`;

const newEffect = `  useEffect(() => {
    if (prefillLead) {
      setCompanyName(prefillLead.companyName);
      setBillingEntity(\`\${prefillLead.companyName} Pvt Ltd\`);
      const slug = prefillLead.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      setUsername(\`\${slug}_prod\`);

      // Load quotation or lead services if available
      const quoteItems: ServicePriceItem[] =
        prefillLead.quotation?.items && prefillLead.quotation.items.length > 0
          ? prefillLead.quotation.items
          : prefillLead.serviceItems && prefillLead.serviceItems.length > 0
          ? prefillLead.serviceItems
          : (prefillLead.selectedServices || ['Bulk SMS (DLT)']).map((s) => {
              const def = SERVICE_DEFAULTS[s] || { rate: 0.14, count: 100000 };
              return {
                service: s,
                rate: def.rate,
                count: def.count,
                amount: Number((def.rate * def.count).toFixed(2)),
              };
            });

      setServiceItems(quoteItems);
      setSelectedServices(quoteItems.map((it) => it.service));
      
      const calcTotal = quoteItems.reduce((acc, it) => acc + (it.amount || it.rate * it.count || 0), 0);
      setTotalDealAmount(String(Math.round(calcTotal || prefillLead.quotationAmount || 15000)));

      const summaryRates = quoteItems.map((it) => \`\${it.service}: ₹\${it.rate}\`).join(', ');
      setUnitPrice(summaryRates || '₹0.14 / SMS');

      setOpenForm(true);
    }
  }, [prefillLead]);`;

code = code.replace(oldEffect, newEffect);

// 5. Update toggleService & service table manipulation helpers
const oldToggle = `  const toggleService = (svc: string) => {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  };`;

const newToggle = `  const toggleService = (svc: string) => {
    const isPresent = selectedServices.includes(svc);
    if (isPresent) {
      const nextServices = selectedServices.filter((s) => s !== svc);
      const nextItems = serviceItems.filter((i) => i.service !== svc);
      setSelectedServices(nextServices);
      setServiceItems(nextItems);
      recalcTotals(nextItems);
    } else {
      const def = SERVICE_DEFAULTS[svc] || { rate: 0.14, count: 50000 };
      const newItem: ServicePriceItem = {
        service: svc,
        rate: def.rate,
        count: def.count,
        amount: Number((def.rate * def.count).toFixed(2)),
      };
      const nextServices = [...selectedServices, svc];
      const nextItems = [...serviceItems, newItem];
      setSelectedServices(nextServices);
      setServiceItems(nextItems);
      recalcTotals(nextItems);
    }
  };

  const updateItemField = (svc: string, field: 'rate' | 'count', val: number) => {
    const nextItems = serviceItems.map((it) => {
      if (it.service !== svc) return it;
      const rate = field === 'rate' ? Math.max(0, val) : it.rate;
      const count = field === 'count' ? Math.max(0, val) : it.count;
      return {
        ...it,
        rate,
        count,
        amount: Number((rate * count).toFixed(2)),
      };
    });
    setServiceItems(nextItems);
    recalcTotals(nextItems);
  };

  const recalcTotals = (items: ServicePriceItem[]) => {
    const total = items.reduce((acc, it) => acc + (it.amount || it.rate * it.count || 0), 0);
    setTotalDealAmount(String(Math.round(total)));
    const summary = items.map((it) => \`\${it.service}: ₹\${it.rate}\`).join(', ');
    setUnitPrice(summary || 'Custom Rate');
  };`;

code = code.replace(oldToggle, newToggle);

// 6. Update handleSubmit to include serviceItems
const oldSubmit = `    const ok = await onAction('CREATE_ONBOARDING', {
      leadId: prefillLead?.id,
      companyName,
      username,
      billingEntity,
      gstNumber: taxType === 'GST' ? gstNumber : undefined,
      taxType,
      paymentType: billingType,
      postpaidCycle: billingType === 'POSTPAID' ? postpaidCycle : undefined,
      services: selectedServices,
      unitPrice,
      totalDealAmount: Number(totalDealAmount) || 0,
      billingType,
    });`;

const newSubmit = `    const ok = await onAction('CREATE_ONBOARDING', {
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

code = code.replace(oldSubmit, newSubmit);

// 7. Update Modal JSX for Services to Provision:
// Show buttons to toggle services, AND a clean pricing table for each selected service with editable Rate (₹) and Count/Quantity, with auto Total amount!
const oldServicesJsx = `          {/* Services to Provision */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Services to Provision (SMS, RCS, WhatsApp, IVR) *
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SERVICES.map((svc) => {
                const active = selectedServices.includes(svc);
                return (
                  <button
                    key={svc}
                    type="button"
                    onClick={() => toggleService(svc)}
                    className={\`px-3 py-1.5 rounded-xl text-xs font-semibold border transition \${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }\`}
                  >
                    {svc}
                  </button>
                );
              })}
            </div>
          </div>`;

const newServicesJsx = `          {/* Services to Provision & Rate / Count Config */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Services to Provision (Select or Update for Client) *
                </label>
                <span className="text-[11px] text-indigo-600 font-semibold">
                  {selectedServices.length} service(s) selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_SERVICES.map((svc) => {
                  const active = selectedServices.includes(svc);
                  return (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleService(svc)}
                      className={\`px-3 py-1.5 rounded-xl text-xs font-semibold border transition \${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }\`}
                    >
                      {active ? '✓ ' : '+ '}{svc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured Services Price & Count Table */}
            {serviceItems.length > 0 && (
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Custom Service Rates & Quantities (Quotation / Deal Update)</span>
                  <span className="text-emerald-700 font-extrabold text-xs">
                    Subtotal: ₹{serviceItems.reduce((acc, it) => acc + (it.amount || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="space-y-2">
                  {serviceItems.map((it) => (
                    <div
                      key={it.service}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-4">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {it.service}
                        </span>
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-medium">Rate:</span>
                        <div className="relative w-full">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={it.rate}
                            onChange={(e) => updateItemField(it.service, 'rate', Number(e.target.value) || 0)}
                            className="w-full pl-5 pr-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold"
                            placeholder="0.14"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-medium">Qty:</span>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={it.count}
                          onChange={(e) => updateItemField(it.service, 'count', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold"
                          placeholder="100000"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-slate-800">
                          ₹{Math.round(it.amount || it.rate * it.count).toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleService(it.service)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Remove service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>`;

code = code.replace(oldServicesJsx, newServicesJsx);

fs.writeFileSync('D:/sale-crm/src/components/OnboardingSection.tsx', code, 'utf8');
console.log('Successfully updated OnboardingSection with custom quotation services, price & count editor!');
