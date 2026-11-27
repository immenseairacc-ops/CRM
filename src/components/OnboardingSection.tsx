'use client';

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Clock,
  Eye,
  EyeOff,
  FileText,
  History,
  LifeBuoy,
  AlertCircle,
  Lock,
  Plus,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  UserCheck,
  Globe,
  Key,
  Paperclip,
  UploadCloud,
  ZoomIn,
  Image as ImageIcon,
  Megaphone,
  MoreVertical,
  Download,
  Filter,
  Receipt,
  Search,
  Wallet,
  Zap,
  Send,
  X,
} from 'lucide-react';
import { BillingType, CrmDatabase, Lead, LeadQuotation, OnboardingRequest, PostpaidCycle, ServicePriceItem, TaxType, User } from '@/types/crm';
import { QuotationModal, SERVICE_DEFAULTS } from './QuotationModal';
import { fileToDataUrl, formatDateTime, formatINR, Modal, StatusBadge, triggerDirectDownload } from './ui';


export interface PortalServiceMeta {
  key: string;
  name: string;
  logo: string;
  shortTag: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  defaultUrl: string;
  desc: string;
}

export const SERVICE_PORTAL_MAP: Record<string, PortalServiceMeta> = {
  SMS_RCS: {
    key: 'SMS_RCS',
    name: 'SMS & RCS Messaging Portal',
    logo: '📱',
    shortTag: 'SMS / RCS',
    bgGradient: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    defaultUrl: 'https://sms.immenseair.in',
    desc: 'Bulk SMS (DLT routes) & RCS Business Messaging Gateway',
  },
  WHATSAPP: {
    key: 'WHATSAPP',
    name: 'WhatsApp Business API Panel',
    logo: '💬',
    shortTag: 'WhatsApp API',
    bgGradient: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    defaultUrl: 'https://waba.immenseair.in',
    desc: 'Official Meta WhatsApp Business Cloud & BSP Portal',
  },
  IVR: {
    key: 'IVR',
    name: 'Cloud Telephony (IVR) Portal',
    logo: '📞',
    shortTag: 'Smart IVR',
    bgGradient: 'from-purple-500 to-violet-600',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    defaultUrl: 'https://ivr.immenseair.in',
    desc: 'Interactive Voice Response, Agent Routing & Call Center Portal',
  },
  OBD: {
    key: 'OBD',
    name: 'Voice OBD / Blast Panel',
    logo: '🎙️',
    shortTag: 'Voice OBD',
    bgGradient: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
    defaultUrl: 'https://voice.immenseair.in',
    desc: 'Outbound Voice Dialing, Audio Promotions & Campaign Dialers',
  },
  EMAIL: {
    key: 'EMAIL',
    name: 'Transactional Email Portal',
    logo: '✉️',
    shortTag: 'SMTP Email',
    bgGradient: 'from-rose-500 to-pink-600',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
    defaultUrl: 'https://email.immenseair.in',
    desc: 'High-deliverability Transactional & Promotional Email Delivery',
  },
};

export function getApplicablePortals(services: string[] = []): PortalServiceMeta[] {
  const result: PortalServiceMeta[] = [];
  const lower = services.map((s) => s.toLowerCase());

  const hasSmsOrRcs = lower.some((s) => s.includes('sms') || s.includes('rcs'));
  if (hasSmsOrRcs) result.push(SERVICE_PORTAL_MAP.SMS_RCS);

  const hasWa = lower.some((s) => s.includes('whatsapp') || s.includes('waba'));
  if (hasWa) result.push(SERVICE_PORTAL_MAP.WHATSAPP);

  const hasIvr = lower.some((s) => s.includes('ivr') || s.includes('telephony'));
  if (hasIvr) result.push(SERVICE_PORTAL_MAP.IVR);

  const hasObd = lower.some((s) => s.includes('obd') || s.includes('voice') || s.includes('blast'));
  if (hasObd) result.push(SERVICE_PORTAL_MAP.OBD);

  const hasEmail = lower.some((s) => s.includes('email') || s.includes('mail'));
  if (hasEmail) result.push(SERVICE_PORTAL_MAP.EMAIL);

  if (result.length === 0) {
    result.push(SERVICE_PORTAL_MAP.SMS_RCS);
  }
  return result;
}

const AVAILABLE_SERVICES = [
  'Bulk SMS (DLT)',
  'RCS Messaging',
  'WhatsApp Business API',
  'Cloud Telephony (IVR)',
  'Transactional Email',
  'Voice Blast',
  'Outbound Voice Calling (OBD)',
  'Webhook / SMPP API',
];

