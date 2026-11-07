## Why interviewers ask for case studies

Day 11 gave you the **RADIO** framework and the building blocks (API design, pagination, polling/SSE/WebSockets, optimistic updates, offline). Real frontend system design rounds, though, draw from a small set of recurring prompts: *design a chat app, an image carousel, a product page and checkout, Google Docs, a component library*. The interviewer is not checking whether you've memorised an architecture. They're checking whether you can:

1. **Scope** it: ask the questions that change the design, then state your assumptions.
2. Produce a **sensible client architecture**: components, state ownership, data flow.
3. Define a **data model and an interface** (server API *and* component API) precisely enough to build.
4. Go **deep in 2–3 areas where frontend expertise shows**: real-time, performance, accessibility, offline, security.

A weak answer is a tour of buzzwords. A strong answer makes **decisions**, says what each one costs, and drives the time. Below are compact RADIO outlines for the five classics. Each ends with a decisions table: in an interview, that table *is* your answer.

| Step | What you produce | ≈ time in 45 min |
|---|---|---|
| **R**equirements | functional, non-functional, explicitly out of scope | 5 |
| **A**rchitecture | boxes: UI components, client store, sync/network layer, server APIs | 8–10 |
| **D**ata model | client entities, where each lives (server cache, client state, URL, storage) | 5–8 |
| **I**nterface | server API (REST/WS events) + key component props | 5–8 |
| **O**ptimizations | deep dives: perf, a11y, offline, security, i18n, observability | 15+ |

> [!TIP]
> Say the time budget out loud at the start ("I'll spend about five minutes on requirements, then sketch the architecture…"). It signals that you're driving and lets the interviewer redirect you early.

---

## Case study 1: Chat / messaging app

### R: Requirements

- **Functional:** conversation list (last message preview, unread count); 1:1 and group conversations; send and receive text in real time; message status *sending → sent → delivered → read*; scroll back through history; typing indicators. Attachments are a stretch goal.
- **Non-functional:** low perceived latency (your own message appears instantly); works on flaky mobile networks; **no lost and no duplicated messages**; conversations with 100k+ messages; multiple tabs and devices; accessible.
- **Out of scope (say it):** end-to-end encryption internals, voice/video, search.

### A: Architecture

```
┌──────────────────────── UI ─────────────────────────┐
│ ConversationList │ ConversationView                 │
│                  │  MessageList (virtualized, role="log")
│                  │  Composer                        │
└────────▲─────────┴──────────▲───────────────────────┘
         │ selectors          │ dispatch(send)
┌────────┴────────────────────┴───────┐
│ Client store (normalized)           │◄──► Outbox (IndexedDB)
└────────▲────────────────────▲───────┘
         │ events             │ history / cursors
┌────────┴─────────┐  ┌───────┴────────┐
│ Realtime client  │  │ REST client    │
│ WebSocket +      │  │ fetch + cache  │
│ heartbeat/retry  │  │                │
└──────────────────┘  └────────────────┘
```

The key structural decision is a single **sync layer** that owns the socket and turns wire events into store actions. Components never touch `WebSocket` directly, so you can test, replace or share the connection.

**Transport:** WebSocket, because traffic is bidirectional and frequent (messages, typing, receipts). History stays on REST: it's cacheable and paginated. Sending over HTTP `POST` with WebSocket only for receiving is also a defensible choice (standard retries, auth and status codes). Mention it as an alternative.

### The WebSocket lifecycle: heartbeats and reconnection

- `readyState`: `CONNECTING (0) → OPEN (1) → CLOSING (2) → CLOSED (3)`. Events: `open`, `message`, `error` (always followed by `close`) and `close` with a code (`1000` normal, `1001` going away, `1006` abnormal: the connection dropped without a close frame).
- **Half-open connections.** Wi-Fi switches, NAT timeouts and laptop sleep can kill the TCP connection silently, and the browser may not notice for minutes. The browser API doesn't expose protocol-level ping/pong frames to JavaScript, so you add an **application-level heartbeat**: send `{ type: 'ping' }` every ~25 s, and if nothing arrives within a timeout, close and reconnect.
- **Reconnect with exponential backoff, a cap and jitter.** Reset the attempt counter once the connection has been stable for a while. Reconnect immediately on the `online` event and when the tab becomes visible again. Treat `navigator.onLine` as a hint only.
- **Resync after reconnecting.** Send the last `seq` you have per conversation (`resume`) or fetch `GET /messages?after=seq`. Otherwise anything sent during the outage silently never appears.
- **Auth.** The browser `WebSocket` constructor can't set an `Authorization` header. Either rely on cookies, in which case the server **must check the `Origin` header** (WebSockets are not covered by CORS, so cross-site WebSocket hijacking is a real attack), or fetch a short-lived single-use ticket over authenticated HTTP and pass it when connecting.

