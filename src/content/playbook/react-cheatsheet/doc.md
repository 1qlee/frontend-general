> [!NOTE]
> Current as of **React 19** (19.2 additions are flagged). "Render" in React means *calling your component*, not painting pixels. Keep that distinction sharp: it's the root of most React interview questions.

## Render and commit

| Phase | What happens | Rules |
|---|---|---|
| 1. **Trigger** | Initial `root.render()`, or a state update (`setState`, `dispatch`, context or external-store change) | Updates are queued and batched |
| 2. **Render** | React calls your components, builds the new element tree and diffs it against the previous one (reconciliation) | Must be **pure**: no side effects; may run more than once, be paused or thrown away (concurrent rendering, StrictMode) |
| 3. **Commit** | React applies the minimal DOM changes, attaches refs, runs layout effects (`useLayoutEffect`) | Synchronous; layout effects block paint |
| 4. **Paint** | The browser paints | Not React's job |
| 5. **Passive effects** | `useEffect` setups run | Usually after paint |

> [!INTERVIEW] Say it like this
> "A state update triggers a render, which means React calls the component again to compute a new tree. React diffs it against the previous tree and commits only the differences to the DOM. Then the browser paints, and after that React runs effects. Rendering must be pure; side effects belong in event handlers or effects."

## What triggers a render

| Event | Re-renders? | Notes |
|---|---|---|
| `setState` with a new value (`!Object.is(old, new)`) | **Yes**: that component and, by default, all its descendants | Children re-render even if their props didn't change, unless memoised |
| `setState` with the same value | No (bails out) | React may still call the component once before bailing out |
| Parent re-renders | **Yes** | Unless the child is wrapped in `memo` and every prop is `Object.is`-equal |
| Context value changes | **Yes**, every consumer | `memo` does not block context updates |
| External store snapshot changes (`useSyncExternalStore`) | Yes | How Redux, Zustand etc. subscribe |
| `key` changes | **Remount**: state is destroyed and recreated | Use deliberately to reset state |
| `ref.current = x` | No | Refs are mutable boxes outside the render cycle |
| Mutating state then `setState(sameObject)` | No | Same reference, so the update bails out |

Props never change "on their own": a component gets new props only because its parent rendered.

## Keys

- Keys give list items an **identity** among siblings. React matches old and new children by `key` and element type.
- Same key and type → state is **preserved**. Different type at the same position → the subtree **remounts**.
- **Index keys** are fine for static lists that never reorder, insert or filter. Otherwise state (input text, focus, animations) stays attached to the *position* and appears to jump to the wrong item.
- Keys must be stable and unique among siblings. `key={Math.random()}` remounts every render.
- Change a key on purpose to reset a component: `<ProfileForm key={userId} />`.

## State as a snapshot, and batching

- State is a **snapshot** per render: the handler sees the value from the render it was created in. `setX` schedules a re-render; it doesn't change `x` in the running code.
- **Automatic batching** (React 18+): all updates in the same tick (event handlers, timeouts, promises) produce **one** render.
- Use an **updater function** when the next state depends on the previous one: `setCount((c) => c + 1)`.
- React compares with `Object.is`, so always create new objects and arrays (`{ ...obj }`, `[...arr]`).
- `flushSync` forces a synchronous update (rare: e.g. scroll to a just-added item).

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setCount(count + 1);     // count is 0 in this render: queues "replace with 1"
    setCount(count + 1);     // still 0: queues "replace with 1" again
    setCount((c) => c + 1);  // updater runs on the queued value: 1 → 2
    console.log(count);      // 0: the snapshot never changes inside this handler
  }
  return <button onClick={handleClick}>{count}</button>; // shows 2 after one click
}
```

```ts run
// A tiny model of how React processes a component's queued updates on the next render.
type Update<S> = S | ((prev: S) => S);

function processQueue<S>(base: S, queue: Update<S>[]): S {
  return queue.reduce<S>((state, update) => (typeof update === 'function' ? (update as (prev: S) => S)(state) : update), base);
}

const count: number = 0; // the snapshot the click handler closed over
console.log('3× setCount(count + 1):', processQueue(count, [count + 1, count + 1, count + 1]));
console.log('3× setCount(c => c + 1):', processQueue(count, [(c: number) => c + 1, (c: number) => c + 1, (c: number) => c + 1]));
console.log('setCount(count + 5) then updater:', processQueue(count, [count + 5, (c: number) => c + 1]));

