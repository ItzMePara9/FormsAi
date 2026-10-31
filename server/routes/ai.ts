import express from 'express';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { prisma } from '../db.ts';
import { encrypt, decrypt, maskSecret } from '../lib/crypto.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { FormSchema, sanitizeAndValidateFormSchema } from '../../src/types/form.ts';

const router = express.Router();

export function isGeminiProvider(providerType?: string | null, baseUrl?: string | null): boolean {
  if (!providerType) {
    if (baseUrl && baseUrl.includes('generativelanguage.googleapis.com')) return true;
    return false;
  }
  const p = providerType.toLowerCase().trim();
  if (['gemini', 'google', 'google-ai-studio', 'google-genai', 'google_ai_studio'].includes(p)) {
    return true;
  }
  if (baseUrl && baseUrl.includes('generativelanguage.googleapis.com') && !baseUrl.includes('/openai')) {
    return true;
  }
  return false;
}

export function normalizeProviderType(providerType?: string | null): string {
  if (!providerType) return 'gemini';
  const p = providerType.toLowerCase().trim();
  if (['gemini', 'google', 'google-ai-studio', 'google-genai', 'google_ai_studio'].includes(p)) {
    return 'gemini';
  }
  return 'openai';
}

export function normalizeGeminiModel(modelId?: string | null): string {
  if (!modelId) return 'gemini-3.1-flash-lite';
  const clean = modelId.replace(/^models\//, '').trim();
  if (clean === 'gemini-2.0-flash' || clean === 'gemini-1.5-flash') {
    return 'gemini-3.1-flash-lite';
  }
  if (clean === 'gemini-2.5-flash' || clean === 'gemini-1.5-pro') {
    return 'gemini-3.8-flash';
  }
  if (clean === 'gemini-3.8-pro' || clean === 'gemini-2.0-pro') {
    return 'gemini-4-argon';
  }
  return clean;
}

async function callGemini(
  ai: GoogleGenAI,
  modelId: string,
  contents: any,
  config?: any
): Promise<{ text: string; modelUsed: string }> {
  const normalizedPrimary = normalizeGeminiModel(modelId);
  const candidates = [normalizedPrimary];
  if (normalizedPrimary !== 'gemini-3.1-flash-lite') {
    candidates.push('gemini-3.1-flash-lite');
  }
  if (normalizedPrimary !== 'gemini-3.8-flash' && !candidates.includes('gemini-3.8-flash')) {
    candidates.push('gemini-3.8-flash');
  }

  let lastErr: any = null;
  for (const m of candidates) {
    try {
      const sanitizedConfig: any = { ...(config || {}) };
      // Do not pass deprecated sampling params to gemini-3.8-flash or gemini-4-argon
      if (m.startsWith('gemini-3.8') || m.startsWith('gemini-4')) {
        delete sanitizedConfig.temperature;
        delete sanitizedConfig.topP;
        delete sanitizedConfig.topK;
      }
      const response = await ai.models.generateContent({
        model: m,
        contents,
        config: sanitizedConfig,
      });
      return { text: response.text || '', modelUsed: m };
    } catch (err: any) {
      lastErr = err;
      console.warn(`Gemini generation on model "${m}" failed:`, err?.status || err?.message);
      const isRetryable =
        err?.status === 503 ||
        err?.status === 404 ||
        err?.message?.includes('503') ||
        err?.message?.includes('404') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('no longer available');

      if (isRetryable) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

router.get('/models', requireAuth, async (_req, res) => {
  try {
    const models = await prisma.aIProvider.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    const safeModels = models.map((m) => {
      let hasKey = false;
      let maskedKey = '';
      if (m.encryptedApiKey) {
        try {
          const rawKey = decrypt(m.encryptedApiKey);
          hasKey = !!rawKey;
          maskedKey = maskSecret(rawKey);
        } catch {
          hasKey = true;
          maskedKey = '••••••••';
        }
      }

      return {
        id: m.id,
        name: m.name,
        providerType: m.providerType,
        baseUrl: m.baseUrl,
        modelId: m.modelId,
        modelNickname: m.modelNickname,
        customSettings: m.customSettings ? JSON.parse(m.customSettings) : null,
        isDefault: m.isDefault,
        isEnabled: m.isEnabled,
        hasKey,
        maskedKey,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    });

    res.json(safeModels);
  } catch (error: any) {
    console.error('Fetch models error:', error);
    res.status(500).json({ error: 'Failed to fetch AI models' });
  }
});

router.post('/models', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      name,
      providerType,
      baseUrl,
      apiKey,
      modelId,
      modelNickname,
      customSettings,
      isDefault,
      isEnabled,
    } = req.body;

    if (!name || !providerType || !modelId) {
      return res.status(400).json({ error: 'Name, provider type, and model ID are required' });
    }

    const normalizedProvider = normalizeProviderType(providerType);
    const normalizedModel = normalizedProvider === 'gemini' ? normalizeGeminiModel(modelId) : modelId.trim();

    let encryptedKey = '';
    const keyToUse =
      apiKey?.trim() ||
      (normalizedProvider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY) ||
      '';
    if (keyToUse) {
      encryptedKey = encrypt(keyToUse);
    }

    if (isDefault) {
      await prisma.aIProvider.updateMany({
        data: { isDefault: false },
      });
    }

    const newModel = await prisma.aIProvider.create({
      data: {
        name: name.trim(),
        providerType: normalizedProvider,
        baseUrl: baseUrl?.trim() || (normalizedProvider === 'gemini' ? 'https://generativelanguage.googleapis.com' : null),
        encryptedApiKey: encryptedKey,
        modelId: normalizedModel,
        modelNickname: (modelNickname || normalizedModel).trim(),
        customSettings: customSettings ? JSON.stringify(customSettings) : null,
        isDefault: Boolean(isDefault),
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'AI_MODEL_CREATED',
        details: `Created model ${newModel.modelNickname} (${newModel.modelId})`,
        entityId: newModel.id,
      },
    });

    res.json({
      id: newModel.id,
      name: newModel.name,
      providerType: newModel.providerType,
      baseUrl: newModel.baseUrl,
      modelId: newModel.modelId,
      modelNickname: newModel.modelNickname,
      isDefault: newModel.isDefault,
      isEnabled: newModel.isEnabled,
      hasKey: !!keyToUse,
      maskedKey: maskSecret(keyToUse),
    });
  } catch (error: any) {
    console.error('Create model error:', error);
    res.status(500).json({ error: error.message || 'Failed to create AI model' });
  }
});

router.put('/models/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      providerType,
      baseUrl,
      apiKey,
      modelId,
      modelNickname,
      customSettings,
      isDefault,
      isEnabled,
    } = req.body;

    const existing = await prisma.aIProvider.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const normalizedProvider = providerType !== undefined ? normalizeProviderType(providerType) : existing.providerType;
    let normalizedModel = existing.modelId;
    if (modelId !== undefined) {
      normalizedModel = normalizedProvider === 'gemini' ? normalizeGeminiModel(modelId) : modelId.trim();
    }

    let encryptedKey = existing.encryptedApiKey;
    if (apiKey && apiKey.trim()) {
      encryptedKey = encrypt(apiKey.trim());
    } else if (!encryptedKey && normalizedProvider === 'gemini' && process.env.GEMINI_API_KEY) {
      encryptedKey = encrypt(process.env.GEMINI_API_KEY);
    }

    if (isDefault) {
      await prisma.aIProvider.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.aIProvider.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        providerType: normalizedProvider,
        baseUrl: baseUrl !== undefined ? (baseUrl?.trim() || null) : existing.baseUrl,
        encryptedApiKey: encryptedKey,
        modelId: normalizedModel,
        modelNickname: modelNickname !== undefined ? modelNickname.trim() : existing.modelNickname,
        customSettings: customSettings !== undefined ? JSON.stringify(customSettings) : existing.customSettings,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
        isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : existing.isEnabled,
      },
    });

    res.json({ success: true, model: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update model' });
  }
});

