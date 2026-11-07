## Why interviewers ask about accessibility

Accessibility (a11y) shows up in frontend interviews in two ways. Sometimes it is the question ("How do you make a custom dropdown accessible?"). Far more often it's the **hidden rubric** inside a UI-build round: you build a modal, tabs or an autocomplete, and the interviewer quietly checks whether you used a `<button>`, labelled the input, handled the keyboard, and put focus back where it came from. Many companies score this explicitly for senior roles, because accessibility bugs are expensive (legal exposure, rework, lost users) and because a11y-fluent engineers also tend to write semantic, testable components.

A strong answer demonstrates three things:

1. You **default to semantic HTML** and know what it gives you for free.
2. You can name the **specific WCAG criteria** that matter (not "make it accessible" hand-waving).
3. You know where native HTML ends and **ARIA + keyboard + focus management** begin (Lesson 2 and 3).

## Who benefits — it's not a niche

The WHO estimates **1.3 billion people (about 1 in 6)** live with a significant disability. But the useful framing for interviews is Microsoft's *Inclusive Design* spectrum: the same design helps people with **permanent**, **temporary** and **situational** limitations.

| Ability | Permanent | Temporary | Situational |
|---|---|---|---|
| Vision | Blind, low vision | Dilated pupils, lost glasses | Glare on a phone in sunlight |
| Motor | Limb difference, tremor, RSI | Broken wrist | Holding a baby, on a bumpy train |
| Hearing | Deaf, hard of hearing | Ear infection | Loud café, sleeping partner |
| Cognitive | Learning disability, ADHD | Concussion, medication | Distraction, stress, a second language |

And the assistive technology (AT) your UI must work with:

- **Screen readers** — VoiceOver (macOS/iOS), NVDA and JAWS (Windows), TalkBack (Android), Narrator. They read the **accessibility tree**, not your pixels.
- **Keyboard-only and switch access** — every action must be reachable and operable without a pointer.
- **Voice control** (Voice Control on macOS/iOS, Dragon) — users say "click Submit", which only works if the **visible label matches the accessible name**.
- **Magnification and zoom** — 200%–400% zoom, reflow at narrow widths.
- **Forced colors / high contrast** (Windows) — your colours are replaced; anything conveyed only by `box-shadow` or background colour can disappear.
- **Captions and transcripts** for audio/video.

> [!INTERVIEW] Say it like this
> "Accessibility means people can perceive, operate and understand the UI regardless of how they interact with it — screen reader, keyboard, voice, zoom. It isn't a niche: about one in six people has a disability, and everyone has temporary or situational limitations. In practice it also produces better-structured, more testable code."

## The legal context (high level)

You are not expected to be a lawyer, but you should be able to say *why companies care* in one breath:

- **US — ADA.** Title III (businesses open to the public) has been applied to websites and apps by courts for years; thousands of digital-accessibility lawsuits are filed each year. A 2024 DOJ rule under Title II adopted **WCAG 2.1 AA** as the technical standard for state and local government web content and apps.
- **US — Section 508.** Federal agencies (and their vendors) must meet it; since the 2017 refresh it incorporates **WCAG 2.0 AA**.
- **EU — European Accessibility Act (EAA).** Applies since **28 June 2025** to a broad set of consumer products and services — e-commerce, banking, e-books, transport ticketing and booking, electronic communications — including companies outside the EU that sell into it (micro-enterprises are exempt for services). Conformance is presumed via the harmonised standard **EN 301 549**, whose web requirements incorporate WCAG Level AA (WCAG 2.1 when the EAA took effect).
- Others: UK Equality Act and public-sector regulations, Canada's Accessible Canada Act, and more.

The practical takeaway: **WCAG 2.x Level AA is the de facto target** everywhere. Building to **WCAG 2.2 AA** (the current version) covers the 2.0 and 2.1 requirements too, because each version is backward compatible.

