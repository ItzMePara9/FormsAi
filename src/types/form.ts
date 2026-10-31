import { z } from 'zod';

export type QuestionType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'linear_scale'
  | 'rating'
  | 'date'
  | 'time'
  | 'file_upload';

export interface FormQuestion {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  ratingMax?: number;
  ratingIcon?: 'star' | 'heart' | 'thumb';
  validation?: {
    pattern?: string;
    errorMessage?: string;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
}

export interface FormSchema {
  title: string;
  description: string;
  language: string;
  sections: FormSection[];
}

export const FormQuestionZod = z.object({
  id: z.string().default(() => 'q_' + Math.random().toString(36).substring(2, 9)),
  title: z.string().min(1, 'Question title is required'),
  description: z.string().optional().default(''),
  type: z.enum([
    'short_answer',
    'paragraph',
    'multiple_choice',
    'checkboxes',
    'dropdown',
    'linear_scale',
    'rating',
    'date',
    'time',
    'file_upload',
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  scaleMin: z.number().optional().default(1),
  scaleMax: z.number().optional().default(5),
  scaleMinLabel: z.string().optional(),
  scaleMaxLabel: z.string().optional(),
  ratingMax: z.number().optional().default(5),
  ratingIcon: z.enum(['star', 'heart', 'thumb']).optional().default('star'),
  validation: z
    .object({
      pattern: z.string().optional(),
      errorMessage: z.string().optional(),
    })
    .optional(),
});

export const FormSectionZod = z.object({
  id: z.string().default(() => 'sec_' + Math.random().toString(36).substring(2, 9)),
  title: z.string().min(1, 'Section title is required'),
  description: z.string().optional().default(''),
  questions: z.array(FormQuestionZod).default([]),
});

export const FormSchemaZod = z.object({
  title: z.string().min(1, 'Form title is required'),
  description: z.string().default(''),
  language: z.string().default('en'),
  sections: z.array(FormSectionZod).min(1, 'At least one section is required'),
});

export function sanitizeAndValidateFormSchema(raw: any): FormSchema {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Form output must be a JSON object');
  }

  let sections = Array.isArray(raw.sections) ? raw.sections : [];
  if (sections.length === 0 && Array.isArray(raw.questions)) {
    sections = [
      {
        id: 'sec_1',
        title: raw.title || 'General Information',
        description: raw.description || '',
        questions: raw.questions,
      },
    ];
  } else if (sections.length === 0) {
    sections = [
      {
        id: 'sec_1',
        title: raw.title || 'Form Questions',
        description: '',
        questions: [],
      },
    ];
  }

  const cleanSections = sections.map((sec: any, secIdx: number) => {
    const sId = sec.id || `sec_${secIdx + 1}_${Math.random().toString(36).substring(2, 7)}`;
    const sTitle = sec.title || (secIdx === 0 ? 'General' : `Section ${secIdx + 1}`);
    const sDesc = sec.description || '';
    
    const questions = Array.isArray(sec.questions) ? sec.questions : [];
    const cleanQuestions = questions.map((q: any, qIdx: number) => {
      const qId = q.id || `q_${secIdx + 1}_${qIdx + 1}_${Math.random().toString(36).substring(2, 7)}`;
      let qType: QuestionType = 'short_answer';
      const rawType = String(q.type || '').toLowerCase().replace(/[\s-]/g, '_');
      
      if (rawType.includes('choice') || rawType === 'radio' || rawType === 'single_choice') {
        qType = 'multiple_choice';
      } else if (rawType.includes('check') || rawType === 'multi_choice') {
        qType = 'checkboxes';
      } else if (rawType.includes('drop') || rawType === 'select') {
        qType = 'dropdown';
      } else if (rawType.includes('paragraph') || rawType === 'long_answer' || rawType === 'textarea') {
        qType = 'paragraph';
      } else if (rawType.includes('scale') || rawType === 'linear') {
        qType = 'linear_scale';
      } else if (rawType.includes('rating') || rawType === 'stars') {
        qType = 'rating';
      } else if (rawType.includes('date')) {
        qType = 'date';
      } else if (rawType.includes('time')) {
        qType = 'time';
      } else if (rawType.includes('file') || rawType.includes('upload')) {
        qType = 'file_upload';
      } else {
        qType = 'short_answer';
      }

      let options = Array.isArray(q.options) ? q.options.map(String) : undefined;
      if (['multiple_choice', 'checkboxes', 'dropdown'].includes(qType) && (!options || options.length === 0)) {
        options = ['Option 1', 'Option 2', 'Option 3'];
      }

      return {
        id: qId,
        title: q.title || `Question ${qIdx + 1}`,
        description: q.description || undefined,
        type: qType,
        required: Boolean(q.required),
        options,
        scaleMin: typeof q.scaleMin === 'number' ? q.scaleMin : 1,
        scaleMax: typeof q.scaleMax === 'number' ? q.scaleMax : 5,
        scaleMinLabel: q.scaleMinLabel || 'Low',
        scaleMaxLabel: q.scaleMaxLabel || 'High',
        ratingMax: typeof q.ratingMax === 'number' ? q.ratingMax : 5,
        ratingIcon: q.ratingIcon || 'star',
      };
    });

    return {
      id: sId,
      title: sTitle,
      description: sDesc,
      questions: cleanQuestions,
    };
  });

  const parsed = FormSchemaZod.safeParse({
    title: raw.title || 'Untitled Form',
    description: raw.description || '',
    language: raw.language || 'en',
    sections: cleanSections,
  });

  if (!parsed.success) {
    throw new Error('Invalid form schema: ' + parsed.error.issues.map(i => i.message).join(', '));
  }

  return parsed.data as FormSchema;
}
