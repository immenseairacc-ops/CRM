'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  Copy,
  Check,
  ShieldAlert,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import errorsData from '@/data/errors.json';

export interface ErrorCodeEntry {
  operator: string;
  error_code: string;
  error_name: string;
  description: string;
  category: string;
  retry: string;
  portal_action: string;
  stage: string;
}

const ALL_ERRORS: ErrorCodeEntry[] = errorsData as ErrorCodeEntry[];
const PAGE_SIZE = 30;

const OPERATOR_LOGOS: Record<string, string> = {
  jio: '/operators/jio-logo.png',
  airtel: '/operators/airtel-logo.png',
  vi: '/operators/vi-logo.jpg',
  smartping: '/operators/smartping-logo.png',
};

function getOperatorLogo(operator: string): string | null {
  return OPERATOR_LOGOS[operator.toLowerCase()] ?? null;
}

export function ErrorCodeHubSection() {
  const [search, setSearch] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const operators = useMemo(() => {
    const set = new Set(ALL_ERRORS.map((e) => e.operator).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, []);

  const categories = useMemo(() => {
    const set = new Set(ALL_ERRORS.map((e) => e.category).filter(Boolean));
    return ['ALL', ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_ERRORS.filter((e) => {
      if (selectedOperator !== 'ALL' && e.operator !== selectedOperator) return false;
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        e.error_code.toLowerCase().includes(q) ||
        e.error_name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.portal_action.toLowerCase().includes(q) ||
        e.operator.toLowerCase().includes(q)
      );
    });
  }, [search, selectedOperator, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCopy = (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative w-full md:max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search code (e.g. 600), name, or action..."
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Operator Pills with Logos */}
        <div className="flex flex-wrap items-center gap-2">
          {operators.map((op) => {
            const active = selectedOperator === op;
            const logo = op !== 'ALL' ? getOperatorLogo(op) : null;
            return (
              <button
                key={op}
                onClick={() => {
                  setSelectedOperator(op);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {logo && (
                  <img
                    src={logo}
                    alt={op}
                    className="w-4 h-4 rounded-full object-contain bg-white"
                  />
                )}
                <span>{op === 'ALL' ? 'All Operators' : op}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Box-Wise 3-Column Card Grid */}
      {pageItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          No error codes found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pageItems.map((item, idx) => {
            const cardKey = `${item.operator}-${item.error_code}-${idx}`;
            const logo = getOperatorLogo(item.operator);
            const isRetryYes = item.retry.toUpperCase() === 'YES';

            return (
              <div
                key={cardKey}
                className="bg-white rounded-2xl border border-slate-200 border-t-[3px] border-t-orange-500 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3"
              >
                {/* Top Row: Operator Logo + Code | Category Pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {logo ? (
                      <img
                        src={logo}
                        alt={item.operator}
                        className="w-6 h-6 rounded-full object-contain border border-slate-200 bg-white shrink-0"
                      />
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px] shrink-0">
                        {item.operator}
                      </span>
                    )}
                    <span className="font-mono font-extrabold text-base text-slate-900 truncate">
                      {item.error_code}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200 shrink-0">
                    {item.category}
                  </span>
                </div>

                {/* Error Name & Description */}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-xs tracking-wide text-slate-900 uppercase break-words">
                    {item.error_name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Action Highlight Box */}
                <div className="bg-orange-50/80 border border-orange-200/80 rounded-xl px-3 py-2 text-xs text-orange-900">
                  <span className="font-bold">Action:</span> {item.portal_action}
                </div>

                {/* Retry Policy & Pipeline Stage Metadata Box */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl px-3 py-2.5 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">
                      RETRY POLICY:
                    </span>
                    {isRetryYes ? (
                      <span className="font-bold text-emerald-600">
                        ✓ YES (Safe to Retry)
                      </span>
                    ) : (
                      <span className="font-bold text-rose-600">
                        ✕ NO (Do Not Retry)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider">
                      PIPELINE STAGE:
                    </span>
                    <span className="font-medium text-slate-700">{item.stage}</span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(`code-${cardKey}`, item.error_code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors"
                  >
                    {copiedKey === `code-${cardKey}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        Copy Code
                      </>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleCopy(
                        `diag-${cardKey}`,
                        `[${item.operator} ${item.error_code}] ${item.error_name} — ${item.description} | Action: ${item.portal_action} | Retry: ${item.retry}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors"
                  >
                    {copiedKey === `diag-${cardKey}` ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        Copy Diagnosis
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500 shadow-sm">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700">
              Page {safePage} / {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ErrorCodeHubSection;
