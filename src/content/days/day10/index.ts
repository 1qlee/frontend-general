import type { Day, Exercise } from '../../types';

import measuringPerformance from './lessons/measuring-performance.md?raw';
import loadingPerformance from './lessons/loading-performance.md?raw';
import runtimeAndNetwork from './lessons/runtime-and-network.md?raw';

import cacheControlStarter from './exercises/parse-cache-control/starter.ts?raw';
import cacheControlSolution from './exercises/parse-cache-control/solution.ts?raw';
import cacheControlTests from './exercises/parse-cache-control/tests.ts?raw';
import lruStarter from './exercises/lru-cache/starter.ts?raw';
import lruSolution from './exercises/lru-cache/solution.ts?raw';
import lruTests from './exercises/lru-cache/tests.ts?raw';
import chunksStarter from './exercises/process-in-chunks/starter.ts?raw';
import chunksSolution from './exercises/process-in-chunks/solution.ts?raw';
import chunksTests from './exercises/process-in-chunks/tests.ts?raw';
import fetcherStarter from './exercises/cached-fetcher-swr/starter.ts?raw';
import fetcherSolution from './exercises/cached-fetcher-swr/solution.ts?raw';
import fetcherTests from './exercises/cached-fetcher-swr/tests.ts?raw';
import clsStarter from './exercises/cls-session-windows/starter.ts?raw';
import clsSolution from './exercises/cls-session-windows/solution.ts?raw';
import clsTests from './exercises/cls-session-windows/tests.ts?raw';

const parseCacheControl: Exercise = {
  id: 'parse-cache-control',
  title: 'parseCacheControl() + cache freshness',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 12,
  tags: ['http caching', 'parsing', 'networking'],
  prompt: `Browsers, CDNs and service workers all answer the same question: *may I reuse this stored response right now?* Implement both halves.

**1. \`parseCacheControl(header)\`** → a typed \`CacheControl\` object.
- Directive names are case-insensitive; ignore whitespace around directives.
- \`max-age\`, \`s-maxage\` and \`stale-while-revalidate\` take delta-seconds: non-negative integers, possibly quoted (\`max-age="60"\`). Ignore invalid values; if a directive repeats, the first one wins.
- Flags: \`no-cache\`, \`no-store\`, \`must-revalidate\`, \`immutable\`, \`public\`, \`private\`. Ignore unknown directives.

**2. \`getCacheStatus(header, ageSeconds, { shared })\`** → \`'fresh' | 'stale-while-revalidate' | 'revalidate' | 'no-store'\`
- \`no-store\` → \`'no-store'\`. A **shared** cache (\`shared: true\` — a CDN or proxy) must also treat \`private\` responses as \`'no-store'\`.
- \`no-cache\` → always \`'revalidate'\`.
- Lifetime = \`s-maxage\` (shared caches only, when present), else \`max-age\`, else 0 (no heuristic freshness here). **Fresh while \`age < lifetime\`.**
- For \`stale-while-revalidate\` seconds after that → \`'stale-while-revalidate'\`, unless \`must-revalidate\` forbids serving stale content.
- Otherwise → \`'revalidate'\`.

\`\`\`ts
getCacheStatus('public, max-age=31536000, immutable', 3600);       // 'fresh'
getCacheStatus('no-cache', 0);                                      // 'revalidate'
getCacheStatus('max-age=0, s-maxage=300', 100, { shared: true });   // 'fresh' (the CDN may serve it)
getCacheStatus('max-age=60, stale-while-revalidate=30', 70);        // 'stale-while-revalidate'
\`\`\`

**What the interviewer is looking for:** \`no-cache\` ≠ \`no-store\`, knowing that \`s-maxage\` and \`private\` are about *shared* caches, the strict \`<\` freshness boundary, and defensive string parsing (case, whitespace, quotes, garbage values).`,
  starter: cacheControlStarter,
  solution: cacheControlSolution,
  tests: cacheControlTests,
  hints: [
    "Split the header on ',', then split each directive on the FIRST '='. Trim both sides and lowercase the name.",
    'Strip one pair of surrounding quotes from the value and accept it only if it matches /^\\d+$/. Assign it only while the field is still undefined so the first occurrence wins.',
    'In getCacheStatus check in this order: no-store (or private in a shared cache) → no-cache → lifetime = shared ? sMaxAge ?? maxAge : maxAge (default 0) → age < lifetime → the SWR window (skipped when mustRevalidate) → revalidate.',
  ],
  explanation: `**Approach:** a small tokenizer (split on commas, then on the first \`=\`), a \`switch\` on the lowercased directive name, and a validator for delta-seconds. The decision function is a short, ordered list of rules — order matters, because \`no-store\` and \`no-cache\` override any lifetime ("the most restrictive directive wins").

**Spec notes worth mentioning** (RFC 9111 for HTTP caching, RFC 5861 for \`stale-while-revalidate\`):
- A response is fresh when \`freshness_lifetime > current_age\` — at exactly \`max-age\` seconds it is stale.
- \`s-maxage\` only applies to shared caches, which is how you give the CDN a different lifetime than the browser (\`max-age=0, s-maxage=300\`).
- Invalid freshness information should make a response stale, which is what "ignore the bad value → lifetime 0" achieves.
- Real caches compute **age** as roughly \`Age header + (now − response time)\`, and with no explicit lifetime they may use **heuristic freshness** (commonly 10% of the time since \`Last-Modified\`) — the reason HTML must always carry an explicit \`Cache-Control\`.

**Edge case a naive parser gets wrong:** \`no-cache="Set-Cookie, Authorization"\` — a quoted list containing a comma. Splitting on every comma breaks it; a production parser tokenizes quoted strings first.

**Follow-ups:**
- *"What does \`immutable\` change?"* → it tells the browser not to revalidate a fresh response even when the user reloads. Firefox and Safari honour it; Chrome gets the same effect by not revalidating subresources on a normal reload.
- *"Why must a CDN never store \`private\`?"* → it would serve one user's personalised response to everyone.
- *"What's the right header for hashed assets? For \`index.html\`?"* → \`public, max-age=31536000, immutable\` and \`no-cache\` (+ ETag).`,
};

