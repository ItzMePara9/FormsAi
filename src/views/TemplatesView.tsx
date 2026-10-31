import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  ArrowRight,
  Search,
  CheckCircle2,
  ListFilter,
  Eye,
  X,
  FileSpreadsheet,
  Check,
  Tag,
  Clock,
} from 'lucide-react';

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  schema: any;
}

interface TemplatesViewProps {
  onUseTemplate: (formId: string) => void;
  onCustomizeWithAI: (prompt: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  onUseTemplate,
  onCustomizeWithAI,
}) => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [isCloning, setIsCloning] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const categories = [
    'All',
    'HR & Recruiting',
    'Customer Feedback',
    'Event & Registration',
    'Education & Quizzes',
    'Operations & IT',
  ];

  const filteredTemplates = templates.filter((tpl) => {
    if (selectedCategory !== 'All' && tpl.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tpl.name.toLowerCase().includes(q);
      const matchDesc = tpl.description.toLowerCase().includes(q);
      const matchTag = tpl.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchTag;
    }
    return true;
  });

  const handleUseTemplate = async (templateId: string) => {
    try {
      setIsCloning(templateId);
      const res = await fetch(`/api/templates/${templateId}/use`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        onUseTemplate(data.form.id);
      } else {
        alert('Failed to clone template. Please try again.');
      }
    } catch (err) {
      console.error('Error cloning template:', err);
      alert('Network error cloning template.');
    } finally {
      setIsCloning(null);
    }
  };

  const getQuestionCount = (schema: any) => {
    if (!schema) return 0;
    try {
      const s = typeof schema === 'string' ? JSON.parse(schema) : schema;
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
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-purple-400" />
            Template Library
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Start quickly with 13 expertly structured Google Form blueprints, or customize them with AI.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1E2536] bg-[#0E121B] p-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by title, description, or tags..."
            className="w-full rounded-xl border border-[#1E2536] bg-[#121622] py-2 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-[#121622] text-slate-400 border border-[#1E2536] hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 animate-pulse rounded-2xl border border-[#1E2536] bg-[#0E121B]"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1E2536] bg-[#0E121B]/40 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">No templates found</h3>
          <p className="mt-1 text-xs text-slate-400">
            Try choosing another category or clearing your search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const questionCount = getQuestionCount(template.schema);
            return (
              <div
                key={template.id}
                className="group flex flex-col justify-between rounded-2xl border border-[#1E2536] bg-[#0E121B] p-5 transition-all hover:border-purple-500/40 hover:bg-[#121622]"
              >
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-300 border border-purple-500/20">
                      {template.category}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {questionCount} questions
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 line-clamp-3 min-h-[48px]">
                    {template.description}
                  </p>

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {template.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-[#161B26] px-2 py-0.5 text-[10px] text-slate-400 border border-[#202738]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 pt-4 border-t border-[#1E2536] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-[#1A202E] hover:text-white transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onCustomizeWithAI(
                          `Create a ${template.name.toLowerCase()} inspired by: ${template.description}. Add tailored questions.`
                        )
                      }
                      title="Remix with AI Prompt"
                      className="flex items-center gap-1 rounded-lg border border-[#1E2536] bg-[#161B26] px-2.5 py-1.5 text-xs font-medium text-purple-300 hover:border-purple-500/30 hover:bg-[#1E2536] transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Remix</span>
                    </button>

                    <button
                      onClick={() => handleUseTemplate(template.id)}
                      disabled={isCloning === template.id}
                      className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                    >
                      {isCloning === template.id ? (
                        <span>Cloning...</span>
                      ) : (
                        <>
                          <span>Use</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-[#1E2536] bg-[#0E121B] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1E2536] px-6 py-4">
              <div>
                <span className="text-xs font-medium text-purple-400">
                  {previewTemplate.category}
                </span>
                <h2 className="text-lg font-bold text-white">{previewTemplate.name}</h2>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-[#1A202E] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Question list preview */}
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-xs text-slate-400">{previewTemplate.description}</p>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Included Questions ({getQuestionCount(previewTemplate.schema)})
                </h4>

                {(() => {
                  let s = previewTemplate.schema;
                  if (typeof s === 'string') {
                    try {
                      s = JSON.parse(s);
                    } catch {
                      s = {};
                    }
                  }

                  const sections = s.sections || [{ questions: s.questions || [] }];

                  return sections.map((sec: any, secIdx: number) => (
                    <div
                      key={secIdx}
                      className="rounded-xl border border-[#1E2536] bg-[#121622] p-4 space-y-3"
                    >
                      {sec.title && (
                        <h5 className="text-xs font-semibold text-purple-300 border-b border-[#1E2536] pb-2">
                          Section {secIdx + 1}: {sec.title}
                        </h5>
                      )}
                      <div className="space-y-2">
                        {(sec.questions || []).map((q: any, qIdx: number) => (
                          <div
                            key={qIdx}
                            className="flex items-start justify-between gap-3 rounded-lg bg-[#0E121B] p-2.5 text-xs"
                          >
                            <div>
                              <span className="font-medium text-slate-200">
                                {qIdx + 1}. {q.title}
                              </span>
                              {q.required && (
                                <span className="ml-1.5 text-[10px] text-rose-400 font-semibold">
                                  *required
                                </span>
                              )}
                              {q.description && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {q.description}
                                </p>
                              )}
                              {Array.isArray(q.options) && q.options.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {q.options.map((opt: any, oIdx: number) => (
                                    <span
                                      key={oIdx}
                                      className="rounded bg-[#1A202E] px-1.5 py-0.5 text-[10px] text-slate-400"
                                    >
                                      {typeof opt === 'string' ? opt : opt.value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-400 capitalize">
                              {q.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[#1E2536] px-6 py-4">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="rounded-xl border border-[#1E2536] bg-[#121622] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#1A202E]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  handleUseTemplate(t.id);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:bg-purple-500"
              >
                <span>Use This Template</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
