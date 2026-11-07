## Why interviewers ask how the browser renders

"What happens when you type a URL?", "What's the critical rendering path?", "Reflow vs repaint?", "Why is this animation janky?" — these are all the same question in disguise: *do you have a working model of what the browser does with your code?* Senior candidates are expected to connect that model to decisions: where to put a `<script>`, why `transform` beats `top` for animation, why reading `offsetHeight` in a loop is slow, and why `useLayoutEffect` exists.

A strong answer names the stages in order, says **what blocks what**, and gives one concrete optimisation per stage. Today's lesson gives you that model. Day 10 goes deeper on *loading* performance (Core Web Vitals, caching, HTTP, resource hints); here we focus on the **rendering** side.

## The pipeline at a glance

```text
bytes → characters → tokens → nodes → DOM ─┐
                                           ├─► Style ─► Layout ─► Paint ─► Composite ─► pixels
bytes → characters → tokens → rules → CSSOM┘   (render tree)
```

| Stage | Input → output | Typical trigger |
|---|---|---|
| **Parse HTML** | Bytes → DOM tree (incrementally, as bytes stream in) | Navigation, `innerHTML` |
| **Parse CSS** | Stylesheets → CSSOM | `<link>`, `<style>`, `adoptedStyleSheets` |
| **Style** (recalc) | DOM + CSSOM → computed style per element; the render/layout tree | Class/style changes, DOM changes |
| **Layout** (reflow) | Geometry: position and size of every box | Anything that changes geometry |
| **Paint** | Records drawing commands (display lists) per layer | Visual changes (colour, shadow…) |
| **Composite** | Rasterises layers (often on the GPU, in tiles) and assembles them into the frame | Every frame; `transform`/`opacity` changes |

> [!NOTE]
> "Reflow" is Firefox's historical name for **layout**; "repaint" is **paint**. Chrome's internal pipeline (RenderingNG) splits these further — pre-paint, layerize, raster, activate, draw — but Style → Layout → Paint → Composite is the vocabulary interviewers expect.

## Parsing HTML: the DOM is built incrementally

The HTML parser doesn't wait for the whole document. It decodes bytes into characters (using the declared encoding), tokenises them into start tags/end tags/text, and builds nodes into the DOM **as the bytes stream in**. That's why a server that flushes `<head>` early gets resources fetching sooner, and why the browser can paint the top of a long page before the bottom has arrived.

The HTML parser is also **forgiving**: unclosed tags, misnested elements and stray text are all repaired by spec-defined error-recovery rules, never a "syntax error". (The flip side: a `<div>` inside a `<p>` silently closes the `<p>` — a common source of React hydration mismatch warnings.)

### The preload scanner

When the main parser is blocked (by a synchronous script — see below), a second, lightweight **preload scanner** races ahead through the raw markup looking for URLs in `<img src/srcset>`, `<link rel=stylesheet>`, `<script src>` and so on, and starts fetching them. It's one of the most important optimisations in browsers.

Its blind spot: anything **not in the initial HTML markup** — images set as CSS `background-image`, scripts injected by JavaScript, fonts referenced from CSS, and everything rendered client-side by a SPA. Those are discovered late. (Fixes like `<link rel="preload">` and `fetchpriority` are Day 10 material.)

## CSS is render-blocking

The browser will not render the page until the stylesheets in `<head>` have been downloaded and parsed into the CSSOM. If it painted earlier you'd see a **flash of unstyled content** (FOUC) followed by a jarring re-layout.

Two consequences interviewers like:

1. **CSS also blocks scripts.** A classic `<script>` that comes after a `<link rel="stylesheet">` won't *execute* until that stylesheet has loaded, because the script might read computed styles (`getComputedStyle`, `offsetWidth`). So a slow stylesheet can indirectly stall HTML parsing.
2. **Non-matching media queries don't block rendering.** `<link rel="stylesheet" href="print.css" media="print">` is still downloaded (at low priority) but doesn't hold up first paint.

That's why the classic advice is: CSS early in `<head>`, keep critical CSS small (or inline it), and split rarely-needed CSS behind `media` or load it later.

## Scripts: parser-blocking vs `async` vs `defer` vs `module`

