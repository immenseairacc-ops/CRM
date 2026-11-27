import fs from 'fs';
import path from 'path';
import {
  CrmDatabase,
  Lead,
  MeetRequest,
  NotificationItem,
  OnboardingRequest,
  RechargeRequest,
  Role,
  Team,
  User,
} from '@/types/crm';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'crm-db.json');

const SAMPLE_SCREENSHOT_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
  <rect width="600" height="360" fill="#f8fafc"/>
  <rect x="24" y="24" width="552" height="312" rx="16" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="24" y="24" width="552" height="64" rx="16" fill="#0f172a"/>
  <text x="48" y="64" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">NEFT / UPI Payment Receipt</text>
  <circle cx="80" cy="145" r="24" fill="#dcfce7"/>
  <path d="M70 145 l7 7 l14 -14" stroke="#16a34a" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="120" y="140" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">Payment Successful: ₹25,000.00</text>
  <text x="120" y="164" font-family="Arial, sans-serif" font-size="13" fill="#475569">UTR / Ref: HDFC000492817364 • Verified Transfer</text>
  <line x1="48" y1="196" x2="552" y2="196" stroke="#e2e8f0" stroke-width="1"/>
  <text x="48" y="228" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Client Account:</text>
  <text x="180" y="228" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">apex_sms_prod (Apex Retail Pvt Ltd)</text>
  <text x="48" y="256" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Service:</text>
  <text x="180" y="256" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">Bulk SMS + WhatsApp API Credits</text>
  <text x="48" y="284" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Date:</text>
  <text x="180" y="284" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">17 Nov 2026, 10:15 AM IST</text>
</svg>`);

const SAMPLE_TAX_INVOICE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">
  <rect width="600" height="420" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="0" y="0" width="600" height="72" fill="#1e293b"/>
  <text x="32" y="34" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">TAX INVOICE</text>
  <text x="32" y="56" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">Invoice #: INV-2026-0841 • GSTIN: 27AABCU9603R1ZM</text>
  <text x="32" y="108" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">Billed To: Apex Retail Private Limited</text>
  <text x="32" y="128" font-family="Arial, sans-serif" font-size="12" fill="#475569">Account: apex_sms_prod | Payment Status: PAID</text>
  <rect x="32" y="152" width="536" height="32" fill="#f1f5f9"/>
  <text x="44" y="173" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Description</text>
  <text x="360" y="173" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Taxable</text>
  <text x="480" y="173" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155">Total (18% GST)</text>
  <text x="44" y="210" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">Bulk SMS + WhatsApp Recharge</text>
  <text x="360" y="210" font-family="Arial, sans-serif" font-size="13" fill="#0f172a">₹21,186.44</text>
  <text x="480" y="210" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹25,000.00</text>
  <line x1="32" y1="240" x2="568" y2="240" stroke="#e2e8f0" stroke-width="1"/>
  <rect x="32" y="268" width="160" height="36" rx="6" fill="#dcfce7" stroke="#86efac"/>
  <text x="58" y="291" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#15803d">PAID IN FULL</text>
</svg>`);

