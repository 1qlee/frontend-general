import type { Exercise } from '../../types';

import contrastStarter from './exercises/wcag-contrast-ratio/starter.ts?raw';
import contrastSolution from './exercises/wcag-contrast-ratio/solution.ts?raw';
import contrastTests from './exercises/wcag-contrast-ratio/tests.ts?raw';
import disclosureStarter from './exercises/a11y-disclosure/starter.tsx?raw';
import disclosureSolution from './exercises/a11y-disclosure/solution.tsx?raw';
import disclosureTests from './exercises/a11y-disclosure/tests.tsx?raw';
import dialogStarter from './exercises/a11y-modal-dialog/starter.tsx?raw';
import dialogSolution from './exercises/a11y-modal-dialog/solution.tsx?raw';
import dialogTests from './exercises/a11y-modal-dialog/tests.tsx?raw';
import formStarter from './exercises/a11y-signup-form/starter.tsx?raw';
import formSolution from './exercises/a11y-signup-form/solution.tsx?raw';
import formTests from './exercises/a11y-signup-form/tests.tsx?raw';
import toggleStarter from './exercises/a11y-toggle-button-tests/starter.tsx?raw';
import toggleSolution from './exercises/a11y-toggle-button-tests/solution.tsx?raw';
import toggleSubject from './exercises/a11y-toggle-button-tests/subject.tsx?raw';
import toggleMutantNoName from './exercises/a11y-toggle-button-tests/mutant-no-name.tsx?raw';
import toggleMutantStale from './exercises/a11y-toggle-button-tests/mutant-stale-pressed.tsx?raw';
import toggleMutantDiv from './exercises/a11y-toggle-button-tests/mutant-div-button.tsx?raw';
import toggleMutantName from './exercises/a11y-toggle-button-tests/mutant-changing-name.tsx?raw';
import comboboxStarter from './exercises/a11y-combobox/starter.tsx?raw';
import comboboxSolution from './exercises/a11y-combobox/solution.tsx?raw';
import comboboxTests from './exercises/a11y-combobox/tests.tsx?raw';

