/**
 * Implement a type-safe `get(obj, path)` for dot-separated paths.
 *
 *   const user = { name: 'Ada', address: { city: 'London', zip: 'N1' }, tags: ['a'] };
 *   get(user, 'address.city')   // 'London'  (type: string)
 *   get(user, 'missing.path')   // undefined
 *
 * Runtime: walk the path; return undefined as soon as a segment is missing or a value is null/undefined.
 * Never throw for missing paths. Empty path '' returns the object itself.
 *
 * Types (the interesting part): `Path<T>` is a union of every valid dot path of T, and
 * `PathValue<T, P>` is the type at that path. Implement both so that:
 *   get(user, 'address.city') is typed as string
 *   get(user, 'address.nope') is a COMPILE error
 */
export type Path<T> = string; // TODO: make this a union of valid paths
export type PathValue<T, P extends string> = unknown; // TODO

export function get<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
  throw new Error('Not implemented');
}
