import express from 'express';
import { prisma } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { FormSchema, sanitizeAndValidateFormSchema } from '../../src/types/form.ts';
import { convertSchemaToGoogleFormsRequests } from '../lib/googleFormsConverter.ts';
import { decrypt } from '../lib/crypto.ts';

const router = express.Router();

async function resolveGoogleAccessToken(req: AuthenticatedRequest, bodyToken?: string): Promise<string> {
  if (bodyToken && bodyToken.trim()) {
    return bodyToken.trim();
  }

  const authHeader = req.headers.authorization;
  const customGoogleHeader = req.headers['x-google-token'];
  if (customGoogleHeader && typeof customGoogleHeader === 'string') {
    return customGoogleHeader.trim();
  }

  const connection = await prisma.googleConnection.findFirst({
    where: { isConnected: true },
    orderBy: { connectedAt: 'desc' },
  });

  if (connection?.encryptedAccessToken) {
    try {
      return decrypt(connection.encryptedAccessToken);
    } catch (e) {
      console.error('Failed to decrypt stored Google token:', e);
    }
  }

  throw new Error('No Google account connected. Please connect your Google account in Settings or the Google Connections panel.');
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search, sort = 'newest' } = req.query;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'title') orderBy = { title: 'asc' };
    if (sort === 'updated') orderBy = { updatedAt: 'desc' };

    const forms = await prisma.form.findMany({
      where,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        language: true,
        status: true,
        googleFormId: true,
        googleFormUrl: true,
        googleEditUrl: true,
        modelUsed: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(forms);
  } catch (error) {
    console.error('List forms error:', error);
    res.status(500).json({ error: 'Failed to retrieve forms' });
  }
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { schema, modelUsed } = req.body;
    if (!schema) {
      return res.status(400).json({ error: 'Form schema is required' });
    }

    const validatedSchema = sanitizeAndValidateFormSchema(schema);

    const form = await prisma.form.create({
      data: {
        title: validatedSchema.title,
        description: validatedSchema.description,
        language: validatedSchema.language || 'en',
        schemaJson: JSON.stringify(validatedSchema),
        status: 'draft',
        modelUsed: modelUsed || 'Manual Editor',
        version: 1,
      },
    });

    await prisma.formVersion.create({
      data: {
        formId: form.id,
        version: 1,
        title: validatedSchema.title,
        description: validatedSchema.description,
        schemaJson: JSON.stringify(validatedSchema),
        changeNotes: 'Initial form creation',
      },
    });

    res.json({
      success: true,
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        schema: validatedSchema,
        status: form.status,
        version: form.version,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create form' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            title: true,
            changeNotes: true,
            createdAt: true,
          },
        },
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    let parsedSchema: FormSchema;
    try {
      parsedSchema = JSON.parse(form.schemaJson);
    } catch {
      parsedSchema = {
        title: form.title,
        description: form.description || '',
        language: form.language,
        sections: [],
      };
    }

    res.json({
      id: form.id,
      title: form.title,
      description: form.description,
      language: form.language,
      status: form.status,
      googleFormId: form.googleFormId,
      googleFormUrl: form.googleFormUrl,
      googleEditUrl: form.googleEditUrl,
      modelUsed: form.modelUsed,
      version: form.version,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      schema: parsedSchema,
      versions: form.versions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve form details' });
  }
});

router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { schema, changeNotes } = req.body;

    const existing = await prisma.form.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const validatedSchema = sanitizeAndValidateFormSchema(schema);
    const nextVersion = existing.version + 1;

    await prisma.formVersion.create({
      data: {
        formId: id,
        version: nextVersion,
        title: validatedSchema.title,
        description: validatedSchema.description,
        schemaJson: JSON.stringify(validatedSchema),
        changeNotes: changeNotes || `Saved updates (v${nextVersion})`,
      },
    });

    const updated = await prisma.form.update({
      where: { id },
      data: {
        title: validatedSchema.title,
        description: validatedSchema.description,
        language: validatedSchema.language || 'en',
        schemaJson: JSON.stringify(validatedSchema),
        version: nextVersion,
      },
    });

    res.json({
      success: true,
      form: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        schema: validatedSchema,
        version: updated.version,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update form' });
  }
});

