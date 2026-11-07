## Why interviewers ask about effects

`useEffect` is where React code goes wrong most often, so interviewers probe it from three directions:

- **Concept:** "What is `useEffect` for? When does the cleanup run?" They want *synchronization with external systems*. "It's `componentDidMount`" is the answer that loses points.
- **Debugging:** "This search box sometimes shows results for the wrong query" (a race condition), or "the timer runs at double speed in development" (a missing cleanup plus StrictMode).
- **Judgement:** "Would you use an effect here?" Most effects in real codebases shouldn't exist. Knowing the "you might not need an effect" catalogue is a strong senior signal.

## The mental model: effects synchronize with external systems

An **external system** is anything React doesn't control: the network, browser APIs (`document.title`, `window` listeners, `IntersectionObserver`, `localStorage`), timers, a WebSocket, a map or chart widget, a non-React store.

An effect describes **how to start synchronizing** (the setup) and **how to stop** (the cleanup returned by setup), given the current props and state:

```tsx
function ChatRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createConnection(roomId); // start synchronizing with `roomId`
    connection.connect();
    return () => connection.disconnect(); // stop synchronizing with THAT roomId
  }, [roomId]);
  return <h1>Welcome to {roomId}</h1>;
}
```

Think about each effect **on its own**, not about the component's lifecycle. The question is not "what should happen on mount?" but "what does this component need to stay in sync with, and how do I start and stop that?" React then starts and stops the sync as often as needed: on mount, whenever `roomId` changes, on unmount, and twice on mount under StrictMode. If setup → cleanup → setup is indistinguishable from a single setup, your effect is correct.

> [!INTERVIEW] Say it like this
> "An effect synchronizes a component with something outside React, like a subscription, a timer, the network or a DOM API. The setup starts the sync for the current props and state, and the cleanup stops it. React runs the cleanup before re-running the effect with new dependencies and when the component unmounts. If I'm not talking to an external system, I probably don't need an effect."

## When effects run

Here's the commit timeline for one update:

1. **Render.** Component functions run (pure).
2. **Commit DOM mutations.** React updates the DOM.
3. **Attach refs.** `ref.current` now points to the new nodes.
4. **Layout effects** (`useLayoutEffect`). Cleanups and then setups run **synchronously, before the browser paints**.
5. **Browser paints.**
6. **Passive effects** (`useEffect`). Cleanups and then setups run, usually after the paint. When the update came from a discrete interaction such as a click, React may flush them before the paint so their result is visible immediately.

The ordering puzzles interviewers ask follow from a few rules (verified against React 19):

| Phase | Order |
|---|---|
| Mount | Parent **renders** first, then child. **Effects run child first**, because children finish committing first: child layout → parent layout → child effect → parent effect. |
| Update | All **cleanups** of the effects that re-run happen **before any** new setup: child cleanup → parent cleanup → child setup → parent setup. |
| Unmount | Every cleanup runs. Current React runs them parent first, top-down, but don't build anything that depends on that order. |

```tsx
function Child() {
  useEffect(() => {
    console.log('child effect');
    return () => console.log('child cleanup');
  });
  return null;
}
function Parent() {
  useEffect(() => {
    console.log('parent effect');
    return () => console.log('parent cleanup');
  });
  return <Child />;
}
// mount:      child effect, parent effect
// re-render:  child cleanup, parent cleanup, child effect, parent effect
```

## Dependency arrays

| You write | The effect runs |
|---|---|
| no array | after **every** commit |
| `[]` | after mount only; cleanup on unmount |
| `[a, b]` | after mount, and after any commit where `a` or `b` changed, compared with **`Object.is`** against the previous render |

The dependency array **is not a knob for choosing when an effect runs.** It's a declaration of every **reactive value** the effect reads: props, state, and anything computed from them in the component body, including functions. The `react-hooks/exhaustive-deps` lint rule checks it. If you don't want a value in the array, change the code so the effect doesn't read it. Don't silence the linter, because a missing dependency is just a stale closure waiting to happen.

### Objects and functions as dependencies

`Object.is` compares objects and functions **by reference**. Anything created during render is a new reference on every render:

```ts run
// React compares each dependency with Object.is against the previous render's value
const depsChanged = (prev: unknown[], next: unknown[]) => next.some((dep, i) => !Object.is(dep, prev[i]));

function renderSearch(query: string) {
  const options = { query, limit: 10 }; // new object every render
  const onResult = (r: string) => console.log(r); // new function every render
  return { options, onResult, query };
}

const first = renderSearch('react');
const second = renderSearch('react'); // the parent re-rendered; same query

console.log('[options]  changed?', depsChanged([first.options], [second.options]));
console.log('[onResult] changed?', depsChanged([first.onResult], [second.onResult]));
console.log('[query]    changed?', depsChanged([first.query], [second.query]));
console.log('[NaN]      changed?', depsChanged([NaN], [NaN]), '(Object.is(NaN, NaN) is true)');
```

So `useEffect(() => fetchResults(options), [options])` runs after **every** render, and if the effect sets state, you've built an infinite loop. Fixes, roughly from best to worst:

1. **Move the object or function inside the effect** and depend on the primitives it uses (`[query]`).
2. **Move it outside the component** if it doesn't use props or state. Module-level constants are stable.
3. **Depend on primitives**: `[options.query, options.limit]`.
4. **Memoize it** where it's created with `useMemo` or `useCallback` (Day 7), or let the React Compiler do it.
5. For logic that must read the latest props/state **without** re-running the effect (for example, logging with the current theme when a connection opens), use **`useEffectEvent`** (stable since React 19.2). Before 19.2 people used a "latest ref" for this.

{{quiz:effect-object-dep}}

## Cleanup: what and when

The cleanup runs:

1. **Before the effect re-runs** because a dependency changed. The cleanup closes over the **previous** render's values, so it disconnects from the *old* room.
2. **When the component unmounts.**
3. Once extra on mount in development under StrictMode (setup → cleanup → setup).

Anything you start in setup needs a matching stop in cleanup:

| Setup | Cleanup |
|---|---|
| `addEventListener` | `removeEventListener` (same function reference) |
| `setInterval` / `setTimeout` | `clearInterval` / `clearTimeout` |
| `subscribe()` / `observer.observe()` | `unsubscribe()` / `observer.disconnect()` |
| `connection.connect()` | `connection.disconnect()` |
| `fetch(…)` | `controller.abort()` and/or an `ignore` flag |
| Imperative widget `new Chart(el)` | `chart.destroy()` |

{{quiz:effect-cleanup-order}}

## Fetching in an effect without race conditions

The naive version has a **race condition**:

```tsx
useEffect(() => {
  fetchResults(query).then(setResults); // ❌ whichever response arrives LAST wins
}, [query]);
```

The user types "r" and then "re". Two requests are in flight. If the "r" response is slower, it arrives second and overwrites the "re" results, so the screen now shows results for a query the user no longer has. The same bug appears when switching between profile pages quickly. The fix is to have the cleanup mark the old request as stale:

```ts run
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The server answers 1-letter queries slowly, so "r" resolves AFTER "re"
async function fakeSearch(query: string): Promise<string> {
  await sleep(query.length === 1 ? 300 : 100);
  return `results for "${query}"`;
}

async function simulate(useIgnoreFlag: boolean): Promise<string> {
  let screen = '';
  let cleanup: (() => void) | undefined;

  // what a [query]-dependent effect does each time the query changes
  function runEffect(query: string) {
    cleanup?.(); // React runs the previous cleanup first
    let ignore = false;
    fakeSearch(query).then((result) => {
      if (useIgnoreFlag && ignore) return;
      screen = result;
    });
    cleanup = () => {
      ignore = true;
    };
  }

  runEffect('r'); // user types "r"…
  setTimeout(() => runEffect('re'), 50); // …then "re"
  await sleep(400);
  return screen;
}

console.log('without ignore flag →', await simulate(false));
console.log('with ignore flag    →', await simulate(true));
```

The production version combines an **ignore flag** for correctness with an **`AbortController`** to cancel the network request:

```tsx
type State = { status: 'loading' } | { status: 'success'; data: User } | { status: 'error' };

function Profile({ userId }: { userId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    setState({ status: 'loading' }); // reset for the new userId (or render <Profile key={userId}> instead)

    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<User>;
      })
      .then((data) => {
        if (!ignore) setState({ status: 'success', data });
      })
      .catch(() => {
        // aborted requests reject with an AbortError — `ignore` is already true for those
        if (!ignore) setState({ status: 'error' });
      });

    return () => {
      ignore = true; // correctness: never apply a stale response
      controller.abort(); // efficiency: stop downloading what nobody will read
    };
  }, [userId]);
  // …render by state.status
}
```

