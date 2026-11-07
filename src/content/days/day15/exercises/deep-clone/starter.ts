/**
 * Returns a deep copy of `value` that shares no mutable objects with it.
 *
 * - primitives and functions are returned as-is
 * - arrays → new arrays; plain objects AND class instances → new objects with the SAME prototype
 *   and deep copies of their own enumerable string-keyed properties (Object.keys)
 * - Date → new Date with the same time; RegExp → new RegExp with the same source, flags and lastIndex
 * - Map → new Map with deep-cloned keys and values; Set → new Set with deep-cloned members
 * - circular references and shared references are preserved in the copy:
 *   if `a.self === a` then `copy.self === copy`; if `a.x === a.y` then `copy.x === copy.y`
 */
export function deepClone<T>(value: T): T {
  throw new Error('Not implemented');
}