router.post('/models/:id/set-default', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.aIProvider.updateMany({ data: { isDefault: false } });
    await prisma.aIProvider.update({
      where: { id },
      data: { isDefault: true, isEnabled: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set default model' });
  }
});

router.delete('/models/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.aIProvider.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

router.post('/models/:id/test', requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const model = await prisma.aIProvider.findUnique({ where: { id } });
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const isGemini = isGeminiProvider(model.providerType, model.baseUrl);

    let apiKey = '';
    if (model.encryptedApiKey) {
      apiKey = decrypt(model.encryptedApiKey);
    }
    if (!apiKey && isGemini) {
      apiKey = process.env.GEMINI_API_KEY || '';
    }
    if (!apiKey && !isGemini) {
      apiKey = process.env.OPENAI_API_KEY || '';
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'No API key configured for this model.' });
    }

    let reply = '';
    let usedModel = model.modelId;

    if (isGemini) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });
      const result = await callGemini(
        ai,
        model.modelId || 'gemini-3.1-flash-lite',
        'Ping test. Reply with exactly "PONG".'
      );
      reply = result.text;
      usedModel = result.modelUsed;
    } else {
      let effectiveBaseUrl = model.baseUrl || undefined;
      if (effectiveBaseUrl && effectiveBaseUrl.includes('generativelanguage.googleapis.com') && !effectiveBaseUrl.includes('/openai')) {
        effectiveBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      }

      const client = new OpenAI({
        apiKey,
        baseURL: effectiveBaseUrl,
      });
      const completion = await client.chat.completions.create({
        model: model.modelId || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Ping test. Reply with exactly "PONG".' }],
        max_tokens: 10,
      });
      reply = completion.choices[0]?.message?.content || '';
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      success: true,
      latencyMs,
      reply: reply.trim().slice(0, 100),
      message: `Connection successful with ${usedModel}! (${latencyMs}ms)`,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Model test error:', error);
    res.status(400).json({
      success: false,
      latencyMs,
      error: error.message || 'Connection test failed. Check API key and model settings.',
    });
  }
});