export function createSeedDatabase(): CrmDatabase {
  const now = new Date();
  const iso = (offsetMinutes = 0) =>
    new Date(now.getTime() + offsetMinutes * 60_000).toISOString();

  const teams: Team[] = [
    {
      id: 'team-a',
      name: 'Team A (Core Sales & Ops)',
      description: 'Default Team A led by Neha Kapoor (AM)',
      createdAt: iso(-5000),
    },
  ];

  const users: User[] = [
    {
      id: 'usr-admin-1',
      name: 'Vikram Mehta',
      email: 'admin@immenseair.in',
      password: '123456',
      role: 'ADMIN',
      isActive: true,
      avatar: 'VM',
      department: 'Executive Management',
      designation: 'General Manager',
      phone: '+91 9768566466',
      mailSignature: 'Regards,\nVikram Mehta\nGeneral Manager\nImmense Air Pvt Ltd\nMobile: +91 9768566466 | Email: admin@immenseair.in\nWebsite: www.immenseair.in',
    },
  ];

  const leads: Lead[] = [
    {
      id: 'lead-101',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Rohan Malhotra',
      companyName: 'FinEdge Capital',
      designation: 'VP Growth & Marketing',
      phone: '+91 98201 44510',
      email: 'rohan@finedge.in',
      linkedinUrl: 'https://linkedin.com/in/rohan-malhotra-finedge',
      cityLocation: 'Mumbai, Maharashtra',
      feedbackRemark: 'Looking for 5L monthly WhatsApp + OTP SMS volume; very responsive.',
      source: 'LinkedIn Ads',
      serviceInterest: 'WhatsApp Business API + Bulk SMS',
      status: 'HOT',
      assignedToAgentId: 'usr-agent-1',
      assignedToAgentName: 'Rahul Sharma',
      uploadedBy: 'Neha Kapoor',
      callLogs: [
        {
          id: 'log-1',
          type: 'CALL',
          summary: 'Spoke with Rohan; needs 5L promotional + OTP SMS monthly. Wants technical demo.',
          statusAfter: 'HOT',
          createdBy: 'Rahul Sharma',
          createdAt: iso(-180),
        },
        {
          id: 'log-2',
          type: 'EMAIL',
          summary: 'Sent rate card and DLT compliance checklist.',
          createdBy: 'Rahul Sharma',
          createdAt: iso(-120),
        },
      ],
      reminder: null,
      createdAt: iso(-1440),
      updatedAt: iso(-120),
    },
    {
      id: 'lead-102',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Ananya Deshmukh',
      companyName: 'MedCare Diagnostics',
      designation: 'Head of Operations',
      phone: '+91 98112 77823',
      email: 'ananya@medcarediag.com',
      linkedinUrl: 'https://linkedin.com/in/ananya-deshmukh',
      cityLocation: 'Pune, Maharashtra',
      feedbackRemark: 'Evaluating 10-seat IVR setup; asked to call back after budget review.',
      source: 'Inbound Web Form',
      serviceInterest: 'Cloud Telephony (IVR) + Voice Blast',
      status: 'WARM',
      assignedToAgentId: 'usr-agent-1',
      assignedToAgentName: 'Rahul Sharma',
      uploadedBy: 'Neha Kapoor',
      callLogs: [
        {
          id: 'log-3',
          type: 'CALL',
          summary: 'Client asked to call back later after internal budget sign-off.',
          statusAfter: 'WARM',
          createdBy: 'Rahul Sharma',
          createdAt: iso(-90),
        },
      ],
      reminder: {
        id: 'rem-102',
        datetime: iso(45),
        note: 'Follow up with Ananya on 10-seat IVR pricing approval',
        notified: false,
        completed: false,
        createdAt: iso(-90),
      },
      createdAt: iso(-2880),
      updatedAt: iso(-90),
    },
    {
      id: 'lead-103',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Siddharth Rao',
      companyName: 'Zenith Logistics',
      designation: 'CTO',
      phone: '+91 97400 31902',
      email: 's.rao@zenithlog.co.in',
      linkedinUrl: 'https://linkedin.com/in/siddharth-rao-cto',
      cityLocation: 'Bengaluru, Karnataka',
      feedbackRemark: 'Immediate migration required from current vendor. Ready for onboarding.',
      source: 'Partner Referral',
      serviceInterest: 'Transactional Email + Webhook API',
      status: 'HOT',
      assignedToAgentId: 'usr-agent-2',
      assignedToAgentName: 'Priya Nair',
      uploadedBy: 'Vikram Mehta',
      callLogs: [
        {
          id: 'log-4',
          type: 'CALL',
          summary: 'Immediate migration required from current vendor. Ready for onboarding.',
          statusAfter: 'HOT',
          createdBy: 'Priya Nair',
          createdAt: iso(-240),
        },
      ],
      reminder: null,
      createdAt: iso(-3000),
      updatedAt: iso(-240),
    },
    {
      id: 'lead-104',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Meera Krishnan',
      companyName: 'EduSpark Learning',
      designation: 'Program Director',
      phone: '+91 98450 61209',
      email: 'meera@eduspark.org',
      linkedinUrl: 'https://linkedin.com/in/meera-krishnan',
      cityLocation: 'Chennai, Tamil Nadu',
      feedbackRemark: 'Hold until next quarter admission cycle.',
      source: 'Webinar',
      serviceInterest: 'WhatsApp Chatbot',
      status: 'COLD',
      assignedToAgentId: 'usr-agent-2',
      assignedToAgentName: 'Priya Nair',
      uploadedBy: 'Neha Kapoor',
      callLogs: [
        {
          id: 'log-5',
          type: 'CALL',
          summary: 'Not evaluating until next quarter; marked Cold.',
          statusAfter: 'COLD',
          createdBy: 'Priya Nair',
          createdAt: iso(-600),
        },
      ],
      reminder: null,
      createdAt: iso(-4320),
      updatedAt: iso(-600),
    },
    {
      id: 'lead-105',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Kunal Bansal',
      companyName: 'UrbanBite Foods',
      designation: 'Founder',
      phone: '+91 99104 88321',
      email: 'kunal@urbanbite.in',
      linkedinUrl: 'https://linkedin.com/in/kunal-bansal',
      cityLocation: 'Gurugram, Haryana',
      feedbackRemark: 'Fresh import for OTP & delivery alert SMS.',
      source: 'Cold CSV Import',
      serviceInterest: 'Bulk SMS + OTP Gateway',
      status: 'NEW',
      assignedToAgentId: null,
      assignedToAgentName: null,
      uploadedBy: 'Neha Kapoor',
      callLogs: [],
      reminder: null,
      createdAt: iso(-60),
      updatedAt: iso(-60),
    },
    {
      id: 'lead-106',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Divya Iyer',
      companyName: 'QuickPay Fintech',
      designation: 'Product Manager',
      phone: '+91 98862 54110',
      email: 'divya@quickpay.io',
      linkedinUrl: 'https://linkedin.com/in/divya-iyer-fintech',
      cityLocation: 'Hyderabad, Telangana',
      feedbackRemark: 'Looking for dedicated SMPP throughput.',
      source: 'Cold CSV Import',
      serviceInterest: 'Dedicated SMPP + WhatsApp API',
      status: 'NEW',
      assignedToAgentId: null,
      assignedToAgentName: null,
      uploadedBy: 'Neha Kapoor',
      callLogs: [],
      reminder: null,
      createdAt: iso(-55),
      updatedAt: iso(-55),
    },
    {
      id: 'lead-107',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Harshvardhan Singh',
      companyName: 'RoyalStay Hotels',
      designation: 'General Manager',
      phone: '+91 98290 12944',
      email: 'harsh@royalstay.in',
      linkedinUrl: 'https://linkedin.com/in/harshvardhan-royalstay',
      cityLocation: 'Jaipur, Rajasthan',
      feedbackRemark: 'Interested in booking confirmation IVR.',
      source: 'Cold CSV Import',
      serviceInterest: 'Cloud Telephony + Missed Call',
      status: 'NEW',
      assignedToAgentId: null,
      assignedToAgentName: null,
      uploadedBy: 'Vikram Mehta',
      callLogs: [],
      reminder: null,
      createdAt: iso(-50),
      updatedAt: iso(-50),
    },
    {
      id: 'lead-108',
      leadDate: now.toISOString().slice(0, 10),
      clientName: 'Pooja Chawla',
      companyName: 'Vastra Couture',
      designation: 'Creative Director',
      phone: '+91 98180 99312',
      email: 'pooja@vastracouture.in',
      linkedinUrl: 'https://linkedin.com/in/pooja-chawla',
      cityLocation: 'New Delhi',
      feedbackRemark: 'Wants WhatsApp catalog broadcast campaigns.',
      source: 'Instagram Campaign',
      serviceInterest: 'WhatsApp Marketing',
      status: 'NEW',
      assignedToAgentId: null,
      assignedToAgentName: null,
      uploadedBy: 'Vikram Mehta',
      callLogs: [],
      reminder: null,
      createdAt: iso(-45),
      updatedAt: iso(-45),
    },
  ];

  const todayDate = now.toISOString().slice(0, 10);
  const tomorrowDate = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

  const meetRequests: MeetRequest[] = [
    {
      id: 'meet-201',
      leadId: 'lead-101',
      clientName: 'Rohan Malhotra',
      companyName: 'FinEdge Capital',
      clientPhone: '+91 98201 44510',
      clientEmail: 'rohan@finedge.in',
      agentId: 'usr-agent-1',
      agentName: 'Rahul Sharma',
      scheduledDate: tomorrowDate,
      scheduledTime: '15:30',
      platform: 'Google Meet',
      agenda: 'Walkthrough of WhatsApp API template approvals & throughput limits.',
      status: 'PENDING_APPROVAL',
      createdAt: iso(-75),
      updatedAt: iso(-75),
    },
    {
      id: 'meet-202',
      leadId: 'lead-103',
      clientName: 'Siddharth Rao',
      companyName: 'Zenith Logistics',
      clientPhone: '+91 97400 31902',
      clientEmail: 's.rao@zenithlog.co.in',
      agentId: 'usr-agent-2',
      agentName: 'Priya Nair',
      scheduledDate: todayDate,
      scheduledTime: '17:00',
      platform: 'Zoom',
      agenda: 'API integration & webhook setup call with client dev team.',
      status: 'APPROVED',
      approvedBy: 'Neha Kapoor',
      approvedAt: iso(-180),
      supportNotes: 'Support engineer Karan assigned for API walkthrough.',
      createdAt: iso(-210),
      updatedAt: iso(-180),
    },
  ];

  const onboardingRequests: OnboardingRequest[] = [
    {
      id: 'onb-301',
      leadId: 'lead-103',
      companyName: 'Apex Retail Private Limited',
      username: 'apex_sms_prod',
      billingEntity: 'Apex Retail Pvt Ltd (GST: 27AABCA1234F1Z5)',
      services: ['Bulk SMS (DLT)', 'WhatsApp Business API'],
      unitPrice: '₹0.14 / SMS | ₹0.72 / WhatsApp Conv.',
      totalDealAmount: 50000,
      billingType: 'PREPAID',
      agentId: 'usr-agent-1',
      agentName: 'Rahul Sharma',
      status: 'ACCOUNT_CREATED',
      approvedBy: 'Neha Kapoor',
      approvedAt: iso(-4320),
      supportAccountNote: 'Provisioned account apex_sms_prod with SMPP + WABA webhook.',
      supportCreatedBy: 'Karan Joshi',
      supportCreatedAt: iso(-4000),
      createdAt: iso(-4500),
      updatedAt: iso(-4000),
    },
    {
      id: 'onb-302',
      companyName: 'Zenith Logistics Tech',
      username: 'zenith_api_live',
      billingEntity: 'Zenith Logistics LLP (GST: 29AAACZ9012K1Z1)',
      services: ['Transactional Email', 'Webhook API'],
      unitPrice: '₹0.05 / Email',
      totalDealAmount: 35000,
      billingType: 'PREPAID',
      agentId: 'usr-agent-2',
      agentName: 'Priya Nair',
      status: 'APPROVED_FOR_SUPPORT',
      approvedBy: 'Vikram Mehta',
      approvedAt: iso(-60),
      createdAt: iso(-120),
      updatedAt: iso(-60),
    },
    {
      id: 'onb-303',
      companyName: 'Nova Health Systems',
      username: 'nova_health_ivr',
      billingEntity: 'Nova Health Systems Pvt Ltd (GST: 07AABCN4451H1Z9)',
      services: ['Cloud Telephony (IVR)', 'Missed Call Alert'],
      unitPrice: '₹1,200 / Agent Seat / Mo',
      totalDealAmount: 72000,
      billingType: 'MONTHLY',
      agentId: 'usr-agent-1',
      agentName: 'Rahul Sharma',
      status: 'PENDING_APPROVAL',
      createdAt: iso(-35),
      updatedAt: iso(-35),
    },
  ];

  const rechargeRequests: RechargeRequest[] = [
    {
      id: 'rec-401',
      onboardingId: 'onb-301',
      companyName: 'Apex Retail Private Limited',
      username: 'apex_sms_prod',
      service: 'Bulk SMS (DLT) + WhatsApp Credits',
      amount: 25000,
      unitRate: '₹0.14 / SMS',
      agentId: 'usr-agent-1',
      agentName: 'Rahul Sharma',
      screenshotDataUrl: SAMPLE_SCREENSHOT_SVG,
      screenshotName: 'apex-neft-receipt-25k.svg',
      agentNotes: 'Client transferred ₹25,000 via HDFC NEFT for monthly campaign recharge.',
      status: 'BILLED',
      approvedBy: 'Neha Kapoor',
      approvedAt: iso(-2800),
      supportConfirmedBy: 'Karan Joshi',
      supportRechargeNote: 'Added 1,50,000 SMS credits + ₹4,000 WABA wallet balance.',
      supportCompletedAt: iso(-2700),
      billingInvoiceNumber: 'INV-2026-0841',
      billingTaxInvoiceDataUrl: SAMPLE_TAX_INVOICE_SVG,
      billingTaxInvoiceName: 'INV-2026-0841-Apex-Retail.svg',
      billingPaymentStatus: 'PAID',
      billingPaymentNote: 'NEFT UTR HDFC000492817364 reconciled in bank statement.',
      billingCompletedBy: 'Sneha Kulkarni',
      billingCompletedAt: iso(-2500),
      createdAt: iso(-2900),
      updatedAt: iso(-2500),
    },
    {
      id: 'rec-402',
      onboardingId: 'onb-301',
      companyName: 'Apex Retail Private Limited',
      username: 'apex_sms_prod',
      service: 'WhatsApp Business API Top-up',
      amount: 15000,
      unitRate: '₹0.72 / WhatsApp Conv.',
      agentId: 'usr-agent-1',
      agentName: 'Rahul Sharma',
      screenshotDataUrl: SAMPLE_SCREENSHOT_SVG,
      screenshotName: 'apex-waba-topup-15k.svg',
      agentNotes: 'Urgent Diwali campaign wallet top-up requested by client.',
      status: 'RECHARGE_COMPLETED',
      approvedBy: 'Neha Kapoor',
      approvedAt: iso(-200),
      supportConfirmedBy: 'Karan Joshi',
      supportRechargeNote: 'Credited ₹15,000 in WABA wallet (Txn #WABA-8831). Ready for invoice.',
      supportCompletedAt: iso(-140),
      createdAt: iso(-260),
      updatedAt: iso(-140),
    },
    {
      id: 'rec-403',
      onboardingId: 'onb-302',
      companyName: 'Zenith Logistics Tech',
      username: 'zenith_api_live',
      service: 'Transactional Email Pack',
      amount: 10000,
      unitRate: '₹0.05 / Email',
      agentId: 'usr-agent-2',
      agentName: 'Priya Nair',
      screenshotDataUrl: SAMPLE_SCREENSHOT_SVG,
      screenshotName: 'zenith-upi-10k.svg',
      agentNotes: 'Initial credit top-up screenshot attached.',
      status: 'PENDING_APPROVAL',
      createdAt: iso(-25),
      updatedAt: iso(-25),
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'SUPPORT'],
      title: 'New Meet Request Scheduled',
      message: `Rahul Sharma requested a Google Meet with Rohan Malhotra (FinEdge Capital) for ${tomorrowDate} at 15:30.`,
      type: 'MEET',
      relatedId: 'meet-201',
      createdAt: iso(-75),
      readBy: [],
    },
    {
      id: 'notif-2',
      targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
      title: 'New Client Onboarding Submitted',
      message: 'Rahul Sharma submitted onboarding for Nova Health Systems (nova_health_ivr). Approval pending.',
      type: 'ONBOARDING',
      relatedId: 'onb-303',
      createdAt: iso(-35),
      readBy: [],
    },
    {
      id: 'notif-3',
      targetRoles: ['SUPPORT'],
      title: 'Account Creation Approved',
      message: 'Create account "zenith_api_live" for Agent Priya Nair (Services: Transactional Email, Webhook API).',
      type: 'ONBOARDING',
      relatedId: 'onb-302',
      createdAt: iso(-60),
      readBy: [],
    },
    {
      id: 'notif-4',
      targetRoles: ['BILLING'],
      title: 'Recharge Ready for Billing',
      message: 'Karan Joshi completed recharge for apex_sms_prod (₹15,000). Raise Tax Invoice & update payment.',
      type: 'BILLING',
      relatedId: 'rec-402',
      createdAt: iso(-140),
      readBy: [],
    },
    {
      id: 'notif-5',
      targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
      title: 'New Recharge Request Pending',
      message: 'Priya Nair raised a ₹10,000 recharge request for zenith_api_live with screenshot proof.',
      type: 'RECHARGE',
      relatedId: 'rec-403',
      createdAt: iso(-25),
      readBy: [],
    },
  ];

  return {
    teams,
    users: users.map((u) => ({
      ...u,
      password: u.password || '123456',
      isActive: u.isActive !== false,
      teamId: u.role === 'ADMIN' ? undefined : u.teamId || 'team-a',
      managerId:
        u.role === 'AGENT' || u.role === 'SUPPORT' || u.role === 'BILLING'
          ? u.managerId || 'usr-am-1'
          : undefined,
    })),
    leads,
    meetRequests,
    onboardingRequests,
    rechargeRequests,
    activityLogs: [],
    notifications,
  };
}

