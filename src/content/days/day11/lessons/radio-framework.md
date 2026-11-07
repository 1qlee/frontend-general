## Why this round exists — and why strong engineers fail it

The frontend system design round is usually 45–60 minutes with a deliberately vague prompt: *"Design a news feed."* *"Design an autocomplete component."* *"Design the photo upload flow for Instagram."* There is no single correct answer and no test suite. The interviewer is watching **how you turn ambiguity into a structured, defensible design** — the job a senior frontend engineer does every time product hands over a one-line idea.

It is **not** the backend system design round. Nobody wants load balancers, database sharding or consistent hashing from you. The interviewer wants the *client* architecture: components and their responsibilities, where state lives, how data flows, the API contract with the server, rendering strategy, and the performance, accessibility and reliability work that makes it production-grade. Treat the server as a box you get to *request things from* — you design its API from the client's point of view, not its internals.

Prompts come in two flavours, and you should identify which one you got in the first minute:

| Flavour | Example prompts | Where the depth goes |
|---|---|---|
| **Product / application** | News feed, chat app, photo sharing, e-commerce checkout, Google Docs | Pages, data layer, API, real-time, pagination, caching, rendering strategy |
| **Component** | Autocomplete, image carousel, date picker, data table, modal system | Component API (props, events, composition), internal state, a11y, perf, extensibility |

Experienced developers underperform here for predictable reasons: they start coding or naming libraries in minute two, they never write requirements down, they monologue for twenty minutes without checking in, they stay at "and then we fetch the data" depth everywhere, and they run out of time before the optimizations — which is exactly where seniority shows.

> [!INTERVIEW] Open like this
> "Before I design anything, I'd like to spend about five minutes on requirements so we agree on scope. Then I'll sketch the architecture, define the data model and APIs, and spend the rest of the time on the parts you find most interesting — performance, accessibility, offline, whatever matters most for this product."

## What interviewers actually evaluate

Most big-tech and scale-up rubrics boil down to five or six signals. Learn them — you'll steer toward them deliberately.

| Signal | What strong looks like | Red flag |
|---|---|---|
| **Problem exploration** | Asks targeted questions, states assumptions, separates core from nice-to-have, writes requirements down | Starts designing immediately; asks 25 questions without prioritising |
| **Architecture / structure** | Clear components with single responsibilities, explicit data flow, client/server boundary named | A blob called "App" that "handles everything" |
| **Technical depth** | Goes deep on 2–3 areas with concrete mechanisms (IntersectionObserver, cursor encoding, AbortController, cache keys) | Buzzwords without mechanisms ("we'll cache it", "we'll optimize it") |
| **Trade-offs** | Names alternatives, picks one *because of a stated requirement*, says when they'd switch | "Best practice is…" or a single option presented as the only one |
| **User experience & product sense** | Loading/empty/error states, perceived performance, a11y, i18n, mobile | Only the happy path on a fast desktop |
| **Communication** | Drives the conversation, signposts phases, checks in, takes hints gracefully | Monologue; or waits passively to be asked |

Levelling differs mostly in **proactiveness**. A mid-level candidate answers well when asked about accessibility; a senior candidate puts it in the requirements without being asked, and raises failure modes, observability and rollout on their own.

> [!NOTE]
> You don't need to cover everything. You need to cover the *right* things for this product, at depth, and show that you know what you're leaving out. "I'm consciously not designing X because Y" is a scoring sentence.

## The RADIO framework

A framework is a checklist that stops you from forgetting a whole category under pressure, and a signposting device that makes your structure audible. This course uses **RADIO** (popularised by GreatFrontEnd), which maps cleanly onto how frontend rubrics are written:

| Step | Question it answers | Typical share of a 45-min round |
|---|---|---|
| **R — Requirements** | What are we building, for whom, under what constraints? | ~15% |
| **A — Architecture** | What are the major pieces and how does data flow between them? | ~15–20% |
| **D — Data model** | What entities exist, and which state lives where on the client? | ~10–15% |
| **I — Interface** | What are the APIs — between client and server, and between components? | ~15% |
| **O — Optimizations** | Where do we go deep: performance, UX, a11y, security, offline, i18n? | ~30–35% |