export const contrastRatio: Exercise = {
  id: 'wcag-contrast-ratio',
  title: 'WCAG contrast ratio calculator',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 10,
  tags: ['accessibility', 'wcag', 'color', 'math'],
  prompt: `Implement the WCAG 2.x contrast maths — the same calculation every contrast checker, Lighthouse and axe run.

\`\`\`ts
contrastRatio('#000', '#fff');            // 21
contrastRatio('#777', '#fff');            // ≈ 4.48
meetsWCAG(4.48, 'AA', 'normal');          // false — no rounding!
meetsWCAG(4.48, 'AA', 'large');           // true
\`\`\`

1. \`parseHex(hex)\` → \`[r, g, b]\` (0–255). Accept \`#rgb\` and \`#rrggbb\`, any case; throw otherwise.
2. \`relativeLuminance(hex)\`: for each channel \`c = value / 255\`, linearise with
   \`c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4\`, then \`L = 0.2126 R + 0.7152 G + 0.0722 B\`.
3. \`contrastRatio(a, b)\` = \`(L1 + 0.05) / (L2 + 0.05)\` with **L1 the lighter** colour.
4. \`meetsWCAG(ratio, level, size)\`: AA needs 4.5 (normal) / 3 (large); AAA needs 7 / 4.5.

**What the interviewer is looking for:** that you know the thresholds cold (4.5 / 3 / 7 / 4.5), what "large" means (≥ 24px regular or ≥ 18.66px bold), that the ratio is computed on *linearised* luminance (not on raw RGB averages), and that thresholds are not rounded.`,
  starter: contrastStarter,
  solution: contrastSolution,
  tests: contrastTests,
  hints: [
    'Normalise the 3-digit form first: each digit doubles (`f` → `ff`). A single regex `/^#([0-9a-f]{3}|[0-9a-f]{6})$/i` validates both forms.',
    'Luminance is not the average of R, G and B. Gamma-decode each channel to linear light first, then apply the weights 0.2126 / 0.7152 / 0.0722.',
    'For the ratio, take `Math.max` and `Math.min` of the two luminances so argument order does not matter. For `meetsWCAG`, a lookup table `{ AA: { normal: 4.5, large: 3 }, AAA: { normal: 7, large: 4.5 } }` and `>=` is all you need.',
  ],
  explanation: `**Approach:** parse → linearise each channel → weighted sum → \`(lighter + 0.05) / (darker + 0.05)\` → compare against a threshold table with \`>=\`.

**Why linearise?** Hex values are gamma-encoded sRGB: \`#808080\` *looks* mid-grey but emits only ~22% of white's light. Contrast is about light emitted, so you decode to linear light first. The weights reflect how sensitive the eye is to each primary — green dominates, blue barely counts (which is why blue text on black is so hard to read).

**Why +0.05?** It models ambient flare (light reflecting off the screen), keeps the ratio finite for pure black, and caps it at 21:1.

**Facts to say out loud:**
- AA: **4.5:1** normal text, **3:1** large text (≥ 24px, or ≥ 18.66px / 14pt bold). AAA: 7:1 and 4.5:1.
- **1.4.11 Non-text Contrast (AA): 3:1** for UI component boundaries, focus indicators and meaningful icons/graphics — the criterion people forget.
- Disabled controls and pure decoration are exempt; logos too.
- \`#767676\` is the lightest grey that passes 4.5:1 on white; \`#777\` fails at 4.48. Don't round.

**Follow-ups:**
- *"What about opacity / text over images?"* → blend the foreground over the background first (alpha compositing), and for images test the worst-case region or add a scrim.
- *"Is the WCAG 2 formula perfect?"* → no; it over-rates some dark-mode pairs and under-rates some light ones. APCA (Accessible Perceptual Contrast Algorithm) was explored for WCAG 3, but WCAG 3 is still a draft and its contrast method isn't settled — WCAG 2.2's ratio is what audits and the law use today.`,
};

export const disclosure: Exercise = {
  id: 'a11y-disclosure',
  title: 'Fix an inaccessible Disclosure',
  runtime: 'dom',
  difficulty: 'warm-up',
  estMinutes: 8,
  preview: true,
  tags: ['accessibility', 'aria', 'react', 'apg'],
  prompt: `The starter's FAQ toggle works with a mouse and nothing else: it's a \`<div onClick>\`, so it isn't focusable, has no role, no state, and nothing links it to the content it reveals.

Rebuild \`Disclosure\` with the **WAI-ARIA APG Disclosure pattern**:

- The toggle is a native \`<button type="button">\` whose accessible name is **exactly** \`summary\` — the ▸/▾ icon is decorative and must not end up in the name.
- \`aria-expanded\` reflects the open state (\`"true"\` / \`"false"\`).
- \`aria-controls\` holds the id of the panel element that contains \`children\`. Generate ids with \`useId\` — two disclosures on a page must not share an id.
- When collapsed, the content is not visible (\`hidden\` attribute or not rendered). Enter and Space toggle it.
- \`defaultOpen\` sets the initial state.

**What the interviewer is looking for:** reaching for \`<button>\` before ARIA, state exposed with \`aria-expanded\`, unique ids, and knowing this is a *disclosure*, not an accordion "menu".`,
  starter: disclosureStarter,
  solution: disclosureSolution,
  tests: disclosureTests,
  hints: [
    'Replace the `<div onClick>` with `<button type="button">`. Focus, Enter and Space now come for free.',
    'Wrap the icon in `<span aria-hidden="true">` so the computed name is just the summary text. Add `aria-expanded={open}` — React stringifies booleans on `aria-*` attributes.',
    'Keep the panel in the DOM with `<div id={panelId} hidden={!open}>` so `aria-controls={panelId}` always points at a real element. `const panelId = useId();`',
  ],
  explanation: `**The fix is mostly HTML.** A native \`<button>\` brings the role, focusability, Enter/Space activation and disabled handling. ARIA only adds what HTML can't express: \`aria-expanded\` (state) and \`aria-controls\` (relationship).

**Details that score points:**
- \`type="button"\` — the default type inside a form is \`submit\`.
- Decorative icon in \`aria-hidden="true"\`; otherwise the name becomes "▸ What is your refund…".
- \`hidden\` vs conditional rendering: both are fine for the panel's visibility, but keeping the panel mounted means \`aria-controls\` never points at a missing id and form state inside the panel survives collapsing. (\`aria-controls\` is poorly supported by screen readers anyway — JAWS is the main consumer — so it is a nicety, not the mechanism.)
- Native alternative: \`<details>/<summary>\` gives you all of this with zero JS — mention it! Its limits: harder to control from React state, and styling the marker varies by browser. The \`name\` attribute on \`<details>\` (exclusive accordion) is newer — check support for your targets.

**Follow-ups:**
- *"Turn three of these into an accordion."* → APG Accordion: headings wrapping buttons (\`<h3><button aria-expanded>\`), optional arrow-key navigation between headers, panels with \`role="region"\` + \`aria-labelledby\` when there are few of them (Day 6 built one).
- *"Why not \`role=menu\` for a nav dropdown?"* → menus imply application-style arrow-key behaviour; a site nav dropdown is a disclosure of links.`,
};

