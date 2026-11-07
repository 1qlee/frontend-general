## Goal

Build five layouts that come up again and again in UI-build interviews and take-home tasks — a holy-grail page shell, a sticky header with a sticky sidebar, a responsive card grid, a centred modal overlay and a container-query card — in **fe-gym**, with plain CSS (CSS Modules). Each drill has acceptance criteria and a reference solution. **Timebox each one to about 5 minutes, try it before reading the reference**, and say out loud which mechanism you're relying on (grid areas, sticky scroll container, `auto-fit`, top layer/portal, container query).

## Why it matters

"Build this layout" rounds are short, and interviewers watch *how* you get there: do you reach for `display: grid` with named areas, or nest five flex wrappers? Do you know why `position: sticky` silently fails? Can you explain why your modal's `z-index` doesn't matter if it's in a portal? Doing these from memory, quickly, is the skill.

## Setup (3 minutes)

In fe-gym, create `src/drills/css-layouts/LayoutDrills.tsx` and `src/drills/css-layouts/layouts.module.css`, and render `<LayoutDrills />` from `App.tsx` (temporarily) or behind a `?drill=css` check in `main.tsx`.

```tsx
// src/drills/css-layouts/LayoutDrills.tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import s from './layouts.module.css';

const DRILLS = ['holy-grail', 'sticky', 'cards', 'modal', 'container'] as const;
type Drill = (typeof DRILLS)[number];

export function LayoutDrills() {
  const [drill, setDrill] = useState<Drill>('holy-grail');
  return (
    <>
      <nav className={s.switcher} aria-label="Drills">
        {DRILLS.map((d) => (
          <button key={d} aria-pressed={d === drill} onClick={() => setDrill(d)}>
            {d}
          </button>
        ))}
      </nav>
      {drill === 'holy-grail' && <HolyGrail />}
      {drill === 'sticky' && <StickyLayout />}
      {drill === 'cards' && <CardGrid />}
      {drill === 'modal' && <ModalDrill />}
      {drill === 'container' && <ContainerCards />}
    </>
  );
}

const paragraphs = (n: number) => Array.from({ length: n }, (_, i) => <p key={i}>Paragraph {i + 1}</p>);

function HolyGrail() {
  return (
    <div className={s.page}>
      <header className={s.header}>Header</header>
      <nav className={s.nav}>Nav</nav>
      <main className={s.main}>Main — https://example.com/a/very/long/url/that/should/not/blow/out/the/layout</main>
      <aside className={s.aside}>Aside</aside>
      <footer className={s.footer}>Footer</footer>
    </div>
  );
}

function StickyLayout() {
  return (
    <div className={s.stickyPage}>
      <header className={s.stickyHeader}>Sticky header</header>
      <div className={s.stickyBody}>
        <aside className={s.toc}>On this page…</aside>
        <article>{paragraphs(40)}</article>
      </div>
    </div>
  );
}

function CardGrid() {
  return (
    <ul className={s.cards}>
      {Array.from({ length: 7 }, (_, i) => (
        <li key={i} className={s.card}>
          <h3>Card {i + 1}</h3>
          <p>{'Some text. '.repeat((i % 3) + 1)}</p>
          <button>Action</button>
        </li>
      ))}
    </ul>
  );
}

function ModalDrill() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    // A "hostile" parent: transform makes it the containing block for position: fixed
    <div style={{ transform: 'translateZ(0)', padding: '2rem' }}>
      <button onClick={() => setOpen(true)}>Open modal</button>
      {open &&
        createPortal(
          <div className={s.overlay} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
            <div className={s.panel} role="dialog" aria-modal="true" aria-labelledby="terms-title">
              <h2 id="terms-title">Terms</h2>
              {paragraphs(30)}
              <button onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>,
          document.body,
        )}
      {paragraphs(60)}
    </div>
  );
}

function ContainerCards() {
  const card = (
    <article className={s.cqCard}>
      <div className={s.cqMedia} aria-hidden="true" />
      <div>
        <h3>Container queries</h3>
        <p>I adapt to my slot, not to the viewport.</p>
      </div>
    </article>
  );
  return (
    <div className={s.cqLayout}>
      <aside className={s.cqSlot}>{card}</aside>
      <main className={s.cqSlot}>{card}</main>
    </div>
  );
}
```

