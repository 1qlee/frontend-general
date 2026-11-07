## How to use these case studies

Below are two of the most frequently asked frontend design prompts, worked end-to-end with RADIO — one **component** question (autocomplete) and one **product** question (news feed). Read each once, then close the page and re-run it out loud against a 30-minute timer. The goal isn't to memorise answers; it's to internalise the *moves*: which requirements matter, which deep dives to offer, and the trade-off sentences. Day 12 applies the same moves to chat, carousels, e-commerce, collaborative editing and design systems.

---

## Case study 1: Autocomplete / typeahead

> *"Design an autocomplete component — like the search box on Google, Amazon or Facebook."*

### R — Requirements

Clarifying questions worth asking (and what each changes):

- **Reusable library component or one product's search box?** → generic props API and rendering customization vs a fixed design.
- **What's being searched and how big is it?** A list of 200 countries can be filtered **on the client** (no network, no races); a product catalogue needs a **server**.
- **Result types?** Plain text, or rich rows (images, categories, "people" vs "pages")? Affects the data model and row rendering.
- **Recent/trending suggestions on focus with an empty query?**
- **Devices?** Mobile web means virtual keyboards, touch targets, small viewports.

A good requirements summary:

| Functional | Non-functional |
|---|---|
| Suggestions appear as the user types | Feels instant: results within ~100–300 ms of the user pausing |
| Select with mouse, touch or keyboard | Minimal network: no request per keystroke, no duplicate requests |
| Matched text highlighted | Correct under races — never shows results for an old query |
| Loading, empty and error states | Accessible: APG combobox pattern, screen-reader announcements |
| Optional: recent searches on focus | Works with IME input (Chinese/Japanese), RTL, mobile keyboards |
| Selecting navigates or fills the input (configurable) | Reusable: works with any data source |

### A — Architecture

```text
<Autocomplete>                                   (controller: owns state & keyboard model)
 ├─ <input role="combobox">  ── onChange ─► query
 ├─ <ResultsPopup role="listbox">                 (positioned under the input)
 │    └─ <Option role="option"> × N  (renderItem) ── click ─► onSelect
 └─ live region ("5 results available")

Data layer (framework-agnostic client)
  setQuery(q) → key = normalize(q)
    ├─ empty      → status idle, abort in-flight request
    ├─ cache hit  → status success, instantly
    └─ cache miss → status loading → debounce ~250 ms → abort previous → fetch(q, signal)
  on response
    ├─ aborted        → ignore
    ├─ ok             → write to cache; update state only if key is still current
    └─ error          → status error if key is still current (never cached)
```

The key architectural decision is **separating the data layer from the view** — a small client object (`setQuery`, `subscribe`, `getState`) that owns debouncing, caching and request ordering — which you'll build in today's stretch exercise. The React component subscribes to it (e.g. via `useSyncExternalStore`) and owns only UI state. Benefits: unit-testable without a DOM, reusable across frameworks, and the view stays simple.

### D — Data model

| State | Owner | Notes |
|---|---|---|
| `inputValue` | Component | What the input displays (can differ from the query after a selection) |
| `query` (debounced, normalized) | Data layer | `trim().toLowerCase()` (+ diacritics folding if the server does it) |
| `results`, `status`, `error` | Data layer | `status: 'idle' \| 'loading' \| 'success' \| 'error'` |
| Cache `Map<normalizedQuery, Result[]>` | Data layer | LRU (~50 entries), optional TTL (~5 min) |
| `activeIndex`, `isOpen` | Component | Pure UI state |

```ts
interface Suggestion {
  id: string;
  type: 'query' | 'product' | 'person';
  label: string;
  highlights: Array<[start: number, end: number]>; // ranges, not HTML
  url?: string;
  thumbnailUrl?: string;
}
```

### I — Interface

**Component API** (the heart of a component question):

```tsx
interface AutocompleteProps<T> {
  fetchSuggestions: (query: string, opts: { signal: AbortSignal }) => Promise<T[]>;
  onSelect: (item: T) => void;
  getItemKey: (item: T) => string;
  renderItem?: (item: T, state: { active: boolean; query: string }) => React.ReactNode;
  debounceMs?: number;        // default 250
  minQueryLength?: number;    // default 1
  maxResults?: number;        // default 8
  initialSuggestions?: T[];   // recent searches on focus
  label: string;              // accessible name — required, not optional
}
```

Mention the alternative: a **headless** API (a `useAutocomplete()` hook returning prop getters, like Downshift) for teams that need full control of markup. Trade-off: maximum flexibility vs more work for each consumer and more ways to break accessibility.

**Server API:**

```http
GET /api/suggest?q=rea&limit=8&locale=en-GB
200 { "query": "rea", "results": [{ "id": "…", "type": "query", "label": "react hooks", "highlights": [[0, 3]] }] }
Cache-Control: public, max-age=60        (non-personalised suggestions → CDN can absorb popular prefixes)
```

