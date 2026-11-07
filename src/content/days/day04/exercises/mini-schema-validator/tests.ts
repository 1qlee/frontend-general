import { describe, it, expect } from 'vitest';
import { s, ValidationError, formatPath } from './solution';

/** Run fn and return what it threw (or undefined if it did not throw). */
function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('primitives', () => {
  it('accept values of the right type and return them', () => {
    expect(s.string().parse('hi')).toBe('hi');
    expect(s.number().parse(0)).toBe(0);
    expect(s.boolean().parse(false)).toBe(false);
  });

  it('reject other types with "expected X, received Y"', () => {
    expect(() => s.number().parse('42')).toThrow('expected number, received string');
    expect(() => s.string().parse(null)).toThrow('expected string, received null');
    expect(() => s.boolean().parse([])).toThrow('expected boolean, received array');
  });

  it('number() rejects NaN', () => {
    expect(() => s.number().parse(Number.NaN)).toThrow('expected number, received NaN');
  });

  it('throws ValidationError instances with an empty path at the root', () => {
    const error = thrownBy(() => s.string().parse(1));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).path).toEqual([]);
    expect((error as Error).message).toBe('expected string, received number');
  });
});

describe('formatPath', () => {
  it('formats keys with dots and indices with brackets', () => {
    expect(formatPath(['users', 1, 'email'])).toBe('users[1].email');
    expect(formatPath([0, 'id'])).toBe('[0].id');
    expect(formatPath([])).toBe('');
  });
});

describe('object', () => {
  // Schemas are built inside each test (via a factory) so an unfinished `s` fails tests one by one.
  const point = () => s.object({ x: s.number(), y: s.number() });

  it('returns a new object with only the shape keys (unknown keys stripped)', () => {
    const input = { x: 1, y: 2, z: 3 };
    const out = point().parse(input);
    expect(out).toEqual({ x: 1, y: 2 });
    expect(out).not.toBe(input);
    expect(out).not.toHaveProperty('z');
  });

  it('rejects null, arrays and primitives', () => {
    expect(() => point().parse(null)).toThrow('expected object, received null');
    expect(() => point().parse([1, 2])).toThrow('expected object, received array');
    expect(() => point().parse('1,2')).toThrow('expected object, received string');
  });

  it('reports a missing required key with its path', () => {
    expect(() => point().parse({ x: 1 })).toThrow('y: expected number, received undefined');
  });
});

describe('array', () => {
  it('validates every element and accepts empty arrays', () => {
    const Tags = s.array(s.string());
    expect(Tags.parse(['a', 'b'])).toEqual(['a', 'b']);
    expect(Tags.parse([])).toEqual([]);
    expect(() => Tags.parse(['a', 2])).toThrow('[1]: expected string, received number');
    expect(() => Tags.parse('a')).toThrow('expected array, received string');
  });
});

describe('nested schemas', () => {
  const team = () =>
    s.object({
      name: s.string(),
      users: s.array(s.object({ id: s.number(), email: s.string() })),
    });

  it('parses valid nested data', () => {
    const data = { name: 'core', users: [{ id: 1, email: 'a@x.io', extra: true }] };
    expect(team().parse(data)).toEqual({ name: 'core', users: [{ id: 1, email: 'a@x.io' }] });
  });

  it('reports the full path to the first invalid value', () => {
    const bad = { name: 'core', users: [{ id: 1, email: 'a@x.io' }, { id: 2, email: 42 }] };
    const error = thrownBy(() => team().parse(bad));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).path).toEqual(['users', 1, 'email']);
    expect((error as Error).message).toBe('users[1].email: expected string, received number');
  });
});

describe('optional', () => {
  const profile = () => s.object({ name: s.string(), nickname: s.string().optional() });

  it('allows a missing key and omits it from the output', () => {
    const out = profile().parse({ name: 'Ada' });
    expect(out).toEqual({ name: 'Ada' });
    expect(Object.keys(out)).toEqual(['name']);
  });

  it('still validates the value when present', () => {
    expect(profile().parse({ name: 'Ada', nickname: 'Countess' })).toEqual({ name: 'Ada', nickname: 'Countess' });
    expect(() => profile().parse({ name: 'Ada', nickname: 5 })).toThrow('nickname: expected string, received number');
  });

  it('accepts undefined but not null, and does not change the original schema', () => {
    const str = s.string();
    const maybeStr = str.optional();
    expect(maybeStr.parse(undefined)).toBeUndefined();
    expect(() => maybeStr.parse(null)).toThrow('expected string, received null');
    expect(() => str.parse(undefined)).toThrow('expected string, received undefined');
  });
});

describe('safeParse', () => {
  const idSchema = () => s.object({ id: s.number() });

  it('returns { success: true, data } for valid input', () => {
    expect(idSchema().safeParse({ id: 7 })).toEqual({ success: true, data: { id: 7 } });
  });

  it('returns { success: false, error } instead of throwing for invalid input', () => {
    const result = idSchema().safeParse({ id: '7' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.path).toEqual(['id']);
    }
  });
});
