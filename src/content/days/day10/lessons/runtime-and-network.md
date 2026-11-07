## Why interviewers ask about runtime performance and networking

Once a page has loaded, two things decide whether it *feels* fast: whether the main thread is free to respond (INP), and how quickly data and assets come back over the network (caching, protocols, CDNs). Interviewers probe both because they reveal whether you understand the platform — the event loop, HTTP semantics, caches — rather than just a framework.

Typical questions: *"This search box is janky — what do you do?"*, *"How would you cache a single-page app's assets?"*, *"What's the difference between `no-cache` and `no-store`?"*, *"Why HTTP/3?"*. Each has a crisp, correct answer you'll be able to give by the end of this lesson.

## Long tasks and the three phases of INP

The browser's main thread runs **tasks** one at a time: parsing, your JavaScript, event handlers, style/layout/paint. A task longer than **50 ms** is a **long task** — while it runs, the browser can't respond to input or paint a new frame.

Recall INP's three phases (lesson 1). Each has different causes and fixes:

| Phase | What's happening | Common causes | Fixes |
|---|---|---|---|
| **Input delay** | The input waits for whatever task is already running | Hydration, big bundles evaluating, third-party scripts, timers doing heavy work, a previous interaction's work | Break up long tasks, defer third parties, ship less JS, smaller hydration (islands/RSC) |
| **Processing duration** | Your event handlers run, plus the synchronous React render they trigger | Filtering/sorting large data in the handler, re-rendering a huge tree, forced synchronous layout | Do less work, defer non-urgent work (yield, `startTransition`), memoise, virtualise, move CPU work to a worker |
| **Presentation delay** | Style, layout, paint and commit of the next frame | Huge DOM, expensive CSS, layout thrashing, large repaint areas | Reduce DOM size, `content-visibility`, avoid layout thrashing, CSS containment |

> [!INTERVIEW] Say it like this
> "To fix a poor INP I first find *which* interactions are slow from RUM attribution, then reproduce one in the Performance panel and see which phase dominates. Input delay means something else was hogging the main thread — I break up or defer that work. Long processing means my handler or the render it triggers is too expensive — I do the urgent visual update first and yield or use a transition for the rest. Long presentation delay means rendering itself is expensive — usually DOM size or layout thrashing."

## Yielding to the main thread

The core technique is **breaking long tasks up** so the browser can handle input and paint between the pieces. Crucially, only a **new task** (a macrotask) gives the browser that chance. Awaiting a resolved promise doesn't: microtasks run to completion before the browser does anything else (Day 2's event-loop model).

```ts run
// Stands in for "a click handler or a paint that's waiting for the main thread".
setTimeout(() => console.log('>> input/paint finally gets a turn'), 0);

console.log('chunk 1');
await Promise.resolve(); // microtask: NOT a yield
console.log('chunk 2');
await Promise.resolve();
console.log('chunk 3 - still the same task; nothing else could run');

await new Promise((resolve) => setTimeout(resolve, 0)); // macrotask: a real yield
console.log('chunk 4 - resumed in a new task, after the waiting work ran');
```

{{quiz:yield-microtask}}

### `scheduler.yield()` with a fallback

The modern API is `scheduler.yield()` (Chromium 129+, September 2024; other engines are still rolling it out, so feature-detect). Its advantage over `setTimeout(0)`: the continuation is queued **ahead of** other pending tasks, so your remaining work isn't pushed behind every third-party script that queued a task in the meantime — and it isn't subject to `setTimeout`'s ≥ 4 ms clamping of deeply nested timers.

