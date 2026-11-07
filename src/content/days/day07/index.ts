import type { Day, Exercise } from '../../types';

import concurrentReact19 from './lessons/concurrent-react-19.md?raw';
import serverRenderingRsc from './lessons/server-rendering-rsc.md?raw';
import performanceStateManagement from './lessons/performance-state-management.md?raw';

import rangeStarter from './exercises/windowing-visible-range/starter.ts?raw';
import rangeSolution from './exercises/windowing-visible-range/solution.ts?raw';
import rangeTests from './exercises/windowing-visible-range/tests.ts?raw';
import memoStarter from './exercises/memo-list-rerenders/starter.tsx?raw';
import memoSolution from './exercises/memo-list-rerenders/solution.tsx?raw';
import memoTests from './exercises/memo-list-rerenders/tests.tsx?raw';
import vlistStarter from './exercises/react-virtual-list/starter.tsx?raw';
import vlistSolution from './exercises/react-virtual-list/solution.tsx?raw';
import vlistTests from './exercises/react-virtual-list/tests.tsx?raw';
import storeStarter from './exercises/external-store-selector/starter.tsx?raw';
import storeSolution from './exercises/external-store-selector/solution.tsx?raw';
import storeTests from './exercises/external-store-selector/tests.tsx?raw';
import likeStarter from './exercises/optimistic-like-toggle/starter.tsx?raw';
import likeSolution from './exercises/optimistic-like-toggle/solution.tsx?raw';
import likeTests from './exercises/optimistic-like-toggle/tests.tsx?raw';
import queryStarter from './exercises/query-cache-dedupe-stale/starter.ts?raw';
import querySolution from './exercises/query-cache-dedupe-stale/solution.ts?raw';
import queryTests from './exercises/query-cache-dedupe-stale/tests.ts?raw';

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

const visibleRange: Exercise = {
  id: 'windowing-visible-range',
  title: 'Windowing math: getVisibleRange()',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 8,
  tags: ['virtualization', 'performance', 'edge cases'],
  prompt: `Every virtual list (react-window, TanStack Virtual) is built on one small function: given the scroll position, which rows must be rendered? Implement it for **fixed-height rows**.

\`\`\`ts
getVisibleRange({ scrollTop: 25, viewportHeight: 100, itemHeight: 20, itemCount: 1000 });
// → { start: 1, end: 7 }   (render items.slice(1, 7))
\`\`\`

Requirements:
- A row is visible if **any part** of it is inside the viewport. \`end\` is **exclusive**.
- \`overscan\` (default 0) adds that many extra rows **above and below**, clamped to \`[0, itemCount]\`.
- Clamp \`scrollTop\` to \`[0, maxScrollTop]\` first: it can be **negative** (elastic overscroll on iOS/macOS) or **past the end** (rows were removed while the user was scrolled down).
- An empty list returns \`{ start: 0, end: 0 }\`.

**What the interviewer is looking for:** an O(1) formula, the off-by-one at the bottom edge (a row that starts exactly at the bottom is not visible), and unprompted handling of clamping and overscan.`,
  starter: rangeStarter,
  solution: rangeSolution,
  tests: rangeTests,
  hints: [
    'The first visible row is the one that contains the top edge of the viewport: `Math.floor(scrollTop / itemHeight)`.',
    'For the exclusive end use `Math.ceil((scrollTop + viewportHeight) / itemHeight)`. `Math.floor(...) + 1` is wrong when the bottom edge falls exactly on a row boundary.',
    'Clamp `scrollTop` into `[0, Math.max(0, itemCount * itemHeight - viewportHeight)]` first; then subtract/add `overscan` and clamp `start` to ≥ 0 and `end` to ≤ `itemCount`.',
  ],
  explanation: `**Approach:** clamp \`scrollTop\`, then \`first = floor(top / h)\` and \`end = ceil((top + viewport) / h)\`, widen both by \`overscan\` and clamp to the list. O(1) time and memory.

**Edge cases:** the exact-boundary off-by-one (\`ceil\`, not \`floor + 1\`), negative \`scrollTop\` from elastic overscroll, \`scrollTop\` beyond the end after items are removed (without clamping, \`start\` can exceed \`end\` and you render nothing), lists shorter than the viewport, fractional \`scrollTop\` on zoomed/high-DPI screens (\`floor\`/\`ceil\` handle it), and an empty list.

**Follow-ups you may get:**
- *"Rows have different heights."* → keep a **prefix-sum array** of row offsets (\`offsets[i]\` = top of row \`i\`), find \`start\` with a **binary search** for \`scrollTop\` (O(log n)), then walk forward until you pass the bottom edge. Unmeasured rows use an estimated height and are corrected when a \`ResizeObserver\` measures them.
- *"How would you implement \`scrollToIndex(i)\`?"* → set \`container.scrollTop = i * itemHeight\` (or \`offsets[i]\`), optionally aligning to center/end by subtracting \`viewportHeight - itemHeight\`.
- *"What about a grid?"* → apply the same math independently on each axis.
- *"How much overscan?"* → 1–5 rows is typical; more means fewer blank flashes during fast scrolling but more DOM and render work. Some libraries increase overscan in the scroll direction.`,
};

const memoRows: Exercise = {
  id: 'memo-list-rerenders',
  title: 'Stop the todo list re-rendering every row on every keystroke',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 12,
  tags: ['react', 'memo', 'useCallback', 'performance', 'stale closures'],
  prompt: `The starter \`TodoEditor\` works, but **every \`TodoRow\` re-renders on every keystroke** — in the "New todo" field and in any row's title input. With a few hundred rows that's visible lag.

Make it so that **only rows whose data changed re-render**:
- Typing in "New todo" re-renders **no** rows.
- Toggling or editing a row re-renders **only that row**.
- Adding a todo renders **only the new row**.
- Behaviour must stay correct: toggling row A and then row C leaves **both** checked.

The tests count renders through the \`onRowRender\` prop (each \`TodoRow\` calls \`onRender?.(todo.id)\` while rendering — keep that line). Keep the markup: an \`<li>\` per todo with a checkbox and a text input.

**What the interviewer is looking for:** you name *why* each row re-renders (parent render + new prop references), fix **all** the unstable props (including the easy-to-miss inline \`style\` object), and avoid the stale-closure trap that \`useCallback(…, [])\` introduces.`,
  starter: memoStarter,
  solution: memoSolution,
  tests: memoTests,
  hints: [
    'Wrap `TodoRow` in `memo`, then ask of every prop: is it the *same reference* on the next render of `TodoEditor`?',
    '`style={{ … }}` is a new object every render: compute the style inside the row from `todo.done` instead. `toggle` and `rename` are new functions every render: wrap them in `useCallback`.',
    'With `useCallback(…, [])` the callbacks close over the FIRST render\'s `todos`. Use functional updates: `setTodos((prev) => prev.map(…))`. `map` returns the same object for untouched todos, so their rows still bail out.',
  ],
  explanation: `**Why every row re-rendered:** \`TodoEditor\` re-renders on every keystroke (its \`draft\` or \`todos\` state changed), and by default React re-renders all children. Even after adding \`memo\`, three props were new references each render: the inline \`style\` object, \`toggle\` and \`rename\`.

**The fix, piece by piece:**
1. \`memo(TodoRow)\` — skip the row when props are shallowly equal (\`Object.is\` per prop).
2. Move the style into the row (derive it from \`todo.done\`). Passing primitives instead of objects is often the simplest way to keep props stable.
3. \`useCallback\` for \`toggle\`/\`rename\` with **empty deps**, made correct by **functional updates** — they read the latest list from \`prev\` instead of a stale \`todos\`.
4. Immutable updates with \`map\` preserve the identity of untouched todo objects, which is what lets their rows bail out. (A deep clone of the list would defeat \`memo\` again.)

**What about \`onRowRender\`?** It comes from the test and is stable. In real code you'd measure with the React DevTools Profiler or \`<Profiler onRender>\` instead of calling a callback during render (a side effect in render, acceptable only as test instrumentation).

**Follow-ups you may get:**
- *"Would \`useReducer\` help?"* → yes: \`dispatch\` is always stable, so you could pass \`dispatch\` (or callbacks built on it) without \`useCallback\`.
- *"What does React Compiler change?"* → it would memoize the row element and the callbacks automatically — but it can't fix the stale closure if you'd written \`setTodos(todos.map(…))\` with stale state, and it still relies on immutable updates.
- *"Still slow with 10,000 rows?"* → memo reduces re-renders, not mount cost or DOM size. Virtualize (next exercise).
- *"Why not \`memo\` with a custom comparator that ignores functions?"* → it hides bugs: a row would keep calling an old callback. Make props stable instead.`,
};

