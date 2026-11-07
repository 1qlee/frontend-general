import type { Day, Exercise } from '../../types';

import renderingPipeline from './lessons/rendering-pipeline.md?raw';
import domEvents from './lessons/dom-events.md?raw';
import cssFundamentals from './lessons/css-fundamentals.md?raw';
import labCssLayouts from './lessons/lab-css-layouts.md?raw';

import findStarter from './exercises/find-by-class-name/starter.tsx?raw';
import findSolution from './exercises/find-by-class-name/solution.tsx?raw';
import findTests from './exercises/find-by-class-name/tests.tsx?raw';
import delegateStarter from './exercises/delegate-events/starter.tsx?raw';
import delegateSolution from './exercises/delegate-events/solution.tsx?raw';
import delegateTests from './exercises/delegate-events/tests.tsx?raw';
import specificityStarter from './exercises/css-specificity/starter.ts?raw';
import specificitySolution from './exercises/css-specificity/solution.ts?raw';
import specificityTests from './exercises/css-specificity/tests.ts?raw';
import vdomStarter from './exercises/dom-to-vdom/starter.tsx?raw';
import vdomSolution from './exercises/dom-to-vdom/solution.tsx?raw';
import vdomTests from './exercises/dom-to-vdom/tests.tsx?raw';
import infiniteStarter from './exercises/infinite-list-observer/starter.tsx?raw';
import infiniteSolution from './exercises/infinite-list-observer/solution.tsx?raw';
import infiniteTests from './exercises/infinite-list-observer/tests.tsx?raw';

const findByClassName: Exercise = {
  id: 'find-by-class-name',
  title: 'findAllByClassName & getByText (tree walking)',
  runtime: 'dom',
  difficulty: 'warm-up',
  estMinutes: 10,
  tags: ['dom', 'tree traversal', 'testing library'],
  prompt: `Implement two tree-walking helpers **without** \`querySelector(All)\`, \`getElementsByClassName\` or \`getElementsByTagName\`:

1. \`findAllByClassName(root, classNames)\` — every **descendant** of \`root\` (not \`root\` itself) that has **all** the whitespace-separated classes, in **document order** — like \`root.getElementsByClassName(...)\`, but returning an array.
2. \`getByText(root, text)\` — a simplified Testing Library \`getByText\`: the single descendant whose **own** text (its direct text-node children joined, whitespace collapsed and trimmed) equals \`text\`. Skip \`<script>\` and \`<style>\`. Throw if there are no matches, or several.

\`\`\`ts
findAllByClassName(list, 'item active'); // [li.item.active, …] in document order
getByText(form, 'Save');                 // <button>Save</button>
\`\`\`

**What the interviewer is looking for:** a correct depth-first traversal (pre-order = document order), knowing \`children\` vs \`childNodes\`, whole-class matching (not \`className.includes\`), and — for \`getByText\` — understanding why Testing Library can't find text split across elements.`,
  starter: findStarter,
  solution: findSolution,
  tests: findTests,
  hints: [
    'Pre-order depth-first traversal visits nodes in document order. Recursion over `el.children` is fine; an explicit stack also works (push children in reverse so the first child is popped first).',
    'Use `classList.contains(name)` for every requested class — `className.includes("btn")` would wrongly match `btn-primary`.',
    'For "own text", loop over `el.childNodes`, keep only nodes with `nodeType === Node.TEXT_NODE`, join their `textContent`, then normalise with `.replace(/\\s+/g, " ").trim()`.',
  ],
  explanation: `**Approach:** pre-order DFS starting from \`root.children\` — visit a node, then its children left to right — which is exactly document order. The iterative stack version avoids recursion-depth limits on pathological trees. Cost: O(n) nodes × k requested classes.

**\`children\` vs \`childNodes\`:** \`children\` is elements only (an \`HTMLCollection\`); \`childNodes\` includes text and comment nodes (a \`NodeList\`). You want \`children\` for the class search and \`childNodes\` for the text search.

**Live vs static:** native \`getElementsByClassName\` returns a **live** \`HTMLCollection\` that updates as the DOM changes — removing matches while looping over it skips elements. \`querySelectorAll\` returns a **static** \`NodeList\`. Returning an array, as here, is static.

**Why "own text"?** Testing Library's default matcher compares each element's own text nodes, so \`<p>Hello <strong>world</strong></p>\` isn't found by \`'Hello world'\`. The fixes are a function matcher, or (better) querying by role or label. Ignoring \`script\`/\`style\` mirrors its default \`ignore\` option.

**Follow-ups:**
- *"Implement \`closest\` or \`getElementById\`"* → same traversal (up or down), different predicate.
- *"Is there a built-in iterator for this?"* → \`document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)\`.
- *"Find the lowest common ancestor of two nodes"* → walk up from one collecting ancestors in a \`Set\`, then walk up from the other until you hit one.`,
};

const delegateEvents: Exercise = {
  id: 'delegate-events',
  title: 'delegate(root, type, selector, handler)',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['events', 'event delegation', 'dom'],
  prompt: `Implement jQuery-style **event delegation**: one listener on \`root\` handles events for every descendant matching \`selector\` — including elements added later.

\`\`\`ts
const off = delegate(list, 'click', 'li[data-id]', function (event, li) {
  console.log(this === li, li.getAttribute('data-id')); // true '42'
});
off(); // removes the listener
\`\`\`

Requirements:
- Attach **exactly one** native listener, to \`root\`.
- Walk from \`event.target\` up to — but **not including** — \`root\`, calling \`handler\` for **each** element that matches \`selector\`, innermost first, with \`this\` and the second argument set to that element.
- Elements **outside** \`root\` never match, even if they match the selector.
- The target may be a **Text** node.
- If a handler calls \`event.stopPropagation()\`, skip the outer matches.
- Return an unsubscribe function.

**What the interviewer is looking for:** \`matches()\`/\`closest()\` fluency, the containment boundary, correct \`this\` (\`handler.call(el, …)\`), and clean removal (the same function reference, or an \`AbortController\`).`,
  starter: delegateStarter,
  solution: delegateSolution,
  tests: delegateTests,
  hints: [
    'The listener on `root` receives every bubbling event from inside it. Start at `event.target` — but if it is not an `Element` (e.g. a Text node), start at its `parentElement`.',
    'Loop `while (el && el !== root)`: if `el.matches(selector)`, call `handler.call(el, event, el)`; then `el = el.parentElement`. Stopping at `root` is what keeps outside ancestors from matching.',
    'After each handler call, check `event.cancelBubble` — it becomes true once `stopPropagation()` has been called. For removal, pass `{ signal }` from an `AbortController` and return `() => controller.abort()`.',
  ],
  explanation: `**Approach:** one listener on \`root\`; walk up from the target with \`matches()\` until you reach \`root\`. O(depth) per event, independent of how many items exist.

**Why not just \`closest()\`?** \`target.closest(selector)\` is the idiomatic single-match version and is fine in most apps — but it (a) returns only the innermost match, (b) can return \`root\` itself or an ancestor *outside* \`root\`, because it searches all the way up to \`<html>\`, and (c) doesn't exist on Text nodes. If you use it, add \`match !== root && root.contains(match)\`.

**\`stopPropagation\` and \`cancelBubble\`:** all your handlers run inside *one* native listener, so the browser's propagation flag can't stop your loop — you check it yourself. \`event.cancelBubble\` is the legacy-named but standard getter for that flag (jQuery tracks the same thing with \`isPropagationStopped()\`). Calling \`stopPropagation()\` still stops the native event above \`root\`, as the test with the \`body\` listener shows.

**Follow-ups:**
- *"How do you delegate \`focus\` or \`mouseenter\`?"* → they don't bubble: use \`focusin\`/\`mouseover\`, or register the root listener with \`{ capture: true }\` — the capture phase runs for every event.
- *"Shadow DOM?"* → events from inside a shadow root are retargeted to the host; use \`event.composedPath()\` instead of walking \`parentElement\`.
- *"How does React do this?"* → one listener per event type on the root container, then it walks the **fiber tree** (not the DOM) collecting \`onX\` props — which is why events in portals bubble to their React parents.
- *"Performance?"* → \`matches()\` per ancestor is cheap; for very hot events (\`pointermove\`, \`scroll\`) prefer direct, \`passive\` listeners and throttling.`,
};

