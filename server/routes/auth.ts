import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';

const router = express.Router();
const SESSION_DURATION_DAYS = 30;

function setSessionCookie(res: express.Response, token: string) {
  res.cookie('formgenius_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

router.get('/setup-status', async (_req, res) => {
  try {
    const adminCount = await prisma.user.count();
    const appNameSetting = await prisma.applicationSetting.findUnique({ where: { key: 'appName' } });
    
    res.json({
      isSetupRequired: adminCount === 0,
      appName: appNameSetting?.value || 'FormGenius AI',
    });
  } catch (error) {
    console.error('Setup status check failed:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const adminCount = await prisma.user.count();
    if (adminCount > 0) {
      return res.status(403).json({ error: 'Initial administrator setup has already been completed.' });
    }

    const { username, password, name, appName, timezone } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and display name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        name: name.trim(),
        role: 'admin',
      },
    });

    if (appName) {
      await prisma.applicationSetting.upsert({
        where: { key: 'appName' },
        update: { value: appName.trim() },
        create: { key: 'appName', value: appName.trim() },
      });
    }

    if (timezone) {
      await prisma.applicationSetting.upsert({
        where: { key: 'timezone' },
        update: { value: timezone },
        create: { key: 'timezone', value: timezone },
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || '',
        expiresAt,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'SETUP_COMPLETED',
        details: `Administrator account created: ${user.username}`,
        entityId: user.id,
      },
    });

    setSessionCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message || 'Setup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || '',
        expiresAt,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'USER_LOGIN',
        details: `User logged in: ${user.username}`,
        entityId: user.id,
      },
    });

    setSessionCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.formgenius_session || 
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

    if (token) {
      await prisma.session.delete({ where: { token } }).catch(() => {});
    }

    res.clearCookie('formgenius_session', { path: '/' });
    res.json({ success: true });
  } catch (error) {
    res.clearCookie('formgenius_session', { path: '/' });
    res.json({ success: true });
  }
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await prisma.applicationSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      user: req.user,
      settings: settingsMap,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await prisma.activityLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        details: 'User updated their password',
        entityId: user.id,
      },
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

export default router;
