import { PrismaClient } from '@prisma/client';
import { encrypt } from './lib/crypto.ts';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function seedInitialData() {
  try {
    const defaultSettings = [
      { key: 'appName', value: 'FormGenius AI' },
      { key: 'timezone', value: 'UTC' },
      { key: 'language', value: 'en' },
      { key: 'dateFormat', value: 'YYYY-MM-DD' },
      { key: 'initialized', value: 'true' },
    ];

    for (const setting of defaultSettings) {
      await prisma.applicationSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }

    const existingModels = await prisma.aIProvider.count();
    if (existingModels === 0) {
      const geminiApiKey = process.env.GEMINI_API_KEY || '';
      await prisma.aIProvider.create({
        data: {
          name: 'Google AI Studio',
          providerType: 'gemini',
          modelId: 'gemini-3.1-flash-lite',
          modelNickname: 'Gemini 3.1 Flash Lite (Ultra-Fast)',
          baseUrl: 'https://generativelanguage.googleapis.com',
          encryptedApiKey: geminiApiKey ? encrypt(geminiApiKey) : '',
          isDefault: true,
          isEnabled: true,
        },
      });

      await prisma.aIProvider.create({
        data: {
          name: 'Google AI Studio',
          providerType: 'gemini',
          modelId: 'gemini-3.8-flash',
          modelNickname: 'Gemini 3.8 Flash (Recommended)',
          baseUrl: 'https://generativelanguage.googleapis.com',
          encryptedApiKey: geminiApiKey ? encrypt(geminiApiKey) : '',
          isDefault: false,
          isEnabled: true,
        },
      });

      const openaiApiKey = process.env.OPENAI_API_KEY || '';
      await prisma.aIProvider.create({
        data: {
          name: 'OpenAI',
          providerType: 'openai',
          modelId: 'gpt-4o',
          modelNickname: 'GPT-4o (OpenAI)',
          baseUrl: 'https://api.openai.com/v1',
          encryptedApiKey: openaiApiKey ? encrypt(openaiApiKey) : '',
          isDefault: false,
          isEnabled: !!openaiApiKey,
          customSettings: JSON.stringify({ temperature: 0.7 }),
        },
      });
    }

    const templateCount = await prisma.formTemplate.count();
    if (templateCount === 0) {
      const templates = getStarterTemplates();
      for (const t of templates) {
        await prisma.formTemplate.create({
          data: {
            title: t.title,
            description: t.description,
            category: t.category,
            tags: t.tags,
            schemaJson: JSON.stringify(t.schema),
            isBuiltIn: true,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error during initial data seeding:', error);
  }
}

function getStarterTemplates() {
  return [
    {
      title: 'Job Application',
      description: 'Comprehensive candidate application collecting personal info, resume, portfolio, experience, and role questions.',
      category: 'Hiring & HR',
      tags: 'recruitment, jobs, careers, hiring',
      schema: {
        title: 'Software Engineer Application',
        description: 'Thank you for your interest in joining our team! Please fill out the details below so we can review your background.',
        language: 'en',
        sections: [
          {
            id: 'sec-personal',
            title: 'Personal Information',
            description: 'Basic contact details',
            questions: [
              { id: 'q1', title: 'Full Name', type: 'short_answer', required: true, description: 'Enter your legal first and last name' },
              { id: 'q2', title: 'Email Address', type: 'short_answer', required: true, description: 'Best email to reach you' },
              { id: 'q3', title: 'Phone Number', type: 'short_answer', required: true, description: 'Include country code' },
              { id: 'q4', title: 'LinkedIn Profile URL', type: 'short_answer', required: false, description: 'Link to your public profile' },
              { id: 'q5', title: 'GitHub / Portfolio URL', type: 'short_answer', required: false, description: 'Link to repositories or design portfolio' },
            ],
          },
          {
            id: 'sec-experience',
            title: 'Experience & Technical Background',
            description: 'Help us understand your skills and past roles',
            questions: [
              { id: 'q6', title: 'Years of Professional Experience', type: 'dropdown', required: true, options: ['Less than 1 year', '1-3 years', '4-6 years', '7+ years'] },
              { id: 'q7', title: 'Primary Technical Skills', type: 'checkboxes', required: true, options: ['TypeScript / JavaScript', 'React / Next.js', 'Node.js / Express', 'Python / Django / FastAPI', 'PostgreSQL / SQL', 'Cloud / Docker / Kubernetes'] },
              { id: 'q8', title: 'Briefly describe your most impactful software project', type: 'paragraph', required: true, description: 'What did you build, what challenges did you solve, and what was the outcome?' },
              { id: 'q9', title: 'Expected Annual Salary (USD)', type: 'short_answer', required: true },
              { id: 'q10', title: 'Earliest Available Start Date', type: 'date', required: true },
            ],
          },
        ],
      },
    },
    {
      title: 'Customer Feedback & NPS Survey',
      description: 'Measure customer satisfaction, feature feedback, and Net Promoter Score.',
      category: 'Feedback',
      tags: 'feedback, nps, satisfaction, customer service',
      schema: {
        title: 'Customer Satisfaction Survey',
        description: 'We value your honest thoughts! Please take 2 minutes to let us know how we are doing.',
        language: 'en',
        sections: [
          {
            id: 'sec-1',
            title: 'Product Experience',
            description: 'Rating our core features',
            questions: [
              { id: 'q1', title: 'How long have you been using our product?', type: 'multiple_choice', required: true, options: ['First week', '1-3 months', '3-12 months', 'Over a year'] },
              { id: 'q2', title: 'How likely are you to recommend us to a friend or colleague?', type: 'linear_scale', required: true, scaleMin: 0, scaleMax: 10, scaleMinLabel: 'Not likely at all', scaleMaxLabel: 'Extremely likely' },
              { id: 'q3', title: 'Which features do you use most frequently?', type: 'checkboxes', required: false, options: ['AI Form Generation', 'Google Forms Export', 'Templates Library', 'Custom AI Models', 'Form Editor'] },
              { id: 'q4', title: 'What is one thing we could do to make your experience better?', type: 'paragraph', required: false },
              { id: 'q5', title: 'May we follow up with you about your feedback?', type: 'multiple_choice', required: true, options: ['Yes, absolutely', 'No, keep it anonymous'] },
            ],
          },
        ],
      },
    },
    {
      title: 'Event Registration Form',
      description: 'Collect attendee names, dietary restrictions, session preferences, and ticketing details.',
      category: 'Events',
      tags: 'conference, meetup, registration, rsvp',
      schema: {
        title: 'Tech Summit 2026 Registration',
        description: 'Join developers, designers, and founders for a day of talks and workshops.',
        language: 'en',
        sections: [
          {
            id: 'sec-reg',
            title: 'Attendee Details',
            questions: [
              { id: 'q1', title: 'Full Name', type: 'short_answer', required: true },
              { id: 'q2', title: 'Work Email', type: 'short_answer', required: true },
              { id: 'q3', title: 'Company or Organization', type: 'short_answer', required: true },
              { id: 'q4', title: 'Job Title', type: 'short_answer', required: false },
              { id: 'q5', title: 'Attendance Mode', type: 'multiple_choice', required: true, options: ['In-Person (San Francisco)', 'Virtual Live Stream'] },
              { id: 'q6', title: 'Which breakout tracks will you attend?', type: 'checkboxes', required: true, options: ['Generative AI in Production', 'Cloud & Edge Infrastructure', 'Modern UI/UX Systems', 'Open Source Security'] },
              { id: 'q7', title: 'Dietary Requirements', type: 'checkboxes', required: false, options: ['None / Standard', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher'] },
            ],
          },
        ],
      },
    },
    {
      title: 'Employee Onboarding & Registration',
      description: 'Internal registration form collecting new hire details, emergency contacts, and equipment preferences.',
      category: 'Hiring & HR',
      tags: 'onboarding, hr, employee, internal',
      schema: {
        title: 'New Hire Onboarding Form',
        description: 'Welcome to the team! Please complete this form to set up your payroll, hardware, and accounts.',
        language: 'en',
        sections: [
          {
            id: 'sec-employee',
            title: 'Employee Profile',
            questions: [
              { id: 'q1', title: 'Legal Full Name', type: 'short_answer', required: true },
              { id: 'q2', title: 'Preferred Name / Nickname', type: 'short_answer', required: false },
              { id: 'q3', title: 'Personal Email', type: 'short_answer', required: true },
              { id: 'q4', title: 'Emergency Contact (Name & Phone)', type: 'short_answer', required: true },
              { id: 'q5', title: 'Preferred Work Hardware', type: 'multiple_choice', required: true, options: ['MacBook Pro 16" (M-series)', 'MacBook Pro 14" (M-series)', 'Dell XPS 15 (Ubuntu/Linux)', 'ThinkPad X1 Carbon (Windows 11)'] },
              { id: 'q6', title: 'T-Shirt Size for Welcome Swag', type: 'dropdown', required: true, options: ['XS', 'S', 'M', 'L', 'XL', '2XL'] },
            ],
          },
        ],
      },
    },
    {
      title: 'Course Registration & Student Admission',
      description: 'Enrollment form for academic institutions, coding bootcamps, and certification programs.',
      category: 'Education',
      tags: 'students, education, course, admission',
      schema: {
        title: 'Full-Stack Engineering Bootcamp Admission',
        description: 'Apply for the upcoming autumn cohort. Applications reviewed on a rolling basis.',
        language: 'en',
        sections: [
          {
            id: 'sec-student',
            title: 'Applicant Information',
            questions: [
              { id: 'q1', title: 'Student Legal Name', type: 'short_answer', required: true },
              { id: 'q2', title: 'Email Address', type: 'short_answer', required: true },
              { id: 'q3', title: 'Highest Level of Education Completed', type: 'dropdown', required: true, options: ['High School Diploma / GED', 'Associate Degree', 'Bachelor’s Degree', 'Master’s Degree or Higher'] },
              { id: 'q4', title: 'Prior Programming Experience', type: 'multiple_choice', required: true, options: ['Complete Beginner', 'Self-Taught (Basics of HTML/JS/Python)', 'Intermediate (Built small projects)', 'Experienced Developer looking to upskill'] },
              { id: 'q5', title: 'Why do you want to join this program?', type: 'paragraph', required: true },
              { id: 'q6', title: 'Preferred Cohort Schedule', type: 'multiple_choice', required: true, options: ['Full-Time (Mon-Fri, 9am-5pm)', 'Part-Time Evenings & Weekends'] },
            ],
          },
        ],
      },
    },
    {
      title: 'General Contact & Inquiry Form',
      description: 'Clean lead generation and customer contact form with inquiry categorization.',
      category: 'Contact',
      tags: 'contact, leads, support, inquiry',
      schema: {
        title: 'Get in Touch with Us',
        description: 'Have questions or want to collaborate? Fill in the details below and we will respond within 24 hours.',
        language: 'en',
        sections: [
          {
            id: 'sec-contact',
            title: 'Your Inquiry',
            questions: [
              { id: 'q1', title: 'Name', type: 'short_answer', required: true },
              { id: 'q2', title: 'Email Address', type: 'short_answer', required: true },
              { id: 'q3', title: 'Inquiry Subject / Topic', type: 'dropdown', required: true, options: ['Sales & Enterprise Pricing', 'Technical Support', 'Partnership Opportunity', 'Media & Press', 'General Question'] },
              { id: 'q4', title: 'Message Details', type: 'paragraph', required: true },
              { id: 'q5', title: 'How did you discover FormGenius?', type: 'multiple_choice', required: false, options: ['Google Search', 'Twitter / X', 'GitHub', 'Colleague Recommendation', 'Blog / Article'] },
            ],
          },
        ],
      },
    },
    {
      title: 'Employee Pulse Survey',
      description: 'Confidential internal workplace happiness, culture, and team feedback survey.',
      category: 'Hiring & HR',
      tags: 'pulse, culture, hr, survey',
      schema: {
        title: 'Quarterly Employee Pulse Survey',
        description: 'Your feedback helps create a better workplace for everyone. All responses are confidential.',
        language: 'en',
        sections: [
          {
            id: 'sec-culture',
            title: 'Workplace Dynamics',
            questions: [
              { id: 'q1', title: 'Department', type: 'dropdown', required: true, options: ['Engineering', 'Product & Design', 'Sales & Marketing', 'Customer Success', 'Operations & People'] },
              { id: 'q2', title: 'I feel motivated and supported in my current role', type: 'linear_scale', required: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Strongly Disagree', scaleMaxLabel: 'Strongly Agree' },
              { id: 'q3', title: 'I have the tools and resources needed to do my job effectively', type: 'linear_scale', required: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Strongly Disagree', scaleMaxLabel: 'Strongly Agree' },
              { id: 'q4', title: 'What is our team doing exceptionally well right now?', type: 'paragraph', required: false },
              { id: 'q5', title: 'What is one process we should eliminate or improve?', type: 'paragraph', required: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Product Feature Feedback & Request',
      description: 'Collect user requests, bug reports, and workflow enhancement suggestions.',
      category: 'Feedback',
      tags: 'product, feature request, roadmap, ux',
      schema: {
        title: 'Product Feature & Ideas Request',
        description: 'Tell our product team what features you want us to build next!',
        language: 'en',
        sections: [
          {
            id: 'sec-ideas',
            title: 'Feature Proposal',
            questions: [
              { id: 'q1', title: 'Feature Title', type: 'short_answer', required: true, description: 'Short summary of the idea' },
              { id: 'q2', title: 'What problem does this solve for you?', type: 'paragraph', required: true },
              { id: 'q3', title: 'How urgent is this need for your workflow?', type: 'multiple_choice', required: true, options: ['Nice to have', 'Important', 'Critical blocker'] },
              { id: 'q4', title: 'Which category does this fit best?', type: 'dropdown', required: true, options: ['AI Form Generator', 'Google Forms Publishing', 'Form Editor UI', 'Collaboration & Team Sharing', 'Integrations & Webhooks'] },
              { id: 'q5', title: 'Your Email (if you would like updates when built)', type: 'short_answer', required: false },
            ],
          },
        ],
      },
    },
    {
      title: 'Website Usability Evaluation',
      description: 'Structured tester questionnaire for user experience sessions and new site launches.',
      category: 'Feedback',
      tags: 'usability, ux, testing, website',
      schema: {
        title: 'Website Usability Test Feedback',
        description: 'Thank you for testing our new web experience. Please share your candid observations.',
        language: 'en',
        sections: [
          {
            id: 'sec-usability',
            title: 'Test Session Observations',
            questions: [
              { id: 'q1', title: 'Ease of navigation across the site', type: 'linear_scale', required: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Very Difficult', scaleMaxLabel: 'Very Intuitive' },
              { id: 'q2', title: 'Did you experience any confusing steps or broken links?', type: 'paragraph', required: false },
              { id: 'q3', title: 'Device used during testing', type: 'multiple_choice', required: true, options: ['Desktop / Laptop (Mac)', 'Desktop / Laptop (Windows)', 'Mobile (iOS)', 'Mobile (Android)', 'Tablet'] },
              { id: 'q4', title: 'Browser used', type: 'dropdown', required: true, options: ['Chrome', 'Safari', 'Firefox', 'Edge', 'Brave', 'Other'] },
              { id: 'q5', title: 'Overall impression of the design and clarity', type: 'linear_scale', required: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Poor', scaleMaxLabel: 'Outstanding' },
            ],
          },
        ],
      },
    },
    {
      title: 'Interview Candidate Evaluation',
      description: 'Hiring manager and panel interviewer scorecard for candidate reviews.',
      category: 'Hiring & HR',
      tags: 'interview, hiring, scorecard, evaluation',
      schema: {
        title: 'Candidate Interview Scorecard',
        description: 'Complete this evaluation within 2 hours of concluding your interview session.',
        language: 'en',
        sections: [
          {
            id: 'sec-scorecard',
            title: 'Evaluation Metrics',
            questions: [
              { id: 'q1', title: 'Candidate Name', type: 'short_answer', required: true },
              { id: 'q2', title: 'Interview Stage', type: 'dropdown', required: true, options: ['Screening Call', 'Technical Deep Dive / Coding', 'System Design & Architecture', 'Values & Culture Fit', 'Executive Final Round'] },
              { id: 'q3', title: 'Technical Problem Solving Competency', type: 'linear_scale', required: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Below Expectations', scaleMaxLabel: 'Exceptional' },
              { id: 'q4', title: 'Communication and Collaboration', type: 'linear_scale', required: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Poor Communication', scaleMaxLabel: 'Extremely Clear' },
              { id: 'q5', title: 'Key Strengths Observed', type: 'paragraph', required: true },
              { id: 'q6', title: 'Areas of Concern / Red Flags', type: 'paragraph', required: false },
              { id: 'q7', title: 'Final Recommendation', type: 'multiple_choice', required: true, options: ['Strong Yes / Hire', 'Yes / Lean Hire', 'No / Lean Pass', 'Definite No'] },
            ],
          },
        ],
      },
    },
    {
      title: 'Workshop & Hands-On Lab Registration',
      description: 'Sign-up form for technical training seminars, webinars, and masterclasses.',
      category: 'Events',
      tags: 'workshop, training, education, seminar',
      schema: {
        title: 'Hands-on AI Engineering Masterclass Registration',
        description: 'Reserve your virtual seat for an intensive 3-hour code-along workshop.',
        language: 'en',
        sections: [
          {
            id: 'sec-workshop',
            title: 'Attendee Details',
            questions: [
              { id: 'q1', title: 'Full Name', type: 'short_answer', required: true },
              { id: 'q2', title: 'Email Address for Calendar Invite', type: 'short_answer', required: true },
              { id: 'q3', title: 'Primary Programming Language', type: 'dropdown', required: true, options: ['TypeScript / Node', 'Python', 'Go', 'Java', 'Rust', 'Other'] },
              { id: 'q4', title: 'Do you have an active Cloud / AI API account?', type: 'multiple_choice', required: true, options: ['Yes', 'No, need setup assistance'] },
              { id: 'q5', title: 'What is the #1 problem you want to solve during this workshop?', type: 'paragraph', required: true },
            ],
          },
        ],
      },
    },
    {
      title: 'Internship Application Form',
      description: 'Tailored application for university students, new grads, and career changers.',
      category: 'Hiring & HR',
      tags: 'internship, students, career, junior',
      schema: {
        title: 'Summer 2026 Engineering Internship Application',
        description: 'Join our engineering team for a 12-week high-impact paid summer internship.',
        language: 'en',
        sections: [
          {
            id: 'sec-intern',
            title: 'Applicant Details',
            questions: [
              { id: 'q1', title: 'Full Name', type: 'short_answer', required: true },
              { id: 'q2', title: 'University or Current Program', type: 'short_answer', required: true },
              { id: 'q3', title: 'Anticipated Graduation Year', type: 'dropdown', required: true, options: ['2026', '2027', '2028', 'Recent Graduate'] },
              { id: 'q4', title: 'Major / Field of Study', type: 'short_answer', required: true },
              { id: 'q5', title: 'GitHub / GitLab / Personal Site URL', type: 'short_answer', required: true },
              { id: 'q6', title: 'Link to a project you are proud of & why', type: 'paragraph', required: true },
            ],
          },
        ],
      },
    },
    {
      title: 'IT Helpdesk & Asset Request Form',
      description: 'Internal service ticket for technical hardware, software access, and bug reports.',
      category: 'Operations',
      tags: 'it, support, helpdesk, operations',
      schema: {
        title: 'Internal IT & Technical Support Request',
        description: 'Submit an IT ticket to the infrastructure team for hardware, access, or bug resolution.',
        language: 'en',
        sections: [
          {
            id: 'sec-ticket',
            title: 'Ticket Details',
            questions: [
              { id: 'q1', title: 'Requester Name & Team', type: 'short_answer', required: true },
              { id: 'q2', title: 'Request Type', type: 'dropdown', required: true, options: ['Hardware Issue / Replacement', 'Software License / Tool Access', 'VPN & Network Access', 'Security / 2FA Reset', 'Other'] },
              { id: 'q3', title: 'Urgency Level', type: 'multiple_choice', required: true, options: ['Low (Within a few days)', 'Medium (Within 24 hours)', 'Urgent (Work completely blocked)'] },
              { id: 'q4', title: 'Describe the issue or requested tool', type: 'paragraph', required: true },
            ],
          },
        ],
      },
    },
  ];
}
