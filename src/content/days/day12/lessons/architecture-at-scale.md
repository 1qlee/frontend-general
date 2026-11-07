## Why interviewers ask about architecture at scale

Senior and staff loops include questions like *"How would you structure the frontend for ten teams?"*, *"How do you ship risky changes safely?"*, *"How do you know production is healthy?"* and *"We're launching in Arabic and Japanese: what breaks?"* Few of these have one right answer. The interviewer is listening for whether you see them as **organisational problems with technical costs**, whether you can name the trade-offs, and whether you've actually operated a frontend in production (source maps, RUM percentiles, flag cleanup), not just built one.

## Monorepo vs polyrepo

| | Monorepo | Polyrepo |
|---|---|---|
| Sharing code | Import directly; **atomic** cross-package changes in one PR | Publish versions; a cross-repo change means N PRs and a release dance |
| Dependency versions | A single-version policy is possible (one React, one TS) | Drift: each repo upgrades on its own schedule |
| Tooling | Needs a task graph and caching (Nx, Turborepo on pnpm/npm/yarn workspaces), "affected only" CI | Simple, standard per-repo tooling |
| Ownership | `CODEOWNERS`, enforced module boundaries | Natural boundaries and access control |
| Pain at scale | CI time, repo size, IDE performance | Integration pain, duplicated config, diamond dependencies |

Techniques to name: **workspaces** (`"workspaces": ["apps/*", "packages/*"]`, internal deps as `"@acme/ui": "workspace:*"`); **remote caching** of build and test outputs keyed by input hashes; **affected-only** pipelines (`turbo run test --filter=...[origin/main]`, `nx affected -t test`); and **enforced boundaries** (Nx tags or ESLint import rules) so `apps/checkout` can't reach into `apps/search/internal`.

> [!NOTE]
> Monorepo ≠ monolith. A monorepo can hold many independently deployed apps. The repo layout and the deployment architecture are separate decisions.

## Micro-frontends

**Definition:** splitting one product's frontend into pieces that are **independently developed, tested and deployed by different teams**, then composed at build time, on the server or in the browser.

| Approach | How it works | Strengths | Costs |
|---|---|---|---|
| **Route-level split** | `/checkout/*` → app A, `/account/*` → app B, behind a reverse proxy | Simplest; strongest independence | Full page loads between apps (cross-document View Transitions can soften this); duplicated shell |
| **Build-time packages** | Teams publish npm packages; the host bundles them | One optimised bundle, type safety | Not independent deploys: a release train. It's modularisation, not micro-frontends |
| **Module Federation** | The host loads a remote's entry at runtime and shares deps (`react` as a singleton) | Independent deploys, SPA navigation, shared deps | Runtime coupling and **version skew**, harder debugging, bundler-specific (webpack/Rspack, Vite plugins) |
| **iframes** | Each piece in its own frame, talking via `postMessage` | Strongest isolation (JS, CSS, security), any tech | Sizing, focus and a11y across frames, routing, performance, duplicated deps |
| **Web Components** | Teams ship custom elements; Shadow DOM for styles | Framework-agnostic contract (attributes, properties, events) | SSR is weaker (Declarative Shadow DOM helps); you still need a shared-dependency strategy. React 19 now supports custom elements properly (properties and custom events) |
| **Server/edge composition** | Fragments stitched on the server or at the edge | Fast first render, SEO | Infrastructure complexity; hydrating each fragment |

**Cross-cutting concerns you must address:** a **shared design system** (or it looks like five products); shared auth and session; **routing ownership** (the shell owns top-level routes); **communication** through the URL, DOM custom events or a small typed event bus, not a shared global store, which re-couples the teams; **performance budgets** (duplicate frameworks cost tens of KB each, and two copies of React break hooks with "Invalid hook call"); **failure isolation** (an error boundary and fallback UI per remote, and a timeout if a remote fails to load); and **observability per team** (tag errors with the owning micro-frontend).

