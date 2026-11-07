import type { Equal, Expect } from './type-utils';
import type { TrimLeft, Trim, CamelCase, CamelCaseKeys } from './solution';

// test: TrimLeft removes leading spaces only
type case1 = Expect<Equal<TrimLeft<'   hi '>, 'hi '>>;

// test: TrimLeft handles newlines and tabs
type case2 = Expect<Equal<TrimLeft<'\n\t  hello'>, 'hello'>>;

// test: Trim removes whitespace on both sides
type case3 = Expect<Equal<Trim<'  \n hello world \t '>, 'hello world'>>;

// test: Trim keeps inner whitespace and handles edge cases
type case4 = Expect<Equal<Trim<'a  b'>, 'a  b'>>;
type case4b = Expect<Equal<Trim<''>, ''>>;
type case4c = Expect<Equal<Trim<'   '>, ''>>;

// test: Trim of the wide `string` type stays string
type case5 = Expect<Equal<Trim<string>, string>>;

// test: CamelCase converts snake_case
type case6 = Expect<Equal<CamelCase<'user_id'>, 'userId'>>;
type case6b = Expect<Equal<CamelCase<'created_at_utc'>, 'createdAtUtc'>>;

// test: CamelCase leaves strings without underscores alone
type case7 = Expect<Equal<CamelCase<'name'>, 'name'>>;

// test: CamelCase distributes over unions
type case8 = Expect<Equal<CamelCase<'first_name' | 'last_name'>, 'firstName' | 'lastName'>>;

// test: CamelCaseKeys renames keys and keeps value types
type ApiUser = { user_id: number; first_name: string; is_admin?: boolean };
type case9 = Expect<Equal<CamelCaseKeys<ApiUser>, { userId: number; firstName: string; isAdmin?: boolean }>>;

// test: CamelCaseKeys rejects the old snake_case key
// @ts-expect-error — user_id no longer exists after the rename
const bad: CamelCaseKeys<ApiUser> = { user_id: 1, userId: 1, firstName: 'Ada' };
