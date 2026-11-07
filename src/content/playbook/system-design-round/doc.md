## What a strong answer demonstrates

Frontend system design asks you to design a product surface ("design a news feed", "design Google Docs") from the browser's point of view. There is no single right answer. Interviewers grade whether you:

1. **Drive** the conversation with a clear structure instead of waiting for questions.
2. **Scope** the problem: core features first, explicit non-goals.
3. Make **decisions with trade-offs** ("cursor pagination because the feed changes constantly; the cost is no jump-to-page").
4. Go **deep** in one or two areas that matter for this product (real-time, rendering, offline, performance).
5. Stay **frontend-focused**: rendering, data flow, state, performance, accessibility. Don't spend 10 minutes on database sharding.

> [!INTERVIEW] Open with the plan
> "I'll start with requirements and scope, then sketch the high-level architecture, define the data model and the API between client and server, and finish with optimisations and a deep dive. I'll check in with you as I go. Is there an area you'd especially like me to focus on?"

## RADIO cheat sheet

RADIO (**R**equirements, **A**rchitecture, **D**ata model, **I**nterface, **O**ptimisations) is a widely used structure for frontend design rounds. Write the five headings on the whiteboard or doc at the start and fill them in.

| Phase | 45-min round | 60-min round | Deliverables | Useful phrases |
|---|---|---|---|---|
| **R**equirements | 5–8 min | 8–10 min | 3–5 core features, non-functional requirements, explicit out-of-scope list | "For the MVP I'll focus on X, Y, Z and treat W as out of scope." |
| **A**rchitecture | ~10 min | ~12 min | Box diagram: server/CDN, client view layer, data/controller layer, client store, service worker; rendering strategy | "The page is server-rendered for fast LCP and SEO; the feed hydrates and fetches further pages on the client." |
| **D**ata model | 5–8 min | ~8 min | Entities and fields; server state vs client state; normalised store shape | "Posts and users are normalised by id so a user's avatar update shows everywhere." |
| **I**nterface | 5–8 min | ~8 min | API endpoints or GraphQL queries, pagination params, real-time events, key component props | "`GET /feed?cursor=…&limit=20` returns `{ items, nextCursor }`." |
| **O**ptimisations | 10+ min | 15–20 min | Performance, network, a11y, security, i18n, observability, failure modes; 1–2 deep dives | "The biggest risk for this product is X, so let me go deeper there." |

> [!TIP]
> Watch the clock at the 15-minute mark. If you're still on requirements, you're behind. Say "Let me move to architecture" and move.

## Clarifying-questions bank

Ask 5–8 of these, not all of them. Pick those that **change the design**.

| Area | Questions |
|---|---|
| Users & scope | Who are the users? What are the 3 core user journeys? Is this a new product or a feature in an existing app? |
| Scale | How many items per view? How many concurrent users per document/room? How often does data change? |
| Devices & network | Mobile web, desktop or both? Low-end devices? Slow or flaky networks? Must it work offline? |
| Rendering & SEO | Do pages need to be indexed (public) or are they behind login? How important is first-load speed? |
| Real-time | Do users need to see others' changes live? Within what latency? Is collaboration simultaneous? |
| Content | User-generated content (sanitising, moderation)? Media types (images, video)? Rich text? |
| Quality | Accessibility target (WCAG 2.2 AA)? Supported locales, RTL? Browser support matrix? |
| Constraints | Existing stack or design system? Team size? Are there backend APIs already, or do we design them? |

## Diagrams in words

You will often design over video with a shared doc, so you must be able to **narrate a diagram**. A frontend architecture usually has these boxes:

| Box | Responsibility |
|---|---|
| **CDN / edge** | Static assets, cached HTML, image optimisation |
| **Server / BFF** | SSR, API aggregation for the client, auth/session cookies |
| **View layer** | Component tree (pages, feature components, design system primitives) |
| **Data / controller layer** | Hooks or services that fetch, cache, mutate, and subscribe to real-time events |
| **Client store** | Normalised server-state cache + UI state |
| **Service worker** | Offline caching, background sync, push notifications |
| **Observability** | Error reporting, RUM metrics, analytics |

**Narration tips:**

