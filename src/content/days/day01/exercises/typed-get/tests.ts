import { describe, it, expect } from 'vitest';
import { get } from './solution';

const user = {
  name: 'Ada',
  address: { city: 'London', geo: { lat: 51.5, lng: -0.12 } },
  manager: null as null | { name: string },
  tags: ['admin'],
};

describe('get', () => {
  it('reads a top-level key', () => {
    expect(get(user, 'name')).toBe('Ada');
  });

  it('reads nested keys', () => {
    expect(get(user, 'address.city')).toBe('London');
    expect(get(user, 'address.geo.lat')).toBe(51.5);
  });

  it('returns intermediate objects', () => {
    expect(get(user, 'address.geo')).toEqual({ lat: 51.5, lng: -0.12 });
  });

  it('returns undefined (does not throw) when walking through null', () => {
    expect(get(user as any, 'manager.name')).toBeUndefined();
  });

  it('returns undefined for missing paths at runtime', () => {
    expect(get(user as any, 'address.zip.code')).toBeUndefined();
  });

  it('preserves falsy values', () => {
    const o = { a: { zero: 0, empty: '', no: false } };
    expect(get(o, 'a.zero')).toBe(0);
    expect(get(o, 'a.empty')).toBe('');
    expect(get(o, 'a.no')).toBe(false);
  });
});
