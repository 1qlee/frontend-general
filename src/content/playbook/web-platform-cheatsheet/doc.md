## Numbers to know cold

| Fact | Number |
|---|---|
| Core Web Vitals "good" (at the **75th percentile** of page loads) | LCP ≤ **2.5 s** · INP ≤ **200 ms** · CLS ≤ **0.1** |
| Core Web Vitals "poor" | LCP > 4 s · INP > 500 ms · CLS > 0.25 |
| Other "good" thresholds | TTFB ≤ 0.8 s · FCP ≤ 1.8 s |
| Long task | > **50 ms** on the main thread |
| Frame budget at 60 Hz | **16.7 ms** |
| WCAG AA text contrast | **4.5:1** normal text · **3:1** large text (≥ 24 px, or ≥ 18.66 px bold) |
| WCAG AA non-text contrast (UI components, focus indicators, graphics) | **3:1** |
| WCAG 2.2 AA minimum target size | **24 × 24** CSS px (or enough spacing) |
| WCAG reflow | No horizontal scrolling at **320** CSS px wide |
| Cookie size | ~**4 KB** each |
| `localStorage` | ~**5 MB** per origin (browser-dependent), synchronous, strings only |
| HTTP/1.1 parallel connections | ~**6** per origin |
| One year in seconds (`max-age`) | **31536000** |
| PKCE `code_verifier` length | **43–128** characters |

## Critical rendering path

1. **HTML → DOM**, parsed incrementally. A preload scanner looks ahead for resources.
2. **CSS → CSSOM.** CSS is **render-blocking**, and blocks execution of later classic scripts.
3. **Classic `<script>`** (no `async`/`defer`) is **parser-blocking**: download + execute before parsing continues.
4. **Render tree** = visible DOM nodes + computed styles (`display: none` is excluded; `visibility: hidden` is included).
5. **Layout** (geometry) → **Paint** (pixels, per layer) → **Composite** (layers assembled, often on the GPU).

| Script type | Downloads | Executes | Order kept? | Use for |
|---|---|---|---|---|
| `<script>` | Blocks the parser | Immediately | Yes | Rarely: tiny critical inline code |
| `async` | In parallel | As soon as downloaded | **No** | Independent scripts (analytics) |
| `defer` | In parallel | After parsing, before `DOMContentLoaded` | Yes | Classic app scripts |
| `type="module"` | In parallel | Deferred by default | Yes (unless `async`) | Modern bundles |

To speed it up: inline critical CSS, `preload` the LCP image and key fonts, defer JavaScript, cut render-blocking requests, server-render above-the-fold content.

## Reflow, repaint and composite

| Stage | Triggered by changing | Cost |
|---|---|---|
| **Layout** (reflow) | Geometry: `width`, `height`, `top`, `margin`, `padding`, `font-size`, text content, adding/removing nodes | Highest; can cascade through the document |
| **Paint** (repaint) | Appearance only: `color`, `background`, `box-shadow`, `visibility`, `outline` | Medium |
| **Composite** only | `transform`, `opacity` (often `filter`) on a layer | Lowest; can run off the main thread |

- **Layout thrashing:** alternating writes and reads (`el.style.height = …; el.offsetHeight; …`) forces synchronous layout each time. Batch all reads, then all writes (or write in `requestAnimationFrame`).
- **Reads that force layout:** `offsetWidth/Height/Top`, `clientWidth`, `scrollTop`, `getBoundingClientRect()`, `getComputedStyle()`, `scrollIntoView()`, `focus()`.
- Animate `transform` and `opacity`. `will-change: transform` promotes a layer; use it sparingly (memory).
- `content-visibility: auto` skips rendering work for off-screen sections.

## Event phases

1. **Capture**: `window` → `document` → … → the target's parent (listeners registered with `{ capture: true }`).
2. **Target**: listeners on the target itself.
3. **Bubble**: target's parent → … → `window` (only for events that bubble).

| API | What it does |
|---|---|
| `event.target` vs `event.currentTarget` | Where the event originated vs the element whose listener is running |
| `stopPropagation()` | Stops the event reaching **other elements** |
| `stopImmediatePropagation()` | Also stops other listeners on the **same** element |
| `preventDefault()` | Cancels the default action (navigation, form submit, scroll); does **not** stop propagation |
| `{ once: true }` | Listener removes itself after one call |
| `{ passive: true }` | Promises not to call `preventDefault`, so scrolling isn't blocked (the default for `touchstart`/`touchmove`/`wheel` listeners on window, document and body in Chromium and Firefox) |
| `{ signal }` | Remove the listener by aborting an `AbortController` |