It's a scaffold, not a script. If the interviewer jumps straight to "how would you paginate this?", answer it — then return to the structure. Many interviewers also accept merging D and I ("here are the entities and the endpoints that return them").

### R — Requirements

Split them explicitly, out loud:

**Functional requirements** are the user-visible flows. Aim for 3–5 core ones and name what's out of scope.

> "Core: view an infinite feed, create a text+image post, like and comment. Out of scope for today: stories, DMs, ads targeting."

**Non-functional requirements** are the qualities. This is where frontend candidates differentiate themselves — backend-leaning candidates forget most of these:

| Category | Questions to ask / assumptions to state |
|---|---|
| **Performance** | Target devices (low-end Android on 4G?), Core Web Vitals targets (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 — Day 10), bundle budget |
| **Scale** | How many items (10, 10k, unbounded)? Update frequency? How many simultaneous users of a shared object? |
| **Devices & network** | Mobile web, desktop, both? Touch? Flaky network? Offline required or nice-to-have? |
| **Accessibility** | WCAG 2.2 AA? Keyboard and screen-reader support (always say yes) |
| **Internationalization** | Multiple locales? RTL? Pluralisation, dates, currencies |
| **SEO / sharing** | Public pages that must be indexed or produce link previews? (Drives SSR/SSG) |
| **Security & privacy** | User-generated content (XSS), auth model, PII, uploads |
| **Real-time** | Must updates appear without refresh? How fresh — seconds or minutes? |
| **Observability** | Error reporting, performance monitoring, analytics events |

Then **write the list down** (in the shared doc or whiteboard) and get a nod: *"Does this match what you had in mind?"* Requirements are a contract — later you'll justify every trade-off by pointing back at them.

> [!MISTAKE]
> Spending 15 minutes on requirements. Five to eight is plenty. If the interviewer says "you decide", **make an assumption, say it out loud, and move on** — indecision reads worse than a reasonable assumption.

### A — Architecture

Name the major pieces and the arrows between them. For a product question, the classic frontend decomposition is:

- **Server / API** — a black box (or a BFF you own) that you'll define an interface for.
- **Client data layer ("controller"/"store")** — fetching, caching, normalisation, optimistic updates, real-time subscription. Usually a server-state cache (TanStack Query, Apollo, RTK Query) plus a little client state.
- **View** — the component tree, top-down, each node with one sentence of responsibility.

Also state the **client/server boundary**: what renders on the server (SSR/SSG/RSC) versus the client, and what is computed where — ranking on the server, filtering on the client, and so on. You'll learn the decision rules in the next lesson.

#### Drawing diagrams in words

Virtual interviews often use a shared doc or Excalidraw; sometimes there's nothing but your voice. Practise all three. A text diagram is fast and unambiguous:

```text
┌──────────────────────── Browser ────────────────────────┐
│                                                         │
│  FeedPage (route; first page server-rendered)           │
│   ├─ Composer ─────────────(createPost)───────┐         │
│   ├─ NewPostsBanner ◄──("N new posts")───┐    │         │
│   └─ FeedList (virtualized)              │    │         │
│        └─ FeedItem × N                   │    ▼         │
│             ├─ PostHeader          ┌─────┴───────────┐  │
│             ├─ MediaGrid           │ Data layer      │  │
│             └─ ActionBar ─(like)──►│ query cache +   │  │
│                                    │ entity store    │  │
│                                    └────────┬────────┘  │
└─────────────────────────────────────────────┼───────────┘
                          HTTPS (REST) + SSE  │
                                    ┌─────────┴─────────┐
                                    │  BFF / Feed API   │
                                    └───────────────────┘
```

When speaking without a board, narrate **outside-in and number the flows**:

> "Three layers: the server's API at the bottom, a client data layer above it, and the view tree on top. Flow one: the page mounts, the data layer requests the first feed page and normalises posts and users into an entity store. Flow two: FeedList subscribes to the ordered list of ids and renders FeedItems, each of which selects its post by id. Flow three: a like in the ActionBar goes through the data layer as an optimistic mutation. Flow four: an SSE channel pushes 'new posts available', which the banner reads."