A plain `<script src>` is **parser-blocking**: the parser stops, the script is fetched (if not already preloaded), executed, and only then does parsing resume. Scripts can call `document.write` or query the DOM built so far, so the parser has to wait.

| Attribute | Fetch | Executes | Order between scripts | Blocks parser? |
|---|---|---|---|---|
| none (classic) | Immediately, blocking | As soon as fetched | Document order | **Yes** |
| `async` | In parallel with parsing | As soon as fetched (pauses the parser briefly) | **Not guaranteed** | Only while executing |
| `defer` | In parallel with parsing | After parsing finishes, **before** `DOMContentLoaded` | Document order | No |
| `type="module"` | In parallel (+ its import graph) | Like `defer` by default | Document order | No |
| `type="module" async` | In parallel (+ graph) | As soon as the graph is ready | Not guaranteed | Only while executing |

Details that separate a good answer from a great one:

- `defer` and `async` **only apply to external scripts** (`src`). On an inline classic script they're ignored. Inline **module** scripts, however, are deferred by default (and accept `async`).
- Scripts inserted with JavaScript (`document.createElement('script')`) behave like `async` by default.
- `DOMContentLoaded` fires when the DOM is fully parsed **and all `defer`/module scripts have run**. `load` fires later, when images, stylesheets, iframes etc. have finished too. `async` scripts may run before or after `DOMContentLoaded`.
- Rule of thumb: **`defer` (or `type="module"`) for app code that needs the DOM and ordering; `async` for independent third-party scripts like analytics.** Putting scripts at the end of `<body>` was the pre-`defer` workaround.

{{quiz:defer-async-order}}

> [!MISTAKE]
> "`async` and `defer` both make the script non-blocking, so they're the same." They differ in **when** the script runs and whether **order** is preserved. Two `async` scripts that depend on each other (e.g. a library and its plugin) will break intermittently — the worst kind of bug.

## Style, the render tree, and what gets a box

After (and continuously during) parsing, the browser matches CSS rules against elements and computes every property's final value — the **style recalc** stage. The result is a tree of things that actually render (the "render tree" in older literature; Chrome calls it the layout tree):