export function OnboardingSection({
  db,
  currentUser,
  prefillLead,
  onClearPrefill,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: User;
  prefillLead: Lead | null;
  onClearPrefill: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const role = currentUser.role;
  const isSupport = role === 'SUPPORT';
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);
  const [onboardSearch, setOnboardSearch] = useState('');
  const [viewCredsItem, setViewCredsItem] = useState<OnboardingRequest | null>(null);
  const [quoteModalState, setQuoteModalState] = useState<{
    item: OnboardingRequest;
    leadProxy: Lead;
    initial: LeadQuotation | null;
    history: LeadQuotation[];
  } | null>(null);
  const isManager = role === 'ADMIN' || role === 'ACCOUNT_MANAGER';

  const openOnboardingQuotation = (item: OnboardingRequest, startFresh: boolean) => {
    const linkedLead = db.leads.find((l) => l.id === item.leadId) || item.leadData;
    const rawHistory: LeadQuotation[] = [
      ...(item.quotationHistory || []),
      ...(linkedLead?.quotationHistory || []),
      ...(item.quotation ? [item.quotation] : []),
      ...(linkedLead?.quotation ? [linkedLead.quotation] : []),
    ];
    const seenNos = new Set<string>();
    const history: LeadQuotation[] = [];
    for (const q of rawHistory) {
      if (!q?.quotationNumber || seenNos.has(q.quotationNumber)) continue;
      seenNos.add(q.quotationNumber);
      history.push(q);
    }

    const leadProxy: Lead = {
      id: linkedLead?.id || item.leadId || item.id,
      leadDate: linkedLead?.leadDate || item.createdAt.slice(0, 10),
      clientName: linkedLead?.clientName || item.clientName || item.companyName,
      companyName: item.companyName || linkedLead?.companyName || 'Client Company',
      designation: linkedLead?.designation,
      phone: linkedLead?.phone || item.clientPhone || '',
      email: linkedLead?.email || item.clientEmail || '',
      source: linkedLead?.source || 'Onboarded Client',
      serviceInterest: linkedLead?.serviceInterest || (item.services || []).join(', ') || 'Bulk SMS (DLT)',
      status: linkedLead?.status || 'ONBOARDED',
      selectedServices: linkedLead?.selectedServices || item.services,
      serviceItems:
        (item.serviceItems && item.serviceItems.length > 0 ? item.serviceItems : linkedLead?.serviceItems) || [],
      quotation: history[0] || null,
      quotationHistory: history,
      assignedToAgentId: linkedLead?.assignedToAgentId || item.agentId || null,
      assignedToAgentName: linkedLead?.assignedToAgentName || item.agentName || null,
      uploadedBy: linkedLead?.uploadedBy || item.agentName || 'CRM',
      callLogs: linkedLead?.callLogs || [],
      createdAt: linkedLead?.createdAt || item.createdAt,
      updatedAt: item.updatedAt,
    };

    setQuoteModalState({
      item,
      leadProxy,
      initial: startFresh ? null : history[0] || null,
      history,
    });
  };

  const [openForm, setOpenForm] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [username, setUsername] = useState('');
  const [billingEntity, setBillingEntity] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Bulk SMS (DLT)',
  ]);
  const [serviceItems, setServiceItems] = useState<ServicePriceItem[]>([
    { service: 'Bulk SMS (DLT)', rate: 0.14, count: 100000, amount: 14000 },
  ]);
  const [whatsappMarketingRate, setWhatsappMarketingRate] = useState<string>('0.80');
  const [whatsappUtilityRate, setWhatsappUtilityRate] = useState<string>('0.40');
  const [obdRate, setObdRate] = useState<string>('0.095');
  const [unitPrice, setUnitPrice] = useState('₹0.14 / SMS');
  const [totalDealAmount, setTotalDealAmount] = useState('14000');
  const [billingType, setBillingType] = useState<BillingType>('PREPAID');
  const [taxType, setTaxType] = useState<TaxType>('GST');
  const [gstNumber, setGstNumber] = useState('');
  const [gstPdfName, setGstPdfName] = useState('');
  const [gstPdfDataUrl, setGstPdfDataUrl] = useState('');
  const [panCardName, setPanCardName] = useState('');
  const [panCardDataUrl, setPanCardDataUrl] = useState('');
  const [msmeDocName, setMsmeDocName] = useState('');
  const [msmeDocDataUrl, setMsmeDocDataUrl] = useState('');
  const [brandLogoName, setBrandLogoName] = useState('');
  const [brandLogoDataUrl, setBrandLogoDataUrl] = useState('');
  const [brandBannerName, setBrandBannerName] = useState('');
  const [brandBannerDataUrl, setBrandBannerDataUrl] = useState('');
  const [otherDocName, setOtherDocName] = useState('');
  const [otherDocDataUrl, setOtherDocDataUrl] = useState('');
  const [postpaidCycle, setPostpaidCycle] = useState<PostpaidCycle>('30_DAYS');

  const [supportNoteTargetId, setSupportNoteTargetId] = useState<string | null>(
    null
  );
  const [supportAccountNote, setSupportAccountNote] = useState('');
  const [supportPanelUrl, setSupportPanelUrl] = useState('https://portal.immenseair.in');
  const [supportPanelUsername, setSupportPanelUsername] = useState('');
  const [supportPanelPassword, setSupportPanelPassword] = useState('');
  // Multi-portal configuration modal for Support
  const [activePortalTarget, setActivePortalTarget] = useState<{
    onb: any;
    meta: PortalServiceMeta;
    cred?: any;
  } | null>(null);
  const [portalModalUrl, setPortalModalUrl] = useState('');
  const [portalModalUsername, setPortalModalUsername] = useState('');
  const [portalModalPassword, setPortalModalPassword] = useState('');
  const [portalModalNote, setPortalModalNote] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyCredsToClipboard = (meta: PortalServiceMeta, cred: any, company: string) => {
    const text = '*' + meta.name + ' Login Details*\nPortal URL: ' + (cred.portalUrl || meta.defaultUrl) + '\nUsername: ' + cred.username + '\nPassword: ' + cred.password + '\nCompany: ' + company;
    navigator.clipboard.writeText(text);
    setCopiedKey(cred.serviceKey + '-' + cred.username);
    setTimeout(() => setCopiedKey(null), 2500);
  };


  // Selected onboarding card to view full lead interaction history & timeline
  const [viewHistoryItem, setViewHistoryItem] = useState<any | null>(null);
  // Selected onboarding card to view & download KYC & Brand assets
  const [viewKycItem, setViewKycItem] = useState<OnboardingRequest | null>(null);

  const getKycDocs = (item?: OnboardingRequest | null) => {
    if (!item) return [];
    const docs: {
      key: string;
      label: string;
      type: string;
      url: string;
      fileName: string;
      isImage?: boolean;
      description: string;
    }[] = [];

    if (item.panCardDataUrl) {
      const isImg = item.panCardDataUrl.startsWith('data:image/');
      docs.push({
        key: 'pan',
        label: 'PAN Card (Company / Director)',
        type: isImg ? 'Image' : 'PDF Document',
        url: item.panCardDataUrl,
        fileName: item.panCardName || `PAN_${item.username || item.id}.${isImg ? 'jpg' : 'pdf'}`,
        isImage: isImg,
        description: 'Tax identity verification document',
      });
    }

    if (item.gstPdfDataUrl) {
      const isImg = item.gstPdfDataUrl.startsWith('data:image/');
      docs.push({
        key: 'gst',
        label: 'GST Certificate',
        type: isImg ? 'Image' : 'PDF Document',
        url: item.gstPdfDataUrl,
        fileName: item.gstPdfName || `GST_${item.username || item.id}.${isImg ? 'jpg' : 'pdf'}`,
        isImage: isImg,
        description: item.gstNumber ? `GSTIN: ${item.gstNumber}` : 'Government GST Registration',
      });
    }

    if (item.msmeDocDataUrl) {
      const isImg = item.msmeDocDataUrl.startsWith('data:image/');
      docs.push({
        key: 'msme',
        label: 'MSME / Udyam Certificate',
        type: isImg ? 'Image' : 'PDF Document',
        url: item.msmeDocDataUrl,
        fileName: item.msmeDocName || `MSME_${item.username || item.id}.${isImg ? 'jpg' : 'pdf'}`,
        isImage: isImg,
        description: 'Small & Medium Enterprises registration certificate',
      });
    }

    if (item.brandLogoDataUrl) {
      docs.push({
        key: 'logo',
        label: 'Brand Logo',
        type: 'PNG / Image',
        url: item.brandLogoDataUrl,
        fileName: item.brandLogoName || `BrandLogo_${item.username || item.id}.png`,
        isImage: true,
        description: 'Used for RCS Brand Avatar, WhatsApp Business Profile, and DLT Portal',
      });
    }

    if (item.brandBannerDataUrl) {
      docs.push({
        key: 'banner',
        label: 'Brand Banner (1440x448)',
        type: 'RCS Header Image',
        url: item.brandBannerDataUrl,
        fileName: item.brandBannerName || `BrandBanner_${item.username || item.id}.jpg`,
        isImage: true,
        description: 'RCS Messaging Rich Card Header Banner',
      });
    }

    if (item.otherDocDataUrl) {
      const isImg = item.otherDocDataUrl.startsWith('data:image/');
      docs.push({
        key: 'other',
        label: 'Client Agreement / Other Document',
        type: isImg ? 'Image' : 'Document / PDF',
        url: item.otherDocDataUrl,
        fileName: item.otherDocName || `Doc_${item.username || item.id}.${isImg ? 'jpg' : 'pdf'}`,
        isImage: isImg,
        description: 'Service agreement, purchase order, or authorized signatory proof',
      });
    }

    return docs;
  };
  // Support Request / Ticket states
  const [ticketTargetOnb, setTicketTargetOnb] = useState<any | null>(null);
  const [ticketServiceCategory, setTicketServiceCategory] = useState('SMS / RCS Routing');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketScreenshotDataUrl, setTicketScreenshotDataUrl] = useState<string>('');
  const [ticketScreenshotName, setTicketScreenshotName] = useState<string>('');
  const [zoomedScreenshot, setZoomedScreenshot] = useState<string | null>(null);

  // Ctrl+V paste handler for screenshots
  const handleTicketPaste = (e: React.ClipboardEvent<any>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const result = uploadEvent.target?.result as string;
            setTicketScreenshotDataUrl(result);
            setTicketScreenshotName('clipboard-screenshot-' + Date.now() + '.png');
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleTicketFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setTicketScreenshotDataUrl(result);
        setTicketScreenshotName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };


  // Support Engineer Resolution state
  const [resolvingTicket, setResolvingTicket] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  // Complete 360° Lifecycle Filter & Search state inside Lead Logs Modal
  const [historyFilter, setHistoryFilter] = useState<
    'ALL' | 'LEAD_CALLS' | 'ONBOARDING' | 'RECHARGES' | 'CAMPAIGNS' | 'SUPPORT' | 'BILLING' | 'UPCOMING'
  >('ALL');
  const [historySearch, setHistorySearch] = useState('');

  // External Campaign Modal state directly from Onboarded Client row
  const [extCampaignClient, setExtCampaignClient] = useState<OnboardingRequest | null>(null);
  const [extService, setExtService] = useState('');
  const [extTitle, setExtTitle] = useState('');
  const [extCount, setExtCount] = useState('50000');
  const [extAmount, setExtAmount] = useState('7000');
  const [extRate, setExtRate] = useState<number>(0.14);
  const [extNotes, setExtNotes] = useState('');
  const [extProofUrl, setExtProofUrl] = useState('');
  const [extProofName, setExtProofName] = useState('');

  // Onboarding Confirmation Screen State
  const [onboardSuccessData, setOnboardSuccessData] = useState<{
    companyName: string;
    username: string;
    services: string[];
    totalDealAmount: number;
    billingType: string;
  } | null>(null);

  const handleOpenExtCampaign = (item: OnboardingRequest) => {
    setExtCampaignClient(item);
    const firstSvc = item.services[0] || 'Bulk SMS (DLT)';
    setExtService(firstSvc);
    const matchedRate =
      item.serviceItems?.find((s) => s.service.toLowerCase() === firstSvc.toLowerCase())?.rate ||
      (firstSvc.toLowerCase().includes('whatsapp') ? item.whatsappMarketingRate || 0.8 : 0.14);
    setExtRate(matchedRate);
    const defaultCnt = 50000;
    setExtCount(String(defaultCnt));
    setExtAmount(String(Math.round(defaultCnt * matchedRate)));
    setExtTitle(`${firstSvc} External Campaign — ${item.companyName}`);
    setExtNotes('');
    setExtProofUrl('');
    setExtProofName('');
  };

  const handleExtPaste = (e: React.ClipboardEvent<any>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type.indexOf('image') !== -1) {
        const file = it.getAsFile();
        if (file) {
          fileToDataUrl(file).then((url) => {
            setExtProofUrl(url);
            setExtProofName('client-campaign-proof-' + Date.now() + '.jpg');
          });
          e.preventDefault();
          break;
        }
      }
    }
  };


  useEffect(() => {
    if (prefillLead) {
      setCompanyName(prefillLead.companyName);
      setBillingEntity(`${prefillLead.companyName} Pvt Ltd`);
      const slug = prefillLead.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      setUsername(`${slug}_prod`);

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

      const summaryRates = quoteItems.map((it) => `${it.service}: ₹${it.rate}`).join(', ');
      setUnitPrice(summaryRates || '₹0.14 / SMS');

      setOpenForm(true);
    }
  }, [prefillLead]);

  const toggleService = (svc: string) => {
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
    const summary = items.map((it) => `${it.service}: ₹${it.rate}`).join(', ');
    setUnitPrice(summary || 'Custom Rate');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onAction('CREATE_ONBOARDING', {
      leadId: prefillLead?.id,
      companyName,
      username,
      billingEntity,
      gstNumber: taxType === 'GST' ? gstNumber : undefined,
      gstPdfName: taxType === 'GST' && gstPdfName ? gstPdfName : undefined,
      gstPdfDataUrl: taxType === 'GST' && gstPdfDataUrl ? gstPdfDataUrl : undefined,
      panCardName: panCardName || undefined,
      panCardDataUrl: panCardDataUrl || undefined,
      msmeDocName: msmeDocName || undefined,
      msmeDocDataUrl: msmeDocDataUrl || undefined,
      brandLogoName: brandLogoName || undefined,
      brandLogoDataUrl: brandLogoDataUrl || undefined,
      brandBannerName: brandBannerName || undefined,
      brandBannerDataUrl: brandBannerDataUrl || undefined,
      otherDocName: otherDocName || undefined,
      otherDocDataUrl: otherDocDataUrl || undefined,
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
    });
    if (ok) {
      setOnboardSuccessData({
        companyName,
        username,
        services: selectedServices,
        totalDealAmount: Number(totalDealAmount) || 0,
        billingType,
      });
      onClearPrefill();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isSupport
              ? 'Support Account Creation Queue (Masked Pricing View)'
              : 'Client Onboarding & Account Provisioning'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSupport
              ? 'View approved onboarding requests with ONLY Agent Name, Account Username, Services, and Service Rate to configure.'
              : 'Agent submits full client onboarding -> Account Manager/Admin approves -> Support receives account creation details (with total deal amount & billing entity hidden).'}
          </p>
        </div>

        {(role === 'AGENT' || isManager) && (
          <button
            onClick={() => setOpenForm(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition flex items-center gap-2 self-start"
          >
            <Plus className="w-4 h-4" />
            New Client Onboarding
          </button>
        )}
      </div>

      {/* Active Support Requests from Agents (Identified by Account Username) */}
      {isSupport && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 mb-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <LifeBuoy className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  Client Panel Requests &amp; Issues
                  {((db.supportTickets || []).filter(t => t.status !== 'RESOLVED')).length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold animate-pulse">
                      {((db.supportTickets || []).filter(t => t.status !== 'RESOLVED')).length} Open
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Agents raise requirements directly using the client's <strong>Account Username</strong>.
                </p>
              </div>
            </div>
          </div>

          {(!db.supportTickets || db.supportTickets.length === 0) ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No support assistance requests raised yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {db.supportTickets.map((tkt) => {
                const isOpen = tkt.status !== 'RESOLVED';
                return (
                  <div
                    key={tkt.id}
                    className={'p-3.5 rounded-xl border transition space-y-2.5 ' + (isOpen ? 'bg-amber-50/50 border-amber-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-80')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Client Account Username:
                        </span>
                        <div className="text-base font-extrabold font-mono text-indigo-900 flex items-center gap-1.5 mt-0.5">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md border border-indigo-200">
                            @{tkt.username}
                          </span>
                          <span className="text-xs font-semibold text-slate-600 font-sans truncate">
                            ({tkt.companyName})
                          </span>
                        </div>
                      </div>
                      <span className={'px-2 py-0.5 rounded-md text-[10px] font-extrabold ' + (isOpen ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')}>
                        {isOpen ? tkt.priority + ' PRIORITY' : 'RESOLVED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Sales Agent:</span>
                        <span className="font-bold text-slate-800">{tkt.agentName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Account Manager:</span>
                        <span className="font-bold text-slate-800">{tkt.accountManagerName || 'Neha Kapoor'}</span>
                      </div>
                    </div>

                    <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">
                          {tkt.serviceCategory}
                        </span>
                        <span>{tkt.subject}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">
                        {tkt.description}
                      </p>

                      {/* Attached Screenshot preview for Support */}
                      {tkt.screenshotDataUrl && (
                        <div className="pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                            <span className="flex items-center gap-1 text-indigo-600">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Client / Error Screenshot:
                            </span>
                            <button
                              type="button"
                              onClick={() => setZoomedScreenshot(tkt.screenshotDataUrl || null)}
                              className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-0.5"
                            >
                              <ZoomIn className="w-3 h-3" /> Zoom In
                            </button>
                          </div>
                          <div
                            onClick={() => setZoomedScreenshot(tkt.screenshotDataUrl || null)}
                            className="cursor-pointer relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50 max-h-36 flex items-center justify-center p-1"
                          >
                            <img
                              src={tkt.screenshotDataUrl}
                              alt="Error / Query Screenshot"
                              className="max-h-32 object-contain rounded"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                              Click to Enlarge
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {tkt.supportResolutionNote && (
                      <div className="text-[11px] bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-200">
                        <strong>Resolution Note:</strong> {tkt.supportResolutionNote} ({tkt.resolvedBy})
                      </div>
                    )}

                    {isOpen && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setResolvingTicket(tkt);
                            setResolutionNote('Requirement addressed on panel for @' + tkt.username + '. Tested and verified.');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark Resolved &amp; Notify Agent
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Explicit Privacy Banner for Support */}
      {isSupport && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950">
            <div className="font-bold">
              Commercial Privacy Policy Enforced (Server-Sanitized)
            </div>
            <p className="mt-0.5 text-amber-800">
              Commercial privacy active: <strong>Total Deal Amount</strong> and <strong>Billing Entity</strong> are strictly hidden.
              Support panel only receives <strong>WhatsApp (Marketing & Utility)</strong> and <strong>OBD / Voice Rates</strong> required for panel configuration. All other commercial rates are masked.
            </p>
          </div>
        </div>
      )}

      {/* Support Dedicated Masked Table / Cards */}
      {isSupport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {db.onboardingRequests.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No approved onboarding tasks assigned to Support yet.
            </div>
          ) : (
            db.onboardingRequests.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Account Username (Create With Name)
                    </div>
                    <div className="text-lg font-bold text-indigo-700 font-mono mt-0.5">
                      {item.username}
                    </div>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="space-y-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
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
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-indigo-600" />
                        Services to Provision (Click Logo to Setup Portal Login)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Setup per service portal
                      </span>
                    </div>

                    {/* Dynamic Portals Grid based only on selected client services */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {getApplicablePortals(item.services).map((meta) => {
                        const existingCred = item.portalCredentials?.find((c: any) => c.serviceKey === meta.key);
                        const isDone = Boolean(existingCred?.password);

                        return (
                          <div
                            key={meta.key}
                            onClick={() => {
                              setActivePortalTarget({
                                onb: item,
                                meta,
                                cred: existingCred,
                              });
                              setPortalModalUrl(existingCred?.portalUrl || meta.defaultUrl);
                              setPortalModalUsername(existingCred?.username || item.username);
                              setPortalModalPassword(existingCred?.password || ('Immense@' + Math.floor(1000 + Math.random() * 9000)));
                              setPortalModalNote(existingCred?.supportNote || ('Portal configured for ' + item.companyName + ' on ' + meta.name));
                            }}
                            className={'relative group cursor-pointer p-2.5 rounded-xl border transition flex items-center justify-between ' + (isDone ? 'bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/70 shadow-xs' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 shadow-xs')}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-2xl shrink-0 p-1 rounded-lg bg-white border border-slate-200/80 shadow-xs">
                                {meta.logo}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                                  {meta.name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 truncate">
                                  {existingCred?.portalUrl || meta.defaultUrl}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 ml-2 text-right">
                              {isDone ? (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyCredsToClipboard(meta, existingCred, item.companyName);
                                    }}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                    {copiedKey === (meta.key + '-' + (existingCred ? existingCred.username : '')) ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-300 group-hover:bg-amber-100">
                                  <Key className="w-3 h-3 text-amber-600" /> Setup Login
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                </div>

                {/* Masked indicator */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-dashed border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" />
                    Deal Amount & Billing Entity:
                  </span>
                  <span className="font-semibold text-slate-500">
                    HIDDEN / MASKED
                  </span>
                </div>

                {/* View Full Lead Timeline & Logs Button */}
                <button
                  type="button"
                  onClick={() => setViewHistoryItem(item)}
                  className="w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-indigo-200"
                >
                  <History className="w-3.5 h-3.5" />
                  View Support Operations & Setup Logs
                </button>

                {item.supportAccountNote && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <strong>Provisioned:</strong> {item.supportAccountNote}
                  </p>
                )}

                {item.status === 'APPROVED_FOR_SUPPORT' && (
                  <button
                    onClick={() => {
                      setSupportNoteTargetId(item.id);
                      setSupportPanelUsername(item.username);
                      const randomPass = `Immense@${Math.floor(1000 + Math.random() * 9000)}`;
                      setSupportPanelPassword(randomPass);
                      setSupportPanelUrl('https://portal.immenseair.in');
                      const noteParts = [`Portal account created on https://portal.immenseair.in for @${item.username}.`];
                      if (item.whatsappMarketingRate || item.whatsappUtilityRate) {
                        noteParts.push(`WhatsApp Marketing: ₹${item.whatsappMarketingRate || '0.80'}, Utility: ₹${item.whatsappUtilityRate || '0.40'}`);
                      }
                      if (item.obdRate) {
                        noteParts.push(`OBD: ₹${item.obdRate}`);
                      }
                      setSupportAccountNote(noteParts.join(' • '));
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    Create Portal Account & Dispatch Credentials
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Full Commercial View for Agent, Account Manager, Admin, Billing */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
            <div className="text-xs font-bold text-[#0A1B3F]">
              Onboarded Clients ({db.onboardingRequests.length})
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={onboardSearch}
                onChange={(e) => setOnboardSearch(e.target.value)}
                placeholder="Search company, @username, agent, service..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:border-[#0A1B3F] outline-none"
              />
            </div>
          </div>

          {db.onboardingRequests.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No onboarding submissions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-3 px-4">Company & Username</th>
                    <th className="py-3 px-4">Billing Entity</th>
                    <th className="py-3 px-4">Services & Unit Rate</th>
                    <th className="py-3 px-4">Total Deal & Type</th>
                    {role !== 'AGENT' && <th className="py-3 px-4">Agent</th>}
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.onboardingRequests
                    .filter((item) => {
                      if (!onboardSearch.trim()) return true;
                      const q = onboardSearch.toLowerCase();
                      return (
                        item.companyName.toLowerCase().includes(q) ||
                        item.username.toLowerCase().includes(q) ||
                        (item.billingEntity || '').toLowerCase().includes(q) ||
                        item.agentName.toLowerCase().includes(q) ||
                        item.services.some((s) => s.toLowerCase().includes(q))
                      );
                    })
                    .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.companyName}
                        </div>
                        <div className="text-xs font-mono text-indigo-700 mt-0.5">
                          @{item.username}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {!isSupport && ((item.quotationHistory?.length || 0) > 0 || item.quotation) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                              📄 {item.quotationHistory?.length || 1} Quote(s)
                            </span>
                          )}
                          {getKycDocs(item).length > 0 && (
                            <button
                              type="button"
                              onClick={() => setViewKycItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition shadow-xs"
                              title="Click to view & download KYC and Brand Assets"
                            >
                              <Paperclip className="w-3 h-3 text-indigo-600" />
                              <span>KYC ({getKycDocs(item).length})</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 max-w-[200px]">
                        {item.billingEntity || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 mb-1">
                          {item.services.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs font-semibold text-emerald-700">
                          Rate: {item.unitPrice}
                        </div>

                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {formatINR(item.totalDealAmount)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          {item.billingType || 'PREPAID'}
                        </div>
                      </td>
                      {role !== 'AGENT' && (
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                          {item.agentName}
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                        {item.supportAccountNote && (
                          <div className="text-[11px] text-emerald-700 mt-1 max-w-[180px]">
                            {item.supportAccountNote}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 relative">
                          {isManager && item.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                onClick={() =>
                                  onAction('APPROVE_ONBOARDING', {
                                    onboardingId: item.id,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  onAction('REJECT_ONBOARDING', {
                                    onboardingId: item.id,
                                    reason: 'Verify billing entity details',
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionRowId(
                                openActionRowId === item.id ? null : item.id
                              )
                            }
                            title="Actions (360° Logs, External Campaign, Request Support)"
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 transition ${
                              openActionRowId === item.id
                                ? 'bg-[#0A1B3F] text-white border-[#0A1B3F]'
                                : 'bg-white hover:bg-slate-50 text-[#0A1B3F] border-slate-200'
                            }`}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                            <span>Actions</span>
                          </button>

                          {openActionRowId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setOpenActionRowId(null)}
                              />
                              <div className="absolute right-full top-0 mr-2 z-40 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 text-left space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionRowId(null);
                                    setViewCredsItem(item);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl hover:bg-slate-50 text-xs font-bold text-[#0A1B3F] flex items-center gap-2"
                                >
                                  <Key className="w-3.5 h-3.5 text-[#F2591F]" />
                                  Login Details
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionRowId(null);
                                    setViewKycItem(item);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl hover:bg-indigo-50 text-xs font-bold text-indigo-700 flex items-center gap-2"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                                  KYC &amp; Brand Assets ({getKycDocs(item).length})
                                </button>

                                {!isSupport && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionRowId(null);
                                        openOnboardingQuotation(item, true);
                                      }}
                                      className="w-full px-3 py-2 rounded-xl hover:bg-blue-50 text-xs font-bold text-blue-700 flex items-center gap-2"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                                      Send New Quote
                                    </button>
                                    {((item.quotationHistory?.length || 0) > 0 || item.quotation) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionRowId(null);
                                          openOnboardingQuotation(item, false);
                                        }}
                                        className="w-full px-3 py-2 rounded-xl hover:bg-emerald-50 text-xs font-bold text-emerald-700 flex items-center gap-2"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                        View / Resend Quotes ({item.quotationHistory?.length || 1})
                                      </button>
                                    )}
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionRowId(null);
                                    setHistoryFilter('ALL');
                                    setHistorySearch('');
                                    setViewHistoryItem(item);
                                  }}
                                  className="w-full px-3 py-2 rounded-xl hover:bg-indigo-50 text-xs font-bold text-indigo-700 flex items-center gap-2"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  All 360° Logs
                                </button>

                                {item.status === 'ACCOUNT_CREATED' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionRowId(null);
                                        handleOpenExtCampaign(item);
                                      }}
                                      className="w-full px-3 py-2 rounded-xl hover:bg-orange-50 text-xs font-extrabold text-[#F2591F] flex items-center gap-2"
                                    >
                                      <Megaphone className="w-3.5 h-3.5" />
                                      External Campaign
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionRowId(null);
                                        setTicketTargetOnb(item);
                                        setTicketServiceCategory(item.services[0] || 'Bulk SMS');
                                        setTicketPriority('HIGH');
                                        setTicketSubject('Panel Assistance for @' + item.username);
                                        setTicketDescription('');
                                        setTicketScreenshotDataUrl('');
                                        setTicketScreenshotName('');
                                      }}
                                      className="w-full px-3 py-2 rounded-xl hover:bg-amber-50 text-xs font-bold text-amber-800 flex items-center gap-2"
                                    >
                                      <LifeBuoy className="w-3.5 h-3.5" />
                                      Request Support
                                    </button>
                                  </>
                                )}
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

      {/* Submit Onboarding Modal */}
      <Modal
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setOnboardSuccessData(null);
          onClearPrefill();
        }}
        title={onboardSuccessData ? 'Action Successful' : 'Submit Client Onboarding'}
        subtitle={
          onboardSuccessData
            ? 'Confirmation: Client onboarding registration has been submitted.'
            : 'Goes to Account Manager & Admin for approval. Support only receives Account Username, Agent Name, Services, and Service Rate.'
        }
      >
        {onboardSuccessData ? (
          <div className="py-4 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-black tracking-wide uppercase">
                ✅ Kaam Ho Gaya (Confirmation)
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-2">
                Client Onboarding Successfully Submitted!
              </h3>
              <p className="text-xs text-slate-500">
                Onboarding request AM aur Admin ko approval ke liye forward kar di gayi hai.
              </p>
            </div>

            {/* Summary Details */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 text-left space-y-2.5 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Onboarding Details</span>
                <span className="font-mono text-emerald-700 font-extrabold">STATUS: PENDING APPROVAL</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Company Name</span>
                <span className="font-extrabold text-slate-900">{onboardSuccessData.companyName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Panel Username</span>
                <span className="font-mono font-bold text-indigo-700">@{onboardSuccessData.username}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Services Selected</span>
                <span className="font-medium text-slate-800">{onboardSuccessData.services.join(', ')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-semibold">Deal Amount</span>
                <span className="font-black text-emerald-700">{formatINR(onboardSuccessData.totalDealAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-semibold">Next Action</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                  AM / Admin Approval → Support Account Creation
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOnboardSuccessData(null);
                  setOpenForm(false);
                  setCompanyName('');
                  setUsername('');
                  setBillingEntity('');
                  setGstNumber('');
                  setGstPdfName('');
                  setGstPdfDataUrl('');
                  setPanCardName('');
                  setPanCardDataUrl('');
                  setMsmeDocName('');
                  setMsmeDocDataUrl('');
                  setBrandLogoName('');
                  setBrandLogoDataUrl('');
                  setBrandBannerName('');
                  setBrandBannerDataUrl('');
                  setOtherDocName('');
                  setOtherDocDataUrl('');
                  setTaxType('GST');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Theek Hai, Onboarding List Me Dekhein →
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnboardSuccessData(null);
                  setCompanyName('');
                  setUsername('');
                  setBillingEntity('');
                  setGstNumber('');
                  setGstPdfName('');
                  setGstPdfDataUrl('');
                  setPanCardName('');
                  setPanCardDataUrl('');
                  setMsmeDocName('');
                  setMsmeDocDataUrl('');
                  setBrandLogoName('');
                  setBrandLogoDataUrl('');
                  setBrandBannerName('');
                  setBrandBannerDataUrl('');
                  setOtherDocName('');
                  setOtherDocDataUrl('');
                  setTaxType('GST');
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-xs text-slate-700 transition flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                + Naya Client Onboard Karein
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company & Panel Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., FinEdge Capital"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1">
                Panel Username (SMS / RCS / WhatsApp Login) *
              </label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., finedge_prod"
                className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-indigo-50/30 text-sm font-mono font-bold text-indigo-950"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Support isi username se SMS, RCS aur WhatsApp panel par login create karegi.
              </p>
            </div>
          </div>

          {/* Billing Entity & GST Settings */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Billing & Tax Configuration (Shared with Billing Team)</span>
              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Hidden from Support
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Billing Entity Name *
                </label>
                <input
                  required
                  value={billingEntity}
                  onChange={(e) => setBillingEntity(e.target.value)}
                  placeholder="e.g., FinEdge Capital Pvt Ltd"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTaxType('GST')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      taxType === 'GST'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    GST Invoice (18%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxType('NON_GST')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      taxType === 'NON_GST'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Non-GST Billing
                  </button>
                </div>
              </div>
            </div>

            {taxType === 'GST' && (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client GSTIN (15 Digits) *
                  </label>
                  <input
                    required
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., 27AABCF4920M1Z8"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload GST Certificate PDF (Optional • Max 500 KB)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500 * 1024) {
                        alert('PDF size must be 500 KB or less to keep the server fast & lightweight.');
                        e.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setGstPdfName(file.name);
                        setGstPdfDataUrl(String(reader.result || ''));
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {gstPdfName && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      ✓ Attached: {gstPdfName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Client KYC & Brand Documents Upload (Compressed & High Quality) */}
            <div className="pt-3 border-t border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Client KYC &amp; Brand Assets (PAN, Logo, Banner, MSME)
                </label>
                <span className="text-[10px] text-slate-400">Auto-compressed for fast download</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. PAN Card */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">PAN Card (PDF / Image)</label>
                    {panCardName && (
                      <button
                        type="button"
                        onClick={() => { setPanCardName(''); setPanCardDataUrl(''); }}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await fileToDataUrl(file);
                      setPanCardName(file.name);
                      setPanCardDataUrl(url);
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {panCardName && (
                    <div className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1">
                      ✓ Attached: {panCardName}
                    </div>
                  )}
                </div>

                {/* 2. MSME / Udyam Certificate */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">MSME / Udyam Certificate (PDF)</label>
                    {msmeDocName && (
                      <button
                        type="button"
                        onClick={() => { setMsmeDocName(''); setMsmeDocDataUrl(''); }}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await fileToDataUrl(file);
                      setMsmeDocName(file.name);
                      setMsmeDocDataUrl(url);
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {msmeDocName && (
                    <div className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1">
                      ✓ Attached: {msmeDocName}
                    </div>
                  )}
                </div>

                {/* 3. Brand Logo (RCS / WhatsApp API) */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">Brand Logo (PNG/JPEG for RCS/WABA)</label>
                    {brandLogoName && (
                      <button
                        type="button"
                        onClick={() => { setBrandLogoName(''); setBrandLogoDataUrl(''); }}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await fileToDataUrl(file);
                      setBrandLogoName(file.name);
                      setBrandLogoDataUrl(url);
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {brandLogoName && (
                    <div className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1">
                      ✓ Attached: {brandLogoName}
                    </div>
                  )}
                </div>

                {/* 4. Banner Image (RCS Header) */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">Banner Image (1440x448 px for RCS)</label>
                    {brandBannerName && (
                      <button
                        type="button"
                        onClick={() => { setBrandBannerName(''); setBrandBannerDataUrl(''); }}
                        className="text-[10px] text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await fileToDataUrl(file);
                      setBrandBannerName(file.name);
                      setBrandBannerDataUrl(url);
                    }}
                    className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {brandBannerName && (
                    <div className="text-[10px] text-emerald-700 font-semibold truncate flex items-center gap-1">
                      ✓ Attached: {brandBannerName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Services to Provision & Rate / Count Config */}
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-1 ring-indigo-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
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
          </div>

          {/* Dedicated WhatsApp & OBD Panel Rates (Configured by Agent for Support) */}
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Deal Amount (₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={totalDealAmount}
                onChange={(e) => setTotalDealAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Type *
              </label>
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as BillingType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
              >
                <option value="PREPAID">Prepaid (Advance Recharge)</option>
                <option value="POSTPAID">Postpaid (Credit Billing)</option>
                <option value="MONTHLY">Monthly Retainer</option>
              </select>
            </div>
          </div>

          {/* If Postpaid: Select Payment Cycle */}
          {billingType === 'POSTPAID' && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-amber-950">
                Postpaid Payment Cycle (Payment kab aayega) *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: '10_DAYS', label: '10 Days' },
                  { id: '15_DAYS', label: '15 Days' },
                  { id: '20_DAYS', label: '20 Days' },
                  { id: '25_DAYS', label: '25 Days' },
                  { id: '30_DAYS', label: '30 Days' },
                  { id: '45_DAYS', label: '45 Days' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPostpaidCycle(c.id as PostpaidCycle)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                      postpaidCycle === c.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-amber-800">
                Billing team ko is cycle ke mutabik payment reminder aur invoice schedule dikhega.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Total Deal Amount & Billing Entity are visible to Account Manager &
              Admin, and automatically masked from Support.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpenForm(false);
                onClearPrefill();
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedServices.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold"
            >
              Submit Onboarding
            </button>
          </div>
        </form>
        )}
      </Modal>

      {/* Support Create & Dispatch Portal Account Modal */}
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
                      onClick={() => setSupportPanelPassword(`Immense@${Math.floor(1000 + Math.random() * 9000)}`)}
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
      </Modal>

      {/* Individual Service Portal Setup Modal */}
      <Modal
        open={Boolean(activePortalTarget)}
        onClose={() => setActivePortalTarget(null)}
        title={activePortalTarget ? ('Setup ' + activePortalTarget.meta.name) : 'Portal Account Setup'}
        subtitle="Credentials will be saved in CRM and emailed directly to the Sales Agent with Account Manager and Admin in CC loop."
      >
        {activePortalTarget && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await onAction('SAVE_PORTAL_CREDENTIALS', {
                onboardingId: activePortalTarget.onb.id,
                serviceKey: activePortalTarget.meta.key,
                serviceName: activePortalTarget.meta.name,
                portalUrl: portalModalUrl,
                username: portalModalUsername,
                password: portalModalPassword,
                supportNote: portalModalNote,
              });
              if (ok) {
                setActivePortalTarget(null);
              }
            }}
            className="space-y-4"
          >
            {/* Header banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl p-1.5 rounded-xl bg-white/10 border border-white/20">
                  {activePortalTarget.meta.logo}
                </span>
                <div>
                  <div className="font-bold text-sm text-white">{activePortalTarget.meta.name}</div>
                  <div className="text-[11px] text-indigo-200">{activePortalTarget.meta.desc}</div>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {activePortalTarget.meta.shortTag}
              </span>
            </div>

            {/* Recipient summary strip */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Client Company:</span>
                <span className="font-bold text-slate-900">{activePortalTarget.onb.companyName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">To Agent:</span>
                <span className="font-bold text-indigo-700">{activePortalTarget.onb.agentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">CC Loop:</span>
                <span className="font-medium text-slate-600">Account Manager ({activePortalTarget.onb.accountManagerName || 'Neha Kapoor'}), Admin</span>
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
                value={portalModalUrl}
                onChange={(e) => setPortalModalUrl(e.target.value)}
                placeholder={activePortalTarget.meta.defaultUrl}
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
                  value={portalModalUsername}
                  onChange={(e) => setPortalModalUsername(e.target.value)}
                  placeholder="e.g., finedge_prod"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-slate-900 text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Approved panel username</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    Generated Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPass = 'Immense@' + Math.floor(1000 + Math.random() * 9000);
                      setPortalModalPassword(randomPass);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Regenerate
                  </button>
                </div>
                <input
                  required
                  value={portalModalPassword}
                  onChange={(e) => setPortalModalPassword(e.target.value)}
                  placeholder="e.g., Immense@8492"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-mono font-bold text-slate-900 text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Default generated or custom password</p>
              </div>
            </div>

            {/* Handover note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Handover / Configuration Note (Optional)
              </label>
              <textarea
                rows={2}
                value={portalModalNote}
                onChange={(e) => setPortalModalNote(e.target.value)}
                placeholder="Any special setup instructions, DLT registration note or sender ID details..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActivePortalTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Save &amp; Send Credentials to Agent (CC: AM &amp; Admin)
              </button>
            </div>
          </form>
        )}
      </Modal>

      
      {/* Agent Support Request Modal (Passes Username, Agent, AM to Support) */}
      <Modal
        open={Boolean(ticketTargetOnb)}
        onClose={() => setTicketTargetOnb(null)}
        title="Request Support / Panel Assistance"
        subtitle="Support identifies the client solely by their Account Username. Sales Agent and Account Manager details will be attached automatically."
      >
        {ticketTargetOnb && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await onAction('CREATE_SUPPORT_TICKET', {
                onboardingId: ticketTargetOnb.id,
                serviceCategory: ticketServiceCategory,
                priority: ticketPriority,
                subject: ticketSubject,
                description: ticketDescription,
                screenshotDataUrl: ticketScreenshotDataUrl || undefined,
                screenshotName: ticketScreenshotName || undefined,
              });
              if (ok) {
                setTicketTargetOnb(null);
              }
            }}
            className="space-y-4"
          >
            {/* Primary Identifier Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Support Primary Identification
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-300 block">Account Username:</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    @{ticketTargetOnb.username}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-300 block">Client Company:</span>
                  <span className="text-sm font-bold text-white">{ticketTargetOnb.companyName}</span>
                </div>
              </div>
            </div>

            {/* Loop Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px]">Assigned Agent:</span>
                <span className="font-bold text-indigo-900">{ticketTargetOnb.agentName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Account Manager:</span>
                <span className="font-bold text-slate-900">{ticketTargetOnb.accountManagerName || 'Neha Kapoor'}</span>
              </div>
            </div>

            {/* Service & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Service Category *
                </label>
                <select
                  value={ticketServiceCategory}
                  onChange={(e) => setTicketServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  {ticketTargetOnb.services.map((s: string) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="DLT Template / Sender ID">DLT Template / Sender ID</option>
                  <option value="Route / Gateway Issue">Route / Gateway Issue</option>
                  <option value="WhatsApp WABA / Green Tick">WhatsApp WABA / Green Tick</option>
                  <option value="IVR Routing / Audio Prompt">IVR Routing / Audio Prompt</option>
                  <option value="General Panel Support">General Panel Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Urgency / Priority *
                </label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                >
                  <option value="LOW">Low (Standard Request)</option>
                  <option value="MEDIUM">Medium (General Assistance)</option>
                  <option value="HIGH">High (Active Campaign / Delivery Delay)</option>
                  <option value="URGENT">Urgent (Down / Immediate Attention)</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject / Short Requirement *
              </label>
              <input
                required
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="e.g., Approve sender ID IMMENS, or WhatsApp template pending"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
              />
            </div>

            {/* Requirement Details with Clipboard Paste Support */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Client Requirement Details / Message for Support *
                </label>
                <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Tip: Press Ctrl+V anywhere here to paste screenshot
                </span>
              </div>
              <textarea
                required
                rows={3}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                onPaste={handleTicketPaste}
                placeholder="Client ko template approval, route change, ya sender ID mapping karwani hai... (Ctrl+V se screenshot bhi paste kar sakte hain)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Screenshot Attachment Zone (Ctrl+V Paste or Browse File) */}
            <div
              onPaste={handleTicketPaste}
              tabIndex={0}
              className={'p-3.5 rounded-2xl border-2 border-dashed transition outline-none ' + (ticketScreenshotDataUrl ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-300 hover:border-indigo-400 focus:border-indigo-500 focus:bg-indigo-50/30')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  Attach Screenshot (Error / DLT Template / Client Query)
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                  Ctrl+C karke direct Ctrl+V karein
                </span>
              </div>

              {ticketScreenshotDataUrl ? (
                <div className="space-y-2">
                  <div className="relative group rounded-xl overflow-hidden border border-emerald-300 bg-white max-h-48 flex items-center justify-center p-2">
                    <img
                      src={ticketScreenshotDataUrl}
                      alt="Pasted screenshot"
                      className="max-h-44 object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoomedScreenshot(ticketScreenshotDataUrl)}
                        className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 text-xs font-bold flex items-center gap-1 shadow-md"
                      >
                        <ZoomIn className="w-3.5 h-3.5" /> View Full
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTicketScreenshotDataUrl('');
                          setTicketScreenshotName('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                    <span className="truncate flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      Attached: {ticketScreenshotName || 'Pasted Screenshot'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTicketScreenshotDataUrl('');
                        setTicketScreenshotName('');
                      }}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="flex items-center justify-center gap-2 text-indigo-600 mb-1">
                    <UploadCloud className="w-6 h-6" />
                    <span className="text-xs font-bold">Screenshot Paste (Ctrl+V) ya Click to Browse</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Snipping Tool ya WhatsApp web se screenshot copy karke yaha paste kar dein
                  </p>
                  <label className="inline-block mt-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs">
                    <span>Browse Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTicketFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTicketTargetOnb(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Request to Support (Tag: @{ticketTargetOnb.username})
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Support Engineer Resolve Ticket Modal */}
      <Modal
        open={Boolean(resolvingTicket)}
        onClose={() => setResolvingTicket(null)}
        title="Resolve Support Request"
        subtitle="Record resolution actions taken on panel for this account username."
      >
        {resolvingTicket && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await onAction('RESOLVE_SUPPORT_TICKET', {
                ticketId: resolvingTicket.id,
                resolutionNote,
              });
              if (ok) {
                setResolvingTicket(null);
              }
            }}
            className="space-y-4"
          >
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Account Username:</span>
                <span className="font-extrabold font-mono text-indigo-900">@{resolvingTicket.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sales Agent:</span>
                <span className="font-bold text-slate-800">{resolvingTicket.agentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requirement:</span>
                <span className="font-semibold text-slate-800">{resolvingTicket.subject}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resolution Note for Agent &amp; Account Manager *
              </label>
              <textarea
                required
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Explain what configuration, template approval, or route adjustment was completed..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Mark Resolved &amp; Notify Agent
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Complete 360° Lead-to-Future Lifecycle & Filterable Timeline Modal in Onboarding */}
      <Modal
        open={Boolean(viewHistoryItem)}
        onClose={() => setViewHistoryItem(null)}
        maxWidth="max-w-4xl"
        title={
          viewHistoryItem
            ? isSupport
              ? `Support Operations & Technical Timeline: @${viewHistoryItem.username} (${viewHistoryItem.companyName})`
              : `360° Complete Client Lifecycle & Audit Logs: @${viewHistoryItem.username} (${viewHistoryItem.companyName})`
            : 'Client 360° History'
        }
        subtitle="Organized chronological timeline from Lead Creation Date -> Calls & Quotations -> Onboarding -> Recharges -> External Campaigns -> Support Tickets -> Tally Bills -> Future Schedule."
      >
        {viewHistoryItem && (() => {
          // 1. Find matched lead in db or use embedded snapshot
          const matchedLead: Lead | undefined =
            (viewHistoryItem.leadId ? db.leads.find((l) => l.id === viewHistoryItem.leadId) : undefined) ||
            db.leads.find((l) => l.companyName.toLowerCase() === viewHistoryItem.companyName.toLowerCase()) ||
            viewHistoryItem.leadData;

          // 2. Find all Recharges & External Campaigns for this client
          const clientRecharges = (db.rechargeRequests || []).filter(
            (r) =>
              r.onboardingId === viewHistoryItem.id ||
              r.username.toLowerCase() === viewHistoryItem.username.toLowerCase() ||
              r.companyName.toLowerCase() === viewHistoryItem.companyName.toLowerCase()
          );

          // 3. Find all Support Tickets for this client
          const clientTickets = (db.supportTickets || []).filter(
            (t) =>
              t.onboardingId === viewHistoryItem.id ||
              (t.username || '').toLowerCase() === viewHistoryItem.username.toLowerCase() ||
              (t.companyName || '').toLowerCase() === viewHistoryItem.companyName.toLowerCase()
          );

          // 4. Find all Meet Requests for this client
          const clientMeets = (db.meetRequests || []).filter(
            (m) =>
              (matchedLead && m.leadId === matchedLead.id) ||
              m.companyName.toLowerCase() === viewHistoryItem.companyName.toLowerCase()
          );

          // Build Unified Timeline Event Interface
          type UnifiedEvent = {
            id: string;
            category: 'LEAD_CALLS' | 'ONBOARDING' | 'RECHARGES' | 'CAMPAIGNS' | 'SUPPORT' | 'BILLING' | 'UPCOMING';
            badgeLabel: string;
            badgeColor: string;
            title: string;
            actor: string;
            timestamp: string;
            summary: string;
            amountText?: string;
            downloads?: { label: string; url: string; fileName: string }[];
            isFuture?: boolean;
          };

          const events: UnifiedEvent[] = [];

          // A. Lead Creation Event (First milestone!)
          if (matchedLead && !isSupport) {
            events.push({
              id: `lead-created-${matchedLead.id}`,
              category: 'LEAD_CALLS',
              badgeLabel: '🌱 Lead Created',
              badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
              title: `Lead Registered in CRM (${matchedLead.source || 'Direct'})`,
              actor: matchedLead.assignedToAgentName || viewHistoryItem.agentName,
              timestamp: matchedLead.createdAt || viewHistoryItem.createdAt,
              summary: `Initial Lead Date: ${matchedLead.leadDate || matchedLead.createdAt.slice(0, 10)} • Contact: ${matchedLead.clientName} (${matchedLead.phone || '—'}) • Interested in: ${matchedLead.serviceInterest}`,
            });
          }

          // B. Call Logs & Lead Timeline Notes
          for (const log of matchedLead?.callLogs || []) {
            const s = (log.summary || '').toLowerCase();
            // Avoid duplicating auto-pushed recharge/ticket notes if we already show rich cards, OR categorize them accurately
            let cat: UnifiedEvent['category'] = 'LEAD_CALLS';
            let badgeLabel = `📞 ${log.type}`;
            let badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';

            if (s.includes('external campaign')) {
              cat = 'CAMPAIGNS';
              badgeLabel = '🚀 External Campaign';
              badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
            } else if (s.includes('tally bill') || s.includes('invoice') || s.includes('billing completed')) {
              cat = 'BILLING';
              badgeLabel = '🧾 Tally Billing';
              badgeColor = 'bg-sky-100 text-sky-900 border-sky-300';
            } else if (s.includes('recharge')) {
              cat = 'RECHARGES';
              badgeLabel = '⚡ Panel Recharge';
              badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
            } else if (s.includes('ticket') || s.includes('support assistance') || s.includes('support request')) {
              cat = 'SUPPORT';
              badgeLabel = '🛠️ Support Log';
              badgeColor = 'bg-purple-100 text-purple-900 border-purple-300';
            } else if (s.includes('portal') || s.includes('onboard') || s.includes('account created')) {
              cat = 'ONBOARDING';
              badgeLabel = '🔑 Account Setup';
              badgeColor = 'bg-indigo-100 text-indigo-900 border-indigo-300';
            } else if ((log.type as string) === 'QUOTATION' || s.includes('quotation')) {
              cat = 'LEAD_CALLS';
              badgeLabel = '📄 Quotation';
              badgeColor = 'bg-violet-100 text-violet-900 border-violet-300';
            }

            if (isSupport && cat !== 'SUPPORT' && cat !== 'ONBOARDING' && cat !== 'RECHARGES' && cat !== 'CAMPAIGNS') {
              continue;
            }

            events.push({
              id: `calllog-${log.id}`,
              category: cat,
              badgeLabel,
              badgeColor,
              title: `${log.type} by ${log.createdBy}${log.callConnectStatus ? ` (${log.callConnectStatus})` : ''}`,
              actor: log.createdBy,
              timestamp: log.createdAt,
              summary: log.summary,
              amountText: !isSupport && log.quotationAmount ? `Quotation: ₹${log.quotationAmount.toLocaleString('en-IN')}` : undefined,
            });
          }

          // B2. Recorded Quotation History on Onboarded Client (if not already in callLogs)
          if (!isSupport) {
            const onbQuotes: LeadQuotation[] =
              viewHistoryItem.quotationHistory ||
              (viewHistoryItem.quotation ? [viewHistoryItem.quotation] : []);
            for (const qt of onbQuotes) {
              const alreadyLogged = events.some(
                (ev) => ev.category === 'LEAD_CALLS' && ev.summary.includes(qt.quotationNumber)
              );
              if (!alreadyLogged) {
                events.push({
                  id: `onb-qt-${viewHistoryItem.id}-${qt.quotationNumber}`,
                  category: 'LEAD_CALLS',
                  badgeLabel: '📄 Quotation',
                  badgeColor: 'bg-violet-100 text-violet-900 border-violet-300',
                  title: `Quotation ${qt.quotationNumber} (${qt.channel || 'Email + WhatsApp'})`,
                  actor: qt.managerName || viewHistoryItem.agentName,
                  timestamp: qt.updatedAt || qt.quotationDate || viewHistoryItem.updatedAt,
                  summary: `Proposal ${qt.quotationNumber} (${(qt.items || []).map((i) => i.service).join(', ')}) sent via ${qt.channel || 'CRM'}.`,
                  amountText: qt.totalAmount ? `Quotation: ₹${qt.totalAmount.toLocaleString('en-IN')}` : undefined,
                });
              }
            }
          }

          // C. Onboarding & Portal Credentials Provisioned Events
          const kycDownloads: { label: string; url: string; fileName: string }[] = [];
          if (viewHistoryItem.gstPdfDataUrl) {
            kycDownloads.push({
              label: 'GST Certificate (PDF)',
              url: viewHistoryItem.gstPdfDataUrl,
              fileName: viewHistoryItem.gstPdfName || `GST_${viewHistoryItem.username}.pdf`,
            });
          }
          if (viewHistoryItem.panCardDataUrl) {
            kycDownloads.push({
              label: 'PAN Card',
              url: viewHistoryItem.panCardDataUrl,
              fileName: viewHistoryItem.panCardName || `PAN_${viewHistoryItem.username}.jpg`,
            });
          }
          if (viewHistoryItem.msmeDocDataUrl) {
            kycDownloads.push({
              label: 'MSME Certificate',
              url: viewHistoryItem.msmeDocDataUrl,
              fileName: viewHistoryItem.msmeDocName || `MSME_${viewHistoryItem.username}.pdf`,
            });
          }
          if (viewHistoryItem.brandLogoDataUrl) {
            kycDownloads.push({
              label: 'Brand Logo (RCS/WABA)',
              url: viewHistoryItem.brandLogoDataUrl,
              fileName: viewHistoryItem.brandLogoName || `Logo_${viewHistoryItem.username}.png`,
            });
          }
          if (viewHistoryItem.brandBannerDataUrl) {
            kycDownloads.push({
              label: 'Brand Banner (1440x448)',
              url: viewHistoryItem.brandBannerDataUrl,
              fileName: viewHistoryItem.brandBannerName || `Banner_${viewHistoryItem.username}.jpg`,
            });
          }
          if (viewHistoryItem.otherDocDataUrl) {
            kycDownloads.push({
              label: 'Agreement / Other Document',
              url: viewHistoryItem.otherDocDataUrl,
              fileName: viewHistoryItem.otherDocName || `Doc_${viewHistoryItem.username}.pdf`,
            });
          }

          events.push({
            id: `onb-init-${viewHistoryItem.id}`,
            category: 'ONBOARDING',
            badgeLabel: '🏢 Client Onboarded',
            badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
            title: `Onboarding Submitted for @${viewHistoryItem.username}`,
            actor: viewHistoryItem.agentName,
            timestamp: viewHistoryItem.createdAt,
            summary: `Services: ${(viewHistoryItem.services || []).join(', ')}${!isSupport && viewHistoryItem.billingEntity ? ` • Billing Entity: ${viewHistoryItem.billingEntity} (GST: ${viewHistoryItem.gstNumber || 'Non-GST'})` : ''}`,
            amountText: !isSupport && viewHistoryItem.totalDealAmount ? `Deal: ${formatINR(viewHistoryItem.totalDealAmount)}` : undefined,
            downloads: kycDownloads.length > 0 ? kycDownloads : undefined,
          });

          if (viewHistoryItem.portalCredentials && viewHistoryItem.portalCredentials.length > 0) {
            for (const cred of viewHistoryItem.portalCredentials) {
              events.push({
                id: `cred-${viewHistoryItem.id}-${cred.serviceKey}`,
                category: 'ONBOARDING',
                badgeLabel: '🔑 Portal Login Active',
                badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                title: `${cred.serviceName} Configured (@${cred.username})`,
                actor: cred.configuredBy || 'Support Team',
                timestamp: cred.configuredAt || viewHistoryItem.updatedAt,
                summary: `Portal URL: ${cred.portalUrl} • Username: ${cred.username} • Password: ${cred.password || '****'}${cred.supportNote ? ` • Note: ${cred.supportNote}` : ''}`,
              });
            }
          }

          // D. Structured Recharges, External Campaigns & Tally Bills with 1-Click Downloads!
          for (const rec of clientRecharges) {
            const isExt = Boolean(rec.isExternalCampaign);
            const dlList: { label: string; url: string; fileName: string }[] = [];
            if (rec.screenshotDataUrl) {
              dlList.push({
                label: 'Client Proof',
                url: rec.screenshotDataUrl,
                fileName: rec.screenshotName || `client-proof-${rec.username}.png`,
              });
            }
            if (!isSupport && rec.billingTaxInvoiceDataUrl) {
              dlList.push({
                label: `Tally Bill #${rec.billingInvoiceNumber}`,
                url: rec.billingTaxInvoiceDataUrl,
                fileName: rec.billingTaxInvoiceName || `${rec.billingInvoiceNumber}.svg`,
              });
            }
            if (rec.supportScreenshotDataUrl) {
              dlList.push({
                label: isExt ? 'Campaign LIVE Proof' : 'Support Panel Proof',
                url: rec.supportScreenshotDataUrl,
                fileName: rec.supportScreenshotName || `support-proof-${rec.username}.png`,
              });
            }

            // Main Recharge / External Campaign Event
            events.push({
              id: `rec-card-${rec.id}`,
              category: isExt ? 'CAMPAIGNS' : 'RECHARGES',
              badgeLabel: isExt ? '🚀 External Campaign' : '⚡ Panel Recharge',
              badgeColor: isExt
                ? 'bg-amber-100 text-amber-950 border-amber-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300',
              title: isExt
                ? `${rec.campaignTitle || `${rec.service} External Campaign`} (${(rec.creditCount || 0).toLocaleString('en-IN')} Count)`
                : `${rec.service} Recharge — ${(rec.creditCount || 100000).toLocaleString('en-IN')} Credits (${rec.paymentMode || 'PREPAID'})`,
              actor: rec.agentName,
              timestamp: rec.createdAt,
              summary: `Status: ${rec.status}${rec.supportConfirmedBy ? ` • Executed by Support (${rec.supportConfirmedBy}): ${rec.supportRechargeNote || 'Done'}` : ''}${!isSupport && rec.billingInvoiceNumber ? ` • Tally Invoice: #${rec.billingInvoiceNumber} (${rec.billingPaymentStatus || 'PAID'})` : ''}${rec.agentNotes ? ` • Agent Note: ${rec.agentNotes}` : ''}`,
              amountText: !isSupport ? formatINR(rec.amount) : `${(rec.creditCount || 0).toLocaleString('en-IN')} Credits`,
              downloads: dlList,
            });

            // Dedicated Billing Invoice Milestone if Tally Bill was raised
            if (!isSupport && rec.billingInvoiceNumber) {
              const totAmt = Number(rec.amount || 0);
              const paySt = rec.billingPaymentStatus || 'PAID';
              const paidAmt =
                rec.paidAmount !== undefined
                  ? Number(rec.paidAmount)
                  : paySt === 'PAID'
                  ? totAmt
                  : paySt === 'PENDING'
                  ? 0
                  : Math.round(totAmt / 2);
              const balAmt =
                rec.balanceAmount !== undefined
                  ? Number(rec.balanceAmount)
                  : Math.max(0, totAmt - paidAmt);

              events.push({
                id: `bill-card-${rec.id}`,
                category: 'BILLING',
                badgeLabel: `🧾 Tally Bill (${paySt})`,
                badgeColor:
                  paySt === 'PAID'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : paySt === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300',
                title: `Tally Tax Invoice #${rec.billingInvoiceNumber} — Received: ${formatINR(paidAmt)} | Balance Due: ${formatINR(balAmt)}`,
                actor: rec.paymentUpdatedBy || rec.billingCompletedBy || 'Accounts / Billing Team',
                timestamp: rec.paymentUpdatedAt || rec.billingCompletedAt || rec.updatedAt,
                summary: `Billed To: ${rec.billingEntity || rec.companyName} (GST: ${rec.gstNumber || 'Non-GST'}) • Service: ${rec.service} • Accounts Note: ${rec.billingPaymentNote || 'Verified'}`,
                amountText: `Bill: ${formatINR(totAmt)}`,
                downloads: rec.billingTaxInvoiceDataUrl
                  ? [
                      {
                        label: `Download Tally Bill #${rec.billingInvoiceNumber}`,
                        url: rec.billingTaxInvoiceDataUrl,
                        fileName: rec.billingTaxInvoiceName || `${rec.billingInvoiceNumber}.svg`,
                      },
                    ]
                  : undefined,
              });
            }
          }

          // E. Support Tickets Raised & Resolved
          for (const tkt of clientTickets) {
            events.push({
              id: `tkt-card-${tkt.id}`,
              category: 'SUPPORT',
              badgeLabel: `🛠️ Ticket ${tkt.id.toUpperCase()}`,
              badgeColor:
                tkt.status === 'RESOLVED'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border-rose-300',
              title: `[${tkt.serviceCategory} • ${tkt.priority}] ${tkt.subject}`,
              actor: `${tkt.fromUserName || tkt.agentName} → ${tkt.targetRole || 'SUPPORT'}`,
              timestamp: tkt.updatedAt || tkt.createdAt,
              summary: `Issue: ${tkt.description}${tkt.supportResolutionNote ? `\n✅ Resolution (${tkt.resolvedBy}): ${tkt.supportResolutionNote}` : ' • Status: Open / In Progress'}`,
              downloads: tkt.screenshotDataUrl
                ? [
                    {
                      label: 'Ticket Screenshot',
                      url: tkt.screenshotDataUrl,
                      fileName: tkt.screenshotName || `ticket-${tkt.id}.png`,
                    },
                  ]
                : undefined,
            });
          }

          // F. Future / Upcoming Reminders, Scheduled Meets & Pending Billing Follow-Ups!
          if (matchedLead?.reminder && !matchedLead.reminder.completed) {
            events.push({
              id: `future-rem-${matchedLead.id}`,
              category: 'UPCOMING',
              badgeLabel: '⏰ Future Callback Reminder',
              badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
              title: `Scheduled Follow-Up Callback`,
              actor: matchedLead.assignedToAgentName || viewHistoryItem.agentName,
              timestamp: matchedLead.reminder.datetime,
              summary: `Note: ${matchedLead.reminder.note || 'Follow up with client'}`,
              isFuture: true,
            });
          }

          for (const meet of clientMeets) {
            const isUpcomingMeet = meet.status === 'PENDING_APPROVAL' || meet.status === 'APPROVED';
            events.push({
              id: `meet-card-${meet.id}`,
              category: isUpcomingMeet ? 'UPCOMING' : 'SUPPORT',
              badgeLabel: isUpcomingMeet ? '📅 Upcoming Demo Meet' : '✅ Demo Meet Completed',
              badgeColor: isUpcomingMeet
                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                : 'bg-emerald-100 text-emerald-900 border-emerald-300',
              title: `${meet.platform} Meeting — ${meet.scheduledDate} at ${meet.scheduledTime}`,
              actor: (meet as any).supportAssignedName || meet.agentName,
              timestamp: `${meet.scheduledDate}T${meet.scheduledTime || '12:00'}:00`,
              summary: `Agenda: ${meet.agenda} • Status: ${meet.status}`,
              isFuture: isUpcomingMeet,
            });
          }

          for (const rec of clientRecharges) {
            if (rec.isExternalCampaign && rec.status === 'RECHARGE_COMPLETED' && !rec.billingInvoiceNumber) {
              events.push({
                id: `future-bill-rem-${rec.id}`,
                category: 'UPCOMING',
                badgeLabel: '🔔 Pending Billing Action',
                badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
                title: `Regular Billing Reminder: Raise Tally Bill for LIVE External Campaign`,
                actor: `Billing Team & Agent (${rec.agentName})`,
                timestamp: new Date(Date.now() + 3600000).toISOString(),
                summary: `External Campaign (${rec.service}) is LIVE. Follow-ups sent: ${rec.billingFollowUpCount || 0}. Awaiting Tally Tax Invoice creation.`,
                amountText: !isSupport ? formatINR(rec.amount) : undefined,
                isFuture: true,
              });
            }
          }

          // Sort chronologically (Newest / Future at top, or filterable)
          const sortedEvents = events.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          const filteredEvents = sortedEvents.filter((ev) => {
            if (historyFilter !== 'ALL' && ev.category !== historyFilter) return false;
            if (historySearch) {
              const q = historySearch.toLowerCase();
              return (
                ev.title.toLowerCase().includes(q) ||
                ev.summary.toLowerCase().includes(q) ||
                ev.actor.toLowerCase().includes(q) ||
                ev.badgeLabel.toLowerCase().includes(q)
              );
            }
            return true;
          });

          const countByCat = (cat: UnifiedEvent['category']) =>
            sortedEvents.filter((e) => e.category === cat).length;

          return (
            <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
              {/* 360° Lifecycle Master Header Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-300">
                    <Clock className="w-4 h-4" />
                    <span>360° Client Lifecycle (Lead Date → Present → Future Schedule)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 font-mono font-bold">
                      @{viewHistoryItem.username}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold">
                      {viewHistoryItem.status}
                    </span>
                  </div>
                </div>

                {/* KPI Summary Counters across the Client's Lifecycle */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">1. Lead Date</div>
                    <div className="font-bold text-white mt-0.5">
                      {matchedLead?.leadDate || viewHistoryItem.createdAt.slice(0, 10)}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">2. Agent &amp; AM</div>
                    <div className="font-bold text-white mt-0.5 truncate">
                      {viewHistoryItem.agentName} / {viewHistoryItem.accountManagerName || 'Neha'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">3. Recharges</div>
                    <div className="font-black text-emerald-400 mt-0.5">
                      {clientRecharges.filter((r) => !r.isExternalCampaign).length} Orders
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">4. Ext Campaigns</div>
                    <div className="font-black text-amber-300 mt-0.5">
                      {clientRecharges.filter((r) => r.isExternalCampaign).length} Campaigns
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">5. Support Tickets</div>
                    <div className="font-black text-purple-300 mt-0.5">
                      {clientTickets.length} Tickets
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">6. Tally Bills</div>
                    <div className="font-black text-sky-300 mt-0.5">
                      {clientRecharges.filter((r) => Boolean(r.billingInvoiceNumber)).length} Invoices
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Filter Pills & Search Bar */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'ALL', label: `All Logs (${sortedEvents.length})` },
                        ...(!isSupport
                          ? [{ id: 'LEAD_CALLS', label: `📞 Lead & Calls (${countByCat('LEAD_CALLS')})` }]
                          : []),
                        { id: 'ONBOARDING', label: `🔑 Onboarding (${countByCat('ONBOARDING')})` },
                        { id: 'RECHARGES', label: `⚡ Recharges (${countByCat('RECHARGES')})` },
                        { id: 'CAMPAIGNS', label: `🚀 Ext Campaigns (${countByCat('CAMPAIGNS')})` },
                        { id: 'SUPPORT', label: `🛠️ Support (${countByCat('SUPPORT')})` },
                        ...(!isSupport
                          ? [{ id: 'BILLING', label: `🧾 Tally Bills (${countByCat('BILLING')})` }]
                          : []),
                        { id: 'UPCOMING', label: `⏰ Future / Pending (${countByCat('UPCOMING')})` },
                      ] as { id: typeof historyFilter; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHistoryFilter(tab.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold transition ${
                          historyFilter === tab.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Filter logs by keyword..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Unified Chronological Timeline Feed */}
              <div className="space-y-2.5">
                {filteredEvents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No activity logs found in this filter category.
                  </div>
                ) : (
                  filteredEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3.5 rounded-2xl border transition space-y-2 ${
                        ev.isFuture
                          ? 'bg-amber-50/40 border-amber-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${ev.badgeColor}`}
                          >
                            {ev.badgeLabel}
                          </span>
                          <span className="font-bold text-slate-900">{ev.title}</span>
                          {ev.amountText && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[11px]">
                              {ev.amountText}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>
                            By <strong className="text-slate-700">{ev.actor}</strong>
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">
                            {formatDateTime(ev.timestamp)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                        {ev.summary}
                      </p>

                      {/* 1-Click Direct Download Proof Buttons inside Timeline Log */}
                      {ev.downloads && ev.downloads.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {ev.downloads.map((dl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => triggerDirectDownload(dl.url, dl.fileName)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Download className="w-3 h-3" />
                              <span>1-Click Download: {dl.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 flex justify-end border-t border-slate-200">
                <button
                  onClick={() => setViewHistoryItem(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Close 360° Lifecycle Logs
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* External Campaign Modal (Directly from Onboarded Client) */}
      <Modal
        open={Boolean(extCampaignClient)}
        onClose={() => setExtCampaignClient(null)}
        title={`🚀 Run External Campaign: @${extCampaignClient?.username || ''}`}
        subtitle="Attach client supporting screenshot & submit. Request goes DIRECTLY to Support (AM & Admin in loop) -> Support makes Campaign LIVE -> Billing gets regular reminder."
      >
        {extCampaignClient && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const defaultSvg =
                'data:image/svg+xml;utf8,' +
                encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="280"><rect width="560" height="280" fill="#0f172a"/><text x="36" y="70" font-family="Arial" font-size="20" font-weight="bold" fill="#4ade80">External Campaign Client Approval</text><text x="36" y="120" font-family="Arial" font-size="15" fill="#ffffff">Client: @${extCampaignClient.username} (${extCampaignClient.companyName})</text><text x="36" y="155" font-family="Arial" font-size="14" fill="#94a3b8">Service: ${extService} • Count: ${Number(extCount).toLocaleString('en-IN')}</text></svg>`
                );

              const ok = await onAction('CREATE_RECHARGE', {
                onboardingId: extCampaignClient.id,
                service: extService,
                isExternalCampaign: true,
                campaignTitle: extTitle,
                creditCount: Number(extCount) || 50000,
                amount: Number(extAmount) || 0,
                unitRate: `₹${extRate} / unit`,
                paymentMode: extCampaignClient.paymentType || extCampaignClient.billingType || 'PREPAID',
                billingEntity: extCampaignClient.billingEntity || `${extCampaignClient.companyName} Pvt Ltd`,
                gstNumber: extCampaignClient.gstNumber || '27AABCU9603R1ZM',
                screenshotDataUrl: extProofUrl || defaultSvg,
                screenshotName: extProofName || 'external-campaign-client-proof.svg',
                agentNotes: extNotes,
              });
              if (ok) {
                setExtCampaignClient(null);
              }
            }}
            className="space-y-4"
          >
            {/* Pre-saved Client Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Panel @Username</span>
                <span className="font-mono font-bold text-emerald-400">@{extCampaignClient.username}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Billing Entity</span>
                <span className="font-bold text-white truncate block">
                  {extCampaignClient.billingEntity || extCampaignClient.companyName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Loop</span>
                <span className="font-semibold text-amber-300">
                  AM ({extCampaignClient.accountManagerName || 'Neha Kapoor'}) &amp; Admin
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Campaign Channel (SMS / RCS / WhatsApp) *
              </label>
              <div className="flex flex-wrap gap-2">
                {extCampaignClient.services.map((svc) => (
                  <button
                    key={svc}
                    type="button"
                    onClick={() => {
                      setExtService(svc);
                      setExtTitle(`${svc} External Campaign — ${extCampaignClient.companyName}`);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                      extService === svc
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {svc}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Campaign Title / Template / Target Info *
              </label>
              <input
                required
                value={extTitle}
                onChange={(e) => setExtTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Count / Volume (Sent to Support) *
                </label>
                <input
                  type="number"
                  required
                  value={extCount}
                  onChange={(e) => {
                    setExtCount(e.target.value);
                    setExtAmount(String(Math.round((Number(e.target.value) || 0) * extRate)));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-indigo-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bill Amount in ₹ INR (For Later Billing) *
                </label>
                <input
                  type="number"
                  required
                  value={extAmount}
                  onChange={(e) => setExtAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-black text-emerald-800"
                />
              </div>
            </div>

            {/* Client Supporting Screenshot (Ctrl+V) */}
            <div
              onPaste={handleExtPaste}
              tabIndex={0}
              className="p-3.5 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 text-center space-y-2 outline-none"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-amber-700" />
                  Attach Client Supporting Screenshot (Ctrl+V) *
                </span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800">
                  Ctrl+V to Paste
                </span>
              </div>

              {extProofUrl ? (
                <div className="space-y-1">
                  <img src={extProofUrl} alt="Client Campaign Proof" className="max-h-32 mx-auto rounded border" />
                  <div className="text-[11px] text-emerald-700 font-bold">✓ Attached: {extProofName}</div>
                </div>
              ) : (
                <div className="py-2 text-xs text-slate-600">
                  Press <strong>Ctrl+V</strong> to paste Client Campaign Approval Screenshot
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campaign Instructions for Support
              </label>
              <textarea
                rows={2}
                value={extNotes}
                onChange={(e) => setExtNotes(e.target.value)}
                onPaste={handleExtPaste}
                placeholder="Enter audience file link, template ID or schedule time..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setExtCampaignClient(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                🚀 Send Campaign Direct to Support
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Screenshot Zoom Lightbox Modal */}
      <Modal
        open={Boolean(zoomedScreenshot)}
        onClose={() => setZoomedScreenshot(null)}
        title="Client / Technical Query Screenshot"
      >
        {zoomedScreenshot && (
          <div className="space-y-3">
            <div className="max-h-[75vh] overflow-auto rounded-xl bg-slate-900/90 p-2 flex items-center justify-center">
              <img
                src={zoomedScreenshot}
                alt="Enlarged screenshot"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setZoomedScreenshot(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                Close Full View
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Portal Login Details Popup Modal */}
      <Modal
        open={Boolean(viewCredsItem)}
        onClose={() => setViewCredsItem(null)}
        title={`Portal Login Details — ${viewCredsItem?.companyName || ''}`}
        subtitle={`Account: @${viewCredsItem?.username || ''} • Status: ${viewCredsItem?.status || ''}`}
        maxWidth="max-w-xl"
      >
        {viewCredsItem && (
          <div className="space-y-3">
            {viewCredsItem.portalCredentials && viewCredsItem.portalCredentials.length > 0 ? (
              viewCredsItem.portalCredentials.map((cred, idx) => (
                <div
                  key={`${cred.serviceKey}-${idx}`}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#0A1B3F]">
                      {cred.serviceName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const txt = `${cred.serviceName}\nURL: ${cred.portalUrl}\nUsername: ${cred.username}\nPassword: ${cred.password || 'N/A'}`;
                        navigator.clipboard?.writeText(txt);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Details
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block">Portal URL</span>
                      <a
                        href={cred.portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-blue-600 hover:underline break-all"
                      >
                        {cred.portalUrl}
                      </a>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block">Username</span>
                      <span className="font-mono font-bold text-slate-900">{cred.username}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-400 block">Password</span>
                      <span className="font-mono font-bold text-slate-900">{cred.password || '—'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0A1B3F]">Primary Panel Credentials</span>
                  <button
                    type="button"
                    onClick={() => {
                      const txt = `URL: ${viewCredsItem.panelUrl || 'https://portal.immenseair.in'}\nUsername: ${viewCredsItem.username}\nPassword: ${viewCredsItem.panelPassword || 'Pending Support Setup'}`;
                      navigator.clipboard?.writeText(txt);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Details
                  </button>
                </div>
                <div><strong>Portal URL:</strong> {viewCredsItem.panelUrl || 'Pending Support Setup'}</div>
                <div><strong>Username:</strong> <span className="font-mono">{viewCredsItem.username}</span></div>
                <div><strong>Password:</strong> <span className="font-mono">{viewCredsItem.panelPassword || 'Pending Support Setup'}</span></div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Generate / Send Multiple Quotations Modal for Onboarded Clients */}
      <QuotationModal
        open={Boolean(quoteModalState)}
        onClose={() => setQuoteModalState(null)}
        lead={quoteModalState?.leadProxy || null}
        initialQuotation={quoteModalState?.initial || null}
        quotationHistory={quoteModalState?.history || []}
        userId={currentUser.id}
        managerDefaults={{
          name: currentUser.name,
          designation: currentUser.designation,
          phone: currentUser.phone,
          email: currentUser.mailConfig?.email || currentUser.email,
        }}
        onSave={async (updatedQt) => {
          if (!quoteModalState) return;
          const item = quoteModalState.item;
          await onAction('SAVE_QUOTATION', {
            leadId: item.leadId,
            onboardingId: item.id,
            quotation: updatedQt,
          });
          if (updatedQt.channel === 'Email') {
            await onAction('LOG_QUOTATION_SENT', {
              leadId: item.leadId,
              onboardingId: item.id,
              proposalNumber: updatedQt.quotationNumber,
              channel: 'Email',
              to: quoteModalState.leadProxy.email || item.clientEmail || updatedQt.email || '',
              amount: updatedQt.totalAmount,
              quotation: updatedQt,
            });
          }
        }}
        onSendWhatsApp={async (updatedQt) => {
          if (!quoteModalState) return;
          const item = quoteModalState.item;
          const waQt = { ...updatedQt, channel: 'WhatsApp' };
          await onAction('SAVE_QUOTATION', {
            leadId: item.leadId,
            onboardingId: item.id,
            quotation: waQt,
          });
          await onAction('LOG_QUOTATION_SENT', {
            leadId: item.leadId,
            onboardingId: item.id,
            proposalNumber: updatedQt.quotationNumber,
            channel: 'WhatsApp',
            to: quoteModalState.leadProxy.phone || item.clientPhone || updatedQt.phone || '',
            amount: updatedQt.totalAmount,
            quotation: waQt,
          });
          setQuoteModalState(null);
        }}
      />

      {/* KYC & Brand Assets Modal for Agent, Admin & Support */}
      <Modal
        open={Boolean(viewKycItem)}
        onClose={() => setViewKycItem(null)}
        title={`KYC & Brand Assets — ${viewKycItem?.companyName || ''}`}
        subtitle={`Account: @${viewKycItem?.username || ''} • Entity: ${viewKycItem?.billingEntity || 'N/A'}`}
        maxWidth="max-w-2xl"
      >
        {viewKycItem && (
          <div className="space-y-4">
            {getKycDocs(viewKycItem).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {getKycDocs(viewKycItem).map((doc) => (
                  <div
                    key={doc.key}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-md transition space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold text-[#0A1B3F]">
                          {doc.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                          {doc.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {doc.description}
                      </p>

                      {/* Image Thumbnail Preview if applicable */}
                      {doc.isImage && (
                        <div
                          onClick={() => setZoomedScreenshot(doc.url)}
                          className="w-full h-24 rounded-xl border border-slate-200 overflow-hidden bg-white cursor-pointer relative group flex items-center justify-center"
                          title="Click to view full size"
                        >
                          <img
                            src={doc.url}
                            alt={doc.label}
                            className="w-full h-full object-contain p-1 group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold gap-1">
                            <ZoomIn className="w-4 h-4" />
                            <span>Preview</span>
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] font-mono text-slate-600 truncate bg-white px-2 py-1 rounded-lg border border-slate-200/80">
                        📄 {doc.fileName}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={() => triggerDirectDownload(doc.url, doc.fileName)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Paperclip className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">No KYC Documents Attached</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No PAN, GST, MSME or Brand assets were uploaded during client onboarding.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewKycItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