const cssSpecificity: Exercise = {
  id: 'css-specificity',
  title: 'Compute CSS specificity',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 20,
  tags: ['css', 'specificity', 'parsing'],
  prompt: `Write \`specificity(selector)\` returning the \`[A, B, C]\` tuple for **one** complex selector, plus \`compareSpecificity(a, b)\`.

| Column | Counts |
|---|---|
| A | ID selectors \`#id\` |
| B | classes \`.x\`, attribute selectors \`[type="text"]\`, pseudo-classes \`:hover\`, \`:nth-child(2n+1)\` |
| C | type selectors \`div\`, pseudo-elements \`::before\` (and the legacy single-colon \`:before\`, \`:after\`, \`:first-line\`, \`:first-letter\`) |
| — | \`*\` and combinators (descendant space, \`>\`, \`+\`, \`~\`) |

\`\`\`ts
specificity('#nav > a.active:hover');            // [1, 2, 1]
specificity('input[type="text"]::placeholder');  // [0, 1, 2]
compareSpecificity([1, 0, 0], [0, 11, 0]);       // > 0 — columns never carry
\`\`\`

Don't count characters inside attribute values: \`[data-path="a.b#c"]\` is \`[0, 1, 0]\`.

**Stretch (also tested):** \`:where(...)\` contributes \`0\`; \`:is(...)\`, \`:not(...)\` and \`:has(...)\` contribute their **most specific** argument. Arguments are comma-separated selector lists and may contain nested functional pseudo-classes or relative selectors like \`:has(> img)\`.

**What the interviewer is looking for:** a clean single-pass scanner rather than a pile of regexes that double-count, recursion for nested selector lists, and being able to *explain* the cascade while you code.`,
  starter: specificityStarter,
  solution: specificitySolution,
  tests: specificityTests,
  hints: [
    'Scan with an index `i` and branch on `s[i]`: `#` → A, `.` → B, `[` → B, `::` → C, `:` → B (or C for the four legacy pseudo-elements), a letter → C (type selector), and `*`, whitespace, `>`, `+`, `~` → nothing. After each token, skip past its name.',
    'Write `findClose(s, i)` that returns the index of the matching `]` or `)` — tracking nesting depth and skipping quoted strings — so attribute values and pseudo-class arguments are skipped as a unit.',
    'For `:is(` / `:not(` / `:has(`, split the argument on commas at depth 0, call `specificity` recursively on each part, and add the largest (use `compareSpecificity`). For `:where(` add nothing. Other functional pseudo-classes such as `:nth-child(2n+1)` count as one B.',
  ],
  explanation: `**Approach:** a hand-written scanner with one branch per token type, \`findClose\` for brackets, and recursion for selector-list arguments. O(n) for flat selectors; nested functional pseudo-classes re-scan their arguments, so O(n · depth) in the worst case.

**Why not regexes?** Counting with patterns like \`/#[\\w-]+/g\` double-counts \`#\` and \`.\` inside attribute values and can't handle nesting such as \`:not(:is(.a, #b))\`. A tokenizer is what browser engines and libraries do.

**Rules worth saying while you code:**
- Compare **column by column** — no base-10 arithmetic.
- \`:is()\`/\`:not()\`/\`:has()\` take their max argument **even if a less specific argument is the one that matched** — specificity belongs to the selector, not to the match.
- \`:where()\` = 0 is why resets and component libraries wrap selectors in it: consumers can override with a single class.
- \`:nth-child(An+B of S)\` = one pseudo-class + the max of \`S\` (the reference solution handles it).
- Inline styles and \`!important\` are **not** specificity; they're separate cascade steps (element-attached styles; origin and importance).
- Native nesting (\`.a, #b { & .c {} }\`) desugars to \`:is(.a, #b) .c\`, so the nested rule gets ID-level specificity everywhere.

**Follow-ups:**
- *"What's the specificity of \`a, .b\`?"* → a selector list has none; each complex selector is evaluated separately and the matching one is used.
- *"Given two rules, which wins?"* → walk the cascade: origin/importance → inline → layers → specificity → order of appearance.
- *"Edge cases you skipped?"* → namespaces (\`svg|a\`), \`::slotted()\`/\`::part()\` arguments and \`:host()\` have their own rules; the scanner here handles CSS escapes (\`\\\`) but not namespaces.`,
};

const domToVdom: Exercise = {
  id: 'dom-to-vdom',
  title: 'Serialize the DOM to JSON and back',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 12,
  tags: ['dom', 'virtual dom', 'recursion', 'security'],
  prompt: `Serialize a DOM subtree into a JSON tree and render it back — the idea behind virtual DOM libraries, SSR payloads and "save this editor's content" features.

\`\`\`ts
toVDom(paragraph); // <p class="lead">Hi <b>there</b></p>
// { type: 'p', props: { class: 'lead' },
//   children: ['Hi ', { type: 'b', props: {}, children: ['there'] }] }

render(vnode); // a detached <p class="lead">Hi <b>there</b></p>
\`\`\`

Requirements:
- Elements → \`{ type, props, children }\` with a lower-case \`type\` and **attributes as written** (\`class\`, \`data-*\`, boolean attributes as \`''\`).
- Text nodes → strings. Comments and other node types → \`null\`, and are dropped from \`children\`.
- \`render\` builds real nodes with \`createElement\` / \`createTextNode\` / \`setAttribute\` and returns a **detached** node.
- Text is inserted **as text** — never parsed as HTML.
- Round trip: \`render(toVDom(el)).outerHTML === el.outerHTML\`.

**What the interviewer is looking for:** recursion over \`childNodes\` (not \`children\` — you'd lose the text), \`nodeType\` checks, attributes vs properties, and the security point that building with \`innerHTML\` would execute injected markup.`,
  starter: vdomStarter,
  solution: vdomSolution,
  tests: vdomTests,
  hints: [
    'Branch on `node.nodeType`: `Node.TEXT_NODE` → return its `textContent`; `Node.ELEMENT_NODE` → build an object; anything else → `null`.',
    'Iterate `el.attributes` (each has `.name` and `.value`) for props, and `el.childNodes` — not `children` — so text nodes are included.',
    '`render`: a string → `document.createTextNode(s)`; an element → `createElement(type)`, `setAttribute` for each prop, then append `render(child)` for each child. Never use `innerHTML`.',
  ],
  explanation: `**Approach:** two mirror-image recursive functions. \`toVDom\` dispatches on \`nodeType\`; \`render\` dispatches on \`typeof vnode === 'string'\`. Both are O(n) in the number of nodes.

**Attributes vs properties:** this serializes *attributes* (the markup), not *properties* (live state). An \`<input>\` the user typed into has a \`value\` property that differs from its \`value\` attribute — a "save the form" serializer must read properties too. Likewise \`class\` (attribute) vs \`className\` (property): React uses property names, which is why JSX says \`className\`.

**Security:** \`createTextNode\` and \`setAttribute\` never parse HTML, so \`'<img onerror=…>'\` stays inert text. Building the same output by concatenating strings into \`innerHTML\` is a textbook XSS hole (Day 12). Note that \`setAttribute('href', 'javascript:…')\` is still dangerous — URLs need separate sanitising.

**Why a \`DocumentFragment\` in the solution?** Children go into the fragment, and the fragment into the element in one operation. With a detached element it's mostly style; when inserting into a live document it means one mutation record and one update of live collections.

**Follow-ups:**
- *"Support SVG"* → SVG elements need \`document.createElementNS('http://www.w3.org/2000/svg', type)\`; track the namespace while recursing.
- *"Now diff two vnode trees and patch the DOM"* → reconciliation: compare \`type\`, patch changed props, recurse into children, and use **keys** to match children across reorders — React's algorithm in miniature.
- *"What about event handlers?"* → functions aren't serializable; libraries keep them as props (\`onClick\`) and attach them during render.`,
};

