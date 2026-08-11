/**
 * A shortened URL record.
 *
 * `deletedAt` is set on soft-delete: the record still exists so the redirect
 * handler can distinguish "never existed" (404) from "existed, now gone" (410).
 */
export interface ShortUrl {
  /** Internal id; may equal the slug. */
  id: string;
  /** URL-safe unique key, e.g. 8 chars base62 or a custom alias. */
  slug: string;
  /** Validated absolute URL. */
  destinationUrl: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 soft-delete timestamp; drives 410 Gone. */
  deletedAt?: string;
  /** ISO 8601 expiration timestamp; drives 410 Gone when past. */
  expiresAt?: string;
  /** Maximum allowed clicks before the link becomes unavailable. */
  maxClicks?: number;
  /** Total successful redirect count. */
  clickCount: number;
  /** When true, browsers are shown a preview page before redirecting. */
  previewEnabled?: boolean;
}

export interface CreateUrlInput {
  destinationUrl: unknown;
  customSlug?: unknown;
  expiresAt?: unknown;
  maxClicks?: unknown;
  previewEnabled?: unknown;
}

export interface UrlStats {
  slug: string;
  clickCount: number;
  createdAt: string;
  expiresAt?: string;
  maxClicks?: number;
  deletedAt?: string;
}
