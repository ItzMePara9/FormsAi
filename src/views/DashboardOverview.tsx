import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Cpu,
  Share2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Clock,
  Copy,
  Check,
  FileText,
} from 'lucide-react';
import { useGoogle } from '../context/GoogleContext.tsx';

interface DashboardStats {
  totalForms: number;
  publishedForms: number;
  activeModels: number;
  isGoogleConnected: boolean;
  googleEmail: string | null;
}

interface FormItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  googleFormUrl: string | null;
  googleEditUrl: string | null;
  modelUsed: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface ActivityItem {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
}

interface DashboardOverviewProps {
  onNavigate: (tab: any) => void;
  onEditForm: (formId: string) => void;
  onStartCreateWithPrompt: (promptText: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onEditForm,
  onStartCreateWithPrompt,
}) => {
  const { isConnected, email: googleEmail } = useGoogle();
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    publishedForms: 0,
    activeModels: 0,
    isGoogleConnected: false,
    googleEmail: null,
  });
  const [recentForms, setRecentForms] = useState<FormItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [settingsRes, formsRes, activityRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/forms?sort=newest'),
        fetch('/api/activity?limit=6'),
      ]);

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setStats(sData.stats);
      }

      if (formsRes.ok) {
        const fData = await formsRes.json();
        setRecentForms(fData.slice(0, 5));
      }

      if (activityRes.ok) {
        const aData = await activityRes.json();
        setActivities(aData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    onStartCreateWithPrompt(quickPrompt.trim());
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#18112C] via-[#121626] to-[#0E121B] p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>AI-Powered Google Forms Builder</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            What kind of form do you want to build today?
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Describe your questions, audience, sections, or workflow in plain language. FormGenius will structure, validate, and publish it directly to your Google account.
          </p>

          <form onSubmit={handleQuickCreate} className="relative flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="e.g. Create a software engineer job application with technical skills, resume upload, and salary..."
              className="flex-1 rounded-xl border border-purple-500/30 bg-[#0A0D15]/90 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-purple-400 focus:outline-hidden focus:ring-1 focus:ring-purple-400 backdrop-blur-md"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 hover:from-purple-500 hover:to-indigo-500 transition-all shrink-0 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Form</span>
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Quick ideas:</span>
            {[
              'Customer Feedback & NPS',
              'Tech Conference Registration',
              'Student Admission Form',
              'Employee Pulse Survey',
            ].map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setQuickPrompt(`Create a comprehensive ${idea.toLowerCase()} form with professional fields and required validations.`)}
                className="rounded-lg border border-slate-700/60 bg-[#161C2B] px-2.5 py-1 text-slate-300 hover:border-purple-500/40 hover:bg-[#1E253A] hover:text-white transition-colors"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Forms Created
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.totalForms}</div>
          <p className="text-xs text-slate-500 mt-1">Saved in local database</p>
        </div>

        <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Published to Google
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.publishedForms}</div>
          <p className="text-xs text-slate-500 mt-1">Live Google Forms active</p>
        </div>

        <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active AI Models
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Cpu className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{stats.activeModels}</div>
          <p className="text-xs text-slate-500 mt-1">Ready for generation</p>
        </div>

        <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Google Account
            </span>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <Share2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="text-sm font-bold text-white truncate">
            {isConnected ? googleEmail || 'Connected' : 'Not Connected'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isConnected ? 'Ready to publish forms' : 'Connect in Google tab'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight text-white uppercase text-[11px] text-slate-400">
              Recently Created Forms
            </h3>
            <button
              onClick={() => onNavigate('forms')}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {recentForms.length === 0 ? (
            <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300 mb-1">No forms yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                You haven't generated any forms yet. Use the prompt bar above or pick a starter template.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => onNavigate('create')}
                  className="rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-purple-500 transition-colors"
                >
                  Create with AI
                </button>
                <button
                  onClick={() => onNavigate('templates')}
                  className="rounded-lg border border-slate-700 bg-[#161C2B] px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-[#1E253A] transition-colors"
                >
                  Browse Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentForms.map((form) => (
                <div
                  key={form.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-[#1E2536] bg-[#0E121B] p-4 hover:border-slate-700 hover:bg-[#121624] transition-all gap-3"
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#182033] text-purple-400 border border-[#252F4A]">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                          {form.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            form.status === 'published'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : form.status === 'failed'
                              ? 'border-red-500/30 bg-red-500/10 text-red-400'
                              : 'border-slate-700 bg-slate-800/60 text-slate-400'
                          }`}
                        >
                          {form.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5 max-w-md">
                        {form.description || 'No description provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {form.googleFormUrl && (
                      <button
                        onClick={() => handleCopyLink(form.googleFormUrl!, form.id)}
                        title="Copy Public Google Form Link"
                        className="rounded-lg border border-slate-700 bg-[#161C2B] p-2 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                      >
                        {copiedId === form.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}

                    {form.googleEditUrl && (
                      <a
                        href={form.googleEditUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in Google Forms Editor"
                        className="rounded-lg border border-slate-700 bg-[#161C2B] p-2 text-slate-400 hover:text-purple-400 hover:border-purple-500/40 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <button
                      onClick={() => onEditForm(form.id)}
                      className="rounded-lg bg-[#1F273B] hover:bg-purple-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                    >
                      Open Editor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold tracking-tight text-white uppercase text-[11px] text-slate-400">
            System & Form Activity
          </h3>

          <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-4">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <Clock className="h-6 w-6 text-slate-600 mx-auto mb-2" />
                <span>No recorded activity yet</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-1 h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium text-slate-200 truncate">
                        {act.details || act.action}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(act.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
