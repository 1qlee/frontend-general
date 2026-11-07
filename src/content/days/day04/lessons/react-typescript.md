## Why interviewers ask this

Most React roles are TypeScript roles, so in a live-coding round you'll be typing props, events and state *while* the interviewer watches. Hesitating over `ChangeEvent<HTMLInputElement>` or reaching for `any` costs points; confidently writing a generic `List<T>` or a context hook that can't return `null` earns them. Conceptual questions follow the same lines: "`ReactNode` vs `JSX.Element`?", "how do you type context?", "how did refs change in React 19?".

This lesson is the reference you should be able to reproduce from memory. Everything is current for **React 19** with `@types/react` 19 and TypeScript 5.x.

## Typing props

```tsx
interface UserCardProps {
  user: User;
  /** Optional with a default supplied in the destructuring. */
  compact?: boolean;
  onSelect?: (user: User) => void;
}

export function UserCard({ user, compact = false, onSelect }: UserCardProps) {
  return (
    <article className={compact ? 'card card--compact' : 'card'} onClick={() => onSelect?.(user)}>
      {user.name}
    </article>
  );
}
```

Conventions worth stating out loud:

- **`interface` or `type`?** Either. Interfaces give slightly better error messages and can be extended/merged; `type` is required for unions (discriminated props, below). Pick one convention per codebase.
- **Defaults in destructuring**, not `defaultProps` — `defaultProps` on function components was removed in React 19.
- **Don't annotate the return type** unless you want to enforce it; inference is fine. Since TS 5.1 with current `@types/react`, a component may return any `ReactNode` (strings, numbers, `null`, arrays), not just an element.
- **`React.FC`?** It's no longer harmful (React 18 types removed its implicit `children`), but it adds nothing, can't express generic components, and makes default-value patterns clunkier. Most teams write plain functions with typed props.

## `children`: ReactNode vs ReactElement vs JSX.Element

| Type | What it accepts | Use it for |
|---|---|---|
| `React.ReactNode` | **anything renderable**: elements, strings, numbers, `bigint`, booleans, `null`, `undefined`, iterables (arrays) of those, portals — and promises in React 19's types | `children` and any "slot" prop. The default choice. |
| `React.ReactElement<P>` | an element object created by JSX/`createElement` — **not** strings, numbers or `null` | When you must inspect or clone the element (`cloneElement`, `isValidElement`) |
| `React.JSX.Element` | `ReactElement<any, any>` — what a JSX expression evaluates to | Rarely in props; it's the inferred type of `<div />` |

```tsx
interface CardProps {
  title: React.ReactNode;              // a slot: "Settings" or <h2>Settings</h2>
  children: React.ReactNode;
  footer?: React.ReactNode;
}

interface DataProps<T> {
  data: T;
  children: (data: T) => React.ReactNode; // render prop / function-as-children
}
```

`PropsWithChildren<P>` is shorthand for `P & { children?: ReactNode }` — fine, but explicit is clearer (and lets you make `children` required).

> [!WARNING]
> React 19's types removed the **global** `JSX` namespace. Write `React.JSX.Element` (or `import type { JSX } from 'react'`); bare `JSX.Element` only works if something else in your project still declares the global.

> [!INTERVIEW] Say it like this
> "`ReactNode` is everything React can render — elements, strings, numbers, null, arrays — so it's the right type for `children` and slot props. `ReactElement` is only the object JSX creates, so it rejects plain text; I use it when I need to clone or inspect an element. `JSX.Element` is just what a JSX expression evaluates to; I almost never put it in a props type."

{{quiz:l2-children}}

## Extending native element props

A design-system `Button` should accept everything a `<button>` accepts. Don't hand-copy attributes; derive them:

```tsx
import type { ComponentPropsWithoutRef } from 'react';

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'ghost' | 'danger';
}

export function Button({ variant = 'primary', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={`btn btn--${variant} ${className ?? ''}`} {...rest} />;
}

// <Button variant="danger" disabled onClick={(e) => e.currentTarget.blur()} aria-label="Delete" />
```

| Helper | Meaning |
|---|---|
| `ComponentProps<'input'>` | All props of the intrinsic element — in React 19 **including `ref`** |
| `ComponentPropsWithoutRef<'button'>` | Same, minus `ref` |
| `ComponentPropsWithRef<typeof X>` | Props including a correctly typed `ref` |
| `ComponentProps<typeof MyComponent>` | Extract the props of any component (handy for wrappers and third-party components) |

When your prop **conflicts** with a native one, `Omit` it first — otherwise `extends` fails because your type isn't compatible with the native one:

```tsx
// ❌ Interface 'InputProps' incorrectly extends ... (string is not a ChangeEvent)
// interface InputProps extends ComponentProps<'input'> { onChange: (value: string) => void }

// ✅
interface InputProps extends Omit<ComponentProps<'input'>, 'onChange'> {
  onChange: (value: string) => void;
}
```

