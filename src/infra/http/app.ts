import fs from 'node:fs';
import path from 'node:path';

import express from 'express';
import rateLimit from 'express-rate-limit';

import type { UrlShortenerService } from '../../services/url-shortener-service';
import { errorHandler } from './error-handler';
import { createHealthRouter } from './health-router';
import { requestLogger } from './request-logger';
import { createPreviewRouter, createRedirectRouter, createUrlsRouter } from './routes';

const PUBLIC_DIR = path.join(process.cwd(), 'dist', 'public');
const FALLBACK_UI = path.join(__dirname, 'ui', 'index.html');

function resolveUiPath(): string {
  const built = path.join(PUBLIC_DIR, 'index.html');
  return fs.existsSync(built) ? built : FALLBACK_UI;
}

/** Build the Express app with all middleware and routes wired. */
export function createApp(service: UrlShortenerService): express.Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestLogger);
  app.use(express.json({ limit: '32kb' }));

  app.use(
    '/v1/urls',
    rateLimit({
      windowMs: 60_000,
      max: 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'VALIDATION_ERROR',
        message: 'Too many URL creation requests. Please try again later.',
      },
    }),
  );

  app.use(createHealthRouter());

  if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR, { index: false }));
  }

  app.get('/', (_req, res) => {
    res.type('html').send(fs.readFileSync(resolveUiPath(), 'utf8'));
  });

  app.use('/v1', createUrlsRouter(service));
  app.use('/', createPreviewRouter(service));
  app.use('/', createRedirectRouter(service));

  app.use(errorHandler);
  return app;
}
