import { FormSchema, FormQuestion, FormSection } from '../../src/types/form.ts';

export interface GoogleFormsBatchUpdateRequest {
  updateFormInfo?: {
    info: {
      title?: string;
      description?: string;
    };
    updateMask: string;
  };
  createItem?: {
    item: {
      title: string;
      description?: string;
      questionItem?: {
        question: {
          required?: boolean;
          textQuestion?: {
            paragraph: boolean;
          };
          choiceQuestion?: {
            type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
            options: Array<{ value: string }>;
          };
          scaleQuestion?: {
            low: number;
            high: number;
            lowLabel?: string;
            highLabel?: string;
          };
          dateQuestion?: {
            includeYear?: boolean;
            includeTime?: boolean;
          };
          timeQuestion?: {
            duration?: boolean;
          };
        };
      };
      pageBreakItem?: Record<string, unknown>;
    };
    location: {
      index: number;
    };
  };
}

export function convertSchemaToGoogleFormsRequests(schema: FormSchema): GoogleFormsBatchUpdateRequest[] {
  const requests: GoogleFormsBatchUpdateRequest[] = [];
  let itemIndex = 0;

  requests.push({
    updateFormInfo: {
      info: {
        title: schema.title,
        description: schema.description || '',
      },
      updateMask: 'title,description',
    },
  });

  schema.sections.forEach((section: FormSection, sectionIndex: number) => {
    if (sectionIndex > 0) {
      requests.push({
        createItem: {
          item: {
            title: section.title,
            description: section.description || '',
            pageBreakItem: {},
          },
          location: {
            index: itemIndex++,
          },
        },
      });
    }

    section.questions.forEach((q: FormQuestion) => {
      const googleQuestion = mapQuestionToGoogleItem(q);
      if (googleQuestion) {
        requests.push({
          createItem: {
            item: googleQuestion,
            location: {
              index: itemIndex++,
            },
          },
        });
      }
    });
  });

  return requests;
}

function mapQuestionToGoogleItem(q: FormQuestion) {
  const baseItem: any = {
    title: q.title,
  };
  if (q.description) {
    baseItem.description = q.description;
  }

  const question: any = {
    required: q.required,
  };

  switch (q.type) {
    case 'short_answer':
      question.textQuestion = { paragraph: false };
      break;

    case 'paragraph':
      question.textQuestion = { paragraph: true };
      break;

    case 'multiple_choice':
      question.choiceQuestion = {
        type: 'RADIO',
        options: (q.options && q.options.length > 0 ? q.options : ['Option 1']).map((opt) => ({
          value: opt,
        })),
      };
      break;

    case 'checkboxes':
      question.choiceQuestion = {
        type: 'CHECKBOX',
        options: (q.options && q.options.length > 0 ? q.options : ['Option 1']).map((opt) => ({
          value: opt,
        })),
      };
      break;

    case 'dropdown':
      question.choiceQuestion = {
        type: 'DROP_DOWN',
        options: (q.options && q.options.length > 0 ? q.options : ['Option 1']).map((opt) => ({
          value: opt,
        })),
      };
      break;

    case 'linear_scale':
    case 'rating': {
      const min = Math.min(Math.max(q.scaleMin ?? 1, 0), 1);
      const max = Math.min(Math.max(q.scaleMax ?? (q.type === 'rating' ? (q.ratingMax ?? 5) : 5), 2), 10);
      question.scaleQuestion = {
        low: min,
        high: max,
        lowLabel: q.scaleMinLabel || 'Low',
        highLabel: q.scaleMaxLabel || 'High',
      };
      break;
    }

    case 'date':
      question.dateQuestion = {
        includeYear: true,
        includeTime: false,
      };
      break;

    case 'time':
      question.timeQuestion = {
        duration: false,
      };
      break;

    case 'file_upload':
      baseItem.description = (q.description ? q.description + ' ' : '') + '(File upload / link to file)';
      question.textQuestion = { paragraph: false };
      break;

    default:
      question.textQuestion = { paragraph: false };
      break;
  }

  baseItem.questionItem = { question };
  return baseItem;
}
