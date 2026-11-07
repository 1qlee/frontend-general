## Why interviewers ask about scope and closures

Closures are the foundation of almost every "implement X" question — `debounce`, `throttle`, `once`, `memoize`, iterators, React hooks themselves. When an interviewer asks *"what is a closure?"* they want to hear three things: **lexical scope**, **functions retaining access to their defining environment**, and **a practical consequence** (data privacy, stale closures in React, memory). Today you'll make all three automatic.

## Scope: where a name resolves

JavaScript uses **lexical (static) scope**: which variable a name refers to is decided by *where the code is written*, not where it's called from.

There are four kinds of scope you should be able to name:

| Scope | Created by | Notes |
|---|---|---|
| Global | The script/module top level | In ES modules, top-level `let/const/function` are **module-scoped**, not global. |
| Module | Each ES module file | Every `import`ed file gets its own scope. |
| Function | Every function invocation | `var` is function-scoped. |
| Block | `{ … }` with `let`, `const`, `class` | `if`, `for`, bare blocks, `try/catch`. |

When code reads a variable, the engine walks the **scope chain** outward — current scope, then the enclosing scope, and so on to the global scope — until it finds the name or throws a `ReferenceError`.

```ts run
const level = 'module';

function outer() {
  const level = 'outer';
  function inner() {
    // resolved lexically: the nearest enclosing declaration wins
    console.log(level);
  }
  return inner;
}

const fn = outer();
fn(); // where it's called doesn't matter
```

## Hoisting and the Temporal Dead Zone

Before any code in a scope runs, the engine creates bindings for every declaration in it. This is what people call **hoisting**, but the details differ by declaration type — and that's exactly what interviewers probe:

| Declaration | Hoisted? | Initial value before its line runs | Scope |
|---|---|---|---|
| `var x` | Yes | `undefined` | Function |
| `let x` / `const x` | Yes (binding exists) | **uninitialized** → accessing throws `ReferenceError` (TDZ) | Block |
| `function f() {}` | Yes | The whole function | Function (block in strict mode) |
| `class C {}` | Yes | **uninitialized** (TDZ) | Block |
| `const f = () => {}` | Same as `const` | TDZ | Block |

The **Temporal Dead Zone (TDZ)** is the period between entering a scope and the `let`/`const`/`class` declaration being evaluated. Touching the binding during the TDZ throws.

```ts run
console.log(typeof hoistedVar, hoistedVar); // var: exists, undefined
var hoistedVar = 1;

console.log(declared()); // function declarations are fully hoisted
function declared() {
  return 'function declaration works before its line';
}

try {
  // @ts-ignore — TypeScript would (rightly) stop us; we want to see the runtime behaviour
  console.log(inTdz);
} catch (e) {
  console.log((e as Error).name + ': ' + (e as Error).message);
}
let inTdz = 'too late';
```

> [!INTERVIEW] Say it like this
> "All declarations are hoisted in the sense that the binding is created when the scope is entered. `var` is initialised to `undefined`, function declarations are initialised with the function, but `let`, `const` and `class` stay uninitialised until their declaration runs — accessing them before that is the temporal dead zone and throws a ReferenceError."

{{quiz:tdz-typeof}}

## Closures

> A **closure** is a function together with references to the variables of the scope in which it was created. The function can keep reading and writing those variables after the outer function has returned.

Every function in JavaScript closes over its lexical environment — closures aren't a special construct, they're a consequence of lexical scope plus functions being first-class values.

```ts run
function createCounter(start = 0) {
  let count = start; // private state: only reachable through the returned functions

  return {
    increment: () => ++count,
    decrement: () => --count,
    get value() {
      return count;
    },
  };
}

const a = createCounter();
const b = createCounter(100);
a.increment();
a.increment();
b.decrement();
console.log(a.value, b.value); // each call to createCounter creates a NEW environment
```

Key properties to state explicitly in an interview:

1. **Closures capture variables, not values.** The function sees the *current* value of the variable when it runs, not a snapshot from when it was created.
2. **Each invocation creates a new environment.** Two counters don't share `count`.
3. **Closed-over variables stay alive** as long as some reachable function references them. That's useful (private state) and a source of memory leaks (an event listener that closes over a huge object).

{{quiz:closure-captures-variables}}

### The classic loop question

