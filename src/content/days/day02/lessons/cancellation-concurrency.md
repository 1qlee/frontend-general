## Why interviewers ask about timing and cancellation

The classic frontend "UI build" round is **search-as-you-type** (typeahead/autocomplete). It looks simple and is full of traps: too many requests, responses arriving out of order, requests that outlive the component, flaky networks. The follow-ups map one-to-one onto this lesson: *"How do you avoid hammering the API?"* (debounce), *"What if an older response arrives last?"* (latest-request-wins), *"How do you cancel?"* (`AbortController`), *"What if the request fails?"* (retry with backoff), *"Upload 200 files"* (concurrency limits).

A strong answer names the failure mode first, then the fix, then the trade-off.

## AbortController and AbortSignal

`AbortController` is the platform's standard cancellation primitive — in browsers, workers, Node and Deno. The controller *triggers*; its `signal` is handed to whoever should *react*.

```ts
const controller = new AbortController();
const response = fetch('/api/search?q=react', { signal: controller.signal });
controller.abort(); // the fetch promise rejects with a DOMException named "AbortError"
```

What you need to know:

| API | Behaviour |
|---|---|
| `controller.abort(reason?)` | Sets `signal.aborted = true`, stores `signal.reason`, fires an `abort` event (synchronously). Calling it again is a no-op. |
| `signal.reason` | Your `reason`, or a `DOMException` named `AbortError` if you passed none. `fetch` rejects **with this reason**. |
| `signal.throwIfAborted()` | Throws `signal.reason` if aborted — handy at checkpoints in long async functions. |
| `AbortSignal.timeout(ms)` | A signal that aborts itself after `ms` with a `TimeoutError` `DOMException`. |
| `AbortSignal.any([a, b])` | Aborts when any input aborts, with that input's reason (Chromium 116+, Firefox 124+, Safari 17.4+, Node 20.3+). |
| `addEventListener(type, fn, { signal })` | Removes the listener when the signal aborts — one `abort()` can tear down many listeners. |

Your own async functions can — and in an interview, should — accept a signal too. The pattern: bail out if already aborted, listen for `abort` with `{ once: true }`, and clean up both the work and the listener.

```ts run
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer); // stop the underlying work…
      reject(signal?.reason); // …and settle with the reason
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort); // don't leak listeners
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const controller = new AbortController();
setTimeout(() => controller.abort(), 50);
await sleep(1000, controller.signal).catch((e: DOMException) => console.log('manual abort →', e.name));

await sleep(1000, AbortSignal.timeout(50)).catch((e: DOMException) => console.log('timeout →', e.name));

const userCancel = new AbortController();
const combined = AbortSignal.any([userCancel.signal, AbortSignal.timeout(5000)]);
setTimeout(() => userCancel.abort(new Error('user clicked Cancel')), 20);
await sleep(1000, combined).catch((e: Error) => console.log('any →', e.message));
```

Two caveats worth saying out loud:

- **Aborting is client-side.** The server may already have processed the request — aborting a `POST` doesn't mean the order wasn't placed. Make mutations idempotent (idempotency keys) if that matters.
- **Distinguish cancellation from failure.** An `AbortError` is usually *expected* (the user moved on) and shouldn't show an error toast or be retried.

> [!INTERVIEW] Say it like this
> "I'd pass an `AbortSignal` to `fetch`. Calling `controller.abort()` rejects the fetch with an `AbortError`, which I treat as expected, not as a failure. For a timeout I'd use `AbortSignal.timeout(ms)`, and if the user can also cancel I'd combine both with `AbortSignal.any`. In React I create the controller inside the effect and abort it in the cleanup, so a stale or unmounted request is cancelled automatically."

{{quiz:abort-timeout-reason}}

## Race conditions: latest request wins

Requests don't come back in the order you sent them. Type `r`, `re`, `rea` quickly, and if the response for `r` is slowest, a naive implementation renders results for `r` *last* — under an input that says `rea`.

```ts run
// A fake search API where latency varies by query, so responses can arrive out of order.
const latency: Record<string, number> = { r: 300, re: 50, rea: 120 };
function searchApi(query: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(`results for "${query}"`), latency[query]);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

// ❌ Naive: whichever response ARRIVES last wins
async function naiveOnInput(query: string) {
  const results = await searchApi(query);
  console.log('naive rendered:', results);
}
naiveOnInput('r');
naiveOnInput('re');
naiveOnInput('rea');
await new Promise((r) => setTimeout(r, 400));

// ✅ Abort the previous request whenever a new one starts
let controller: AbortController | undefined;
async function onInput(query: string) {
  controller?.abort();
  controller = new AbortController();
  try {
    console.log('fixed rendered:', await searchApi(query, controller.signal));
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') console.log(`aborted stale request "${query}"`);
    else throw e;
  }
}
onInput('r');
onInput('re');
onInput('rea');
```

