import express from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';
import { prisma } from '../db.ts';
import { encrypt, decrypt } from '../lib/crypto.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';

const router = express.Router();

const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

async function getOAuthClient() {
  const clientIdSetting = await prisma.applicationSetting.findUnique({ where: { key: 'googleClientId' } });
  const clientSecretSetting = await prisma.applicationSetting.findUnique({ where: { key: 'googleClientSecret' } });
  const redirectUriSetting = await prisma.applicationSetting.findUnique({ where: { key: 'googleRedirectUri' } });

  const clientId = clientIdSetting?.value || process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = clientSecretSetting?.value || process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = redirectUriSetting?.value || process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/google/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

router.get('/status', requireAuth, async (_req, res) => {
  try {
    const connection = await prisma.googleConnection.findFirst({
      where: { isConnected: true },
      orderBy: { connectedAt: 'desc' },
    });

    const clientIdSetting = await prisma.applicationSetting.findUnique({ where: { key: 'googleClientId' } });
    const isSelfHostConfigured = !!(clientIdSetting?.value || process.env.GOOGLE_CLIENT_ID);

    res.json({
      isConnected: !!connection,
      email: connection?.email || null,
      connectedAt: connection?.connectedAt || null,
      scopes: connection?.scopes ? connection.scopes.split(',') : SCOPES,
      isSelfHostConfigured,
    });
  } catch (error) {
    console.error('Google status error:', error);
    res.status(500).json({ error: 'Failed to retrieve Google connection status' });
  }
});

router.post('/sync-client-token', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { accessToken, email, refreshToken } = req.body;
    if (!accessToken || !email) {
      return res.status(400).json({ error: 'accessToken and email are required' });
    }

    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;
    const accessTokenExpiresAt = new Date(Date.now() + 3600 * 1000);

    await prisma.googleConnection.deleteMany({});
    const connection = await prisma.googleConnection.create({
      data: {
        email: email.trim(),
        encryptedAccessToken,
        encryptedRefreshToken,
        accessTokenExpiresAt,
        scopes: SCOPES.join(','),
        isConnected: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'GOOGLE_CONNECTED',
        details: `Connected Google Account: ${email}`,
        entityId: connection.id,
      },
    });

    res.json({
      success: true,
      email: connection.email,
      connectedAt: connection.connectedAt,
    });
  } catch (error: any) {
    console.error('Sync client token error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync Google credentials' });
  }
});

router.get('/connect', requireAuth, async (_req, res) => {
  try {
    const oauth2Client = await getOAuthClient();
    if (!oauth2Client) {
      return res.status(400).json({
        error: 'Google OAuth credentials not configured. Please enter your Google Client ID and Client Secret in Settings.',
      });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state,
    });

    res.json({ authUrl });
  } catch (error: any) {
    console.error('OAuth connect error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate OAuth URL' });
  }
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/settings?googleError=' + encodeURIComponent(String(error)));
  }

  if (!code || typeof code !== 'string') {
    return res.redirect('/settings?googleError=missing_code');
  }

  try {
    const oauth2Client = await getOAuthClient();
    if (!oauth2Client) {
      return res.redirect('/settings?googleError=unconfigured_oauth');
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || 'connected_account@gmail.com';

    await prisma.googleConnection.deleteMany({});
    await prisma.googleConnection.create({
      data: {
        email,
        encryptedAccessToken: tokens.access_token ? encrypt(tokens.access_token) : null,
        encryptedRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        accessTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: SCOPES.join(','),
        isConnected: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: 'GOOGLE_CONNECTED',
        details: `Connected Google Account: ${email} via OAuth 2.0`,
      },
    });

    res.redirect('/settings?googleSuccess=connected');
  } catch (err: any) {
    console.error('OAuth callback error:', err);
    res.redirect('/settings?googleError=' + encodeURIComponent(err.message || 'oauth_failed'));
  }
});

router.post('/disconnect', requireAuth, async (_req, res) => {
  try {
    await prisma.googleConnection.deleteMany({});
    await prisma.activityLog.create({
      data: {
        action: 'GOOGLE_DISCONNECTED',
        details: 'Disconnected Google Account',
      },
    });
    res.json({ success: true, message: 'Google account disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect Google account' });
  }
});

router.post('/test-api', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const conn = await prisma.googleConnection.findFirst({ where: { isConnected: true } });
      if (conn?.encryptedAccessToken) {
        token = decrypt(conn.encryptedAccessToken);
      }
    }

    if (!token) {
      return res.status(400).json({ error: 'No active Google token available. Please connect your Google account.' });
    }

    const testRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!testRes.ok) {
      const errBody = await testRes.text();
      return res.status(400).json({
        success: false,
        error: `Google API authentication failed (${testRes.status}): ${errBody}`,
      });
    }

    const userData = await testRes.json();
    res.json({
      success: true,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      message: 'Google authorization is valid and working!',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'API test failed' });
  }
});

export default router;
