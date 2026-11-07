## Why interviewers care about state design

In a UI-build round ("build a todo list", "build an autocomplete", "build a data table with filters"), the interviewer watches your first five minutes more closely than anything else. Before you write any JSX, they want to know two things: **what state do you need, and where does it live?** Candidates who store everything they can think of in `useState` and then sync it all with effects produce buggy, slow code and run out of time. Candidates who say "the only real state is the list and the filter, everything else is derived" finish early and can talk through trade-offs.

This lesson is a checklist you can apply out loud. It covers minimal state, derived values, where state lives, controlled vs uncontrolled inputs, and immutable updates.

## Principle 1: store the minimum, derive the rest

**State** is data that changes over time **and** can't be computed from anything else you already have. Everything else is a **derived value**, and you compute it during render.

```tsx
// ❌ Redundant state that must be kept in sync by hand (or by an effect)
const [todos, setTodos] = useState<Todo[]>([]);
const [filter, setFilter] = useState<Filter>('all');
const [visibleTodos, setVisibleTodos] = useState<Todo[]>([]);
const [activeCount, setActiveCount] = useState(0);

// ✅ Two pieces of state; the rest is derived on every render
const [todos, setTodos] = useState<Todo[]>([]);
const [filter, setFilter] = useState<Filter>('all');
const visibleTodos = todos.filter((t) => matches(t, filter));
const activeCount = todos.filter((t) => !t.done).length;
```

Redundant state produces three kinds of bug: values drift out of sync when one update path forgets the other; you need extra effects to "keep them in sync", which cost an extra render and show a stale frame first; and contradictions such as `activeCount` saying 3 while only 2 active rows are visible.

*"But recomputing on every render is wasteful."* For a filter over a few hundred items it costs microseconds. Measure first. If the computation really is expensive, wrap it in `useMemo` (Day 7). The React Compiler (1.0, October 2025) can also add that memoization automatically. Either way, the value is still *derived*, just cached.

The checklist react.dev uses, which is worth reciting in an interview:

1. **Group related state.** If two values always change together (`x` and `y` of a cursor), make them one object.
2. **Avoid contradictions.** `isSending` and `isSent` can both be `true`, which should be impossible. Use one `status` field instead.
3. **Avoid redundant state.** If it can be computed from props or other state, compute it.
4. **Avoid duplication.** Don't store a *copy* of an object that already lives in a list. Store its **id**.
5. **Avoid deep nesting.** Deeply nested state is painful to update immutably, so prefer flat or normalized shapes.

### Make impossible states unrepresentable (the TypeScript angle)

Booleans multiply. With `isLoading`, `isError` and `data`, there are eight combinations and most of them are nonsense. A discriminated union allows only the valid ones, and TypeScript narrows the type for you:

```tsx
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function Results({ state }: { state: RequestState<string[]> }) {
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <p role="status">Loading…</p>;
    case 'error':
      return <p role="alert">{state.error.message}</p>;
    case 'success':
      return <ul>{state.data.map((r) => <li key={r}>{r}</li>)}</ul>; // `data` only exists here
  }
}
```

This is a great moment to connect Day 3/4 TypeScript to React design. Interviewers notice it.

### Store ids, not copies

```tsx
// ❌ selectedItem is a COPY; edit the item in `items` and the selection shows stale data
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

// ✅ store the id; derive the object
const [selectedId, setSelectedId] = useState<string | null>(null);
const selectedItem = items.find((i) => i.id === selectedId) ?? null;
```

{{quiz:redundant-state-check}}

## Principle 2: don't mirror props in state

```tsx
function ColorSwatch({ color }: { color: string }) {
  const [current, setCurrent] = useState(color); // ❌ only reads `color` on the FIRST render
  // …
}
```

`useState(initial)` uses its argument **once, when the component mounts**. If the parent later passes a different `color`, `current` keeps the old one. People then "fix" this with an effect:

```tsx
useEffect(() => setCurrent(color), [color]); // ❌ extra render, a stale frame, and two sources of truth
```

Pick one of these instead:

| Situation | Do this |
|---|---|
| You just display/compute from the prop | **Use the prop directly.** No state at all. |
| The prop is only a *starting value* the user then edits | Keep the state, but name the prop `initialColor`/`defaultColor` so the contract is obvious. |
| The local state should **reset** when some identity changes | Give the component a `key`: `<ColorPicker key={productId} initialColor={…} />` (Lesson 1). |
| Only *part* of the state should adjust when a prop changes | Prefer deriving it. As a last resort, store the previous prop and adjust state **during render** (react.dev: "storing information from previous renders"). |
| Parent and child both need to change it | **Lift it up**: the parent owns it, the child gets `value` + `onChange` (a controlled component). |

> [!MISTAKE]
> "I copy props into state so the component can modify them." That creates two sources of truth. Either the parent owns the value (controlled) or the child does and the prop is clearly an *initial* value. It can't be both.