Start the CSS file with a tiny base:

```css
/* layouts.module.css */
:global(*), :global(*::before), :global(*::after) { box-sizing: border-box; }
:global(body) { margin: 0; font-family: system-ui, sans-serif; }
.switcher { position: fixed; inset-block-end: 1rem; inset-inline-end: 1rem; z-index: 1000; display: flex; gap: 0.25rem; }
.switcher [aria-pressed='true'] { font-weight: 700; }
```

## Drill 1 — Holy-grail page shell (grid template areas)

**Acceptance criteria**

- From `64rem` up: header and footer span the full width; three columns below the header — nav `12rem`, main fluid, aside `16rem`.
- Below `64rem`: one column in source order (header, nav, main, aside, footer).
- The footer sits at the **bottom of the viewport** when content is short, and is pushed down when content is long.
- The long URL in `main` does **not** widen the main column or cause horizontal scrolling.
- No fixed pixel heights.

**Reference**

```css
.page {
  display: grid;
  min-height: 100dvh;                       /* dvh: correct on mobile with a URL bar */
  grid-template-rows: auto auto 1fr auto auto;
  grid-template-areas: "header" "nav" "main" "aside" "footer";
}
.header { grid-area: header; }
.nav    { grid-area: nav; }
.main   { grid-area: main; overflow-wrap: anywhere; }
.aside  { grid-area: aside; }
.footer { grid-area: footer; }

@media (width >= 64rem) {
  .page {
    grid-template-columns: 12rem minmax(0, 1fr) 16rem;  /* minmax(0, …) lets main shrink below its content */
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "header header header"
      "nav    main   aside"
      "footer footer footer";
  }
}
```

**Say why:** `1fr` in the row template absorbs leftover height, so the footer is pushed to the bottom. `overflow-wrap: anywhere` lets the URL wrap; `minmax(0, 1fr)` guarantees the column can shrink below its content even when the content can't wrap (a wide table, a `<pre>`, an image) — plain `1fr` is `minmax(auto, 1fr)` and would grow instead. Delete each in turn and watch what breaks.

## Drill 2 — Sticky header + sticky sidebar

**Acceptance criteria**

- The header stays at the top while the page scrolls; content scrolls *under* it (no see-through).
- The "On this page" sidebar sticks just below the header while the article scrolls.
- **Break it on purpose:** add `overflow: hidden` to `.stickyPage` and watch both stop sticking. Remove `align-self: start` from `.toc` and watch the sidebar stop sticking. Explain both.

**Reference**

```css
.stickyHeader {
  position: sticky;
  top: 0;
  z-index: 1;                          /* above the article content scrolling beneath */
  block-size: 4rem;
  display: flex;
  align-items: center;
  padding-inline: 1.5rem;
  background: Canvas;                  /* opaque system background colour */
  border-block-end: 1px solid color-mix(in srgb, CanvasText 15%, transparent);
}
.stickyBody {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr);
  gap: 2rem;
  padding: 1.5rem;
}
.toc {
  position: sticky;
  top: 5rem;                           /* header height + breathing room */
  align-self: start;                   /* grid items stretch by default → nothing to stick */
}
```

**Say why:** sticky sticks inside its **nearest scroll container**; `overflow: hidden` on an ancestor makes *that* the scroll container (one that never scrolls). A stretched grid item is as tall as its row, so it has no room to move. Bonus: add `html { scroll-padding-top: 5rem; }` so in-page anchor links don't land under the sticky header.

## Drill 3 — Responsive card grid, no media queries

**Acceptance criteria**

- As many columns as fit, each card at least `16rem` wide; no media queries.
- At `320px` viewport width: one column, **no horizontal scrollbar**.
- Cards in a row are equal height and their buttons line up at the bottom.
- Temporarily reduce the list to 2 cards and switch `auto-fit` ↔ `auto-fill`; describe the difference in one sentence.

**Reference**

```css
.cards {
  list-style: none;
  margin: 0;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));
  gap: 1rem;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
  border-radius: 0.5rem;
}
.card h3, .card p { margin: 0; }
.card button { margin-block-start: auto; align-self: start; } /* push to the bottom */
```