Echoing `query` back lets the client verify which request a response belongs to. Personalised suggestions must be `Cache-Control: private`.

### O — Optimizations and deep dives

**Network efficiency**

- **Debounce** keystrokes (~200–300 ms): fire once the user pauses. (Throttle fits "update while dragging"; for typing you want the final value.)
- **Cache per normalized query**, LRU-bounded, so backspacing is instant and repeated queries are free.
- **Minimum query length** and a `limit` on results.
- **Prefetch** popular/recent suggestions on focus; `preconnect` to the API origin.
- **Client-side filtering of a cached superset** is tempting ("rea" → filter the "re" results) but only correct if the server returned *all* matches for the shorter prefix — usually it returns the top 8, so don't.

**Race conditions (latest wins)**

Responses arrive out of order: the request for `"re"` can resolve after the one for `"rea"`, replacing correct results with stale ones. Fix with **AbortController** — abort the previous request when a new one starts — **and** a check that the response belongs to the current query (abort is best-effort; some APIs ignore it). Stale-but-valid responses can still be cached. (You built the latest-wins primitive on Day 2.)

> [!INTERVIEW] Say it like this
> "Every request gets an AbortSignal; starting a new request aborts the previous one, and when a response lands I only apply it if it's for the current query. Late responses are still written to the cache, because the data is correct for its key — so backspacing shows them instantly."

**UX**

- Highlight matches using server-provided ranges (works with stemming and diacritics, and avoids rendering HTML).
- **Don't flash:** keep previous results visible while the next query loads, and delay a spinner by ~150–200 ms so fast responses never show one.
- Distinct empty ("No results for 'xyz'") and error ("Couldn't load suggestions — retry") states.
- Cap the list (8–10). If it can be long, virtualize — but usually don't need to.

**Accessibility — the APG combobox pattern** (full details on Day 9)

- Input: `role="combobox"`, `aria-expanded`, `aria-controls` → listbox id, `aria-autocomplete="list"`, `aria-activedescendant` → active option id. **Focus stays in the input**; the active option is virtual.
- Popup: `role="listbox"` with `role="option"` children, `aria-selected` on the active one.
- Keys: ↓/↑ move (wrapping is common), Enter selects, Escape closes (a second Escape clears), Tab accepts or leaves per design.
- A polite **live region** announces "8 results available" after results update.
- Options use `onMouseDown={e => e.preventDefault()}` so clicking doesn't blur the input and close the list before the click lands.

**Internationalization**

- **IME composition:** while composing (Japanese, Chinese, Korean), keystrokes aren't final characters. Don't fire searches or handle Enter during composition — check `event.nativeEvent.isComposing` / listen for `compositionend`.
- Normalize for matching (`'Café'.normalize('NFD')` + strip combining marks) if the server doesn't; support RTL layout of the popup.

**Mobile**

