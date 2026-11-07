## Why interviewers ask about CSS

CSS questions are where experienced engineers lose easy points. Most of us debug CSS by trial and error until it works; an interviewer asking "why doesn't `z-index: 9999` work here?" or "which rule wins?" wants to hear the **rule**, not the trial and error. A strong answer names the mechanism — *cascade*, *specificity*, *stacking context*, *formatting context*, *min-content size* — and then shows the fix. This lesson goes mechanism by mechanism, in the order interviewers usually probe them.

## The cascade: which declaration wins?

When several declarations set the same property on the same element, the cascade sorts them by these criteria, **in order**, and only falls through to the next criterion on a tie:

1. **Origin and importance**
2. **Context** (shadow DOM: page styles vs a component's internal styles)
3. **Element-attached styles** — the `style=""` attribute
4. **Cascade layers** (`@layer`)
5. **Specificity**
6. **Order of appearance** — the last one wins

Most "why isn't my style applying?" questions are answered by walking down that list.

### 1. Origin and importance

From lowest to highest precedence:

| | |
|---|---|
| 1 | User-agent (browser default) normal |
| 2 | User normal |
| 3 | **Author** (your CSS) normal |
| 4 | CSS **animations** (keyframes) |
| 5 | Author `!important` |
| 6 | User `!important` |
| 7 | User-agent `!important` |
| 8 | CSS **transitions** |

Note the **reversal for `!important`**: a user's `!important` (e.g. an accessibility stylesheet) beats the author's `!important`. And `!important` isn't "extra specificity" — it moves the declaration into a different origin bucket entirely.

### 3. Inline styles are not "specificity 1,0,0,0"

You'll often hear inline styles described as a fourth specificity column. The current spec models them as a separate cascade step — **element-attached styles** — that beats every *selector*-based author declaration regardless of layers or specificity. Only `!important` declarations (a higher origin bucket) and running CSS animations beat them. Same outcome as the folklore, more precise vocabulary.

### 4. Cascade layers (`@layer`)

Layers let you decide precedence by **architecture** instead of specificity wars:

```css
@layer reset, base, components, utilities; /* order declared once, up front */

@layer components {
  #sidebar .card .title { color: navy; }   /* (1,2,0) */
}
@layer utilities {
  .text-red { color: red; }                /* (0,1,0) — still WINS: later layer */
}
.legacy-widget .title { color: green; }    /* unlayered: beats ALL layered normal styles */
```

The rules:

- For normal declarations, **later layers beat earlier layers, regardless of specificity**, and **unlayered styles beat every layer**.
- For `!important` declarations the order **reverses**: earlier layers win, and layered `!important` beats unlayered `!important`.
- Layer order is fixed by **first appearance**, so declare it once at the top. Third-party CSS can be put in a low layer: `@import url(lib.css) layer(vendor);`.

Tailwind v4 is built on exactly this (`theme`, `base`, `components`, `utilities` layers), which is why a utility class reliably overrides component styles.

### 5. Specificity

Specificity is a **three-column tuple (A, B, C)** compared column by column, left to right — there is no carrying between columns:

- **A** — ID selectors: `#main`
- **B** — class selectors, attribute selectors, pseudo-classes: `.btn`, `[type="text"]`, `:hover`, `:nth-child(2)`
- **C** — type selectors and pseudo-elements: `div`, `::before`
- **Nothing** — the universal selector `*`, combinators (` `, `>`, `+`, `~`), and `:where()`

The functional pseudo-classes are where people slip:

- **`:is()`, `:not()`, `:has()`** contribute the specificity of their **most specific argument** — *whether or not that argument is the one that matched*. The pseudo-class itself adds nothing.
- **`:where()`** always contributes **zero**. That's its purpose: write defaults that are trivially overridable (great for libraries and resets).
- `:nth-child(2n of .item)` = one pseudo-class plus the most specific selector after `of`.

**Walkthrough** — practise computing these before reading the answers:

| Selector | A,B,C | Why |
|---|---|---|
| `ul li` | 0,0,2 | two types |
| `.nav a:hover` | 0,2,1 | class + pseudo-class, one type |
| `a[href^="https"]` | 0,1,1 | attribute counts like a class |
| `#main .card > p::first-line` | 1,1,2 | `>` adds nothing; `p` and `::first-line` are both C |
| `li:not(.done)` | 0,1,1 | `:not` takes its argument's (0,1,0) |
| `:is(#app, .page) h1` | 1,0,1 | most specific argument is `#app`, even when `.page` matched |
| `:where(#app, .page) h1` | 0,0,1 | `:where` is always zero |
| `.card:has(> img)` | 0,1,1 | `:has` takes `img` |
| `*` | 0,0,0 | universal selector is free |

```ts run
type Spec = [number, number, number];
// Column-by-column comparison: the first column that differs decides.
const compare = (a: Spec, b: Spec) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

const rules: Array<[selector: string, spec: Spec]> = [
  ['.nav .menu .item .link:hover', [0, 5, 0]],
  ['#nav a', [1, 0, 1]],
  ['html body nav ul li a', [0, 0, 6]],
  [':where(#nav) a.link', [0, 1, 1]],
  [':is(#nav, .x) a', [1, 0, 1]],
];

const ranked = [...rules].sort((x, y) => compare(y[1], x[1]));
for (const [selector, spec] of ranked) console.log(spec.join(','), selector);
console.log('Tie between the two (1,0,1) rules → the one that appears LAST in the CSS wins.');
```

{{quiz:specificity-is-where}}

> [!MISTAKE]
> Computing specificity as a decimal number ("an ID is 100, a class is 10"). Eleven classes do **not** beat one ID — the columns never carry. Interviewers sometimes ask exactly this.

> [!INTERVIEW] Say it like this
> "The cascade first looks at origin and importance, then inline styles, then cascade layers, then specificity, then source order. Specificity is an (IDs, classes/attributes/pseudo-classes, types/pseudo-elements) tuple compared left to right. `:is`, `:not` and `:has` take their most specific argument, `:where` is zero. In practice I keep specificity flat with single classes and use `@layer` to order whole categories of styles instead of escalating selectors or reaching for `!important`."

## Inheritance

Inheritance is separate from the cascade: if **no declaration** applies to an element for an *inherited* property, it takes its parent's computed value.

- **Inherited** (mostly text-related): `color`, `font-*`, `line-height`, `letter-spacing`, `text-align`, `visibility`, `cursor`, `list-style`, **custom properties**.
- **Not inherited** (mostly box-related): `margin`, `padding`, `border`, `background`, `width`/`height`, `display`, `position`, `overflow`.

The trap: an inherited value has **no specificity at all**. Any rule that targets the element directly — even `*` or `span` — beats a value inherited from `#very-specific-parent`.

Keywords that control it: `inherit` (take the parent's value), `initial` (the property's spec initial value — `display: initial` is `inline`, even on a `div`!), `unset` (`inherit` for inherited properties, `initial` otherwise), `revert` (roll back to the browser's default — `display: revert` on a `div` gives `block`), and `revert-layer` (roll back to the previous cascade layer).

## The box model

Every box has **content → padding → border → margin**. `box-sizing` decides what `width`/`height` mean:

| `box-sizing` | `width: 200px; padding: 20px; border: 2px` | Rendered width |
|---|---|---|
| `content-box` (default) | `width` = content only | 200 + 40 + 4 = **244px** |
| `border-box` | `width` = content + padding + border | **200px** (content shrinks to 156px) |

Nearly every codebase starts with `*, *::before, *::after { box-sizing: border-box; }` because it makes widths predictable. Two more facts interviewers like: percentage `padding` and `margin` — even top and bottom — resolve against the containing block's **width** (the old aspect-ratio hack; use `aspect-ratio` now), and `outline` and `box-shadow` don't affect layout at all.

## Display types and formatting contexts

`display` really sets two things: the **outer** display type (how the box participates in its parent's layout: `block` or `inline`) and the **inner** display type (how its children are laid out: `flow`, `flow-root`, `flex`, `grid`, `table`). The two-value syntax makes this explicit: `inline-block` is `inline flow-root`, `inline-flex` is `inline flex`.

- **Inline** boxes ignore `width`/`height`, and their vertical margins and padding don't push surrounding lines apart.
- `inline-block` sits in a line of text but has a block inside — which is why whitespace between inline-blocks renders as gaps.
- `display: contents` removes the element's own box (children are laid out as if they were its parent's). Historically buggy for accessibility on some elements — use with care.

A **formatting context** is the region in which a set of boxes is laid out by one algorithm: block, inline, flex, grid.

### Block formatting contexts (BFC)

A new BFC is an isolated layout region. It's created by: the root element; floats; `position: absolute`/`fixed`; `display: inline-block`; **`display: flow-root`** (the side-effect-free way); `overflow` other than `visible`/`clip`; flex and grid items; table cells; `contain: layout`/`paint`/`content`/`strict`; multi-column containers.

Why you care — a new BFC:

1. **Contains its floats** (the parent no longer collapses to zero height around floated children — the old "clearfix" problem).
2. **Stops margin collapsing** between itself and its children.
3. **Doesn't overlap floats** next to it.

### Margin collapsing

Adjacent **vertical** margins of block boxes in normal flow combine into one:

- **Siblings**: `margin-bottom: 24px` above `margin-top: 16px` gives a 24px gap, not 40px.
- **Parent and first/last child**: if nothing separates them (no border, padding, inline content, or BFC), the child's top margin "leaks" out through the parent — the classic "why does my header's margin push the whole section down?".
- **Empty blocks**: their own top and bottom margins collapse together.

Collapsed size: the largest positive margin plus the most negative one (both positive → the max). Margins **don't** collapse horizontally, or for flex/grid items, floats, absolutely positioned boxes, or across a BFC boundary. Modern layouts sidestep it with `gap` in flex/grid containers or by using margins in one direction only.

## Positioning

| `position` | Laid out in flow? | Offsets relative to | Notes |
|---|---|---|---|
| `static` | Yes | — | Default. `top`/`z-index` have no effect |
| `relative` | Yes (keeps its space) | Its own normal position | Common as a containing block for absolute children |
| `absolute` | No | Nearest **containing block** (see below) | Shrinks to fit content |
| `fixed` | No | The viewport — *usually* | See the trap below |
| `sticky` | Yes | Its nearest **scroll container**, within its parent | Needs `top`/`bottom`/etc. to do anything |

The **containing block** of an absolutely positioned element is the padding box of its nearest ancestor that is positioned (`relative`, `absolute`, `fixed`, `sticky`) — **or** that has `transform` (including `translate`/`rotate`/`scale`), `filter`, `perspective`, `contain: layout`/`paint`, or `will-change` naming one of those.

The trap: that last list applies to `position: fixed` too. A `fixed` modal inside a card with `transform: translateY(0)` (common in animations) or `filter` is positioned and clipped relative to the card, not the viewport. Fix: render it in a **portal** (`createPortal(modal, document.body)`) or use `<dialog>`.

Why `sticky` "doesn't work", in order of likelihood: no `top` (or other threshold) set; an ancestor between it and the intended scroller has `overflow: hidden`/`auto` and becomes the scroll container; the parent is no taller than the sticky element, so there's no room to stick; or it's a flex/grid item stretched to the full height of its row (`align-self: start` fixes it).

## Stacking contexts and `z-index`

`z-index` only applies to positioned elements and to flex/grid items. More importantly, it's only compared **within the same stacking context**. A stacking context is painted as one atomic layer: its descendants' `z-index` values only order them *relative to each other*; the whole context is then placed at the context root's own level in its parent context.

**What creates a stacking context** (the list interviewers want):

- The root element (`<html>`)
- `position: relative`/`absolute` **with `z-index` other than `auto`**
- `position: fixed` or `sticky` (always)
- Flex or grid items with `z-index` other than `auto`
- `opacity` less than 1
- `transform`, `translate`, `rotate`, `scale`, `perspective`, `filter`, `backdrop-filter`, `clip-path`, `mask` other than `none`
- `mix-blend-mode` other than `normal`
- `isolation: isolate` (exists solely to create one)
- `will-change` naming any of the above; `contain: layout`/`paint`/`strict`/`content`

**The puzzle:**

```html
<header style="position: relative; z-index: 1">
  <div class="dropdown" style="position: absolute; z-index: 9999">Menu</div>
</header>
<main style="position: relative; z-index: 2">Content</main>
```

The dropdown renders **under** `main`. `header` (z 1) and `main` (z 2) are siblings in the root context, so `main` wins; the dropdown's 9999 only competes *inside* the header's context. Fixes: raise the header above `main`, don't give `main` a stacking context, or render the dropdown/modal in a portal at the end of `body`. Better still, use the **top layer**: `<dialog>` opened with `showModal()` and the `popover` attribute render above every stacking context, no `z-index` needed.

Painting order inside a stacking context, back to front: the context's own background and borders → children with **negative** `z-index` → in-flow blocks → floats → inline content → positioned children with `z-index: auto`/`0` (in DOM order) → **positive** `z-index` (ascending).

{{quiz:stacking-context-opacity}}

> [!TIP]
> Give each reusable component root `isolation: isolate`. Its internal `z-index` values can never leak out and fight the rest of the page — a cheap, side-effect-free fix for z-index wars.

## Flexbox

Flex is **one-dimensional**: `flex-direction` sets the **main axis** (row by default), the cross axis is perpendicular.

- `justify-content` aligns along the **main** axis; `align-items`/`align-self` along the **cross** axis; `align-content` distributes **lines** when wrapping; `gap` spaces items.
- `margin-inline-start: auto` on an item pushes it (and everything after it) to the end — the "logo left, nav right" trick.

The `flex` shorthand is `flex-grow flex-shrink flex-basis`:

| Shorthand | Expands to | Behaviour |
|---|---|---|
| `flex: initial` (default) | `0 1 auto` | Content-sized, can shrink, won't grow |
| `flex: 1` | `1 1 0%` | Basis 0 → items share space **equally**, regardless of content |
| `flex: auto` | `1 1 auto` | Content size first, then share the **extra** space (unequal widths) |
| `flex: none` | `0 0 auto` | Rigid: content size, never grows or shrinks |

{{quiz:flex-1-meaning}}

### The `min-width: auto` gotcha

Flex items default to `min-width: auto`, which resolves to their **min-content width** — they refuse to shrink below their longest word, a `white-space: nowrap` line, a `<pre>` block or a wide table. Result: `text-overflow: ellipsis` doesn't work and the layout overflows its container.

```css
.row { display: flex; }
.row .title {
  flex: 1;
  min-width: 0; /* ← the fix: allow shrinking below min-content */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Same story in a column flex container with `min-height`, and in grid: `1fr` is really `minmax(auto, 1fr)`, so a long URL can blow out a grid track — use `minmax(0, 1fr)`.

## Grid

Grid is **two-dimensional** and **layout-in**: the container defines tracks and items are placed into them.

- `fr` is a share of the **remaining free space** after fixed tracks and gaps: `grid-template-columns: 240px 1fr 2fr`.
- `repeat(3, 1fr)`, `minmax(12rem, 1fr)`, `grid-column: 1 / -1` (span all columns), `grid-column: span 2`.
- **Named areas** make page layouts readable:

```css
.page {
  display: grid;
  grid-template-columns: 14rem 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "nav    main"
    "footer footer";
  min-height: 100dvh;
}
.page > header { grid-area: header; }
```

- Items beyond the template go into the **implicit grid** (size it with `grid-auto-rows`); `grid-auto-flow: dense` back-fills holes.
- `subgrid` (in all engines since 2023) lets nested elements align to the parent's tracks — e.g. card titles and footers lining up across a row of cards.

### `auto-fill` vs `auto-fit`

`repeat(auto-fill | auto-fit, minmax(200px, 1fr))` creates as many columns as fit. The difference only shows when there are **fewer items than columns**: `auto-fill` keeps the empty tracks (items stay narrow), `auto-fit` **collapses** them, so the `1fr` max lets the items stretch across the row.

```ts run
// grid-template-columns: repeat(<mode>, minmax(200px, 1fr)); gap: 16px
function columns(container: number, items: number, mode: 'auto-fill' | 'auto-fit') {
  const min = 200;
  const gap = 16;
  const tracks = Math.max(1, Math.floor((container + gap) / (min + gap)));
  const used = mode === 'auto-fit' ? Math.min(tracks, items) : tracks; // auto-fit collapses empty tracks
  const itemWidth = (container - gap * (used - 1)) / used;
  return `${mode}: ${tracks} tracks fit, items are ${Math.round(itemWidth)}px wide`;
}
console.log(columns(1000, 2, 'auto-fill'));
console.log(columns(1000, 2, 'auto-fit'));
console.log(columns(1000, 9, 'auto-fit'), '← with enough items they behave the same');
```

The most useful single line of responsive CSS: `grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr));` — the inner `min()` stops a single column overflowing on very narrow screens.

### Flex or grid?

- **Flex** when the **content** should drive sizing along one axis: toolbars, nav bars, button groups, tag lists that wrap, centring one thing.
- **Grid** when the **layout** should drive placement in two dimensions: page shells, card galleries where columns must line up, forms with aligned labels, overlapping items (`grid-area: 1 / 1` stacks them).
- Wrapped flex rows are independent of each other (the last row doesn't align to columns); grid rows and columns always align. They nest happily — a grid page whose header is a flex row.

## Centring (be ready to give several)

```css
/* 1. Grid — the shortest */
.parent { display: grid; place-items: center; }

