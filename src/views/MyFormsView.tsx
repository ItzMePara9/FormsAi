import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Share2,
  Check,
  Filter,
  Layers,
  ArrowUpDown,
  MoreVertical,
} from 'lucide-react';
import { useGoogle } from '../context/GoogleContext.tsx';

interface FormItem {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'failed';
  googleFormUrl: string | null;
  googleEditUrl: string | null;
  googleFormId: string | null;
  modelUsed: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  schema?: any;
}

interface MyFormsViewProps {
  onEditForm: (formId: string) => void;
  onNavigate: (tab: any) => void;
}

export const MyFormsView: React.FC<MyFormsViewProps> = ({
  onEditForm,
  onNavigate,
}) => {
  const { isConnected } = useGoogle();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  const fetchForms = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/forms');
      if (res.ok) {
        const data = await res.json();
        setForms(data.forms || []);
      }
    } catch (err) {
      console.error('Failed to load forms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDuplicatingId(id);
      const res = await fetch(`/api/forms/${id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchForms();
      }
    } catch (err) {
      console.error('Failed to duplicate form:', err);
    } finally {
      setDuplicatingId(null);
      setActionMenuOpenId(null);
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      setDeletingId(id);
      const res = await fetch(`/api/forms/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete form:', err);
    } finally {
      setDeletingId(null);
      setActionMenuOpenId(null);
    }
  };

  // Filter and sort forms
  const filteredForms = forms
    .filter((f) => {
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(query);
        const matchDesc = f.description?.toLowerCase().includes(query) ?? false;
        const matchModel = f.modelUsed?.toLowerCase().includes(query) ?? false;
        return matchTitle || matchDesc || matchModel;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.title.localeCompare(b.title);
    });

  const getQuestionCount = (form: FormItem) => {
    if (!form.schema) return 0;
    try {
      const s = typeof form.schema === 'string' ? JSON.parse(form.schema) : form.schema;
      if (Array.isArray(s.sections)) {
        return s.sections.reduce((acc: number, sec: any) => acc + (sec.questions?.length || 0), 0);
      }
      return s.questions?.length || 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-6 w-6 text-purple-400" />
            My Forms
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage, edit, duplicate, and publish your AI-generated Google Forms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('templates')}
            className="flex items-center gap-2 rounded-xl border border-[#1E2536] bg-[#121622] px-4 py-2.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-[#181D2D] transition-colors"
          >
            <Layers className="h-4 w-4 text-slate-400" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => onNavigate('create')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create New Form</span>
          </button>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1E2536] bg-[#0E121B] p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms by title, description, or model..."
            className="w-full rounded-xl border border-[#1E2536] bg-[#121622] py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[#1E2536] bg-[#121622] p-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'published', label: 'Published' },
                { id: 'draft', label: 'Drafts' },
                { id: 'failed', label: 'Failed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  filterStatus === tab.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#1E2536] bg-[#121622] px-3 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="updated" className="bg-[#121622]">Recently Updated</option>
              <option value="created" className="bg-[#121622]">Recently Created</option>
              <option value="title" className="bg-[#121622]">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forms Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-56 animate-pulse rounded-2xl border border-[#1E2536] bg-[#0E121B]"
            />
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1E2536] bg-[#0E121B]/40 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
            <FileSpreadsheet className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">
            {searchQuery || filterStatus !== 'all' ? 'No forms match your filters' : 'No forms yet'}
          </h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-400">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your search terms or clearing status filters.'
              : 'Generate your first Google Form in seconds using natural language prompts.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            {searchQuery || filterStatus !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="rounded-xl border border-[#1E2536] bg-[#121622] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#1A202E]"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => onNavigate('create')}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:bg-purple-500"
              >
                <Sparkles className="h-4 w-4" />
                <span>Create with AI</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => {
            const questionCount = getQuestionCount(form);
            const isPublished = form.status === 'published';
            const isFailed = form.status === 'failed';

            return (
              <div
                key={form.id}
                onClick={() => onEditForm(form.id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#1E2536] bg-[#0E121B] p-5 transition-all hover:border-purple-500/40 hover:bg-[#121622] cursor-pointer"
              >
                <div>
                  {/* Top Bar with Status and Version */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          isPublished
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isFailed
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isPublished ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : isFailed ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span className="capitalize">{form.status}</span>
                      </span>

                      <span className="rounded-md bg-[#181D2D] px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-[#232A3B]">
                        v{form.version}
                      </span>
                    </div>

                    {/* Question Count */}
                    <span className="text-[11px] font-medium text-slate-400">
                      {questionCount} {questionCount === 1 ? 'question' : 'questions'}
                    </span>
                  </div>

                  {/* Title and Description */}
                  <h3 className="mt-3 text-base font-semibold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                    {form.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                    {form.description || 'No description provided.'}
                  </p>

                  {/* Metadata Chips */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {form.modelUsed && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300 border border-purple-500/20">
                        <Sparkles className="h-2.5 w-2.5" />
                        {form.modelUsed}
                      </span>
                    )}
                    <span className="rounded-md bg-[#161B26] px-2 py-0.5 text-[10px] text-slate-400 border border-[#202738]">
                      Updated {new Date(form.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3.5 border-t border-[#1E2536] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isPublished && form.googleFormUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(form.googleFormUrl!, form.id);
                        }}
                        title="Copy public Google Form link"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1A202E] hover:text-white transition-colors"
                      >
                        {copiedId === form.id ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {isPublished && form.googleFormUrl && (
                      <a
                        href={form.googleFormUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open respondent form"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1A202E] hover:text-purple-400 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    <button
                      onClick={(e) => handleDuplicate(form.id, e)}
                      disabled={duplicatingId === form.id}
                      title="Duplicate form"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1A202E] hover:text-white transition-colors"
                    >
                      <Layers className="h-4 w-4" />
                    </button>

                    <button
                      onClick={(e) => handleDelete(form.id, form.title, e)}
                      disabled={deletingId === form.id}
                      title="Delete form"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onEditForm(form.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#181D2D] px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-600 hover:text-white transition-all border border-purple-500/20"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Open Editor</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
