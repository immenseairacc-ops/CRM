'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { CrmDatabase, User } from '@/types/crm';

export function LoginScreen({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: User, db: CrmDatabase) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGIN',
          payload: { email: email.trim(), password },
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || 'Invalid credentials');
        return;
      }
      onLoginSuccess(json.user, json.data);
    } catch {
      setError('Network error while signing in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-white to-[#EEF2F9] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* 30% Deep Navy Blue Header with Crisp White Logo Badge & 20% Orange Accent */}
        <div className="bg-[#0A1B3F] px-6 py-6 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#F2591F]/20 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/immense-logo.jpg"
                alt="Immense Air Pvt Ltd"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-1.5">
                <span>IMMENSE</span>
                <span className="text-[#F2591F]">AIR</span>
              </h1>
              <p className="text-[11px] font-semibold text-slate-300 tracking-wide uppercase">
                Pvt Ltd • Multi-Team CRM Portal
              </p>
            </div>
          </div>
          <div className="mt-4 h-1 w-20 rounded-full bg-[#F2591F]" />
        </div>

        {/* 50% Clean White Form Body */}
        <form onSubmit={handleLogin} className="p-6 sm:p-7 space-y-4 bg-white">
          <div>
            <h2 className="text-base font-extrabold text-[#0A1B3F]">
              Sign in to your workspace
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your work email and password to access your team dashboard.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0A1B3F] mb-1">
              Work Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#0F2A5F] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., admin@immenseair.in"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#F2591F]/25 focus:border-[#F2591F] outline-none bg-slate-50/50 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0A1B3F] mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#0F2A5F] absolute left-3 top-2.5" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-[#F2591F]/25 focus:border-[#F2591F] outline-none bg-slate-50/50 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#0A1B3F]"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#F2591F] hover:bg-[#d94a14] disabled:opacity-60 text-white text-sm font-extrabold shadow-md shadow-[#F2591F]/25 transition"
          >
            {loading ? 'Signing In...' : 'Sign In to Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
