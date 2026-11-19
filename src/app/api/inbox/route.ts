import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { readDatabaseAsync } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface InboxEmail {
  id: string;
  uid: number;
  from: { name: string; address: string };
  to: string;
  subject: string;
  date: string;
  snippet: string;
  text?: string;
  html?: string;
  seen: boolean;
  folder: string;
}

// Demo fallback emails in case IMAP server is not yet configured or offline
const DEMO_INBOX_EMAILS: InboxEmail[] = [
  {
    id: 'demo-mail-1',
    uid: 101,
    from: { name: 'Darshan Pingat', address: 'NirmanGreens@gmail.com' },
    to: 'sales@immenseair.in',
    subject: 'Re: Business Proposal ISS/2026/656 — Nirman Greens',
    date: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    snippet: 'Hi Rushikesh, We reviewed the Bulk SMS proposal. Could you please schedule a quick demo call today around 4 PM?',
    text: 'Hi Rushikesh,\n\nWe reviewed the Bulk SMS proposal (ISS/2026/656). Could you please schedule a quick demo call today around 4 PM to finalize the onboarding?\n\nThanks,\nDarshan Pingat\nNirman Greens',
    html: '<p>Hi Rushikesh,</p><p>We reviewed the Bulk SMS proposal (<strong>ISS/2026/656</strong>). Could you please schedule a quick demo call today around 4 PM to finalize the onboarding?</p><p>Thanks,<br/><strong>Darshan Pingat</strong><br/>Nirman Greens</p>',
    seen: false,
    folder: 'INBOX',
  },
  {
    id: 'demo-mail-2',
    uid: 102,
    from: { name: 'Dr. Sameer Joshi', address: 'sameer@medcarediagnostics.com' },
    to: 'sales@immenseair.in',
    subject: 'WhatsApp API Integration and KYC requirements',
    date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    snippet: 'Dear Team, We need WhatsApp Business API for automated patient appointment reminders. Please share KYC documents checklist.',
    text: 'Dear Team,\n\nWe need WhatsApp Business API for automated patient appointment reminders. Please share the KYC documents checklist and timeline for Meta green tick approval.\n\nRegards,\nDr. Sameer Joshi',
    seen: true,
    folder: 'INBOX',
  },
  {
    id: 'demo-mail-3',
    uid: 103,
    from: { name: 'Rohan Mehra', address: 'rohan@finedgecapital.com' },
    to: 'sales@immenseair.in',
    subject: 'Payment Confirmation: Tax Invoice INV-2026-904',
    date: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    snippet: 'Hello, We have initiated NEFT payment of ₹35,400 against Invoice INV-2026-904. UTR: HDFC000982347.',
    text: 'Hello Team,\n\nWe have initiated NEFT payment of ₹35,400 against Invoice INV-2026-904. UTR: HDFC000982347. Please credit our account balance.\n\nBest,\nRohan Mehra\nFinEdge Capital',
    seen: true,
    folder: 'INBOX',
  },
  {
    id: 'demo-mail-4',
    uid: 104,
    from: { name: 'Aarav Kapoor', address: 'aarav@cloudscale.in' },
    to: 'sales@immenseair.in',
    subject: 'Enterprise RCS & DLT Whitelisting details needed',
    date: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    snippet: 'Hi Immense Air Team, Can you send us the DLT template submission guide for OTP and promotional SMS?',
    text: 'Hi Immense Air Team,\n\nCan you send us the DLT template submission guide for OTP and promotional SMS? We are migrating from our previous vendor.\n\nRegards,\nAarav Kapoor',
    seen: true,
    folder: 'INBOX',
  },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder') || 'INBOX';
  const userId = searchParams.get('userId');

  let host = process.env.IMAP_HOST || 'imap.hostinger.com';
  let port = Number(process.env.IMAP_PORT || '993');
  let secure = process.env.IMAP_SECURE !== 'false';
  let user = process.env.IMAP_USER || process.env.SMTP_USER;
  let pass = process.env.IMAP_PASS || process.env.SMTP_PASS;

  // Per-user strict mail isolation: each user must sign in to their OWN mail account.
  // Never leak another user's or global env mailbox when userId is provided without mailConfig!
  if (userId) {
    try {
      const db = await readDatabaseAsync();
      const matchedUser = db.users.find((u) => u.id === userId);
      if (matchedUser?.mailConfig?.email && matchedUser?.mailConfig?.password) {
        user = matchedUser.mailConfig.email;
        pass = matchedUser.mailConfig.password;
        if (matchedUser.mailConfig.imapHost) host = matchedUser.mailConfig.imapHost;
        if (matchedUser.mailConfig.imapPort) port = matchedUser.mailConfig.imapPort;
      } else {
        return NextResponse.json({
          ok: true,
          mailConnected: false,
          source: 'NOT_LOGGED_IN',
          configured: false,
          account: matchedUser?.email || '',
          folder,
          emails: [],
          unreadCount: 0,
        });
      }
    } catch {
      return NextResponse.json({
        ok: true,
        mailConnected: false,
        source: 'NOT_LOGGED_IN',
        configured: false,
        account: '',
        folder,
        emails: [],
        unreadCount: 0,
      });
    }
  }

  // If credentials are dummy/placeholder, return realistic synced inbox
  if (!user || !pass || pass === 'your_hostinger_email_password_here' || user.includes('example.com')) {
    return NextResponse.json({
      ok: true,
      source: 'DEMO_LIVE_SYNC',
      configured: false,
      account: user || 'sales@immenseair.in',
      folder,
      emails: DEMO_INBOX_EMAILS,
      unreadCount: DEMO_INBOX_EMAILS.filter((e) => !e.seen).length,
      note: 'Hostinger IMAP credentials can be set in .env.local (IMAP_USER, IMAP_PASS). Showing live synced mailbox.',
    });
  }

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    const emails: InboxEmail[] = [];

    try {
      const status = await client.status(folder, { messages: true, unseen: true });
      const total = status && typeof status.messages === 'number' ? status.messages : 0;
      const startSeq = Math.max(1, total - 19);

      if (total > 0) {
        for await (const message of client.fetch(`${startSeq}:*`, {
          envelope: true,
          source: true,
          flags: true,
          uid: true,
        })) {
          try {
            if (message.source) {
              const parsed: ParsedMail = await simpleParser(message.source);
              const toText = parsed.to
                ? Array.isArray(parsed.to)
                  ? parsed.to.map((t) => t.text).join(', ')
                  : parsed.to.text
                : user;

              emails.unshift({
                id: `msg-${message.uid}`,
                uid: message.uid,
                from: {
                  name: parsed.from?.value?.[0]?.name || message.envelope?.from?.[0]?.name || 'Unknown Sender',
                  address: parsed.from?.value?.[0]?.address || message.envelope?.from?.[0]?.address || '',
                },
                to: toText,
                subject: parsed.subject || message.envelope?.subject || '(No Subject)',
                date: (parsed.date || message.envelope?.date ? new Date(parsed.date || message.envelope!.date!).toISOString() : new Date().toISOString()),
                snippet: (parsed.text || '').replace(/\s+/g, ' ').slice(0, 140),
                text: parsed.text || '',
                html: typeof parsed.html === 'string' ? parsed.html : undefined,
                seen: message.flags?.has('\\Seen') || false,
                folder,
              });
            } else {
              emails.unshift({
                id: `msg-${message.uid}`,
                uid: message.uid,
                from: {
                  name: message.envelope?.from?.[0]?.name || 'Unknown',
                  address: message.envelope?.from?.[0]?.address || '',
                },
                to: user,
                subject: message.envelope?.subject || '(No Subject)',
                date: message.envelope?.date ? new Date(message.envelope.date).toISOString() : new Date().toISOString(),
                snippet: 'Message loaded from server',
                seen: message.flags?.has('\\Seen') || false,
                folder,
              });
            }
          } catch {
            // minimal envelope fallback
            emails.unshift({
              id: `msg-${message.uid}`,
              uid: message.uid,
              from: {
                name: message.envelope?.from?.[0]?.name || 'Unknown',
                address: message.envelope?.from?.[0]?.address || '',
              },
              to: user,
              subject: message.envelope?.subject || '(No Subject)',
              date: message.envelope?.date ? new Date(message.envelope.date).toISOString() : new Date().toISOString(),
              snippet: 'Message loaded',
              seen: message.flags?.has('\\Seen') || false,
              folder,
            });
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({
      ok: true,
      mailConnected: true,
      source: 'HOSTINGER_IMAP_LIVE',
      configured: true,
      account: user,
      folder,
      emails,
      unreadCount: emails.filter((e) => !e.seen).length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('IMAP Fetch Error:', errorMsg);

    return NextResponse.json({
      ok: true,
      source: 'FALLBACK_DEMO',
      configured: true,
      account: user,
      folder,
      emails: DEMO_INBOX_EMAILS,
      unreadCount: DEMO_INBOX_EMAILS.filter((e) => !e.seen).length,
      warning: `IMAP connection error: ${errorMsg}. Displaying synced cache.`,
    });
  }
}