```ts
type SchedulerLike = { yield?: () => Promise<void> };

export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerLike }).scheduler;
  if (typeof scheduler?.yield === 'function') return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Pattern 1: urgent feedback first, then yield, then the non-urgent work.
async function handleSaveClick(): Promise<void> {
  showSavingSpinner(); // what the user needs to see in the next frame
  await yieldToMain(); // let the browser paint it
  persistDraftToIndexedDb(); // things the user doesn't wait on
  sendAnalyticsEvent('save');
}

// Pattern 2: a time-budgeted loop — adapts to slow and fast devices.
async function processAll<T>(items: readonly T[], work: (item: T) => void): Promise<void> {
  let deadline = performance.now() + 50;
  for (const item of items) {
    work(item);
    if (performance.now() >= deadline) {
      await yieldToMain();
      deadline = performance.now() + 50;
    }
  }
}
```

You'll implement a chunked processor with cancellation in today's exercises.

### The rest of the toolbox

- **React's concurrent features** — `startTransition` and `useDeferredValue` mark a render as non-urgent; React renders it in small slices and yields to input between them, and abandons it if newer input arrives (Day 7). Ideal for "filter 10,000 rows as the user types".
- **Web workers** for CPU-heavy, DOM-free work: parsing large JSON/CSV, search indexing, diffing, image processing. Messages are copied with structured clone (use transferables such as `ArrayBuffer` for large binary data); libraries like Comlink make workers feel like async function calls.
- **Debounce/throttle** input-driven work (Day 2) — don't recompute on every keystroke if you don't have to.
- **Virtualise long lists** (Day 7) — render the 30 visible rows, not 10,000.
- **Avoid layout thrashing** — interleaving DOM writes and layout reads (`offsetHeight`, `getBoundingClientRect`) forces synchronous layout in a loop; batch reads, then writes (Day 8).
- **Keep the DOM small** — style recalculation and layout scale with DOM size; Lighthouse warns at roughly 1,400 elements.
- **`content-visibility: auto`** — lets the browser skip rendering work for off-screen sections until they approach the viewport (Baseline since September 2024):

```css
.feed-item {
  content-visibility: auto;
  /* Placeholder size while skipped, so the scrollbar doesn't jump; `auto` remembers the real size once rendered. */
  contain-intrinsic-size: auto 480px;
}
```

> [!MISTAKE]
> "I'd wrap everything in `useMemo` to fix INP." Memoisation helps only when the expensive part is a *re-computation that repeats with the same inputs*. If one interaction legitimately needs 300 ms of work, you have to **split, defer or move** that work — not cache it.

## Memory leaks

Memory problems in SPAs show up as a page that gets **slower the longer it's open** (more frequent garbage-collection pauses → jank), and eventually as crashed tabs on low-memory phones. Common causes:

- **Listeners, subscriptions, timers and observers never cleaned up** — an effect that adds a `resize` listener or opens a WebSocket without a cleanup function.
- **Detached DOM nodes** — elements removed from the document but still referenced from JavaScript (a closure, a module-level array, a cache), so they and their whole subtree can't be collected.
- **Unbounded caches** — a `Map` keyed by search query or URL that only ever grows. Cap it (an LRU — today's exercise), add a TTL, or use a `WeakMap` when keys are objects.
- **Closures holding large objects** longer than intended (Day 1), and global stores that accumulate history.

```tsx
function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize); // without this: one leaked listener per mount
  }, []);
  return width;
}
```

### Finding leaks in DevTools

1. **Watch the trend.** Open the *Performance monitor* (JS heap size, DOM nodes, event listeners) or record with the *Memory* checkbox in the Performance panel. Repeat a user flow ten times — open and close a modal, navigate away and back. A **sawtooth that returns to baseline** after GC is healthy; a **staircase** that keeps rising is a leak.
2. **Compare heap snapshots.** In the *Memory* panel: take a snapshot, perform the flow N times, click the *collect garbage* button, take another snapshot, and use the **Comparison** view sorted by delta. Objects that grew by exactly N are suspects.
3. **Search for detached nodes.** Filter a snapshot for `Detached` to find DOM trees that are no longer in the document; select one and read the **Retainers** panel — it shows the reference chain (often a listener or closure) that keeps it alive.
4. **Allocation instrumentation on timeline** shows which allocations survive over time, attributed to the code that made them.

> [!TIP]
> Logging objects with `console.log` keeps them reachable while DevTools is open. Close DevTools (or clear the console) before concluding something leaks.

## The network

### What a new connection costs

Before the first byte of a response can arrive on a fresh HTTPS connection, the browser needs a DNS lookup, a TCP handshake (1 round trip), a TLS handshake (1 RTT with TLS 1.3, 2 with TLS 1.2), and then the request itself (1 RTT). On mobile networks with 50–150 ms round-trip times, that adds up fast:

```ts run
const rttMs = 100; // a typical-ish mobile round trip
const roundTrips: Record<string, number> = {
  'HTTP/1.1 or HTTP/2 over TCP + TLS 1.2': 1 + 2 + 1, // TCP + TLS 1.2 + request
  'HTTP/2 over TCP + TLS 1.3': 1 + 1 + 1,
  'HTTP/3 (QUIC: transport + TLS 1.3 in one handshake)': 1 + 1,
  'HTTP/3 with 0-RTT resumption': 0 + 1,
};
for (const [setup, n] of Object.entries(roundTrips)) {
  console.log(`${setup}: ${n} RTT = ${n * rttMs} ms (+ DNS + server time)`);
}
```

That's why **fewer origins**, **connection reuse**, `preconnect` for critical third-party origins, and CDNs (which put the handshake endpoint physically closer) matter so much.

### HTTP/1.1 vs HTTP/2 vs HTTP/3

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP | TCP (one connection per origin) | **QUIC over UDP** |
| Concurrency | One request at a time per connection; browsers open ~6 connections per origin | **Multiplexing**: many concurrent streams on one connection | Multiplexed streams, independent at the transport layer |
| Headers | Plain text, repeated on every request | Binary framing + **HPACK** header compression | **QPACK** header compression |
| Head-of-line blocking | At the request level (queue per connection) | At the **TCP** level: one lost packet stalls *every* stream until it's retransmitted | **None across streams** — loss on one stream doesn't block the others |
| Handshake (new connection) | TCP + TLS: 2–3 RTT | Same as HTTP/1.1 | **1 RTT** (TLS 1.3 built into QUIC), **0-RTT** on resumption |
| Notable extras | — | Server push (deprecated and removed from Chrome; use 103 Early Hints instead) | **Connection migration**: survives switching from Wi-Fi to cellular (connection IDs instead of IP/port) |

Consequences you should mention:

- HTTP/1.1-era hacks — **domain sharding**, giant concatenated bundles, image sprites — are counterproductive under HTTP/2/3: sharding adds handshakes and defeats prioritisation, and mega-bundles hurt cache granularity.
- HTTP/3's wins are largest on **lossy, high-latency mobile networks**. Browsers discover it via the `Alt-Svc` response header (or DNS HTTPS records), so a first visit may still use HTTP/2, and they fall back to TCP when UDP is blocked.

> [!INTERVIEW] Say it like this
> "HTTP/2 fixed HTTP/1.1's one-request-per-connection limit by multiplexing many streams over a single TCP connection, with binary framing and header compression. But because it's all one TCP connection, a single lost packet stalls every stream — TCP head-of-line blocking. HTTP/3 runs over QUIC on UDP, where streams are independent, so loss only affects its own stream; the transport and TLS 1.3 handshakes are combined into one round trip, with 0-RTT on resumption; and connections survive network changes. The difference is biggest on flaky mobile networks."

## HTTP caching

The fastest request is the one you never make. HTTP caching has two ideas:

- **Freshness** — while a stored response is *fresh* (younger than its lifetime), a cache serves it without contacting the server at all.
- **Validation** — once it's *stale*, the cache asks the server "has this changed?" with a **conditional request**. If not, the server answers **`304 Not Modified`** with no body.

### `Cache-Control` directives

| Directive | Meaning |
|---|---|
| `max-age=N` | Fresh for N seconds (in any cache) |
| `s-maxage=N` | Overrides `max-age` for **shared** caches (CDNs, proxies) only |
| `no-cache` | **May store**, but must **revalidate before every use** (not "don't cache"!) |
| `no-store` | Must **not store** the response at all |
| `private` / `public` | Only the browser may store it (user-specific data) / shared caches may store it too |
| `immutable` | The body will never change while fresh — don't revalidate even when the user reloads |
| `must-revalidate` | Once stale, never serve it without a successful revalidation |
| `stale-while-revalidate=N` | After going stale, may serve it for N more seconds while revalidating in the background (supported by Chromium, Firefox and most CDNs) |
| `stale-if-error=N` | May serve stale content for N seconds if the origin errors |

> [!MISTAKE]
> Saying `no-cache` means "don't cache". It means "cache, but check with the server every time" — which with an ETag costs a round trip but usually no body. For "never store this" (banking pages, personal data) you need `no-store`.

### Validators and 304s

```http
GET /index.html
→ 200 OK
  Cache-Control: no-cache
  ETag: "v42-a1b2c3"

GET /index.html                      (next visit: stored copy must be revalidated)
  If-None-Match: "v42-a1b2c3"
→ 304 Not Modified                   (no body — the stored copy is reused)
  ETag: "v42-a1b2c3"
```

`ETag` / `If-None-Match` compares content identifiers; `Last-Modified` / `If-Modified-Since` compares timestamps (coarser, one-second resolution). A 304 saves **bandwidth**, not the **round trip**.

{{quiz:etag-304}}

> [!WARNING]
> If a response has no `Cache-Control` or `Expires` but does have `Last-Modified`, caches may apply **heuristic freshness** — commonly 10% of the time since it was last modified. An `index.html` last changed 10 days ago can then be served from cache for about a day without asking the server. Always send an explicit `Cache-Control` on HTML.

### The SPA caching strategy

This is the canonical answer interviewers want:

```text
/index.html                Cache-Control: no-cache                              + ETag
/assets/index-B3x9k2Qa.js  Cache-Control: public, max-age=31536000, immutable
/assets/index-Dk2l1qZp.css Cache-Control: public, max-age=31536000, immutable
/assets/logo-9fK1.svg      Cache-Control: public, max-age=31536000, immutable
/api/me                    Cache-Control: private, no-cache   (or no-store for sensitive data)
```

Why it works:

- Build tools (Vite, webpack) put a **content hash** in each asset's file name. If the content changes, the URL changes — so a given URL's content **never** changes, and it can be cached for a year with `immutable`. No revalidation requests, ever.
- `index.html` has a stable URL and references the current hashes, so it must **always be revalidated** (`no-cache` + ETag → usually a cheap 304). A deploy is visible on the next load.
- **Deploy gotcha:** keep old hashed assets on the server/CDN for a while after a deploy. A user with an old tab open will lazy-load an old chunk; if it's been deleted, they get "Failed to fetch dynamically imported module". Vite dispatches a `vite:preloadError` event you can handle by reloading the page.

On a CDN you can additionally cache the HTML at the edge — e.g. `s-maxage=60, stale-while-revalidate=600` or a long `s-maxage` with a cache **purge on deploy** — while the browser still revalidates.

### CDNs and the edge

A CDN serves content from **points of presence** close to users: lower RTT for handshakes and for every cache hit, TLS terminated at the edge, and less load on your origin (an **origin shield** collapses misses from many edges into one). Things to know:

- **Cache keys** are the URL plus anything named in `Vary`. `Vary: Accept-Encoding` is normal; varying on `User-Agent` or cookies fragments the cache into near-uselessness. Strip tracking query parameters from the key.
- **Edge compute** (functions running at the CDN) is great for redirects, A/B bucketing, auth checks and light personalisation. Rendering at the edge can make TTFB *worse* if every render needs several round trips to a database in one region — move the data, cache it, or render near the data.
- Modern CDNs give you HTTP/3, TLS 1.3, Brotli and image optimisation largely for free.

### Compression

| Encoding | Notes |
|---|---|
| **gzip** | Universal, fast; the baseline |
| **Brotli** (`br`) | Typically ~15–25% smaller than gzip for HTML/CSS/JS. Max level (11) is slow, so **pre-compress static assets at build time**; use moderate levels (around 4–6) for dynamic responses. Browsers only advertise it over HTTPS |
| **Zstandard** (`zstd`) | Newer; supported in Chromium (123+) and Firefox. Fast compression at good ratios — attractive for dynamic content |

The browser sends `Accept-Encoding: gzip, deflate, br, zstd`; the server picks one and replies with `Content-Encoding` and `Vary: Accept-Encoding`. Don't re-compress already-compressed formats (JPEG, PNG, WebP, AVIF, WOFF2, video) — it wastes CPU for no gain. And remember: compression reduces **transfer** size, not the parse/compile/execute cost of JavaScript.

### Service-worker caching strategies

A service worker is a programmable proxy between your page and the network. The standard strategies (as implemented by libraries like Workbox):

| Strategy | Behaviour | Use for |
|---|---|---|
| **Cache-first** | Serve from cache; on a miss, fetch and store | Hashed static assets, fonts, versioned images |
| **Network-first** | Try the network (often with a timeout); fall back to cache | HTML navigations, API data that should be fresh but must work offline |
| **Stale-while-revalidate** | Serve from cache immediately, update the cache from the network in the background | Avatars, feeds, non-critical API data where slightly stale is fine |
| **Network-only / cache-only** | One source only | Non-GET requests and analytics / a precached app shell |

```ts
// sw.ts — stale-while-revalidate for a feed endpoint
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !new URL(request.url).pathname.startsWith('/api/feed')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open('feed-v1');
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok) void cache.put(request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(network.catch(() => undefined)); // keep the worker alive to finish the update
        return cached;
      }
      return network;
    })(),
  );
});
```

Gotchas worth mentioning: a **cache-first strategy for HTML** can pin users to an old version of your app; a new service worker **waits** until all tabs using the old one are closed (unless you call `skipWaiting()`); and booting a service worker adds latency to navigations unless you enable **navigation preload**.

### Bonus: the back/forward cache

The **bfcache** keeps a full snapshot of the page in memory when the user navigates away, so Back/Forward is instant — free LCP wins for a surprisingly large share of navigations. Common blockers: `unload` event listeners (use `pagehide` or `visibilitychange` instead) and, historically, `Cache-Control: no-store` on the document. DevTools → Application → *Back/forward cache* tells you why a page isn't eligible.

## Key takeaways

- A **long task** (> 50 ms) blocks input and paint. INP = **input delay + processing + presentation delay** — find the dominant phase, then fix that phase.
- Only a **macrotask** yields to the browser; `await Promise.resolve()` does not. Prefer `scheduler.yield()` with a `setTimeout` fallback; do urgent UI first, then yield.
- Other tools: transitions, web workers, debouncing, virtualisation, avoiding layout thrashing, small DOMs, `content-visibility: auto`.
- Leaks: uncleaned listeners/timers, detached DOM, unbounded caches. Find them with heap-snapshot comparison and the Retainers panel.
- A new HTTPS connection costs several round trips; **HTTP/2** multiplexes over one TCP connection (TCP head-of-line blocking remains); **HTTP/3** uses QUIC/UDP: independent streams, 1-RTT/0-RTT handshakes, connection migration.
- `no-cache` = store but revalidate; `no-store` = don't store. ETag + `If-None-Match` → `304` saves bytes, not the round trip.
- SPA: **hashed assets `max-age=31536000, immutable`; `index.html` `no-cache`**; keep old chunks after deploys.
- Brotli beats gzip for text (pre-compress static assets); service workers implement cache-first, network-first and stale-while-revalidate.
