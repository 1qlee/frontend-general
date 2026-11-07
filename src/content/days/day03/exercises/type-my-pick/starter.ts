/**
 * Implement the built-in `Pick<T, K>` yourself (don't use `Pick`).
 *
 *   interface Todo { title: string; description?: string; readonly completed: boolean }
 *   type Preview = MyPick<Todo, 'title' | 'completed'>;
 *   // { title: string; readonly completed: boolean }
 *
 * Requirements:
 *  - K may be a single key or a union of keys.
 *  - Only keys that exist on T are allowed: MyPick<Todo, 'nope'> must be a compile error.
 *  - Optional (`?`) and `readonly` modifiers of the picked properties are preserved.
 */
export type MyPick<T, K> = any;
