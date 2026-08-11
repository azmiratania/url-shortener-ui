import type { Pool } from 'pg';

import type { NewShortUrl, ShortUrl, UrlRepository } from '../../domain';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS short_urls (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_clicks INTEGER,
  click_count INTEGER NOT NULL DEFAULT 0,
  preview_enabled BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_short_urls_slug ON short_urls (slug);
`;

function mapRow(row: Record<string, unknown>): ShortUrl {
  const record: ShortUrl = {
    id: String(row.id),
    slug: String(row.slug),
    destinationUrl: String(row.destination_url),
    createdAt: new Date(String(row.created_at)).toISOString(),
    clickCount: Number(row.click_count ?? 0),
    previewEnabled: Boolean(row.preview_enabled),
  };

  if (row.deleted_at) {
    record.deletedAt = new Date(String(row.deleted_at)).toISOString();
  }
  if (row.expires_at) {
    record.expiresAt = new Date(String(row.expires_at)).toISOString();
  }
  if (row.max_clicks !== null && row.max_clicks !== undefined) {
    record.maxClicks = Number(row.max_clicks);
  }

  return record;
}

/** PostgreSQL-backed UrlRepository. */
export class PostgresUrlRepository implements UrlRepository {
  constructor(private readonly pool: Pool) {}

  static async initialize(pool: Pool): Promise<PostgresUrlRepository> {
    await pool.query(CREATE_TABLE_SQL);
    return new PostgresUrlRepository(pool);
  }

  async create(entry: NewShortUrl): Promise<ShortUrl> {
    const id = entry.slug;
    const result = await this.pool.query(
      `INSERT INTO short_urls
        (id, slug, destination_url, created_at, expires_at, max_clicks, click_count, preview_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        entry.slug,
        entry.destinationUrl,
        entry.createdAt,
        entry.expiresAt ?? null,
        entry.maxClicks ?? null,
        entry.clickCount ?? 0,
        entry.previewEnabled ?? false,
      ],
    );
    return mapRow(result.rows[0]);
  }

  async findBySlug(slug: string): Promise<ShortUrl | null> {
    const result = await this.pool.query('SELECT * FROM short_urls WHERE slug = $1', [slug]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM short_urls WHERE slug = $1 LIMIT 1', [slug]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async list(): Promise<ShortUrl[]> {
    const result = await this.pool.query('SELECT * FROM short_urls ORDER BY created_at DESC');
    return result.rows.map(mapRow);
  }

  async softDelete(slug: string, deletedAt = new Date().toISOString()): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE short_urls SET deleted_at = $2 WHERE slug = $1 AND deleted_at IS NULL',
      [slug, deletedAt],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async incrementClickCount(slug: string): Promise<void> {
    await this.pool.query(
      'UPDATE short_urls SET click_count = click_count + 1 WHERE slug = $1',
      [slug],
    );
  }
}
