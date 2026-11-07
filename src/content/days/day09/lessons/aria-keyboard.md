## Why interviewers ask about ARIA and keyboard support

Every custom widget question — dropdown, tabs, autocomplete, date picker, modal — is secretly an ARIA-and-keyboard question. Interviewers want to hear that you **reach for native HTML first**, and when you can't, that you know the exact **roles, states and keyboard contract** for the pattern, and that you understand ARIA changes *semantics only*. The fastest way to sound junior is to sprinkle `aria-label` and `role="button"` everywhere; the fastest way to sound senior is to say *"no ARIA is better than bad ARIA"* and then explain precisely when ARIA is the right tool.

## What ARIA is — and what it isn't

**WAI-ARIA** (Accessible Rich Internet Applications, currently 1.2) is a set of attributes that modify the **accessibility tree** — the parallel tree the browser builds from the DOM and exposes to assistive technology via platform APIs (UIA on Windows, AX API on macOS, AT-SPI on Linux). Each node in that tree has a **role**, a **name**, optionally a **description**, **states** (checked, expanded, pressed, selected, disabled, invalid…) and sometimes a **value**.

ARIA can:

- **Add or change a role** — `role="tab"`, `role="dialog"`.
- **Set a name or description** — `aria-label`, `aria-labelledby`, `aria-describedby`.
- **Expose state** — `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-checked`, `aria-invalid`.
- **Express relationships** the DOM can't — `aria-controls`, `aria-activedescendant`, `aria-owns`.
- **Announce changes** — live regions.

ARIA **cannot**: make an element focusable, add keyboard behaviour, change how it looks, or make it respond to clicks. `role="button"` is a *promise* to the user that this thing behaves like a button. You now have to keep that promise yourself:

