import { Router } from 'express';
import QRCode from 'qrcode';

import { RESERVED_SLUGS } from '../../services/slug-validator';
import type { CreateUrlInput } from '../../domain';
import type { UrlShortenerService } from '../../services/url-shortener-service';
import { renderPreviewPage } from './html-pages';
import { toStatsResponse, toUrlResponse } from './serializers';

function parseCreateInput(body: Record<string, unknown>): CreateUrlInput {
  return {
    destinationUrl: body.destination_url,
    customSlug: body.custom_slug,
    expiresAt: body.expires_at,
    maxClicks: body.max_clicks,
    previewEnabled: body.preview_enabled,
  };
}

function exportCsv(records: ReturnType<typeof toUrlResponse>[]): string {
  const header = 'slug,short_url,destination_url,click_count,created_at,expires_at';
  const rows = records.map((r) =>
    [r.slug, r.short_url, r.destination_url, r.click_count, r.created_at, r.expires_at ?? '']
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

/** POST/GET/DELETE /v1/urls — manage shortened URLs. */
export function createUrlsRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.post('/urls', async (req, res, next) => {
    try {
      const { record, shortUrl } = await service.create(parseCreateInput(req.body ?? {}));
      res.status(201).json(toUrlResponse(record, shortUrl));
    } catch (err) {
      next(err);
    }
  });

  router.get('/urls', async (_req, res, next) => {
    try {
      const records = await service.list();
      res.status(200).json({
        items: records.map((record) => toUrlResponse(record, service.buildShortUrl(record.slug))),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/urls/export', async (req, res, next) => {
    try {
      const records = await service.list();
      const items = records.map((record) => toUrlResponse(record, service.buildShortUrl(record.slug)));
      const format = String(req.query.format ?? 'json').toLowerCase();

      if (format === 'csv') {
        res.type('text/csv').send(exportCsv(items));
        return;
      }

      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  });

  router.get('/urls/:slug/stats', async (req, res, next) => {
    try {
      const stats = await service.getStats(req.params.slug);
      res.status(200).json(toStatsResponse(stats));
    } catch (err) {
      next(err);
    }
  });

  router.get('/urls/:slug/qr', async (req, res, next) => {
    try {
      const record = await service.getRecord(req.params.slug);
      const shortUrl = service.buildShortUrl(record.slug);
      const png = await QRCode.toBuffer(shortUrl, { margin: 1, width: 256 });
      res.type('png').send(png);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/urls/:slug', async (req, res, next) => {
    try {
      await service.delete(req.params.slug);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** GET /preview/:slug — optional interstitial before redirect. */
export function createPreviewRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.get('/preview/:slug', async (req, res, next) => {
    try {
      const record = await service.getRecord(req.params.slug);
      res.type('html').send(
        renderPreviewPage({
          slug: record.slug,
          destinationUrl: record.destinationUrl,
          shortUrl: service.buildShortUrl(record.slug),
        }),
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** GET /:slug — 302 redirect to the destination URL. */
export function createRedirectRouter(service: UrlShortenerService): Router {
  const router = Router();

  router.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug;
    if (RESERVED_SLUGS.has(slug.toLowerCase())) {
      next();
      return;
    }

    try {
      const record = await service.getRecord(slug);
      if (record.previewEnabled || req.query.preview === '1') {
        res.redirect(302, `/preview/${slug}`);
        return;
      }

      await service.resolve(slug);
      res.redirect(302, record.destinationUrl);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