const lruCache: Exercise = {
  id: 'lru-cache',
  title: 'LRUCache<K, V> with O(1) get/put',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['caching', 'data structures', 'memory', 'classes'],
  prompt: `Implement a generic **least-recently-used** cache with **O(1)** \`get\` and \`put\`.

\`\`\`ts
const cache = new LRUCache<string, Blob>(2);
cache.put('a', blobA);
cache.put('b', blobB);
cache.get('a');        // 'a' becomes the most recently used
cache.put('c', blobC); // full → evicts 'b', the least recently used
cache.keys();          // ['a', 'c']  (least → most recently used)
\`\`\`

- \`get(key)\` returns the value (or \`undefined\`) and marks the key as most recently used.
- \`put(key, value)\` inserts or updates and marks the key as most recently used. Inserting a **new** key into a full cache first evicts the least recently used entry and calls \`onEvict(key, value)\` (useful for e.g. \`URL.revokeObjectURL\`).
- \`has(key)\` does **not** count as a use. \`delete(key)\` removes an entry without calling \`onEvict\`.
- \`size\`, \`keys()\` in LRU → MRU order, and a \`RangeError\` if \`capacity\` isn't a positive integer.
- Falsy values (\`0\`, \`''\`, \`false\`) are real values.

**Why it's on a performance day:** a cache without a bound is a memory leak with good intentions. LRU is how you cap memoisation tables, thumbnail/image caches and API caches (this is the "unbounded growth" follow-up from Day 1's \`memoize\`). It's also one of the most frequently asked data-structure questions.

**What the interviewer is looking for:** genuinely O(1) operations (no \`indexOf\`/\`splice\` over an array), correct recency updates on \`get\` *and* on updating an existing key, and being able to explain the classic hash map + doubly linked list design.`,
  starter: lruStarter,
  solution: lruSolution,
  tests: lruTests,
  hints: [
    'A JavaScript Map iterates in insertion order — so if every use re-inserts the key, the first key in the Map is always the least recently used.',
    "To \"touch\" a key, delete it and set it again: it moves to the end. The oldest key is map.keys().next().value.",
    'In put(): if the key already exists, delete it (no eviction). Otherwise, if size >= capacity, evict the first key and call onEvict. Then set the key. In get(), use has() rather than a truthiness check.',
  ],
  explanation: `**Approach:** a single \`Map\`. \`Map\` preserves insertion order and \`delete\` + \`set\` are (amortised) O(1), so "move to most recent" is delete-then-set and "least recent" is the first key from \`map.keys()\`. Memory is O(capacity). This is the idiomatic JavaScript interview answer.

**A senior-level caveat:** in V8, deleting entries leaves holes in the \`Map\`'s ordered backing store until the table is rehashed — and an LRU always deletes from the *front*, exactly where \`keys().next()\` starts scanning. With large capacities and heavy churn the "O(1)" eviction quietly becomes O(holes): in Node 22, 100k evictions on a 20,000-entry cache took ~1.5 s with the \`Map\` trick versus ~50 ms with a linked list. That's why production libraries (e.g. the \`lru-cache\` package) keep their own linked structure. For a few hundred entries it doesn't matter.

**The language-agnostic answer** (what you'd say if the interviewer forbids relying on \`Map\` ordering, or asks how it works in Java/C++): a **hash map from key → node** plus a **doubly linked list** ordered by recency, with sentinel head/tail nodes.

\`\`\`ts
interface Node<K, V> { key: K; value: V; prev: Node<K, V> | null; next: Node<K, V> | null }
// get:  node = map.get(key); unlink(node); insertAtTail(node)        — O(1) thanks to prev/next pointers
// put:  if full, evict head.next (unlink + map.delete); insert new node at tail; map.set(key, node)
\`\`\`

The doubly linked list is what makes removal from the middle O(1); the hash map is what makes finding the node O(1).

**Edge cases interviewers probe:** updating an existing key must not evict anything; \`get\` on a missing key must not change order; capacity 1; falsy values.

**Follow-ups:**
- *"Add a TTL per entry"* → store \`{ value, expiresAt }\`; treat expired entries as misses on \`get\` (lazy expiry) and optionally sweep periodically.
- *"Bound by bytes rather than entries"* → track a running total of each entry's size and evict from the LRU end until under budget (how image caches work).
- *"LRU vs LFU?"* → LFU (least *frequently* used) protects popular items from a one-off scan that would flush an LRU, at the cost of more bookkeeping.
- *"When would you use a \`WeakMap\` instead?"* → when keys are objects whose lifetime you don't control: entries vanish when the key is garbage-collected — but you can't enumerate or bound a \`WeakMap\`.`,
};

const processInChunks: Exercise = {
  id: 'process-in-chunks',
  title: 'processInChunks(): yield to the main thread',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 12,
  tags: ['inp', 'event loop', 'async', 'long tasks', 'cancellation'],
  prompt: `A click handler that transforms 20,000 records in one go is a 300 ms **long task**: the page freezes, input queues up, and INP goes "poor". Implement \`processInChunks(items, fn, options)\`, which runs \`fn(item, index)\` in chunks and **yields to the event loop between chunks** so the browser can handle input and paint.

\`\`\`ts
const rows = await processInChunks(records, toRow, { chunkSize: 200, signal: controller.signal });
\`\`\`

- Process the **first chunk immediately**, then \`await yieldToMain()\` before each later chunk. Never yield after the last chunk.
- The default \`yieldToMain\` is a **macrotask**: \`new Promise((r) => setTimeout(r, 0))\`. (Awaiting a microtask such as \`Promise.resolve()\` lets nothing else run in between — a test checks this.)
- Resolve with every result, in order. If \`fn\` throws, reject and stop.
- \`chunkSize\` defaults to 50; reject with a \`RangeError\` unless it's a positive integer.
- If \`options.signal\` is aborted, stop before the next chunk and reject with \`signal.reason\` (the same convention \`fetch\` uses).

**What the interviewer is looking for:** *why* yielding improves INP (input handling and rendering only happen between tasks), the microtask-vs-macrotask distinction, and cancellation — e.g. abandoning work for a search query that's already stale.`,
  starter: chunksStarter,
  solution: chunksSolution,
  tests: chunksTests,
  hints: [
    'An async function runs synchronously until its first await. A loop over chunk start indices with `if (start > 0) await yieldToMain()` at the top gives you "first chunk immediately, yield between chunks".',
    'Call `signal?.throwIfAborted()` right after each yield — the abort usually happens while you are paused. It throws signal.reason for you.',
    'Do the chunkSize validation inside the async function, so it becomes a rejected promise rather than a synchronous throw.',
  ],
  explanation: `**Approach:** an \`async\` function with an outer loop over chunk start indices. Each chunk is a tight synchronous loop; between chunks, \`await yieldToMain()\` ends the current task. The browser can then run queued input handlers, rendering and other tasks before the \`setTimeout\` callback resumes us.

**Why a macrotask:** microtasks (promise reactions) all run before the event loop moves on — so \`await Promise.resolve()\` between chunks still makes one giant task. Only a new task gives input and rendering a turn.

**In production:**
- Prefer \`scheduler.yield()\` where available (Chromium 129+), falling back to \`setTimeout\`. Its continuation is queued ahead of other pending tasks, so your work isn't delayed behind every other script — and it avoids \`setTimeout\`'s ≥ 4 ms clamp for nested timers.
- A **time budget** (yield when \`performance.now()\` passes a ~50 ms deadline) adapts to the device better than a fixed chunk size: a fast laptop does more per chunk, a slow phone less.
- For React renders, \`startTransition\`/\`useDeferredValue\` already do this slicing for you; for pure CPU work, a **web worker** removes it from the main thread entirely.
- \`requestIdleCallback\` is for truly optional work: it may never run on a busy page, and it has historically been unavailable in Safari.

**Follow-ups:**
- *"Report progress"* → call an \`onProgress(done, total)\` after each chunk — and render progress, since you're yielding anyway.
- *"Why not just use a worker?"* → workers can't touch the DOM and pay structured-clone costs for messages; chunking keeps the work on the main thread but responsive.
- *"How does this show up in DevTools?"* → one red-flagged long task becomes many short tasks, and input events slot in between them.`,
};