/* 2. Flexbox */
.parent { display: flex; justify-content: center; align-items: center; }

/* 3. Auto margins inside a flex or grid container */
.parent { display: flex; } .child { margin: auto; }

/* 4. Absolute, unknown size (relative to the containing block) */
.child { position: absolute; top: 50%; left: 50%; translate: -50% -50%; }

/* 5. Absolute, known size */
.child { position: absolute; inset: 0; margin: auto; width: 20rem; height: 10rem; }

/* 6. Horizontal only */
.block { margin-inline: auto; max-width: 60ch; }  /* a block box */
.text  { text-align: center; }                    /* inline content */

/* 7. Vertical in plain block layout — works in all engines since 2024 */
.parent { align-content: center; }
```

## Responsive design

- **Media queries** respond to the **viewport** (and user preferences). Use the modern range syntax `@media (width >= 48rem)` and preference queries: `prefers-reduced-motion`, `prefers-color-scheme`, `(hover: hover)`, `(pointer: coarse)`.
- **Container queries** respond to the **component's container**, so the same card can be compact in a sidebar and wide in the main column:

```css
.card-slot { container: card / inline-size; } /* name / type */

.card { display: grid; gap: 1rem; }
@container card (inline-size > 30rem) {
  .card { grid-template-columns: 10rem 1fr; }
}
.card h3 { font-size: clamp(1rem, 4cqi, 1.5rem); } /* cqi = 1% of the container's inline size */
```

The container can't size itself from its children along the queried axis (that would be circular), so put `container-type` on a wrapper whose width comes from the layout (it also makes that wrapper an independent formatting context, like `flow-root`).

**Units to know:**

| Unit | Relative to | Use it for |
|---|---|---|
| `rem` | Root font size (respects the user's browser setting) | Type, spacing — the default choice |
| `em` | The element's font size (for `font-size`: the parent's) | Things that should scale with local text, e.g. icon size, button padding. Compounds when nested |
| `%` | Usually the containing block | Fluid widths |
| `vw` / `vh` | The viewport | Full-bleed sections; avoid `vw`-only font sizes (they don't respond to zoom) |
| `svh` / `lvh` / `dvh` | Small / large / dynamic viewport | `min-height: 100dvh` instead of `100vh`, which overflows under mobile URL bars |
| `ch` | Width of the "0" glyph | Readable line lengths: `max-width: 65ch` |
| `cqi` / `cqw` | The query container | Component-relative sizing |

**`clamp(min, preferred, max)`** gives fluid values with bounds — fluid typography without media queries. Include a `rem` term in the preferred value so text still scales with user zoom:

```ts run
// font-size: clamp(1rem, 0.75rem + 1.5vw, 2rem), root font-size 16px
const rem = 16;
function fontSize(viewportWidth: number) {
  const preferred = 0.75 * rem + 0.015 * viewportWidth; // 1.5vw = 1.5% of the viewport width
  return Math.min(Math.max(preferred, 1 * rem), 2 * rem);
}
for (const vw of [320, 768, 1024, 1440, 1920]) {
  console.log(`${vw}px viewport → ${fontSize(vw).toFixed(1)}px`);
}
```

## Modern CSS worth name-dropping (accurately)

- **`:has()`** — the relational ("parent") selector, in all engines since late 2023: `.card:has(img)`, `form:has(:user-invalid) .submit`, `body:has(dialog[open]) { overflow: hidden; }`.
- **Native nesting** (all engines since 2023): `.card { & .title { … } &:hover { … } }`. Gotcha: nested selectors behave like `:is()`, so `.a, #b { & .c {} }` gives `.c` a specificity of (1,1,0) even when it's inside `.a`.
- **Custom properties** are real runtime values: inherited, cascading, changeable from JS or React (`style={{ '--progress': '40%' } as React.CSSProperties}`), unlike Sass variables, which compile away. `@property` registers a type so a custom property can be animated (e.g. gradient angles).
- **Logical properties**: `margin-inline`, `padding-block`, `inset-inline-start`, `inline-size` — they follow writing direction, so RTL layouts work without overrides.
- Also current and widely supported: `@layer`, `aspect-ratio`, `gap` in flexbox, `:focus-visible`, `text-wrap: balance`, `color-mix()` and `oklch()` colours, `@starting-style` for entry animations. Newer and still rolling out across engines: `@scope`, CSS anchor positioning, style queries — say "check support" if you mention them.

