'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  CheckSquare,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  MoreVertical,
  PenLine,
  Percent,
  Phone,
  PhoneCall,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import {
  CallConnectStatus,
  CrmDatabase,
  Lead,
  LeadQuotation,
  LeadStatus,
  ServicePriceItem,
  User,
} from '@/types/crm';
import {
  formatDateTime,
  formatINR,
  Modal,
  parseCsvLeads,
  StatusBadge,
} from './ui';
import { generateQuotationPdfBlob } from '@/lib/pdfGenerator';
import {
  createInitialQuotationFromLead,
  QuotationModal,
  SERVICE_DEFAULTS,
  SERVICE_TEMPLATES,
} from './QuotationModal';

const TODAY_DATE = new Date().toISOString().slice(0, 10);

const SERVICE_OPTIONS = Object.keys(SERVICE_TEMPLATES);

const SAMPLE_CSV = `leadDate,companyName,designation,clientName,phone,email,linkedinUrl,cityLocation,feedbackRemark
${TODAY_DATE},CloudScale India,VP Marketing,Aarav Kapoor,+91 98200 11223,aarav@cloudscale.in,https://linkedin.com/in/aarav-kapoor,Mumbai,Interested in WhatsApp API demo next week
${TODAY_DATE},BrightMart Retail,Head of Growth,Nidhi Verma,+91 98111 44556,nidhi@brightmart.in,https://linkedin.com/in/nidhi-verma,Bengaluru,Needs Bulk SMS pricing for festive campaign
${TODAY_DATE},LogiTrack Express,Operations Manager,Tushar Jain,+91 97654 33221,tushar@logitrack.co,https://linkedin.com/in/tushar-jain,Delhi NCR,Asked to share IVR + OBD proposal on email`;