**Say why:** grid rows stretch items to equal height; inside each card, `margin-block-start: auto` in a column flex container eats the free space above the button. `min(16rem, 100%)` stops the minimum overflowing a container narrower than 16rem. `auto-fit` collapses empty tracks so 2 cards stretch; `auto-fill` keeps the empty tracks so they stay narrow.

## Drill 4 — Centred modal overlay

**Acceptance criteria**

- The overlay covers the viewport and dims the page; the panel is centred on both axes at any viewport size.
- Panel width `min(100%, 32rem)` with a gutter; height at most `85dvh`; long content scrolls **inside** the panel.
- The page behind doesn't scroll while the modal is open.
- Clicking the backdrop or pressing Escape closes it.
- **Break it on purpose:** remove `createPortal` (render the overlay inline) and observe what the parent's `transform` does to `position: fixed`.

**Reference**

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / 0.5);
}
.panel {
  inline-size: min(100%, 32rem);
  max-block-size: 85dvh;
  overflow: auto;
  overscroll-behavior: contain;        /* don't scroll-chain to the page */
  padding: 1.5rem;
  border-radius: 0.75rem;
  background: Canvas;
}
:global(html):has(.overlay) { overflow: hidden; } /* scroll lock with :has() — no JS */
```

**Say why:** `fixed` is relative to the viewport *unless* an ancestor has `transform`/`filter`/`contain` — then that ancestor is the containing block. The portal moves the overlay to `body`, escaping both that and any stacking context. **Bonus (2 min):** rebuild it with `<dialog>` + `showModal()` and style `dialog::backdrop`. The top layer sits above every stacking context with no `z-index`, and you get Escape-to-close and focus containment for free (Day 9 covers the accessibility side).

## Drill 5 — Container-query card

**Acceptance criteria**

- The **same** card component renders stacked (media above text) in the `18rem` sidebar and side by side (media left, text right) in `main`, once its container is at least `28rem` wide.
- The heading size scales with the container (`clamp()` + `cqi`), not the viewport.
- The card's CSS contains no media queries.
- Verify by changing the **sidebar's** width in DevTools (e.g. to `32rem`): the sidebar card switches layout even though the viewport didn't change.

**Reference**

```css
.cqLayout {
  display: grid;
  grid-template-columns: 18rem minmax(0, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
}
.cqSlot { container-type: inline-size; }       /* the slot is the query container */
.cqCard {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, CanvasText 20%, transparent);
  border-radius: 0.75rem;
}
.cqMedia {
  aspect-ratio: 4 / 3;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
}
.cqCard h3 { margin: 0; font-size: clamp(1.1rem, 5cqi, 1.75rem); }

@container (inline-size >= 28rem) {
  .cqCard { grid-template-columns: 12rem 1fr; align-items: center; }
}
```

**Say why:** the query container must get its width from the layout, not from its children, so `container-type` goes on the slot wrapper, not on the card itself. An unnamed `@container` query targets the nearest ancestor container.

## Verify

1. In Chrome DevTools, click the `grid`/`flex` badges in the Elements panel to overlay tracks, areas and gaps on drills 1, 3 and 5.
2. Use the device toolbar at **320px, 768px and 1280px** widths: no horizontal scrollbar anywhere (`document.documentElement.scrollWidth === innerWidth` in the console).
3. Add `dir="rtl"` to `<html>`: the switcher (logical `inset-inline-end`) flips sides. Which of your other declarations would break in RTL? Convert one to a logical property.

## Reflection

- Which drill took longest, and was it a *knowledge* gap (didn't know the property) or a *mechanism* gap (didn't know why it failed)?
- For each drill, write the one mechanism in a sentence in `notes/day08.md` (e.g. "sticky needs a threshold and sticks inside its nearest scroll container").

## How to talk about it in an interview

When asked to build a layout live: **name the layout model first** ("this is a two-dimensional page shell, so grid with template areas"), build the **mobile/single-column version first**, add one breakpoint (or a container query for components), and narrate the gotchas you are pre-empting: `minmax(0, 1fr)` for overflow, `dvh` for mobile height, a portal or `<dialog>` for overlays, `align-self: start` for sticky grid items. That narration is what makes a 10-minute layout task read as senior.