## Principle 3: put state in the right place

### Lifting state up

When two components need the same changing data, move the state to their **closest common parent** and pass it down along with callbacks. This gives you a **single source of truth**:

```tsx
function FilterableProducts({ products }: { products: Product[] }) {
  const [query, setQuery] = useState(''); // lifted: both children depend on it
  return (
    <>
      <SearchBar query={query} onQueryChange={setQuery} />
      <ProductTable products={products} query={query} />
    </>
  );
}
```

### Colocation: keep state as low as possible

The opposite direction matters just as much. State should live in the **lowest** component that needs it. A modal's `isOpen`, a dropdown's `highlightedIndex` and a form field's draft text don't belong in a page-level component or a global store. Colocated state:

- re-renders a smaller subtree when it changes (the parent render rule from Lesson 1);
- is easier to read and delete, because everything that touches it is in one place;
- avoids prop drilling and accidental coupling.

The rule of thumb: **lift when you must, colocate when you can.** Lifting happens when a second consumer appears. Pushing state back down happens when a refactor removes that consumer.

### "Where should this state live?" — a decision guide

Ask these in order. This is a great script to talk through in a UI-build interview:

| # | Question | If yes → |
|---|---|---|
| 1 | Can it be **computed** from props/other state? | Not state. Derive it during render (`useMemo` only if it's measurably expensive). |
| 2 | Does it change **without** needing a re-render (timer id, previous value, DOM node)? | `useRef` (Lesson 3). |
| 3 | Is it **server data** (cached copy of something the backend owns)? | A server-cache library or your framework's data loading (TanStack Query, RSC, loaders: Day 7). Not hand-rolled `useState` + effect at scale. |
| 4 | Should it survive a reload or be **shareable via the URL** (filters, tab, page, search)? | URL search params / route state. |
| 5 | Is it used by **one** component? | Local `useState` in that component. |
| 6 | Is it shared by **siblings / a subtree**? | Lift to the closest common parent, pass props. |
| 7 | Is it needed by **many distant** components (theme, current user, locale)? | Context (Day 6). For frequently-changing global data, an external store such as Zustand or Redux (Day 7). |

> [!INTERVIEW] Say it like this
> "First I separate real state from derived values. For a todo list that's just the todos array, the filter and the input draft. Counts and the visible list are computed. Then I place each piece as low as possible: the draft lives in the form, the list and filter live in their closest common parent. If the filter should be shareable I'd put it in the URL, and if the todos came from a server I'd use a server-cache library instead of mirroring them into local state."

## Controlled vs uncontrolled inputs

| | Controlled | Uncontrolled |
|---|---|---|
| Source of truth | React state | The DOM |
| Wiring | `value={x}` + `onChange={e => setX(e.target.value)}` | `defaultValue="…"` (+ a ref or `FormData` to read it) |
| Re-renders per keystroke | Yes (the owning component) | No |
| Easy to… | validate as you type, format/mask, disable submit, sync with other UI | integrate with non-React code, file inputs, big simple forms |

```tsx
// Controlled — React owns the value
const [email, setEmail] = useState('');
<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />;

// Uncontrolled — read on submit with FormData (pairs nicely with React 19 form actions)
function Signup() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    console.log(data.get('email'));
  }
  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" defaultValue="" />
      <button>Sign up</button>
    </form>
  );
}
```

Gotchas interviewers probe:

- **`value` without `onChange`** makes a read-only input that silently ignores typing. React warns about it.
- **Switching from uncontrolled to controlled** happens when `value` starts as `undefined` (for example `user?.name` while loading) and later becomes a string. React warns: *"A component is changing an uncontrolled input to be controlled."* Fix it with `value={name ?? ''}`.
- `<input type="file">` is **always uncontrolled**, because its value can't be set from code.
- In React 19, `<form action={fn}>` receives `FormData`, which makes uncontrolled forms first-class again. React also resets uncontrolled fields after a successful action. Forms are covered in depth on Day 6.

"Controlled" also applies to **your own components**. A `<Tabs value onChange>` API is controlled and `<Tabs defaultValue>` is uncontrolled. Designing components that support both is a Day 6 pattern.

## Immutable updates

React decides whether state changed with `Object.is` on the **reference**. If you mutate an object or array in place and pass the same reference back, React bails out, and you've also changed the snapshot that earlier renders and memoized children still see. Always create **new** objects along the path that changed.

```ts run
type Address = { city: string; zip: string };
type User = { name: string; address: Address; tags: string[] };

const user: User = { name: 'Ada', address: { city: 'London', zip: 'N1' }, tags: ['admin'] };

// ❌ mutation: same reference → React would bail out
const mutated = user;
mutated.address.city = 'Paris';
console.log('mutation changed reference?', !Object.is(mutated, user));
user.address.city = 'London'; // undo for the next demo

// ✅ copy every object on the path to the change; share the rest
const moved: User = { ...user, address: { ...user.address, city: 'Paris' } };
console.log('new user?', moved !== user, '| new address?', moved.address !== user.address, '| tags shared?', moved.tags === user.tags);
console.log('original untouched:', user.address.city);
```

Array cheat sheet (memorise the right-hand column):

| Intent | ❌ Mutates | ✅ Returns a new array |
|---|---|---|
| Add | `push`, `unshift` | `[...arr, item]`, `[item, ...arr]` |
| Remove | `splice`, `pop`, `shift` | `arr.filter(x => x.id !== id)` |
| Replace / update one | `arr[i] = x` | `arr.map(x => x.id === id ? { ...x, done: !x.done } : x)` |
| Insert at index | `splice(i, 0, x)` | `[...arr.slice(0, i), x, ...arr.slice(i)]` or `arr.toSpliced(i, 0, x)` |
| Sort / reverse | `sort`, `reverse` | `[...arr].sort(cmp)` or `arr.toSorted(cmp)` / `toReversed()` (ES2023) |

> [!WARNING]
> `[...arr]` and `{ ...obj }` are **shallow** copies. `const next = [...todos]; next[0].done = true;` still mutates the original todo object, because both arrays hold the same object references. Copy the item too: `todos.map((t, i) => i === 0 ? { ...t, done: true } : t)`.

### `structuredClone` and Immer

**`structuredClone(value)`** makes a deep copy. It's convenient, but it's rarely the right tool for state updates:

```ts run
class Point {
  constructor(public x: number, public y: number) {}
  length() { return Math.hypot(this.x, this.y); }
}
const state = { when: new Date(0), point: new Point(3, 4), tags: new Set(['a']) };
const copy = structuredClone(state);

console.log('Date kept:', copy.when instanceof Date, '| Set kept:', copy.tags instanceof Set);
console.log('class instance kept?', copy.point instanceof Point, '(prototype lost — a plain object)');
console.log('every nested object is new:', copy.tags !== state.tags);
try {
  structuredClone({ onClick() {} });
} catch (e) {
  console.log('functions:', (e as Error).name);
}
```

The drawbacks: it copies **everything**, so it's slow for large state, and every nested object gets a new identity. That breaks `memo`/`useMemo` for children whose data *didn't* change. It also can't clone functions or DOM nodes, and class instances lose their prototype. Use it for snapshots and defensive copies, not routine updates.

**Immer** (`produce`, or the `useImmer` hook) lets you write "mutating" code against a draft proxy and gives you back a properly immutable result with structural sharing, so only the changed path gets new references:

```tsx
import { produce } from 'immer';

setUser((prev) =>
  produce(prev, (draft) => {
    draft.address.city = 'Paris'; // looks like mutation, produces a new object safely
  }),
);
```

Redux Toolkit uses Immer internally. In an interview, write the spread version by hand first to show you understand it, then mention Immer for deeply nested state.

{{quiz:nested-update-check}}

## Choosing the shape of your state

**Several `useState` calls, or one object?** Split by **how the values change**. Independent values should get separate `useState` calls. Values that always change together can share an object. Remember that the hook setter **replaces** the state; it doesn't merge it like class `this.setState` did. With an object you must spread: `setForm(f => ({ ...f, email }))`.

**`useState` or `useReducer`?** Move to a reducer when updates follow from **events** with non-trivial rules, when several fields change together, or when you want the transitions in one testable pure function. Example: a multi-step form or an undo stack. Day 6 covers reducers in depth.

**Nested or normalized?** For tree-like or relational data (comments with replies, boards with columns with cards), a nested shape makes every update copy the whole path. A **normalized** shape, `{ byId: Record<string, Card>, order: string[] }`, keeps updates flat:

```tsx
type BoardState = {
  cards: Record<string, { id: string; title: string; columnId: string }>;
  columns: Record<string, { id: string; cardIds: string[] }>;
};
// Move a card = touch 3 small objects, not rebuild a deep tree.
```

## Key takeaways

- State is what **changes and can't be derived**. Compute everything else during render, and memoize only when it's measurably expensive.
- Avoid **redundant**, **duplicated**, **contradictory** and **deeply nested** state. Use a discriminated union for request status. Store **ids**, not copies.
- `useState(prop)` reads the prop **once**. Don't mirror props: use the prop, rename it to `initialX`, reset with a `key`, or lift the state.
- **Lift** state to the closest common parent when it's shared. **Colocate** it as low as possible otherwise. URL state, server cache, context and stores each have their place.
- **Controlled** = React owns the value (`value` + `onChange`). **Uncontrolled** = the DOM owns it (`defaultValue`, ref or `FormData`). Never let `value` flip between `undefined` and a string.
- Update immutably: new objects along the changed path, shared references elsewhere. Spread is shallow, `structuredClone` is a blunt instrument, and Immer is the ergonomic option.
