/** Reserved path segments that cannot be used as slugs. */
export const RESERVED_SLUGS = new Set([
  'api',
  'assets',
  'health',
  'preview',
  'ready',
  'static',
  'v1',
  'favicon.ico',
  'robots.txt',
]);

const CUSTOM_SLUG_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

/** Validate a user-provided custom slug. */
export function validateCustomSlug(slug: unknown): string {
  if (slug === undefined || slug === null || slug === '') {
    throw new Error('SKIP');
  }

  if (typeof slug !== 'string') {
    throw new Error('INVALID');
  }

  const normalized = slug.trim();
  if (!CUSTOM_SLUG_PATTERN.test(normalized)) {
    throw new Error('INVALID');
  }

  if (RESERVED_SLUGS.has(normalized.toLowerCase())) {
    throw new Error('RESERVED');
  }

  return normalized;
}

export function parseOptionalIsoDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(field);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(field);
  }
  return date.toISOString();
}

export function parseOptionalPositiveInt(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(field);
  }
  return value;
}

export function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return Boolean(value);
}
