/**
 * Validate untrusted data (e.g. `await res.json()`) and turn it into a typed `User`.
 *
 * parseUser(input: unknown): User
 *   - Returns a NEW object containing only the known fields (unknown keys are stripped).
 *   - Throws a `ValidationError` for the first invalid field. `error.path` says where:
 *       'user'          → input is not a plain object (null, array, string…)
 *       'user.id'       → id is not a positive integer
 *       'user.name'     → name is not a non-empty string
 *       'user.email'    → email is not a string matching /^[^\s@]+@[^\s@]+$/
 *       'user.role'     → role is not one of ROLES
 *       'user.tags'     → tags is not an array
 *       'user.tags[i]'  → element i of tags is not a string
 *       'user.nickname' → nickname is present but not a string (absent/undefined is fine)
 *   - The message should include the path and what was received, e.g.
 *       'user.id: expected a positive integer, got string'
 *   - When nickname is absent, the result must not have a `nickname` key at all.
 *
 * isUser(input: unknown): input is User
 *   - A type guard that never throws.
 *
 * No `any`, no `as User` on the input. Narrow `unknown` step by step.
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

export function parseUser(input: unknown): User {
  throw new Error('Not implemented');
}

export function isUser(input: unknown): input is User {
  throw new Error('Not implemented');
}
