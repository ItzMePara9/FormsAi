import React, { useState } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  HardDrive,
  Mail,
  Key,
  Globe,
  Unlink,
} from 'lucide-react';
import { useGoogle } from '../context/GoogleContext.tsx';

export const GoogleIntegrationView: React.FC = () => {
  const { isConnected, email, connect, disconnect, refreshStatus } = useGoogle();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(1);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect();
    } catch (err: any) {
      alert('Failed to connect Google account: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestAPI = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch('/api/google/test-api', { method: 'POST' });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Google Forms API connection verified!' : 'API call failed'),
        details: data.details,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Network error calling Google API test endpoint.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      step: 1,
      title: 'Create a Google Cloud Project',
      desc: 'Navigate to the Google Cloud Console and establish an isolated project for FormGenius AI.',
      instructions: [
        'Open Google Cloud Console (console.cloud.google.com).',
        'Click the project dropdown in the top bar and select "New Project".',
        'Enter a project name such as "FormGenius-AI" and click Create.',
      ],
      link: 'https://console.cloud.google.com/projectcreate',
    },
    {
      step: 2,
      title: 'Enable Google Forms & Google Drive APIs',
      desc: 'FormGenius AI requires the Google Forms API to construct forms and Google Drive API for organizing file permissions.',
      instructions: [
        'In the Cloud Console sidebar, navigate to "APIs & Services" > "Library".',
        'Search for "Google Forms API" and click Enable.',
        'Search for "Google Drive API" and click Enable.',
      ],
      link: 'https://console.cloud.google.com/apis/library',
    },
    {
      step: 3,
      title: 'Configure OAuth Consent Screen',
      desc: 'Configure application metadata presented to administrators when authenticating.',
      instructions: [
        'Go to "APIs & Services" > "OAuth consent screen".',
        'Select "External" (or "Internal" if using Google Workspace organization).',
        'Fill in App Name ("FormGenius AI") and your user support email.',
        'Add the following scopes:',
        '• https://www.googleapis.com/auth/forms.body (Create & manage Google Forms)',
        '• https://www.googleapis.com/auth/drive.file (Save forms to your Google Drive)',
        '• https://www.googleapis.com/auth/userinfo.email (Display connected email)',
      ],
    },
    {
      step: 4,
      title: 'Create OAuth 2.0 Credentials',
      desc: 'Create Web Application credentials to link self-hosted FormGenius AI with Google OAuth.',
      instructions: [
        'Go to "APIs & Services" > "Credentials" > "Create Credentials" > "OAuth client ID".',
        'Application type: "Web application".',
        'Name: "FormGenius Server".',
        'Under "Authorized redirect URIs", enter your domain callback (e.g. https://your-domain.com/api/google/callback or http://localhost:3000/api/google/callback).',
        'Copy your Client ID and Client Secret into FormGenius AI > Settings.',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Share2 className="h-6 w-6 text-purple-400" />
          Google Account & Forms Integration
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect your Google account via OAuth 2.0 to publish generated forms directly to your Google Drive.
        </p>
      </div>

      {/* Account Connection Card */}
      <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                isConnected
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/10'
                  : 'border-[#1E2536] bg-[#121622] text-slate-400'
              }`}
            >
              <Share2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white">Google Forms Connection</h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isConnected ? 'Connected & Authorized' : 'Not Connected'}
                </span>
              </div>

              {isConnected ? (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Mail className="h-3.5 w-3.5 text-purple-400" />
                    {email}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <Shield className="h-3 w-3" />
                    OAuth 2.0 Active
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 max-w-lg">
                  Connecting your Google Account allows FormGenius AI to create real Google Forms, save them into your Google Drive, and provide public respondent URLs.
                </p>
              )}

              {/* Granted Scopes Badge */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#161B26] px-2 py-0.5 text-[10px] text-slate-400 border border-[#202738]">
                  <FileSpreadsheet className="h-3 w-3 text-purple-400" />
                  forms.body (Create & Edit)
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#161B26] px-2 py-0.5 text-[10px] text-slate-400 border border-[#202738]">
                  <HardDrive className="h-3 w-3 text-indigo-400" />
                  drive.file (Store in Drive)
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#161B26] px-2 py-0.5 text-[10px] text-slate-400 border border-[#202738]">
                  <Shield className="h-3 w-3 text-emerald-400" />
                  No Gmail Access
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 border-t border-[#1E2536] pt-4 lg:border-t-0 lg:pt-0">
            {isConnected ? (
              <>
                <button
                  onClick={handleTestAPI}
                  disabled={isTesting}
                  className="flex items-center gap-2 rounded-xl border border-[#1E2536] bg-[#121622] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-700 hover:bg-[#181D2D] transition-colors disabled:opacity-50"
                >
                  {isTesting ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-purple-400" />
                  )}
                  <span>Test API Connection</span>
                </button>

                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <Unlink className="h-4 w-4" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/25 hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 active:scale-95"
              >
                {isConnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span>Connect Google Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Test Results Alert */}
        {testResult && (
          <div
            className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-xs ${
              testResult.success
                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
                : 'border-rose-500/20 bg-rose-500/5 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">{testResult.message}</p>
              {testResult.details && (
                <pre className="mt-1 max-h-36 overflow-x-auto rounded bg-black/40 p-2 font-mono text-[10px] text-slate-300">
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Self-Hosted Google OAuth Setup Guide */}
      <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-purple-400" />
            Self-Hosted Google OAuth 2.0 Setup Guide
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Follow these 4 steps to create your own Google Cloud OAuth 2.0 Client credentials for your VPS or local server.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {steps.map((s) => {
            const isOpen = openStep === s.step;
            return (
              <div
                key={s.step}
                className="rounded-xl border border-[#1E2536] bg-[#121622] transition-colors"
              >
                <button
                  onClick={() => setOpenStep(isOpen ? null : s.step)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 text-xs font-bold text-purple-400 border border-purple-500/20">
                      {s.step}
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{s.title}</h4>
                      <p className="text-[11px] text-slate-400">{s.desc}</p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-[#1E2536] px-5 py-4 space-y-2.5 text-xs text-slate-300">
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {s.instructions.map((inst, i) => (
                        <li key={i} className="leading-relaxed font-normal">
                          {inst}
                        </li>
                      ))}
                    </ul>

                    {s.link && (
                      <div className="pt-2">
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300"
                        >
                          <span>Open in Google Cloud Console</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