const cachedFetcher: Exercise = {
  id: 'cached-fetcher-swr',
  title: 'createCachedFetcher(): dedupe + stale-while-revalidate',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 20,
  tags: ['caching', 'async', 'promises', 'stale-while-revalidate', 'timers'],
  prompt: `Build the core of what SWR and TanStack Query do: an in-memory cache around an async \`fetcher\` with **request deduplication** and **stale-while-revalidate**.

\`\`\`ts
const users = createCachedFetcher((id) => api.getUser(id), { ttl: 30_000, staleWhileRevalidate: 300_000 });
await users.get('42'); // network
await users.get('42'); // cache — fresh for 30 s
// two minutes later:
await users.get('42'); // instantly returns the stale user AND refetches in the background
\`\`\`

\`get(key)\`, with \`age = Date.now() - fetchedAt\` in ms (measured from when the fetch resolved):

| State | Behaviour |
|---|---|
| \`age < ttl\` | Resolve with the cached value. No fetch. |
| \`ttl ≤ age < ttl + staleWhileRevalidate\` | Resolve **immediately** with the stale value **and** start one background revalidation for the key |
| No entry, or older than that | Fetch and resolve with the new value |

- **Dedupe:** concurrent \`get()\`s for the same key share one in-flight request (background revalidations included).
- **Never cache errors:** every waiting caller gets the rejection and the next \`get()\` retries. A failed background revalidation **evicts** the stale entry — without causing an unhandled promise rejection.
- \`invalidate(key)\` drops one key; \`invalidate()\` drops everything.
- \`staleWhileRevalidate\` defaults to 0. Use \`Date.now()\` (the tests use fake timers).

**What the interviewer is looking for:** caching the *promise* to dedupe, cleaning up in-flight state on success **and** failure, not caching failures, and handling the background promise that nobody awaits.`,
  starter: fetcherStarter,
  solution: fetcherSolution,
  tests: fetcherTests,
  hints: [
    'Keep two Maps: `cache` (key → { value, fetchedAt }) and `inFlight` (key → Promise). A `load(key)` helper returns the in-flight promise if one exists, otherwise starts a request and stores it.',
    'In load(), chain `.then(onSuccess, onError)`: success stores { value, fetchedAt: Date.now() } and returns the value; error deletes the cache entry and re-throws. When it settles, delete the key from inFlight.',
    'For the stale case: `load(key).catch(() => {})` (nobody awaits it, so swallow the rejection there — load already evicted the entry) and return `Promise.resolve(entry.value)`.',
  ],
  explanation: `**Approach:** two maps — settled values with a timestamp, and in-flight promises. \`get\` checks the age of the cached entry against \`ttl\` and \`ttl + staleWhileRevalidate\`; everything that needs the network goes through \`load(key)\`, which is the single place that dedupes, stores successes, evicts on failure and cleans up.

**Details that separate good from great:**
- **Cache the promise, not just the value.** Two components mounting at once both get the same in-flight promise — that's request deduplication (Day 1's memoize follow-up, applied).
- **Wrap the fetcher call** as \`new Promise((resolve) => resolve(fetcher(key)))\` so a fetcher that throws synchronously becomes a rejection instead of escaping \`get\`.
- **The background promise has no consumer**, so attach a \`.catch\` — otherwise a failed revalidation is an unhandled rejection. Also make sure the promise derived from \`.finally()\` doesn't become one.
- **Identity checks** (\`inFlight.get(key) === request\`) stop a request that was invalidated mid-flight from overwriting newer state.

**Trade-off to discuss:** on a failed revalidation we *evict* (correctness first: never keep serving data we couldn't confirm). The alternative is HTTP's \`stale-if-error\` — keep serving stale data and surface the error — which is better for resilience and what SWR/TanStack Query do (they keep \`data\` and expose \`error\`). Ask which the product wants.

**Mapping to real libraries:** \`ttl\` ≈ TanStack Query's \`staleTime\`; evicting unused entries after a while ≈ \`gcTime\`; it also refetches on window focus and reconnect. HTTP's \`Cache-Control: max-age=…, stale-while-revalidate=…\` is the same idea at the protocol level.

**Follow-ups:** bound the cache (combine with your LRU), support \`AbortSignal\` so a revalidation can be cancelled, build cache keys from params with stable serialization, and prime the cache from server-rendered data during hydration.`,
};

const clsSessionWindows: Exercise = {
  id: 'cls-session-windows',
  title: 'Compute CLS with session windows',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 15,
  tags: ['core web vitals', 'cls', 'algorithms', 'performance apis'],
  prompt: `Field CLS is computed from \`layout-shift\` performance entries. Implement the algorithm the browser and the \`web-vitals\` library use:

- Ignore entries with \`hadRecentInput: true\` — shifts within 500 ms of a click, tap or key press are expected. They add nothing **and don't extend a window**.
- Group the remaining shifts into **session windows**: a shift joins the current window if it starts **< 1000 ms** after the previous shift in that window **and < 5000 ms** after the window's first shift. Otherwise it starts a new window.
- CLS = the **largest** window's total score; \`0\` if there are no shifts.

\`\`\`ts
computeCLS([
  { startTime: 0, value: 0.05, hadRecentInput: false },
  { startTime: 500, value: 0.05, hadRecentInput: false },  // same window → 0.10
  { startTime: 3000, value: 0.04, hadRecentInput: false }, // gap ≥ 1 s → new window
]); // 0.1 — the largest window, not the 0.14 total
\`\`\`

In a browser you'd collect the entries with \`new PerformanceObserver(cb).observe({ type: 'layout-shift', buffered: true })\`.

**What the interviewer is looking for:** knowing that CLS is the *worst burst* rather than a lifetime sum (the definition changed in 2021), and implementing a windowing algorithm with correct boundaries.`,
  starter: clsStarter,
  solution: clsSolution,
  tests: clsTests,
  hints: [
    "Track the current window's running total plus its first and last counted entries, and the best total seen so far.",
    'An entry continues the window if `entry.startTime - last.startTime < 1000 && entry.startTime - first.startTime < 5000`; otherwise reset the window to just this entry.',
    'Skip hadRecentInput entries before anything else — in particular, do not update `last` for them, or they will bridge gaps.',
  ],
  explanation: `**Approach:** one pass, O(n) time and O(1) space. Keep the current window's sum, first and last counted entry; update the maximum after every counted entry. This mirrors the \`web-vitals\` implementation.

**Why session windows?** The original CLS summed every shift for the page's whole lifetime, which punished long-lived pages and SPAs simply for being open longer. Since 2021, CLS is the worst burst: max 1 s between shifts, max 5 s per window.

**Boundaries:** both comparisons are strict, so a shift exactly 1000 ms after the previous one starts a new window, and a window can never span 5000 ms or more.

**Lab vs field:** Lighthouse only sees shifts during the initial load; field CLS includes everything until the page is hidden — infinite scroll, late ads, client-side route changes — which is why field CLS is often worse.

**Follow-ups:**
- *"How do you find the culprit?"* → each entry has \`sources\` (the shifted nodes with \`previousRect\`/\`currentRect\`); \`web-vitals/attribution\` reports the largest shift's target; DevTools shows a Layout shifts track.
- *"Why don't \`transform\` animations count?"* → they don't affect layout, so they produce no layout-shift entries.
- *"What about SPAs?"* → CLS keeps accumulating across client-side navigations within one page load; per-route attribution needs your own bookkeeping.`,
};

