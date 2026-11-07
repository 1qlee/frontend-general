/**
 * Implement the built-in `Readonly<T>` yourself (don't use `Readonly`).
 *
 *   interface Todo { title: string; tags: string[] }
 *   const todo: MyReadonly<Todo> = { title: 'Ship it', tags: [] };
 *   todo.title = 'x';      // ❌ compile error: title is read-only
 *   todo.tags.push('x');   // ✅ allowed — Readonly is SHALLOW
 *
 * Requirements:
 *  - Every own property of T becomes `readonly`; optional properties stay optional.
 *  - Shallow: nested objects are not changed (you'll write DeepReadonly on Day 4).
 *  - Arrays and tuples become readonly arrays / readonly tuples.
 */
export type MyReadonly<T> = any;