// In-memory cache to avoid redundant 2.6MB disk reads & JSON.parse on every poll!
let cachedDb: CrmDatabase | null = null;
let cachedMtimeMs = 0;

export function readDatabase(): CrmDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    cachedDb = seed;
    cachedMtimeMs = fs.statSync(DB_PATH).mtimeMs;
    return seed;
  }
  const stat = fs.statSync(DB_PATH);
  if (cachedDb && stat.mtimeMs === cachedMtimeMs) {
    return cachedDb;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as CrmDatabase;
  if (!parsed.teams || parsed.teams.length === 0) {
    parsed.teams = [
      {
        id: 'team-a',
        name: 'Team A (Core Sales & Ops)',
        description: 'Default Team A led by Neha Kapoor (AM)',
        createdAt: new Date().toISOString(),
      },
    ];
  }
  parsed.users = parsed.users.map((u) => ({
    ...u,
    password: u.password || '123456',
    isActive: u.isActive !== false,
    teamId: u.role === 'ADMIN' ? undefined : u.teamId || 'team-a',
    managerId:
      u.role === 'AGENT' || u.role === 'SUPPORT' || u.role === 'BILLING'
        ? u.managerId || 'usr-am-1'
        : undefined,
  }));
  cachedDb = parsed;
  cachedMtimeMs = stat.mtimeMs;
  return cachedDb;
}