const day: Day = {
  number: 10,
  title: 'Web Performance & Networking',
  tagline: 'Core Web Vitals, loading and runtime performance, HTTP caching and protocols — measured, explained and implemented.',
  summary:
    '"How would you make this faster?" is asked in almost every frontend loop, and strong answers start with **metrics and process**, not a list of tricks. Today you learn the Core Web Vitals (LCP, INP, CLS) and how to measure them in the lab and the field, the loading fixes that move each metric (images, fonts, JavaScript, resource hints, rendering strategies), and the runtime and network fundamentals behind INP, HTTP/2 vs HTTP/3, caching and CDNs. Then you implement the caching and scheduling primitives that interviewers love to ask for.',
  objectives: [
    'State the Core Web Vitals thresholds, what each measures, and why INP replaced FID',
    'Explain lab vs field data and walk through a DevTools Performance-panel investigation',
    'Diagnose LCP by sub-part and fix it with images, fonts, resource hints and less JavaScript',
    'Explain INP phases and fix long tasks by yielding, deferring and moving work',
    'Design the caching strategy for a SPA and explain no-cache vs no-store, ETags and 304s',
    'Compare HTTP/1.1, HTTP/2 and HTTP/3, and CSR/SSR/SSG/streaming from a performance angle',
    'Implement an LRU cache, a stale-while-revalidate fetcher and a chunked task processor',
  ],
  skills: ['performance', 'networking', 'browser', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'review',
      title: 'Spaced review',
      minutes: 15,
      intro:
        "Warm up with cards from earlier days. Today builds directly on Day 2's event loop (microtasks vs macrotasks) and Day 8's rendering pipeline — if those cards feel shaky, note them.",
    },
    {
      kind: 'lesson',
      id: 'measuring-performance',
      title: 'Measuring performance: Core Web Vitals, lab vs field',
      minutes: 35,
      body: measuringPerformance,
      checks: [
        {
          id: 'inp-what-counts',
          prompt: 'Which of these user actions can contribute to a page\'s INP?',
          choices: [
            'Scrolling the page with the mouse wheel',
            'Hovering over a navigation menu',
            'Pressing a key in a text input',
            'Only the first click after the page has loaded',
          ],
          answer: 2,
          explanation:
            'INP observes **clicks, taps and key presses** for the entire visit. Scrolling and hovering are not interactions for INP (scroll performance is a separate concern). "Only the first click" describes **FID**, the metric INP replaced in March 2024 — FID ignored every later interaction and everything except input delay.',
        },
        {
          id: 'p75-assessment',
          prompt:
            'RUM for a page shows: 75% of visits have INP ≤ 180 ms, 90% ≤ 420 ms, and the slowest 5% exceed 900 ms. How does this page\'s INP rate?',
          choices: [
            'Good — Core Web Vitals are assessed at the 75th percentile, which is 180 ms',
            'Poor — some visits exceed 500 ms',
            'Needs improvement — the 90th percentile is above 200 ms',
            'It depends on the average INP',
          ],
          answer: 0,
          explanation:
            'Core Web Vitals are assessed at the **75th percentile** of page loads: p75 = 180 ms ≤ 200 ms, so it is **good**. A slow tail does not fail the page (though it is worth investigating — those are real users). The 90th percentile and the average are not what Google assesses; averages in particular hide bimodal distributions such as fast desktops and slow phones.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'loading-performance',
      title: 'Loading performance: critical path, JS, images, fonts & hints',
      minutes: 40,
      body: loadingPerformance,
      checks: [
        {
          id: 'lcp-lazy-hero',
          prompt:
            'A CMS template adds `loading="lazy"` to every `<img>`, including the hero image that is the page\'s LCP element. What is the effect?',
          choices: [
            'None — lazy images inside the initial viewport load immediately anyway',
            'LCP gets worse: the browser cannot start the request until layout confirms the image is in the viewport, adding resource load delay',
            'CLS gets worse, but LCP is unaffected',
            'The hero never loads until the user scrolls',
          ],
          answer: 1,
          explanation:
            'A lazy image in the viewport **does** load without scrolling — but only after the browser has done layout and determined it is visible, instead of as soon as the preload scanner sees the tag. That delay lands squarely in LCP\'s **resource load delay**. Remove `loading="lazy"` from above-the-fold images and add `fetchpriority="high"` to the LCP image. CLS is unaffected if dimensions are set; "never loads" is wrong because visible lazy images do load.',
        },
        {
          id: 'preload-font-crossorigin',
          prompt:
            'You add `<link rel="preload" href="/fonts/brand.woff2" as="font" type="font/woff2">` for a same-origin font. DevTools shows the font being downloaded twice. Why?',
          choices: [
            'Same-origin fonts cannot be preloaded',
            'The preload is missing `crossorigin`: fonts are always fetched in CORS mode, so the non-CORS preloaded response cannot be reused',
            'The `type` should be `font/woff`',
            'Preloaded resources are always fetched twice by design',
          ],
          answer: 1,
          explanation:
            'Font loads use **CORS mode** even for same-origin URLs. A preload without `crossorigin` is made in no-CORS mode, does not match the later font request in the preload cache, and is downloaded again (Chrome also logs an "unused preload" warning). Add `crossorigin` (anonymous). The other options are false: same-origin fonts preload fine, and `font/woff2` is the correct type for WOFF2.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'runtime-and-network',
      title: 'Runtime performance & networking: INP, memory, HTTP, caching',
      minutes: 40,
      body: runtimeAndNetwork,
      checks: [
        {
          id: 'yield-microtask',
          prompt: 'What order is logged?',
          code: `setTimeout(() => console.log('click handler'), 0);

async function work() {
  for (let i = 1; i <= 3; i++) {
    console.log('chunk', i);
    await Promise.resolve();
  }
}

work().then(() => console.log('done'));`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'chunk 1, click handler, chunk 2, chunk 3, done',
            'chunk 1, chunk 2, chunk 3, done, click handler',
            'chunk 1, chunk 2, chunk 3, click handler, done',
            'click handler, chunk 1, chunk 2, chunk 3, done',
          ],
          answer: 1,
          explanation:
            'Every `await Promise.resolve()` resumes in a **microtask**, and the microtask queue is drained completely before the event loop runs the next task — so all three chunks and even `done` (another microtask) run before the `setTimeout` callback. In a browser, a waiting click handler or a paint would also have to wait. To actually yield, await a macrotask (`setTimeout`) or `scheduler.yield()`.',
        },
        {
          id: 'etag-304',
          prompt:
            '`index.html` was served with `Cache-Control: no-cache` and `ETag: "v42"`. The user returns an hour later; nothing has been deployed. What happens?',
          choices: [
            'The browser uses its stored copy without making any request',
            'The browser sends `If-None-Match: "v42"`; the server answers `304 Not Modified` with no body and the stored copy is used — saving bandwidth but still costing a round trip',
            'The browser downloads the full HTML again, because `no-cache` means it was never stored',
            'The server answers `412 Precondition Failed` and the browser retries without the ETag',
          ],
          answer: 1,
          explanation:
            '`no-cache` means "store it, but revalidate before every use". The browser makes a **conditional request** with the stored validator; if the ETag still matches, the server returns **304** without a body. You pay one round trip but not the download. Option A describes a *fresh* response (e.g. `max-age`); option C confuses `no-cache` with `no-store`; 412 is for conditional writes like `If-Match`, not cache revalidation.',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'perf-scenarios-quiz',
      title: 'Performance scenarios',
      minutes: 15,
      intro:
        'Each question is a situation you could face at work or in an interview. Decide what you would do **first** before revealing, then read why the tempting alternatives are wrong.',
      questions: [
        {
          id: 'lcp-css-background-hero',
          prompt:
            'Field LCP is 4.0 s on mobile. The LCP element is a hero image applied with CSS `background-image` from a stylesheet that is injected by the JS bundle. TTFB is 600 ms. What do you do **first**?',
          choices: [
            'Add `loading="lazy"` to the hero so it does not compete with other requests',
            'Make the image discoverable from the HTML: render it as an `<img fetchpriority="high">` (or at least add `<link rel="preload" as="image" fetchpriority="high">`)',
            'Convert all the other images on the page to AVIF',
            'Move the site to HTTP/3',
          ],
          answer: 1,
          explanation:
            'The dominant problem is **resource load delay**: the preload scanner cannot see a CSS background image, let alone one in a stylesheet injected by JavaScript, so the request starts only after the JS and CSS have loaded. Putting the image in the HTML with high priority lets it start right after the first bytes of HTML arrive. Lazy-loading would delay it further. Compressing *other* images does not change when the hero starts (compressing the hero itself is a good second step for load duration). HTTP/3 saves a round trip or so — small compared with a late discovery chain.',
        },
        {
          id: 'inp-search-filter',
          prompt:
            'INP is 450 ms at p75 on a product search page. A trace of typing a character shows input delay 20 ms, **processing 380 ms** (filtering 20,000 products and re-rendering the list), presentation delay 50 ms. Which change targets the problem?',
          choices: [
            'Preload the search API endpoint',
            'Keep the input update urgent but render the filtered list as non-urgent (`useDeferredValue`/`startTransition`), virtualise the list, and/or move filtering off the main thread',
            'Serve the JavaScript bundle with Brotli instead of gzip',
            'Add `fetchpriority="high"` to the search input',
          ],
          answer: 1,
          explanation:
            'Processing duration dominates, so the fix must shrink or defer the work that runs in response to the keystroke: render the expensive list in a transition (React yields to new input and abandons stale renders), render only visible rows, and compute the filter in a worker or in yielded chunks. Preloading the API and Brotli affect network/loading, not the 380 ms of main-thread work on each key press. `fetchpriority` applies to fetches, not inputs.',
        },
        {
          id: 'cls-late-banner',
          prompt:
            'A promo banner is inserted at the top of the page about 2 s after load, pushing the article down. CLS is 0.22 at p75. What is the best fix?',
          choices: [
            'Lazy-load the banner image',
            'Reserve the banner\'s space from the start (a placeholder with a fixed `min-height`), or render it as an overlay that does not push content',
            'Show the banner only after the user\'s first scroll, so the shift counts as user-initiated',
            'Add `font-display: optional` to the page\'s fonts',
          ],
          answer: 1,
          explanation:
            'A layout shift happens because content that is already visible moves. Reserving the space up front (or not taking space in the flow at all) means nothing moves when the banner arrives. Lazy-loading the image changes *when* it shifts, not *whether*. Scrolling is **not** a discrete input — only clicks, taps and key presses set `hadRecentInput` — so a shift after scroll still counts. Fonts are unrelated to this shift.',
        },
        {
          id: 'lab-vs-field-disagree',
          prompt:
            'Lighthouse (mobile) reports LCP 1.9 s and TBT 40 ms. CrUX for the same URL reports p75 LCP 3.4 s and INP 380 ms. What is the right conclusion?',
          choices: [
            'CrUX is wrong because it is a 28-day aggregate; trust Lighthouse',
            'The page fails Core Web Vitals; field data reflects real devices, networks and interactions — use RUM attribution and lab profiling of real interactions to find out why',
            'The page passes, because the Lighthouse performance score is high',
            'INP must be fine, because TBT is low',
          ],
          answer: 1,
          explanation:
            'Core Web Vitals are judged on **field** data. Lighthouse runs one cold load on one simulated device and never interacts with the page, so it cannot see slow interactions, slower devices, different geographies or late-loading third parties. Low TBT during load says nothing about a slow click handler later in the visit. The 28-day window makes CrUX lag, not wrong. Use RUM attribution to find the slow LCP elements and interactions, then reproduce them in DevTools with throttling.',
        },
        {
          id: 'spa-cache-headers',
          prompt:
            'Your Vite SPA deploys `index.html` and `assets/index-3f9a1c.js`. Which pair of `Cache-Control` headers is correct?',
          choices: [
            'HTML: `max-age=31536000, immutable` — JS: `no-cache`',
            'HTML: `no-cache` — JS: `public, max-age=31536000, immutable`',
            'Both: `no-store`',
            'Both: `max-age=3600`',
          ],
          answer: 1,
          explanation:
            'The content hash in the asset\'s file name changes whenever its content changes, so a given asset URL never changes and can be cached for a year without revalidation. The HTML has a stable URL and references the current hashes, so it must be revalidated on every load (cheap with an ETag → 304). Option A is exactly backwards and would pin users to an old version for a year. `no-store` everywhere throws away all caching. A one-hour `max-age` on HTML means users can run a stale build for up to an hour after a deploy, while needlessly expiring immutable assets.',
        },
        {
          id: 'no-cache-vs-no-store',
          prompt: 'Which statement about `Cache-Control` is correct?',
          choices: [
            '`no-cache` means the browser must never store the response',
            '`no-cache` allows storing but requires revalidation with the server before each reuse; `no-store` forbids storing at all',
            '`no-store` is the right choice for content-hashed JS bundles',
            '`private` means the response cannot be cached anywhere',
          ],
          answer: 1,
          explanation:
            'The names are misleading: `no-cache` = "cache, but always check" (conditional request → 304 when unchanged); `no-store` = "do not keep a copy" — for sensitive data. Hashed bundles should be cached as long as possible. `private` means only the **browser** may store it; shared caches such as CDNs must not.',
        },
        {
          id: 'google-fonts-preconnect',
          prompt:
            'Your page loads a stylesheet from `fonts.googleapis.com`, which references font files on `fonts.gstatic.com`. The font requests start late. Without self-hosting, which hint helps most?',
          choices: [
            '`<link rel="prefetch" href="https://fonts.gstatic.com">`',
            '`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`',
            '`<link rel="dns-prefetch" href="https://fonts.googleapis.com">`',
            '`<link rel="modulepreload" href="https://fonts.gstatic.com">`',
          ],
          answer: 1,
          explanation:
            'The exact font URLs are only known once the CSS arrives, so you cannot easily preload them — but you can open the connection to the font origin in advance, saving DNS + TCP + TLS round trips. `crossorigin` is required because fonts are fetched in CORS mode, and a non-CORS preconnected connection cannot be used for them. Prefetch is a low-priority fetch for future navigations; dns-prefetch for the CSS origin only saves a DNS lookup on the wrong host; modulepreload is for ES modules. Self-hosting the fonts would remove the extra origin altogether.',
        },
        {
          id: 'http3-lossy-network',
          prompt: 'Why does HTTP/3 help most on lossy mobile networks compared with HTTP/2?',
          choices: [
            'It is the only HTTP version with header compression',
            'HTTP/2 multiplexes all streams over one TCP connection, so one lost packet stalls them all; QUIC streams are independent, so loss only delays the affected stream',
            'It allows more than six parallel connections per origin',
            'It brings back server push',
          ],
          answer: 1,
          explanation:
            'TCP delivers bytes strictly in order, so a single lost packet blocks every multiplexed HTTP/2 stream until it is retransmitted — **TCP head-of-line blocking**. QUIC implements streams itself on top of UDP, so other streams keep flowing. HTTP/3 also has a 1-RTT (0-RTT resumed) handshake and connection migration. HTTP/2 already has header compression (HPACK); HTTP/3 uses QPACK. The six-connection limit is an HTTP/1.1 workaround, and server push is not part of how browsers use HTTP/3.',
        },
        {
          id: 'font-swap-cls',
          prompt:
            'Switching to `font-display: swap` fixed invisible text, but headlines now reflow when the web font arrives (CLS 0.08 from fonts alone). What is the best fix?',
          choices: [
            'Switch to `font-display: block`',
            'Define a fallback `@font-face` with `size-adjust` / `ascent-override` / `descent-override` tuned to the web font (and preload the font), or use `font-display: optional`',
            'Lazy-load the font file',
            'Add `width` and `height` attributes to the headings',
          ],
          answer: 1,
          explanation:
            'The shift comes from the fallback and web fonts having different metrics. Metric overrides make the fallback occupy the same space, so the swap does not move anything; preloading shortens the window; `optional` avoids swapping after first render entirely. `block` brings back invisible text (hurting FCP/LCP) and can still swap late. Fonts cannot be lazy-loaded meaningfully, and `width`/`height` attributes do nothing on headings.',
        },
        {
          id: 'lazy-route-waterfall',
          prompt:
            'After route-level code splitting, opening `/reports` takes 1.2 s to load its chunk and then another 0.8 s for its data, which is fetched in a `useEffect` inside the lazy component. What is the best fix?',
          choices: [
            'Undo the code splitting and put everything back in the main bundle',
            'Start the chunk and the data request in parallel — fetch data in a route loader (or prefetch both on link hover/focus) instead of in an effect after the chunk renders',
            'Increase the delay before the Suspense fallback appears',
            'Preload the reports API response in the HTML of every page',
          ],
          answer: 1,
          explanation:
            'This is a **request waterfall**: code, then render, then data — two sequential round trips. Loading both in parallel turns 2.0 s into roughly max(1.2, 0.8) s, and prefetching on intent can hide most of it. Undoing the split penalises every other route. Changing the fallback delay hides the spinner, not the wait. Preloading the API response on every page wastes bandwidth and server work for users who never open reports.',
        },
        {
          id: 'tree-shaking-cjs',
          prompt:
            '`import { debounce } from \'lodash\'` adds about 70 KB (minified) to your bundle, though you use one function. Why, and what is the fix?',
          choices: [
            'Vite does not tree-shake production builds; switch bundlers',
            '`lodash` is published as CommonJS, which bundlers cannot statically tree-shake; use `lodash-es`, `lodash/debounce`, or write the small function yourself',
            'Named imports are never tree-shaken; use a default import',
            'Minification is disabled; enable it',
          ],
          answer: 1,
          explanation:
            'Tree shaking relies on the **static structure of ES modules**. CommonJS (`require`/`module.exports`) is dynamic, so the bundler has to include the whole module. `lodash-es` ships ES modules, and `lodash/debounce` imports a single file. Vite/Rollup tree-shake ESM by default, named ESM imports are exactly what makes tree shaking work, and minification shrinks code but cannot prove an unused CommonJS export is safe to remove.',
        },
        {
          id: 'prefetch-next-route',
          prompt:
            'Analytics show 80% of users go from the product page to the cart. Which hint loads the cart route\'s JS chunk without slowing down the product page?',
          choices: [
            '`<link rel="preload" href="/assets/cart-8c1f.js" as="script">`',
            '`<link rel="prefetch" href="/assets/cart-8c1f.js">`',
            '`<link rel="preconnect" href="/assets/cart-8c1f.js">`',
            '`<script src="/assets/cart-8c1f.js" fetchpriority="high"></script>`',
          ],
          answer: 1,
          explanation:
            '`prefetch` is a **low-priority** fetch for a likely future navigation; the response goes into the HTTP cache, ready when the user navigates. `preload` is high priority and meant for the *current* page, so it competes with the product page\'s critical resources (and warns as unused). `preconnect` takes an origin and only opens a connection. A high-priority script tag downloads *and executes* the cart code on the product page.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'perf-primitives',
      title: 'Caching & scheduling primitives',
      minutes: 60,
      intro:
        'Interview conditions: set a timer per exercise, talk through your approach before typing, no AI. Suggested order: `parseCacheControl` (warm-up) → `LRUCache` → `processInChunks` → `createCachedFetcher`. The CLS exercise is a stretch — do it if you finish early. After each one, read the explanation: the follow-up questions are where interviews are won.',
      exercises: [parseCacheControl, lruCache, processInChunks, cachedFetcher, clsSessionWindows],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 90 seconds: lead with the one-sentence answer, then the detail, then a trade-off or a concrete number. Grade yourself against the model answer — did you name the metric, the threshold and the mechanism?',
    },
  ],
  flashcards: [
    { id: 'cwv-thresholds', front: 'The three Core Web Vitals and their "good" thresholds?', back: '**LCP ≤ 2.5 s** (loading), **INP ≤ 200 ms** (responsiveness), **CLS ≤ 0.1** (visual stability) — assessed at the **75th percentile** of page loads, mobile and desktop separately.' },
    { id: 'inp-replaced-fid', front: 'Why did INP replace FID (March 2024)?', back: 'FID measured only the **input delay** of the **first** interaction. INP measures the full latency (input delay + processing + presentation) of **every** click, tap and key press, and reports roughly the worst.' },
    { id: 'inp-phases', front: 'The three phases of an interaction\'s latency (INP)?', back: '1. **Input delay** (main thread busy). 2. **Processing duration** (event handlers + the render they trigger). 3. **Presentation delay** (style, layout, paint of the next frame).' },
    { id: 'lcp-subparts', front: 'The four sub-parts of LCP?', back: '**TTFB** → **resource load delay** (until the LCP resource starts loading) → **resource load duration** → **element render delay**. Load delay and render delay should each be small (< 10%).' },
    { id: 'cls-session-window', front: 'How are layout shifts aggregated into CLS?', back: 'Into **session windows** (shifts < 1 s apart, window < 5 s long); CLS is the **largest** window\'s score. Shifts within 500 ms of a click/tap/key press (`hadRecentInput`) don\'t count.' },
    { id: 'layout-shift-score', front: 'Formula for a single layout shift score?', back: '**impact fraction × distance fraction** — share of the viewport affected (old ∪ new position) × how far it moved relative to the viewport\'s largest dimension.' },
    { id: 'tbt-definition', front: 'What is TBT and why does it matter?', back: 'Total Blocking Time (lab only): the sum of each long task\'s time **beyond 50 ms** during load. Lighthouse can\'t interact with the page, so TBT is its **proxy for INP**.' },
    { id: 'lab-vs-field', front: 'Lab data vs field data?', back: '**Lab** (Lighthouse, DevTools): one controlled run — reproducible, debuggable, good for CI. **Field** (CrUX, RUM via `web-vitals`): real users, devices and interactions — the source of truth for Core Web Vitals.' },
    { id: 'crux', front: 'What is CrUX?', back: 'The Chrome UX Report: field metrics from opted-in Chrome users over a **rolling 28-day window**, per origin and URL. Shown in PageSpeed Insights and Search Console; also via API and BigQuery.' },
    { id: 'never-lazy-lcp', front: 'Why must the LCP image never have `loading="lazy"`?', back: 'Lazy images are fetched only after layout shows they\'re in the viewport, adding **resource load delay**. Instead: put it in the HTML as an `<img>` with `fetchpriority="high"`.' },
    { id: 'img-width-height', front: 'Why set `width` and `height` on `<img>`?', back: 'The browser derives an **aspect ratio** and reserves the box before the image loads, preventing layout shift (CLS). With `height: auto` in CSS it still scales responsively.' },
    { id: 'preload-vs-prefetch', front: '`preload` vs `prefetch`?', back: '**preload**: high priority, needed by the **current** page, discovered late (font, CSS-background hero). **prefetch**: low priority, for a likely **next** navigation, stored in the HTTP cache.' },
    { id: 'preconnect', front: 'What does `<link rel="preconnect">` do, and when do you use it?', back: 'Does DNS + TCP + TLS ahead of time for an origin you\'ll request from soon (image CDN, font host, API). Keep it to 2–4 critical origins; add `crossorigin` for CORS fetches such as fonts.' },
    { id: 'font-preload-crossorigin', front: 'Why does a font preload need `crossorigin`?', back: 'Fonts are always fetched in **CORS mode** (even same-origin). A preload without `crossorigin` doesn\'t match the real request, so the font is downloaded **twice**.' },
    { id: 'side-effects-field', front: 'What does `"sideEffects": false` in package.json do?', back: 'Tells the bundler no file in the package runs side effects on import, so modules whose exports are unused can be dropped entirely. List exceptions such as `"*.css"` in an array.' },
    { id: 'no-cache-vs-no-store', front: '`Cache-Control: no-cache` vs `no-store`?', back: '`no-cache`: may store, but must **revalidate** before each use (→ 304 if unchanged). `no-store`: must **not store** at all (sensitive data).' },
    { id: 'spa-caching-rule', front: 'Cache headers for a SPA?', back: 'Hashed assets: `public, max-age=31536000, immutable`. `index.html`: `no-cache` (+ ETag). Keep old hashed chunks after a deploy so open tabs don\'t fail to lazy-load.' },
    { id: 'http3-quic', front: 'Key advantages of HTTP/3 over HTTP/2?', back: 'Runs on **QUIC over UDP**: no TCP head-of-line blocking across streams, **1-RTT** handshake with TLS 1.3 built in (0-RTT on resumption), and **connection migration** across networks.' },
    { id: 'microtask-not-a-yield', front: 'Does `await Promise.resolve()` let the browser handle input or paint?', back: 'No. Microtasks run to completion before the next task. Yield with a **macrotask**: `scheduler.yield()` where supported, else `setTimeout(resolve, 0)`.' },
    { id: 'brotli-vs-gzip', front: 'Brotli vs gzip?', back: 'Brotli is typically **~15–25% smaller** for HTML/CSS/JS. Pre-compress static assets at max level at build time; use moderate levels for dynamic responses. Don\'t compress JPEG/AVIF/WOFF2 again.' },
  ],
  interviewQuestions: [
    {
      id: 'core-web-vitals-improve',
      kind: 'concept',
      level: 'core',
      minutes: 3,
      question: 'What are the Core Web Vitals, and how would you improve each one?',
      answer: `**One-liner:** three field metrics for user experience — LCP for loading, INP for responsiveness and CLS for visual stability — each judged at the 75th percentile of real page loads.

**LCP (good ≤ 2.5 s)** — when the largest image or text block in the viewport renders. I break it into TTFB, resource load delay, load duration and render delay, then fix the biggest: CDN caching or static generation for TTFB; put the LCP image in the HTML with \`fetchpriority="high"\` and never lazy-load it; serve properly sized AVIF/WebP via \`srcset\`/\`sizes\`; remove render-blocking CSS and JavaScript.

**INP (good ≤ 200 ms)** — replaced FID in March 2024. For every click, tap and key press it measures input delay + processing + presentation delay until the next paint, and reports roughly the worst. Fixes: break up long tasks and yield to the main thread, defer third-party scripts, do the urgent UI update first and the rest later (\`startTransition\`), virtualise big lists, keep the DOM small.

**CLS (good ≤ 0.1)** — the largest burst of unexpected layout shifts. Fixes: \`width\`/\`height\` or \`aspect-ratio\` on media, reserved space for ads, embeds and late banners, never inserting content above what the user is reading, and font fallbacks with matching metrics.

**How I work:** field data first — CrUX or our own RUM with the \`web-vitals\` library, segmented by route and device — to decide *what* to fix; lab tools to find *why* and verify the fix; budgets in CI so it doesn't regress.`,
      followUps: ['Why did INP replace FID?', 'Why the 75th percentile and not the median?', 'Lighthouse gives us 98 but CrUX says we fail — how is that possible?'],
    },
    {
      id: 'debug-slow-page',
      kind: 'debugging',
      level: 'core',
      minutes: 3,
      question: 'Users complain that a page is slow. Walk me through how you would investigate.',
      answer: `**One-liner:** pin down what "slow" means, find it in field data, reproduce it under realistic conditions, profile to find the bottleneck, fix the biggest one, and verify.

1. **Clarify.** Slow to load, slow to respond to clicks, or janky while scrolling? Which pages and which users — mobile, a region, logged-in?
2. **Field data.** CrUX/PageSpeed Insights or our RUM: which Core Web Vital fails at p75, on which routes and device classes. RUM attribution often points straight at the LCP element or the slow interaction.
3. **Reproduce realistically.** Production build, incognito, CPU throttled 4× and a Slow 4G profile — my laptop is not a mid-range Android phone.
4. **Profile.** For loading: record a reload, check TTFB, the network waterfall for a late-discovered or oversized LCP resource, render-blocking requests and third parties. For responsiveness: record the slow interaction, see whether input delay, processing or presentation dominates, and use Bottom-up to find the expensive functions. Also check the bundle (visualiser, Coverage panel) and caching headers.
5. **One hypothesis, one change, re-measure** with identical settings — otherwise you can't attribute the improvement.
6. **Close the loop.** Confirm in field data over the following days to weeks, and add guardrails — bundle-size limits and Lighthouse CI in pull requests, RUM alerts on p75.

The thing I avoid is guessing — adding \`memo\` or a CDN before knowing which metric and which phase is actually slow.`,
      followUps: ['What exactly do you look for in the Network panel?', 'How do you know the fix worked in production?', 'What if the cost is in a third-party script you cannot change?'],
    },
    {
      id: 'code-splitting-strategy',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'How do you decide what to code-split in a React application?',
      answer: `**One-liner:** split by route first, then heavy features most users don't need on first render — and never split what's needed for the first paint.

**Why it matters:** every kilobyte of JavaScript is downloaded, parsed, compiled and executed on the main thread, which delays LCP in client-rendered apps and causes input delay (INP) during load.

**How I decide:**
- **Routes** via dynamic \`import()\` (\`React.lazy\` or the router's lazy routes) — the biggest and safest win.
- **Heavy, conditional UI:** rich-text editors, charts, maps, PDF viewers, admin-only screens, anything behind a modal or tab.
- **Measure:** a bundle visualiser and the Coverage panel show big libraries used in one place, duplicates and unused code on the initial route.
- **Not** the hero or anything above the fold — that adds a round trip before LCP — and not tiny components, where request overhead and extra Suspense fallbacks outweigh the savings.

**Avoid waterfalls:** a lazy chunk that fetches its data in an effect costs two sequential round trips. Start code and data in parallel with route loaders, and prefetch the chunk on hover or focus.

**Caching angle:** content-hashed chunks are cached immutably, so keeping stable vendor code separate from frequently changing app code means a deploy only invalidates what changed.`,
      followUps: ['How do you handle a chunk that fails to load after a deploy?', 'Prefetching vs preloading a chunk — what is the difference?', 'How does tree shaking relate to code splitting?'],
    },
    {
      id: 'image-optimization',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'How would you optimise images on a content-heavy page?',
      answer: `**One-liner:** serve the right format at the right size, load the one that matters first and the rest lazily, and always reserve space.

- **Format:** AVIF with WebP and JPEG fallbacks via \`<picture>\` — AVIF is often around half the size of an equivalent JPEG. SVG for icons and logos.
- **Size:** responsive \`srcset\` with width descriptors plus an accurate \`sizes\`, so a phone doesn't download a 2,000-pixel desktop image. An image CDN can generate variants and negotiate formats automatically.
- **Priority:** identify the LCP image. It must be in the initial HTML (not a CSS background or client-rendered), have \`fetchpriority="high"\`, and must **never** be lazy-loaded. If it has to stay a CSS background, preload it.
- **Lazy loading:** \`loading="lazy"\` on below-the-fold images and iframes, \`decoding="async"\` on non-critical ones.
- **Stability:** \`width\` and \`height\` (or CSS \`aspect-ratio\`) on every image, so the browser reserves the box — that's the CLS fix.
- **Delivery:** long-lived, immutable caching for versioned URLs, served from a CDN.

**Verify:** in DevTools the LCP breakdown should show almost no resource load delay, and the Network panel should show the hero requested early at high priority.`,
      followUps: ['What does the sizes attribute actually do?', 'How do you handle an LCP image inside a carousel?', 'What about images inserted by a CMS you do not control?'],
    },
    {
      id: 'spa-caching-strategy',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: "What HTTP caching strategy would you use for a single-page app's HTML and static assets?",
      answer: `**One-liner:** cache content-hashed assets for a year as immutable, and always revalidate the HTML.

- **Hashed assets** (\`/assets/index-B3x9k2.js\`): \`Cache-Control: public, max-age=31536000, immutable\`. The build puts a content hash in the file name, so new content means a new URL. A given URL never changes, so browsers and CDNs keep it without ever revalidating.
- **\`index.html\`**: \`Cache-Control: no-cache\` plus an \`ETag\`. Its URL is stable and it references the current hashes, so the browser checks it on every load — usually a cheap 304 — and users get a new deploy immediately. Never leave HTML without \`Cache-Control\`, or heuristic caching can serve an old build.
- **CDN:** the edge can also cache HTML, with a short \`s-maxage\` plus \`stale-while-revalidate\`, or a long one that's purged on deploy.
- **APIs:** usually \`private, no-cache\`, or \`no-store\` for sensitive data; public data can get a short \`max-age\`/\`s-maxage\`.

**Deploy gotcha:** keep the previous build's hashed assets for a while. Open tabs still reference old chunks, and if they're deleted, lazy routes fail with "Failed to fetch dynamically imported module" — Vite's \`vite:preloadError\` event lets you reload gracefully.

**Optional:** a service worker can precache the shell and serve hashed assets cache-first for offline support — but never cache-first the HTML without an update strategy.`,
      followUps: ['What is the difference between no-cache and no-store?', 'What does immutable add on top of a long max-age?', 'How would you cache HTML at the CDN and still deploy instantly?'],
    },
    {
      id: 'http2-vs-http3',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'What are the differences between HTTP/1.1, HTTP/2 and HTTP/3, and why do they matter for frontend performance?',
      answer: `**One-liner:** HTTP/2 multiplexes many requests over one TCP connection; HTTP/3 does the same over QUIC on UDP, which removes TCP head-of-line blocking and makes connection setup faster.

- **HTTP/1.1:** one request at a time per connection, so browsers open about six connections per origin. That's why we used to concatenate bundles, use sprites and shard domains.
- **HTTP/2:** binary framing, many concurrent streams on a single connection, and HPACK header compression. Many small files became cheap and domain sharding became an anti-pattern. The weakness: TCP delivers bytes in order, so one lost packet stalls **every** stream until it's retransmitted. Server push didn't work out and was removed from Chrome; 103 Early Hints replaces it.
- **HTTP/3:** runs over QUIC, which implements reliable, independent streams on top of UDP, so packet loss only delays the affected stream. TLS 1.3 is built into the handshake — one round trip for a new connection, zero on resumption, versus two or three for TCP + TLS — and connections survive switching from Wi-Fi to cellular.

**Why it matters:** the gains are largest on high-latency, lossy mobile networks — exactly where your p75 users are. Practically: enable HTTP/3 at the CDN, reduce the number of origins, and \`preconnect\` to critical third-party origins, because handshakes cost round trips under any protocol.`,
      followUps: ['How does the browser discover that a server supports HTTP/3?', 'Is domain sharding still useful?', 'Head-of-line blocking in HTTP/1.1 vs in TCP — what is the difference?'],
    },
    {
      id: 'fix-poor-inp',
      kind: 'debugging',
      level: 'senior',
      minutes: 3,
      question: 'Our INP is 450 ms at the 75th percentile. How do you find the cause and fix it?',
      answer: `**One-liner:** find which interactions are slow and which phase dominates, then remove, defer or move main-thread work in that phase.

**Find it:** INP is a field metric, so I start with RUM. The \`web-vitals\` attribution build gives the target element, the event type and the input delay / processing / presentation split, and Long Animation Frame data points at the responsible scripts. Then I reproduce that interaction in the Performance panel with CPU throttling.

**Fix by phase:**
- **Input delay** — the main thread was busy with something else: hydration, a third-party script, a timer. Break up long tasks, defer or remove third parties, ship less JavaScript.
- **Processing** — our handler and the render it triggers. Do the urgent visual update first and defer the rest: \`startTransition\`/\`useDeferredValue\` for expensive re-renders, \`scheduler.yield()\` (with a \`setTimeout\` fallback) between chunks of work, web workers for pure computation, debouncing, virtualising long lists, and cutting unnecessary re-renders.
- **Presentation delay** — rendering itself is expensive: a huge DOM, layout thrashing, costly styles. Shrink the DOM, batch reads before writes, use \`content-visibility: auto\` for off-screen sections.

**Verify** with the same interaction in the lab, then watch p75 INP in RUM. The common mistake is optimising load time — or wrapping everything in \`useMemo\` — when the real problem is one 300 ms synchronous handler.`,
      followUps: ['Why does await Promise.resolve() not help?', 'What is the advantage of scheduler.yield() over setTimeout?', 'How can TBT be low while INP is poor?'],
    },
    {
      id: 'ssr-vs-csr-performance',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'Compare SSR and CSR from a performance perspective. When would you choose each?',
      answer: `**One-liner:** SSR gets meaningful content on screen sooner but costs server time and hydration; CSR has a cheap TTFB but makes users wait for JavaScript and data before they see anything.

**CSR:** the server returns a near-empty shell — fast TTFB, cacheable on a CDN. Then the browser downloads, parses and executes the bundle, fetches data and renders. LCP depends on bundle size and the request chain, so it suffers on low-end phones, and SEO depends on crawlers executing JS. Fine for app-like experiences behind a login where sessions are long.

**SSR:** HTML is rendered per request, so FCP and LCP improve and content is crawlable. The costs: higher TTFB (rendering and data fetching on the server) and **hydration** — the page looks ready before handlers are attached, and hydration is main-thread work that can hurt INP during load.

**Middle grounds:**
- **SSG/ISR:** pre-rendered HTML from a CDN — fast TTFB *and* LCP for anything that can be built ahead of time, regenerated in the background.
- **Streaming SSR:** flush the shell immediately and stream slow sections behind Suspense boundaries; React hydrates selectively, prioritising what the user interacts with.
- **Islands / Server Components:** ship JavaScript only for interactive parts, which makes hydration cheaper.

**My default:** pre-render what can be pre-rendered, stream what's dynamic, keep the client bundle small — and use plain CSR for authenticated, app-like products.`,
      followUps: ['What is the "uncanny valley" of hydration?', 'How does streaming change TTFB and LCP?', 'When does rendering at the edge help, and when does it hurt?'],
    },
    {
      id: 'preload-prefetch-preconnect',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'Explain preload vs prefetch vs preconnect. When would you use each?',
      answer: `**One-liner:** \`preconnect\` warms up a connection, \`preload\` fetches a critical resource for the current page early and at high priority, and \`prefetch\` fetches something for a future navigation at low priority.

- **\`preconnect\`** performs DNS, TCP and TLS ahead of time for an origin you'll definitely request from soon — an image CDN, a font host, an API — saving several round trips. Limit it to two to four critical origins and add \`crossorigin\` for CORS requests like fonts. \`dns-prefetch\` is the cheaper, DNS-only version for less critical origins.
- **\`preload\`** (\`<link rel="preload" as="…">\`) is for resources the current page needs but the browser discovers late: a font referenced from CSS, a CSS-background LCP image, a script deep in an import chain. It needs the correct \`as\` (and \`crossorigin\` for fonts). Overusing it backfires, because preloads jump ahead of other critical requests. \`modulepreload\` is the ES-module variant and also parses and compiles.
- **\`prefetch\`** is a low-priority hint for the **next** navigation — say the JavaScript chunk for the page most users visit next — fetched when the network is idle and kept in the HTTP cache. For whole pages, the Speculation Rules API can prefetch or even prerender.

**Rule of thumb:** current page, critical, late-discovered → preload; next page → prefetch; another origin needed soon → preconnect. For the LCP image, \`fetchpriority="high"\` on an \`<img>\` in the HTML often beats a preload.`,
      followUps: ['Why does a font preload need crossorigin?', 'What do 103 Early Hints add?', 'How would you prefetch the next route in a React app?'],
    },
  ],
};

export default day;
