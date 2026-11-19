'use client';

import React, { useState } from 'react';
import {
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Download,
  EyeOff,
  History,
  Image as ImageIcon,
  Lock,
  Megaphone,
  MoreVertical,
  PackageCheck,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User as UserIcon,
  UserCheck,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  CrmDatabase,
  OnboardingRequest,
  PaymentStatus,
  RechargePaymentMode,
  RechargeRequest,
  User,
} from '@/types/crm';
import {
  fileToDataUrl,
  formatDateTime,
  formatINR,
  Modal,
  StatusBadge,
  triggerDirectDownload,
} from './ui';

function buildSampleScreenshotSvg(username: string, amount: string, count: string) {
  const amt = Number(amount || 10000).toLocaleString('en-IN');
  const cnt = count ? `${Number(count).toLocaleString('en-IN')} Credits` : `₹${amt}.00`;
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="320" viewBox="0 0 560 320">
      <rect width="560" height="320" fill="#f8fafc"/>
      <rect x="20" y="20" width="520" height="280" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="20" y="20" width="520" height="56" rx="14" fill="#0f172a"/>
      <text x="40" y="54" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">Client WhatsApp / Payment Message Proof</text>
      <text x="40" y="120" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#16a34a">Recharge Request: ${cnt}</text>
      <text x="40" y="152" font-family="Arial, sans-serif" font-size="13" fill="#475569">Account Username: @${username || 'client_account'}</text>
      <text x="40" y="178" font-family="Arial, sans-serif" font-size="13" fill="#475569">UTR / Message Ref: UTR${Date.now().toString().slice(-8)}</text>
      <text x="40" y="204" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Client confirmation attached by Sales Team</text>
    </svg>`)
  );
}

function buildSampleTallyBillSvg(req: RechargeRequest, invoiceNum: string, paymentStatus: PaymentStatus) {
  const taxable = (req.amount / 1.18).toFixed(2);
  const total = req.amount.toLocaleString('en-IN');
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="0" y="0" width="600" height="68" fill="#0f172a"/>
      <text x="28" y="34" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">TALLY TAX INVOICE</text>
      <text x="28" y="54" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">Tally Bill #: ${invoiceNum} • Account: @${req.username}</text>
      <text x="28" y="104" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">Billed To: ${req.billingEntity || req.companyName}</text>
      <text x="28" y="124" font-family="Arial, sans-serif" font-size="12" fill="#475569">GSTIN: ${req.gstNumber || 'N/A'} | Service: ${req.service}</text>
      <rect x="28" y="148" width="544" height="32" fill="#f1f5f9"/>
      <text x="40" y="169" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Description</text>
      <text x="350" y="169" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Taxable</text>
      <text x="470" y="169" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Total (Incl. GST)</text>
      <text x="40" y="206" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">${req.service} (${req.creditCount ? `${req.creditCount.toLocaleString('en-IN')} Credits` : 'Recharge'})</text>
      <text x="350" y="206" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">₹${taxable}</text>
      <text x="470" y="206" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹${total}</text>
      <rect x="28" y="256" width="210" height="34" rx="6" fill="#dcfce7" stroke="#86efac"/>
      <text x="44" y="278" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#15803d">TALLY BILL: ${paymentStatus}</text>
    </svg>`)
  );
}