## Styling approaches in React: the trade-offs

| Approach | How it works | Strengths | Costs |
|---|---|---|---|
| Global CSS + a convention (BEM) | Plain stylesheets | Zero runtime, simple | Global namespace, dead CSS is hard to find |
| **CSS Modules** | `import s from './Card.module.css'` → hashed, locally scoped class names at build time | Scoped, zero runtime, plain CSS, built into Vite and Next.js | Dynamic styles via extra classes or custom properties; sharing across files is clunky |
| **Tailwind CSS** (v4) | Utility classes; CSS generated at build time from what you use | Consistent design tokens, CSS size doesn't grow with features, no naming, colocated | Long class strings, needs `clsx`/`tailwind-merge` for variants, a team convention |
| **Runtime CSS-in-JS** (styled-components, Emotion) | Styles written in JS, serialised and injected **at runtime** | Prop-driven dynamic styles, colocation, theming | Runtime cost (serialising and inserting rules during render, triggering style recalc), larger JS, SSR set-up, poor fit with React Server Components. styled-components has been in maintenance mode since 2025 |
| **Zero-runtime CSS-in-JS** (vanilla-extract, Linaria, Panda CSS, StyleX) | Styles authored in TS, **extracted to static CSS at build time** | Type-safe, no runtime, RSC-friendly | Build tooling; dynamic values go through CSS variables |
| Inline `style` prop | Object → `style` attribute | Truly dynamic values (positions, progress) | No pseudo-classes, media queries or hover; hard to override |

