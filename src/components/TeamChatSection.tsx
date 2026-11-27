'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  Search,
  Users,
  Hash,
  User,
  Shield,
  CheckCheck,
  Download,
  Eye,
  CornerDownRight,
  Phone,
  Mail,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { CrmDatabase, User as CrmUser, Role, ChatMessage, ChatAttachment, Lead } from '@/types/crm';
import { ROLE_META, formatDateTime } from './ui';

interface ChannelDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  allowedRoles?: Role[];
}

const CHANNELS: ChannelDef[] = [
  {
    id: 'all-announcements',
    name: 'all-announcements',
    description: 'Company-wide updates & management notices',
    icon: '📢',
  },
  {
    id: 'sales-team',
    name: 'sales-team',
    description: 'Lead discussions, daily targets & pitching strategies',
    icon: '💼',
  },
  {
    id: 'support-escalations',
    name: 'support-escalations',
    description: 'Technical route issues, DLT errors & sender ID approvals',
    icon: '🛠️',
  },
  {
    id: 'billing-accounts',
    name: 'billing-accounts',
    description: 'Recharge payment receipts, TDS certificates & invoice requests',
    icon: '💰',
  },
];

export function TeamChatSection({
  db,
  currentUser,
  onAction,
}: {
  db: CrmDatabase;
  currentUser: CrmUser;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAction: (action: string, payload?: Record<string, any>) => Promise<boolean>;
}) {
  const [activeTabType, setActiveTabType] = useState<'CHANNEL' | 'DM'>('CHANNEL');
  const [activeChannelId, setActiveChannelId] = useState<string>('all-announcements');
  const [activeTargetUserId, setActiveTargetUserId] = useState<string>('');

  const [messageText, setMessageText] = useState<string>('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available users for DM (excluding myself)
  const availableUsers = useMemo(() => {
    return (db.users || []).filter((u) => u.id !== currentUser.id && u.isActive !== false);
  }, [db.users, currentUser.id]);

  // Filtered direct message contacts
  const filteredContacts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return availableUsers;
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [availableUsers, searchTerm]);

  // Default selection for DM if none selected
  useEffect(() => {
    if (activeTabType === 'DM' && !activeTargetUserId && availableUsers.length > 0) {
      setActiveTargetUserId(availableUsers[0].id);
    }
  }, [activeTabType, activeTargetUserId, availableUsers]);

  // Active target user object
  const activeTargetUser = useMemo(() => {
    return (db.users || []).find((u) => u.id === activeTargetUserId);
  }, [db.users, activeTargetUserId]);

  // Active Channel object
  const activeChannel = useMemo(() => {
    return CHANNELS.find((c) => c.id === activeChannelId) || CHANNELS[0];
  }, [activeChannelId]);

  // Filtered messages for current active view
  const activeMessages = useMemo(() => {
    const all = db.chatMessages || [];
    if (activeTabType === 'CHANNEL') {
      return all.filter((m) => m.channelId === activeChannelId);
    } else {
      return all.filter(
        (m) =>
          !m.channelId &&
          ((m.senderId === currentUser.id && m.receiverId === activeTargetUserId) ||
            (m.senderId === activeTargetUserId && m.receiverId === currentUser.id))
      );
    }
  }, [db.chatMessages, activeTabType, activeChannelId, activeTargetUserId, currentUser.id]);

  // Mark messages as read whenever viewing
  useEffect(() => {
    if (activeTabType === 'CHANNEL') {
      onAction('MARK_CHAT_MESSAGES_READ', { channelId: activeChannelId });
    } else if (activeTabType === 'DM' && activeTargetUserId) {
      onAction('MARK_CHAT_MESSAGES_READ', { senderId: activeTargetUserId });
    }
  }, [activeTabType, activeChannelId, activeTargetUserId, activeMessages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Calculate unread count for channels & users
  const getUnreadForChannel = (channelId: string) => {
    return (db.chatMessages || []).filter(
      (m) => m.channelId === channelId && !m.readBy.includes(currentUser.id)
    ).length;
  };

  const getUnreadForUser = (userId: string) => {
    return (db.chatMessages || []).filter(
      (m) =>
        !m.channelId &&
        m.senderId === userId &&
        m.receiverId === currentUser.id &&
        !m.readBy.includes(currentUser.id)
    ).length;
  };

  // Handle file uploads (Images & Documents)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      reader.onload = () => {
        const url = reader.result as string;
        setPendingAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            type: isImg ? 'IMAGE' : 'FILE',
            url,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Support pasting screenshots directly with Ctrl + V
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            setPendingAttachments((prev) => [
              ...prev,
              {
                id: `att-paste-${Date.now()}`,
                name: `screenshot_${new Date().toISOString().slice(11, 19).replace(/:/g, '-')}.png`,
                type: 'IMAGE',
                url: reader.result as string,
                size: blob.size,
              },
            ]);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() && pendingAttachments.length === 0) return;

    setSending(true);

    const linkedLead = selectedLeadId ? (db.leads || []).find((l) => l.id === selectedLeadId) : null;

    const payload = {
      channelId: activeTabType === 'CHANNEL' ? activeChannelId : undefined,
      receiverId: activeTabType === 'DM' ? activeTargetUserId : undefined,
      text: messageText.trim(),
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      linkedLeadId: linkedLead?.id,
      linkedLeadName: linkedLead ? `${linkedLead.clientName} (${linkedLead.companyName})` : undefined,
    };

    const success = await onAction('SEND_CHAT_MESSAGE', payload);
    if (success) {
      setMessageText('');
      setPendingAttachments([]);
      setSelectedLeadId('');
    }
    setSending(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Top Banner / Heading */}
      <div className="bg-white rounded-2xl p-4 lg:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#061E44] via-[#0A2A5E] to-[#F2591F] text-white flex items-center justify-center shadow-md shadow-[#061E44]/20 shrink-0">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Team Chat &amp; Internal Collaboration Hub
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live Inter-Team Messenger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant 1-on-1 chats and department groups between <strong>Support</strong>, <strong>Agents</strong>, <strong>Billing</strong>, and <strong>Admin</strong> with image &amp; media sharing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500">
            Logged in as: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
          </span>
        </div>
      </div>

      {/* Main Chat Interface Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md grid grid-cols-1 lg:grid-cols-12 min-h-[680px] h-[calc(100vh-250px)] overflow-hidden">
        {/* Left Sidebar: Channels & Team Directory (lg:col-span-4) */}
        <div className="lg:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50">
          {/* Search Contacts Bar */}
          <div className="p-3.5 border-b border-slate-200/80 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search colleagues, support, billing..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:border-[#F2591F] transition"
              />
            </div>
          </div>

          {/* Directory Navigation Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-4">
            {/* 1. Group Channels */}
            <div>
              <div className="px-3 py-1.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Department Channels
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {CHANNELS.map((ch) => {
                  const unread = getUnreadForChannel(ch.id);
                  const isSelected = activeTabType === 'CHANNEL' && activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveTabType('CHANNEL');
                        setActiveChannelId(ch.id);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#061E44] text-white shadow-xs'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base shrink-0">{ch.icon}</span>
                        <div className="min-w-0 truncate">
                          <div className={`text-xs truncate font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            #{ch.name}
                          </div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                            {ch.description}
                          </div>
                        </div>
                      </div>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F2591F] text-white shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Direct Messages (1-on-1 Directory) */}
            <div className="pt-2">
              <div className="px-3 py-1.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Direct Messages ({filteredContacts.length})
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {filteredContacts.map((u) => {
                  const unread = getUnreadForUser(u.id);
                  const isSelected = activeTabType === 'DM' && activeTargetUserId === u.id;
                  const roleConfig = ROLE_META[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-700' };

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setActiveTabType('DM');
                        setActiveTargetUserId(u.id);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-[#061E44] text-white shadow-sm'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <span
                            className={`w-8 h-8 rounded-xl font-black text-[11px] flex items-center justify-center shadow-2xs ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-gradient-to-tr from-[#061E44] to-[#1E3A8A] text-white'
                            }`}
                          >
                            {u.avatar || u.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {u.name}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                                isSelected ? 'bg-white/20 text-slate-100' : roleConfig.color
                              }`}
                            >
                              {roleConfig.label}
                            </span>
                          </div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                            {u.department || u.email}
                          </div>
                        </div>
                      </div>

                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F2591F] text-white shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Area: Active Message Stream & Input (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white">
          {/* Active Chat Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-2xs">
            {activeTabType === 'CHANNEL' ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeChannel.icon}</span>
                <div>
                  <h2 className="text-sm font-black text-slate-900">#{activeChannel.name}</h2>
                  <p className="text-[11px] text-slate-500">{activeChannel.description}</p>
                </div>
              </div>
            ) : activeTargetUser ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#061E44] to-[#1E3A8A] text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {activeTargetUser.avatar || activeTargetUser.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-slate-900">{activeTargetUser.name}</h2>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${ROLE_META[activeTargetUser.role]?.color}`}>
                        {ROLE_META[activeTargetUser.role]?.label || activeTargetUser.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {activeTargetUser.department} • {activeTargetUser.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeTargetUser.phone && (
                    <a
                      href={`tel:${activeTargetUser.phone}`}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition text-xs flex items-center gap-1 font-semibold"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Messages Stream Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#F2591F]">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No messages here yet</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Start the conversation! You can type instructions, ask questions, and attach screenshots or files.
                </p>
              </div>
            ) : (
              activeMessages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const roleConfig = ROLE_META[msg.senderRole] || { label: msg.senderRole, color: 'bg-slate-100 text-slate-700' };

                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {!isMe && (
                      <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#061E44] to-[#1E3A8A] text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-2xs mt-1">
                        {msg.senderAvatar || msg.senderName.slice(0, 2).toUpperCase()}
                      </span>
                    )}

                    {/* Bubble Content */}
                    <div className={`max-w-[80%] sm:max-w-[70%] space-y-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Sender Meta */}
                      <div className={`flex items-center gap-2 text-[10px] ${isMe ? 'justify-end text-slate-400' : 'text-slate-500'}`}>
                        {!isMe && (
                          <>
                            <span className="font-bold text-slate-900">{msg.senderName}</span>
                            <span className={`font-semibold px-1.5 py-0.2 rounded-md ${roleConfig.color}`}>
                              {roleConfig.label}
                            </span>
                          </>
                        )}
                        <span>{formatDateTime(msg.createdAt)}</span>
                      </div>

                      {/* Linked Lead Tag if present */}
                      {msg.linkedLeadName && (
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-bold border shadow-2xs ${
                            isMe
                              ? 'bg-orange-50 border-orange-200 text-orange-950'
                              : 'bg-blue-50 border-blue-200 text-blue-950'
                          }`}
                        >
                          <CornerDownRight className="w-3.5 h-3.5 text-[#F2591F]" />
                          <span>Regarding Lead: {msg.linkedLeadName}</span>
                        </div>
                      )}

                      {/* Main Message Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl shadow-xs text-xs leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-[#061E44] to-[#152B5B] text-white rounded-tr-none'
                            : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                        {/* Media Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2.5 space-y-2">
                            {msg.attachments.map((att) => (
                              <div key={att.id}>
                                {att.type === 'IMAGE' ? (
                                  <div className="relative group overflow-hidden rounded-xl border border-white/20">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="max-h-56 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                                      onClick={() => setZoomedImage(att.url)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setZoomedImage(att.url)}
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white font-bold text-xs transition"
                                    >
                                      <Eye className="w-4 h-4" /> Click to Zoom
                                    </button>
                                  </div>
                                ) : (
                                  <a
                                    href={att.url}
                                    download={att.name}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition ${
                                      isMe
                                        ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                                    }`}
                                  >
                                    <FileText className="w-4 h-4 text-[#F2591F] shrink-0" />
                                    <div className="min-w-0 truncate text-xs font-semibold">
                                      <div className="truncate">{att.name}</div>
                                      {att.size && (
                                        <div className="text-[10px] opacity-70">
                                          {(att.size / 1024).toFixed(1)} KB
                                        </div>
                                      )}
                                    </div>
                                    <Download className="w-3.5 h-3.5 ml-auto shrink-0 opacity-70" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachments Strip */}
          {pendingAttachments.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Ready to Send:
              </span>
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-semibold flex items-center gap-2 shrink-0"
                >
                  {att.type === 'IMAGE' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span className="truncate max-w-[140px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                    className="p-0.5 text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat Composer / Message Input Box */}
          <form onSubmit={handleSendMessage} className="p-3.5 border-t border-slate-200 bg-white space-y-2">
            {/* Quick Actions Bar (Tag Lead, Paste Info) */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-semibold max-w-[220px] truncate focus:outline-none"
                >
                  <option value="">📎 Link a Lead to chat (Optional)...</option>
                  {(db.leads || []).slice(0, 30).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.clientName} ({l.companyName})
                    </option>
                  ))}
                </select>

                <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
                  💡 Tip: Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border text-slate-700 font-bold">Ctrl+V</kbd> to paste screenshots directly
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* File upload button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Image or Document"
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              >
                <Paperclip className="w-4 h-4 text-slate-600" />
              </button>

              <input
                type="text"
                placeholder={
                  activeTabType === 'CHANNEL'
                    ? `Message #${activeChannel.name}...`
                    : `Message ${activeTargetUser?.name || 'Colleague'}...`
                }
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onPaste={handlePaste}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/60 focus:bg-white focus:outline-none focus:border-[#F2591F] transition"
              />

              <button
                type="submit"
                disabled={sending || (!messageText.trim() && pendingAttachments.length === 0)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F2591F] to-[#E04B14] hover:from-[#E04B14] hover:to-[#C93F0F] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Modal for Zooming Images */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Zoomed attachment"
              className="max-h-[82vh] max-w-full rounded-xl object-contain mx-auto"
            />
            <div className="p-3 text-center">
              <a
                href={zoomedImage}
                download="crm_attachment.png"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#061E44] text-white text-xs font-bold shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Download Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
