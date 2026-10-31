import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { seedInitialData } from './server/db.ts';

import authRouter from './server/routes/auth.ts';
import aiRouter from './server/routes/ai.ts';
import googleRouter from './server/routes/google.ts';
import formsRouter from './server/routes/forms.ts';
import templatesRouter from './server/routes/templates.ts';
import settingsRouter from './server/routes/settings.ts';
import activityRouter from './server/routes/activity.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'FormGenius AI',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/google', googleRouter);
  app.use('/api/forms', formsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/activity', activityRouter);

  try {
    await seedInitialData();
  } catch (err) {
    console.error('Initial seeding warning:', err);
  }

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 FormGenius AI is running at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
