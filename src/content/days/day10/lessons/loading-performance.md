## Why interviewers ask about loading performance

Loading performance is where frontend decisions have the most measurable business impact, and it's full of specific, checkable knowledge: "never lazy-load the LCP image", "fonts need `crossorigin` when preloaded", "`prefetch` is for the *next* page". Interviewers use it to separate people who have *shipped* fast sites from people who have read a checklist.

A strong answer always connects a technique to **the metric it moves and why**. "Add `fetchpriority="high"` to the hero image — it cuts the *resource load delay* part of LCP because the browser otherwise starts it at low priority." That's the level we're aiming for.

## The critical rendering path (in one paragraph)

The browser parses HTML into the DOM and CSS into the CSSOM, combines them into a render tree, then does layout and paint (Day 8 covers the pipeline in depth). Two things block that first render:

- **CSS is render-blocking.** The browser won't paint until the stylesheets in `<head>` are downloaded and parsed (otherwise you'd see a flash of unstyled content). Stylesheets whose `media` doesn't match (e.g. `media="print"`) don't block.
- **Classic synchronous scripts are parser-blocking.** A `<script src>` without attributes stops HTML parsing until it is downloaded *and* executed — and it also waits for preceding CSS, because the script might read styles.

| Markup | Fetch | Executes | Order preserved | Blocks parsing? |
|---|---|---|---|---|
| `<script src>` | Blocks parsing | Immediately | Yes | **Yes** |
| `<script async>` | In parallel | As soon as downloaded | **No** | Only while executing |
| `<script defer>` | In parallel | After parsing, before `DOMContentLoaded` | Yes | No |
| `<script type="module">` | In parallel (+ its import graph) | Deferred by default | Yes | No |

Rules of thumb: app bundles get `defer` or `type="module"` (Vite emits modules); independent third-party scripts such as analytics get `async`; nothing should be a blocking `<script>` in `<head>` unless it truly must run before first paint.

One more piece of browser machinery explains half of all LCP problems: the **preload scanner**. While the main parser is blocked, a secondary scanner reads ahead in the raw HTML and starts fetching `<img src>`, `<link rel=stylesheet>`, `<script src>` and so on. Anything it **can't see** — images set via CSS `background-image`, images rendered by client-side JavaScript, resources injected by scripts — is discovered late.

## Fixing LCP by sub-part

Lesson 1 split LCP into four sub-parts. Here's the fix map interviewers want to hear:

| Slow sub-part | Typical causes | Fixes |
|---|---|---|
| **TTFB** | Slow server/DB, no caching, redirects, far from the user | CDN/edge caching of HTML, SSG/ISR, streaming SSR, faster backend, avoid redirect chains, 103 Early Hints |
| **Resource load delay** | LCP image not in the initial HTML (CSS background, rendered by JS), `loading="lazy"`, low priority | Put it in HTML as `<img>`, `fetchpriority="high"`, `<link rel="preload">` if it must stay late-discovered, never lazy-load it |
| **Resource load duration** | Image too large, wrong format, no CDN, competing with other downloads | AVIF/WebP, responsive `srcset`/`sizes`, compress, image CDN, fewer competing early requests |
| **Element render delay** | Render-blocking CSS/JS, client-side rendering waiting for JS, font blocking text, hidden until hydration/A-B test | Inline critical CSS, `defer` scripts, SSR/SSG the hero, `font-display`, remove anti-flicker snippets |

> [!INTERVIEW] Say it like this
> "First I find the LCP element and break its time into TTFB, load delay, load duration and render delay. If it's an image discovered late — say a CSS background or rendered by React on the client — I put it in the HTML as an `<img>` with `fetchpriority="high"`, or preload it. If the download itself is slow, I serve a properly sized AVIF from a CDN. If the image is there but paints late, I look for render-blocking CSS and JavaScript."

## The cost of JavaScript

Byte for byte, JavaScript is the most expensive resource you ship. An image has to be downloaded and decoded (largely off the main thread); JavaScript has to be:

1. **Downloaded** (compressed bytes over the network),
2. **Parsed and compiled** (on the *uncompressed* size — minified JS typically compresses 3–5×, so a 170 KB gzipped bundle is roughly 500–850 KB of code),
3. **Executed** (module evaluation, framework start-up, your top-level code),
4. and with SSR, **hydrated** — React re-runs your components to attach event handlers to the server HTML.

Steps 2–4 happen largely on the main thread, and they scale with CPU speed. A bundle that executes in 150 ms on your laptop can take a second or more on a low-end Android phone, during which taps get queued (input delay → poor INP) and Lighthouse shows high TBT.

So the first rule of JavaScript performance is **ship less of it**: fewer dependencies, smaller ones (check bundle cost before `npm install`), less code on the initial route.

### Code splitting

Code splitting breaks the bundle so each page loads only what it needs. Dynamic `import()` is the primitive; bundlers turn each dynamic import into a separate chunk.

```tsx
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';

// Route-level split: the settings code is a separate chunk.
const loadSettings = () => import('./pages/SettingsPage');
const SettingsPage = lazy(loadSettings);

export function Nav() {
  // Preload on intent: by the time the click lands, the chunk is (nearly) there.
  return (
    <Link to="/settings" onMouseEnter={loadSettings} onFocus={loadSettings}>
      Settings
    </Link>
  );
}

export function SettingsRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPage />
    </Suspense>
  );
}
```

A strategy you can explain in an interview:

1. **Split by route first** — the biggest, safest win; most frameworks do it automatically.
2. **Then split heavy, conditional UI**: rich-text editors, charts, maps, PDF viewers, admin-only features, anything in a modal or behind a tab, large third-party widgets.
3. **Don't split what's needed for first paint** — lazy-loading the hero component adds a round trip *before* LCP.
4. **Don't over-split** — every chunk has request and module overhead; dozens of chunks are fine with HTTP/2, thousands of tiny ones are not.
5. **Avoid waterfalls.** The classic one: a lazy route chunk loads → it renders → its `useEffect` starts fetching data. Two sequential round trips. Start the data request **in parallel** with the code (route loaders in React Router / TanStack Router, or prefetch both on hover/intent).

> [!MISTAKE]
> "We code-split every component with `React.lazy`." Splitting tiny or always-needed components adds requests, Suspense fallbacks and layout shifts without saving meaningful bytes. Split along *routes* and *heavy, conditionally-used* features, and measure the result.

### Tree shaking and `sideEffects`

Tree shaking is dead-code elimination for modules: because ES `import`/`export` are **static**, the bundler can see which exports are never imported and drop them. It breaks when the bundler can't prove code is unused:

- **CommonJS** (`require`, `module.exports`) is dynamic — classic `lodash` is CommonJS, so `import { debounce } from 'lodash'` pulls in the whole library. Use `lodash-es` or `lodash/debounce`.
- **Module-level side effects** — code that runs on import (polyfills, `window.x = …`, registering custom elements, CSS imports). The bundler must keep a module with side effects even if none of its exports are used.
- **Barrel files** (`index.ts` that `export * from` dozens of modules) can force the bundler to evaluate everything, and they slow down dev servers and test runners even when production tree shaking works.

Libraries tell bundlers which files are safe to drop with the `sideEffects` field in `package.json`:

```json
{
  "name": "my-ui-kit",
  "sideEffects": ["*.css", "./src/polyfills.ts"]
}
```

`"sideEffects": false` means "every file in this package is pure — if nothing is imported from a file, drop it entirely". Individual calls can be marked with a `/*#__PURE__*/` annotation so minifiers can remove them when the result is unused. (Day 13 covers how bundlers implement this.)

### Analyse before you optimise

- **Bundle visualisers**: `rollup-plugin-visualizer` for Vite/Rollup, `webpack-bundle-analyzer`, or `source-map-explorer` for any build with source maps. Look for duplicate libraries, whole libraries where you use one function, moment-style locale bundles, and polyfills you don't need for your browser targets.
- **DevTools Coverage panel**: how many bytes of each JS/CSS file were actually *executed* during load — a high unused percentage on the initial route means a splitting opportunity.
- **Before adding a dependency**: check its size (minified + compressed) and whether it's tree-shakable.

