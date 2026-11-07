## Why interviewers ask about hooks internals

"Why can't I call a hook inside an `if`?" is a filter question. A weak answer recites the rule ("the linter complains"). A strong answer explains the **mechanism** — React identifies hooks by *call order* — and then uses that one idea to answer the follow-ups: why custom hooks don't share state, why `dispatch` is stable, why `useSyncExternalStore` exists, why an inline callback makes your `useFetch` loop forever.

Senior interviews then move from *using* hooks to *designing* them: "Write a `useFetch`. What does it return? What happens if I pass an inline function?" This lesson gives you the mechanism first, then the hooks Day 5 didn't cover, then a checklist for designing your own. (`useState`, `useEffect` and keys were Day 5; `useMemo`/`useCallback` performance, React 19's Actions hooks and the React Compiler are Day 7.)

## The mental model: a list of hook cells per component

React keeps each component instance's data on its **fiber** — the internal node that represents that instance in the tree. For a function component, the fiber holds an ordered list of **hook cells**: conceptually an array, in reality a linked list (`fiber.memoizedState → hook → hook.next → …`). Each cell holds one hook's data: a state value and its update queue, an effect and its deps, a ref object, a memoised value.

On every render React walks that list with a cursor:

1. **Mount** (first render): each hook call *appends* a new cell.
2. **Update** (re-render): each hook call *reads the next cell*. There are no names or keys — a hook's identity **is its position**.

Here is a toy runtime you can run. It isn't React's code, but the indexing idea is exactly right:

```ts run
// A toy "React": one component instance, an array of hook cells, a cursor.
const cells: unknown[] = [];
let cursor = 0;

function useState<T>(initial: T): [T, (value: T) => void] {
  const i = cursor++; // this call's identity = its position in the list
  if (cells.length <= i) cells[i] = initial; // mount: append a cell
  return [cells[i] as T, (value: T) => { cells[i] = value; }];
}

function render<P>(component: (props: P) => string, props: P) {
  cursor = 0; // every render walks the list from the start
  console.log(component(props));
}

function Profile({ showAge }: { showAge: boolean }) {
  const [name] = useState('Ada');
  let age: unknown = '(hidden)';
  if (showAge) {
    [age] = useState(36); // ❌ conditional hook
  }
  const [city] = useState('London');
  return `name=${name} age=${age} city=${city}`;
}

render(Profile, { showAge: true });  // cells: ['Ada', 36, 'London']
render(Profile, { showAge: false }); // city now reads cell #1 …
```

On the second render `city` reads the cell that belonged to `age`. Nothing crashes in the toy — it silently shows the wrong data. Real React is stricter: if the *number* of hooks changes it throws `Rendered more hooks than during the previous render` (or `Rendered fewer hooks than expected. This may be caused by an accidental early return statement`), and in development it warns `React has detected a change in the order of Hooks called by Profile` when the *kinds* of hooks at a position differ.

{{quiz:conditional-hook-order}}

## The Rules of Hooks — and why each exists

| Rule | Why |
|---|---|
| **Only call hooks at the top level** — not inside `if`, loops, nested functions, `try/catch/finally`, or **after an early `return`** | The call order must be identical on every render so each call finds its own cell. A loop with a constant length would technically work, but the rule (and the linter) can't prove the length never changes. |
| **Only call hooks from React function components or custom hooks** (functions named `useX`) | A hook needs a *currently rendering fiber* to attach its cell to. Called from an event handler, a class or a plain module function, there is none — React throws "Invalid hook call". The `use` prefix is how the linter knows which functions to check. |

The early-return version of the bug is the one people actually write:

```tsx
function UserCard({ user }: { user: User | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!user) return <SignInPrompt />;               // ❌ early return…
  const [draft, setDraft] = useState(user.bio);     // …before another hook
  // user: null → '42' means 1 hook last render, 2 now: "Rendered more hooks than during the previous render"
}
```

Fix it by moving every hook above the early return, or by splitting the component (`if (!user) return <SignInPrompt />; return <UserCardBody user={user} />;`) so the inner component always calls the same hooks.

> [!NOTE] The one exception: `use`
> React 19's `use(promise)` / `use(context)` **may** be called inside conditions and loops. It still has to be called while a component or hook is rendering, and not inside `try/catch`.