export function LeadsSection({
  db,
  currentUser,
  initialUploadMode,
  onClearInitialUpload,
  onAction,
  onQuickOnboard,
  onQuickMeet,
}: {
  db: CrmDatabase;
  currentUser: User;
  initialUploadMode?: 'CSV' | 'MANUAL' | null;
  onClearInitialUpload?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
  onQuickOnboard: (lead: Lead) => void;
  onQuickMeet: (lead: Lead) => void;
}) {
  const role = currentUser.role;
  const isManager = role === 'ADMIN' || role === 'ACCOUNT_MANAGER';
  const canUpload = isManager || role === 'AGENT';
  const agents = db.users.filter((u) => u.role === 'AGENT');
  const assignableUsers = db.users.filter((u) => u.role === 'AGENT' || u.role === 'ACCOUNT_MANAGER');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [agentFilter, setAgentFilter] = useState<string>('ALL');
  const [viewScope, setViewScope] = useState<'ALL' | 'MY' | 'AGENT' | 'UNASSIGNED'>('ALL');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Upload Leads Modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'MANUAL' | 'CSV'>('CSV');
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [uploadedFileName, setUploadedFileName] = useState('');

  useEffect(() => {
    if (initialUploadMode) {
      setUploadMode(initialUploadMode);
      setUploadOpen(true);
    }
  }, [initialUploadMode]);
  const [manualLead, setManualLead] = useState({
    leadDate: TODAY_DATE,
    companyName: '',
    designation: '',
    clientName: '',
    phone: '',
    email: '',
    linkedinUrl: '',
    cityLocation: '',
    feedbackRemark: '',
  });

  // Distribute Leads Modal
  const [distOpen, setDistOpen] = useState(false);
  const [distMode, setDistMode] = useState<'COUNT' | 'PERCENTAGE'>('COUNT');
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  // Call / Email / Status Log Modal
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [callConnectStatus, setCallConnectStatus] =
    useState<CallConnectStatus>('CONNECTED');
  const [logStatus, setLogStatus] = useState<LeadStatus>('HOT');
  const [logType, setLogType] = useState<'CALL' | 'EMAIL'>('CALL');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceItems, setServiceItems] = useState<ServicePriceItem[]>([]);
  const [draftQuotation, setDraftQuotation] = useState<LeadQuotation | null>(
    null
  );
  const [quotationSent, setQuotationSent] = useState<boolean>(false);
  const [quotationChannel, setQuotationChannel] = useState<string>('Email');
  const [quotationAmount, setQuotationAmount] = useState<string>('');
  const [logSummary, setLogSummary] = useState('');

  // Standalone / Edit Quotation Modal
  const [quotationModalState, setQuotationModalState] = useState<{
    lead: Lead;
    initial: LeadQuotation | null;
    startInEdit: boolean;
    fromCallModal: boolean;
  } | null>(null);

  // Cross Check Quotation Modal
  const [crossCheckModalState, setCrossCheckModalState] = useState<{
    lead: Lead;
    quotation: LeadQuotation;
  } | null>(null);

  // Email Preview & Edit Before Sending Modal
  const [emailPreviewModal, setEmailPreviewModal] = useState<{
    open: boolean;
    to: string;
    cc: string;
    subject: string;
    body: string;
    proposalNumber: string;
    attachPdf: boolean;
    quotation: LeadQuotation;
    sending: boolean;
    customUploadedFile?: {
      filename: string;
      base64: string;
    } | null;
    customSignatureHtml?: string | null;
  } | null>(null);

  // Reminder Modal
  const [reminderLead, setReminderLead] = useState<Lead | null>(null);
  const [reminderDatetime, setReminderDatetime] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  // Activity History Modal
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);

  // Edit Lead Details Modal
  const [editLead, setEditLead] = useState<Lead | null>(null);

  // Quick Meet / Demo Modal from Lead Row
  const [meetModalLead, setMeetModalLead] = useState<Lead | null>(null);
  const [meetSubmitting, setMeetSubmitting] = useState(false);
  const [meetSuccessPopup, setMeetSuccessPopup] = useState<{
    open: boolean;
    clientName: string;
    companyName: string;
    date: string;
    time: string;
    platform: string;
    meetLink?: string;
    anydeskAddress?: string;
    ultraviewerId?: string;
    ultraviewerPassword?: string;
  } | null>(null);
  const [meetScheduledDate, setMeetScheduledDate] = useState(
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  );
  const [meetScheduledTime, setMeetScheduledTime] = useState('14:30');
  const [meetPlatform, setMeetPlatform] = useState('Google Meet');
  const [meetLink, setMeetLink] = useState('');
  const [meetAnydeskAddress, setMeetAnydeskAddress] = useState('');
  const [meetUltraviewerId, setMeetUltraviewerId] = useState('');
  const [meetUltraviewerPassword, setMeetUltraviewerPassword] = useState('');
  const [meetAgenda, setMeetAgenda] = useState('');
  const [editForm, setEditForm] = useState({
    leadDate: TODAY_DATE,
    companyName: '',
    designation: '',
    clientName: '',
    phone: '',
    email: '',
    linkedinUrl: '',
    cityLocation: '',
    feedbackRemark: '',
  });

  const openCallStatusModal = (lead: Lead) => {
    setActiveLead(lead);
    setCallConnectStatus(lead.callConnectStatus || 'CONNECTED');
    setLogStatus(lead.status === 'NEW' ? 'WARM' : lead.status);
    setLogType('CALL');
    const existingItems: ServicePriceItem[] =
      lead.serviceItems && lead.serviceItems.length > 0
        ? lead.serviceItems
        : (lead.selectedServices || []).map((svc) => {
            const def = SERVICE_DEFAULTS[svc] || { rate: 1, count: 1000 };
            return {
              service: svc,
              rate: def.rate,
              count: def.count,
              amount: Number((def.rate * def.count).toFixed(2)),
            };
          });
    setServiceItems(existingItems);
    setSelectedServices(
      existingItems.length > 0
        ? existingItems.map((i) => i.service)
        : lead.selectedServices || []
    );
    setDraftQuotation(lead.quotation || null);
    setQuotationSent(Boolean(lead.quotationSent));
    setQuotationChannel(lead.quotationChannel || 'Email + WhatsApp');
    setQuotationAmount(
      lead.quotation?.totalAmount
        ? String(lead.quotation.totalAmount)
        : lead.quotationAmount
        ? String(lead.quotationAmount)
        : ''
    );
    setLogSummary('');
  };

  const openEditLeadModal = (lead: Lead) => {
    setEditLead(lead);
    setEditForm({
      leadDate: lead.leadDate || lead.createdAt.slice(0, 10),
      companyName: lead.companyName || '',
      designation: lead.designation || '',
      clientName: lead.clientName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      linkedinUrl: lead.linkedinUrl || '',
      cityLocation: lead.cityLocation || '',
      feedbackRemark: lead.feedbackRemark || '',
    });
  };

  const handleEditLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    const ok = await onAction('EDIT_LEAD', {
      leadId: editLead.id,
      ...editForm,
    });
    if (ok) setEditLead(null);
  };

  const unassignedLeads = db.leads.filter((l) => !l.assignedToAgentId);

  const filteredLeads = useMemo(() => {
    return db.leads.filter((l) => {
      // By default in Active Leads table, once a client is ONBOARDED, they move to Onboarding section
      if (statusFilter === 'ALL') {
        if (l.status === 'ONBOARDED') return false;
      } else if (l.status !== statusFilter) {
        return false;
      }
      // View scope for Manager / AM
      if (viewScope === 'MY' && l.assignedToAgentId !== currentUser.id) return false;
      if (viewScope === 'AGENT' && (!l.assignedToAgentId || l.assignedToAgentId === currentUser.id)) return false;
      if (viewScope === 'UNASSIGNED' && l.assignedToAgentId) return false;

      // Specific agent dropdown filter
      if (agentFilter === 'UNASSIGNED' && l.assignedToAgentId) return false;
      if (agentFilter === 'MY' && l.assignedToAgentId !== currentUser.id) return false;
      if (
        agentFilter !== 'ALL' &&
        agentFilter !== 'MY' &&
        agentFilter !== 'UNASSIGNED' &&
        l.assignedToAgentId !== agentFilter
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          l.clientName.toLowerCase().includes(q) ||
          l.companyName.toLowerCase().includes(q) ||
          (l.designation || '').toLowerCase().includes(q) ||
          (l.cityLocation || '').toLowerCase().includes(q) ||
          (l.feedbackRemark || '').toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.serviceInterest.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.leads, statusFilter, agentFilter, viewScope, currentUser.id, search]);

  const poolForDistribution =
    selectedLeadIds.length > 0
      ? db.leads.filter((l) => selectedLeadIds.includes(l.id))
      : unassignedLeads;

  const totalAllocationValue = assignableUsers.reduce(
    (s, a) => s + (Number(allocations[a.id]) || 0),
    0
  );

  const openDistributeModal = () => {
    const defaults: Record<string, number> = {};
    const targetList = assignableUsers.length > 0 ? assignableUsers : agents;
    if (distMode === 'COUNT') {
      targetList.forEach((a, i) => {
        defaults[a.id] = i === 0 ? Math.ceil(poolForDistribution.length / 2) : Math.floor(poolForDistribution.length / Math.max(1, targetList.length));
      });
    } else {
      targetList.forEach((a, i) => {
        defaults[a.id] = i === 0 ? 50 : i === 1 ? 30 : 20;
      });
    }
    setAllocations(defaults);
    setDistOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const leadsPayload =
      uploadMode === 'CSV'
        ? parseCsvLeads(csvText)
        : [manualLead].filter((l) => l.clientName.trim());

    if (leadsPayload.length === 0) return;
    const ok = await onAction('UPLOAD_LEADS', {
      leads: leadsPayload,
      uploadSourceLabel:
        uploadMode === 'CSV'
          ? uploadedFileName || 'CSV File Import'
          : 'Single Lead Form',
    });
    if (ok) {
      setUploadOpen(false);
      onClearInitialUpload?.();
      setUploadedFileName('');
      setManualLead({
        leadDate: TODAY_DATE,
        companyName: '',
        designation: '',
        clientName: '',
        phone: '',
        email: '',
        linkedinUrl: '',
        cityLocation: '',
        feedbackRemark: '',
      });
    }
  };

  const handleCsvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setUploadedFileName(file.name);
    setCsvText(text);
  };

  const handleDistributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payloadAllocations = agents.map((a) => ({
      agentId: a.id,
      value: Number(allocations[a.id]) || 0,
    }));
    const ok = await onAction('DISTRIBUTE_LEADS', {
      mode: distMode,
      leadIds: selectedLeadIds.length > 0 ? selectedLeadIds : undefined,
      allocations: payloadAllocations,
    });
    if (ok) {
      setDistOpen(false);
      setSelectedLeadIds([]);
    }
  };

  const handleCancelCallModalWithQuotation = async () => {
    if (!activeLead) return;
    if (draftQuotation) {
      // Save log: Quotation generated but client ko send nahi hua (Cancelled)
      const subtotal = serviceItems.reduce((s, i) => s + i.amount, 0);
      await onAction('UPDATE_LEAD_STATUS', {
        leadId: activeLead.id,
        callConnectStatus,
        status: callConnectStatus === 'CONNECTED' ? logStatus : activeLead.status,
        activityType: logType,
        services: callConnectStatus === 'CONNECTED' ? selectedServices : [],
        serviceItems: callConnectStatus === 'CONNECTED' ? serviceItems : [],
        quotation: draftQuotation,
        quotationCreatedNotSent: true,
        quotationSent: false,
        summary: logSummary || 'Quotation create hua par client ko send nahi kiya gaya (Cancelled by Agent).',
      });
    }
    setActiveLead(null);
    setLogSummary('');
    setDraftQuotation(null);
  };

  const handleSendMailAndSave = () => {
    if (!activeLead || !draftQuotation) return;
    const toEmail = activeLead.email || '';
    const activeEmail = currentUser.mailConfig?.email || currentUser.email || draftQuotation.managerEmail || 'parvej@immenseair.in';
    const activeName = currentUser.name || draftQuotation.managerName || 'Account Manager';
    const activeDesignation = currentUser.designation || (currentUser.role === 'ADMIN' ? 'General Manager' : (draftQuotation.managerDesignation || 'Sales & Marketing Manager'));
    const activePhone = currentUser.phone || draftQuotation.managerPhone || '+91 9768566466';

    const customSignature = currentUser.mailSignature || currentUser.mailConfig?.signature;
    const dynamicSignature = customSignature
      ? customSignature
      : `Warm regards,\n${activeName}\n${activeDesignation}\nImmense Air Pvt Ltd (Immense Smart Solutions)\nMobile: ${activePhone} | Email: ${activeEmail}\nWebsite: www.immenseair.in`;

    const ccEmail = [activeEmail, 'vikram.admin@nexuscrm.in'].filter(Boolean).join(',');
    const rawName = (activeLead.clientName || '').trim();
    const clientGreeting = rawName ? `Dear ${rawName} Sir/Ma'am,` : "Dear Sir/Ma'am,";
    const defaultSubject = `Bulk SMS & Communication Proposal | Immense Smart Solutions — ${draftQuotation.quotationNumber}`;

    const defaultBody = `${clientGreeting}

Take your organization's marketing to the next level with Immense Smart Solutions!

📩 Bulk SMS
💬 RCS Messaging
📲 WhatsApp API
📞 IVR Solutions

Proposal Details:
• Proposal No: ${draftQuotation.quotationNumber}
• Date: ${draftQuotation.quotationDate}
• Valid Until: ${draftQuotation.validUntil}
• Total Amount: ₹ ${draftQuotation.totalAmount.toLocaleString('en-IN')} (incl. ${draftQuotation.gstPercent}% GST)

Why Choose Us?

✅ Instant Content Approval
✅ Post-paid Billing up to 30 Days
✅ Customization SMS Options
✅ Send SMS without DLT
✅ Special Route for Real Estate Sector
✅ Link Tracking & Analytics
✅ Dedicated Account Manager & 24/7 Support
✅ Sunday Operations
✅ Detailed Reports in Excel

We're committed to delivering real results with:
🏡 Real Estate, IT Firm, MSME Enterprises, Manufacturer, International Schools, Events Companies, Large Public Listed Companies. We have expertise and a dedicated service team. 💰 Cost-effective solutions | 📊 Data-driven strategies

Let's connect and explore how we can boost your sales and engagement!

Please find your official proposal PDF attached with this email.

${dynamicSignature}`;

    setEmailPreviewModal({
      open: true,
      to: toEmail,
      cc: ccEmail,
      subject: defaultSubject,
      body: defaultBody,
      proposalNumber: draftQuotation.quotationNumber,
      attachPdf: true,
      quotation: draftQuotation,
      sending: false,
      customUploadedFile: null,
      customSignatureHtml: currentUser.mailSignatureHtml || currentUser.mailConfig?.signatureHtml || null,
    });
  };

  const handleSendWhatsAppAndSave = async () => {
    if (!activeLead || !draftQuotation) return;
    let cleanPhone = (activeLead.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    const servicesList = draftQuotation.items.map((i) => `• ${i.service}`).join('\n');
    const message = `Hello *${activeLead.clientName || 'Sir/Madam'}*,\n\nGreetings from *Immense Air Pvt Ltd*!\n\nHere is your official *Business Proposal*:\n📄 *Proposal No:* ${draftQuotation.quotationNumber}\n🏢 *Company:* ${activeLead.companyName}\n\n*Services Included:*\n${servicesList}\n\n💰 *Grand Total:* ₹ ${draftQuotation.totalAmount.toLocaleString('en-IN')}\n\nFor any queries, feel free to contact:\n👤 *${draftQuotation.managerName || 'Account Manager'}* (${draftQuotation.managerDesignation || 'Sales'})\n📞 ${draftQuotation.managerPhone || '+91 9768566466'} | ✉️ ${draftQuotation.managerEmail || 'sales@immenseair.in'}\n\nThank you for choosing Immense Air!`;

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Save lead update & log with Quotation Sent via WhatsApp
    const subtotal = serviceItems.reduce((s, i) => s + i.amount, 0);
    await onAction('UPDATE_LEAD_STATUS', {
      leadId: activeLead.id,
      callConnectStatus,
      status: callConnectStatus === 'CONNECTED' ? logStatus : activeLead.status,
      activityType: logType,
      services: callConnectStatus === 'CONNECTED' ? selectedServices : [],
      serviceItems: callConnectStatus === 'CONNECTED' ? serviceItems : [],
      quotation: draftQuotation,
      quotationSent: true,
      quotationChannel: 'WhatsApp',
      quotationAmount: draftQuotation.totalAmount || subtotal,
      summary: logSummary || `Quotation ${draftQuotation.quotationNumber} shared via WhatsApp.`,
    });

    setActiveLead(null);
    setLogSummary('');
    setDraftQuotation(null);
  };

  const handleUpdateLeadStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;
    const subtotal = serviceItems.reduce((s, i) => s + i.amount, 0);
    const ok = await onAction('UPDATE_LEAD_STATUS', {
      leadId: activeLead.id,
      callConnectStatus,
      status: callConnectStatus === 'CONNECTED' ? logStatus : activeLead.status,
      activityType: logType,
      services: callConnectStatus === 'CONNECTED' ? selectedServices : [],
      serviceItems: callConnectStatus === 'CONNECTED' ? serviceItems : [],
      quotation:
        callConnectStatus === 'CONNECTED' && draftQuotation
          ? draftQuotation
          : undefined,
      quotationSent: callConnectStatus === 'CONNECTED' ? quotationSent : false,
      quotationChannel:
        callConnectStatus === 'CONNECTED' && quotationSent
          ? quotationChannel
          : '',
      quotationAmount:
        callConnectStatus === 'CONNECTED' && quotationSent
          ? quotationAmount
            ? Number(quotationAmount)
            : draftQuotation?.totalAmount || subtotal || undefined
          : undefined,
      summary: logSummary,
    });
    if (ok) {
      setActiveLead(null);
      setLogSummary('');
    }
  };

  const toggleCallService = (svc: string) => {
    const exists = selectedServices.includes(svc);
    if (exists) {
      setSelectedServices((prev) => prev.filter((s) => s !== svc));
      setServiceItems((prev) => prev.filter((item) => item.service !== svc));
    } else {
      const def = SERVICE_DEFAULTS[svc] || { rate: 1, count: 1000 };
      setSelectedServices((prev) => [...prev, svc]);
      setServiceItems((prev) => [
        ...prev,
        {
          service: svc,
          rate: def.rate,
          count: def.count,
          amount: Number((def.rate * def.count).toFixed(2)),
        },
      ]);
    }
  };

  const updateServiceRateCount = (
    svc: string,
    field: 'rate' | 'count',
    value: number
  ) => {
    const safeVal = Math.max(0, value);
    setServiceItems((prev) =>
      prev.map((item) => {
        if (item.service !== svc) return item;
        const nextRate = field === 'rate' ? safeVal : item.rate;
        const nextCount = field === 'count' ? safeVal : item.count;
        return {
          ...item,
          rate: nextRate,
          count: nextCount,
          amount: Number((nextRate * nextCount).toFixed(2)),
        };
      })
    );
  };

  const handleGenerateQuotationInModal = () => {
    if (!activeLead) return;
    const itemsToUse =
      serviceItems.length > 0
        ? serviceItems
        : [
            {
              service: 'Bulk SMS (DLT)',
              rate: SERVICE_TEMPLATES['Bulk SMS (DLT)'].rate,
              count: SERVICE_TEMPLATES['Bulk SMS (DLT)'].count,
              amount: Number(
                (
                  SERVICE_TEMPLATES['Bulk SMS (DLT)'].rate *
                  SERVICE_TEMPLATES['Bulk SMS (DLT)'].count
                ).toFixed(2)
              ),
            },
          ];
    if (serviceItems.length === 0) {
      setServiceItems(itemsToUse);
      setSelectedServices(['Bulk SMS (DLT)']);
    }
    const activeEmail = currentUser.mailConfig?.email || currentUser.email || 'parvej@immenseair.in';
    const activeName = currentUser.name || 'Sales Manager';
    const activeDesignation = currentUser.role === 'ADMIN' ? 'General Manager' : 'Sales & Marketing Manager';

    const qt = createInitialQuotationFromLead(
      activeLead,
      itemsToUse,
      quotationChannel,
      {
        name: activeName,
        designation: activeDesignation,
        email: activeEmail,
        phone: '+91 9768566466',
      }
    );
    setDraftQuotation(qt);
    setQuotationSent(false);
    setQuotationAmount(String(qt.totalAmount));

    // Automatically trigger instant PDF download of generated quotation
    try {
      const { blob } = generateQuotationPdfBlob(qt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposal_${qt.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (downloadErr) {
      console.warn('Auto download error:', downloadErr);
    }

    // Immediately open Live A4 Proposal Preview on click!
    setQuotationModalState({
      lead: activeLead,
      initial: qt,
      startInEdit: false,
      fromCallModal: true,
    });
  };

  const handleSetReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderLead || !reminderDatetime) return;
    const ok = await onAction('SET_REMINDER', {
      leadId: reminderLead.id,
      datetime: new Date(reminderDatetime).toISOString(),
      note: reminderNote || 'Follow-up call requested by client',
    });
    if (ok) {
      setReminderLead(null);
      setReminderNote('');
    }
  };

  const setPresetReminder = (offsetSeconds: number) => {
    const dt = new Date(Date.now() + offsetSeconds * 1000);
    const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setReminderDatetime(localIso);
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isManager
              ? 'Lead Upload, Distribution & Live Agent Monitor'
              : 'My Assigned Leads & Calling Workspace'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? 'Upload CSV or manual leads, distribute by exact Count or Percentage (%), and monitor live Hot / Warm / Cold updates from Agents.'
              : 'Call or email clients, update Hot / Warm / Cold disposition, set callback reminders, and schedule Meets for Hot leads.'}
          </p>
        </div>

        {canUpload && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setUploadMode('CSV');
                setUploadOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Lead File (.CSV)
            </button>
            <button
              onClick={() => {
                setUploadMode('MANUAL');
                setUploadOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lead
            </button>
            {isManager && (
              <button
                onClick={openDistributeModal}
                disabled={poolForDistribution.length === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Distribute{' '}
                {selectedLeadIds.length > 0
                  ? `${selectedLeadIds.length} Selected`
                  : `Unassigned (${unassignedLeads.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manager Lead Segments: My Leads (AM Leads) vs Agent Leads (Team Leads) */}
      {isManager && (
        <div className="bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Lead View:
            </span>
            <button
              type="button"
              onClick={() => { setViewScope('ALL'); setAgentFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewScope === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              All Leads ({db.leads.filter((l) => l.status !== 'ONBOARDED').length})
            </button>

            <button
              type="button"
              onClick={() => { setViewScope('MY'); setAgentFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewScope === 'MY'
                  ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-300'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {role === 'ACCOUNT_MANAGER' ? 'My Leads (Account Manager)' : 'My Leads (Admin Direct)'} (
              {db.leads.filter((l) => l.assignedToAgentId === currentUser.id && l.status !== 'ONBOARDED').length})
            </button>

            <button
              type="button"
              onClick={() => { setViewScope('AGENT'); setAgentFilter('ALL'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewScope === 'AGENT'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Agent Leads (Team Pipeline) (
              {db.leads.filter((l) => l.assignedToAgentId && l.assignedToAgentId !== currentUser.id && l.status !== 'ONBOARDED').length})
            </button>

            <button
              type="button"
              onClick={() => { setViewScope('UNASSIGNED'); setAgentFilter('UNASSIGNED'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                viewScope === 'UNASSIGNED'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Unassigned ({unassignedLeads.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Filter By Person:</span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Assignees</option>
              <option value="MY">⭐ {currentUser.name} (My Direct Leads)</option>
              <option value="UNASSIGNED">Unassigned Only ({unassignedLeads.length})</option>
              <optgroup label="Sales Team Agents">
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Agent)
                  </option>
                ))}
              </optgroup>
              {db.users.filter((u) => u.role === 'ACCOUNT_MANAGER' && u.id !== currentUser.id).length > 0 && (
                <optgroup label="Account Managers">
                  {db.users
                    .filter((u) => u.role === 'ACCOUNT_MANAGER' && u.id !== currentUser.id)
                    .map((am) => (
                      <option key={am.id} value={am.id}>
                        {am.name} (Account Manager)
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'NEW', 'HOT', 'WARM', 'COLD', 'ONBOARDED'] as const).map((st) => {
            const count =
              st === 'ALL'
                ? db.leads.filter((l) => l.status !== 'ONBOARDED').length
                : db.leads.filter((l) => l.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'HOT' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/hot.png" alt="Hot" className="w-3.5 h-3.5 object-contain" />
                )}
                {st === 'WARM' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/warm.png" alt="Warm" className="w-3.5 h-3.5 object-contain" />
                )}
                {st === 'COLD' && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/icons/cold.png" alt="Cold" className="w-3.5 h-3.5 object-contain" />
                )}
                {st} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, company, phone..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No leads match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  {isManager && (
                    <th className="py-3 pl-4 pr-2 w-8">
                      <input
                        type="checkbox"
                        checked={
                          filteredLeads.length > 0 &&
                          filteredLeads.every((l) => selectedLeadIds.includes(l.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds(filteredLeads.map((l) => l.id));
                          } else {
                            setSelectedLeadIds([]);
                          }
                        }}
                        className="rounded border-slate-300"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4">Client & Company</th>
                  <th className="py-3 px-4">Contact & Service</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Last Update / Reminder</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 align-top">
                    {isManager && (
                      <td className="py-3.5 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleSelectLead(lead.id)}
                          className="rounded border-slate-300 mt-1"
                        />
                      </td>
                    )}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {lead.clientName}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        {lead.companyName}
                        {lead.designation ? ` • ${lead.designation}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Lead Date: {lead.leadDate || lead.createdAt.slice(0, 10)}</span>
                        {lead.cityLocation && (
                          <span className="inline-flex items-center gap-0.5 text-slate-500">
                            <MapPin className="w-3 h-3" /> {lead.cityLocation}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {lead.phone || '—'}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {lead.email || '—'}
                      </div>
                      {lead.linkedinUrl && (
                        <a
                          href={
                            lead.linkedinUrl.startsWith('http')
                              ? lead.linkedinUrl
                              : `https://${lead.linkedinUrl}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline mt-1"
                        >
                          <ExternalLink className="w-3 h-3" /> LinkedIn Profile
                        </a>
                      )}
                      {lead.serviceItems && lead.serviceItems.length > 0 ? (
                        <div className="flex flex-col gap-1 mt-1.5">
                          {lead.serviceItems.map((it) => (
                            <span
                              key={it.service}
                              className="inline-flex items-center justify-between gap-2 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[10px] font-semibold"
                            >
                              <span>{it.service}</span>
                              <span>
                                ₹{it.rate} × {it.count.toLocaleString('en-IN')} = {formatINR(it.amount)}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        lead.selectedServices &&
                        lead.selectedServices.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {lead.selectedServices.map((svc) => (
                              <span
                                key={svc}
                                className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        )
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => openCallStatusModal(lead)}
                        title="Click to update Call & Lead Status"
                        className="flex flex-col items-start gap-1 text-left group"
                      >
                        <StatusBadge status={lead.status} />
                        {lead.callConnectStatus && (
                          <StatusBadge status={lead.callConnectStatus} />
                        )}
                        {lead.quotationSent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Quotation Sent
                            {lead.quotationAmount
                              ? ` (${formatINR(lead.quotationAmount)})`
                              : ''}
                          </span>
                        )}
                        <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition">
                          Click to update
                        </span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      {lead.assignedToAgentName ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              lead.assignedToAgentId === currentUser.id
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {lead.assignedToAgentName}
                            {lead.assignedToAgentId === currentUser.id && (
                              <span className="text-[10px] text-purple-600 font-bold">(You)</span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {lead.assignedToAgentId === currentUser.id
                              ? (role === 'ACCOUNT_MANAGER' ? 'Account Manager Lead' : 'Admin Lead')
                              : 'Agent Lead'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {lead.callLogs[0] ? (
                        <div className="text-xs text-slate-600 line-clamp-2">
                          <span className="font-semibold text-slate-800">
                            [{lead.callLogs[0].type}]
                          </span>{' '}
                          {lead.callLogs[0].summary}
                        </div>
                      ) : lead.feedbackRemark ? (
                        <div className="text-xs text-slate-600 line-clamp-2">
                          <span className="font-semibold text-slate-800">
                            [Remark]
                          </span>{' '}
                          {lead.feedbackRemark}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No calls logged yet</span>
                      )}
                      {lead.reminder && !lead.reminder.completed && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                          <AlarmClock className="w-3 h-3" />
                          {formatDateTime(lead.reminder.datetime)}
                        </div>
                      )}
                      {lead.callLogs.length > 0 && (
                        <button
                          onClick={() => setHistoryLead(lead)}
                          className="block mt-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          View {lead.callLogs.length} log(s)
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 relative">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionMenuId(null);
                            openCallStatusModal(lead);
                          }}
                          title="Update Call / Status"
                          aria-label="Update Call / Status"
                          className="w-8 h-8 rounded-xl bg-[#0A1B3F] hover:bg-[#0F2A5F] text-white flex items-center justify-center transition shadow-2xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionMenuId(
                              openActionMenuId === lead.id ? null : lead.id
                            )
                          }
                          title="More Actions (Edit, Quote, Reminder, Meet, Onboard)"
                          aria-label="More Actions"
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center transition ${
                            openActionMenuId === lead.id
                              ? 'bg-[#F2591F] text-white border-[#F2591F]'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openActionMenuId === lead.id && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setOpenActionMenuId(null)}
                            />
                            <div className="absolute right-0 top-9 z-40 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 text-left space-y-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  openEditLeadModal(lead);
                                }}
                                className="w-full px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center gap-2"
                              >
                                <PenLine className="w-3.5 h-3.5 text-[#0A1B3F]" />
                                Edit Lead
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setQuotationModalState({
                                    lead,
                                    initial: lead.quotation || null,
                                    startInEdit: false,
                                    fromCallModal: false,
                                  });
                                }}
                                className="w-full px-3 py-2 rounded-xl hover:bg-blue-50 text-xs font-semibold text-blue-800 flex items-center gap-2"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                {lead.quotation ? 'Preview / Edit Quote' : 'Generate Quote'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setReminderLead(lead);
                                  setPresetReminder(1800);
                                  setReminderNote(
                                    `Callback ${lead.clientName} as requested`
                                  );
                                }}
                                className="w-full px-3 py-2 rounded-xl hover:bg-orange-50 text-xs font-semibold text-[#F2591F] flex items-center gap-2"
                              >
                                <AlarmClock className="w-3.5 h-3.5 text-[#F2591F]" />
                                Set Reminder
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setMeetModalLead(lead);
                                  setMeetScheduledDate(
                                    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
                                  );
                                  setMeetScheduledTime('14:30');
                                  setMeetPlatform('Google Meet');
                                  setMeetLink('');
                                  setMeetAnydeskAddress('');
                                  setMeetUltraviewerId('');
                                  setMeetUltraviewerPassword('');
                                  setMeetAgenda(
                                    lead.quotation
                                      ? `Proposal ${lead.quotation.quotationNumber} walkthrough & live portal demo for ${lead.companyName}`
                                      : `Product demo & services discussion for ${lead.companyName}`
                                  );
                                }}
                                className="w-full px-3 py-2 rounded-xl hover:bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-2"
                              >
                                <Video className="w-3.5 h-3.5 text-rose-600" />
                                Meet / Demo
                              </button>
                              <div className="my-1 border-t border-slate-100" />
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  onQuickOnboard(lead);
                                }}
                                className="w-full px-3 py-2 rounded-xl hover:bg-emerald-50 text-xs font-bold text-emerald-700 flex items-center gap-2"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                                Onboard Client
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

      {/* Upload Leads Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          onClearInitialUpload?.();
        }}
        title={
          role === 'AGENT'
            ? 'Upload Leads to My Pipeline'
            : 'Upload New Leads'
        }
        subtitle={
          role === 'AGENT'
            ? 'Upload a .CSV lead file or add a single client lead — automatically added to your My Assigned Leads list.'
            : 'Add leads individually or bulk import via CSV, then distribute by Count or Percentage.'
        }
      >
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setUploadMode('CSV')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
              uploadMode === 'CSV'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Upload Lead File (.CSV)
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('MANUAL')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
              uploadMode === 'MANUAL'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            Single Lead Form
          </button>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {uploadMode === 'CSV' ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700">
                  Choose a .CSV / .TXT lead file or paste rows below:
                </label>
                <a
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`}
                  download="sample-leads.csv"
                  className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Sample CSV
                </a>
              </div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-xl p-4 cursor-pointer transition">
                <Upload className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs font-semibold text-slate-800">
                  {uploadedFileName
                    ? `Loaded File: ${uploadedFileName}`
                    : 'Click to browse & upload .CSV or .TXT lead file'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 text-center">
                  Columns: leadDate, companyName, designation, clientName, phone, email, linkedinUrl, cityLocation, feedbackRemark
                </span>
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={5}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs"
              />
              {(() => {
                const parsed = parseCsvLeads(csvText);
                return (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-600">
                      Detected <strong className="text-indigo-700">{parsed.length}</strong> valid lead row(s) ready to upload.
                    </div>
                    {parsed.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                        <table className="w-full text-[11px]">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-left">
                            <tr>
                              <th className="py-1.5 px-2.5">Date</th>
                              <th className="py-1.5 px-2.5">Name</th>
                              <th className="py-1.5 px-2.5">Company</th>
                              <th className="py-1.5 px-2.5">Contact</th>
                              <th className="py-1.5 px-2.5">City</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parsed.slice(0, 5).map((row, idx) => (
                              <tr key={idx}>
                                <td className="py-1.5 px-2.5 text-slate-500">{row.leadDate}</td>
                                <td className="py-1.5 px-2.5 font-medium text-slate-800">{row.clientName}</td>
                                <td className="py-1.5 px-2.5 text-slate-600">{row.companyName}</td>
                                <td className="py-1.5 px-2.5 text-slate-600">{row.phone || '—'}</td>
                                <td className="py-1.5 px-2.5 text-indigo-700">{row.cityLocation || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lead Date *
                </label>
                <input
                  type="date"
                  required
                  value={manualLead.leadDate}
                  onChange={(e) =>
                    setManualLead({ ...manualLead, leadDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  required
                  value={manualLead.companyName}
                  onChange={(e) =>
                    setManualLead({ ...manualLead, companyName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="e.g., PulseTech Pvt Ltd"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation
                </label>
                <input
                  value={manualLead.designation}
                  onChange={(e) =>
                    setManualLead({ ...manualLead, designation: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="e.g., Marketing Head / Founder"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  required
                  value={manualLead.clientName}
                  onChange={(e) =>
                    setManualLead({ ...manualLead, clientName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="e.g., Arjun Mehta"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Number *
                </label>
                <input
                  required
                  value={manualLead.phone}
                  onChange={(e) =>
                    setManualLead({ ...manualLead, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="+91 98..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mail ID
                </label>
                <input
                  type="email"
                  value={manualLead.email}
                  onChange={(e) =>
                    setManualLead({ ...manualLead, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="client@company.in"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LinkedIn Link
                </label>
                <input
                  type="url"
                  value={manualLead.linkedinUrl}
                  onChange={(e) =>
                    setManualLead({ ...manualLead, linkedinUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client City / Location
                </label>
                <input
                  value={manualLead.cityLocation}
                  onChange={(e) =>
                    setManualLead({
                      ...manualLead,
                      cityLocation: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="e.g., Mumbai, Maharashtra"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Feedback &amp; Remark
                </label>
                <textarea
                  rows={3}
                  value={manualLead.feedbackRemark}
                  onChange={(e) =>
                    setManualLead({
                      ...manualLead,
                      feedbackRemark: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="Client feedback, requirements, or initial remarks..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUploadOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
            >
              Upload Leads
            </button>
          </div>
        </form>
      </Modal>

      {/* Distribute Leads Modal */}
      <Modal
        open={distOpen}
        onClose={() => setDistOpen(false)}
        title="Distribute Leads to Agents"
        subtitle={`Pool size: ${poolForDistribution.length} ${
          selectedLeadIds.length > 0 ? 'selected' : 'unassigned'
        } lead(s).`}
      >
        <form onSubmit={handleDistributeSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDistMode('COUNT');
                const next: Record<string, number> = {};
                const perAgent = Math.floor(
                  poolForDistribution.length / Math.max(1, agents.length)
                );
                agents.forEach((a, i) => {
                  next[a.id] =
                    i === 0
                      ? poolForDistribution.length -
                        perAgent * (agents.length - 1)
                      : perAgent;
                });
                setAllocations(next);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                distMode === 'COUNT'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Distribute by Count
            </button>
            <button
              type="button"
              onClick={() => {
                setDistMode('PERCENTAGE');
                const next: Record<string, number> = {};
                agents.forEach((a, i) => {
                  next[a.id] = i === 0 ? 50 : i === 1 ? 30 : 20;
                });
                setAllocations(next);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                distMode === 'PERCENTAGE'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <Percent className="w-4 h-4" />
              Distribute by Percentage (%)
            </button>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {assignableUsers.map((agent) => {
              const val = Number(allocations[agent.id]) || 0;
              const estLeads =
                distMode === 'COUNT'
                  ? Math.min(val, poolForDistribution.length)
                  : Math.round((poolForDistribution.length * val) / 100);
              return (
                <div
                  key={agent.id}
                  className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">{agent.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${agent.role === 'ACCOUNT_MANAGER' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600'}`}>
                        {agent.role === 'ACCOUNT_MANAGER' ? 'Account Manager (TL)' : 'Sales Agent'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Preview: ~{estLeads} lead(s)
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={distMode === 'PERCENTAGE' ? 100 : poolForDistribution.length}
                      value={allocations[agent.id] ?? 0}
                      onChange={(e) =>
                        setAllocations({
                          ...allocations,
                          [agent.id]: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-right"
                    />
                    <span className="text-xs font-semibold text-slate-500 w-8">
                      {distMode === 'PERCENTAGE' ? '%' : 'leads'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-slate-600">
              {distMode === 'PERCENTAGE' ? 'Total Percentage:' : 'Total Count:'}
            </span>
            <span
              className={`font-bold ${
                (distMode === 'PERCENTAGE' && totalAllocationValue > 100) ||
                (distMode === 'COUNT' &&
                  totalAllocationValue > poolForDistribution.length)
                  ? 'text-rose-600'
                  : 'text-emerald-700'
              }`}
            >
              {totalAllocationValue}
              {distMode === 'PERCENTAGE'
                ? '% / 100%'
                : ` / ${poolForDistribution.length} available`}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDistOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                totalAllocationValue <= 0 ||
                (distMode === 'PERCENTAGE' && totalAllocationValue > 100)
              }
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Distribute Now
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Call / Email & Status Modal */}
      <Modal
        open={Boolean(activeLead)}
        onClose={() => setActiveLead(null)}
        title={`Call & Lead Status Update: ${activeLead?.clientName || ''}`}
        subtitle={`${activeLead?.companyName || ''} • ${activeLead?.phone || ''} — Updates sync to Account Manager & Admin`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleUpdateLeadStatus} className="space-y-4">
          {/* Step 1: Call Status (Ringing / Connected / Not Connected) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Call Status *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  {
                    id: 'RINGING',
                    label: 'Ringing',
                    desc: 'No answer yet',
                    activeCls: 'bg-amber-500 text-slate-950 border-amber-500',
                  },
                  {
                    id: 'CONNECTED',
                    label: 'Connected',
                    desc: 'Spoke with client',
                    activeCls: 'bg-emerald-600 text-white border-emerald-600',
                  },
                  {
                    id: 'NOT_CONNECTED',
                    label: 'Not Connected',
                    desc: 'Switched off / Busy',
                    activeCls: 'bg-slate-700 text-white border-slate-700',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCallConnectStatus(opt.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    callConnectStatus === opt.id
                      ? opt.activeCls
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      callConnectStatus === opt.id ? 'opacity-90' : 'text-slate-400'
                    }`}
                  >
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Shown ONLY when Call Status is CONNECTED */}
          {callConnectStatus === 'CONNECTED' && (
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              {/* Hot / Warm / Cold */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  2. Lead Status (Hot Lead / Warm Lead / Cold Lead) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'HOT',
                        label: 'Hot Lead',
                        icon: '/icons/hot.png',
                        activeCls: 'bg-rose-600 text-white border-rose-600',
                      },
                      {
                        id: 'WARM',
                        label: 'Warm Lead',
                        icon: '/icons/warm.png',
                        activeCls: 'bg-amber-500 text-slate-950 border-amber-500',
                      },
                      {
                        id: 'COLD',
                        label: 'Cold Lead',
                        icon: '/icons/cold.png',
                        activeCls: 'bg-cyan-600 text-white border-cyan-600',
                      },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setLogStatus(st.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                        logStatus === st.id
                          ? st.activeCls
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={st.icon}
                        alt={st.label}
                        className="w-4 h-4 object-contain"
                      />
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services Select + Per-Service Rate & Count Pricing */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  3. Select Services &amp; Set Rate / Count
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((svc) => {
                    const active = selectedServices.includes(svc);
                    return (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => toggleCallService(svc)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {svc}
                      </button>
                    );
                  })}
                </div>

                {serviceItems.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 text-left">
                        <tr>
                          <th className="py-2 px-3">Selected Service</th>
                          <th className="py-2 px-2 w-24">Rate (₹)</th>
                          <th className="py-2 px-2 w-28">Count / Qty</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {serviceItems.map((item) => (
                          <tr key={item.service}>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {item.service}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.rate}
                                onChange={(e) =>
                                  updateServiceRateCount(
                                    item.service,
                                    'rate',
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="1"
                                min={0}
                                value={item.count}
                                onChange={(e) =>
                                  updateServiceRateCount(
                                    item.service,
                                    'count',
                                    Number(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {formatINR(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(() => {
                      const sub = serviceItems.reduce((s, i) => s + i.amount, 0);
                      const gst = Number((sub * 0.18).toFixed(2));
                      const grand = Number((sub + gst).toFixed(2));
                      return (
                        <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="text-slate-600">
                            Subtotal: <strong>{formatINR(sub)}</strong> + 18% GST:{' '}
                            <strong>{formatINR(gst)}</strong>
                          </span>
                          <span className="font-bold text-indigo-700 text-xs">
                            Total Quote: {formatINR(grand)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Quotation Generate & Send Option */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    4. Generate &amp; Send Quotation
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateQuotationInModal}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {draftQuotation ? 'Regenerate Quotation' : 'Generate Quotation'}
                  </button>
                </div>

                {draftQuotation && activeLead && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/90 border border-indigo-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs">
                        <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          Generated: {draftQuotation.quotationNumber} •{' '}
                          {formatINR(draftQuotation.totalAmount)} (incl. {draftQuotation.gstPercent}% GST)
                        </div>
                        <div className="text-[11px] text-indigo-700">
                          {draftQuotation.items.length} service(s) • Valid until {draftQuotation.validUntil}
                        </div>
                      </div>

                      {/* Primary Actions: Preview, Edit, Download PDF, Cross Check */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const { blob } = generateQuotationPdfBlob(draftQuotation);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Proposal_${draftQuotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              console.error('Download error:', e);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                          title="Download quotation PDF instantly"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuotationModalState({
                              lead: activeLead,
                              initial: draftQuotation,
                              startInEdit: false,
                              fromCallModal: true,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-[#0b2559] hover:bg-[#143d8c] text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview A4
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setQuotationModalState({
                              lead: activeLead,
                              initial: draftQuotation,
                              startInEdit: true,
                              fromCallModal: true,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-100 text-indigo-800 text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                          Edit Quotation
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCrossCheckModalState({
                              lead: activeLead,
                              quotation: draftQuotation,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Cross Check Quotation
                        </button>
                      </div>
                    </div>
                  </div>
                )}

</div>
            </div>
          )}

          {/* Step 3: Remark */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {callConnectStatus === 'CONNECTED' ? '5. Remark *' : '2. Remark *'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(callConnectStatus === 'RINGING'
                  ? [
                      'Phone ringing, client did not pick up',
                      'Ringing - will retry after 2 hours',
                    ]
                  : callConnectStatus === 'NOT_CONNECTED'
                  ? [
                      'Number switched off / not reachable',
                      'Busy on another call',
                    ]
                  : [
                      'Client interested, quotation shared',
                      'Asked for technical demo meeting',
                    ]
                ).map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setLogSummary(chip)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 font-medium"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              required
              rows={3}
              value={logSummary}
              onChange={(e) => setLogSummary(e.target.value)}
              placeholder={
                callConnectStatus === 'CONNECTED'
                  ? 'Enter discussion remark, client requirement, or follow-up details...'
                  : 'Enter call remark (e.g., ringing no answer, switched off)...'
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          {/* Action Buttons below Remark */}
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
          )}
        </form>
      </Modal>

      {/* Edit Lead Details Modal */}
      <Modal
        open={Boolean(editLead)}
        onClose={() => setEditLead(null)}
        title={`Edit Lead Details: ${editLead?.clientName || ''}`}
        subtitle="Update contact info, company, city, LinkedIn link, or initial feedback."
      >
        <form onSubmit={handleEditLeadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lead Date *
              </label>
              <input
                type="date"
                required
                value={editForm.leadDate}
                onChange={(e) =>
                  setEditForm({ ...editForm, leadDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                required
                value={editForm.companyName}
                onChange={(e) =>
                  setEditForm({ ...editForm, companyName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation
              </label>
              <input
                value={editForm.designation}
                onChange={(e) =>
                  setEditForm({ ...editForm, designation: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Name *
              </label>
              <input
                required
                value={editForm.clientName}
                onChange={(e) =>
                  setEditForm({ ...editForm, clientName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number *
              </label>
              <input
                required
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mail ID
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                LinkedIn Link
              </label>
              <input
                type="url"
                value={editForm.linkedinUrl}
                onChange={(e) =>
                  setEditForm({ ...editForm, linkedinUrl: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client City / Location
              </label>
              <input
                value={editForm.cityLocation}
                onChange={(e) =>
                  setEditForm({ ...editForm, cityLocation: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Feedback &amp; Remark
              </label>
              <textarea
                rows={3}
                value={editForm.feedbackRemark}
                onChange={(e) =>
                  setEditForm({ ...editForm, feedbackRemark: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditLead(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Set Callback Reminder Modal */}
      <Modal
        open={Boolean(reminderLead)}
        onClose={() => setReminderLead(null)}
        title={`Set Callback Reminder: ${reminderLead?.clientName || ''}`}
        subtitle="You will receive a live alert notification when this time arrives."
      >
        <form onSubmit={handleSetReminder} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPresetReminder(10)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold hover:bg-amber-200"
            >
              In 10 sec (Live Test)
            </button>
            <button
              type="button"
              onClick={() => setPresetReminder(1800)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              In 30 mins
            </button>
            <button
              type="button"
              onClick={() => setPresetReminder(3600 * 3)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              In 3 hours
            </button>
            <button
              type="button"
              onClick={() => setPresetReminder(86400)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
            >
              Tomorrow same time
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Callback Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={reminderDatetime}
              onChange={(e) => setReminderDatetime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reminder Note
            </label>
            <textarea
              rows={2}
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              placeholder="Client requested a callback after 4 PM..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReminderLead(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </Modal>

      {/* Activity History & Client Interaction Lifecycle Modal */}
      <Modal
        open={Boolean(historyLead)}
        onClose={() => setHistoryLead(null)}
        title={`Client Interaction Logs & Timeline: ${historyLead?.clientName || ''}`}
        subtitle={`${historyLead?.companyName} • Phone: ${historyLead?.phone} • Email: ${historyLead?.email}`}
      >
        <div className="space-y-4">
          {/* Complete Interaction Lifecycle Tracker Card */}
          {historyLead && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0b2559] text-white shadow-md">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Client Complete Lifecycle &amp; Date Logs
                </span>
                <span className="text-[11px] text-slate-300">
                  Current Status: <strong className="text-white">{historyLead.status}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. Agent Call Date */}
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1">
                    <PhoneCall className="w-3 h-3 text-cyan-400" />
                    Agent Call Date
                  </div>
                  <div className="font-bold text-white">
                    {historyLead.agentCallDate
                      ? formatDateTime(historyLead.agentCallDate)
                      : historyLead.callLogs.find((l) => l.type === 'CALL')
                      ? formatDateTime(historyLead.callLogs.find((l) => l.type === 'CALL')!.createdAt)
                      : 'Pending / Not Called'}
                  </div>
                </div>

                {/* 2. Quotation Sent Date */}
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1">
                    <FileText className="w-3 h-3 text-amber-400" />
                    Quotation Sent Date
                  </div>
                  <div className="font-bold text-white">
                    {historyLead.quotationSentDate
                      ? formatDateTime(historyLead.quotationSentDate)
                      : historyLead.quotationSent
                      ? 'Sent' + (historyLead.quotation?.quotationDate ? ` (${historyLead.quotation.quotationDate})` : '')
                      : 'Not Sent Yet'}
                  </div>
                  {historyLead.quotationAmount && (
                    <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                      ₹{historyLead.quotationAmount.toLocaleString('en-IN')} via {historyLead.quotationChannel || 'Email'}
                    </div>
                  )}
                </div>

                {/* 3. Meet Date */}
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    Meet Date &amp; Time
                  </div>
                  <div className="font-bold text-white">
                    {(() => {
                      const matchedMeet = db.meetRequests.find((m) => m.leadId === historyLead.id);
                      if (matchedMeet) {
                        return `${matchedMeet.scheduledDate} ${matchedMeet.scheduledTime} (${matchedMeet.status})`;
                      }
                      return historyLead.meetDate || 'No Meet Scheduled';
                    })()}
                  </div>
                </div>

                {/* 4. Billing Date */}
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1">
                    <Receipt className="w-3 h-3 text-indigo-300" />
                    Billing Date
                  </div>
                  <div className="font-bold text-white">
                    {(() => {
                      const matchedRec = db.rechargeRequests.find(
                        (r) => r.companyName.toLowerCase() === historyLead.companyName.toLowerCase() && r.billingCompletedAt
                      );
                      if (matchedRec?.billingCompletedAt) {
                        return formatDateTime(matchedRec.billingCompletedAt);
                      }
                      return historyLead.billingDate ? formatDateTime(historyLead.billingDate) : 'Pending Billing';
                    })()}
                  </div>
                </div>

                {/* 5. Payment Date */}
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1">
                    <CreditCard className="w-3 h-3 text-green-400" />
                    Payment Date
                  </div>
                  <div className="font-bold text-white">
                    {(() => {
                      const matchedRec = db.rechargeRequests.find(
                        (r) => r.companyName.toLowerCase() === historyLead.companyName.toLowerCase() && r.billingPaymentStatus === 'PAID'
                      );
                      if (matchedRec?.billingCompletedAt) {
                        return formatDateTime(matchedRec.billingCompletedAt);
                      }
                      return historyLead.paymentDate ? formatDateTime(historyLead.paymentDate) : 'Pending Payment';
                    })()}
                  </div>
                </div>

                {/* 6. Recharge Date */}
                <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1">
                    <Zap className="w-3 h-3 text-yellow-300" />
                    Recharge Date
                  </div>
                  <div className="font-bold text-white">
                    {(() => {
                      const matchedRec = db.rechargeRequests.find(
                        (r) => r.companyName.toLowerCase() === historyLead.companyName.toLowerCase() && r.supportCompletedAt
                      );
                      if (matchedRec?.supportCompletedAt) {
                        return formatDateTime(matchedRec.supportCompletedAt);
                      }
                      return historyLead.rechargeDate ? formatDateTime(historyLead.rechargeDate) : 'Pending Recharge';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity Logs Stream */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Detailed Interaction History ({historyLead?.callLogs.length || 0})
            </h4>
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {historyLead?.callLogs.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No activity logs recorded yet.
                </div>
              )}
              {historyLead?.callLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      {log.type} • {log.createdBy}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">{log.summary}</p>

                  {/* Badges for Quotation / Channel / Status */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {log.callConnectStatus && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                        Call: {log.callConnectStatus}
                      </span>
                    )}
                    {log.statusAfter && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                        Status: {log.statusAfter}
                      </span>
                    )}
                    {log.quotationSent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Quotation Shared {log.quotationChannel ? `(${log.quotationChannel})` : ''}
                        {log.quotationAmount ? ` — ₹${log.quotationAmount.toLocaleString('en-IN')}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Cross Check Quotation Modal */}
      {crossCheckModalState && (
        <Modal
          open={Boolean(crossCheckModalState)}
          onClose={() => setCrossCheckModalState(null)}
          title={`Cross Check Quotation: ${crossCheckModalState.quotation.quotationNumber}`}
          subtitle={`Review line items, rates, taxes, client info & manager details before sending.`}
        >
          <div className="space-y-4 text-xs">
            {/* Verification Checklist */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Quotation Quality &amp; Accuracy Check
              </div>
              <ul className="text-xs space-y-1 list-disc list-inside text-emerald-900">
                <li>Client Contact: <strong>{crossCheckModalState.lead.clientName}</strong> ({crossCheckModalState.lead.phone})</li>
                <li>Company: <strong>{crossCheckModalState.lead.companyName}</strong></li>
                <li>Email ID: <strong>{crossCheckModalState.lead.email || 'Not provided'}</strong></li>
                <li>Account Manager: <strong>{crossCheckModalState.quotation.managerName || 'Assigned Manager'}</strong> ({crossCheckModalState.quotation.managerPhone || '+91 9768566466'})</li>
                <li>GST Rate: <strong>{crossCheckModalState.quotation.gstPercent}%</strong> (₹{crossCheckModalState.quotation.gstAmount.toLocaleString('en-IN')})</li>
              </ul>
            </div>

            {/* Line Items Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2 px-3 text-left">Service Item</th>
                    <th className="py-2 px-2 text-center">Unit Rate</th>
                    <th className="py-2 px-2 text-center">Qty / Count</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crossCheckModalState.quotation.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-slate-800">{it.service}</td>
                      <td className="py-2 px-2 text-center font-medium">₹{it.rate}</td>
                      <td className="py-2 px-2 text-center font-medium">{it.count.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        ₹{it.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-600">Subtotal: ₹{crossCheckModalState.quotation.subtotal.toLocaleString('en-IN')}</span>
                <span className="text-indigo-900 text-sm">
                  Grand Total (incl. 18% GST): ₹{crossCheckModalState.quotation.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCrossCheckModalState(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Close Cross Check
              </button>
              <button
                type="button"
                onClick={() => {
                  const lead = crossCheckModalState.lead;
                  const qt = crossCheckModalState.quotation;
                  setCrossCheckModalState(null);
                  setQuotationModalState({
                    lead,
                    initial: qt,
                    startInEdit: false,
                    fromCallModal: true,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-[#0b2559] hover:bg-[#143d8c] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                Open Live A4 Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  const lead = crossCheckModalState.lead;
                  const qt = crossCheckModalState.quotation;
                  setCrossCheckModalState(null);
                  setQuotationModalState({
                    lead,
                    initial: qt,
                    startInEdit: true,
                    fromCallModal: true,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-800 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <PenLine className="w-3.5 h-3.5" />
                Edit Quotation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Email Preview & Edit Before Sending Modal */}
      {emailPreviewModal && (
        <Modal
          open={emailPreviewModal.open}
          onClose={() => setEmailPreviewModal(null)}
          title={`Email Preview & Composer (Proposal: ${emailPreviewModal.proposalNumber})`}
          subtitle="Aap bhejane se pehle 'Dear Sir', content, pricing aur CC check ya edit kar sakte hain."
        >
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  To (Client Email) *
                </label>
                <input
                  type="email"
                  value={emailPreviewModal.to}
                  onChange={(e) =>
                    setEmailPreviewModal({ ...emailPreviewModal, to: e.target.value })
                  }
                  placeholder="client@company.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CC (Account Manager &amp; Admin)
                </label>
                <input
                  type="text"
                  value={emailPreviewModal.cc}
                  onChange={(e) =>
                    setEmailPreviewModal({ ...emailPreviewModal, cc: e.target.value })
                  }
                  placeholder="manager@immenseair.in, admin@immenseair.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Line *
              </label>
              <input
                type="text"
                value={emailPreviewModal.subject}
                onChange={(e) =>
                  setEmailPreviewModal({ ...emailPreviewModal, subject: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Email Message Body (Dear Sir, Proposal Details, Pricing &amp; Signature) *
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-semibold cursor-pointer transition shadow-xs" title="Upload Word Document (.docx) to replace or append signature">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Signature in Word (.docx)</span>
                    <input
                      type="file"
                      accept=".docx,.doc,.txt"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const res = await fetch('/api/parse-doc', {
                            method: 'POST',
                            body: formData,
                          });
                          const json = await res.json();
                          if (json.ok && json.text) {
                            setEmailPreviewModal((prev) => {
                              if (!prev) return null;
                              const currentBody = prev.body;
                              // Match either 'Regards,' or 'Warm regards,' or 'Warm regards'
                              const lowerBody = currentBody.toLowerCase();
                              let splitIndex = lowerBody.lastIndexOf('warm regards');
                              if (splitIndex === -1) {
                                splitIndex = lowerBody.lastIndexOf('regards,');
                              }
                              if (splitIndex === -1) {
                                splitIndex = lowerBody.lastIndexOf('regards');
                              }

                              const newBody =
                                splitIndex !== -1
                                  ? currentBody.substring(0, splitIndex).trimEnd() + '\n\n' + json.text.trim()
                                  : currentBody.trim() + '\n\n' + json.text.trim();

                              return {
                                ...prev,
                                body: newBody,
                                customSignatureHtml: json.html || prev.customSignatureHtml || null,
                              };
                            });
                          } else {
                            alert(json.error || 'Failed to read Word document');
                          }
                        } catch {
                          alert('Error reading Word file');
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Pre-filled &amp; editable
                  </span>
                </div>
              </div>
              <textarea
                rows={10}
                value={emailPreviewModal.body}
                onChange={(e) =>
                  setEmailPreviewModal({ ...emailPreviewModal, body: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-[11px] leading-relaxed bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Attached PDF Quotation & Custom Upload Strip */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    PDF
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      {emailPreviewModal.customUploadedFile
                        ? emailPreviewModal.customUploadedFile.filename
                        : `Proposal_${emailPreviewModal.proposalNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emailPreviewModal.customUploadedFile
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {emailPreviewModal.customUploadedFile ? 'Custom PDF Uploaded' : 'Auto Generated'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {emailPreviewModal.customUploadedFile
                        ? 'Aapki upload ki hui exact PDF file client ko attach hokar jayegi.'
                        : 'Aap chahein toh neeche "Choose Custom File" se apni exact PDF upload kar sakte hain.'}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={emailPreviewModal.attachPdf}
                    onChange={(e) =>
                      setEmailPreviewModal({ ...emailPreviewModal, attachPdf: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 border-slate-300"
                  />
                  Attach PDF
                </label>
              </div>

              {/* Upload Custom Quotation PDF Button & File Input */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>{emailPreviewModal.customUploadedFile ? 'Change Uploaded PDF' : 'Upload Quotation / Proposal File (PDF)'}</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.name.toLowerCase().endsWith('.pdf')) {
                          alert('Kripya keval .pdf format ki file upload karein.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          setEmailPreviewModal((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  attachPdf: true,
                                  customUploadedFile: {
                                    filename: file.name,
                                    base64: result,
                                  },
                                }
                              : null
                          );
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  {emailPreviewModal.customUploadedFile && (
                    <button
                      type="button"
                      onClick={() =>
                        setEmailPreviewModal((prev) =>
                          prev ? { ...prev, customUploadedFile: null } : null
                        )
                      }
                      className="px-2 py-1 rounded-md text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition"
                      title="Remove uploaded file and revert to auto-generated proposal"
                    >
                      Remove File (Use Auto-PDF)
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-slate-400">
                  Accepted: .pdf (Max 15MB)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Will be sent via Hostinger Webmail ({currentUser.mailConfig?.email || 'parvej@immenseair.in'})
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEmailPreviewModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={emailPreviewModal.sending || !emailPreviewModal.to.trim()}
                  onClick={async () => {
                    setEmailPreviewModal((prev) => (prev ? { ...prev, sending: true } : null));
                    try {
                      // Attach Custom Uploaded PDF or auto-generate
                      let pdfBase64: string | undefined = undefined;
                      let pdfFilename: string | undefined = undefined;

                      if (emailPreviewModal.attachPdf) {
                        if (emailPreviewModal.customUploadedFile) {
                          pdfBase64 = emailPreviewModal.customUploadedFile.base64;
                          pdfFilename = emailPreviewModal.customUploadedFile.filename;
                        } else if (emailPreviewModal.quotation) {
                          try {
                            const { base64 } = generateQuotationPdfBlob(emailPreviewModal.quotation);
                            pdfBase64 = base64;
                            pdfFilename = `Proposal_${emailPreviewModal.proposalNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
                          } catch (pdfErr) {
                            console.error('PDF generation error:', pdfErr);
                          }
                        }
                      }

                      let finalHtml: string;
                      if (emailPreviewModal.customSignatureHtml) {
                        // Split body into main message and signature
                        const rawBody = emailPreviewModal.body.trim();
                        const lowerBody = rawBody.toLowerCase();
                        let splitIdx = lowerBody.lastIndexOf('regards');
                        if (splitIdx === -1) splitIdx = lowerBody.lastIndexOf('warm regards');

                        if (splitIdx !== -1) {
                          const messagePart = rawBody.substring(0, splitIdx).trimEnd();
                          const messageHtml = messagePart
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\n/g, '<br />');
                          finalHtml = `<div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #1e293b; margin: 0; padding: 0;">${messageHtml}<br /><br />${emailPreviewModal.customSignatureHtml}</div>`;
                        } else {
                          const formattedBody = rawBody
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\n/g, '<br />');
                          finalHtml = `<div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #1e293b; margin: 0; padding: 0;">${formattedBody}<br /><br />${emailPreviewModal.customSignatureHtml}</div>`;
                        }
                      } else {
                        const formattedHtml = emailPreviewModal.body
                          .trim()
                          .replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/\n/g, '<br />');
                        finalHtml = `<div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #1e293b; margin: 0; padding: 0;">${formattedHtml}</div>`;
                      }

                      const res = await fetch('/api/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: currentUser.id,
                          to: emailPreviewModal.to,
                          cc: emailPreviewModal.cc,
                          subject: emailPreviewModal.subject,
                          text: emailPreviewModal.body.trim(),
                          html: finalHtml,
                          proposalNumber: emailPreviewModal.proposalNumber,
                          pdfBase64,
                          pdfFilename,
                        }),
                      });

                      const data = await res.json();
                      if (res.ok && data.success) {
                        alert(`Email successfully sent to ${emailPreviewModal.to} via Hostinger Webmail with PDF Quotation! (CC: ${emailPreviewModal.cc})`);
                        setQuotationSent(true);
                        setQuotationChannel('Email');
                        
                        // Automatically record full Quotation Sent log in CRM history
                        const currentLeadId = activeLead?.id || quotationModalState?.lead?.id;
                        if (currentLeadId) {
                          await onAction('LOG_QUOTATION_SENT', {
                            leadId: currentLeadId,
                            proposalNumber: emailPreviewModal.proposalNumber,
                            channel: 'Email',
                            to: emailPreviewModal.to,
                            amount: emailPreviewModal.quotation?.totalAmount,
                          });
                        }
                        setEmailPreviewModal(null);
                        // Close call & lead update modal after email is sent
                        setActiveLead(null);
                      } else {
                        alert(`Email error: ${data.error || 'Failed to send email.'}\nKripya credentials check karein.`);
                      }
                    } catch (sendErr: any) {
                      alert(`Network/Server error: ${sendErr.message || 'Unable to reach send-email service.'}`);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  {emailPreviewModal.sending ? 'Attaching PDF & Sending...' : 'Confirm & Send with PDF'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Generate / Edit Quotation Modal */}
      <QuotationModal
        open={Boolean(quotationModalState)}
        onClose={() => setQuotationModalState(null)}
        lead={quotationModalState?.lead || null}
        initialQuotation={quotationModalState?.initial || null}
        startInEdit={quotationModalState?.startInEdit}
        onSave={async (updatedQt) => {
          if (!quotationModalState) return;
          if (quotationModalState.fromCallModal) {
            setDraftQuotation(updatedQt);
            setServiceItems(updatedQt.items);
            setSelectedServices(updatedQt.items.map((i) => i.service));
            setQuotationSent(true);
            setQuotationChannel(updatedQt.channel);
            setQuotationAmount(String(updatedQt.totalAmount));
          } else {
            await onAction('SAVE_QUOTATION', {
              leadId: quotationModalState.lead.id,
              quotation: updatedQt,
            });
          }
        }}
        onOpenEmailComposer={(updatedQt) => {
          const leadToUse = quotationModalState?.lead || activeLead;
          const toEmail = leadToUse?.email || updatedQt.email || '';
          const activeEmail = currentUser.mailConfig?.email || currentUser.email || updatedQt.managerEmail || 'parvej@immenseair.in';
          const activeName = currentUser.name || updatedQt.managerName || 'Account Manager';
          const activeDesignation = currentUser.designation || (currentUser.role === 'ADMIN' ? 'General Manager' : (updatedQt.managerDesignation || 'Sales & Marketing Manager'));
          const activePhone = currentUser.phone || updatedQt.managerPhone || '+91 9768566466';

          const customSignature = currentUser.mailSignature || currentUser.mailConfig?.signature;
          const dynamicSignature = customSignature
            ? customSignature
            : `Warm regards,\n${activeName}\n${activeDesignation}\nImmense Air Pvt Ltd (Immense Smart Solutions)\nMobile: ${activePhone} | Email: ${activeEmail}\nWebsite: www.immenseair.in`;

          const ccEmail = [activeEmail, 'vikram.admin@nexuscrm.in'].filter(Boolean).join(',');
          const rawName = (leadToUse?.clientName || updatedQt.clientName || '').trim();
          const clientGreeting = rawName ? `Dear ${rawName} Sir/Ma'am,` : "Dear Sir/Ma'am,";
          const defaultSubject = `Bulk SMS & Communication Proposal | Immense Smart Solutions — ${updatedQt.quotationNumber}`;

          const defaultBody = `${clientGreeting}

Take your organization's marketing to the next level with Immense Smart Solutions!

📩 Bulk SMS
💬 RCS Messaging
📲 WhatsApp API
📞 IVR Solutions

Proposal Details:
• Proposal No: ${updatedQt.quotationNumber}
• Date: ${updatedQt.quotationDate}
• Valid Until: ${updatedQt.validUntil}
• Total Amount: ₹ ${updatedQt.totalAmount.toLocaleString('en-IN')} (incl. ${updatedQt.gstPercent}% GST)

Why Choose Us?

✅ Instant Content Approval
✅ Post-paid Billing up to 30 Days
✅ Customization SMS Options
✅ Send SMS without DLT
✅ Special Route for Real Estate Sector
✅ Link Tracking & Analytics
✅ Dedicated Account Manager & 24/7 Support
✅ Sunday Operations
✅ Detailed Reports in Excel

We're committed to delivering real results with:
🏡 Real Estate, IT Firm, MSME Enterprises, Manufacturer, International Schools, Events Companies, Large Public Listed Companies. We have expertise and a dedicated service team. 💰 Cost-effective solutions | 📊 Data-driven strategies

Let's connect and explore how we can boost your sales and engagement!

Please find your official proposal PDF attached with this email.

${dynamicSignature}`;

          // Close QuotationModal and open full Email Preview & Composer with File Upload!
          setQuotationModalState(null);
          setEmailPreviewModal({
            open: true,
            to: toEmail,
            cc: ccEmail,
            subject: defaultSubject,
            body: defaultBody,
            proposalNumber: updatedQt.quotationNumber,
            attachPdf: true,
            quotation: updatedQt,
            sending: false,
            customUploadedFile: null,
            customSignatureHtml: currentUser.mailSignatureHtml || currentUser.mailConfig?.signatureHtml || null,
          });
        }}
      />

      {/* Quick Meet / Demo Scheduling Modal from Leads Table */}
      <Modal
        open={Boolean(meetModalLead)}
        onClose={() => setMeetModalLead(null)}
        title={
          meetModalLead
            ? `Schedule Demo / Online Meet: ${meetModalLead.clientName}`
            : 'Schedule Demo / Online Meet'
        }
      >
        {meetModalLead && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (meetSubmitting) return;
              setMeetSubmitting(true);
              try {
                const payload = {
                  leadId: meetModalLead.id,
                  scheduledDate: meetScheduledDate,
                  scheduledTime: meetScheduledTime,
                  platform: meetPlatform,
                  meetLink: (meetPlatform === 'Google Meet' || meetPlatform === 'Zoom' || meetPlatform === 'Microsoft Teams') ? meetLink : undefined,
                  anydeskAddress: meetPlatform === 'AnyDesk' ? meetAnydeskAddress : undefined,
                  ultraviewerId: meetPlatform === 'UltraViewer' ? meetUltraviewerId : undefined,
                  ultraviewerPassword: meetPlatform === 'UltraViewer' ? meetUltraviewerPassword : undefined,
                  agenda: meetAgenda,
                };
                const ok = await onAction('CREATE_MEET', payload);
                if (ok) {
                  const savedClient = meetModalLead.clientName;
                  const savedCompany = meetModalLead.companyName;
                  setMeetModalLead(null);
                  setMeetSuccessPopup({
                    open: true,
                    clientName: savedClient,
                    companyName: savedCompany,
                    date: meetScheduledDate,
                    time: meetScheduledTime,
                    platform: meetPlatform,
                    meetLink,
                    anydeskAddress: meetAnydeskAddress,
                    ultraviewerId: meetUltraviewerId,
                    ultraviewerPassword: meetUltraviewerPassword,
                  });
                }
              } finally {
                setMeetSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                {meetModalLead.companyName} ({meetModalLead.clientName})
              </div>
              <div className="text-slate-500">
                Contact: {meetModalLead.phone || 'No phone'} • Email: {meetModalLead.email || 'No email'}
              </div>
              {meetModalLead.quotation && (
                <div className="text-indigo-700 font-medium">
                  Proposal: {meetModalLead.quotation.quotationNumber} (₹{meetModalLead.quotation.totalAmount.toLocaleString('en-IN')})
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meet Date
                </label>
                <input
                  type="date"
                  value={meetScheduledDate}
                  onChange={(e) => setMeetScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Meet Time
                </label>
                <input
                  type="time"
                  value={meetScheduledTime}
                  onChange={(e) => setMeetScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Platform / Demo Mode
              </label>
              <select
                value={meetPlatform}
                onChange={(e) => setMeetPlatform(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-medium"
              >
                <option value="Google Meet">Google Meet (GMeet)</option>
                <option value="Zoom">Zoom Meet</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="UltraViewer">UltraViewer (Remote Screen Share)</option>
                <option value="AnyDesk">AnyDesk (Remote Screen Share)</option>
                <option value="Phone Conference">Phone Conference / Direct Call</option>
              </select>
            </div>

            {/* Dynamic input fields based on selected platform */}
            {(meetPlatform === 'Google Meet' || meetPlatform === 'Zoom' || meetPlatform === 'Microsoft Teams') && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  {meetPlatform} Meeting Link (URL) *
                </label>
                <input
                  type="url"
                  value={meetLink}
                  onChange={(e) => setMeetLink(e.target.value)}
                  placeholder={`https://meet.google.com/xxx-xxxx-xxx or https://${meetPlatform.toLowerCase().replace(/\s+/g, '')}.com/join...`}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-indigo-700">
                  Agent apna meeting link yaha paste karein. Yeh direct support engineer ko milega.
                </p>
              </div>
            )}

            {meetPlatform === 'UltraViewer' && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2.5">
                <div className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  UltraViewer Remote Access Details
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                      UltraViewer ID *
                    </label>
                    <input
                      type="text"
                      value={meetUltraviewerId}
                      onChange={(e) => setMeetUltraviewerId(e.target.value)}
                      placeholder="e.g., 45 876 211"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs text-slate-800 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                      UltraViewer Password *
                    </label>
                    <input
                      type="text"
                      value={meetUltraviewerPassword}
                      onChange={(e) => setMeetUltraviewerPassword(e.target.value)}
                      placeholder="e.g., 8921"
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs text-slate-800 font-mono"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-purple-700">
                  Client se UltraViewer ID aur Password le kar yaha daalein taaki support demo connect kar sake.
                </p>
              </div>
            )}

            {meetPlatform === 'AnyDesk' && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                  AnyDesk Address / 9-Digit Number *
                </label>
                <input
                  type="text"
                  value={meetAnydeskAddress}
                  onChange={(e) => setMeetAnydeskAddress(e.target.value)}
                  placeholder="e.g., 123 456 789 or user@ad"
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs text-slate-800 font-mono"
                  required
                />
                <p className="text-[11px] text-rose-700">
                  Client ka AnyDesk address daalein taaki support team time par connect kare.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discussion Agenda / Demo Notes
              </label>
              <textarea
                value={meetAgenda}
                onChange={(e) => setMeetAgenda(e.target.value)}
                rows={3}
                placeholder="Client demo requirements, portal walkthrough, WhatsApp API setup..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMeetModalLead(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={meetSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Video className="w-4 h-4" />
                {meetSubmitting ? 'Sending Request...' : 'Send Request to Support'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Meet Request Sent Confirmation Popup / Card */}
      <Modal
        open={Boolean(meetSuccessPopup)}
        onClose={() => setMeetSuccessPopup(null)}
        title="Meet Request Sent Successfully!"
      >
        {meetSuccessPopup && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Demo Request Dispatched to Support Team
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Your online demo request for <span className="font-semibold text-slate-800">{meetSuccessPopup.companyName}</span> ({meetSuccessPopup.clientName}) has been sent for support review & scheduling.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Scheduled Date:</span>
                <span className="font-semibold text-slate-900">{meetSuccessPopup.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Scheduled Time:</span>
                <span className="font-semibold text-slate-900">{meetSuccessPopup.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Demo Platform:</span>
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {meetSuccessPopup.platform}
                </span>
              </div>
              {meetSuccessPopup.meetLink && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-medium">Meeting URL:</span>
                  <a
                    href={meetSuccessPopup.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-indigo-600 underline truncate max-w-xs"
                  >
                    {meetSuccessPopup.meetLink}
                  </a>
                </div>
              )}
              {meetSuccessPopup.anydeskAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">AnyDesk Address:</span>
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                    {meetSuccessPopup.anydeskAddress}
                  </span>
                </div>
              )}
              {meetSuccessPopup.ultraviewerId && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">UltraViewer:</span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    ID: {meetSuccessPopup.ultraviewerId} | Pass: {meetSuccessPopup.ultraviewerPassword || '-'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Current Status:</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Pending Support Confirmation
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-left text-xs text-indigo-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" /> What happens next?
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-indigo-800">
                <li>Support team & Team Leader received the notification alert.</li>
                <li>When Support accepts, the meet is locked in Confirmed Support Schedule.</li>
                <li>If Support is occupied, they propose a new slot for your confirmation with the client.</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => setMeetSuccessPopup(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
              >
                Got It / Back to Leads
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