// Why mutating state doesn't re-render: React bails out when Object.is(old, next) is true
const items = [1, 2];
const mutated = items;
mutated.push(3);
console.log('mutated is same ref:', Object.is(items, mutated), '| copy is new ref:', Object.is(items, [...items]));
```

## Effects: lifecycle and cleanup order

| Moment | What runs, in order |
|---|---|
| **Mount** | render → commit DOM → layout effect setups → paint → effect setups |
| **Update, deps changed** | render → commit → layout cleanups (old values) → layout setups → paint → effect cleanups (**old** values) → effect setups (new values) |
| **Update, deps unchanged** | The effect is skipped |
| **Unmount** | Layout cleanups and effect cleanups (with the last values) |
| **StrictMode, development only** | Extra setup → cleanup → setup cycle on mount to expose missing cleanups |

- **Deps** are compared with `Object.is`. `[]` runs after mount only (twice in dev StrictMode); no array runs after every render.
- **Child effects run before parent effects** (children commit first).
- Include **every reactive value** the effect reads (props, state, values computed during render). Functions and objects created during render are new every time: move them inside the effect or memoise them.
- `useLayoutEffect` is for measuring or mutating the DOM before paint (tooltip positioning). It blocks paint, so use it sparingly.

**Effects are for synchronising with external systems**: subscriptions, timers, network, imperative DOM APIs, non-React widgets. They are *not* for deriving data, handling user events, or resetting state on prop change.

```tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${userId}`, { signal: controller.signal })
    .then((r) => r.json() as Promise<User>)
    .then(setUser)
    .catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e : new Error(String(e)));
    });
  return () => controller.abort(); // runs before the next setup (userId changed) and on unmount
}, [userId]);
```

## Rules of hooks

1. Call hooks **only at the top level**: not inside conditions, loops, nested functions, or after an early `return`.
2. Call hooks **only from function components or custom hooks** (`useSomething`).

**Why:** React stores hook state in a list per component and matches it **by call order**. Change the order and state goes to the wrong hook. The exception is `use`, which may be called conditionally and in loops (but not inside `try/catch`). Custom hooks share **logic**, not state: each call gets its own state.

## memo, useMemo, useCallback: when to use them

| Tool | What it does | Use when | Skip when |
|---|---|---|---|
| `memo(Component)` | Skips re-rendering if all props are `Object.is`-equal | A component re-renders often with the same props and is expensive (list rows, charts) | Props change every time anyway, or the component is cheap |
| `useMemo(fn, deps)` | Caches a computed value | The computation is measurably expensive, **or** you need a stable object/array identity for a `memo` child or an effect dependency | Cheap calculations (most of them) |
| `useCallback(fn, deps)` | Caches a function identity | Passing a callback to a `memo` child, or it's an effect/hook dependency | The child isn't memoised: then it does nothing useful |

