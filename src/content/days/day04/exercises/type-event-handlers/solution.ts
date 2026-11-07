/**
 * `keyof E & string` drops symbol/number keys before the template literal is built
 * (a template literal can't contain a symbol). `as` renames each key; `?` makes the handler optional.
 */
export type EventHandlers<E> = {
  [K in keyof E & string as `on${Capitalize<K>}`]?: (payload: E[K]) => void;
};

/** Remapping a key to `never` removes it — the idiomatic way to filter keys in a mapped type. */
export type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
