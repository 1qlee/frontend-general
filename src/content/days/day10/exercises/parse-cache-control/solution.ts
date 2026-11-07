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

const DELTA_SECONDS = /^\d+$/;

function parseSeconds(raw: string | undefined): number | undefined {
  if (raw === undefined || !DELTA_SECONDS.test(raw)) return undefined;
  return Number(raw);
}

export function parseCacheControl(header: string): CacheControl {
  const result: CacheControl = {
    noCache: false,
    noStore: false,
    mustRevalidate: false,
    immutable: false,
    isPublic: false,
    isPrivate: false,
  };

  for (const part of header.split(',')) {
    const directive = part.trim();
    if (!directive) continue;
    const eq = directive.indexOf('=');
    const name = (eq === -1 ? directive : directive.slice(0, eq)).trim().toLowerCase();
    // Values may be quoted (max-age="60"); strip one pair of surrounding quotes.
    const value = eq === -1 ? undefined : directive.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');

    switch (name) {
      case 'max-age':
        // First occurrence wins; invalid values are ignored (→ treated as no lifetime → stale).
        if (result.maxAge === undefined) result.maxAge = parseSeconds(value);
        break;
      case 's-maxage':
        if (result.sMaxAge === undefined) result.sMaxAge = parseSeconds(value);
        break;
      case 'stale-while-revalidate':
        if (result.staleWhileRevalidate === undefined) result.staleWhileRevalidate = parseSeconds(value);
        break;
      case 'no-cache':
        result.noCache = true;
        break;
      case 'no-store':
        result.noStore = true;
        break;
      case 'must-revalidate':
        result.mustRevalidate = true;
        break;
      case 'immutable':
        result.immutable = true;
        break;
      case 'public':
        result.isPublic = true;
        break;
      case 'private':
        result.isPrivate = true;
        break;
      default:
        // Unknown extension directives must be ignored.
        break;
    }
  }
  return result;
}

export function getCacheStatus(header: string, ageSeconds: number, options: { shared?: boolean } = {}): CacheStatus {
  const shared = options.shared ?? false;
  const cc = parseCacheControl(header);

  if (cc.noStore || (shared && cc.isPrivate)) return 'no-store';
  if (cc.noCache) return 'revalidate';

  // Shared caches (CDNs, proxies) prefer s-maxage; browsers ignore it.
  const lifetime = (shared ? cc.sMaxAge ?? cc.maxAge : cc.maxAge) ?? 0;
  if (ageSeconds < lifetime) return 'fresh';

  // must-revalidate forbids serving stale responses, so it disables the SWR window.
  const swr = cc.staleWhileRevalidate;
  if (!cc.mustRevalidate && swr !== undefined && ageSeconds < lifetime + swr) return 'stale-while-revalidate';

  return 'revalidate';
}
