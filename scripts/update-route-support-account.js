const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/app/api/crm/route.ts', 'utf8');

// 1. Add nodemailer & getEmailTransporter imports if not present
if (!code.includes("import { getEmailTransporter } from '@/lib/mailer';")) {
  code = `import { getEmailTransporter } from '@/lib/mailer';\n` + code;
}

// 2. Enhance COMPLETE_ONBOARDING_SUPPORT to:
// - Save panelUrl, panelPassword
// - Add log to lead: "Support Account Provisioned: URL: ..., Username: ..., Password: ..."
// - Email Agent with CC to Account Manager & Admin
const oldHandler = `      case 'COMPLETE_ONBOARDING_SUPPORT': {
        const onb = db.onboardingRequests.find((o) => o.id === payload.onboardingId);
        if (!onb) {
          return NextResponse.json(
            { ok: false, error: 'Onboarding request not found.' },
            { status: 404 }
          );
        }
        onb.status = 'ACCOUNT_CREATED';
        onb.supportCreatedBy = actor.name;
        onb.supportCreatedAt = now;
        onb.supportAccountNote = String(
          payload.supportAccountNote || \`Account "\${onb.username}" provisioned and credentials shared.\`
        );
        onb.updatedAt = now;

        const onbLead = onb.leadId
          ? db.leads.find((l) => l.id === onb.leadId)
          : db.leads.find((l) => l.companyName.toLowerCase() === onb.companyName.toLowerCase());
        if (onbLead) {
          onbLead.updatedAt = now;
          onbLead.callLogs.unshift({
            id: makeId('log'),
            type: 'NOTE',
            summary: \`Support Account Provisioned (\${actor.name}) for "\${onb.username}" — Credentials generated & ready.\`,
            createdBy: actor.name,
            creatorRole: actorRole,
            createdAt: now,
          });
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT'],
          title: \`Account Created: \${onb.username}\`,
          message: \`Support (\${actor.name}) created account \${onb.username} for \${onb.companyName}. Ready for recharge requests.\`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        break;
      }`;

const newHandler = `      case 'COMPLETE_ONBOARDING_SUPPORT': {
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
        onb.supportAccountNote = supportAccountNote || \`Account "\${onb.username}" created by \${actor.name} on \${panelUrl}.\`;
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
            summary: \`Support Account Created by \${actor.name} — Portal URL: \${panelUrl} | Username: \${onb.username}\${panelPassword ? \` | Password: \${panelPassword}\` : ''} (Dispatched via email to Agent \${onb.agentName}, loop: Account Manager & Admin)\`,
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

          const emailSubject = \`Account Created: @\${onb.username} — \${onb.companyName} [Portal Login Credentials]\`;
          const emailHtml = \`
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #0f2a5f, #1e1b4b); padding: 18px 24px; border-radius: 8px; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Client Portal Account Provisioned</h2>
                <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Immense Air Technical Support & Operations</p>
              </div>

              <div style="padding: 20px 0;">
                <p style="font-size: 14px; color: #1e293b; margin: 0 0 16px;">
                  Hello <strong>\${onb.agentName}</strong>,
                </p>
                <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
                  The requested client account for <strong>\${onb.companyName}</strong> has been successfully configured and activated on the portal. You may now share these credentials with the client:
                </p>

                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Portal URL:</td>
                      <td style="padding: 6px 0; color: #0284c7; font-weight: bold;"><a href="\${panelUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">\${panelUrl}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Account Username:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold;">\${onb.username}</td>
                    </tr>
                    \${panelPassword ? \`
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Password:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold; background: #e0f2fe; padding: 4px 8px; border-radius: 4px; display: inline-block;">\${panelPassword}</td>
                    </tr>
                    \` : ''}
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Services Configured:</td>
                      <td style="padding: 6px 0; color: #334155; font-weight: 600;">\${onb.services.join(', ')}</td>
                    </tr>
                    \${onb.whatsappMarketingRate || onb.whatsappUtilityRate ? \`
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">WhatsApp Rates:</td>
                      <td style="padding: 6px 0; color: #059669; font-weight: bold;">Marketing: ₹\${onb.whatsappMarketingRate || '0.80'} / msg • Utility: ₹\${onb.whatsappUtilityRate || '0.40'} / msg</td>
                    </tr>
                    \` : ''}
                    \${onb.obdRate ? \`
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">OBD Rate:</td>
                      <td style="padding: 6px 0; color: #7c3aed; font-weight: bold;">₹\${onb.obdRate} / 30s</td>
                    </tr>
                    \` : ''}
                  </table>
                </div>

                \${supportAccountNote ? \`
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #065f46;">
                  <strong>Support Note:</strong> \${supportAccountNote}
                </div>
                \` : ''}

                <p style="font-size: 12px; color: #64748b; margin: 20px 0 0; line-height: 1.4;">
                  Loop in CC: Account Management Team &amp; Administration.<br/>
                  Support Engineer: <strong>\${actor.name}</strong> • Immense Air Operations.
                </p>
              </div>
            </div>
          \`;

          await transporter.sendMail({
            from: \`"Immense Air Support" <\${defaultSmtpUser}>\`,
            to: agentEmail,
            cc: ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
            subject: emailSubject,
            html: emailHtml,
          });
          console.log(\`[COMPLETE_ONBOARDING_SUPPORT] Dispatched credentials email to \${agentEmail}, cc: \${ccEmails.join(', ')}\`);
        } catch (mailErr: any) {
          console.warn('[COMPLETE_ONBOARDING_SUPPORT] Could not send credentials email:', mailErr?.message);
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT'],
          title: \`Account Created: \${onb.username}\`,
          message: \`Support (\${actor.name}) created account \${onb.username} (URL: \${panelUrl}). Login credentials sent to Agent \${onb.agentName} (Loop: Account Manager & Admin).\`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        break;
      }`;

code = code.replace(oldHandler, newHandler);

fs.writeFileSync('D:/sale-crm/src/app/api/crm/route.ts', code, 'utf8');
console.log('Successfully updated COMPLETE_ONBOARDING_SUPPORT in route.ts with URL, username, password and loop email!');
