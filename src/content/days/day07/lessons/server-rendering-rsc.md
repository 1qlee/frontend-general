## Why interviewers ask about server rendering

"What's the difference between SSR and React Server Components?" is one of the most commonly *fumbled* modern React questions, because the two get blurred together. Interviewers want to hear that you can:

1. Place CSR, SSR, SSG/ISR and streaming SSR on a timeline (when is HTML produced, when is the page interactive) and pick one for a product requirement.
2. Explain **hydration** precisely — and debug hydration mismatches, which every Next.js developer has hit.
3. State the **RSC mental model**: which code runs where, what ships to the browser, and what can cross the server/client boundary.

Performance metrics themselves (LCP, INP, TTFB, caching headers) are Day 10. Here we focus on React's side of the story.

## Rendering strategies on one timeline

| Strategy | When HTML is produced | First paint | Interactive | Good for | Costs |
|---|---|---|---|---|---|
| **CSR** (client-side rendering) | In the browser, after JS loads | Late (empty shell first) | When JS has run | Apps behind login, highly interactive tools | Slow first load on weak devices, SEO depends on crawler JS |
| **SSR** (server-side rendering) | On the server, **per request** | Early | After JS downloads and **hydrates** | Personalized or frequently changing pages that need fast first paint/SEO | Server cost per request; TTFB includes data fetching |
| **SSG** (static generation) | At **build** time | Earliest (from CDN) | After hydration | Docs, marketing, blogs | Stale until rebuild |
| **ISR** / revalidation | At build, then regenerated in the background after N seconds or on demand | Earliest | After hydration | Large catalogs, content sites | Framework-specific; "stale for a while" semantics |
| **Streaming SSR** | On the server, sent **in chunks** as data resolves | Shell very early | Progressively, per Suspense boundary | Pages with slow and fast data | Needs Suspense boundaries designed deliberately |

The pipeline for classic SSR:

1. Server runs the components, produces HTML (`renderToPipeableStream` in Node, `renderToReadableStream` with Web Streams).
2. Browser paints the HTML — the page *looks* ready.
3. JS bundles download and execute.
4. `hydrateRoot(container, <App />)` renders the same tree on the client and **attaches** to the existing DOM.
5. Now it's interactive.

Between steps 2 and 5 is the "uncanny valley": visible but unresponsive. Shrinking that gap is what streaming, selective hydration and Server Components are for.

### Streaming SSR with Suspense

With streaming, the server sends the **shell** (everything outside pending Suspense boundaries, with fallbacks in place) immediately, keeps the connection open, and streams each boundary's HTML when its data resolves — together with a tiny inline script that swaps it into place. One slow widget no longer delays the whole page's TTFB.

```tsx
export default function ProductPage({ id }: { id: string }) {
  return (
    <Layout>
      <ProductDetails id={id} />                  {/* fast: in the shell */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews id={id} />                       {/* slow: streamed in later */}
      </Suspense>
    </Layout>
  );
}
```

## Hydration

**Hydration** = React renders the component tree on the client, walks the server-rendered DOM in parallel, **reuses** the existing nodes and attaches event handlers instead of creating new ones. For that to work, the client's first render must produce **exactly the same output** as the server's.

When it doesn't — a **hydration mismatch** — React logs an error (React 19 prints a single message with a diff) and, for text/structure mismatches, **discards the server HTML and client-renders** up to the nearest Suspense boundary (or the whole root). That's slower than not having SSR at all for that subtree. Attribute mismatches are only warned about in development and **not patched** — the DOM keeps the server's value.

### Common causes

| Cause | Example | Why it differs |
|---|---|---|
| Time | `new Date().toLocaleString()` | Different clock, time zone and locale on server vs browser |
| Randomness | `Math.random()`, `crypto.randomUUID()` for ids | Different value each run — use `useId` for ids |
| Browser-only branches | `typeof window !== 'undefined' ? … : …` in render | Server takes one branch, the client's first render the other |
| Browser storage / media | Reading `localStorage` (theme, auth) or `matchMedia` during render | Server can't know |
| Invalid HTML nesting | `<p><div/></p>`, `<a>` inside `<a>`, `<tr>` without `<tbody>` | The **browser's parser repairs** the HTML, so the DOM differs from what React expects |
| Third parties | Browser extensions (password managers, translators), CDN HTML rewriting | DOM modified before hydration |
| Different data | Client refetches and gets newer data than the server rendered | Data must be serialized from server to client, not fetched twice |

