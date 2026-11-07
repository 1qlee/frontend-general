/**
 * A parsed `Cache-Control` **response** header.
 * Delta-seconds directives are numbers (seconds); flags are booleans.
 */
export interface CacheControl {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  noCache: boolean;
  noStore: boolean;
  mustRevalidate: boolean;
  immutable: boolean;
  isPublic: boolean;
  isPrivate: boolean;
}

/**
 * What a cache may do with a stored response right now:
 * - 'fresh'                  → serve it without contacting the origin
 * - 'stale-while-revalidate' → serve it, and revalidate in the background
 * - 'revalidate'             → must ask the origin first (conditional request → 200 or 304)
 * - 'no-store'               → this cache must not store/reuse it at all
 */
export type CacheStatus = 'fresh' | 'stale-while-revalidate' | 'revalidate' | 'no-store';

/**
 * Parse a Cache-Control header such as `public, max-age=31536000, immutable`.
 * - Directive names are case-insensitive; whitespace around directives is ignored.
 * - Values may be quoted (`max-age="60"`).
 * - Invalid delta-seconds (`max-age=abc`, `max-age=-1`) are ignored; the first occurrence wins.
 * - Unknown directives are ignored.
 */
export function parseCacheControl(header: string): CacheControl {
  throw new Error('Not implemented');
}

/**
 * Decide what a cache may do with a stored response that is `ageSeconds` old.
 * - `shared: true` means a CDN/proxy (uses s-maxage, must not store `private`).
 * - Fresh while age < lifetime (no heuristic freshness: no lifetime → revalidate).
 */
export function getCacheStatus(header: string, ageSeconds: number, options: { shared?: boolean } = {}): CacheStatus {
  throw new Error('Not implemented');
}
