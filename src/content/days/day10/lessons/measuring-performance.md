## Why interviewers ask about performance measurement

"How would you make this page faster?" is one of the most common open-ended frontend questions, and most candidates answer it badly: they jump straight to a list of tricks ("lazy-load images, use `memo`, add a CDN"). Strong candidates answer like an engineer: **define "fast" with metrics, measure where real users are slow, find the bottleneck, fix the biggest one, verify.**

So the first thing interviewers listen for is vocabulary and process:

- Can you name the **Core Web Vitals**, their thresholds, and what each one actually measures?
- Do you know the difference between **lab** and **field** data, and which one is the source of truth?
- Can you describe a concrete **profiling workflow** in DevTools?
- Do you know how teams keep performance from regressing (**budgets** in CI)?

This lesson gives you that foundation. Lesson 2 covers *loading* fixes and lesson 3 *runtime* and *network* fixes — but every fix starts with a measurement.

## Core Web Vitals (2025)

Core Web Vitals are Google's three user-centric metrics for **loading**, **interactivity** and **visual stability**. They are assessed at the **75th percentile** of real page loads, separately for mobile and desktop.

| Metric | Measures | Good | Needs improvement | Poor |
|---|---|---|---|---|
| **LCP** — Largest Contentful Paint | When the largest image or text block in the viewport is rendered (loading) | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s |
| **INP** — Interaction to Next Paint | Latency from a user interaction to the next frame being painted, across the whole visit (responsiveness) | ≤ 200 ms | 200–500 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | Unexpected movement of visible content (visual stability) | ≤ 0.1 | 0.1–0.25 | > 0.25 |

> [!NOTE]
> **INP replaced FID** (First Input Delay) as a Core Web Vital on **12 March 2024**. If you mention FID as a current Core Web Vital in an interview, it signals your knowledge is out of date.

### LCP — when did the main content show up?

LCP reports the render time of the **largest content element** visible in the viewport. Candidates are:

- `<img>` elements (the first frame for animated images), and `<image>` inside `<svg>`
- `<video>` elements (poster image, or the first frame)
- elements with a CSS `background-image: url(…)` (not gradients)
- block-level elements containing text

The browser emits new LCP candidates as larger elements render, and **stops** looking once the user interacts (tap, click, keypress or scroll). Low-information images such as tiny blurry placeholders are ignored.

The most useful way to reason about LCP is to break it into its four **sub-parts** — web.dev's guidance for a well-optimized page is shown on the right:

| Sub-part | What it is | Rough target share of LCP |
|---|---|---|
| **TTFB** | Navigation start → first byte of HTML | ~40% |
| **Resource load delay** | First byte → browser *starts* fetching the LCP resource | < 10% |
| **Resource load duration** | Time to download the LCP resource | ~40% |
| **Element render delay** | Resource loaded → element actually painted | < 10% |

If the LCP element is text, the two "resource" parts are zero. This breakdown turns "LCP is slow" into a specific question: is the server slow, is the image **discovered late**, is it **too big**, or is rendering **blocked**? (Lesson 2 maps each sub-part to fixes.)

### INP — does the page respond quickly to every interaction?

INP observes **clicks, taps and key presses** (not hover or scroll) for the entire lifetime of the page. Each interaction's latency has three phases:

1. **Input delay** — the event arrives, but the main thread is busy with something else (a long task, hydration, a third-party script).
2. **Processing duration** — your event handlers run (including the React render they trigger).
3. **Presentation delay** — style, layout, paint and compositing of the next frame.

The page's INP is roughly its **worst** interaction latency — for pages with many interactions, the browser ignores one highest outlier per 50 interactions, so INP approximates the 98th percentile of a visit's interactions.

Why the change from FID? FID only measured the **input delay** of the **first** interaction. It ignored handler time and rendering time, and it ignored every interaction after the first one — yet most user time is spent after load. Almost every site "passed" FID while users still experienced janky UIs.

> [!INTERVIEW] Say it like this
> "INP measures responsiveness across the whole visit: for every click, tap and key press it measures from the input until the next frame is painted — input delay plus handler processing plus presentation delay — and reports roughly the worst one. Good is 200 ms or less at the 75th percentile. It replaced FID in March 2024 because FID only measured the input delay of the first interaction."

{{quiz:inp-what-counts}}

### CLS — does the page jump around?

Every unexpected layout shift gets a **layout shift score**:

> score = **impact fraction** × **distance fraction**

The impact fraction is the share of the viewport touched by the unstable element (before ∪ after positions); the distance fraction is the greatest distance it moved, relative to the viewport's largest dimension.

