import type { Day, Exercise } from '../../types';

import eventLoop from './lessons/event-loop.md?raw';
import promisesAsyncAwait from './lessons/promises-async-await.md?raw';
import cancellationConcurrency from './lessons/cancellation-concurrency.md?raw';

import debounceStarter from './exercises/debounce/starter.ts?raw';
import debounceSolution from './exercises/debounce/solution.ts?raw';
import debounceTests from './exercises/debounce/tests.ts?raw';
import throttleStarter from './exercises/throttle/starter.ts?raw';
import throttleSolution from './exercises/throttle/solution.ts?raw';
import throttleTests from './exercises/throttle/tests.ts?raw';
import promiseAllStarter from './exercises/promise-all/starter.ts?raw';
import promiseAllSolution from './exercises/promise-all/solution.ts?raw';
import promiseAllTests from './exercises/promise-all/tests.ts?raw';
import promiseAnyStarter from './exercises/promise-any/starter.ts?raw';
import promiseAnySolution from './exercises/promise-any/solution.ts?raw';
import promiseAnyTests from './exercises/promise-any/tests.ts?raw';
import mapConcurrencyStarter from './exercises/map-with-concurrency/starter.ts?raw';
import mapConcurrencySolution from './exercises/map-with-concurrency/solution.ts?raw';
import mapConcurrencyTests from './exercises/map-with-concurrency/tests.ts?raw';
import retryStarter from './exercises/retry-backoff/starter.ts?raw';
import retrySolution from './exercises/retry-backoff/solution.ts?raw';
import retryTests from './exercises/retry-backoff/tests.ts?raw';

const debounce: Exercise = {
  id: 'debounce',
  title: 'debounce() with leading, cancel and flush',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 18,
  tags: ['timers', 'closures', 'rate limiting', 'classic implementation'],
  prompt: `Implement \`debounce(fn, wait, options?)\`. Calls that arrive in a burst — each less than \`wait\` ms after the previous one — collapse into a single invocation.

\`\`\`ts
const search = debounce((q: string) => fetchResults(q), 300);
search('r'); search('re'); search('rea'); // one call, 300 ms after the last: fetchResults('rea')
\`\`\`

Requirements:
- **Trailing (default):** invoke once, \`wait\` ms after the **last** call, with the latest arguments and \`this\`.
- **\`{ leading: true }\`:** invoke immediately on the first call of a burst. With both edges on (\`trailing\` defaults to \`true\`), the trailing invocation happens **only if there were further calls** during the burst — a single call must not run twice.
- **\`{ leading: true, trailing: false }\`:** once per burst, at the start (think: ignore double-clicks).
- **\`cancel()\`** drops a pending invocation; **\`flush()\`** runs it right now (no-op if nothing is pending). After either, the next call starts a fresh burst.

The tests use fake timers: time only moves when the test calls \`vi.advanceTimersByTime\`. Read the test file as the spec.

**What the interviewer is looking for:** timer state in a closure, \`clearTimeout\` + reschedule on every call, \`this\`/argument forwarding with a regular \`function\` and \`apply\`, and the leading/trailing edge cases. Expect follow-ups: "add \`maxWait\`" and "how would you use this in React?"`,
  starter: debounceStarter,
  solution: debounceSolution,
  tests: debounceTests,
  hints: [
    'Keep two pieces of closure state: the timer id (is a burst in progress?) and the latest pending call (its arguments and `this`).',
    'On every call: `clearTimeout` the old timer and start a new one. The call is the first of a burst exactly when no timer was running.',
    'Leading: on the first call of a burst, invoke now and do NOT record it as pending. When the timer fires, the burst is over: if `trailing` is on and a call is pending, invoke it; then reset the state.',
  ],
  explanation: `**Approach:** \`timer !== undefined\` means "a burst is in progress". Every call clears and restarts the timer. On the first call of a burst with \`leading\`, invoke immediately; otherwise store \`args\`/\`this\` as the pending call. When the timer fires, the burst is over: invoke the pending call if \`trailing\` is on. \`cancel\` resets everything; \`flush\` clears the timer and runs the end-of-burst step early.

**Edge cases:** clear the pending state *before* invoking \`fn\` (a re-entrant call then starts cleanly); don't return an arrow function (you'd lose the caller's \`this\`); with \`leading\` + \`trailing\`, a single call must invoke once, not twice.

**Complexity:** O(1) per call, one timer at a time.

**Follow-ups:**
- *"Add \`maxWait\`."* → guarantee an invocation at least every \`maxWait\` ms during a never-ending burst: remember when the burst started and invoke when \`now - burstStart >= maxWait\`. Fun fact: lodash's \`throttle\` *is* \`debounce\` with \`maxWait === wait\`.
- *"Return the result."* → lodash returns the last invocation's result. For async work you could return a promise that resolves when the trailing call runs — and you must decide what happens to the promises of superseded calls.
- *"Use it in React."* → create it once (\`useMemo\`/\`useRef\`): an inline \`debounce(...)\` creates a new timer every render and never debounces anything. Call \`cancel()\` in an effect cleanup on unmount, and read the latest callback through a ref to avoid stale closures. Often simpler: debounce the *value* with a \`useDebouncedValue\` hook (Day 6).`,
};

const throttle: Exercise = {
  id: 'throttle',
  title: 'throttle() with leading and trailing edges',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['timers', 'closures', 'rate limiting', 'classic implementation'],
  prompt: `Implement \`throttle(fn, wait)\`: while calls keep coming, invoke \`fn\` **at most once per \`wait\` ms** — on both edges, like lodash's default.

\`\`\`ts
const onScroll = throttle(() => updateProgressBar(), 100);
window.addEventListener('scroll', onScroll); // ≤ 10 updates per second, and the final position is never lost
\`\`\`

Requirements:
- **Leading:** when no window is open, invoke immediately and open a \`wait\` ms window.
- **Trailing:** calls during the window are remembered (latest arguments and \`this\` only). When the window closes, invoke once with them — and that invocation **opens a new window**, so invocations are always at least \`wait\` apart.
- If nothing was called during the window, it simply closes; the next call is a leading call again.
- \`cancel()\` drops a pending trailing call and resets, so the next call is invoked immediately.

**What the interviewer is looking for:** a crisp distinction from debounce, keeping the last call (trailing edge) so the final state isn't lost, and correct spacing under a continuous stream of calls.`,
  starter: throttleStarter,
  solution: throttleSolution,
  tests: throttleTests,
  hints: [
    'Model it as "is a window open?" (a timer id) plus "the latest pending call".',
    'A call with no open window: open one (start a `wait` timer) and invoke immediately. A call while the window is open: just overwrite the pending arguments and `this`.',
    'When the window timer fires: if a call is pending, open a NEW window and invoke it. If not, leave the window closed so the next call is leading.',
  ],
  explanation: `**Approach:** one timer represents the open window. A leading call invokes and opens a window; calls inside the window overwrite the pending call; when the window ends, the pending call (if any) is invoked and immediately opens the next window. Invocations stay ≥ \`wait\` apart and the last call is never lost.

**Two common bugs (both caught by the tests):**
- A timestamp-only throttle — \`if (now - last >= wait) { last = now; fn(); }\` — has no trailing edge, so the final scroll position or resize size is silently dropped.
- Forgetting to open a new window after the trailing call lets the very next call fire immediately: two invocations 0 ms apart.

**Follow-ups:**
- *"Implement it with timestamps."* → compare \`Date.now()\` with the last invocation time and schedule the trailing call for \`wait - elapsed\`.
- *"Support \`{ leading: false }\` / \`{ trailing: false }\`."* → leading off: the first call only schedules; trailing off: calls inside the window are dropped.
- *"Throttle or \`requestAnimationFrame\`?"* → for visual updates rAF is usually better: it runs once per frame, right before paint, and pauses in background tabs.
- *"How do throttle and debounce relate?"* → throttle is debounce with \`maxWait = wait\` — that's literally how lodash implements it.`,
};