## Images

Images are usually the largest bytes on a page and very often the LCP element.

| Format | Use for | Notes |
|---|---|---|
| **AVIF** | Photos and most raster images | Best compression — often ~50% smaller than JPEG at similar quality; slower to encode; supported in all major browsers (Baseline since early 2024) |
| **WebP** | Fallback for AVIF, or default | Typically 25–35% smaller than JPEG; universal support |
| **JPEG / PNG** | Last-resort fallback | PNG only when you need lossless (screenshots, sharp UI) |
| **SVG** | Icons, logos, illustrations | Vector, tiny, styleable; optimise with SVGO |

### Responsive images done right

```html
<picture>
  <source
    type="image/avif"
    srcset="/img/hero-640.avif 640w, /img/hero-1280.avif 1280w, /img/hero-1920.avif 1920w"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
  <source
    type="image/webp"
    srcset="/img/hero-640.webp 640w, /img/hero-1280.webp 1280w, /img/hero-1920.webp 1920w"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
  <img
    src="/img/hero-1280.jpg"
    srcset="/img/hero-640.jpg 640w, /img/hero-1280.jpg 1280w, /img/hero-1920.jpg 1920w"
    sizes="(max-width: 768px) 100vw, 50vw"
    width="1280"
    height="720"
    alt="Engineers pairing at a desk"
    fetchpriority="high"
  />
</picture>
```

What each piece does:

- **`<picture>` + `type`** — format negotiation: the browser takes the first `<source>` it supports.
- **`srcset` with `w` descriptors** — the candidate files and their intrinsic widths.
- **`sizes`** — how wide the image will be **rendered**, which the browser needs *before* CSS is available. It multiplies this by the device pixel ratio and picks the smallest adequate candidate. Without `sizes`, the browser assumes `100vw` and over-downloads on desktop layouts where the image is half-width.
- **`width` and `height`** — the browser derives an `aspect-ratio` from them and reserves the space before the image loads, so nothing shifts (**CLS**). With CSS `img { max-width: 100%; height: auto; }` the image still scales responsively. Alternatively set `aspect-ratio` in CSS.
- **`fetchpriority="high"`** — only on the LCP image: images start at low priority until the browser knows they're in the viewport; this skips that.

The `sizes` arithmetic is worth seeing once:

```ts run
// Roughly how the browser chooses: needed pixels = slot width from `sizes` (CSS px) × devicePixelRatio,
// then the smallest candidate that covers it (browsers may also factor in what's already cached).
const candidates = [640, 1280, 1920];
const pick = (slotCssPx: number, dpr: number) =>
  candidates.find((w) => w >= slotCssPx * dpr) ?? candidates[candidates.length - 1];

console.log('phone 390px, 100vw, DPR 3        →', pick(390, 3));
console.log('laptop 1440px, 50vw, DPR 1       →', pick(1440 * 0.5, 1));
console.log('same laptop, sizes omitted (100vw) →', pick(1440, 1), '← over-downloads');
```

### Lazy loading — and the one image you must never lazy-load

`loading="lazy"` defers off-screen images and iframes until the user scrolls near them. Use it for **below-the-fold** images. **Never** put it on the LCP image (or anything visible in the initial viewport): the browser must wait for layout to know the image is visible before fetching it, which adds directly to resource load delay. Watch out for framework image components and CMS templates that lazy-load *everything* by default.

{{quiz:lcp-lazy-hero}}

Other image tips: serve images from an **image CDN** that resizes and negotiates formats on the fly (via the `Accept` header); use `decoding="async"` on non-critical images; for a CSS-background hero that can't become an `<img>`, add `<link rel="preload" as="image" href="…" fetchpriority="high">` (with `imagesrcset`/`imagesizes` for responsive variants).

## Fonts

Web fonts affect three metrics at once: **FCP/LCP** (text may be invisible while the font loads), **CLS** (text reflows when the font swaps in) and bandwidth.

`font-display` controls what happens while a font loads:

| Value | Block period (invisible text) | Swap period | Result |
|---|---|---|---|
| `block` | Short (~3 s) | Infinite | Invisible text (FOIT) — bad for FCP/LCP |
| `swap` | Extremely small (≈ 0) | Infinite | Fallback text immediately, swap when loaded — good for LCP, can cause CLS |
| `fallback` | ~100 ms | ~3 s | Swaps only if the font arrives within ~3 s |
| `optional` | ~100 ms | None | Uses the font only if it's (nearly) instant, e.g. cached — no layout shift at all |

The playbook:

1. **Self-host WOFF2.** Since browsers partitioned the HTTP cache per site (2020), a font from a shared CDN is no longer cached across sites — self-hosting saves a DNS + TCP + TLS setup and costs nothing.
2. **Subset** the font to the characters you need (`unicode-range`, or tools like `pyftsubset`/glyphhanger), and prefer one variable font over many static weights.
3. **Preload** the one or two fonts used above the fold:

   ```html
   <link rel="preload" href="/fonts/inter-latin-var.woff2" as="font" type="font/woff2" crossorigin />
   ```

   Fonts are always fetched in CORS mode, so the preload **must** have `crossorigin` — even for same-origin fonts — or the browser can't reuse it and downloads the font twice.

4. **Match the fallback's metrics** so the swap doesn't move anything. Font metric overrides adjust a local fallback font to occupy the same space as the web font:

   ```css
   @font-face {
     font-family: 'Inter Fallback';
     src: local('Arial');
     size-adjust: 107%; /* illustrative values — generate them with a tool */
     ascent-override: 90%;
     descent-override: 22%;
     line-gap-override: 0%;
   }

   body {
     font-family: 'Inter', 'Inter Fallback', system-ui, sans-serif;
   }
   ```

   Tools such as Capsize or Fontaine compute these values; Next.js's `next/font` generates them automatically.

{{quiz:preload-font-crossorigin}}

## Resource hints

Resource hints let you tell the browser about work it would otherwise discover too late. Knowing **which hint for which situation** is a favourite interview question.

| Hint | What it does | Use when | Gotchas |
|---|---|---|---|
| `<link rel="preconnect" href="https://cdn.example.com">` | DNS + TCP + TLS handshake now | A **critical cross-origin** request is coming soon (image CDN, font host, API) | Only for 2–4 origins you'll definitely use; unused connections are closed after ~10 s; needs `crossorigin` for CORS fetches like fonts |
| `<link rel="dns-prefetch" href="https://…">` | DNS lookup only | Less critical third-party origins; cheap fallback | Saves only the DNS part |
| `<link rel="preload" href="…" as="…">` | High-priority fetch of a resource for **this** page | Late-discovered critical resources: fonts, CSS-background LCP image, a script imported deep in a chain | `as` is required; unused preloads waste bandwidth, compete with critical requests and trigger a console warning |
| `<link rel="modulepreload" href="…">` | Fetch **and** parse/compile an ES module | Module chunks you'll import soon; flattens import waterfalls | Vite injects these automatically for an entry's static imports |
| `<link rel="prefetch" href="…">` | **Low**-priority fetch into the HTTP cache for a **future** navigation | The next likely page's chunk or data | Does nothing for the current page; browsers may skip it (e.g. when the user has data saving on) |
| `fetchpriority="high"` / `"low"` | Adjusts priority of an `<img>`, `<link>`, `<script>` or `fetch()` | LCP image high; offscreen carousel slides low | A hint, not a guarantee |

Two newer tools worth mentioning:

- **103 Early Hints** — the server sends an informational `103` response with `Link: <…>; rel=preconnect` / `rel=preload` headers *while it's still generating the HTML*, so the browser can use server think-time.
- **Speculation Rules API** (Chromium) — `<script type="speculationrules">` declares which links to **prefetch** or fully **prerender**, making the next navigation near-instant.

> [!MISTAKE]
> Preloading everything. Preload jumps the queue, so each unnecessary preload delays the resources that really matter — often the LCP image or the main CSS. Preload only what is **critical for the current page and discovered late**.

## Third-party scripts

Analytics, tag managers, A/B testing, chat widgets, ads and embeds are frequently the biggest source of main-thread time on a page — and you don't control their code.

