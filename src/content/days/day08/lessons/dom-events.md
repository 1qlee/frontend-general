## Why interviewers ask about the DOM and events

React hides the DOM most of the time — which is exactly why interviewers probe it. They want to know that you understand what `onClick` compiles down to, can write a vanilla event-delegation helper on a whiteboard, know why a `focus` handler on a parent never fires, and can pick the right storage for a token versus a 50 MB offline cache. "Implement event delegation", "explain capture vs bubble", "build infinite scroll with IntersectionObserver" and "compare localStorage and cookies" are all standard questions.

## Event flow: capture → target → bubble

When an event is dispatched at a target, the browser computes the **propagation path** (target, its ancestors, `document`, `window`) and walks it in three phases:

1. **Capture phase** — from `window` *down* to the target's parent, invoking listeners registered with `capture: true`.
2. **Target phase** — at the target itself.
3. **Bubble phase** — from the target's parent back *up* to `window`, invoking non-capture listeners (only if the event `bubbles`).

```ts
// <div id="parent"><button id="child">Click</button></div>
parent.addEventListener('click', () => log('parent capture'), { capture: true });
parent.addEventListener('click', () => log('parent bubble'));
child.addEventListener('click', () => log('child'));

// Clicking the button logs:
// parent capture → child → parent bubble
```

At the target, current browsers run the target's **capture** listeners before its **non-capture** listeners (the DOM spec was changed to this in 2021; older engines ran them in registration order). Don't build behaviour that depends on that detail, but it's good to know.

{{quiz:event-order-capture-bubble}}

### Not every event bubbles — but every event is captured

`focus`, `blur`, `mouseenter`, `mouseleave`, `load`, media events and `scroll` on elements don't bubble. Two workarounds:

- Use the bubbling twin: `focusin`/`focusout` instead of `focus`/`blur`; `mouseover`/`mouseout` instead of `mouseenter`/`mouseleave`.
- Listen in the **capture phase**: capture happens for *all* events, bubbling or not. `document.addEventListener('focus', handler, true)` sees every focus in the page.

### `target`, `currentTarget` and `this`

- `event.target` — the element the event was dispatched to (the deepest element clicked, e.g. the `<span>` inside your button).
- `event.currentTarget` — the element **whose listener is running right now** (the one you called `addEventListener` on). Inside a regular `function` listener, `this === event.currentTarget`; arrow functions don't get that `this`.
- `currentTarget` is only set *during* dispatch. If you `console.log(event)` and expand it later, or read it after an `await`, it's `null` — a classic "why is currentTarget null?" bug.

{{quiz:target-vs-currenttarget}}

### Stopping things: `stopPropagation` vs `preventDefault`

| Method | What it does | What it does **not** do |
|---|---|---|
| `stopPropagation()` | Stops the event moving to the **next node** in the path (other listeners on the current node still run) | Doesn't cancel the browser's default action |
| `stopImmediatePropagation()` | Also skips the **remaining listeners on the current node** | — |
| `preventDefault()` | Cancels the **default action** (link navigation, form submit, checkbox toggle, scroll on `wheel`…) if the event is `cancelable` | Doesn't stop propagation |

`return false` only does something in inline `onclick="…"` attributes (and jQuery). In `addEventListener` and React it does nothing.

> [!MISTAKE]
> Calling `stopPropagation()` to "prevent the form from submitting". Submission is the default action — you need `preventDefault()`. And sprinkling `stopPropagation()` around breaks anything that relies on delegation higher up: analytics, "click outside to close" handlers, and React's own root listener.

## `addEventListener` options

```ts
el.addEventListener(type, listener, {
  capture: false, // listen in the capture phase instead of bubble
  once: false,    // auto-remove after the first call
  passive: false, // promise not to call preventDefault() → browser can scroll immediately
  signal,         // an AbortSignal: abort() removes the listener
});
```

- **Identity matters for removal:** `removeEventListener` needs the *same function reference* **and the same `capture` flag**. Passing an inline arrow to both calls removes nothing. Registering the same function + capture flag twice is a no-op.
- **`passive: true`** lets the browser start scrolling without waiting for your `touchstart`/`wheel` handler to finish. Chrome and Firefox default `touchstart`/`touchmove`/`wheel` listeners on `window`, `document` and `body` to passive. Calling `preventDefault()` inside a passive listener is ignored (with a console warning).
- **`signal`** is the modern way to clean up: one `AbortController` can remove many listeners at once — perfect for a React effect cleanup.