**Don't bubble:** `focus`/`blur` (use `focusin`/`focusout`), `mouseenter`/`mouseleave` (use `mouseover`/`mouseout`), `load`, and `scroll` on elements. React (17+) attaches its listeners at the root container, and its `onFocus`/`onBlur` use `focusin`/`focusout` under the hood.

```ts
// Event delegation: one listener for many children
list.addEventListener('click', (e) => {
  const item = (e.target as Element).closest('li[data-id]');
  if (!item || !list.contains(item)) return;
  select(item.getAttribute('data-id')!);
});
```

## Storage comparison

| | Cookies | `localStorage` | `sessionStorage` | IndexedDB | Cache API |
|---|---|---|---|---|---|
| Capacity | ~4 KB each | ~5 MB/origin | ~5 MB/origin | Large (quota-based) | Large (quota-based) |
| Lifetime | `Expires`/`Max-Age`, or session | Until cleared | Until the tab closes (per tab) | Until cleared or evicted | Until cleared or evicted |
| Sent with requests | **Yes**, automatically | No | No | No | No |
| API | String (`document.cookie`) | Sync, strings | Sync, strings | **Async**, structured data, Blobs | Async, `Request`/`Response` pairs |
| Available in workers | No (`fetch` still sends them) | No | No | **Yes** | **Yes** |
| Readable by JS | Unless `HttpOnly` | Yes | Yes | Yes | Yes |
| Use for | Sessions (`HttpOnly`), server-read preferences | Small preferences | Per-tab wizard state | Offline data, large datasets | Offline assets and responses (service worker) |

**Cookie attributes:** `HttpOnly` (no JS access), `Secure` (HTTPS only), `SameSite=Strict | Lax | None` (`None` requires `Secure`; Chromium defaults to `Lax`), `Domain`, `Path`, `Max-Age`; the `__Host-` prefix requires `Secure`, `Path=/` and no `Domain`. Safari's tracking prevention can delete script-writable storage after 7 days without user interaction.

## CSS

### Specificity and the cascade

Specificity is a tuple **(IDs, classes/attributes/pseudo-classes, types/pseudo-elements)**, compared left to right. `*` and combinators add nothing.

| Selector | Specificity |
|---|---|
| `p` | (0, 0, 1) |
| `.btn`, `[type="text"]`, `:hover` | (0, 1, 0) |
| `a:hover` | (0, 1, 1) |
| `#nav .item a` | (1, 1, 1) |
| `ul li::before` | (0, 0, 3) |
| `:is(#x, .y) p` | (1, 0, 1): `:is()`, `:not()`, `:has()` take their **most specific** argument |
| `:where(#x) p` | (0, 0, 1): `:where()` is always **zero** |

**Cascade order** (highest decision first): origin and `!important` → shadow-DOM context → inline `style` attribute → **cascade layers** (`@layer`: later layers win; unlayered styles beat layered ones; reversed for `!important`) → **specificity** → order of appearance.

### Stacking contexts

`z-index` only competes **within the same stacking context**. A child with `z-index: 9999` can't escape a parent context that sits below a sibling.

**Created by:** the root element; `position: relative/absolute` with a `z-index` other than `auto`; `position: fixed` or `sticky`; flex/grid items with `z-index` other than `auto`; `opacity < 1`; `transform`, `filter`, `backdrop-filter`, `perspective`, `clip-path` or `mask` other than `none`; `mix-blend-mode` other than `normal`; `isolation: isolate`; `will-change` naming any of these; `contain: paint` or `layout`.

**Fixes for "my modal is under the header":** render it in a portal at the end of `body`, use the **top layer** (`<dialog>` with `showModal()`, or the Popover API), or add `isolation: isolate` to component roots so their internal `z-index` values stay contained.

### Flexbox vs grid

| | Flexbox | Grid |
|---|---|---|
| Dimensions | One (a row **or** a column) | Two (rows **and** columns) |
| Sizing | Content-out: items size the layout | Layout-in: tracks size the items |
| Best for | Toolbars, nav bars, centring, distributing items along a line | Page layouts, card grids, aligning in both axes, overlapping areas |
| Signature declarations | `flex: 1` (= `1 1 0%`), `justify-content`, `align-items`, `gap`, `flex-wrap` | `grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr))`, `grid-template-areas`, `gap`, `place-items` |
| Classic gotcha | Items have `min-width: auto`, so long text won't shrink: add `min-width: 0` | `1fr` is `minmax(auto, 1fr)`: use `minmax(0, 1fr)` to let tracks shrink |