const promiseAll: Exercise = {
  id: 'promise-all',
  title: 'Implement Promise.all',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 12,
  tags: ['promises', 'classic implementation', 'generics'],
  prompt: `Implement \`promiseAll(values)\` without using \`Promise.all\`, \`allSettled\`, \`any\` or \`race\`.

- Fulfil with an array of results in **input order** — not the order they settle in.
- Reject as soon as **any** input rejects, with that reason (fail fast).
- Inputs may be plain values or thenables: treat each one like \`Promise.resolve(value)\`.
- An empty array fulfils with \`[]\`.

\`\`\`ts
const [user, posts] = await promiseAll([getUser(), getPosts()]); // typed [User, Post[]]
await promiseAll([1, Promise.resolve(2)]); // [1, 2]
\`\`\`

The signature is copied from TypeScript's own \`lib.es2015.promise.d.ts\`: the mapped tuple type \`{ -readonly [K in keyof T]: Awaited<T[K]> }\` is what keeps \`[User, Post[]]\` precise. (Day 4 covers mapped types properly.)

**What the interviewer is looking for:** the promise constructor, index-based writes, a completion **counter** (not \`results.length\`), the empty-input case, and knowing that fail-fast doesn't cancel the other operations.`,
  starter: promiseAllStarter,
  solution: promiseAllSolution,
  tests: promiseAllTests,
  hints: [
    'Return `new Promise((resolve, reject) => …)` and subscribe to every input with `Promise.resolve(value).then(…)`.',
    'Store each result at its own index (`results[i] = value`) and count fulfilments; resolve when the count reaches the number of inputs.',
    "Pass `reject` straight in as every input's rejection handler — a promise settles only once, so later rejections are ignored. Handle `values.length === 0` up front, or you'll never resolve.",
  ],
  explanation: `**Approach:** one outer promise. For each input, \`Promise.resolve(value).then(onFulfilled, reject)\`. Fulfilment writes \`results[index]\` and decrements a \`remaining\` counter; at zero, resolve. The first rejection calls \`reject\`; every later \`resolve\`/\`reject\` is a no-op because a promise settles once.

**Why a counter?** \`results.length\` is not a completion count: writing \`results[2]\` first produces a sparse array of length 3. Checking \`results.length === values.length\` resolves early, with holes — one of the tests catches exactly that.

**Complexity:** O(n) time and space.

**Follow-ups:**
- *"Accept any iterable."* → \`Array.from(iterable)\` first — the real \`Promise.all\` accepts iterables (a \`Set\`, a generator…).
- *"Now write \`allSettled\`."* → never reject; store \`{ status: 'fulfilled', value }\` or \`{ status: 'rejected', reason }\` and count both outcomes.
- *"Does a rejection stop the other requests?"* → no. To actually cancel, share an \`AbortController\` between the operations and abort it in the rejection handler.
- *"Why \`Promise.resolve(value)\` rather than calling \`value.then\`?"* → it normalises plain values and foreign thenables, and guards against thenables that call back synchronously or more than once.`,
};

const promiseAny: Exercise = {
  id: 'promise-any',
  title: 'Implement Promise.any (and AggregateError)',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 10,
  tags: ['promises', 'classic implementation', 'error handling'],
  prompt: `Implement \`promiseAny(values)\` — the mirror image of \`Promise.all\` — without using \`Promise.any\`, \`all\`, \`allSettled\` or \`race\`.

- Fulfil with the value of the **first input to fulfil**. Rejections are ignored while another input could still fulfil.
- If **every** input rejects, reject with an \`AggregateError\` whose \`errors\` array lists the reasons in **input order**.
- Plain values count as already fulfilled. An empty array rejects with an \`AggregateError\` (nothing can fulfil).

\`\`\`ts
// Try three mirrors, use whichever answers first, fail only if all of them fail
const data = await promiseAny([fetchFrom(cdnA), fetchFrom(cdnB), fetchFrom(origin)]);
\`\`\`

**What the interviewer is looking for:** recognising the symmetry with \`all\` (success and failure swap roles), \`new AggregateError(errors, message)\`, and the empty-input edge case.`,
  starter: promiseAnyStarter,
  solution: promiseAnySolution,
  tests: promiseAnyTests,
  hints: [
    "It's `promiseAll` with fulfilment and rejection swapped.",
    'Pass `resolve` as every input’s fulfilment handler — the first one wins. On rejection, record the reason at its index and count.',
    "When the rejection count reaches the input length, `reject(new AggregateError(errors, 'All promises were rejected'))`. Check for empty input first.",
  ],
  explanation: `**Approach:** resolve on the first fulfilment; collect rejection reasons by index; when all inputs have rejected, reject with \`new AggregateError(errors, message)\`. Same counter technique as \`promiseAll\`.

**\`AggregateError\`** (ES2021) is an \`Error\` subclass with an \`errors\` array — "several things went wrong". \`Promise.any\` uses it, and you can too (validation results, batch failures).

**\`any\` vs \`race\`:** \`race\` settles with the first input to *settle*, so one fast failure wins. \`any\` waits for the first *success*. Fastest-mirror → \`any\`. Timeout → \`race\` against a timer, or better, \`AbortSignal.timeout()\`, which actually cancels the request.

**Follow-up:** *"Cancel the losers once one fulfils."* → give each request the same \`AbortSignal\` and call \`abort()\` after the first fulfilment.`,
};