export const modalDialog: Exercise = {
  id: 'a11y-modal-dialog',
  title: 'Accessible modal Dialog (focus trap + restore)',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 20,
  preview: true,
  tags: ['accessibility', 'focus management', 'react', 'apg', 'dialog'],
  prompt: `Day 6's \`Modal\` closed on Escape. Now make it a **real** modal dialog per the APG Dialog (Modal) pattern. The starter already looks right; it behaves like a \`<div>\`.

\`\`\`tsx
<Dialog open={open} onClose={() => setOpen(false)} title="Delete file?" initialFocusRef={cancelRef}>
  <button ref={cancelRef} onClick={() => setOpen(false)}>Cancel</button>
  <button onClick={remove}>Delete</button>
</Dialog>
\`\`\`

Requirements:
1. Render nothing when \`open\` is false (a portal to \`document.body\` is recommended).
2. The container has \`role="dialog"\`, \`aria-modal="true"\` and \`aria-labelledby\` pointing to the visible title heading. If \`description\` is given, link it with \`aria-describedby\`.
3. **On open**, focus \`initialFocusRef.current\` if provided, otherwise the first focusable element inside, otherwise the dialog itself (give it \`tabIndex={-1}\`).
4. **Trap focus:** Tab on the last focusable element wraps to the first; Shift+Tab on the first wraps to the last.
5. **Escape** calls \`onClose\`.
6. **On close** (or unmount), return focus to the element that was focused before the dialog opened.
7. *Stretch (not tested — jsdom ignores it):* make everything outside the dialog \`inert\` while it is open.

> jsdom does not implement \`HTMLDialogElement.showModal()\`, so build it with a \`div\`. In production, consider the native \`<dialog>\` (see the lesson).

**What the interviewer is looking for:** the full lifecycle — *save focus → move focus in → contain it → close on Escape → restore focus* — plus the right ARIA, and not breaking when the parent passes a new \`onClose\` every render.`,
  starter: dialogStarter,
  solution: dialogSolution,
  tests: dialogTests,
  hints: [
    'Use an effect keyed on `open`. Before moving focus, read `document.activeElement` into a local variable; the effect cleanup (which runs on close AND on unmount) can then call `.focus()` on it.',
    'Find focusables with `dialog.querySelectorAll(\'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]\')` and filter out `tabIndex < 0`. Do not put `onClose` in the effect dependencies.',
    'In `onKeyDown` on the dialog: on Tab, if `shiftKey` and focus is on the first element (or the dialog itself) → `preventDefault()` and focus the last; if not shift and focus is on the last → `preventDefault()` and focus the first. Otherwise let the browser move focus.',
  ],
  explanation: `**The lifecycle:**
1. **Open:** store \`document.activeElement\`, then focus the initial target (explicit ref → first tabbable → the dialog container with \`tabIndex={-1}\`).
2. **While open:** a keydown handler wraps Tab/Shift+Tab at the edges and calls \`onClose\` on Escape (with \`stopPropagation\` so a parent popover doesn't also close). Mark the rest of the page \`inert\` so a screen reader's virtual cursor and mouse clicks can't reach it either — a Tab trap alone does nothing for virtual-cursor navigation.
3. **Close:** in the effect cleanup, remove \`inert\` *first* (inert elements can't take focus), then focus the stored element if it is still connected.

**Common bugs this catches:**
- \`onClose\` in the effect's dependency array → the effect re-runs on every parent render and yanks focus back to the first button while the user is typing.
- Restoring focus to \`document.body\` because you read \`activeElement\` *after* moving focus in.
- Querying focusables once on open — content can change (validation errors, async content); query on every Tab.
- \`aria-hidden="true"\` on the app root while the dialog is rendered *inside* that root — hides the dialog too. Portals avoid this.

**Choosing initial focus (APG guidance):** the first focusable element by default; the **least destructive** action for confirmations ("Cancel", not "Delete"); a static element at the top (heading/container with \`tabIndex={-1}\`) when the content is long enough that focusing a later control would scroll the start out of view.

**Native \`<dialog>\` + \`showModal()\`** gives you top-layer rendering, \`::backdrop\`, an inert background, Escape handling (a \`cancel\` event, then \`close\`) and focus restoration in modern browsers. Sync it with React via an effect that calls \`showModal()\`/\`close()\` and listens to the \`close\` event to update state. It does *not* wrap Tab inside the dialog — focus can move to the browser chrome, which is acceptable because the page behind is inert.

**Follow-ups:** nested dialogs (keep a stack; only the top one handles Escape), scroll locking (\`overflow: hidden\` on \`<html>\`, compensate for the scrollbar width), \`role="alertdialog"\` for urgent confirmations, and why closing on backdrop click is wrong for dialogs that hold unsaved input.`,
};