- `type="search"` or `inputmode="search"`, `enterkeyhint="search"`, `autocapitalize="off"`, `autocorrect="off"`, `spellcheck={false}`.
- Comfortable touch targets: WCAG 2.2 AA requires at least 24×24 CSS px, but aim for ~44×44 (the AAA level and Apple's guideline). Keep the popup above the virtual keyboard (`visualViewport` resize events) or switch to a full-screen search view on small screens.

**Security**

- Render labels as **text** with highlight ranges — injecting server HTML (`<b>rea</b>ct`) via `innerHTML` is an XSS hole if any suggestion contains user-generated content.

{{quiz:sd-autocomplete-race}}

---

## Case study 2: News feed

> *"Design a news feed, like Facebook's or X's."*

### R — Requirements

Ask about: which post types (text, images, video, links), interactions (like, comment, share), whether new posts should appear live, devices (mobile web is the majority of traffic for most social products), and whether SEO matters (logged-in feed: no; public profile pages: yes).

| Functional (core) | Non-functional |
|---|---|
| Infinite, ranked feed of posts (text + images) | Fast first load: LCP < 2.5 s on mid-range mobile |
| Create a post (text + up to 4 images) | Smooth scrolling for long sessions (hundreds of items) without memory growth |
| Like and comment | Interactions feel instant (optimistic) |
| "N new posts" without losing scroll position | Accessible feed (screen reader + keyboard) |
| *Out of scope:* stories, DMs, ad targeting, ranking algorithm | Resilient on flaky networks; i18n (relative times, plurals, RTL) |

### A — Architecture

- **Rendering:** SSR (streamed) the first page for fast LCP, hydrate, then client-side pagination. Logged-in, so no SEO pressure — SSR is for performance.
- **Data layer:** server-state cache for feed pages + a **normalized entity store** (posts, users, comments) so likes, edits and real-time updates are single writes. Feed list state = ordered ids + cursor.
- **Real-time:** an SSE channel sends `new_posts` signals (count + newest id); the client fetches the posts through the normal API.
- **View tree:**

```text
FeedPage
 ├─ Composer                         (draft persisted to localStorage; optimistic create)
 ├─ NewPostsBanner                   ("3 new posts" — click to reveal + scroll to top)
 └─ FeedList (virtualized)           (subscribes to feed.ids; sentinel triggers next page)
      └─ FeedItem(id)                (selects posts[id]; error boundary per item)
           ├─ ItemRenderer by type:  post | shared_link | suggested_follows | ad
           │    ├─ PostHeader        (avatar, name, relative time)
           │    ├─ PostBody          (text with links/mentions — rendered as text + entities)
           │    └─ MediaGrid         (responsive images, placeholders)
           ├─ ActionBar              (like / comment / share — optimistic)
           └─ CommentsPreview        (first 2 comments; "view all" paginates)
```

### D — Data model

```ts
type FeedItem =
  | { kind: 'post'; id: PostId }
  | { kind: 'suggested_follows'; id: string; users: UserId[] }
  | { kind: 'ad'; id: string; creative: AdCreative };

interface Post {
  id: PostId;
  author: UserId;
  createdAt: string;            // ISO; formatted with Intl.RelativeTimeFormat
  text: string;
  entities: Array<{ type: 'mention' | 'link' | 'hashtag'; start: number; end: number; ref: string }>;
  media: Array<{ url: string; width: number; height: number; blurhash?: string; alt: string }>;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
}

interface FeedState {
  ids: string[];                // display order
  nextCursor: string | null;    // for "load more" (older)
  hasMore: boolean;
  pendingNewIds: string[];      // fetched but not shown yet (banner)
}
```

Client-only state: composer draft (persisted), pending optimistic posts/comments (with temp ids and `status: 'sending' | 'failed'`), per-item UI (expanded text, comment box open).

### I — Interface

```http
GET  /api/feed?cursor=<opaque>&limit=10        → { items: FeedItem[], posts: Post[], users: User[], nextCursor: string | null }
POST /api/posts            Idempotency-Key: <uuid>   { text, mediaIds }   → Post
PUT  /api/posts/:id/like                                                  → { likeCount, viewerHasLiked }
DELETE /api/posts/:id/like                                                → { likeCount, viewerHasLiked }
GET  /api/posts/:id/comments?cursor=…&limit=20                            → { items: Comment[], users: User[], nextCursor }
POST /api/posts/:id/comments Idempotency-Key: <uuid> { text }             → Comment
GET  /api/feed/stream   (SSE)   event: new_posts   data: { "count": 3, "newestId": "p812" }
```

Notes to say out loud: the feed response is **already normalized** (`items` reference ids; `posts`/`users` side-loaded) — less payload, no duplicate users. Like/unlike are **idempotent set operations**, not a toggle, so retries and out-of-order responses are safe. Polymorphic items use a **discriminated union** on `kind`, which maps to a renderer registry on the client and lets the server add item types without breaking old clients (unknown kinds are skipped).

### O — Optimizations and deep dives

**Infinite scroll and pagination**

- **Cursor pagination** — new posts are inserted at the top constantly, so offsets would duplicate or skip items.
- Trigger the next page with an **IntersectionObserver** on a sentinel near the end of the list, with a generous `rootMargin` (e.g. one or two screens) so the next page is loading before the user gets there. No scroll listeners.
- Guard against **duplicate fetches** (one in flight at a time per cursor) and **dedupe items by id** when merging pages — ranking can shift an item into the next page (today's `mergeFeedPages` exercise).
- Offer a **"Load more" button fallback** after N pages or on error, so keyboard users can reach the footer and failures are recoverable.

**Rendering performance: virtualization**

- After a few hundred items, DOM size hurts memory, style recalculation and INP. **Virtualize** — render only the items in and near the viewport (TanStack Virtual, react-window; Day 7).
- Feed items have **variable heights**: use an estimated size, **measure** actual heights after render (`ResizeObserver`), and keep an overscan of a few items. Keep scroll anchored when heights above the viewport change.
- Costs to state: browser find-in-page and screen readers only see rendered items, scroll restoration on back-navigation needs saved offsets, and complexity rises. A lighter alternative for moderate lists is CSS `content-visibility: auto` with `contain-intrinsic-size`, which skips rendering work for off-screen items while keeping them in the DOM.

**The new-posts banner**

- Never insert new posts above the user while they're reading — content jumps and they lose their place (and it's a CLS hit). Buffer them: the SSE signal increments a counter; the banner shows "3 new posts".
- On click: fetch/prepend the new page (merging by id, **keeping the bottom cursor** — the refresh doesn't change where "load more" continues), scroll to top, move focus to the first new post, and announce it.
- If the refreshed page has **no overlap** with what's loaded, there may be a gap — reset the feed rather than stitching.

**Optimistic interactions**

- Likes: optimistic count and state, idempotent PUT/DELETE, roll back on error with a toast.
- Comments: append immediately with a temp id and "Sending…", swap in the server comment on success, show "Failed — retry" inline on error (keep the text!). Same `Idempotency-Key` on retry.
- Creating a post: show it at the top in a pending state; media uploads first (see the photo-upload drill question).

**Images and media**

- Responsive images: `srcset` + `sizes`, modern formats (AVIF/WebP) from an image CDN.
- `loading="lazy"` for below-the-fold images, but **not** for the first post's image — it's likely the LCP element: give it `fetchpriority="high"` (and SSR it so it's discoverable in the HTML).
- Reserve space with `width`/`height` attributes or `aspect-ratio` from the API's dimensions — no layout shift.
- Placeholders: dominant colour or a tiny blurhash/LQIP while loading; video autoplay muted, only when visible, paused off-screen.

**Feed item composition and resilience**

- Renderer registry keyed by `kind`; rare item types **code-split** with `lazy()`.
- An **error boundary per item**: one malformed post renders a small fallback instead of crashing the feed.
- Memoize `FeedItem` and select by id so a like re-renders one item, not the list.

**Loading, empty and error states**

| Situation | UI |
|---|---|
| First load | Skeleton items matching real layout (or SSR content) |
| First load fails | Full-area error with retry |
| Next page fails | Keep loaded items; inline "Couldn't load more — retry" at the bottom |
| Empty feed | Onboarding: suggested accounts to follow |
| Offline | Banner; cached items remain readable; actions queue or disable |
| End of feed | "You're all caught up" |

**Accessibility**

- The WAI-ARIA **feed pattern**: container `role="feed"`, each item an `<article>` with `aria-labelledby` (author/title), `aria-posinset` and `aria-setsize` (`-1` when total unknown), and `aria-busy="true"` on the feed while items are being added.
- Keyboard: every action reachable; optional shortcuts (j/k to move between posts) that don't conflict with assistive tech; focus never lost when pages load or items virtualize away.
- Polite announcements: "3 new posts", "Post published", errors.
- Alt text is part of the data model (`media.alt`), and the composer asks for it.

**i18n and the rest**

- `Intl.RelativeTimeFormat` for "5 minutes ago", `Intl.PluralRules` for "1 comment / 2 comments", logical CSS properties for RTL.
- Observability: track LCP/INP/CLS from real users, feed-load errors, and time-to-first-post (Day 12).

> [!MISTAKE]
> Spending the deep-dive time on the ranking algorithm or the fan-out-on-write backend. Say: "Ranking happens on the server; the client receives an ordered page. I'll focus on how the client loads, renders and updates it."

> [!INTERVIEW] A 30-second wrap-up
> "To recap: SSR the first page for LCP, cursor-paginated client fetching with an IntersectionObserver sentinel, a normalized store so likes and real-time updates are single writes, a virtualized list with measured variable heights, a buffered new-posts banner that never shifts content, optimistic likes and comments with idempotent APIs, and the feed ARIA pattern. Biggest risks are virtualization complexity and scroll restoration; I'd measure INP and memory on low-end Android before committing to it."

{{quiz:sd-feed-banner}}

## Reuse map: the same moves, different prompts

| Prompt | Reuses from today | New deep dive to prepare |
|---|---|---|
| Instagram / Pinterest grid | Feed pagination, images, virtualization | Masonry layout, image CDN transforms |
| Search results page | Autocomplete, offset pagination (page numbers!), URL state | Filters/facets in the URL, SSR for SEO |
| Notifications bell | SSE, optimistic mark-as-read, cursor pagination | Cross-tab sync (one connection per user), unread-count consistency |
| Comments thread (YouTube/Reddit) | Normalization, optimistic create, cursor pagination | Nested replies, collapsing, sorting |
| Photo upload flow | Optimistic create, retries/backoff, idempotency | Presigned uploads, chunking/resume, client-side resizing |

## Key takeaways

- **Component question** (autocomplete): the depth is in the **props API**, the data layer (debounce, LRU cache, abort + latest-wins), the **APG combobox** keyboard/ARIA model, and IME/mobile details.
- **Product question** (feed): the depth is in **pagination** (cursor + sentinel + dedupe), **virtualization**, the **normalized store**, **real-time signals** with a buffered banner, **optimistic** interactions, and **image/LCP** handling.
- Always cover loading, empty, error and offline states — they're cheap points.
- End with a 30-second recap that names the biggest risks and what you'd measure.