- **Audit** what each one costs (DevTools Performance panel groups activity by third party; Lighthouse has a third-party summary) and remove what nobody uses.
- **Load late**: `async`/`defer`; inject non-critical tags after the `load` event or when the browser is idle; load chat widgets **on interaction**.
- **Facades** for heavy embeds: show a static thumbnail of a YouTube video or a map and load the real iframe on click.
- **Self-host** what you can, `preconnect` to the origins that remain critical.
- Beware **A/B testing anti-flicker snippets** that hide the whole page until the experiment script loads — they push FCP and LCP back by the script's full load time.
- Give third parties a **budget** like your own code.

## Rendering strategies and their performance profiles

Where HTML is produced changes which metrics are fast. (Day 7 covers React-specific SSR, hydration and Server Components; here's the performance view.)

| Strategy | Where/when HTML is built | TTFB | FCP / LCP | JS & INP cost | Good fit |
|---|---|---|---|---|---|
| **CSR** (SPA) | In the browser | Fast (static shell from CDN) | Slow: HTML → JS → execute → fetch data → render | Entire app's JS before anything useful | Apps behind login, dashboards |
| **SSR** | Server, per request | Slower (server render + data) | Fast paint of real content | Hydration is a long task; page looks ready before it is | Personalised or frequently changing, SEO-relevant pages |
| **SSG** | At build time | Fastest (static file at the CDN edge) | Fast | Still hydrates interactive parts | Marketing, docs, blogs |
| **ISR** | At build, regenerated in the background after a revalidate period | CDN-fast | Fast | Same as SSG | Large catalogues that change periodically |
| **Streaming SSR** | Server, flushed progressively | Fast first byte (shell first) | Shell fast; slow sections stream in behind Suspense | Selective hydration, prioritised by user input | Pages mixing fast and slow data |
| **Islands** | Build or server | Fast | Fast | Only interactive "islands" ship and hydrate JS | Content-heavy sites (e.g. Astro) |

The key trade-off to articulate: **SSR improves FCP/LCP but costs TTFB and adds hydration work** that can hurt INP during load ("uncanny valley": the button is visible but doesn't respond). **CSR has a cheap TTFB but a slow LCP** that depends on JS size and the data request chain. SSG/ISR combine fast TTFB and fast LCP but only for content that can be pre-built.

> [!INTERVIEW] Say it like this
> "SSR moves rendering to the server, so users see content sooner — better FCP and LCP and better SEO — but TTFB goes up because the server has to render, and the page still has to download JavaScript and hydrate before it's interactive, which shows up as TBT or poor INP during load. CSR has the opposite profile. For mostly static content I'd pre-render with SSG or ISR and serve from a CDN; for dynamic pages I'd stream SSR so the shell arrives immediately, and keep client JavaScript small so hydration is cheap."

## Key takeaways

- CSS is render-blocking; classic scripts are parser-blocking — use `defer`/`type="module"` for app code and `async` for independent third parties.
- The **preload scanner** only sees resources in the HTML; late discovery (CSS backgrounds, client-rendered images) is the #1 LCP problem.
- Fix LCP by **sub-part**: TTFB → server/CDN; load delay → discoverability + `fetchpriority`; load duration → AVIF, `srcset`/`sizes`; render delay → render-blocking resources.
- JavaScript costs download **and** parse/compile/execute/hydrate on the main thread — ship less, split by route and heavy features, avoid code+data waterfalls.
- Tree shaking needs ES modules and side-effect-free code (`sideEffects` in `package.json`); verify with a bundle visualiser and the Coverage panel.
- Images: AVIF/WebP, responsive `srcset` + `sizes`, `width`/`height` to prevent CLS, `fetchpriority="high"` on the LCP image, **never lazy-load the LCP image**.
- Fonts: self-hosted subsetted WOFF2, preload with `crossorigin`, `font-display`, and fallback metric overrides to avoid CLS.
- `preconnect` = warm a connection; `preload` = this page, critical, late-discovered; `prefetch` = next page; `modulepreload` = ES modules.
