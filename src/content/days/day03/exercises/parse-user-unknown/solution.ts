/**
 * Validate untrusted data (e.g. `await res.json()`) and turn it into a typed `User`.
 * See the starter for the full spec.
 */
export const ROLES = ['admin', 'editor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  tags: string[];
  nickname?: string;
}

export class ValidationError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'ValidationError';
    this.path = path;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+$/;

/** A readable description of what we received, for error messages. */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return typeof value;
}

function fail(path: string, expected: string, value: unknown): never {
  throw new ValidationError(path, `expected ${expected}, got ${describe(value)}`);
}

/** `unknown` → an object we can read properties from. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `ROLES.includes(value)` doesn't compile: `includes` on a readonly tuple of literals
 * only accepts those literals. Widen the array (safe: we only read it) and let the
 * type predicate narrow the value.
 */
function isRole(value: unknown): value is Role {
  return (ROLES as readonly unknown[]).includes(value);
}

export function parseUser(input: unknown): User {
  if (!isRecord(input)) return fail('user', 'an object', input);

  const { id, name, email, role, tags, nickname } = input;

  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return fail('user.id', 'a positive integer', id);
  if (typeof name !== 'string' || name.trim() === '') return fail('user.name', 'a non-empty string', name);
  if (typeof email !== 'string' || !EMAIL.test(email)) return fail('user.email', 'an email address', email);
  if (!isRole(role)) return fail('user.role', `one of ${ROLES.join(', ')}`, role);
  if (!Array.isArray(tags)) return fail('user.tags', 'an array', tags);

  // Array.isArray narrows `unknown` to `any[]` — annotate the element as unknown so `any` can't leak in.
  const parsedTags = tags.map((tag: unknown, i): string =>
    typeof tag === 'string' ? tag : fail(`user.tags[${i}]`, 'a string', tag),
  );

  if (nickname !== undefined && typeof nickname !== 'string') return fail('user.nickname', 'a string', nickname);

  // Build a fresh object: only known keys, and no `nickname: undefined`.
  const user: User = { id, name, email, role, tags: parsedTags };
  if (nickname !== undefined) user.nickname = nickname;
  return user;
}

export function isUser(input: unknown): input is User {
  try {
    parseUser(input);
    return true;
  } catch {
    return false;
  }
}