**Quick facts:** `box-sizing: border-box` includes padding and border in `width`. Vertical margins collapse in normal block flow (not in flex or grid). `display: flow-root` creates a new block formatting context. `rem` is relative to the root font size, `em` to the element's font size. Use `dvh`/`svh` for mobile viewports. Container queries (`@container`), `:has()` and native nesting are widely supported in current browsers. `position: sticky` breaks if an ancestor between it and the scroller has `overflow: hidden`.

## Accessibility (WCAG 2.2)

| Criterion | Requirement | Level |
|---|---|---|
| 1.1.1 Non-text Content | Text alternatives (`alt`, accessible names for icons) | A |
| 1.4.3 Contrast (Minimum) | 4.5:1 text; 3:1 large text | AA |
| 1.4.11 Non-text Contrast | 3:1 for UI component boundaries, states, focus indicators, meaningful graphics | AA |
| 1.4.10 Reflow | Usable at 320 CSS px wide without 2-D scrolling | AA |
| 1.4.12 Text Spacing | Survives increased line, paragraph, letter and word spacing | AA |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | Everything operable by keyboard; focus can always leave | A |
| 2.2.2 Pause, Stop, Hide | Auto-moving content over 5 s can be paused | A |
| 2.4.3 Focus Order / 2.4.7 Focus Visible | Logical order; visible focus | A / AA |
| 2.4.11 Focus Not Obscured (Minimum) | Focused element not fully hidden by sticky headers or overlays (**new in 2.2**) | AA |
| 2.5.7 Dragging Movements | Single-pointer alternative to dragging (**new in 2.2**) | AA |
| 2.5.8 Target Size (Minimum) | 24 × 24 CSS px or sufficient spacing (**new in 2.2**) | AA |
| 3.3.7 Redundant Entry / 3.3.8 Accessible Authentication (Minimum) | Don't make users re-enter data; no cognitive tests (e.g. memorising, transcribing) to log in; allow paste and password managers (**new in 2.2**) | A / AA |
| 4.1.2 Name, Role, Value | Custom controls expose name, role, state | A |

WCAG 2.2 also **removed** 4.1.1 Parsing as obsolete.

### Accessible name: where it comes from

Checked in this order; the first one that produces text wins:

1. **`aria-labelledby`** (text of the referenced elements)
2. **`aria-label`**
3. **Native label:** `<label for>` or a wrapping `<label>`, `alt` on images, `<caption>` for tables, `<legend>` for fieldsets
4. **Content** (for roles that take their name from content: buttons, links, headings, tabs, options)
5. **`title`** attribute (last resort; `placeholder` is a weak fallback for inputs and is not a label)

The **description** (`aria-describedby`) is separate and read after the name.

**The rules of ARIA, compressed:** prefer native HTML; don't override native semantics unnecessarily; every interactive ARIA widget must be keyboard-operable; never put `aria-hidden="true"` or `role="presentation"` on focusable elements; every interactive element needs an accessible name. No ARIA is better than bad ARIA.

| Widget | Must-haves |
|---|---|
| Dialog | Focus moves in, Tab is trapped, Escape closes, focus returns to the trigger; `aria-modal`, labelled by its heading (or native `<dialog>` + `showModal()`) |
| Tabs | `tablist`/`tab`/`tabpanel`, `aria-selected`, arrow keys, roving `tabindex` |
| Disclosure | A `<button>` with `aria-expanded` (+ `aria-controls`) |
| Combobox | `aria-expanded`, `aria-controls`, `aria-activedescendant`; options with `aria-selected` |
| Live updates | `role="status"` (polite) or `role="alert"` (assertive); the region must exist before its content changes |

## Performance

### Core Web Vitals

Measured at the **75th percentile** of page loads, separately for mobile and desktop. INP replaced FID as a Core Web Vital in **March 2024**.