- `display: none` elements (and their descendants) are **not** in it — they generate no boxes.
- `visibility: hidden` elements **are** in it: they take up space, they just aren't painted.
- Pseudo-elements like `::before` **are** in it even though they're not in the DOM.
- `<head>`, `<script>`, `<meta>` are not (they're `display: none` by default).

Style recalc cost scales with *how many elements are affected* × *how complex the selectors are*. Toggling a class on `<body>` can force style recalc for the whole document; toggling it on a leaf usually doesn't.

## Layout, paint, composite — and which changes trigger which

Every visual change goes through some suffix of the pipeline. The cheaper the suffix, the smoother the update:

| You change… | Layout | Paint | Composite | Examples |
|---|---|---|---|---|
| Geometry | ✅ | ✅ | ✅ | `width`, `height`, `margin`, `padding`, `top/left`, `font-size`, `display`, adding/removing nodes, changing text |
| Appearance only | — | ✅ | ✅ | `color`, `background-color`, `box-shadow`, `outline`, `visibility` |
| Compositor-only | — | — | ✅ | `transform`, `opacity` (on an element that has its own compositing layer) |

**Why `transform` and `opacity` are special:** the compositor already has the element's pixels (its layer has been rasterised). Moving, scaling, rotating or fading that layer just changes how layers are combined — no geometry recomputed, no pixels redrawn. Even better, CSS transitions and animations of these properties can run **on the compositor thread**, so they stay smooth while the main thread is busy running JavaScript. That's why a CSS spinner keeps spinning during a long task, but a `setInterval` that updates `left` freezes.

> [!INTERVIEW] Say it like this
> "Layout — or reflow — recalculates geometry, and anything depending on that geometry, so it's the most expensive. Repaint redraws pixels without moving anything, like a colour change. Composite-only changes like `transform` and `opacity` just recombine already-painted layers on the compositor thread, which is why I animate those instead of `top` or `width`."

{{quiz:composite-only-change}}

### `will-change` and layer promotion: use with care

`will-change: transform` tells the browser "this will animate soon — promote it to its own layer now" so the first frame of the animation doesn't stutter while the layer is created. Caveats worth saying out loud:

- **Layers cost memory** (GPU textures). Promoting hundreds of elements (`* { will-change: transform }`, or the old `translateZ(0)` hack everywhere) can make things slower and crash mobile tabs.
- `will-change` has **side effects**: `will-change: transform` (or `opacity`) creates a **stacking context**, and `will-change: transform` makes the element a **containing block for `position: fixed` descendants** — a classic "my fixed modal is suddenly clipped" bug (see the CSS lesson).
- It's a hint for a *known, imminent* change. Prefer adding it just before an animation and removing it after; don't sprinkle it preemptively.

## Layout thrashing (forced synchronous layout)

Browsers are lazy: when you change a style, they just **mark layout dirty** and wait to do the work once, right before the next frame. But if you then **read** a geometry value, the browser must give you a correct answer *now* — so it runs style and layout synchronously. That's a **forced synchronous layout** (Chrome DevTools flags it as "Forced reflow").

Doing that repeatedly in a loop — write, read, write, read — is **layout thrashing**:

```ts
// ❌ Thrashing: every iteration invalidates layout (write) and then forces it (read)
for (const box of boxes) {
  const width = container.offsetWidth; // READ → forces layout if dirty
  box.style.width = `${width / 2}px`; // WRITE → dirties layout again
}

// ✅ Batch: all reads first, then all writes → at most one layout
const width = container.offsetWidth;
for (const box of boxes) box.style.width = `${width / 2}px`;
```

Common reads that force layout: `offsetWidth/Height/Top/Left`, `clientWidth/Height`, `scrollTop/scrollHeight`, `getBoundingClientRect()`, `getComputedStyle()` (for layout-dependent values), `innerText`, `window.innerWidth/innerHeight` and `scrollY`, `focus()`, `scrollIntoView()`.

Here's the same idea with a tiny fake "layout engine" so you can see the counts:

```ts run
// A pretend engine: writes mark layout dirty; reads force layout if dirty.
let layoutDirty = false;
let layouts = 0;
const write = () => { layoutDirty = true; };
const read = () => {
  if (layoutDirty) { layouts++; layoutDirty = false; } // forced synchronous layout
  return 100;
};

function frame(label: string, work: () => void) {
  layoutDirty = false; // layout is up to date when the task starts
  layouts = 0;
  work();
  read(); // the browser's own layout before painting this frame
  console.log(`${label} → ${layouts} layout(s) this frame`);
}

const N = 50;
frame('interleaved read/write', () => {
  for (let i = 0; i < N; i++) { read(); write(); }
});
frame('all reads, then all writes', () => {
  for (let i = 0; i < N; i++) read();
  for (let i = 0; i < N; i++) write();
});
```

Fixes, in the order I'd mention them:

1. **Batch reads before writes** (as above). Libraries like *fastdom* formalise this with `measure()`/`mutate()` queues.
2. **Schedule writes in `requestAnimationFrame`** so they land right before the frame, after all reads in the current task.
3. **Avoid needing the read**: animate with `transform` instead of reading positions; let CSS (flex/grid, container queries) do the layout; use **`ResizeObserver`** to be *told* sizes after layout instead of polling.
4. **Shrink the blast radius**: `contain: layout paint` or `content-visibility: auto` limit how much of the page a change can invalidate (the latter also skips rendering off-screen sections entirely).

## `requestAnimationFrame`

`requestAnimationFrame(cb)` runs `cb` **once, right before the browser's next rendering update** — after the current task and its microtasks, before style/layout/paint for that frame (Day 2 covered where this sits in the event loop). Facts to know:

- It fires at the display's refresh rate (60 Hz, 120 Hz…) — never hard-code 16.7 ms; use the timestamp argument to compute progress.
- It's **paused in background tabs** and hidden iframes (saves battery; `setTimeout` is merely throttled).
- It's the right place for **visual writes** in JS-driven animation. It is *not* magic: writing and then reading geometry inside the same callback still forces layout.
- "Double rAF" (`requestAnimationFrame(() => requestAnimationFrame(cb))`) is a common trick to run something *after* the next frame has been painted — e.g. to let a starting style apply before a transition.

Here's a fastdom-style scheduler (simulated with a timer instead of a real frame, since snippets run in a worker): no matter how calls are interleaved, all reads run before all writes in each "frame".

```ts run
type Job = () => void;
const reads: Job[] = [];
const writes: Job[] = [];
let scheduled = false;

function schedule() {
  if (scheduled) return;
  scheduled = true;
  // In a browser this would be requestAnimationFrame(flush)
  setTimeout(function flush() {
    scheduled = false;
    reads.splice(0).forEach((job) => job());
    writes.splice(0).forEach((job) => job());
  }, 16);
}
const measure = (job: Job) => { reads.push(job); schedule(); };
const mutate = (job: Job) => { writes.push(job); schedule(); };

mutate(() => console.log('write A'));
measure(() => console.log('read A'));
mutate(() => console.log('write B'));
measure(() => console.log('read B'));
console.log('queued — nothing has run yet');
```

## Where React fits

- React's **commit phase** applies all DOM mutations for an update in one go, which naturally avoids most read/write interleaving.
- **`useLayoutEffect`** runs synchronously *after* React mutates the DOM but *before* the browser paints. Measuring there (e.g. `getBoundingClientRect()` to position a tooltip) forces a synchronous layout — that's the cost — but lets you correct the position before the user ever sees the wrong one. `useEffect` usually runs after paint, so measuring there can cause a visible flicker.
- For lists of items that each measure themselves, prefer one `ResizeObserver` over N `useLayoutEffect` reads.

## Seeing it in DevTools

- **Performance panel**: purple = rendering (Recalculate Style, Layout), green = painting. Layout events with a red corner and "Forced reflow is a likely performance bottleneck" point to the exact line of JS.
- **Rendering drawer**: *Paint flashing* (green flashes on repainted areas) and *Layer borders*. The **Layers** panel shows what's been promoted and why.

## "What happens when you type a URL?" — the frontend answer

Interviewers don't want a networking lecture from a frontend candidate; they want a confident skeleton, then depth on rendering. Structure it like this:

1. **Navigation starts.** The browser decides whether the input is a URL or a search, may upgrade to HTTPS (HSTS), and checks for a service worker or a cached response (back/forward may restore the page instantly from the **bfcache**).
2. **Connection.** DNS lookup, then TCP + TLS (or QUIC for HTTP/3) — Day 10 covers this and caching in depth.
3. **Request/response.** The request goes out with cookies for that origin; the server responds (maybe a redirect) with headers like `Content-Type`, `Cache-Control` and security headers. The response is handed to a renderer process for that site.
4. **Parsing.** HTML streams into the parser → DOM, the preload scanner fetches discovered resources, CSS → CSSOM (render-blocking), scripts run according to `async`/`defer`/module rules.
5. **Rendering.** Style → layout → paint → composite gives the first paint/FCP; `DOMContentLoaded` fires after parsing and deferred scripts; `load` after subresources; the largest element paints (LCP).
6. **Interactivity.** For a React SPA or SSR app, the JS bundle downloads, React renders or **hydrates**, and the page becomes interactive. After that, every update re-runs some part of style → layout → paint → composite.

> [!INTERVIEW] Say it like this
> "After DNS, connection and the HTTP response, the browser parses HTML into the DOM incrementally while a preload scanner fetches resources ahead. CSS is render-blocking and becomes the CSSOM; classic scripts block the parser unless they're `defer`, `async` or modules. Style, layout, paint and composite produce the first frame; then for a React app the bundle runs and hydrates so it becomes interactive."

## Key takeaways

- Pipeline: **parse → style → layout → paint → composite**. Know what each does and what triggers it.
- **CSS blocks rendering** (and the execution of later classic scripts); **classic scripts block parsing**. `defer` = after parse, in order; `async` = ASAP, no order; modules defer by default.
- `display: none` → no box; `visibility: hidden` → box, not painted.
- **Layout > paint > composite** in cost. Animate `transform`/`opacity`; use `will-change` sparingly (memory, stacking context, containing block).
- **Layout thrashing** = interleaved geometry writes and reads. Batch reads, then writes; schedule writes in `requestAnimationFrame`; use `ResizeObserver`.
- `useLayoutEffect` = measure after DOM mutation, before paint (costs a sync layout, prevents flicker).