export function writeDatabase(db: CrmDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  cachedDb = db;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  try {
    cachedMtimeMs = fs.statSync(DB_PATH).mtimeMs;
  } catch {
    cachedMtimeMs = Date.now();
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const LEGACY_SEED_USER_IDS = new Set([
  'usr-am-1',
  'usr-agent-1',
  'usr-agent-2',
  'usr-agent-3',
  'usr-support-1',
  'usr-billing-1',
]);

export async function readDatabaseAsync(): Promise<CrmDatabase> {
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/crm_state?id=eq.main&select=data`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as Array<{ data: CrmDatabase }>;
        if (rows.length > 0 && rows[0].data) {
          const data = rows[0].data;
          data.users = (data.users || []).filter((u) => !LEGACY_SEED_USER_IDS.has(u.id));
          cachedDb = data;
          return data;
        }
        // Seed initial database into Supabase if table is empty
        const seed = createSeedDatabase();
        await writeDatabaseAsync(seed);
        return seed;
      }
    } catch (err) {
      console.error('Supabase read fallback to local:', err);
    }
  }
  const local = readDatabase();
  local.users = (local.users || []).filter((u) => !LEGACY_SEED_USER_IDS.has(u.id));
  return local;
}

export async function writeDatabaseAsync(db: CrmDatabase): Promise<void> {
  cachedDb = db;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/crm_state`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: 'main',
          data: db,
          updated_at: new Date().toISOString(),
        }),
      });
      return;
    } catch (err) {
      console.error('Supabase write fallback to local:', err);
    }
  }
  writeDatabase(db);
}

