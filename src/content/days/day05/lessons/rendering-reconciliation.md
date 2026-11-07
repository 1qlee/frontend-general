## Why interviewers ask about rendering

"What causes a re-render?" and "Why shouldn't you use the index as a key?" are asked at every level, from junior screens to staff loops. They're popular because the answers separate people who *use* React from people who can *predict* it. A strong answer:

- uses precise vocabulary — **render**, **commit**, **reconciliation**, **element**, **instance**;
- states the actual rules instead of folklore ("a component re-renders when its props change" is folklore);
- connects the rules to real bugs: lost input state, values that are "one behind", effects that fire twice.

This lesson gives you the model. Lessons 2 and 3 build on it, and Day 7 adds concurrency and memoization on top.

## Components, elements and instances

Four words get used interchangeably in casual conversation. In an interview, keeping them apart is a quick signal of depth.

| Term | What it is | Example |
|---|---|---|
| **Component** | A function that returns UI. Think of it as a *type*. | `function TodoItem(props: Props) { … }` |
| **Element** | A plain, immutable object that *describes* what to render: `{ type, props, key }`. JSX creates them. Cheap to make and throw away. | `<TodoItem todo={t} />` |
| **Instance** (a *fiber* internally) | React's record for one component **at one position in the tree**. It holds state, hooks, effects and refs. | What `useState` reads from |
| **DOM node** | The real browser node React manages for host elements such as `<li>` and `<input>`. | `HTMLLIElement` |

JSX is syntax for creating elements. With the automatic runtime (React 17+), `<TodoItem todo={t} />` compiles to roughly `jsx(TodoItem, { todo: t })`, which returns something like:

```tsx
{ $$typeof: Symbol(react.transitional.element), type: TodoItem, key: null, props: { todo: t } }
```

The key fact: **state lives in the instance**. It doesn't live in the component function or the element. On every render React has to decide whether each new element should reuse an existing instance, keeping its state, or get a fresh one. That decision is reconciliation, and it is driven entirely by **type**, **position** and **key**.

## Render and commit

Every screen update goes through three steps:

1. **Trigger.** Either the initial `createRoot(container).render(<App />)` or a state update somewhere in the tree.
2. **Render.** React calls your component functions to get a new element tree and compares it with the previous one (reconciliation). This is pure computation: no DOM changes happen. In concurrent rendering (Day 7) this work can be paused, thrown away or redone.
3. **Commit.** React applies the smallest set of DOM mutations it needs, attaches refs and runs layout effects synchronously. Then the browser paints, and passive effects (`useEffect`) run, usually after the paint.

Two consequences follow, and interviewers like both:

- **A render is not a DOM update.** A component can re-render, return exactly the same JSX, and produce zero DOM mutations. "Re-render" means "React called your function again". It does not mean "the page was repainted".
- **Rendering must be pure.** Given the same props, state and context, a component must return the same JSX and have no side effects: no fetching, no subscribing, no mutating objects that existed before the render. React may call your component more than once per commit (StrictMode, interrupted concurrent renders, Suspense retries), so side effects in render can run an unpredictable number of times.

> [!INTERVIEW] Say it like this
> "A render is React calling my component to get a description of the UI. The commit is React applying the difference to the DOM. Renders are pure and can happen more often than commits. Only the commit touches the DOM, and effects run after it."

## What triggers a render

There is a short, exhaustive list. A component renders when:

1. **It mounts.** This is the first render.
2. **Its own state is updated** through a `useState` setter or a `useReducer` dispatch. If the new value is `Object.is`-equal to the current one, React bails out and skips the render.
3. **Its parent renders.** By default React re-renders **every child** of a rendering component, recursively, **whether or not their props changed**.
4. **A context it reads changed.** If a component reads context with `useContext(Ctx)` or `use(Ctx)` and the provider's `value` changes (compared with `Object.is`), the component re-renders, even when a memoized parent between it and the provider bailed out.
5. **An external store it subscribes to changed.** This goes through `useSyncExternalStore` and is how Redux, Zustand and similar libraries schedule renders (Day 6).

Just as important is what does **not** trigger a render:

| Not a trigger | Why |
|---|---|
| "Its props changed" | Props only change because the **parent rendered** and created new elements. The parent's render is the cause. A child has no way to observe its props changing. |
| Mutating a ref (`ref.current = x`) | Refs are deliberately outside the render cycle. |
| Mutating state in place (`items.push(x); setItems(items)`) | It's the same reference, so `Object.is` reports no change and React bails out. You've also corrupted the previous snapshot. |
| Reassigning a local or module-level variable | React doesn't know about it. |
| Setting state to its current value | Bail-out. |

