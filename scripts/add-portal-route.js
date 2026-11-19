const fs = require('fs');

let code = fs.readFileSync('D:/sale-crm/src/app/api/crm/route.ts', 'utf8');

// We want to add SAVE_PORTAL_CREDENTIALS action right before COMPLETE_ONBOARDING_SUPPORT:
const actionCode = `      case 'SAVE_PORTAL_CREDENTIALS': {
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
            summary: \`[\${serviceName}] Portal Login Saved by Support (\${actor.name}) — URL: \${portalUrl} | Username: \${username} | Password: \${password}\`,
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

          const emailSubject = \`[\${serviceName}] Login Credentials: \${onb.companyName} (@\${username})\`;
          const emailHtml = \`
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #0f2a5f, #1e1b4b); padding: 18px 24px; border-radius: 8px; color: #ffffff;">
                <h2 style="margin: 0; font-size: 18px; font-weight: bold;">\${serviceName} — Portal Login Credentials</h2>
                <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">Immense Air Technical Support & Operations</p>
              </div>

              <div style="padding: 20px 0;">
                <p style="font-size: 14px; color: #1e293b; margin: 0 0 14px;">
                  Hello <strong>\${onb.agentName}</strong>,
                </p>
                <p style="font-size: 13px; color: #475569; margin: 0 0 16px; line-height: 1.5;">
                  Support has configured and activated the <strong>\${serviceName}</strong> account for <strong>\${onb.companyName}</strong>. Details below:
                </p>

                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Service:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">\${serviceName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Portal URL:</td>
                      <td style="padding: 6px 0; color: #0284c7; font-weight: bold;"><a href="\${portalUrl}" target="_blank" style="color: #0284c7; text-decoration: underline;">\${portalUrl}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Username:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold;">\${username}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Password:</td>
                      <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold; background: #e0f2fe; padding: 3px 8px; border-radius: 4px; display: inline-block;">\${password}</td>
                    </tr>
                  </table>
                </div>

                \${supportNote ? \`
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #065f46;">
                  <strong>Support Note:</strong> \${supportNote}
                </div>
                \` : ''}

                <p style="font-size: 12px; color: #64748b; margin: 20px 0 0; line-height: 1.4;">
                  Loop in CC: Account Manager &amp; Admin.<br/>
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
        } catch (mailErr: any) {
          console.warn('[SAVE_PORTAL_CREDENTIALS] Email dispatch failed:', mailErr?.message);
        }

        pushNotification(db.notifications, {
          targetRoles: ['ADMIN', 'ACCOUNT_MANAGER', 'AGENT'],
          title: \`\${serviceName} Ready: \${onb.companyName}\`,
          message: \`Support (\${actor.name}) configured \${serviceName} login for @\${username}. Credentials saved & dispatched to Agent \${onb.agentName}.\`,
          type: 'ONBOARDING',
          relatedId: onb.id,
        });
        break;
      }
`;

const oldCase = `      case 'COMPLETE_ONBOARDING_SUPPORT': {`;
code = code.replace(oldCase, actionCode + '\n' + oldCase);

fs.writeFileSync('D:/sale-crm/src/app/api/crm/route.ts', code, 'utf8');
console.log('Successfully added SAVE_PORTAL_CREDENTIALS to route.ts!');