> [!NOTE]
> WCAG 3 is a W3C **working draft** with a different conformance model. It is not a standard yet and no law references it. Say "WCAG 2.2 AA" in interviews.

## WCAG 2.2: POUR and the criteria you'll actually hit

**WCAG 2.2** became a W3C Recommendation in October 2023. It is organised under four principles — **POUR**:

| Principle | Meaning | Typical frontend concerns |
|---|---|---|
| **P**erceivable | Users can perceive the content | Alt text, captions, contrast, not colour-only, reflow |
| **O**perable | Users can operate the UI | Keyboard access, focus order/visibility, target size, no traps, enough time |
| **U**nderstandable | Users can understand content and behaviour | Labels, error messages, predictable behaviour, page language |
| **R**obust | Works with current and future AT | Correct name/role/value, status messages |

Each **success criterion (SC)** has a level: **A** (minimum), **AA** (the legal/industry target, includes A), **AAA** (enhanced, rarely required wholesale). WCAG 2.2 added nine criteria and **removed 4.1.1 Parsing** (obsolete — browsers now parse HTML consistently).

The criteria frontend developers hit most often:

| SC | Level | In one line |
|---|---|---|
| 1.1.1 Non-text Content | A | Images and icons have text alternatives (or are marked decorative) |
| 1.3.1 Info and Relationships | A | Structure shown visually is in the markup: headings, lists, labels, table headers |
| 1.3.5 Identify Input Purpose | AA | Personal-data fields use `autocomplete` tokens |
| 1.4.1 Use of Color | A | Colour is never the *only* way to convey meaning (errors, links in text, chart series) |
| 1.4.3 Contrast (Minimum) | AA | Text **4.5:1**; large text (≥ 24px, or ≥ 18.66px bold) **3:1** |
| 1.4.10 Reflow | AA | No horizontal scrolling at 320 CSS px wide (= 1280px at 400% zoom) |
| 1.4.11 Non-text Contrast | AA | UI component boundaries, focus indicators, meaningful icons **3:1** |
| 1.4.13 Content on Hover or Focus | AA | Tooltips are dismissible (Esc), hoverable, and persistent |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | A | Everything works by keyboard; focus can always move away |
| 2.4.3 Focus Order | A | Focus order preserves meaning |
| 2.4.7 Focus Visible | AA | You can see where keyboard focus is |
| **2.4.11 Focus Not Obscured (Minimum)** | AA · *new in 2.2* | The focused element isn't **entirely** hidden by sticky headers, cookie banners, chat widgets |
| **2.5.7 Dragging Movements** | AA · *new in 2.2* | Anything done by dragging has a single-pointer alternative (e.g. buttons to reorder) |
| **2.5.8 Target Size (Minimum)** | AA · *new in 2.2* | Pointer targets are at least **24×24 CSS px**, or spaced so 24px circles don't overlap |
| 2.5.3 Label in Name | A | The accessible name **contains** the visible label text |
| 3.3.1 / 3.3.2 / 3.3.3 | A / A / AA | Errors identified in text; labels or instructions; suggestions for fixing |
| **3.3.8 Accessible Authentication (Minimum)** | AA · *new in 2.2* | No cognitive tests to log in — allow paste and password managers |
| 4.1.2 Name, Role, Value | A | Every control exposes a name, a role, and its current state/value |
| 4.1.3 Status Messages | AA | Status updates ("3 results", "Saved") are announced without moving focus |

> [!MISTAKE]
> "Touch targets must be 44×44." That's **2.5.5 Target Size (Enhanced), AAA**. The AA requirement in WCAG 2.2 is **24×24 CSS px** — or enough spacing. (Apple's HIG recommends 44pt and Material recommends 48dp; both are good design guidance, but not the WCAG AA rule.)

The spacing exception in 2.5.8 is easy to reason about: draw a 24px-diameter circle centred on each small target; if no circle overlaps another target or another circle, you pass.