**When it's worth it:** many autonomous teams blocked by a shared release train; product areas with genuinely different release cadences; **incremental migration** of a legacy app (the *strangler fig* pattern: new React micro-frontends inside an old AngularJS shell until the shell is gone).

**When it isn't:** one or two teams; performance-critical consumer pages; no platform team to own the shell, shared dependencies and tooling.

> [!INTERVIEW] Say it like this
> "Micro-frontends solve an organisational scaling problem: independent deployment for autonomous teams. You pay for it in runtime complexity, bundle size and consistency. I'd start with the simplest split that gives independent deploys (often route-level), use Module Federation only where teams must share one SPA page, and invest early in a design system and a platform team. With one or two teams, a well-structured monorepo is almost always better."

> [!MISTAKE]
> Proposing micro-frontends to "improve performance" or "because the app has 300 components". They usually make performance worse, and a large codebase is a modularisation problem, not a deployment problem.

## Internationalisation (i18n) and localisation (l10n)

- **i18n** is the engineering that makes adaptation *possible*: externalised strings, locale-aware formatting, flexible layouts, RTL support.
- **l10n** is the adaptation for a specific locale: translation, formats, imagery, legal text.

**Locale negotiation:** explicit user preference > URL (`/fr-CA/…`, which is good for SEO with `hreflang`) > `Accept-Language` on the server / `navigator.languages` on the client. Always set `<html lang="fr-CA" dir="ltr">`: screen readers choose voice and pronunciation from `lang`.

**Never concatenate translated fragments.** Word order differs between languages, and plural rules are not `count === 1`:

```ts
// ❌ English-only logic baked into code
`${count} ${count === 1 ? 'item' : 'items'} in ${name}'s cart`;

// ✅ One translatable ICU MessageFormat string: translators control word order and plural forms
'{count, plural, =0 {Your cart is empty} one {# item in {name}’s cart} other {# items in {name}’s cart}}';
```

ICU features to name: `plural` (CLDR categories `zero / one / two / few / many / other`, `#` for the formatted number, `=0` for exact matches), `select` (`{role, select, admin {…} other {…}}`), `selectordinal` (1st, 2nd, 3rd) and nested number/date formatting. Common libraries are FormatJS/react-intl, i18next (with ICU support) and Lingui. Give translators **context** (a description per message ID), lazy-load only the active locale's messages, and precompile messages at build time.

**The `Intl` built-ins** replace a lot of library code:

```ts run
for (const locale of ['en', 'pl', 'ar']) {
  const rules = new Intl.PluralRules(locale);
  const samples = [0, 1, 2, 5, 22, 100].map((n) => `${n}→${rules.select(n)}`).join(' ');
  console.log(locale.padEnd(3), `[${rules.resolvedOptions().pluralCategories.join(', ')}]`, samples);
}

console.log(new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1234.5));
console.log(new Intl.NumberFormat('en-IN').format(12_345_678)); // lakh/crore grouping
console.log(new Intl.NumberFormat('en', { notation: 'compact' }).format(1_250_000));
console.log(new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeZone: 'Asia/Tokyo' }).format(Date.UTC(2026, 0, 15)));
console.log(new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(-1, 'day'));
console.log(new Intl.ListFormat('fr', { type: 'conjunction' }).format(['pommes', 'poires', 'kiwis']));
console.log('de:', ['ä', 'z', 'a'].sort(new Intl.Collator('de').compare), 'sv:', ['ä', 'z', 'a'].sort(new Intl.Collator('sv').compare));
```

{{quiz:icu-plural-categories}}

**Dates and time zones:** store and transmit UTC instants (ISO 8601), and format in the user's time zone with `Intl.DateTimeFormat({ timeZone })`. Watch for **SSR hydration mismatches**: the server's locale and time zone differ from the browser's, so render with the user's locale/zone on the server or format on the client. The `Temporal` API (time-zone-aware date arithmetic) is landing in browsers.

