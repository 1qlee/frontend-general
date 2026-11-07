// ---- Errors -----------------------------------------------------------------

export type PathSegment = string | number;

/** ['users', 0, 'email'] → "users[0].email" */
export function formatPath(path: readonly PathSegment[]): string {
  return path.map((seg, i) => (typeof seg === 'number' ? `[${seg}]` : i === 0 ? seg : `.${seg}`)).join('');
}

export class ValidationError extends Error {
  readonly path: PathSegment[];
  constructor(path: PathSegment[], message: string) {
    super(path.length ? `${formatPath(path)}: ${message}` : message);
    this.name = 'ValidationError';
    this.path = path;
  }
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isNaN(value)) return 'NaN';
  return typeof value;
}

// ---- Schema core --------------------------------------------------------------

export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };

export interface Schema<T> {
  /** Validate `input`, which lives at `path` inside the root value. Throws ValidationError. */
  _parse(input: unknown, path: PathSegment[]): T;
  parse(input: unknown): T;
  safeParse(input: unknown): SafeParseResult<T>;
  optional(): Schema<T | undefined>;
}

/** Extract the output type of a schema — like zod's z.infer. */
export type Infer<S> = S extends Schema<infer T> ? T : never;

function createSchema<T>(check: (input: unknown, path: PathSegment[]) => T): Schema<T> {
  return {
    _parse: check,
    parse: (input) => check(input, []),
    safeParse(input) {
      try {
        return { success: true, data: check(input, []) };
      } catch (error) {
        if (error instanceof ValidationError) return { success: false, error };
        throw error; // a bug, not invalid data — don't swallow it
      }
    },
    // Returns a NEW schema; the original stays strict (schemas are immutable values).
    optional: () => createSchema<T | undefined>((input, path) => (input === undefined ? undefined : check(input, path))),
  };
}

function primitive<T>(name: 'string' | 'number' | 'boolean', guard: (input: unknown) => input is T): Schema<T> {
  return createSchema((input, path) => {
    if (!guard(input)) throw new ValidationError(path, `expected ${name}, received ${describeType(input)}`);
    return input;
  });
}

// ---- Object output type ---------------------------------------------------------

type Shape = Record<string, Schema<unknown>>;

/** Keys whose schema accepts undefined become optional properties. */
type OptionalKeys<S extends Shape> = { [K in keyof S]: undefined extends Infer<S[K]> ? K : never }[keyof S];
type RequiredKeys<S extends Shape> = Exclude<keyof S, OptionalKeys<S>>;
/** Flatten an intersection into one object type so hovers stay readable. */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type ObjectOutput<S extends Shape> = Simplify<
  { [K in RequiredKeys<S>]: Infer<S[K]> } & { [K in OptionalKeys<S>]?: Infer<S[K]> }
>;

// ---- Builders ---------------------------------------------------------------------

export const s = {
  string: () => primitive('string', (v): v is string => typeof v === 'string'),
  number: () => primitive('number', (v): v is number => typeof v === 'number' && !Number.isNaN(v)),
  boolean: () => primitive('boolean', (v): v is boolean => typeof v === 'boolean'),

  array<T>(item: Schema<T>): Schema<T[]> {
    return createSchema((input, path) => {
      if (!Array.isArray(input)) throw new ValidationError(path, `expected array, received ${describeType(input)}`);
      return input.map((element: unknown, i) => item._parse(element, [...path, i]));
    });
  },

  object<S extends Shape>(shape: S): Schema<ObjectOutput<S>> {
    return createSchema((input, path) => {
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new ValidationError(path, `expected object, received ${describeType(input)}`);
      }
      const record = input as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        // Own properties only: don't let `toString` & co. leak in from the prototype.
        const raw = Object.hasOwn(record, key) ? record[key] : undefined;
        const value = shape[key]._parse(raw, [...path, key]);
        if (value !== undefined) output[key] = value; // missing optional keys are omitted
      }
      // Unknown keys are stripped: we only copied keys from the shape.
      return output as ObjectOutput<S>;
    });
  },
};

// ---- Usage (types only) ---------------------------------------------------------------
const User = s.object({
  name: s.string(),
  nickname: s.string().optional(),
  tags: s.array(s.string()),
});
// type User = { name: string; tags: string[]; nickname?: string | undefined }
export type User = Infer<typeof User>;