| A native `<button>` gives you | A `<div role="button">` needs |
|---|---|
| Role "button" | ✅ the role (that's all ARIA added) |
| In the tab order | `tabIndex={0}` |
| Enter activates (on keydown) | an `onKeyDown` handler |
| Space activates (on keyup, without scrolling the page) | `onKeyUp` handler + `preventDefault` on keydown |
| `disabled` removes it from tab order and blocks clicks | `aria-disabled` + manual guards |
| Name from content, form submission, `:focus-visible`… | more code, more bugs |

## The rules of ARIA use

The W3C's *Using ARIA* note lists five rules. Learn the first one word for word:

1. **If you can use a native HTML element or attribute with the semantics and behaviour you need, do that** instead of repurposing an element and adding ARIA.
2. **Don't change native semantics** unless you really have to (`<h2 role="tab">` is wrong; put a `<button role="tab">` inside the heading, or restructure).
3. **All interactive ARIA controls must be keyboard operable.**
4. **Don't use `role="presentation"` or `aria-hidden="true"` on a focusable element** — keyboard users would land on something that doesn't exist for their screen reader.
5. **All interactive elements must have an accessible name.**

The APG summarises it as **"No ARIA is better than bad ARIA."** It's not a slogan: WebAIM's annual scan of the top one million home pages has consistently found that pages *using* ARIA average noticeably *more* detected accessibility errors than pages without it. Wrong ARIA actively lies to users — a `role="menu"` that doesn't support arrow keys, or `aria-expanded="false"` on something that's open, is worse than no ARIA at all.

> [!INTERVIEW] Say it like this
> "My first rule is the first rule of ARIA: use the native element if one exists, because it brings role, name, keyboard support and focus behaviour for free. ARIA only changes what assistive tech is *told*; it doesn't add behaviour. So when I do need a custom widget, I follow the APG pattern for it — roles, states and the full keyboard contract — and I test it with a screen reader, because wrong ARIA is worse than none."

## Roles, states and properties

**Roles** come in categories: landmark (`main`, `navigation`), document structure (`heading`, `list`, `img`, `table`), **widget** (`button`, `checkbox`, `switch`, `tab`, `option`, `menuitem`, `combobox`, `slider`), composite containers (`tablist`, `listbox`, `menu`, `grid`, `tree`), window (`dialog`, `alertdialog`) and live region (`status`, `alert`, `log`, `timer`).

**States** change with interaction; **properties** describe relationships or characteristics and change less often. The ones you'll use weekly:

| Attribute | Use it for | Values |
|---|---|---|
| `aria-expanded` | Disclosure buttons, combobox, menu buttons | `true` / `false` (on the *controlling* element) |
| `aria-pressed` | Toggle buttons (Bold, Mute) | `true` / `false` / `mixed` |
| `aria-selected` | Current tab, active option, selected grid cell | `true` / `false` |
| `aria-checked` | `checkbox`, `switch`, `menuitemcheckbox`, `radio` roles | `true` / `false` / `mixed` |
| `aria-current` | Current item in a set: page in nav, step in a wizard | `page`, `step`, `date`, `true`… |
| `aria-invalid` | Field failed validation | `true` / `false` |
| `aria-disabled` | Disabled but still focusable/discoverable | `true` / `false` |
| `aria-haspopup` | Button opens a menu/listbox/dialog | `menu`, `listbox`, `dialog`… |
| `aria-controls` | Element whose content this one controls | id reference |
| `aria-busy` | Region is updating; AT may wait | `true` / `false` |

React notes: ARIA attributes stay **lowercase and hyphenated** in JSX (`aria-expanded`, not `ariaExpanded`), and React stringifies booleans for them — `aria-expanded={open}` renders `aria-expanded="false"`. Pass `undefined` to omit an attribute entirely.

### Hiding things — four different tools

| Technique | Visible? | In a11y tree? | Focusable / clickable? |
|---|---|---|---|
| `hidden` attribute / `display: none` | No | No | No |
| `aria-hidden="true"` | **Yes** | No | **Yes** (danger: rule 4) |
| "Visually hidden" CSS (`.sr-only`) | No | **Yes** | Yes |
| `inert` attribute | Yes | No | **No** — ideal for the page behind a modal |

```css
/* The standard visually-hidden utility: readable by screen readers, invisible on screen */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

## Accessible names and descriptions

The **accessible name** is what AT announces to identify an element ("Search, button"). The algorithm (*Accessible Name and Description Computation*) is long, but for interviews the precedence is:

1. **`aria-labelledby`** — concatenates the text of the referenced element(s), in the order listed. It works even if the referenced element is hidden, and it **wins over everything**.
2. **`aria-label`** — a string.
3. **Native labelling** — `<label for>`, `alt` on `<img>`, `<caption>` for tables, `<legend>` for fieldsets, `<title>` in SVG.
4. **Name from content** — for roles that allow it (button, link, heading, tab, option, menuitem, cell…), the element's text content, skipping `aria-hidden` descendants.
5. **`title` attribute** (and `placeholder` for inputs) — last-resort fallbacks; don't rely on them.

| Markup | Accessible name |
|---|---|
| `<button>Save</button>` | "Save" (content) |
| `<button aria-label="Close"><svg aria-hidden="true"/></button>` | "Close" |
| `<button aria-label="Close">Cancel</button>` | "Close" — `aria-label` **overrides** visible text (and breaks 2.5.3 Label in Name) |
| `<span id="t">Delete file?</span>` + `<div role="dialog" aria-labelledby="t" aria-label="Dialog">` | "Delete file?" — labelledby wins |
| `<input placeholder="Email">` | "Email", but only as a weak fallback — still add a label |
| `<div aria-label="Card">…</div>` | **Nothing reliable** — `aria-label` is prohibited on generic elements (`div`, `span` with no role) |

The **accessible description** (`aria-describedby`) is supplementary: it's announced *after* the name, role and state, often after a short pause, and users can turn descriptions down. Put hints, format requirements and error messages there — never the only copy of essential information.

> [!MISTAKE]
> Using `aria-label` to "improve" a link: `<a href="/report" aria-label="Click here to download the PDF report">Download</a>`. Now voice-control users who say "click Download" can't activate it (the name doesn't contain the visible text — 2.5.3 Label in Name), and many automatic page translators don't translate `aria-label`. Prefer visible text, or start the `aria-label` with the visible label.

{{quiz:label-in-name}}

## Live regions: announcing changes without moving focus

Screen readers read what has focus and what the user navigates to. When something changes elsewhere — "3 results found", "Saved", "Item added to cart" — they won't notice unless you use a **live region** (that's WCAG 4.1.3 Status Messages).

| Markup | Behaviour |
|---|---|
| `aria-live="polite"` | Announced when the user is idle. Use for almost everything. |
| `aria-live="assertive"` | Interrupts current speech. Only for urgent, time-sensitive messages. |
| `role="status"` | Implicitly `aria-live="polite"` + `aria-atomic="true"` |
| `role="alert"` | Implicitly `aria-live="assertive"` + `aria-atomic="true"` |
| `role="log"` | Polite, new entries appended (chat, activity feeds) |
| `aria-atomic="true"` | Read the whole region, not just the changed node |

**The rule everyone gets wrong:** the live region must **already exist in the DOM** (and in the accessibility tree) **before** its content changes. Screen readers subscribe to regions they've seen; injecting a brand-new `<div aria-live>` *with* text is often silently ignored. (`role="alert"` inserted with content is announced by many screen readers, but it's the exception you shouldn't depend on.)

```tsx
function SearchResultsStatus({ count, loading }: { count: number; loading: boolean }) {
  // ✅ Always rendered. Only its text changes.
  return (
    <div role="status" className="sr-only">
      {loading ? '' : `${count} result${count === 1 ? '' : 's'} found`}
    </div>
  );
}

// ❌ Mounted together with its text — frequently not announced
// {saved && <div role="status">Saved</div>}
```

Two more practicalities: identical text twice in a row may not be re-announced (clear it first, or vary the message), and toasts that auto-dismiss need to stay long enough to read — or be dismissible and reachable (WCAG 2.2.1 Timing Adjustable).

## Keyboard support

### Tab order and `tabindex`

Tab order follows **DOM order**. Keep the DOM order meaningful and don't use CSS (`order`, absolute positioning, `flex-direction: row-reverse`) to make visual order diverge from it.

| `tabindex` | Effect | Use for |
|---|---|---|
| (none) on native controls | Focusable in DOM order | Buttons, links, inputs — most of the time |
| `0` | Adds a non-native element to the tab order, in DOM order | Custom widgets (`role="slider"`), scrollable regions |
| `-1` | Focusable **by script** (`el.focus()`) but not by Tab | Headings/containers you move focus to; inactive items in roving tabindex |
| **Positive** (`1`, `2`…) | Jumps ahead of everything else in the page | **Never.** It breaks focus order (2.4.3) and is unmaintainable |

### Key conventions

| Key | Expected behaviour |
|---|---|
| Tab / Shift+Tab | Move **between** widgets (one stop per composite widget) |
| Arrow keys | Move **within** a composite widget (tabs, menu, listbox, radio group, grid) |
| Enter | Activate buttons and links; submit forms |
| Space | Activate buttons; toggle checkboxes; select in listboxes |
| Escape | Close the popup/dialog and return focus to what opened it |
| Home / End | First / last item in a composite |
| Typeahead (letters) | Jump to the item starting with that letter (menus, listboxes, trees) |

### Make focus visible

Never remove the outline without replacing it. Use `:focus-visible` so mouse users don't see rings on click while keyboard users always do:

```css
button:focus-visible,
a:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid #1a5fd0;   /* ≥ 3:1 against adjacent colours (1.4.11) */
  outline-offset: 2px;
}
/* box-shadow rings vanish in Windows forced-colors mode; outlines survive.
   If you must use box-shadow, add a transparent outline as a fallback. */
