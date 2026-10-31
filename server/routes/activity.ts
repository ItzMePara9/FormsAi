import express from 'express';
import { prisma } from '../db.ts';
import { requireAuth } from '../middleware/auth.ts';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve activity logs' });
  }
});

export default router;