- Go **left to right** (browser → edge → server) and **number the flows**: "Arrow 1 is the initial HTML request; arrow 2 is the paginated feed API; arrow 3 is the WebSocket for new-post events."
- **Label every arrow** with protocol and payload: "HTTPS GET, JSON, cursor-paginated".
- Draw the component tree as an indented list in the doc: it doubles as the architecture of the view layer.
- After the diagram, **walk one user action end to end** ("user likes a post: optimistic update in the store, POST, rollback on failure").

## Building-block decision tables

### Rendering strategies

| Strategy | How it works | Best for | Costs |
|---|---|---|---|
| **CSR** | Empty HTML shell + JS bundle renders in the browser | Apps behind login, dashboards, highly interactive tools | Slow first paint and LCP on weak devices; weaker SEO; large JS |
| **SSR** | HTML rendered per request, then hydrated | Personalised pages that need SEO or fast first paint | Server cost, TTFB depends on data, hydration cost |
| **SSG** | HTML built at deploy time, served from CDN | Marketing, docs, blogs | Stale until rebuilt; build time grows with page count |
| **ISR / revalidation** | Static pages regenerated in the background after a TTL or on demand (Next.js term) | Large catalogues, product pages | Staleness window; framework-specific |
| **Streaming SSR** | Send the shell immediately, stream slower sections as they resolve (Suspense boundaries) | Data-heavy pages with fast and slow parts | Framework support needed; careful error handling |
| **React Server Components** | Components run on the server and send a serialised result; server-only components ship no JS | Content-heavy apps with islands of interactivity | Framework coupling (e.g. Next.js App Router), new mental model, caching complexity |
| **Islands / partial hydration** | Static HTML with independently hydrated widgets (e.g. Astro) | Content sites with a few widgets | Awkward for app-like, highly interactive pages |

> [!NOTE]
> SSR and RSC are not the same thing: SSR is about producing **HTML** on the server for the first load; RSC is about **which components run where** and can be combined with SSR. See the React cheat sheet for the comparison table.

### Data fetching and caching

| Choice | Use when | Trade-off |
|---|---|---|
| **REST** | Resource-shaped data, HTTP caching matters, simple teams | Over/under-fetching; many round trips for nested views |
| **GraphQL** | Many views with different shapes of the same graph, mobile + web clients | POST requests aren't HTTP-cacheable by default; needs a client cache; query cost control |
| **BFF (backend for frontend)** | Aggregate several services into view-shaped responses; keep tokens server-side | One more service to own |
| **Query cache** (TanStack Query, SWR, RTK Query) | Most apps: caching by key, dedupe, retries, stale-while-revalidate | Same entity can be duplicated across query results |
| **Normalised cache** (Apollo Client, Relay) | Same entity appears in many views and must update everywhere | More setup; cache-update logic for mutations |
| **HTTP cache** (`Cache-Control`, `ETag`) | Public or rarely changing resources | Hard to invalidate without hashed URLs |

Patterns to name: **prefetch** on hover or viewport, **optimistic updates** with rollback, **request dedupe**, **stale-while-revalidate**, invalidation by key or tag, and **cancellation** of stale requests.

### Real-time transport

| Transport | Direction | Strengths | Watch out for | Fits |
|---|---|---|---|---|
| **Short polling** | Client pulls on an interval | Trivial, works everywhere, cache-friendly | Wasted requests; latency equals the interval | Dashboards refreshed every 30–60 s |
| **Long polling** | Server holds the request until data arrives | Works through any proxy | Per-message overhead; reconnect logic | Fallback transport |
| **Server-Sent Events** | Server → client over HTTP | Built-in reconnect with `Last-Event-ID`; simple; proxy-friendly | Text only; one-way; ~6 connections per origin on HTTP/1.1 (fine on HTTP/2+) | Notifications, live scores, feeds, streaming AI responses |
| **WebSocket** | Full duplex | Low latency, bidirectional | Heartbeats, reconnection, ordering, auth on connect; scaling needs pub/sub | Chat, multiplayer, collaborative editing |
| **WebRTC** | Peer to peer | Media and low-latency data without a server hop | Signalling server, STUN/TURN for NAT traversal | Video calls, P2P file transfer |