```

## Composite widgets: roving tabindex vs `aria-activedescendant`

A composite widget (tablist, toolbar, listbox, menu, grid, radio group) is **one tab stop**. Inside it, arrow keys move. There are two ways to implement "which item is current":

**Roving tabindex** — move real DOM focus. Exactly one item has `tabIndex={0}`, all others `-1`; on arrow keys, swap the values and call `.focus()` on the new item. When the user tabs away and back, they land on the last active item. You built this for Tabs on Day 6.

**`aria-activedescendant`** — DOM focus stays on the container (or an input); the container's `aria-activedescendant` holds the **id** of the active item, and you style that item as active. AT announces the referenced item as if it were focused.

| | Roving tabindex | `aria-activedescendant` |
|---|---|---|
| Real DOM focus moves? | Yes | No — stays on container/input |
| Browser scrolls item into view | Yes (focus does it) | No — call `scrollIntoView` yourself |
| `:focus-visible` styling | Works natively | Style an "active" class manually |
| Required when | — | Focus must stay in a text input (**editable combobox**) |
| Typical patterns | Tabs, toolbar, menu, radio group, tree | Combobox + listbox, sometimes grids/listboxes |
| Gotchas | Must keep exactly one `tabIndex=0` | Items need stable ids and must be in the DOM; support has historically been weaker with some AT |

The arrow-key maths is the same for both — interviewers like to see wrapping and Home/End handled cleanly:

```ts run
type NavKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

function nextIndex(current: number, key: NavKey, count: number, wrap = true): number {
  if (count === 0) return -1;
  switch (key) {
    case 'Home': return 0;
    case 'End': return count - 1;
    case 'ArrowDown':
      if (current >= count - 1) return wrap ? 0 : count - 1;
      return current + 1; // also handles current = -1 (nothing active yet) → 0
    case 'ArrowUp':
      if (current <= 0) return wrap ? count - 1 : 0;
      return current - 1;
  }
}

