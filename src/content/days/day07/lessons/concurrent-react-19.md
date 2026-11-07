## Why interviewers ask about "modern React"

"What changed in React 18 and 19?" has become the standard filter between people who *use* React and people who *understand* it. The interviewer is listening for three things:

1. You know **concurrent rendering** is about *interruptible, prioritized rendering* — not threads, not "React runs in parallel".
2. You can pick between **`useTransition`**, **`useDeferredValue`**, **Suspense** and plain debouncing for a concrete problem, and explain the trade-off.
3. You know the **React 19 Actions** model (`useActionState`, `useOptimistic`, `useFormStatus`, `<form action>`) well enough to write a form without a pile of `isLoading`/`error` state — and you know its sharp edges.

Day 5 covered the render/commit phases and batching; Day 6 covered hooks, context and error boundaries. Today builds on both.

> [!NOTE] Versions
> Everything here is **React 19** (stable since December 2024; this course's runtime is 19.1). Concurrent features need a root created with `createRoot`/`hydrateRoot` (React 18+). APIs that arrived later in 19.x are flagged where they appear.

## Concurrent rendering: the mental model

Recall the two phases: **render** (call your components, build the new tree, diff it) and **commit** (apply the changes to the DOM, run layout effects, then effects).

Before React 18, every render was **synchronous and blocking**: once React started rendering an update, it ran to the end. A 200 ms render of a big list meant 200 ms during which the browser could not handle a keystroke.

**Concurrent rendering** means the render phase can be:

| Capability | What it means |
|---|---|
| **Interruptible** | React renders in small units of work and yields to the browser between them (roughly every 5 ms), so input and paint can happen mid-render. |
| **Prioritized** | Each update gets a priority ("lane"). A click or keystroke is urgent; a transition is not. Urgent work jumps ahead of non-urgent work. |
| **Abandonable** | If newer state makes an in-progress render obsolete, React throws the half-finished work away and starts over with the latest state. |
| **Prepared in the background** | React can render a new UI without showing it, and commit only when it is ready (e.g. while data for the next screen loads). |

The **commit phase stays synchronous and atomic**: the user never sees a half-rendered tree. That's why concurrency is safe — work-in-progress lives in memory until it is committed.

```ts run
// A toy model of concurrent rendering — NOT React's real code.
// A transition render is split into units of work; between units the scheduler
// checks for urgent input. Urgent updates commit immediately; the stale
// in-progress transition render is thrown away and restarted with fresh state.
const UNITS = 4; // units of work in one (slow) list render
const keystrokes = new Map([[3, 'e'], [6, 'a']]); // tick → key typed

let input = 'r';
let renderingFor: string | null = input;
let done = 0;

for (let tick = 1; renderingFor !== null; tick++) {
  const key = keystrokes.get(tick);
  if (key) {
    input += key;
    console.log(`tick ${tick}: URGENT  input shows "${input}" (committed now)`);
    if (done > 0) console.log(`         discard half-done render for "${renderingFor}" (${done}/${UNITS})`);
    renderingFor = input;
    done = 0;
    continue;
  }
  done++;
  console.log(`tick ${tick}: transition render for "${renderingFor}" ${done}/${UNITS}`);
  if (done === UNITS) {
    console.log(`         commit: list now filtered by "${renderingFor}"`);
    renderingFor = null;
  }
}
```

Three precise points interviewers like:

- **It's opt-in per update.** `createRoot` *enables* concurrent features, but a normal `setState` from a click is still rendered synchronously at high priority. Only updates you mark — `startTransition`, `useDeferredValue`, Suspense-driven re-renders — are rendered interruptibly.
- **It's single-threaded.** React doesn't run components in parallel; it *time-slices* on the main thread. A single component that takes 300 ms to render still blocks for 300 ms — concurrency can only yield *between* components.
- **It raises the bar on purity.** A render may run, be thrown away and run again. Components that mutate external variables, start fetches or subscribe during render will misbehave. StrictMode's double-render in development exists to surface exactly this. Reading a mutable external store during render can also **tear** (two components see different values in the same commit) — that's why `useSyncExternalStore` exists (Day 6, and today's exercise).

> [!INTERVIEW] Say it like this
> "Concurrent rendering means React's render phase is interruptible and prioritized. React splits rendering into units of work and yields to the browser, so urgent updates like typing can interrupt a non-urgent render — a transition — and the stale work is thrown away. Commits are still atomic, so users never see half-rendered UI. It's opt-in per update via transitions, deferred values and Suspense, it's still single-threaded, and it's why render functions must be pure."

> [!MISTAKE]
> "Concurrent mode makes React multi-threaded" or "React 18 made every render concurrent." Both wrong: it's time-slicing on the main thread, and only transition-priority work is interruptible.

## `useTransition` and `startTransition`

```tsx
const [isPending, startTransition] = useTransition();
```

`startTransition(fn)` calls `fn` **immediately and synchronously**; every state update scheduled inside it is marked as a **transition** — non-urgent and interruptible. `isPending` is `true` from the moment you start it until the transition's render commits.

```tsx
function SearchPage({ allRows }: { allRows: Row[] }) {
  const [query, setQuery] = useState('');          // urgent: the input itself
  const [filter, setFilter] = useState('');        // non-urgent: drives the slow list
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);                      // input updates immediately
    startTransition(() => setFilter(e.target.value)); // list catches up when it can
  }

  return (
    <>
      <input value={query} onChange={handleChange} aria-label="Search" />
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <SlowTable rows={allRows} filter={filter} />
      </div>
    </>
  );
}
```

Rules worth stating out loud:

- **Never put a controlled input's own value in a transition.** Input updates must be synchronous; split into urgent and non-urgent state (as above) or use `useDeferredValue`.
- **You need access to the setter.** If the value comes from props or a third-party hook, use `useDeferredValue` instead.
- **Transitions + Suspense:** if a transition causes already-visible content to suspend, React **keeps showing the old UI** (with `isPending`) instead of replacing it with a fallback. That's how "click a tab, old tab stays until the new one is ready" works.
- `startTransition` is also exported directly from `react` for code outside components (routers, stores) — same behaviour, no `isPending`.

{{quiz:transition-controlled-input}}

### React 19: async transitions = Actions

In React 19 the function passed to `startTransition` may be **async**. `isPending` stays `true` for the whole async function, including the network request:

```tsx
const [isPending, startTransition] = useTransition();

function handleSave() {
  startTransition(async () => {
    const error = await saveName(name);
    // ⚠️ updates after an `await` are NOT automatically part of the transition (React 19
    // limitation, pending async context support) — wrap them again:
    startTransition(() => {
      if (error) setError(error);
      else redirect('/profile');
    });
  });
}
```

By convention, a function that triggers a transition is called an **Action**. Errors thrown inside an Action propagate to the nearest **error boundary** — so catch the errors you want to show inline.

## `useDeferredValue`

```tsx
const deferredValue = useDeferredValue(value);        // React 18+
const deferredValue = useDeferredValue(value, initial); // React 19: optional initial value
```

On an update, React first re-renders with the **old** deferred value (fast, urgent), then schedules a background, interruptible re-render with the **new** value. If another update arrives mid-way, the background render is abandoned and restarted.

```tsx
function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        <SlowList query={deferredQuery} />
      </div>
    </>
  );
}

// memo is REQUIRED: during the urgent render SlowList receives the same old
// deferredQuery, so memo lets React skip it entirely.
const SlowList = memo(function SlowList({ query }: { query: string }) { /* … */ });
```

### `useTransition` vs `useDeferredValue` vs debounce

| | `useTransition` | `useDeferredValue` | `debounce` |
|---|---|---|---|
| Wraps | The **state update** (you own the setter) | A **value** (props, a hook's result) | A **function call** |
| Pending signal | `isPending` | `value !== deferredValue` | Your own state |
| Delay | None — starts immediately, yields to urgent work | None — adapts to device speed | Fixed (e.g. 300 ms), even on a fast machine |
| Interruptible render | Yes | Yes | No — when it runs, it blocks |
| Reduces work / requests | No | No | **Yes** |

> [!INTERVIEW] Say it like this
> "Both mark work as non-urgent. `useTransition` wraps the state update, so I use it when I own the setter — and it gives me `isPending`. `useDeferredValue` wraps a value I receive, and I compare it with the live value to show staleness. Neither is a debounce: there's no fixed delay and no reduction in work — they make rendering interruptible. If the cost is network requests rather than rendering, I still debounce."

## Suspense: for code and for data

`<Suspense fallback={…}>` shows the fallback while anything inside it **suspends**, and reveals the content when it's ready. Where you place boundaries is a design decision: one boundary per independently loading region, nested so the page fills in progressively rather than flashing many spinners.

### Code: `lazy`

```tsx
// Module top level — NOT inside a component (that would create a new component type
// on every render, resetting its state and re-suspending).
const SettingsPanel = lazy(() => import('./SettingsPanel')); // needs a default export

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      {showSettings && <SettingsPanel />}
    </Suspense>
  );
}
```

### Data: `use(promise)` — and why you can't create the promise during render

React 19's `use(promise)` reads a promise's value. If the promise is pending, the component **suspends**; if it rejects, the nearest **error boundary** catches it. Unlike hooks, `use` may be called inside `if` and loops (but not inside `try/catch`).

```tsx
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise); // suspends until resolved
  return <ul>{comments.map((c) => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

The catch: **the promise must be stable across renders**, so it has to be created *outside* the suspending component's render — by a framework, a Suspense-enabled library, or a cache. Here's why:

1. When a component suspends, React **discards** that render. A component that never committed has no preserved state or refs — `useState`/`useMemo`/`useRef` start fresh on retry.
2. When the promise settles, React **retries** the render from scratch.
3. If the render calls `fetchComments()` again, it gets a **new, pending** promise and suspends again — forever (React 19 warns: *"A component was suspended by an uncached promise…"*).

```ts run
// Toy version of how Suspense retries a component — NOT React's real code.
type Status = { status: 'pending' } | { status: 'fulfilled'; value: unknown };
const tracked = new WeakMap<Promise<unknown>, Status>();

function use<T>(p: Promise<T>): T {
  const s = tracked.get(p);
  if (s?.status === 'fulfilled') return s.value as T;
  if (!s) {
    tracked.set(p, { status: 'pending' });
    p.then((value) => tracked.set(p, { status: 'fulfilled', value }));
  }
  throw p; // "suspend": React catches the thrown promise and shows the fallback
}

const fetchUser = (id: string) => new Promise<string>((r) => setTimeout(() => r(`User ${id}`), 10));

async function renderWithSuspense(name: string, component: () => string) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(`${name}: attempt ${attempt} → rendered "${component()}"`);
      return;
    } catch (thrown) {
      console.log(`${name}: attempt ${attempt} → suspended, fallback shown`);
      await thrown; // React retries after the thrown promise settles
    }
  }
  console.log(`${name}: still suspended — every render made a NEW promise`);
}