| Metric | Measures | Good | Poor | Top fixes |
|---|---|---|---|---|
| **LCP** | Render time of the largest image or text block in the viewport | ≤ 2.5 s | > 4 s | Fast TTFB (CDN, caching, SSR/SSG); make the LCP resource discoverable in HTML; never lazy-load it; `fetchpriority="high"`; modern image formats and `srcset`; remove render-blocking CSS/JS |
| **INP** | Latency from interaction to next paint (input delay + processing + presentation), close to the worst interaction on the page | ≤ 200 ms | > 500 ms | Break up long tasks and yield to the main thread; less JavaScript; avoid layout thrashing; transitions/`useDeferredValue`; virtualise; move work to a Web Worker |
| **CLS** | Largest burst of unexpected layout-shift scores | ≤ 0.1 | > 0.25 | `width`/`height` or `aspect-ratio` on media; reserve space for ads, embeds, banners; don't insert content above existing content; font fallback metrics; animate `transform` |

Lab vs field: Lighthouse measures **lab** data (TBT stands in for INP); the CrUX report and the `web-vitals` library measure **field** data from real users. Interviewers like hearing that you'd trust field data.

### Loading hints

| Hint | Use |
|---|---|
| `preconnect` | Open DNS + TCP + TLS early to a critical third-party origin |
| `dns-prefetch` | Cheap DNS-only version for less critical origins |
| `preload` | Fetch a resource the current page needs soon at high priority (`as` is required; fonts need `crossorigin`) |
| `modulepreload` | Preload an ES module and its parsing |
| `prefetch` | Low-priority fetch for a likely **next** navigation |
| `fetchpriority="high"` | Boost the LCP image; `low` for unimportant ones |
| `loading="lazy"` | Below-the-fold images and iframes only |
| Speculation Rules | Prefetch or prerender likely next pages (Chromium) |

## Networking

### Caching headers

| Header / directive | Meaning |
|---|---|
| `Cache-Control: max-age=N` | Fresh for N seconds |
| `s-maxage=N` | Freshness for shared caches (CDNs), overrides `max-age` there |
| `no-cache` | May be stored but **must revalidate** before every use |
| `no-store` | Must not be stored at all (sensitive data) |
| `private` / `public` | Browser cache only / any cache |
| `immutable` | Don't revalidate while fresh (fingerprinted assets) |
| `stale-while-revalidate=N` | Serve stale for up to N s while revalidating in the background |
| `ETag` → `If-None-Match` | Validator; unchanged resource returns **304 Not Modified** with no body |
| `Last-Modified` → `If-Modified-Since` | Date-based validator |
| `Vary` | Request headers that are part of the cache key (e.g. `Accept-Encoding`) |

**Recipes:** hashed JS/CSS: `public, max-age=31536000, immutable`. HTML: `no-cache` + `ETag`. Personal API data: `private, no-cache` (or `no-store` if sensitive). CDN-cached API: `s-maxage=60, stale-while-revalidate=300`.

### HTTP/1.1 vs HTTP/2 vs HTTP/3

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Transport | TCP (+ TLS) | TCP + TLS (browsers require TLS) | **QUIC over UDP**, TLS 1.3 built in |
| Multiplexing | No: one in-flight request per connection, ~6 connections per origin | Yes: many streams on one connection | Yes: independent streams |
| Head-of-line blocking | At the HTTP layer | Removed at HTTP layer, **remains at TCP** (one lost packet stalls all streams) | Removed: loss stalls only the affected stream |
| Header compression | None | HPACK | QPACK |
| Handshake | TCP + TLS round trips | Same as 1.1 | Combined transport + TLS 1-RTT; 0-RTT on resumption |
| Connection migration | No | No | Yes (survives Wi-Fi → mobile switch) |
| Server push | — | Specified, but removed from Chrome; use **103 Early Hints** + `preload` | Not used by browsers |

HTTP/1.1-era tricks (domain sharding, sprites, one giant bundle) are less useful or counterproductive on HTTP/2+.

### Status codes worth knowing

`200` OK · `201` Created · `204` No Content · `301`/`308` permanent redirect (`308` keeps the method) · `302`/`307` temporary (`307` keeps the method) · `303` See Other (after POST) · `304` Not Modified · `400` Bad Request · `401` not authenticated · `403` authenticated but not allowed · `404` · `409` Conflict · `412` Precondition Failed · `422` validation error · `429` Too Many Requests (`Retry-After`) · `500` · `502` Bad Gateway · `503` Unavailable · `504` Gateway Timeout.

### CORS in five lines

- **Origin** = scheme + host + port. The same-origin policy stops scripts *reading* cross-origin responses.
- **CORS** is the server opting in to relax that, enforced by the browser. It does not protect the server: `curl` ignores it.
- **Simple requests** (GET/HEAD/POST with safelisted headers and `text/plain`, `multipart/form-data` or `application/x-www-form-urlencoded`) are sent directly. Anything else triggers a **preflight** `OPTIONS`.
- With **credentials** (`credentials: 'include'`), `Access-Control-Allow-Origin` must be the exact origin (not `*`) plus `Access-Control-Allow-Credentials: true`.
- A CORS error doesn't mean the request wasn't sent: simple requests still reach the server, which is why CSRF defences are separate.

