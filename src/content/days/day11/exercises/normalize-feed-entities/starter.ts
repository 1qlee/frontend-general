// ----- API shape (nested, as the server returns it) -----
export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}
export interface Comment {
  id: string;
  body: string;
  author: User;
}
export interface Post {
  id: string;
  title: string;
  author: User;
  comments: Comment[];
}

// ----- Normalized shape (flat tables, references are ids) -----
export interface PostEntity {
  id: string;
  title: string;
  author: string; // user id
  comments: string[]; // comment ids
}
export interface CommentEntity {
  id: string;
  body: string;
  author: string; // user id
}
export interface Entities {
  posts: Record<string, PostEntity>;
  users: Record<string, User>;
  comments: Record<string, CommentEntity>;
}
export interface NormalizedFeed {
  entities: Entities;
  /** Top-level post ids, in the order the API returned them. */
  result: string[];
}

/**
 * Flatten nested posts into id-keyed tables.
 *
 * - Every post, comment and user is stored exactly once, keyed by id.
 * - Nested objects are replaced by ids (`author: 'u1'`, `comments: ['c1']`).
 * - If the same entity appears more than once, shallow-merge the copies:
 *   later fields win, fields missing from a later copy are kept.
 * - `result` keeps the input order. Do not mutate the input.
 */
export function normalize(posts: Post[]): NormalizedFeed {
  throw new Error('Not implemented');
}

/**
 * Rebuild nested posts from the tables (what a selector does before rendering).
 * Ids that point to missing entities (e.g. a deleted comment) are skipped.
 */
export function denormalize(result: string[], entities: Entities): Post[] {
  throw new Error('Not implemented');
}