> [!INTERVIEW] Say it like this
> "React doesn't know hooks by name. It stores them in an ordered list on the component's fiber and matches each call to a cell by position. If a hook is called conditionally, every hook after it reads the wrong cell — so hooks must be called unconditionally at the top level, and only from components or custom hooks, where React knows which component is rendering. The ESLint rules-of-hooks plugin enforces it statically, and the React Compiler assumes it."

### Consequence: custom hooks share *logic*, not *state*

A custom hook is just a function that calls hooks, so its cells are appended to the *calling component's* list. Two components calling `useCounter()` get two independent counters; the same component calling it twice gets two as well. To share state you still have to lift it up, put it in context, or keep it in an external store (below).

> [!MISTAKE]
> "Custom hooks are a way to share state between components." They share **stateful logic**. Each call site gets its own cells.

## `useReducer`: when, and how to write the reducer

```ts
const [state, dispatch] = useReducer(reducer, initialArg, init?);
```

`useState` is actually implemented as `useReducer` with a built-in reducer (`(state, action) => typeof action === 'function' ? action(state) : action`). So the question is never "which is more powerful" — it is "where should the update logic live?"

| Prefer `useReducer` when… | Prefer `useState` when… |
|---|---|
| Several values change **together** (`status`, `data`, `error`) and must stay consistent | Values are independent |
| The next state depends on the previous one in non-trivial ways | Updates are simple sets or toggles |
| You want **named events** (`{ type: 'itemAdded' }`) that read like a log and can be tested without React | The component is small |
| You pass the updater deep: `dispatch` is **stable** for the component's lifetime, so it never breaks memoisation and pairs well with context | — |

### Reducers must be pure

A reducer computes the next state from `(state, action)` and nothing else:

- **No side effects** — no fetching, logging, timers, `Math.random()` or `Date.now()`. Put those in the event handler (or an effect) and pass the results in the action.
- **No mutation** — return a new object. Returning the *same reference* tells React "nothing changed" (an `Object.is` check) and it bails out of re-rendering children.
- In development, **StrictMode calls your reducer twice** to surface impurity. A reducer that pushes into an array will push twice.

