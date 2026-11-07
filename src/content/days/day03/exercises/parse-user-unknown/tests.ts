import { describe, it, expect } from 'vitest';
import { parseUser, isUser, ValidationError } from './solution';

const valid = {
  id: 7,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'admin',
  tags: ['math', 'engines'],
};

/** Run fn and return what it threw (fails the test if it didn't throw). */
function thrownBy(fn: () => unknown): ValidationError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    return err as ValidationError;
  }
  throw new Error('expected a ValidationError to be thrown');
}

describe('parseUser', () => {
  it('returns a typed user for valid input', () => {
    expect(parseUser(valid)).toEqual(valid);
  });

  it('strips unknown properties and returns a new object', () => {
    const input = { ...valid, password: 'hunter2', isAdmin: true };
    const user = parseUser(input);
    expect(user).not.toBe(input);
    expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name', 'role', 'tags']);
  });

  it('keeps nickname when it is a string and omits the key when absent', () => {
    expect(parseUser({ ...valid, nickname: 'Countess' }).nickname).toBe('Countess');
    expect('nickname' in parseUser(valid)).toBe(false);
    expect('nickname' in parseUser({ ...valid, nickname: undefined })).toBe(false);
  });

  it.each([
    ['null', null],
    ['an array', [valid]],
    ['a string', '{"id":7}'],
  ])('rejects %s at path "user"', (_label, input) => {
    expect(thrownBy(() => parseUser(input)).path).toBe('user');
  });

  it('reports the field path and the received type in the message', () => {
    const err = thrownBy(() => parseUser({ ...valid, id: '7' }));
    expect(err.path).toBe('user.id');
    expect(err.message).toMatch(/user\.id/);
    expect(err.message).toMatch(/string/);
  });

  it('rejects ids that are not positive integers (NaN, 1.5, 0)', () => {
    for (const id of [Number.NaN, 1.5, 0]) {
      expect(thrownBy(() => parseUser({ ...valid, id })).path).toBe('user.id');
    }
  });

  it('rejects an empty name, a malformed email and an unknown role', () => {
    expect(thrownBy(() => parseUser({ ...valid, name: '' })).path).toBe('user.name');
    expect(thrownBy(() => parseUser({ ...valid, email: 'not-an-email' })).path).toBe('user.email');
    expect(thrownBy(() => parseUser({ ...valid, role: 'superuser' })).path).toBe('user.role');
  });

  it('reports the index of an invalid tag', () => {
    expect(thrownBy(() => parseUser({ ...valid, tags: 'math' })).path).toBe('user.tags');
    expect(thrownBy(() => parseUser({ ...valid, tags: ['math', 42] })).path).toBe('user.tags[1]');
  });

  it('rejects nickname: null (null is not the same as absent)', () => {
    expect(thrownBy(() => parseUser({ ...valid, nickname: null })).path).toBe('user.nickname');
  });
});

describe('isUser', () => {
  it('returns true for valid users and false (without throwing) for anything else', () => {
    expect(isUser(valid)).toBe(true);
    expect(isUser({ ...valid, role: 'root' })).toBe(false);
    expect(isUser(null)).toBe(false);
    expect(isUser(42)).toBe(false);
  });
});