console.log(nextIndex(2, 'ArrowDown', 3));        // wraps → 0
console.log(nextIndex(0, 'ArrowUp', 3));          // wraps → 2
console.log(nextIndex(-1, 'ArrowDown', 3));       // nothing active → 0
console.log(nextIndex(0, 'ArrowUp', 3, false));   // no wrap → 0
console.log(nextIndex(1, 'End', 3));              // → 2
```

{{quiz:roving-one-tabstop}}

## APG patterns to know cold

The **WAI-ARIA Authoring Practices Guide (APG)** documents the expected roles, states and keyboard behaviour for common widgets. Treat it as the reference — and remember its own caveat: the examples demonstrate patterns, they aren't production-tested across every browser/screen-reader combination.

**Disclosure (show/hide)**
- `<button aria-expanded="false" aria-controls="panel-id">` + the panel.
- Enter/Space toggles. That's all — no arrow keys. Also the right pattern for **site navigation dropdowns**.

**Tabs**
- `role="tablist"` (named), `role="tab"` with `aria-selected` and `aria-controls`, `role="tabpanel"` with `aria-labelledby` → its tab.
- Roving tabindex: Left/Right (or Up/Down for vertical) move between tabs, Home/End to the ends. Tab moves *into the panel*.
- **Automatic activation** (panel switches on arrow) if panels render instantly; **manual** (arrow moves focus, Enter/Space activates) if switching is slow.

**Dialog (modal)**
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (the title) and optionally `aria-describedby`.
- Focus moves inside on open, Tab/Shift+Tab stay inside, Escape closes, focus returns to the invoking element. Background is inert. (Lesson 3 goes deep.)

**Menu button**
- `<button aria-haspopup="menu" aria-expanded>` controlling `role="menu"` with `role="menuitem"` children (or `menuitemcheckbox`/`menuitemradio`).
- Enter/Space/ArrowDown open and focus the first item; ArrowUp may open and focus the last; arrows move (roving tabindex or activedescendant); Escape closes and returns focus to the button; Tab closes the menu; typeahead jumps.
- Use it for **application-style action menus** ("Edit / Duplicate / Delete"), **not** for a website's navigation links.

**Combobox + listbox**
- `<input role="combobox" aria-expanded aria-controls="listbox-id" aria-autocomplete="list">` + `role="listbox"` with `role="option"` children.
- DOM focus stays in the input; ArrowDown/ArrowUp set `aria-activedescendant` on the input and `aria-selected="true"` on the active option; Enter accepts; Escape closes (and, per APG, may clear the input if already closed).
- Announce result counts with a polite live region. You'll build this one as today's stretch exercise.

> [!MISTAKE]
> Using `role="menu"` for a site's main navigation. Screen readers switch to an application-style interaction where users expect arrow keys and Escape, and the items aren't announced as links. A nav dropdown is a **disclosure** button controlling a plain list of links.

## Common ARIA mistakes

| Mistake | Why it's wrong | Fix |
|---|---|---|
| `<div role="button" onClick>` | No focus, no Enter/Space | `<button type="button">` |
| `<button role="button">`, `<nav role="navigation">` | Redundant noise | Remove the role |
| `aria-hidden="true"` on something focusable | Keyboard focus lands on "nothing" | `inert`, `hidden`, or `tabIndex={-1}` *and* hide |
| `aria-label` on a `div`/`span` | Prohibited on generic roles; ignored by much AT | Give it a role, or use visible text |
| `aria-expanded` on the panel | State belongs on the **controlling** button | Move it to the trigger |
| Changing a toggle's label *and* setting `aria-pressed` | "Unmute, pressed" contradicts itself | Stable label + `aria-pressed`, *or* a changing label alone |
| `aria-live` region mounted with its text | Often not announced | Render the region empty first |
| `tabIndex={1}` | Breaks focus order | DOM order + `0` / `-1` only |

## Key takeaways

- ARIA changes **semantics only** — never behaviour, focus or styling. A role is a promise you must keep with keyboard support.
- First rule: native element first. "No ARIA is better than bad ARIA."
- Name precedence: `aria-labelledby` → `aria-label` → native label/alt/content → `title`. Description = `aria-describedby`, supplementary.
- Visible label text should be in the accessible name (Label in Name) — mind `aria-label` overrides.
- Live regions must exist before they change; `role="status"` (polite) for most updates, `role="alert"` (assertive) for urgent ones.
- `tabindex`: `0` and `-1` only. Make focus visible with `:focus-visible` and an outline.
- Composite widgets are one tab stop; arrows move within via **roving tabindex** (real focus) or **`aria-activedescendant`** (focus stays put — required for editable comboboxes).
- Know the APG contracts for disclosure, tabs, modal dialog, menu button and combobox.