const infiniteList: Exercise = {
  id: 'infinite-list-observer',
  title: 'InfiniteList with IntersectionObserver',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 25,
  preview: true,
  tags: ['react', 'intersection observer', 'infinite scroll', 'effects', 'refs'],
  prompt: `Build an infinite-scrolling list that loads the next page when a **sentinel** element scrolls into view, using \`IntersectionObserver\` — no scroll listeners, no \`getBoundingClientRect\`.

\`\`\`tsx
<InfiniteList loadPage={(page) => fetchItems(page)} />
// loadPage resolves to { items: Item[]; nextPage: number | null }
\`\`\`

Requirements:
1. On mount, call \`loadPage(1)\` and render the items as \`<li>\` elements inside \`<ul aria-label="Results">\`.
2. While a request is in flight, show \`<p role="status">Loading…</p>\`.
3. While there are more pages, render \`<div data-testid="sentinel" />\` **after** the list and observe it with an \`IntersectionObserver\` created with \`{ rootMargin }\` (default \`'200px'\`, so loading starts before the user reaches the bottom).
4. When the sentinel **is intersecting**, load \`nextPage\` and **append** its items. Ignore non-intersecting entries.
5. **Never** have two requests in flight, however often the observer fires.
6. When \`nextPage\` is \`null\`: remove the sentinel, stop observing, and show "You've reached the end."
7. Disconnect the observer on unmount.
8. Re-rendering with a **new \`loadPage\` function** (an inline arrow in the parent) must **not** trigger another request.
9. **Stretch:** on error, show \`<div role="alert">\` containing "Couldn't load more items." and a **Retry** button that retries the **same** page.

The tests replace \`IntersectionObserver\` with a fake (via \`vi.stubGlobal\`) and trigger intersections by hand. The preview pane uses the real one — scroll it.

**What the interviewer is looking for:** effect cleanup, refs for mutable flags that the observer callback must see (stale closures!), the in-flight guard, and you raising the edge cases: a first page too short to fill the screen, StrictMode double effects, unmounting mid-request, and virtualization for very long lists.`,
  starter: infiniteStarter,
  solution: infiniteSolution,
  tests: infiniteTests,
  hints: [
    'Keep `items`, `status` and `hasMore` in state (they drive rendering), but keep `nextPage` and an "in flight" flag in **refs**: the observer callback is created once, and would otherwise read stale values.',
    'Write one `loadMore()` that returns early if a request is in flight or there is no next page; set the flag before `await` and clear it in `finally`. Call it from a mount effect and from the observer callback.',
    'Observe in an effect: `const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) void loadMore(); }, { rootMargin }); io.observe(sentinel); return () => io.disconnect();`, re-run when the sentinel appears or disappears. Keep `loadPage` in a ref updated by an effect so `loadMore` can be a stable `useCallback(…, [])`.',
  ],
  explanation: `**Approach:** state for what's rendered (\`items\`, \`status\`, \`hasMore\`); refs for bookkeeping the observer callback must read synchronously (\`nextPageRef\`, \`inFlightRef\`); a stable \`loadMore\` that calls the latest \`loadPage\` through a ref; and two effects — the initial load, and an observer effect keyed on whether the sentinel is rendered.

**Why a ref, not state, for the guard?** Two intersection callbacks can arrive before React re-renders; a state flag read from a closure would still be \`false\` for the second one. A ref updates synchronously.

**Why the "latest ref" for \`loadPage\`?** If \`loadMore\` depended on \`loadPage\`, every parent re-render with an inline arrow would recreate \`loadMore\`, re-run the mount effect and fetch again — the test for requirement 8 catches exactly that. React 19.2's \`useEffectEvent\` is the built-in version of this pattern.

**Edge cases to raise unprompted:**
- **Short pages:** if page 1 doesn't fill the viewport, the sentinel *stays* visible and the observer won't fire again — it reports *changes*. Fix: re-create or re-observe after each page (\`observe()\` delivers a fresh initial entry), e.g. include \`items.length\` in the observer effect's dependencies.
- **StrictMode** runs effects twice in development; the in-flight guard dedupes the first request.
- **Unmount mid-request:** React ignores state updates after unmount, but pass an \`AbortSignal\` to \`loadPage\` so the network request is cancelled too.
- **Ordering:** one request at a time guarantees pages append in order — no race between page 2 and page 3.
- **Accessibility & UX:** \`role="status"\` announces loading; keep a "Load more" button as a fallback; infinite scroll makes a footer unreachable, so prefer pagination for content people need to navigate back to.
- **Thousands of rows:** pair it with **virtualization** (render only visible rows, e.g. TanStack Virtual).

**In production** you'd likely let TanStack Query's \`useInfiniteQuery\` own the data (\`fetchNextPage\`, \`hasNextPage\`, \`isFetchingNextPage\`, caching, dedupe) and keep only the observer part of this component.`,
};

