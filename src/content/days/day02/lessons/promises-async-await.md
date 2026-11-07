## Why interviewers ask about promises

Promises show up in three kinds of interview questions: **output prediction** (chaining and error-propagation puzzles), **implementation** ("write `Promise.all`", "write a retry helper") and **design** ("load these four widgets — what happens when one fails?"). The interviewer is listening for precise semantics: that `then` returns a *new* promise, how values and errors flow down a chain, where `catch` belongs, and whether you reach for sequential or parallel awaits deliberately.

## States, fates and the executor

A promise is a placeholder for a value that will exist later. It is in exactly one **state**:

| State | Meaning |
|---|---|
| **pending** | Not settled yet |
| **fulfilled** | Settled with a value |
| **rejected** | Settled with a reason (usually an `Error`) |

"Settled" means fulfilled or rejected, and settling happens **at most once** — later `resolve`/`reject` calls are silently ignored. Precise vocabulary: a promise is **resolved** once its fate is locked in, which includes "locked in to follow another promise" — so a resolved promise can still be pending. That's why `resolve(otherPromise)` doesn't fulfil with a promise object; it *adopts* the other promise's eventual state.

The **executor** passed to `new Promise` runs **synchronously**, immediately. Only the reactions (`then` callbacks) are asynchronous.

```ts run
const p = new Promise<string>((resolve, reject) => {
  console.log('1. the executor runs synchronously');
  resolve('first');
  resolve('second'); // ignored: a promise settles once
  reject(new Error('nope')); // ignored too
  console.log('2. code after resolve() still runs — resolve is not return');
});
p.then((value) => console.log('4. then:', value));
console.log('3. after new Promise');
```

If the executor **throws**, the promise rejects with the thrown value (unless it already settled). That's one reason to prefer `new Promise` only for wrapping callback APIs (`setTimeout`, events) and to use `async` functions everywhere else.

## `then` returns a new promise

This is the single most important rule. `p.then(onFulfilled, onRejected)` returns a **new** promise whose fate depends on what the handler does:

| The handler… | …the promise returned by `then` |
|---|---|
| returns a value `v` | fulfils with `v` |
| returns nothing | fulfils with `undefined` |
| returns a promise / thenable | **adopts** it: settles the same way, later |
| throws `e` | rejects with `e` |
| is missing (not a function) | passes the value or reason through unchanged |

```ts run
const p1 = Promise.resolve(1);
const p2 = p1.then((x) => x + 1);
console.log('then returns a NEW promise:', p1 !== p2);

Promise.resolve(1)
  .then((x) => x + 1) // value -> next handler gets 2
  .then((x) => new Promise<number>((r) => setTimeout(() => r(x * 10), 50))) // promise -> adopted
  .then((x) => {
    throw new Error(`bad ${x}`); // throw -> rejection
  })
  .then(() => console.log('skipped: no rejection handler here'))
  .catch((e: Error) => {
    console.log('caught:', e.message);
    return 'recovered'; // catch returns a value -> the chain is fulfilled again
  })
  .then((v) => console.log('after catch:', v));
```

**Thenables.** Adoption works for any object with a `then` method, not just native promises. `await`, `Promise.resolve()` and returning from a `then` handler all call that `then` for you — which is how promise libraries interoperate. A native promise passed to `Promise.resolve` is returned as-is.

```ts run
const thenable = {
  then(onFulfilled: (value: string) => void) {
    console.log('then() was called by the promise machinery');
    onFulfilled('value from a thenable');
  },
};
console.log(await thenable);

const native = Promise.resolve(42);
console.log('Promise.resolve(native) === native:', Promise.resolve(native) === native);
```

{{quiz:then-missing-return}}

## Error propagation and where `catch` belongs

A rejection travels down the chain, **skipping fulfilment handlers**, until it reaches a rejection handler (`catch` or the second argument of `then`). `catch(fn)` is just `then(undefined, fn)` — so it also returns a new promise, which **fulfils** with whatever the handler returns. Catching *recovers* the chain unless you rethrow.