This is asked constantly — in some form — because it tests both closures *and* `var` vs `let` scoping.

```ts run
const withVar: Array<() => number> = [];
for (var i = 0; i < 3; i++) {
  withVar.push(() => i);
}

const withLet: Array<() => number> = [];
for (let j = 0; j < 3; j++) {
  withLet.push(() => j);
}

console.log('var:', withVar.map((f) => f()));
console.log('let:', withLet.map((f) => f()));
```

- With `var`, there is **one** `i` for the whole function. All three closures reference it, and by the time they run the loop has finished and `i === 3`.
- With `let`, the spec creates a **fresh binding per iteration** (copying the previous value), so each closure captures a different `j`.

The pre-ES2015 fix was an IIFE to create a new scope per iteration: `(function (k) { fns.push(() => k); })(i)`. Mentioning that shows you understand *why* `let` fixes it.

> [!MISTAKE]
> Saying "`let` is block-scoped so it works". True but incomplete — the important detail is that `for (let …)` creates a **new binding for each iteration**. A `let` declared *outside* the loop would print `3, 3, 3` too.

### Closures in React: stale closures

Every render of a function component is a new function call, so every handler and effect created in that render closes over **that render's** props and state. This is the root of the "stale closure" bug:

```tsx
function Timer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // ❌ `count` is always 0 here — this closure is from the first render
    }, 1000);
    return () => clearInterval(id);
  }, []); // the effect never re-runs, so it never sees a newer `count`

  return <p>{count}</p>; // shows 1 forever
}
```

Fixes, in order of preference: use the **functional update** `setCount((c) => c + 1)` (no need to read `count` at all); or include `count` in the dependency array (re-creates the interval each change); or read from a ref. You'll go deeper on Day 5 — but notice the explanation is pure closure semantics.

> [!INTERVIEW] Connecting it to React
> "Hooks rely on closures: each render's handlers capture that render's state. That's why state behaves like a snapshot, and why an effect or interval that isn't re-created can read stale values — the fix is a functional update, correct dependencies, or a ref."

## Practical closure patterns you'll implement

| Pattern | What the closure holds | You'll build it… |
|---|---|---|
| Private state / module pattern | counters, caches | today (`memoize`) |
| Function factories | configuration | `curry`, `partial` |
| Once / lazy init | a "called" flag + result | today (`once`) |
| Rate limiting | timer id, last call time | Day 2 (`debounce`, `throttle`) |
| Iterators/generators | position | Day 2–3 |
| Hooks | component state cells | Days 5–7 |

```ts run
// A function factory: configuration captured once, used many times
function createFormatter(locale: string, currency: string) {
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency }); // created once
  return (amount: number) => fmt.format(amount);
}

const usd = createFormatter('en-US', 'USD');
const eur = createFormatter('de-DE', 'EUR');
console.log(usd(1234.5), '|', eur(1234.5));
```

## Memory: when closures leak

A closure keeps its whole environment record reachable (engines optimise away unused variables, but you can't rely on that across closures that share a scope). Classic leaks in frontend apps:

- An event listener/subscription registered in a component and never removed — it closes over props, state, DOM nodes.
- A long-lived cache (`Map`) keyed by objects that should have been garbage-collected — use `WeakMap` when keys are objects whose lifetime you don't control.
- Timers (`setInterval`) never cleared.

This is why React effects return a **cleanup function** — the cleanup is how you release closures that would otherwise outlive the component.

## Modules vs closures

Before ES modules, the **module pattern** (an IIFE returning a public API) used closures for privacy. ES modules give you that for free: top-level declarations in a module are private unless exported, and they're evaluated once and shared by all importers (a module is effectively a singleton). Class `#private` fields are the third tool for privacy — enforced by the language rather than by scope.

## Key takeaways

- Lexical scope: names resolve by where code is **written**; lookup walks the scope chain outward.
- Hoisting creates bindings early; `let/const/class` are in the TDZ until their declaration runs.
- A closure = function + references to its creation scope's **variables** (not snapshots of values).
- `for (let …)` creates a fresh binding per iteration — that's why the loop-closure bug disappears.
- In React, each render's closures see that render's state → stale closures; fix with functional updates, dependencies or refs.
- Closures keep memory alive: clean up listeners, timers and subscriptions.