const virtualList: Exercise = {
  id: 'react-virtual-list',
  title: 'Build a <VirtualList> component',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['virtualization', 'react', 'performance', 'accessibility'],
  prompt: `Build a fixed-row-height virtual list. The starter renders all 1,000 items; make it render **only the visible window** (+ \`overscan\`). The windowing math (\`getVisibleRange\`) from the previous exercise is provided in the starter.

\`\`\`tsx
<VirtualList
  items={items}            // readonly T[]
  itemHeight={20}          // px, fixed
  height={100}             // viewport height in px (passed in — no measuring)
  overscan={2}             // optional, default 0
  label="Results"
  renderItem={(item, index) => <span>{item}</span>}
/>
\`\`\`

Required structure:
- Outer scroll container: \`role="list"\`, \`aria-label={label}\`, \`tabIndex={0}\`, style \`height\`, \`overflowY: 'auto'\`, \`position: 'relative'\`, and an \`onScroll\` handler.
- Its **first child** is a "sizer" with \`height: items.length * itemHeight\` so the scrollbar represents the whole list.
- Each rendered row: \`role="listitem"\`, \`aria-setsize\` (total count), \`aria-posinset\` (1-based index), style \`position: 'absolute'\`, \`top: index * itemHeight\`, \`height: itemHeight\`.

jsdom has no layout, so the tests set \`list.scrollTop = 400\` and fire a \`scroll\` event.

**What the interviewer is looking for:** state is only \`scrollTop\` (everything else derived), the sizer + absolute positioning technique, correct **keys** (a row that stays in view keeps its DOM node), and accessibility for rows that aren't in the DOM.`,
  starter: vlistStarter,
  solution: vlistSolution,
  tests: vlistTests,
  hints: [
    'Keep `scrollTop` in state, updated from `onScroll` with `e.currentTarget.scrollTop`. Compute `{ start, end }` with `getVisibleRange` during render.',
    'Loop `for (let index = start; index < end; index++)` and render `items[index]` in an absolutely positioned row at `top: index * itemHeight`, inside a sizer of height `items.length * itemHeight`.',
    'Key rows by the absolute `index`, not by their position within the window (`items.slice(start, end).map((item, i) => …key={i})` makes every node show a different item after each scroll). Add `aria-setsize={items.length}` and `aria-posinset={index + 1}`.',
  ],
  explanation: `**Approach:** the only state is \`scrollTop\`. Each render derives the window, renders those rows absolutely positioned inside a full-height sizer, and the browser's native scrolling does the rest. DOM size stays ~constant no matter how long the list is.

**Why absolute positioning?** Rows don't affect each other's layout, so adding/removing rows at the edges never shifts the visible ones. Alternatives: one inner container moved with \`transform: translateY(start * itemHeight)\` (fewer style updates, compositor-friendly) or top/bottom padding spacers.

**Keys matter:** with \`key={index}\` (absolute), a row that stays in view keeps its DOM node and any state inside it (focus, an open menu, an input's text). With slot-position keys, React reuses each node for a *different* item on every scroll — subtle bugs and more DOM work. With mutable data, key by a stable item id instead.

**Performance notes:** a scroll event per frame triggers one render of the list; memoize the row component so only entering rows render their content. Don't put \`scrollTop\` in a transition — scrolling must feel immediate (blank rows are worse than a slightly slower render).

**Follow-ups you may get:**
- *"Variable heights?"* → estimated sizes + measurement via \`ResizeObserver\`, offsets in a prefix-sum array with binary search, and scroll-position correction when rows above the viewport change size.
- *"Infinite loading?"* → when \`end\` gets within N rows of \`items.length\`, request the next page (and don't request twice while one is in flight).
- *"Keyboard support?"* → arrow keys move a roving \`tabIndex\`; when the active row would leave the window, scroll it into view (\`scrollTop = index * itemHeight\`) so it's rendered.
- *"Why not just \`content-visibility: auto\`?"* → it skips rendering work for off-screen rows but they're still in the DOM (memory, mount cost). It's great for moderately long content; true virtualization wins at 10k+ rows.`,
};

const selectorStore: Exercise = {
  id: 'external-store-selector',
  title: 'Mini-Zustand: createStore + useStore(selector)',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['useSyncExternalStore', 'state management', 'closures', 'performance'],
  prompt: `Implement a tiny Zustand-like store and a selector hook on top of \`useSyncExternalStore\`.

\`\`\`tsx
const store = createStore({ count: 0, name: 'Ada' });
store.setState({ count: 1 });                        // shallow merge
store.setState((s) => ({ count: s.count + 1 }));     // updater
const unsubscribe = store.subscribe(() => console.log('changed'));

function Count() {
  const count = useStore(store, (s) => s.count);     // re-renders only when count changes
  return <p>Count: {count}</p>;
}
\`\`\`

\`createStore\` requirements:
- \`setState\` shallow-merges into a **new** state object (old snapshots are never mutated) and notifies every listener.
- If an updater returns the **current state object itself**, nothing changes and nobody is notified.
- Methods are plain closures — they work when destructured.

\`useStore(store, selector)\` requirements:
- Returns \`selector(store.getState())\` and re-renders **only when the selected value changes** (\`Object.is\`).
- Subscribes **once** (not on every render) and unsubscribes on unmount.

**What the interviewer is looking for:** closure-based store design, knowing *why* \`useSyncExternalStore\` exists (tearing under concurrent rendering), and that \`getSnapshot\` must return a stable value.`,
  starter: storeStarter,
  solution: storeSolution,
  tests: storeTests,
  hints: [
    'createStore is a closure: `let state`, a `Set<Listener>`, and three arrow functions that close over them. `setState` computes the partial (call it if it\'s a function), bails out if it `Object.is` the current state, otherwise `state = { ...state, ...partial }` and calls every listener.',
    '`useSyncExternalStore(subscribe, getSnapshot)` re-renders only when `getSnapshot()` returns a different value by `Object.is`. Make the snapshot the SELECTED slice: `() => selector(store.getState())`.',
    'Pass `store.subscribe` itself as the first argument — its identity is stable. An inline `(cb) => store.subscribe(cb)` is a new function each render, so React would unsubscribe and resubscribe after every render.',
  ],
  explanation: `**Why \`useSyncExternalStore\`?** With concurrent rendering, React may pause a render midway. If components read a mutable external store directly (\`store.getState()\` in render + a \`useEffect\` subscription), a store update during that pause can make two components in the same commit show different values — **tearing**. \`useSyncExternalStore\` detects that the snapshot changed during render and re-renders synchronously, and it handles subscription timing correctly. Its optional third argument, \`getServerSnapshot\`, is used during SSR and hydration.

**How the selector gives render isolation:** after every store change React calls each subscriber's \`getSnapshot\` and compares the result with the previous one. A component that selected \`count\` gets the same number back when only \`name\` changed, so React skips it. That's the core of Zustand, Redux's \`useSelector\`, Jotai and Valtio.

**The trap — selectors that build new objects:**
\`\`\`ts
useStore(store, (s) => ({ count: s.count, name: s.name })); // new object on EVERY call
\`\`\`
\`getSnapshot\` must return the same value when nothing changed; a fresh object every call makes React think the store changed on every check — an infinite render loop (React warns "The result of getSnapshot should be cached"). Fixes: select primitives separately, or add an equality function and keep the previous selection when it's equal (what Zustand's \`useShallow\` and \`use-sync-external-store/with-selector\` do):

\`\`\`tsx
function useStoreWithEquality<S extends object, U>(
  store: Store<S>,
  selector: (s: S) => U,
  isEqual: (a: U, b: U) => boolean,
): U {
  const getSelection = useMemo(() => {
    let hasMemo = false;
    let memoState: S;
    let memoSelection: U;
    return () => {
      const state = store.getState();
      if (hasMemo && Object.is(state, memoState)) return memoSelection;
      const next = selector(state);
      memoState = state;
      if (hasMemo && isEqual(memoSelection, next)) return memoSelection; // keep the old reference
      hasMemo = true;
      memoSelection = next;
      return next;
    };
  }, [store, selector, isEqual]);
  return useSyncExternalStore(store.subscribe, getSelection, getSelection);
}
\`\`\`

**Follow-ups you may get:**
- *"How would you add middleware (persist, devtools, logging)?"* → wrap \`setState\`: \`const set = store.setState; store.setState = (a) => { set(a); localStorage.setItem(key, JSON.stringify(store.getState())); }\`.
- *"Why not just Context?"* → Context has no selectors: every consumer re-renders when the value changes. A store with selectors re-renders only affected components, and can be read/written outside React.
- *"Why notify synchronously?"* → simple and predictable; React batches the resulting re-renders anyway.`,
};

