import { describe, it, expect } from 'vitest';
import { parseCacheControl, getCacheStatus } from './solution';

describe('parseCacheControl', () => {
  it('parses the hashed-asset header: numbers and flags', () => {
    expect(parseCacheControl('public, max-age=31536000, immutable')).toEqual({
      maxAge: 31536000,
      noCache: false,
      noStore: false,
      mustRevalidate: false,
      immutable: true,
      isPublic: true,
      isPrivate: false,
    });
  });

  it('is case-insensitive and tolerates extra whitespace', () => {
    const cc = parseCacheControl('  Max-Age=60 ,  PRIVATE,No-Cache  ');
    expect(cc.maxAge).toBe(60);
    expect(cc.isPrivate).toBe(true);
    expect(cc.noCache).toBe(true);
  });

  it('accepts quoted values and ignores unknown directives', () => {
    const cc = parseCacheControl('max-age="120", x-custom=yes, s-maxage=30, stale-while-revalidate=600');
    expect(cc).toMatchObject({ maxAge: 120, sMaxAge: 30, staleWhileRevalidate: 600 });
  });

  it('ignores invalid delta-seconds and keeps the first occurrence of a directive', () => {
    const cc = parseCacheControl('max-age=abc, s-maxage=-5, stale-while-revalidate=1.5');
    expect(cc.maxAge).toBeUndefined();
    expect(cc.sMaxAge).toBeUndefined();
    expect(cc.staleWhileRevalidate).toBeUndefined();
    expect(parseCacheControl('max-age=10, max-age=99').maxAge).toBe(10);
  });

  it('returns all flags false for an empty header', () => {
    expect(parseCacheControl('')).toEqual({
      noCache: false,
      noStore: false,
      mustRevalidate: false,
      immutable: false,
      isPublic: false,
      isPrivate: false,
    });
  });
});

describe('getCacheStatus', () => {
  it('is fresh while age < max-age, and needs revalidation at exactly max-age', () => {
    expect(getCacheStatus('max-age=60', 0)).toBe('fresh');
    expect(getCacheStatus('max-age=60', 59)).toBe('fresh');
    expect(getCacheStatus('max-age=60', 60)).toBe('revalidate');
  });

  it('no-store is never reused; no-cache always revalidates (even at age 0)', () => {
    expect(getCacheStatus('no-store', 0)).toBe('no-store');
    expect(getCacheStatus('no-cache', 0)).toBe('revalidate');
    expect(getCacheStatus('no-cache, max-age=3600', 10)).toBe('revalidate');
  });

  it('without any lifetime the response must be revalidated (no heuristic freshness here)', () => {
    expect(getCacheStatus('public', 0)).toBe('revalidate');
    expect(getCacheStatus('max-age=oops', 0)).toBe('revalidate');
  });

  it('shared caches prefer s-maxage; browsers ignore it', () => {
    const header = 'max-age=0, s-maxage=300';
    expect(getCacheStatus(header, 100, { shared: true })).toBe('fresh');
    expect(getCacheStatus(header, 100)).toBe('revalidate');
  });

  it('shared caches must not store private responses; the browser may', () => {
    expect(getCacheStatus('private, max-age=600', 10, { shared: true })).toBe('no-store');
    expect(getCacheStatus('private, max-age=600', 10)).toBe('fresh');
  });

  it('serves stale inside the stale-while-revalidate window, then revalidates', () => {
    const header = 'max-age=60, stale-while-revalidate=30';
    expect(getCacheStatus(header, 70)).toBe('stale-while-revalidate');
    expect(getCacheStatus(header, 89)).toBe('stale-while-revalidate');
    expect(getCacheStatus(header, 120)).toBe('revalidate');
  });

  it('must-revalidate disables serving stale content', () => {
    expect(getCacheStatus('max-age=60, stale-while-revalidate=30, must-revalidate', 70)).toBe('revalidate');
  });
});
