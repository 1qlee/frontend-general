/**
 * Template literal types + `infer` + recursion.
 *
 *   TrimLeft<'  hi '>   // 'hi '
 *   Trim<'\n  hi \t'>   // 'hi'
 *   CamelCase<'created_at_utc'>   // 'createdAtUtc'
 *   CamelCaseKeys<{ user_id: number; first_name: string }>
 *   // { userId: number; firstName: string }
 *
 * Whitespace means ' ', '\n' and '\t'.
 * CamelCase converts snake_case (underscores) to camelCase; strings without '_' are unchanged.
 * CamelCaseKeys renames the keys of an object type (one level) and keeps the value types.
 *
 * Don't reach for a library — use template literal patterns, `infer`, and the intrinsic
 * `Capitalize<S>`.
 */
export type TrimLeft<S extends string> = any;

export type Trim<S extends string> = any;

export type CamelCase<S extends string> = any;

export type CamelCaseKeys<T> = any;
