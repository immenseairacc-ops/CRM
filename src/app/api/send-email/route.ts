import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { getEmailTransporter } from '@/lib/mailer';
import { readDatabaseAsync } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      to,
      cc,
      subject,
      text,
      html,
      proposalNumber,
      clientName,
      companyName,
      userId,
    } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Recipient email (to) is required.' },
        { status: 400 }
      );
    }

    let defaultSmtpUser = process.env.SMTP_USER || 'parvej@immenseair.in';
    let defaultSmtpPass = process.env.SMTP_PASS || 'Parvej@8586746';
    let defaultSmtpHost = process.env.SMTP_HOST || 'smtp.hostinger.com';
    let defaultSmtpPort = Number(process.env.SMTP_PORT || 465);
    let defaultImapHost = process.env.IMAP_HOST || 'imap.hostinger.com';
    let defaultImapPort = Number(process.env.IMAP_PORT || 993);

    let smtpUser = defaultSmtpUser;
    let smtpPass = defaultSmtpPass;
    let smtpHost = defaultSmtpHost;
    let smtpPort = defaultSmtpPort;
    let imapHost = defaultImapHost;
    let imapPort = defaultImapPort;

    // If userId provided, check if user has personal mail sign-in saved
    if (userId) {
      try {
        const db = await readDatabaseAsync();
        const matchedUser = db.users.find((u) => u.id === userId);
        const userMail = matchedUser?.mailConfig?.email;
        const userPass = matchedUser?.mailConfig?.password;

        // If the user's saved email is a real domain address and not a placeholder/fake domain
        if (
          userMail &&
          userPass &&
          !userMail.endsWith('@nexuscrm.in')
        ) {
          smtpUser = userMail;
          smtpPass = userPass;
          if (matchedUser.mailConfig?.smtpHost) smtpHost = matchedUser.mailConfig.smtpHost;
          if (matchedUser.mailConfig?.smtpPort) smtpPort = matchedUser.mailConfig.smtpPort;
          if (matchedUser.mailConfig?.imapHost) imapHost = matchedUser.mailConfig.imapHost;
          if (matchedUser.mailConfig?.imapPort) imapPort = matchedUser.mailConfig.imapPort;
        }
      } catch {
        // fallback to env
      }
    }

    if (!smtpUser || !smtpPass || smtpPass === 'your_hostinger_email_password_here') {
      return NextResponse.json(
        {
          success: false,
          needsConfig: true,
          error:
            'Hostinger SMTP is not configured yet. Please sign in with your email or update .env.local file.',
        },
        { status: 400 }
      );
    }

    const transporter = getEmailTransporter({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
    });

    // Verify SMTP connection with fallback
    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      // If user's specific SMTP login failed, fallback to the verified company Hostinger account
      if (smtpUser !== defaultSmtpUser && defaultSmtpUser && defaultSmtpPass) {
        console.warn(`User SMTP auth failed for ${smtpUser}, falling back to master Hostinger SMTP:`, verifyErr.message);
        smtpUser = defaultSmtpUser;
        smtpPass = defaultSmtpPass;
        smtpHost = defaultSmtpHost;
        smtpPort = defaultSmtpPort;
      } else {
        throw verifyErr;
      }
    }

    const activeTransporter = getEmailTransporter({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
    });

    const fromName = process.env.SMTP_FROM_NAME || 'Immense Air Pvt Ltd';
    const fromAddress = `"${fromName}" <${smtpUser}>`;

    // Process optional PDF / file attachment
    const attachments: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }> = [];

    if (body.pdfBase64) {
      const rawBase64 = String(body.pdfBase64);
      // Cleanly extract pure base64 whether sent as Data URI (data:application/pdf;filename=...;base64,...) or plain base64
      const pureBase64 = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;
      const pdfBuffer = Buffer.from(pureBase64, 'base64');
      
      attachments.push({
        filename: body.pdfFilename || `Business_Proposal_${proposalNumber ? String(proposalNumber).replace(/[^a-zA-Z0-9_-]/g, '_') : 'Proposal'}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const mailOptions = {
      from: fromAddress,
      to,
      cc: cc || undefined,
      subject: subject || `Business Proposal ${proposalNumber || ''} — Immense Air Pvt Ltd`,
      text,
      html,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const info = await activeTransporter.sendMail(mailOptions);

    // Automatically sync and append sent email with attachment to IMAP Sent folder (Hostinger Webmail)
    try {
      const streamTransport = nodemailer.createTransport({
        streamTransport: true,
        buffer: true,
      });
      const compiled = await streamTransport.sendMail(mailOptions);
      if (compiled && compiled.message) {
        const imapClient = new ImapFlow({
          host: imapHost,
          port: imapPort,
          secure: imapPort === 993,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          logger: false,
        });

        await imapClient.connect();
        // Check mailbox list to find proper Sent mailbox (e.g., 'INBOX.Sent' or 'Sent')
        const mailboxes = await imapClient.list();
        const sentBox =
          mailboxes.find(
            (m) =>
              m.specialUse === '\\Sent' ||
              m.path.toLowerCase().endsWith('sent') ||
              m.name.toLowerCase() === 'sent'
          )?.path || 'INBOX.Sent';

        const messageContent = Buffer.isBuffer(compiled.message)
          ? compiled.message
          : Buffer.from(compiled.message as any);

        await imapClient.append(sentBox, messageContent, ['\\Seen']);
        await imapClient.logout();
      }
    } catch (imapAppendErr) {
      // Log IMAP sync warning without failing the SMTP send response
      console.warn('Could not append to Sent folder:', imapAppendErr);
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (error: any) {
    console.error('SMTP Send Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send email through Hostinger SMTP.',
      },
      { status: 500 }
    );
  }
}
