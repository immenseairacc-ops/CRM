import { getEmailTransporter } from '@/lib/mailer';
import { NextRequest, NextResponse } from 'next/server';
import {
  createSeedDatabase,
  readDatabaseAsync,
  sanitizeForRole,
  writeDatabaseAsync,
} from '@/lib/db';
import {
  BillingType,
  Lead,
  LeadQuotation,
  LeadStatus,
  NotificationItem,
  PaymentStatus,
  Role,
  ServicePriceItem,
} from '@/types/crm';

const VALID_ROLES: Role[] = [
  'ADMIN',
  'ACCOUNT_MANAGER',
  'AGENT',
  'SUPPORT',
  'BILLING',
];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function pushNotification(
  list: NotificationItem[],
  item: Omit<NotificationItem, 'id' | 'createdAt' | 'readBy'>
): void {
  list.unshift({
    ...item,
    id: makeId('notif'),
    createdAt: new Date().toISOString(),
    readBy: [],
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleParam = (searchParams.get('role') || 'ADMIN').toUpperCase() as Role;
    const role: Role = VALID_ROLES.includes(roleParam) ? roleParam : 'ADMIN';
    const userId = searchParams.get('userId') || undefined;

    const db = await readDatabaseAsync();
    const sanitized = sanitizeForRole(db, role, userId);

    return NextResponse.json({ ok: true, data: sanitized });
  } catch (error) {
    console.error('GET /api/crm error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load CRM database' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, actorId, role: requestedRole, payload = {} } = body as {
      action: string;
      actorId?: string;
      role?: Role;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload?: Record<string, any>;
    };

    const db = await readDatabaseAsync();

    if (action === 'LOGIN') {
      const emailInput = String(payload.email || '').trim().toLowerCase();
      const passInput = String(payload.password || '');
      const found = db.users.find((u) => u.email.toLowerCase() === emailInput);
      if (!found) {
        return NextResponse.json(
          { ok: false, error: 'No account found with this email.' },
          { status: 401 }
        );
      }
      if (found.isActive === false) {
        return NextResponse.json(
          { ok: false, error: 'Your account is deactivated. Please contact Admin.' },
          { status: 403 }
        );
      }
      if ((found.password || '123456') !== passInput) {
        return NextResponse.json(
          { ok: false, error: 'Incorrect password. Please try again.' },
          { status: 401 }
        );
      }
      const safeUser = { ...found };
      delete safeUser.password;
      return NextResponse.json({
        ok: true,
        user: safeUser,
        data: sanitizeForRole(db, found.role, found.id),
      });
    }

    const actor =
      db.users.find((u) => u.id === actorId) ||
      db.users.find((u) => u.role === (requestedRole || 'ADMIN')) ||
      db.users[0];
    const actorRole: Role = actor.role;
    const now = new Date().toISOString();

    switch (action) {
      case 'UPLOAD_LEADS': {
        if (
          actorRole !== 'ADMIN' &&
          actorRole !== 'ACCOUNT_MANAGER' &&
          actorRole !== 'AGENT'
        ) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Only Admin, Account Manager, or Agent can upload leads.',
            },
            { status: 403 }
          );
        }
        const rawLeads = Array.isArray(payload.leads) ? payload.leads : [];
        if (rawLeads.length === 0) {
          return NextResponse.json(
            { ok: false, error: 'No leads provided to upload.' },
            { status: 400 }
          );
        }

        const isAgentSelfUpload = actorRole === 'AGENT';
        const uploadSourceLabel = String(
          payload.uploadSourceLabel || 'CSV / Manual Upload'
        );

        const createdLeads: Lead[] = rawLeads.map((item) => {
          const feedbackRemark = String(item.feedbackRemark || '').trim();
          const initialLogs = [];
          if (feedbackRemark) {
            initialLogs.push({
              id: makeId('log'),
              type: 'NOTE' as const,
              summary: `Initial Feedback / Remark: ${feedbackRemark}`,
              createdBy: actor.name,
            creatorRole: actorRole,
              createdAt: now,
            });
          } else if (isAgentSelfUpload) {
            initialLogs.push({
              id: makeId('log'),
              type: 'NOTE' as const,
              summary: `Self-uploaded by Agent ${actor.name} via ${uploadSourceLabel}.`,
              createdBy: actor.name,
            creatorRole: actorRole,
              createdAt: now,
            });
          }

          return {
            id: makeId('lead'),
            teamId: actor.teamId || 'team-a',
            leadDate: String(item.leadDate || now.slice(0, 10)).trim(),
            clientName: String(item.clientName || 'Unnamed Client').trim(),
            companyName: String(item.companyName || 'Independent').trim(),
            designation: String(item.designation || '').trim(),
            phone: String(item.phone || '').trim(),
            email: String(item.email || '').trim(),
            linkedinUrl: String(item.linkedinUrl || '').trim(),
            cityLocation: String(item.cityLocation || '').trim(),
            feedbackRemark,
            source: String(item.source || 'Agent / CSV Upload').trim(),
            serviceInterest: String(
              item.serviceInterest || 'Bulk SMS / WhatsApp API'
            ).trim(),
            status: 'NEW',
            assignedToAgentId: isAgentSelfUpload ? actor.id : null,
            assignedToAgentName: isAgentSelfUpload ? actor.name : null,
            uploadedBy: actor.name,
            callLogs: initialLogs,
            reminder: null,
            createdAt: now,
            updatedAt: now,
          };
        });

        db.leads.unshift(...createdLeads);
        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title: isAgentSelfUpload
            ? `${createdLeads.length} Agent Lead(s) Uploaded`
            : `${createdLeads.length} New Lead(s) Uploaded`,
          message: isAgentSelfUpload
            ? `Agent ${actor.name} uploaded ${createdLeads.length} self-sourced lead(s) into their pipeline.`
            : `${actor.name} uploaded ${createdLeads.length} lead(s) ready for distribution.`,
          type: 'LEAD',
        });
        break;
      }

      case 'DISTRIBUTE_LEADS': {
        if (actorRole !== 'ADMIN' && actorRole !== 'ACCOUNT_MANAGER') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin or Account Manager can distribute leads.' },
            { status: 403 }
          );
        }

        const mode = payload.mode === 'PERCENTAGE' ? 'PERCENTAGE' : 'COUNT';
        const allocations: Array<{ agentId: string; value: number }> = Array.isArray(
          payload.allocations
        )
          ? payload.allocations
          : [];
        const selectedIds: string[] | undefined = Array.isArray(payload.leadIds)
          ? payload.leadIds
          : undefined;

        const pool = db.leads.filter((l) =>
          selectedIds && selectedIds.length > 0
            ? selectedIds.includes(l.id)
            : !l.assignedToAgentId
        );

        if (pool.length === 0) {
          return NextResponse.json(
            { ok: false, error: 'No unassigned or selected leads available to distribute.' },
            { status: 400 }
          );
        }

        const validAllocations = allocations
          .map((a) => ({
            agent: db.users.find((u) => u.id === a.agentId && (u.role === 'AGENT' || u.role === 'ACCOUNT_MANAGER')),
            value: Math.max(0, Number(a.value) || 0),
          }))
          .filter((a) => a.agent && a.value > 0);

        if (validAllocations.length === 0) {
          return NextResponse.json(
            { ok: false, error: 'Select at least one agent with a positive count or percentage.' },
            { status: 400 }
          );
        }

        const countsByAgent = new Map<string, number>();

        if (mode === 'COUNT') {
          let remaining = pool.length;
          for (const item of validAllocations) {
            if (!item.agent || remaining <= 0) continue;
            const take = Math.min(Math.floor(item.value), remaining);
            countsByAgent.set(item.agent.id, take);
            remaining -= take;
          }
        } else {
          // PERCENTAGE mode
          const totalPct = validAllocations.reduce((sum, a) => sum + a.value, 0);
          if (totalPct > 100.01) {
            return NextResponse.json(
              { ok: false, error: 'Total percentage cannot exceed 100%.' },
              { status: 400 }
            );
          }
          const targetTotal = Math.min(
            pool.length,
            Math.round((pool.length * totalPct) / 100)
          );
          const rawShares = validAllocations.map((item) => {
            const exact = (pool.length * item.value) / 100;
            return {
              agentId: item.agent!.id,
              floor: Math.floor(exact),
              frac: exact - Math.floor(exact),
            };
          });
          let allocated = rawShares.reduce((s, r) => s + r.floor, 0);
          // Sort by largest fractional remainder to distribute rounding remainder
          const byFrac = [...rawShares].sort((a, b) => b.frac - a.frac);
          let idx = 0;
          while (allocated < targetTotal && idx < byFrac.length) {
            byFrac[idx].floor += 1;
            allocated += 1;
            idx += 1;
          }
          for (const share of rawShares) {
            countsByAgent.set(share.agentId, share.floor);
          }
        }

        let cursor = 0;
        const distributedSummary: string[] = [];

        for (const item of validAllocations) {
          const agent = item.agent!;
          const qty = countsByAgent.get(agent.id) || 0;
          if (qty <= 0) continue;

          for (let i = 0; i < qty && cursor < pool.length; i += 1) {
            const lead = pool[cursor];
            cursor += 1;
            lead.assignedToAgentId = agent.id;
            lead.assignedToAgentName = agent.name;
            lead.updatedAt = now;
            lead.callLogs.unshift({
              id: makeId('log'),
              type: 'NOTE',
              summary: `Lead assigned to ${agent.name} via ${mode === 'PERCENTAGE' ? `${item.value}% allocation` : 'count distribution'} by ${actor.name}.`,
              createdBy: actor.name,
            creatorRole: actorRole,
              createdAt: now,
            });
          }

          distributedSummary.push(`${agent.name}: ${qty}`);
          pushNotification(db.notifications, {
            targetRoles: ['AGENT'],
            targetUserIds: [agent.id],
            title: `${qty} New Lead(s) Assigned`,
            message: `${actor.name} assigned ${qty} lead(s) to you.`,
            type: 'LEAD',
          });
        }

        if (cursor === 0) {
          return NextResponse.json(
            { ok: false, error: 'Percentage or count resulted in 0 leads assigned.' },
            { status: 400 }
          );
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title: 'Leads Distributed',
          message: `${actor.name} distributed ${cursor} lead(s) (${distributedSummary.join(', ')}).`,
          type: 'LEAD',
        });
        break;
      }

      case 'UPDATE_LEAD_STATUS': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead) {
          return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
        }
        const callConnectStatus =
          payload.callConnectStatus === 'RINGING' ||
          payload.callConnectStatus === 'NOT_CONNECTED' ||
          payload.callConnectStatus === 'CONNECTED'
            ? payload.callConnectStatus
            : 'CONNECTED';
        const nextStatus = (payload.status || lead.status) as LeadStatus;
        const activityType =
          payload.activityType === 'EMAIL' || payload.activityType === 'NOTE'
            ? payload.activityType
            : 'CALL';
        const summary = String(payload.summary || '').trim();
        const rawItems: ServicePriceItem[] = Array.isArray(payload.serviceItems)
          ? payload.serviceItems.map((it: ServicePriceItem) => {
              const rate = Math.max(0, Number(it.rate) || 0);
              const count = Math.max(0, Number(it.count) || 0);
              return {
                service: String(it.service || '').trim(),
                rate,
                count,
                amount: Number((rate * count).toFixed(2)),
              };
            }).filter((it: ServicePriceItem) => Boolean(it.service))
          : [];
        const services: string[] =
          rawItems.length > 0
            ? rawItems.map((i) => i.service)
            : Array.isArray(payload.services)
            ? payload.services.map((s: string) => String(s).trim()).filter(Boolean)
            : [];
        const quotation = (payload.quotation || null) as LeadQuotation | null;
        const quotationCreatedNotSent = Boolean(payload.quotationCreatedNotSent);
        const quotationSent = quotationCreatedNotSent ? false : Boolean(payload.quotationSent || quotation);
        const quotationChannel = String(
          quotation?.channel || payload.quotationChannel || ''
        ).trim();
        const quotationAmount = quotation?.totalAmount
          ? Number(quotation.totalAmount)
          : payload.quotationAmount
          ? Number(payload.quotationAmount)
          : undefined;

        lead.callConnectStatus = callConnectStatus;
        lead.updatedAt = now;
        lead.agentCallDate = now;

        if (callConnectStatus === 'CONNECTED') {
          lead.status = nextStatus;
          if (services.length > 0) {
            lead.selectedServices = services;
            lead.serviceInterest = services.join(', ');
          }
          if (rawItems.length > 0) {
            lead.serviceItems = rawItems;
          }
          if (quotation) {
            lead.quotation = { ...quotation, updatedAt: now };
          }
          lead.quotationSent = quotationSent;
          lead.quotationChannel = quotationSent ? quotationChannel || 'Email' : undefined;
          lead.quotationAmount = quotationSent ? quotationAmount : undefined;
          if (quotationSent) {
            lead.quotationSentDate = now;
          }
        }

        if (summary) {
          lead.feedbackRemark = summary;
        }

        const logSummaryParts: string[] = [`Call: ${callConnectStatus}`];
        if (callConnectStatus === 'CONNECTED') {
          logSummaryParts.push(`Lead: ${nextStatus}`);
          if (rawItems.length > 0) {
            const breakdown = rawItems
              .map(
                (i) =>
                  `${i.service} (${i.count.toLocaleString('en-IN')} @ ₹${i.rate} = ₹${i.amount.toLocaleString('en-IN')})`
              )
              .join(', ');
            logSummaryParts.push(`Pricing: ${breakdown}`);
          } else if (services.length > 0) {
            logSummaryParts.push(`Services: ${services.join(', ')}`);
          }
          if (quotationCreatedNotSent) {
            logSummaryParts.push(
              `Quotation ${quotation?.quotationNumber || 'Generated'} create hua par client ko send nahi kiya gaya (Cancelled)`
            );
          } else if (quotationSent) {
            logSummaryParts.push(
              `Quotation ${quotation?.quotationNumber || 'Sent'} via ${quotationChannel || 'Email'}${quotationAmount ? ` (₹${quotationAmount.toLocaleString('en-IN')})` : ''}`
            );
          }
        }
        const finalSummary = summary || `${logSummaryParts.join(' | ')}`;

        lead.callLogs.unshift({
          id: makeId('log'),
          type: activityType,
          summary: `${logSummaryParts.join(' • ')} — ${summary || 'Updated by agent'}`,
          callConnectStatus,
          servicesSelected: services.length > 0 ? services : undefined,
          serviceItems: rawItems.length > 0 ? rawItems : undefined,
          quotationSent: callConnectStatus === 'CONNECTED' ? quotationSent : undefined,
          quotationChannel:
            callConnectStatus === 'CONNECTED' && quotationSent
              ? quotationChannel || 'Email'
              : undefined,
          quotationAmount:
            callConnectStatus === 'CONNECTED' && quotationSent ? quotationAmount : undefined,
          quotationSentDate:
            callConnectStatus === 'CONNECTED' && quotationSent ? now : undefined,
          agentCallDate: now,
          statusAfter: callConnectStatus === 'CONNECTED' ? nextStatus : lead.status,
          createdBy: actor.name,
            creatorRole: actorRole,
          createdAt: now,
        });

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title:
            callConnectStatus === 'CONNECTED'
              ? `Connected (${nextStatus}): ${lead.clientName}`
              : `Call ${callConnectStatus.replace('_', ' ')}: ${lead.clientName}`,
          message:
            callConnectStatus === 'CONNECTED'
              ? `${actor.name} spoke with ${lead.companyName} -> ${nextStatus}${services.length ? ` (${services.join(', ')})` : ''}${quotationSent ? ` • ${quotation?.quotationNumber || 'Quotation Sent'}` : ''}.`
              : `${actor.name} called ${lead.companyName} (${callConnectStatus.replace('_', ' ')}): ${finalSummary}`,
          type: 'LEAD',
          relatedId: lead.id,
        });
        break;
      }

      case 'SAVE_QUOTATION': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead) {
          return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
        }
        const quotation = payload.quotation as LeadQuotation | undefined;
        if (!quotation || !Array.isArray(quotation.items) || quotation.items.length === 0) {
          return NextResponse.json(
            { ok: false, error: 'At least one service item is required for quotation.' },
            { status: 400 }
          );
        }
        const normalizedItems: ServicePriceItem[] = quotation.items
          .map((it) => {
            const rate = Math.max(0, Number(it.rate) || 0);
            const count = Math.max(0, Number(it.count) || 0);
            const setupCharges = Math.max(0, Number(it.setupCharges) || 0);
            const monthlyCharges = Math.max(0, Number(it.monthlyCharges) || 0);
            return {
              service: String(it.service || '').trim(),
              rate,
              count,
              setupCharges,
              monthlyCharges,
              bullets: Array.isArray(it.bullets) ? it.bullets : undefined,
              amount: Number((rate * count + setupCharges + monthlyCharges).toFixed(2)),
            };
          })
          .filter((it) => Boolean(it.service));
        const subtotal = Number(
          normalizedItems.reduce((s, i) => s + i.amount, 0).toFixed(2)
        );
        const gstPercent = Math.max(0, Number(quotation.gstPercent) || 0);
        const gstAmount = Number(((subtotal * gstPercent) / 100).toFixed(2));
        const totalAmount = Number((subtotal + gstAmount).toFixed(2));

        const savedQuotation: LeadQuotation = {
          quotationNumber:
            String(quotation.quotationNumber || '').trim() ||
            `ISS/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 899)}`,
          quotationDate: String(quotation.quotationDate || now.slice(0, 10)),
          validUntil: String(
            quotation.validUntil ||
              new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10)
          ),
          clientName: String(quotation.clientName || lead.clientName).trim(),
          companyName: String(quotation.companyName || lead.companyName).trim(),
          phone: String(quotation.phone || lead.phone).trim(),
          email: String(quotation.email || lead.email).trim(),
          items: normalizedItems,
          subtotal,
          gstPercent,
          gstAmount,
          totalAmount,
          channel: String(quotation.channel || 'Email + WhatsApp'),
          termsNotes: String(quotation.termsNotes || ''),
          managerName: quotation.managerName ? String(quotation.managerName) : undefined,
          managerDesignation: quotation.managerDesignation
            ? String(quotation.managerDesignation)
            : undefined,
          managerPhone: quotation.managerPhone ? String(quotation.managerPhone) : undefined,
          managerEmail: quotation.managerEmail ? String(quotation.managerEmail) : undefined,
          updatedAt: now,
        };

        lead.quotation = savedQuotation;
        lead.serviceItems = normalizedItems;
        lead.selectedServices = normalizedItems.map((i) => i.service);
        lead.serviceInterest = lead.selectedServices.join(', ');
        lead.quotationSent = true;
        lead.quotationChannel = savedQuotation.channel;
        lead.quotationAmount = savedQuotation.totalAmount;
        lead.quotationSentDate = now;
        lead.updatedAt = now;

        lead.callLogs.unshift({
          id: makeId('log'),
          type: 'NOTE',
          summary: `Quotation ${savedQuotation.quotationNumber} saved by ${actor.name} — Total ₹${savedQuotation.totalAmount.toLocaleString('en-IN')} (incl. ${gstPercent}% GST)`,
          serviceItems: normalizedItems,
          quotationSent: true,
          quotationChannel: savedQuotation.channel,
          quotationAmount: savedQuotation.totalAmount,
          quotationSentDate: now,
          createdBy: actor.name,
            creatorRole: actorRole,
          createdAt: now,
        });

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title: `Quotation Generated/Updated: ${savedQuotation.quotationNumber}`,
          message: `${actor.name} saved quotation ${savedQuotation.quotationNumber} for ${savedQuotation.companyName} (₹${savedQuotation.totalAmount.toLocaleString('en-IN')}).`,
          type: 'LEAD',
          relatedId: lead.id,
        });
        break;
      }

      case 'LOG_QUOTATION_SENT': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead) {
          return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
        }
        const proposalNumber = String(payload.proposalNumber || 'Proposal');
        const channel = String(payload.channel || 'Email');
        const toEmail = String(payload.to || lead.email || '');
        const amount = Number(payload.amount || lead.quotation?.totalAmount || 0);

        lead.quotationSent = true;
        lead.quotationChannel = channel;
        lead.quotationSentDate = now;
        lead.updatedAt = now;
        if (amount > 0) lead.quotationAmount = amount;

        lead.callLogs.unshift({
          id: makeId('log'),
          type: 'EMAIL',
          summary: `Quotation Proposal (${proposalNumber}) sent via ${channel} to ${toEmail}${amount > 0 ? ` (₹${amount.toLocaleString('en-IN')})` : ''} by ${actor.name}.`,
          quotationSent: true,
          quotationChannel: channel,
          quotationAmount: amount > 0 ? amount : undefined,
          quotationSentDate: now,
          createdBy: actor.name,
            creatorRole: actorRole,
          createdAt: now,
        });

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title: `Quotation Sent: ${lead.companyName}`,
          message: `${actor.name} sent quotation proposal ${proposalNumber} to ${toEmail}.`,
          type: 'LEAD',
          relatedId: lead.id,
        });
        break;
      }

      case 'SAVE_USER_MAIL_CONFIG': {
        const targetUserId = String(payload.userId || actor.id);
        const user = db.users.find((u) => u.id === targetUserId);
        if (!user) {
          return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
        }
        const email = String(payload.email || '').trim().toLowerCase();
        const password = String(payload.password || '').trim();
        const signature = payload.signature !== undefined ? String(payload.signature).trim() : undefined;
        const signatureHtml = payload.signatureHtml !== undefined ? String(payload.signatureHtml).trim() : undefined;
        const designation = payload.designation !== undefined ? String(payload.designation).trim() : undefined;
        const phone = payload.phone !== undefined ? String(payload.phone).trim() : undefined;

        if (signature !== undefined) {
          user.mailSignature = signature;
        }
        if (signatureHtml !== undefined) {
          user.mailSignatureHtml = signatureHtml;
        }
        if (designation !== undefined) {
          user.designation = designation;
        }
        if (phone !== undefined) {
          user.phone = phone;
        }

        if (email || password) {
          user.mailConfig = {
            email: email || user.mailConfig?.email || user.email,
            password: password || user.mailConfig?.password,
            smtpHost: String(payload.smtpHost || user.mailConfig?.smtpHost || 'smtp.hostinger.com'),
            smtpPort: Number(payload.smtpPort || user.mailConfig?.smtpPort || 465),
            imapHost: String(payload.imapHost || user.mailConfig?.imapHost || 'imap.hostinger.com'),
            imapPort: Number(payload.imapPort || user.mailConfig?.imapPort || 993),
            signature: signature || user.mailConfig?.signature,
            signatureHtml: signatureHtml || user.mailConfig?.signatureHtml,
            designation: designation || user.mailConfig?.designation,
            phone: phone || user.mailConfig?.phone,
            updatedAt: now,
          };
        }
        break;
      }

      case 'LOGOUT_USER_MAIL_CONFIG': {
        const targetUserId = String(payload.userId || actor.id);
        const user = db.users.find((u) => u.id === targetUserId);
        if (user) {
          delete user.mailConfig;
        }
        break;
      }

      case 'EDIT_LEAD': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead) {
          return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
        }
        lead.leadDate = String(payload.leadDate ?? lead.leadDate ?? now.slice(0, 10)).trim();
        lead.companyName = String(payload.companyName ?? lead.companyName).trim() || lead.companyName;
        lead.designation = String(payload.designation ?? lead.designation ?? '').trim();
        lead.clientName = String(payload.clientName ?? lead.clientName).trim() || lead.clientName;
        lead.phone = String(payload.phone ?? lead.phone).trim();
        lead.email = String(payload.email ?? lead.email).trim();
        lead.linkedinUrl = String(payload.linkedinUrl ?? lead.linkedinUrl ?? '').trim();
        lead.cityLocation = String(payload.cityLocation ?? lead.cityLocation ?? '').trim();
        lead.feedbackRemark = String(payload.feedbackRemark ?? lead.feedbackRemark ?? '').trim();
        lead.updatedAt = now;
        lead.callLogs.unshift({
          id: makeId('log'),
          type: 'NOTE',
          summary: `Lead details updated by ${actor.name}${lead.feedbackRemark ? `: ${lead.feedbackRemark}` : '.'}`,
          createdBy: actor.name,
            creatorRole: actorRole,
          createdAt: now,
        });
        break;
      }

      case 'SET_REMINDER': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead) {
          return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
        }
        const datetime = String(payload.datetime || '');
        const note = String(payload.note || 'Client requested callback').trim();
        const reminderType = payload.reminderType ? String(payload.reminderType) as any : undefined;
        const targetRole = payload.targetRole ? String(payload.targetRole) as any : undefined;
        if (!datetime) {
          return NextResponse.json(
            { ok: false, error: 'Reminder date and time are required.' },
            { status: 400 }
          );
        }

        lead.reminder = {
          id: makeId('rem'),
          datetime: new Date(datetime).toISOString(),
          note,
          reminderType,
          targetRole,
          notified: false,
          completed: false,
          createdAt: now,
        };
        lead.updatedAt = now;
        lead.callLogs.unshift({
          id: makeId('log'),
          type: 'NOTE',
          summary: `[${reminderType || 'REMINDER'}] Scheduled for ${new Date(datetime).toLocaleString()}: ${note}`,
          createdBy: actor.name,
            creatorRole: actorRole,
          createdAt: now,
        });
        break;
      }

      case 'COMPLETE_REMINDER': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead || !lead.reminder) {
          return NextResponse.json({ ok: false, error: 'Reminder not found.' }, { status: 404 });
        }
        lead.reminder.completed = true;
        lead.reminder.notified = true;
        lead.updatedAt = now;
        lead.callLogs.unshift({
          id: makeId('log'),
          type: 'CALL',
          summary: `Completed follow-up reminder: ${lead.reminder.note}`,
          createdBy: actor.name,
            creatorRole: actorRole,
          createdAt: now,
        });
        break;
      }

      case 'SNOOZE_REMINDER': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead || !lead.reminder) {
          return NextResponse.json({ ok: false, error: 'Reminder not found.' }, { status: 404 });
        }
        const minutes = Number(payload.minutes) || 10;
        lead.reminder.datetime = new Date(Date.now() + minutes * 60_000).toISOString();
        lead.reminder.notified = false;
        lead.reminder.completed = false;
        lead.updatedAt = now;
        break;
      }

      case 'MARK_REMINDER_NOTIFIED': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead || !lead.reminder) {
          return NextResponse.json({ ok: false, error: 'Reminder not found.' }, { status: 404 });
        }
        if (!lead.reminder.notified) {
          lead.reminder.notified = true;
          pushNotification(db.notifications, {
            targetRoles: ['AGENT'],
            targetUserIds: lead.assignedToAgentId ? [lead.assignedToAgentId] : undefined,
            title: `Callback Reminder Due: ${lead.clientName}`,
            message: `${lead.companyName} (${lead.phone}): ${lead.reminder.note}`,
            type: 'REMINDER',
            relatedId: lead.id,
          });
        }
        break;
      }

      case 'ASSIGN_LEAD': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead) {
          return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
        }
        const agent = db.users.find((u) => u.id === payload.agentId);
        if (!agent) {
          return NextResponse.json({ ok: false, error: 'Assignee user not found.' }, { status: 404 });
        }
        lead.assignedToAgentId = agent.id;
        lead.assignedToAgentName = agent.name;
        lead.updatedAt = now;
        await writeDatabaseAsync(db);
        return NextResponse.json({ ok: true, data: db, message: `Lead assigned to ${agent.name}` });
      }

      case 'CREATE_MEET': {
        const lead = db.leads.find((l) => l.id === payload.leadId);
        if (!lead) {
          return NextResponse.json({ ok: false, error: 'Lead not found.' }, { status: 404 });
        }
        const meetId = makeId('meet');
        const meet = {
          id: meetId,
          leadId: lead.id,
          clientName: lead.clientName,
          companyName: lead.companyName,
          clientPhone: lead.phone,
          clientEmail: lead.email,
          agentId: lead.assignedToAgentId || actor.id,
          agentName: lead.assignedToAgentName || actor.name,
          scheduledDate: String(payload.scheduledDate || ''),
          scheduledTime: String(payload.scheduledTime || ''),
          platform: String(payload.platform || 'Google Meet'),
          meetLink: payload.meetLink ? String(payload.meetLink).trim() : undefined,
          anydeskAddress: payload.anydeskAddress ? String(payload.anydeskAddress).trim() : undefined,
          ultraviewerId: payload.ultraviewerId ? String(payload.ultraviewerId).trim() : undefined,
          ultraviewerPassword: payload.ultraviewerPassword ? String(payload.ultraviewerPassword).trim() : undefined,
          offlineLocation: payload.offlineLocation ? String(payload.offlineLocation).trim() : undefined,
          agenda: String(payload.agenda || 'Technical & Commercial Walkthrough'),
          status: 'PENDING_APPROVAL' as const,
          createdAt: now,
          updatedAt: now,
        };

        if (!meet.scheduledDate || !meet.scheduledTime) {
          return NextResponse.json(
            { ok: false, error: 'Meeting date and time are required.' },
            { status: 400 }
          );
        }

        if (meet.platform === 'Offline Meet' && !meet.offlineLocation) {
          return NextResponse.json(
            { ok: false, error: 'Location is mandatory for Offline Meet.' },
            { status: 400 }
          );
        }

        let connectionDetail = '';
        if (meet.meetLink) connectionDetail = ` [Link: ${meet.meetLink}]`;
        else if (meet.anydeskAddress) connectionDetail = ` [AnyDesk: ${meet.anydeskAddress}]`;
        else if (meet.offlineLocation) connectionDetail = ` [Location: ${meet.offlineLocation}]`;
        else if (meet.ultraviewerId) connectionDetail = ` [UltraViewer ID: ${meet.ultraviewerId} / Pass: ${meet.ultraviewerPassword || '-'}]`;

        db.meetRequests.unshift(meet);
        lead.meetDate = `${meet.scheduledDate} ${meet.scheduledTime}`;
        lead.callLogs.unshift({
          id: makeId('log'),
          type: 'NOTE',
          summary: `Meet scheduled for ${meet.scheduledDate} ${meet.scheduledTime} (${meet.platform})${connectionDetail}. Sent to Support for confirmation.`,
          meetDate: `${meet.scheduledDate} ${meet.scheduledTime}`,
          createdBy: actor.name,
            creatorRole: actorRole,
          createdAt: now,
        });
        lead.updatedAt = now;

        // Notify Account Manager, Admin AND Support as requested
        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'SUPPORT'],
          title: `Meet Request: ${meet.companyName}`,
          message: `${meet.agentName} scheduled a ${meet.platform} with ${meet.clientName} on ${meet.scheduledDate} at ${meet.scheduledTime}${connectionDetail}.`,
          type: 'MEET',
          relatedId: meetId,
        });
        break;
      }

      case 'APPROVE_MEET': {
        // Can be approved by Admin, Account Manager (TL), or Support Team
        if (actorRole !== 'ADMIN' && actorRole !== 'ACCOUNT_MANAGER' && actorRole !== 'SUPPORT') {
          return NextResponse.json(
            { ok: false, error: 'Only Support, Team Leader, or Admin can accept/approve meetings.' },
            { status: 403 }
          );
        }
        const meet = db.meetRequests.find((m) => m.id === payload.meetId);
        if (!meet) {
          return NextResponse.json({ ok: false, error: 'Meet request not found.' }, { status: 404 });
        }
        meet.status = 'APPROVED';
        meet.approvedBy = actor.name;
        meet.approvedAt = now;
        meet.supportNotes = String(payload.supportNotes || meet.supportNotes || `Accepted & Confirmed on Support schedule by ${actor.name}.`);
        meet.updatedAt = now;

        // Auto update lead meet date and log
        const leadForMeet = db.leads.find((l) => l.id === meet.leadId || l.companyName.toLowerCase() === meet.companyName.toLowerCase());
        if (leadForMeet) {
          leadForMeet.meetDate = `${meet.scheduledDate} ${meet.scheduledTime} (Confirmed)`;
          leadForMeet.updatedAt = now;
          leadForMeet.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `Demo Meeting Confirmed by ${actor.name} (${actorRole}): Scheduled for ${meet.scheduledDate} at ${meet.scheduledTime} on ${meet.platform}.`,
            meetDate: `${meet.scheduledDate} ${meet.scheduledTime}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        // Notify Agent, Team Leader, and Admin loop
        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title: `Meet Approved: ${meet.companyName}`,
          message: `${actor.name} (${actorRole}) accepted and scheduled the demo with ${meet.clientName} for ${meet.scheduledDate} at ${meet.scheduledTime}.`,
          type: 'MEET',
          relatedId: meet.id,
        });
        pushNotification(db.notifications, {
          targetRoles: ['AGENT'],
          targetUserIds: [meet.agentId],
          title: `Meet Confirmed: ${meet.companyName}`,
          message: `${actor.name} approved your demo meet on ${meet.scheduledDate} at ${meet.scheduledTime}. Client demo is locked in!`,
          type: 'MEET',
          relatedId: meet.id,
        });
        break;
      }

      case 'PROPOSE_RESCHEDULE_MEET': {
        // Support or Admin/TL marks busy and suggests new slot
        const meet = db.meetRequests.find((m) => m.id === payload.meetId);
        if (!meet) {
          return NextResponse.json({ ok: false, error: 'Meet request not found.' }, { status: 404 });
        }
        const proposedDate = String(payload.proposedDate || '').trim();
        const proposedTime = String(payload.proposedTime || '').trim();
        const rescheduleReason = String(payload.rescheduleReason || 'Support team is busy in another demo/session.').trim();

        if (!proposedDate || !proposedTime) {
          return NextResponse.json(
            { ok: false, error: 'Alternative date and time are required to propose reschedule.' },
            { status: 400 }
          );
        }

        meet.status = 'RESCHEDULE_PROPOSED';
        meet.proposedDate = proposedDate;
        meet.proposedTime = proposedTime;
        meet.rescheduleReason = rescheduleReason;
        meet.updatedAt = now;

        // Add lead log
        const leadForMeet = db.leads.find((l) => l.id === meet.leadId || l.companyName.toLowerCase() === meet.companyName.toLowerCase());
        if (leadForMeet) {
          leadForMeet.updatedAt = now;
          leadForMeet.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `Support Team Busy — Reschedule Proposed by ${actor.name} to ${proposedDate} at ${proposedTime}: ${rescheduleReason}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        // Notify Agent to confirm with client, and keep TL/Admin in loop
        pushNotification(db.notifications, {
          targetRoles: ['AGENT'],
          targetUserIds: [meet.agentId],
          title: `Action Required: Support Busy, Reschedule Proposed (${meet.companyName})`,
          message: `Support proposed new slot: ${proposedDate} at ${proposedTime} (${rescheduleReason}). Please confirm with client.`,
          type: 'MEET',
          relatedId: meet.id,
        });
        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title: `Meet Reschedule Proposed: ${meet.companyName}`,
          message: `${actor.name} proposed alternative slot (${proposedDate} ${proposedTime}) for ${meet.companyName} due to: ${rescheduleReason}.`,
          type: 'MEET',
          relatedId: meet.id,
        });
        break;
      }

      case 'CONFIRM_RESCHEDULE_MEET': {
        // Agent confirms client agreed to the new slot (or TL/Admin approves)
        const meet = db.meetRequests.find((m) => m.id === payload.meetId);
        if (!meet) {
          return NextResponse.json({ ok: false, error: 'Meet request not found.' }, { status: 404 });
        }
        // Adopt the proposed date/time or new custom confirmed time
        meet.scheduledDate = String(payload.scheduledDate || meet.proposedDate || meet.scheduledDate);
        meet.scheduledTime = String(payload.scheduledTime || meet.proposedTime || meet.scheduledTime);
        meet.status = 'APPROVED';
        meet.approvedBy = actor.name;
        meet.approvedAt = now;
        meet.supportNotes = `Reschedule confirmed with client by ${actor.name}. Confirmed for ${meet.scheduledDate} at ${meet.scheduledTime}.`;
        meet.updatedAt = now;

        const leadForMeet = db.leads.find((l) => l.id === meet.leadId || l.companyName.toLowerCase() === meet.companyName.toLowerCase());
        if (leadForMeet) {
          leadForMeet.meetDate = `${meet.scheduledDate} ${meet.scheduledTime} (Confirmed)`;
          leadForMeet.updatedAt = now;
          leadForMeet.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `Client Agreed & Rescheduled Demo Confirmed by ${actor.name}: New Final Slot ${meet.scheduledDate} at ${meet.scheduledTime} on ${meet.platform}.`,
            meetDate: `${meet.scheduledDate} ${meet.scheduledTime}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        // Notify Support that meet is now locked, keeping TL/Admin in loop
        pushNotification(db.notifications, {
          targetRoles: ['SUPPORT', 'ADMIN', 'ACCOUNT_MANAGER'],
          title: `Rescheduled Meet Locked: ${meet.companyName}`,
          message: `${actor.name} confirmed client is available. Demo locked on Support schedule for ${meet.scheduledDate} at ${meet.scheduledTime}.`,
          type: 'MEET',
          relatedId: meet.id,
        });
        break;
      }

      case 'REJECT_MEET': {
        if (actorRole !== 'ADMIN' && actorRole !== 'ACCOUNT_MANAGER') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin or Account Manager can reject meetings.' },
            { status: 403 }
          );
        }
        const meet = db.meetRequests.find((m) => m.id === payload.meetId);
        if (!meet) {
          return NextResponse.json({ ok: false, error: 'Meet request not found.' }, { status: 404 });
        }
        meet.status = 'REJECTED';
        meet.rejectionReason = String(payload.reason || 'Reschedule requested');
        meet.updatedAt = now;

        pushNotification(db.notifications, {
          targetRoles: ['AGENT'],
          targetUserIds: [meet.agentId],
          title: `Meet Rejected: ${meet.companyName}`,
          message: `${actor.name} rejected the meet request: ${meet.rejectionReason}`,
          type: 'MEET',
          relatedId: meet.id,
        });
        break;
      }

      case 'COMPLETE_MEET': {
        const meet = db.meetRequests.find((m) => m.id === payload.meetId);
        if (!meet) {
          return NextResponse.json({ ok: false, error: 'Meet request not found.' }, { status: 404 });
        }
        // Time validation: meet must be completed only at or after the scheduled time (Admin override allowed)
        if (actorRole !== 'ADMIN' && meet.scheduledDate && meet.scheduledTime) {
          const meetDt = new Date(`${meet.scheduledDate}T${meet.scheduledTime}:00`);
          if (new Date().getTime() < meetDt.getTime()) {
            return NextResponse.json(
              { ok: false, error: `Meeting scheduled time is ${meet.scheduledTime}. You can only mark it completed after the meeting time.` },
              { status: 400 }
            );
          }
        }
        meet.status = 'COMPLETED';
        meet.supportNotes = String(payload.supportNotes || 'Meeting completed successfully.');
        meet.updatedAt = now;

        const matchedLead = db.leads.find((l) => l.id === meet.leadId || l.companyName.toLowerCase() === meet.companyName.toLowerCase());
        if (matchedLead) {
          matchedLead.updatedAt = now;
          matchedLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `Demo / Meeting Completed by ${actor.name} (${meet.platform}): ${meet.supportNotes}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT'],
          targetUserIds: undefined,
          title: `Meet Completed: ${meet.companyName}`,
          message: `${actor.name} marked the meeting with ${meet.clientName} as completed.`,
          type: 'MEET',
          relatedId: meet.id,
        });
        break;
      }

      case 'CREATE_ONBOARDING': {
        const companyName = String(payload.companyName || '').trim();
        const username = String(payload.username || '').trim();
        const billingEntity = String(payload.billingEntity || '').trim();
        const services: string[] = Array.isArray(payload.services)
          ? payload.services.map((s: string) => s.trim()).filter(Boolean)
          : String(payload.services || '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
        const unitPrice = String(payload.unitPrice || '').trim();
        const totalDealAmount = Number(payload.totalDealAmount) || 0;
        const serviceItems = Array.isArray(payload.serviceItems) ? payload.serviceItems : undefined;
        const whatsappMarketingRate = payload.whatsappMarketingRate !== undefined ? Number(payload.whatsappMarketingRate) : undefined;
        const whatsappUtilityRate = payload.whatsappUtilityRate !== undefined ? Number(payload.whatsappUtilityRate) : undefined;
        const obdRate = payload.obdRate !== undefined ? Number(payload.obdRate) : undefined;
        const billingType = (payload.billingType || payload.paymentType || 'PREPAID') as BillingType;
        const paymentType = billingType;
        const taxType = (payload.taxType === 'NON_GST' ? 'NON_GST' : 'GST');
        const gstNumber = payload.gstNumber ? String(payload.gstNumber).trim().toUpperCase() : undefined;
        const postpaidCycle = payload.postpaidCycle ? String(payload.postpaidCycle) as any : undefined;

        if (!companyName || !username || services.length === 0 || !unitPrice) {
          return NextResponse.json(
            {
              ok: false,
              error: 'Company Name, Account Username, Services, and Service Rate are required.',
            },
            { status: 400 }
          );
        }

        const onboardingId = makeId('onb');
        const targetLead = payload.leadId
          ? db.leads.find((l) => l.id === payload.leadId)
          : db.leads.find((l) => l.companyName.toLowerCase() === companyName.toLowerCase());

        // Find assigned Account Manager (TL)
        const accountManager = db.users.find((u) => u.role === 'ACCOUNT_MANAGER');
        const accountManagerName = accountManager?.name || 'Neha Kapoor';

        // Update lead with converted log and mark status as ONBOARDED
        if (targetLead) {
          targetLead.status = 'ONBOARDED';
          targetLead.updatedAt = now;
          targetLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `Client converted & moved to Onboarding queue by ${actor.name} for account "@${username}" (${paymentType}${postpaidCycle ? ` - ${postpaidCycle.replace('_', ' ')}` : ''}, ${taxType}${gstNumber ? ` GST: ${gstNumber}` : ''}) — Value: ₹${totalDealAmount.toLocaleString('en-IN')}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        db.onboardingRequests.unshift({
          id: onboardingId,
          leadId: targetLead ? targetLead.id : payload.leadId ? String(payload.leadId) : undefined,
          leadData: targetLead ? JSON.parse(JSON.stringify(targetLead)) : undefined,
          clientName: targetLead?.clientName || payload.clientName || undefined,
          clientPhone: targetLead?.phone || payload.clientPhone || undefined,
          clientEmail: targetLead?.email || payload.clientEmail || undefined,
          companyName,
          username,
          billingEntity: billingEntity || companyName,
          gstNumber,
          taxType,
          paymentType,
          postpaidCycle,
          services,
          serviceItems,
          whatsappMarketingRate,
          whatsappUtilityRate,
          obdRate,
          unitPrice,
          totalDealAmount,
          billingType,
          agentId: actor.id,
          agentName: actor.name,
          accountManagerName,
          status: 'PENDING_APPROVAL',
          createdAt: now,
          updatedAt: now,
        });

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER'],
          title: `New Onboarding Submitted: ${companyName}`,
          message: `${actor.name} submitted onboarding for ${username} (₹${totalDealAmount.toLocaleString('en-IN')}, ${billingType}).`,
          type: 'ONBOARDING',
          relatedId: onboardingId,
        });
        break;
      }

      case 'APPROVE_ONBOARDING': {
        if (actorRole !== 'ADMIN' && actorRole !== 'ACCOUNT_MANAGER') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin or Account Manager can approve onboarding.' },
            { status: 403 }
          );
        }
        const onb = db.onboardingRequests.find((o) => o.id === payload.onboardingId);
        if (!onb) {
          return NextResponse.json(
            { ok: false, error: 'Onboarding request not found.' },
            { status: 404 }
          );
        }
        onb.status = 'APPROVED_FOR_SUPPORT';
        onb.approvedBy = actor.name;
        onb.approvedAt = now;
        onb.updatedAt = now;

        // Notify Support WITHOUT commercial deal amount or billing entity
        pushNotification(db.notifications, {
          targetRoles: ['SUPPORT'],
          title: `Create Account: ${onb.username}`,
          message: `Agent: ${onb.agentName} | Account: ${onb.username} | Services: ${onb.services.join(', ')} | Set Rate: ${onb.unitPrice}`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        pushNotification(db.notifications, {
          targetRoles: ['AGENT'],
          targetUserIds: [onb.agentId],
          title: `Onboarding Approved: ${onb.companyName}`,
          message: `${actor.name} approved onboarding for ${onb.username}. Sent to Support for account creation.`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        break;
      }

      case 'REJECT_ONBOARDING': {
        if (actorRole !== 'ADMIN' && actorRole !== 'ACCOUNT_MANAGER') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin or Account Manager can reject onboarding.' },
            { status: 403 }
          );
        }
        const onb = db.onboardingRequests.find((o) => o.id === payload.onboardingId);
        if (!onb) {
          return NextResponse.json(
            { ok: false, error: 'Onboarding request not found.' },
            { status: 404 }
          );
        }
        onb.status = 'REJECTED';
        onb.rejectionReason = String(payload.reason || 'Corrections required');
        onb.updatedAt = now;

        pushNotification(db.notifications, {
          targetRoles: ['AGENT'],
          targetUserIds: [onb.agentId],
          title: `Onboarding Rejected: ${onb.companyName}`,
          message: `${actor.name} rejected onboarding for ${onb.username}: ${onb.rejectionReason}`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        break;
      }

      case 'SAVE_PORTAL_CREDENTIALS': {
        const onb = db.onboardingRequests.find((o) => o.id === payload.onboardingId);
        if (!onb) {
          return NextResponse.json(
            { ok: false, error: 'Onboarding request not found.' },
            { status: 404 }
          );
        }

        const serviceKey = String(payload.serviceKey || 'SMS_RCS');
        const serviceName = String(payload.serviceName || 'SMS & RCS Portal');
        const portalUrl = String(payload.portalUrl || '').trim();
        const username = String(payload.username || onb.username).trim();
        const password = String(payload.password || '').trim();
        const supportNote = String(payload.supportNote || '').trim();

        if (!onb.portalCredentials) {
          onb.portalCredentials = [];
        }

        // Upsert credential for this serviceKey
        const existingIdx = onb.portalCredentials.findIndex((c) => c.serviceKey === serviceKey);
        const credItem = {
          serviceKey: serviceKey as any,
          serviceName,
          portalUrl,
          username,
          password,
          configuredAt: now,
          configuredBy: actor.name,
          supportNote,
        };

        if (existingIdx >= 0) {
          onb.portalCredentials[existingIdx] = credItem;
        } else {
          onb.portalCredentials.push(credItem);
        }

        // Auto mark onboarding as ACCOUNT_CREATED if at least one portal is configured
        onb.status = 'ACCOUNT_CREATED';
        onb.supportCreatedBy = actor.name;
        onb.supportCreatedAt = now;
        onb.updatedAt = now;

        // Log to lead
        const onbLead = onb.leadId
          ? db.leads.find((l) => l.id === onb.leadId)
          : db.leads.find((l) => l.companyName.toLowerCase() === onb.companyName.toLowerCase());
        if (onbLead) {
          onbLead.updatedAt = now;
          onbLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[${serviceName}] Portal Login Saved by Support (${actor.name}) — URL: ${portalUrl} | Username: ${username} | Password: ${password}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        // Email dispatch to Agent, CC: Account Manager & Admin
        try {
          const defaultSmtpUser = process.env.SMTP_USER || 'parvej@immenseair.in';
          const defaultSmtpPass = process.env.SMTP_PASS || 'Parvej@8586746';
          const defaultSmtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
          const defaultSmtpPort = Number(process.env.SMTP_PORT || 465);

          const agent = db.users.find((u) => u.id === onb.agentId || u.name === onb.agentName);
          const amUsers = db.users.filter((u) => u.role === 'ACCOUNT_MANAGER');
          const adminUsers = db.users.filter((u) => u.role === 'ADMIN');

          const agentEmail = agent?.mailConfig?.email || agent?.email || 'sales@immenseair.in';
          const ccEmails = [
            ...amUsers.map((u) => u.mailConfig?.email || u.email),
            ...adminUsers.map((u) => u.mailConfig?.email || u.email),
          ].filter((em) => em && em !== agentEmail);

          const transporter = getEmailTransporter({
            host: defaultSmtpHost,
            port: defaultSmtpPort,
            user: defaultSmtpUser,
            pass: defaultSmtpPass,
          });

          const emailSubject = `[${serviceName}] Login Credentials: ${onb.companyName} (@${username})`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #0f2a5f, #1e1b4b); padding: 18px 24px; border-radius: 8px; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px; font-weight: bold;">${serviceName} — Portal Login Credentials</h2>
                <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Immense Air Technical Support & Operations</p>
              </div>

              <div style="padding: 20px 0;">
                <p style="font-size: 14px; color: #1e293b; margin: 0 0 14px;">
                  Hello <strong>${onb.agentName}</strong>,
                </p>
                <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
                  Support has configured and activated the <strong>${serviceName}</strong> account for <strong>${onb.companyName}</strong>. Details below:
                </p>

                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Service:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${serviceName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Portal URL:</td>
                      <td style="padding: 6px 0; color: #0284c7; font-weight: bold;"><a href="${portalUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">${portalUrl}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Username:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold;">${username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Password:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold; background: #e0f2fe; padding: 3px 8px; border-radius: 4px; display: inline-block;">${password}</td>
                    </tr>
                  </table>
                </div>

                ${supportNote ? `
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #065f46;">
                  <strong>Support Note:</strong> ${supportNote}
                </div>
                ` : ''}

                <p style="font-size: 12px; color: #64748b; margin: 20px 0 0; line-height: 1.4;">
                  Loop in CC: Account Manager &amp; Admin.<br/>
                  Support Engineer: <strong>${actor.name}</strong> • Immense Air Operations.
                </p>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"Immense Air Support" <${defaultSmtpUser}>`,
            to: agentEmail,
            cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
            subject: emailSubject,
            html: emailHtml,
          });
        } catch (mailErr: any) {
          console.warn('[SAVE_PORTAL_CREDENTIALS] Email dispatch failed:', mailErr?.message);
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT'],
          title: `${serviceName} Ready: ${onb.companyName}`,
          message: `Support (${actor.name}) configured ${serviceName} login for @${username}. Credentials saved & dispatched to Agent ${onb.agentName}.`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        break;
      }

      case 'COMPLETE_ONBOARDING_SUPPORT': {
        const onb = db.onboardingRequests.find((o) => o.id === payload.onboardingId);
        if (!onb) {
          return NextResponse.json(
            { ok: false, error: 'Onboarding request not found.' },
            { status: 404 }
          );
        }

        const panelUrl = String(payload.panelUrl || 'https://portal.immenseair.in').trim();
        const panelPassword = String(payload.panelPassword || '').trim();
        const supportAccountNote = String(payload.supportAccountNote || '').trim();

        onb.status = 'ACCOUNT_CREATED';
        onb.supportCreatedBy = actor.name;
        onb.supportCreatedAt = now;
        onb.panelUrl = panelUrl;
        if (panelPassword) onb.panelPassword = panelPassword;
        onb.credentialsSentDate = now;
        onb.supportAccountNote = supportAccountNote || `Account "${onb.username}" created by ${actor.name} on ${panelUrl}.`;
        onb.updatedAt = now;

        // Find assigned agent, account managers and admin emails
        const agent = db.users.find((u) => u.id === onb.agentId || u.name === onb.agentName);
        const amUsers = db.users.filter((u) => u.role === 'ACCOUNT_MANAGER');
        const adminUsers = db.users.filter((u) => u.role === 'ADMIN');

        const agentEmail = agent?.mailConfig?.email || agent?.email || 'sales@immenseair.in';
        const ccEmails = [
          ...amUsers.map((u) => u.mailConfig?.email || u.email),
          ...adminUsers.map((u) => u.mailConfig?.email || u.email),
        ].filter((em) => em && em !== agentEmail);

        // Update lead log with full credentials for team reference
        const onbLead = onb.leadId
          ? db.leads.find((l) => l.id === onb.leadId)
          : db.leads.find((l) => l.companyName.toLowerCase() === onb.companyName.toLowerCase());
        if (onbLead) {
          onbLead.updatedAt = now;
          onbLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `Support Account Created by ${actor.name} — Portal URL: ${panelUrl} | Username: ${onb.username}${panelPassword ? ` | Password: ${panelPassword}` : ''} (Dispatched via email to Agent ${onb.agentName}, loop: Account Manager & Admin)`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        // Send Email to Agent with CC to Account Manager and Admin
        try {
          const defaultSmtpUser = process.env.SMTP_USER || 'parvej@immenseair.in';
          const defaultSmtpPass = process.env.SMTP_PASS || 'Parvej@8586746';
          const defaultSmtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
          const defaultSmtpPort = Number(process.env.SMTP_PORT || 465);

          const transporter = getEmailTransporter({
            host: defaultSmtpHost,
            port: defaultSmtpPort,
            user: defaultSmtpUser,
            pass: defaultSmtpPass,
          });

          const emailSubject = `Account Created: @${onb.username} — ${onb.companyName} [Portal Login Credentials]`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #0f2a5f, #1e1b4b); padding: 18px 24px; border-radius: 8px; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Client Portal Account Provisioned</h2>
                <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Immense Air Technical Support & Operations</p>
              </div>

              <div style="padding: 20px 0;">
                <p style="font-size: 14px; color: #1e293b; margin: 0 0 16px;">
                  Hello <strong>${onb.agentName}</strong>,
                </p>
                <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
                  The requested client account for <strong>${onb.companyName}</strong> has been successfully configured and activated on the portal. You may now share these credentials with the client:
                </p>

                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Portal URL:</td>
                      <td style="padding: 6px 0; color: #0284c7; font-weight: bold;"><a href="${panelUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">${panelUrl}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Account Username:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold;">${onb.username}</td>
                    </tr>
                    ${panelPassword ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Password:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold; background: #e0f2fe; padding: 4px 8px; border-radius: 4px; display: inline-block;">${panelPassword}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Services Configured:</td>
                      <td style="padding: 6px 0; color: #334155; font-weight: 600;">${onb.services.join(', ')}</td>
                    </tr>
                    ${onb.whatsappMarketingRate || onb.whatsappUtilityRate ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">WhatsApp Rates:</td>
                      <td style="padding: 6px 0; color: #059669; font-weight: bold;">Marketing: ₹${onb.whatsappMarketingRate || '0.80'} / msg • Utility: ₹${onb.whatsappUtilityRate || '0.40'} / msg</td>
                    </tr>
                    ` : ''}
                    ${onb.obdRate ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">OBD Rate:</td>
                      <td style="padding: 6px 0; color: #7c3aed; font-weight: bold;">₹${onb.obdRate} / 30s</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                ${supportAccountNote ? `
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #065f46;">
                  <strong>Support Note:</strong> ${supportAccountNote}
                </div>
                ` : ''}

                <p style="font-size: 12px; color: #64748b; margin: 20px 0 0; line-height: 1.4;">
                  Loop in CC: Account Management Team &amp; Administration.<br/>
                  Support Engineer: <strong>${actor.name}</strong> • Immense Air Operations.
                </p>
              </div>
            </div>
          `;

          await transporter.sendMail({
            from: `"Immense Air Support" <${defaultSmtpUser}>`,
            to: agentEmail,
            cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
            subject: emailSubject,
            html: emailHtml,
          });
          console.log(`[COMPLETE_ONBOARDING_SUPPORT] Dispatched credentials email to ${agentEmail}, cc: ${ccEmails.join(', ')}`);
        } catch (mailErr: any) {
          console.warn('[COMPLETE_ONBOARDING_SUPPORT] Could not send credentials email:', mailErr?.message);
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT'],
          title: `Account Created: ${onb.username}`,
          message: `Support (${actor.name}) created account ${onb.username} (URL: ${panelUrl}). Login credentials sent to Agent ${onb.agentName} (Loop: Account Manager & Admin).`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        break;
      }

      case 'CREATE_SUPPORT_TICKET': {
        if (!db.supportTickets) {
          db.supportTickets = [];
        }

        const onb = payload.onboardingId
          ? db.onboardingRequests.find((o) => o.id === payload.onboardingId)
          : undefined;

        const ticketId = makeId('tkt');
        const subject = String(payload.subject || 'Cross-Team Query / Support Assistance').trim();
        const description = String(payload.description || '').trim();
        const serviceCategory = String(payload.serviceCategory || 'General Query').trim();
        const priority = (payload.priority || 'HIGH') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
        const targetRole = (payload.targetRole || 'SUPPORT') as Role;
        const targetUserId = payload.targetUserId ? String(payload.targetUserId) : undefined;
        const targetUserName = payload.targetUserName ? String(payload.targetUserName) : undefined;

        const screenshotDataUrl = payload.screenshotDataUrl ? String(payload.screenshotDataUrl) : undefined;
        const screenshotName = payload.screenshotName ? String(payload.screenshotName) : undefined;

        // Auto-detect Agent and Account Manager context
        let agentId = onb?.agentId || (actorRole === 'AGENT' ? actor.id : undefined);
        let agentName = onb?.agentName || (actorRole === 'AGENT' ? actor.name : undefined);
        let accountManagerName = onb?.accountManagerName;

        if (!accountManagerName) {
          const amUser = db.users.find((u) => u.role === 'ACCOUNT_MANAGER');
          accountManagerName = amUser?.name || 'Neha Kapoor';
        }

        const clientUsername = onb ? onb.username : String(payload.username || 'general_query');
        const companyName = onb ? onb.companyName : String(payload.companyName || 'General / In-House');

        const initialMessages = [
          {
            id: makeId('msg'),
            senderId: actor.id,
            senderName: actor.name,
            senderRole: actorRole,
            text: description,
            screenshotDataUrl,
            screenshotName,
            createdAt: now,
          },
        ];

        const newTicket = {
          id: ticketId,
          onboardingId: onb?.id,
          username: clientUsername,
          companyName,
          fromUserId: actor.id,
          fromUserName: actor.name,
          fromUserRole: actorRole,
          targetRole,
          targetUserId,
          targetUserName,
          agentId,
          agentName,
          accountManagerName,
          serviceCategory,
          priority,
          subject,
          description,
          screenshotDataUrl,
          screenshotName,
          status: 'OPEN' as const,
          messages: initialMessages,
          createdAt: now,
          updatedAt: now,
        };

        db.supportTickets.unshift(newTicket);

        // Account-wise Logs: Automatically track in Lead / Client Timeline so Admin & AM see everything!
        const targetLead = onb?.leadId
          ? db.leads.find((l) => l.id === onb.leadId)
          : db.leads.find((l) => l.companyName.toLowerCase() === companyName.toLowerCase());

        if (targetLead) {
          targetLead.updatedAt = now;
          targetLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[Ticket ${ticketId.toUpperCase()}] Raised by ${actor.name} (${actorRole}) to ${targetRole} for @${clientUsername} — [${serviceCategory} | ${priority}] ${subject}: ${description}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        // Notification targets: Always notify Target Role, Target User, plus ADMIN and ACCOUNT_MANAGER
        const notifyRoles: Role[] = Array.from(new Set([targetRole, 'ADMIN', 'ACCOUNT_MANAGER', actorRole]));
        const notifyUserIds = targetUserId ? [targetUserId] : undefined;

        pushNotification(db.notifications, {
          targetRoles: notifyRoles,
          targetUserIds: notifyUserIds,
          title: `[Ticket ${ticketId.toUpperCase()}] ${actorRole} → ${targetRole}: @${clientUsername}`,
          message: `${actor.name} (${actorRole}) raised ticket to ${targetRole} for @${clientUsername} (${priority} priority). Subject: ${subject}`,
          type: 'SUPPORT_TICKET',
          relatedId: ticketId,
        });
        break;
      }

      case 'REPLY_TICKET_MESSAGE': {
        if (!db.supportTickets) {
          db.supportTickets = [];
        }
        const ticket = db.supportTickets.find((t) => t.id === payload.ticketId);
        if (!ticket) {
          return NextResponse.json(
            { ok: false, error: 'Ticket not found.' },
            { status: 404 }
          );
        }

        const replyText = String(payload.text || '').trim();
        const screenshotDataUrl = payload.screenshotDataUrl ? String(payload.screenshotDataUrl) : undefined;
        const screenshotName = payload.screenshotName ? String(payload.screenshotName) : undefined;

        if (!replyText && !screenshotDataUrl) {
          return NextResponse.json(
            { ok: false, error: 'Message text or screenshot is required.' },
            { status: 400 }
          );
        }

        if (!ticket.messages) {
          ticket.messages = [];
        }

        const replyMsg = {
          id: makeId('msg'),
          senderId: actor.id,
          senderName: actor.name,
          senderRole: actorRole,
          text: replyText,
          screenshotDataUrl,
          screenshotName,
          createdAt: now,
        };

        ticket.messages.push(replyMsg);
        ticket.status = 'IN_PROGRESS';
        ticket.updatedAt = now;

        // Log to lead activity timeline
        const targetLead = ticket.onboardingId
          ? db.leads.find((l) => l.id === ticket.onboardingId)
          : db.leads.find((l) => l.companyName.toLowerCase() === ticket.companyName.toLowerCase());
        if (targetLead) {
          targetLead.updatedAt = now;
          targetLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[Ticket ${ticket.id.toUpperCase()}] Reply by ${actor.name} (${actorRole}) — ${replyText}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        // Notify creator, target, admin, AM
        const notifyRoles: Role[] = Array.from(new Set([ticket.fromUserRole, ticket.targetRole, 'ADMIN', 'ACCOUNT_MANAGER']));
        pushNotification(db.notifications, {
          targetRoles: notifyRoles,
          title: `Reply on Ticket ${ticket.id.toUpperCase()}: @${ticket.username}`,
          message: `${actor.name} (${actorRole}) replied: ${replyText.slice(0, 80)}`,
          type: 'SUPPORT_TICKET',
          relatedId: ticket.id,
        });
        break;
      }

      case 'RESOLVE_SUPPORT_TICKET': {
        if (!db.supportTickets) {
          db.supportTickets = [];
        }
        const ticket = db.supportTickets.find((t) => t.id === payload.ticketId);
        if (!ticket) {
          return NextResponse.json(
            { ok: false, error: 'Support ticket not found.' },
            { status: 404 }
          );
        }

        const resolutionNote = String(payload.resolutionNote || 'Ticket resolved and verified.').trim();
        ticket.status = 'RESOLVED';
        ticket.supportResolutionNote = resolutionNote;
        ticket.resolvedBy = actor.name;
        ticket.resolvedAt = now;
        ticket.updatedAt = now;

        // Add closing resolution message into thread
        if (!ticket.messages) ticket.messages = [];
        ticket.messages.push({
          id: makeId('msg'),
          senderId: actor.id,
          senderName: actor.name,
          senderRole: actorRole,
          text: `[RESOLVED]: ${resolutionNote}`,
          createdAt: now,
        });

        // Log to lead activity timeline for complete account audit
        const onb = db.onboardingRequests.find((o) => o.id === ticket.onboardingId);
        const onbLead = onb && onb.leadId
          ? db.leads.find((l) => l.id === onb.leadId)
          : db.leads.find((l) => l.companyName.toLowerCase() === ticket.companyName.toLowerCase());
        if (onbLead) {
          onbLead.updatedAt = now;
          onbLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[Ticket ${ticket.id.toUpperCase()} Resolved] by ${actor.name} (${actorRole}) for @${ticket.username} — ${resolutionNote}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        const notifyRoles: Role[] = Array.from(new Set([ticket.fromUserRole, ticket.targetRole, 'ADMIN', 'ACCOUNT_MANAGER']));
        pushNotification(db.notifications, {
          targetRoles: notifyRoles,
          title: `Ticket Resolved: @${ticket.username}`,
          message: `${actor.name} (${actorRole}) marked ticket ${ticket.id.toUpperCase()} as Resolved. Note: ${resolutionNote}`,
          type: 'SUPPORT_TICKET',
          relatedId: ticket.id,
        });
        break;
      }

      case 'CREATE_RECHARGE': {
        const onb = db.onboardingRequests.find((o) => o.id === payload.onboardingId);
        if (!onb) {
          return NextResponse.json(
            { ok: false, error: 'Selected client account not found.' },
            { status: 404 }
          );
        }
        const isExternalCampaign = Boolean(payload.isExternalCampaign);
        const campaignTitle = payload.campaignTitle ? String(payload.campaignTitle).trim() : undefined;
        const amount = Number(payload.amount) || 0;
        const creditCount = Number(payload.creditCount) || 0;
        const paymentMode = (payload.paymentMode || 'PREPAID') as 'PREPAID' | 'POSTPAID' | 'NON_GST' | 'DEMO';
        const billingEntity = paymentMode === 'DEMO' ? undefined : String(payload.billingEntity || onb.billingEntity || onb.companyName).trim();
        const gstNumber = paymentMode === 'DEMO' || paymentMode === 'NON_GST' ? undefined : String(payload.gstNumber || onb.gstNumber || '').trim();
        const screenshotDataUrl = String(payload.screenshotDataUrl || '');
        const screenshotName = String(payload.screenshotName || 'client-message-proof.png');

        if ((amount <= 0 && creditCount <= 0) || !screenshotDataUrl) {
          return NextResponse.json(
            { ok: false, error: 'Value (Count or INR) and client supporting screenshot are required.' },
            { status: 400 }
          );
        }

        // If External Campaign OR DEMO mode: route DIRECTLY to Support first (APPROVED_FOR_SUPPORT)!
        // For External Campaign: Support will make Campaign LIVE with screenshot first -> then Billing gets regular reminder to create Tally Bill!
        const initialStatus = isExternalCampaign || paymentMode === 'DEMO' ? 'APPROVED_FOR_SUPPORT' : 'PENDING_APPROVAL';

        const rechargeId = makeId(isExternalCampaign ? 'cmp' : 'rec');
        const initialLogNote = isExternalCampaign
          ? `External Campaign Requested (${String(payload.service || 'SMS/RCS/WhatsApp')}) by ${actor.name} (${actorRole}) — ${creditCount.toLocaleString('en-IN')} Volume | Dispatched DIRECTLY to Support (Account Manager & Admin in loop).`
          : `Recharge Requested (${paymentMode}) by ${actor.name} (${actorRole}) — ${creditCount.toLocaleString('en-IN')} Credits (₹${amount.toLocaleString('en-IN')}).`;

        const newRecharge = {
          id: rechargeId,
          onboardingId: onb.id,
          companyName: onb.companyName,
          username: onb.username,
          service: String(payload.service || onb.services.join(', ')),
          isExternalCampaign,
          campaignTitle,
          creditCount: creditCount > 0 ? creditCount : undefined,
          amount,
          unitRate: String(payload.unitRate || onb.unitPrice || 'Standard Rate'),
          paymentMode,
          billingEntity,
          gstNumber,
          agentId: onb.agentId || actor.id,
          agentName: onb.agentName || actor.name,
          accountManagerName: onb.accountManagerName || 'Neha Kapoor',
          screenshotDataUrl,
          screenshotName,
          agentNotes: String(payload.agentNotes || ''),
          status: initialStatus as any,
          activityLogs: [
            {
              id: makeId('rlog'),
              actorName: actor.name,
              actorRole,
              action: isExternalCampaign ? 'EXTERNAL_CAMPAIGN_REQUESTED' : 'RECHARGE_REQUESTED',
              note: initialLogNote,
              createdAt: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };

        db.rechargeRequests.unshift(newRecharge);

        // Log to Lead Timeline for full Admin & AM audit
        const matchedLead = db.leads.find(
          (l) =>
            (onb.leadId && l.id === onb.leadId) ||
            l.companyName.toLowerCase() === onb.companyName.toLowerCase()
        );
        if (matchedLead) {
          matchedLead.updatedAt = now;
          matchedLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[${isExternalCampaign ? 'External Campaign' : 'Recharge'} ${rechargeId.toUpperCase()}] ${initialLogNote}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        if (isExternalCampaign) {
          pushNotification(db.notifications, {
            targetRoles: ['SUPPORT', 'ADMIN', 'ACCOUNT_MANAGER'],
            title: `🚀 External Campaign Request: @${onb.username} (${newRecharge.service})`,
            message: `${actor.name} (${actorRole}) requested an External Campaign (${creditCount.toLocaleString('en-IN')} count) for @${onb.username}. Please make campaign LIVE & attach proof screenshot. (Loop: AM ${newRecharge.accountManagerName} & Admin)`,
            type: 'RECHARGE',
            relatedId: rechargeId,
          });
        } else if (paymentMode === 'DEMO') {
          pushNotification(db.notifications, {
            targetRoles: ['SUPPORT', 'ADMIN', 'ACCOUNT_MANAGER'],
            title: `Demo Recharge Request: @${onb.username}`,
            message: `${actor.name} requested DEMO credits (${creditCount || amount}) for @${onb.username}. No Tally bill required — ready for Support panel execution.`,
            type: 'RECHARGE',
            relatedId: rechargeId,
          });
        } else {
          pushNotification(db.notifications, {
            targetRoles: ['BILLING', 'ADMIN', 'ACCOUNT_MANAGER'],
            title: `New Recharge Request for Tally Bill: @${onb.username}`,
            message: `${actor.name} raised a ${paymentMode} recharge request (₹${amount.toLocaleString('en-IN')}${creditCount ? ` / ${creditCount.toLocaleString('en-IN')} credits` : ''}) for ${billingEntity || onb.companyName}. Create Tally Bill & forward to Support.`,
            type: 'BILLING',
            relatedId: rechargeId,
          });
        }
        break;
      }

      case 'BILLING_CREATE_TALLY_AND_FORWARD': {
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Recharge request not found.' },
            { status: 404 }
          );
        }

        const invoiceNumber = String(payload.billingInvoiceNumber || '').trim();
        const taxInvoiceDataUrl = String(payload.billingTaxInvoiceDataUrl || '');
        const taxInvoiceName = String(payload.billingTaxInvoiceName || `${invoiceNumber || 'tally-bill'}.svg`);
        const paymentStatus = (payload.billingPaymentStatus || 'PAID') as PaymentStatus;
        const paymentNote = String(payload.billingPaymentNote || 'Tally bill created and verified.').trim();

        const totalAmt = Number(rec.amount || 0);
        let paidAmount =
          payload.paidAmount !== undefined
            ? Number(payload.paidAmount)
            : paymentStatus === 'PAID'
            ? totalAmt
            : paymentStatus === 'PENDING'
            ? 0
            : Math.round(totalAmt / 2);
        if (paidAmount < 0) paidAmount = 0;
        if (paidAmount > totalAmt) paidAmount = totalAmt;
        const balanceAmount = Math.max(0, totalAmt - paidAmount);

        if (!invoiceNumber || !taxInvoiceDataUrl) {
          return NextResponse.json(
            { ok: false, error: 'Tally Invoice Number and Tally Bill attachment are required.' },
            { status: 400 }
          );
        }

        rec.billingInvoiceNumber = invoiceNumber;
        rec.billingTaxInvoiceDataUrl = taxInvoiceDataUrl;
        rec.billingTaxInvoiceName = taxInvoiceName;
        rec.billingPaymentStatus = paymentStatus;
        rec.paidAmount = paidAmount;
        rec.balanceAmount = balanceAmount;
        rec.paymentUpdatedAt = now;
        rec.paymentUpdatedBy = actor.name;
        rec.billingPaymentNote = paymentNote;
        rec.billingCompletedBy = actor.name;
        rec.billingCompletedAt = now;
        rec.approvedBy = actor.name;
        rec.approvedAt = now;
        // If Support already made Campaign LIVE or Recharged (supportCompletedAt exists), mark final status as BILLED (Done)!
        // Otherwise send to Support (APPROVED_FOR_SUPPORT).
        const isAlreadyExecutedBySupport = Boolean(rec.supportCompletedAt) || rec.status === 'RECHARGE_COMPLETED';
        rec.status = isAlreadyExecutedBySupport ? 'BILLED' : 'APPROVED_FOR_SUPPORT';
        rec.updatedAt = now;

        if (!rec.activityLogs) rec.activityLogs = [];
        const logText = isAlreadyExecutedBySupport
          ? `Billing (${actor.name}) raised Tally Bill #${invoiceNumber} (${paymentStatus}) for LIVE External Campaign @${rec.username}. Campaign & Billing cycle complete!`
          : `Billing (${actor.name}) created Tally Bill #${invoiceNumber} (${paymentStatus}) and forwarded request to Support for panel top-up.`;

        rec.activityLogs.push({
          id: makeId('rlog'),
          actorName: actor.name,
          actorRole,
          action: 'TALLY_BILL_CREATED',
          note: logText,
          createdAt: now,
        });

        // Log to Lead Timeline
        const matchedOnb = db.onboardingRequests.find((o) => o.id === rec.onboardingId);
        const matchedLead = db.leads.find(
          (l) =>
            (matchedOnb?.leadId && l.id === matchedOnb.leadId) ||
            l.companyName.toLowerCase() === rec.companyName.toLowerCase()
        );
        if (matchedLead) {
          matchedLead.billingDate = now;
          matchedLead.updatedAt = now;
          matchedLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[Tally Bill #${invoiceNumber}] ${logText}`,
            billingDate: now,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        pushNotification(db.notifications, {
          targetRoles: ['SUPPORT', 'ADMIN', 'ACCOUNT_MANAGER', 'AGENT'],
          title: isAlreadyExecutedBySupport
            ? `✅ Tally Bill #${invoiceNumber} Raised for External Campaign: @${rec.username}`
            : `Tally Bill #${invoiceNumber} Created → Sent to Support: @${rec.username}`,
          message: logText,
          type: 'BILLING',
          relatedId: rec.id,
        });
        break;
      }

      case 'SEND_EXTERNAL_CAMPAIGN_BILLING_FOLLOWUP': {
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Campaign / Recharge entry not found.' },
            { status: 404 }
          );
        }

        const followUpMessage = String(
          payload.note ||
            `Reminder from Billing (${actor.name}): External Campaign for @${rec.username} (${rec.service}) is LIVE. Please confirm Billing Entity / GST / PO or Payment details so Tally Bill can be generated.`
        ).trim();

        rec.billingFollowUpCount = (rec.billingFollowUpCount || 0) + 1;
        rec.lastBillingReminderAt = now;
        rec.updatedAt = now;

        if (!rec.activityLogs) rec.activityLogs = [];
        rec.activityLogs.push({
          id: makeId('rlog'),
          actorName: actor.name,
          actorRole,
          action: 'BILLING_FOLLOWUP_REMINDER',
          note: followUpMessage,
          createdAt: now,
        });

        // Also log into Lead Timeline
        const matchedOnb = db.onboardingRequests.find((o) => o.id === rec.onboardingId);
        const matchedLead = db.leads.find(
          (l) =>
            (matchedOnb?.leadId && l.id === matchedOnb.leadId) ||
            l.companyName.toLowerCase() === rec.companyName.toLowerCase()
        );
        if (matchedLead) {
          matchedLead.updatedAt = now;
          matchedLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[Billing Follow-Up #${rec.billingFollowUpCount}] ${followUpMessage}`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        pushNotification(db.notifications, {
          targetRoles: ['AGENT', 'ACCOUNT_MANAGER', 'ADMIN'],
          targetUserIds: rec.agentId ? [rec.agentId] : undefined,
          title: `🔔 Billing Reminder (#${rec.billingFollowUpCount}): External Campaign @${rec.username}`,
          message: followUpMessage,
          type: 'BILLING',
          relatedId: rec.id,
        });
        break;
      }

      case 'UPDATE_EXTERNAL_CAMPAIGN_BILLING_DETAILS': {
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Campaign / Recharge entry not found.' },
            { status: 404 }
          );
        }

        if (payload.billingEntity) rec.billingEntity = String(payload.billingEntity).trim();
        if (payload.gstNumber !== undefined) rec.gstNumber = String(payload.gstNumber).trim();
        if (payload.amount !== undefined) rec.amount = Number(payload.amount) || rec.amount;
        if (payload.paymentMode) rec.paymentMode = payload.paymentMode;
        const updateNote = String(
          payload.note ||
            `${actor.name} (${actorRole}) confirmed Billing Details (Entity: ${rec.billingEntity}, GST: ${rec.gstNumber || 'Non-GST'}, Amount: ₹${rec.amount.toLocaleString('en-IN')}) — Ready for Tally Bill.`
        ).trim();

        rec.updatedAt = now;
        if (!rec.activityLogs) rec.activityLogs = [];
        rec.activityLogs.push({
          id: makeId('rlog'),
          actorName: actor.name,
          actorRole,
          action: 'AGENT_UPDATED_BILLING_DETAILS',
          note: updateNote,
          createdAt: now,
        });

        pushNotification(db.notifications, {
          targetRoles: ['BILLING', 'ADMIN', 'ACCOUNT_MANAGER'],
          title: `Billing Details Confirmed for External Campaign: @${rec.username}`,
          message: updateNote,
          type: 'BILLING',
          relatedId: rec.id,
        });
        break;
      }

      case 'APPROVE_RECHARGE': {
        if (actorRole !== 'ADMIN' && actorRole !== 'ACCOUNT_MANAGER' && actorRole !== 'BILLING') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin, Account Manager or Billing can approve recharge requests.' },
            { status: 403 }
          );
        }
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Recharge request not found.' },
            { status: 404 }
          );
        }
        rec.status = 'APPROVED_FOR_SUPPORT';
        rec.approvedBy = actor.name;
        rec.approvedAt = now;
        rec.updatedAt = now;

        pushNotification(db.notifications, {
          targetRoles: ['SUPPORT'],
          title: `Recharge Approved — Action Needed: ${rec.username}`,
          message: `${actor.name} approved ₹${rec.amount.toLocaleString('en-IN')} recharge for ${rec.username} (${rec.service}).`,
          type: 'RECHARGE',
          relatedId: rec.id,
        });
        pushNotification(db.notifications, {
          targetRoles: ['AGENT', 'ACCOUNT_MANAGER', 'ADMIN'],
          targetUserIds: [rec.agentId],
          title: `Recharge Approved: ${rec.username}`,
          message: `${actor.name} approved your recharge request and transferred it to Support.`,
          type: 'RECHARGE',
          relatedId: rec.id,
        });
        break;
      }

      case 'REJECT_RECHARGE': {
        if (actorRole !== 'ADMIN' && actorRole !== 'ACCOUNT_MANAGER' && actorRole !== 'BILLING') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin, Account Manager or Billing can reject recharge requests.' },
            { status: 403 }
          );
        }
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Recharge request not found.' },
            { status: 404 }
          );
        }
        rec.status = 'REJECTED';
        rec.rejectionReason = String(payload.reason || 'Details mismatch or clarification required');
        rec.updatedAt = now;

        pushNotification(db.notifications, {
          targetRoles: ['AGENT', 'ACCOUNT_MANAGER', 'ADMIN'],
          targetUserIds: [rec.agentId],
          title: `Recharge Rejected: ${rec.username}`,
          message: `${actor.name} rejected the recharge request: ${rec.rejectionReason}`,
          type: 'RECHARGE',
          relatedId: rec.id,
        });
        break;
      }

      case 'COMPLETE_RECHARGE_SUPPORT': {
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Recharge request not found.' },
            { status: 404 }
          );
        }

        const supportScreenshotDataUrl = payload.supportScreenshotDataUrl ? String(payload.supportScreenshotDataUrl) : undefined;
        const supportScreenshotName = payload.supportScreenshotName ? String(payload.supportScreenshotName) : undefined;

        // If Tally Bill was already created (or if DEMO mode), mark final status as BILLED (Done)!
        // For External Campaigns: Tally Bill is NOT created yet, so status becomes RECHARGE_COMPLETED (LIVE - Awaiting Billing Invoice & Regular Reminder!)
        const isFullyDone = Boolean(rec.billingInvoiceNumber) || rec.paymentMode === 'DEMO';
        rec.status = isFullyDone ? 'BILLED' : 'RECHARGE_COMPLETED';
        rec.supportConfirmedBy = actor.name;
        rec.supportRechargeNote = String(
          payload.supportRechargeNote ||
            (rec.isExternalCampaign
              ? `External Campaign (${rec.service}) made LIVE by Support (${actor.name}) for @${rec.username}.`
              : `Recharged ${rec.creditCount ? `${rec.creditCount.toLocaleString('en-IN')} credits` : `₹${rec.amount.toLocaleString('en-IN')}`} in @${rec.username}.`)
        );
        if (supportScreenshotDataUrl) {
          rec.supportScreenshotDataUrl = supportScreenshotDataUrl;
          rec.supportScreenshotName = supportScreenshotName || 'panel-recharge-proof.png';
        }
        rec.supportCompletedAt = now;
        rec.updatedAt = now;

        if (!rec.activityLogs) rec.activityLogs = [];
        const supportLogText = rec.isExternalCampaign
          ? `Support (${actor.name}) made External Campaign LIVE for @${rec.username} (${rec.service} • ${(rec.creditCount || 0).toLocaleString('en-IN')} count) and attached LIVE screenshot. Regular Billing Reminder activated!`
          : `Support (${actor.name}) completed panel recharge for @${rec.username} and attached confirmation screenshot.`;

        rec.activityLogs.push({
          id: makeId('rlog'),
          actorName: actor.name,
          actorRole,
          action: rec.isExternalCampaign ? 'EXTERNAL_CAMPAIGN_LIVE' : 'PANEL_RECHARGE_DONE',
          note: supportLogText,
          createdAt: now,
        });

        // Auto-sync into lead log timeline if matching lead exists
        const matchedOnb = db.onboardingRequests.find((o) => o.id === rec.onboardingId);
        if (matchedOnb) {
          const matchedLead = db.leads.find((l) =>
            (matchedOnb.leadId && l.id === matchedOnb.leadId) ||
            l.companyName.toLowerCase() === rec.companyName.toLowerCase()
          );
          if (matchedLead) {
            matchedLead.rechargeDate = now;
            matchedLead.updatedAt = now;
            matchedLead.callLogs.unshift({
              id: makeId('log'),
              type: 'NOTE',
              summary: `[${rec.isExternalCampaign ? 'External Campaign LIVE' : 'Panel Recharge Done'}] ${supportLogText}`,
              rechargeDate: now,
              createdBy: actor.name,
              creatorRole: actorRole,
              createdAt: now,
            });
          }
        }

        if (rec.isExternalCampaign && !rec.billingInvoiceNumber) {
          // Regular Billing Reminder to Billing Team!
          pushNotification(db.notifications, {
            targetRoles: ['BILLING', 'ADMIN', 'ACCOUNT_MANAGER'],
            title: `🔔 Billing Reminder: External Campaign LIVE for @${rec.username}`,
            message: `Support (${actor.name}) made External Campaign (${rec.service}) LIVE for @${rec.username}. Please follow up with Agent ${rec.agentName} or raise Tally Bill in Billing Section.`,
            type: 'BILLING',
            relatedId: rec.id,
          });
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT', 'BILLING'],
          title: rec.isExternalCampaign
            ? `🚀 External Campaign LIVE: @${rec.username}`
            : `Recharge Done ✅: @${rec.username}`,
          message: supportLogText,
          type: 'RECHARGE',
          relatedId: rec.id,
        });
        break;
      }

      case 'COMPLETE_BILLING_INVOICE': {
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Recharge entry not found.' },
            { status: 404 }
          );
        }
        const invoiceNumber = String(payload.billingInvoiceNumber || '').trim();
        const taxInvoiceDataUrl = String(payload.billingTaxInvoiceDataUrl || '');
        const taxInvoiceName = String(payload.billingTaxInvoiceName || 'tax-invoice.pdf');
        const paymentStatus = (payload.billingPaymentStatus || 'PAID') as PaymentStatus;
        const paymentNote = String(payload.billingPaymentNote || '').trim();

        if (!invoiceNumber || !taxInvoiceDataUrl) {
          return NextResponse.json(
            { ok: false, error: 'Tax Invoice number and Tax Invoice file are required.' },
            { status: 400 }
          );
        }

        // If Support has already completed recharge, mark BILLED (Done); otherwise move to APPROVED_FOR_SUPPORT
        const totalAmt = Number(rec.amount || 0);
        let paidAmount =
          payload.paidAmount !== undefined
            ? Number(payload.paidAmount)
            : paymentStatus === 'PAID'
            ? totalAmt
            : paymentStatus === 'PENDING'
            ? 0
            : Math.round(totalAmt / 2);
        if (paidAmount < 0) paidAmount = 0;
        if (paidAmount > totalAmt) paidAmount = totalAmt;
        const balanceAmount = Math.max(0, totalAmt - paidAmount);

        rec.status = rec.supportCompletedAt ? 'BILLED' : 'APPROVED_FOR_SUPPORT';
        rec.billingInvoiceNumber = invoiceNumber;
        rec.billingTaxInvoiceDataUrl = taxInvoiceDataUrl;
        rec.billingTaxInvoiceName = taxInvoiceName;
        rec.billingPaymentStatus = paymentStatus;
        rec.paidAmount = paidAmount;
        rec.balanceAmount = balanceAmount;
        rec.paymentUpdatedAt = now;
        rec.paymentUpdatedBy = actor.name;
        rec.billingPaymentNote = paymentNote;
        rec.billingCompletedBy = actor.name;
        rec.billingCompletedAt = now;
        rec.updatedAt = now;

        // Auto-sync into lead log timeline if matching lead exists
        const matchedOnb = db.onboardingRequests.find((o) => o.id === rec.onboardingId);
        if (matchedOnb) {
          const matchedLead = db.leads.find((l) =>
            (matchedOnb.leadId && l.id === matchedOnb.leadId) ||
            l.companyName.toLowerCase() === rec.companyName.toLowerCase()
          );
          if (matchedLead) {
            matchedLead.billingDate = now;
            if (paymentStatus === 'PAID') {
              matchedLead.paymentDate = now;
            }
            matchedLead.updatedAt = now;
            matchedLead.callLogs.unshift({
              id: makeId('log'),
              type: 'NOTE',
              summary: `Tally Bill Uploaded (${actor.name}) — Invoice: ${invoiceNumber} | Payment: ${paymentStatus} (Received: ₹${paidAmount.toLocaleString('en-IN')} / Balance Due: ₹${balanceAmount.toLocaleString('en-IN')})`,
              billingDate: now,
              paymentDate: paymentStatus === 'PAID' ? now : undefined,
              createdBy: actor.name,
              creatorRole: actorRole,
              createdAt: now,
            });
          }
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT', 'SUPPORT'],
          title: `Tally Tax Invoice Uploaded: ${invoiceNumber}`,
          message: `Billing (${actor.name}) uploaded Tally Tax Invoice ${invoiceNumber} for ${rec.companyName} (@${rec.username}).`,
          type: 'BILLING',
          relatedId: rec.id,
        });
        break;
      }

      case 'UPDATE_BILLING_PAYMENT': {
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (!rec) {
          return NextResponse.json(
            { ok: false, error: 'Billing / Recharge record not found.' },
            { status: 404 }
          );
        }

        const totalAmt = Number(rec.amount || 0);
        let paymentStatus = (payload.billingPaymentStatus || 'PAID') as PaymentStatus;
        let paidAmount =
          payload.paidAmount !== undefined
            ? Number(payload.paidAmount)
            : paymentStatus === 'PAID'
            ? totalAmt
            : paymentStatus === 'PENDING'
            ? 0
            : Number(rec.paidAmount || 0);

        if (paidAmount <= 0 && paymentStatus !== 'PAID') {
          paidAmount = 0;
          paymentStatus = 'PENDING';
        } else if (paidAmount >= totalAmt) {
          paidAmount = totalAmt;
          paymentStatus = 'PAID';
        } else {
          paymentStatus = 'PARTIAL';
        }

        const balanceAmount = Math.max(0, totalAmt - paidAmount);
        const paymentNote = String(
          payload.billingPaymentNote ||
            (paymentStatus === 'PAID'
              ? `Full payment of ₹${totalAmt.toLocaleString('en-IN')} received and settled.`
              : paymentStatus === 'PARTIAL'
              ? `Partial payment of ₹${paidAmount.toLocaleString('en-IN')} received. Pending Balance Due: ₹${balanceAmount.toLocaleString('en-IN')}.`
              : `Payment pending (₹${totalAmt.toLocaleString('en-IN')} due).`)
        ).trim();

        rec.billingPaymentStatus = paymentStatus;
        rec.paidAmount = paidAmount;
        rec.balanceAmount = balanceAmount;
        rec.billingPaymentNote = paymentNote;
        rec.paymentUpdatedAt = now;
        rec.paymentUpdatedBy = actor.name;

        if (payload.paymentProofDataUrl) {
          rec.paymentProofDataUrl = String(payload.paymentProofDataUrl);
          rec.paymentProofName = String(payload.paymentProofName || `payment-proof-${rec.username}.png`);
        }

        // If client promised a callback date for remaining balance or full payment
        if (payload.callbackDateTime) {
          rec.paymentCallbackReminder = {
            datetime: String(payload.callbackDateTime),
            note: String(payload.callbackNote || paymentNote || 'Client requested payment follow-up call on this date.'),
            scheduledBy: actor.name,
            completed: false,
            notified: false,
          };
        } else if (paymentStatus === 'PAID' && rec.paymentCallbackReminder) {
          rec.paymentCallbackReminder.completed = true;
        }

        rec.updatedAt = now;

        const callbackSuffix = payload.callbackDateTime
          ? ` | ⏰ Payment Callback Scheduled: ${new Date(String(payload.callbackDateTime)).toLocaleString('en-IN')}`
          : '';
        const logMessage = `Accounts Payment Follow-Up by ${actor.name} (${actorRole}) for Bill #${rec.billingInvoiceNumber || rec.id.toUpperCase()} — Status: ${paymentStatus} | Received: ₹${paidAmount.toLocaleString('en-IN')} | Pending Balance: ₹${balanceAmount.toLocaleString('en-IN')}${callbackSuffix}. Note: ${paymentNote}`;

        if (!rec.activityLogs) rec.activityLogs = [];
        rec.activityLogs.push({
          id: makeId('rlog'),
          actorName: actor.name,
          actorRole,
          action: 'PAYMENT_COLLECTION_UPDATED',
          note: logMessage,
          createdAt: now,
        });

        // Also sync into Lead Call/Activity Logs for 360° Timeline
        const matchedOnb = db.onboardingRequests.find((o) => o.id === rec.onboardingId);
        const matchedLead = db.leads.find(
          (l) =>
            (matchedOnb?.leadId && l.id === matchedOnb.leadId) ||
            l.companyName.toLowerCase() === rec.companyName.toLowerCase()
        );
        if (matchedLead) {
          if (paymentStatus === 'PAID') {
            matchedLead.paymentDate = now;
          }
          matchedLead.updatedAt = now;
          matchedLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: `[Payment Ledger Update] ${logMessage}`,
            paymentDate: paymentStatus === 'PAID' ? now : undefined,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        pushNotification(db.notifications, {
          targetRoles: ['AGENT', 'ACCOUNT_MANAGER', 'ADMIN', 'BILLING'],
          targetUserIds: rec.agentId ? [rec.agentId] : undefined,
          title: `💰 Payment Updated (${paymentStatus}): @${rec.username}`,
          message: logMessage,
          type: 'BILLING',
          relatedId: rec.id,
        });
        break;
      }

      case 'COMPLETE_PAYMENT_CALLBACK_REMINDER': {
        const rec = db.rechargeRequests.find((r) => r.id === payload.rechargeId);
        if (rec && rec.paymentCallbackReminder) {
          rec.paymentCallbackReminder.completed = true;
          rec.updatedAt = now;
        }
        break;
      }

      case 'ADD_PERSONAL_REMINDER': {
        const title = String(payload.title || '').trim();
        const datetime = String(payload.datetime || '').trim();
        if (!title || !datetime) {
          return NextResponse.json(
            { ok: false, error: 'Work title and date/time are required.' },
            { status: 400 }
          );
        }
        if (!db.personalReminders) db.personalReminders = [];
        db.personalReminders.unshift({
          id: makeId('prem'),
          userId: actor.id,
          userName: actor.name,
          userRole: actorRole,
          teamId: actor.teamId,
          title,
          note: String(payload.note || '').trim(),
          datetime,
          completed: false,
          createdAt: now,
        });
        break;
      }

      case 'COMPLETE_PERSONAL_REMINDER': {
        const list = db.personalReminders || [];
        const item = list.find((p) => p.id === payload.reminderId);
        if (item) {
          item.completed = true;
        }
        break;
      }

      case 'DELETE_PERSONAL_REMINDER': {
        if (db.personalReminders) {
          db.personalReminders = db.personalReminders.filter(
            (p) => p.id !== payload.reminderId
          );
        }
        break;
      }

      case 'MARK_NOTIFICATIONS_READ': {
        for (const n of db.notifications) {
          if (
            n.targetRoles.includes(actorRole) &&
            (!n.targetUserIds || n.targetUserIds.includes(actor.id)) &&
            !n.readBy.includes(actor.id)
          ) {
            n.readBy.push(actor.id);
          }
        }
        break;
      }

      case 'ADMIN_CREATE_TEAM': {
        if (actorRole !== 'ADMIN') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin can create teams.' },
            { status: 403 }
          );
        }
        const teamName = String(payload.name || '').trim();
        if (!teamName) {
          return NextResponse.json(
            { ok: false, error: 'Team name is required.' },
            { status: 400 }
          );
        }
        if (!db.teams) db.teams = [];
        db.teams.push({
          id: makeId('team'),
          name: teamName,
          description: String(payload.description || '').trim(),
          createdAt: now,
        });
        break;
      }

      case 'ADMIN_CREATE_USER': {
        if (actorRole !== 'ADMIN') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin can create user accounts.' },
            { status: 403 }
          );
        }
        const name = String(payload.name || '').trim();
        const email = String(payload.email || '').trim().toLowerCase();
        const password = String(payload.password || '123456').trim();
        const newRole = (String(payload.role || 'AGENT').toUpperCase() as Role);
        const teamId = payload.teamId ? String(payload.teamId) : undefined;
        const managerId = payload.managerId ? String(payload.managerId) : undefined;

        if (!name || !email || !VALID_ROLES.includes(newRole)) {
          return NextResponse.json(
            { ok: false, error: 'Valid name, email, and role are required.' },
            { status: 400 }
          );
        }
        if (db.users.some((u) => u.email.toLowerCase() === email)) {
          return NextResponse.json(
            { ok: false, error: 'A user with this email already exists.' },
            { status: 400 }
          );
        }

        const initials = name
          .split(/\s+/)
          .map((p) => p[0] || '')
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'US';

        const deptMap: Record<Role, string> = {
          ADMIN: 'Executive Management',
          ACCOUNT_MANAGER: 'Account Management',
          AGENT: 'Sales & Growth',
          SUPPORT: 'Technical Operations & Support',
          BILLING: 'Finance & Billing',
        };

        db.users.push({
          id: makeId(`usr-${newRole.toLowerCase()}`),
          name,
          email,
          password: password || '123456',
          role: newRole,
          teamId: newRole === 'ADMIN' ? undefined : teamId || 'team-a',
          managerId: newRole === 'ADMIN' || newRole === 'ACCOUNT_MANAGER' ? undefined : managerId,
          isActive: true,
          avatar: initials,
          department: deptMap[newRole],
          phone: String(payload.phone || '').trim() || undefined,
          designation: String(payload.designation || '').trim() || undefined,
        });
        break;
      }

      case 'ADMIN_UPDATE_USER_MAPPING': {
        if (actorRole !== 'ADMIN') {
          return NextResponse.json(
            { ok: false, error: 'Only Admin can map teams or update users.' },
            { status: 403 }
          );
        }
        const target = db.users.find((u) => u.id === payload.targetUserId);
        if (!target) {
          return NextResponse.json(
            { ok: false, error: 'User not found.' },
            { status: 404 }
          );
        }
        if (payload.name && String(payload.name).trim()) {
          const newName = String(payload.name).trim();
          target.name = newName;
          target.avatar =
            newName
              .split(/\s+/)
              .map((p) => p[0] || '')
              .join('')
              .toUpperCase()
              .slice(0, 2) || target.avatar;
        }
        if (payload.email && String(payload.email).trim()) {
          target.email = String(payload.email).trim().toLowerCase();
        }
        if (payload.role && VALID_ROLES.includes(payload.role)) {
          target.role = payload.role;
        }
        if (payload.teamId !== undefined) {
          target.teamId = target.role === 'ADMIN' ? undefined : payload.teamId || 'team-a';
        }
        if (payload.managerId !== undefined) {
          target.managerId =
            target.role === 'ADMIN' || target.role === 'ACCOUNT_MANAGER'
              ? undefined
              : payload.managerId || undefined;
        }
        if (payload.password && String(payload.password).trim()) {
          target.password = String(payload.password).trim();
        }
        if (typeof payload.isActive === 'boolean') {
          target.isActive = payload.isActive;
        }
        break;
      }

      case 'RESET_DEMO_DATA': {
        const fresh = createSeedDatabase();
        await writeDatabaseAsync(fresh);
        return NextResponse.json({
          ok: true,
          data: sanitizeForRole(fresh, actorRole, actor.id),
        });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    await writeDatabaseAsync(db);
    return NextResponse.json({
      ok: true,
      data: sanitizeForRole(db, actorRole, actor.id),
    });
  } catch (error) {
    console.error('POST /api/crm error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to process CRM action' },
      { status: 500 }
    );
  }
}
