## Why this lesson exists

In a system design round you don't have time to derive everything from first principles. Strong candidates carry a **toolbox of standard building blocks** — each with a one-line definition, the problem it solves, and its costs — and snap them together to fit the requirements. This lesson is that toolbox. Each section ends with the sentence you'd actually say in the interview.

Several topics have their own day in this course; here you learn *when to reach for them in a design*, not how they work internally: rendering strategies, RSC, TanStack Query and virtualization (Day 7), `useSyncExternalStore` (Day 6), HTTP caching, protocols and an LRU cache (Day 10), the combobox pattern (Day 9), retries, latest-wins and concurrency limits (Day 2), and security, i18n and observability (Day 12).

## 1. Choosing a rendering strategy

| Strategy | First paint / LCP | SEO & link previews | Client JS cost | Server cost | Reach for it when… |
|---|---|---|---|---|---|
| **CSR** (SPA) | Slow: blank/skeleton until JS loads and fetches | Weak — Google renders JS (with delay); most link-preview bots don't | Full app | Static hosting only | Behind login, highly interactive (dashboards, editors) |
| **SSR** (streaming) | Fast HTML; streams as data resolves | Good | Full hydration of the tree | Per request | Personalised *and* public or LCP-critical (feeds, product pages) |
| **SSG / ISR** | Fastest — from CDN | Good | Hydration of interactive parts | Build time / periodic revalidation | Same for every user: marketing, docs, blog, catalog pages |
| **RSC** (+ client components) | Fast, streams with Suspense | Good | Only client components ship JS | Per request (cacheable segments) | Content-heavy apps with islands of interactivity, in an RSC framework |

Rules of thumb you can say out loud:

- **Public + indexable or shareable** → server-render (SSR/SSG). Link previews (Slack, X, iMessage) read `<meta>` tags from the HTML; they don't run your JS.
- **Behind login, app-like** → CSR is fine; an SSR'd shell can still improve LCP.
- **Hybrid is normal:** SSR the first feed page for fast LCP, then fetch subsequent pages on the client.

> [!INTERVIEW] Say it like this
> "The feed is behind login, so SEO doesn't matter, but LCP does — I'd server-render the first page of posts so the first image starts downloading from the HTML, then switch to client-side fetching for pagination. If we were on an RSC framework, the post body could be a server component and only the action bar would ship JS."

## 2. Component architecture and state ownership

Decompose by **responsibility**, typically three tiers:

1. **Route/page components** orchestrate data: which queries run, URL params, layout.
2. **Feature components** (`FeedList`, `Composer`, `CommentThread`) own a slice of behaviour and their local state.
3. **Presentational / design-system components** (`Avatar`, `Button`, `Popover`) are reusable, stateless or self-contained, and take everything through props.

Then decide **who owns each piece of state** with five rules:

1. **Colocate.** State lives in the lowest component that needs it.
2. **Lift to the lowest common owner** only when siblings need to share it — no higher.
3. **Server data goes in a server-state cache**, not in `useState` + `useEffect` and not copied into Redux. The cache gives you dedupe, staleness, retries and invalidation.
4. **The URL is state.** Filters, search query, selected tab and pagination belong in search params: shareable, bookmarkable, back-button friendly.
5. **Derive, don't sync.** If it can be computed from other state (counts, filtered lists, "is valid"), compute it during render; storing it creates two sources of truth.

For truly shared client state, pick by **update frequency**: React context for low-frequency values (theme, locale, current user) — every consumer re-renders on change — and an external store with selectors (Zustand, Redux Toolkit, or your own via `useSyncExternalStore`) for high-frequency or large shared state, so components subscribe to just the slice they read.

> [!MISTAKE]
> "I'd put everything in Redux." A global store for all state couples unrelated features and duplicates server data that then goes stale. Modern answer: server-state cache for server data, local state by default, a small global store only for genuinely global client state.

## 3. The client data layer

### Server-state cache

A server-state cache (TanStack Query, RTK Query, SWR, Apollo, Relay) stores responses under a **key** (`['feed', { userId }]`, `['post', id]`) and gives you: request **dedupe** (ten components asking for the same key make one request), **stale-while-revalidate** (show cached data instantly, refetch in the background), **garbage collection** of unused entries, retries, and **invalidation** after mutations. You covered TanStack Query on Day 7 — in a design round, name the capabilities, then the library.

