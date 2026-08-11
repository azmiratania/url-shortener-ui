import type { ShortUrl } from '../../domain';

/** Serialize a ShortUrl record to the public API snake_case shape. */
export function toUrlResponse(record: ShortUrl, shortUrl: string) {
  return {
    id: record.id,
    slug: record.slug,
    short_url: shortUrl,
    destination_url: record.destinationUrl,
    created_at: record.createdAt,
    expires_at: record.expiresAt ?? null,
    max_clicks: record.maxClicks ?? null,
    click_count: record.clickCount,
    preview_enabled: Boolean(record.previewEnabled),
  };
}

export function toStatsResponse(stats: {
  slug: string;
  clickCount: number;
  createdAt: string;
  expiresAt?: string;
  maxClicks?: number;
  deletedAt?: string;
}) {
  return {
    slug: stats.slug,
    click_count: stats.clickCount,
    created_at: stats.createdAt,
    expires_at: stats.expiresAt ?? null,
    max_clicks: stats.maxClicks ?? null,
    deleted_at: stats.deletedAt ?? null,
  };
}

/** True when the client likely wants HTML rather than JSON. */
export function prefersHtml(req: { accepts: (types: string[]) => string | false }): boolean {
  const accepted = req.accepts(['html', 'json']);
  return accepted === 'html';
}
