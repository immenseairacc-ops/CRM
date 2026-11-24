'use client';

import React, { useEffect, useState } from 'react';
import { openSmartTab } from '@/lib/openSmartTab';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { CrmDatabase, User as CrmUser } from '@/types/crm';
import { formatDateTime, Modal } from './ui';

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

export function InboxSection({
  currentUser,
  onAction,
}: {
  currentUser?: CrmUser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction?: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<InboxEmail | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [accountInfo, setAccountInfo] = useState<{
    account: string;
    configured: boolean;
    mailConnected: boolean;
    source: string;
    warning?: string;
  }>({
    account: currentUser?.mailConfig?.email || currentUser?.email || '',
    configured: Boolean(currentUser?.mailConfig?.email),
    mailConnected: Boolean(currentUser?.mailConfig?.email),
    source: 'INITIAL',
  });

  // 1-Click Mail Login Modal state for multiple users/agents
  const [signInOpen, setSignInOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState(currentUser?.mailConfig?.email || currentUser?.email || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginDesignation, setLoginDesignation] = useState(currentUser?.designation || '');
  const [loginPhone, setLoginPhone] = useState(currentUser?.phone || '');
  const [loginSignature, setLoginSignature] = useState(currentUser?.mailSignature || currentUser?.mailConfig?.signature || '');
  const [loginSignatureHtml, setLoginSignatureHtml] = useState(currentUser?.mailSignatureHtml || currentUser?.mailConfig?.signatureHtml || '');
  const [loginBusy, setLoginBusy] = useState(false);

  // Reply compose state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchInbox = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const url = currentUser ? `/api/inbox?userId=${encodeURIComponent(currentUser.id)}` : '/api/inbox';
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && Array.isArray(data.emails)) {
        setEmails(data.emails);
        setAccountInfo({
          account: data.account || currentUser?.mailConfig?.email || currentUser?.email || '',
          configured: data.configured,
          mailConnected: data.mailConnected !== false && data.source !== 'NOT_LOGGED_IN',
          source: data.source,
          warning: data.warning,
        });
        if (selectedEmail) {
          const updated = data.emails.find((e: InboxEmail) => e.id === selectedEmail.id);
          if (updated) setSelectedEmail(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load inbox:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(() => {
      fetchInbox();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoginBusy(true);
    try {
      if (onAction && currentUser) {
        const ok = await onAction('SAVE_USER_MAIL_CONFIG', {
          userId: currentUser.id,
          email: loginEmail,
          password: loginPassword,
          designation: loginDesignation.trim(),
          phone: loginPhone.trim(),
          signature: loginSignature.trim(),
          signatureHtml: loginSignatureHtml.trim() || undefined,
        });
        if (ok) {
          setSignInOpen(false);
          setLoginPassword('');
          await fetchInbox(true);
        }
      }
    } catch (err) {
      console.error('Failed to save mail config:', err);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          to: selectedEmail.from.address,
          cc: 'vikram.admin@nexuscrm.in',
          subject: selectedEmail.subject.startsWith('Re:')
            ? selectedEmail.subject
            : `Re: ${selectedEmail.subject}`,
          text: replyText,
          html: `<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">${replyText.replace(/\n/g, '<br/>')}</div>`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Reply sent to ${selectedEmail.from.address}!`);
        setReplyText('');
      } else {
        alert(data.error || 'Reply sent.');
        setReplyText('');
      }
    } catch {
      alert('Network error while sending reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const filteredEmails = emails.filter((e) => {
    if (filter === 'UNREAD' && e.seen) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.subject.toLowerCase().includes(q) ||
        e.from.name.toLowerCase().includes(q) ||
        e.from.address.toLowerCase().includes(q) ||
        e.snippet.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = emails.filter((e) => !e.seen).length;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Webmail &amp; Client Inbox
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
              {unreadCount} Unread
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-slate-600">
              {accountInfo.mailConnected ? (
                <>Active Mail: <strong>{accountInfo.account}</strong></>
              ) : (
                <>Your Mail: <strong>{currentUser?.email || 'Not Connected'}</strong></>
              )}
            </span>
            {accountInfo.mailConnected ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Synced
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                Not Logged In
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Login / Switch Email */}
          <button
            onClick={() => {
              setLoginEmail(currentUser?.mailConfig?.email || currentUser?.email || '');
              setLoginDesignation(currentUser?.designation || '');
              setLoginPhone(currentUser?.phone || '');
              setLoginSignature(
                currentUser?.mailSignature ||
                currentUser?.mailConfig?.signature ||
                `Warm regards,\n${currentUser?.name || 'Account Manager'}\n${currentUser?.designation || (currentUser?.role === 'ADMIN' ? 'General Manager' : 'Sales & Marketing')}\nImmense Air Pvt Ltd (Immense Smart Solutions)\nMobile: ${currentUser?.phone || '+91 9768566466'} | Email: ${currentUser?.mailConfig?.email || currentUser?.email || 'sales@immenseair.in'}\nWebsite: www.immenseair.in`
              );
              setLoginSignatureHtml(
                currentUser?.mailSignatureHtml ||
                currentUser?.mailConfig?.signatureHtml ||
                ''
              );
              setSignInOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition border border-blue-200"
            title="Sign in with your own email account to connect your personal inbox"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            {accountInfo.mailConnected ? 'Switch / Edit Mail' : 'Login Mail Account'}
          </button>

          {accountInfo.mailConnected && (
            <button
              type="button"
              onClick={async () => {
                if (!onAction || !currentUser) return;
                const ok = await onAction('LOGOUT_USER_MAIL_CONFIG', { userId: currentUser.id });
                if (ok) {
                  setEmails([]);
                  setSelectedEmail(null);
                  setAccountInfo((prev) => ({
                    ...prev,
                    mailConnected: false,
                    configured: false,
                    source: 'NOT_LOGGED_IN',
                  }));
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition border border-rose-200"
              title="Disconnect / Logout your mail account"
            >
              <LogOut className="w-3.5 h-3.5" />
              Mail Logout
            </button>
          )}

          <button
            onClick={() => fetchInbox(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => openSmartTab('hostinger', 'https://mail.hostinger.com')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Switch directly to your already-open Hostinger Mail tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Webmail
          </button>
        </div>
      </div>

      {/* Main Mailbox Grid OR Login Prompt if Mail Not Connected */}
      {!loading && !accountInfo.mailConnected ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0A1B3F] text-white flex items-center justify-center mx-auto shadow-md">
            <Mail className="w-7 h-7 text-[#F2591F]" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-extrabold text-[#0A1B3F]">
              Login to Your Personal Work Mail
            </h3>
            <p className="text-xs text-slate-500">
              Har user ka apna alag mailbox hota hai (<strong>{currentUser?.name}</strong>). Apna mail inbox aur client emails dekhne ke liye apne Hostinger / work email ID &amp; password se sign in karein.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoginEmail(currentUser?.email || '');
              setLoginDesignation(currentUser?.designation || '');
              setLoginPhone(currentUser?.phone || '');
              setSignInOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#F2591F] hover:bg-[#d94a14] text-white text-xs font-extrabold inline-flex items-center gap-2 shadow-md"
          >
            <LogIn className="w-4 h-4" />
            Login to {currentUser?.email || 'My Mail Account'}
          </button>
        </div>
      ) : (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left Side: Email List (5 cols) */}
        <div className={`lg:col-span-5 border-r border-slate-200 flex flex-col ${selectedEmail ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search sender, subject or text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    filter === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({emails.length})
                </button>
                <button
                  onClick={() => setFilter('UNREAD')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    filter === 'UNREAD'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Auto-syncs 15s
              </span>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[650px]">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                <p>Loading messages from mail server...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No emails match your search.
              </div>
            ) : (
              filteredEmails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => {
                      setSelectedEmail(email);
                      email.seen = true;
                    }}
                    className={`p-3.5 cursor-pointer transition text-left space-y-1 ${
                      isSelected
                        ? 'bg-blue-50/90 border-l-4 border-blue-600'
                        : email.seen
                        ? 'bg-white hover:bg-slate-50'
                        : 'bg-blue-50/40 hover:bg-blue-50/70 font-semibold'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!email.seen && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className={`truncate text-slate-900 ${!email.seen ? 'font-bold' : 'font-semibold'}`}>
                          {email.from.name || email.from.address}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {new Date(email.date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className={`text-xs text-slate-800 truncate ${!email.seen ? 'font-bold' : ''}`}>
                      {email.subject}
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {email.snippet}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Email Reader & Reply Composer (7 cols) */}
        <div className={`lg:col-span-7 flex flex-col bg-slate-50/30 ${selectedEmail ? 'flex' : 'hidden lg:flex'}`}>
          {selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Reader Header */}
              <div className="p-4 bg-white border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1 text-xs font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {selectedEmail.folder}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(selectedEmail.date)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedEmail.subject}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      {selectedEmail.from.name ? selectedEmail.from.name[0] : 'U'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {selectedEmail.from.name} &lt;{selectedEmail.from.address}&gt;
                      </div>
                      <div className="text-[11px] text-slate-500">
                        To: {selectedEmail.to}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-5 overflow-y-auto bg-white space-y-4 max-h-[400px]">
                {selectedEmail.html ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800 text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                  />
                ) : (
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedEmail.text || selectedEmail.snippet}
                  </div>
                )}
              </div>

              {/* Quick Reply Box */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  Quick Reply to {selectedEmail.from.name || selectedEmail.from.address}
                </div>
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Write your response here... (auto-replies via ${accountInfo.account})`}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    CC: vikram.admin@nexuscrm.in (Manager/Admin copy included)
                  </span>
                  <button
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingReply ? 'Sending Reply...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MailOpen className="w-12 h-12 text-slate-300 mb-3" />
              <div className="text-sm font-semibold text-slate-700">
                Select an email from the left to read
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                View full message conversation, client requests, attachments, and reply directly from this CRM panel.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 1-Click Connect / Sign-in Mail Account Modal */}
      {signInOpen && (
        <Modal
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          title="Connect Your Email Account (1-Time Sign-In)"
          subtitle={`Har user / agent apna email ek baar sign in karega toh unka account CRM me permanent save ho jayega.`}
        >
          <form onSubmit={handleSignInSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Single Sign-In for Multiple Users:</strong>
                <p className="mt-0.5 text-blue-700">
                  Aapke team ke alag-alag agents / managers ko baar-baar settings me jaane ki zaroorat nahi hogi. Har user ka apna email aur inbox unke profile ke sath connect ho jayega.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hostinger / Corporate Email Address *
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="e.g. rahul@immenseair.in"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Password *
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter email account password"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation / Role in Company
                </label>
                <input
                  type="text"
                  value={loginDesignation}
                  onChange={(e) => setLoginDesignation(e.target.value)}
                  placeholder="e.g. Sales & Marketing Manager"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Direct Mobile / WhatsApp Number
                </label>
                <input
                  type="text"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="e.g. +91 9768566466"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Custom Mail Signature (Auto-appended on Proposals &amp; Replies)
                </label>
                <div className="flex items-center gap-1.5">
                  <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-semibold cursor-pointer transition shadow-xs" title="Upload Word Document (.docx) or Text file (.txt) to import signature">
                    <Upload className="w-3 h-3 text-blue-600" />
                    <span>Upload Word / Docx</span>
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
                            setLoginSignature(json.text);
                            if (json.html) {
                              setLoginSignatureHtml(json.html);
                            }
                          } else {
                            alert(json.error || 'Failed to read document');
                          }
                        } catch {
                          alert('Error uploading document file');
                        }
                      }}
                    />
                  </label>
                  <span className="text-[10px] text-slate-400">Word file (.docx) se auto-fill</span>
                </div>
              </div>
              <textarea
                rows={4}
                value={loginSignature}
                onChange={(e) => setLoginSignature(e.target.value)}
                placeholder="Warm regards,&#10;Agent Name&#10;Designation&#10;Immense Air Pvt Ltd&#10;Mobile: +91 9xxxxxxxxx | Email: agent@immenseair.in"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                💡 Tip: Aap apna signature Word file (.docx) ya text file (.txt) me upload kar sakte hain, ya direct upar edit kar sakte hain.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Standard IMAP (993) &amp; SMTP (465)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSignInOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginBusy}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {loginBusy ? 'Connecting...' : 'Sign In & Connect'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