export const signupForm: Exercise = {
  id: 'a11y-signup-form',
  title: 'Accessible signup form with error handling',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 18,
  preview: true,
  tags: ['accessibility', 'forms', 'react', 'aria', 'focus management'],
  prompt: `The starter is a typical "works on my machine" form: placeholders instead of labels, red error text nothing is linked to, no \`autocomplete\`, and after a failed submit focus just sits on the button. \`validate()\` is done for you — make the form accessible.

Requirements:
1. Each input has a visible \`<label>\` associated via \`htmlFor\`/\`id\` (use \`useId\`). Labels: **Name**, **Email**, **Password**.
2. \`autocomplete\`: \`name\`, \`email\`, \`new-password\`.
3. The password hint ("Must be at least 8 characters.") is visible and linked with \`aria-describedby\` at all times.
4. Keep \`noValidate\` and validate on submit. For each invalid field: \`aria-invalid="true"\` and an error message element whose id is added to the field's \`aria-describedby\` (the password keeps its hint too). Valid fields must not be \`aria-invalid="true"\`.
5. After a failed submit, **focus the first invalid field** (in DOM order).
6. An element with \`role="alert"\` is **always rendered** (empty at first) and, on a failed submit, says how many errors there are, e.g. "There are 3 errors in this form".
7. On a valid submit, call \`onSubmit(values)\` and clear the error state and summary.

Note: \`<input type="password">\` has **no ARIA role** — \`getByRole\` can't find it, so the tests use \`getByLabelText\`.

**What the interviewer is looking for:** label association, \`aria-invalid\` + \`aria-describedby\` for errors, focus management after submit, a live region that exists before it changes, and \`autocomplete\` (WCAG 1.3.5).`,
  starter: formStarter,
  solution: formSolution,
  tests: formTests,
  hints: [
    'Build ids from one `const id = useId()`: `${id}-email`, `${id}-email-error`, `${id}-password-hint`. `<label htmlFor={...}>` + `<input id={...}>` gives the input its name.',
    '`aria-describedby` takes a space-separated list of ids. Build it from the hint id (password only) plus the error id when there is an error; pass `undefined` when empty so React omits the attribute.',
    'Keep refs to the inputs. In the submit handler, compute the errors, `setErrors(...)`, then focus the first field in `["name", "email", "password"]` that has an error — the inputs already exist, so you can focus synchronously. Render `<div role="alert">{summary}</div>` unconditionally.',
  ],
  explanation: `**The four relationships a screen reader needs:** label → input (\`<label htmlFor>\`), hint/error → input (\`aria-describedby\`), validity → input (\`aria-invalid\`), and "something happened" → user (focus move + live region). Reading the email field after a failed submit sounds roughly like: *"Email, edit text, invalid entry, Enter an email address in the correct format, like name@example.com."*

**Design decisions to discuss:**
- **\`noValidate\` + custom messages:** native bubbles are inconsistent across browsers, vanish after a few seconds, and can't be styled — but keep \`required\`, \`type="email"\` and \`minLength\` on the inputs for semantics (\`required\` is exposed to assistive tech).
- **Focus first invalid field vs focus an error summary:** GOV.UK focuses a summary box at the top that lists links to each error — great for long forms. For short forms, focusing the first invalid field is quicker. Either way, *one* clear announcement. Here the alert and the focus move both speak, which some users find chatty — a fair trade-off to mention.
- **Same message twice:** a live region only announces *changes*. Submitting twice with the same error count won't re-announce; clear the text first or add context.
- **When to validate:** on submit, then re-validate a field on change/blur once it's been marked invalid ("reward early, punish late"). Never show errors while the user is still typing their first attempt.
- **Error text:** say how to fix it (WCAG 3.3.3 Error Suggestion). Don't rely on red alone (1.4.1 Use of Color) — the text and \`aria-invalid\` carry the meaning. GOV.UK also prefixes a visually hidden "Error:".
- **\`aria-errormessage\`** exists for exactly this, but screen-reader support has lagged; \`aria-describedby\` is the robust choice.

**Follow-ups:** React 19 form Actions (\`<form action={fn}>\` + \`useActionState\`) for server validation — the same ARIA wiring applies to server-returned errors; password visibility toggles (a \`<button aria-pressed>\` that switches \`type\`); and allowing paste / password managers (WCAG 2.2 3.3.8 Accessible Authentication).`,
};