## Event handlers

Inline handlers are **contextually typed** — no annotation needed:

```tsx
<input onChange={(e) => setQuery(e.target.value)} />   // e: React.ChangeEvent<HTMLInputElement>
```

When you extract the handler, annotate the **event** type (or the handler type):

```tsx
import type { ChangeEvent, FormEvent, KeyboardEvent, ChangeEventHandler } from 'react';

function handleChange(e: ChangeEvent<HTMLInputElement>) {
  setQuery(e.target.value);
}
const handleSelect: ChangeEventHandler<HTMLSelectElement> = (e) => setSort(e.target.value);

function handleSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
}

function handleKeyDown(e: KeyboardEvent<HTMLLIElement>) {
  if (e.key === 'Enter') select();
}
```

Details interviewers probe:

- The generic is the **element the handler is attached to**. `e.currentTarget` is always that element type. `e.target` is typed as the element only for `ChangeEvent` (for most other events it's an `EventTarget`, because the event may come from a child).
- React's `MouseEvent`/`KeyboardEvent` are **synthetic** event types that shadow the DOM globals with the same names. Import them from `react` (or write `React.MouseEvent`), otherwise you're typing a native DOM event and the handler won't fit.
- Trick for "what type is this prop?": `ComponentProps<'input'>['onChange']`.
- For **your own** callback props, type them in domain terms — `onSelect: (user: User) => void` — not as DOM events. Consumers shouldn't need to know you used a `<li>`.

## State

`useState` infers from the initial value. You annotate when the initial value doesn't describe every future value:

```tsx
const [count, setCount] = useState(0);                         // number
const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
const [user, setUser] = useState<User | null>(null);            // null until loaded
const [tags, setTags] = useState<string[]>([]);                 // without <string[]>: never[]
const [rows] = useState(() => buildExpensiveRows());            // lazy initializer, inferred
```

> [!MISTAKE]
> `useState([])` under `strict` infers `never[]`, and the first `setTags(['a'])` fails with "Type 'string' is not assignable to type 'never'". People "fix" it with `any[]`. The fix is `useState<string[]>([])`.

For related values that change together (`status` + `data` + `error`), prefer one **discriminated union** over three independent `useState`s — it makes impossible states unrepresentable (Day 3), and `useReducer` is a natural fit.

## Refs

```tsx
// DOM ref: pass null, get RefObject<HTMLInputElement | null>
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();

// Mutable "instance variable": include null in the type yourself
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
timerRef.current = setInterval(tick, 1000);
```

What changed in React 19's types:

- `useRef` **requires an argument** (`useRef<number>()` is an error; write `useRef<number | undefined>(undefined)`).
- `RefObject.current` is always **mutable**; the old `MutableRefObject` split is gone. `useRef<HTMLInputElement>(null)` returns `RefObject<HTMLInputElement | null>`.
- Ref callbacks may return a **cleanup function**, so an implicit return like `ref={(el) => (myEl = el)}` is now a type error — use a block body: `ref={(el) => { myEl = el; }}`.

Prefer `ReturnType<typeof setTimeout>` over `number` or `NodeJS.Timeout` for timer IDs: it's correct in both browser and Node type environments.

{{quiz:l2-use-ref}}

## `ref` is just a prop now (goodbye `forwardRef`)

Before React 19, a function component couldn't receive `ref`; you had to wrap it in `forwardRef`, which also destroyed generics and display names. In React 19 **`ref` is a regular prop for function components**:

```tsx
import type { ComponentProps } from 'react';

interface TextFieldProps extends ComponentProps<'input'> {   // includes ref?: Ref<HTMLInputElement>
  label: string;
}

export function TextField({ label, ref, ...inputProps }: TextFieldProps) {
  return (
    <label>
      {label}
      <input ref={ref} {...inputProps} />
    </label>
  );
}

// Parent
const nameRef = useRef<HTMLInputElement>(null);
<TextField label="Name" ref={nameRef} />;
```

Exposing a custom imperative handle instead of the DOM node:

```tsx
export interface VideoHandle {
  play(): void;
  pause(): void;
}

export function Video({ src, ref }: { src: string; ref?: React.Ref<VideoHandle> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => ({
    play: () => void videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
  }), []);
  return <video ref={videoRef} src={src} />;
}
```

`forwardRef` still works in React 19 but is expected to be deprecated; the React team provides a codemod. Class components are unchanged (`ref` still refers to the instance and isn't passed as a prop).

## `useReducer` with discriminated-union actions

Model actions as a discriminated union and the reducer becomes fully checked: each `case` narrows `action`, and an exhaustiveness check catches a forgotten action type at compile time.

```ts run
type Todo = { id: number; text: string; done: boolean };
type State = { todos: Todo[]; filter: 'all' | 'open' | 'done' };

type Action =
  | { type: 'added'; text: string }
  | { type: 'toggled'; id: number }
  | { type: 'filterChanged'; filter: State['filter'] }
  | { type: 'cleared' };

function assertNever(value: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(value)}`);
}

