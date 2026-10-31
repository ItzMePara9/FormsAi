import express from 'express';
import { prisma } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { sanitizeAndValidateFormSchema } from '../../src/types/form.ts';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { category, search } = req.query;

    const where: any = {};
    if (category && category !== 'All') {
      where.category = String(category);
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const templates = await prisma.formTemplate.findMany({
      where,
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        isBuiltIn: true,
        createdAt: true,
      },
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve templates' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.formTemplate.findUnique({ where: { id } });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const schema = JSON.parse(template.schemaJson);
    res.json({
      ...template,
      schema,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve template' });
  }
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { title, description, category, tags, schema } = req.body;

    if (!title || !description || !schema) {
      return res.status(400).json({ error: 'Title, description, and schema are required' });
    }

    const validatedSchema = sanitizeAndValidateFormSchema(schema);

    const newTemplate = await prisma.formTemplate.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: category || 'Custom',
        tags: tags || '',
        schemaJson: JSON.stringify(validatedSchema),
        isBuiltIn: false,
      },
    });

    res.json({ success: true, template: newTemplate });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to save template' });
  }
});

export default router;