{{quiz:props-change-cause}}

> [!MISTAKE]
> "A component re-renders when its props change." The precise version is: "A component re-renders when its state changes, when its parent re-renders (regardless of props, by default), or when a context it reads changes. Props only *matter* for skipping a render if the component is wrapped in `memo`."

### The `children` bail-out (composition beats memo)

There is one important case where a parent render does **not** re-render a child: React finds the **exact same element object** in the same position as last time.

```tsx
function App() {
  return (
    <ScrollTracker>
      <ExpensiveTree /> {/* this element is created by App, not by ScrollTracker */}
    </ScrollTracker>
  );
}

function ScrollTracker({ children }: { children: React.ReactNode }) {
  const [y, setY] = useState(0);
  useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div>
      <p>Scrolled {y}px</p>
      {children}
    </div>
  );
}
```

When `ScrollTracker`'s state changes, it re-renders. But `children` is the element `App` created during **App's** last render, and App hasn't rendered again. React sees the identical object at that position and skips `ExpensiveTree` entirely. This is "lifting content up": move the frequently-changing state *down* into a wrapper and pass the expensive part in as `children`. It often removes the need for `memo` (Day 7).

## Reconciliation: how React compares trees

Finding the minimal difference between two arbitrary trees is O(n³). React gets O(n) by relying on a few heuristics:

1. **Different type at the same position: replace the subtree.** If `<div>` becomes `<section>`, or `<Counter>` becomes `<Timer>`, React unmounts the old instance (its effects clean up, its state is destroyed, its DOM is removed) and mounts the new one from scratch, children included.
2. **Same type at the same position: keep the instance.** For a host element React updates only the changed attributes. For a component, React re-renders it with the new props and its **state is preserved**.
3. **Children in a list are matched by `key`.** Without keys React matches them by index.

"Position" means the position in the tree your component *returns*, not where the JSX appears in the source file:

```tsx
// Same type, same position → Counter's state is PRESERVED when isAdmin flips
{isAdmin ? <Counter label="admin" /> : <Counter label="guest" />}

// Two different positions → state is RESET when isAdmin flips
{isAdmin && <Counter label="admin" />}
{!isAdmin && <Counter label="guest" />}
```

In the second version the parent's children are two slots, `[<Counter/>, false]` and then `[false, <Counter/>]`. `false` and `null` still occupy a slot, so the counter has moved from slot 0 to slot 1 and gets a new instance.

### Never define a component inside another component

This is the most common reconciliation bug in take-home and live-coding rounds:

```tsx
function SearchPage() {
  const [query, setQuery] = useState('');

  // ❌ A brand-new function (a brand-new component TYPE) on every render
  function SearchBox() {
    return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
  }

  return <SearchBox />;
}
```

Each keystroke updates `query`, so `SearchPage` re-renders and creates a new `SearchBox` function. Its identity differs from the previous render's `SearchBox`, so heuristic 1 applies: React unmounts the old `<input>` and mounts a new one, and **the input loses focus after every character**. The fix is to define components at module level and pass data through props, or to inline the JSX.

## Keys in depth

A `key` tells React which element in a list corresponds to which instance across renders. The rules:

- Keys must be **unique among siblings**. They don't need to be globally unique.
- They must be **stable**: the same item gets the same key on every render.
- They should come **from the data**, such as a database id or a slug, or be generated **once, when the item is created** (`crypto.randomUUID()` in the "add" handler).
- **Never generate keys during render** (`key={Math.random()}` or `key={crypto.randomUUID()}`). Every render would produce new keys, so every row would remount and lose its state, focus and DOM, and you'd pay for it in performance too.
- `key` is not a prop. The child can't read `props.key`, so pass `id` separately if the child needs it.

### Why index keys break

With `key={index}`, an item's identity is its **position**. When the list is reordered, filtered or has an item inserted or removed anywhere except at the end, positions shift. React keeps the instance (and its DOM node) at each index and simply gives it the props of whichever item now sits there. Any state stored in that instance stays where it was and ends up attached to the wrong item. That includes `useState`, uncontrolled `<input>` values, focus, scroll position and running CSS transitions.

Here's a tiny model of that matching. Run it and compare the two lines:

```ts run
type Item = { id: string; name: string };
type Instance = { note: string; shows: string }; // `note` = state that lives in the instance/DOM

// Match old instances to new items by key: reuse if the key exists, else mount a new one.
function reconcile(prev: Map<string, Instance>, items: Item[], keyOf: (item: Item, i: number) => string) {
  const next = new Map<string, Instance>();
  items.forEach((item, i) => {
    const key = keyOf(item, i);
    const instance = prev.get(key) ?? { note: '', shows: '' };
    instance.shows = item.name; // new props
    next.set(key, instance);
  });
  return next; // instances whose keys disappeared are unmounted
}

const team: Item[] = [
  { id: 'ada', name: 'Ada' },
  { id: 'grace', name: 'Grace' },
  { id: 'linus', name: 'Linus' },
];
const strategies: Array<[string, (item: Item, i: number) => string]> = [
  ['index keys', (_item, i) => String(i)],
  ['id keys   ', (item) => item.id],
];

for (const [label, keyOf] of strategies) {
  let tree = reconcile(new Map(), team, keyOf);
  [...tree.values()].find((inst) => inst.shows === 'Grace')!.note = 'blocked on API'; // user types in Grace's row
  tree = reconcile(tree, team.slice(1), keyOf); // remove Ada
  console.log(label, '→', [...tree.values()].map((inst) => `${inst.shows}: "${inst.note}"`).join(' | '));
}
```

With index keys, Grace's note shows up next to **Linus**. You'll fix exactly this bug in today's exercises.

Index keys are acceptable only when **all** of these are true: the list never reorders or filters, items are only ever appended, and rows have no state (no inputs, no stateful children, no animations). Even then a real id costs nothing. Index keys also hurt performance: prepend one item to a 1,000-row list and every row's props change, so every row re-renders and React patches every row's DOM. With stable keys React inserts one node.

> [!MISTAKE]
> "Index keys are just a performance issue." The main problem is **correctness**: state, uncontrolled input values and focus attach to the wrong item. Performance comes second.

### Using `key` to reset state on purpose

Keys work on **any** element, not just list items. Changing an element's key tells React it's a different thing, so the old instance unmounts (its effects clean up) and a fresh one mounts with its initial state:

```tsx
// When userId changes, the form starts empty — no "reset" effect needed.
<EditProfileForm key={userId} userId={userId} />
```

This is the idiomatic replacement for "an effect that resets state when a prop changes" (Lesson 3). If you need to key a group without a wrapper element, use `<Fragment key={id}>`. The short `<>` syntax can't take a key.

{{quiz:key-reset-form}}

## State as a snapshot

This is the single most useful mental model for predicting React output.

Every render is a function call with its own props, state and event handlers, frozen at that moment. `const [count, setCount] = useState(0)` gives this render a **constant** called `count`. Calling the setter doesn't change that constant. It **queues an update and requests a new render**, and the next call to your component receives the new value.

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1); // setCount(0 + 1)
    setCount(count + 1); // setCount(0 + 1)
    setCount(count + 1); // setCount(0 + 1)
    console.log(count); // 0 — this render's snapshot, forever
  }

  return <button onClick={handleClick}>{count}</button>; // shows 1 after one click
}
```

So "why does `console.log` after `setState` show the old value?" is **not** answered by "because setState is async". `count` is a `const` captured by this render's closure. Nothing could ever change it. The same snapshot rule explains stale closures (Day 1): an interval created in the first render keeps reading the first render's `count`.

### Updater functions and the update queue

When you pass a **function** to the setter, React queues the function itself. During the next render it processes the queue in order:

- a **value** replaces the pending state;
- an **updater function** receives the pending state produced by everything queued before it.

```ts run
type Update<S> = S | ((prev: S) => S);

// Roughly what React does with a component's queue during the next render
function processQueue<S>(base: S, queue: Update<S>[]): S {
  return queue.reduce<S>((state, update) => (typeof update === 'function' ? (update as (prev: S) => S)(state) : update), base);
}

const count: number = 0; // this render's snapshot
const inc = (c: number) => c + 1;