function buildSampleSupportPanelSvg(req: RechargeRequest) {
  const cnt = req.creditCount
    ? `${req.creditCount.toLocaleString('en-IN')} Credits`
    : '1,00,000 Credits';
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="320" viewBox="0 0 560 320">
      <rect width="560" height="320" fill="#0f172a"/>
      <rect x="20" y="20" width="520" height="280" rx="14" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <text x="40" y="60" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#38bdf8">Immense Air Admin Panel — Credit Allocation</text>
      <text x="40" y="115" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#4ade80">✓ SUCCESS: +${cnt} Added</text>
      <text x="40" y="150" font-family="monospace" font-size="14" fill="#e2e8f0">Target User: @${req.username}</text>
      <text x="40" y="178" font-family="Arial, sans-serif" font-size="13" fill="#94a3b8">Service Gateway: ${req.service} • Agent: ${req.agentName}</text>
      <text x="40" y="206" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Timestamp: ${new Date().toLocaleString('en-IN')} • Status: ACTIVE</text>
    </svg>`)
  );
}

/**
 * Helper to extract numeric unit rate for a selected service from an OnboardingRequest
 */
function getNumericRateForService(acc: OnboardingRequest | undefined, svcName: string): number {
  if (!acc) return 0.14;
  // 1. Check structured serviceItems first
  if (acc.serviceItems && acc.serviceItems.length > 0) {
    const match = acc.serviceItems.find(
      (it) => it.service.toLowerCase() === svcName.toLowerCase()
    );
    if (match && match.rate > 0) return match.rate;
  }
  // 2. Check specific WhatsApp or OBD rates
  const lower = svcName.toLowerCase();
  if (lower.includes('whatsapp') && acc.whatsappMarketingRate) {
    return acc.whatsappMarketingRate;
  }
  if ((lower.includes('obd') || lower.includes('voice')) && acc.obdRate) {
    return acc.obdRate;
  }
  // 3. Parse from unitPrice string (e.g. "Bulk SMS (DLT): ₹0.14")
  if (acc.unitPrice) {
    const numMatch = acc.unitPrice.match(/₹?\s*([0-9]+(?:\.[0-9]+)?)/);
    if (numMatch) return Number(numMatch[1]);
  }
  return 0.14;
}

/**
 * Cute E-Commerce Order Tracking Stepper for Recharge Requests!
 */
function CuteRechargeOrderTracker({ req, isSupport }: { req: RechargeRequest; isSupport?: boolean }) {
  const isDemo = req.paymentMode === 'DEMO';
  const isExternal = Boolean(req.isExternalCampaign);
  const isRejected = req.status === 'REJECTED';

  // For External Campaign:
  // Step 1: Campaign Requested (Direct to Support, Loop: AM & Admin)
  // Step 2: Support Made Campaign LIVE (+ Screenshot)
  // Step 3: Billing Reminder & Follow-Up / Tally Bill Creation
  // Step 4: Campaign Billed & Completed!
  if (isExternal) {
    const ext1Done = true;
    const ext2Done = Boolean(req.supportCompletedAt) || req.status === 'RECHARGE_COMPLETED' || req.status === 'BILLED';
    const ext3Done = Boolean(req.billingInvoiceNumber) || req.status === 'BILLED';
    const ext4Done = req.status === 'BILLED' && Boolean(req.billingInvoiceNumber);

    const extSteps = [
      {
        num: 1,
        title: 'Campaign Sent',
        sub: 'Direct → Support',
        icon: '🚀',
        done: ext1Done,
        active: !ext2Done && !isRejected,
      },
      {
        num: 2,
        title: 'Campaign LIVE',
        sub: ext2Done ? 'Support Proof Added' : 'In Support Queue',
        icon: '📡',
        done: ext2Done,
        active: ext1Done && !ext2Done && !isRejected,
      },
      {
        num: 3,
        title: 'Billing Follow-Up',
        sub: ext3Done
          ? `#${req.billingInvoiceNumber}`
          : req.billingFollowUpCount
          ? `Reminder #${req.billingFollowUpCount} Sent`
          : 'Regular Reminder',
        icon: '🔔',
        done: ext3Done,
        active: ext2Done && !ext3Done && !isRejected,
      },
      {
        num: 4,
        title: 'Billed & Closed',
        sub: ext4Done ? 'Tally Bill Done' : 'Awaiting Bill',
        icon: '🎉',
        done: ext4Done,
        active: ext3Done && !ext4Done && !isRejected,
      },
    ];

    return (
      <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50/70 via-white to-amber-50/70 border border-purple-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1">
            <Megaphone className="w-3 h-3" /> External Campaign Live Tracker (Loop: AM &amp; Admin)
          </span>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              ext4Done
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : ext2Done
                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                : 'bg-purple-100 text-purple-800 border border-purple-300 animate-pulse'
            }`}
          >
            {ext4Done ? '✅ CAMPAIGN LIVE & BILLED' : ext2Done ? '📡 CAMPAIGN LIVE • BILLING REMINDER' : '🚀 SENT TO SUPPORT'}
          </span>
        </div>

        <div className="relative flex items-center justify-between pt-1">
          <div className="absolute top-5 left-6 right-6 h-1 bg-slate-200 rounded-full z-0" />
          <div
            className="absolute top-5 left-6 h-1 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full z-0 transition-all duration-500"
            style={{
              width: ext4Done ? '86%' : ext3Done ? '62%' : ext2Done ? '40%' : '12%',
            }}
          />

          {extSteps.map((st) => (
            <div key={st.num} className="relative z-10 flex flex-col items-center text-center w-1/4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xs transition-all duration-300 border-2 ${
                  st.done
                    ? 'bg-emerald-500 border-emerald-200 text-white scale-105'
                    : st.active
                    ? 'bg-white border-purple-600 text-purple-700 ring-4 ring-purple-100 animate-bounce'
                    : 'bg-slate-100 border-slate-300 text-slate-400'
                }`}
              >
                {st.done ? '✓' : st.icon}
              </div>
              <div
                className={`text-[11px] font-extrabold mt-1 leading-tight ${
                  st.done ? 'text-slate-900' : st.active ? 'text-purple-700' : 'text-slate-400'
                }`}
              >
                {st.title}
              </div>
              <div className="text-[9px] text-slate-500 truncate max-w-[90px] mt-0.5 font-medium">
                {st.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const step1Done = true;
  const step2Done =
    isDemo ||
    Boolean(req.billingInvoiceNumber) ||
    req.status === 'APPROVED_FOR_SUPPORT' ||
    req.status === 'RECHARGE_COMPLETED' ||
    req.status === 'BILLED';
  const step3Done =
    Boolean(req.supportCompletedAt) ||
    req.status === 'RECHARGE_COMPLETED' ||
    req.status === 'BILLED';
  const step4Done =
    req.status === 'BILLED' ||
    (req.status === 'RECHARGE_COMPLETED' && (Boolean(req.billingInvoiceNumber) || isDemo));

  const steps = [
    {
      num: 1,
      title: 'Order Placed',
      sub: `${req.agentName.split(' ')[0]} Raised`,
      icon: '🛒',
      done: step1Done,
      active: !step2Done && !isRejected,
    },
    {
      num: 2,
      title: isDemo ? 'Demo Mode' : 'Billing Verified',
      sub: isDemo
        ? 'No Bill Entry'
        : isSupport
        ? 'Approved'
        : req.billingInvoiceNumber
        ? `#${req.billingInvoiceNumber}`
        : 'In Billing Queue',
      icon: isDemo ? '⚡' : '🧾',
      done: step2Done,
      active: step1Done && !step2Done && !isRejected,
    },
    {
      num: 3,
      title: 'Panel Topup',
      sub: step3Done ? 'Support Added' : 'In Support Queue',
      icon: '⚙️',
      done: step3Done,
      active: step2Done && !step3Done && !isRejected,
    },
    {
      num: 4,
      title: 'Recharge Done',
      sub: step4Done ? 'Completed' : 'Finalizing',
      icon: '🎉',
      done: step4Done,
      active: step3Done && !step4Done && !isRejected,
    },
  ];

  if (isRejected) {
    return (
      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
        <span className="font-bold flex items-center gap-1.5">
          ❌ Order Cancelled / Rejected: {req.rejectionReason || 'Verification issue'}
        </span>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50/60 via-white to-emerald-50/60 border border-slate-200/90 shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Live Recharge Order Tracker
        </span>
        <span
          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
            step4Done
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
          }`}
        >
          {step4Done ? '✅ DELIVERED & DONE' : '🚚 IN TRANSIT'}
        </span>
      </div>

      <div className="relative flex items-center justify-between pt-1">
        <div className="absolute top-5 left-6 right-6 h-1 bg-slate-200 rounded-full z-0" />
        <div
          className="absolute top-5 left-6 h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full z-0 transition-all duration-500"
          style={{
            width: step4Done ? '86%' : step3Done ? '62%' : step2Done ? '35%' : '8%',
          }}
        />

        {steps.map((st) => (
          <div key={st.num} className="relative z-10 flex flex-col items-center text-center w-1/4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xs transition-all duration-300 border-2 ${
                st.done
                  ? 'bg-emerald-500 border-emerald-200 text-white scale-105'
                  : st.active
                  ? 'bg-white border-indigo-600 text-indigo-700 ring-4 ring-indigo-100 animate-bounce'
                  : 'bg-slate-100 border-slate-300 text-slate-400'
              }`}
            >
              {st.done ? '✓' : st.icon}
            </div>
            <div
              className={`text-[11px] font-extrabold mt-1 leading-tight ${
                st.done ? 'text-slate-900' : st.active ? 'text-indigo-700' : 'text-slate-400'
              }`}
            >
              {st.title}
            </div>
            <div className="text-[9px] text-slate-500 truncate max-w-[85px] mt-0.5 font-medium">
              {st.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RechargeSection({
  db,
  currentUser,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const role = currentUser.role;
  const isManager = role === 'ADMIN' || role === 'ACCOUNT_MANAGER';
  const isSupport = role === 'SUPPORT';
  const isBilling = role === 'BILLING';
  const isAgent = role === 'AGENT';

  // List of Onboarded Clients
  const eligibleAccounts = db.onboardingRequests.filter(
    (o) => o.status === 'ACCOUNT_CREATED' || o.status === 'APPROVED_FOR_SUPPORT'
  );

  const [clientSearch, setClientSearch] = useState('');
  const [openActionClientId, setOpenActionClientId] = useState<string | null>(null);
  const [trackingClient, setTrackingClient] = useState<OnboardingRequest | null>(null);

  // Create Recharge OR External Campaign Modal State
  const [openModal, setOpenModal] = useState(false);
  const [isExternalCampaignMode, setIsExternalCampaignMode] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [onboardingId, setOnboardingId] = useState(eligibleAccounts[0]?.id || '');
  const [service, setService] = useState('');
  const [creditCount, setCreditCount] = useState('100000');
  const [amount, setAmount] = useState('14000');
  const [activeNumericRate, setActiveNumericRate] = useState<number>(0.14);
  const [paymentMode, setPaymentMode] = useState<RechargePaymentMode>('PREPAID');
  const [agentNotes, setAgentNotes] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [screenshotName, setScreenshotName] = useState('');

  // Agent Update Billing Details for LIVE External Campaign
  const [updateBillingTarget, setUpdateBillingTarget] = useState<RechargeRequest | null>(null);
  const [editBillingEntity, setEditBillingEntity] = useState('');
  const [editGstNumber, setEditGstNumber] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');

  // Billing Tally Bill Modal State
  const [tallyTarget, setTallyTarget] = useState<RechargeRequest | null>(null);
  const [tallyInvoiceNumber, setTallyInvoiceNumber] = useState('');
  const [tallyPaymentStatus, setTallyPaymentStatus] = useState<PaymentStatus>('PAID');
  const [tallyPaymentNote, setTallyPaymentNote] = useState('');
  const [tallyFileDataUrl, setTallyFileDataUrl] = useState('');
  const [tallyFileName, setTallyFileName] = useState('');

  // Support Complete Recharge Modal State
  const [supportTarget, setSupportTarget] = useState<RechargeRequest | null>(null);
  const [supportNote, setSupportNote] = useState('');
  const [supportProofUrl, setSupportProofUrl] = useState('');
  const [supportProofName, setSupportProofName] = useState('');

  // Image / Document Preview Modal State
  const [previewImage, setPreviewImage] = useState<{
    title: string;
    subtitle: string;
    url: string;
    fileName: string;
  } | null>(null);

  const selectedClientObj = eligibleAccounts.find((a) => a.id === onboardingId) || eligibleAccounts[0];

  // Open Add Recharge OR External Campaign Modal for a specific Onboarded Client
  const handleOpenAddRechargeForClient = (acc: OnboardingRequest, externalMode = false) => {
    setIsExternalCampaignMode(externalMode);
    setOnboardingId(acc.id);
    const firstSvc = acc.services[0] || 'Bulk SMS (DLT)';
    setService(firstSvc);
    const rate = getNumericRateForService(acc, firstSvc);
    setActiveNumericRate(rate);
    const defaultCount = externalMode ? 50000 : 100000;
    setCreditCount(String(defaultCount));
    setAmount(String(Math.round(defaultCount * rate)));
    setCampaignTitle(externalMode ? `${firstSvc} Promotional Blast — ${acc.companyName}` : '');

    const defaultMode: RechargePaymentMode =
      acc.taxType === 'NON_GST'
        ? 'NON_GST'
        : acc.paymentType === 'POSTPAID' || acc.billingType === 'POSTPAID'
        ? 'POSTPAID'
        : 'PREPAID';
    setPaymentMode(defaultMode);
    setAgentNotes('');
    setScreenshotDataUrl('');
    setScreenshotName('');
    setOpenModal(true);
  };

  // Ctrl+V Clipboard Paste Handler (Compressed via fileToDataUrl)
  const handleClipboardPaste = (
    e: React.ClipboardEvent<any>,
    urlSetter: (v: string) => void,
    nameSetter: (v: string) => void
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          fileToDataUrl(file).then((url) => {
            urlSetter(url);
            nameSetter('pasted-proof-' + Date.now() + '.jpg');
          });
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedAcc = eligibleAccounts.find((a) => a.id === onboardingId) || eligibleAccounts[0];
    if (!selectedAcc) return;

    const dataUrl =
      screenshotDataUrl ||
      buildSampleScreenshotSvg(selectedAcc.username, amount, creditCount);
    const fileName = screenshotName || 'client-message-proof.svg';

    const ok = await onAction('CREATE_RECHARGE', {
      onboardingId: selectedAcc.id,
      service: service || selectedAcc.services[0] || 'Bulk SMS (DLT)',
      isExternalCampaign: isExternalCampaignMode,
      campaignTitle: isExternalCampaignMode ? campaignTitle : undefined,
      creditCount: Number(creditCount) || 100000,
      amount: paymentMode === 'DEMO' ? 0 : Number(amount) || 0,
      unitRate: `₹${activeNumericRate} / unit`,
      paymentMode,
      // Auto-taken directly from Onboarded Client Master Data!
      billingEntity: paymentMode === 'DEMO' ? undefined : selectedAcc.billingEntity || selectedAcc.companyName,
      gstNumber:
        paymentMode === 'DEMO' || paymentMode === 'NON_GST'
          ? undefined
          : selectedAcc.gstNumber || '27AABCU9603R1ZM',
      screenshotDataUrl: dataUrl,
      screenshotName: fileName,
      agentNotes,
    });
    if (ok) setOpenModal(false);
  };

  const handleTallySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tallyTarget) return;

    const dataUrl =
      tallyFileDataUrl ||
      buildSampleTallyBillSvg(tallyTarget, tallyInvoiceNumber, tallyPaymentStatus);
    const fileName = tallyFileName || `${tallyInvoiceNumber}.svg`;

    const ok = await onAction('BILLING_CREATE_TALLY_AND_FORWARD', {
      rechargeId: tallyTarget.id,
      billingInvoiceNumber: tallyInvoiceNumber,
      billingTaxInvoiceDataUrl: dataUrl,
      billingTaxInvoiceName: fileName,
      billingPaymentStatus: tallyPaymentStatus,
      billingPaymentNote: tallyPaymentNote,
    });
    if (ok) setTallyTarget(null);
  };

  const handleSupportCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportTarget) return;

    const dataUrl =
      supportProofUrl || buildSampleSupportPanelSvg(supportTarget);
    const fileName = supportProofName || `panel-topup-${supportTarget.username}.svg`;

    const ok = await onAction('COMPLETE_RECHARGE_SUPPORT', {
      rechargeId: supportTarget.id,
      supportRechargeNote: supportNote,
      supportScreenshotDataUrl: dataUrl,
      supportScreenshotName: fileName,
    });
    if (ok) setSupportTarget(null);
  };

  const filteredClients = eligibleAccounts.filter((acc) => {
    if (!clientSearch) return true;
    const q = clientSearch.toLowerCase();
    return (
      acc.username.toLowerCase().includes(q) ||
      acc.companyName.toLowerCase().includes(q) ||
      acc.agentName.toLowerCase().includes(q) ||
      (acc.billingEntity || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            {isSupport
              ? 'Support Panel Recharge Execution Queue'
              : isBilling
              ? 'Billing Tally Invoice Queue & Client Master Details'
              : 'Onboarded Clients & Quick Recharge Center'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSupport
              ? 'Support receives only Account @Username, Service, Sales Agent, Account Manager, and Recharge Count to top-up on panel.'
              : isBilling
              ? 'Billing sees pre-saved Client Billing Entity, GST Number, Payment Mode & Rate to create Tally Bill and forward to Support.'
              : 'All client details (Entity, GST, Services, Rates, Username) are pre-saved from Onboarding. Just click "+ Add Recharge" and enter Count!'}
          </p>
        </div>

        {(isAgent || isManager) && eligibleAccounts.length > 0 && (
          <button
            onClick={() => handleOpenAddRechargeForClient(eligibleAccounts[0], false)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Quick Add Recharge
          </button>
        )}
      </div>

      {/* Support Commercial Privacy Notice */}
      {isSupport && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-950">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Support Panel View:</strong> Commercial Billing Entity, GSTIN, INR Deal Value &amp; Tally Invoices are hidden. You only see <strong>@Username, Service, Agent Name, Account Manager Name &amp; Recharge Count</strong>.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
            Count-Only Mode
          </span>
        </div>
      )}

      {/* 1. ONBOARDED CLIENTS DIRECTORY WITH "+ ADD RECHARGE" BUTTON (Visible to Agent, Account Manager, Admin, Billing) */}
      {!isSupport && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/60 via-white to-emerald-50/40">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Onboarded Active Clients Master List ({filteredClients.length})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All onboarding details (Billing Entity, GSTIN, Panel Login, Approved Rates) are already saved. Click <strong>+ Add Recharge</strong> on any client.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search @username, company, entity..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No onboarded client accounts match your search.
            </div>
          ) : (
            <div className="overflow-x-auto lg:overflow-visible">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Panel @Username</th>
                    <th className="py-3 px-4">Client &amp; Billing Entity</th>
                    <th className="py-3 px-4">GSTIN &amp; Payment Mode</th>
                    <th className="py-3 px-4">Provisioned Services &amp; Rate</th>
                    <th className="py-3 px-4">Agent &amp; Account Mgr</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((acc) => (
                    <tr key={acc.id} className="hover:bg-indigo-50/30 transition align-middle">
                      <td className="py-3 px-4">
                        <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 inline-block">
                          @{acc.username}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{acc.companyName}</div>
                        <div className="text-[11px] text-slate-500">
                          Entity: <strong className="text-slate-700">{acc.billingEntity || `${acc.companyName} Pvt Ltd`}</strong>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {acc.paymentType || acc.billingType || 'PREPAID'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {acc.taxType || 'GST 18%'}
                          </span>
                        </div>
                        {acc.taxType !== 'NON_GST' && (
                          <div className="text-[10px] font-mono text-indigo-700 font-semibold mt-0.5">
                            GST: {acc.gstNumber || '27AABCU9603R1ZM'}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 mb-0.5">
                          {acc.services.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700">
                          {acc.unitPrice || '₹0.14 / unit'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{acc.agentName}</div>
                        <div className="text-[10px] text-slate-500">
                          AM: {acc.accountManagerName || 'Neha Kapoor'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionClientId(
                                openActionClientId === acc.id ? null : acc.id
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition ${
                              openActionClientId === acc.id
                                ? 'bg-[#0A1B3F] text-white border-[#0A1B3F]'
                                : 'bg-white hover:bg-slate-50 text-[#0A1B3F] border-slate-200'
                            }`}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                            <span>Actions</span>
                          </button>

                          {openActionClientId === acc.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setOpenActionClientId(null)}
                              />
                              <div className="absolute right-0 top-9 z-50 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 text-left space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionClientId(null);
                                    handleOpenAddRechargeForClient(acc, false);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl hover:bg-emerald-50 text-xs font-extrabold text-emerald-700 flex items-center gap-2"
                                >
                                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                                  + Add Recharge
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionClientId(null);
                                    handleOpenAddRechargeForClient(acc, true);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl hover:bg-orange-50 text-xs font-extrabold text-[#F2591F] flex items-center gap-2"
                                >
                                  <Megaphone className="w-3.5 h-3.5 text-[#F2591F]" />
                                  External Campaign
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionClientId(null);
                                    setTrackingClient(acc);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl hover:bg-indigo-50 text-xs font-bold text-[#0A1B3F] flex items-center gap-2"
                                >
                                  <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                                  Recharge &amp; Live Tracking
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. ROLE-SPECIFIC WORK QUEUE (Shown only for Support & Billing; Agent/AM/Admin use Actions -> Recharge & Live Tracking popup) */}
      {(isSupport || isBilling) && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            {isSupport
              ? `Support Panel Top-Up Queue (${db.rechargeRequests.length})`
              : `Billing Tally Queue & Recharges (${db.rechargeRequests.length})`}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {db.rechargeRequests.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              No recharges in queue right now.
            </div>
          ) : (
            db.rechargeRequests.map((req) => {
              const isDemo = req.paymentMode === 'DEMO';
              const isDone =
                req.status === 'BILLED' ||
                (req.status === 'RECHARGE_COMPLETED' && (Boolean(req.billingInvoiceNumber) || isDemo));

              // Look up master onboarding record for any missing pre-saved fields
              const masterOnb = db.onboardingRequests.find((o) => o.id === req.onboardingId);
              const displayEntity = req.billingEntity || masterOnb?.billingEntity || `${req.companyName} Pvt Ltd`;
              const displayGst = req.gstNumber || masterOnb?.gstNumber || '27AABCU9603R1ZM';
              const displayAm = req.accountManagerName || masterOnb?.accountManagerName || 'Neha Kapoor';
              const displayCount =
                req.creditCount ||
                Math.round((req.amount || 14000) / getNumericRateForService(masterOnb, req.service));

              // ============================================================================
              // VIEW A: SUPPORT ENGINEER CARD (STRICTLY ONLY 5 FIELDS: USERNAME, SERVICE, AGENT, AM, RECHARGE COUNT)
              // ============================================================================
              if (isSupport) {
                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition ${
                      isDone ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200'
                    }`}
                  >
                    {/* Header: Username & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          1. Panel Account Username
                        </span>
                        <div className="text-lg font-black font-mono text-indigo-700 mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                            @{req.username}
                          </span>
                          {req.isExternalCampaign && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <Megaphone className="w-3 h-3" /> EXTERNAL CAMPAIGN
                            </span>
                          )}
                          {isDemo && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                              DEMO CREDITS
                            </span>
                          )}
                        </div>
                      </div>

                      {isDone ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> RECHARGE DONE
                        </span>
                      ) : (
                        <StatusBadge status={req.status} />
                      )}
                    </div>

                    {/* Support 5-Field Grid */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            2. Service to Recharge
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                            {req.service}
                          </span>
                        </div>

                        <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                          <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                            3. Recharge Count (Top-Up)
                          </span>
                          <span className="font-black text-emerald-800 text-base mt-0.5 block">
                            {displayCount.toLocaleString('en-IN')} Credits
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            4. Sales Agent Name
                          </span>
                          <span className="font-bold text-slate-900 mt-0.5 block">
                            {req.agentName}
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            5. Account Manager Name
                          </span>
                          <span className="font-bold text-indigo-900 mt-0.5 block">
                            {displayAm}
                          </span>
                        </div>
                      </div>

                      {req.campaignTitle && (
                        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-950 p-2.5 rounded-lg font-semibold">
                          <strong>Campaign Title:</strong> {req.campaignTitle}
                        </div>
                      )}

                      {req.screenshotDataUrl && (
                        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[11px] font-bold text-slate-700">
                            Client Supporting Screenshot (From Agent):
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              triggerDirectDownload(
                                req.screenshotDataUrl,
                                req.screenshotName || `client-campaign-proof-${req.username}.png`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> 1-Click Download Client Proof
                          </button>
                        </div>
                      )}

                      {req.supportRechargeNote && (
                        <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-lg">
                          <strong>Provisioned Note ({req.supportConfirmedBy}):</strong> {req.supportRechargeNote}
                        </div>
                      )}

                      {req.supportScreenshotDataUrl && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Panel Recharge Screenshot Attached
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                triggerDirectDownload(
                                  req.supportScreenshotDataUrl,
                                  req.supportScreenshotName || `support-proof-${req.username}.png`
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <Download className="w-3 h-3" /> Download
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  title: `Support Panel Recharge Proof — @${req.username}`,
                                  subtitle: `Recharged ${displayCount.toLocaleString('en-IN')} Credits`,
                                  url: req.supportScreenshotDataUrl!,
                                  fileName: req.supportScreenshotName || 'panel-recharge-proof.png',
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-[11px] font-bold hover:bg-emerald-50"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Masked Indicator */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-dashed border-slate-200">
                      <span className="flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5" />
                        Billing Entity, GSTIN &amp; Tally Invoice:
                      </span>
                      <span className="font-semibold text-slate-500">HIDDEN FROM SUPPORT</span>
                    </div>

                    {req.status === 'APPROVED_FOR_SUPPORT' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupportTarget(req);
                          setSupportNote(
                            req.isExternalCampaign
                              ? `External Campaign (${req.service}) made LIVE for @${req.username} (${displayCount.toLocaleString('en-IN')} count).`
                              : `Recharged ${displayCount.toLocaleString('en-IN')} credits in ${req.service} panel for @${req.username}.`
                          );
                          setSupportProofUrl('');
                          setSupportProofName('');
                        }}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        {req.isExternalCampaign ? (
                          <>
                            <Megaphone className="w-4 h-4" />
                            Make External Campaign LIVE ({displayCount.toLocaleString('en-IN')} Count) &amp; Attach Screenshot
                          </>
                        ) : (
                          <>
                            <Wallet className="w-4 h-4" />
                            Execute Panel Recharge ({displayCount.toLocaleString('en-IN')} Credits) &amp; Attach Screenshot
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              }

              // ============================================================================
              // VIEW B: AGENT, ACCOUNT MANAGER, ADMIN & BILLING CARD (With Cute Tracker & Full Master Details)
              // ============================================================================
              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition ${
                    isDone ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200'
                  }`}
                >
                  {/* Top Bar: Client & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                          @{req.username}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {req.companyName}
                        </span>
                        {req.isExternalCampaign && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Megaphone className="w-3 h-3 text-amber-700" /> EXTERNAL CAMPAIGN
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            req.paymentMode === 'DEMO'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : req.paymentMode === 'POSTPAID'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : req.paymentMode === 'NON_GST'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {req.paymentMode || 'PREPAID'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Agent: <strong className="text-slate-800">{req.agentName}</strong> • AM:{' '}
                        <strong className="text-slate-800">{displayAm}</strong> • Service:{' '}
                        <strong className="text-indigo-700">{req.service}</strong>
                      </div>
                    </div>

                    {isDone ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> RECHARGE DONE
                      </span>
                    ) : (
                      <StatusBadge status={req.status} />
                    )}
                  </div>

                  {/* CUTE ONLINE ORDER TRACKER */}
                  <CuteRechargeOrderTracker req={req} />

                  {/* Pre-Saved Billing Master Details Box (Especially prominent for Billing to create Tally Bill!) */}
                  {!isDemo && (
                    <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Billing Entity Name
                        </span>
                        <span className="font-bold text-slate-900 truncate block">
                          {displayEntity}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          GSTIN / Tax Mode
                        </span>
                        <span className="font-mono font-bold text-indigo-800 block">
                          {req.paymentMode === 'NON_GST' ? 'NON-GST BILLING' : displayGst}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">
                          Payment Mode &amp; Rate
                        </span>
                        <span className="font-bold text-emerald-800 block">
                          {req.paymentMode || 'PREPAID'} • {req.unitRate}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Commercials & Proofs Box */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Recharge Credits &amp; Bill Amount
                        </div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-base font-black text-indigo-900">
                            {displayCount.toLocaleString('en-IN')} Credits
                          </span>
                          <span className="text-lg font-black text-emerald-700">
                            {isDemo ? '(Free Demo)' : `• ${formatINR(req.amount)}`}
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Direct Download Proof Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {req.screenshotDataUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              triggerDirectDownload(
                                req.screenshotDataUrl,
                                req.screenshotName || `client-proof-${req.username}.png`
                              )
                            }
                            title="1-Click Direct Download Client Proof"
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Client Proof</span>
                          </button>
                        )}

                        {req.billingTaxInvoiceDataUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              triggerDirectDownload(
                                req.billingTaxInvoiceDataUrl!,
                                req.billingTaxInvoiceName || `${req.billingInvoiceNumber || 'Tally-Bill'}.svg`
                              )
                            }
                            title="1-Click Direct Download Tally Bill / Invoice"
                            className="px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 hover:bg-sky-100 text-[11px] font-bold text-sky-800 flex items-center gap-1.5 shadow-2xs transition"
                          >
                            <Download className="w-3.5 h-3.5 text-sky-600" />
                            <span>Tally Bill #{req.billingInvoiceNumber}</span>
                          </button>
                        )}

                        {req.supportScreenshotDataUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              triggerDirectDownload(
                                req.supportScreenshotDataUrl!,
                                req.supportScreenshotName || `support-recharge-${req.username}.png`
                              )
                            }
                            title="1-Click Direct Download Support Panel Screenshot"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs transition"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Support Screenshot</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {req.agentNotes && (
                      <div className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80">
                        <strong>Agent Remark:</strong> {req.agentNotes}
                      </div>
                    )}

                    {req.billingInvoiceNumber && (() => {
                      const tot = Number(req.amount || 0);
                      const st = req.billingPaymentStatus || 'PAID';
                      const paid =
                        req.paidAmount !== undefined
                          ? Number(req.paidAmount)
                          : st === 'PAID'
                          ? tot
                          : st === 'PENDING'
                          ? 0
                          : Math.round(tot / 2);
                      const bal =
                        req.balanceAmount !== undefined
                          ? Number(req.balanceAmount)
                          : Math.max(0, tot - paid);

                      return (
                        <div className="text-xs text-sky-900 bg-sky-50/80 p-2.5 rounded-lg border border-sky-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>
                              <strong>Tally Invoice:</strong> #{req.billingInvoiceNumber} ({st})
                            </span>
                            <span className="text-[10px] text-sky-700 font-semibold">
                              By {req.paymentUpdatedBy || req.billingCompletedBy || 'Accounts Team'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px]">
                            <span className="text-emerald-800 font-bold">
                              Received: {formatINR(paid)}
                            </span>
                            <span
                              className={`font-extrabold ${
                                bal > 0 ? 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200' : 'text-slate-500'
                              }`}
                            >
                              Balance Due: {formatINR(bal)}
                            </span>
                          </div>
                          {req.billingPaymentNote && (
                            <div className="text-[11px] text-slate-600">
                              <strong>Accounts Note:</strong> {req.billingPaymentNote}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {req.supportRechargeNote && (
                      <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 p-2 rounded-lg">
                        <strong>Support Panel Confirmation ({req.supportConfirmedBy}):</strong>{' '}
                        {req.supportRechargeNote}
                      </div>
                    )}

                    {/* Regular Billing Reminder Alert for External Campaign after Support makes it LIVE */}
                    {req.isExternalCampaign && req.status === 'RECHARGE_COMPLETED' && !req.billingInvoiceNumber && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <BellRing className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                          <div>
                            <div className="font-extrabold text-amber-900">
                              Regular Billing Reminder Active {req.billingFollowUpCount ? `(Follow-Up #${req.billingFollowUpCount} Sent)` : ''}
                            </div>
                            <div className="text-[11px] text-amber-800">
                              External Campaign is <strong>LIVE</strong> by Support. Billing Team needs to raise Tally Bill or follow up with Agent ({req.agentName}) &amp; AM ({displayAm}).
                            </div>
                          </div>
                        </div>

                        {(isAgent || isManager) && (
                          <button
                            type="button"
                            onClick={() => {
                              setUpdateBillingTarget(req);
                              setEditBillingEntity(displayEntity);
                              setEditGstNumber(displayGst);
                              setEditAmount(String(req.amount || 14000));
                              setEditNote('Billing details verified by Sales Team. Ready for Tally Invoice.');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold shrink-0 shadow-2xs"
                          >
                            Confirm Billing Details
                          </button>
                        )}
                      </div>
                    )}

                    {/* Step-by-Step Activity & Follow-Up Logs (Visible to Agent, AM, Admin, Billing) */}
                    {req.activityLogs && req.activityLogs.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <History className="w-3 h-3 text-indigo-500" /> Campaign &amp; Billing Lifecycle Logs ({req.activityLogs.length})
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {req.activityLogs.map((log) => (
                            <div
                              key={log.id}
                              className="text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 flex items-start justify-between gap-2"
                            >
                              <div className="text-slate-700">
                                <strong className="text-slate-900">{log.actorName} ({log.actorRole}):</strong>{' '}
                                {log.note}
                              </div>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                                {formatDateTime(log.createdAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Role Action Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>Ordered: {formatDateTime(req.createdAt)}</span>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* BILLING ACTIONS FOR EXTERNAL CAMPAIGN (After Support makes it LIVE -> RECHARGE_COMPLETED) */}
                      {(isBilling || isManager) &&
                        req.isExternalCampaign &&
                        req.status === 'RECHARGE_COMPLETED' &&
                        !req.billingInvoiceNumber && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onAction('SEND_EXTERNAL_CAMPAIGN_BILLING_FOLLOWUP', {
                                  rechargeId: req.id,
                                  note: `Billing Reminder (#${(req.billingFollowUpCount || 0) + 1}): Please confirm Billing Entity, GSTIN or PO for LIVE External Campaign (${req.service}) of @${req.username}.`,
                                })
                              }
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs"
                            >
                              <BellRing className="w-3.5 h-3.5 text-amber-700" />
                              Follow-Up Reminder to Agent &amp; AM
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const nextInv = `TALLY-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                                setTallyTarget({
                                  ...req,
                                  billingEntity: displayEntity,
                                  gstNumber: displayGst,
                                  creditCount: displayCount,
                                });
                                setTallyInvoiceNumber(nextInv);
                                setTallyPaymentStatus(req.paymentMode === 'POSTPAID' ? 'PENDING' : 'PAID');
                                setTallyPaymentNote(`Tally Bill raised for LIVE External Campaign (${req.service}) — ${displayEntity}.`);
                                setTallyFileDataUrl('');
                                setTallyFileName('');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Raise Tally Bill (Complete Cycle)
                            </button>
                          </>
                        )}

                      {/* STEP 2 ACTION: Billing creates Tally Bill & Forwards to Support */}
                      {(isBilling || isManager) && req.status === 'PENDING_APPROVAL' && !isDemo && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const nextInv = `TALLY-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                              setTallyTarget({
                                ...req,
                                billingEntity: displayEntity,
                                gstNumber: displayGst,
                                creditCount: displayCount,
                              });
                              setTallyInvoiceNumber(nextInv);
                              setTallyPaymentStatus(req.paymentMode === 'POSTPAID' ? 'PENDING' : 'PAID');
                              setTallyPaymentNote(`Tally Bill created for ${displayEntity}.`);
                              setTallyFileDataUrl('');
                              setTallyFileName('');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Create Tally Bill &amp; Send to Support
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onAction('REJECT_RECHARGE', {
                                rechargeId: req.id,
                                reason: 'Payment proof or commercial details require clarification',
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}

                      {/* STEP 3 ACTION (Also accessible to Admin) */}
                      {(role as string) === 'ADMIN' && req.status === 'APPROVED_FOR_SUPPORT' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSupportTarget({
                              ...req,
                              creditCount: displayCount,
                              accountManagerName: displayAm,
                            });
                            setSupportNote(
                              `Recharged ${displayCount.toLocaleString('en-IN')} credits in panel for @${req.username}.`
                            );
                            setSupportProofUrl('');
                            setSupportProofName('');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-xs"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Execute Panel Recharge &amp; Attach Screenshot
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* ==================================================================================== */}
      {/* MODAL 1: AGENT / AM / ADMIN QUICK ADD RECHARGE OR EXTERNAL CAMPAIGN                 */}
      {/* ==================================================================================== */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={
          isExternalCampaignMode
            ? `🚀 Run External Campaign (Direct → Support): @${selectedClientObj?.username || ''}`
            : `Add Recharge: @${selectedClientObj?.username || ''}`
        }
        subtitle={
          isExternalCampaignMode
            ? 'Attach client supporting screenshot & submit. Request goes DIRECTLY to Support (AM & Admin in loop) -> Support makes Campaign LIVE -> Billing gets regular reminder to raise bill.'
            : 'Client Name, Billing Entity, GSTIN, Panel Username & Service Rate are already saved from Onboarding.'
        }
      >
        {selectedClientObj && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {/* Mode Switcher Tabs inside Modal */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setIsExternalCampaignMode(false)}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                  !isExternalCampaignMode
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Standard Panel Recharge
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExternalCampaignMode(true);
                  if (!campaignTitle) {
                    setCampaignTitle(`${service || 'SMS/RCS/WhatsApp'} External Campaign — ${selectedClientObj.companyName}`);
                  }
                }}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
                  isExternalCampaignMode
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                🚀 External Campaign (Direct → Support)
              </button>
            </div>
            {/* Pre-Saved Onboarding Master Card (Read-Only Summary so Agent doesn't have to re-type!) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Pre-Saved Onboarded Client Master Data
                </span>
                <span className="font-mono font-extrabold text-xs text-emerald-400 bg-white/10 px-2 py-0.5 rounded">
                  @{selectedClientObj.username}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Client / Company</span>
                  <span className="font-bold text-white truncate block">
                    {selectedClientObj.clientName || selectedClientObj.companyName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Billing Entity Name</span>
                  <span className="font-bold text-indigo-200 truncate block">
                    {selectedClientObj.billingEntity || `${selectedClientObj.companyName} Pvt Ltd`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">GSTIN Number</span>
                  <span className="font-mono font-bold text-amber-300 truncate block">
                    {selectedClientObj.taxType === 'NON_GST'
                      ? 'Non-GST'
                      : selectedClientObj.gstNumber || '27AABCU9603R1ZM'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Sales Agent</span>
                  <span className="font-semibold text-white block">{selectedClientObj.agentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Account Manager</span>
                  <span className="font-semibold text-white block">
                    {selectedClientObj.accountManagerName || 'Neha Kapoor'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Approved Rates</span>
                  <span className="font-semibold text-emerald-300 truncate block">
                    {selectedClientObj.unitPrice || '₹0.14 / unit'}
                  </span>
                </div>
              </div>
            </div>

            {/* If user clicked Quick Add from top, allow switching client */}
            {eligibleAccounts.length > 1 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Switch Onboarded Client (Optional)
                </label>
                <select
                  value={onboardingId}
                  onChange={(e) => {
                    const acc = eligibleAccounts.find((a) => a.id === e.target.value);
                    if (acc) handleOpenAddRechargeForClient(acc);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50"
                >
                  {eligibleAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      @{acc.username} — {acc.companyName} ({acc.billingEntity || acc.companyName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* If External Campaign Mode: Campaign Title & Routing Notice */}
            {isExternalCampaignMode && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-amber-700" />
                    Direct Support Campaign Dispatch (Loop: Account Manager &amp; Admin)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    Billing Later
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    External Campaign Title / Audience / Template Info *
                  </label>
                  <input
                    required
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="e.g., 50k WhatsApp Promotional Blast - Festival Offer"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            )}

            {/* 1. Select Service to Recharge / Campaign Channel */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. Select Service to Recharge *
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedClientObj.services.map((svc) => {
                  const rate = getNumericRateForService(selectedClientObj, svc);
                  const active = service === svc;
                  return (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => {
                        setService(svc);
                        setActiveNumericRate(rate);
                        const cnt = Number(creditCount) || 100000;
                        if (paymentMode !== 'DEMO') {
                          setAmount(String(Math.round(cnt * rate)));
                        }
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{svc}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-emerald-700'
                        }`}
                      >
                        ₹{rate}/unit
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Select Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                2. Payment Mode *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'PREPAID', label: '💳 Prepaid', desc: 'Advance Paid' },
                    { id: 'POSTPAID', label: '📅 Postpaid', desc: 'Credit Cycle' },
                    { id: 'NON_GST', label: '📄 Non-GST', desc: 'Without GST' },
                    { id: 'DEMO', label: '⚡ Demo Free', desc: 'Direct Support' },
                  ] as { id: RechargePaymentMode; label: string; desc: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m.id);
                      if (m.id === 'DEMO') {
                        setCreditCount('5000');
                        setAmount('0');
                      } else {
                        const cnt = Number(creditCount) === 5000 ? 100000 : Number(creditCount) || 100000;
                        setCreditCount(String(cnt));
                        setAmount(String(Math.round(cnt * activeNumericRate)));
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      paymentMode === m.id
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-bold">{m.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        paymentMode === m.id ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Enter Recharge Count OR INR Value (Auto-Calculated!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200">
              <div>
                <label className="block text-xs font-extrabold text-indigo-950 mb-1">
                  3. Recharge Credits / Count (Sent to Support) *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={creditCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCreditCount(val);
                    if (paymentMode !== 'DEMO') {
                      setAmount(String(Math.round((Number(val) || 0) * activeNumericRate)));
                    }
                  }}
                  placeholder="e.g., 100000"
                  className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-sm font-black text-indigo-900"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Support isi count ({Number(creditCount || 0).toLocaleString('en-IN')} Credits) ko panel me top-up karega.
                </span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-emerald-950 mb-1">
                  Bill Amount in ₹ INR (Sent to Billing) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  disabled={paymentMode === 'DEMO'}
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val);
                    if (activeNumericRate > 0) {
                      setCreditCount(String(Math.round((Number(val) || 0) / activeNumericRate)));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-sm font-black text-emerald-800 disabled:bg-slate-100"
                />
                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                  {paymentMode === 'DEMO'
                    ? 'Demo mode: ₹0 (No Billing Entry)'
                    : `Auto-calculated @ ₹${activeNumericRate}/unit for Tally Bill`}
                </span>
              </div>
            </div>

            {/* 4. Client Message / Payment Proof Screenshot (Ctrl+V Paste) */}
            <div
              onPaste={(e) => handleClipboardPaste(e, setScreenshotDataUrl, setScreenshotName)}
              tabIndex={0}
              className={`p-3.5 rounded-2xl border-2 border-dashed transition outline-none ${
                screenshotDataUrl
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-slate-50 border-slate-300 hover:border-indigo-400 focus:border-indigo-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  4. Attach Client Message / Payment Screenshot (Ctrl+V) *
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshotDataUrl(
                        buildSampleScreenshotSvg(selectedClientObj.username, amount, creditCount)
                      );
                      setScreenshotName('client-whatsapp-request.svg');
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    Use Sample Proof
                  </button>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    Ctrl+V to Paste
                  </span>
                </div>
              </div>

              {screenshotDataUrl ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-emerald-300 max-h-36 flex justify-center bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={screenshotDataUrl}
                      alt="Client screenshot preview"
                      className="max-h-32 object-contain rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
                    <span>✓ Attached: {screenshotName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotDataUrl('');
                        setScreenshotName('');
                      }}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <UploadCloud className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-700">
                    Press Ctrl+V to paste Client Message / Payment Screenshot
                  </div>
                  <label className="inline-block mt-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                    <span>Or Browse Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await fileToDataUrl(file);
                          setScreenshotDataUrl(url);
                          setScreenshotName(file.name);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remark / UTR Note (Optional)
              </label>
              <input
                value={agentNotes}
                onChange={(e) => setAgentNotes(e.target.value)}
                onPaste={(e) => handleClipboardPaste(e, setScreenshotDataUrl, setScreenshotName)}
                placeholder="e.g., Urgent campaign recharge..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm ${
                  isExternalCampaignMode
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                {isExternalCampaignMode
                  ? '🚀 Dispatch Campaign Direct to Support (Loop: AM & Admin)'
                  : paymentMode === 'DEMO'
                  ? 'Send Demo Request Directly to Support'
                  : 'Submit to Billing for Tally Bill'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================================== */}
      {/* MODAL 1B: AGENT / AM CONFIRMS BILLING DETAILS FOR LIVE EXTERNAL CAMPAIGN             */}
      {/* ==================================================================================== */}
      <Modal
        open={Boolean(updateBillingTarget)}
        onClose={() => setUpdateBillingTarget(null)}
        title={`Confirm Billing Details for LIVE Campaign: @${updateBillingTarget?.username || ''}`}
        subtitle="Provide or verify Billing Entity, GST Number & Final Bill Value so Billing can raise the Tally Invoice."
      >
        {updateBillingTarget && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await onAction('UPDATE_EXTERNAL_CAMPAIGN_BILLING_DETAILS', {
                rechargeId: updateBillingTarget.id,
                billingEntity: editBillingEntity,
                gstNumber: editGstNumber,
                amount: Number(editAmount) || updateBillingTarget.amount,
                note: editNote,
              });
              if (ok) setUpdateBillingTarget(null);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Billing Entity Name *
                </label>
                <input
                  required
                  value={editBillingEntity}
                  onChange={(e) => setEditBillingEntity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client GSTIN Number
                </label>
                <input
                  value={editGstNumber}
                  onChange={(e) => setEditGstNumber(e.target.value.toUpperCase())}
                  placeholder="15-digit GSTIN or leave blank if Non-GST"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Final Billable Amount (₹ INR) *
              </label>
              <input
                type="number"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Note for Billing Team *
              </label>
              <textarea
                rows={2}
                required
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setUpdateBillingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save &amp; Notify Billing Team
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================================== */}
      {/* MODAL 2: BILLING CREATES TALLY BILL (Sees Full Billing Entity, GSTIN, Payment Mode)  */}
      {/* ==================================================================================== */}
      <Modal
        open={Boolean(tallyTarget)}
        onClose={() => setTallyTarget(null)}
        title={`Create Tally Bill & Forward to Support: @${tallyTarget?.username || ''}`}
        subtitle="Verify pre-saved Billing Entity, GST Number & Payment Mode to generate Tally Tax Invoice."
      >
        {tallyTarget && (
          <form onSubmit={handleTallySubmit} className="space-y-4">
            {/* Complete Billing Master Sheet */}
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 border-b border-sky-200/80 pb-1">
                Client Billing Master Details (For Tally Entry)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-sky-700 block">Billing Entity Name:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {tallyTarget.billingEntity || `${tallyTarget.companyName} Pvt Ltd`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-700 block">Client GSTIN Number:</span>
                  <span className="font-mono font-extrabold text-indigo-900 text-sm">
                    {tallyTarget.paymentMode === 'NON_GST'
                      ? 'NON-GST BILLING'
                      : tallyTarget.gstNumber || '27AABCU9603R1ZM'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-700 block">Payment Mode:</span>
                  <span className="font-extrabold text-emerald-800">
                    {tallyTarget.paymentMode || 'PREPAID'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-700 block">Service &amp; Rate:</span>
                  <span className="font-bold text-slate-900">
                    {tallyTarget.service} ({tallyTarget.unitRate})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-700 block">Recharge Count (For Support):</span>
                  <span className="font-extrabold text-indigo-900">
                    {(tallyTarget.creditCount || 100000).toLocaleString('en-IN')} Credits
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-sky-700 block">Total Bill Amount (₹):</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatINR(tallyTarget.amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tally Bill / Invoice Number *
                </label>
                <input
                  required
                  value={tallyInvoiceNumber}
                  onChange={(e) => setTallyInvoiceNumber(e.target.value)}
                  placeholder="e.g., TALLY-2026-4819"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Status *
                </label>
                <select
                  value={tallyPaymentStatus}
                  onChange={(e) => setTallyPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                >
                  <option value="PAID">PAID (Verified)</option>
                  <option value="PENDING">PENDING (Postpaid Credit)</option>
                  <option value="PARTIAL">PARTIAL</option>
                </select>
              </div>
            </div>

            {/* Upload Tally Bill Screenshot / Copy (Ctrl+V supported) */}
            <div
              onPaste={(e) => handleClipboardPaste(e, setTallyFileDataUrl, setTallyFileName)}
              tabIndex={0}
              className="p-3.5 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 text-center space-y-2 outline-none"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Attach Tally Bill Copy / Screenshot *
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTallyFileDataUrl(
                      buildSampleTallyBillSvg(tallyTarget, tallyInvoiceNumber, tallyPaymentStatus)
                    );
                    setTallyFileName(`${tallyInvoiceNumber}.svg`);
                  }}
                  className="text-[11px] font-bold text-sky-700 hover:underline"
                >
                  Auto-Generate Tally Bill Preview
                </button>
              </div>

              {tallyFileDataUrl ? (
                <div className="space-y-1.5">
                  <div className="max-h-36 overflow-hidden rounded-lg border border-sky-200 bg-white flex justify-center p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tallyFileDataUrl} alt="Tally Bill" className="max-h-32 object-contain" />
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold">
                    ✓ Tally Bill Attached: {tallyFileName}
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <div className="text-xs font-semibold text-slate-600">
                    Press Ctrl+V to paste Tally Bill screenshot or click Auto-Generate above
                  </div>
                  <label className="inline-block mt-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer">
                    <span>Browse Tally PDF / Image</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await fileToDataUrl(file);
                          setTallyFileDataUrl(url);
                          setTallyFileName(file.name);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Billing / Tally Remark
              </label>
              <input
                value={tallyPaymentNote}
                onChange={(e) => setTallyPaymentNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTallyTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Save Tally Bill &amp; Forward to Support
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ==================================================================================== */}
      {/* MODAL 3: SUPPORT EXECUTES PANEL RECHARGE (Shows ONLY Username, Service, Agent, AM, Count) */}
      {/* ==================================================================================== */}
      <Modal
        open={Boolean(supportTarget)}
        onClose={() => setSupportTarget(null)}
        title={`Execute Panel Recharge: @${supportTarget?.username || ''}`}
        subtitle={`Service: ${supportTarget?.service} • Count: ${(supportTarget?.creditCount || 100000).toLocaleString('en-IN')} Credits`}
      >
        {supportTarget && (() => {
          const masterOnb = db.onboardingRequests.find((o) => o.id === supportTarget.onboardingId);
          const supportAm = supportTarget.accountManagerName || masterOnb?.accountManagerName || 'Neha Kapoor';
          const supportCount =
            supportTarget.creditCount ||
            Math.round((supportTarget.amount || 14000) / getNumericRateForService(masterOnb, supportTarget.service));

          return (
            <form onSubmit={handleSupportCompleteSubmit} className="space-y-4">
              {/* Strictly the 5 Fields Requested by User for Support */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                  <span className="text-amber-800 font-semibold">1. Panel Account Username:</span>
                  <span className="font-mono font-black text-base text-indigo-900 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                    @{supportTarget.username}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                  <span className="text-amber-800 font-semibold">2. Service to Provision / Top-Up:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {supportTarget.service}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                  <span className="text-amber-800 font-semibold">3. Sales Agent Name:</span>
                  <span className="font-bold text-slate-900">
                    {supportTarget.agentName}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                  <span className="text-amber-800 font-semibold">4. Account Manager Name:</span>
                  <span className="font-bold text-indigo-900">
                    {supportAm}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-amber-900 font-bold">5. Recharge Count (Credits to Add):</span>
                  <span className="font-black text-base text-emerald-700 bg-emerald-100/80 px-3 py-0.5 rounded-lg border border-emerald-300">
                    {supportCount.toLocaleString('en-IN')} Credits
                  </span>
                </div>
              </div>

              {/* Support Panel Screenshot Paste / Upload */}
              <div
                onPaste={(e) => handleClipboardPaste(e, setSupportProofUrl, setSupportProofName)}
                tabIndex={0}
                className="p-3.5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 text-center space-y-2 outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    Attach Panel Recharge Screenshot (Ctrl+V) *
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSupportProofUrl(buildSampleSupportPanelSvg({ ...supportTarget, creditCount: supportCount }));
                      setSupportProofName(`panel-recharged-${supportTarget.username}.svg`);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    Generate Panel Proof Snapshot
                  </button>
                </div>

                {supportProofUrl ? (
                  <div className="space-y-1.5">
                    <div className="max-h-36 overflow-hidden rounded-lg border border-emerald-300 bg-slate-900 flex justify-center p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={supportProofUrl} alt="Support Recharge Proof" className="max-h-32 object-contain" />
                    </div>
                    <div className="text-[11px] text-emerald-800 font-bold">
                      ✓ Attached Panel Screenshot: {supportProofName}
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="text-xs font-semibold text-slate-600">
                      Press Ctrl+V to paste Panel Recharge Screenshot
                    </div>
                    <label className="inline-block mt-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-slate-700 cursor-pointer">
                      <span>Browse Screenshot</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await fileToDataUrl(file);
                            setSupportProofUrl(url);
                            setSupportProofName(file.name);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Support Panel Recharge Confirmation Note *
                </label>
                <textarea
                  rows={2}
                  required
                  value={supportNote}
                  onChange={(e) => setSupportNote(e.target.value)}
                  onPaste={(e) => handleClipboardPaste(e, setSupportProofUrl, setSupportProofName)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSupportTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete Recharge &amp; Mark DONE
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* MODAL 4: Preview Any Proof / Tally Bill / Support Screenshot */}
      <Modal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.title || 'Document Preview'}
        subtitle={previewImage?.subtitle || ''}
        maxWidth="max-w-2xl"
      >
        {previewImage && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900/95 p-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] object-contain rounded"
              />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>File: {previewImage.fileName}</span>
              <a
                href={previewImage.url}
                download={previewImage.fileName}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold inline-flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Copy
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Client-Specific Recharge & Live Tracking Popup Modal */}
      <Modal
        open={Boolean(trackingClient)}
        onClose={() => setTrackingClient(null)}
        title={`Recharge & Live Tracking — ${trackingClient?.companyName || ''}`}
        subtitle={`Panel Account: @${trackingClient?.username || ''} • Entity: ${trackingClient?.billingEntity || trackingClient?.companyName || ''}`}
        maxWidth="max-w-3xl"
      >
        {trackingClient && (() => {
          const clientRecharges = db.rechargeRequests.filter(
            (r) =>
              r.onboardingId === trackingClient.id ||
              r.username.toLowerCase() === trackingClient.username.toLowerCase()
          );

          if (clientRecharges.length === 0) {
            return (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No recharges or external campaigns submitted for @{trackingClient.username} yet.
              </div>
            );
          }

          return (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {clientRecharges.map((req) => (
                <div
                  key={`track-${req.id}`}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#0A1B3F]">
                        {req.service} • {req.creditCount ? `${req.creditCount.toLocaleString('en-IN')} Credits` : ''} ({formatINR(req.amount)})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Requested: {formatDateTime(req.createdAt)} • Mode: {req.paymentMode || 'PREPAID'}
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  <CuteRechargeOrderTracker req={req} />

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {req.screenshotDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerDirectDownload(
                            req.screenshotDataUrl,
                            req.screenshotName || `client-proof-${req.username}.png`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3 text-indigo-600" />
                        Client Proof
                      </button>
                    )}
                    {req.billingTaxInvoiceDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerDirectDownload(
                            req.billingTaxInvoiceDataUrl!,
                            req.billingTaxInvoiceName || `${req.billingInvoiceNumber || 'Invoice'}.svg`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Receipt className="w-3 h-3" />
                        Tally Bill #{req.billingInvoiceNumber}
                      </button>
                    )}
                    {req.supportScreenshotDataUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerDirectDownload(
                            req.supportScreenshotDataUrl!,
                            req.supportScreenshotName || `support-proof-${req.username}.png`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Support Screenshot
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
