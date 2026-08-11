import type { CreateUrlInput, ShortUrl, UrlRepository, UrlStats } from '../domain';
import { ConflictError, GoneError, NotFoundError, ValidationError } from '../domain';
import { generateUniqueSlug } from './slug-generator';
import {
  parseOptionalBoolean,
  parseOptionalIsoDate,
  parseOptionalPositiveInt,
  validateCustomSlug,
} from './slug-validator';
import { scanDestinationUrl } from './url-scanner';
import { validateDestinationUrl } from './url-validator';

export interface UrlShortenerServiceOptions {
  /** Base URL used to build `short_url`, e.g. "http://localhost:3000". */
  shortUrlBase: string;
  /** Hostnames that may not be used as destinations (e.g. the shortener's own host). */
  blockedHosts?: Iterable<string>;
}

export interface CreatedShortUrl {
  record: ShortUrl;
  shortUrl: string;
}

function toResponse(record: ShortUrl, shortUrlBase: string): CreatedShortUrl {
  return {
    record,
    shortUrl: `${shortUrlBase}/${record.slug}`,
  };
}

/**
 * Orchestrates URL validation, slug generation, and persistence. Depends only
 * on the UrlRepository interface, never on a concrete persistence class.
 */
export class UrlShortenerService {
  private readonly shortUrlBase: string;
  private readonly blockedHosts: ReadonlySet<string>;

  constructor(
    private readonly repository: UrlRepository,
    options: UrlShortenerServiceOptions,
  ) {
    this.shortUrlBase = options.shortUrlBase.replace(/\/+$/, '');
    const hosts = new Set<string>(
      [...(options.blockedHosts ?? [])].map((h) => h.toLowerCase()),
    );
    hosts.add(new URL(this.shortUrlBase).hostname.toLowerCase());
    this.blockedHosts = hosts;
  }

  /** Create a shortened URL for a validated destination. */
  async create(input: CreateUrlInput | unknown): Promise<CreatedShortUrl> {
    const body = (typeof input === 'object' && input !== null ? input : {}) as CreateUrlInput;
    const validated = validateDestinationUrl(body.destinationUrl, this.blockedHosts);
    scanDestinationUrl(validated);

    let slug: string;
    try {
      const custom = validateCustomSlug(body.customSlug);
      if (await this.repository.existsBySlug(custom)) {
        throw new ConflictError(`Slug '${custom}' is already taken.`);
      }
      slug = custom;
    } catch (err) {
      if (err instanceof ConflictError) {
        throw err;
      }
      if (err instanceof Error && err.message === 'INVALID') {
        throw new ValidationError(
          'custom_slug must be 3–32 characters and contain only letters, numbers, hyphens, or underscores.',
        );
      }
      if (err instanceof Error && err.message === 'RESERVED') {
        throw new ValidationError('custom_slug is reserved and cannot be used.');
      }
      slug = await generateUniqueSlug((s) => this.repository.existsBySlug(s));
    }

    let expiresAt: string | undefined;
    let maxClicks: number | undefined;
    try {
      expiresAt = parseOptionalIsoDate(body.expiresAt, 'expires_at');
      maxClicks = parseOptionalPositiveInt(body.maxClicks, 'max_clicks');
    } catch {
      throw new ValidationError('expires_at must be a valid ISO 8601 date and max_clicks must be a positive integer.');
    }

    const previewEnabled = parseOptionalBoolean(body.previewEnabled);

    const record = await this.repository.create({
      slug,
      destinationUrl: validated,
      createdAt: new Date().toISOString(),
      clickCount: 0,
      ...(expiresAt ? { expiresAt } : {}),
      ...(maxClicks ? { maxClicks } : {}),
      ...(previewEnabled ? { previewEnabled: true } : {}),
    });

    return toResponse(record, this.shortUrlBase);
  }

  /** Legacy helper for callers passing only a destination URL string. */
  async createFromDestination(destinationUrl: unknown): Promise<CreatedShortUrl> {
    return this.create({ destinationUrl });
  }

  async list(): Promise<ShortUrl[]> {
    return this.repository.list();
  }

  async delete(slug: string): Promise<void> {
    const deleted = await this.repository.softDelete(slug);
    if (!deleted) {
      throw new NotFoundError(slug);
    }
  }

  async getStats(slug: string): Promise<UrlStats> {
    const record = await this.requireActiveRecord(slug);
    return {
      slug: record.slug,
      clickCount: record.clickCount,
      createdAt: record.createdAt,
      ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
      ...(record.maxClicks ? { maxClicks: record.maxClicks } : {}),
      ...(record.deletedAt ? { deletedAt: record.deletedAt } : {}),
    };
  }

  async resolve(slug: string, options: { trackClick?: boolean } = {}): Promise<string> {
    const record = await this.requireActiveRecord(slug);
    if (options.trackClick !== false) {
      await this.repository.incrementClickCount(slug);
    }
    return record.destinationUrl;
  }

  async getRecord(slug: string): Promise<ShortUrl> {
    return this.requireActiveRecord(slug);
  }

  buildShortUrl(slug: string): string {
    return `${this.shortUrlBase}/${slug}`;
  }

  private async requireActiveRecord(slug: string): Promise<ShortUrl> {
    const record = await this.repository.findBySlug(slug);
    if (!record) {
      throw new NotFoundError(slug);
    }
    if (record.deletedAt) {
      throw new GoneError(slug);
    }
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new GoneError(slug);
    }
    if (record.maxClicks !== undefined && record.clickCount >= record.maxClicks) {
      throw new GoneError(slug);
    }
    return record;
  }
}