```ts run
// An element covering the top 50% of the viewport is pushed down by 25% of the viewport height.
const impactFraction = 0.5 + 0.25; // union of old and new position: 75% of the viewport
const distanceFraction = 0.25; // moved by 25% of the viewport height
console.log('layout shift score =', impactFraction * distanceFraction); // 0.1875 → already "poor" territory on its own
```

CLS is **not** the sum of every shift for the whole visit (that was the original definition, changed in 2021 because it punished long-lived pages). Shifts are grouped into **session windows** — a burst where each shift is < 1 s after the previous one, capped at 5 s — and CLS is the score of the **largest** window. You'll implement exactly that algorithm in today's stretch exercise.

What does *not* count:

- Shifts within **500 ms of a discrete user input** (`hadRecentInput: true`) — the user expected them (e.g. expanding an accordion).
- Animations using `transform` — they don't change layout, so they never produce layout shifts.

Common causes: images/iframes/ads without reserved dimensions, content injected above existing content (banners, cookie notices), and web fonts swapping in with different metrics.

### The 75th percentile

"Passing" means **75% of page loads** are in the good range. Interviewers like to probe this: a page can have a terrible 95th percentile and still pass, and improving the median does nothing if your slowest quarter of users (often low-end Android devices on slow networks) are unaffected.

```ts run
// Nearest-rank percentile over field samples (e.g. INP values in ms from RUM).
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.max(0, rank - 1)];
}

const desktop = [40, 60, 72, 80, 96, 110, 120, 150];
const lowEndAndroid = [180, 240, 320, 410, 520, 600, 640, 900];
console.log('p75 desktop only:', percentile(desktop, 75));
console.log('p75 all users   :', percentile([...desktop, ...lowEndAndroid], 75));
console.log('p75 Android only:', percentile(lowEndAndroid, 75));
```

The same site "passes" or "fails" depending on who your users are — which is why field data, segmented by device, matters.

{{quiz:p75-assessment}}

## Supporting metrics

Core Web Vitals are outcomes. These metrics help you diagnose *why* an outcome is bad:

| Metric | What it tells you | Rule of thumb |
|---|---|---|
| **TTFB** (Time to First Byte) | Redirects + DNS + connection + server time until the first HTML byte. A floor for every other loading metric. | Good ≤ 0.8 s |
| **FCP** (First Contentful Paint) | First text/image painted — "is anything happening?" | Good ≤ 1.8 s |
| **TBT** (Total Blocking Time) | **Lab-only.** Sum of the portion of each main-thread long task beyond 50 ms, between FCP and when the page becomes reliably interactive. The best lab proxy for INP. | < 200 ms on Lighthouse mobile |
| **Speed Index** | How quickly the visible page fills in during load (lab). | Lighthouse-only |
| **Long tasks / Long Animation Frames** | Main-thread work > 50 ms / frames that took > 50 ms to render. LoAF (Chrome 123+) attributes slow frames to scripts — great for debugging INP. | Any task > 50 ms can delay input |

TBT is easy to compute — and seeing the formula makes it obvious why one 400 ms task is much worse than eight 50 ms tasks:

```ts run
const taskDurations = [30, 120, 45, 260, 70]; // main-thread tasks (ms) during load
const tbt = taskDurations.reduce((sum, d) => sum + Math.max(0, d - 50), 0);
console.log('TBT =', tbt, 'ms'); // 70 + 210 + 20

const oneBigTask = [400];
const eightSmallTasks = Array(8).fill(50);
const tbtOf = (tasks: number[]) => tasks.reduce((s, d) => s + Math.max(0, d - 50), 0);
console.log('one 400 ms task:', tbtOf(oneBigTask), 'ms | eight 50 ms tasks:', tbtOf(eightSmallTasks), 'ms');
```