```ts run
// "Full jitter" backoff: a random delay between 0 and an exponentially growing, capped ceiling.
function backoffDelay(attempt: number, baseMs = 500, maxMs = 30_000, random = Math.random): number {
  const ceiling = Math.min(maxMs, baseMs * 2 ** attempt);
  return Math.round(random() * ceiling);
}

for (let attempt = 0; attempt < 8; attempt++) {
  const ceiling = Math.min(30_000, 500 * 2 ** attempt);
  console.log(`attempt ${attempt}: wait ${backoffDelay(attempt)}ms (ceiling ${ceiling}ms)`);
}
// Without jitter, every client dropped by the same deploy retries at 500ms, 1s, 2s… in lockstep.
```

{{quiz:chat-backoff-jitter}}

### D: Data model

```ts
type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

interface Message {
  clientId: string;      // crypto.randomUUID(), created BEFORE sending: idempotency key + stable React key
  serverId?: string;     // assigned when the server persists it
  seq?: number;          // per-conversation, strictly increasing, assigned by the server
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: number;     // client clock: display only
  status: MessageStatus;
}

interface Conversation {
  id: string;
  participantIds: string[];
  lastMessagePreview: string;
  unreadCount: number;
  lastReadSeqByUser: Record<string, number>; // read receipts as a watermark
  oldestLoadedSeq?: number;                  // history cursor
  hasMoreHistory: boolean;
}
```

Store it **normalized** (`messagesById`, ordered ids per conversation, `conversationsById`, `usersById`) so a receipt or an edit updates exactly one record.

**Ordering and idempotency, the core of this question:**

- **Never order by client timestamps.** Clocks skew and two devices disagree. Order by the server-assigned `seq` per conversation, and keep unconfirmed messages at the bottom.
- **The server delivers at-least-once** (it replays after reconnects), so the client **dedupes by `serverId`**. **The client retries at-least-once**, so the server **dedupes by `clientId`** (the idempotency key). Together you get *effectively-once* delivery.
- The optimistic message is keyed by `clientId`. When the ack arrives you attach `serverId` and `seq` but **keep `clientId` as the React key**, so the row doesn't remount (no flicker, and focus and animations survive).
- **Gaps:** if you hold `seq` 103 and receive 105, fetch 104 before trusting the list.
- **Statuses:** *sent* (server persisted) → *delivered* (a recipient device received it) → *read* (a recipient viewed it). Model read receipts as a **per-user watermark** (`lastReadSeq`) rather than per-message flags: one event marks everything up to N as read. *failed* shows "Tap to retry".

You'll implement exactly this as a reducer in today's exercises.

### Offline outbox

1. On send, write the message to the store (optimistic) **and** to an outbox persisted in **IndexedDB**, so it survives a reload or crash.
2. Flush in FIFO order when connected. Remove an entry on ack. Retry transient failures with backoff. Mark it *failed* on a non-retryable error or after N attempts.
3. Each retry carries the same `clientId`, so retrying after an **ambiguous** failure (a timeout: did it arrive?) is safe. The server returns the existing message instead of creating a second one.
4. **Multiple tabs:** exactly one tab should own the socket and the outbox. Use a `SharedWorker`, or leader election with the Web Locks API (`navigator.locks.request('chat-leader', …)`) plus a `BroadcastChannel` to fan events out to the other tabs.

### I: Interface

```
GET  /conversations?cursor=…                          → { items: Conversation[], nextCursor }
GET  /conversations/:id/messages?before=<seq>&limit=50 → { items: Message[], hasMore }
POST /conversations/:id/messages { clientId, body }   → { serverId, seq }   // idempotent on clientId

WS server → client
  { type: 'message.new', conversationId, message }
  { type: 'message.ack', clientId, serverId, seq }
  { type: 'receipt', conversationId, userId, kind: 'delivered' | 'read', upToSeq }
  { type: 'typing', conversationId, userId }
  { type: 'pong' }
WS client → server
  message.send · receipt.read · typing (throttled, ~1 per 3 s) · ping · resume { [conversationId]: lastSeq }
```