> [!MISTAKE]
> `state.items.push(item); return state;` — the reference didn't change, so React bails out and the UI doesn't update (and you've mutated the snapshot previous renders closed over).

### Modelling a state machine with a discriminated union

The most interview-worthy use of a reducer is making **impossible states unrepresentable** and **illegal transitions no-ops**:

```ts run
type State =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; results: string[] }
  | { status: 'error'; query: string; message: string };

type Action =
  | { type: 'search'; query: string }
  | { type: 'resolved'; results: string[] }
  | { type: 'rejected'; message: string }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'search':
      return { status: 'loading', query: action.query };
    case 'resolved':
      // Only valid while loading: a late response after "reset" is ignored.
      return state.status === 'loading'
        ? { status: 'success', query: state.query, results: action.results }
        : state; // same reference → React bails out
    case 'rejected':
      return state.status === 'loading' ? { status: 'error', query: state.query, message: action.message } : state;
    case 'reset':
      return { status: 'idle' };
    default: {
      const unreachable: never = action; // compile error if an action type is unhandled
      return unreachable;
    }
  }
}

const actions: Action[] = [
  { type: 'search', query: 'react' },
  { type: 'reset' },
  { type: 'resolved', results: ['stale!'] }, // illegal now → ignored
  { type: 'search', query: 'hooks' },
  { type: 'resolved', results: ['useReducer', 'useRef'] },
];
let state: State = { status: 'idle' };
for (const action of actions) {
  const next = reducer(state, action);
  console.log(action.type.padEnd(8), next === state ? '(unchanged)' : '→ ' + JSON.stringify(next));
  state = next;
}
```

Compare with four booleans (`isLoading`, `isError`, `hasData`, `isIdle`): sixteen combinations, most of them nonsense. The union has exactly four, TypeScript forces you to check `status` before touching `results`, and the `never` default catches an unhandled action at compile time (Day 3/4 techniques).

**Lazy initialisation:** `useReducer(reducer, userId, createInitialState)` calls `createInitialState(userId)` once, on mount — the same idea as `useState(() => expensive())`. Passing `createInitialState(userId)` directly would run it on every render and throw the result away.

## `useRef` vs `useState`

Both persist across renders. The difference is what happens when they change:

| | `useState` | `useRef` |
|---|---|---|
| Changing it re-renders | Yes | **No** |
| Value during render | A snapshot for this render | Whatever was last written — avoid reading/writing it during render |
| Update timing | Queued; visible on the next render | Immediate (plain mutation of `.current`) |
| Use for | Anything that affects the output | DOM nodes, timer/interval ids, AbortControllers, previous values, "latest callback" refs, lazily created instances |

The rule of thumb: **if it is rendered, it's state; if it's only used by handlers and effects, it can be a ref.** Don't read or write `ref.current` during render (except the lazy-init idiom `if (ref.current === null) ref.current = new Thing()`): rendering must be pure, and with concurrent rendering a render can run more than once or be thrown away.

React 19 / `@types/react` 19 details worth knowing:

- `useRef` **requires an argument**; `useRef<HTMLInputElement>(null)` returns `RefObject<HTMLInputElement | null>`, and `.current` is always mutable (`MutableRefObject` is deprecated).
- **`ref` is a regular prop** on function components — `forwardRef` is no longer needed (and is slated for deprecation).
- **Ref callbacks can return a cleanup function**, called when the element is detached.

### The "latest ref" pattern

A ref lets a long-lived subscription call the *newest* callback without re-subscribing:

```tsx
function useInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef(callback);
  useLayoutEffect(() => {
    savedCallback.current = callback; // after every commit, never during render
  });

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]); // re-subscribes only when the delay changes
}
```

React 19.2 added **`useEffectEvent`** for exactly this: `const onTick = useEffectEvent(callback)` gives a function that always sees the latest props/state and is deliberately left out of effect dependencies. You'll use the latest-ref pattern in two of today's exercises.

## `useId`

`useId()` returns a unique string that is **stable for the component instance and identical on the server and the client**. Its job is linking elements for accessibility:

```tsx
function EmailField({ hint }: { hint: string }) {
  const id = useId(); // one call per component, then derive suffixes
  return (
    <>
      <label htmlFor={`${id}-input`}>Email</label>
      <input id={`${id}-input`} type="email" aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`}>{hint}</p>
    </>
  );
}
```

- Why not `Math.random()` or a module counter? The server and client would generate different values → **hydration mismatch**. `useId` derives the id from the component's position in the tree, so both sides agree.
- **Not for list keys** — keys must come from your data.
- **Don't parse it or use it in CSS selectors** — the format is an implementation detail and has changed between React versions.

## `useLayoutEffect` vs `useEffect`

```
render (call components) → commit (mutate the DOM) → useLayoutEffect → browser paints → useEffect
```

- **`useEffect`** is the default: subscriptions, data fetching, logging, syncing with non-visual systems. It usually runs **after the browser paints**, so it never blocks the frame. (If the update came from a discrete interaction like a click, React may flush it before paint — don't rely on either timing for correctness.)
- **`useLayoutEffect`** runs **synchronously after the DOM is updated, before the browser paints**. State updates scheduled inside it are processed synchronously too, so the user never sees the intermediate frame. Use it when you must **measure layout and immediately re-render**: positioning a tooltip, measuring text to truncate, restoring scroll position. The cost: it blocks paint, so heavy work there causes jank.

```tsx
function Tooltip({ anchor, text }: { anchor: DOMRect; text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    // Measure before paint; the re-render with the real height also happens before paint.
    setHeight(ref.current?.getBoundingClientRect().height ?? 0);
  }, [text]);

  const fitsAbove = anchor.top - height > 0;
  const top = fitsAbove ? anchor.top - height : anchor.bottom;
  return <div ref={ref} role="tooltip" style={{ position: 'fixed', top, left: anchor.left }}>{text}</div>;
}
```

With `useEffect`, the tooltip would paint once in the wrong place and then jump — a visible flicker.

- **SSR:** neither kind of effect runs on the server. Older React versions warned about `useLayoutEffect` during server rendering; React 19 removed that warning, but the server HTML still shows the pre-measurement state.
- **`useInsertionEffect`** runs before layout effects and exists for CSS-in-JS libraries to inject `<style>` tags. App code almost never needs it.

{{quiz:layout-effect-choice}}

## `useImperativeHandle`

Exposes a small, deliberate **imperative API** through a ref instead of the raw DOM node — typically `focus()`, `scrollToItem(i)`, `play()`/`pause()`:

```tsx
import { useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react';

export interface SearchInputHandle {
  focus(): void;
  clear(): void;
}

type SearchInputProps = ComponentPropsWithoutRef<'input'> & { ref?: Ref<SearchInputHandle> };

export function SearchInput({ ref, ...inputProps }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => {
      if (inputRef.current) inputRef.current.value = '';
    },
  }), []);
  return <input ref={inputRef} type="search" {...inputProps} />;
}