> [!MISTAKE]
> "Lighthouse measures INP." In its default **navigation** mode Lighthouse loads the page and never interacts with it, so it cannot measure INP — it reports **TBT** as a proxy. (Lighthouse's *timespan* mode and DevTools can measure INP for interactions *you* perform.)

## Lab vs field data

This distinction is the single most important idea in performance measurement.

| | **Lab** (synthetic) | **Field** (real users, RUM) |
|---|---|---|
| Tools | Lighthouse, DevTools Performance panel, WebPageTest | CrUX, your own RUM (`web-vitals` → analytics), commercial RUM |
| Conditions | One device, one network profile, one cold load | Every device, network, cache state, geography and user journey |
| Metrics | LCP, CLS (load only), TBT, FCP, Speed Index | LCP, INP, CLS (whole visit), TTFB, FCP |
| Strengths | Reproducible, debuggable, runs in CI before deploy | The truth — what users actually experience |
| Weaknesses | Doesn't reflect your real users; no real interactions | Noisy, lagging, harder to debug without attribution |

**Field data is the source of truth; lab data is how you debug and prevent regressions.** They often disagree: your field LCP may be worse because real users are on slower devices, or *better* because returning visitors have warm caches. Field CLS is often worse because it includes shifts *after* load (infinite scroll, late ads).

### The tools you should name

- **Lighthouse** (DevTools, PageSpeed Insights, CLI, Lighthouse CI). Mobile runs emulate a mid-tier phone with a 4× CPU slowdown and a slow-4G-like network (150 ms RTT, ~1.6 Mbps). The performance score weights: **TBT 30%, LCP 25%, CLS 25%, FCP 10%, Speed Index 10%**. The score is a lab summary — never the goal itself.
- **CrUX** (Chrome UX Report) — field data from opted-in Chrome users, aggregated over a **rolling 28-day window**, at origin and URL level. Surfaces in **PageSpeed Insights** (the top section), **Search Console's Core Web Vitals report**, the CrUX API and BigQuery. Only covers sites with enough traffic, and only Chrome users.
- **RUM** (real user monitoring) — you collect metrics from your own users with Google's `web-vitals` library or a vendor. This gives you segmentation (route, device, country, A/B test arm) and **attribution** (which element was LCP, which script caused the slow interaction).
- **DevTools Performance panel** — lab profiling with a flame chart, plus a live-metrics view that shows LCP/CLS/INP as you use the page and can compare them with CrUX field data.

> [!INTERVIEW] Say it like this
> "Lab tools like Lighthouse give me a reproducible, debuggable measurement under fixed conditions, which is great for catching regressions in CI. Field data — CrUX or our own RUM with the web-vitals library — tells me what real users experience at the 75th percentile, and it's what Core Web Vitals are judged on. I use field data to decide *what* to fix and lab tools to figure out *why* and to verify the fix."

## Measuring in code

### The `web-vitals` library

The `web-vitals` library handles the many edge cases (back/forward cache restores, prerendering, tabs opened in the background, when to report) so you don't have to:

```ts
import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name, // 'LCP' | 'INP' | 'CLS' | 'TTFB'
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    id: metric.id, // unique per page load — dedupe/aggregate on it
    route: location.pathname,
  });
  // sendBeacon survives the page being hidden/unloaded; fall back to keepalive fetch.
  if (!navigator.sendBeacon('/rum', body)) {
    fetch('/rum', { method: 'POST', body, keepalive: true });
  }
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onTTFB(sendToAnalytics);
```

Notes worth saying out loud: INP and CLS are only final when the page is **hidden** (the library reports on `visibilitychange`), which is why you use `sendBeacon` rather than a normal `fetch`. Import from `web-vitals/attribution` instead and every metric also carries an `attribution` object that tells you *why* it is bad — for LCP, the element and its four sub-parts; for INP, the target element, the event type and the input-delay/processing/presentation split; for CLS, the element that shifted most. `onFID` no longer exists in current versions of the library (removed in v5).

### `PerformanceObserver` directly

Under the hood these metrics come from browser performance APIs. You should be able to sketch one:

```ts
// Log each LCP candidate (the last one before input is the page's LCP).
const lcpObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries() as LargestContentfulPaint[]) {
    console.log('LCP candidate', Math.round(entry.startTime), entry.element, entry.url);
  }
});
lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

// Slow interactions (Event Timing API) — the raw material of INP.
const eventObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries() as PerformanceEventTiming[]) {
    if (!entry.interactionId) continue; // only real interactions (click/tap/key)
    const inputDelay = entry.processingStart - entry.startTime;
    const processing = entry.processingEnd - entry.processingStart;
    const presentation = entry.startTime + entry.duration - entry.processingEnd;
    console.log(entry.name, { duration: entry.duration, inputDelay, processing, presentation });
  }
});
eventObserver.observe({ type: 'event', durationThreshold: 40, buffered: true });
```

`buffered: true` delivers entries recorded before you started observing — important because your analytics code usually loads after LCP has already happened. Other entry types worth knowing: `layout-shift`, `longtask`, `long-animation-frame`, `resource`, `navigation`, `paint`.

You can also add your own marks for app-specific milestones ("search results rendered"), which show up in the DevTools Performance panel's Timings track:

```ts
performance.mark('results-start');
// …fetch + render…
performance.mark('results-end');
performance.measure('search-results', 'results-start', 'results-end');
```

## A DevTools Performance-panel workflow

When an interviewer asks "how would you debug a slow page?", describe a process like this (and actually use it on your own apps):

1. **Start from field data.** Which metric fails, on which routes, on which devices? (CrUX/PageSpeed Insights or your RUM dashboard.) That tells you whether you're debugging *loading* (LCP), *responsiveness* (INP) or *stability* (CLS).
2. **Reproduce realistically.** Use an incognito window (no extensions), throttle the CPU (4× or the calibrated mid-tier mobile preset) and the network (Slow 4G). Your MacBook is not your user's phone.
3. **Record.** For loading problems, use *Record and reload*. For INP, start recording, perform the slow interaction, stop. Keep recordings short and focused.
4. **Read the tracks top-down.**
   - **Network**: the request waterfall — when was the LCP image *requested*? Late discovery shows up as a gap after the HTML arrives. Check request priorities.
   - **Main**: the flame chart. Long tasks are marked with a red corner; click one and use **Bottom-up** / **Call tree** to find the expensive functions (your code, framework, third parties).
   - **Timings / Layout shifts / Interactions**: LCP marker, each layout shift (click to see which nodes moved), and each interaction with its input delay / processing / presentation split.
   - **Insights** sidebar: LCP by phase, INP by phase, render-blocking requests, layout-shift culprits, third-party impact.
5. **Form one hypothesis, fix one thing, re-measure** with the same settings. Then confirm the change in field data after it ships (field data lags by days to weeks — CrUX is a 28-day window).

Supporting tools: the **Lighthouse** panel for a quick audit and opportunities list, the **Network** panel (enable the *Priority* column; check `Cache-Control` and transfer sizes), the **Coverage** panel (unused JS/CSS bytes on load), the **Performance monitor** (live CPU, JS heap, DOM node count) and **React DevTools Profiler** for component render costs (Day 7).

> [!TIP]
> Try this on your fe-gym app tonight: build it in production mode (`npm run build && npm run preview` — never profile the dev server, it's unminified and does extra work), run Lighthouse on mobile, then record a reload in the Performance panel with 4× CPU throttling and identify your LCP element and longest task.

> [!MISTAKE]
> Profiling in development mode. React's development build does extra checks (and Strict Mode double-invokes renders and effects), and Vite's dev server serves unbundled modules — your measurements will be wrong in both directions. Always measure a production build.

## Performance budgets

A performance budget is a limit your team agrees not to exceed, enforced automatically so regressions are caught in code review instead of in CrUX a month later.

| Budget type | Example |
|---|---|
| **Metric-based** (user-centric) | LCP ≤ 2.5 s and INP ≤ 200 ms at p75 in RUM; Lighthouse TBT ≤ 200 ms on the checkout page |
| **Quantity-based** (resource) | ≤ 170 KB of compressed JavaScript on the critical path; hero image ≤ 100 KB; ≤ 2 third-party origins before LCP |
| **Rule-based** | Lighthouse performance score ≥ 90 on key templates |

Quantity budgets are easy to enforce on every pull request (bundle size is deterministic); metric budgets are what you actually care about. Typical enforcement:

- **size-limit** or a bundler-stats check that fails CI when a chunk grows past its limit.
- **Lighthouse CI** with assertions, run against preview deployments:

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 175000 }]
      }
    }
  }
}
```

- **RUM alerts** when the p75 of a metric for a key route crosses its threshold.

> [!INTERVIEW] Say it like this
> "I'd set budgets at two levels: resource budgets like compressed JS size per route, enforced on every PR because they're deterministic, and user-centric budgets — p75 LCP, INP and CLS — tracked in RUM with alerts. Lighthouse CI on preview deployments sits in between and catches obvious regressions before they ship."

## Key takeaways

- Core Web Vitals: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1**, judged at the **75th percentile** of real users, mobile and desktop separately.
- **INP replaced FID in March 2024**; INP = input delay + processing + presentation delay, over every interaction of the visit.
- LCP breaks down into **TTFB, resource load delay, resource load duration, element render delay** — diagnose by sub-part.
- CLS = largest **session window** of unexpected shifts (1 s gap, 5 s cap); input-triggered shifts and `transform` animations don't count.
- **Field data is the truth, lab data is for debugging.** Lighthouse can't measure INP on a page load — TBT is its proxy.
- Process: field data → reproduce with throttling → record → read Network/Main/Interactions → one hypothesis → fix → re-measure.
- Enforce **budgets** in CI (bundle size, Lighthouse CI) and in RUM (p75 alerts).