### O: Deep dives

- **History pagination:** cursor-based (`before=seq`), never offset-based, because new messages shift offsets. Use reverse infinite scroll: an `IntersectionObserver` sentinel at the top triggers `loadOlder()`.
- **Scroll anchoring:** prepending older messages pushes content down. Record `scrollHeight - scrollTop` before the prepend and restore it in `useLayoutEffect`, or rely on CSS scroll anchoring (`overflow-anchor`, not supported everywhere) or a `flex-direction: column-reverse` container. Stick to the bottom only if the user was already at the bottom; otherwise show a "New messages ↓" pill.
- **Virtualization:** thousands of variable-height rows need windowing with measured heights (TanStack Virtual, react-virtuoso). Reserve image dimensions to avoid jumps. *Trade-off:* find-in-page and screen readers only see rendered rows, so keep some overscan.
- **Accessibility:** the message list is `role="log"` (implicitly `aria-live="polite"`). Announce only the active conversation, not every busy group. The composer has a label; Enter sends and Shift+Enter inserts a newline.
- **Performance and security:** batch bursts of incoming events per animation frame and memoize rows. Render message text as text; if you support links or markdown, validate URLs and sanitize (lesson 2 and today's exercises).

| Decision | Choice | Trade-off |
|---|---|---|
| Transport | WebSocket for events, REST for history | Stateful connections: heartbeats, reconnection, sticky scaling. SSE is simpler but one-way |
| Ordering | Server `seq` per conversation | Needs a sequencer on the server; client timestamps would be wrong |
| Exactly-once *effect* | `clientId` idempotency key + `serverId` dedupe | The server must remember keys for a window |
| Offline | IndexedDB outbox, FIFO flush | Complexity; needs single-tab ownership (leader election) |
| Long history | Cursor pagination + virtualization | Scroll anchoring, find-in-page and a11y need care |

---

## Case study 2: Image carousel / photo gallery

Often asked as **component design** ("design the API") and as a **machine-coding round** ("build it in 45 minutes"). You'll build one today.

**R:** one image at a time; previous/next; indicator dots; swipe on touch; keyboard support; optional autoplay; captions; responsive images. NFR: 60 fps transitions, no layout shift, accessible, small bundle. *Clarify:* loop or stop at the ends? Several slides per view? Thumbnails? A full-screen lightbox?

**A:** `Carousel` owns `index`. Slides render inside a track that moves with `transform: translateX(-index * 100%)`, which only touches the compositor. Controls (prev/next, dots, rotation button) read and update the index via context (compound components) or props.

**D:** `Slide { id, src, srcSet?, alt, caption?, width, height }`. UI state: `index`, `isPlaying` (the user's choice), `isHovered` and `hasFocusWithin` (temporary pauses), and the drag offset during a swipe.

**I: component API**

```tsx
<Carousel
  aria-label="Product photos"
  slides={slides}                 // data-driven… or compound: <Carousel.Slide>…</Carousel.Slide>
  index={index}                   // controlled (optional)
  defaultIndex={0}                // uncontrolled
  onIndexChange={setIndex}
  loop
  autoplay={{ intervalMs: 5000 }}
  renderSlide={(slide, { isActive }) => <ProductImage {...slide} priority={isActive} />}
/>
```

Points to discuss: support both **controlled and uncontrolled** use (like `<input>`); **data-driven vs compound components** (simple vs flexible); a **headless hook** (`useCarousel()` returning prop getters) for maximum reuse across design systems.

**O: deep dives**

- **Images:** the first slide is often the **LCP element**, so give it `loading="eager"` and `fetchpriority="high"` and lazy-load the rest. **Preload the neighbours** (index ± 1) so navigation feels instant. Use `srcset` + `sizes` for responsive images, and explicit `width`/`height` (or `aspect-ratio`) to prevent CLS.

```ts run
// Which slides to preload? Neighbours with wrap-around (JS % keeps the sign of the dividend!)
const mod = (n: number, m: number) => ((n % m) + m) % m;

function neighbours(index: number, total: number, radius = 1): number[] {
  const out = new Set<number>();
  for (let d = -radius; d <= radius; d++) if (d !== 0) out.add(mod(index + d, total));
  return [...out];
}

console.log(-1 % 5, mod(-1, 5)); // -1 vs 4
console.log(neighbours(0, 5));    // [4, 1]
console.log(neighbours(4, 5, 2)); // [2, 3, 0, 1]
console.log(neighbours(0, 2));    // [1] (de-duplicated)
```

- **Swipe:** Pointer Events give one code path for mouse, touch and pen. Use `setPointerCapture`, follow the finger with `translateX` during the drag, and decide on release by distance (e.g. > 20% of the width) or velocity. Set `touch-action: pan-y` so vertical page scrolling still works. **Alternative:** CSS scroll snap (`scroll-snap-type: x mandatory`) gives native momentum and trackpad support for free. In exchange, you derive `index` from the scroll position (`scrollend` or `IntersectionObserver`), and looping is harder.
- **Motion:** animate only `transform` and `opacity`. Honour `prefers-reduced-motion` (no slide animation, no autoplay by default).
- **Accessibility (WAI-ARIA APG Carousel pattern):**
  - Container: `<section aria-roledescription="carousel" aria-label="…">`, a labelled region landmark.
  - Each slide: `role="group"`, `aria-roledescription="slide"`, `aria-label="3 of 8"`.
  - Prev/next are real `<button>`s with accessible names. Hidden slides are hidden from assistive tech (`hidden` or `inert`) so Tab never lands on invisible links.
  - Slide picker: buttons with labels and `aria-current`, or the APG *tabbed carousel* (`tablist`/`tab` with arrow keys).
  - **Autoplay:** provide a rotation control (Stop/Start), first in tab order. Pause on hover and when keyboard focus enters; APG says rotation shouldn't resume until the user activates the rotation control. Set `aria-live="off"` on the slide container while rotating and `"polite"` otherwise, so manual navigation is announced but auto-rotation doesn't spam. **WCAG 2.2.2 (Pause, Stop, Hide):** anything that moves automatically for more than 5 seconds needs a way to pause it.

> [!MISTAKE]
> Putting `aria-live="polite"` on an auto-rotating carousel. A screen reader then interrupts the user every few seconds with the next slide. Live announcements belong to user-initiated changes only.

| Decision | Choice | Trade-off |
|---|---|---|
| Movement | `transform` track (or CSS scroll snap) | Full control vs native physics, with index sync as the cost |
| API | Controlled + uncontrolled, `renderSlide` | More surface area to document |
| Loading | Eager current + neighbours, lazy the rest | Neighbour preloads spend bandwidth the user may not need |
| Autoplay | Off by default, pausable, `aria-live` off while rotating | Product teams often want it on |

---

## Case study 3: E-commerce product page and checkout

**R:** a product detail page (PDP: gallery, title, price, variants, availability, reviews, add to cart); a cart; checkout (address → shipping → payment → review → confirmation); guest and signed-in users. NFR: **SEO** and social previews; **fast LCP on mid-range phones** (conversion tracks speed); **money correctness** (never charge the wrong amount, never charge twice); PCI compliance; accessibility (a legal requirement in many markets, e.g. the European Accessibility Act applies to e-commerce from June 2025).

**A: choose rendering per page**

| Page | Rendering | Why |
|---|---|---|
| PDP | SSR/SSG at the edge, short TTL + `stale-while-revalidate` (Day 10); price/stock/personalisation as small dynamic islands | SEO, LCP, cacheable |
| Cart | Client-rendered behind the session; `Cache-Control: private` | Personal data, must never be CDN-cached |
| Checkout | Minimal JS, no caching, minimal third-party scripts | Correctness and security |

SEO on the PDP: real content in the server HTML; `<title>`, meta description and Open Graph tags; a **canonical URL** (variant query params canonicalise to the product); **JSON-LD `Product` structured data** with `offers` (price, currency, availability) for rich results. Hydrate only what's interactive (islands / React Server Components).

**D:**

```ts
interface Variant { sku: string; options: Record<string, string>; priceMinor: number; currency: string; inStock: boolean }
interface CartLine { sku: string; quantity: number }                 // the client sends SKUs + quantities, never prices
interface Cart { id: string; lines: (CartLine & { unitPriceMinor: number })[]; totalMinor: number; currency: string; version: number }
```

Money is **integer minor units** (cents) or decimal strings, never floats (`0.1 + 0.2 !== 0.3`). Format with `Intl.NumberFormat(locale, { style: 'currency', currency })`. **The server computes totals, tax and discounts**; the client only displays them.

**Cart state and cross-tab sync:**

- Keep a **server-authoritative cart** (cart id in an HttpOnly cookie) so it survives devices and logins. On the client, use a server-state cache (e.g. TanStack Query) with optimistic quantity updates and rollback.
- **Cross-tab:** when tab A adds an item, tab B's header badge should update. Post `cart-updated` on a `BroadcastChannel` (or listen for the `storage` event, which fires in *other* same-origin tabs when `localStorage` changes) and refetch. Also refetch on `visibilitychange`.
- **Concurrent writes:** send a `version` (or ETag with `If-Match`). A `409`/`412` means refetch and reapply.
- **Login:** merge the guest cart into the user's cart on the server.

```ts run
// BroadcastChannel delivers to every OTHER channel object with the same name in the same origin, never to the sender.
const tabA = new BroadcastChannel('cart');
const tabB = new BroadcastChannel('cart'); // in real life: another tab

tabB.onmessage = (e) => console.log('tab B received:', JSON.stringify(e.data), '→ refetch cart');
tabA.onmessage = () => console.log('tab A never receives its own message');

tabA.postMessage({ type: 'cart-updated', version: 7 });
await new Promise((resolve) => setTimeout(resolve, 50));
tabA.close();
tabB.close();
```

{{quiz:cart-cross-tab-sync}}

**Inventory and price staleness.** Cached PDP HTML can be minutes old. Fetch price and stock client-side after load (reserve their space to avoid layout shift) or keep a very short TTL. **Checkout is where truth is enforced:** the server re-prices and re-checks stock, and the UI handles "The price changed from €49 to €54" and "Only 1 left; we updated your quantity" explicitly instead of failing generically.

**Payments and PCI scope:**

- If card data touches your page's JavaScript or your servers, much of your stack falls in **PCI DSS** scope. Use the provider's **hosted fields / iframes** or a redirect (Stripe Elements/Checkout, Adyen, Braintree). The card number is typed into a **cross-origin iframe**, so the same-origin policy stops your JavaScript (and any script injected into your page) from reading it.
- Your page still *hosts* that iframe, so a compromised script on checkout could swap it for a fake form (**Magecart / web skimming**). PCI DSS v4 added requirements to inventory and authorise payment-page scripts and to detect unauthorised changes. In practice: a strict CSP, SRI, and as few third-party scripts on checkout as possible. Which requirements apply depends on your SAQ type.
- **Strong Customer Authentication / 3-D Secure** (PSD2 in Europe) can interrupt payment with a challenge. Design for an async `requires_action` state and return URLs.
- **Wallets** (Apple Pay, Google Pay, the Payment Request API) remove most of the form.
- **"Place order" must be idempotent:** disable the button *and* send an idempotency key per checkout attempt. The network can fail *after* the charge succeeded.

**Checkout a11y:** correct `autocomplete` tokens, errors linked with `aria-describedby`, and an error summary that receives focus on submit.

| Decision | Choice | Trade-off |
|---|---|---|
| PDP rendering | SSR/SSG + CDN + dynamic price/stock islands | Cache invalidation; brief flash if price is client-fetched |
| Cart | Server-authoritative + optimistic UI + BroadcastChannel | More requests; reconcile conflicts by version |
| Prices | Server re-prices at checkout; client sends SKUs only | Must design "price changed" UX |
| Payments | Provider iframes / redirect | Less styling control; vendor dependency |
| Place order | Idempotency key + disabled button | Server must store keys |

---

## Case study 4: Collaborative editor (Google Docs, Notion, Figma)

**R:** several users edit the same document in real time; **presence** (avatars, remote cursors and selections); offline editing that merges later (stretch); undo/redo of *your own* changes; version history. NFR: **convergence** (every replica ends in the same state), local edits apply instantly, tens of concurrent editors.

**A:** editor engine (ProseMirror/Tiptap, Lexical, CodeMirror; don't hand-roll `contenteditable`) ↔ binding ↔ **sync model (OT or CRDT)** ↔ WebSocket provider ↔ server (relay, persistence, permissions). **Presence travels on a separate ephemeral channel** from document changes.

**The core problem:** Alice inserts "X" at position 0 while Bob deletes the character at position 3. If Bob's operation is applied unchanged after Alice's, it deletes the wrong character and the replicas diverge.

| | Operational Transformation (OT) | CRDTs |
|---|---|---|
| Idea | Transform each incoming operation against concurrent ones already applied (shift positions) | Data types designed so concurrent operations **commute**; every element has a unique id instead of an index |
| Server | Usually a central server orders operations | No central ordering needed: offline-first and peer-to-peer friendly; the server relays and stores |
| Cost | Transform functions are subtle and notoriously hard to get right | Metadata overhead (ids, tombstones for deletions) that needs garbage collection; libraries hide it |
| Examples | Google Docs, ShareDB | Yjs, Automerge. Figma uses a CRDT-*inspired* model with a central authoritative server |

> [!INTERVIEW] Say it like this
> "OT transforms operations against each other and usually needs a central server to order them. CRDTs make the merge itself commutative, associative and idempotent, so replicas converge in any order, which suits offline and peer-to-peer. For a new product I'd use a mature CRDT library like Yjs rather than build either."

```ts run
// A grow-only counter, the "hello world" of CRDTs: each replica increments only its own slot; merge = per-slot max.
type GCounter = Record<string, number>;
const increment = (c: GCounter, replica: string): GCounter => ({ ...c, [replica]: (c[replica] ?? 0) + 1 });
const merge = (a: GCounter, b: GCounter): GCounter => {
  const out: GCounter = { ...a };
  for (const [replica, n] of Object.entries(b)) out[replica] = Math.max(out[replica] ?? 0, n);
  return out;
};
const value = (c: GCounter) => Object.values(c).reduce((sum, n) => sum + n, 0);

const alice = increment(increment({}, 'alice'), 'alice'); // offline: +2
const bob = increment({}, 'bob');                         // offline: +1
const carol = increment({}, 'carol');                     // offline: +1

console.log('commutative:', value(merge(alice, bob)), value(merge(bob, alice)));
console.log('associative:', value(merge(merge(alice, bob), carol)), value(merge(alice, merge(bob, carol))));
console.log('idempotent :', value(merge(merge(alice, bob), bob)), '(re-delivering an update is harmless)');
```

{{quiz:crdt-merge-property}}

**Presence and cursors:**

- Presence (cursor, selection, name, colour, "typing") is **ephemeral**: not part of the document, not persisted, not in undo history. Broadcast it on an awareness channel, **throttle** it (every ~50–100 ms), and expire it on disconnect.
- Store cursor positions **relative to document elements** (CRDT ids, e.g. Yjs relative positions), not absolute offsets, so they stay correct when someone types before them.
- Render remote cursors in an absolutely positioned **overlay** (`Range.getBoundingClientRect()`) and batch updates in `requestAnimationFrame`.

**Other deep dives:** per-user undo (undo only your own operations; global undo surprises people); persistence as snapshots plus incremental updates (version history comes from the snapshots); **permissions enforced on the server for every update** (a read-only user's client must not be able to push operations); offline state in IndexedDB that syncs on reconnect. Merges are automatic, but semantic conflicts (two people retitle the doc) resolve by rule (e.g. last-writer-wins), which can surprise users.

---

## Case study 5: Design system / component library

**R:** who consumes it (how many teams, web only or also native, which frameworks)? Goals: consistency, delivery speed, **accessibility by default**, theming (brands, dark mode, density), stable APIs. NFR: tree-shakable, SSR-safe, works under a strict CSP, versioned and documented.

**A: layers**

```
Design tokens: primitive → semantic → component
   ↓ build (Style Dictionary) → CSS custom properties, TS constants, iOS/Android values
Foundations: typography, spacing, colour, motion, icons, layout primitives (Stack, Grid)
   ↓
Headless behaviour: React Aria / Radix / Ariakit or in-house hooks (focus, keyboard, ARIA)
   ↓
Styled components: Button, TextField, Select, Dialog, Tabs, Toast, DataTable…
   ↓
Patterns & templates: forms, empty states, page layouts (docs + recipes)
```

**Tokens and theming.** Primitive tokens (`color.blue.600`) feed **semantic** tokens (`color.action.primary.bg`), which feed component tokens. Components only use semantic and component tokens, so a theme just swaps the semantic layer. Store tokens in a platform-agnostic format (the W3C Design Tokens Community Group format), keep them in sync with Figma, and compile them to CSS custom properties. Custom properties enable runtime theme switching with **no React re-render** and nested themes:

```css
:root { --color-bg: #fff; --color-fg: #111; --color-action-bg: #2563eb; }
[data-theme='dark'] { --color-bg: #0b0b0c; --color-fg: #f5f5f5; --color-action-bg: #60a5fa; color-scheme: dark; }
.button-primary { background: var(--color-action-bg); color: var(--color-bg); }
@media (prefers-reduced-motion: reduce) { :root { --motion-duration: 0ms; } }
```

**Styling technology:** prefer **zero-runtime** approaches (CSS Modules, vanilla-extract, Tailwind, Panda) over runtime CSS-in-JS. Runtime style injection costs render time, complicates streaming SSR and Server Components, and needs CSP nonces for injected `<style>` tags.

**Accessibility baked in.** Each component implements its APG pattern (roles, keyboard, focus management) with visible `:focus-visible` styles, contrast-checked token pairs, target sizes of at least 24×24 CSS px (WCAG 2.2 SC 2.5.8) and reduced motion. **Make the accessible path the easy path at the type level:**

```tsx
type IconButtonProps = Omit<React.ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> & {
  icon: React.ReactNode;
  label: string; // required: an icon-only button without a name is a compile error, not a bug report
};
```

Run axe in component tests and Storybook, and do manual screen-reader passes on complex widgets.

**API design principles:**

- **Consistent naming** everywhere: `variant`, `size`, `disabled`, `open`/`defaultOpen`/`onOpenChange`, `value`/`defaultValue`/`onValueChange`.
- **Controlled and uncontrolled** modes for every stateful component.
- **Composition over configuration:** compound components (`<Tabs><Tabs.List><Tabs.Tab/></Tabs.List><Tabs.Panel/></Tabs>`) instead of 30 boolean props. An `asChild`/slot pattern to render as another element (a Button that is a router Link) is easier to type than a polymorphic `as` prop.
- **Pass-through:** spread remaining native props, forward refs (in React 19 `ref` is a regular prop on function components), merge `className`, and type variants as unions.
- **Escape hatches with guard rails:** allow `className`, but discourage overriding internals; use spacing tokens instead of magic numbers.

**Versioning and distribution:** strict **semver**; changelogs via Changesets; deprecate before removing (dev-only warnings, `@deprecated` JSDoc that shows as strikethrough in editors); **codemods** for breaking changes. Publish ESM with accurate `"sideEffects"` (e.g. `["*.css"]`) for tree-shaking, with `react`/`react-dom` as **peerDependencies** (two copies of React break hooks), and types included. Run **visual regression tests** (Chromatic or Playwright screenshots): one CSS change can break forty apps.

**Docs and adoption:** Storybook with a story per state, doubling as fixtures for interaction, a11y and visual tests, plus usage guidance and props tables generated from the TS types. Measure adoption (scan repos for imports), define a contribution model (federated contributions with an RFC process), and add lint rules (no raw hex colours, no deprecated imports). Treat it as a **product whose users are engineers**.

> [!INTERVIEW] Say it like this
> "Building the Button is the easy part. The hard parts are API stability and adoption, so I'd invest in tokens and theming through CSS variables, accessibility built into headless primitives, strict semver with codemods, and Storybook as both documentation and a test harness. Success is measured by adoption, not by component count."

> [!MISTAKE]
> Designing a component library as a pile of components with dozens of boolean props (`isPrimary`, `isLarge`, `hasIcon`, `isOutlined`…). Interviewers want to hear about variants as typed unions, composition, controlled/uncontrolled APIs, and how you ship breaking changes without breaking forty apps.

## Key takeaways

- Drive the interview with **RADIO and a time budget**, and finish each case with a **decisions-and-trade-offs** table.
- **Chat:** WebSocket with heartbeat and jittered backoff, a resume cursor after reconnecting, ordering by **server `seq`**, a **`clientId` idempotency key** plus `serverId` dedupe, an IndexedDB outbox, cursor pagination and virtualization.
- **Carousel:** controlled/uncontrolled API; eager current slide plus preloaded neighbours, lazy the rest; Pointer Events or scroll snap; APG roles; autoplay pausable with `aria-live="off"` while rotating.
- **E-commerce:** SSR/SSG + CDN for the PDP, a server-authoritative cart synced across tabs, **server re-pricing at checkout**, payment iframes to shrink PCI scope, idempotent "Place order".
- **Collaborative editing:** OT (central ordering, tricky transforms) vs CRDT (commutative merge, offline-friendly, metadata cost); presence is ephemeral, throttled and anchored to relative positions.
- **Design system:** tokens → CSS variables, headless accessible primitives, consistent composable APIs, semver + codemods + visual tests, Storybook, adoption metrics.
