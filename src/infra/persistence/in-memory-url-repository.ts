import type { NewShortUrl, ShortUrl, UrlRepository } from '../../domain';

/**
 * Default repository backed by a Map. Suitable for development and tests;
 * swap for a database-backed implementation via `src/config/`.
 */
export class InMemoryUrlRepository implements UrlRepository {
  private readonly bySlug = new Map<string, ShortUrl>();

  async create(entry: NewShortUrl): Promise<ShortUrl> {
    const record: ShortUrl = { ...entry, id: entry.slug, clickCount: entry.clickCount ?? 0 };
    this.bySlug.set(record.slug, record);
    return record;
  }

  async findBySlug(slug: string): Promise<ShortUrl | null> {
    return this.bySlug.get(slug) ?? null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return this.bySlug.has(slug);
  }

  async list(): Promise<ShortUrl[]> {
    return [...this.bySlug.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async softDelete(slug: string, deletedAt = new Date().toISOString()): Promise<boolean> {
    const record = this.bySlug.get(slug);
    if (!record) {
      return false;
    }
    this.bySlug.set(slug, { ...record, deletedAt });
    return true;
  }

  async incrementClickCount(slug: string): Promise<void> {
    const record = this.bySlug.get(slug);
    if (record) {
      this.bySlug.set(slug, { ...record, clickCount: record.clickCount + 1 });
    }
  }
}
