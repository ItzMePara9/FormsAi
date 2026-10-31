import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Key,
  Globe,
  Lock,
  Server,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Cpu,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const SettingsView: React.FC = () => {
  const { appName, checkAuth } = useAuth();

  // General App Settings
  const [appNameInput, setAppNameInput] = useState(appName || 'FormGenius AI');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultModelId, setDefaultModelId] = useState('');
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // OAuth Credentials
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [appUrl, setAppUrl] = useState(window.location.origin);
  const [hasGoogleClientSecret, setHasGoogleClientSecret] = useState(false);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Alerts
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [copiedNginx, setCopiedNginx] = useState(false);
  const [copiedPM2, setCopiedPM2] = useState(false);

  const redirectUri = `${appUrl.replace(/\/$/, '')}/api/google/callback`;

  useEffect(() => {
    // Fetch settings and available models
    const loadSettings = async () => {
      try {
        const [settingsRes, modelsRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/ai/models'),
        ]);

        if (settingsRes.ok) {
          const s = await settingsRes.json();
          if (s.appName) setAppNameInput(s.appName);
          if (s.timezone) setTimezone(s.timezone);
          if (s.defaultModelId) setDefaultModelId(s.defaultModelId);
          if (s.googleClientId) setGoogleClientId(s.googleClientId);
          if (s.appUrl) setAppUrl(s.appUrl);
          if (s.hasGoogleClientSecret) setHasGoogleClientSecret(true);
        }

        if (modelsRes.ok) {
          const m = await modelsRes.json();
          setAvailableModels(m.models || []);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralError(null);
    setGeneralSuccess(false);

    try {
      const payload: any = {
        appName: appNameInput,
        timezone,
        defaultModelId,
        googleClientId,
        appUrl,
      };

      if (googleClientSecret.trim()) {
        payload.googleClientSecret = googleClientSecret.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setGeneralSuccess(true);
        if (googleClientSecret) setHasGoogleClientSecret(true);
        setGoogleClientSecret('');
        await checkAuth();
        setTimeout(() => setGeneralSuccess(false), 3000);
      } else {
        const data = await res.json();
        setGeneralError(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      setGeneralError('Network error while saving settings.');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        const data = await res.json();
        setPasswordError(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError('Network error changing password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const copyText = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const nginxSnippet = `server {
    listen 80;
    server_name formgenius.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  const pm2Snippet = `module.exports = {
  apps: [
    {
      name: 'formgenius-ai',
      script: 'node',
      args: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'file:./dev.db',
        ENCRYPTION_KEY: 'your-32-byte-secret-hex-key',
        SESSION_SECRET: 'your-random-session-secret'
      }
    }
  ]
};`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-purple-400" />
          Application Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure application preferences, Google OAuth credentials, administrator security, and VPS deployment.
        </p>
      </div>

      {/* General Settings Form */}
      <form onSubmit={handleSaveGeneral} className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-6 shadow-xl space-y-6">
        <div className="border-b border-[#1E2536] pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-purple-400" />
            General & Google OAuth Configuration
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Customize branding, default AI engine, and OAuth keys.
          </p>
        </div>

        {generalSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Settings updated successfully!</span>
          </div>
        )}

        {generalError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span>{generalError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* App Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Application Name
            </label>
            <input
              type="text"
              value={appNameInput}
              onChange={(e) => setAppNameInput(e.target.value)}
              className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-hidden"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="America/Chicago">America/Chicago (CST/CDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            </select>
          </div>

          {/* Default Model */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Default AI Model
            </label>
            <select
              value={defaultModelId}
              onChange={(e) => setDefaultModelId(e.target.value)}
              className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 focus:border-purple-500 focus:outline-hidden"
            >
              <option value="">Auto-select first available</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.modelNickname} ({m.name})
                </option>
              ))}
            </select>
          </div>

          {/* App Base URL */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Self-Hosted App URL
            </label>
            <input
              type="url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://formgenius.yourdomain.com"
              className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:border-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* OAuth Section */}
        <div className="pt-4 border-t border-[#1E2536] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Google OAuth 2.0 Credentials
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Google Client ID
              </label>
              <input
                type="text"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Google Client Secret
                </label>
                {hasGoogleClientSecret && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    (Secret Encrypted with AES-256-GCM)
                  </span>
                )}
              </div>
              <input
                type="password"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder={hasGoogleClientSecret ? '••••••••••••••••' : 'GOCSPX-xxxxxxxxxxxxx'}
                className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:border-purple-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Callback URI Display */}
          <div className="rounded-xl border border-[#1E2536] bg-[#121622] p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">
                Authorized Redirect URI (Paste into Google Cloud Console):
              </span>
              <code className="text-xs text-purple-300 font-mono">{redirectUri}</code>
            </div>
            <button
              type="button"
              onClick={() => copyText(redirectUri, setCopiedRedirect)}
              className="flex items-center gap-1 rounded-lg bg-[#181D2D] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-[#232A3B] transition-colors self-start sm:self-auto"
            >
              {copiedRedirect ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copiedRedirect ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSavingGeneral}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:bg-purple-500 transition-all disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{isSavingGeneral ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Password Change Form */}
      <form onSubmit={handleChangePassword} className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-6 shadow-xl space-y-5">
        <div className="border-b border-[#1E2536] pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            Administrator Password
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Update your master administrator credentials.
          </p>
        </div>

        {passwordSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Administrator password changed successfully!</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span>{passwordError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="flex items-center gap-2 rounded-xl bg-[#181D2D] border border-purple-500/30 px-5 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{isChangingPassword ? 'Updating...' : 'Change Password'}</span>
          </button>
        </div>
      </form>

      {/* Ubuntu VPS Deployment Guide */}
      <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-6 shadow-xl space-y-6">
        <div className="border-b border-[#1E2536] pb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-purple-400" />
            Self-Hosted Ubuntu VPS Deployment Guide
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Production commands and configurations for hosting FormGenius AI on your own server.
          </p>
        </div>

        {/* Quick Shell Steps */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300">1. Setup Commands</h4>
          <div className="rounded-xl bg-[#090C12] border border-[#1E2536] p-4 font-mono text-xs text-purple-300 space-y-1">
            <p className="text-slate-500"># 1. Clone repository and install dependencies</p>
            <p>git clone &lt;repo-url&gt; formgenius && cd formgenius</p>
            <p>npm install</p>
            <p className="text-slate-500 pt-2"># 2. Push SQLite schema</p>
            <p>DATABASE_URL=&quot;file:./dev.db&quot; npx prisma db push</p>
            <p className="text-slate-500 pt-2"># 3. Build production bundle</p>
            <p>npm run build</p>
            <p className="text-slate-500 pt-2"># 4. Start production server</p>
            <p>NODE_ENV=production PORT=3000 node server.js</p>
          </div>
        </div>

        {/* Nginx Configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300">2. Nginx Reverse Proxy Config</h4>
            <button
              onClick={() => copyText(nginxSnippet, setCopiedNginx)}
              className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300"
            >
              {copiedNginx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedNginx ? 'Copied' : 'Copy Nginx'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-[#090C12] border border-[#1E2536] p-4 font-mono text-[11px] text-slate-300 leading-relaxed">
            {nginxSnippet}
          </pre>
        </div>

        {/* PM2 Configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300">3. PM2 Process Manager (ecosystem.config.cjs)</h4>
            <button
              onClick={() => copyText(pm2Snippet, setCopiedPM2)}
              className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300"
            >
              {copiedPM2 ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copiedPM2 ? 'Copied' : 'Copy PM2'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-[#090C12] border border-[#1E2536] p-4 font-mono text-[11px] text-slate-300 leading-relaxed">
            {pm2Snippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