Two details interviewers probe:

- **`then(onOk, onErr)` vs `then(onOk).catch(onErr)`.** In the first form `onErr` does *not* catch errors thrown by `onOk` (they're siblings). In the second it does.
- **`fetch` doesn't reject on HTTP errors.** A 404 or 500 is a *fulfilled* response; only network failures and aborts reject. Check `response.ok`.

```ts
class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new HttpError(response.status, `GET ${url} failed with ${response.status}`);
  return (await response.json()) as T;
}
```

**Where should `catch` go?** At the boundary that can *do something* about the error:

- The **UI layer** catches to render an error state, a retry button or a toast.
- A **retry/fallback layer** catches to retry or substitute a cached value.
- **Data/library layers** usually let errors propagate — optionally wrapping them with context using ES2022's `cause`: `throw new Error('Could not load profile', { cause: error })`.

> [!MISTAKE]
> Swallowing errors: `getUser().catch((e) => console.error(e))` in a data function. The returned promise now **fulfils with `undefined`**, so the caller crashes later with "cannot read properties of undefined" — far from the real cause. Log *and* rethrow, or don't catch here at all.

In TypeScript (with `strict`), the `catch` variable is `unknown` — anything can be thrown — so narrow before use:

```ts
try {
  await save(draft);
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') return; // expected: cancelled
  if (error instanceof HttpError && error.status === 409) return showConflictDialog();
  throw error; // unknown problem: let the error boundary / global handler deal with it
}
```

### `finally`

`finally(fn)` runs on both outcomes, receives **no arguments**, and **passes the original result through** — its return value is ignored. The exception: if `fn` throws (or returns a rejected promise), that rejection replaces the original outcome.

```ts run
const a = await Promise.resolve('value').finally(() => 'ignored return value');
console.log('finally passes the value through:', a);

const b = await Promise.reject(new Error('original'))
  .finally(() => console.log('cleanup runs on rejection too'))
  .catch((e: Error) => e.message);
console.log('…and the rejection too:', b);

const c = await Promise.resolve('value')
  .finally(() => {
    throw new Error('thrown in finally');
  })
  .catch((e: Error) => e.message);
console.log('but a throw inside finally wins:', c);
```

### Unhandled rejections

A promise that rejects with no rejection handler attached (by the end of the current microtask checkpoint) is an **unhandled rejection**. Browsers fire an `unhandledrejection` event on `window` (and log it); since Node 15 an unhandled rejection **crashes the process** by default. The usual source is a "floating" promise — an async call nobody awaits:

```tsx
// ❌ If save() rejects, nobody handles it
<button onClick={() => save(form)}>Save</button>

// ✅ Handle the error where you can show feedback…
async function handleSave() {
  try {
    await save(form);
    setStatus('saved');
  } catch {
    setStatus('error');
  }
}
// …and mark the promise as deliberately not awaited with `void`
<button onClick={() => void handleSave()}>Save</button>
```

> [!TIP]
> Turn on typescript-eslint's `no-floating-promises` and `no-misused-promises`. The second one flags passing an async function where a `void`-returning callback is expected — exactly the `forEach(async …)` bug below.

## async/await

An `async` function **always returns a promise**: `return v` fulfils it, `throw e` rejects it. `await` unwraps a promise, throwing if it rejected — so ordinary `try/catch/finally` works across awaits.

One gotcha deserves its own check: inside `try`, `return somePromise` hands the promise to the caller *without* waiting for it, so its rejection escapes your `catch`. Use `return await` inside `try` blocks.

{{quiz:return-await-in-try}}

### Sequential vs parallel

`await` pauses the current function, so two independent awaits in a row take the **sum** of their durations. Start both operations first, then wait for both:

```ts run
const wait = <T>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const getUser = () => wait(200, { id: 1, name: 'Ada' });
const getPosts = () => wait(300, ['post 1', 'post 2']);
const elapsed = (start: number) => `~${Math.round((performance.now() - start) / 100) * 100} ms`;

let start = performance.now();
const user = await getUser(); // 200 ms…
const posts = await getPosts(); // …then another 300 ms
console.log('sequential:', elapsed(start), user.name, posts.length);

start = performance.now();
const [user2, posts2] = await Promise.all([getUser(), getPosts()]); // both start now
console.log('parallel:  ', elapsed(start), user2.name, posts2.length);
```

Sequential is *correct* when there's a real dependency (you need `user.id` to fetch posts) or when you must limit load. Otherwise it's a performance bug — "request waterfalls" are one of the most common findings in frontend performance reviews (Day 10).

> [!WARNING]
> Avoid `const a = getA(); const b = getB(); await a; await b;`. It runs in parallel, but if `b` rejects while you're still awaiting `a`, `b`'s rejection is momentarily unhandled (and `a`'s failure would leave `b`'s unobserved). `Promise.all` attaches handlers to everything up front.

TypeScript preserves tuple types through `Promise.all`: above, `user2` is `{ id: number; name: string }` and `posts2` is `string[]`.

### The `forEach(async …)` bug

`Array.prototype.forEach` ignores its callback's return value — including the promise an async callback returns. Nothing waits, and rejections are unhandled.

```ts run
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ids = [3, 1, 2];

async function brokenSaveAll() {
  ids.forEach(async (id) => {
    await wait(id * 10);
    console.log('saved', id);
  });
  console.log('broken: "all saved!" (it is not)'); // runs first
}

async function sequentialSaveAll() {
  for (const id of ids) {
    await wait(id * 10); // one at a time, in order
    console.log('sequential saved', id);
  }
  console.log('sequential: all saved');
}

async function parallelSaveAll() {
  await Promise.all(
    ids.map(async (id) => {
      await wait(id * 10); // all at once
      console.log('parallel saved', id);
    }),
  );
  console.log('parallel: all saved');
}

await brokenSaveAll();
await wait(50);
await sequentialSaveAll();
await parallelSaveAll();
```

The three correct shapes: **`for…of` + `await`** (sequential), **`await Promise.all(items.map(async …))`** (parallel), and a **concurrency-limited pool** when there are many items (you'll build `mapWithConcurrency` today).

### `for await…of`

`for await (const x of source)` iterates an **async iterable** — something with `[Symbol.asyncIterator]`, like an async generator — awaiting each value. It also accepts sync iterables of promises, awaiting each element **in order**:

```ts run
const wait = <T>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const responses = [wait(300, 'first (slow)'), wait(100, 'second (fast)')];
for await (const r of responses) console.log(r); // input order, not completion order
```

Careful with that second form: if a later promise rejects while an earlier one is still being awaited, the rejection is unhandled for a while — prefer `Promise.all`/`allSettled` for arrays of promises. Real async iterables you'll meet: async generators (pagination — Lesson 3), Node streams, and `ReadableStream` (`for await (const chunk of response.body)` — async iteration of web streams is supported in Chromium 124+, Firefox and Node; check Safari before relying on it).

## The combinators

All four take an iterable and start nothing themselves — the promises you pass are **already running**. None of them cancels the "losers".

| | Fulfils when | Rejects when | Result | Empty input |
|---|---|---|---|---|
| `Promise.all` | **all** fulfil | **any** rejects (fail fast, first reason) | values in **input order** | fulfils `[]` |
| `Promise.allSettled` (ES2020) | all settle | never | `{ status: 'fulfilled', value }` / `{ status: 'rejected', reason }` per input | fulfils `[]` |
| `Promise.race` | the **first to settle** fulfils | the first to settle rejects | that single value/reason | **pending forever** |
| `Promise.any` (ES2021) | the **first to fulfil** | **all** reject | first value / `AggregateError` with `errors` in input order | rejects (`AggregateError`) |

```ts run
const ok = <T>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const fail = (ms: number, msg: string) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
const explain = (e: unknown) =>
  e instanceof AggregateError
    ? `AggregateError [${e.errors.map((x: Error) => x.message).join(', ')}]`
    : (e as Error).message;

await Promise.all([ok(30, 'a'), fail(10, 'b failed'), ok(20, 'c')]).then(
  (v) => console.log('all        fulfilled:', v),
  (e) => console.log('all        rejected: ', explain(e)),
);

const settled = await Promise.allSettled([ok(30, 'a'), fail(10, 'b failed')]);
console.log('allSettled', settled.map((r) => (r.status === 'fulfilled' ? `✓ ${r.value}` : `✗ ${r.reason.message}`)));

await Promise.race([ok(30, 'a'), fail(10, 'b failed')]).then(
  (v) => console.log('race       fulfilled:', v),
  (e) => console.log('race       rejected: ', explain(e)),
);

await Promise.any([ok(30, 'a'), fail(10, 'b failed')]).then((v) => console.log('any        fulfilled:', v));

await Promise.any([fail(10, 'x'), fail(20, 'y')]).catch((e) => console.log('any        rejected: ', explain(e)));
```

When to use which:

- **`all`** — you need every result and one failure makes the whole operation pointless (a page that needs both user and permissions).
- **`allSettled`** — independent work where partial success is useful (a dashboard of widgets; a batch upload report).
- **`race`** — "whichever settles first", classically a timeout. Prefer `AbortSignal.timeout()` for fetches though (Lesson 3): `race` stops *waiting* but doesn't stop the *work*.
- **`any`** — redundancy: the first successful mirror/CDN/cache wins, and you only fail if all of them do.

> [!INTERVIEW] Say it like this
> "`all` is fail-fast: it fulfils with every value in input order or rejects with the first error. `allSettled` never rejects — it reports each outcome, so it's for independent work where partial success matters. `race` settles with whichever promise settles first, success or failure, which is how you build a timeout. `any` waits for the first *success* and only rejects, with an `AggregateError`, if everything fails. None of them cancel the other operations — that needs an `AbortController`."

### Typed helpers worth knowing

```ts
// Narrow allSettled results with a type predicate
const results = await Promise.allSettled(urls.map((url) => getJson<Product>(url)));
const products = results
  .filter((r): r is PromiseFulfilledResult<Product> => r.status === 'fulfilled')
  .map((r) => r.value);

// ES2024: create a promise and its resolvers in one go (lib "ES2024" / TS 5.4+)
const { promise, resolve, reject } = Promise.withResolvers<string>();

// Awaited<T> unwraps promise types (recursively)
type Data = Awaited<ReturnType<typeof getJson<Product[]>>>; // Product[]
```

## In React

`useEffect(async () => …)` is wrong: an async function returns a promise, but React expects the effect to return a cleanup function (or nothing). Define the async work inside and guard against stale results:

```tsx
useEffect(() => {
  let ignore = false;
  (async () => {
    try {
      const data = await getJson<User>(`/api/users/${id}`);
      if (!ignore) setUser(data);
    } catch (error) {
      if (!ignore) setError(error as Error);
    }
  })();
  return () => {
    ignore = true; // a newer id (or unmount) makes this response stale
  };
}, [id]);
```

Lesson 3 upgrades `ignore` to actual cancellation with `AbortController`; Day 5 covers effects in depth, and Day 7 covers React 19's `use(promise)` with Suspense, which moves this whole dance into the framework.

## Key takeaways

- States: pending → fulfilled | rejected, settled once. The **executor runs synchronously**.
- `then` returns a **new promise**: return value → fulfil, throw → reject, return a promise/thenable → adopt.
- Rejections skip fulfilment handlers until a `catch`; `catch` **recovers** unless you rethrow. Catch where you can act.
- `finally` passes results through unless it throws. `fetch` only rejects on network errors/aborts — check `response.ok`.
- Floating promises cause unhandled rejections; lint for them.
- `return await` inside `try`. Independent awaits → `Promise.all`. Never `forEach(async …)`.
- `all` (fail fast) · `allSettled` (never rejects) · `race` (first to settle) · `any` (first to fulfil, `AggregateError`). None cancel.