const day: Day = {
  number: 8,
  title: 'Browser, DOM & CSS Fundamentals',
  tagline: 'From bytes to pixels: the rendering pipeline, the event system, and the CSS mechanisms interviewers probe.',
  summary:
    'Every frontend loop includes browser fundamentals: what happens between a URL and pixels, why one style change triggers layout and another only compositing, how events travel through the DOM, and which CSS rule wins and why. Today you build a precise model of the rendering pipeline, the event system and client storage, and of the CSS mechanisms behind most layout bugs — cascade and layers, specificity, stacking contexts, formatting contexts, flex and grid sizing. Then you implement event delegation, a specificity calculator, DOM serialization and an IntersectionObserver-powered infinite list, and drill five interview layouts in fe-gym.',
  objectives: [
    'Answer "what happens when you type a URL?" with a frontend focus in about two minutes',
    'Explain what blocks parsing and rendering, and choose between classic, `async`, `defer` and module scripts',
    'Classify a change as layout, paint or composite-only, and fix layout thrashing',
    'Explain capture/bubble, `target` vs `currentTarget`, `stopPropagation` vs `preventDefault`, and React’s root delegation',
    'Implement event delegation and an IntersectionObserver-based infinite list',
    'Compute specificity (including `:is`/`:not`/`:has`/`:where`) and walk the cascade including `@layer`',
    'Debug `z-index` with stacking contexts, and fix flex/grid overflow with `min-width: 0` / `minmax(0, 1fr)`',
    'Build five classic layouts from memory with grid, flex, sticky, container queries and a portal or the top layer',
  ],
  skills: ['browser', 'css', 'performance', 'react'],
  blocks: [
    {
      kind: 'review',
      id: 'review',
      title: 'Warm-up review',
      minutes: 15,
      intro: 'Spaced repetition from Days 1–7. Answer out loud before flipping each card — React and async cards matter today too, since we connect the browser pipeline to effects and the event loop.',
    },
    {
      kind: 'lesson',
      id: 'rendering-pipeline',
      title: 'How the browser renders: from bytes to pixels',
      minutes: 30,
      body: renderingPipeline,
      checks: [
        {
          id: 'defer-async-order',
          prompt: 'The `<head>` contains these three external scripts. Which statement is **guaranteed**?',
          code: `<script defer src="a.js"></script>\n<script async src="b.js"></script>\n<script defer src="c.js"></script>`,
          codeLang: 'html',
          choices: [
            'They run in the order a, b, c',
            'a runs before c, both after the document has been parsed; b may run before, between or after them',
            'b runs first because async scripts are prioritised',
            'All three run before the parser reaches `<body>`',
          ],
          answer: 1,
          explanation:
            '`defer` scripts execute after parsing finishes, **in document order**, before `DOMContentLoaded` — so a always precedes c. `async` scripts execute as soon as they are downloaded, with no ordering relative to anything else: b could run while the parser is still working (before a and c) or after them if it downloads slowly. "a, b, c" is only true by luck, and nothing makes async scripts run first or makes any of them run before `<body>` is parsed.',
        },
        {
          id: 'composite-only-change',
          prompt: 'You animate a card sliding in. Which change can skip **both** layout and paint when the card is on its own compositing layer?',
          choices: ['`left: 0` → `left: 300px`', '`margin-left` from 0 to 300px', '`transform: translateX(300px)`', '`background-position` change'],
          answer: 2,
          explanation:
            '`transform` (and `opacity`) only change how an already-rasterised layer is composited, so the browser skips layout and paint — and CSS animations of these can run on the compositor thread. `left` and `margin-left` change geometry, forcing layout (then paint) every frame. `background-position` doesn\'t move the box but changes its pixels, so it needs a repaint every frame.',
        },
        {
          id: 'display-none-vs-visibility',
          prompt: 'Which statement about `display: none` and `visibility: hidden` is correct?',
          choices: [
            'Both remove the element from the render tree',
            '`display: none` generates no box (no space taken); `visibility: hidden` keeps the box and its space but doesn\'t paint it',
            '`visibility: hidden` generates no box; `display: none` keeps the space',
            'They are identical except for screen readers',
          ],
          answer: 1,
          explanation:
            'An element with `display: none` (and all its descendants) is excluded from the layout tree — it takes no space and toggling it causes layout. `visibility: hidden` keeps the box in layout (it still takes space) and simply isn\'t painted; a descendant can even override it with `visibility: visible`. Both hide content from assistive technology, so "only screen readers differ" is wrong too.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'dom-events',
      title: 'DOM, events, observers & storage',
      minutes: 30,
      body: domEvents,
      checks: [
        {
          id: 'event-order-capture-bubble',
          prompt: 'The user clicks the button. Which listener runs **first**?',
          code: `// <div id="parent"><button id="btn">Go</button></div>\ndocument.addEventListener('click', () => log('document bubble'));\nbtn.addEventListener('click', () => log('button'));\nparent.addEventListener('click', () => log('parent capture'), { capture: true });`,
          codeLang: 'ts',
          choices: ['button', 'parent capture', 'document bubble', 'Whichever was registered first'],
          answer: 1,
          explanation:
            'The capture phase runs first, from `window` down towards the target, so the parent\'s capture listener fires before the event reaches the button. Then the target listener runs, then bubble listeners on the way back up (`document bubble` last). Registration order only matters between listeners on the **same** node and phase.',
        },
        {
          id: 'target-vs-currenttarget',
          prompt: 'A click listener is attached to a `<ul>`. The user clicks a `<span>` inside an `<li>`. Inside the listener, what are `event.target` and `event.currentTarget`?',
          choices: [
            'target = `<ul>`, currentTarget = `<span>`',
            'target = `<span>`, currentTarget = `<ul>`',
            'target = `<li>`, currentTarget = `<ul>`',
            'Both are the `<span>`',
          ],
          answer: 1,
          explanation:
            '`target` is the deepest element the event was dispatched to — the `<span>`, not the `<li>` you probably care about (hence `closest(\'li\')` in delegation). `currentTarget` is the element whose listener is currently running — the `<ul>`. It is reset to `null` once dispatch finishes.',
        },
        {
          id: 'storage-sent-to-server',
          prompt: 'Which client-side storage is sent to the server **automatically** with matching HTTP requests?',
          choices: ['localStorage', 'sessionStorage', 'Cookies', 'IndexedDB'],
          answer: 2,
          explanation:
            'Cookies are attached by the browser to every request that matches their domain, path and `SameSite` rules — which is why they suit session identifiers (ideally `HttpOnly`) and why big cookies slow down every request. `localStorage`, `sessionStorage` and IndexedDB never leave the browser unless your code sends their contents.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'css-fundamentals',
      title: 'CSS for interviews: cascade, boxes, stacking, flex & grid',
      minutes: 40,
      body: cssFundamentals,
      checks: [
        {
          id: 'specificity-is-where',
          prompt: 'Which selector has the **highest** specificity?',
          choices: ['`:where(#app) .btn`', '`.toolbar .btn`', '`:is(#app, .page) button`', '`button.btn.primary`'],
          answer: 2,
          explanation:
            '`:is(#app, .page) button` takes its most specific argument (`#app`) → (1,0,1), even when `.page` is what matched. `:where(#app) .btn` is (0,1,0) because `:where` contributes nothing. `.toolbar .btn` is (0,2,0) and `button.btn.primary` is (0,2,1) — more classes, but no ID, and columns never carry.',
        },
        {
          id: 'stacking-context-opacity',
          prompt: 'Can the child appear **above** `.sibling`?',
          code: `<div class="parent" style="opacity: 0.99">\n  <div class="child" style="position: relative; z-index: 999">Child</div>\n</div>\n<div class="sibling" style="position: relative; z-index: 1">Sibling</div>`,
          codeLang: 'html',
          choices: [
            'Yes — 999 is greater than 1',
            'No — `opacity < 1` makes `.parent` a stacking context painted at level 0, so everything inside it stays below `.sibling` (z-index 1)',
            'Yes, but only if `.parent` also gets `position: relative`',
            'No — `z-index` never works on children of transparent elements',
          ],
          answer: 1,
          explanation:
            '`opacity` below 1 creates a stacking context. The child\'s `z-index: 999` only orders it **inside** `.parent`; in the root context `.parent` is painted like a positioned element with `z-index: 0`, below `.sibling` at 1. Adding `position: relative` alone changes nothing; giving `.parent` a `z-index` of 2 or more would lift it (and its child) above. `z-index` does work inside transparent elements — just locally.',
        },
        {
          id: 'flex-1-meaning',
          prompt: 'What does `flex: 1` expand to?',
          choices: ['`flex: 1 0 auto`', '`flex: 1 1 0%`', '`flex: 1 1 auto`', '`flex: 0 1 auto`'],
          answer: 1,
          explanation:
            '`flex: 1` sets grow 1, shrink 1, **basis 0%** — items start from zero and share the space equally regardless of content. `flex: auto` is `1 1 auto` (content size first, then share the extra), `0 1 auto` is the initial value (`flex: initial`), and `1 0 auto` is a grow-only item that can\'t shrink.',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'browser-css-quiz',
      title: 'Quiz: specificity, stacking, events & the pipeline',
      minutes: 15,
      intro: 'Work each one out on paper first — compute the specificity tuples, draw the stacking contexts, trace the event path. These code questions use the DOM, so they are not runnable here; the explanations walk through each step.',
      questions: [
        {
          id: 'quiz-id-vs-classes',
          prompt: 'The link is inside `<nav id="nav" class="nav">` and inside `.menu .item`. While it is **hovered**, what colour is it?',
          code: `#nav a { color: red; }\n.nav .menu .item a:hover { color: blue; }`,
          codeLang: 'css',
          choices: ['Red', 'Blue — `:hover` rules always win while hovering', 'Blue — it has more selectors', 'Whichever rule comes last'],
          answer: 0,
          explanation:
            '`#nav a` is (1,0,1); `.nav .menu .item a:hover` is (0,4,1). Column A decides: one ID beats any number of classes and pseudo-classes, so the link stays **red** even while hovered. `:hover` has no special priority — it is just one more B. Source order only matters when specificity ties, which it doesn\'t here.',
        },
        {
          id: 'quiz-is-specificity',
          prompt: 'The `.title` is inside `.sidebar`; there is **no** `#main` element on the page. What colour is it?',
          code: `:is(#main, .sidebar) .title { color: purple; }\n.sidebar .title.title { color: orange; }`,
          codeLang: 'css',
          choices: ['Purple', 'Orange', 'Purple only if `#main` exists', 'Inherited from the parent'],
          answer: 0,
          explanation:
            '`:is()` contributes the specificity of its **most specific argument**, whether or not that argument matched: `:is(#main, .sidebar) .title` is (1,1,0). `.sidebar .title.title` (a repeated class does count twice) is (0,3,0). Column A wins → **purple**. If you swapped `:is` for `:where`, the first rule would drop to (0,1,0) and orange would win.',
        },
        {
          id: 'quiz-unlayered-wins',
          prompt: 'What background does `<button id="save" class="btn">` get?',
          code: `@layer components {\n  #save.btn { background: green; }\n}\n.btn { background: gray; }`,
          codeLang: 'css',
          choices: ['Green — higher specificity', 'Gray — unlayered styles beat layered styles', 'Green — layers always beat unlayered styles', 'Gray — because it comes last in the file'],
          answer: 1,
          explanation:
            'Layers are compared **before** specificity. For normal (non-`!important`) declarations, unlayered styles beat every layer, so `.btn` (0,1,0) beats `#save.btn` (1,1,0). Source order is not the reason: if `.btn` came first in the file the result would be the same. This is why wrapping third-party or legacy CSS in a layer makes it trivially overridable.',
        },
        {
          id: 'quiz-important-layers',
          prompt: 'Both rules apply to the same element. What padding does it get?',
          code: `@layer base, utilities;\n\n@layer utilities {\n  .p-0 { padding: 0 !important; }\n}\n@layer base {\n  .card { padding: 2rem !important; }\n}`,
          codeLang: 'css',
          choices: ['0 — utilities is the later layer', '2rem — for `!important`, earlier layers win', '0 — it is written first', 'They cancel out and the initial value (0) applies'],
          answer: 1,
          explanation:
            'For `!important` declarations the layer order **reverses**: important declarations in earlier layers beat those in later layers (mirroring how user `!important` beats author `!important`). So `base` wins → `2rem`. Without `!important`, `utilities` would win. This reversal lets a low layer (a reset or design-system base) protect a few declarations from later layers.',
        },
        {
          id: 'quiz-inherited-link-color',
          prompt: 'With no other author CSS, what colour is the link text?',
          code: `/* CSS */\n#article { color: crimson; }\n\n<!-- HTML -->\n<div id="article"><p>Read the <a href="/docs">docs</a></p></div>`,
          codeLang: 'css',
          choices: ['Crimson — inherited from `#article`, which has an ID', 'The browser\'s default link colour', 'Black', 'Crimson, but only once visited'],
          answer: 1,
          explanation:
            'Inheritance only supplies a value when **no declaration** targets the element. The browser\'s user-agent stylesheet has rules that target links directly (the HTML spec\'s defaults are `:link { color: #0000EE; }` and `:visited { color: #551A8B; }`), so the link gets the UA link colour; the inherited crimson never applies, no matter how specific `#article` is. That\'s why resets often include `a { color: inherit; }`.',
        },
        {
          id: 'quiz-event-full-order',
          prompt: 'What does `btn.click()` log?',
          code: `// <div id="outer"><div id="inner"><button id="btn">Go</button></div></div>\nouter.addEventListener('click', () => log('outer bubble'));\nouter.addEventListener('click', () => log('outer capture'), true);\ninner.addEventListener('click', () => log('inner bubble'));\nbtn.addEventListener('click', () => log('btn'));\ninner.addEventListener('click', () => log('inner capture'), { capture: true });\nbtn.click();`,
          codeLang: 'ts',
          choices: [
            'btn, inner bubble, outer bubble, inner capture, outer capture',
            'outer capture, inner capture, btn, inner bubble, outer bubble',
            'outer bubble, outer capture, inner bubble, btn, inner capture',
            'outer capture, outer bubble, inner capture, inner bubble, btn',
          ],
          answer: 1,
          explanation:
            'The event goes **down** in the capture phase (outer capture, then inner capture — registration order across different nodes doesn\'t matter), fires at the target (btn), then **bubbles up** (inner bubble, then outer bubble). `true` as the third argument is shorthand for `{ capture: true }`. `click()` dispatches a bubbling event synchronously.',
        },
        {
          id: 'quiz-stop-in-capture',
          prompt: 'What does `btn.click()` log now?',
          code: `outer.addEventListener('click', (e) => {\n  log('outer capture');\n  e.stopPropagation();\n}, { capture: true });\nouter.addEventListener('click', () => log('outer bubble'));\nbtn.addEventListener('click', () => log('btn'));\nbtn.click();`,
          codeLang: 'ts',
          choices: ['outer capture, btn, outer bubble', 'outer capture, btn', 'outer capture', 'btn, outer bubble'],
          answer: 2,
          explanation:
            '`stopPropagation()` stops the event moving to the **next node in the path**. Called during the capture phase on `outer`, it never reaches `btn` (target phase) or comes back up to `outer`\'s bubble listener. This is how "capture and stop" patterns can swallow clicks before children see them — and why stopping propagation high in the tree is so disruptive.',
        },
        {
          id: 'quiz-stop-vs-prevent',
          prompt: 'A parent element has `onclick = (e) => e.stopPropagation()`. The user clicks an `<a href="/pricing">` inside it. What happens?',
          choices: [
            'Nothing — the click was stopped',
            'The browser navigates to /pricing; stopPropagation doesn\'t cancel default actions',
            'The browser navigates only if the link has `target="_self"`',
            'It throws, because links can\'t be inside elements with handlers',
          ],
          answer: 1,
          explanation:
            'Propagation and default actions are independent. `stopPropagation()` only stops other listeners further along the path from running; the link\'s default action (navigation) still happens. To cancel navigation you need `e.preventDefault()` — and then, to keep things accessible, handle navigation yourself (that\'s what client-side routers do).',
        },
        {
          id: 'quiz-z-index-puzzle',
          prompt: 'Where does the dropdown render?',
          code: `<header style="position: relative; z-index: 1">\n  <div class="dropdown" style="position: absolute; z-index: 9999">Menu</div>\n</header>\n<main style="position: relative; z-index: 2">Content</main>`,
          codeLang: 'html',
          choices: [
            'Above `main` — 9999 is the highest z-index on the page',
            'Below `main` — it can only compete inside the header\'s stacking context, and the header (1) is below main (2)',
            'Above `main`, because absolutely positioned elements escape stacking contexts',
            'It depends on DOM order only',
          ],
          answer: 1,
          explanation:
            '`position: relative` with a `z-index` makes `header` a stacking context. Its descendants\' z-indexes only order them **within** it; the header as a whole sits at level 1 in the root context, below `main` at level 2. Absolute positioning doesn\'t escape stacking contexts. Fixes: lift the header above `main`, avoid the stacking context on `main`, or render the dropdown in a portal / the top layer (`popover`).',
        },
        {
          id: 'quiz-stacking-creators',
          prompt: 'Which of these does **not** create a stacking context on its own?',
          choices: ['`opacity: 0.99`', '`transform: translateZ(0)`', '`position: relative` (with `z-index: auto`)', '`isolation: isolate`', '`position: fixed`'],
          answer: 2,
          explanation:
            'A relatively positioned element only creates a stacking context once it also has a `z-index` other than `auto`. `opacity < 1` and any `transform` always create one (a common surprise when an animation leaves a transform behind), `isolation: isolate` exists solely to create one, and `position: fixed` (like `sticky`) always creates one.',
        },
        {
          id: 'quiz-background-color-stages',
          prompt: 'JavaScript runs `el.style.backgroundColor = "tomato"`. Which rendering stages does the browser run for the next frame?',
          choices: ['Style → Layout → Paint → Composite', 'Style → Paint → Composite', 'Composite only', 'Layout → Composite'],
          answer: 1,
          explanation:
            'Any style change needs a style recalculation. A background colour doesn\'t change geometry, so layout is skipped, but the pixels change, so the element\'s layer must be repainted before compositing. A `width` change would add layout; a `transform` or `opacity` change on a promoted layer would skip paint too.',
        },
        {
          id: 'quiz-forced-layouts',
          prompt: 'There are 5 boxes and layout is up to date when the loop starts. How many **forced synchronous layouts** happen inside the loop?',
          code: `for (const box of boxes) {\n  const w = box.offsetWidth;          // read\n  box.style.height = \`\${w / 2}px\`;    // write\n}`,
          codeLang: 'ts',
          choices: ['0', '1', '4', '5'],
          answer: 2,
          explanation:
            'The first read is free — layout is clean. Each write invalidates layout, so every **subsequent** read must recompute it synchronously: iterations 2–5 each force one layout → **4**. (The final write is laid out normally before the next frame.) Fix: read all widths into an array first, then write all heights — zero forced layouts, one normal layout.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'dom-css-exercises',
      title: 'Implement it: delegation, specificity, DOM trees, infinite scroll',
      minutes: 50,
      intro:
        'Interview conditions: timer on, talk out loud, no AI. If time is short, prioritise **delegate → InfiniteList → specificity** (the most-asked); do the tree-walking warm-up and the vdom serializer in the practice bank later. After passing each one, read the explanation — the follow-up questions are what interviewers ask next.',
      exercises: [findByClassName, delegateEvents, cssSpecificity, domToVdom, infiniteList],
    },
    {
      kind: 'lab',
      id: 'css-layout-drills',
      track: 'build',
      title: 'Build: five interview layouts in fe-gym',
      minutes: 25,
      body: labCssLayouts,
      checklist: [
        'Holy-grail grid with named areas: footer at the bottom on short pages, single column below 64rem, long URL doesn’t widen `main`',
        'Sticky header and sticky sidebar work — and you broke sticky with an `overflow` ancestor and can explain why',
        'Card grid uses `repeat(auto-fit, minmax(min(16rem, 100%), 1fr))`, no media queries, no horizontal scroll at 320px',
        'Modal overlay centred with grid, scrolls internally, locks page scroll, rendered via a portal (and you saw the transformed-parent bug without it)',
        'Container-query card switches layout based on its slot, verified by resizing the slot rather than the viewport',
        'One-sentence mechanism per drill written in notes/day08.md',
      ],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–120 seconds before revealing the model answer. Lead with one sentence, then the mechanism, then a concrete example or fix. For the CSS questions, sketch the boxes or stacking contexts on paper as you talk.',
    },
  ],
  flashcards: [
    { id: 'render-pipeline-stages', front: 'The rendering pipeline stages, in order?', back: 'Parse HTML → DOM and CSS → CSSOM, then **Style** (computed styles / layout tree) → **Layout** (geometry) → **Paint** (draw commands) → **Composite** (rasterise and assemble layers).' },
    { id: 'css-render-blocking', front: 'Why is CSS render-blocking?', back: 'The browser won\'t paint until head stylesheets are parsed into the CSSOM, to avoid a flash of unstyled content. It also delays the execution of later classic scripts, which might read styles.' },
    { id: 'async-vs-defer', front: '`async` vs `defer` on a script?', back: 'Both fetch in parallel. `defer`: runs after parsing, **in document order**, before `DOMContentLoaded`. `async`: runs as soon as it arrives, **no order**. Module scripts defer by default.' },
    { id: 'display-none-vs-visibility', front: '`display: none` vs `visibility: hidden`?', back: '`display: none`: no box, takes no space, not in the layout tree. `visibility: hidden`: box laid out (takes space) but not painted.' },
    { id: 'composite-only-props', front: 'Which properties can change with composite only?', back: '`transform` and `opacity` (on an element with its own layer). No layout, no paint — and CSS animations of them can run on the compositor thread.' },
    { id: 'forced-sync-layout', front: 'What is a forced synchronous layout?', back: 'Reading geometry (`offsetHeight`, `getBoundingClientRect()`, `getComputedStyle`…) after a style write: the browser must run layout immediately. Repeating write/read in a loop = layout thrashing.' },
    { id: 'will-change-caveats', front: 'Costs of `will-change: transform`?', back: 'Promotes a layer up front (GPU memory), creates a **stacking context** and a **containing block for fixed descendants**. Use for imminent animations only, not everywhere.' },
    { id: 'event-phases', front: 'The three event phases?', back: '**Capture** (window → target\'s parent), **target**, **bubble** (target\'s parent → window). Non-bubbling events still go through capture.' },
    { id: 'target-vs-currenttarget', front: '`event.target` vs `event.currentTarget`?', back: '`target`: where the event was dispatched (deepest element). `currentTarget`: the element whose listener is running now. `currentTarget` is `null` after dispatch.' },
    { id: 'non-bubbling-events', front: 'How do you delegate `focus` or `mouseenter`?', back: 'They don\'t bubble. Use `focusin`/`focusout` and `mouseover`/`mouseout`, or listen with `{ capture: true }` — capture runs for every event.' },
    { id: 'passive-listener', front: 'What does `{ passive: true }` do?', back: 'Promises the listener won\'t call `preventDefault()`, so the browser can scroll immediately without waiting for JS. `preventDefault()` inside it is ignored.' },
    { id: 'react-root-delegation', front: 'Where does React (17+) attach event listeners?', back: 'One listener per event type on the **root container** (`createRoot`), both phases. It then propagates through the **React tree**, so portal events bubble to React parents.' },
    { id: 'storage-quick-compare', front: 'Cookies vs localStorage vs sessionStorage vs IndexedDB in one line each?', back: 'Cookies: ~4 KB, **sent to the server**. localStorage: ~5 MB, sync, per origin. sessionStorage: same, per **tab**. IndexedDB: **async**, large, structured, works in workers.' },
    { id: 'specificity-columns', front: 'The three specificity columns?', back: '**A** IDs; **B** classes, attributes, pseudo-classes; **C** types, pseudo-elements. `*` and combinators count nothing. Compared column by column — no carrying.' },
    { id: 'is-where-specificity', front: 'Specificity of `:is()`, `:not()`, `:has()` and `:where()`?', back: '`:is/:not/:has`: their **most specific argument** (even if another argument matched). `:where`: always **zero**.' },
    { id: 'layer-precedence', front: 'How do cascade layers interact with specificity?', back: 'Layers are compared first: later layers beat earlier ones regardless of specificity, and **unlayered beats layered**. For `!important`, the order reverses.' },
    { id: 'stacking-context-creators', front: 'Name 6 things that create a stacking context.', back: 'Positioned + `z-index` ≠ auto; `fixed`/`sticky`; flex/grid item with `z-index`; `opacity < 1`; `transform`/`filter`/`clip-path`; `isolation: isolate`; `will-change`; `contain: paint`.' },
    { id: 'flex-1-expansion', front: '`flex: 1` vs `flex: auto`?', back: '`flex: 1` = `1 1 0%`: equal shares regardless of content. `flex: auto` = `1 1 auto`: content size first, then share the extra space.' },
    { id: 'flex-min-width-auto', front: 'Why does a flex item overflow instead of shrinking (ellipsis not working)?', back: 'Flex items default to `min-width: auto` = min-content width. Set `min-width: 0` (or `overflow: hidden`). In grid, use `minmax(0, 1fr)` instead of `1fr`.' },
    { id: 'auto-fit-vs-auto-fill', front: '`auto-fit` vs `auto-fill` in `repeat()`?', back: 'Both create as many tracks as fit. With few items, `auto-fill` keeps empty tracks (items stay narrow); `auto-fit` collapses them so items stretch.' },
  ],
  interviewQuestions: [
    {
      id: 'iq-url-to-pixels',
      kind: 'concept',
      question: 'What happens when you type a URL into the browser and press Enter? Focus on what matters for a frontend engineer.',
      answer: `**One-liner:** the browser fetches the document, streams it through the rendering pipeline — HTML and CSS into the DOM and CSSOM, then style, layout, paint and composite — and then runs the JavaScript that makes the page interactive.

**In order:**
1. **Navigation:** URL or search? HSTS may upgrade to HTTPS; a service worker or the HTTP cache may answer; back/forward can restore instantly from the bfcache.
2. **Network:** DNS, TCP + TLS (or QUIC for HTTP/3), then the request with that origin's cookies. Redirects and response headers (\`Content-Type\`, \`Cache-Control\`, CSP) shape what follows.
3. **Parsing:** HTML is parsed incrementally into the DOM while the **preload scanner** fetches images, scripts and stylesheets ahead of the parser. CSS is **render-blocking** and builds the CSSOM. Classic scripts block parsing; \`defer\` and module scripts run after parsing, in order; \`async\` runs whenever it arrives.
4. **Rendering:** style recalculation, layout, paint and compositing produce the first paint; \`DOMContentLoaded\` fires after parsing and deferred scripts, \`load\` after subresources; the largest element paints (LCP).
5. **Interactivity:** for a React app the bundle runs and React renders, or hydrates server-rendered HTML. From then on every state change re-enters style → layout → paint → composite.

**Where I'd go deeper depending on the role:** performance — critical CSS, \`defer\`, preloading the LCP image, caching; React — SSR, streaming and hydration cost; security — HTTPS, cookie attributes, CSP.`,
      followUps: ['What blocks the first paint?', 'What does the preload scanner do, and what can it not see?', 'What changes for a client-side navigation in an SPA?', 'Where does hydration fit in and what does it cost?'],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'iq-critical-rendering-path',
      kind: 'concept',
      question: 'Explain the critical rendering path. What blocks rendering, how do `async` and `defer` change script loading, and how would you speed up first paint?',
      answer: `**One-liner:** the critical rendering path is the minimum work before the first paint — fetch the HTML, build the DOM, fetch render-blocking CSS and build the CSSOM, run any parser-blocking scripts, then style, layout and paint.

**What blocks what:**
- **CSS blocks rendering** — no paint without the CSSOM, to avoid a flash of unstyled content — and it blocks *execution* of later classic scripts, which might read styles.
- **Classic scripts block parsing:** the parser stops to fetch and run them.
- **\`async\`:** fetched in parallel, executed as soon as it arrives, no ordering — good for independent third parties like analytics.
- **\`defer\`:** fetched in parallel, executed after parsing in document order, before \`DOMContentLoaded\` — the right default for app code. **Module scripts** behave like \`defer\` by default.

**How I'd shorten it:**
1. **Fewer critical bytes:** inline a small critical-CSS subset, load the rest without blocking, split CSS by route, and use \`media\` attributes for conditional sheets.
2. **No parser-blocking JS:** \`defer\` or \`type="module"\` for app code, \`async\` for third parties.
3. **Fewer round trips:** fast HTML (SSR/streaming, CDN caching), \`preconnect\` to critical origins, \`preload\` late-discovered critical resources like fonts and the LCP image.
4. **Measure:** Lighthouse and the Performance panel list render-blocking resources and show FCP/LCP.

**Trade-off:** inlining CSS speeds the first view but can't be cached across pages, so inline only the above-the-fold subset.`,
      followUps: ['Why does a stylesheet delay a script that comes after it?', 'When would you still use a classic blocking script?', 'What does `media="print"` on a stylesheet change?'],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'iq-reflow-repaint',
      kind: 'concept',
      question: 'What is the difference between reflow, repaint and compositing? What is layout thrashing and how do you avoid it?',
      answer: `**One-liner:** reflow (layout) recomputes geometry, repaint redraws pixels without changing geometry, and compositing just recombines already-painted layers — each is cheaper than the one before.

**Examples:**
- \`width\`, \`margin\`, \`font-size\`, inserting nodes or text → **layout**, then paint and composite. Layout can ripple: one size change moves siblings and descendants.
- \`color\`, \`background\`, \`box-shadow\` → **paint** and composite only.
- \`transform\` or \`opacity\` on a layer → **composite only**, and CSS animations of them can run on the compositor thread, staying smooth while JavaScript is busy. That's why I animate \`translate\` rather than \`left\`.

**Layout thrashing:** browsers defer layout until it's needed, but reading geometry — \`offsetHeight\`, \`getBoundingClientRect()\`, \`getComputedStyle\`, \`scrollTop\` — after a style write forces a **synchronous layout**. Write-read-write-read in a loop forces one per iteration.

**Fixes:** batch reads, then writes; schedule writes in \`requestAnimationFrame\`; cache measurements; use \`ResizeObserver\`/\`IntersectionObserver\` instead of polling; limit scope with \`contain\` or \`content-visibility: auto\`. In React, \`useLayoutEffect\` is where you measure after a DOM update but before paint — it costs a synchronous layout but avoids visible flicker.

**Finding it:** the Performance panel shows Layout events flagged "Forced reflow" with the offending stack trace; paint flashing in the Rendering tab shows what repaints.`,
      followUps: ['Which properties are cheap to animate, and why?', 'What does `will-change` do and what does it cost?', 'When is `useLayoutEffect` the right choice over `useEffect`?'],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'iq-event-delegation',
      kind: 'concept',
      question: 'What is event delegation? Why would you use it, and what are the pitfalls?',
      answer: `**One-liner:** event delegation means putting one listener on a common ancestor and using bubbling plus \`event.target\` to work out which descendant was interacted with.

**Why:** one listener instead of thousands (less memory and setup), and it covers elements added later with no re-binding. It's how jQuery's \`.on(type, selector)\` works and, conceptually, how React handles events — one listener per event type on the root container.

**Implementation:**
\`\`\`ts
list.addEventListener('click', (e) => {
  const item = (e.target as Element).closest('[data-id]');
  if (!item || !list.contains(item)) return;
  select(item.getAttribute('data-id'));
});
\`\`\`

**Pitfalls:**
- \`target\` is the deepest element (the icon inside the button) — use \`closest\`, not equality.
- \`closest\` can match the container itself or an ancestor outside it — check containment.
- Non-bubbling events (\`focus\`, \`blur\`, \`mouseenter\`) never reach the ancestor — use \`focusin\`/\`mouseover\` or a capture-phase listener.
- A \`stopPropagation()\` deeper in the tree silently breaks it.
- For very hot events like \`pointermove\`, per-event matching adds up — direct, passive, throttled listeners may be better.

**In React** I rarely hand-roll it because React already delegates, but for very large lists I'll use a single handler on the list reading \`data-id\` rather than a closure per row.`,
      followUps: ['How would you delegate focus events?', 'How does React 17+ delegate events, and what changed from React 16?', 'Implement delegate() so nested matches all fire.'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'iq-event-propagation',
      kind: 'concept',
      question: 'Explain event capturing and bubbling. What is the difference between `stopPropagation` and `preventDefault`?',
      answer: `**One-liner:** a DOM event travels in three phases — capture from \`window\` down to the target's parent, the target phase, then bubbling back up — and each listener runs in the phase it was registered for.

**Details:**
- \`addEventListener(type, fn)\` listens in the bubble phase; \`{ capture: true }\` in the capture phase. Capture happens for every event, even non-bubbling ones like \`focus\`, which is how an ancestor can still observe them.
- \`event.target\` is where it happened; \`event.currentTarget\` is the element whose listener is running.

**They're independent:**
- \`stopPropagation()\` stops the event travelling to further nodes; \`stopImmediatePropagation()\` also skips the remaining listeners on the current node.
- \`preventDefault()\` cancels the browser's **default action** — following a link, submitting a form, toggling a checkbox, scrolling on \`wheel\` — if the event is \`cancelable\`. It does not stop propagation, and it is ignored in \`passive\` listeners.

So a parent calling \`stopPropagation()\` on a link click doesn't stop navigation, and \`preventDefault()\` on a form submit doesn't stop ancestors hearing the event.

**Practice:** I avoid \`stopPropagation\` because it breaks things that rely on bubbling — analytics, "click outside" handlers, delegation. If a parent should ignore some clicks, I check \`event.target\` or \`event.defaultPrevented\` there instead.

**React:** \`onClick\`/\`onClickCapture\` mirror the phases, but propagation follows the React tree — a click in a portal bubbles to its React parent even though its DOM parent is \`body\`.`,
      followUps: ['Which events don’t bubble?', 'Why is `event.currentTarget` null when you log the event later?', 'What does `passive: true` change?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'iq-css-specificity',
      kind: 'concept',
      question: 'How does the browser decide which CSS rule applies when several rules match the same element?',
      answer: `**One-liner:** the cascade compares declarations in order — origin and importance, inline styles, cascade layers, specificity, and finally source order — and stops at the first criterion that differs.

**Walking through it:**
1. **Origin and importance:** author styles beat browser defaults; \`!important\` moves a declaration into a higher bucket, and for \`!important\` the order flips, so a user's important styles beat the author's.
2. **Inline \`style\`** beats any selector-based author rule.
3. **Cascade layers:** with \`@layer reset, base, components, utilities\`, a later layer wins regardless of specificity, and unlayered styles beat all layers.
4. **Specificity:** a tuple of (IDs; classes, attributes and pseudo-classes; types and pseudo-elements), compared column by column — one ID beats any number of classes. \`:is()\`, \`:not()\` and \`:has()\` take their most specific argument; \`:where()\` is zero.
5. **Order of appearance:** last one wins.

Separately, **inheritance** only applies when nothing targets the element — even a \`*\` rule beats an inherited value.

**Example:** \`#nav a\` (1,0,1) beats \`.nav .menu .item .link:hover\` (0,5,0).

**How I keep it manageable:** flat single-class selectors (CSS Modules or BEM), \`@layer\` to order resets, components and utilities, \`:where()\` for overridable defaults in shared libraries, and \`!important\` only in utilities that must always win.`,
      followUps: ['Why don’t 11 classes beat one ID?', 'What does `:where()` give a component library?', 'How does `!important` interact with layers?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'iq-z-index-not-working',
      kind: 'debugging',
      question: 'A dropdown has `z-index: 9999` but still renders underneath other content. How do you debug and fix it?',
      answer: `**One-liner:** \`z-index\` only competes inside a stacking context, so a 9999 inside a parent that forms a low stacking context can never rise above that parent's siblings.

**How I debug it:**
1. Check the dropdown is actually positioned (or a flex/grid item) — otherwise \`z-index\` does nothing.
2. Walk up its ancestors in DevTools looking for **stacking context creators**: \`position\` with a \`z-index\`, \`position: fixed\`/\`sticky\`, \`opacity < 1\`, \`transform\`, \`filter\`, \`isolation: isolate\`, \`will-change\`, \`contain: paint\`. Chrome's Layers panel helps.
3. Compare the **ancestor's** stacking level with whatever it's losing to — that is the real comparison.

**Fixes, best first:**
- Use the **top layer**: the \`popover\` attribute or \`<dialog>\` with \`showModal()\` render above every stacking context with no \`z-index\` at all.
- **Portal** it to the end of \`body\` with \`createPortal\`, so it lives in the root stacking context.
- Remove an unnecessary stacking context — a leftover \`transform\` from an animation, a stray \`opacity: 0.99\` — or raise the ancestor instead.
- Prevent recurrences: \`isolation: isolate\` on component roots so internal z-indexes can't leak, and a small z-index scale as tokens (\`--z-dropdown\`, \`--z-modal\`) instead of an arms race.

**Related trap:** the same ancestors (\`transform\`, \`filter\`, \`contain\`) become the containing block for \`position: fixed\`, so a "fixed" overlay gets positioned and clipped relative to a card. The portal fixes both problems.`,
      followUps: ['List what creates a stacking context.', 'Why is a portal or the top layer better than a bigger z-index?', 'Why might `position: fixed` stop being relative to the viewport?'],
      minutes: 3,
      level: 'senior',
    },
    {
      id: 'iq-flex-vs-grid',
      kind: 'concept',
      question: 'When do you use flexbox and when do you use grid?',
      answer: `**One-liner:** flexbox is one-dimensional and content-out — the items' sizes drive the layout along a row or column; grid is two-dimensional and layout-in — the container defines rows and columns and items are placed into them.

**Flex for:** toolbars, nav bars, button groups, chips that wrap, a media object, pushing one item to the end with \`margin-inline-start: auto\`, centring.

**Grid for:** page shells with named template areas, card galleries where columns must line up, forms with aligned labels, overlapping items (\`grid-area: 1 / 1\`), and responsive grids without media queries: \`repeat(auto-fit, minmax(min(16rem, 100%), 1fr))\`.

**The deciding question:** "Do things need to align across rows *and* columns?" With \`flex-wrap\` each line is laid out independently, so the last row won't line up with the columns above; grid always aligns, and \`subgrid\` even lets nested content align to the parent's tracks.

**Gotchas in both:** flex items have \`min-width: auto\`, so long content overflows unless you set \`min-width: 0\`; in grid, \`1fr\` means \`minmax(auto, 1fr)\`, so use \`minmax(0, 1fr)\` for the same reason. And \`flex: 1\` is \`1 1 0%\` — equal shares — whereas \`flex: auto\` shares only the space left after content.

They compose: a grid page whose header is a flex row is completely normal.`,
      followUps: ['What does `flex: 1` expand to?', 'auto-fit vs auto-fill?', 'Why does text-overflow: ellipsis not work in my flex item?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'iq-center-element',
      kind: 'ui-build',
      question: 'How do you centre an element horizontally and vertically? Give several ways and say when you would use each.',
      answer: `**One-liner:** the shortest modern answer is \`display: grid; place-items: center\` on the parent — but the right choice depends on the layout context, so I know several.

1. **Grid:** \`display: grid; place-items: center;\` — one line, both axes.
2. **Flexbox:** \`display: flex; justify-content: center; align-items: center;\` — when the parent is already a flex container.
3. **Auto margins:** \`margin: auto\` on the child of a flex or grid parent.
4. **Absolute, unknown size:** \`position: absolute; top: 50%; left: 50%; translate: -50% -50%;\` — for out-of-flow overlays relative to a positioned parent. It can render text on fractional pixels.
5. **Absolute, known size:** \`position: absolute; inset: 0; margin: auto;\` plus a width and height.
6. **Horizontal only:** \`margin-inline: auto\` on a block with a width or max-width; \`text-align: center\` for inline content.
7. **Vertical in plain block layout:** \`align-content: center\` now works on ordinary block containers in all major engines (since 2024).

**For a modal:** a fixed overlay with \`inset: 0; display: grid; place-items: center\`, a panel sized with \`min(100%, 32rem)\`, \`max-height\` and \`overflow: auto\`, rendered in a portal — or simply \`<dialog>\` with \`showModal()\`, which the browser centres and puts in the top layer.

**How I choose:** if the parent is already flex or grid, use its alignment; if the element is out of flow, use \`inset\` + \`margin: auto\` or a translate.`,
      followUps: ['How would you centre a modal that is taller than the viewport?', 'Why can `translate(-50%, -50%)` make text blurry?', 'What does the top layer give you?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'iq-storage-options',
      kind: 'concept',
      question: 'Compare cookies, localStorage, sessionStorage and IndexedDB. Where would you store an auth token?',
      answer: `**One-liner:** cookies are small and sent to the server automatically; \`localStorage\` and \`sessionStorage\` are synchronous string stores that stay in the browser, scoped per origin and per tab respectively; IndexedDB is an asynchronous, large, structured database.

**Comparison:**
- **Cookies:** about 4 KB each, attached to every matching request, scoped by domain and path, expiry via \`Max-Age\`/\`Expires\`. \`HttpOnly\` hides them from JavaScript; \`Secure\` and \`SameSite\` limit when they're sent.
- **localStorage:** about 5 MB per origin, **synchronous** (blocks the main thread), strings only, persistent, shared across tabs — other tabs get a \`storage\` event. Not available in workers.
- **sessionStorage:** the same API, scoped to one tab; survives reloads, cleared when the tab closes.
- **IndexedDB:** **asynchronous**, transactional, stores structured-clone values including Blobs, large quota, available in workers and service workers. I'd use a wrapper such as \`idb\` or Dexie.

**Auth tokens:** I'd keep the session in an \`HttpOnly; Secure; SameSite=Lax\` cookie so an XSS payload can't read it, and protect state-changing requests against CSRF with SameSite plus a token. Anything in \`localStorage\` is readable by every script on the page. If the architecture needs a bearer token in JavaScript, I'd keep it in memory and refresh it via an HttpOnly cookie.

**Other uses:** preferences in \`localStorage\`, wizard progress in \`sessionStorage\`, offline data in IndexedDB, and HTTP responses in the Cache API via a service worker.`,
      followUps: ['Why is localStorage a bad place for tokens?', 'How would you sync state across tabs?', 'What happens to storage in a third-party iframe?'],
      minutes: 2,
      level: 'core',
    },
  ],
};

export default day;
