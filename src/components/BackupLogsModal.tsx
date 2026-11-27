'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  HardDrive,
  History,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  UploadCloud,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { ActivityLogItem, CrmDatabase, Role, User } from '@/types/crm';
import { formatDateTime, formatINR, ROLE_META, RoleBadge } from './ui';

function toISTDate(iso?: string | null): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return (iso || '').slice(0, 10);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 10);
  } catch {
    return (iso || '').slice(0, 10);
  }
}

function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}

function triggerDownload(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function BackupLogsModal({
  db,
  currentUser,
  onClose,
  onAction,
  showToast,
}: {
  db: CrmDatabase;
  currentUser: User;
  onClose: () => void;
  onAction: (action: string, payload?: any) => Promise<boolean>;
  showToast: (type: 'success' | 'error', message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'MONTHLY' | 'SYSTEM_BACKUP' | 'LOGS'>('MONTHLY');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // e.g. '2026-11'
  );

  // Search & Filter for Activity Logs
  const [logSearch, setLogSearch] = useState('');
  const [logModuleFilter, setLogModuleFilter] = useState<string>('ALL');

  // Restore State
  const [restoreJson, setRestoreJson] = useState<CrmDatabase | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Generate Available Months from Leads & Recharges
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(new Date().toISOString().slice(0, 7));
    (db.leads || []).forEach((l) => {
      const ym = toISTDate(l.createdAt || l.leadDate).slice(0, 7);
      if (ym && ym.length === 7) monthsSet.add(ym);
    });
    (db.rechargeRequests || []).forEach((r) => {
      const ym = toISTDate(r.createdAt || r.billingCompletedAt).slice(0, 7);
      if (ym && ym.length === 7) monthsSet.add(ym);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [db.leads, db.rechargeRequests]);

  // Filtered dataset for selected month
  const monthData = useMemo(() => {
    const isAll = selectedMonth === 'ALL_TIME';
    const leads = (db.leads || []).filter((l) => {
      if (isAll) return true;
      const ym = toISTDate(l.createdAt || l.leadDate).slice(0, 7);
      return ym === selectedMonth;
    });

    const recharges = (db.rechargeRequests || []).filter((r) => {
      if (isAll) return true;
      const ym = toISTDate(r.createdAt || r.billingCompletedAt).slice(0, 7);
      return ym === selectedMonth;
    });

    const meets = (db.meetRequests || []).filter((m) => {
      if (isAll) return true;
      const ym = (m.scheduledDate || toISTDate(m.createdAt)).slice(0, 7);
      return ym === selectedMonth;
    });

    const onb = (db.onboardingRequests || []).filter((o) => {
      if (isAll) return true;
      const ym = toISTDate(o.createdAt || o.updatedAt).slice(0, 7);
      return ym === selectedMonth;
    });

    return { leads, recharges, meets, onb };
  }, [db, selectedMonth]);

  // 1. Export Month Leads CSV
  const handleExportLeadsCSV = () => {
    const headers = [
      'Lead ID',
      'Lead Date',
      'Client Name',
      'Company Name',
      'Designation',
      'Phone',
      'Email',
      'Location',
      'Status',
      'Service Interest',
      'Assigned Agent',
      'Remarks',
      'Created At',
    ];
    const rows = monthData.leads.map((l) => [
      l.id,
      l.leadDate || toISTDate(l.createdAt),
      l.clientName,
      l.companyName,
      l.designation || '',
      l.phone,
      l.email || '',
      l.cityLocation || '',
      l.status,
      l.serviceInterest,
      l.assignedToAgentName || 'Unassigned',
      l.feedbackRemark || '',
      toISTDate(l.createdAt),
    ]);

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');
    triggerDownload(csv, `immense_leads_${selectedMonth}.csv`);
    showToast('success', `Exported ${rows.length} leads for ${selectedMonth}`);
  };

  // 2. Export Month Call Logs CSV
  const handleExportCallLogsCSV = () => {
    const headers = [
      'Log ID',
      'Date (IST)',
      'Company Name',
      'Client Name',
      'Phone',
      'Logged By Agent',
      'Agent Role',
      'Call Status',
      'Services Discussed',
      'Quotation Sent',
      'Quotation Amount',
      'Call Note / Summary',
    ];

    const rows: string[][] = [];
    monthData.leads.forEach((l) => {
      (l.callLogs || []).forEach((cl) => {
        const logMonth = toISTDate(cl.createdAt).slice(0, 7);
        if (selectedMonth !== 'ALL_TIME' && logMonth !== selectedMonth) return;
        rows.push([
          cl.id,
          formatDateTime(cl.createdAt),
          l.companyName,
          l.clientName,
          l.phone,
          cl.createdBy || 'Unknown',
          cl.creatorRole || 'AGENT',
          cl.callConnectStatus || 'NOTE',
          (cl.servicesSelected || []).join('; '),
          cl.quotationSent ? 'YES' : 'NO',
          cl.quotationAmount ? String(cl.quotationAmount) : '',
          cl.summary || '',
        ]);
      });
    });

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');
    triggerDownload(csv, `immense_calling_logs_${selectedMonth}.csv`);
    showToast('success', `Exported ${rows.length} call logs for ${selectedMonth}`);
  };

  // 3. Export Month Recharges & Commercial Route Ledger CSV
  const handleExportRechargesCSV = () => {
    const headers = [
      'Recharge ID',
      'Date',
      'Company Name',
      'Panel Username',
      'Service',
      'Credits',
      'Commercial Route',
      'Amount (INR)',
      'Payment Mode',
      'Agent',
      'Status',
      'Invoice No',
    ];
    const rows = monthData.recharges.map((r) => [
      r.id,
      toISTDate(r.createdAt),
      r.companyName,
      r.username,
      r.service,
      String(r.creditCount || ''),
      r.rechargeBasis === 'ON_SUBMISSION' ? 'On Submission' : 'On Delivery',
      String(r.amount || 0),
      r.paymentMode || 'PREPAID',
      r.agentName,
      r.status,
      r.billingInvoiceNumber || '',
    ]);

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');
    triggerDownload(csv, `immense_recharges_route_ledger_${selectedMonth}.csv`);
    showToast('success', `Exported ${rows.length} recharges for ${selectedMonth}`);
  };

  // 4. Export Complete Full Database Backup (.JSON)
  const handleDownloadFullSystemBackup = () => {
    const backupJson = JSON.stringify(db, null, 2);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const timeStamp = new Date().toTimeString().slice(0, 5).replace(':', '-');
    triggerDownload(
      backupJson,
      `immense_crm_full_backup_${dateStamp}_${timeStamp}.json`,
      'application/json;charset=utf-8;'
    );
    showToast('success', 'Full CRM database backup downloaded successfully!');
  };

  // 5. Restore Database Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.users || !parsed.leads) {
          showToast('error', 'Invalid backup file! Must contain CRM users and leads data.');
          setRestoreJson(null);
          return;
        }
        setRestoreJson(parsed);
        showToast('success', `Backup valid: Contains ${parsed.leads.length} leads & ${parsed.rechargeRequests?.length || 0} recharges.`);
      } catch {
        showToast('error', 'Error reading JSON file. Please ensure it is valid JSON.');
        setRestoreJson(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restoreJson) return;
    const confirmText = window.prompt(
      `⚠️ CAUTION: Restoring will overwrite current live data with this backup file (${restoreJson.leads?.length || 0} leads).\nType "RESTORE" to proceed:`
    );
    if (confirmText !== 'RESTORE') {
      showToast('error', 'Restore cancelled.');
      return;
    }

    setIsRestoring(true);
    const ok = await onAction('RESTORE_DATABASE_BACKUP', { backupData: restoreJson });
    setIsRestoring(false);
    if (ok) {
      showToast('success', 'Database restored and permanently synced to cloud!');
      onClose();
    }
  };

  // 6. Filtered Activity Logs
  const filteredLogs = useMemo(() => {
    const all = db.activityLogs || [];
    return all.filter((l) => {
      if (logModuleFilter !== 'ALL' && l.module !== logModuleFilter) return false;
      if (logSearch) {
        const q = logSearch.toLowerCase().trim();
        return (
          l.actorName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [db.activityLogs, logModuleFilter, logSearch]);

  const handleExportActivityLogsCSV = () => {
    const headers = ['Log ID', 'Timestamp (IST)', 'Actor Name', 'Role', 'Module', 'Action', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      formatDateTime(l.timestamp),
      l.actorName,
      l.actorRole,
      l.module,
      l.action,
      l.details,
    ]);

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\r\n');
    triggerDownload(csv, `immense_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('success', `Exported ${rows.length} activity audit logs`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Admin Backup & Audit Logs Center
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Data Safety Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Month-wise data downloads, full system snapshots, and immutable activity audit logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('MONTHLY')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'MONTHLY'
                ? 'bg-white border-indigo-600 text-indigo-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Month-Wise Data Export
          </button>
          <button
            onClick={() => setActiveTab('SYSTEM_BACKUP')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'SYSTEM_BACKUP'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Full Backup & Restore (.JSON)
          </button>
          <button
            onClick={() => setActiveTab('LOGS')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'LOGS'
                ? 'bg-white border-amber-600 text-amber-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            Activity Audit Logs
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
              {(db.activityLogs || []).length}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: MONTH-WISE DATA DOWNLOAD */}
          {activeTab === 'MONTHLY' && (
            <div className="space-y-5">
              {/* Month Selector Bar */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Select Month for Data Export</div>
                    <div className="text-[11px] text-slate-500">
                      Download all company operations & financial records month-by-month
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL_TIME">All-Time Combined Data</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', {
                          month: 'long',
                          year: 'numeric',
                        })} ({m})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Month Snapshot Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Leads in Month</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">{monthData.leads.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Calling Touchpoints</div>
                  <div className="text-xl font-extrabold text-indigo-700 mt-0.5">
                    {monthData.leads.reduce((s, l) => s + (l.callLogs || []).length, 0)}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Demos & Meets</div>
                  <div className="text-xl font-extrabold text-amber-700 mt-0.5">{monthData.meets.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Recharges & Bills</div>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{monthData.recharges.length}</div>
                </div>
              </div>

              {/* Download Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Leads Export */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-indigo-300 transition shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">Leads & Contacts (CSV)</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      All lead profiles, client phone, email, status, and assigned sales agent.
                    </p>
                  </div>
                  <button
                    onClick={handleExportLeadsCSV}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Leads ({monthData.leads.length})
                  </button>
                </div>

                {/* 2. Calling Logs Export */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-violet-300 transition shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">Calling & Follow-Up Logs (CSV)</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Every call remark, connect status, and agent performance notes.
                    </p>
                  </div>
                  <button
                    onClick={handleExportCallLogsCSV}
                    className="w-full py-2.5 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Call Logs
                  </button>
                </div>

                {/* 3. Recharges & Route Ledger Export */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-emerald-300 transition shadow-2xs flex flex-col justify-between">
                  <div className="space-y-1.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900">Recharges & Routes (CSV)</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Commercial route separation (On Delivery vs On Submission), credits, and invoices.
                    </p>
                  </div>
                  <button
                    onClick={handleExportRechargesCSV}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Recharges ({monthData.recharges.length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM BACKUP & RESTORE */}
          {activeTab === 'SYSTEM_BACKUP' && (
            <div className="space-y-6">
              {/* Full Download Section */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Complete System Database Backup
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed max-w-xl">
                    Downloads an exact 100% snapshot of your CRM ({db.leads.length} leads, {db.users.length} users, {(db.rechargeRequests || []).length} recharges, meets, and activity logs). Keep this file safe on your computer or Google Drive.
                  </p>
                </div>
                <button
                  onClick={handleDownloadFullSystemBackup}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Download Full Backup (.json)
                </button>
              </div>

              {/* 1-Click Restore Section */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  Restore CRM Database from Backup File
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Agar kabhi bhi galti se koi data delete ho jaye ya aapko purana backup live karna ho, toh yahan apna downloaded `.json` backup file select karke restore karein.
                </p>

                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="crm-backup-upload-input"
                  />
                  <label
                    htmlFor="crm-backup-upload-input"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700">
                      {restoreFileName ? `Selected: ${restoreFileName}` : 'Click here to choose Backup .json file'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Supports files created via "Download Full Backup (.json)"
                    </span>
                  </label>
                </div>

                {restoreJson && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-amber-900 space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        ⚠️ Ready to Restore Database
                      </div>
                      <div>
                        Contains: <strong>{restoreJson.leads?.length || 0} Leads</strong>,{' '}
                        <strong>{restoreJson.rechargeRequests?.length || 0} Recharges</strong>,{' '}
                        <strong>{restoreJson.onboardingRequests?.length || 0} Onboarded Accounts</strong>.
                      </div>
                    </div>
                    <button
                      onClick={handleConfirmRestore}
                      disabled={isRestoring}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Restoring Data...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          Confirm & Restore Now
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY AUDIT LOGS */}
          {activeTab === 'LOGS' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by agent, company, or action..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={logModuleFilter}
                    onChange={(e) => setLogModuleFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">All Modules</option>
                    <option value="LEADS">Leads</option>
                    <option value="MEETS">Meets/Demos</option>
                    <option value="SUPPORT">Support</option>
                    <option value="BILLING">Billing</option>
                    <option value="RECHARGES">Recharges</option>
                    <option value="BACKUP">Backup</option>
                  </select>
                </div>
                <button
                  onClick={handleExportActivityLogsCSV}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-300" />
                  Export Logs (CSV)
                </button>
              </div>

              {/* Logs Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp (IST)</th>
                        <th className="py-2.5 px-3">Team Member</th>
                        <th className="py-2.5 px-3">Module</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Details / Audit Record</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                            No activity logs found matching filter.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {formatDateTime(item.timestamp)}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{item.actorName}</div>
                              <RoleBadge role={item.actorRole} />
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.module}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {item.action}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] leading-relaxed max-w-md">
                              {item.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