Every persistent connection needs a **reconnection strategy**: exponential backoff with jitter (so thousands of clients don't reconnect in lockstep after an outage), then **resync** missed events using a cursor or sequence number.

```ts run
// Reconnect delay: exponential backoff with "full jitter".
function backoffDelay(attempt: number, baseMs = 500, capMs = 30_000, random: () => number = Math.random): number {
  const ceiling = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.round(random() * ceiling);
}

for (let attempt = 0; attempt < 8; attempt++) {
  const ceiling = Math.min(30_000, 500 * 2 ** attempt);
  console.log(`attempt ${attempt}: wait ${backoffDelay(attempt)} ms (ceiling ${ceiling} ms)`);
}
```

### Pagination

| Strategy | Request | Pros | Cons |
|---|---|---|---|
| **Offset / page** | `?page=3&limit=20` | Jump to page N; easy totals | Duplicates or gaps when items are inserted; deep offsets are slow in the database |
| **Cursor** | `?cursor=opaque&limit=20` → `{ items, nextCursor }` | Stable under inserts; efficient | No random access; totals are expensive |
| **Keyset** | `?after_id=123` on an indexed sort key | Very efficient (a form of cursor) | Sorting is tied to the key |

| UI pattern | Use for | Remember |
|---|---|---|
| Numbered pages | Tables, search results, SEO-relevant listings | URL state (`?page=3`) |
| "Load more" button | Accessible default; footer stays reachable | Focus management after loading |
| Infinite scroll | Feeds | Virtualisation, scroll restoration, a "load more" fallback |

### State management: where does this state live?

| State type | Examples | Tool |
|---|---|---|
| Local UI | Open/closed, input text, hover | `useState` / `useReducer` |
| Shared UI, low-frequency | Theme, locale, current user | Context |
| Shared UI, high-frequency or large | Editor selection, canvas tools | External store with selectors (Zustand, Redux, `useSyncExternalStore`) |
| Server cache | Feed items, product data | Query/normalised cache, or RSC |
| URL | Filters, sort, tab, page, search query | Router search params |
| Form | Drafts, validation, pending submission | Form library, or React 19 Actions + `useActionState` |
| Persistent client | Drafts, preferences, offline data | `localStorage` (small), IndexedDB (large) |
| Collaborative | Shared document | CRDT (e.g. Yjs, Automerge) or OT, synced over WebSocket |

> [!WARNING]
> Context is a dependency-injection mechanism, not a performance-optimised store: every consumer re-renders when the provided value changes. For frequently changing shared state, split contexts or use a store with selectors.

### Offline and resilience

| Service worker strategy | Behaviour | Use for |
|---|---|---|
| **Cache first** | Serve from cache, fall back to network | Hashed JS/CSS, fonts, icons |
| **Network first** | Try network, fall back to cache | HTML, API data where freshness matters |
| **Stale-while-revalidate** | Serve cache, update it in the background | Avatars, non-critical API data |
| **Network only** | Never cache | Payments, auth |
| **Cache only / precache** | Installed with the service worker | App shell |

- **Offline writes:** an **outbox** queue in IndexedDB, replayed on the `online` event (the Background Sync API helps but is Chromium-only). Send **idempotency keys** so retries don't double-submit.
- **Conflicts:** last-write-wins (simple, lossy), version checks (`If-Match` → `412 Precondition Failed`), field-level merge, or CRDT/OT for real-time collaboration.
- **UX:** offline banner, "pending" / "failed, retry" state per item, optimistic UI.

## Cross-cutting checklist

### Performance

- [ ] Route-level code splitting; lazy-load below-the-fold and rarely used widgets
- [ ] CDN + long-lived caching for hashed assets; Brotli; `preconnect` to critical origins
- [ ] SSR/streaming or SSG for content pages to improve LCP
- [ ] Responsive images (`srcset`/`sizes`), modern formats, `fetchpriority="high"` on the LCP image, explicit dimensions to prevent CLS
- [ ] Virtualise long lists; debounce expensive input handlers; move heavy compute to a Web Worker
- [ ] Keep interactions responsive (INP): break up long tasks, use transitions for non-urgent updates
- [ ] Measure: Core Web Vitals from real users (RUM), Lighthouse in CI, performance budgets

### Accessibility

- [ ] Semantic HTML and landmark regions; heading hierarchy
- [ ] Full keyboard support; visible focus; focus moved on SPA route changes and into dialogs
- [ ] Live regions for async updates (new messages, errors); `prefers-reduced-motion`
- [ ] Accessible components in the design system, so every team gets them for free
- [ ] Automated checks (axe) plus manual screen-reader passes

### Security

- [ ] XSS: rely on framework escaping, sanitise any HTML (DOMPurify), CSP with nonces, Trusted Types where supported
- [ ] Auth: session in `HttpOnly; Secure; SameSite` cookies, or a BFF holding tokens; CSRF protection
- [ ] Clickjacking: `frame-ancestors` in CSP; `rel="noopener"` on user links
- [ ] Uploads validated server-side; rate limiting; dependency auditing

### Internationalisation

- [ ] Externalised strings with ICU message format (plurals, gender)
- [ ] `Intl` for dates, numbers, currencies, relative time and lists
- [ ] RTL: CSS logical properties (`margin-inline-start`), `dir` attribute
- [ ] Layouts that survive 30–40% longer strings; locale in the URL for SEO; time zones

### Observability

- [ ] Error tracking (global `error` and `unhandledrejection` handlers, error boundaries, uploaded source maps)
- [ ] RUM performance metrics segmented by device and route
- [ ] Feature flags and gradual rollouts; analytics events for the core funnel
- [ ] Alerts on error-rate and Web Vitals regressions after deploys

## Ten practice prompts

| Prompt | Key insight | Deep dive to offer |
|---|---|---|
| **News feed** (Facebook, X) | Cursor pagination + normalised cache + virtualised list; show a "new posts" pill instead of shifting content under the reader | Optimistic likes, image loading, scroll restoration |
| **Autocomplete** (search box) | Debounce, cancel stale requests and cache results per query (LRU); the combobox ARIA pattern is half the answer | Keyboard navigation, ranking, prefetching the top hit |
| **Chat app** (Messenger, Slack) | WebSocket with reconnection and **ordering**: client-generated ids for optimistic sends, server sequence numbers to resync gaps | Offline outbox, reverse-scrolling virtualised list, read receipts |
| **Collaborative editor** (Google Docs) | Concurrent edits need OT or CRDTs; presence and cursors over WebSocket; local-first edits | Per-user undo, conflict UX, large-document rendering |
| **Photo gallery** (Pinterest masonry) | Reserve space with known aspect ratios to avoid CLS; responsive images; virtualised masonry columns | Image CDN parameters, placeholders, infinite scroll |
| **E-commerce product & checkout** | SSG/ISR or SSR for SEO and LCP on product pages; checkout favours correctness: idempotent order submission, hosted payment fields for PCI scope | Cart sync across tabs (`BroadcastChannel`), A/B testing, inventory staleness |
| **Video streaming** (YouTube, Netflix) | Adaptive bitrate streaming (HLS/DASH via Media Source Extensions); preload strategically | Player accessibility (captions, keyboard), resume position, thumbnails on scrub |
| **Spreadsheet / data grid** (Google Sheets) | Virtualise **both** rows and columns; recompute formulas through a dependency graph in topological order | Canvas vs DOM rendering, keyboard navigation, collaborative cells |
| **Travel / rental search** (Airbnb) | URL is the source of truth for filters; debounce map-bounds queries; keep map and list in sync | Date-picker accessibility, caching availability, SSR for SEO |
| **Design system / component library** | API design (composition, controlled/uncontrolled), theming with CSS custom properties and tokens, accessibility built in | Versioning and codemods, tree-shaking, visual regression testing |

> [!MISTAKE]
> Listing technologies without reasons. "I'd use Redux and GraphQL" scores nothing; "I'd use a normalised cache because the same post appears in the feed, the profile and search, and a like must update all three" scores well.

> [!MISTAKE]
> Designing the backend. A frontend round wants the API contract and client behaviour, not database schemas or Kubernetes. Mention the server boundary and move on unless asked.

> [!MISTAKE]
> Forgetting failure modes. For every network interaction, say what the user sees while loading, on error, when offline, and when data is stale.

## Key takeaways

- Structure with **RADIO** and announce the plan in the first minute; keep an eye on the clock.
- Ask only the clarifying questions that change the design, and write down scope and non-goals.
- Make every choice a **trade-off**: rendering strategy, data layer, transport, pagination, state location.
- Narrate diagrams left to right with numbered, labelled flows, then walk one user action end to end.
- Reserve 10+ minutes for optimisations: performance, accessibility, security, i18n, observability, failure modes.
- Pick one or two deep dives that matter for *this* product and go genuinely deep.