const optimisticLike: Exercise = {
  id: 'optimistic-like-toggle',
  title: 'Optimistic like button with rollback',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 12,
  tags: ['react 19', 'useOptimistic', 'transitions', 'optimistic UI', 'error handling'],
  prompt: `The starter \`LikeButton\` is **pessimistic**: it waits for the server before updating, so every click feels slow. Make it **optimistic**:

- On click: **immediately** flip \`aria-pressed\` and change the count by ±1, then call \`onToggle(nextLiked)\`.
- If the promise **resolves**: keep the new state.
- If it **rejects**: roll back to the last confirmed state and show \`ERROR_MESSAGE\` in an element with \`role="alert"\`.
- Clear the error when the user clicks again.

\`\`\`tsx
<LikeButton initialLiked={false} initialCount={10} onToggle={(liked) => api.setLike(postId, liked)} />
\`\`\`

The button's accessible name stays "Like" (state is conveyed by \`aria-pressed\`); the count renders as "10 likes".

Use React 19's \`useOptimistic\` with a transition — or manage the optimistic state yourself. Both pass the tests; the explanation compares them.

**What the interviewer is looking for:** immediate feedback, a correct rollback to the **confirmed** state (not a stale snapshot), accessible error reporting, and awareness of races between overlapping requests.`,
  starter: likeStarter,
  solution: likeSolution,
  tests: likeTests,
  hints: [
    'Separate what the server has confirmed from what the user sees. The visible state must change synchronously in the click handler.',
    'React 19: `const [optimistic, setOptimistic] = useOptimistic(confirmed)`. Inside `startTransition(async () => { setOptimistic(next); await onToggle(next.liked); … })`. When the transition ends, `optimistic` falls back to `confirmed` — that IS the rollback.',
    'On success commit with `startTransition(() => setConfirmed(next))` (updates after an `await` need wrapping). On failure, don\'t rethrow (it would reach an error boundary): set the error message. Call `setError(null)` at the start of every click.',
  ],
  explanation: `**React 19 approach (reference solution):** \`confirmed\` state holds what the server accepted; \`useOptimistic(confirmed)\` gives the displayed value. Inside an async transition we set the optimistic value, await the request, and on success commit \`confirmed\`. When the Action finishes, React drops the optimistic value and shows \`confirmed\` — so on failure, **rollback is automatic** because we never committed the new state. Errors are caught inside the Action, because an uncaught error from an Action propagates to the nearest error boundary.

**Manual approach:** \`liked\`/\`count\` state updated immediately in the click handler, \`try { await onToggle(next) } catch { restore previous; setError(…) }\`. Simple and works in React 18 — but you must restore the right "previous" value yourself.

**Races (the follow-up you'll get):** click twice quickly → two requests in flight. If they resolve out of order, the last *response* wins rather than the last *click*. Options:
- Send the **absolute desired state** (\`setLike(true)\`, an idempotent PUT) rather than "toggle" — then the server ends up in the right state regardless of order.
- Track a request counter and ignore responses from superseded requests, or abort the previous request with an \`AbortController\`.
- Disable the button while pending (simplest, but slower UX), or queue requests (\`useActionState\` queues its actions sequentially).

**Accessibility:** a toggle button keeps a constant label and uses \`aria-pressed\`; changing the label to "Unlike" *and* using \`aria-pressed\` double-announces. Errors go in a \`role="alert"\` live region so screen readers announce the rollback.

**With TanStack Query:** \`useMutation({ onMutate })\` snapshots the cached data, writes the optimistic value with \`setQueryData\`, returns the snapshot as context, restores it in \`onError\` and invalidates in \`onSettled\`.

**When not to be optimistic:** irreversible or high-stakes actions (payments, deletes without undo) or when the server is likely to reject (validation-heavy operations).`,
};

const queryCache: Exercise = {
  id: 'query-cache-dedupe-stale',
  title: 'TanStack-lite: query cache with dedupe, staleTime and invalidate',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 20,
  tags: ['server state', 'caching', 'promises', 'race conditions', 'timers'],
  prompt: `Implement the core of a server-state cache like TanStack Query.

\`\`\`ts
const cache = createQueryCache({ staleTime: 30_000 });
await cache.fetch('todos', () => api.getTodos());   // fetches
await cache.fetch('todos', () => api.getTodos());   // fresh → cached, no request
cache.invalidate('todos');                          // e.g. after a mutation
cache.getData('todos');                             // still the old data (stale-while-revalidate)
await cache.fetch('todos', () => api.getTodos());   // refetches
\`\`\`

\`fetch(key, fetcher, options?)\`:
1. A request for \`key\` already **in flight** → return **that same promise** (dedupe).
2. Cached data is **fresh** — has data, not invalidated, and \`Date.now() - updatedAt < staleTime\` → resolve it **without** calling \`fetcher\`.
3. Otherwise call \`fetcher\`; cache the result on success. **Errors are not cached** and must not leave the key stuck "in flight".

\`staleTime\` comes from the per-call options, else \`createQueryCache\` defaults, else **0** (always stale — TanStack's default).

\`invalidate(key)\` marks the data stale but keeps it readable via \`getData\`. A request that was in flight when \`invalidate\` ran must **not be reused** by later fetches, and must **not overwrite** data written by a newer request (the race in the last test).

Tests use fake timers, so \`Date.now()\` only moves when the test advances the clock.

**What the interviewer is looking for:** promise dedupe, clear freshness rules, error paths, and spotting the out-of-order-response race.`,
  starter: queryStarter,
  solution: querySolution,
  tests: queryTests,
  hints: [
    'One entry per key: `{ hasData, data, updatedAt, invalidated, promise? }`. Check in order: in-flight promise → return it; fresh → `Promise.resolve(data)`; else fetch and store the promise on the entry.',
    'Fresh means `hasData && !invalidated && Date.now() - updatedAt < staleTime`. Clear `entry.promise` in BOTH the success and the error handler; only write `data`/`updatedAt` on success.',
    'For the race: `invalidate` also clears `entry.promise`. In the request\'s `.then`, only write to the entry if `entry.promise === thisRequest` — a superseded request still resolves for its own callers but leaves the cache alone.',
  ],
  explanation: `**Approach:** a \`Map<key, Entry>\`. The in-flight promise doubles as a **"latest request" token**: only the request currently stored on the entry may write its result. \`new Promise((resolve) => resolve(fetcher()))\` calls the fetcher synchronously but turns a synchronous throw into a rejection, so the error path is uniform. All operations are O(1).

**How this maps to TanStack Query:**
- **Query keys** are arrays hashed deterministically (object keys sorted), so \`['todos', { page: 1, status: 'open' }]\` equals the same key with properties in a different order. Hierarchical keys enable \`invalidateQueries({ queryKey: ['todos'] })\` to hit every todos query by prefix.
- **\`staleTime\`** (default 0) decides *whether to refetch*. **\`gcTime\`** (default 5 min) is separate: when the last observer (mounted \`useQuery\`) unsubscribes, a timer starts, and the entry is deleted when it fires — that's memory management, not freshness.
- **Invalidation** marks queries stale and immediately refetches the *active* ones; by default it cancels an in-flight fetch for that query (\`cancelRefetch\`) — the same race you just handled.
- **Cancellation:** the \`queryFn\` receives an \`AbortSignal\`; pass it to \`fetch\` so superseded requests stop using bandwidth.
- Plus retries with exponential backoff, refetch on window focus/reconnect, structural sharing, and observers that notify components through \`useSyncExternalStore\`.

**Follow-ups you may get:**
- *"Add \`subscribe(key, listener)\` so React can use it."* → keep a listener set per entry, notify after writes; a \`useQuery\` hook reads the entry via \`useSyncExternalStore\` and calls \`fetch\` in an effect when the entry is stale.
- *"Implement gcTime."* → count subscribers per entry; when it drops to 0, \`setTimeout(() => entries.delete(key), gcTime)\`; clear that timer if someone subscribes again.
- *"Why not cache errors?"* → the next attempt should retry; TanStack keeps the error in state for display but still refetches on the next trigger.`,
};

// ---------------------------------------------------------------------------
// Day
// ---------------------------------------------------------------------------