router.post('/:id/duplicate', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.form.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const schema = JSON.parse(existing.schemaJson);
    schema.title = `${schema.title} (Copy)`;

    const duplicated = await prisma.form.create({
      data: {
        title: schema.title,
        description: schema.description,
        language: schema.language,
        schemaJson: JSON.stringify(schema),
        status: 'draft',
        modelUsed: existing.modelUsed,
        version: 1,
      },
    });

    await prisma.formVersion.create({
      data: {
        formId: duplicated.id,
        version: 1,
        title: schema.title,
        description: schema.description,
        schemaJson: JSON.stringify(schema),
        changeNotes: `Duplicated from "${existing.title}"`,
      },
    });

    res.json({ success: true, formId: duplicated.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to duplicate form' });
  }
});

router.post('/:id/restore', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { targetVersion } = req.body;

    const versionRecord = await prisma.formVersion.findFirst({
      where: { formId: id, version: Number(targetVersion) },
    });

    if (!versionRecord) {
      return res.status(404).json({ error: 'Specified form version not found' });
    }

    const restoredSchema = JSON.parse(versionRecord.schemaJson);

    await prisma.form.update({
      where: { id },
      data: {
        title: restoredSchema.title,
        description: restoredSchema.description,
        language: restoredSchema.language || 'en',
        schemaJson: versionRecord.schemaJson,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'FORM_VERSION_RESTORED',
        details: `Restored form to version ${targetVersion}`,
        entityId: id,
      },
    });

    res.json({
      success: true,
      schema: restoredSchema,
      message: `Form successfully restored to version ${targetVersion}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to restore form version' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.form.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

router.post('/:id/publish', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { googleAccessToken } = req.body;

    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const schema: FormSchema = sanitizeAndValidateFormSchema(JSON.parse(form.schemaJson));
    const token = await resolveGoogleAccessToken(req, googleAccessToken);

    const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        info: {
          title: schema.title.slice(0, 200),
          documentTitle: schema.title.slice(0, 200),
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Google Forms create failed:', errText);
      await prisma.form.update({
        where: { id },
        data: { status: 'failed' },
      });
      return res.status(400).json({
        error: `Google Forms creation failed (${createRes.status}): ${errText}. Ensure your Google account is connected and has the Google Forms permission granted.`,
      });
    }

    const createdFormData = await createRes.json();
    const googleFormId = createdFormData.formId;
    const responderUri = createdFormData.responderUri || `https://docs.google.com/forms/d/e/${googleFormId}/viewform`;
    const googleEditUrl = `https://docs.google.com/forms/d/${googleFormId}/edit`;

    const batchRequests = convertSchemaToGoogleFormsRequests(schema);

    if (batchRequests.length > 0) {
      const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${googleFormId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: batchRequests,
          includeFormInResponse: true,
        }),
      });

      if (!batchRes.ok) {
        const batchErrText = await batchRes.text();
        console.error('Google Forms batchUpdate failed:', batchErrText);
        await prisma.form.update({
          where: { id },
          data: {
            googleFormId,
            googleFormUrl: responderUri,
            googleEditUrl,
            status: 'failed',
          },
        });
        return res.status(400).json({
          error: `Google Form was created but questions failed to populate: ${batchErrText}`,
          googleFormId,
          googleEditUrl,
        });
      }
    }

    const updatedForm = await prisma.form.update({
      where: { id },
      data: {
        googleFormId,
        googleFormUrl: responderUri,
        googleEditUrl,
        status: 'published',
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'FORM_PUBLISHED',
        details: `Published "${schema.title}" to Google Forms (ID: ${googleFormId})`,
        entityId: id,
      },
    });

    res.json({
      success: true,
      message: 'Successfully published to your Google account!',
      form: {
        id: updatedForm.id,
        status: updatedForm.status,
        googleFormId,
        googleFormUrl: responderUri,
        googleEditUrl,
      },
    });
  } catch (error: any) {
    console.error('Publish error:', error);
    res.status(500).json({ error: error.message || 'Publishing failed' });
  }
});

export default router;