```ts run
// 2.5.8 spacing exception for two small targets laid out in a row.
// Each gets a 24px-diameter circle centred on its box; circles must not intersect.
function passesSpacing(sizePx: number, gapPx: number): boolean {
  if (sizePx >= 24) return true; // big enough on its own
  const centreDistance = sizePx + gapPx;
  return centreDistance >= 24; // two radius-12 circles touch at exactly 24px apart
}

for (const [size, gap] of [[16, 4], [16, 8], [20, 2], [20, 4], [24, 0]]) {
  console.log(`${size}px icons, ${gap}px gap →`, passesSpacing(size, gap) ? 'pass' : 'fail');
}
```

You'll implement the contrast formula behind 1.4.3 in today's warm-up exercise.

## Semantic HTML first

Every native element ships with a **role**, a way to compute its **name**, its **states**, **keyboard behaviour** and **focusability**. The browser maps all of that into the accessibility tree. Choosing the right element is 80% of accessibility.

### Landmarks

Landmarks let screen-reader users jump between page regions (VoiceOver's rotor, NVDA's `D` key).

| Element | Implicit role | Notes |
|---|---|---|
| `<header>` | `banner` | Only when it's *not* inside `article`, `aside`, `main`, `nav` or `section` |
| `<nav>` | `navigation` | Name multiple navs: `<nav aria-label="Breadcrumb">` |
| `<main>` | `main` | Exactly one visible per page; skip links target it |
| `<aside>` | `complementary` | Related-but-separate content |
| `<footer>` | `contentinfo` | Same scoping rule as `<header>` |
| `<section>` | `region` | **Only if it has an accessible name** (`aria-labelledby` its heading) |
| `<form>` | `form` | Only if named |
| `<search>` | `search` | Newer element for search UIs; `<form role="search">` works everywhere |

### Headings

Screen-reader users most commonly navigate by headings (the `H` key in NVDA/JAWS, the rotor in VoiceOver). Rules of thumb:

- One `<h1>` describing the page; then `<h2>` for sections, `<h3>` within them. Don't skip levels for styling — style with CSS.
- Headings are for **structure**, not for "big bold text". A visually styled `<div className="title">` is invisible to heading navigation.
- The HTML "document outline algorithm" (where `<section><h1>` would become an `<h2>`) was **never implemented** by browsers and was removed from the spec. Use explicit levels.

### Lists, tables, buttons and links

- `<ul>/<ol>` announce "list, 5 items" — users know how much is coming. (Safari/VoiceOver drops list semantics when you set `list-style: none`; add `role="list"` if the count matters.)
- Data tables need `<th>` (with `scope` when ambiguous) and ideally a `<caption>`. Never use tables for layout.
- **Button vs link** — the most-asked semantic question:

| | `<a href>` | `<button>` |
|---|---|---|
| Purpose | **Navigates** (changes URL / goes somewhere) | **Does something** on this page |
| Keys | Enter | Enter **and** Space |
| Extras | Open in new tab, copy link, history, links list | `type="submit"` by default inside a form; `disabled` |
| Wrong use | `<a href="#" onClick>` for actions | `<button onClick={() => navigate('/x')}>` for navigation |

An `<a>` **without `href`** is not focusable and has no link role. And a `<div onClick>` has *nothing*: no role, no focus, no keyboard activation, no name computed from a label, no disabled state.

{{quiz:button-vs-link}}

### Native controls over custom ones

`<select>`, `<input type="checkbox|radio|range|date">`, `<details>/<summary>`, `<dialog>` all come with keyboard support, focus handling and correct semantics that you'd otherwise rebuild (and test across five screen readers). Styling has become far easier — `accent-color`, `appearance: none`, `:has()`, and Chromium's emerging customizable `<select>` — so "I couldn't style it" is a weaker excuse every year.

## Forms

Forms are where most real-world a11y failures live. The checklist:

1. **Every input has a programmatic label.** `<label htmlFor={id}>` or wrapping `<label>Email <input/></label>`. Clicking the label focuses the input — a bigger target for free. In React, generate ids with `useId()` so multiple instances don't collide.
2. **Placeholder is not a label.** It disappears on input, is usually low contrast, and isn't reliably exposed as the name.
3. **Group related controls** with `<fieldset>` + `<legend>` — radio groups, checkbox groups, "Shipping address". The legend is announced when focus enters the group.
4. **`autocomplete`** on personal data (`name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`, `current-password`, `new-password`, `one-time-code`). It's an AA criterion (1.3.5) and it massively helps people with motor and cognitive disabilities.
5. **Required fields**: `required` (native, exposed as "required") or `aria-required="true"` for custom widgets; indicate it visually in text, not only with a red asterisk.
6. **Errors**: text that says what's wrong and how to fix it, linked to the field, with state exposed:

```tsx
function EmailField({ error }: { error?: string }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id}>Email</label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
}
```

A screen reader then says something like *"Email, edit text, required, invalid entry, Enter an email address like name@example.com"*. On submit, either move focus to the first invalid field or to an error summary, and/or announce the result through a live region (Lesson 2). You'll build exactly this in the exercises.

> [!MISTAKE]
> Disabling the submit button until the form is valid. Users can't discover *why* it's disabled (disabled buttons aren't focusable, and many screen-reader users never hear the reason). Keep it enabled and explain errors on submit.

## Images and alt text

The `alt` attribute answers: *"If this image were replaced by text, what text would do the same job?"*

| Image type | `alt` | Example |
|---|---|---|
| Informative | Describe the information it conveys | `alt="Bar chart: revenue doubled from Q1 to Q4"` |
| Functional (inside a link/button) | Describe the **action or destination** | Magnifier icon in a search button → `alt="Search"` |
| Decorative | `alt=""` (empty, **not missing**) | Background flourish, an icon next to text that already says the same |
| Image of text | The text itself | A logo → the company name |
| Complex (charts, diagrams) | Short `alt` + full description nearby | `<figure>` + `<figcaption>`, or a data table |

Rules that come up in interviews:

- **Missing `alt` ≠ empty `alt`.** With no `alt`, many screen readers fall back to the filename ("IMG underscore 2048 dot jpeg"). `alt=""` tells AT to skip the image.
- Don't start with "Image of…" — the role is already announced.
- **Icon-only buttons** need a name on the *button*: `<button aria-label="Close"><svg aria-hidden="true">…</svg></button>` (or visually hidden text inside the button).
- Inline **SVG**: decorative → `aria-hidden="true"`; meaningful → `role="img"` with `aria-label` (or a `<title>` referenced by `aria-labelledby`).
- **CSS background images** are invisible to AT — only use them for decoration.
- Context matters: the same photo might be informative in a news article and decorative in a hero banner.

{{quiz:alt-functional-image}}

> [!TIP]
> In React, `alt=""` must be written explicitly. `eslint-plugin-jsx-a11y` flags missing `alt`, `onClick` on non-interactive elements, and many other issues at lint time — it's the cheapest a11y test you'll ever add.

## Key takeaways

- A11y is graded in most UI rounds even when it isn't the question. Default to semantic HTML and say why.
- Benefits are broad: permanent, temporary and situational limitations; screen readers, keyboard, voice control, zoom, forced colors.
- Legal pressure (ADA, Section 508, the EAA since June 2025) all points to **WCAG 2.x AA**; build to **WCAG 2.2 AA**.
- Know the numbers: **4.5:1** text, **3:1** large text and UI components/focus indicators, **24×24** target size (AA), 320px reflow.
- Landmarks, real heading levels, lists, `<button>` for actions and `<a href>` for navigation.
- Forms: label every input, `fieldset/legend` for groups, `autocomplete`, errors in text linked by `aria-describedby` + `aria-invalid`.
- `alt` describes purpose; decorative images get `alt=""`; icon-only buttons need a name on the button.