```ts run
// Same code, two environments: the server's time zone/locale vs the user's.
const renderedAt = new Date('2025-03-09T23:30:00Z');
const onServer = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(renderedAt);
const inBrowser = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Los_Angeles' }).format(renderedAt);
console.log('server HTML :', onServer);
console.log('client render:', inBrowser);
console.log(onServer === inBrowser ? 'match' : 'MISMATCH → React discards the server HTML for this subtree');
```

### Fixes, from best to most blunt

1. **Make output deterministic**: pass the server's value down as data (format with an explicit `timeZone`/locale, or send the ISO string and format consistently), use `useId` for ids, fix invalid nesting.
2. **Two-pass rendering** for genuinely client-only values: render the server-safe version first, then update after mount.

   ```tsx
   function useIsClient() {
     // getServerSnapshot (3rd arg) is used on the server AND during hydration,
     // so hydration matches; React then re-renders with the client value.
     return useSyncExternalStore(() => () => {}, () => true, () => false);
   }

   function LocalTime({ iso }: { iso: string }) {
     const isClient = useIsClient();
     return <time dateTime={iso}>{isClient ? new Date(iso).toLocaleTimeString() : iso.slice(11, 16) + ' UTC'}</time>;
   }
   ```

   (`const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);` is the older equivalent.)
3. **`suppressHydrationWarning`** on the one element whose *text* legitimately differs (a timestamp). It only works one level deep and only silences the warning — it's an escape hatch, not a fix.
4. **Client-only rendering** for a widget that can't render on the server (e.g. `next/dynamic` with `ssr: false` in Next.js, or rendering it only after mount).
5. **Theme flash** (dark mode from `localStorage`): a small blocking inline script in `<head>` sets a class on `<html>` before paint, and `suppressHydrationWarning` goes on `<html>`.

> [!MISTAKE]
> "I fixed the hydration error with `if (typeof window !== 'undefined')`." That *causes* mismatches: the server renders one branch and the client's first render the other. Branch in an effect or with the two-pass pattern instead.

### Selective hydration (React 18+)

With `hydrateRoot` and Suspense boundaries, hydration isn't one big blocking task:

- Each Suspense boundary hydrates **independently**, and boundaries whose code or HTML hasn't arrived yet don't block the rest.
- Hydration is interruptible and **prioritized by user interaction**: if the user clicks inside a boundary that isn't hydrated yet, React hydrates that boundary first and **replays** the click once it's hydrated.

So Suspense boundaries are not only loading-state UI — they're the units of streaming and hydration.

## React Server Components: the mental model

React Server Components (RSC) add a **new kind of component**, not a new rendering strategy.

| | Server Component | Client Component |
|---|---|---|
| How marked | Default in an RSC framework (no directive) | File starts with `'use client'` |
| Runs | Only on the server (at build time or per request) | On the server for SSR **and** in the browser |
| JS shipped to browser | **None** — its code and its imports stay on the server | Its code and everything it imports |
| Can be `async` / `await` data | Yes | No (use `use()` or a library) |
| State, effects, event handlers, browser APIs | **No** | Yes |
| Direct DB / filesystem / secrets | Yes | No |
| Context | Can't create or read it | Yes |

What a Server Component renders isn't HTML: it's the **RSC payload** — a serialized React tree ("Flight" format) containing the output of Server Components plus **references** to Client Components (which module, which props). On the initial request, a framework turns that payload into HTML via regular SSR; on client-side navigation it fetches a new payload and React **merges** it into the existing tree, preserving client state.

```tsx
// app/products/[id]/page.tsx — a Server Component (Next.js App Router)
import { db } from '@/lib/db';               // never shipped to the browser
import { AddToCart } from './AddToCart';      // 'use client' module
import { Reviews } from './Reviews';          // 'use client' module

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;                // Next 15+: params is a Promise
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();
  const reviewsPromise = db.review.findMany({ where: { productId: id } }); // not awaited

  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCart productId={id} price={product.price} />
      <Suspense fallback={<p>Loading reviews…</p>}>
        <Reviews reviewsPromise={reviewsPromise} /> {/* client calls use(reviewsPromise) */}
      </Suspense>
    </article>
  );
}
```

That last prop is the canonical answer to Lesson 1's "where does a stable promise for `use()` come from?": the server starts the work, the promise crosses the boundary, and the result **streams** in.

### The `'use client'` boundary

- `'use client'` marks a **module boundary**: that file *and everything it imports* become client code. You don't need it in every client file — only at the entry points imported from server code.
- **Client Components still render on the server** for the initial HTML. "Client" means "also runs in the browser", not "client-only".
- A Client Component **cannot import** a Server Component (the import would turn it into client code). It *can* receive server-rendered JSX through `children` or other props — the "hole in the donut" pattern:

```tsx
// Server Component
<ClientTabs>               {/* 'use client': state, click handlers */}
  <ServerRenderedPanel />  {/* rendered on the server, passed in as children */}
</ClientTabs>
```

- Push `'use client'` **down to the leaves**: make the interactive button a Client Component, not the whole page.

{{quiz:client-component-ssr}}

### What can cross the boundary

Props passed from a Server Component to a Client Component must be serializable by React:

- ✅ Primitives (string, number, bigint, boolean, `undefined`, `null`), globally registered symbols (`Symbol.for`)
- ✅ Plain objects and arrays, `Date`, `Map`, `Set`, typed arrays / `ArrayBuffer`
- ✅ **Promises** (resolved on the client with `use`), **JSX** (Server or Client Component elements), **Server Functions**
- ❌ Ordinary functions (event handlers, callbacks), class instances, objects with a null prototype, local symbols

```ts run
// A rough model of React's rules for Server → Client props (not React's real serializer).
function check(value: unknown, path = 'props'): string[] {
  if (value === null || ['string', 'number', 'bigint', 'boolean', 'undefined'].includes(typeof value)) return [];
  if (typeof value === 'symbol') return Symbol.keyFor(value) !== undefined ? [] : [`${path}: local Symbol`];
  if (typeof value === 'function') return [`${path}: function (only Server Functions may cross)`];
  if (value instanceof Date || value instanceof Promise || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return [];
  if (Array.isArray(value)) return value.flatMap((v, i) => check(v, `${path}[${i}]`));
  if (value instanceof Map) return [...value].flatMap(([k, v]) => [...check(k, `${path} key`), ...check(v, `${path}.get(${String(k)})`)]);
  if (value instanceof Set) return [...value].flatMap((v, i) => check(v, `${path} item ${i}`));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype) return [`${path}: ${proto ? `instance of ${proto.constructor.name}` : 'null-prototype object'}`];
  return Object.entries(value as object).flatMap(([k, v]) => check(v, `${path}.${k}`));
}

class Money {
  constructor(public cents: number) {}
}
const props = {
  title: 'Order #42',
  placedAt: new Date('2025-01-01T00:00:00Z'),
  tags: new Set(['gift']),
  details: Promise.resolve({ items: 3 }),
  total: new Money(4200),
  onSelect: () => console.log('selected'),
};

console.log(check(props).join('\n') || 'all serializable');
// Note React's serializer handles more than JSON does:
console.log('JSON.stringify would give:', JSON.stringify({ placedAt: props.placedAt, tags: props.tags }));
```

{{quiz:server-to-client-props}}

### RSC vs SSR — the distinction to say out loud

They're **orthogonal**:

- **SSR** answers *"how do we get HTML for the first paint?"* — it renders **both** Server and Client Components to HTML, and the Client Components then hydrate.
- **RSC** answers *"which components only ever run on the server?"* — those never hydrate and never ship code, and they're also used for client-side navigations (no HTML involved).

You can have SSR without RSC (Next.js Pages Router, classic Remix, Vite SSR) and, in principle, RSC without SSR (a client-rendered app that fetches RSC payloads).

> [!INTERVIEW] Say it like this
> "SSR is a rendering strategy: run the app on the server to produce HTML for a fast first paint, then hydrate it — every component's code still ships to the browser. Server Components are a component type: they run only on the server, their code and dependencies never ship, they can await data directly, and they output a serialized tree, not HTML. In an RSC framework you typically use both: the server components' output plus the client components are SSR'd into HTML on first load, and only the `'use client'` parts hydrate. The trade-off is serialization constraints at the boundary and more framework-specific caching to understand."

## Server Functions (`'use server'`)

A **Server Function** is an async function that runs on the server but can be **called from the client**: React gives the client a reference; calling it serializes the arguments, sends a request (a POST under the hood), and returns the deserialized result.

```tsx
// app/actions.ts
'use server';

import { z } from 'zod';

const Schema = z.object({ text: z.string().min(1).max(500) });

export async function addComment(postId: string, formData: FormData) {
  const session = await auth();                       // 1. authenticate EVERY call
  if (!session) throw new Error('Unauthorized');
  const { text } = Schema.parse({ text: formData.get('text') }); // 2. validate input
  await db.comment.create({ data: { postId, text, authorId: session.userId } });
  revalidatePath(`/posts/${postId}`);                 // 3. refresh cached UI (Next.js API)
}
```

```tsx
// In a Server or Client Component: works with <form action>, even before hydration
<form action={addComment.bind(null, post.id)}>
  <input name="text" aria-label="Comment" />
  <button>Post</button>
</form>
```

Facts to get right:

- `'use server'` marks **Server Functions**, not Server Components (Server Components need no directive). It goes at the top of a file (every export becomes a Server Function) or as the first line of an async function body inside a Server Component.
- Client Components can't *define* Server Functions inline; they **import** them from a `'use server'` file or receive them as props.
- Naming: until late 2024 these were all called **Server Actions**. Now a Server Function used via `action`/`formAction` or inside a transition is a Server Action; "Server Function" is the general term.
- **Security: every Server Function is a public HTTP endpoint.** Arguments are attacker-controlled: validate them, check auth and authorization inside the function, and never trust a hidden `userId` field. The server-only package (`import 'server-only'`) makes accidental client imports of server modules a build error.

> [!WARNING]
> In December 2025 a critical remote-code-execution vulnerability in the React Server Components protocol (nicknamed "React2Shell") was disclosed and patched in React and Next.js. Server-side React is server code: keep React and your framework patched like any other backend dependency.

## Next.js App Router at interview altitude

> [!NOTE] Framework- and version-specific
> Everything in this section is **Next.js App Router** (introduced in 13.4). Caching defaults changed in **Next 15** and again with **Cache Components in Next 16** (October 2025). In an interview, describe the concepts and say which version you've shipped with.

**Routing.** Folders under `app/` are route segments; special files give each segment its behaviour:

| File | Role |
|---|---|
| `layout.tsx` | UI shared by a segment and its children. **Persists across navigations** (doesn't re-mount, keeps state). Root layout renders `<html>`/`<body>`. |
| `page.tsx` | Makes the route publicly accessible; the leaf UI. |
| `loading.tsx` | Wraps the page in a Suspense boundary with this fallback (instant loading state while streaming). |
| `error.tsx` | Wraps the segment in an error boundary. Must be a Client Component. |
| `not-found.tsx` | Rendered for `notFound()`. |
| `route.ts` | An HTTP handler (GET/POST…) instead of UI. |

Plus dynamic segments (`[slug]`), catch-alls (`[...slug]`), route groups (`(marketing)`) and parallel/intercepting routes (modals).

**Server vs Client.** Everything in `app/` is a Server Component unless marked `'use client'`. Fetch data in async Server Components close to where it's used; start independent fetches in parallel (`Promise.all`, or pass promises down) to avoid **server-side waterfalls**.

**Rendering & caching concepts** (names have shifted between versions; the ideas haven't):

| Concept | What it does |
|---|---|
| Request memoization | The same `fetch` (or a function wrapped in React's `cache()`) called by many components in one request runs once. |
| Data cache | Persisted results of data fetches across requests, invalidated by time or by tag/path. |
| Static vs dynamic rendering | Routes without request-specific inputs can be prerendered at build; reading `cookies()`, `headers()` or `searchParams` makes a route dynamic. |
| Client router cache | RSC payloads of visited/prefetched routes kept in the browser for fast back/forward and `<Link>` navigation. |
| Revalidation | After a mutation, a Server Action calls `revalidatePath`/`revalidateTag` (Next 16 adds `updateTag` and `refresh`) so the next render shows fresh data. |

Version landmarks to know: **Next 14** cached `fetch` by default; **Next 15** made `fetch` and GET route handlers uncached by default and made `params`/`searchParams`/`cookies()` async; **Next 16** introduced opt-in **Cache Components** — caching is explicit via the `'use cache'` directive with `cacheLife`/`cacheTag`, and static and dynamic parts of one page are combined (Partial Prerendering).

> [!TIP]
> If you haven't used the App Router in production, say so and reason from first principles: "Server Components fetch on the server, Suspense boundaries stream, layouts persist, and after a mutation I'd revalidate the affected data by path or tag." That beats reciting a caching table you're unsure of.

## Key takeaways

- CSR / SSR / SSG / ISR / streaming SSR differ in **when HTML is produced**; hydration decides **when it's interactive**.
- Hydration requires the client's first render to **match** the server's. Usual suspects: time, randomness, `window` checks, storage, invalid HTML nesting, extensions. Fix with determinism, `useId`, two-pass rendering, `suppressHydrationWarning` (one element), or client-only rendering.
- Suspense boundaries are the units of **streaming** and **selective hydration**; React prioritizes the boundary the user interacts with and replays the event.
- Server Components run only on the server and ship **zero JS**; `'use client'` marks a module boundary; Client Components still SSR. Props across the boundary must be serializable — promises and JSX yes, plain functions and class instances no.
- **RSC ≠ SSR**: component type vs rendering strategy; you usually use both.
- `'use server'` = Server Functions (public endpoints: validate and authorize every call), not Server Components.
- Next.js App Router: layouts persist, `loading.tsx`/`error.tsx` are Suspense/error boundaries, caching semantics are version-specific — flag the version.
