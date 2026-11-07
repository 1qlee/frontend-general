## Why interviewers ask about focus management and testing

"Build a modal" is one of the most common frontend UI rounds, and the a11y part of the rubric is almost entirely **focus management**: where focus goes on open, whether it can escape, what Escape does, and where it lands on close. SPAs make this harder than server-rendered pages: React swaps DOM nodes under the user's focus all the time, and the browser silently drops focus on `<body>`. The second half of the question is always **"how would you test it?"** — and "I'd run Lighthouse" is the junior answer. The senior answer is a layered strategy: lint, role-based component tests, axe in CI, and a manual keyboard + screen-reader pass.

## The modal dialog contract

| Requirement | How |
|---|---|
| Identify it | `role="dialog"` (or `alertdialog` for urgent confirmations), `aria-modal="true"`, `aria-labelledby` → visible title, optional `aria-describedby` |
| Initial focus | First focusable element by default; the **least destructive** action for confirmations; the title/container (`tabIndex={-1}`) for long content |
| Contain focus | Tab / Shift+Tab wrap inside the dialog |
| Hide the background | `inert` on everything outside (also blocks clicks and the screen reader's virtual cursor) |
| Close | Escape, a visible close/cancel button; backdrop click only for non-critical dialogs |
| Restore focus | Back to the element that opened it (or a logical successor if that element is gone) |
| Prevent background scroll | `overflow: hidden` on `<html>` while open |

The essential lifecycle lives in one effect — save focus, move it in, and give it back in cleanup (which runs both when `open` turns false and on unmount):

```tsx
useEffect(() => {
  if (!open) return;
  const previouslyFocused = document.activeElement as HTMLElement | null; // read BEFORE moving focus
  const dialog = dialogRef.current!;
  (initialFocusRef?.current ?? firstTabbable(dialog) ?? dialog).focus();

  return () => {
    previouslyFocused?.focus(); // runs on close and on unmount
  };
}, [open]); // NOT onClose — a new inline arrow each render would re-run this and steal focus
```

Tab containment is a `keydown` handler that checks "am I on the last/first tabbable element?" and wraps with `preventDefault()` + `.focus()`. You'll write the whole thing in today's core exercise.

### Why `aria-modal` alone isn't enough

`aria-modal="true"` tells assistive tech that content outside the dialog is unavailable, but screen-reader support has historically been inconsistent, and it does nothing for mouse users or for focus. A Tab trap, in turn, does nothing for a screen reader's **virtual cursor** (browse mode), which can read past the dialog into the page behind. The robust combination is **`aria-modal` + `inert` on the background + a focus trap**.

`inert` is supported in all modern browsers. In **React 19** it's a regular boolean prop (`<main inert={dialogOpen}>`); React 18 didn't recognise it, which is why older code writes `inert=""`. If your dialog is portalled to `document.body`, you can set `inert` on the app root while it's open — make sure the dialog isn't *inside* the element you make inert.

### Native `<dialog>` and `showModal()`

The platform now does most of this for you:

```tsx
function NativeDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // `close` fires for Escape, form[method=dialog] buttons, and dialog.close()
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      {children}
      <form method="dialog">
        <button>Close</button>
      </form>
    </dialog>
  );
}
```

`showModal()` gives you: the **top layer** (no z-index wars), a stylable `::backdrop`, an **inert background**, **Escape** to close (`cancel` then `close` events), initial focus on the `autofocus` element or the first focusable one, and — in current browsers — focus returned to the previously focused element on close. What it does **not** give you: an accessible name (add `aria-labelledby`), a Tab trap (focus can move to the browser's address bar — acceptable, since the page behind is inert), scroll locking, or React state sync (listen to `close`). The newer `closedby` attribute adds light-dismiss behaviour; check support before relying on it. Use `show()` (non-modal) only for non-blocking panels.

> [!NOTE]
> jsdom doesn't implement `showModal()`, which is one reason component libraries — and today's exercise — still build modals from a `div`. In a real app, the native element is a strong default.

> [!INTERVIEW] Say it like this
> "A modal needs four things: identity — `role=dialog`, `aria-modal` and a label from its title; focus moved in on open; focus contained while open — Tab wraps and the background is `inert`; and on close, via Escape or a button, focus goes back to the element that opened it. Today I'd start from the native `<dialog>` with `showModal()`, which gives me the inert background, Escape and focus restoration, and add the label and React state sync."

## Focus after things change

Whenever the element that has focus disappears, the browser moves focus to `<body>`. For a keyboard or screen-reader user that means "I'm at the top of the page and I don't know what happened". The fix is always the same: **decide where focus should go, and put it there**.

### Route changes in SPAs

A full page load resets focus and screen readers announce the new title. A client-side navigation does neither — focus stays on the (possibly unmounted) link. Common approaches:

- Move focus to the new page's `<h1>` (with `tabIndex={-1}`) or to `<main>`, and update `document.title`. React 19 lets you render `<title>` inside components; it's hoisted into `<head>`.
- Optionally announce "Navigated to *Page title*" via a polite live region. Next.js's App Router ships a route announcer; React Router leaves focus management to you.

```tsx
function PageHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation(); // from your router
  useEffect(() => {
    ref.current?.focus(); // focus moves to the new page's heading on navigation
  }, [pathname]);
  return (
    <h1 ref={ref} tabIndex={-1} style={{ outline: 'none' }}>
      {children}
    </h1>
  );
}
```

(Removing the outline on a `tabIndex={-1}` heading is acceptable — it isn't interactive; it's a reading position.)

### Deleting items

The user presses "Delete" on item 3 of 5. The button is gone, so focus falls to `<body>`. Move it to something meaningful — usually the **next** item (or its delete button), the **previous** one if it was last, or the list's heading/container if the list is now empty — and announce "Item deleted" through a status region.

```ts run
// Which element should receive focus after deleting items[index]?
function focusTargetAfterDelete(ids: string[], index: number): string {
  const remaining = ids.filter((_, i) => i !== index);
  if (remaining.length === 0) return 'list-heading';   // empty → the list's heading
  return remaining[Math.min(index, remaining.length - 1)]; // next item, or previous if last
}

const ids = ['a', 'b', 'c', 'd'];
console.log(focusTargetAfterDelete(ids, 1)); // 'c' — the item that slid into the gap
console.log(focusTargetAfterDelete(ids, 3)); // 'c' — deleted the last one → previous
console.log(focusTargetAfterDelete(['only'], 0)); // 'list-heading'
```

{{quiz:focus-after-delete}}

### Focus lost on re-render — the React-specific bugs

| Cause | What happens | Fix |
|---|---|---|
| A component **defined inside** another component | New component type every render → remount → focused input loses focus after each keystroke | Define components at module level |
| Unstable `key` (`Math.random()`, index keys on a list that reorders) | Elements remount | Stable ids as keys |
| Swapping elements: `{editing ? <input/> : <button>Edit</button>}` | The focused node is removed | Focus the new element in an effect (ref), and focus "Edit" again on save/cancel |
| Setting `disabled` on the focused button during submit | Disabled elements can't hold focus → `<body>` | Use `aria-disabled="true"` + ignore clicks while pending |
| Closing a popover by unmounting it | Focus inside it is lost | Return focus to the trigger on close |

`autoFocus` in React calls `.focus()` on mount (React handles it in JS, not via the HTML attribute). Use it sparingly — on page load it can skip content a screen-reader user needs to hear first; inside a freshly opened dialog or an inline edit field it's appropriate.

## Skip links

A **skip link** (WCAG 2.4.1 Bypass Blocks) lets keyboard users jump past repeated navigation. It's the first focusable element on the page, visually hidden until focused:

```tsx
<a className="skip-link" href="#main">Skip to main content</a>
{/* …header and nav… */}
<main id="main" tabIndex={-1}>…</main>
```

```css
.skip-link { position: absolute; left: 8px; top: -100px; }
.skip-link:focus { top: 8px; } /* appears on the first Tab press */
```

Landmarks (`<main>`, `<nav>`) give screen-reader users a similar shortcut, but sighted keyboard users don't have landmark navigation — they need the skip link.

## Motion, colour and contrast preferences

**Reduced motion.** Parallax, large zooms and auto-playing animation can trigger vestibular disorders (nausea, dizziness). Respect the OS setting, and treat motion as an enhancement:

```css
/* Opt in to motion only when the user hasn't asked for less */
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 300ms ease; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

```tsx
const QUERY = '(prefers-reduced-motion: reduce)';
const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};
export const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
```

Reduced motion means *less* motion, not *no feedback*: swap slides and zooms for fades. WCAG: 2.2.2 Pause, Stop, Hide (A) for anything that moves automatically for more than 5 seconds; 2.3.3 Animation from Interactions (AAA).

**Colour and contrast.**
- Never use colour alone (1.4.1): errors need text/icons, links in body text need underlines (or 3:1 contrast with surrounding text plus a non-colour cue on hover/focus), chart series need patterns or labels.
- Check contrast in **every theme and state**: dark mode, hover, disabled-looking-but-enabled, placeholder text, text over images.
- **Forced colors** (Windows contrast themes) replace your palette with system colours; `box-shadow` and `background-image` disappear. Test with `@media (forced-colors: active)` and use system colour keywords (`CanvasText`, `Highlight`) where needed.
- `prefers-contrast: more` lets you strengthen borders and text for users who ask for it.

## Testing accessibility

No single tool is enough. Use layers, cheapest first:

| Layer | Tool | Catches | Misses |
|---|---|---|---|
| Lint | `eslint-plugin-jsx-a11y` | Missing `alt`, `onClick` on `div`, invalid ARIA props | Anything runtime |
| Component tests | Testing Library `getByRole` + `user-event` | Missing names/roles, wrong states, keyboard operability, focus management | Visual issues |
| Rule engine (unit) | `jest-axe` / `vitest-axe` | Rule violations in the rendered DOM: missing names, invalid ARIA, bad role nesting | Contrast (no layout in jsdom), behaviour |
| Rule engine (E2E) | `@axe-core/playwright`, Storybook a11y addon, Lighthouse | Real-browser checks incl. contrast | Behaviour, meaning |
| Manual | Keyboard pass, zoom to 400%, screen-reader smoke test | Everything else | Doesn't scale — do it per feature |

### Role-based component tests

Testing Library's query priority puts `getByRole` first for a reason: it queries the **accessibility tree**. If `getByRole('button', { name: 'Save' })` can't find it, a screen-reader or voice-control user can't either. That makes ordinary tests double as accessibility tests.

```tsx
it('opens the actions menu from the keyboard and returns focus on Escape', async () => {
  const user = userEvent.setup();
  render(<ActionsMenu />);
  const trigger = screen.getByRole('button', { name: 'Actions' });

  await user.tab();
  expect(trigger).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus();

  await user.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).toBeNull();
  expect(trigger).toHaveFocus();
});
```

Useful facts: `<input type="password">` has **no role** (use `getByLabelText`); `getByRole` ignores elements hidden from the tree (`hidden`, `display: none`, `aria-hidden`) unless you pass `{ hidden: true }`; and there are filters for state: `{ pressed: true }`, `{ expanded: true }`, `{ selected: true }`, `{ checked: true }`, `{ level: 2 }` for headings.

### axe in unit tests and E2E

```ts
// Vitest/Jest + jsdom — fast, runs on every component
import { axe } from 'jest-axe'; // or vitest-axe
const { container } = render(<SignupForm onSubmit={() => {}} />);
expect(await axe(container)).toHaveNoViolations(); // after expect.extend(toHaveNoViolations)