Numbered flows let the interviewer interrupt precisely ("let's dig into flow three").

### D — Data model

Two halves:

1. **Entities** from the server, written as TypeScript-ish shapes with the fields that matter for rendering and caching. Interviewers love seeing ids, timestamps, counts and viewer-specific flags:

```ts
interface Post {
  id: string;
  author: UserId;          // reference, not an embedded object (see normalization)
  createdAt: string;       // ISO 8601 — format on the client per locale
  text: string;
  media: MediaRef[];
  likeCount: number;
  viewerHasLiked: boolean; // viewer-specific: never cache this in a shared CDN response
}
```

2. **Client state, classified by owner** — saying *where* each piece lives is the senior signal:

| Kind of state | Example | Where it lives |
|---|---|---|
| Server state (cached copy) | posts, users, comments | Server-state cache / normalized entity store |
| URL state | search query, filters, selected tab, page | Router search params — shareable, survives reload |
| Local UI state | is menu open, hover, active option | `useState` in the owning component |
| Shared client state | theme, current user, composer draft | Context or a small store (Zustand/Redux) |
| Form state | caption, validation errors | Form library or `useActionState` (Day 7) |
| Derived state | "N unread", filtered list | **Computed, never stored** |

### I — Interface

Define the contracts:

- **Client ↔ server:** endpoints (or GraphQL operations), parameters, response shapes, pagination scheme, error format, real-time channel. Be concrete: `GET /feed?cursor=abc&limit=20 → { items: Post[], nextCursor: string | null }`.
- **Component ↔ component** (especially for component questions): props, callbacks, controlled vs uncontrolled, slots/render props, events. E.g. `<Autocomplete fetchSuggestions={(q, { signal }) => …} onSelect={…} renderItem={…} />`.

### O — Optimizations and deep dives

This is where you earn the level. Offer a menu and let the interviewer choose, then go deep with mechanisms and numbers:

> "There are several directions we could go deep: rendering performance of a long feed, network efficiency and caching, the optimistic like flow, accessibility of the feed, or offline support. Given the requirements I'd prioritise the first two — is there one you'd like me to focus on?"

Typical categories: **performance** (rendering, network, bundle), **UX** (loading/empty/error states, optimistic updates, perceived performance), **accessibility**, **i18n**, **security**, **offline/reliability**, **observability**. The next two lessons give you the building blocks and two fully worked examples.

{{quiz:sd-first-move}}

## A minute-by-minute plan for a 45-minute round

Assume ~5 minutes are eaten by introductions and your questions at the end, leaving ~40 of design. Practise against a timer until these transitions feel natural.

| Time | Phase | What you do | On the board at the end |
|---|---|---|---|
| 0–2 | **Restate & classify** | Restate the prompt in one sentence; product or component? | Problem statement |
| 2–8 | **R** | Functional (3–5 core) + non-functional; state assumptions; get a nod | Requirements + out-of-scope list |
| 8–15 | **A** | Component tree, data layer, server; client/server boundary; numbered flows | Diagram |
| 15–20 | **D** | Entities with key fields; client state table (what lives where) | Types / store shape |
| 20–26 | **I** | Endpoints, pagination, real-time channel; component props if relevant | API list |
| 26–38 | **O** | 2–3 deep dives chosen with the interviewer; trade-offs with numbers | Bullets per deep dive |
| 38–40 | **Wrap-up** | Recap in 30 seconds, name risks and what you'd do next (metrics, rollout) | — |

