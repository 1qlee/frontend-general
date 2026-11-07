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
  // original object → its copy. Registering the copy BEFORE recursing into children is what
  // makes cycles terminate and keeps shared references shared.
  const seen = new WeakMap<object, unknown>();

  const clone = (input: unknown): unknown => {
    if (typeof input !== 'object' || input === null) return input; // primitives + functions
    if (seen.has(input)) return seen.get(input);

    if (input instanceof Date) {
      const copy = new Date(input.getTime());
      seen.set(input, copy);
      return copy;
    }
    if (input instanceof RegExp) {
      const copy = new RegExp(input.source, input.flags);
      copy.lastIndex = input.lastIndex;
      seen.set(input, copy);
      return copy;
    }
    if (input instanceof Map) {
      const copy = new Map<unknown, unknown>();
      seen.set(input, copy);
      input.forEach((v, k) => copy.set(clone(k), clone(v)));
      return copy;
    }
    if (input instanceof Set) {
      const copy = new Set<unknown>();
      seen.set(input, copy);
      input.forEach((v) => copy.add(clone(v)));
      return copy;
    }
    if (Array.isArray(input)) {
      const copy: unknown[] = [];
      seen.set(input, copy);
      input.forEach((item, i) => {
        copy[i] = clone(item);
      });
      return copy;
    }

    // Plain objects, Object.create(null) objects and class instances: keep the prototype.
    const source = input as Record<string, unknown>;
    const copy = Object.create(Object.getPrototypeOf(source)) as Record<string, unknown>;
    seen.set(source, copy);
    for (const key of Object.keys(source)) {
      copy[key] = clone(source[key]);
    }
    return copy;
  };

  return clone(value) as T;
}
