import type { ShortUrl } from '../../domain';

export interface SlugCache {
  get(slug: string): Promise<ShortUrl | null | undefined>;
  set(slug: string, record: ShortUrl): Promise<void>;
  invalidate(slug: string): Promise<void>;
}

/** No-op cache used when Redis is unavailable. */
export class NullSlugCache implements SlugCache {
  async get(): Promise<undefined> {
    return undefined;
  }

  async set(): Promise<void> {}

  async invalidate(): Promise<void> {}
}

/** Redis-backed slug cache with JSON serialization. */
export class RedisSlugCache implements SlugCache {
  constructor(
    private readonly client: {
      get(key: string): Promise<string | null>;
      set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
      del(key: string): Promise<unknown>;
    },
    private readonly ttlSeconds = 300,
  ) {}

  private key(slug: string): string {
    return `slug:${slug}`;
  }

  async get(slug: string): Promise<ShortUrl | null | undefined> {
    const raw = await this.client.get(this.key(slug));
    if (raw === null) {
      return undefined;
    }
    if (raw === '__null__') {
      return null;
    }
    return JSON.parse(raw) as ShortUrl;
  }

  async set(slug: string, record: ShortUrl): Promise<void> {
    await this.client.set(this.key(slug), JSON.stringify(record), { EX: this.ttlSeconds });
  }

  async invalidate(slug: string): Promise<void> {
    await this.delSafe(slug);
  }

  async rememberMissing(slug: string): Promise<void> {
    await this.client.set(this.key(slug), '__null__', { EX: 60 });
  }

  private async delSafe(slug: string): Promise<void> {
    await this.client.del(this.key(slug));
  }
}
