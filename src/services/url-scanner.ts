import { BlockedDomainError } from '../domain';

/** Known phishing/malware-ish patterns and risky destinations. */
const SUSPICIOUS_PATTERNS = [
  /login[\W_]*(verify|secure|update)/i,
  /password[\W_]*(reset|verify)/i,
  /free[\W_-]*(crypto|bitcoin|gift)/i,
  /(bit\.ly|tinyurl|t\.co)\/.*(login|verify|password)/i,
];

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^169\.254\./,
];

/**
 * Additional safety checks beyond basic URL validation.
 * Blocks localhost/private IPs, credential-in-URL patterns, and suspicious paths.
 */
export function scanDestinationUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new BlockedDomainError('destination_url points to a domain that is not allowed.');
  }

  if (PRIVATE_IP_RANGES.some((pattern) => pattern.test(hostname))) {
    throw new BlockedDomainError('destination_url points to a private or local network address.');
  }

  if (parsed.username || parsed.password) {
    throw new BlockedDomainError('destination_url must not contain embedded credentials.');
  }

  const haystack = `${parsed.hostname}${parsed.pathname}${parsed.search}`;
  if (SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(haystack))) {
    throw new BlockedDomainError('destination_url matches a blocked suspicious pattern.');
  }
}
