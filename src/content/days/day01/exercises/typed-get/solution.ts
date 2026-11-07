/** Primitive-ish values we don't descend into. Arrays are treated as leaves to keep paths finite. */
type Leaf = string | number | boolean | bigint | symbol | null | undefined | Date | Function | readonly unknown[];

export type Path<T> = T extends Leaf
  ? never
  : {
      [K in keyof T & string]: T[K] extends Leaf ? K : K | `${K}.${Path<T[K]>}`;
    }[keyof T & string];

export type PathValue<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? PathValue<T[Head], Rest>
    : undefined
  : P extends keyof T
    ? T[P]
    : undefined;

export function get<T, P extends Path<T>>(obj: T, path: P): PathValue<T, P> {
  if (path === '') return obj as PathValue<T, P>;
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (current === null || current === undefined) return undefined as PathValue<T, P>;
    current = (current as Record<string, unknown>)[key];
  }
  return current as PathValue<T, P>;
}