const mapWithConcurrency: Exercise = {
  id: 'map-with-concurrency',
  title: 'mapWithConcurrency(items, limit, fn)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 18,
  tags: ['promises', 'concurrency', 'async/await'],
  prompt: `Uploading 200 files with \`Promise.all(files.map(upload))\` starts 200 requests at once. Implement a concurrency-limited async map:

\`\`\`ts
const results = await mapWithConcurrency(files, 3, (file, index) => upload(file));
\`\`\`

- Results in **input order**.
- **Never more than \`limit\`** calls in flight — and keep every slot busy: start the next item as soon as **any** call finishes (a pool, not fixed batches of \`limit\`).
- \`fn\` receives \`(item, index)\`.
- If a call rejects, reject with that error and **start no new items** (calls already running may finish).
- \`limit\` must be a positive integer, otherwise reject with a \`RangeError\`. An empty array fulfils with \`[]\` without calling \`fn\`.

**What the interviewer is looking for:** a worker-pool design (or a "launch the next one when one finishes" scheduler), order preservation by index, sensible error behaviour, and being able to explain why batching is worse.`,
  starter: mapConcurrencyStarter,
  solution: mapConcurrencySolution,
  tests: mapConcurrencyTests,
  hints: [
    'Batching (`Promise.all` on chunks of `limit`) wastes slots: one slow item holds up its whole batch. Think "workers pulling from a queue" instead.',
    'Keep a shared `nextIndex`. Start `min(limit, items.length)` async workers; each loops: claim `const i = nextIndex++`, then `results[i] = await fn(items[i], i)`, until no items remain.',
    'Wait for the workers with `Promise.all` (that is fine — it is only `limit` promises). For errors, set a `failed` flag in a `catch` so the other workers stop claiming items, then rethrow.',
  ],
  explanation: `**Approach (worker pool):** start \`min(limit, n)\` async workers sharing a cursor. Each claims the next index synchronously — \`nextIndex++\` is safe because JavaScript is single-threaded and there is no \`await\` between the check and the increment — awaits \`fn\`, writes the result by index, and loops. \`await Promise.all(workers)\` then returns \`results\`. The first rejection rejects that \`Promise.all\`; the \`failed\` flag stops the remaining workers from claiming new items.

**Alternative:** a callback scheduler — \`launch()\` starts one item and calls \`launch()\` again from its \`.then\`; kick off \`limit\` launches and resolve when \`completed === n\`. Same behaviour, more bookkeeping.

**Why not batches?** With durations \`[50, 10, 10, 10]\` and \`limit = 2\`, batches take 60 ms (50, then 10); the pool takes 50 ms and never leaves a slot idle.

**Complexity:** O(n) overall, O(limit) promises in flight.

**Follow-ups:**
- *"Don't stop on the first error."* → collect \`allSettled\`-style outcomes instead of throwing.
- *"Make it cancellable."* → accept an \`AbortSignal\`, check it before claiming each item and pass it into \`fn\`.
- *"Limit to N per second instead?"* → that's rate limiting (a token bucket), a different constraint from "N at a time".
- *"Where is this used?"* → uploads, image prefetching, crawlers, build tools; libraries: \`p-limit\`, \`p-map\`.`,
};

const retryBackoff: Exercise = {
  id: 'retry-backoff',
  title: 'retry() with exponential backoff and abort',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 18,
  tags: ['promises', 'async/await', 'timers', 'cancellation', 'resilience'],
  prompt: `Implement \`retry(fn, options)\`: call \`fn(attempt)\` (attempt is 1-based) until it fulfils, waiting longer after each failure.

\`\`\`ts
const me = await retry(() => getJson<User>('/api/me'), {
  retries: 3, // up to 4 attempts in total
  baseDelay: 200, // waits 200, 400, 800 ms
  maxDelay: 5_000,
  shouldRetry: (error) => !(error instanceof HttpError) || error.status >= 500,
  signal: controller.signal,
});
\`\`\`

- After failed attempt *n*, wait \`min(baseDelay * 2 ** (n - 1), maxDelay)\` ms, then try again — up to \`retries\` retries.
- If every attempt fails, reject with the **last** error.
- If \`shouldRetry(error, attempt)\` returns \`false\`, reject with that error immediately.
- \`signal\`: if it's already aborted, reject with \`signal.reason\` without calling \`fn\`. If it aborts **during a wait**, reject immediately with \`signal.reason\` (don't wait out the timer) and make no further attempts.

The tests use fake timers, so wait with \`setTimeout\`. Jitter is left out to keep the tests deterministic — it's the first follow-up.

**What the interviewer is looking for:** a clean loop with \`try/catch\` around \`await\` (\`return await\`!), the delay formula, not retrying non-transient errors, and a cancellable wait that cleans up its timer and listener.`,
  starter: retryStarter,
  solution: retrySolution,
  tests: retryTests,
  hints: [
    'An `async` function with `for (let attempt = 1; ; attempt++)` reads better than recursion. Inside: `try { return await fn(attempt); } catch (error) { … }`.',
    'In the `catch`, rethrow if `attempt > retries` or `shouldRetry` says no. Otherwise compute the capped delay and `await sleep(delay, signal)`.',
    '`sleep(ms, signal)` resolves on a `setTimeout`; on the signal’s `abort` event it clears the timer and rejects with `signal.reason`. Also check `signal.aborted` before every attempt.',
  ],
  explanation: `**Approach:** loop over attempts; \`return await fn(attempt)\` inside \`try\` (a plain \`return\` would let the rejection escape the \`catch\`); on failure decide whether to give up, otherwise sleep for the capped exponential delay. The abortable \`sleep\` is the pattern from Lesson 3: reject with \`signal.reason\`, \`clearTimeout\` on abort, and remove the listener when the timer wins so long-lived signals don't accumulate listeners.

**Add jitter (first follow-up):** clients that failed together retry together — at exactly 200/400/800 ms — and hit the recovering server in waves. "Full jitter": \`delay = Math.random() * Math.min(cap, base * 2 ** n)\`. Keep it testable by injecting the random source (a \`random = Math.random\` option) and stubbing it in tests.

**Other follow-ups:**
- *"Respect \`Retry-After\`."* → on 429/503, if the server says how long to wait, use that instead of the computed delay.
- *"Which errors should be retried?"* → network errors, timeouts, 502/503/504, 429. Not 4xx validation or auth errors, not \`AbortError\`, and not non-idempotent requests without an idempotency key.
- *"Where does retry belong?"* → in the data layer, once. TanStack Query, for example, retries failed queries 3 times with exponential backoff by default — don't stack your own retries on top.`,
};