// Parent: const search = useRef<SearchInputHandle>(null); … search.current?.focus();
```

In React 19, `ref` arrives as a normal prop (before 19 you wrapped the component in `forwardRef`). Use it sparingly: anything you can express as a prop should be a prop (`isOpen`, not `open()`). It's for things that are inherently imperative — focus, scroll, media playback, measuring — and it hides internals so callers can't poke at your DOM.

## `useSyncExternalStore`

```ts
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

The official way to read from a store **React doesn't own**: browser APIs (`navigator.onLine`, `matchMedia`, `localStorage` via the `storage` event, `history`) and state libraries (Redux and Zustand use it internally).

- `subscribe(onStoreChange)` registers a listener and returns an unsubscribe function. Keep it **stable** (module level or `useCallback`), or React will unsubscribe and resubscribe on every render.
- `getSnapshot()` returns the current value and **must return the same value (`Object.is`) while the store hasn't changed**. Returning a fresh object every call makes React think the store always changed → re-render loop (React errors: *"The result of getSnapshot should be cached to avoid an infinite loop"*).
- `getServerSnapshot()` is used during SSR and hydration. Omit it and server rendering throws.

The contract is easy to see without React:

```ts run
type Listener = () => void;

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getSnapshot: () => state, // same reference until it changes
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); }; // unsubscribe
    },
    setState(update: (prev: T) => T) {
      const next = update(state);
      if (Object.is(next, state)) return; // nothing changed → nobody is notified
      state = next; // replace, never mutate: old snapshots stay valid
      listeners.forEach((listener) => listener());
    },
  };
}

const cart = createStore({ items: [] as string[] });
const unsubscribe = cart.subscribe(() => console.log('notified →', cart.getSnapshot().items));
console.log('snapshot is stable:', cart.getSnapshot() === cart.getSnapshot());
cart.setState((s) => ({ items: [...s.items, 'book'] }));
cart.setState((s) => s); // same reference: no notification
unsubscribe();
cart.setState((s) => ({ items: [...s.items, 'pen'] })); // nobody listening
console.log('final:', cart.getSnapshot().items);
```

And in React:

```tsx
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
```

### Why not `useState` + `useEffect`?

1. **Tearing.** With concurrent rendering (transitions, Suspense — Day 7), React can pause a render half-way and yield to the browser. If a *mutable* external store changes during that pause, components rendered before the change show the old value and components rendered after show the new one — the same commit displays two "truths". That inconsistency is called **tearing**. `useSyncExternalStore` checks the snapshot again before committing and, if it changed, re-renders synchronously so everyone agrees.
2. **Missed updates and boilerplate.** An effect subscribes *after* paint, so a change between render and subscription is lost unless you re-read on subscribe; you also duplicate the value into React state.

Selectors work too — `useSyncExternalStore(store.subscribe, () => selectCount(store.getSnapshot()))` — as long as the selector returns a primitive or a cached value. Returning `{ ...slice }` loops for the same reason as above; libraries use `useSyncExternalStoreWithSelector` to memoise. You'll build a selector store on Day 7.

{{quiz:get-snapshot-cached}}

> [!INTERVIEW] Say it like this
> "useSyncExternalStore is how you read from a store React doesn't own. You give it a stable subscribe function and a getSnapshot that returns an immutable, cached value. It exists mainly because of concurrent rendering: if a mutable store changes while React is in the middle of an interruptible render, different components could show different values — tearing. useSyncExternalStore detects that and forces a consistent synchronous re-render. Redux and Zustand use it under the hood."

