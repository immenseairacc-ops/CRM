'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck, Smartphone, X } from 'lucide-react';
import { CrmDatabase, User } from '@/types/crm';

function generateCaptchaCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    setCaptchaCode(generateCaptchaCode());

    if (typeof window !== 'undefined') {
      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone
      ) {
        setIsInstalled(true);
      }
      const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } else {
      const isIos =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIos) {
        setShowIosGuide(true);
      } else {
        alert(
          'Mobile App Install Karne Ke Liye:\n\n1. Mobile Chrome browser ke top right 3 dots (⋮) par tap karein.\n2. "Install App" ya "Add to Home screen" par tap karein.\n3. App aapke mobile screen par install ho jayegi!'
        );
      }
    }
  };

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptchaCode());
    setCaptchaInput('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      setError('Incorrect security captcha. Please try again.');
      refreshCaptcha();
      return;
    }
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#FFF4EC] flex items-center justify-center p-4 sm:p-6">
      {/* Subtle Light Dot Grid Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      />

      {/* Soft Light Branded Ambient Orbs */}
      <div className="pointer-events-none absolute -top-28 -left-28 w-96 h-96 rounded-full bg-[#0A1B3F]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 w-96 h-96 rounded-full bg-[#F2591F]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-sky-200/35 blur-3xl" />

      {/* Floating Light-Theme Immense Air Service Badges (SMS, RCS, WhatsApp, OBD, IVR) */}
      <div className="pointer-events-none hidden md:block">
        <div className="absolute top-14 left-12 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur border border-blue-200/80 shadow-sm text-xs font-extrabold text-[#0A1B3F] flex items-center gap-2 -rotate-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0A1B3F]" />
          📱 Bulk SMS (DLT)
        </div>
        <div className="absolute top-20 right-14 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur border border-orange-200/80 shadow-sm text-xs font-extrabold text-[#F2591F] flex items-center gap-2 rotate-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F2591F]" />
          ✨ RCS Messaging
        </div>
        <div className="absolute bottom-20 left-16 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur border border-emerald-200/80 shadow-sm text-xs font-extrabold text-emerald-700 flex items-center gap-2 rotate-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          💬 WhatsApp Business API
        </div>
        <div className="absolute bottom-28 right-16 px-4 py-2 rounded-2xl bg-white/80 backdrop-blur border border-sky-200/80 shadow-sm text-xs font-extrabold text-sky-800 flex items-center gap-2 -rotate-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          📞 Cloud IVR &amp; 📢 Voice OBD
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
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

          {/* Security Captcha */}
          <div>
            <label className="block text-xs font-bold text-[#0A1B3F] mb-1">
              Security Captcha *
            </label>
            <div className="flex items-center gap-2">
              <div
                className="px-3.5 py-2 rounded-xl bg-[#0A1B3F] text-white font-mono text-base font-black tracking-[0.28em] select-none border border-[#0A1B3F] shadow-inner flex items-center gap-2 shrink-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg, rgba(242,89,31,0.16) 0px, rgba(242,89,31,0.16) 4px, transparent 4px, transparent 10px)',
                }}
              >
                <ShieldCheck className="w-4 h-4 text-[#F2591F]" />
                <span>{captchaCode || '-----'}</span>
              </div>
              <button
                type="button"
                onClick={refreshCaptcha}
                title="Refresh Captcha"
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#0A1B3F] transition shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <input
                type="text"
                required
                maxLength={6}
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold uppercase tracking-widest focus:ring-2 focus:ring-[#F2591F]/25 focus:border-[#F2591F] outline-none bg-slate-50/50 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#F2591F] hover:bg-[#d94a14] disabled:opacity-60 text-white text-sm font-extrabold shadow-md shadow-[#F2591F]/25 transition"
          >
            {loading ? 'Signing In...' : 'Sign In to Workspace'}
          </button>

          {!isInstalled && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>📲 Install Mobile App on Phone</span>
              </button>
            </div>
          )}
        </form>

        {showIosGuide && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left">
              <button
                onClick={() => setShowIosGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Install on iPhone (iOS)
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Apne iPhone par CRM app install karne ke liye 2 aasan steps:
              </p>
              <ol className="mt-3 space-y-2 text-xs text-slate-700 font-medium">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Safari browser ke bottom bar mein <strong>Share</strong> button (⎋) par tap karein.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Scroll karke <strong>&apos;Add to Home Screen&apos; (+)</strong> par tap karein.</span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="w-full mt-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