export const toggleButtonTests: Exercise = {
  id: 'a11y-toggle-button-tests',
  title: 'Write role-based tests for an icon ToggleButton',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 12,
  mode: 'write-tests',
  tags: ['accessibility', 'testing', 'testing library', 'aria'],
  prompt: `You're given a correct, accessible icon-only toggle button (APG Button pattern, toggle variant):

\`\`\`tsx
export function ToggleButton({ label, icon, defaultPressed = false, onPressedChange }) {
  const [pressed, setPressed] = useState(defaultPressed);
  return (
    <button type="button" aria-label={label} aria-pressed={pressed}
      onClick={() => { const next = !pressed; setPressed(next); onPressedChange?.(next); }}>
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
\`\`\`

Write tests (import from \`./subject\`) that pass against it **and fail against 4 hidden buggy versions** — the kinds of accessibility regressions that slip through visual review and snapshot tests.

Rules of thumb:
- Query the way a user finds it: \`getByRole('button', { name: 'Mute' })\`.
- Assert **state as exposed to assistive tech** (\`aria-pressed\`), not CSS classes or internal state.
- Drive it the way users do — mouse **and** keyboard (\`user.tab()\`, \`{Enter}\`, \`' '\`).

**What the interviewer is looking for:** tests that would catch real a11y regressions, written against the accessibility tree rather than implementation details.`,
  starter: toggleStarter,
  solution: toggleSolution,
  tests: '',
  subject: toggleSubject,
  mutants: [
    {
      description: 'The `label` prop is never wired up and the icon is `aria-hidden`, so the button has no accessible name — a screen reader just says "button, toggle".',
      code: toggleMutantNoName,
    },
    {
      description: '`aria-pressed` is bound to `defaultPressed` instead of state: the button *looks* toggled (CSS class) and fires the callback, but assistive tech always hears "not pressed".',
      code: toggleMutantStale,
    },
    {
      description: 'A `<div role="button" tabIndex={0}>` with only `onClick`: focusable and correctly named, but Enter and Space do nothing — not keyboard operable (WCAG 2.1.1).',
      code: toggleMutantDiv,
    },
    {
      description: 'The label flips to "Unmute" when pressed while `aria-pressed` is also set — users hear "Unmute, toggle button, pressed", a contradiction. APG: a toggle\'s name must not change with its state.',
      code: toggleMutantName,
    },
  ],
  hints: [
    'Start with the query itself: `screen.getByRole(\'button\', { name: \'Mute\' })` already fails when the name is missing. Then assert `aria-pressed` before and after a click.',
    'Mouse clicks dispatch `click` on anything, including a div. What does a keyboard user do? `await user.tab()` then `await user.keyboard(\'{Enter}\')` and `await user.keyboard(\' \')`, asserting `aria-pressed` after each.',
    'One bug changes the label when pressed. After clicking, assert the name is still exactly "Mute" (e.g. `toHaveAccessibleName(\'Mute\')`, or `getByRole(\'button\', { name: \'Mute\', pressed: true })`).',
  ],
  explanation: `**Why role-based queries are an accessibility test:** \`getByRole\` resolves elements through the accessibility tree — the same role + name a screen reader announces. If you can't find the button by role and name, neither can a screen-reader or voice-control user ("click Mute").

**The four regressions and the test that catches each:**
| Bug | Caught by |
|---|---|
| No accessible name | \`getByRole('button', { name: 'Mute' })\` / \`toHaveAccessibleName\` |
| \`aria-pressed\` never updates | asserting \`aria-pressed\` after a click (not a class, not the callback) |
| \`div role=button\` without key handling | \`user.tab()\` + \`{Enter}\` / Space, then asserting state |
| Name changes with state | asserting the name *after* toggling |

**Toggle-button design rule:** pick **one** way to express state. Either a stable name + \`aria-pressed\` ("Mute, toggle button, pressed"), or a changing name with no \`aria-pressed\` ("Unmute, button"). Mixing them produces contradictions.

**Beyond unit tests:** add \`jest-axe\`/\`vitest-axe\` for rule-based checks (it would have caught the missing name too — but not the stale state or the keyboard bug), and Playwright + \`@axe-core/playwright\` on real pages. Automated rules catch a minority of issues; behavioural tests like these catch the rest of what's automatable.`,
};

