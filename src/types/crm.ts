export type Role = 'ADMIN' | 'ACCOUNT_MANAGER' | 'AGENT' | 'SUPPORT' | 'BILLING';

export type LeadStatus = 'NEW' | 'HOT' | 'WARM' | 'COLD' | 'LOST' | 'ONBOARDED';

export type CallConnectStatus = 'RINGING' | 'CONNECTED' | 'NOT_CONNECTED';

export interface ServicePriceItem {
  service: string;
  rate: number;
  count: number;
  amount: number;
  setupCharges?: number;
  monthlyCharges?: number;
  bullets?: string[];
}

export interface LeadQuotation {
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  clientName: string;
  companyName: string;
  phone: string;
  email: string;
  items: ServicePriceItem[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  channel: string;
  termsNotes: string;
  managerName?: string;
  managerDesignation?: string;
  managerPhone?: string;
  managerEmail?: string;
  updatedAt: string;
}

export interface UserMailConfig {
  email: string;
  password?: string;
  smtpHost?: string;
  smtpPort?: number;
  imapHost?: string;
  imapPort?: number;
  signature?: string;
  signatureHtml?: string;
  phone?: string;
  designation?: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  teamId?: string;
  managerId?: string;
  isActive?: boolean;
  avatar: string;
  department: string;
  phone?: string;
  designation?: string;
  mailSignature?: string;
  mailSignatureHtml?: string;
  mailConfig?: UserMailConfig;
}

export interface ActivityLog {
  id: string;
  type: 'CALL' | 'EMAIL' | 'NOTE' | 'STATUS_CHANGE';
  summary: string;
  callConnectStatus?: CallConnectStatus;
  servicesSelected?: string[];
  serviceItems?: ServicePriceItem[];
  quotationSent?: boolean;
  quotationChannel?: string;
  quotationAmount?: number;
  quotationSentDate?: string;
  quotationScreenshotDataUrl?: string;
  quotationScreenshotName?: string;
  agentCallDate?: string;
  meetDate?: string;
  billingDate?: string;
  paymentDate?: string;
  rechargeDate?: string;
  statusAfter?: LeadStatus;
  createdBy: string;
  creatorRole?: Role;
  createdAt: string;
}

export type ReminderType =
  | 'CLIENT_CALL'
  | 'QUOTATION_FOLLOWUP'
  | 'GMEET_DEMO'
  | 'SITE_VISIT'
  | 'AGENT_AM_MEET'
  | 'BILLING_RAISE'
  | 'PAYMENT_FOLLOWUP'
  | 'ONBOARDING_SETUP'
  | 'SUPPORT_CALL';

export interface LeadReminder {
  id: string;
  datetime: string; // ISO string
  note: string;
  reminderType?: ReminderType;
  targetRole?: Role;
  notified: boolean;
  completed: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  teamId?: string;
  leadDate?: string; // YYYY-MM-DD
  clientName: string;
  companyName: string;
  designation?: string;
  phone: string;
  email: string;
  linkedinUrl?: string;
  cityLocation?: string;
  feedbackRemark?: string;
  source: string;
  serviceInterest: string;
  status: LeadStatus;
  callConnectStatus?: CallConnectStatus;
  selectedServices?: string[];
  serviceItems?: ServicePriceItem[];
  quotation?: LeadQuotation | null;
  quotationHistory?: LeadQuotation[];
  quotationSent?: boolean;
  quotationChannel?: string;
  quotationAmount?: number;
  quotationSentDate?: string;
  quotationScreenshotDataUrl?: string;
  quotationScreenshotName?: string;
  agentCallDate?: string;
  meetDate?: string;
  billingDate?: string;
  paymentDate?: string;
  rechargeDate?: string;
  assignedToAgentId: string | null;
  assignedToAgentName: string | null;
  uploadedBy: string;
  callLogs: ActivityLog[];
  reminder?: LeadReminder | null;
  createdAt: string;
  updatedAt: string;
}

export type MeetStatus =
  | 'PENDING_APPROVAL'
  | 'RESCHEDULE_PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export interface MeetRequest {
  id: string;
  teamId?: string;
  leadId: string;
  clientName: string;
  companyName: string;
  clientPhone?: string;
  clientEmail?: string;
  agentId: string;
  agentName: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  proposedDate?: string; // Support suggested alternative date
  proposedTime?: string; // Support suggested alternative time
  rescheduleReason?: string;
  platform: string;
  meetLink?: string; // For Google Meet, Zoom, MS Teams
  anydeskAddress?: string; // For AnyDesk remote access
  ultraviewerId?: string; // For UltraViewer ID
  ultraviewerPassword?: string; // For UltraViewer Password
  agenda: string;
  status: MeetStatus;
  approvedBy?: string;
  approvedAt?: string;
  supportNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type OnboardingStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED_FOR_SUPPORT'
  | 'ACCOUNT_CREATED'
  | 'REJECTED';

export interface ServicePortalCredential {
  serviceKey: 'SMS_RCS' | 'WHATSAPP' | 'IVR' | 'OBD' | 'EMAIL';
  serviceName: string;
  portalUrl: string;
  username: string;
  password?: string;
  configuredAt?: string;
  configuredBy?: string;
  supportNote?: string;
}

export type BillingType = 'PREPAID' | 'POSTPAID' | 'MONTHLY';
export type TaxType = 'GST' | 'NON_GST';
export type PostpaidCycle = '10_DAYS' | '15_DAYS' | '20_DAYS' | '25_DAYS' | '30_DAYS' | '45_DAYS';

export interface OnboardingRequest {
  id: string;
  teamId?: string;
  leadId?: string;
  leadData?: Lead; // Full snapshot of the converted lead with all history logs
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  companyName: string;
  username: string; // Panel login username for SMS, RCS, WhatsApp
  billingEntity?: string; // Entity name for raising bill
  gstNumber?: string; // GST Number
  gstPdfName?: string; // Optional GST Certificate PDF filename
  gstPdfDataUrl?: string; // Lightweight base64 PDF
  panCardName?: string; // Company / Director PAN Card PDF/Image
  panCardDataUrl?: string;
  msmeDocName?: string; // Udyam / MSME Certificate PDF/Image
  msmeDocDataUrl?: string;
  brandLogoName?: string; // Brand Logo (PNG/JPEG)
  brandLogoDataUrl?: string;
  brandBannerName?: string; // Brand Banner / Header Image
  brandBannerDataUrl?: string;
  otherDocName?: string; // Agreement / PO / Cheque
  otherDocDataUrl?: string;
  taxType?: TaxType; // GST or Non-GST
  paymentType?: BillingType; // PREPAID or POSTPAID
  postpaidCycle?: PostpaidCycle; // 10 days, 15 days, 20 days, 25 days, 30 days, 45 days
  services: string[];
  serviceItems?: ServicePriceItem[];
  quotation?: LeadQuotation | null;
  quotationHistory?: LeadQuotation[];
  whatsappMarketingRate?: number; // Rate for WhatsApp Marketing (per msg)
  whatsappUtilityRate?: number;   // Rate for WhatsApp Utility (per msg)
  obdRate?: number;               // Rate for OBD / Voice (per call/pulse)
  unitPrice?: string;
  totalDealAmount?: number;
  billingType?: BillingType;
  agentId: string;
  agentName: string;
  accountManagerName?: string;
  status: OnboardingStatus;
  approvedBy?: string;
  approvedAt?: string;
  supportAccountNote?: string;
  supportCreatedBy?: string;
  supportCreatedAt?: string;
  panelUrl?: string;            // Portal / Panel Login URL (e.g. https://portal.immenseair.in)
  panelPassword?: string;       // Generated Panel Password
  credentialsSentDate?: string; // Date/Time when email was sent to Agent, AM, Admin
  portalCredentials?: ServicePortalCredential[]; // Distinct credentials per service portal
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type RechargePaymentMode = 'PREPAID' | 'POSTPAID' | 'NON_GST' | 'DEMO';

export type RechargeStatus =
  | 'PENDING_APPROVAL'      // Sent to Billing for Tally Bill creation (or Legacy)
  | 'APPROVED_FOR_SUPPORT'  // Tally Bill created by Billing (or Demo direct) -> Pending Support Panel Recharge
  | 'RECHARGE_COMPLETED'    // Support Panel Recharged with Proof
  | 'BILLED'                // Complete / Done
  | 'REJECTED';

export type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL';

export interface RechargeLogItem {
  id: string;
  actorName: string;
  actorRole: Role;
  action: string;
  note: string;
  createdAt: string;
}

export interface PaymentCallbackReminder {
  datetime: string;        // ISO date/time when Accounts should call the client
  note: string;            // Client response / promise to pay remark
  scheduledBy: string;     // Accounts user name
  completed?: boolean;
  notified?: boolean;
}

export interface RechargeRequest {
  id: string;
  teamId?: string;
  onboardingId: string;
  companyName: string;
  username: string;
  clientName?: string;     // Contact person name for Accounts payment follow-up
  clientPhone?: string;    // Contact phone number for Accounts payment follow-up
  clientEmail?: string;    // Contact email ID for Accounts payment follow-up
  service: string;
  isExternalCampaign?: boolean; // True when raised as an External Managed Campaign (SMS/RCS/WhatsApp) -> goes DIRECT to Support first, then Billing!
  campaignTitle?: string;       // Campaign Name / Template / Audience summary
  creditCount?: number;       // Number of SMS/WhatsApp/RCS credits requested
  amount: number;             // Total INR value
  unitRate: string;
  paymentMode?: RechargePaymentMode; // PREPAID, POSTPAID, NON_GST, DEMO
  billingEntity?: string;     // Billing Entity Name (omitted for DEMO)
  gstNumber?: string;         // 15-digit GST Number (omitted for DEMO / NON_GST)
  agentId: string;
  agentName: string;
  accountManagerName?: string;
  screenshotDataUrl: string;  // Client message / payment screenshot attached by Agent
  screenshotName: string;
  agentNotes: string;
  status: RechargeStatus;
  approvedBy?: string;
  approvedAt?: string;
  supportConfirmedBy?: string;
  supportRechargeNote?: string;
  supportScreenshotDataUrl?: string; // Panel Recharge / Campaign LIVE Proof attached by Support
  supportScreenshotName?: string;
  supportCompletedAt?: string;
  billingInvoiceNumber?: string;     // Tally Bill / Tax Invoice Number
  billingTaxInvoiceDataUrl?: string; // Tally Bill PDF/Screenshot
  billingTaxInvoiceName?: string;
  billingPaymentStatus?: PaymentStatus;
  paidAmount?: number;               // Amount received so far (for PAID / PARTIAL / PENDING)
  balanceAmount?: number;            // Remaining balance due (amount - paidAmount)
  paymentUpdatedAt?: string;         // Last time Accounts/Billing updated payment collection
  paymentUpdatedBy?: string;         // Name of Accounts team member who updated payment
  paymentProofDataUrl?: string;      // Payment UTR / Bank Screenshot uploaded by Accounts team
  paymentProofName?: string;
  paymentCallbackReminder?: PaymentCallbackReminder; // Scheduled callback date/time when client promises to pay
  billingPaymentNote?: string;
  billingCompletedBy?: string;
  billingCompletedAt?: string;
  billingFollowUpCount?: number;     // How many times Billing sent reminder / follow-up
  lastBillingReminderAt?: string;
  activityLogs?: RechargeLogItem[];  // Step-by-step audit trail visible to Agent, AM, Admin, Billing
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'LEAD'
  | 'REMINDER'
  | 'MEET'
  | 'ONBOARDING'
  | 'RECHARGE'
  | 'BILLING'
  | 'SUPPORT_TICKET';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  screenshotDataUrl?: string;
  screenshotName?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  teamId?: string;
  onboardingId?: string; // Optional if general query or lead query
  leadId?: string;       // Linked lead if applicable
  username: string;      // The primary identifier for Support / Client (@username or "N/A - General")
  companyName: string;
  fromUserId: string;
  fromUserName: string;
  fromUserRole: Role;
  targetRole: Role;      // SUPPORT, BILLING, AGENT, ACCOUNT_MANAGER, ADMIN
  targetUserId?: string; // Optional specific assignee
  targetUserName?: string;
  agentId?: string;
  agentName?: string;
  accountManagerName?: string;
  serviceCategory: string; // SMS, RCS, WhatsApp, IVR, OBD, Billing & Tax, Commercial Rate, Account Setup, General
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
  screenshotDataUrl?: string; // Captured / Pasted Screenshot for visual context
  screenshotName?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  messages?: TicketMessage[]; // Multi-party conversation thread
  supportResolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  targetRoles: Role[];
  targetUserIds?: string[];
  teamId?: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  createdAt: string;
  readBy: string[];
}

export interface PersonalReminder {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  teamId?: string;
  title: string;
  note?: string;
  datetime: string;
  completed: boolean;
  createdAt: string;
}

export interface CrmDatabase {
  teams?: Team[];
  users: User[];
  leads: Lead[];
  meetRequests: MeetRequest[];
  onboardingRequests: OnboardingRequest[];
  rechargeRequests: RechargeRequest[];
  supportTickets?: SupportTicket[];
  personalReminders?: PersonalReminder[];
  notifications: NotificationItem[];
}