**Right-to-left (Arabic, Hebrew, Persian, Urdu):**

- Set `dir="rtl"` on `<html>` (and `dir="auto"` on user-generated text). Flexbox, grid and inline flow mirror automatically.
- Use **CSS logical properties** instead of physical ones:

```css
/* ❌ physical: wrong in RTL */
.card { margin-left: 16px; padding-right: 8px; text-align: left; border-left: 4px solid; }

/* ✅ logical: follows the writing direction */
.card { margin-inline-start: 16px; padding-inline-end: 8px; text-align: start; border-inline-start: 4px solid; }
```

- Mirror **directional** icons (back arrows, progress, "next") with `:dir(rtl)`, but not all icons (checkmarks, play buttons and logos usually stay as they are).
- Wrap user-provided names in `<bdi>` so mixed-direction text renders correctly.

{{quiz:logical-properties-rtl}}

**Text expansion:** translations are often around 30% longer than English, and short UI strings can grow 2–3× ("Save" → "Speichern"). German compounds don't wrap; CJK text can be shorter but needs different line-breaking. Design flexible widths, avoid fixed-width buttons and text in images, and run **pseudo-localization** in CI (`[!! Šéttîñĝš ~~~ !!]`) to catch hard-coded strings, truncation and concatenation before translators do.

## Observability

The goal: **find out about problems before users report them, and debug them quickly.**

1. **Error tracking** (Sentry and similar): capture `window` `error` events, `unhandledrejection`, React error boundaries and the React 19 root error hooks. Enrich each event with release, route, browser, active feature flags and **breadcrumbs** (clicks, navigations, requests). Group by fingerprint and filter noise (browser extensions, bots).

```tsx
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!, {
  onUncaughtError: (error, info) => report(error, { handled: false, componentStack: info.componentStack }),
  onCaughtError: (error, info) => report(error, { handled: true, componentStack: info.componentStack }),  // caught by an error boundary
  onRecoverableError: (error) => report(error, { level: 'warning' }), // e.g. hydration mismatches React recovered from
});
```

2. **Source maps:** generate them for production builds and **upload them to the error tracker tagged with the release**. Without them, a stack trace reads `a.b is not a function at main.3f9c1.js:1:48213`. Either don't serve them publicly ("hidden" source maps, with no `sourceMappingURL` comment) or accept that your source is readable. Obscurity was never a security control anyway.
3. **RUM (real-user monitoring):** field data from real devices and networks. Collect Core Web Vitals (**LCP, INP, CLS**; INP replaced FID in March 2024) with the `web-vitals` library and attribution, judged at the **75th percentile** and segmented by route, device class and country. Add custom marks (`performance.mark`/`measure`) for business-critical moments ("time to first message rendered"). Send data with `navigator.sendBeacon` or `fetch(…, { keepalive: true })` when `visibilitychange` reports `hidden` (`unload` is unreliable on mobile). Lab data (Lighthouse) is not field data.
4. **Structured logging:** JSON events with consistent fields (`event`, `level`, `release`, `route`, `sessionId`, `traceId`), not free-text strings, so you can query and aggregate them. Propagate **W3C Trace Context** (`traceparent`) from browser requests to the backend so one trace covers click → API → database (OpenTelemetry has a browser SDK). Sample high-volume events, batch sends, **scrub PII** (emails, tokens in URLs) and respect consent.
5. **Alerting:** alert on **user-facing symptoms against SLOs** (checkout error rate, crash-free sessions, p75 INP regressions), compare each release with the previous one, page only for what is urgent and actionable, and route alerts to the owning team. Connect alerts to a fast **rollback**: redeploy the previous build or switch the feature's flag off.

> [!TIP]
> In a system design answer, a single "O" bullet like *"Sentry with source maps per release, web-vitals RUM at p75 by route, alerts on checkout error rate"* signals production experience more than another caching layer would.

## Feature flags and experimentation