let nextId = 1;
function todosReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'added':
      return { ...state, todos: [...state.todos, { id: nextId++, text: action.text, done: false }] };
    case 'toggled':
      return { ...state, todos: state.todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) };
    case 'filterChanged':
      return { ...state, filter: action.filter };
    case 'cleared':
      return { ...state, todos: state.todos.filter((t) => !t.done) };
    default:
      return assertNever(action); // add a new action type and this line stops compiling
  }
}

let state: State = { todos: [], filter: 'all' };
state = todosReducer(state, { type: 'added', text: 'Type the reducer' });
state = todosReducer(state, { type: 'added', text: 'Ship it' });
state = todosReducer(state, { type: 'toggled', id: 1 });
state = todosReducer(state, { type: 'cleared' });
console.log(state.todos);
```

In a component: `const [state, dispatch] = useReducer(todosReducer, initialState);` — **let inference do the work** from the annotated reducer. React 19's types changed `useReducer`'s generic parameters (`useReducer<S, A>` where `A` is now an argument tuple), so code that passed explicit generics like `useReducer<Reducer<State, Action>>` breaks; annotating the reducer works in every version.

## Context without the `| null` noise

The problem: `createContext` needs a default value, but for something like an auth session there is no sensible default. Options:

```tsx
// ❌ Lies: consumers outside the provider get {} and crash later, far from the cause
const AuthContext = createContext({} as AuthContextValue);
```

The idiomatic pattern is a `null` default plus a custom hook that **narrows** it and fails loudly:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface AuthContextValue {
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn: setUser, signOut: () => setUser(null) }),
    [user],
  );
  return <AuthContext value={value}>{children}</AuthContext>; // React 19: no .Provider needed
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx; // narrowed to AuthContextValue
}
```

Why it's the right answer: consumers get a non-nullable type, a missing provider is a clear error at the first render instead of `undefined is not a function` somewhere else, and the context object itself stays private to the module. (React 19 also lets you read context with `use(AuthContext)`, which — unlike `useContext` — may be called conditionally.)

## Generic components

Day 3 showed the idea; here are the details you'll be asked about. When a component's props relate to each other through a type — `items` and `renderItem`, `options` and `onChange` — make the **component** generic so TypeScript infers `T` at each call site:

```tsx
interface ListProps<T> {
  items: readonly T[];
  getKey: (item: T) => React.Key;
  renderItem: (item: T) => React.ReactNode;
}

export function List<T>({ items, getKey, renderItem }: ListProps<T>) {
  return <ul>{items.map((item) => <li key={getKey(item)}>{renderItem(item)}</li>)}</ul>;
}

<List items={users} getKey={(u) => u.id} renderItem={(u) => u.name} />; // T = User, inferred
<List<User> items={[]} getKey={(u) => u.id} renderItem={(u) => u.name} />; // explicit when inference can't
```

Syntax and design details:

- **Arrow functions in `.tsx`:** `const List = <T>(props: ListProps<T>) => …` doesn't parse — `<T>` looks like a JSX tag. Write `<T,>` or `<T extends unknown>`. Function declarations have no such problem.
- **Constraint vs accessor:** `<T extends { id: string }>` is simple but forces a shape on callers; a `getKey` accessor works for any `T`, including primitives. Libraries usually prefer accessors.
- **`NoInfer<T>`** (TS 5.4): stop a prop from *widening* the inferred type. In `{ options: readonly T[]; defaultValue: NoInfer<T> }`, `T` comes only from `options`, so `defaultValue="purple"` is an error instead of silently widening `T`.
- **`memo` and generics:** `memo(List)` returns a non-generic component. Work around with a cast: `export const MemoList = memo(List) as typeof List;`. (In React 19, `forwardRef` — the other generic-killer — is no longer needed.)

{{quiz:l2-generic-arrow}}

## Discriminated props: variants that can't be misused

When some props only make sense together, use a **union of prop shapes** with a discriminant:

```tsx
type NoticeProps =
  | { kind: 'info'; message: string }
  | { kind: 'confirm'; message: string; onConfirm: () => void; confirmLabel?: string }
  | { kind: 'link'; message: string; href: string };

export function Notice(props: NoticeProps) {
  switch (props.kind) {
    case 'info':
      return <p role="status">{props.message}</p>;
    case 'confirm':
      return (
        <div role="alertdialog">
          {props.message}
          <button onClick={props.onConfirm}>{props.confirmLabel ?? 'OK'}</button>
        </div>
      );
    case 'link':
      return <a href={props.href}>{props.message}</a>;
  }
}

// <Notice kind="confirm" message="Delete?" />  ❌ Property 'onConfirm' is missing
// <Notice kind="info" message="Saved" href="/x" /> ❌ 'href' does not exist on the info variant
```

Gotchas:

- **Destructuring in the signature** (`function Notice({ kind, href })`) doesn't work — `href` doesn't exist on every member. Narrow `props` first, or destructure only the discriminant into a `const` — TypeScript (4.4+) still narrows `props` through it: `const { kind } = props; if (kind === 'link') props.href`.
- **Mutually exclusive props** without a discriminant: `{ value: string; defaultValue?: never } | { defaultValue: string; value?: never }` — the `?: never` makes passing both an error.
- **Wrapping a union-props component:** `Omit<NoticeProps, 'message'>` collapses the union (lesson 1). Use a distributive omit.

## The polymorphic `as` prop (brief)

A polymorphic component renders as whatever element the caller chooses while keeping that element's props typed:

```tsx
import type { ComponentPropsWithoutRef, ElementType } from 'react';

type PolymorphicProps<E extends ElementType, P = object> = P & { as?: E } & Omit<ComponentPropsWithoutRef<E>, keyof P | 'as'>;

export function Text<E extends ElementType = 'span'>({ as, size = 'md', ...rest }: PolymorphicProps<E, { size?: 'sm' | 'md' | 'lg' }>) {
  const Component: ElementType = as ?? 'span';
  return <Component data-size={size} {...rest} />;
}

<Text as="label" htmlFor="email" size="sm">Email</Text>; // ✅ htmlFor is valid on label
<Text as="a" href="/docs">Docs</Text>;                    // ✅
// <Text href="/docs">Docs</Text>                          ❌ href isn't a span prop
```

Trade-offs to mention: the types are hard to read and slow to check at scale, error messages get cryptic, and adding `ref` support makes them worse. Many design systems now prefer **`asChild`** (Radix's Slot pattern: `<Button asChild><a href="/x">…</a></Button>` merges props onto the child) or simply separate components (`Button` and `ButtonLink`).

## Typing custom hooks

```tsx
export function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle] as const; // readonly [boolean, () => void]
}
```

As you saw on Day 3, without `as const` the return type is `(boolean | (() => void))[]` — every element is the union, and `const [on, toggle] = useToggle()` gives you useless types. Rules of thumb:

- Return a **tuple** (`as const`) for 2 values the caller will rename (like `useState`); return an **object** for 3+ values or when names matter.
- Annotate the return type of exported hooks — it documents the contract and stops implementation details leaking.
- Make hooks generic when the caller's data flows through: `useLocalStorage<T>(key, initial: T)`, `useDebouncedValue<T>(value: T, ms)`.
- Be suspicious of `useFetch<T>(url): T` — a type parameter that appears **only in the return type** is an unchecked cast in disguise. Lesson 3 shows the fix.

## Interview cheat sheet

| Question | Answer |
|---|---|
| Type for `children`? | `React.ReactNode` |
| Accept all `<button>` props? | `extends ComponentPropsWithoutRef<'button'>` (or `ComponentProps` if you want `ref` too) |
| Input change handler? | `(e: React.ChangeEvent<HTMLInputElement>) => void` |
| DOM ref? | `useRef<HTMLInputElement>(null)` → `RefObject<HTMLInputElement \| null>` |
| Forward a ref in React 19? | Just accept `ref` as a prop |
| Context with no sensible default? | `createContext<T \| null>(null)` + hook that throws |
| Reducer actions? | Discriminated union + exhaustive `never` check |
| Generic arrow component in TSX? | `<T,>(props: Props<T>) => …` |
| Props valid only together? | Discriminated union of prop shapes |
| Hook returning a pair? | `return [a, b] as const` |

## Key takeaways

- Type props with an interface/type, defaults in destructuring; `React.FC` is optional and unnecessary.
- `ReactNode` for `children` and slots; `ReactElement` only when you need an element object; `JSX.Element` lives under `React.JSX` in React 19.
- Derive native props with `ComponentPropsWithoutRef<'x'>` / `ComponentProps<'x'>`; `Omit` conflicting ones.
- React 19: `ref` is a regular prop, `useRef` needs an argument, `RefObject.current` is mutable, ref callbacks can return cleanups.
- Discriminated unions power reducers (exhaustive `never` checks) and variant props.
- Context: `null` default + throwing hook gives consumers a non-nullable type.
- Generic components (`function List<T>` / `<T,>`) let TypeScript connect `items`, `renderItem` and callbacks.