export function sanitizeForRole(
  db: CrmDatabase,
  role: Role,
  userId?: string
): CrmDatabase {
  const actor = userId ? db.users.find((u) => u.id === userId) : undefined;
  const userTeamId = actor?.teamId;

  const getUserTeam = (uid?: string | null) => {
    if (!uid) return 'team-a';
    return db.users.find((u) => u.id === uid)?.teamId || 'team-a';
  };

  const belongsToMyTeam = (recordTeamId?: string | null, ownerUserId?: string | null) => {
    if (role === 'ADMIN' || !userTeamId) return true;
    const recTeam = recordTeamId || (ownerUserId ? getUserTeam(ownerUserId) : 'team-a');
    return recTeam === userTeamId;
  };

  // Never send user passwords to client
  const safeUsers: User[] = db.users.map((u) => {
    const copy = { ...u };
    delete copy.password;
    return copy;
  });

  const teamVisibleUsers =
    role === 'ADMIN' || !userTeamId
      ? safeUsers
      : safeUsers.filter((u) => u.role === 'ADMIN' || u.teamId === userTeamId);

  const filterNotifications = (items: NotificationItem[]) =>
    items.filter(
      (n) =>
        n.targetRoles.includes(role) &&
        (!n.targetUserIds || !userId || n.targetUserIds.includes(userId)) &&
        (role === 'ADMIN' || !userTeamId || !n.teamId || n.teamId === userTeamId)
    );

  const enrichOnboardingContact = (list: OnboardingRequest[]) =>
    list.map((o) => {
      if (o.clientPhone && o.clientEmail) return o;
      const matchedLead =
        (o.leadId ? db.leads.find((l) => l.id === o.leadId) : undefined) ||
        db.leads.find((l) => l.companyName.toLowerCase() === o.companyName.toLowerCase()) ||
        o.leadData;
      return {
        ...o,
        clientName: o.clientName || matchedLead?.clientName || o.companyName,
        clientPhone: o.clientPhone || matchedLead?.phone || '+91 98201 44500',
        clientEmail:
          o.clientEmail ||
          matchedLead?.email ||
          `accounts@${o.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      };
    });

  const enrichRechargeContact = (list: RechargeRequest[], onbList: OnboardingRequest[]) =>
    list.map((r) => {
      if (r.clientPhone && r.clientEmail) return r;
      const onb = onbList.find((o) => o.id === r.onboardingId);
      const matchedLead = db.leads.find(
        (l) => l.companyName.toLowerCase() === r.companyName.toLowerCase()
      );
      return {
        ...r,
        clientName: r.clientName || onb?.clientName || matchedLead?.clientName || r.companyName,
        clientPhone: r.clientPhone || onb?.clientPhone || matchedLead?.phone || '+91 98201 44500',
        clientEmail:
          r.clientEmail ||
          onb?.clientEmail ||
          matchedLead?.email ||
          `accounts@${r.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      };
    });

  if (role === 'ADMIN') {
    const onb = enrichOnboardingContact(db.onboardingRequests);
    return {
      ...db,
      users: db.users.map((u) => ({ ...u, password: u.password || '123456' })),
      onboardingRequests: onb,
      rechargeRequests: enrichRechargeContact(db.rechargeRequests, onb),
      supportTickets: db.supportTickets || [],
      activityLogs: db.activityLogs || [],
      notifications: filterNotifications(db.notifications),
    };
  }

  if (role === 'ACCOUNT_MANAGER') {
    const teamLeads = db.leads.filter((l) =>
      belongsToMyTeam(l.teamId, l.assignedToAgentId)
    );
    const teamOnb = enrichOnboardingContact(
      db.onboardingRequests.filter((o) => belongsToMyTeam(o.teamId, o.agentId))
    );
    const teamRecharges = enrichRechargeContact(
      db.rechargeRequests.filter((r) => belongsToMyTeam(r.teamId, r.agentId)),
      teamOnb
    );
    return {
      ...db,
      users: teamVisibleUsers,
      leads: teamLeads,
      meetRequests: db.meetRequests.filter((m) =>
        belongsToMyTeam(m.teamId, m.agentId)
      ),
      onboardingRequests: teamOnb,
      rechargeRequests: teamRecharges,
      supportTickets: (db.supportTickets || []).filter((t) =>
        belongsToMyTeam(t.teamId, t.agentId || t.fromUserId)
      ),
      activityLogs: (db.activityLogs || []).filter((l) =>
        belongsToMyTeam(undefined, l.actorId)
      ),
      notifications: filterNotifications(db.notifications),
    };
  }

  if (role === 'AGENT') {
    const onb = enrichOnboardingContact(
      db.onboardingRequests.filter((o) => o.agentId === userId)
    );
    return {
      teams: db.teams,
      users: teamVisibleUsers,
      leads: db.leads.filter((l) => l.assignedToAgentId === userId),
      meetRequests: db.meetRequests.filter((m) => m.agentId === userId),
      onboardingRequests: onb,
      rechargeRequests: enrichRechargeContact(
        db.rechargeRequests.filter((r) => r.agentId === userId),
        onb
      ),
      supportTickets: (db.supportTickets || []).filter(
        (t) =>
          t.agentId === userId ||
          t.fromUserId === userId ||
          t.targetUserId === userId ||
          (t.targetRole === 'AGENT' &&
            belongsToMyTeam(t.teamId, t.fromUserId) &&
            (!t.targetUserId || t.targetUserId === userId))
      ),
      notifications: filterNotifications(db.notifications),
    };
  }

  if (role === 'SUPPORT') {
    // STRICT ROLE-BASED DATA MASKING FOR SUPPORT:
    // Support ONLY receives Agent Name, Account Username, Services, and Unit/Service Rate.
    // Total Deal Amount, Billing Entity, and Billing Type are strictly stripped.
    const maskedOnboarding: OnboardingRequest[] = db.onboardingRequests
      .filter(
        (o) =>
          (o.status === 'APPROVED_FOR_SUPPORT' || o.status === 'ACCOUNT_CREATED') &&
          belongsToMyTeam(o.teamId, o.agentId)
      )
      .map((o) => {
        const copy = { ...o };
        delete copy.totalDealAmount;
        delete copy.billingEntity;
        delete copy.billingType;
        delete copy.paymentType;
        delete copy.taxType;
        delete copy.gstNumber;
        delete copy.postpaidCycle;
        // Support only receives WhatsApp & OBD panel configuration rates:
        // Do not leak overall deal rate string or other service rates.
        delete copy.unitPrice;
        delete copy.serviceItems;
        return copy;
      });

    // Billing tax invoice, billing entity, GST, & commercial payment details are strictly masked from Support.
    // Support ONLY receives: Username, Services, Agent Name, Account Manager Name, and Recharge Count.
    const sanitizedRecharges: RechargeRequest[] = db.rechargeRequests
      .filter(
        (r) =>
          (r.status === 'APPROVED_FOR_SUPPORT' ||
            r.status === 'RECHARGE_COMPLETED' ||
            r.status === 'BILLED') &&
          belongsToMyTeam(r.teamId, r.agentId)
      )
      .map((r) => {
        const copy = { ...r };
        delete copy.billingEntity;
        delete copy.gstNumber;
        delete copy.clientName;
        delete copy.clientPhone;
        delete copy.clientEmail;
        delete copy.billingInvoiceNumber;
        delete copy.billingTaxInvoiceDataUrl;
        delete copy.billingTaxInvoiceName;
        delete copy.billingPaymentStatus;
        delete copy.paidAmount;
        delete copy.balanceAmount;
        delete copy.paymentUpdatedAt;
        delete copy.paymentUpdatedBy;
        delete copy.paymentProofDataUrl;
        delete copy.paymentProofName;
        delete copy.paymentCallbackReminder;
        delete copy.billingPaymentNote;
        delete copy.billingCompletedBy;
        delete copy.billingCompletedAt;
        return copy;
      });

    return {
      teams: db.teams,
      users: teamVisibleUsers,
      leads: [],
      meetRequests: db.meetRequests.filter((m) => m.status !== 'REJECTED'),
      onboardingRequests: maskedOnboarding,
      rechargeRequests: sanitizedRecharges,
      supportTickets: (db.supportTickets || []).filter((t) =>
        belongsToMyTeam(t.teamId, t.agentId || t.fromUserId)
      ),
      notifications: filterNotifications(db.notifications),
    };
  }

  // BILLING role: sees team onboarding records with commercial & client contact details + team recharge entries (except DEMO) + team tickets
  const enrichedOnboarding = enrichOnboardingContact(
    db.onboardingRequests.filter((o) => belongsToMyTeam(o.teamId, o.agentId))
  );

  const enrichedRecharges = enrichRechargeContact(
    db.rechargeRequests.filter(
      (r) => r.paymentMode !== 'DEMO' && belongsToMyTeam(r.teamId, r.agentId)
    ),
    enrichedOnboarding
  );

  return {
    teams: db.teams,
    users: teamVisibleUsers,
    leads: db.leads.filter((l) => belongsToMyTeam(l.teamId, l.assignedToAgentId)),
    meetRequests: [],
    onboardingRequests: enrichedOnboarding,
    rechargeRequests: enrichedRecharges,
    supportTickets: (db.supportTickets || []).filter((t) =>
      belongsToMyTeam(t.teamId, t.agentId || t.fromUserId)
    ),
    notifications: filterNotifications(db.notifications),
  };
}