console.log('count + 1 ×3        →', processQueue(count, [count + 1, count + 1, count + 1]));
console.log('c => c + 1 ×3       →', processQueue(count, [inc, inc, inc]));
console.log('count + 5, c => c+1 →', processQueue(count, [count + 5, inc]));
console.log('c => c+1, then 42   →', processQueue(count, [inc, 42]));
```

{{quiz:functional-updater-three}}

When should you reach for an updater? Use one whenever the next state is computed from the previous state **and** either you queue several updates in one event, or the code runs in a closure that might be stale: intervals, timeouts, effects with `[]` dependencies, callbacks after an `await`. Otherwise `setCount(count + 1)` is perfectly fine. Updaters aren't "always required", and interviewers who know React will appreciate you saying so. By convention, name the parameter after the state (`c` for `count`, `prev`) and keep updaters pure, because StrictMode calls them twice.

> [!INTERVIEW] Say it like this
> "State behaves like a snapshot. Each render gets its own constant values, and calling `setCount` doesn't change `count` in the running code. It queues an update for the next render. That's why three `setCount(count + 1)` calls give 1. If the next state depends on the previous one, I pass an updater, `setCount(c => c + 1)`, and React applies the queued updaters in order."

## Automatic batching

React groups several state updates into **one** re-render. Since React 18 (with `createRoot`), this happens **everywhere**: React event handlers, promise callbacks, code after `await`, `setTimeout` and native event listeners. React 17 only batched inside React event handlers, so updates made after an `await` caused one render per `setState`.

```tsx
async function handleSave() {
  const saved = await api.save(draft);
  setSaving(false); //  ┐
  setDraft(''); //      ├─ React 18+: ONE re-render.  React 17: three.
  setLastSaved(saved); // ┘
}
```

Updates made during the same synchronous run of code, including the same continuation after an `await`, are flushed together once that code finishes. Batching is why you never see the "half-updated" UI where `saving` is false but `draft` hasn't been cleared yet.

You rarely need to opt out. When you do, for example to scroll to a newly added row right after adding it, `flushSync(() => setItems(next))` from `react-dom` commits that update synchronously before the next line runs. Use it sparingly, because it defeats batching and concurrent rendering.

> [!NOTE]
> Batching doesn't change the snapshot rule. Even when a handler queues three updates, every line of that handler still sees the same `count`.

## StrictMode: why everything runs twice in development

Wrapping your app in `<StrictMode>` (which Vite and Next.js templates do) turns on extra checks **in development only**:

1. **Double rendering.** React calls your component functions twice, along with `useState`/`useMemo`/`useReducer` initializers, state updater functions and reducers, and throws one result away. An impure render, such as one that pushes to a module-level array or mutates a prop, behaves differently the second time, so the bug shows up. In React 19, `useMemo` and `useCallback` reuse the first call's result during that second render.
2. **Effects run setup → cleanup → setup on mount.** If your effect subscribes without unsubscribing, or starts an interval without clearing it, you'll see two subscriptions or a timer running at double speed.
3. **Ref callbacks run setup → cleanup → setup on mount** (new in React 19, which also introduced ref-callback cleanup functions).
4. Warnings about deprecated APIs.

**Why it exists.** React reserves the right to render a component more than once, and to unmount and remount components while keeping their state. Fast Refresh does this during development, and `<Activity>` (stable since React 19.2) hides and restores UI the same way. Code that survives StrictMode is resilient to all of that. Code that breaks under StrictMode already has a bug. You just haven't triggered it yet.

**What not to do.** Don't remove StrictMode, and don't add a `didRunRef` guard to stop the effect running twice. Fix the missing cleanup instead. The user-visible behaviour of setup → cleanup → setup should be identical to a single setup. The one legitimate exception is work that must happen once per **app load**, such as initialising analytics or reading a token from storage. That belongs at module level, outside any component.

> [!TIP]
> React 18+ prints `console.log` output from both renders. React DevTools greys out the second one and has a setting to hide it. If you see doubled logs in development only, think "StrictMode" before "bug".

{{quiz:strictmode-purpose}}

## Key takeaways

- **Element** = description (`{ type, props, key }`); **instance** = React's stateful record at a position in the tree; **state lives in the instance**.
- **Render** = calling components (pure, possibly repeated); **commit** = applying DOM changes, then effects.
- A component renders when it **mounts**, when **its state** changes, when **its parent renders**, or when a **context/external store** it reads changes. "Props changed" is never the cause by itself.
- Reconciliation: **different type → remount**, **same type at the same position → keep state**, **lists → match by key**. Never define components inside components.
- Index keys attach state to positions instead of items. Use stable ids. Change a `key` on purpose to **reset** a subtree.
- State is a **snapshot**: setters queue updates for the next render. Use **updater functions** when the next state depends on the previous one.
- React 18+ **batches** updates everywhere into one render. `flushSync` is the rare escape hatch.
- **StrictMode** (dev only) double-renders and runs mount effects setup → cleanup → setup to expose impure renders and missing cleanups. Fix the cleanup. Don't fight the check.
