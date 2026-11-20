'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Filter,
  Search,
  ShieldAlert,
} from 'lucide-react';
import errorsData from '@/data/errors.json';

interface ErrorCodeItem {
  operator: string;
  error_code: string;
  error_name: string;
  description: string;
  category: string;
  stage: string;
  retry: string;
  portal_action: string;
  source?: string;
  verification?: string;
}

const ALL_ERRORS = errorsData as ErrorCodeItem[];
const PAGE_SIZE = 50;

export function ErrorCodeHubSection() {
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const operators = useMemo(() => {
    const set = new Set<string>();
    ALL_ERRORS.forEach((e) => {
      if (e.operator) set.add(e.operator);
    });
    return Array.from(set).sort();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    ALL_ERRORS.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_ERRORS.filter((item) => {
      if (operatorFilter !== 'ALL' && item.operator !== operatorFilter) return false;
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        String(item.error_code || '').toLowerCase().includes(q) ||
        String(item.error_name || '').toLowerCase().includes(q) ||
        String(item.description || '').toLowerCase().includes(q) ||
        String(item.portal_action || '').toLowerCase().includes(q) ||
        String(item.operator || '').toLowerCase().includes(q)
      );
    });
  }, [search, operatorFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const copyErrorInfo = (item: ErrorCodeItem, key: string) => {
    const text = `[${item.operator}] Error ${item.error_code} (${item.error_name}): ${item.description} | Action: ${item.portal_action}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0A1B3F] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#F2591F]" />
            Immense Error Code Hub ({ALL_ERRORS.length.toLocaleString('en-IN')} Codes)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Instant operator DLT / SMS / SMPP error code lookup with retry status &amp; recommended portal action for Support &amp; Admin.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-extrabold text-[#F2591F] self-start md:self-auto">
          {filtered.length.toLocaleString('en-IN')} Matching Codes
        </div>
      </div>

      {/* Search & Operator / Category Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search error code (e.g. 600), name (ENTITY_NOT_FOUND), or action..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-[#0A1B3F]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operator Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setOperatorFilter('ALL');
              setPage(1);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              operatorFilter === 'ALL'
                ? 'bg-[#0A1B3F] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Operators
          </button>
          {operators.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => {
                setOperatorFilter(op);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                operatorFilter === op
                  ? 'bg-[#F2591F] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {pageItems.length === 0 ? (
          <div className="p-10 text-center space-y-1.5">
            <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No error codes found</div>
            <p className="text-xs text-slate-500">Try a different error code, keyword, or operator.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4">Operator &amp; Code</th>
                  <th className="py-3 px-4">Error Name &amp; Description</th>
                  <th className="py-3 px-4">Category / Retry</th>
                  <th className="py-3 px-4">Portal Action</th>
                  <th className="py-3 px-4 text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map((item, idx) => {
                  const key = `${item.operator}-${item.error_code}-${idx}`;
                  const isCopied = copiedId === key;
                  return (
                    <tr key={key} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#0A1B3F] text-white text-[10px] font-extrabold">
                            {item.operator}
                          </span>
                          <span className="font-mono font-black text-[#F2591F] text-sm">
                            {item.error_code}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{item.stage}</div>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-mono font-bold text-slate-900">
                          {item.error_name}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap space-y-1">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {item.category}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              String(item.retry).toUpperCase() === 'YES'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            Retry: {item.retry}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold text-[11px]">
                          {item.portal_action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => copyErrorInfo(item, key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
            <span className="text-slate-500">
              Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white disabled:opacity-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