Why both? `abort()` only helps when the data source honours the signal. Many SDKs and mocks don't, and a response can already be resolving when you abort. The `ignore` flag guarantees correctness whatever the fetcher does. This pattern also makes StrictMode's double mount harmless: the first request is aborted and ignored.

> [!MISTAKE]
> "I'd use a `useRef` flag so the effect only fetches once" (to beat StrictMode). That hides the symptom and leaves the race condition in place. Write a correct cleanup, and the double mount is harmless.

**The bigger picture, worth mentioning in interviews.** Effect-based fetching has no caching, no request deduplication, no retry, no SSR, and it creates **waterfalls**: a parent fetches, renders, and only then does the child start its own fetch. In production, prefer your framework's data loading (route loaders, React Server Components) or a server-cache library (TanStack Query, SWR). React 19's `use(promise)` with Suspense is covered on Day 7. Being able to write the effect version correctly is still table stakes.

{{quiz:fetch-race-fix}}

## You might not need an effect

Effects are an escape hatch for talking to the outside world. If no external system is involved, there's almost always a simpler, faster, less buggy option. Use this catalogue:

| Situation | ❌ Effect version | ✅ Instead |
|---|---|---|
| Transform data for rendering | `useEffect(() => setVisible(todos.filter(…)), [todos, filter])` | Compute during render (`useMemo` if it's expensive) |
| Reset **all** state when a prop changes | `useEffect(() => { setComment(''); … }, [userId])` | `<Profile key={userId} />` |
| Adjust **some** state when a prop changes | `useEffect(() => setSelection(null), [items])` | Derive it (`selectedId` that's not in `items` → null), or set it during render as a last resort |
| Logic caused by a **user event** | `useEffect(() => { if (submitted) post(form) }, [submitted])` | Do it in the event handler |
| Show a toast after "add to cart" | Effect watching `cart` | Call `showToast()` in the click handler, because it happened *because the user clicked*, not because the component rendered |
| **Chains** of effects (effect sets state → another effect reacts) | 3 effects bouncing state around | Compute all the next state in one handler or reducer |
| Notify the parent of a change | `useEffect(() => onChange(value), [value])` | Call `onChange(next)` in the same handler that calls `setValue(next)`, or lift the state |
| Pass fetched data **up** to a parent | Child fetches, then calls `onLoaded(data)` in an effect | Fetch in the parent and pass the data down |
| Subscribe to an external store | Effect + `useState` mirror | `useSyncExternalStore` (Day 6) |
| One-time app initialisation | `useEffect(() => initAnalytics(), [])` (runs twice in dev) | Module-level code, or a module-level `didInit` guard |

The question to ask is: **"Does this code run because the component was *displayed*, or because the user *did something*?"** "Displayed" (keep the chat connected while visible, track the page view) belongs in an effect. "Did something" (submit, buy, delete) belongs in an event handler.

A chain-of-effects refactor, the classic example:

```tsx
// ❌ Each step renders, commits, then the next effect fires — 3 extra renders, hard to follow
useEffect(() => { if (card?.gold) setGoldCount((c) => c + 1); }, [card]);
useEffect(() => { if (goldCount > 3) { setRound((r) => r + 1); setGoldCount(0); } }, [goldCount]);
useEffect(() => { if (round > 5) setIsGameOver(true); }, [round]);

// ✅ Compute everything in the handler; derive isGameOver during render
function handlePlaceCard(next: Card) {
  setCard(next);
  if (!next.gold) return;
  if (goldCount < 3) {
    setGoldCount(goldCount + 1);
  } else {
    setGoldCount(0);
    setRound(round + 1);
  }
}
const isGameOver = round > 5;
```

> [!INTERVIEW] Say it like this
> "Before I write an effect I ask whether there's an external system involved. Derived values get computed during render. Things that happen because the user did something go in the event handler. Resetting state on an identity change is a `key`. That leaves effects for real synchronization, like subscriptions, timers, imperative widgets and, when there's no framework support, data fetching with a cleanup."

## Refs: values that don't trigger renders

`useRef(initial)` returns the **same** mutable `{ current }` object for the whole life of the component instance. Writing to `ref.current` **doesn't** re-render.

| | `useState` | `useRef` |
|---|---|---|
| Changing it re-renders | Yes | No |
| Value in the current render | A snapshot (constant) | Always the live, latest value |
| Read during render? | Yes, that's the point | No (except lazy init) |
| Typical use | Anything shown on screen | DOM nodes, timer ids, `AbortController`, previous values, latest callback |

Two families of use:

**1. DOM access** for focus, scrolling, measuring, and integrating non-React widgets:

```tsx
function SearchField() {
  const inputRef = useRef<HTMLInputElement>(null); // RefObject<HTMLInputElement | null>
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus search</button>
    </>
  );
}
```

**2. Instance variables** that need to survive renders without causing them, such as an interval id managed from event handlers:

```tsx
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    if (intervalRef.current !== null) return; // already running
    intervalRef.current = setInterval(() => setElapsed((e) => e + 100), 100);
  }
  function stop() {
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current); // still clean up on unmount
    };
  }, []);
  // …
}
```

Rules and React 19 notes:

- **Don't read or write `ref.current` during render.** It makes rendering impure, and the UI won't update when the ref changes. The only exception is lazy initialisation: `if (ref.current === null) ref.current = new ExpensiveThing()`. Read and write refs in event handlers and effects.
- **`ref` is a regular prop for function components in React 19.** `function Input({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> })` works directly, and `forwardRef` is on its way out.
- **Ref callbacks can return a cleanup function** (React 19): `<div ref={(node) => { observer.observe(node); return () => observer.unobserve(node); }} />`.
- **TypeScript:** React 19's types require an initial argument (`useRef<number | null>(null)`, not `useRef<number>()`). `useRef<HTMLDivElement>(null)` gives `RefObject<HTMLDivElement | null>`.

> [!MISTAKE]
> Rendering `{countRef.current}` and expecting the screen to update when it changes. Refs are invisible to React's render cycle. If it's on screen, it's state.

## `useLayoutEffect` vs `useEffect`

`useLayoutEffect` has the same API but runs **synchronously after the DOM is mutated and before the browser paints**. If you set state inside it, React re-renders and commits again **before** the paint, so the user never sees the intermediate frame.

Use it when you must **measure layout and then adjust** before the user sees anything, for example tooltip or popover positioning, auto-sizing, or scroll restoration:

```tsx
function Tooltip({ anchor, children }: { anchor: DOMRect; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.bottom);

  useLayoutEffect(() => {
    const { height } = ref.current!.getBoundingClientRect();
    // not enough room below? flip above — before the paint, so the user never sees it jump
    setTop(anchor.bottom + height > window.innerHeight ? anchor.top - height : anchor.bottom);
  }, [anchor]);

  return <div ref={ref} style={{ position: 'fixed', top, left: anchor.left }}>{children}</div>;
}
```

Trade-offs to mention: it **blocks paint**, so slow work there hurts responsiveness. Neither hook runs during server rendering, so layout-dependent UI needs a client-side fallback. Default to `useEffect` and switch only when you can *see* a flicker. (`useInsertionEffect` runs even earlier and exists for CSS-in-JS libraries to inject styles. It's not for application code.)

{{quiz:layout-effect-when}}

## Key takeaways

- Effects **synchronize with external systems**. Setup starts the sync and cleanup stops it. Think per effect, not per lifecycle.
- Timeline: render → DOM mutations → refs → **layout effects (before paint)** → paint → **effects**. On mount, effects run **child first**. On update, **all cleanups run before any setups**.
- The dependency array lists **every reactive value** the effect reads, compared with `Object.is`. Objects and functions created during render change every time, so move them inside, hoist them, depend on primitives, or memoize. Reach for `useEffectEvent` (19.2+) for non-reactive reads.
- Cleanup runs **before re-running** (with the old values) and **on unmount**, plus once extra on mount under StrictMode in development.
- Safe fetching = **ignore flag** (correctness) + **`AbortController`** (efficiency). Mention caching, dedupe and waterfalls, and prefer a framework or TanStack Query in production.
- You probably don't need an effect for **derived data**, **event-driven logic**, **resetting state** (use `key`), **chains of updates** or **notifying parents**.
- **Refs** hold mutable values that don't trigger renders (DOM nodes, timer ids). Don't read or write them during render.
- **`useLayoutEffect`** is for measure-then-adjust before paint. Everything else uses `useEffect`.