## Security one-liners

| Threat | One-liner | Defences |
|---|---|---|
| **XSS** | Attacker-controlled script runs in your origin (stored, reflected or DOM-based) | Framework escaping; no `innerHTML`/`dangerouslySetInnerHTML` with untrusted data unless sanitised (DOMPurify); block `javascript:` URLs; strict CSP; Trusted Types; `HttpOnly` cookies limit the damage |
| **CSRF** | Another site makes the user's browser send an authenticated request (cookies ride along) | `SameSite=Lax/Strict` cookies; anti-CSRF tokens; check `Origin` / `Sec-Fetch-Site`; never change state on GET |
| **CSP** | A response header allowlisting where scripts, styles, frames etc. may come from | `script-src 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'none'`; roll out with `Content-Security-Policy-Report-Only` |
| **CORS** | A server opt-in letting other origins **read** responses | Allowlist origins; never reflect arbitrary `Origin` with credentials |
| **Clickjacking** | Your page framed invisibly to hijack clicks | CSP `frame-ancestors 'self'` (or `X-Frame-Options: DENY`) |
| **Tabnabbing** | An opened page navigates `window.opener` | `rel="noopener"` (implied by `target="_blank"` in modern browsers) |
| **Open redirect** | `?next=https://evil.example` | Allow only relative paths or an allowlist |
| **Supply chain** | A compromised package or third-party script | Lockfiles, audits, few dependencies, Subresource Integrity (`integrity`) for CDN scripts |
| **Prototype pollution** | `__proto__` keys merged into objects | Don't deep-merge untrusted JSON naively; validate schemas; `Map` or `Object.create(null)` |
| **Token storage** | `localStorage` is readable by any XSS; cookies are sent automatically (CSRF) | `HttpOnly; Secure; SameSite` session cookies, or a BFF that keeps tokens server-side |
| **Downgrade** | HTTP interception | HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains` |

### OAuth 2.0 authorization code flow with PKCE

1. The app creates a random **`code_verifier`** and derives **`code_challenge = BASE64URL(SHA-256(verifier))`**, plus a random **`state`**.
2. It redirects to `/authorize?response_type=code&client_id=…&redirect_uri=…&scope=…&state=…&code_challenge=…&code_challenge_method=S256`.
3. The user signs in and consents.
4. The server redirects back with `?code=…&state=…`; the app checks that `state` matches (CSRF protection).
5. The app POSTs the `code` **and the `code_verifier`** to the token endpoint; the server hashes the verifier, compares it with the stored challenge, and issues tokens.

**Why PKCE:** public clients (SPAs, mobile apps) can't keep a client secret, so an intercepted authorization code would be enough to get tokens. With PKCE, the code is useless without the verifier, which never left the app. The **implicit flow** (tokens in the URL fragment) is deprecated by the OAuth 2.0 Security Best Current Practice (RFC 9700). **OIDC** adds an ID token for *authentication* on top of OAuth's *authorisation*.

```ts run
// PKCE: derive a code_challenge from a random code_verifier with Web Crypto
function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = base64Url(new Uint8Array(digest));

console.log('code_verifier :', verifier, `(${verifier.length} chars)`);
console.log('code_challenge:', challenge);
console.log('send          :', `code_challenge=${challenge}&code_challenge_method=S256`);
```

## Key takeaways

- Web Vitals at p75: **LCP 2.5 s, INP 200 ms, CLS 0.1**. Fix LCP with discovery and priority, INP with less main-thread work, CLS with reserved space.
- CSS blocks rendering, classic scripts block parsing; `defer` and modules don't.
- Animate `transform`/`opacity`; batch DOM reads before writes.
- Events capture down, then bubble up; `preventDefault` ≠ `stopPropagation`.
- Specificity is (IDs, classes, types); layers beat specificity; `z-index` is local to a stacking context.
- WCAG 2.2 AA: 4.5:1 / 3:1 contrast, 24 px targets, focus not obscured, no drag-only interactions.
- Cache hashed assets for a year with `immutable`; revalidate HTML with `no-cache`.
- Know XSS, CSRF, CSP and CORS in one sentence each, and walk through PKCE step by step.