**Try these first:** move state down (closer to where it's used), pass expensive subtrees as `children` (lifting content up), split components. **React Compiler** (an opt-in build plugin, stable 1.0 in 2025) memoises automatically; with it enabled, most manual `memo`/`useMemo`/`useCallback` becomes unnecessary.

> [!INTERVIEW] Say it like this
> "Memoisation trades memory and comparison work for skipped renders, so I use it where profiling shows a problem: typically `memo` on an expensive child plus `useCallback`/`useMemo` to keep its props stable. Before that, I'd restructure: move state down or pass children through. With React Compiler, much of this happens automatically."

## React 19 APIs

| API | What it does | Shape |
|---|---|---|
| **Actions** | Async functions run in a transition; React tracks pending state, errors and optimistic updates. `<form action={fn}>` calls `fn(formData)` and resets uncontrolled fields on success | `startTransition(async () => {…})`, `<form action={fn}>` |
| **`useActionState`** | State that updates from the result of an action; replaces the canary-era `useFormState` | `const [state, formAction, isPending] = useActionState(action, initialState)`; `action(prevState, payload)` |
| **`useOptimistic`** | Shows an optimistic value while an action is pending; reverts to the real state when it finishes | `const [optimistic, setOptimistic] = useOptimistic(state, reducer?)` |
| **`useFormStatus`** (`react-dom`) | Status of the **parent** `<form>`: `{ pending, data, method, action }` | Must be called in a component rendered *inside* the form |
| **`use(resource)`** | Reads a promise (suspends until it resolves; rejections go to the error boundary) or a context | May be called conditionally; don't create the promise during render: pass in a cached one |
| **`ref` as a prop** | Function components receive `ref` like any other prop; `forwardRef` is no longer needed | `function Input({ ref, ...props }: ComponentProps<'input'>)` |
| **Ref cleanup** | Ref callbacks may return a cleanup function | `ref={(node) => { …; return () => {…}; }}` |
| **`<Context>` as provider** | `<ThemeContext value="dark">` instead of `<ThemeContext.Provider>` | |
| **Document metadata** | `<title>`, `<meta>`, `<link>` rendered anywhere are hoisted into `<head>` | |
| **Resource APIs** | `preload`, `preinit`, `preconnect`, `prefetchDNS` from `react-dom`; stylesheets with `precedence` | |
| **Server Components & Server Functions** | Stable in React 19; used through a framework (e.g. Next.js App Router) | `'use client'` / `'use server'` directives |
| **`<Activity>`** (19.2) | Hide part of the UI while preserving its state; effects unmount while hidden | `<Activity mode="hidden">` |
| **`useEffectEvent`** (19.2) | Read the latest props/state inside an effect without making them dependencies | Fixes "stale closure vs. re-subscribing" |

```tsx
async function saveName(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Name is required' };
  await api.updateName(name);
  return {};
}

function SubmitButton() {
  const { pending } = useFormStatus(); // reads the nearest parent <form>
  return <button disabled={pending}>{pending ? 'Saving…' : 'Save'}</button>;
}

function NameForm() {
  const [state, formAction] = useActionState(saveName, {});
  return (
    <form action={formAction}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" aria-invalid={!!state.error} aria-describedby={state.error ? 'name-error' : undefined} />
      <SubmitButton />
      {state.error && <p id="name-error" role="alert">{state.error}</p>}
    </form>
  );
}
```

## Suspense and transitions

- **`<Suspense fallback={…}>`** shows the fallback while something inside **suspends**: `lazy()` components, `use(promise)`, or Suspense-enabled data libraries and frameworks. Data fetched in a `useEffect` does **not** suspend.
- **Nested boundaries** reveal the page progressively; place them where a loading state makes visual sense.
- **Transitions** (`startTransition`, `useTransition`) mark updates as **non-urgent**: they can be interrupted by typing or clicks, and if they suspend, React keeps showing the current UI instead of flipping back to a fallback. `isPending` gives inline feedback.
- **`useDeferredValue(value)`** renders first with the old value, then re-renders with the new one in the background: ideal for "type to filter a heavy list". Keep the input's own state urgent.
- **Error boundaries** catch errors thrown during rendering (including from `use` and, in React 19, errors thrown inside transitions). They're still class components (`getDerivedStateFromError`), or the `react-error-boundary` package. They don't catch errors in event handlers or arbitrary async code.

## RSC vs SSR vs CSR

| | CSR | SSR | React Server Components |
|---|---|---|---|
| Where components run | Browser | Server for the first HTML, then the **same** components hydrate in the browser | Server Components run only on the server; Client Components (`'use client'`) are SSR'd *and* hydrated |
| JS shipped | All component code | All component code (needed to hydrate) | Only Client Components' code |
| Data fetching | After load (effects, query libraries) | Per request on the server (framework loaders) | `await` directly inside async Server Components |
| Interactivity | Immediately after JS loads | After hydration | Only in Client Components (no state, effects or handlers in Server Components) |
| Output | DOM | HTML (string or stream) | RSC payload (a serialised tree), usually also rendered to HTML |
| Classic gotcha | Blank page until JS runs; SEO | Hydration mismatches (`Date.now()`, `Math.random()`, `window` in render) | Props crossing to Client Components must be serialisable; no passing plain functions |

> [!MISTAKE]
> "`'use server'` marks a Server Component." It doesn't. Components in an RSC app are server components by default; `'use client'` marks the boundary where client code starts; `'use server'` marks **Server Functions** that the client can call (e.g. form actions).

## Common bugs and fixes

| Bug | Symptom | Fix |
|---|---|---|
| **Stale closure** | Interval or handler reads an old value | Updater function, correct deps, a ref, or `useEffectEvent` (19.2) |
| **Missing deps** | Effect doesn't re-run when a prop changes | Include every reactive value; trust the `exhaustive-deps` lint rule |
| **Unstable deps** | Effect runs every render; infinite loop if it sets state | Move objects/functions inside the effect, memoise them, or depend on primitives |
| **Index keys** on a dynamic list | Text or focus stays on the wrong row after delete/reorder | Stable ids from the data |
| **Derived state** in `useState` + an effect to sync it | Extra render, values out of sync | Compute during render (`useMemo` if expensive) |
| **Resetting state on prop change** in an effect | Flash of stale UI | `key={id}` on the component |
| **Effect chains** | Effect sets state → another effect → … | Compute in render or do the work in the event handler |
| **Fetch race** | An old response overwrites a newer one | `AbortController` or an `ignore` flag in cleanup; or a data library |
| **Mutating state** | UI doesn't update | Create new objects and arrays |
| **Component defined inside a component** | Child remounts each render, loses state and focus | Define components at module level |
| **Conditional hook** | "Rendered more hooks than during the previous render" | Hooks at the top level; branch inside them |
| **New context value every render** | All consumers re-render | `useMemo` the value, or split contexts |
| **Hydration mismatch** | Warning, flicker, broken event handlers | Browser-only values in an effect, or `useSyncExternalStore` with `getServerSnapshot` |
| **`{count && <Badge />}`** | Renders a literal `0` | `{count > 0 && <Badge />}` |

## Typing patterns

```tsx
import { createContext, useCallback, useContext, useRef, useState, type ComponentProps, type ReactNode } from 'react';

// Props: extend native element props, children as ReactNode
interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
}
function Button({ variant = 'primary', icon, children, ...rest }: ButtonProps) {
  return <button data-variant={variant} {...rest}>{icon}{children}</button>;
}

// React 19: ref is a regular prop (no forwardRef)
function TextInput({ label, ref, ...rest }: { label: string } & ComponentProps<'input'>) {
  return <label>{label} <input ref={ref} {...rest} /></label>;
}

// Discriminated-union props: make invalid combinations unrepresentable
type AlertProps =
  | { dismissible: true; onDismiss: () => void }
  | { dismissible?: false; onDismiss?: never };

// Events
const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);
const onSubmit = (e: React.FormEvent<HTMLFormElement>) => e.preventDefault();
const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => { if (e.key === 'Escape') close(); };

// State and refs
const [user, setUser] = useState<User | null>(null);
const inputRef = useRef<HTMLInputElement>(null);          // RefObject<HTMLInputElement | null>
const timerRef = useRef<number | undefined>(undefined);   // React 19 types require an initial value

// Custom hook returning a tuple: `as const` keeps the positions typed
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle] as const; // readonly [boolean, () => void]
}

// Context with a null default and a guard hook
interface AuthValue { user: User | null; signOut: () => void }
const AuthContext = createContext<AuthValue | null>(null);
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Reducer with a discriminated-union action
type Action = { type: 'add'; text: string } | { type: 'toggle'; id: string } | { type: 'clear' };
```

- **`React.FC`** is fine since React 18 (it no longer adds implicit `children`); many teams prefer plain functions with typed props.
- **Generic components** work as plain functions (`function List<T>(props: ListProps<T>)`); for arrow functions in `.tsx`, write `<T,>`.
- Components may return any `ReactNode` (strings, `null`, arrays) with current TypeScript and React types.

## Key takeaways

- Render = calling components (pure); commit = applying DOM changes; effects run after paint.
- Renders come from state updates, parent renders, context changes and store changes; a `key` change remounts.
- State is a per-render snapshot; updates are batched; use updater functions and new objects.
- Effects synchronise with external systems; cleanup runs with old values before the next setup.
- Memoise where profiling shows a need, or let React Compiler do it.
- React 19: Actions, `useActionState`, `useOptimistic`, `useFormStatus`, `use`, `ref` as a prop; 19.2 adds `<Activity>` and `useEffectEvent`.
- SSR is about HTML on first load; RSC is about which components run where, and how much JS ships.