For a **60-minute** round, keep R–I roughly the same and give the extra time to O. For a **component** question, compress A (the "architecture" is the component's internal structure) and expand I (the props API).

> [!TIP]
> Signpost every transition: *"That's requirements. Moving on to architecture."* It sounds mechanical to you; to the interviewer it sounds organised, and it makes their rubric easy to fill in.

## The clarifying-questions checklist

You won't ask all of these. Skim the list in your head, ask the 5–8 that matter for this prompt, and **assume** the rest out loud.

- **Users & devices:** Who uses it? Mobile web, desktop, native wrappers? Low-end devices? Touch?
- **Core flows:** What are the 3 things a user must be able to do? What's explicitly out of scope?
- **Data & scale:** How many items per view? Unbounded lists? Rich media? How often does data change? Can multiple users edit the same thing?
- **Freshness:** Must updates appear live? Within seconds, minutes, or on refresh?
- **Rendering & SEO:** Public (indexable, link previews) or behind login? First-load performance targets?
- **Network:** Offline required? Flaky mobile networks? Large uploads?
- **Quality bars:** Accessibility level? Locales and RTL? Browser support matrix?
- **Context:** Existing design system or component library? Existing API we must use, or can we shape it (BFF)? Is this a reusable component for many teams?

## Stating trade-offs: phrases that score

A trade-off statement has four parts: **options → choice → reason tied to a requirement → condition for revisiting.**

| Weak | Strong |
|---|---|
| "I'd use WebSockets." | "We need server-to-client updates only, at most every few seconds, so SSE is enough: plain HTTP, automatic reconnect with `Last-Event-ID`. If we add typing indicators or presence, I'd move to WebSockets." |
| "Cursor pagination is best practice." | "Offset pagination would duplicate or skip posts when new ones are inserted at the top, which happens constantly in a feed. Cursor pagination is stable under inserts; we lose 'jump to page N', which a feed doesn't need." |
| "We'll cache it." | "I'd cache suggestions per normalised query in an LRU of ~50 entries for the session, and let the CDN cache popular prefixes for 60 seconds. Personalised results can't be CDN-cached, so those go `private`." |
| "It depends." | "It depends on X. If X, I'd do A because…; if not, B. For this product I'm assuming X." |

Useful sentence starters:

- "There are two reasonable options here: … and …"
- "Given the requirement that …, I'd choose … The cost is …, which is acceptable because …"
- "This is a reversible decision, so I'd start simple with … and measure."
- "If the product later needs …, the migration path is …"
- "I'm deliberately not doing … today because …"

> [!INTERVIEW] The trade-off template
> "The options are A and B. A gives us [benefit] at the cost of [cost]; B is the reverse. Since our requirement is [requirement], I'd go with A — and I'd revisit if [condition changes]."

{{quiz:sd-time-allocation}}

## Communication: driving without monologuing

- **Think out loud, but in headlines.** Lead with the decision, then the reasoning. "I'll normalise the data — here's why."
- **Check in at phase boundaries**, not every sentence. "Before I go into the data model, anything you'd like me to change in this architecture?"
- **Treat hints as gifts.** "Have you considered what happens when the user scrolls back up?" is the interviewer telling you where the points are. Say "Good point —" and go there.
- **Use numbers.** "20 items per page, ~2 KB each, so 40 KB per page before images." Rough is fine; absent is not.
- **Manage your own clock.** At ~25 minutes, if you haven't reached O, say so and compress: "I'll keep the API brief so we have time for the deep dives."

> [!MISTAKE]
> Opening with technology: "I'd build it with Next.js, Redux and Tailwind." Frameworks are an implementation detail chosen *because of* requirements. Start with the problem, and when you do name a library, name the capability you need first ("a server-state cache with request dedupe and stale-while-revalidate — TanStack Query gives us that").

> [!MISTAKE]
> Designing the backend. If you find yourself discussing database indexes or Kafka partitions, pull back: "On the server side I'll assume a feed service that returns ranked pages; I'll focus on the client."

## Key takeaways

- Frontend system design is about **client architecture**: components, state ownership, data flow, API contract, rendering, and quality attributes — not backend infrastructure.
- Identify the flavour (**product vs component**) in the first minute; it changes where the time goes.
- **RADIO**: Requirements → Architecture → Data model → Interface → Optimizations. Signpost each transition out loud.
- Requirements are **functional + non-functional**; frontend candidates win on the non-functional ones (performance, a11y, i18n, devices, offline, SEO, security).
- Budget time: ~6 min R, ~7 A, ~5 D, ~6 I, ~12+ O, 2 wrap-up. Spend most of your depth in O.
- Every trade-off: **options → choice → reason tied to a requirement → when you'd revisit**.