### Normalization

Most caches are **document caches**: each key stores the response as returned. That's simple, but the same entity gets duplicated — Ada's user object lives inside every post and comment she wrote, across every query that returned them. Rename Ada and you must find and patch every copy (or refetch everything).

A **normalized store** keeps one copy of each entity in a table keyed by id, and replaces nested objects with references:

```ts
interface NormalizedState {
  entities: {
    posts: Record<PostId, { id: PostId; author: UserId; comments: CommentId[]; likeCount: number }>;
    users: Record<UserId, User>;
    comments: Record<CommentId, { id: CommentId; author: UserId; body: string }>;
  };
  feed: { ids: PostId[]; nextCursor: string | null }; // lists hold ids, not objects
}
```

```ts run
type User = { id: string; name: string };
const users: Record<string, User> = { u1: { id: 'u1', name: 'Ada' } };
const posts = {
  p1: { id: 'p1', author: 'u1', text: 'Hello' },
  p2: { id: 'p2', author: 'u1', text: 'Again' },
};

// A selector "joins" at read time — the view gets nested data, the store stays flat.
const selectPost = (id: keyof typeof posts) => ({ ...posts[id], author: users[posts[id].author] });

users.u1 = { ...users.u1, name: 'Ada Lovelace' }; // ONE write…
console.log(selectPost('p1').author.name, '|', selectPost('p2').author.name); // …visible everywhere
```

What normalization buys you:

- **Consistency:** one write updates every view of the entity — essential for real-time updates and optimistic mutations.
- **O(1) lookups** by id; list components hold arrays of ids, item components select their entity.
- **Render isolation:** a `FeedItem` subscribed to `posts[id]` re-renders when *its* post changes, not when another post gets a like — if your selectors are memoized so unchanged entities keep the same reference.

What it costs: more code (normalize on write, denormalize via selectors on read), schema knowledge, and garbage collection of orphaned entities. Apollo's `InMemoryCache` and Relay normalize automatically (by `__typename` + `id`); Redux Toolkit's `createEntityAdapter` gives you the table shape; the classic `normalizr` library (no longer maintained) is the pattern you'll implement in today's exercise.

> [!INTERVIEW] When to normalize
> "If the same entities appear in several lists and change often — likes, user names, read state, real-time updates — I'd normalize, so every mutation is a single write. For a page that shows each record once and mostly reads, a document cache with targeted invalidation is simpler, and I'd start there."

{{quiz:sd-normalize-why}}

## 4. API design for frontends

You usually get to shape the API in a frontend design round. Choose deliberately.

### REST vs GraphQL vs RPC (tRPC)

| | REST | GraphQL | RPC / tRPC |
|---|---|---|---|
| Shape of data | Server-defined per endpoint → over/under-fetching, multiple round trips | Client asks for exactly the fields it needs, many resources in one request | Function calls; shape per procedure |
| HTTP caching / CDN | Excellent for `GET` (`Cache-Control`, `ETag`) | Hard: usually one `POST` endpoint; needs persisted queries over `GET` | Possible for queries over `GET`; framework-specific |
| Client cache | Document cache keyed by URL | Normalized cache out of the box (Apollo, Relay, urql) | Document cache (tRPC wraps TanStack Query) |
| Types | OpenAPI + codegen | Schema + codegen, strongly typed | **End-to-end inference, no codegen** — but TypeScript on both ends, usually one monorepo |
| Errors | HTTP status codes | Often `200` with an `errors` array; partial data is a feature | Typed errors per procedure |
| Uploads / streaming | Natural | Awkward (multipart spec, or upload elsewhere) | Varies |
| Best for | Public APIs, cacheable resources, simple CRUD | Many clients with different data needs; deeply nested UIs | Internal full-stack TS apps |

### The Backend-for-Frontend (BFF)

A **BFF** is a thin server owned by the frontend team that sits between the UI and the microservices. It **aggregates** several upstream calls into one response shaped for the screen, keeps secrets and tokens server-side (the browser holds an `HttpOnly` session cookie), and can differ per client (web vs mobile). Cost: another service to deploy, monitor and keep fast. A GraphQL gateway is one way to implement it; an SSR/RSC framework's server is often a BFF in practice.