Three ways to get "latest request wins", in order of how much they buy you:

| Strategy | How | Trade-off |
|---|---|---|
| **Ignore stale responses** | A request counter (`if (id !== latestId) return`) or an `ignore` flag set in effect cleanup | Simple; the stale request still uses bandwidth |
| **Abort the previous request** | One `AbortController` per request; abort the old one before starting a new one | Also frees the network/server; you must treat `AbortError` as non-fatal |
| **Use a data library** | TanStack Query / SWR key requests by query, dedupe, cache and pass a `signal` to your fetcher | Best for real apps; still explain the mechanism in interviews |

In RxJS vocabulary this is `switchMap`: switch to the newest inner request and unsubscribe from the old one.

In React, the effect cleanup is the natural place to abort, because it runs before the next effect and on unmount:

```tsx
function useSearch(query: string) {
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    // getJson: the fetch helper from Lesson 2 (throws on !response.ok, forwards the signal)
    getJson<string[]>(`/api/search?q=${encodeURIComponent(query)}`, controller.signal)
      .then((data) => {
        setResults(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return; // superseded: expected
        setError(err as Error);
      });
    return () => controller.abort(); // a newer query or unmount cancels this request
  }, [query]);

  return { results, error };
}
```

(In development, `StrictMode` mounts → unmounts → remounts components, so this effect runs, aborts and runs again. If your code handles that gracefully, it handles real races too.)

> [!MISTAKE]
> Thinking debouncing fixes the race. Debouncing reduces *how many* requests you send; any two requests can still return out of order. You need both: debounce to reduce load, latest-request-wins for correctness.

## Debounce vs throttle

Both limit how often a function runs, with opposite philosophies:

- **Debounce**: wait for **quiet**. Collapse a burst of calls into one call, `wait` ms after the *last* call ("only search once the user stops typing").
- **Throttle**: guarantee a **steady rate**. Run at most once every `wait` ms while calls keep coming ("update the scroll indicator at most every 100 ms").

Both have **leading** (run on the first call) and **trailing** (run after the burst/window, with the latest arguments) variants. Here are the same calls through each (wait = 100 ms):

```text
                      0    100  200  300  400  500  600  700  800  900  1000
                      |    |    |    |    |    |    |    |    |    |    |
calls                 x x x x x                x x                 x
debounce (trailing)                ●                  ●                 ●
debounce (leading)    ●                        ●                   ●
throttle (both edges) ●    ●    ●              ●    ●              ●
```

| Strategy (wait = 100 ms) | Fires at (ms) | Calls → invocations |
|---|---|---|
| Raw calls | 0, 40, 80, 120, 160, 500, 540, 900 | 8 |
| Debounce, trailing (default) | 260, 640, 1000 | 3 |
| Debounce, leading only | 0, 500, 900 | 3 |
| Debounce, leading + trailing | 0, 260, 500, 640, 900 | 5 |
| Throttle, leading + trailing | 0, 100, 200, 500, 600, 900 | 6 |

Note how leading + trailing debounce does **not** fire twice for the lone call at 900: the trailing call only happens if there were more calls during the burst. Getting that edge case right is what the debounce exercise tests.

| Use case | Choice | Why |
|---|---|---|
| Search-as-you-type | Debounce (trailing, ~250–300 ms) | Only the final query matters |
| Autosave a form | Debounce + `flush()` on blur/`pagehide` | Save after a pause, never lose the last edit |
| Window resize → recompute layout | Debounce (or `ResizeObserver`) | Only the final size matters |
| Scroll position / progress bar | Throttle (or rAF) | Needs regular updates during the gesture |
| Drag / mousemove visuals | `requestAnimationFrame` | Sync updates to frames, not to an arbitrary interval |
| "Submit" double-click protection | Leading debounce — or simply disable the button while pending | First click counts, the rest are ignored |
| Infinite scroll trigger | `IntersectionObserver` | Don't poll scroll position at all |

> [!TIP]
> In React, a debounced function must be **stable across renders** (create it in `useMemo`/`useRef`, not inline) and **cancelled on unmount**. Often it's simpler to debounce the *value* with a `useDebouncedValue(query, 300)` hook and let an effect react to it (Day 6). And `useDeferredValue` is not a debounce — it defers rendering, not network requests (Day 7).

{{quiz:debounce-or-throttle}}

## Retry with exponential backoff and jitter

Transient failures (a dropped connection, a 503 during a deploy, a 429 rate limit) often succeed on a second try. But retrying immediately and in lockstep is how a thousand clients turn a blip into an outage. The standard recipe:

1. **Exponential backoff**: wait `base * 2 ** attempt` between attempts, capped at a maximum.
2. **Jitter**: randomise the wait so clients don't retry in synchronised waves. "Full jitter" picks uniformly between `0` and the backoff value.
3. **Limits**: a maximum number of attempts, and respect for an `AbortSignal` so the user can give up.

```ts run
const base = 100;
const cap = 5_000;
for (let attempt = 0; attempt < 7; attempt++) {
  const backoff = Math.min(cap, base * 2 ** attempt);
  const fullJitter = Math.round(Math.random() * backoff); // run it twice: the jittered values change
  console.log(`retry ${attempt + 1}: backoff ${backoff} ms, with full jitter ${fullJitter} ms`);
}
```

Just as important is **what not to retry**:

| Retry? | Errors |
|---|---|
| ✅ | Network errors, timeouts, `502`/`503`/`504`, `429` (honour the `Retry-After` header) |
| ❌ | `400`, `401`, `403`, `404`, `422` — the same request will fail the same way |
| ❌ | `AbortError` — the user cancelled |
| ⚠️ | Non-idempotent requests (`POST` that creates something) — only with an idempotency key |

You'll implement `retry(fn, { retries, baseDelay, maxDelay, shouldRetry, signal })` as today's stretch exercise.

## Concurrency limits

`Promise.all(files.map(upload))` starts **every** upload at once. With 20 files that's 20 simultaneous requests:

```ts run
let inFlight = 0;
let peak = 0;
async function fakeUpload(file: string): Promise<string> {
  inFlight++;
  peak = Math.max(peak, inFlight);
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 50));
  inFlight--;
  return `${file} ✓`;
}

const files = Array.from({ length: 20 }, (_, i) => `file-${i + 1}`);
const results = await Promise.all(files.map(fakeUpload));
console.log(`${results.length} uploaded, peak concurrency: ${peak}`);
```

Why limit? Browsers cap concurrent HTTP/1.1 connections per origin (6 in practice) so the extras just queue *and* block your other requests; servers rate-limit; and each in-flight task holds memory. The fix is a **pool**: start `limit` workers that each pull the next unclaimed item from a shared cursor until none are left. Unlike fixed batches (`Promise.all` on chunks of `limit`), a pool refills a slot the moment *any* task finishes, so one slow item doesn't idle the others. Results are written by index to preserve input order. That's the `mapWithConcurrency` exercise — libraries like `p-limit`/`p-map` do the same.

## Async iterators and generators (briefly)

An `async function*` produces values over time; `for await` consumes them. They're a clean fit for **pagination** and **streams**, and they compose with cancellation: `break` (or `return`/`throw`) calls the generator's `return()`, which runs its `finally` block and stops further fetching.

```ts run
type Page = { items: string[]; next: number | null };
const db = Array.from({ length: 7 }, (_, i) => `item-${i + 1}`);

async function fetchPage(cursor: number): Promise<Page> {
  await new Promise((r) => setTimeout(r, 30));
  console.log(`  (fetched page at cursor ${cursor})`);
  const next = cursor + 3 < db.length ? cursor + 3 : null;
  return { items: db.slice(cursor, cursor + 3), next };
}

async function* paginate(): AsyncGenerator<string> {
  let cursor: number | null = 0;
  try {
    while (cursor !== null) {
      const page = await fetchPage(cursor);
      yield* page.items;
      cursor = page.next;
    }
  } finally {
    console.log('  generator cleaned up');
  }
}

for await (const item of paginate()) {
  console.log(item);
  if (item === 'item-4') break; // only the pages we actually consume are fetched
}
```

The consumer pulls, so the producer never runs ahead — natural backpressure. You'll see the same idea in `ReadableStream` (streaming fetch responses) and in React Server Components' streaming (Day 7).

## Key takeaways

- `AbortController` triggers, `AbortSignal` listens. `fetch` rejects with `signal.reason` (`AbortError` by default); `AbortSignal.timeout` → `TimeoutError`; `AbortSignal.any` combines.
- Make your own async APIs accept a `signal`; treat `AbortError` as expected, not as a failure.
- Out-of-order responses are a correctness bug: ignore stale responses or abort the previous request (effect cleanup in React). Debouncing alone doesn't fix it.
- Debounce = after quiet (search, autosave, resize). Throttle = steady rate (scroll, progress). rAF for visuals, `IntersectionObserver` for visibility.
- Retry only transient, idempotent failures, with capped exponential backoff + jitter, and stop on abort.
- Limit concurrency with a worker pool, not fixed batches; keep results in input order.
- Async generators + `for await` model pagination and streams; `break` triggers cleanup.
