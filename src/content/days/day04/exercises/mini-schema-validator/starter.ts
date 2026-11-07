/**
 * A mini zod: runtime validation whose static types are inferred from the schema.
 *
 *   const User = s.object({
 *     name: s.string(),
 *     nickname: s.string().optional(),
 *     tags: s.array(s.string()),
 *   });
 *   type User = Infer<typeof User>;   // { name: string; tags: string[]; nickname?: string | undefined }
 *
 *   const user = User.parse(await res.json());   // unknown in, User out — or a ValidationError
 *
 * Runtime requirements (see the tests):
 *  - s.string() / s.number() / s.boolean(): accept only that type (number rejects NaN).
 *    Error message: "expected number, received string" (received: typeof, but 'null', 'array', 'NaN').
 *  - s.array(item): input must be an array; validates every element.
 *  - s.object(shape): input must be a non-null, non-array object; returns a NEW object containing only
 *    the shape's keys (unknown keys are stripped).
 *  - .optional(): returns a new schema that also accepts undefined; missing optional keys are
 *    omitted from the output object. The original schema is unchanged.
 *  - Errors are ValidationError instances with a `path` (e.g. ['users', 1, 'email']) and a message
 *    prefixed with the formatted path: "users[1].email: expected string, received number".
 *    At the root there is no prefix.
 *  - parse(input) throws on invalid data; safeParse(input) never throws for invalid data and returns
 *    { success: true, data } | { success: false, error }.
 *
 * Type requirements (checked by the type checker panel, not by the tests):
 *  - Infer<S> extracts the output type of a schema.
 *  - s.object's output type makes keys whose schema accepts undefined optional (`key?:`).
 */

export type PathSegment = string | number;

/** ['users', 0, 'email'] → "users[0].email" */
export function formatPath(path: readonly PathSegment[]): string {
  throw new Error('Not implemented');
}

export class ValidationError extends Error {
  readonly path: PathSegment[];
  constructor(path: PathSegment[], message: string) {
    super(message); // TODO: prefix with the formatted path (no prefix at the root)
    this.name = 'ValidationError';
    this.path = path;
  }
}

export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };

export interface Schema<T> {
  /** Validate `input`, which lives at `path` inside the root value. Throws ValidationError. */
  _parse(input: unknown, path: PathSegment[]): T;
  parse(input: unknown): T;
  safeParse(input: unknown): SafeParseResult<T>;
  optional(): Schema<T | undefined>;
}

/** TODO: extract T from Schema<T>. */
export type Infer<S> = unknown;

type Shape = Record<string, Schema<unknown>>;

/** TODO: required keys → `key: T`, keys whose schema accepts undefined → `key?: T`. */
export type ObjectOutput<S extends Shape> = { [K in keyof S]: unknown };

export const s = {
  string(): Schema<string> {
    throw new Error('Not implemented');
  },
  number(): Schema<number> {
    throw new Error('Not implemented');
  },
  boolean(): Schema<boolean> {
    throw new Error('Not implemented');
  },
  array<T>(item: Schema<T>): Schema<T[]> {
    throw new Error('Not implemented');
  },
  object<S extends Shape>(shape: S): Schema<ObjectOutput<S>> {
    throw new Error('Not implemented');
  },
};
