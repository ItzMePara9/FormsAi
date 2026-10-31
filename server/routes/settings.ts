import express from 'express';
import { prisma } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';

const router = express.Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    const settings = await prisma.applicationSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      if (curr.key === 'googleClientSecret') {
        acc[curr.key] = curr.value ? '••••••••••••••••' : '';
      } else {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {} as Record<string, string>);

    const formCount = await prisma.form.count();
    const publishedCount = await prisma.form.count({ where: { status: 'published' } });
    const modelCount = await prisma.aIProvider.count({ where: { isEnabled: true } });
    const googleConn = await prisma.googleConnection.findFirst({ where: { isConnected: true } });

    res.json({
      settings: settingsMap,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.floor(process.uptime()),
        databaseType: 'SQLite (Prisma ORM)',
        encryptionActive: true,
        encryptionAlgorithm: 'AES-256-GCM',
        environment: process.env.NODE_ENV || 'development',
      },
      stats: {
        totalForms: formCount,
        publishedForms: publishedCount,
        activeModels: modelCount,
        isGoogleConnected: !!googleConn,
        googleEmail: googleConn?.email || null,
      },
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

router.put('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    for (const [key, val] of Object.entries(settings)) {
      if (typeof val === 'string') {
        if (key === 'googleClientSecret' && val.includes('••••')) {
          continue;
        }

        await prisma.applicationSetting.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        details: 'Administrator updated system settings',
        entityId: req.user?.id,
      },
    });

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

export default router;
