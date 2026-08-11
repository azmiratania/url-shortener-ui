import type { NewShortUrl, ShortUrl, UrlRepository } from '../../domain';
import type { SlugCache } from '../cache/slug-cache';

/** Decorator that caches slug lookups and invalidates on writes. */
export class CachedUrlRepository implements UrlRepository {
  constructor(
    private readonly inner: UrlRepository,
    private readonly cache: SlugCache,
    private readonly rememberMissing: (slug: string) => Promise<void>,
  ) {}

  async create(entry: NewShortUrl): Promise<ShortUrl> {
    const record = await this.inner.create(entry);
    await this.cache.set(record.slug, record);
    return record;
  }

  async findBySlug(slug: string): Promise<ShortUrl | null> {
    const cached = await this.cache.get(slug);
    if (cached !== undefined) {
      return cached;
    }

    const record = await this.inner.findBySlug(slug);
    if (record) {
      await this.cache.set(slug, record);
    } else {
      await this.rememberMissing(slug);
    }
    return record;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const cached = await this.cache.get(slug);
    if (cached !== undefined) {
      return cached !== null;
    }
    return this.inner.existsBySlug(slug);
  }

  async list(): Promise<ShortUrl[]> {
    return this.inner.list();
  }

  async softDelete(slug: string, deletedAt?: string): Promise<boolean> {
    const deleted = await this.inner.softDelete(slug, deletedAt);
    if (deleted) {
      await this.cache.invalidate(slug);
    }
    return deleted;
  }

  async incrementClickCount(slug: string): Promise<void> {
    await this.inner.incrementClickCount(slug);
    await this.cache.invalidate(slug);
  }
}