export const combobox: Exercise = {
  id: 'a11y-combobox',
  title: 'Autocomplete Combobox (aria-activedescendant)',
  runtime: 'dom',
  difficulty: 'stretch',
  estMinutes: 22,
  preview: true,
  tags: ['accessibility', 'aria', 'apg', 'keyboard', 'react'],
  prompt: `Build an editable **combobox with a listbox popup** (APG "Combobox", list autocomplete without automatic selection) — the pattern behind every search-as-you-type and "custom select" interview question.

\`\`\`tsx
<Combobox label="Fruit" options={['Apple', 'Apricot', 'Banana', 'Cherry', 'Mango', 'Orange']} onSelect={setFruit} />
\`\`\`

**Structure**
- A visible \`<label>\` for an \`<input role="combobox" aria-autocomplete="list">\`.
- \`aria-expanded\` is \`"true"\` only while the listbox is shown; \`aria-controls\` = the listbox id.
- A \`role="listbox"\` element containing \`role="option"\` elements, each with a unique id (\`useId\`). Hide the listbox (\`hidden\`) when collapsed.

**Behaviour**
- Typing filters options with a **case-insensitive "contains"** match and expands the list. If nothing matches, it stays collapsed.
- Typing resets the active option (none active).
- **ArrowDown**: if collapsed, expand and activate the first option; otherwise move to the next, wrapping last → first. **ArrowUp**: mirror image (collapsed → last option; wraps first → last; from "none active" → last).
- The active option is referenced by the input's \`aria-activedescendant\` and has \`aria-selected="true"\`. **DOM focus never leaves the input.** No active option → no \`aria-activedescendant\` attribute.
- **Enter** on an active option: put its text in the input, collapse, clear \`aria-activedescendant\`, call \`onSelect(option)\`.
- **Escape**: collapse and clear the active option, keeping the typed text.
- **Click** on an option selects it (prevent the input from blurring on \`mousedown\`).

**What the interviewer is looking for:** knowing *why* focus stays in the input (so the user can keep typing), \`aria-activedescendant\` vs roving tabindex, derived state for the filtered list, and the keyboard contract.`,
  starter: comboboxStarter,
  solution: comboboxSolution,
  tests: comboboxTests,
  hints: [
    'State: `value`, `open`, `activeIndex` (-1 = none). Derive everything else: `filtered = options.filter(...)`, `expanded = open && filtered.length > 0`, `activeId = expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined`.',
    'Handle keys in the input\'s `onKeyDown`. Use modular arithmetic for wrapping: next = `(i + 1) % count`, previous = `i <= 0 ? count - 1 : i - 1`. Call `preventDefault()` on the arrows so the caret doesn\'t jump.',
    'Render `<ul role="listbox" id={listboxId} hidden={!expanded}>` with `<li role="option" id={optionId(i)} aria-selected={i === activeIndex} onMouseDown={(e) => e.preventDefault()} onClick={() => select(option)}>`. In `onChange`: set value, `setOpen(true)`, `setActiveIndex(-1)`.',
  ],
  explanation: `**Why \`aria-activedescendant\` here?** The user is typing; DOM focus must stay in the input or keystrokes go nowhere. \`aria-activedescendant\` lets assistive tech treat the referenced option as focused ("Mango, 2 of 3") while the caret stays put. With roving tabindex you'd move real focus onto options — right for toolbars, tabs and menus, wrong for editable comboboxes.

**Gotchas:**
- The referenced option must exist in the DOM and be owned by the controlled listbox, or the reference is silently ignored.
- Keep the active option visible: in a scrolling list call \`element.scrollIntoView({ block: 'nearest' })\` when \`activeIndex\` changes — browsers don't scroll for \`aria-activedescendant\`.
- \`autoComplete="off"\` so the browser's own autofill popup doesn't cover yours.
- \`onMouseDown\` + \`preventDefault\` on options keeps focus in the input so \`onBlur\` doesn't close the list before the click lands.
- Announce result counts with a polite live region ("3 results available") — many users won't otherwise know the list appeared. (Some screen readers do announce the expansion; a status message is more reliable.)
- Derived state: never copy \`filtered\` into state — it goes stale.

**Variants to know:**
- **Select-only combobox** (a custom \`<select>\`): the combobox is a non-editable element (\`<div role="combobox" tabIndex={0}>\` or a \`<button>\`), with type-ahead by first letter. Before building one, ask whether a native \`<select>\` will do — Chromium's customizable select (\`appearance: base-select\`) is making native selects stylable; check support before relying on it.
- \`aria-autocomplete="both"\` (inline completion of the input text), \`"none"\` (list doesn't filter).
- Async options: debounce the fetch, ignore stale responses (Day 2), set \`aria-busy\` on the listbox while loading.

**Follow-ups:** multi-select (\`aria-multiselectable\` on the listbox + selected chips that are buttons), grouping (\`role="group"\` + label), virtualised lists (\`aria-setsize\` / \`aria-posinset\` on rendered options).`,
};

export const exercises: Exercise[] = [contrastRatio, disclosure, modalDialog, signupForm, toggleButtonTests, combobox];
