import React, { useState, useEffect } from 'react';
import {
  Save,
  Share2,
  Sparkles,
  Eye,
  Edit3,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  History,
  RotateCcw,
  Check,
  Smartphone,
  Tablet,
  Monitor,
  Send,
  Layers,
  ArrowLeft,
  X,
  MessageSquare,
  Sliders,
} from 'lucide-react';
import { FormSchema, FormSection, FormQuestion, QuestionType } from '../types/form.ts';
import { useGoogle } from '../context/GoogleContext.tsx';

interface FormEditorViewProps {
  formId: string;
  onBack: () => void;
  onNavigate: (tab: any) => void;
}

interface FormVersionRecord {
  id: string;
  version: number;
  title: string;
  changeNotes: string | null;
  createdAt: string;
}

export const FormEditorView: React.FC<FormEditorViewProps> = ({
  formId,
  onBack,
  onNavigate,
}) => {
  const { isConnected, email: googleEmail, connect: connectGoogle } = useGoogle();

  const [form, setForm] = useState<any>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [rightPanelTab, setRightPanelTab] = useState<'copilot' | 'properties'>('copilot');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [copilotInstruction, setCopilotInstruction] = useState('');
  const [isCopilotBusy, setIsCopilotBusy] = useState(false);
  const [copilotHistory, setCopilotHistory] = useState<Array<{ instruction: string; summary: string; previousSchema: FormSchema }>>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ googleFormUrl?: string; googleEditUrl?: string; error?: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [versions, setVersions] = useState<FormVersionRecord[]>([]);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadFormDetails();
  }, [formId]);

  const loadFormDetails = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/forms/${formId}`);
      if (!res.ok) {
        throw new Error('Form not found');
      }
      const data = await res.json();
      setForm(data);
      setSchema(data.schema);
      setVersions(data.versions || []);
      if (data.schema?.sections?.length > 0) {
        setSelectedSectionId(data.schema.sections[0].id);
        if (data.schema.sections[0].questions?.length > 0) {
          setSelectedQuestionId(data.schema.sections[0].questions[0].id);
        }
      }
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (customSchema?: FormSchema, notes?: string) => {
    const targetSchema = customSchema || schema;
    if (!targetSchema) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: targetSchema,
          changeNotes: notes || 'Updated form structure',
        }),
      });

      if (!res.ok) {
        throw new Error('Save failed');
      }

      const data = await res.json();
      setForm((prev: any) => ({ ...prev, version: data.form.version, title: data.form.title }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      const updatedDetails = await fetch(`/api/forms/${formId}`).then((r) => r.json());
      setVersions(updatedDetails.versions || []);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = async (targetVersion: number) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/forms/${formId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSchema(data.schema);
      setIsVersionDropdownOpen(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert('Failed to restore version: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setPublishResult(null);

      const res = await fetch(`/api/forms/${formId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish to Google Forms');
      }

      setPublishResult({
        googleFormUrl: data.form.googleFormUrl,
        googleEditUrl: data.form.googleEditUrl,
      });

      setForm((prev: any) => ({
        ...prev,
        status: 'published',
        googleFormUrl: data.form.googleFormUrl,
        googleEditUrl: data.form.googleEditUrl,
      }));
    } catch (err: any) {
      setPublishResult({ error: err.message || 'Google publication failed' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInstruction.trim() || !schema) return;

    try {
      setIsCopilotBusy(true);
      const currentSchemaCopy = JSON.parse(JSON.stringify(schema));

      const res = await fetch('/api/ai/chat-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchema: schema,
          instruction: copilotInstruction.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI edit failed');

      setCopilotHistory((prev) => [
        {
          instruction: copilotInstruction.trim(),
          summary: data.summary,
          previousSchema: currentSchemaCopy,
        },
        ...prev,
      ]);

      setSchema(data.schema);
      setCopilotInstruction('');
      await handleSave(data.schema, `AI edit: ${data.summary}`);
    } catch (err: any) {
      alert('AI Copilot error: ' + err.message);
    } finally {
      setIsCopilotBusy(false);
    }
  };

  const handleUndoAIEdit = (index: number) => {
    const item = copilotHistory[index];
    if (!item) return;

    setSchema(item.previousSchema);
    setCopilotHistory((prev) => prev.filter((_, i) => i !== index));
    handleSave(item.previousSchema, 'Undid AI edit');
  };

  const updateFormTitle = (title: string) => {
    if (!schema) return;
    setSchema({ ...schema, title });
  };

  const updateFormDescription = (description: string) => {
    if (!schema) return;
    setSchema({ ...schema, description });
  };

  const addSection = () => {
    if (!schema) return;
    const newSection: FormSection = {
      id: 'sec_' + Math.random().toString(36).substring(2, 8),
      title: `Section ${schema.sections.length + 1}`,
      description: '',
      questions: [
        {
          id: 'q_' + Math.random().toString(36).substring(2, 8),
          title: 'Untitled Question',
          type: 'short_answer',
          required: false,
        },
      ],
    };
    const updated = { ...schema, sections: [...schema.sections, newSection] };
    setSchema(updated);
    setSelectedSectionId(newSection.id);
  };

  const deleteSection = (secId: string) => {
    if (!schema || schema.sections.length <= 1) {
      alert('Form must have at least one section');
      return;
    }
    const updated = { ...schema, sections: schema.sections.filter((s) => s.id !== secId) };
    setSchema(updated);
    setSelectedSectionId(updated.sections[0].id);
  };

  const addQuestion = (secId: string) => {
    if (!schema) return;
    const newQ: FormQuestion = {
      id: 'q_' + Math.random().toString(36).substring(2, 8),
      title: 'New Question',
      type: 'short_answer',
      required: false,
    };
    const updated = {
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === secId ? { ...s, questions: [...s.questions, newQ] } : s
      ),
    };
    setSchema(updated);
    setSelectedQuestionId(newQ.id);
  };

  const duplicateQuestion = (secId: string, qId: string) => {
    if (!schema) return;
    const sec = schema.sections.find((s) => s.id === secId);
    const q = sec?.questions.find((item) => item.id === qId);
    if (!q) return;

    const copyQ: FormQuestion = {
      ...JSON.parse(JSON.stringify(q)),
      id: 'q_' + Math.random().toString(36).substring(2, 8),
      title: `${q.title} (Copy)`,
    };

    const updated = {
      ...schema,
      sections: schema.sections.map((s) => {
        if (s.id !== secId) return s;
        const index = s.questions.findIndex((item) => item.id === qId);
        const newQuestions = [...s.questions];
        newQuestions.splice(index + 1, 0, copyQ);
        return { ...s, questions: newQuestions };
      }),
    };
    setSchema(updated);
    setSelectedQuestionId(copyQ.id);
  };

  const deleteQuestion = (secId: string, qId: string) => {
    if (!schema) return;
    const updated = {
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === secId ? { ...s, questions: s.questions.filter((q) => q.id !== qId) } : s
      ),
    };
    setSchema(updated);
  };

  const moveQuestion = (secId: string, qId: string, direction: 'up' | 'down') => {
    if (!schema) return;
    const sec = schema.sections.find((s) => s.id === secId);
    if (!sec) return;

    const index = sec.questions.findIndex((q) => q.id === qId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sec.questions.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newQuestions = [...sec.questions];
    const [moved] = newQuestions.splice(index, 1);
    newQuestions.splice(targetIndex, 0, moved);

    const updated = {
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === secId ? { ...s, questions: newQuestions } : s
      ),
    };
    setSchema(updated);
  };

  const updateQuestion = (secId: string, qId: string, patch: Partial<FormQuestion>) => {
    if (!schema) return;
    const updated = {
      ...schema,
      sections: schema.sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          questions: s.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)),
        };
      }),
    };
    setSchema(updated);
  };

  const addOption = (secId: string, qId: string) => {
    if (!schema) return;
    const sec = schema.sections.find((s) => s.id === secId);
    const q = sec?.questions.find((item) => item.id === qId);
    const currentOptions = q?.options || [];
    updateQuestion(secId, qId, {
      options: [...currentOptions, `Option ${currentOptions.length + 1}`],
    });
  };

  const updateOption = (secId: string, qId: string, optIndex: number, value: string) => {
    if (!schema) return;
    const sec = schema.sections.find((s) => s.id === secId);
    const q = sec?.questions.find((item) => item.id === qId);
    if (!q || !q.options) return;

    const newOptions = [...q.options];
    newOptions[optIndex] = value;
    updateQuestion(secId, qId, { options: newOptions });
  };

  const removeOption = (secId: string, qId: string, optIndex: number) => {
    if (!schema) return;
    const sec = schema.sections.find((s) => s.id === secId);
    const q = sec?.questions.find((item) => item.id === qId);
    if (!q || !q.options || q.options.length <= 1) return;

    const newOptions = q.options.filter((_, i) => i !== optIndex);
    updateQuestion(secId, qId, { options: newOptions });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <span className="text-sm text-slate-400">Loading form workspace...</span>
        </div>
      </div>
    );
  }

  if (loadError || !schema) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />
        <h3 className="text-base font-bold text-red-200">Unable to load form</h3>
        <p className="text-xs text-red-300 mt-1">{loadError || 'Invalid schema format'}</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500/30"
        >
          Return to My Forms
        </button>
      </div>
    );
  }

  const activeQuestion = schema.sections
    .flatMap((s) => s.questions)
    .find((q) => q.id === selectedQuestionId);

  return (
    <div className="space-y-4 pb-12 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#1E2536] bg-[#0E121B] p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-slate-700 bg-[#161C2B] p-2 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
                {schema.title || 'Untitled Form'}
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-purple-300">
                v{form?.version || 1}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  form?.status === 'published'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                {form?.status?.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {saveSuccess ? '✓ All changes saved locally' : 'Form Studio Canvas'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#161C2B] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-[#1E253A]"
            >
              <History className="h-3.5 w-3.5 text-slate-400" />
              <span>Versions ({versions.length})</span>
            </button>

            {isVersionDropdownOpen && (
              <div className="absolute right-0 mt-2 z-50 w-72 rounded-xl border border-[#1E2536] bg-[#121622] p-2 shadow-2xl backdrop-blur-xl">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-[#1E2536]">
                  Version Snapshots
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
                  {versions.map((ver) => (
                    <button
                      key={ver.id}
                      onClick={() => handleRestoreVersion(ver.version)}
                      className="w-full text-left rounded-lg p-2 text-xs hover:bg-[#1A2234] transition-colors flex items-start justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">
                          Version {ver.version} {ver.version === form?.version && '(Current)'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {ver.changeNotes || 'Saved revision'}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                          {new Date(ver.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <RotateCcw className="h-3 w-3 text-slate-500 mt-1" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex rounded-lg border border-slate-700 bg-[#141A28] p-0.5">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#161C2B] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-[#20273D] transition-colors"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
            ) : saveSuccess ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Save className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save'}</span>
          </button>

          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-95"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Publish to Google</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1E2536]">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Form Structure
                </span>
              </div>
              <button
                onClick={addSection}
                title="Add Section"
                className="flex items-center gap-1 rounded-md bg-[#1B2234] hover:bg-[#252E46] px-2 py-1 text-[11px] font-medium text-purple-300 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Section</span>
              </button>
            </div>

            <div className="space-y-4">
              {schema.sections.map((sec, secIdx) => (
                <div key={sec.id} className="space-y-1">
                  <div
                    onClick={() => setSelectedSectionId(sec.id)}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                      selectedSectionId === sec.id
                        ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30'
                        : 'text-slate-300 hover:bg-[#161C2B]'
                    }`}
                  >
                    <span className="truncate">
                      {secIdx + 1}. {sec.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSection(sec.id);
                      }}
                      title="Delete Section"
                      className="text-slate-500 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="pl-3 space-y-1">
                    {sec.questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        onClick={() => {
                          setSelectedSectionId(sec.id);
                          setSelectedQuestionId(q.id);
                        }}
                        className={`flex items-center justify-between rounded-md px-2 py-1 text-xs cursor-pointer transition-colors ${
                          selectedQuestionId === q.id
                            ? 'bg-[#1D253A] text-purple-200 border-l-2 border-purple-400 font-medium'
                            : 'text-slate-400 hover:bg-[#141A28] hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate max-w-[170px]">
                          {qIdx + 1}. {q.title}
                        </span>
                        <span className="text-[9px] font-mono uppercase text-slate-500">
                          {q.type.replace('_', ' ').slice(0, 5)}
                        </span>
                      </div>
                    ))}

                    <button
                      onClick={() => addQuestion(sec.id)}
                      className="w-full mt-1 flex items-center justify-center gap-1 rounded-md border border-dashed border-slate-700/80 hover:border-purple-500/40 py-1 text-[11px] text-slate-400 hover:text-purple-300 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-4">
          {activeTab === 'editor' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border-t-4 border-t-purple-500 border border-[#1E2536] bg-[#0E121B] p-5 sm:p-6 shadow-xl">
                <input
                  type="text"
                  value={schema.title}
                  onChange={(e) => updateFormTitle(e.target.value)}
                  placeholder="Form Title"
                  className="w-full bg-transparent text-xl sm:text-2xl font-bold text-white border-b border-transparent hover:border-slate-700 focus:border-purple-500 focus:outline-hidden pb-1"
                />
                <textarea
                  rows={2}
                  value={schema.description}
                  onChange={(e) => updateFormDescription(e.target.value)}
                  placeholder="Form description for respondents..."
                  className="w-full bg-transparent text-sm text-slate-400 border-b border-transparent hover:border-slate-700 focus:border-purple-500 focus:outline-hidden mt-3 resize-none"
                />
              </div>

              {schema.sections.map((sec, secIdx) => (
                <div key={sec.id} className="space-y-4">
                  <div className="rounded-xl border border-purple-500/30 bg-[#121624] p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        Section {secIdx + 1} of {schema.sections.length}
                      </div>
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const updated = {
                            ...schema,
                            sections: schema.sections.map((s) =>
                              s.id === sec.id ? { ...s, title: e.target.value } : s
                            ),
                          };
                          setSchema(updated);
                        }}
                        className="bg-transparent font-bold text-base text-white focus:outline-hidden border-b border-transparent focus:border-purple-400 w-full mt-0.5"
                      />
                    </div>
                  </div>

                  {sec.questions.map((q) => {
                    const isSelected = selectedQuestionId === q.id;
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setSelectedSectionId(sec.id);
                          setSelectedQuestionId(q.id);
                        }}
                        className={`rounded-xl border transition-all p-5 ${
                          isSelected
                            ? 'border-purple-500 bg-[#121726] shadow-lg shadow-purple-950/20'
                            : 'border-[#1E2536] bg-[#0E121B] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => updateQuestion(sec.id, q.id, { title: e.target.value })}
                            placeholder="Question Title"
                            className="flex-1 bg-transparent font-semibold text-sm sm:text-base text-white border-b border-slate-700/60 focus:border-purple-500 focus:outline-hidden pb-1"
                          />

                          <select
                            value={q.type}
                            onChange={(e) =>
                              updateQuestion(sec.id, q.id, {
                                type: e.target.value as QuestionType,
                                options: ['multiple_choice', 'checkboxes', 'dropdown'].includes(e.target.value)
                                  ? q.options || ['Option 1', 'Option 2', 'Option 3']
                                  : undefined,
                              })
                            }
                            className="rounded-lg border border-[#232B40] bg-[#161C2C] py-1.5 px-3 text-xs text-purple-300 font-medium focus:border-purple-500 focus:outline-hidden"
                          >
                            <option value="short_answer">Short answer</option>
                            <option value="paragraph">Paragraph</option>
                            <option value="multiple_choice">Multiple choice</option>
                            <option value="checkboxes">Checkboxes</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="linear_scale">Linear scale</option>
                            <option value="rating">Rating (Stars)</option>
                            <option value="date">Date</option>
                            <option value="time">Time</option>
                            <option value="file_upload">File Upload / URL</option>
                          </select>
                        </div>

                        <input
                          type="text"
                          value={q.description || ''}
                          onChange={(e) => updateQuestion(sec.id, q.id, { description: e.target.value })}
                          placeholder="Description or helper text (optional)"
                          className="w-full bg-transparent text-xs text-slate-400 border-b border-transparent focus:border-slate-700 focus:outline-hidden pb-1 mb-4"
                        />

                        <div className="my-3">
                          {q.type === 'short_answer' && (
                            <div className="rounded-lg border border-slate-800 bg-[#0B0E17] p-2.5 text-xs text-slate-500 italic">
                              Short answer text field
                            </div>
                          )}

                          {q.type === 'paragraph' && (
                            <div className="rounded-lg border border-slate-800 bg-[#0B0E17] p-4 text-xs text-slate-500 italic">
                              Long answer text field (multiple lines)
                            </div>
                          )}

                          {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && (
                            <div className="space-y-2">
                              {(q.options || ['Option 1']).map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <div className="h-3.5 w-3.5 rounded-full border border-slate-600 bg-transparent shrink-0" />
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) =>
                                      updateOption(sec.id, q.id, optIdx, e.target.value)
                                    }
                                    className="flex-1 rounded-md border border-slate-800 bg-[#0B0E17] px-2.5 py-1 text-xs text-slate-200 focus:border-purple-500 focus:outline-hidden"
                                  />
                                  <button
                                    onClick={() => removeOption(sec.id, q.id, optIdx)}
                                    title="Delete option"
                                    className="text-slate-500 hover:text-red-400 p-1"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}

                              <button
                                onClick={() => addOption(sec.id, q.id)}
                                className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 pt-1"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Option</span>
                              </button>
                            </div>
                          )}

                          {q.type === 'linear_scale' && (
                            <div className="rounded-xl border border-slate-800 bg-[#0B0E17] p-3 text-xs space-y-2">
                              <div className="flex items-center justify-between text-slate-400">
                                <span>Min: {q.scaleMin || 1} ({q.scaleMinLabel || 'Low'})</span>
                                <span>Max: {q.scaleMax || 5} ({q.scaleMaxLabel || 'High'})</span>
                              </div>
                              <div className="flex justify-between items-center px-4 py-2 bg-[#121624] rounded-lg">
                                {Array.from(
                                  { length: (q.scaleMax || 5) - (q.scaleMin || 1) + 1 },
                                  (_, i) => (q.scaleMin || 1) + i
                                ).map((num) => (
                                  <div
                                    key={num}
                                    className="h-7 w-7 rounded-full border border-slate-700 flex items-center justify-center font-bold text-slate-300"
                                  >
                                    {num}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {q.type === 'rating' && (
                            <div className="flex items-center gap-2 p-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className="text-xl text-amber-400">
                                  ★
                                </span>
                              ))}
                              <span className="text-xs text-slate-400 ml-2">
                                (5 Star Rating scale)
                              </span>
                            </div>
                          )}

                          {(q.type === 'date' || q.type === 'time') && (
                            <div className="rounded-lg border border-slate-800 bg-[#0B0E17] p-2.5 text-xs text-slate-400 font-mono">
                              {q.type === 'date' ? '📅 Date Picker (DD/MM/YYYY)' : '⏰ Time Picker (HH:MM)'}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#1E2536] flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveQuestion(sec.id, q.id, 'up')}
                              title="Move Up"
                              className="rounded-md p-1.5 text-slate-400 hover:bg-[#1E2536] hover:text-white"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => moveQuestion(sec.id, q.id, 'down')}
                              title="Move Down"
                              className="rounded-md p-1.5 text-slate-400 hover:bg-[#1E2536] hover:text-white"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => duplicateQuestion(sec.id, q.id)}
                              title="Duplicate Question"
                              className="rounded-md p-1.5 text-slate-400 hover:bg-[#1E2536] hover:text-white"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteQuestion(sec.id, q.id)}
                              title="Delete Question"
                              className="rounded-md p-1.5 text-slate-400 hover:bg-[#1E2536] hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-300 font-medium cursor-pointer">
                              Required
                            </label>
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) =>
                                updateQuestion(sec.id, q.id, { required: e.target.checked })
                              }
                              className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 accent-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center gap-2 mb-2">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`rounded-lg p-2 flex items-center gap-1.5 text-xs font-semibold ${
                    previewDevice === 'desktop'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#141A28] text-slate-400'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={`rounded-lg p-2 flex items-center gap-1.5 text-xs font-semibold ${
                    previewDevice === 'tablet'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#141A28] text-slate-400'
                  }`}
                >
                  <Tablet className="h-4 w-4" />
                  <span>Tablet</span>
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`rounded-lg p-2 flex items-center gap-1.5 text-xs font-semibold ${
                    previewDevice === 'mobile'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#141A28] text-slate-400'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile</span>
                </button>
              </div>

              <div
                className={`mx-auto rounded-2xl border border-[#2A344C] bg-[#121622] p-6 shadow-2xl transition-all ${
                  previewDevice === 'mobile'
                    ? 'max-w-sm'
                    : previewDevice === 'tablet'
                    ? 'max-w-xl'
                    : 'w-full'
                }`}
              >
                <div className="border-b border-[#232B40] pb-4 mb-6">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {schema.title}
                  </h2>
                  {schema.description && (
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                      {schema.description}
                    </p>
                  )}
                  <div className="mt-3 text-[11px] text-red-400 font-medium">
                    * Indicates required question
                  </div>
                </div>

                <div className="space-y-6">
                  {schema.sections.map((sec, secIdx) => (
                    <div key={sec.id} className="space-y-5">
                      {schema.sections.length > 1 && (
                        <div className="border-l-2 border-purple-500 pl-3 py-1">
                          <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider">
                            Section {secIdx + 1}: {sec.title}
                          </h4>
                          {sec.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{sec.description}</p>
                          )}
                        </div>
                      )}

                      {sec.questions.map((q) => (
                        <div key={q.id} className="rounded-xl border border-[#1F273B] bg-[#0E121B] p-4">
                          <label className="block text-sm font-medium text-slate-200 mb-1">
                            {q.title}{' '}
                            {q.required && <span className="text-red-400">*</span>}
                          </label>
                          {q.description && (
                            <p className="text-xs text-slate-400 mb-3">{q.description}</p>
                          )}

                          {q.type === 'short_answer' && (
                            <input
                              type="text"
                              placeholder="Your answer"
                              className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
                            />
                          )}

                          {q.type === 'paragraph' && (
                            <textarea
                              rows={3}
                              placeholder="Your answer"
                              className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
                            />
                          )}

                          {q.type === 'multiple_choice' && (
                            <div className="space-y-2 mt-2">
                              {(q.options || []).map((opt, i) => (
                                <label
                                  key={i}
                                  className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    className="h-4 w-4 border-slate-700 bg-slate-800 accent-purple-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {q.type === 'checkboxes' && (
                            <div className="space-y-2 mt-2">
                              {(q.options || []).map((opt, i) => (
                                <label
                                  key={i}
                                  className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 accent-purple-600"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {q.type === 'dropdown' && (
                            <select className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white">
                              <option value="">Choose an option...</option>
                              {(q.options || []).map((opt, i) => (
                                <option key={i} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          )}

                          {q.type === 'linear_scale' && (
                            <div className="mt-3">
                              <div className="flex justify-between items-center gap-1">
                                <span className="text-[10px] text-slate-500">
                                  {q.scaleMinLabel || 'Low'}
                                </span>
                                <div className="flex items-center gap-2">
                                  {Array.from(
                                    { length: (q.scaleMax || 5) - (q.scaleMin || 1) + 1 },
                                    (_, i) => (q.scaleMin || 1) + i
                                  ).map((val) => (
                                    <label key={val} className="text-center cursor-pointer">
                                      <div className="text-[11px] text-slate-400 mb-1">{val}</div>
                                      <input
                                        type="radio"
                                        name={q.id}
                                        className="h-4 w-4 accent-purple-600"
                                      />
                                    </label>
                                  ))}
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  {q.scaleMaxLabel || 'High'}
                                </span>
                              </div>
                            </div>
                          )}

                          {q.type === 'rating' && (
                            <div className="flex items-center gap-2 mt-2">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="text-2xl text-slate-600 hover:text-amber-400 transition-colors"
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === 'date' && (
                            <input
                              type="date"
                              className="rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white"
                            />
                          )}

                          {q.type === 'time' && (
                            <input
                              type="time"
                              className="rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white"
                            />
                          )}

                          {q.type === 'file_upload' && (
                            <div className="rounded-lg border border-dashed border-slate-700 bg-[#141A28] p-4 text-center text-xs text-slate-400">
                              Upload document or submit public link
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-purple-500"
                  >
                    Submit Form Response
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-4 flex flex-col h-[750px] shadow-xl">
            <div className="flex rounded-lg border border-[#1E2536] bg-[#141A28] p-0.5 mb-3 shrink-0">
              <button
                onClick={() => setRightPanelTab('copilot')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  rightPanelTab === 'copilot'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>AI Copilot</span>
              </button>
              <button
                onClick={() => setRightPanelTab('properties')}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  rightPanelTab === 'properties'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Properties</span>
              </button>
            </div>

            {rightPanelTab === 'copilot' ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="text-[11px] text-slate-400 mb-3 bg-[#121624] p-2.5 rounded-lg border border-[#1F273B] shrink-0">
                  <span className="font-semibold text-purple-300 block mb-0.5">
                    Conversational AI Editor
                  </span>
                  Modify your form using natural language commands. Changes are applied automatically.
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {copilotHistory.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      <Sparkles className="h-6 w-6 text-purple-500/50 mx-auto mb-2" />
                      <p>Try asking:</p>
                      <div className="mt-2 space-y-1.5 text-[11px] text-slate-400">
                        <button
                          onClick={() => setCopilotInstruction('Add a question for LinkedIn profile')}
                          className="block w-full text-left bg-[#141A28] p-1.5 rounded-md hover:bg-[#1B2338]"
                        >
                          "Add a question for LinkedIn profile"
                        </button>
                        <button
                          onClick={() => setCopilotInstruction('Make all contact questions required')}
                          className="block w-full text-left bg-[#141A28] p-1.5 rounded-md hover:bg-[#1B2338]"
                        >
                          "Make all contact questions required"
                        </button>
                        <button
                          onClick={() => setCopilotInstruction('Add an education section with graduation year')}
                          className="block w-full text-left bg-[#141A28] p-1.5 rounded-md hover:bg-[#1B2338]"
                        >
                          "Add an education section"
                        </button>
                      </div>
                    </div>
                  ) : (
                    copilotHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[#1F273B] bg-[#121622] p-2.5 text-xs space-y-1"
                      >
                        <div className="font-semibold text-slate-200">"{item.instruction}"</div>
                        <div className="text-[11px] text-purple-300">{item.summary}</div>
                        <div className="pt-1 flex justify-end">
                          <button
                            onClick={() => handleUndoAIEdit(idx)}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Undo Edit</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleCopilotSubmit} className="mt-3 pt-3 border-t border-[#1E2536] shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      disabled={isCopilotBusy}
                      value={copilotInstruction}
                      onChange={(e) => setCopilotInstruction(e.target.value)}
                      placeholder="e.g. Add 3 React technical questions..."
                      className="w-full rounded-xl border border-[#232B40] bg-[#141A28] py-2.5 pl-3 pr-9 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={isCopilotBusy || !copilotInstruction.trim()}
                      className="absolute right-1.5 top-1.5 rounded-lg bg-purple-600 p-1.5 text-white hover:bg-purple-500 disabled:opacity-40 transition-colors"
                    >
                      {isCopilotBusy ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                {activeQuestion ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block text-sm">
                        {activeQuestion.title}
                      </span>
                      <span className="text-[10px] text-purple-400 font-mono uppercase">
                        Type: {activeQuestion.type}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium">Question Identifier (ID)</label>
                      <input
                        type="text"
                        disabled
                        value={activeQuestion.id}
                        className="w-full rounded-md border border-slate-800 bg-[#0B0E17] py-1.5 px-2 text-slate-500 font-mono text-[11px]"
                      />
                    </div>

                    {activeQuestion.type === 'linear_scale' && (
                      <div className="space-y-3 pt-2 border-t border-[#1E2536]">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-slate-400">Min Value</label>
                            <input
                              type="number"
                              min={0}
                              max={1}
                              value={activeQuestion.scaleMin ?? 1}
                              onChange={(e) =>
                                updateQuestion(selectedSectionId, activeQuestion.id, {
                                  scaleMin: Number(e.target.value),
                                })
                              }
                              className="w-full rounded-md border border-slate-800 bg-[#141A28] py-1 px-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400">Max Value</label>
                            <input
                              type="number"
                              min={2}
                              max={10}
                              value={activeQuestion.scaleMax ?? 5}
                              onChange={(e) =>
                                updateQuestion(selectedSectionId, activeQuestion.id, {
                                  scaleMax: Number(e.target.value),
                                })
                              }
                              className="w-full rounded-md border border-slate-800 bg-[#141A28] py-1 px-2 text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-400">Min Label</label>
                          <input
                            type="text"
                            value={activeQuestion.scaleMinLabel || ''}
                            onChange={(e) =>
                              updateQuestion(selectedSectionId, activeQuestion.id, {
                                scaleMinLabel: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-slate-800 bg-[#141A28] py-1 px-2 text-white"
                          />
                        </div>

                        <div>
                          <label className="text-slate-400">Max Label</label>
                          <input
                            type="text"
                            value={activeQuestion.scaleMaxLabel || ''}
                            onChange={(e) =>
                              updateQuestion(selectedSectionId, activeQuestion.id, {
                                scaleMaxLabel: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-slate-800 bg-[#141A28] py-1 px-2 text-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#1E2536]">
                      <label className="text-slate-400 font-medium">Custom Validation Pattern (Regex)</label>
                      <input
                        type="text"
                        placeholder="e.g. ^[0-9]+$"
                        value={activeQuestion.validation?.pattern || ''}
                        onChange={(e) =>
                          updateQuestion(selectedSectionId, activeQuestion.id, {
                            validation: {
                              ...activeQuestion.validation,
                              pattern: e.target.value,
                            },
                          })
                        }
                        className="w-full mt-1 rounded-md border border-slate-800 bg-[#141A28] py-1.5 px-2 text-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Click any question in the canvas to inspect its fine-grained properties.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#252F47] bg-[#0E121B] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2536]">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  Publish to Google Forms
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsPublishModalOpen(false);
                  setPublishResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {publishResult?.googleFormUrl ? (
              <div className="space-y-4 text-center py-2">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Published Successfully!
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Your form is live and stored in your Google account.
                  </p>
                </div>

                <div className="space-y-2 text-left bg-[#121622] p-3 rounded-xl border border-[#1E2536]">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Public Form Responder URL:
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        readOnly
                        value={publishResult.googleFormUrl}
                        className="flex-1 bg-[#0A0D15] rounded-md px-2 py-1 text-xs text-purple-300 font-mono border border-slate-800"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(publishResult.googleFormUrl!);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="rounded-md bg-[#1B2234] p-1.5 text-slate-300 hover:text-white"
                      >
                        {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {publishResult.googleEditUrl && (
                    <div className="pt-2">
                      <a
                        href={publishResult.googleEditUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 py-2 text-xs font-semibold transition-colors border border-emerald-500/30"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open in Google Forms Editor</span>
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsPublishModalOpen(false)}
                  className="w-full rounded-xl bg-purple-600 py-2 text-xs font-semibold text-white hover:bg-purple-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  FormGenius will create a brand new Google Form on your Google Drive, translate all sections, questions, and option choices into Google Forms API requests, and provide you with the live shareable URL.
                </p>

                <div className="rounded-xl border border-[#1E2536] bg-[#121622] p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Target Account
                    </span>
                    {isConnected ? (
                      <span className="text-xs font-bold text-white font-mono mt-0.5 block truncate max-w-[200px]">
                        {googleEmail}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-medium">
                        Not Connected
                      </span>
                    )}
                  </div>

                  {!isConnected && (
                    <button
                      onClick={connectGoogle}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
                    >
                      Connect Google
                    </button>
                  )}
                </div>

                {publishResult?.error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{publishResult.error}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-700 bg-[#161C2B] py-2.5 text-xs font-semibold text-slate-300 hover:bg-[#1E253A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!isConnected || isPublishing}
                    onClick={handlePublish}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        <span>Publishing to Google...</span>
                      </span>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Confirm & Publish</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
