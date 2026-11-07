import type { Day } from '../../types';

import a11yFoundations from './lessons/a11y-foundations.md?raw';
import ariaKeyboard from './lessons/aria-keyboard.md?raw';
import focusTesting from './lessons/focus-testing.md?raw';

import { exercises } from './exercise-defs';

const day: Day = {
  number: 9,
  title: 'Accessibility & Semantic HTML',
  tagline: 'WCAG 2.2, semantic HTML, ARIA done right, keyboard and focus management — and how to prove it with tests.',
  summary:
    'Accessibility is graded in almost every UI interview, usually without being announced: did you use a `<button>`, label the input, support the keyboard, and put focus back where it came from? Today you learn the WCAG 2.2 AA criteria by number, semantic HTML first, the rules of ARIA and the APG patterns behind dropdowns, tabs, menus and dialogs, and focus management in React. Then you build an accessible dialog, form and combobox, and write role-based tests that catch real accessibility regressions.',
  objectives: [
    'Explain who benefits from accessibility and why WCAG 2.2 AA is the target (ADA, Section 508, the European Accessibility Act)',
    'Quote the key AA numbers: 4.5:1 / 3:1 contrast, 3:1 for UI and focus indicators, 24×24 px targets, focus visible and not obscured',
    'Default to semantic HTML: landmarks, heading levels, button vs link, labelled forms, correct alt text',
    'Compute an accessible name, apply the rules of ARIA, and use live regions correctly',
    'Choose between roving tabindex and aria-activedescendant, and implement the APG disclosure, dialog and combobox patterns',
    'Manage focus in React: modals, route changes, deletions and re-renders',
    'Test accessibility in layers: getByRole + user-event tests, axe, a keyboard pass and a screen-reader smoke test',
  ],
  skills: ['accessibility', 'react', 'testing', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'review',
      title: 'Spaced review',
      minutes: 15,
      intro:
        "Warm up with cards from earlier days. Day 6's compound Tabs and Modal and Day 8's DOM events and focus are the foundation for today — if those cards feel shaky, skim them again.",
    },
    {
      kind: 'lesson',
      id: 'a11y-foundations',
      title: 'Foundations: who, why, WCAG 2.2 and semantic HTML',
      minutes: 35,
      body: a11yFoundations,
      checks: [
        {
          id: 'button-vs-link',
          prompt:
            'An order row has "View order" (goes to `/orders/42`) and "Cancel order" (sends a request and updates the row). Which markup is right?',
          choices: [
            'Two `<button>`s with `onClick` handlers — one calls `navigate()`',
            '`<a href="/orders/42">View order</a>` and `<button type="button">Cancel order</button>`',
            'Two `<a href="#">` elements with `onClick`, styled differently',
            '`<div role="link" tabIndex={0}>` and `<div role="button" tabIndex={0}>`',
          ],
          answer: 1,
          explanation:
            'Links **navigate**, buttons **act**. A real `<a href>` supports open-in-new-tab, copy link, history and the screen reader\'s links list; a `<button>` gets Enter **and** Space and is announced as an action. A `<button>` that navigates loses all the link affordances; `<a href="#">` for an action pollutes history and is announced as a link; and the `div` version adds roles but none of the keyboard behaviour (you would still need key handlers).',
        },
        {
          id: 'alt-functional-image',
          prompt: 'The link below contains only this icon. What should `alt` be?',
          code: `<a href="/search">\n  <img src="/icons/magnifier.svg" alt="???" />\n</a>`,
          codeLang: 'html',
          choices: ['"magnifying glass icon"', '"" (empty — it\'s just an icon)', '"Search"', '"Image of a magnifying glass that links to the search page"'],
          answer: 2,
          explanation:
            "A **functional** image's alt text describes the **action or destination**, not its appearance: the link's accessible name becomes \"Search\". An empty `alt` would leave the link with **no name** at all (the screen reader may read the URL). \"Image of…\" is redundant — the role is already announced — and describing the picture tells the user nothing about what the link does.",
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'aria-keyboard',
      title: 'ARIA, accessible names, live regions & keyboard patterns',
      minutes: 40,
      body: ariaKeyboard,
      checks: [
        {
          id: 'label-in-name',
          prompt: 'What does a screen reader announce for this button, and what is the problem?',
          code: `<button aria-label="Close dialog">Cancel</button>`,
          codeLang: 'html',
          choices: [
            '"Cancel, button" — `aria-label` is only used when there is no text content',
            '"Close dialog, button" — and a voice-control user who says "click Cancel" may not be able to activate it',
            '"Cancel, Close dialog, button" — both are combined',
            '"Close dialog, button" — no problem, the `aria-label` is more descriptive',
          ],
          answer: 1,
          explanation:
            '`aria-label` takes precedence over name-from-content, so the visible word "Cancel" is **replaced**. That fails WCAG 2.5.3 **Label in Name**: speech-input users speak what they see, and sighted screen-reader users hear something different from what is on screen. Use the visible text as the name, or make the `aria-label` start with it.',
        },
        {
          id: 'roving-one-tabstop',
          prompt: 'A toolbar of six buttons uses **roving tabindex**. At any moment, how many of the buttons have `tabIndex={0}`?',
          choices: [
            'All six',
            'Exactly one — the others have `tabIndex={-1}`',
            'None — the toolbar container gets `tabIndex={0}` instead',
            'Two — the first and the last, so Tab and Shift+Tab both land inside',
          ],
          answer: 1,
          explanation:
            'A composite widget is **one tab stop**. Roving tabindex keeps exactly one item at `0` (the active one) and the rest at `-1`; arrow keys move the `0` and call `.focus()`. All six at `0` makes users Tab through every button. A focusable container with `aria-activedescendant` is the *other* technique — it is not roving tabindex.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'focus-testing',
      title: 'Focus management & accessibility testing in React',
      minutes: 35,
      body: focusTesting,
      checks: [
        {
          id: 'focus-after-delete',
          prompt:
            'A keyboard user presses the Delete button on item 3 of 5 in a todo list, and you remove the item from state. Where does focus go if you do nothing, and where should it go?',
          choices: [
            'React keeps focus on the equivalent button of the next item automatically',
            'To `<body>`; move it to the item that took its place (or its Delete button) and announce "Item deleted"',
            'To the first focusable element on the page, which is fine because it is predictable',
            'To `<body>`; move it to the "Add todo" input at the top so the user can keep working',
          ],
          answer: 1,
          explanation:
            'When the focused element is removed, browsers move focus to `<body>` — React does not re-target it. Put focus where the user was working: the next item (or the previous one if they deleted the last, or the list heading if it is now empty), plus a polite status message. Jumping to the top of the page or an unrelated input loses the user\'s place in a long list.',
        },
        {
          id: 'axe-jsdom-contrast',
          prompt:
            'A component passes `expect(await axe(container)).toHaveNoViolations()` in Vitest + jsdom, but Lighthouse in Chrome reports a contrast failure on it. What is the most likely reason?',
          choices: [
            'jest-axe checks an older WCAG version than Lighthouse',
            "jsdom doesn't render or lay out the page, so contrast can't be evaluated reliably there — the color-contrast rule is effectively off in unit tests",
            'Lighthouse applies AAA thresholds by default',
            'The render must be wrapped in `act()` for axe to see styles',
          ],
          answer: 1,
          explanation:
            'jsdom has no layout or painting: computed backgrounds behind text, overlapping elements and real fonts are unknown, so jest-axe turns colour-contrast checks off. Contrast belongs in **real-browser** checks — `@axe-core/playwright`, Storybook\'s a11y addon or Lighthouse. Both tools use axe-style WCAG AA rules; it is the environment, not the standard, that differs.',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'a11y-quiz',
      title: 'Quiz: WCAG, ARIA and focus',
      minutes: 15,
      intro: 'Commit to an answer before revealing it. The wrong options are the answers interviewers actually hear — read every explanation.',
      questions: [
        {
          id: 'contrast-no-rounding',
          prompt: 'Grey body text (16px, regular weight) measures **4.48:1** against its background. Does it meet WCAG 2.2 AA?',
          choices: [
            'Yes — it rounds to 4.5:1',
            'No — 4.5:1 is a hard minimum, and 4.48 is below it',
            'Yes — 16px counts as large text, which only needs 3:1',
            'Only if the font is a sans-serif',
          ],
          answer: 1,
          explanation:
            'WCAG thresholds are **not rounded**: 4.499:1 fails 1.4.3 for normal text. (`#777` on white is the classic example at 4.48:1; `#767676` is the lightest grey that passes.) 16px regular is **normal** text — "large" starts at 24px regular or ~18.66px bold. Font family does not change the requirement.',
        },
        {
          id: 'large-text-definition',
          prompt: 'Which text counts as **large** (so it only needs 3:1 at AA)?',
          choices: ['16px bold', '20px regular', '19px bold', 'Any `<h1>`–`<h6>` regardless of size'],
          answer: 2,
          explanation:
            'Large text is **≥ 18pt (24px) regular** or **≥ 14pt (≈18.66px) bold**. 19px bold qualifies; 16px bold and 20px regular do not. The heading tag is irrelevant — WCAG looks at rendered size and weight, not semantics.',
        },
        {
          id: 'accname-precedence',
          prompt: "What is the dialog's accessible name?",
          code: `<h2 id="dlg-title">Delete file?</h2>\n<div role="dialog" aria-labelledby="dlg-title" aria-label="Confirmation" title="Modal">\n  …\n</div>`,
          codeLang: 'html',
          choices: ['"Confirmation"', '"Delete file?"', '"Modal"', '"Delete file? Confirmation"'],
          answer: 1,
          explanation:
            '`aria-labelledby` has the **highest precedence** in the accessible name computation, then `aria-label`, then native labelling/content, with `title` as a last resort. Names are not concatenated across these sources. (Only multiple ids *inside* one `aria-labelledby` are concatenated.)',
        },
        {
          id: 'div-role-button-gaps',
          prompt: 'You change `<div onClick={save}>Save</div>` to `<div role="button" onClick={save}>Save</div>`. What is still missing?',
          choices: [
            'Nothing — `role="button"` makes it behave like a button',
            'Only an `aria-label`',
            'Focusability (`tabIndex={0}`) and Enter/Space key handling — ARIA adds semantics, not behaviour',
            'Only `aria-pressed="false"`',
          ],
          answer: 2,
          explanation:
            'ARIA only changes what assistive tech is **told**. A `div` is still not in the tab order and ignores Enter and Space, so keyboard users can\'t reach or operate it (WCAG 2.1.1). It already has a name from its content, and `aria-pressed` is only for toggles. The real fix is `<button type="button">`.',
        },
        {
          id: 'live-region-conditional',
          prompt: 'Screen-reader users say the "Changes saved" message is often not announced. Why?',
          code: `{saved && <div role="status">Changes saved</div>}`,
          codeLang: 'tsx',
          choices: [
            '`role="status"` is assertive, so it gets cut off',
            'The live region is created at the same moment as its text; AT reliably announces only changes to regions that already exist',
            'Live regions require `aria-live`; `role="status"` alone does nothing',
            'React batches the update, so the DOM never changes',
          ],
          answer: 1,
          explanation:
            'Render the `role="status"` container **always** (empty) and change only its text. `role="status"` is implicitly `aria-live="polite"` (not assertive) and needs no extra attribute. React batching affects *when* the DOM updates, not whether it does.',
        },
        {
          id: 'positive-tabindex',
          prompt: 'What does `tabIndex={3}` on a "Buy now" button do?',
          choices: [
            'Makes it exactly the 3rd stop in the page\'s tab order',
            'Puts it ahead of every element with `tabindex="0"` or no tabindex, so focus order no longer follows the page — avoid it',
            'Nothing — browsers ignore positive values',
            'Removes it from the tab order but keeps it focusable by script',
          ],
          answer: 1,
          explanation:
            'Elements with positive tabindex are visited **first**, in ascending order, before all the naturally focusable elements. On a real page that means focus jumps to "Buy now" from the browser chrome, then back to the top — breaking 2.4.3 Focus Order — and every new positive value has to be coordinated globally. `-1` is the value that removes something from the tab order. Use DOM order with `0` and `-1` only.',
        },
        {
          id: 'aria-hidden-focusable',
          prompt: 'A close button sits inside a container marked `aria-hidden="true"`, and it is still in the tab order. What do screen-reader users experience?',
          choices: [
            'Nothing unusual — `aria-hidden` also removes descendants from the tab order',
            'Keyboard focus lands on a control that is hidden from the accessibility tree, so they hear nothing useful (or something confusing)',
            'They hear "hidden button", which is acceptable',
            'Nothing changes for them — `aria-hidden` only affects visual rendering',
          ],
          answer: 1,
          explanation:
            "`aria-hidden` removes elements from the **accessibility tree only** — they stay visible and focusable. That's rule 4 of ARIA: never hide focusable content this way. Use `inert` (removes from both, and blocks interaction) or `hidden`. Recent Chromium versions detect this situation, log a warning and ignore `aria-hidden` on the focused element, but you can't rely on browser repairs across all AT.",
        },
        {
          id: 'activedescendant-focus',
          prompt: 'In an APG editable combobox, the user presses ArrowDown twice. Where is `document.activeElement`?',
          choices: [
            'On the second option',
            'On the listbox',
            'Still on the input — `aria-activedescendant` on the input points at the active option',
            'On `document.body` until Enter is pressed',
          ],
          answer: 2,
          explanation:
            "DOM focus must stay in the input so the user can keep typing. The input's `aria-activedescendant` holds the active option's id, which AT announces as if focused, while you style that option as active (and scroll it into view yourself). Moving real focus to options is roving tabindex — right for menus and tabs, wrong for an editable combobox.",
        },
        {
          id: 'nav-menu-role',
          prompt: 'Your site header has a "Products" dropdown containing links to product pages. Which pattern fits best?',
          choices: [
            '`role="menu"` with `role="menuitem"` links and arrow-key navigation',
            'A disclosure: a `<button aria-expanded>` that shows and hides a list of ordinary links',
            'A combobox with a listbox of products',
            '`role="listbox"` with `role="option"` links',
          ],
          answer: 1,
          explanation:
            'ARIA `menu` is for **application-style action menus**; it switches screen readers into a mode where users expect arrow keys, typeahead and Escape, and the items are not announced as links. Navigation is a set of links, so a **disclosure** button controlling a normal `<ul>` of `<a href>` is simpler and more robust. Combobox and listbox are for choosing values, not navigating.',
        },
        {
          id: 'target-size-aa',
          prompt: 'Under WCAG 2.2 **AA**, what does 2.5.8 Target Size (Minimum) require?',
          choices: [
            'Every pointer target is at least 44×44 CSS px',
            'Targets are at least 24×24 CSS px, unless an exception applies (enough spacing, inline in text, an equivalent control, browser-default, or essential)',
            'Only touch targets on mobile devices are in scope',
            'Nothing — target size is only a AAA requirement',
          ],
          answer: 1,
          explanation:
            '2.5.8 (new in 2.2, AA) sets **24×24 CSS px** with exceptions — notably **spacing**: an undersized target passes if a 24px-diameter circle centred on it doesn\'t intersect another target or its circle. 44×44 is 2.5.5 Target Size (Enhanced), **AAA**. The criterion applies to all pointer input, not just touch.',
        },
        {
          id: 'password-getbyrole',
          prompt: 'What happens when this test runs?',
          code: `render(\n  <label>\n    Password <input type="password" />\n  </label>,\n);\nscreen.getByRole('textbox', { name: 'Password' });`,
          codeLang: 'tsx',
          choices: [
            'It finds the input',
            "It throws — `<input type=\"password\">` has no ARIA role, so query it with `getByLabelText('Password')`",
            'It finds the `<label>` element',
            'It finds the input only with `{ hidden: true }`',
          ],
          answer: 1,
          explanation:
            "Password inputs deliberately have **no corresponding ARIA role** (they are not exposed as `textbox`), so `getByRole` can't match them. `getByLabelText` queries through the label association, which is exactly what you want to verify anyway. `{ hidden: true }` only includes elements hidden from the accessibility tree.",
        },
        {
          id: 'showmodal-gaps',
          prompt: 'Which of these does `dialogElement.showModal()` **not** give you automatically?',
          choices: [
            'Rendering in the top layer with a stylable `::backdrop`',
            'Making the rest of the page inert',
            'Closing on Escape',
            'An accessible name for the dialog',
          ],
          answer: 3,
          explanation:
            'A modal `<dialog>` gets the top layer, `::backdrop`, an inert background, Escape handling (`cancel` then `close` events) and, in current browsers, focus restoration on close. It does **not** get a name — add `aria-labelledby` pointing at its heading, just as with a `div role="dialog"`.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'build-accessible-components',
      title: 'Build (and test) accessible components',
      minutes: 65,
      intro:
        "Interview conditions: timer on, talk out loud, no AI. Start with the two warm-ups, then the dialog and the form — those are the classic UI-round asks. For every component, do a quick manual pass in the preview: Tab through it, use only the keyboard, and say what a screen reader would announce. The write-tests exercise practises the other half of the interview question (\"how would you test it?\"). The combobox is the stretch — do it if you have time, or come back to it on Day 15.",
      exercises,
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–120 seconds before revealing the model answer. Name WCAG criteria and APG patterns precisely — interviewers notice "2.4.7 Focus Visible" versus "make it look focused". For the build question, talk through the API and the focus lifecycle before any code.',
    },
  ],
  flashcards: [
    {
      id: 'pour',
      front: 'What does **POUR** stand for in WCAG?',
      back: '**Perceivable** (alt text, captions, contrast), **Operable** (keyboard, focus, target size), **Understandable** (labels, errors, predictability), **Robust** (correct name/role/value for assistive tech).',
    },
    {
      id: 'wcag-aa-text-contrast',
      front: 'WCAG 2.2 AA text contrast minimums? What counts as "large"?',
      back: '**4.5:1** normal text, **3:1** large text (1.4.3). Large = ≥ 24px regular or ≥ 18.66px (14pt) bold. AAA: 7:1 / 4.5:1. No rounding.',
    },
    {
      id: 'non-text-contrast',
      front: 'What does **1.4.11 Non-text Contrast** require?',
      back: '**3:1** against adjacent colours for UI component boundaries/states (input borders, toggles), **focus indicators**, and meaningful graphics/icons. Level AA.',
    },
    {
      id: 'target-size-minimum',
      front: 'Target size at WCAG 2.2 **AA** vs **AAA**?',
      back: 'AA (2.5.8, new in 2.2): **24×24 CSS px** or enough spacing (24px circles don\'t overlap). AAA (2.5.5): 44×44.',
    },
    {
      id: 'focus-not-obscured',
      front: 'What is **2.4.11 Focus Not Obscured (Minimum)**?',
      back: 'New AA criterion in WCAG 2.2: a focused element must not be **entirely hidden** by author content — sticky headers/footers, cookie banners, chat widgets. Fix with `scroll-padding-top` or by not overlapping.',
    },
    {
      id: 'first-rule-of-aria',
      front: 'The **first rule of ARIA**?',
      back: 'If a native HTML element or attribute already has the semantics and behaviour you need, use it instead of repurposing an element and adding ARIA. "No ARIA is better than bad ARIA."',
    },
    {
      id: 'aria-semantics-only',
      front: 'What can ARIA **not** do?',
      back: 'Add behaviour. No focusability, no keyboard handling, no styling, no click handling. `role="button"` is a promise you must keep with `tabIndex={0}` and Enter/Space handlers.',
    },
    {
      id: 'accname-order',
      front: 'Accessible name precedence (simplified)?',
      back: '1. `aria-labelledby` 2. `aria-label` 3. native label (`<label>`, `alt`, `<legend>`, `<caption>`) 4. name from content (buttons, links, headings…) 5. `title` / `placeholder` as last resort.',
    },
    {
      id: 'labelledby-vs-describedby',
      front: '`aria-labelledby` vs `aria-describedby`?',
      back: '**labelledby** sets the *name* (what it is — announced first, overrides other sources). **describedby** sets the *description* (supplementary hints, errors — announced after name, role and state, may be skipped by users).',
    },
    {
      id: 'live-region-must-preexist',
      front: 'Most common live-region bug?',
      back: 'Mounting the region together with its text. The `aria-live` / `role="status"` container must **exist before** its content changes; render it empty, then update the text.',
    },
    {
      id: 'status-vs-alert',
      front: '`role="status"` vs `role="alert"`?',
      back: '`status` = implicit `aria-live="polite"` (waits for idle) — results counts, "Saved". `alert` = implicit `aria-live="assertive"` (interrupts) — urgent errors only. Both are `aria-atomic="true"`.',
    },
    {
      id: 'tabindex-values',
      front: '`tabindex` values and when to use them?',
      back: '`0`: add a custom widget to the natural tab order. `-1`: focusable by script only (headings you move focus to, inactive roving items). **Positive: never** — it overrides DOM order.',
    },
    {
      id: 'roving-vs-activedescendant',
      front: 'Roving tabindex vs `aria-activedescendant`?',
      back: 'Roving: real focus moves; one item `tabIndex=0`, rest `-1` (tabs, toolbars, menus). Activedescendant: focus stays on the container/input, which references the active item\'s id (editable combobox). You scroll and style manually.',
    },
    {
      id: 'hiding-techniques',
      front: '`hidden` vs `aria-hidden` vs `.sr-only` vs `inert`?',
      back: '`hidden`/`display:none`: gone for everyone. `aria-hidden`: visible but removed from a11y tree (still focusable!). `.sr-only`: invisible but read. `inert`: visible but unfocusable, unclickable and hidden from AT.',
    },
    {
      id: 'modal-focus-lifecycle',
      front: 'The modal dialog focus lifecycle?',
      back: 'Save `document.activeElement` → move focus in (first focusable / least destructive / heading) → contain it (Tab wrap + `inert` background) → Escape closes → restore focus to the saved element.',
    },
    {
      id: 'native-dialog',
      front: 'What does `<dialog>` + `showModal()` give you for free?',
      back: 'Top layer, `::backdrop`, inert background, Escape (`cancel` → `close`), initial focus, and focus restoration on close in current browsers. You still add `aria-labelledby` and sync React state on `close`.',
    },
    {
      id: 'button-vs-link-rule',
      front: '`<a href>` or `<button>`?',
      back: '**Navigates** (URL changes, can open in new tab) → `<a href>`; activated by Enter. **Does something** on the page → `<button type="button">`; activated by Enter and Space.',
    },
    {
      id: 'decorative-alt',
      front: 'Missing `alt` vs `alt=""`?',
      back: '`alt=""` marks the image decorative — AT skips it. **Missing** `alt` often makes screen readers read the file name. Functional images (in links/buttons) describe the action: `alt="Search"`.',
    },
    {
      id: 'getbyrole-a11y-check',
      front: 'Why is `getByRole(role, { name })` an accessibility test?',
      back: 'It queries the **accessibility tree** — the same role + name a screen reader or voice-control user relies on. If the test can\'t find it, they can\'t either. (Gotcha: `type="password"` inputs have no role — use `getByLabelText`.)',
    },
  ],
  interviewQuestions: [
    {
      id: 'custom-dropdown-a11y',
      kind: 'concept',
      question: 'How would you make a custom dropdown accessible?',
      answer: `**One-liner:** first I'd push back on "custom" — if a native \`<select>\` works, use it. Otherwise I pick the APG pattern that matches the behaviour and implement its full contract: roles, states, keyboard and focus.

**Pick the pattern:** choosing one value from a list → *select-only combobox* + listbox; typing to filter → *editable combobox* + listbox; a list of commands → *menu button*; navigation links → a *disclosure*, not a menu.

**For a combobox + listbox:**
- **Semantics:** a visible label; the trigger has \`role="combobox"\`, \`aria-expanded\`, \`aria-controls\` → the listbox; the popup is \`role="listbox"\` with \`role="option"\` children and \`aria-selected\` on the current one.
- **Keyboard:** Enter/Space/ArrowDown open; arrows move; Home/End; typeahead by first letter; Enter selects; Escape closes without changing the value; Tab commits and moves on.
- **Focus:** DOM focus stays on the combobox; \`aria-activedescendant\` points to the active option, which I style and scroll into view myself.
- **Feedback:** a polite live region for "5 results" when filtering.
- **Pointer:** clicking an option must not blur the input first (\`preventDefault\` on mousedown); options at least 24px tall.

**Verification:** role-based tests (\`getByRole('combobox')\`, \`aria-expanded\`, \`aria-activedescendant\` after ArrowDown), axe, and a VoiceOver + NVDA pass — comboboxes are where screen readers differ most.

**Trade-off:** this is a lot of surface area, so in production I'd often use a well-tested headless library (React Aria, Radix, Headless UI) and spend my time on testing rather than re-implementing it.`,
      followUps: [
        'Why does focus stay on the input instead of moving to the options?',
        'How do you handle async options?',
        'What changes for multi-select?',
      ],
      minutes: 3,
      level: 'senior',
    },
    {
      id: 'label-vs-labelledby-vs-describedby',
      kind: 'concept',
      question: 'What is the difference between `aria-label`, `aria-labelledby` and `aria-describedby`?',
      answer: `**One-liner:** the first two set the element's **accessible name** — *what it is* — and the third sets its **description** — *extra information about it*.

- **\`aria-labelledby\`** references the id(s) of other elements and uses their text as the name. It has the **highest precedence** — it overrides \`aria-label\`, a \`<label>\` and the element's own content — and it can combine several ids, or reference hidden text. Typical uses: a dialog named by its heading, a section named by its \`<h2>\`.
- **\`aria-label\`** is a string name, used when there's no visible text to point at — an icon-only button. It overrides the element's content, so \`<button aria-label="Close">Cancel</button>\` is announced "Close" — a Label in Name (2.5.3) failure that breaks voice control. It's also not translated by many page-translation tools and is prohibited on generic \`div\`/\`span\` elements.
- **\`aria-describedby\`** references hint or error text. Screen readers read it **after** the name, role and state ("Email, edit text, invalid entry, Enter an email like name@example.com"), and users can turn descriptions down — so never put essential information only there.

**My order of preference:** visible text first (native \`<label>\`, button content); \`aria-labelledby\` when visible text exists elsewhere; \`aria-label\` only when nothing is visible. Then \`aria-describedby\` for hints and errors.`,
      followUps: ['What is the full accessible name precedence?', 'Can aria-labelledby point at a hidden element?', 'What about aria-errormessage?'],
      minutes: 2,
    },
    {
      id: 'first-rule-of-aria',
      kind: 'concept',
      question: 'What is the "first rule of ARIA", and why does it exist?',
      answer: `**One-liner:** if a native HTML element or attribute already gives you the semantics and behaviour you need, use it instead of adding ARIA to something else.

**Why:** ARIA only changes the **accessibility tree** — what assistive technology is *told*. It doesn't add focusability, keyboard handling or behaviour. \`<div role="button">\` claims to be a button but isn't in the tab order and ignores Enter and Space unless you add \`tabIndex\` and key handlers — and then you still lack disabled semantics and form submission. A native \`<button>\` gives you all of that, tested across browsers and screen readers.

**Evidence:** the APG itself says "no ARIA is better than bad ARIA", and WebAIM's annual scan of a million home pages keeps finding that pages using ARIA have *more* detected errors on average, because wrong ARIA actively misinforms users — a \`role="menu"\` without arrow keys, a stale \`aria-expanded\`.

**The other rules:** don't change native semantics unnecessarily; all interactive ARIA controls must be keyboard operable; never put \`aria-hidden\` or \`role="presentation"\` on focusable elements; every interactive element needs an accessible name.

**When ARIA *is* right:** for things HTML can't express — states like \`aria-expanded\` and \`aria-pressed\`, relationships like \`aria-controls\` and \`aria-activedescendant\`, live regions, and composite widgets like tabs or comboboxes that have no native element. Then I follow the APG pattern exactly and test with a screen reader.`,
      followUps: ['Give an example where ARIA is required.', 'Is `<nav role="navigation">` harmful?'],
      minutes: 2,
    },
    {
      id: 'modal-focus-management',
      kind: 'concept',
      question: 'Walk me through focus management for a modal dialog.',
      answer: `**One-liner:** save focus, move it in, keep it in, close on Escape, and put it back.

1. **Before opening**, store \`document.activeElement\` — usually the trigger button.
2. **On open**, move focus inside: by default the first focusable element; for destructive confirmations the *least destructive* action ("Cancel"); for long content the heading or the dialog container with \`tabIndex={-1}\`, so the start isn't scrolled away.
3. **While open**, contain it: Tab on the last element wraps to the first, Shift+Tab on the first wraps to the last. And make the background \`inert\` — a Tab trap doesn't stop a screen reader's virtual cursor or mouse clicks, \`inert\` does. Add \`aria-modal="true"\` and lock background scrolling.
4. **Escape** closes (stop propagation so a parent popover doesn't also close), as does a visible close/cancel button.
5. **On close**, return focus to the stored element — remove \`inert\` first, because inert elements can't take focus. If the trigger no longer exists (say the row was deleted), choose a logical successor.

**React specifics:** do it in an effect keyed on \`open\` with restoration in the cleanup, so it also runs on unmount; keep \`onClose\` out of the dependencies or the effect re-runs on every parent render and steals focus; portal to \`document.body\` so making the app root inert doesn't hide the dialog.

**Modern alternative:** native \`<dialog>\` with \`showModal()\` gives the inert background, Escape and focus restoration for free; I'd still add \`aria-labelledby\` and sync React state on the \`close\` event.`,
      followUps: ['Why is aria-modal not enough?', 'What should initial focus be for a delete confirmation?', 'How do you handle nested dialogs?'],
      minutes: 3,
    },
    {
      id: 'how-test-a11y',
      kind: 'concept',
      question: 'How do you test accessibility?',
      answer: `**One-liner:** in layers — static lint, role-based component tests, automated rules in CI, and a manual keyboard and screen-reader pass — because automated tools only catch a minority of issues.

1. **Lint:** \`eslint-plugin-jsx-a11y\` catches missing \`alt\`, click handlers on non-interactive elements and invalid ARIA as you type.
2. **Component tests:** Testing Library with \`getByRole(role, { name })\` — it queries the accessibility tree, so if the test can't find "button, Save", a screen-reader user can't either. With \`user-event\` I assert keyboard behaviour (Tab, Enter, Space, arrows, Escape), state (\`aria-expanded\`, \`aria-pressed\`, \`aria-invalid\`) and focus (\`toHaveFocus\` after closing a dialog or deleting an item).
3. **Rule engines:** \`jest-axe\`/\`vitest-axe\` on rendered components for fast feedback — knowing jsdom can't check contrast — and \`@axe-core/playwright\` against real pages in CI, tagged for WCAG 2.2 AA, plus Storybook's a11y addon during development.
4. **Manual, per feature:** unplug the mouse and do the flow; check visible focus, logical order, no focus lost to \`<body>\`; zoom to 400%; then a screen-reader smoke test — VoiceOver with Safari, NVDA with Chrome or Firefox — listening for name, role and state, and announcements.
5. **Periodically:** expert audits and, ideally, testing with disabled users.

**Why layered:** axe can tell you an image has no \`alt\`; it can't tell you the \`alt\` is wrong, focus went somewhere silly, or the tab order makes no sense. Zero violations is a floor, not a pass.`,
      followUps: ['What can axe not detect?', 'Why can jest-axe not check colour contrast?', 'What would you put in a PR checklist?'],
      minutes: 3,
    },
    {
      id: 'wcag-contrast-requirements',
      kind: 'concept',
      question: 'What are the WCAG colour contrast requirements, and how is contrast measured?',
      answer: `**One-liner:** at AA, **4.5:1** for normal text, **3:1** for large text, and **3:1** for UI components and focus indicators.

**The details:**
- **1.4.3 Contrast (Minimum), AA:** 4.5:1 for body text; 3:1 for large text — at least 24px regular or about 18.66px (14pt) bold.
- **1.4.6 Contrast (Enhanced), AAA:** 7:1 and 4.5:1.
- **1.4.11 Non-text Contrast, AA:** 3:1 for the visual boundaries and states of controls (input borders, checkbox outlines, toggle states), focus indicators and meaningful icons or chart elements. Often forgotten.
- Exemptions: disabled controls, pure decoration, logos.
- **1.4.1 Use of Color:** contrast doesn't help if colour is the *only* signal — errors need text, links in paragraphs need underlines or another cue.

**How it's measured:** convert each sRGB colour to **relative luminance** — linearise each channel (gamma-decode), then weight 0.2126 R + 0.7152 G + 0.0722 B — then the ratio is (lighter + 0.05) / (darker + 0.05), from 1:1 to 21:1. No rounding: \`#777\` on white is 4.48:1 and fails; \`#767676\` passes.

**In practice:** design tokens with pre-validated pairs, check every theme and state (dark mode, hover, placeholder), test text over images at its worst point, and run contrast checks in a real browser — jsdom can't compute it. APCA is being explored for WCAG 3, but WCAG 3 is a draft; audits and laws use the 2.x ratio.`,
      followUps: ['Does placeholder text need to meet 4.5:1?', 'How do you handle text over images?', 'What is APCA?'],
      minutes: 2,
    },
    {
      id: 'roving-vs-activedescendant',
      kind: 'concept',
      question: 'Roving tabindex vs `aria-activedescendant` — what are they and when do you use each?',
      answer: `**One-liner:** both make a composite widget a single tab stop with arrow-key navigation inside; roving tabindex moves **real focus** between items, \`aria-activedescendant\` keeps focus on one element and **points** at the active item.

**Roving tabindex:** exactly one item has \`tabIndex={0}\`, the rest \`-1\`. On an arrow key you move the \`0\` to the next item and call \`.focus()\`. Benefits: the browser scrolls the item into view, \`:focus-visible\` styling works, and screen-reader support is excellent. Leaving and re-entering the widget returns to the last active item. Use it for tabs, toolbars, menus, radio groups, trees.

**\`aria-activedescendant\`:** DOM focus stays on a container or input, whose \`aria-activedescendant\` holds the **id** of the active item; AT announces that item as if focused. You must style the active item yourself, scroll it into view, and make sure the referenced element exists with a stable id. The killer use case is an **editable combobox** — focus has to stay in the text input so the user can keep typing while arrowing through suggestions.

**Shared details:** wrap or stop at the ends (pick one and be consistent), Home/End, typeahead for long lists, and the arrow-key maths is identical.

**My default:** roving tabindex, unless focus must stay put. I'd mention that \`aria-activedescendant\` support has historically been less consistent across screen readers, so it deserves a real AT test.`,
      followUps: ['How do you implement typeahead?', 'What breaks if two items have tabIndex 0?', 'How do you keep the active option visible?'],
      minutes: 2,
      level: 'senior',
    },
    {
      id: 'announce-dynamic-changes',
      kind: 'concept',
      question: 'How do you announce dynamic changes — search results, "saved" toasts, errors — to screen-reader users?',
      answer: `**One-liner:** either move focus to the new content when the user needs to act on it, or announce it through a **live region** when they don't — WCAG 4.1.3 Status Messages.

**Live regions:**
- \`role="status"\` (implicitly \`aria-live="polite"\`) for most things: "12 results", "Saved", "Item added to cart". Polite waits until the user is idle.
- \`role="alert"\` (assertive) only for urgent, time-sensitive errors — it interrupts whatever is being read.
- \`role="log"\` for appended streams like chat.

**The critical implementation detail:** the region must exist in the DOM **before** its content changes. In React I render \`<div role="status" className="sr-only">{message}</div>\` unconditionally and only change \`message\`. \`{saved && <div role="status">Saved</div>}\` is frequently silent. Identical messages twice in a row may not re-announce, so I clear and set, or vary the text. One app-level announcer (a context with \`announce(message)\`) avoids competing regions.

**When to move focus instead:** after a form submit fails (to the first invalid field or an error summary), when a dialog opens, after a route change (to the new \`<h1>\`), after deleting an item (to its neighbour). Focus moves are announced naturally and put the user where they need to be.

**Don't:** announce everything (noise), use assertive for routine updates, or auto-dismiss toasts that contain actions — those must be reachable by keyboard and stay long enough (2.2.1 Timing Adjustable).`,
      followUps: ['Why might a live region not announce?', 'How would you build a global announcer in React?', 'Should toasts be focusable?'],
      minutes: 2,
    },
    {
      id: 'div-onclick-problem',
      kind: 'debugging',
      question: 'A teammate built a clickable card with `<div onClick={open}>`. It works fine with a mouse. What is wrong, and how do you fix it?',
      answer: `**One-liner:** a \`div\` has no role, isn't focusable and ignores the keyboard — so keyboard, screen-reader, voice-control and switch users can't use it.

**What's missing, concretely:**
- **Focus:** it's not in the tab order (WCAG 2.1.1 Keyboard).
- **Activation:** Enter and Space do nothing; buttons fire on Enter and Space, links on Enter.
- **Role and name (4.1.2):** a screen reader reads it as plain text, so nobody knows it's interactive; voice-control users can't say "click…" to it.
- **Everything else:** no disabled state, no \`:focus-visible\` by default, no "open in new tab" if it navigates.

**The fix depends on what it does:**
- Navigates → \`<a href="/items/42">\` — and if the whole card should be clickable, put the link on the card's heading and stretch its hit area with a \`::after\` pseudo-element covering the card. That keeps the accessible name short ("Blue running shoes", not the entire card text) and leaves other buttons in the card usable.
- Performs an action → \`<button type="button">\`, with \`all: unset\` or a reset class if styling is the concern.

**What I'd avoid:** patching the \`div\` with \`role="button"\`, \`tabIndex={0}\` and a keydown handler — it's more code that still misses edge cases (Space scrolling the page, disabled handling, form semantics).

**Prevent recurrence:** \`eslint-plugin-jsx-a11y\` rules (\`click-events-have-key-events\`, \`no-static-element-interactions\`) and a role-based test — \`getByRole('link', { name: … })\` would have failed immediately.`,
      followUps: ['How do you make a whole card clickable without nesting interactive elements?', 'When is role="button" acceptable?'],
      minutes: 2,
    },
    {
      id: 'build-accessible-modal',
      kind: 'ui-build',
      question: 'Build an accessible modal dialog component in React. Talk me through the API and the implementation.',
      answer: `**Clarify first:** confirmation or form? Can it be dismissed by clicking the backdrop? Are nested dialogs possible? Is the native \`<dialog>\` allowed (browser support), or do we need a \`div\`?

**API:** \`<Dialog open onClose title description? initialFocusRef?>{children}</Dialog>\` — controlled (\`open\` + \`onClose\`), a required \`title\` so it can't be unnamed, and an optional ref for initial focus.

**Structure:** portal to \`document.body\`; a backdrop; the panel with \`role="dialog"\`, \`aria-modal="true"\`, \`aria-labelledby\` → the \`<h2>\` (ids from \`useId\`), \`aria-describedby\` when there's a description, and \`tabIndex={-1}\` as a focus fallback.

**Behaviour, in one effect keyed on \`open\`:**
1. Save \`document.activeElement\`.
2. Set \`inert\` on the body's other children.
3. Focus \`initialFocusRef\`, else the first tabbable element, else the panel.
4. Cleanup: remove \`inert\`, then focus the saved element if it's still connected.
I keep \`onClose\` out of the dependency array so a new inline callback each render doesn't re-run the effect.

**Keyboard:** \`onKeyDown\` on the panel — Escape → \`stopPropagation()\` + \`onClose()\`; Tab → query tabbables fresh, wrap at the ends with \`preventDefault()\`.

**Extras:** scroll lock on \`<html>\`; backdrop click closes only for non-critical dialogs; \`role="alertdialog"\` for destructive confirmations with focus on "Cancel"; respect \`prefers-reduced-motion\` for the open animation.

**Tests (Testing Library):** \`getByRole('dialog', { name })\`, \`aria-modal\`; initial focus; \`user.tab()\` wraps; Escape calls \`onClose\`; focus returns to the trigger. Then a VoiceOver pass.

**Alternative:** native \`<dialog>\` + \`showModal()\` gives the inert background, Escape and focus restoration; I'd sync state from its \`close\` event and still add \`aria-labelledby\`.`,
      followUps: [
        'How would you support nested dialogs?',
        'How do you lock scroll without layout shift?',
        'What changes if the dialog contains a form with unsaved input?',
        'How would you test that the background is inert?',
      ],
      minutes: 10,
      level: 'senior',
    },
  ],
};

export default day;
