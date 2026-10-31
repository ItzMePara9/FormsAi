import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Globe,
  Key,
  Shield,
  Activity,
  Zap,
  Info,
  X,
  Lock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string;
  modelId: string;
  modelNickname: string;
  isDefault: boolean;
  isEnabled: boolean;
  hasApiKey?: boolean;
  hasKey?: boolean;
  createdAt: string;
}

export const AIModelsView: React.FC = () => {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<'gemini' | 'openai'>('gemini');
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('gemini-3.1-flash-lite');
  const [modelNickname, setModelNickname] = useState('Gemini 3.1 Flash Lite (Ultra-Fast)');
  const [isDefault, setIsDefault] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  // Testing State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ai/models');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.models || []);
        setModels(list);
      }
    } catch (err) {
      console.error('Failed to load AI models:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const openAddModal = () => {
    setEditingModel(null);
    setName('Google AI Studio');
    setProviderType('gemini');
    setBaseUrl('https://generativelanguage.googleapis.com');
    setApiKey('');
    setModelId('gemini-3.1-flash-lite');
    setModelNickname('Gemini 3.1 Flash Lite (Ultra-Fast)');
    setIsDefault(models.length === 0);
    setIsEnabled(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (model: AIModel) => {
    setEditingModel(model);
    setName(model.name);
    const isGem = ['gemini', 'google', 'google-ai-studio'].includes(model.providerType?.toLowerCase());
    setProviderType(isGem ? 'gemini' : 'openai');
    setBaseUrl(model.baseUrl || (isGem ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com/v1'));
    setApiKey(''); // Never display existing key
    setModelId(model.modelId);
    setModelNickname(model.modelNickname);
    setIsDefault(model.isDefault);
    setIsEnabled(model.isEnabled);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const applyPreset = (preset: {
    name: string;
    providerType: 'gemini' | 'openai';
    baseUrl: string;
    modelId: string;
    modelNickname: string;
  }) => {
    setName(preset.name);
    setProviderType(preset.providerType);
    setBaseUrl(preset.baseUrl);
    setModelId(preset.modelId);
    setModelNickname(preset.modelNickname);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const url = editingModel ? `/api/ai/models/${editingModel.id}` : '/api/ai/models';
      const method = editingModel ? 'PUT' : 'POST';

      const payload: any = {
        name,
        providerType,
        baseUrl,
        modelId,
        modelNickname,
        isDefault,
        isEnabled,
      };

      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save model configuration.');
        return;
      }

      setIsModalOpen(false);
      await fetchModels();
    } catch (err) {
      console.error('Error saving model:', err);
      setErrorMsg('Network error while saving model.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete AI model "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/ai/models/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModels((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete model:', err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/models/${id}/set-default`, { method: 'POST' });
      if (res.ok) {
        await fetchModels();
      }
    } catch (err) {
      console.error('Failed to set default model:', err);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      setTestResult(null);
      const res = await fetch(`/api/ai/models/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({
        id,
        success: data.success,
        message: data.message || (data.success ? 'Model ping successful!' : 'Connection test failed'),
      });
    } catch (err) {
      setTestResult({
        id,
        success: false,
        message: 'Network error communicating with test endpoint.',
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-purple-400" />
            AI Model Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Configure Google AI Studio (Gemini) or any OpenAI-compatible provider with AES-256-GCM encrypted API keys.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:from-purple-500 hover:to-indigo-500 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Model</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs text-purple-200">
        <Shield className="h-5 w-5 shrink-0 text-purple-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-purple-300">
            Enterprise-Grade Credential Protection (AES-256-GCM)
          </p>
          <p className="text-slate-400 leading-relaxed">
            All API keys are encrypted at rest using authenticated AES-256-GCM with unique cryptographic initialization vectors. Raw secrets are never transmitted to client browsers, logged, or exposed in error traces.
          </p>
        </div>
      </div>

      {/* Quick Presets Section */}
      <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          One-Click Google AI Studio Presets
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              name: 'Gemini 3.1 Flash Lite',
              modelId: 'gemini-3.1-flash-lite',
              desc: 'Ultra-fast and highly responsive. Instant generation with zero latency bottlenecks.',
              speed: 'Instant (~1.0s)',
            },
            {
              name: 'Gemini 3.8 Flash',
              modelId: 'gemini-3.8-flash',
              desc: 'Recommended Gemini model. Balanced reasoning, rich options, and Google Forms schema expertise.',
              speed: 'Fast (~1.5s)',
            },
            {
              name: 'Gemini 4 Argon',
              modelId: 'gemini-4-argon',
              desc: 'Advanced reasoning for highly complex surveys, branching logic, and technical evaluation forms.',
              speed: 'Advanced (~2.5s)',
            },
          ].map((preset) => (
            <div
              key={preset.modelId}
              className="group flex flex-col justify-between rounded-xl border border-[#1E2536] bg-[#121622] p-4 hover:border-purple-500/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors">
                    {preset.name}
                  </span>
                  <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-400">
                    {preset.speed}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {preset.desc}
                </p>
              </div>

              <button
                onClick={() => {
                  openAddModal();
                  applyPreset({
                    name: 'Google AI Studio',
                    providerType: 'gemini',
                    baseUrl: 'https://generativelanguage.googleapis.com',
                    modelId: preset.modelId,
                    modelNickname: preset.name,
                  });
                }}
                className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-[#1E2536] bg-[#181D2D] py-2 text-xs font-medium text-purple-300 hover:bg-purple-600 hover:text-white transition-all"
              >
                <span>Configure Preset</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>Configured Models</span>
          <span className="rounded-full bg-[#181D2D] px-2.5 py-0.5 text-xs font-mono text-slate-400 border border-[#232A3B]">
            {models.length}
          </span>
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 animate-pulse rounded-2xl border border-[#1E2536] bg-[#0E121B]"
              />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1E2536] bg-[#0E121B]/40 py-12 text-center">
            <Cpu className="h-8 w-8 text-slate-500" />
            <h3 className="mt-3 text-sm font-semibold text-white">No AI Models Configured</h3>
            <p className="mt-1 text-xs text-slate-400">
              Add your Google AI Studio or OpenAI API key to start generating forms.
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500"
            >
              <Plus className="h-4 w-4" />
              <span>Add Model</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => {
              const result = testResult?.id === model.id ? testResult : null;
              return (
                <div
                  key={model.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[#1E2536] bg-[#0E121B] p-5 transition-all hover:border-slate-700 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#161B26] text-purple-400 border border-[#202738]">
                      <Cpu className="h-5 w-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">
                          {model.modelNickname || model.modelId}
                        </h3>

                        {model.isDefault && (
                          <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/20">
                            Default Model
                          </span>
                        )}

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                            model.isEnabled
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {model.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Provider: <strong className="text-slate-300">{model.name}</strong></span>
                        <span>•</span>
                        <span>Model ID: <code className="text-purple-300 font-mono text-[11px]">{model.modelId}</code></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Lock className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 text-[11px]">Key Encrypted</span>
                        </span>
                      </div>

                      {/* Connection Test Result Badge */}
                      {result && (
                        <div
                          className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${
                            result.success
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {result.success ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" />
                          )}
                          <span>{result.message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t border-[#1E2536] md:border-t-0">
                    <button
                      onClick={() => handleTestConnection(model.id)}
                      disabled={testingId === model.id}
                      className="flex items-center gap-1.5 rounded-xl border border-[#1E2536] bg-[#121622] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-[#181D2D] transition-colors disabled:opacity-50"
                    >
                      {testingId === model.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
                      ) : (
                        <Activity className="h-3.5 w-3.5 text-purple-400" />
                      )}
                      <span>Test Connection</span>
                    </button>

                    {!model.isDefault && (
                      <button
                        onClick={() => handleSetDefault(model.id)}
                        className="rounded-xl border border-[#1E2536] bg-[#121622] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-[#181D2D] transition-colors"
                      >
                        Make Default
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(model)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-[#1A202E] hover:text-white transition-colors"
                      title="Edit model"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(model.id, model.modelNickname || model.modelId)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      title="Delete model"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-[#1E2536] bg-[#0E121B] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1E2536] px-6 py-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-purple-400" />
                {editingModel ? 'Edit AI Model' : 'Add AI Model Configuration'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-[#1A202E] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Provider Nickname */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Provider Nickname
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Google AI Studio, Production OpenAI, Groq Cloud"
                  className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
                />
              </div>

              {/* Provider Type */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setProviderType('gemini');
                    setBaseUrl('https://generativelanguage.googleapis.com');
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    providerType === 'gemini'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-[#1E2536] bg-[#121622] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-semibold">Google AI Studio</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Gemini 3.1 / 3.8 / 4 API</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProviderType('openai');
                    setBaseUrl('https://api.openai.com/v1');
                  }}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    providerType === 'openai'
                      ? 'border-purple-500 bg-purple-500/10 text-white'
                      : 'border-[#1E2536] bg-[#121622] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-semibold">OpenAI-Compatible</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">GPT-4o, Groq, DeepSeek</span>
                </button>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  API Base URL
                </label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Model ID & Nickname */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Model ID
                  </label>
                  <input
                    type="text"
                    required
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="gemini-3.8-flash, gpt-4o, etc."
                    className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Model Nickname
                  </label>
                  <input
                    type="text"
                    required
                    value={modelNickname}
                    onChange={(e) => setModelNickname(e.target.value)}
                    placeholder="e.g. Gemini 3.8 Flash (Fast)"
                    className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    API Key
                  </label>
                  {editingModel?.hasApiKey && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      (Encrypted key stored: leave blank to keep unchanged)
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required={!editingModel}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={editingModel?.hasApiKey ? '••••••••••••••••' : 'Enter API secret key'}
                  className="w-full rounded-xl border border-[#1E2536] bg-[#121622] px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-[#1E2536] bg-[#121622] text-purple-600 focus:ring-purple-500"
                  />
                  <span>Set as default model for new form generations</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-[#1E2536] bg-[#121622] text-purple-600 focus:ring-purple-500"
                  />
                  <span>Enable model for form generation and copilot chat</span>
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E2536]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[#1E2536] bg-[#121622] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-[#1A202E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/20 hover:bg-purple-500 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingModel ? 'Update Model' : 'Save Model'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