> [!INTERVIEW] Say it like this
> "For a new React app I'd use CSS Modules or Tailwind, with design tokens as CSS custom properties — both are zero-runtime and work with server components. I'd avoid runtime CSS-in-JS for new work because it serialises and injects styles during render, which costs main-thread time and complicates streaming SSR. If the team wants TypeScript-authored styles, a zero-runtime library like vanilla-extract gives that without the runtime cost."

## Key takeaways

- **Cascade order:** origin & importance → context → inline styles → layers → specificity → order. Unlayered beats layered; `!important` reverses layer order.
- **Specificity** is (IDs, classes/attributes/pseudo-classes, types/pseudo-elements), compared column by column. `:is/:not/:has` = most specific argument; `:where` = 0.
- Inherited values have no specificity; any direct rule beats them.
- Use `border-box`. A **BFC** contains floats and stops margin collapsing; `display: flow-root` creates one cleanly.
- `z-index` only competes **within a stacking context**; know the creators (positioned + z-index, opacity, transform, filter, isolation…). Portals or the top layer escape them.
- `transform`/`filter`/`contain` ancestors break `position: fixed`.
- `flex: 1` = `1 1 0%`. Flex items need `min-width: 0` to shrink below their content; grid tracks need `minmax(0, 1fr)`.
- `auto-fit` collapses empty tracks, `auto-fill` keeps them.
- Media queries for the page, **container queries** for components; `rem` for sizing, `dvh` for full-height, `clamp()` for fluid values.
