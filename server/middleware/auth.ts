import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.ts';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  sessionId?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.formgenius_session || 
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(401).json({ error: 'Session invalid or expired' });
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({ error: 'Session has expired' });
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server authentication error' });
  }
}