async function resolveActiveModel(requestedModelId?: string) {
  let model = null;
  if (requestedModelId) {
    model = await prisma.aIProvider.findUnique({ where: { id: requestedModelId } });
  }
  if (!model) {
    model = await prisma.aIProvider.findFirst({
      where: { isDefault: true, isEnabled: true },
    });
  }
  if (!model) {
    model = await prisma.aIProvider.findFirst({
      where: { isEnabled: true },
    });
  }
  if (!model) {
    throw new Error('No enabled AI model found. Please configure a model in AI Models section.');
  }

  const isGemini = isGeminiProvider(model.providerType, model.baseUrl);

  let apiKey = '';
  if (model.encryptedApiKey) {
    apiKey = decrypt(model.encryptedApiKey);
  }
  if (!apiKey && isGemini) {
    apiKey = process.env.GEMINI_API_KEY || '';
  }
  if (!apiKey && !isGemini) {
    apiKey = process.env.OPENAI_API_KEY || '';
  }

  if (!apiKey) {
    throw new Error(`API key is missing for model "${model.modelNickname}". Please edit the model and enter a valid key.`);
  }

  return { model, apiKey, isGemini };
}

router.post('/generate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      prompt,
      modelId,
      formType = 'General',
      language = 'en',
      complexity = 'Medium',
      questionCount,
      tone = 'Professional',
      includeSections = true,
    } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please provide a prompt describing your form requirements.' });
    }

    const { model, apiKey, isGemini } = await resolveActiveModel(modelId);

    const systemPrompt = `You are FormGenius AI, an expert form designer and Google Forms architect.
Your task is to transform the user's natural language request into a professional, highly structured Form schema JSON.

Allowed question types:
- "short_answer" (single line text)
- "paragraph" (multi-line feedback or explanations)
- "multiple_choice" (radio buttons: single selection, options array required)
- "checkboxes" (multiple selections allowed, options array required)
- "dropdown" (select menu: options array required)
- "linear_scale" (scale rating with scaleMin: 0 or 1, scaleMax: 3-10, scaleMinLabel, scaleMaxLabel)
- "rating" (star rating, ratingMax: 5)
- "date" (date picker)
- "time" (time picker)

Guidelines:
1. Target audience: ${formType} form.
2. Language: ${language}.
3. Tone: ${tone}.
4. Complexity: ${complexity}.
5. Form structure: ${includeSections ? 'Group questions logically into 1 to 4 thematic sections.' : 'Keep in a single comprehensive section.'}
${questionCount ? `Target total question count: roughly ${questionCount} questions.` : ''}
6. Provide helpful question descriptions when appropriate.
7. Mark critical fields as required: true (e.g. name, email, vital decisions).
8. Every multiple_choice, checkboxes, and dropdown MUST have a realistic, well-worded 'options' array.

You MUST output ONLY a valid JSON object matching this TypeScript structure, with NO extra markdown or conversational text:
{
  "title": "Title of the Form",
  "description": "Clear description explaining the purpose of the form to respondents",
  "language": "${language}",
  "sections": [
    {
      "id": "sec_1",
      "title": "Section Title",
      "description": "Section guidance or description",
      "questions": [
        {
          "id": "q1",
          "title": "Question text?",
          "description": "Optional instructions",
          "type": "short_answer",
          "required": true
        }
      ]
    }
  ]
}`;

    const userMessage = `User Request:
${prompt.trim()}`;

    let rawOutput = '';
    let usedModelName = model.modelNickname;

    if (isGemini) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const geminiResult = await callGemini(
        ai,
        model.modelId || 'gemini-3.1-flash-lite',
        [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        { responseMimeType: 'application/json' }
      );

      rawOutput = geminiResult.text;
      usedModelName = `${model.modelNickname} (${geminiResult.modelUsed})`;
    } else {
      let effectiveBaseUrl = model.baseUrl || undefined;
      if (effectiveBaseUrl && effectiveBaseUrl.includes('generativelanguage.googleapis.com') && !effectiveBaseUrl.includes('/openai')) {
        effectiveBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      }

      const client = new OpenAI({
        apiKey,
        baseURL: effectiveBaseUrl,
      });

      const completion = await client.chat.completions.create({
        model: model.modelId || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
      });

      rawOutput = completion.choices[0]?.message?.content || '';
    }

    const cleanedJson = rawOutput
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error('JSON parse error from LLM output:', cleanedJson);
      throw new Error('AI output was not valid JSON. Please try again.');
    }

    const validatedSchema: FormSchema = sanitizeAndValidateFormSchema(parsedJson);

    const newForm = await prisma.form.create({
      data: {
        title: validatedSchema.title,
        description: validatedSchema.description,
        language: validatedSchema.language || language,
        schemaJson: JSON.stringify(validatedSchema),
        status: 'draft',
        modelUsed: usedModelName,
        version: 1,
      },
    });

    await prisma.formVersion.create({
      data: {
        formId: newForm.id,
        version: 1,
        title: validatedSchema.title,
        description: validatedSchema.description,
        schemaJson: JSON.stringify(validatedSchema),
        changeNotes: 'Initial AI generation from prompt',
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'FORM_GENERATED',
        details: `Generated form "${validatedSchema.title}" using ${usedModelName}`,
        entityId: newForm.id,
      },
    });

    res.json({
      success: true,
      formId: newForm.id,
      schema: validatedSchema,
      modelUsed: usedModelName,
    });
  } catch (error: any) {
    console.error('AI Generation error:', error);
    res.status(500).json({ error: error.message || 'Form generation failed' });
  }
});

