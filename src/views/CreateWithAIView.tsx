import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Globe,
  ArrowRight,
  AlertCircle,
  Cpu,
  ListFilter,
  Type,
} from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  modelId: string;
  modelNickname: string;
  providerType: string;
  isDefault: boolean;
  isEnabled: boolean;
}

interface CreateWithAIViewProps {
  initialPrompt?: string;
  onFormCreated: (formId: string) => void;
  onNavigate: (tab: any) => void;
}

export const CreateWithAIView: React.FC<CreateWithAIViewProps> = ({
  initialPrompt = '',
  onFormCreated,
  onNavigate,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [formType, setFormType] = useState('Job Application');
  const [language, setLanguage] = useState('en');
  const [complexity, setComplexity] = useState('Standard');
  const [tone, setTone] = useState('Professional');
  const [includeSections, setIncludeSections] = useState(true);
  const [targetQuestions, setTargetQuestions] = useState(8);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
    loadModels();
  }, [initialPrompt]);

  const loadModels = async () => {
    try {
      const res = await fetch('/api/ai/models');
      if (res.ok) {
        const data = await res.json();
        const enabledModels = data.filter((m: AIModel) => m.isEnabled);
        setModels(enabledModels);
        const defaultModel = enabledModels.find((m: AIModel) => m.isDefault);
        if (defaultModel) {
          setSelectedModelId(defaultModel.id);
        } else if (enabledModels.length > 0) {
          setSelectedModelId(enabledModels[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load AI models:', err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please provide a prompt describing your form requirements.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    setGenerationStep('Analyzing form objectives & questions...');
    const stepTimer1 = setTimeout(() => {
      setGenerationStep('Organizing logical sections & response types...');
    }, 1500);
    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Validating schema and rules with Zod...');
    }, 3000);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelId: selectedModelId || undefined,
          formType,
          language,
          complexity,
          tone,
          includeSections,
          questionCount: targetQuestions,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate form.');
      }

      setGenerationStep('Finalizing form editor...');
      setTimeout(() => {
        onFormCreated(data.formId);
      }, 500);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setError(err.message || 'Generation failed. Please try again or test your AI model in Settings.');
      setIsGenerating(false);
    }
  };

  const samplePrompts = [
    {
      title: 'Full-Stack Developer Application',
      text: 'Create a professional job application form for a software development company. Include applicant name, email, phone number, education, technical skills, work experience, expected salary, resume upload, LinkedIn profile, GitHub profile, and availability. Make important fields mandatory.',
    },
    {
      title: 'Customer Satisfaction & NPS Survey',
      text: 'Create a customer satisfaction survey assessing product ease-of-use, net promoter score (0-10 scale), favorite features, bug reports, and suggestions for improvement with follow-up permission.',
    },
    {
      title: 'Tech Conference Registration',
      text: 'Create an attendee registration form for a developer summit. Collect attendee name, job title, company, dietary restrictions, preferred breakout sessions, workshop participation, and attendance mode.',
    },
    {
      title: 'College Admission & Scholarship Application',
      text: 'Design an application form for high school graduates applying for a merit scholarship. Include student background, GPA, extracurriculars, essay question, and recommendation contact.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <span>Create Form with AI</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Describe the form you want to generate in natural language. FormGenius constructs structured questions, sections, and response types compatible with Google Forms.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <span className="font-semibold text-red-200">Generation Error: </span>
            <span>{error}</span>
            {error.includes('AI model') && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('models')}
                  className="rounded-lg bg-red-500/20 px-3 py-1 font-medium text-red-200 hover:bg-red-500/30 transition-colors"
                >
                  Configure AI Models →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-6">
        <div className="rounded-2xl border border-[#1E2536] bg-[#0E121B] p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Type className="h-4 w-4 text-purple-400" />
              <span>Prompt & Instructions</span>
            </label>
            <span className="text-[11px] text-slate-500">
              {prompt.length} characters
            </span>
          </div>

          <textarea
            rows={5}
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. Create a professional job application form for a software development company. Include applicant name, email, phone number, education, technical skills, work experience, expected salary, resume upload, LinkedIn profile, GitHub profile, and availability. Make important fields mandatory."
            className="w-full rounded-xl border border-[#232B40] bg-[#141A28] p-4 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 resize-y leading-relaxed font-sans"
          />

          <div className="mt-3 pt-3 border-t border-[#1C2335]">
            <span className="text-[11px] font-medium text-slate-400 block mb-2">
              Or pick an example prompt to get started:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePrompts.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(s.text)}
                  className="text-left rounded-lg border border-slate-800 bg-[#121622] p-2.5 hover:border-purple-500/40 hover:bg-[#181F30] transition-colors group"
                >
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-purple-300 block truncate">
                    {s.title}
                  </span>
                  <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {s.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
              <Cpu className="h-3.5 w-3.5 text-purple-400" />
              <span>AI Model</span>
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white focus:border-purple-500 focus:outline-hidden"
            >
              {models.length === 0 ? (
                <option value="">No AI models configured</option>
              ) : (
                models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.modelNickname} ({m.providerType.toUpperCase()})
                    {m.isDefault ? ' [Default]' : ''}
                  </option>
                ))
              )}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Supports Google AI Studio & OpenAI models
            </p>
          </div>

          <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
              <ListFilter className="h-3.5 w-3.5 text-purple-400" />
              <span>Form Type</span>
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white focus:border-purple-500 focus:outline-hidden"
            >
              <option value="Job Application">Job Application</option>
              <option value="Customer Feedback">Customer Feedback & NPS</option>
              <option value="Event Registration">Event & Conference Registration</option>
              <option value="Course Registration">Course Registration & Student Admission</option>
              <option value="Employee Survey">Employee Survey & Pulse</option>
              <option value="Contact Form">Contact & Lead Generation</option>
              <option value="Evaluation Scorecard">Interview & Evaluation Scorecard</option>
              <option value="General">Custom / General Purpose</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Optimizes terminology and question structures
            </p>
          </div>

          <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
              <Globe className="h-3.5 w-3.5 text-purple-400" />
              <span>Language</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isGenerating}
              className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white focus:border-purple-500 focus:outline-hidden"
            >
              <option value="en">English (US/UK)</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="zh">Chinese (Simplified)</option>
              <option value="pt">Portuguese (Português)</option>
              <option value="it">Italian (Italiano)</option>
              <option value="ar">Arabic (العربية)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Translates questions, options, and descriptions
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[#1E2536] bg-[#0E121B] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Complexity & Layout Preferences
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { id: 'Simple', label: 'Simple (3-5 fields)', desc: 'Quick survey or lead capture' },
              { id: 'Standard', label: 'Standard (6-10 fields)', desc: 'Standard business forms' },
              { id: 'Comprehensive', label: 'Comprehensive (12+ fields)', desc: 'Full multi-step applications' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setComplexity(c.id)}
                className={`rounded-lg p-2.5 text-left border transition-all ${
                  complexity === c.id
                    ? 'border-purple-500 bg-purple-600/15 text-white'
                    : 'border-slate-800 bg-[#121622] text-slate-400 hover:bg-[#181F30]'
                }`}
              >
                <div className="text-xs font-semibold">{c.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{c.desc}</div>
              </button>
            ))}
          </div>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-[#1C2335] grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tone of Voice
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-lg border border-[#232B40] bg-[#141A28] py-2 px-3 text-xs text-white"
                >
                  <option value="Professional">Professional & Formal</option>
                  <option value="Friendly">Friendly & Welcoming</option>
                  <option value="Academic">Academic & Rigorous</option>
                  <option value="Concise">Concise & Direct</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Questions ({targetQuestions})
                </label>
                <input
                  type="range"
                  min={3}
                  max={25}
                  value={targetQuestions}
                  onChange={(e) => setTargetQuestions(Number(e.target.value))}
                  className="w-full accent-purple-500 mt-2"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:pt-6">
                <label className="text-xs font-medium text-slate-300">
                  Split into Sections
                </label>
                <input
                  type="checkbox"
                  checked={includeSections}
                  onChange={(e) => setIncludeSections(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-slate-700 bg-slate-800 accent-purple-600"
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Generating Form with AI...</span>
              </span>
            ) : (
              <>
                <Sparkles className="h-4.5 w-4.5" />
                <span>Generate Form Schema & Open Editor</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {isGenerating && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 text-center animate-pulse">
              <p className="text-xs font-medium text-purple-300">
                {generationStep}
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