const day: Day = {
  number: 7,
  title: 'React III: Modern React, Performance & the Ecosystem',
  tagline: 'Concurrent rendering, React 19 Actions, Server Components — and performance and state decisions you can defend.',
  summary:
    'Senior React interviews probe whether you understand *modern* React: interruptible rendering with transitions and Suspense, React 19 Actions, how SSR, hydration and Server Components fit together, and how to make a slow app fast without sprinkling `useMemo` everywhere. Today you learn the mental models and vocabulary, then build the pieces yourself: memoized rows, a virtual list, a selector store on `useSyncExternalStore`, an optimistic toggle and a TanStack-style query cache.',
  objectives: [
    'Explain concurrent rendering and choose between useTransition, useDeferredValue, Suspense and debounce',
    'Use React 19 Actions: useActionState, useOptimistic, useFormStatus and <form action>',
    'Explain why use(promise) needs a cached promise and where such promises come from',
    'Compare CSR, SSR, SSG and streaming SSR; debug hydration mismatches; distinguish RSC from SSR',
    'Apply the performance ladder (profile → restructure → memo with stable props) and explain what React Compiler changes',
    'Classify state as server, URL, local, shared or derived and justify a state-management choice',
    'Build memoized rows, a virtual list, a selector store, an optimistic toggle and a query cache in TypeScript',
  ],
  skills: ['react', 'react-advanced', 'performance', 'typescript', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'spaced-review',
      title: 'Warm-up: spaced review',
      minutes: 15,
      intro:
        'Flashcards from earlier days. Pay extra attention to Day 5–6 React cards (render vs commit, batching, keys, effects, `useSyncExternalStore`, context) — today builds directly on them. Say each answer out loud before flipping.',
    },
    {
      kind: 'lesson',
      id: 'concurrent-react-19',
      title: 'Concurrent React & React 19: transitions, Suspense, Actions',
      minutes: 40,
      body: concurrentReact19,
      checks: [
        {
          id: 'transition-controlled-input',
          prompt:
            'Typing in a search box that filters a 20k-row table feels laggy. A teammate changes the input to `onChange={(e) => startTransition(() => setQuery(e.target.value))}` with `<input value={query} />`. What is the problem?',
          choices: [
            'Nothing — this is the recommended fix',
            "The input's own value update is now non-urgent, so the controlled input can lag behind typing; keep `setQuery` urgent and move only the table's filter state (or a deferred value) into the transition",
            '`startTransition` cannot be called from event handlers',
            'In React 19, transitions only accept async functions',
          ],
          answer: 1,
          explanation:
            'A controlled input must update **synchronously**, or the text you see lags (and can lose characters). React\'s docs are explicit: don\'t use a transition for a text input\'s controlled value. Split the state: `setQuery` urgent for the input, `startTransition(() => setFilter(value))` for the expensive table — or keep one state and pass `useDeferredValue(query)` to a memoized table. Transitions *can* be started from event handlers (that\'s their main use), and React 19 accepts both sync and async functions.',
        },
        {
          id: 'use-promise-in-render',
          prompt: 'What happens when this Client Component renders?',
          code: `function Profile({ id }: { id: string }) {
  // fetchUser returns a NEW Promise every time it is called
  const user = use(fetchUser(id));
  return <h1>{user.name}</h1>;
}`,
          codeLang: 'tsx',
          choices: [
            'It suspends once, then renders the user',
            'Every retry calls `fetchUser` again and gets a new pending promise, so it keeps suspending (React warns about an uncached promise)',
            'TypeScript error: `use` only accepts a Context',
            'It throws because `use` cannot be called in Client Components',
          ],
          answer: 1,
          explanation:
            'A suspended render is **thrown away**; when the promise settles, React re-renders the component from scratch — no state or memoized values survive, because the component never committed. That fresh render calls `fetchUser(id)` again and gets a **new** pending promise, so it suspends again. The promise must be stable: from a cache, a Suspense-enabled library (`useSuspenseQuery`), a framework loader, or a parent Server Component. `use` accepts promises *and* context, and works in Client Components.',
        },
        {
          id: 'form-status-placement',
          prompt: 'Why is `pending` always `false` here, even while `subscribe` is running?',
          code: `import { useFormStatus } from 'react-dom';

function NewsletterForm() {
  const { pending } = useFormStatus();
  return (
    <form action={subscribe}>
      <input name="email" type="email" aria-label="Email" />
      <button disabled={pending}>Subscribe</button>
    </form>
  );
}`,
          codeLang: 'tsx',
          choices: [
            '`useFormStatus` only works when `action` is a Server Function',
            'The action must be wrapped with `useActionState` first',
            '`useFormStatus` reads the status of a **parent** `<form>`; this component renders the form itself, so there is no parent form. Move the button into a child component rendered inside the form',
            '`pending` only becomes true for forms with `method="post"`',
          ],
          answer: 2,
          explanation:
            '`useFormStatus` works like reading a context provided by `<form>`: it only sees a form **above** the calling component. Extract `<SubmitButton />` and call the hook there. It works with any function action (client or server), doesn\'t need `useActionState`, and `method` is irrelevant for function actions.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'server-rendering-rsc',
      title: 'Server rendering, hydration & React Server Components',
      minutes: 35,
      body: serverRenderingRsc,
      checks: [
        {
          id: 'client-component-ssr',
          prompt:
            'In a Next.js App Router page, `<Counter />` comes from a file that starts with `\'use client\'`. On the **first** request, what does the browser receive for it?',
          choices: [
            'Nothing — Client Components only render in the browser after the JS loads',
            'Only its JS; the HTML is generated on the client',
            "Its server-rendered HTML in the initial response, plus a reference in the RSC payload and its JS chunk so it can hydrate",
            'Only its HTML — Client Components never ship JavaScript',
          ],
          answer: 2,
          explanation:
            '"Client Component" means *also runs in the browser*, not *only* runs there. On the initial load, SSR renders Server **and** Client Components to HTML, so `Counter`\'s markup is in the response; its code is shipped so it can **hydrate** and become interactive. Server Components are the ones that ship no JS. Option D describes Server Components, A and B describe pure CSR.',
        },
        {
          id: 'server-to-client-props',
          prompt: 'A Server Component renders a Client Component `<Chart … />`. Which prop **cannot** be passed?',
          choices: [
            '`points={await getPoints()}` — an array of plain objects with `Date` fields',
            '`pointsPromise={getPoints()}` — a promise that is not awaited',
            '`legend={<Legend items={items} />}` — a JSX element',
            '`formatTick={(v: number) => v.toFixed(1)}` — an inline arrow function',
          ],
          answer: 3,
          explanation:
            'Props crossing the server→client boundary must be serializable by React. Plain functions are not (the code lives on the server); the only functions that can cross are **Server Functions** (`\'use server\'`), which become references the client can call over the network. Arrays of plain objects with `Date`s, promises (read with `use()` on the client — this is how data streams) and JSX elements are all supported. Fix: pass a format string/option, or define `formatTick` inside the Client Component.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'performance-state-management',
      title: 'React performance & choosing state management',
      minutes: 35,
      body: performanceStateManagement,
      checks: [
        {
          id: 'memo-children-prop',
          prompt: '`Card` is wrapped in `memo`. `Page` re-renders on every keystroke. Does `Card` re-render?',
          code: `const Card = memo(function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2>{title}</h2>{children}</section>;
});

function Page({ query }: { query: string }) {
  return (
    <>
      <SearchBox value={query} />
      <Card title="Tips"><p>Use quotes for exact matches.</p></Card>
    </>
  );
}`,
          codeLang: 'tsx',
          choices: [
            'No — `title` is a constant string, so `memo` skips it',
            'No — React compares JSX children structurally',
            'Yes — `children` is a new JSX element object on every render of `Page`, so the shallow prop comparison fails',
            'Only in development, because of StrictMode',
          ],
          answer: 2,
          explanation:
            '`<p>…</p>` compiles to a function call that creates a **new element object** each time `Page` renders, and `memo` compares props with `Object.is`, not structurally. So `children` always differs and `memo` does nothing. Options: hoist the static element to a module constant, have `Card` take data instead of children, or accept the re-render (it\'s cheap). React Compiler would memoize the element automatically.',
        },
        {
          id: 'staletime-vs-gctime',
          prompt:
            'TanStack Query with `staleTime: 60_000` and `gcTime: 300_000`. A user opens /todos, navigates away (nothing else uses the query) and returns **2 minutes** later. What happens?',
          choices: [
            'A loading spinner and a fresh fetch — the entry was removed from the cache',
            'Cached todos render instantly and a background refetch starts: the data is stale (older than 60 s) but still cached (unused for less than 5 min)',
            'Cached todos render and no request is made, because `gcTime` has not elapsed',
            'An error, because the query was garbage-collected',
          ],
          answer: 1,
          explanation:
            '`staleTime` controls **freshness** (whether to refetch); `gcTime` controls how long an **unused** entry stays in memory. After 2 minutes the entry still exists (120 s < 300 s), so the user sees data instantly, but it\'s stale (120 s > 60 s), so mounting triggers a background refetch — stale-while-revalidate. Option C confuses the two settings; A would happen after more than 5 minutes.',
        },
        {
          id: 'context-rerender-scope',
          prompt:
            'An `AppContext` value is `{ user, theme, cursor }`, and `cursor` updates on every mouse move. `<Avatar>` only reads `user` via `use(AppContext)`. What happens?',
          choices: [
            'Avatar re-renders on every mouse move — any change to the context value re-renders every consumer; move `cursor` to its own context or a store with selectors',
            'Avatar never re-renders — React tracks which fields a consumer reads',
            'Wrapping Avatar in `memo` stops the re-renders',
            'Avatar re-renders only if it is a direct child of the provider',
          ],
          answer: 0,
          explanation:
            'Context has no selectors: when the provider\'s `value` is a new object, **every** component that reads that context re-renders, regardless of which field it uses, and `memo` doesn\'t block context-driven renders. Split fast-changing data into its own context (or keep it local), memoize the provider value, or move high-frequency shared state into a store with selectors (Zustand, Redux, `useSyncExternalStore`).',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'modern-react-quiz',
      title: 'Quiz: modern React, rendering & state',
      minutes: 15,
      intro: 'Commit to an answer before revealing. Read the explanation even when you were right — the wrong options are the misconceptions interviewers listen for.',
      questions: [
        {
          id: 'defer-without-memo',
          prompt: 'Typing is still laggy after adding `useDeferredValue`. Why?',
          code: `function Search({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
      <SlowResults items={items} query={deferredQuery} />
    </>
  );
}

function SlowResults({ items, query }: { items: Item[]; query: string }) {
  /* filters and renders 20k items */
}`,
          codeLang: 'tsx',
          choices: [
            '`useDeferredValue` needs a delay argument, e.g. `useDeferredValue(query, 300)`',
            'The input must be uncontrolled for deferred values to work',
            '`SlowResults` is not memoized, so the urgent render (which still passes the old `deferredQuery`) re-renders it anyway — wrap it in `memo`',
            '`useDeferredValue` only works inside a Suspense boundary',
          ],
          answer: 2,
          explanation:
            'On each keystroke React first does an **urgent** render with the *old* deferred value. Without `memo`, `SlowResults` re-renders in that urgent pass anyway (its parent rendered), so typing still blocks. With `memo`, the urgent render skips it (same props), and the expensive render happens in the interruptible background pass. The second argument of `useDeferredValue` is an **initial value** (React 19), not a delay — there is no delay. Suspense is optional.',
        },
        {
          id: 'transition-keeps-old-ui',
          prompt:
            'A tab switch runs `startTransition(() => setTab(\'reviews\'))`. The Reviews tab suspends while its data loads, and the tabs sit inside an already-visible `<Suspense fallback={<Spinner />}>`. What does the user see while it loads?',
          choices: [
            'The current tab stays on screen (with `isPending` true) until Reviews is ready; the fallback is not shown',
            'The Spinner fallback replaces the current tab immediately',
            'A blank area until the data arrives',
            'An error, because transitions cannot suspend',
          ],
          answer: 0,
          explanation:
            'Because the update is a transition, React avoids hiding **already-revealed** content behind a fallback: it keeps the old UI, sets `isPending`, and prepares the new tab in the background. Without the transition (a plain `setTab`), the boundary would switch to the Spinner — the jarring "flash" transitions exist to prevent. Newly mounted Suspense boundaries inside the new tab can still show their own fallbacks.',
        },
        {
          id: 'lazy-inside-component',
          prompt: 'What is wrong with this code?',
          code: `function Dashboard() {
  const Chart = lazy(() => import('./Chart'));
  const [range, setRange] = useState('7d');
  return (
    <Suspense fallback={<Spinner />}>
      <Chart range={range} />
      <RangePicker value={range} onChange={setRange} />
    </Suspense>
  );
}`,
          codeLang: 'tsx',
          choices: [
            'Nothing — `lazy` can be called anywhere',
            '`lazy` requires a named export',
            'The Suspense boundary must be outside `Dashboard`',
            'Every render creates a **new** lazy component type, so `Chart` remounts (losing its state) and suspends again on every range change — declare it at module top level',
          ],
          answer: 3,
          explanation:
            'React identifies components by **type** (reference). A new `lazy(...)` per render is a different type each time, so React unmounts the old `Chart`, mounts a new one and suspends while it "loads". Declare lazy components at module scope. `lazy` needs a module with a **default** export (map a named export with `.then((m) => ({ default: m.Chart }))`), and the boundary may be inside the component.',
        },
        {
          id: 'use-conditional',
          prompt: 'Which of these may be called inside an `if` block in a component?',
          choices: ['`useContext`', '`use`', '`useState`', '`useFormStatus`'],
          answer: 1,
          explanation:
            '`use` (React 19) is an API, not a hook in the "same order every render" sense: it may be called conditionally and in loops (still only in components/hooks, and not inside `try/catch`). That\'s also why `use(Context)` can replace `useContext` after an early return. All the others are hooks and must be called unconditionally at the top level.',
        },
        {
          id: 'optimistic-revert',
          prompt:
            'With `const [shown, addOptimistic] = useOptimistic(likes, (n, delta: number) => n + delta)`, an Action calls `addOptimistic(1)`, then `await api.like()` throws. The error is caught inside the Action and `likes` is never updated. What does the UI show once the Action finishes?',
          choices: [
            '`likes + 1` — optimistic values persist until you reset them',
            '`likes + 1` until the parent re-renders for another reason',
            '`likes` — when the Action ends, the optimistic state falls back to the passthrough value, so the rollback is automatic',
            'The nearest error boundary',
          ],
          answer: 2,
          explanation:
            'An optimistic value lives only while its Action/transition is pending. When the Action settles, `useOptimistic` returns the passthrough value (`likes`) again. If the request succeeded you would have updated `likes`, so the UI stays at the new value; if it failed, you didn\'t, so it reverts. The error boundary is only involved if the error escapes the Action — here it was caught.',
        },
        {
          id: 'use-server-meaning',
          prompt: 'What does the `\'use server\'` directive mark?',
          choices: [
            'Server Functions: async functions that run on the server and can be called from the client — effectively public network endpoints',
            'Server Components — components that must only render on the server',
            'Modules that should be server-side rendered to HTML',
            'Code to exclude from the server bundle',
          ],
          answer: 0,
          explanation:
            'Server Components need **no** directive — they are the default in an RSC framework. `\'use server\'` (top of a file, or first line of an async function) marks **Server Functions**: the client receives a reference, and calling it sends the serialized arguments to the server. Because anyone can call that endpoint, validate inputs and check authorization inside every Server Function. `\'use client\'` is the directive that marks the client boundary.',
        },
        {
          id: 'rsc-import-rule',
          prompt:
            'A `\'use client\'` file `Tabs.tsx` does `import { ProductReviews } from \'./ProductReviews\'`, where `ProductReviews` is an `async` component that queries the database. What happens?',
          choices: [
            'It works: React detects the Server Component and renders it on the server',
            'It works, with a hydration warning',
            '`ProductReviews` renders on the server and `Tabs` on the client',
            '`ProductReviews` becomes part of the client module graph — it would run in the browser, where async components and database access aren\'t supported. Render it in a Server Component and pass it into `Tabs` as `children`/a prop',
          ],
          answer: 3,
          explanation:
            '`\'use client\'` marks a module boundary: everything a client module **imports** is client code. A Client Component can\'t import a Server Component, but it can **receive** server-rendered output as props: `<Tabs reviews={<ProductReviews id={id} />} />` in a Server Component. The "server-only" package turns such accidental imports into build errors.',
        },
        {
          id: 'hydration-date-fix',
          prompt:
            '`<p>Last updated {new Date(post.updatedAt).toLocaleString()}</p>` causes hydration errors for some users. What is the best fix?',
          choices: [
            'Put `suppressHydrationWarning` on the root `<html>` element',
            'Render `typeof window !== \'undefined\' ? date.toLocaleString() : \'\'`',
            'Format deterministically (explicit locale and `timeZone`, or a string formatted on the server); if you want the user\'s local time, switch to it after hydration with a two-pass render',
            'Disable SSR for the whole page',
          ],
          answer: 2,
          explanation:
            '`toLocaleString()` depends on the runtime\'s locale and time zone, which differ between server and browser. Making the first render deterministic fixes the cause; a two-pass render (`useSyncExternalStore` with a server snapshot, or a mounted flag) then upgrades to local time. `suppressHydrationWarning` works only **one level deep** (on the `<p>` itself it would be acceptable for a timestamp, on `<html>` it does nothing here). The `typeof window` branch *creates* a mismatch, and disabling SSR throws away its benefits for one line of text.',
        },
        {
          id: 'selective-hydration-click',
          prompt:
            'A streamed page has a sidebar and a comments section, each in its own Suspense boundary. The comments are visible but not hydrated yet when the user clicks "Like" in them. What does React 18+/19 do?',
          choices: [
            'The click is lost; the user must click again after hydration',
            'React hydrates the whole page synchronously, then handles the click',
            'React prioritizes hydrating the comments boundary, then replays the click on the hydrated component',
            'The browser\'s default action runs and React ignores the event',
          ],
          answer: 2,
          explanation:
            'This is **selective hydration**: boundaries hydrate independently and interruptibly, and React raises the priority of the boundary the user interacts with. For discrete events like clicks, React records the event and **replays** it once that boundary is hydrated. It requires `hydrateRoot` plus Suspense boundaries around the regions.',
        },
        {
          id: 'usecallback-without-memo',
          prompt: 'In which case does `useCallback` actually prevent work?',
          choices: [
            '`onSelect` passed to a child wrapped in `memo` whose other props are also stable',
            '`onClick` passed directly to a `<button>`',
            '`onChange` passed to a child that is **not** memoized',
            'A handler used only within the same component\'s JSX',
          ],
          answer: 0,
          explanation:
            '`useCallback` only preserves a function\'s identity; that saves work only if something **compares** it — a `memo` child (and all its other props must be stable too), or a hook dependency array. DOM elements and non-memoized children re-render regardless, so in B–D it is pure overhead (an extra hook call and dependency comparison).',
        },
        {
          id: 'compiler-rules',
          prompt: 'React Compiler assumes the Rules of React. Which component breaks them?',
          choices: [
            'One that computes `const total = items.reduce((s, i) => s + i.price, 0)` during render',
            'One that passes an inline arrow: `onClick={() => setOpen(true)}`',
            'One that returns early before its JSX when `items` is empty',
            'One that calls `props.items.sort(byPrice)` during render',
          ],
          answer: 3,
          explanation:
            '`Array.prototype.sort` sorts **in place**, mutating a prop — props must be treated as immutable, and the compiler (like memoization in general) assumes values don\'t change behind its back. Use `props.items.toSorted(byPrice)` or `[...props.items].sort(byPrice)`. Deriving values in render, inline handlers and early returns are all fine — the compiler memoizes them (even after early returns, which manual hooks can\'t).',
        },
        {
          id: 'invalidate-queries-prefix',
          prompt: 'After `addTodo` succeeds you call `queryClient.invalidateQueries({ queryKey: [\'todos\'] })`. What happens?',
          choices: [
            'All todo entries are deleted and the list shows a loading spinner',
            'Every query whose key **starts with** `[\'todos\']` is marked stale; the ones currently in use refetch in the background while still showing their old data',
            'Only the exact key `[\'todos\']` refetches; `[\'todos\', { status: \'done\' }]` is untouched',
            'Nothing happens until the window regains focus',
          ],
          answer: 1,
          explanation:
            'Invalidation matches keys by **prefix** by default (`exact: true` restricts it), marks them stale and immediately refetches **active** queries (those with mounted observers); inactive ones refetch the next time they\'re used. Data isn\'t removed, so there\'s no spinner — that\'s stale-while-revalidate. `removeQueries`/`resetQueries` are the APIs that drop data.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'performance-state-builds',
      title: 'Build it: memoization, virtualization, stores & server state',
      minutes: 60,
      intro:
        "Interview conditions: timer on, talk out loud, no AI. Order matters: the windowing math feeds the VirtualList, and the memo exercise sets up the vocabulary for the store. Do the first five; the query cache is the stretch. After passing each one, read the explanation's follow-ups and answer them out loud — that's where the interview is won.",
      exercises: [visibleRange, memoRows, virtualList, selectorStore, optimisticLike, queryCache],
    },
    {
      kind: 'drill',
      id: 'speak-aloud-react-iii',
      title: 'Speak-aloud drill: modern React',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–120 seconds before revealing the model answer. Lead with a one-sentence answer, then mechanism, then a trade-off or example. Flag versions ("in React 19…", "in Next 15+…") — it signals precision.',
    },
  ],
  flashcards: [
    {
      id: 'concurrent-rendering-meaning',
      front: 'What does **concurrent rendering** mean in React?',
      back: 'The render phase is **interruptible and prioritized**: React works in small units, yields to the browser, lets urgent updates jump ahead and discards stale work. Commits stay atomic. Still single-threaded; opt-in per update (transitions, deferred values, Suspense).',
    },
    {
      id: 'use-transition-returns',
      front: 'What does `useTransition()` return, and what does `startTransition(fn)` do?',
      back: '`[isPending, startTransition]`. `startTransition` runs `fn` **synchronously** and marks the state updates inside as non-urgent transitions. React 19: `fn` may be async (an Action); `isPending` stays true until it settles.',
    },
    {
      id: 'transition-vs-deferred-value',
      front: '`useTransition` vs `useDeferredValue`?',
      back: '`useTransition` wraps the **update** (you own the setter; gives `isPending`). `useDeferredValue` wraps a **value** you receive (staleness = `value !== deferred`; `memo` the slow child). Neither debounces: no delay, no less work — just interruptible rendering.',
    },
    {
      id: 'transition-input-rule',
      front: 'Can a controlled input\'s own value update go inside `startTransition`?',
      back: 'No — input updates must be urgent. Split state: an urgent `query` for the `<input>`, and a transition (or `useDeferredValue`) for the expensive consumer.',
    },
    {
      id: 'use-promise-must-be-cached',
      front: 'Why must the promise passed to `use()` come from a cache, library, framework or parent Server Component?',
      back: 'A suspended render is **discarded and retried from scratch** (no state survives). Creating the promise in render makes a new pending promise on every retry, so it suspends forever.',
    },
    {
      id: 'use-action-state-signature',
      front: '`useActionState` signature?',
      back: '`const [state, dispatch, isPending] = useActionState(action, initialState, permalink?)`, where `action(prevState, payload)` returns the next state (sync or async). Use `dispatch` as a form `action` or inside `startTransition`. Calls are queued in order.',
    },
    {
      id: 'use-form-status-placement',
      front: 'Where must `useFormStatus` be called?',
      back: 'In a component rendered **inside** the `<form>` — it reads the parent form, like a context. Imported from `react-dom`; returns `{ pending, data, method, action }`.',
    },
    {
      id: 'use-optimistic-rollback',
      front: 'How does `useOptimistic` roll back on failure?',
      back: 'The optimistic value exists only while its Action/transition is pending. When it ends, the hook returns the passthrough state again — if you never committed the new real state, the UI reverts automatically.',
    },
    {
      id: 'hydration-definition',
      front: 'What is **hydration**?',
      back: 'Rendering the tree on the client and **attaching** to the server-rendered DOM — reusing nodes and adding event handlers instead of recreating them. The client\'s first render must match the server HTML.',
    },
    {
      id: 'hydration-mismatch-causes',
      front: 'Most common hydration-mismatch causes?',
      back: 'Dates/locales/time zones, `Math.random`/generated ids (use `useId`), `typeof window` branches, `localStorage`/`matchMedia` in render, invalid HTML nesting (`<div>` in `<p>`), browser extensions, client refetching different data.',
    },
    {
      id: 'server-vs-client-component',
      front: 'Server Component vs Client Component?',
      back: 'Server: runs only on the server, can be `async` and hit the DB, ships **zero JS**, no state/effects/handlers. Client (`\'use client\'`): SSR\'d **and** hydrated, can use state, effects and events.',
    },
    {
      id: 'rsc-vs-ssr-one-liner',
      front: 'RSC vs SSR in one sentence?',
      back: 'SSR is a **rendering strategy** (HTML for first paint, then hydrate everything); RSC is a **component type** (runs only on the server, never hydrates, ships no code). Orthogonal — usually combined.',
    },
    {
      id: 'rsc-serializable-props',
      front: 'What can cross the Server → Client Component props boundary?',
      back: '✅ Primitives, plain objects/arrays, `Date`, `Map`, `Set`, typed arrays, **Promises**, **JSX**, **Server Functions**. ❌ Plain functions, class instances, null-prototype objects, local symbols.',
    },
    {
      id: 'use-server-directive',
      front: 'What does `\'use server\'` mark?',
      back: '**Server Functions** — server-side async functions callable from the client. They are public endpoints: validate input and authorize every call. Not Server Components (those need no directive).',
    },
    {
      id: 'memo-inline-props-trap',
      front: 'Why does `<Row style={{…}} onClick={() => …} />` defeat `memo`?',
      back: '`memo` compares each prop with `Object.is`. Inline objects, arrays, functions and JSX are **new references** every render, so the props never compare equal.',
    },
    {
      id: 'react-compiler-assumptions',
      front: 'What does React Compiler need from your code?',
      back: 'The Rules of React: pure, idempotent renders; immutable props/state/hook values; no `ref.current` reads/writes during render; hooks at the top level. It auto-memoizes; on a detected violation it skips that component.',
    },
    {
      id: 'stale-time-vs-gc-time',
      front: 'TanStack Query `staleTime` vs `gcTime`?',
      back: '`staleTime` (default 0): how long data is **fresh** — no refetch. `gcTime` (default 5 min; `cacheTime` before v5): how long an **unused** entry stays in memory before it\'s removed.',
    },
    {
      id: 'server-state-vs-client-state',
      front: 'Server state vs client state?',
      back: 'Server state: remote, async, shared, can be stale → a cache (TanStack Query, framework data layer). Client state: local, synchronous, yours → `useState`/context/store. Don\'t mirror server data in a client store.',
    },
    {
      id: 'context-fan-out',
      front: 'Why is Context a poor fit for fast-changing global state?',
      back: 'No selectors: **every** consumer re-renders when the value changes, and `memo` doesn\'t block it. Use Context for low-frequency values; use a selector-based store (`useSyncExternalStore`) for high-frequency data.',
    },
    {
      id: 'virtualization-how',
      front: 'How does list virtualization work?',
      back: 'Render only the visible rows + overscan, absolutely positioned inside a **sizer** with the full height; recompute the window on scroll. Trade-offs: dynamic heights need measuring, find-in-page/a11y (`aria-setsize`/`aria-posinset`).',
    },
  ],
  interviewQuestions: [
    {
      id: 'explain-concurrent-rendering',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'What is concurrent rendering in React, and what problem does it solve?',
      answer: `**One-liner:** concurrent rendering makes React's render phase interruptible and prioritized, so urgent updates like typing stay responsive while expensive, non-urgent rendering happens in the background.

**The problem:** before React 18, rendering was synchronous — once React started rendering an update it ran to completion, so a 200 ms list render blocked input for 200 ms.

**How it works:** React renders in small units of work and yields to the browser every few milliseconds. Each update has a priority: discrete input is urgent, transitions are not. If an urgent update arrives mid-transition, React handles it first and throws away or restarts the stale in-progress work with the latest state. The commit phase is still synchronous and atomic, so users never see a half-rendered tree.

**What it's not:** it's not multi-threading — it's time-slicing on the main thread, so one slow component still blocks. And it's opt-in per update: \`startTransition\`, \`useDeferredValue\` and Suspense opt work in; a normal click handler's \`setState\` is still urgent.

**Consequences I design for:** renders must be pure because they can run more than once or be discarded (StrictMode double-invokes to catch this); external mutable stores need \`useSyncExternalStore\` to avoid tearing; and transitions plus Suspense let React prepare the next screen while the current one stays visible.

**Example:** a search over 20k rows — the input state stays urgent and the filtered list renders in a transition, so typing never stutters.`,
      followUps: [
        'Is a 300 ms component render interruptible?',
        'What is tearing and how does useSyncExternalStore prevent it?',
        'Why does StrictMode render components twice in development?',
      ],
    },
    {
      id: 'transition-vs-deferred-value',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'When do you use `useTransition` versus `useDeferredValue`? How do they differ from debouncing?',
      answer: `**One-liner:** both mark rendering work as non-urgent; \`useTransition\` wraps the *state update*, \`useDeferredValue\` wraps a *value*.

**useTransition** — when I own the setter: \`startTransition(() => setFilter(q))\`. I get \`isPending\` for inline feedback, and if the update suspends, React keeps the old UI on screen instead of flashing a fallback — ideal for tab switches and navigation. In React 19 the callback can be async, which makes it an Action and keeps \`isPending\` true for the whole request; updates after an \`await\` need another \`startTransition\`.

**useDeferredValue** — when the value comes from props or a hook I don't control. React renders first with the old value, then re-renders in the background with the new one. I show staleness with \`value !== deferredValue\`, and the slow child must be wrapped in \`memo\`, otherwise the urgent render re-renders it anyway.

**Rule for inputs:** never put a controlled input's own value in a transition; split the urgent input state from the deferred consumer.

**vs debounce/throttle:** they aren't timing tools. There's no fixed delay — on a fast machine the background render happens immediately — and they don't reduce work; they make rendering interruptible. Debounce is still the right tool for cutting network requests or analytics calls. In a search box I'd often combine them: debounce the fetch, defer the render.`,
      followUps: [
        'What does the second argument of useDeferredValue do in React 19?',
        'Why must the slow child be memoized?',
        'What happens if a transition update suspends?',
      ],
    },
    {
      id: 'suspense-for-data',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'How does Suspense work for data fetching in React 19? Why can\'t you just write `use(fetch(url))` inside a component?',
      answer: `**One-liner:** a component suspends when it reads data that isn't ready, and the nearest \`<Suspense>\` boundary shows a fallback until it is; in React 19, \`use(promise)\` is the official way to suspend on data.

**Mechanics:** when \`use\` receives a pending promise, React stops rendering that component, shows the nearest boundary's fallback — or, inside a transition, keeps the existing UI — and retries when the promise settles. A rejection goes to the nearest error boundary. Unlike hooks, \`use\` can be called conditionally.

**Why not \`use(fetch(url))\`:** a component that suspends before committing has no preserved state, so React throws that render away and retries from scratch. If the render creates the promise, every retry creates a new pending promise and suspends again — React 19 warns about "an uncached promise". The promise must be stable, so it's created outside the render: by a Suspense-enabled library that owns a cache (TanStack Query's \`useSuspenseQuery\`, Relay), a framework loader, or a Server Component that starts the fetch and passes the promise as a prop, so the data streams to the client.

**Design:** boundary placement is UX design — one boundary per independently loading region, nested so content reveals progressively instead of a spinner per widget. Boundaries are also the units of streaming SSR and selective hydration.

**Code splitting** uses the same mechanism: \`lazy(() => import('./Chart'))\` at module scope.

**Version note:** in React 19 a suspending component commits its fallback immediately and pre-warms its siblings afterwards.`,
      followUps: [
        'How do errors from a rejected promise surface?',
        'How do transitions change what Suspense shows?',
        'Why must lazy() be called at module scope?',
      ],
    },
    {
      id: 'rsc-vs-ssr',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'What\'s the difference between server-side rendering and React Server Components?',
      answer: `**One-liner:** SSR is a *rendering strategy* — produce HTML on the server for the first paint; Server Components are a *component type* — components that only ever run on the server and ship no JavaScript.

**SSR:** the server renders the tree to HTML, the browser paints it, then downloads the JS for *every* component and hydrates. All component code ships, and the page isn't interactive until hydration.

**RSC:** Server Components run at build or request time, can be async and query the database directly, and output a serialized React tree — the RSC payload — not HTML. Their code and dependencies (markdown parsers, date libraries, the ORM) never reach the bundle. Interactive parts are Client Components behind a \`'use client'\` module boundary; props crossing it must be serializable: plain data, Dates, Maps, promises, JSX and Server Functions, but not ordinary functions or class instances.

**How they combine:** in the Next.js App Router, on the first load the server produces the RSC payload and SSR turns both server and client components into HTML; only the client components hydrate. On client-side navigation there's no HTML — the router fetches a new RSC payload and React merges it in, preserving client state.

**Trade-offs:** smaller bundles, data fetching next to the data, no client–server waterfalls — versus serialization constraints, a new "what runs where" mental model, framework coupling and version-specific caching.

**Misconception I'd correct:** \`'use client'\` components still render on the server for the initial HTML.`,
      followUps: [
        'Can a Client Component render a Server Component?',
        'What is in the RSC payload?',
        'What are Server Functions and what are their security implications?',
      ],
    },
    {
      id: 'debug-hydration-mismatch',
      kind: 'debugging',
      level: 'core',
      minutes: 3,
      question: 'Production logs show "Hydration failed because the server rendered text didn\'t match the client." How do you find and fix it?',
      answer: `**One-liner:** the client's first render produced different output than the server HTML, so I find what differs between the two environments and make the first render deterministic.

**Find it:** React 19 logs a diff of the mismatch — I start there. Then I reproduce with a production build, compare View Source (server HTML) with the live DOM, and check whether it's user-specific: time zone, locale, auth state, or a browser extension (incognito test).

**Usual causes:**
- Dates and numbers formatted with the runtime's locale/time zone.
- \`Math.random()\`, \`Date.now()\` or UUIDs used for ids — \`useId\` exists for this.
- \`typeof window\` checks or \`localStorage\`/\`matchMedia\` reads during render.
- Invalid HTML nesting such as a \`<div>\` inside a \`<p>\` — the browser's parser rewrites it.
- The client refetching newer data than the server rendered; extensions or CDNs rewriting HTML.

**Fixes, best first:** make output deterministic — explicit \`timeZone\`, server-provided data, \`useId\`, valid nesting. For genuinely client-only values, render a server-safe placeholder and update after hydration with \`useSyncExternalStore\` and a \`getServerSnapshot\`, or a mounted flag. \`suppressHydrationWarning\` on the single element whose text must differ, like a timestamp. Client-only rendering for a widget that can't SSR. For theme flashes, a tiny blocking script that sets the class on \`<html>\` before paint.

**Why it matters:** React discards the server HTML for that subtree and client-renders it, which costs performance, and attribute mismatches aren't patched at all — users can see wrong UI.`,
      followUps: [
        'Why is `typeof window !== "undefined"` in render a bad fix?',
        'How deep does suppressHydrationWarning apply?',
        'How would you implement dark mode without a flash or a mismatch?',
      ],
    },
    {
      id: 'when-to-memoize',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'When do you use `React.memo`, `useMemo` and `useCallback` — and when don\'t you?',
      answer: `**One-liner:** I memoize when profiling shows a component re-rendering often *and* expensively, and only if I can make its props stable — otherwise memoization is overhead.

**What each does:** \`memo\` skips a component's render when every prop is \`Object.is\`-equal to last time. \`useMemo\` caches a computed value between renders; \`useCallback\` caches a function's identity. They work together: \`useCallback\` only helps if the function goes to a memoized child or into a dependency array.

**Order of operations:** measure with the React DevTools Profiler, with "why did this render" enabled. Try structural fixes first: move state down, pass expensive subtrees as \`children\`, split context. Then \`memo\` the expensive component and stabilize its props — hoist constants, pass primitives or \`useMemo\` derived objects, and \`useCallback\` with functional updates so dependencies stay empty without stale closures.

**Classic traps:** inline objects, arrow functions and JSX \`children\` are new every render, so \`memo\` silently does nothing. \`useCallback(fn, [])\` that reads state is stable but stale. Context changes bypass \`memo\`.

**When not to:** cheap components, values that change every render anyway, \`useCallback\` for handlers passed to DOM elements. Every memo costs memory, comparisons and readability, and wrong dependency arrays cause bugs.

**Modern note:** with React Compiler, most of this is automatic and manual memoization becomes an escape hatch — but you still need the mental model, since the compiler relies on the same rules and many codebases don't use it yet.`,
      followUps: [
        'Why doesn\'t memo help a component that takes children?',
        'How do you keep a callback stable without stale state?',
        'How would you prove a memoization helped?',
      ],
    },
    {
      id: 'react-compiler-impact',
      kind: 'concept',
      level: 'senior',
      minutes: 2,
      question: 'What does React Compiler do, and how does it change the way you write React?',
      answer: `**One-liner:** React Compiler is a build-time optimizer that automatically memoizes components and hooks, so in most code you stop writing \`memo\`, \`useMemo\` and \`useCallback\` by hand.

**What it does:** it analyzes each component's data flow and inserts fine-grained caching: derived values recompute only when their inputs change, callbacks keep stable identities, and JSX elements are reused when their inputs are unchanged, so children bail out of re-rendering. It can memoize things manual hooks can't, like values after an early return.

**What it relies on:** the Rules of React — pure, idempotent rendering; props, state and anything passed to hooks or JSX treated as immutable; no reading or writing \`ref.current\` during render; hooks called unconditionally. When it detects a violation it skips that component — still correct, just unoptimized — and its lint rules in \`eslint-plugin-react-hooks\` surface those problems. \`'use no memo'\` opts a function out.

**What it doesn't change:** algorithmic cost, list virtualization, network waterfalls, context fan-out, or bundle size. Architecture still matters.

**How I'd adopt it:** turn on the lint rules and fix violations first, roll it out incrementally, verify with the Profiler and tests, and leave existing manual memoization in place initially, since removing it can change when effects fire.

**Version note:** 1.0 has been stable since October 2025; it works best with React 19 and supports 17 and 18 through a runtime package.`,
      followUps: [
        'Give an example of code the compiler would refuse to optimize.',
        'Does the compiler make useEffect dependency arrays unnecessary?',
        'Would you remove existing useMemo calls after enabling it?',
      ],
    },
    {
      id: 'choose-state-management',
      kind: 'system-design',
      level: 'senior',
      minutes: 3,
      question: 'How do you decide where state lives and which state-management library to use?',
      answer: `**One-liner:** I classify the state first — server, URL, local UI, shared client, derived — because each category has a different best tool, and most "state management" problems are really server-cache problems.

**Server state** — anything fetched from an API. It's async, shared and can go stale, so it needs caching, deduplication, background refetching and invalidation: TanStack Query, the framework's data layer or Server Components, RTK Query in a Redux codebase, Relay or Apollo for GraphQL. Query keys include every input; \`staleTime\` sets freshness and \`gcTime\` how long unused data stays; mutations invalidate by key prefix.

**URL state** — filters, sorting, pagination, the selected tab: anything that should survive a reload and be shareable goes in search params.

**Derived state** — computed during render, never stored.

**Local UI state** — \`useState\`/\`useReducer\`, colocated, lifted only as far as needed.

**Shared client state** — Context for low-frequency values like theme, locale and the current user. For high-frequency or complex shared state, a store with selectors so only affected components re-render: Zustand for small-to-medium apps, Redux Toolkit when a large team benefits from strict conventions, middleware and devtools, Jotai when state is many independent atoms; XState when flows need explicit states.

**Trade-off:** fewer libraries is better. Once server state lives in a query cache, the remaining global client state is usually small enough for Context or Zustand.

**Example:** in an e-commerce app — products and orders in TanStack Query, filters in the URL, the cart in a persisted Zustand store, theme in Context.`,
      followUps: [
        'Why not keep API data in Redux?',
        'What does staleTime vs gcTime control?',
        'How does a selector store avoid the re-renders Context causes?',
      ],
    },
    {
      id: 'build-virtualized-list',
      kind: 'ui-build',
      level: 'senior',
      minutes: 5,
      question: 'Build (or talk through building) a list component that renders 100,000 rows smoothly. What are the edge cases?',
      answer: `**Clarify first:** fixed or variable row heights? Static data or live updates? Keyboard navigation, find-in-page, infinite loading? List or grid?

**Core design (fixed heights):**
- A scroll container with a fixed height, \`overflow: auto\`, \`role="list"\`, an accessible name and \`tabIndex={0}\`.
- Inside it, a sizer with height \`itemCount × rowHeight\`, so the scrollbar is correct.
- Render only the window plus overscan: \`start = floor(scrollTop / rowHeight) − overscan\`, \`end = ceil((scrollTop + viewportHeight) / rowHeight) + overscan\`, both clamped, with \`scrollTop\` clamped for elastic overscroll and shrinking lists.
- Rows absolutely positioned at \`index × rowHeight\` (or one translated inner container), keyed by item id or absolute index so DOM nodes are reused as the window slides.
- \`scrollTop\` in state from \`onScroll\`; the viewport height measured with a \`ResizeObserver\`.

**Performance:** memoize the row component so a scroll renders only entering rows; keep rows cheap; overscan trades memory for fewer blank flashes during fast scrolling.

**Variable heights:** estimated sizes, measurement with \`ResizeObserver\`, a prefix-sum array of offsets with a binary search for the start index, and scroll correction when rows above the viewport change size.

**Accessibility:** \`aria-setsize\` and \`aria-posinset\` on rows; keep keyboard focus valid when the focused row scrolls out (roving tabindex plus scrolling the active row into view); announce loading for infinite lists.

**Trade-offs:** find-in-page and SEO can't see unrendered rows; scroll restoration on back navigation needs care. Alternatives: pagination, or CSS \`content-visibility: auto\` for moderately long lists. In production I'd use TanStack Virtual or react-virtuoso, but I can build the fixed-height version from scratch.`,
      followUps: [
        'How would you implement scrollToIndex?',
        'How do you handle rows whose height changes after images load?',
        'What changes for a two-dimensional grid?',
      ],
    },
  ],
};

export default day;