const day: Day = {
  number: 2,
  title: 'Async JavaScript & the Event Loop',
  tagline: 'Tasks, microtasks and rendering; promises and async/await in depth; cancellation, debouncing and concurrency for real UIs.',
  summary:
    'Async questions are the most common "trick" questions in frontend interviews and the most common source of real UI bugs. Today you learn the event loop precisely enough to solve any output-prediction puzzle mechanically, master promise semantics and async/await error handling, and practise the cancellation and race-condition patterns behind search-as-you-type. Then you implement the async utilities interviewers ask for: debounce, throttle, `Promise.all`, `Promise.any`, a concurrency-limited map and retry with backoff.',
  objectives: [
    'Describe one turn of the event loop (task → microtasks → render) and solve output-prediction puzzles with a repeatable method',
    'Explain what `await` desugars to and why microtasks don’t let the browser paint',
    'Trace values and errors through promise chains, place `catch`/`finally` correctly and avoid floating promises',
    'Choose deliberately between sequential and parallel awaits, and between `all`, `allSettled`, `race` and `any`',
    'Cancel work with AbortController (including timeouts) and prevent out-of-order responses in search UIs',
    'Implement debounce, throttle, Promise.all, Promise.any, a concurrency-limited map and retry with backoff in TypeScript',
  ],
  skills: ['async', 'javascript', 'browser', 'typescript', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'warm-up-review',
      title: 'Warm-up: Day 1 flashcards',
      minutes: 15,
      intro:
        'Spaced repetition from Day 1 — scope, closures, `this`, prototypes, coercion. Answer each card out loud before flipping it. Closures matter today: debounce, throttle and every async utility you write are closure-based state machines.',
    },
    {
      kind: 'lesson',
      id: 'event-loop',
      title: 'The event loop, precisely',
      minutes: 35,
      body: eventLoop,
      checks: [
        {
          id: 'event-loop-chain-interleave',
          prompt: 'Use the three-column method. What does this log?',
          code: `setTimeout(() => console.log('timeout'), 0);
Promise.resolve()
  .then(() => console.log('then 1'))
  .then(() => console.log('then 2'));
queueMicrotask(() => console.log('microtask'));
console.log('sync');`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'sync, then 1, then 2, microtask, timeout',
            'sync, then 1, microtask, then 2, timeout',
            'sync, microtask, then 1, then 2, timeout',
            'sync, timeout, then 1, microtask, then 2',
          ],
          answer: 1,
          explanation:
            "After the synchronous `sync`, the microtask queue holds `then 1` and `microtask` (in that order) — `then 2` isn't queued yet, because its promise only resolves when the `then 1` callback returns. Running `then 1` queues `then 2` at the **end** of the queue, behind `microtask`. The timeout is a task, so it waits until the microtask queue is empty. The tempting wrong answer runs the whole chain at once; chains advance one link per microtask.",
        },
        {
          id: 'microtask-yield-spinner',
          prompt:
            'A click handler shows a spinner, then processes 100 chunks of ~20 ms each in a loop. Which line, placed between chunks, lets the spinner actually paint and keeps the page responsive?',
          choices: [
            '`await Promise.resolve();`',
            '`queueMicrotask(() => {});`',
            '`await new Promise((resolve) => setTimeout(resolve, 0));`',
            'Nothing is needed: an `async` handler runs in the background',
          ],
          answer: 2,
          explanation:
            "Rendering and input handling happen **between tasks**. `setTimeout` (or `scheduler.yield()`) ends the current task, so the browser can paint the spinner and process clicks before the loop continues. `await Promise.resolve()` only yields to the microtask queue, which is drained completely before any rendering — the page stays frozen. `queueMicrotask(() => {})` doesn't pause the loop at all. And async functions don't run \"in the background\": everything between awaits runs on the main thread.",
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'promises-async-await',
      title: 'Promises & async/await, deeply',
      minutes: 40,
      body: promisesAsyncAwait,
      checks: [
        {
          id: 'then-missing-return',
          prompt: 'What does this log?',
          code: `Promise.resolve(2)
  .then((x) => x * 10)
  .then((x) => {
    x + 1;
  })
  .then((x) => console.log(x));`,
          codeLang: 'ts',
          runnable: true,
          choices: ['21', '20', 'undefined', 'Nothing — the chain is rejected'],
          answer: 2,
          explanation:
            'The second handler has a **block body** without `return`, so it returns `undefined` and the promise returned by that `then` fulfils with `undefined`. Arrow functions only return implicitly with an expression body (`(x) => x + 1`). `20` would be right only if values skipped handlers — they don\'t; every `then` produces a new promise from its handler\'s return value. Nothing threw, so the chain isn\'t rejected.',
        },
        {
          id: 'return-await-in-try',
          prompt: 'What does this log?',
          code: `async function fails(): Promise<string> {
  throw new Error('nope');
}
async function withoutAwait() {
  try {
    return fails();
  } catch {
    return 'caught';
  }
}
async function withAwait() {
  try {
    return await fails();
  } catch {
    return 'caught';
  }
}
const a = await withoutAwait().catch(() => 'escaped');
const b = await withAwait().catch(() => 'escaped');
console.log(a, b);`,
          codeLang: 'ts',
          runnable: true,
          choices: ['caught caught', 'escaped caught', 'escaped escaped', 'caught escaped'],
          answer: 1,
          explanation:
            '`return fails()` leaves the `try` block **immediately**, handing the still-pending promise to the caller; when it rejects, the `catch` is no longer in scope, so the rejection "escapes". `return await fails()` waits inside the `try`, so the rejection is thrown there and caught. Rule: inside `try/catch` (or `try/finally` when the cleanup must wait), use `return await`. Outside of `try`, `return await` is harmless but unnecessary.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'cancellation-concurrency',
      title: 'Cancellation, timing & concurrency in UIs',
      minutes: 35,
      body: cancellationConcurrency,
      checks: [
        {
          id: 'abort-timeout-reason',
          prompt: '`fetch(url, { signal: AbortSignal.timeout(3000) })` — the server takes 10 seconds. What happens after 3 seconds?',
          choices: [
            'The promise rejects with a `DOMException` named `AbortError`',
            'The promise rejects with a `DOMException` named `TimeoutError`',
            'The promise fulfils with a `Response` whose status is 408',
            'Nothing — the timeout only applies to the connection phase',
          ],
          answer: 1,
          explanation:
            "`AbortSignal.timeout(ms)` aborts with a `TimeoutError` `DOMException` as its reason, and `fetch` rejects with the signal's reason. That's useful: you can show \"this is taking too long\" for `TimeoutError` but stay silent for an `AbortError` caused by the user navigating away. A plain `controller.abort()` (no reason) gives `AbortError`. A 408 would be a server *response* — fetch only fulfils when the server actually answers. The signal covers the whole request, including reading the body.",
        },
        {
          id: 'debounce-or-throttle',
          prompt:
            'Pick the best pairing for **(1)** search-as-you-type, **(2)** a reading-progress bar that tracks scrolling, **(3)** autosaving a long form.',
          choices: [
            '(1) throttle, (2) debounce, (3) throttle',
            '(1) debounce, (2) throttle (or rAF), (3) debounce + flush on blur/pagehide',
            '(1) debounce, (2) debounce, (3) throttle',
            'Throttle for all three — it is strictly better because it never drops calls',
          ],
          answer: 1,
          explanation:
            'Search only cares about the **final** query after the user pauses → debounce. A progress bar needs **regular updates during** the scroll → throttle, or `requestAnimationFrame` to sync with frames (debounce would freeze the bar until scrolling stops). Autosave should wait for a pause → debounce, plus `flush()` when the field loses focus or the page is hidden so the last edit is never lost. Throttle isn\'t "strictly better": for search it would fire requests for intermediate queries the user never wanted.',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'async-output-prediction',
      title: 'Output prediction: event loop & promises',
      minutes: 15,
      intro:
        'Use the three-column method (Output / Microtasks / Tasks) on paper for every ordering question — commit to an answer before revealing. Then run the code and read the explanation, even when you were right.',
      questions: [
        {
          id: 'sync-micro-macro-order',
          prompt: 'What does this log?',
          code: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
console.log('5');`,
          codeLang: 'ts',
          runnable: true,
          choices: ['1 5 3 4 2', '1 5 2 3 4', '1 3 4 5 2', '1 5 4 3 2'],
          answer: 0,
          explanation:
            'Synchronous code first: `1`, `5`. Then the microtask queue drains in FIFO order: the `then` callback (`3`) was queued before `queueMicrotask` (`4`) — both are microtasks, neither has priority over the other. Only then does the loop take the next task: the timeout (`2`). Putting `2` before the microtasks is the classic mistake of treating `setTimeout(0)` as "immediate".',
        },
        {
          id: 'executor-runs-sync',
          prompt: 'What does this log?',
          code: `console.log('A');
const p = new Promise<void>((resolve) => {
  console.log('B');
  resolve();
  console.log('C');
});
p.then(() => console.log('D'));
console.log('E');`,
          codeLang: 'ts',
          runnable: true,
          choices: ['A B C E D', 'A E B C D', 'A B E C D', 'A B C D E'],
          answer: 0,
          explanation:
            'The executor runs **synchronously** inside `new Promise`, so `B` and `C` log right away — `resolve()` is not a `return`, so `C` still runs. `p` is already fulfilled when `then` is called, so `D` is queued as a microtask immediately, but microtasks only run once the synchronous code (`E`) has finished. `A B C D E` assumes `then` callbacks run synchronously when the promise is already resolved — they never do.',
        },
        {
          id: 'microtask-schedules-timer',
          prompt: 'What does this log?',
          code: `setTimeout(() => console.log('timeout 1'), 0);
Promise.resolve().then(() => {
  console.log('micro 1');
  setTimeout(() => console.log('timeout 2'), 0);
  Promise.resolve().then(() => console.log('micro 2'));
});
console.log('sync');`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'sync, micro 1, micro 2, timeout 1, timeout 2',
            'sync, micro 1, timeout 1, micro 2, timeout 2',
            'sync, timeout 1, micro 1, micro 2, timeout 2',
            'sync, micro 1, timeout 1, timeout 2, micro 2',
          ],
          answer: 0,
          explanation:
            '`micro 2` is queued **during** the microtask checkpoint, and the checkpoint keeps draining until the queue is empty — so it runs before any task. `timeout 1` was scheduled during the script and `timeout 2` during `micro 1`; tasks run in order, so `timeout 1` comes first. Answers that put `timeout 1` between the microtasks forget that the loop never takes a task while microtasks are pending.',
        },
        {
          id: 'await-continuation-order',
          prompt: 'What does this log?',
          code: `async function a() {
  console.log('a start');
  await b();
  console.log('a end');
}
async function b() {
  console.log('b');
}
console.log('script start');
a();
Promise.resolve().then(() => console.log('then'));
console.log('script end');`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'script start, a start, b, script end, a end, then',
            'script start, a start, b, script end, then, a end',
            'script start, a start, script end, b, a end, then',
            'script start, script end, a start, b, a end, then',
          ],
          answer: 0,
          explanation:
            "Calling `a()` runs it synchronously up to the first `await` — including the call to `b()`, which logs `b` synchronously and returns an already-fulfilled promise. The continuation of `a` is queued as a microtask at that moment, **before** the `then` callback is queued on the next line, so `a end` precedes `then`. (Awaiting a native promise costs one tick since the 2019 spec change; older engines took three and printed `then` first — a nice detail to mention.) Async functions don't start \"later\": `a start` and `b` are synchronous.",
        },
        {
          id: 'interleaved-then-chains',
          prompt: 'What does this log?',
          code: `Promise.resolve()
  .then(() => console.log('a1'))
  .then(() => console.log('a2'))
  .then(() => console.log('a3'));
Promise.resolve()
  .then(() => console.log('b1'))
  .then(() => console.log('b2'));`,
          codeLang: 'ts',
          runnable: true,
          choices: ['a1 b1 a2 b2 a3', 'a1 a2 a3 b1 b2', 'b1 b2 a1 a2 a3', 'a1 b1 a2 a3 b2'],
          answer: 0,
          explanation:
            'Only the first link of each chain is queued during the script: `[a1, b1]`. Each callback, when it returns, resolves its promise and queues the **next** link at the end of the queue: after `a1` → `[b1, a2]`, after `b1` → `[a2, b2]`, and so on. Independent chains interleave one link per tick. Running a whole chain at once (`a1 a2 a3 …`) is the misconception this question targets.',
        },
        {
          id: 'expired-timers-order',
          prompt: 'The main thread is busy for 30 ms. What does this log?',
          code: `setTimeout(() => console.log('slow'), 10);
setTimeout(() => console.log('fast'), 0);
const start = Date.now();
while (Date.now() - start < 30) {
  // busy-wait 30 ms: both timers expire meanwhile
}
console.log('sync done');`,
          codeLang: 'ts',
          runnable: true,
          choices: ['sync done, fast, slow', 'sync done, slow, fast', 'fast, slow, sync done', 'fast, sync done, slow'],
          answer: 0,
          explanation:
            'Timers can\'t interrupt running code (run-to-completion), so `sync done` is first even though both delays have elapsed. Expired timers then run in order of their **due time**, not their scheduling order: `fast` was due at ~0 ms, `slow` at ~10 ms. Also notice what this demonstrates: the delay is a *minimum* — `fast` ran ~30 ms late because the thread was busy, which is exactly how long tasks hurt responsiveness.',
        },
        {
          id: 'catch-recovers-chain',
          prompt: 'What does this log?',
          code: `Promise.reject(new Error('boom'))
  .then(() => console.log('then 1'))
  .catch((e: Error) => {
    console.log('caught', e.message);
    return 'recovered';
  })
  .then((v) => console.log('then 2', v))
  .finally(() => console.log('finally'));`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'caught boom → then 2 recovered → finally',
            'then 1 → caught boom → finally',
            'caught boom → finally',
            'caught boom → then 2 undefined → finally',
          ],
          answer: 0,
          explanation:
            "The rejection skips `then 1` (a fulfilment handler) and reaches `catch`. `catch` returns a new promise that **fulfils** with the handler's return value, so the chain is recovered: `then 2` receives `'recovered'`. `finally` runs last and passes the value through. Answer 3 assumes a caught chain stays rejected; answer 4 forgets that `catch` returned a value.",
        },
        {
          id: 'foreach-async-order',
          prompt: 'What does this log?',
          code: `const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function run() {
  const items = [3, 1, 2];
  items.forEach(async (n) => {
    await wait(n * 10);
    console.log(n);
  });
  console.log('done');
}
run();`,
          codeLang: 'ts',
          runnable: true,
          choices: ['done 1 2 3', '3 1 2 done', '1 2 3 done', 'done 3 1 2'],
          answer: 0,
          explanation:
            '`forEach` ignores the promises returned by the async callback, so nothing waits: all three callbacks start, hit `await` and return; `done` logs immediately. The numbers then appear in order of their timers (10, 20, 30 ms) — `1 2 3`. `3 1 2 done` is what people expect `forEach` to do; that behaviour needs `for (const n of items) await …`. `Promise.all(items.map(async …))` would give `1 2 3 done`.',
        },
        {
          id: 'promise-all-no-cancel',
          prompt: 'What does this log?',
          code: `const task = (ms: number, name: string, fail = false) =>
  new Promise<string>((resolve, reject) =>
    setTimeout(() => {
      console.log('settled', name);
      if (fail) reject(new Error(name));
      else resolve(name);
    }, ms),
  );

try {
  await Promise.all([task(30, 'a'), task(10, 'b', true), task(20, 'c')]);
} catch (e) {
  console.log('caught', (e as Error).message);
}`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'settled b, caught b, settled c, settled a',
            'settled b, caught b',
            'settled b, settled c, settled a, caught b',
            'caught b, settled b, settled c, settled a',
          ],
          answer: 0,
          explanation:
            '`Promise.all` rejects as soon as `b` rejects (fail fast), so `caught b` logs right after `settled b`. But `Promise.all` **cancels nothing**: the other operations were already running and still settle at 20 and 30 ms — their results are simply ignored. Answer 2 assumes cancellation; answer 3 describes `allSettled`-like waiting. To actually stop the others you need an `AbortController`.',
        },
        {
          id: 'race-vs-any',
          prompt: 'What does this log?',
          code: `const fail = (ms: number) =>
  new Promise<string>((_, reject) => setTimeout(() => reject(new Error(\`fail \${ms}\`)), ms));
const ok = (ms: number) => new Promise<string>((resolve) => setTimeout(() => resolve(\`ok \${ms}\`), ms));

const raced = await Promise.race([fail(10), ok(20)]).catch((e: Error) => e.message);
const first = await Promise.any([fail(10), ok(20)]);
console.log(raced, '|', first);`,
          codeLang: 'ts',
          runnable: true,
          choices: ['fail 10 | ok 20', 'ok 20 | ok 20', 'fail 10 | fail 10', 'ok 20 | AggregateError'],
          answer: 0,
          explanation:
            '`race` settles like the first input to **settle** — here a rejection at 10 ms, caught and turned into its message. `any` ignores rejections while something can still succeed and fulfils with the first **fulfilment**, `ok 20`. It would reject with an `AggregateError` only if every input rejected. Mixing these two up is common; remember: race = first to finish, any = first to succeed.',
        },
        {
          id: 'async-return-promise-ticks',
          prompt: 'Senior-level: an async function that **returns a promise**. What does this log?',
          code: `async function f() {
  return Promise.resolve('f');
}
f().then((v) => console.log(v));
Promise.resolve()
  .then(() => console.log('x'))
  .then(() => console.log('y'))
  .then(() => console.log('z'));`,
          codeLang: 'ts',
          runnable: true,
          choices: ['x y f z', 'f x y z', 'x f y z', 'x y z f'],
          answer: 0,
          explanation:
            "Resolving a promise **with another promise** (which is what `return somePromise` from an async function does) costs two extra microtask ticks: one job to call the inner promise's `then`, and one for that reaction to resolve the outer promise. Only then is `f`'s `then` callback queued — so it lands after `y` and before `z`. Returning a plain value (`return 'f'`) would log `f x y z`. Don't write code that depends on tick counts — but knowing *why* it happens shows you understand promise resolution.",
        },
        {
          id: 'not-a-microtask',
          prompt: 'Which of these callbacks is **not** run as a microtask?',
          choices: [
            'A `.then()` callback of a fulfilled promise',
            'The code after `await` in an async function',
            'A `MutationObserver` callback',
            'A `requestAnimationFrame` callback',
          ],
          answer: 3,
          explanation:
            '`requestAnimationFrame` callbacks run during the browser\'s **rendering steps**, once per frame, right before style/layout/paint — many tasks can run between two frames. Promise reactions (including `await` continuations) and `MutationObserver` callbacks are microtasks, drained after every task. `MutationObserver` being a microtask is the less-known one: it lets the observer see a batch of DOM changes made in one synchronous block.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'async-utilities',
      title: 'Build the async utilities interviewers ask for',
      minutes: 55,
      intro:
        'Interview conditions: talk out loud, set a timer (≈15 minutes for a core exercise), no AI. Suggested order: `promiseAll` → `promiseAny` (warm-ups), then `debounce` and `throttle` (the two most-asked), then `mapWithConcurrency`; `retry` is the stretch. The tests use fake timers — time only moves when a test advances it — so read the test file as the spec. After passing, read the explanation: the follow-ups are what interviewers ask next.',
      exercises: [promiseAll, promiseAny, debounce, throttle, mapWithConcurrency, retryBackoff],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–120 seconds before revealing the model answer. Lead with a one-sentence answer, then the mechanics, then a practical consequence or trade-off. For the event-loop questions, sketch the loop on paper while you talk — interviewers love a diagram.',
    },
  ],
  flashcards: [
    {
      id: 'event-loop-turn',
      front: 'One turn of the browser event loop, in order?',
      back: 'Run **one task** to completion → drain the **entire microtask queue** → if a frame is due: `requestAnimationFrame` callbacks, style, layout, paint → next task.',
    },
    {
      id: 'microtask-sources',
      front: 'Name the microtask sources.',
      back: 'Promise reactions (`then`/`catch`/`finally`), the continuation after `await`, `queueMicrotask`, and `MutationObserver` callbacks.',
    },
    {
      id: 'task-sources',
      front: 'Name common task ("macrotask") sources.',
      back: 'The initial script, `setTimeout`/`setInterval`, UI events (click, input), network/I/O callbacks, `postMessage`/`MessageChannel`, `setImmediate` (Node).',
    },
    {
      id: 'microtask-starvation',
      front: 'Why can microtasks starve the page?',
      back: 'The checkpoint drains until the queue is empty — including microtasks queued during the drain. An endless chain never lets the loop reach the next task or a render.',
    },
    {
      id: 'await-desugared',
      front: 'What does `await x` actually do?',
      back: 'Code runs synchronously up to the `await`; the rest of the function is subscribed to `Promise.resolve(x)` and runs later as a **microtask** — even when `x` is not a promise.',
    },
    {
      id: 'settimeout-zero',
      front: 'What does `setTimeout(fn, 0)` really mean?',
      back: 'Queue `fn` as a **new task** after at least 0 ms: after the current script, all microtasks, earlier tasks and possibly a render. Timers nested > 5 levels deep are clamped to ≥ 4 ms.',
    },
    {
      id: 'yield-to-paint',
      front: 'How do you let the browser paint during a long computation?',
      back: 'Yield to the **task** queue — `await new Promise(r => setTimeout(r))` or `scheduler.yield()` — not `await Promise.resolve()` (microtasks run before rendering). Or move the work to a Web Worker.',
    },
    {
      id: 'raf-timing',
      front: 'When do `requestAnimationFrame` callbacks run?',
      back: 'Once per frame, in the rendering steps, **right before** style/layout/paint. Not a microtask, not after paint, and paused in background tabs.',
    },
    {
      id: 'node-nexttick',
      front: 'Node: `process.nextTick` vs promise callbacks vs `setImmediate`?',
      back: 'The `nextTick` queue drains before promise microtasks (in CommonJS). `setImmediate` runs in the check phase after I/O polling; vs `setTimeout(0)` its order is only guaranteed inside an I/O callback.',
    },
    {
      id: 'executor-sync',
      front: 'Does the `new Promise(executor)` executor run synchronously?',
      back: 'Yes — immediately, inside the constructor. Only reactions (`then` callbacks) are async. A `throw` in the executor rejects the promise; extra `resolve`/`reject` calls are ignored.',
    },
    {
      id: 'then-returns-new-promise',
      front: 'What does `p.then(handler)` return?',
      back: 'A **new** promise: fulfils with the handler’s return value, rejects if it throws, **adopts** a returned promise/thenable. A missing handler passes the value or reason through.',
    },
    {
      id: 'catch-recovers',
      front: 'What state is the chain in after `.catch(fn)` handles a rejection?',
      back: '**Fulfilled** with `fn`’s return value — catching recovers the chain — unless `fn` rethrows or returns a rejected promise.',
    },
    {
      id: 'finally-semantics',
      front: 'What does `.finally(fn)` pass along?',
      back: 'The original value or reason, unchanged. `fn` gets no arguments and its return value is ignored — unless it throws (or returns a rejected promise), which replaces the outcome.',
    },
    {
      id: 'return-await',
      front: 'Why write `return await` inside `try`?',
      back: '`return promise` leaves the `try` before the promise settles, so its rejection bypasses your `catch`. `return await` settles it inside the `try`.',
    },
    {
      id: 'foreach-async',
      front: 'What’s wrong with `items.forEach(async (item) => await save(item))`?',
      back: '`forEach` ignores the returned promises: nothing waits for the saves and their rejections are unhandled. Use `for…of` + `await` (sequential) or `await Promise.all(items.map(…))` (parallel).',
    },
    {
      id: 'promise-combinators',
      front: '`all` / `allSettled` / `race` / `any` — one line each?',
      back: '**all**: every value, or the first rejection. **allSettled**: every outcome, never rejects. **race**: first to settle. **any**: first to fulfil, else `AggregateError`. None cancel the rest.',
    },
    {
      id: 'fetch-http-errors',
      front: 'Does `fetch` reject on a 404 or 500?',
      back: 'No — it fulfils with a `Response`. Check `response.ok` / `status`. `fetch` rejects only on network failure or abort.',
    },
    {
      id: 'abort-reason',
      front: 'What does `fetch` reject with when its signal aborts?',
      back: '`signal.reason`: an `AbortError` DOMException by default, a `TimeoutError` for `AbortSignal.timeout(ms)`, or whatever you passed to `controller.abort(reason)`.',
    },
    {
      id: 'debounce-vs-throttle',
      front: 'Debounce vs throttle?',
      back: '**Debounce**: one call after `wait` ms of quiet (search, autosave, resize end). **Throttle**: at most one call per `wait` ms during continuous activity (scroll, progress, analytics).',
    },
    {
      id: 'backoff-jitter',
      front: 'Why add jitter to exponential backoff?',
      back: 'Clients that failed together would retry together, hitting the recovering server in synchronised waves. Full jitter: wait `random(0, min(cap, base × 2ⁿ))`.',
    },
  ],
  interviewQuestions: [
    {
      id: 'explain-event-loop',
      kind: 'concept',
      question: 'Explain the JavaScript event loop. Why does a resolved promise’s callback run before a `setTimeout(fn, 0)`?',
      answer: `**One-liner:** JavaScript runs on a single thread with run-to-completion semantics, and the event loop is the host's scheduler for what runs next: one task, then every pending microtask, then — in browsers — possibly a render.

**The mechanics:**
- Synchronous code runs on the call stack until the stack is empty. Nothing interrupts it.
- Async work (timers, network, user input) is handled by the host — the browser or Node. When it completes, the host queues a callback as a **task**.
- After each task the loop performs a **microtask checkpoint**: it drains the microtask queue completely — promise reactions, the code after \`await\`, \`queueMicrotask\` — including microtasks queued during the drain.
- Then, if a frame is due, the browser runs \`requestAnimationFrame\` callbacks and does style, layout and paint. Then it picks the next task.

**So, for the question:** \`setTimeout(fn, 0)\` queues a *task*; \`Promise.resolve().then(cb)\` queues a *microtask*. The current script must finish first, and then microtasks are drained before the loop takes another task — so \`cb\` always wins.

**Why it matters in practice:** a long task blocks input and painting, which hurts INP. Microtasks don't yield to rendering, so chunking work with \`await Promise.resolve()\` doesn't keep the UI responsive — you need a real task boundary (\`setTimeout\`, \`scheduler.yield()\`) or a Web Worker. It also explains React's automatic batching: several \`setState\` calls in one handler become a single render scheduled after the handler returns.`,
      followUps: [
        'What happens if a microtask keeps scheduling microtasks?',
        'Where does requestAnimationFrame fit in the loop?',
        'How is the Node.js event loop different?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'microtasks-vs-macrotasks',
      kind: 'concept',
      question: 'What is the difference between microtasks and macrotasks? Give examples and a practical consequence.',
      answer: `**One-liner:** tasks ("macrotasks") are the units the event loop picks one at a time; microtasks are a higher-priority queue that is drained completely after every task, before rendering.

**Examples:**
- **Tasks:** the initial script, \`setTimeout\`/\`setInterval\`, DOM events like clicks, network callbacks, \`postMessage\`/\`MessageChannel\`, \`setImmediate\` in Node.
- **Microtasks:** \`then\`/\`catch\`/\`finally\` callbacks, the continuation after \`await\`, \`queueMicrotask\`, \`MutationObserver\`.

**Practical consequences:**
1. **Ordering:** promise callbacks run before any timer queued at the same time — the basis of every "what does this log" question.
2. **Starvation:** the microtask queue drains until empty, so a microtask that keeps scheduling microtasks blocks timers, input and painting — worse than a recursive \`setTimeout\`, which yields between iterations.
3. **Responsiveness:** to let the browser paint during long work you must yield to the *task* queue (\`setTimeout\`, \`scheduler.yield()\`), not the microtask queue.
4. **What microtasks are good for:** batching. Coalesce several synchronous changes and notify once "at the end of this tick", before the next paint — that's how many state libraries batch notifications, and why \`MutationObserver\` delivers a batch of DOM changes at once.

**Nuance that signals depth:** "macrotask" is colloquial — the HTML spec just says "task" and has several task queues the browser may prioritise (input over timers, for instance). And Node adds \`process.nextTick\`, whose queue is drained even before promise microtasks.`,
      followUps: ['Why doesn’t `await Promise.resolve()` let the browser paint?', 'What is `queueMicrotask` useful for?', 'Is a click event handler a task or a microtask?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'promise-combinators',
      kind: 'concept',
      question: 'Compare `Promise.all`, `Promise.allSettled`, `Promise.race` and `Promise.any`. When would you use each?',
      answer: `**One-liner:** they differ in what they wait for and how they treat failure — \`all\` needs everything, \`allSettled\` reports everything, \`race\` takes the first to settle, \`any\` takes the first success.

- **\`Promise.all\`** fulfils with every value, in *input* order, once all fulfil; it rejects as soon as one rejects (fail fast) with that reason. Use it when you need every result — a page that needs the user *and* their permissions. Empty input fulfils with \`[]\`.
- **\`Promise.allSettled\`** never rejects; it returns \`{ status, value }\` or \`{ status, reason }\` per input. Use it for independent work where partial success is useful — dashboard widgets, a batch-upload report.
- **\`Promise.race\`** settles like the first input to settle, success or failure. The classic use is a timeout. Empty input stays pending forever.
- **\`Promise.any\`** fulfils with the first *fulfilment* and only rejects if all reject, with an \`AggregateError\` holding every reason. Use it for redundancy — the fastest of several mirrors or caches.

**The point most candidates miss:** none of them cancel anything. The promises you pass in are already running; when \`all\` rejects or \`race\` settles, the other operations continue and their results are ignored. To stop them you pass an \`AbortSignal\` to each operation and abort it. For fetch timeouts specifically, \`AbortSignal.timeout(ms)\` beats \`race\`, because it actually cancels the request.

**TypeScript bonus:** \`Promise.all\` preserves tuple types, so \`const [user, posts] = await Promise.all([getUser(), getPosts()])\` is fully typed.`,
      followUps: ['Implement Promise.all.', 'What do `Promise.all([])` and `Promise.race([])` return?', 'How would you add a timeout to a fetch?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'async-error-handling',
      kind: 'concept',
      question: 'How do you handle errors with async/await? Where should the `catch` go?',
      answer: `**One-liner:** \`await\` turns a rejection into a thrown exception, so I use ordinary \`try/catch\` — and I put it at the layer that can actually do something about the error.

**Mechanics:**
- An async function's promise rejects if anything inside it throws; \`await\` rethrows a rejection at that line.
- Inside \`try\`, I write \`return await promise\`. A plain \`return\` leaves the \`try\` before the promise settles, so the rejection would skip my \`catch\`.
- In strict TypeScript the catch variable is \`unknown\`, so I narrow: \`instanceof HttpError\`, or a check for \`AbortError\`, which usually means "cancelled", not "failed".
- \`fetch\` only rejects on network errors, so one helper converts \`!response.ok\` into a typed \`HttpError\`.

**Where to catch:**
- **Data layer:** usually not at all — or wrap with context: \`throw new Error('Loading profile failed', { cause: error })\`.
- **Retry layer:** catch transient failures (network, 5xx, 429), retry with backoff, rethrow the rest.
- **UI layer:** catch to render an error state or a toast. In React, error boundaries catch *rendering* errors but **not** errors in event handlers or async callbacks, so those need explicit handling.
- **Global:** an \`unhandledrejection\` listener feeding error monitoring, as a safety net.

**Anti-patterns:** swallowing errors (\`.catch(console.error)\` turns the rejection into \`undefined\` and moves the crash somewhere confusing), floating promises nobody awaits, and \`forEach(async …)\`. typescript-eslint's \`no-floating-promises\` and \`no-misused-promises\` catch most of these.`,
      followUps: [
        'Why doesn’t `return promise` inside try/catch catch the rejection?',
        'Do React error boundaries catch errors from async code?',
        'What is an unhandled rejection, and what does Node do with one?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'cancel-fetch',
      kind: 'concept',
      question: 'How do you cancel a fetch request? How would you add a timeout?',
      answer: `**One-liner:** with an \`AbortController\` — pass its \`signal\` to \`fetch\` and call \`controller.abort()\`; the fetch promise rejects with the signal's reason, an \`AbortError\` by default.

**Details:**
- \`controller.abort(reason?)\` flips \`signal.aborted\`, stores \`signal.reason\` and fires an \`abort\` event. \`fetch\` rejects with that reason and the browser tears down the request — including a response body that's still streaming.
- **Timeout:** \`fetch(url, { signal: AbortSignal.timeout(5000) })\` rejects with a \`TimeoutError\` DOMException, so I can tell a timeout from a user cancellation.
- **Both at once:** \`AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])\` aborts on whichever comes first.
- **In React:** create the controller inside \`useEffect\`, return \`() => controller.abort()\` as the cleanup, and ignore \`AbortError\` in the catch. Requests are then cancelled when the dependencies change or the component unmounts — which also fixes out-of-order responses.
- **My own async APIs** accept \`{ signal }\` and either pass it down to \`fetch\` or listen for \`abort\` to clear timers — the same contract the platform uses.

**Caveats:** aborting is client-side only. The server may already have processed a \`POST\`, so mutations need idempotency keys if that matters. And \`Promise.race\` against a timer is *not* cancellation — it stops waiting, but the request keeps running.`,
      followUps: [
        'How do you tell a timeout apart from a user cancellation?',
        'How would you make your own async function cancellable?',
        'What happens on the server when the client aborts?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'debounce-vs-throttle',
      kind: 'concept',
      question: 'Explain debounce vs throttle, with real use cases. How would you use them in React?',
      answer: `**One-liner:** debounce waits for a pause and then runs once; throttle runs at a steady maximum rate while activity continues.

**Debounce:** every call resets a timer, and the function runs \`wait\` ms after the *last* call. Leading mode runs on the first call instead and ignores the rest of the burst. Use cases: search-as-you-type (~300 ms — only the final query matters), autosave after the user stops typing (with a \`flush\` on blur so the last edit is never lost), recomputing after a resize ends.

**Throttle:** runs at most once per \`wait\` ms — immediately on the first call, then, with a trailing edge, once at the end of each window with the latest arguments, so the final state isn't lost. Use cases: scroll-driven UI like a progress bar, analytics for continuous events, rate-limiting a refresh button.

**Better tools sometimes:** \`requestAnimationFrame\` for visual updates (aligned with frames), \`IntersectionObserver\` for infinite scroll instead of scroll listeners, and simply disabling a button while its request is pending instead of debouncing clicks.

**In React:** the debounced function must be stable across renders — create it once with \`useMemo\` or a ref; otherwise every render makes a new timer and nothing is debounced — and cancel it on unmount. To avoid stale closures it should call the latest callback through a ref. Often cleaner: debounce the *value* with a small \`useDebouncedValue\` hook and let an effect fetch when it changes. And note: debouncing reduces the number of requests but doesn't guarantee their order — I still need latest-request-wins.`,
      followUps: ['Implement debounce with leading and trailing options.', 'What does `maxWait` do?', 'Is `useDeferredValue` a debounce?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'search-race-condition',
      kind: 'concept',
      question: 'You built search-as-you-type. Users sometimes see results for an older query than the one in the input. Why, and how do you fix it?',
      answer: `**One-liner:** responses arrive in a different order than the requests were sent, so a slow response for an old query overwrites newer results. The fix is "latest request wins": ignore or cancel stale requests.

**Why it happens:** typing "r", "re", "rea" fires three requests. Latency varies — "r" matches more rows, hits a cold cache, or is just unlucky — so it can finish last, and a naive \`.then(setResults)\` renders it last.

**Fixes, from simplest to best:**
1. **Ignore stale responses:** a request counter (\`if (id !== latestId) return\`) or, in React, an \`ignore\` flag set in the effect cleanup.
2. **Abort the previous request:** one \`AbortController\` per request, aborted when a new query starts — in React, \`return () => controller.abort()\` from the effect. This also saves bandwidth and server work. \`AbortError\` is treated as expected, not shown as an error.
3. **Use a data-fetching library** like TanStack Query: data is cached per query key, so the UI always reads the current key's data, and the fetcher receives an \`AbortSignal\`.

**Then round out the answer:** debounce the input (~300 ms) to cut request volume — while pointing out that debouncing alone doesn't fix ordering; cache recent queries; keep showing the previous results while the next ones load instead of flashing a spinner; handle error and empty states; and build the input as an accessible combobox (Day 9).`,
      followUps: ['Why doesn’t debouncing fix it?', 'How exactly does the effect cleanup help?', 'How would you cache results per query?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'sequential-vs-parallel-await',
      kind: 'concept',
      question: 'What is the difference between sequential and parallel awaits? What is wrong with `forEach(async …)`?',
      answer: `**One-liner:** \`await\` pauses the function, so independent awaits in a row run one after another and their latencies add up; starting them together and awaiting \`Promise.all\` makes the total roughly the slowest one, not the sum.

**Example:** \`const user = await getUser(); const posts = await getPosts();\` takes 200 + 300 ms. \`const [user, posts] = await Promise.all([getUser(), getPosts()])\` takes about 300 ms. Sequential is right only when there's a real dependency — I need \`user.id\` to fetch the posts — or when I deliberately want to limit load.

**A subtle trap:** \`const a = getA(); const b = getB(); await a; await b;\` *is* parallel, but if \`b\` rejects while I'm still awaiting \`a\`, that rejection is unhandled for a while. \`Promise.all\` subscribes to both immediately; \`allSettled\` if partial results are acceptable.

**\`forEach(async …)\`:** \`forEach\` ignores its callback's return value, so the promises are dropped. Code after the loop runs before any of the work has finished, and rejections are unhandled. Replace it with \`for…of\` + \`await\` for sequential processing, \`await Promise.all(items.map(async …))\` for parallel, or a concurrency-limited pool (\`p-limit\`, or a small worker-pool helper) when there are hundreds of items — browsers only open about six HTTP/1.1 connections per origin anyway.

**In React terms:** request waterfalls — a parent fetches, renders, then a child starts its own fetch — are the same sequential-await problem at the component level. Fix them by fetching in parallel, hoisting requests to a route loader, or prefetching (Days 7 and 10).`,
      followUps: ['How would you limit concurrency to 3?', 'When is sequential awaiting actually correct?', 'What does a request waterfall look like in a React app?'],
      minutes: 2,
      level: 'core',
    },
  ],
};

export default day;