## Designing custom hooks

A checklist you can say out loud while writing one:

1. **Name it `useSomething`.** It tells the linter to check the body and the call sites, and tells readers "this may hold state and effects". Don't prefix a plain function with `use`.
2. **Extract for a reason:** reusable stateful logic, or to *name* what an effect does (`useOnlineStatus`, `useDebouncedValue`) so the component reads declaratively.
3. **Compose.** Hooks call hooks: `useSearch` = `useDebouncedValue` + `useAsync`.
4. **Pick the return shape deliberately:**
   - a **tuple** when there are two values callers will rename — mirrors `useState`: `const [isOpen, toggle] = useToggle()`;
   - an **object** for three or more values, optional extras or an API likely to grow: `const { data, error, refetch } = useQuery(…)` — order-independent and extensible;
   - a **discriminated union** for async status, so TypeScript forces callers to check `status` before reading `data`.
5. **Return stable functions.** Callers will put them in dependency arrays and pass them to memoised children. `dispatch` and `setState` are stable for free; for your own functions use `useCallback` or the latest-ref pattern.
6. **Accept an options object** once you have more than two parameters: `useFetch(url, { enabled, onSuccess })`. But an inline object or callback is a **new identity every render** — never put it straight into effect deps. Depend on primitives, and read callbacks through a latest ref (or `useEffectEvent`).
7. **Clean up everything you start** (listeners, timers, requests) and **handle races** (ignore stale responses) — Day 5's search exercise and today's `useAsync`.

The inline-callback trap, in its most common form:

```tsx
// ❌ Reconnects on EVERY render: `onMessage` is a new function each time the parent renders.
function useChatSocket(url: string, onMessage: (msg: ChatMessage) => void) {
  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => onMessage(JSON.parse(e.data) as ChatMessage);
    return () => ws.close();
  }, [url, onMessage]);
}

// ✅ Connects when `url` changes; always calls the latest handler.
function useChatSocket(url: string, onMessage: (msg: ChatMessage) => void) {
  const onMessageRef = useRef(onMessage);
  useLayoutEffect(() => {
    onMessageRef.current = onMessage;
  });
  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onmessage = (e) => onMessageRef.current(JSON.parse(e.data) as ChatMessage);
    return () => ws.close();
  }, [url]);
}
```

Removing `onMessage` from the deps *without* the ref would compile and look fine — and silently call a stale handler that closes over old props. The ref (or `useEffectEvent`) is what makes omitting it correct.

## `useMemo` and `useCallback` — semantics only

- `useMemo(compute, deps)` caches the **result** of `compute` and recomputes when any dependency changes (each compared with `Object.is`).
- `useCallback(fn, deps)` caches the **function itself**; it is exactly `useMemo(() => fn, deps)`.
- They are a **performance hint, not a semantic guarantee** — React may discard the cache. Your code must be correct without them.
- Identity matters when a value is an **effect dependency**, a prop to a `memo` child, a **context value**, or returned from a custom hook.

When they actually pay off, `React.memo`, and how the React Compiler memoises automatically are Day 7.

## Key takeaways

- React identifies hooks by **call order** in a per-fiber list of cells → call them unconditionally, at the top level, from components or custom hooks. `use` is the only exception.
- Custom hooks share **logic**, not state; each call gets its own cells.
- `useReducer` for state that changes together, named transitions and a stable `dispatch`; reducers are **pure** and return a new object (or the same one to bail out). Discriminated unions make impossible states unrepresentable.
- Ref = mutable box that doesn't re-render; rendered data belongs in state. React 19: `ref` is a prop, `useRef` needs an argument.
- `useId` links accessibility attributes and is SSR-safe; not for keys.
- `useLayoutEffect` = measure and re-render **before paint**; `useEffect` for everything else.
- `useImperativeHandle` exposes a minimal imperative API; prefer props.
- `useSyncExternalStore` subscribes to external stores without **tearing**; snapshots must be cached, `subscribe` stable.
- Custom hook design: `use` prefix, tuple vs object vs union, stable returned functions, options objects, latest-ref for callbacks, cleanup and races.