router.post('/chat-edit', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentSchema, instruction, modelId } = req.body;

    if (!currentSchema || !instruction || !instruction.trim()) {
      return res.status(400).json({ error: 'currentSchema and instruction are required' });
    }

    const { model, apiKey, isGemini } = await resolveActiveModel(modelId);

    const systemPrompt = `You are FormGenius AI Copilot. You modify existing Form schemas based on user natural language edit requests.
Examples of user requests:
- "Add a GitHub profile question to the first section"
- "Make phone number mandatory"
- "Create an education section with graduation year and major"
- "Rewrite questions to sound more welcoming and casual"
- "Add 3 technical multiple-choice questions for React"
- "Translate this form into Spanish"

CRITICAL RULES:
1. Retain the overall structure and existing question IDs where possible.
2. Only modify or add what the user asks for.
3. Every question must be one of: "short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "date", "time".
4. Return ONLY a valid JSON object matching the FormSchema structure. No extra explanations outside the JSON.

Expected Output JSON structure:
{
  "summary": "Brief 1-sentence summary of what was changed (e.g. Added GitHub URL question and set Phone to required)",
  "schema": {
    "title": "...",
    "description": "...",
    "language": "...",
    "sections": [ ... ]
  }
}`;

    const userMessage = `Current Form Schema:
${JSON.stringify(currentSchema, null, 2)}

User Instruction:
${instruction.trim()}`;

    let rawOutput = '';

    if (isGemini) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });

      const result = await callGemini(
        ai,
        model.modelId || 'gemini-3.1-flash-lite',
        [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        { responseMimeType: 'application/json' }
      );

      rawOutput = result.text;
    } else {
      let effectiveBaseUrl = model.baseUrl || undefined;
      if (effectiveBaseUrl && effectiveBaseUrl.includes('generativelanguage.googleapis.com') && !effectiveBaseUrl.includes('/openai')) {
        effectiveBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      }

      const client = new OpenAI({
        apiKey,
        baseURL: effectiveBaseUrl,
      });

      const completion = await client.chat.completions.create({
        model: model.modelId || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      rawOutput = completion.choices[0]?.message?.content || '';
    }

    const cleanedJson = rawOutput
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsedJson = JSON.parse(cleanedJson);
    const targetSchemaRaw = parsedJson.schema || parsedJson;
    const validatedSchema = sanitizeAndValidateFormSchema(targetSchemaRaw);
    const summary = parsedJson.summary || 'Applied requested edits to the form';

    res.json({
      success: true,
      summary,
      schema: validatedSchema,
    });
  } catch (error: any) {
    console.error('Chat edit error:', error);
    res.status(500).json({ error: error.message || 'Failed to update form via AI Copilot' });
  }
});

export default router;
