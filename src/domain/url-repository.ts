import type { ShortUrl } from './short-url';

export type NewShortUrl = Omit<ShortUrl, 'id' | 'clickCount'> & { clickCount?: number };

/** Persistence contract — swap implementations in `src/config/`. */
export interface UrlRepository {
  create(entry: NewShortUrl): Promise<ShortUrl>;
  findBySlug(slug: string): Promise<ShortUrl | null>;
  existsBySlug(slug: string): Promise<boolean>;
  list(): Promise<ShortUrl[]>;
  softDelete(slug: string, deletedAt?: string): Promise<boolean>;
  incrementClickCount(slug: string): Promise<void>;
}