**Decouple deploy from release.** Code reaches production behind a flag (trunk-based development); users see it when you turn it on.

| Flag type | Lifetime | Example |
|---|---|---|
| Release toggle | Days to weeks | Hide the half-built new checkout |
| Experiment toggle | Weeks | A/B test the CTA copy |
| Ops toggle / kill switch | Long-lived | Turn off recommendations under load |
| Permission toggle | Long-lived | Beta features for opted-in customers |

- **Progressive delivery:** internal users → 1% → 10% → 50% → 100%, watching error and vitals dashboards at each step. A kill switch reverts in seconds, with no deploy.
- **Where to evaluate:** on the server or at the edge (no flicker, and rules and unreleased feature names never reach the client), or with a client SDK. A client SDK needs initial values **bootstrapped into the SSR HTML**, or you get a flash of the wrong variant and hydration mismatches. Send the client evaluated **results**, not every rule. **OpenFeature** is the vendor-neutral API standard.
- **Deterministic bucketing:** hash `flagKey + userId` into 0–99. The same user gets the same answer on every device, a bigger rollout keeps the earlier users in, and each flag buckets independently:

```ts run
// FNV-1a (32-bit): fast, deterministic, good enough spread for bucketing (not for security).
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
const bucket = (flag: string, userId: string) => fnv1a(`${flag}:${userId}`) % 100;
const isEnabled = (flag: string, userId: string, percent: number) => bucket(flag, userId) < percent;

const users = Array.from({ length: 10_000 }, (_, i) => `user-${i}`);
for (const pct of [1, 10, 50]) {
  console.log(`${pct}% rollout → ${users.filter((u) => isEnabled('new-checkout', u, pct)).length} of ${users.length} users`);
}
const inAt10 = users.filter((u) => isEnabled('new-checkout', u, 10));
console.log('monotonic (10% ⊂ 50%):', inAt10.every((u) => isEnabled('new-checkout', u, 50)));
const overlap = inAt10.filter((u) => isEnabled('dark-mode', u, 10)).length;
console.log(`independent flags: ${overlap} users are in both 10% cohorts (≈100 expected if independent, not 1,000)`);
```

- **Experiments done right:** a hypothesis, one primary metric plus **guardrail metrics** (errors, latency, revenue), and a sample size calculated up front. **Don't peek and stop early** (it inflates false positives) unless you use a sequential testing method. Check for **sample ratio mismatch** (a 50/50 split that arrives as 47/53 means the assignment or logging is broken), log **exposure** when the user actually sees the variant, and watch for novelty effects.
- **Flag debt:** each flag doubles the state space. Give every flag an owner and an expiry date, lint for stale flags, delete the code path after reaching 100%, and test both paths of critical flags.
- **In React:** a provider with a `useFlag('new-checkout')` hook; read flags once per render, not inside loops; and make sure flags that affect SSR markup have the same value on the server and the client.

{{quiz:flag-bucketing-stable}}

## Key takeaways

- **Monorepo vs polyrepo:** atomic changes and one version policy vs independence and simple tooling. Monorepos need caching, affected-only CI and enforced boundaries.
- **Micro-frontends** buy independent deploys for autonomous teams at the cost of runtime complexity, size and consistency. Prefer route-level splits; use Module Federation, iframes or Web Components deliberately; never adopt them "for performance".
- **i18n:** ICU messages (plural/select), never concatenation; `Intl.*` for numbers, dates, lists and sorting; `lang`/`dir` on `<html>`; CSS logical properties for RTL; design for 30%+ expansion; pseudo-localize in CI.
- **Observability:** error tracking with release-tagged source maps, RUM Core Web Vitals at p75, structured logs with trace context, symptom-based alerts tied to rollback.
- **Feature flags:** decouple deploy from release, roll out progressively with deterministic bucketing, evaluate server-side or bootstrap to avoid flicker, run disciplined experiments, and pay down flag debt.