await renderWithSuspense('created in render', () => use(fetchUser('1')));

const cache = new Map<string, Promise<string>>();
const cachedFetchUser = (id: string) => {
  if (!cache.has(id)) cache.set(id, fetchUser(id));
  return cache.get(id)!;
};
await renderWithSuspense('cached', () => use(cachedFetchUser('1')));
```

Where stable promises come from in practice:

- **A Server Component** starts the fetch (without awaiting) and passes the promise as a prop to a Client Component that calls `use()` — the promise is serialized and streamed (Lesson 2).
- **A Suspense-enabled library**: TanStack Query's `useSuspenseQuery`, Relay, SWR's suspense mode — they own the cache.
- **A cache keyed by input** you control, created in an event handler or loader, not in render.

> [!MISTAKE]
> `const user = use(fetch('/api/users/' + id).then((r) => r.json()));` inside a Client Component. Every retry creates a new promise, so it never settles. Hoist the promise into a cache, a loader, a parent Server Component, or use a library.

{{quiz:use-promise-in-render}}

> [!NOTE] React 19 Suspense change
> In React 19, when a component suspends, React commits the nearest fallback **immediately** instead of first rendering the suspended component's siblings, then "pre-warms" those siblings in the background. Fallbacks appear faster; any lazy requests in siblings still start.

## React 19 Actions for forms

React 19 turns the "loading/error/submit" boilerplate into primitives. The vocabulary:

| API | Import | Signature (simplified) | Purpose |
|---|---|---|---|
| `<form action={fn}>` | built in | `fn(formData: FormData)` | Runs `fn` as an Action (in a transition). Resets uncontrolled fields on success. `<button formAction={fn}>` overrides per button. |
| `useActionState` | `react` | `const [state, dispatch, isPending] = useActionState(action, initialState, permalink?)` where `action(prevState, payload)` returns the next state (sync or async) | State that results from an Action: validation errors, server result. Calls are queued in order. |
| `useFormStatus` | `react-dom` | `const { pending, data, method, action } = useFormStatus()` | Status of the **parent** `<form>` — for submit buttons and spinners. |
| `useOptimistic` | `react` | `const [optimistic, addOptimistic] = useOptimistic(state, updateFn?)` | Show a temporary value while an Action is pending; falls back to `state` when it ends. |

```tsx
import { useActionState, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';

type FormState = { error: string | null };

function SubmitButton() {
  const { pending } = useFormStatus(); // reads the <form> ABOVE this component
  return <button disabled={pending}>{pending ? 'Posting…' : 'Post'}</button>;
}

export function CommentForm({ comments, addComment }: {
  comments: Comment[];
  addComment: (text: string) => Promise<void>; // e.g. a Server Function
}) {
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (current, text: string) => [...current, { id: `temp-${current.length}`, text, pending: true }],
  );

  const [state, formAction] = useActionState<FormState, FormData>(async (_prev, formData) => {
    const text = String(formData.get('text') ?? '').trim();
    if (!text) return { error: 'Write something first' };
    addOptimistic(text);                 // shown instantly
    try {
      await addComment(text);            // parent updates `comments` → optimistic copy dropped
      return { error: null };
    } catch {
      return { error: 'Could not post. Try again.' }; // optimistic item disappears
    }
  }, { error: null });

  return (
    <form action={formAction}>
      <ul>{optimisticComments.map((c) => <li key={c.id}>{c.text}</li>)}</ul>
      <input name="text" aria-label="Comment" />
      {state.error && <p role="alert">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

The sharp edges interviewers probe:

- **`useFormStatus` must be called in a component rendered *inside* the `<form>`.** Called in the component that renders the form, it doesn't see that form and `pending` stays `false`.
- **`useOptimistic` updates must happen inside an Action/transition.** Outside one, React warns and the value reverts immediately.
- **Rollback is automatic**: the optimistic value is only shown while the Action is pending. If you never commit the real state (because the request failed), the UI returns to `state` by itself.
- **`useActionState` dispatch** must be called from a form `action`/`formAction` or inside `startTransition`; React warns otherwise. It replaces the canary-era `useFormState` from `react-dom`.
- **`<form action>` works before hydration** when `action` is a Server Function (progressive enhancement) — Lesson 2.

{{quiz:form-status-placement}}

## Smaller React 19 changes you should be able to name

```tsx
// 1. use(context): like useContext, but allowed after early returns / in conditions
function Badge({ show }: { show: boolean }) {
  if (!show) return null;
  const theme = use(ThemeContext);
  return <span className={theme}>New</span>;
}

// 2. <Context> is a provider (Context.Provider still works; slated for deprecation)
<ThemeContext value="dark"><App /></ThemeContext>;

// 3. ref is a regular prop for function components — forwardRef is no longer needed
function TextInput({ ref, ...props }: React.ComponentProps<'input'>) {
  return <input ref={ref} {...props} />;
}

// 4. Ref callbacks can return a cleanup function (React then skips the call with null).
//    An inline callback is a new function each render, so it re-runs (cleanup → setup)
//    on every render — wrap it in useCallback if setup is expensive.
<div
  ref={(node) => {
    const observer = new ResizeObserver(onResize);
    observer.observe(node!);
    return () => observer.disconnect();
  }}
/>;

// 5. Document metadata is hoisted to <head> from anywhere in the tree
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <h1>{post.title}</h1>
    </article>
  );
}
```

> [!WARNING] TypeScript gotcha with ref cleanups
> Because a ref callback's return value now means "cleanup", `@types/react` 19 rejects implicit returns like `ref={(el) => (inputRef = el)}`. Use a block body: `ref={(el) => { inputRef = el; }}`.

Also in 19: stylesheets with `precedence` and async `<script>`s are deduplicated and ordered by React; `preload`/`preinit`/`preconnect` from `react-dom` for resource hints; much better hydration error messages (a single diff); custom elements fully supported. Removed: `propTypes`/`defaultProps` on function components, string refs, legacy context, `ReactDOM.render`/`hydrate` (use `createRoot`/`hydrateRoot`).

> [!NOTE] Newer 19.x additions (19.2, October 2025)
> `<Activity mode="visible" | "hidden">` keeps hidden UI's state while unmounting its effects and rendering it at low priority; `useEffectEvent` (stable) for non-reactive logic inside effects; `cacheSignal` for Server Components. They are **not** in this course's 19.1 runtime — and if you mention them, say which version introduced them.

## Key takeaways

- Concurrent rendering = **interruptible, prioritized, abandonable** render phase on one thread; commits stay atomic. Opt-in per update.
- `useTransition` wraps an **update** (you own the setter, you get `isPending`); `useDeferredValue` wraps a **value** (pair it with `memo`). Neither debounces.
- Never put a controlled input's own value in a transition.
- Suspense handles code (`lazy`, declared at module level) and data (`use(promise)`); the promise must come from a **cache, library, framework or parent Server Component** because suspended renders are thrown away and retried.
- React 19 Actions: async transitions + `useActionState` + `useOptimistic` + `useFormStatus` + `<form action>`. Know the placement rule for `useFormStatus` and the "updates after `await`" limitation.
- Name the small changes: `use(context)`, `<Context value>`, `ref` as a prop, ref cleanups, metadata hoisting.