### Offset vs cursor pagination

| | Offset (`?offset=40&limit=20` or `?page=3`) | Cursor (`?after=eyJ0Ijo…&limit=20`) |
|---|---|---|
| Stable when items are inserted/deleted | **No** — duplicates or skipped items | **Yes** — continues after a fixed item |
| Jump to page N, show "page 3 of 12" | Yes | No (only next/previous) |
| DB performance at depth | `OFFSET 100000` scans and discards rows | Keyset `WHERE (created_at, id) < (…)` uses the index |
| Good for | Admin tables, search results with page numbers, stable data | Feeds, timelines, chat history, infinite scroll |

```ts run
// Server-side data, newest first.
let posts = ['p9', 'p8', 'p7', 'p6', 'p5', 'p4'];

const byOffset = (offset: number, limit: number) => posts.slice(offset, offset + limit);
const byCursor = (after: string | null, limit: number) => {
  const start = after === null ? 0 : posts.indexOf(after) + 1; // real cursors encode the sort key
  const items = posts.slice(start, start + limit);
  return { items, nextCursor: items.at(-1) ?? null };
};

const first = byCursor(null, 3);
console.log('page 1 (both):', byOffset(0, 3).join(','));

posts = ['p10', ...posts]; // someone posts while we're reading page 1

console.log('offset page 2:', byOffset(3, 3).join(','), '← p7 again: duplicate');
console.log('cursor page 2:', byCursor(first.nextCursor, 3).items.join(','), '← continues after p7');
```

