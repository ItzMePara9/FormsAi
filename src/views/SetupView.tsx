import React, { useState } from 'react';
import { Sparkles, Shield, Server, ArrowRight, Lock, User, Globe, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const SetupView: React.FC = () => {
  const { checkAuth } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [appName, setAppName] = useState('FormGenius AI');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !username.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          appName: appName.trim(),
          timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete setup');
      }

      await checkAuth();
    } catch (err: any) {
      setError(err.message || 'Setup encountered an error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A10] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-xl shadow-purple-600/30 mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            FormGenius AI
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            First-time Self-Hosted Setup Wizard
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/80">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#1E2536]">
            <Shield className="h-5 w-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Create Administrator</h2>
              <p className="text-xs text-slate-400">Configure your initial root admin account</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Administrator"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                required
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1E2536]">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Workspace / App Name
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Server Timezone
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 hover:from-purple-500 hover:to-indigo-500 focus:outline-hidden disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <span>Initializing Environment...</span>
              ) : (
                <>
                  <span>Complete Setup & Launch</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Server className="h-3.5 w-3.5 text-purple-400" />
          <span>Local SQLite database • AES-256-GCM encryption</span>
        </div>
      </div>
    </div>
  );
};