// Playwright — real browser, real CSS, real contrast
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
expect(results.violations).toEqual([]);
```

Playwright also has role locators (`page.getByRole`), `toHaveAccessibleName`, and **ARIA snapshots** (`toMatchAriaSnapshot`) that assert on the accessibility tree's structure.

> [!WARNING]
> Automated rules find a minority of real issues — estimates range from roughly a third of WCAG criteria to around half of issues by volume, depending on how you count. Axe can tell you an image has no `alt`; it can't tell you the alt text is wrong, that focus went to the wrong place, or that the tab order makes no sense. "Zero axe violations" is a floor, not a pass.

{{quiz:axe-jsdom-contrast}}

### The manual keyboard pass (5 minutes per feature)

1. Unplug the mouse. Tab through the whole flow: can you reach and operate everything?
2. Is focus **always visible**, and never hidden behind a sticky header (2.4.11)?
3. Is the order logical? Does Shift+Tab reverse it?
4. Do popups open with Enter/Space, navigate with arrows, close with Escape, and return focus?
5. After every action (submit, delete, navigate, close), where is focus? Never on `<body>`.
6. Zoom to 200% and 400%: does content reflow without horizontal scrolling?

### Screen-reader smoke test

You don't need to be an expert user — learn enough to hear what your markup says.

| | VoiceOver (macOS, use Safari) | NVDA (Windows, free; Firefox or Chrome) |
|---|---|---|
| Start/stop | Cmd+F5 | Ctrl+Alt+N (if the shortcut was set up at install); NVDA+Q to quit |
| Modifier | VO = Control+Option | NVDA = Insert (or Caps Lock in laptop layout) |
| Read next item | VO+→ | ↓ (browse mode) |
| Headings / landmarks list | VO+U (rotor), ←/→ to switch lists | H / D to jump; NVDA+F7 elements list |
| Activate | VO+Space | Enter |
| Interaction modes | Interact with groups (VO+Shift+↓) | Browse vs focus mode (NVDA+Space) |
| Stop speech | Control | Control |

Listen for: every control has a sensible **name**, the right **role**, and its **state** ("expanded", "pressed", "selected", "invalid"); headings and landmarks make sense out of context; and status messages are announced. Real users also use JAWS (with Chrome) and TalkBack/VoiceOver on mobile — test those for critical flows.

## Common React accessibility bugs

| Bug | Symptom | Fix |
|---|---|---|
| Clickable `div`/`li`/`span` | Not focusable, no role, no Enter/Space | `<button type="button">` (or `<a href>` for navigation) |
| Icon-only button with no name | "Button." | `aria-label` on the button, icon `aria-hidden="true"` |
| Placeholder as label | No name once typed; low contrast | `<label htmlFor>` with `useId()` |
| Hard-coded ids in reusable components | Duplicate ids → wrong label/description associations | `useId()` |
| `outline: none` in a reset stylesheet | Keyboard users are lost | `:focus-visible` with a 3:1 outline |
| Modal without focus management | Focus behind the overlay; Escape does nothing | Dialog contract above |
| Toasts/status text mounted with content | Silent to screen readers | Persistent `role="status"` region |
| Focus lost on re-render or delete | Focus jumps to `<body>` | Stable keys/components, explicit `.focus()` targets |
| `<a onClick>` without `href` | Not focusable, not a link | `<button>` or a real `href` |
| Disabled button with an explanatory tooltip | Tooltip unreachable by keyboard | `aria-disabled` + visible explanation |

## Key takeaways

- Modal contract: identity (`role="dialog"`, `aria-modal`, `aria-labelledby`), focus in, focus contained (`inert` + Tab wrap), Escape, focus restored to the trigger.
- Native `<dialog>` + `showModal()` handles top layer, inert background, Escape and focus restoration; you still add the name and sync React state.
- Whenever the focused element disappears (route change, delete, swap, disable), choose a new focus target deliberately.
- Skip links for sighted keyboard users; landmarks for screen-reader users.
- Respect `prefers-reduced-motion`, never rely on colour alone, check contrast in every theme, and test forced-colors mode.
- Test in layers: jsx-a11y lint → `getByRole` + `user-event` tests → axe (jsdom for rules, Playwright for contrast) → manual keyboard + screen-reader pass. Automated tools catch a minority of issues.