A real cursor is an **opaque** string (often base64 of the last item's sort key plus id as a tie-breaker, e.g. `2025-01-03T10:00:00Z|p7`). Opaque matters: clients can't construct or depend on it, so the server can change the encoding.

### Error formats, batching and dedupe

- **One error shape everywhere.** Use meaningful HTTP status codes plus a machine-readable body. The standard is **RFC 9457 Problem Details** (`application/problem+json`, which replaced RFC 7807): `{ type, title, status, detail, instance }`, extended with e.g. `errors: [{ field: 'email', code: 'taken' }]` for forms. Your UI maps `code` → localized message; never show raw server strings.
- **Retry semantics in the response:** `429`/`503` with `Retry-After`.
- **Batching:** avoid N requests for N items — `GET /users?ids=1,2,3`, or let GraphQL/BFF aggregate (server-side DataLoader solves the N+1 behind it). HTTP/2 multiplexing (Day 10) makes many parallel requests cheaper, but it does not remove the extra round trips of *dependent* requests (waterfalls).
- **Dedupe:** concurrent identical `GET`s should share one promise — your server-state cache does this by key.

## 5. Real-time: polling, long polling, SSE, WebSockets

| | Short polling | Long polling | Server-Sent Events | WebSocket |
|---|---|---|---|---|
| Mechanism | `GET` every N seconds | Server holds the request until data or timeout, client immediately re-requests | One long-lived HTTP response streaming `text/event-stream` | HTTP upgrade to a persistent, full-duplex socket |
| Direction | Client pull | Server → client (emulated) | **Server → client** | **Both ways** |
| Latency | Up to N seconds | Near real-time | Near real-time | Near real-time |
| Overhead | High (requests even when nothing changed) | One request per message batch | Low | Lowest per message; binary supported |
| Reconnect / resume | n/a | Manual | **Built in** (`EventSource` reconnects and sends `Last-Event-ID`) | **Manual** — plus heartbeats to detect dead connections |
| Infra | Any HTTP | Any HTTP; ties up connections | Plain HTTP; works with HTTP/2 multiplexing (on HTTP/1.1, counts against ~6 connections per origin) | Stateful servers: sticky sessions or a pub/sub backplane to fan out |
| Gotchas | Battery/data on mobile | Ordering, timeouts at proxies | Text only; native `EventSource` can't set custom headers (use cookies or a fetch-based client) | Corporate proxies, scaling, auth on connect, no backpressure in the classic API |
| Use for | Infrequent updates, simplest MVP | Fallback when nothing else works | Notifications, feeds, live scores, progress, LLM token streams | Chat, collaborative editing, presence, multiplayer |

Two patterns to mention:

- **"Push a signal, pull the data."** The real-time channel sends tiny events (`{ type: 'new_posts', count: 3 }`); the client fetches the data through the normal, cached, authorized API. Keeps the channel simple and the data path single.
- **Visibility-aware updates.** Pause polling (or close the stream) when `document.visibilityState === 'hidden'` and refetch on return — big battery and server savings. Use one connection per user, not per tab, by electing a leader tab (`BroadcastChannel` or Web Locks) or a `SharedWorker`.

{{quiz:sd-realtime-choice}}

## 6. Optimistic updates and rollback

An **optimistic update** applies the expected result of a mutation to the UI immediately, then reconciles with the server's response. It makes likes, toggles and comments feel instant. The algorithm:

1. **Cancel** in-flight refetches of the affected data (so a stale response can't overwrite your optimistic value).
2. **Snapshot** the current value.
3. **Apply** the optimistic change to the cache.
4. **Send** the mutation.
5. **On success:** reconcile with the server's returned entity (it's the truth — counts may include other users' likes). **On failure:** roll back and tell the user (toast with retry). Finally, invalidate/refetch if needed.

TanStack Query models this with `onMutate` (steps 1–3, return the snapshot as context), `onError` (rollback) and `onSettled` (invalidate). React 19's `useOptimistic` gives you a temporary optimistic value during an action/transition that automatically falls back to the real state when it ends.

```ts run
type Post = { id: string; likeCount: number; viewerHasLiked: boolean };
const store = new Map<string, Post>([['p1', { id: 'p1', likeCount: 10, viewerHasLiked: false }]]);

async function like(id: string, api: (id: string) => Promise<Post>) {
  const snapshot = store.get(id)!;
  store.set(id, { ...snapshot, likeCount: snapshot.likeCount + 1, viewerHasLiked: true });
  console.log('optimistic  ', store.get(id));
  try {
    store.set(id, await api(id)); // the server's entity is the truth
    console.log('confirmed   ', store.get(id));
  } catch (e) {
    store.set(id, snapshot);
    console.log('rolled back ', store.get(id), `(${(e as Error).message})`);
  }
}

await like('p1', async () => { throw new Error('503'); });
await like('p1', async (id) => ({ id, likeCount: 12, viewerHasLiked: true })); // someone else liked too
```

Pitfalls interviewers probe:

- **Concurrent mutations on one entity.** Like → unlike → like quickly, with responses arriving out of order. Fixes: make the API **idempotent "set" semantics** (`PUT /posts/1/like` / `DELETE /posts/1/like`, or `{ liked: true }`) instead of "toggle", and apply only the response for the latest intent; or serialize mutations per entity. Restoring a whole snapshot can clobber a newer change — rolling back by inverse operation or refetching is safer.
- **Created items need client ids.** An optimistic comment gets a temporary id (`crypto.randomUUID()`), rendered with a "sending…" state, then swapped for the server id. Send the same UUID as an **idempotency key** so a retried `POST` doesn't create a duplicate.
- **When not to be optimistic:** payments, irreversible or destructive actions, operations likely to fail validation, or where the server computes the result (e.g. an assigned order number). Use a pending state instead.

## 7. Errors, retries and backoff

Classify failures before deciding what to do:

| Failure | Auto-retry? | Notes |
|---|---|---|
| Network error, timeout | Yes, if the request is idempotent (or carries an idempotency key) | Set timeouts with `AbortSignal.timeout(ms)` |
| `429 Too Many Requests`, `503` | Yes — honour `Retry-After` | |
| `500`, `502`, `504` | Yes, a few times with backoff | |
| `400`, `403`, `404`, `409`, `422` | **No** — retrying won't change the answer | Show a specific message; `409` → refetch and let the user resolve |
| `401` | Refresh the session once, then retry; otherwise send to login | |

**Exponential backoff with jitter:** wait `base × 2^attempt`, capped, and randomize. Without jitter, thousands of clients that failed together retry together — a *thundering herd* that keeps the server down. "Full jitter" picks a random delay between 0 and the exponential ceiling. (You implemented `retry` on Day 2.)

```ts run
const base = 500;
const cap = 30_000;
for (let attempt = 0; attempt < 7; attempt++) {
  const ceiling = Math.min(cap, base * 2 ** attempt);
  const delay = Math.round(Math.random() * ceiling); // full jitter
  console.log(`attempt ${attempt}: wait ${delay} ms (ceiling ${ceiling} ms)`);
}
```

On the UI side: **error boundaries per region** (one broken feed item or widget shouldn't blank the page) — remembering they only catch errors thrown during rendering, not in event handlers or async callbacks; **keep stale data visible** with an inline "couldn't refresh — retry" rather than replacing content with an error; and **report** errors with context (route, release, user action) to your monitoring (React 19's `onCaughtError`/`onUncaughtError` root options are a good hook; observability is covered on Day 12).

## 8. Offline support

Offline is a spectrum — say which level the requirements need:

| Level | What the user gets | Mechanism |
|---|---|---|
| 0. Honest failure | "You're offline" banner, disabled actions | `online`/`offline` events (they only detect *no* network, not a bad one — failed requests are the real signal) |
| 1. App shell loads offline | The UI opens without network | **Service worker** precaching HTML/JS/CSS (e.g. Workbox) |
| 2. Read offline | Previously seen data is available | SW runtime caching (network-first for API, stale-while-revalidate or cache-first for static assets), or persist the query cache to **IndexedDB** |
| 3. Write offline | Actions queue and sync later | An **outbox**: persist mutations (with client ids) in IndexedDB, show them as pending, replay on reconnect |
| 4. Collaborative offline | Concurrent edits merge | Conflict resolution: last-write-wins, server-wins with user review, or CRDTs (Day 12's collaborative editor) |

Details that show depth: **IndexedDB, not `localStorage`**, for data (async, structured clone, stores Blobs, far larger quota; `localStorage` is synchronous, strings only, ~5 MB). The **Background Sync API** is Chromium-only, so also replay the outbox on `online` and on app start. Storage can be evicted — request `navigator.storage.persist()` for important data, and know that Safari can clear script-writable storage for sites the user hasn't visited in a while. Service workers require HTTPS, and a bad SW caching strategy can pin users to an old release — plan the update flow (`skipWaiting` + "new version available, reload" prompt).

## 9. Security and accessibility are requirements, not deep dives

Put both in your **non-functional requirements** and revisit them in each phase, instead of saying "and then we'd make it accessible" at minute 44.

- **Security** (detail on Day 12): treat all user-generated content as text — React escapes by default; anything going through `dangerouslySetInnerHTML` is sanitized (DOMPurify) and backed by a **Content Security Policy**. Session in an `HttpOnly`, `Secure`, `SameSite` cookie rather than a token in `localStorage` (XSS-readable). Validate uploads server-side. Never trust client-side authorization checks — they're UX, not security.
- **Accessibility** (detail on Day 9): semantic HTML first; every interaction keyboard-operable; visible focus; focus management on route changes, dialogs and when content is inserted or removed; **live regions** to announce async results ("5 results", "Post published"); respect `prefers-reduced-motion`; contrast. For component questions, name the WAI-ARIA APG pattern you're following (combobox, dialog, tabs, feed).

> [!INTERVIEW] Say it like this
> "I'm listing accessibility and security as requirements up front, because they shape the design: the autocomplete follows the APG combobox pattern so the markup and keyboard model are decided now, and because suggestions include user-generated text, we render them as text with highlight ranges from the server rather than trusting server HTML."

## Key takeaways

- **Rendering:** public/SEO/LCP-critical → SSR/SSG; app behind login → CSR (maybe an SSR shell); hybrid is normal.
- **State ownership:** colocate, lift minimally, server data in a server-state cache, URL as state, derive instead of syncing.
- **Normalize** when entities repeat across views and change often; lists hold ids, items select by id.
- **API:** REST for cacheable/public, GraphQL for many clients with varied needs, tRPC for internal full-stack TS; a BFF aggregates and shapes. **Cursor** pagination for feeds, **offset** when users need page numbers.
- **Real-time:** SSE for server→client streams, WebSockets for bidirectional, polling for infrequent; push a signal, pull the data.
- **Optimistic updates:** cancel → snapshot → apply → send → reconcile or roll back; idempotent "set" APIs and client ids/idempotency keys tame concurrency.
- **Retries:** only transient failures, exponential backoff with jitter, honour `Retry-After`.
- **Offline** is a spectrum: SW app shell → IndexedDB reads → outbox writes → conflict resolution.