```ts run
const target = new EventTarget();
const controller = new AbortController();

target.addEventListener('ping', () => console.log('once listener'), { once: true });
target.addEventListener('ping', () => console.log('signal listener'), { signal: controller.signal });
const same = () => console.log('registered twice, runs once');
target.addEventListener('ping', same);
target.addEventListener('ping', same); // same fn + same capture flag → ignored

target.dispatchEvent(new Event('ping'));
console.log('--- after abort():');
controller.abort();
target.dispatchEvent(new Event('ping'));
```

`preventDefault()` only works on `cancelable` events, is ignored in passive listeners, and `dispatchEvent` tells you whether someone cancelled:

```ts run
const form = new EventTarget();
form.addEventListener('save', (e) => e.preventDefault());

console.log('not cancelable → dispatch returns', form.dispatchEvent(new Event('save')));
console.log('cancelable → dispatch returns', form.dispatchEvent(new Event('save', { cancelable: true })));

const scroller = new EventTarget();
scroller.addEventListener(
  'wheelish',
  (e) => {
    e.preventDefault();
    console.log('defaultPrevented inside a passive listener:', e.defaultPrevented);
  },
  { passive: true },
);
scroller.dispatchEvent(new Event('wheelish', { cancelable: true }));
```

In React, the cleanup pattern looks like this:

```tsx
useEffect(() => {
  const controller = new AbortController();
  const { signal } = controller;
  window.addEventListener('resize', onResize, { signal, passive: true });
  window.addEventListener('keydown', onKeyDown, { signal });
  return () => controller.abort(); // removes both
}, [onResize, onKeyDown]);
```

## Event delegation

Instead of attaching a listener to each of 1,000 rows, attach **one** listener to their container and work out which row was hit from `event.target`:

```ts
list.addEventListener('click', (event) => {
  const row = (event.target as Element).closest('li[data-id]');
  if (!row || !list.contains(row)) return; // clicked outside a row, or matched an ancestor of list
  select(row.getAttribute('data-id')!);
});
```

Why it's worth it:

- **Fewer listeners** → less memory and setup work for long lists.
- **Dynamic content just works** — rows added later are handled without re-binding.
- **One place for behaviour** (it's how jQuery's `.on(type, selector, fn)` and React's root listener work).

Gotchas interviewers probe (you'll implement all of these in today's exercise):

- `event.target` may be a **child** of the element you care about (an icon inside a button) → use `closest()`, don't compare `target` directly.
- `closest()` searches *ancestors without limit*, so it can match the container itself or something **outside** it → check `container.contains(match)` / stop at the container.
- The target may not be an `Element` (a `Text` node for synthetic dispatches, or `document`) → guard before calling `closest`.
- **Non-bubbling events** (`focus`, `mouseenter`) don't reach the container → use `focusin`/`mouseover`, or listen with `capture: true`.
- An inner handler calling `stopPropagation()` silently breaks delegation.

## Custom events

```ts
const event = new CustomEvent('cart:add', {
  detail: { sku: 'A-1', qty: 2 },
  bubbles: true,   // default false!
  composed: true,  // cross shadow-DOM boundaries (web components)
  cancelable: true,
});
button.dispatchEvent(event);
```

`dispatchEvent` is **synchronous**: all listeners have run by the time it returns (unlike browser-generated events, which are queued as tasks). To type custom events in TypeScript, augment the event map:

```ts
declare global {
  interface HTMLElementEventMap {
    'cart:add': CustomEvent<{ sku: string; qty: number }>;
  }
}
// now el.addEventListener('cart:add', (e) => e.detail.sku) is fully typed
```

```ts run
const cart = new EventTarget();
cart.addEventListener('cart:add', (e) => {
  const { sku, qty } = (e as CustomEvent<{ sku: string; qty: number }>).detail;
  console.log('first listener:', sku, qty);
  e.stopImmediatePropagation();
});
cart.addEventListener('cart:add', () => console.log('never runs'));

cart.dispatchEvent(new CustomEvent('cart:add', { detail: { sku: 'A-1', qty: 2 } }));
console.log('dispatchEvent is synchronous: this logs last');
```

## How React handles events (brief — Days 5–7 go deeper)

- Since **React 17**, React attaches one listener per event type to the **root container** you passed to `createRoot` (not to `document`, as React ≤16 did), for both capture and bubble phases. A few non-bubbling events (media events, `scroll`, `load`…) are attached to the element itself.
- When a native event reaches the root, React walks the **React component tree** from the target and calls your `onClickCapture` / `onClick` props with a `SyntheticEvent` wrapper (`e.nativeEvent` is the real one). Event pooling was removed in React 17.
- Because propagation follows the **React tree**, an event inside a **portal** (e.g. a modal rendered into `document.body`) bubbles to the portal's React parents even though its DOM parent is `body`.
- React maps some events for consistency: `onFocus`/`onBlur` use `focusin`/`focusout` (so they bubble), `onMouseEnter` doesn't bubble, and `onChange` on inputs fires on every keystroke (it listens to `input`).
- Mixing native and React listeners: a native listener on an element runs **before** React's bubble handlers (React only sees the event once it reaches the root). `e.stopPropagation()` in a React handler stops React propagation and the native event at the root — so listeners on `document`/`window` won't see it.

## DOM APIs worth knowing cold

| API | What to know |
|---|---|
| `querySelector` / `querySelectorAll` | Any CSS selector; `querySelectorAll` returns a **static** `NodeList` |
| `getElementsByClassName`, `children`, `childNodes` | **Live** collections — they update as the DOM changes; removing items while looping skips elements |
| `el.matches(sel)` | Does this element match the selector? |
| `el.closest(sel)` | Nearest **inclusive** ancestor matching (checks `el` itself first) |
| `classList` | `add`, `remove`, `toggle(name, force?)`, `replace`, `contains` |
| `dataset` | `data-user-id="7"` ↔ `el.dataset.userId === '7'` (camelCased, always strings) |
| `textContent` / `innerText` / `innerHTML` | `textContent`: raw text, no layout. `innerText`: *rendered* text — layout-aware, can force layout. `innerHTML`: parses HTML — an XSS risk with untrusted input (Day 12) |
| `append`, `prepend`, `before`, `after`, `replaceWith`, `remove`, `replaceChildren` | Modern mutation methods; accept several nodes and strings (inserted as text) |
| Attributes vs properties | `input.getAttribute('value')` is the *initial* value; `input.value` is the *current* value |
| `DocumentFragment` | An off-document container; appending it moves all its children in one operation |
| `<template>` | Inert markup: not rendered, scripts don't run, images don't load. Use `template.content.cloneNode(true)` to stamp copies |
| `node.cloneNode(true)` | Deep copy — but listeners added with `addEventListener` are **not** copied |

> [!NOTE]
> "Use a `DocumentFragment` to avoid 100 reflows" is a half-truth. Layout is lazy, so appending 100 nodes in one task causes **one** layout at the next frame anyway, *unless you read geometry in between*. The fragment's real benefits are a single insertion (one mutation record, observers and live collections updated once) and building a subtree off-document.

## Observers: let the browser tell you

Polling sizes and positions (`getBoundingClientRect()` in a scroll handler) forces layout on the main thread. Observers invert this: the browser computes the information as part of rendering and **calls you asynchronously**.

| Observer | Tells you… | Classic use cases |
|---|---|---|
| `IntersectionObserver` | When an element enters/leaves a root (viewport or a scroll container), optionally grown with `rootMargin` and at `threshold`s | Infinite scroll, lazy loading (beyond native `loading="lazy"`), ad/analytics impressions, scroll-spy navigation, pausing off-screen videos |
| `ResizeObserver` | When an element's size changes (after layout, before paint) | Charts/canvas resizing, virtualised lists measuring rows, components that adapt to their own width (container queries now cover the CSS-only cases) |
| `MutationObserver` | DOM changes: children, attributes, text (records batched, delivered as a microtask) | Reacting to third-party widgets, rich-text editors, Testing Library's `waitFor`/`findBy*` |

All three follow the same lifecycle: create one observer, `observe()` one or many targets, `disconnect()` on cleanup.

```tsx
function useInView<T extends Element>(rootMargin = '0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    observer.observe(el); // the first callback fires soon after observe(), with the current state
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, inView] as const;
}
```

> [!TIP]
> `IntersectionObserver` fires when the intersection state **changes**. If your infinite-scroll sentinel is *still* visible after a page loads (short pages, tall screens), no new callback arrives — re-observe the sentinel after each load or check again explicitly. You'll meet this in the `InfiniteList` exercise.

The synchronous Mutation *Events* (`DOMNodeInserted`…) that MutationObserver replaced are deprecated and have been removed from Chrome (since v127). If you see them in legacy code, that's the migration.

## Client-side storage compared

| | Cookies | `localStorage` | `sessionStorage` | IndexedDB |
|---|---|---|---|---|
| Capacity | ~4 KB per cookie | ~5 MB per origin (browser-dependent) | ~5 MB per origin | Large — a share of disk, managed by the storage quota |
| API | `document.cookie` string (sync); `cookieStore` (async, newer) | Synchronous, strings only | Synchronous, strings only | **Asynchronous**, transactions, structured-clone values (objects, `Blob`s, `Map`s…) |
| Sent to the server? | **Yes — automatically**, with every matching request | No | No | No |
| Scope | Domain + path (+ `SameSite` rules) | Origin, shared across tabs | Origin **and tab**; survives reload | Origin, shared across tabs |
| Lifetime | Session or `Expires`/`Max-Age` | Until cleared | Until the tab closes | Until cleared |
| In workers? | No (`document.cookie`) | **No** | **No** | **Yes** |
| JS can read it? | Yes, unless `HttpOnly` | Yes | Yes | Yes |

Points that make an answer stand out:

- **Cookies are for the server**: auth/session identifiers belong in `HttpOnly; Secure; SameSite` cookies that JavaScript can't read. The security attributes and CSRF/XSS trade-offs are Day 12's topic.
- **`localStorage` is synchronous** — big reads/writes block the main thread — and anything in it is readable by any script on the page, including injected XSS payloads. Fine for preferences (theme, dismissed banners), wrong for tokens.
- The **`storage` event** fires in *other* same-origin tabs when `localStorage` changes — a cheap cross-tab sync mechanism (`BroadcastChannel` is the general-purpose alternative).
- **IndexedDB** is the answer for offline data, large caches and anything binary; most teams use a small wrapper such as `idb` or Dexie. Pair it with `navigator.storage.estimate()` and `navigator.storage.persist()` for quota questions.
- Storage isn't forever: browsers evict under storage pressure, and Safari may delete script-writable storage for sites the user hasn't interacted with in 7 days of browser use. Third-party iframes get **partitioned** storage in modern browsers.

{{quiz:storage-sent-to-server}}

## The History API: how client-side routers work

```ts
history.pushState({ id: 7 }, '', '/products/7'); // change the URL + add an entry, no request, no reload
history.replaceState(null, '', '?tab=reviews');   // change the URL, replace the current entry
window.addEventListener('popstate', (e) => render(location.pathname, e.state)); // back/forward
```

A minimal router (what React Router or TanStack Router do underneath):

1. **Intercept link clicks** — usually one *delegated* listener on `document` for `a[href]`. Let the browser handle it if it's a modified click (Ctrl/⌘/Shift/Alt, middle button), `target="_blank"`, `download`, or a cross-origin URL; otherwise `preventDefault()`.
2. `pushState` the new URL and render the matching route.
3. Listen to **`popstate`**, which fires on back/forward — *not* when you call `pushState` yourself — and render from `location`.
4. Configure the **server** to return `index.html` for unknown paths, or deep links and refreshes 404.

Extras worth naming: `history.scrollRestoration = 'manual'` when the router manages scroll, and the newer **Navigation API** (`navigation.addEventListener('navigate', e => e.intercept(...))`), which centralises all of this. It has been in Chromium since 2022 and has only recently arrived in other engines, so check support before relying on it.

## Key takeaways

- Event flow: **capture (down) → target → bubble (up)**. Non-bubbling events still capture.
- `target` = where it happened; `currentTarget` = whose listener is running (null after dispatch).
- `stopPropagation` stops travel; `preventDefault` cancels the default action; they're independent.
- Options: `capture`, `once`, `passive` (scroll performance), `signal` (clean removal with `AbortController`).
- Delegation = one listener + `closest()` + a containment check; handle text targets and non-bubbling events.
- React ≥17 delegates at the **root container** and propagates through the **React tree** (portals included).
- Prefer observers (`Intersection`, `Resize`, `Mutation`) over polling layout.
- Storage: cookies go to the server; `localStorage` is sync, per origin; `sessionStorage` per tab; IndexedDB is async and large.
- Routers = intercept clicks + `pushState` + `popstate` + a server fallback.
