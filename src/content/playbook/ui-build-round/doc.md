## What interviewers grade

The UI build (or "machine coding") round asks you to build a working component or mini-app in 45–60 minutes, usually in React. The trap is to treat it as a speed-typing contest. Interviewers grade **how you structure the problem** as much as whether it works.

| Area | Strong signal | Weak signal |
|---|---|---|
| **Functionality** | Core requirements work end-to-end by the deadline | Half of every feature, none finished |
| **Component design** | Sensible split, clear props API, composition | One 300-line component, or ten tiny ones for no reason |
| **State** | Minimal state, single source of truth, derived values computed in render | Duplicated/derived state synced with effects |
| **TypeScript** | Typed props, discriminated unions for status, no `any` | `any` everywhere, or fighting the compiler for 10 minutes |
| **Async** | Loading, error and empty states; race conditions handled | Only the happy path; stale responses overwrite fresh ones |
| **Accessibility** | Semantic elements, labels, keyboard support, focus management | `div` with `onClick`, no labels, mouse-only |
| **Code quality** | Readable names, immutable updates, no dead code | Mutating state, copy-pasted handlers |
| **Communication** | Narrates trade-offs and scope cuts | Silent typing |
| **Testing mindset** | Mentions or writes tests by role/label | No idea how they'd verify it |

> [!INTERVIEW] Open with this
> "Before I code, I'd like five minutes on requirements and component structure, then I'll get a static version on screen, add interactions, then loading and error states, then accessibility. I'll tell you if I'm cutting scope."

## The 45-minute plan

| Minutes | Phase | Output | Say this |
|---|---|---|---|
| 0–5 | **Requirements & API** | MVP list + stretch list as a comment; props interface | "What's in scope for the MVP? Is the data local or from an API?" |
| 5–10 | **Component tree & state ownership** | Tree sketch; table of state and owners | "This state is only read by the list, so it lives there. The query is shared, so it lives in the parent." |
| 10–18 | **Static skeleton** | Renders hard-coded data with semantic HTML | "Static first so we can see the layout and I can validate the structure." |
| 18–28 | **Interactions** | Handlers, controlled inputs, immutable updates | "Each update returns a new array so React sees the change." |
| 28–35 | **Async, loading, error, empty** | Status union, cancellation, retry | "I'll model status as a discriminated union so impossible states can't exist." |
| 35–40 | **Accessibility & keyboard** | Labels, ARIA where needed, focus, keys | "Let me make sure it works without a mouse." |
| 40–45 | **Polish, tests, wrap-up** | Edge cases, one or two tests, summary | "With more time I'd add X, Y, and tests for Z." |

For a **60-minute** round, add the time to interactions and async. For a **30-minute** round, drop styling entirely and do accessibility as you go.

### 0–5: requirements and API

Ask, then **write the answers down** as a comment at the top of the file:

- **Data:** "Mock data or a real endpoint? What's the shape?" (Write a `type` for it immediately.)
- **Scope:** "What's the MVP? Which of these are stretch goals?"
- **Behaviour:** "Should search be debounced? Single or multi-select? What happens on error?"
- **API:** "Controlled or uncontrolled? Is this a reusable component or a one-off page?"
- **Constraints:** "Any libraries allowed? Do you want tests? Does styling matter?"

```tsx
interface Option { id: string; label: string }

interface AutocompleteProps {
  /** Async source so the parent controls fetching (easy to mock in tests). */
  fetchOptions: (query: string, signal: AbortSignal) => Promise<Option[]>;
  onSelect: (option: Option) => void;
  label: string;
  minChars?: number;
  debounceMs?: number;
}
```

> [!TIP]
> Injecting the data source as a prop (`fetchOptions`) instead of calling `fetch` inside is a quiet senior signal: it makes the component testable and decoupled from the API.

### 5–10: component tree and state ownership

Sketch the tree in a comment and decide, for every piece of state: **who reads it, who writes it, and can it be derived?** State lives in the lowest common ancestor of its readers. Anything computable from other state or props is computed in render, not stored.

```text
<Autocomplete>            owns: query, results status, activeIndex, isOpen
  <input combobox />      reads query, activeIndex
  <Listbox>               reads results, activeIndex
    <OptionRow /> ×n      pure, props only
```

| Kind of state | Where it lives |
|---|---|
| UI state used by one component | `useState` in that component |
| Shared by siblings | Lowest common parent, passed down |
| Many related transitions | `useReducer` |
| Server data | A fetch hook / TanStack Query in a real app |
| Filters, sort, page that should survive reload or be shareable | URL search params |
| Derivable (counts, filtered lists, "is valid") | Computed during render (`useMemo` only if expensive) |

### 10–18: static skeleton

Render the full UI with hard-coded data. Use the right elements now, it saves accessibility work later: `button` for actions, `a` for navigation, `form` + `label` for inputs, `ul/li` for lists, `table` for tabular data. Keep CSS minimal: flex or grid and a few spacing rules.

### 18–28: interactions

Wire up handlers and controlled inputs. Use immutable updates and name handlers after intent (`handleToggle`, not `onClick2`).

| Operation | Immutable update |
|---|---|
| Add | `setItems((prev) => [...prev, item])` |
| Remove | `setItems((prev) => prev.filter((i) => i.id !== id))` |
| Update | `setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))` |
| Reorder | `const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved);` |
| Sort for display | `items.toSorted(compare)` (ES2023) or `[...items].sort(compare)`, never `items.sort()` on state |

### 28–35: async, loading, error and empty states

Model async status as a **discriminated union** and cancel superseded requests.

```tsx
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function useAsync<T>(load: ((signal: AbortSignal) => Promise<T>) | null, deps: React.DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' });
  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setState({ status: 'success', data }); },
      (error: unknown) => {
        if (controller.signal.aborted) return; // superseded: ignore
        setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => controller.abort(); // cleanup cancels the previous request
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
```

Say out loud: "In production I'd use TanStack Query or the framework's data layer for caching, deduping and retries; here I'm writing the minimal version." Render **all four** states: a spinner or skeleton, an error with a retry button, an empty state with a helpful message, and the data.

```tsx
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
```

### 35–40: accessibility and keyboard

- [ ] Every input has a visible `<label>` (or `aria-label` when there's no visible text)
- [ ] Icon-only buttons have an accessible name (`aria-label="Close"`)
- [ ] Everything works with Tab, Enter/Space, Escape, and arrows where the pattern expects them
- [ ] Focus is visible and moves sensibly (into dialogs, back to the trigger on close)
- [ ] State is exposed: `aria-expanded`, `aria-selected`, `aria-checked`, `aria-sort`, `aria-busy`
- [ ] Dynamic messages (results count, upload done) are announced via `aria-live="polite"` or `role="status"`

```tsx
function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (!options.length) return;
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault(); // stop the caret moving
      setActive((i) => (i + 1) % options.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
      break;
    case 'Enter':
      if (active >= 0) choose(options[active]);
      break;
    case 'Escape':
      setOpen(false);
      break;
  }
}
```

### 40–45: polish, tests and wrap-up

Fix edge cases, then write (or describe) one or two Testing Library tests that use **roles and labels**, which double as proof of accessibility:

```tsx
test('selects an option with the keyboard', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<Autocomplete label="Country" fetchOptions={async () => [{ id: 'fr', label: 'France' }]} onSelect={onSelect} />);
  await user.type(screen.getByRole('combobox', { name: 'Country' }), 'fra');
  await screen.findByRole('option', { name: 'France' });
  await user.keyboard('{ArrowDown}{Enter}');
  expect(onSelect).toHaveBeenCalledWith({ id: 'fr', label: 'France' });
});
```

Finish with a 30-second summary: what works, what you cut, and what you'd do next (tests, memoisation if profiling shows a need, virtualisation, URL state).

## Common prompts and their gotchas

| Prompt | The 2–3 gotchas to address | Stretch goals to mention |
|---|---|---|
| Autocomplete | Debounce + ignore stale responses; keyboard + combobox ARIA; blur-before-click | Cache per query, highlight match, recent searches |
| Modal | Focus in/trap/restore; Escape + backdrop click; portal / top layer | Nested modals, scroll lock, animation with reduced motion |
| Tabs | Tab/tablist/tabpanel roles + roving tabindex; arrow keys; controlled vs uncontrolled | Lazy panels, URL sync, compound component API |
| Data table | Derive visible rows; reset/clamp page on filter; `aria-sort` | Server-side mode, URL state, virtualisation |
| Infinite scroll | IntersectionObserver sentinel; no duplicate fetches; error + retry | Virtualisation, scroll restoration, "load more" fallback |
| Todo / Kanban | Stable ids, immutable updates/reducer; keyboard alternative to drag | Persistence, optimistic updates with rollback, undo |
| Star rating | Radio-group semantics; hover preview vs committed value | Half stars, read-only mode, clear rating |
| File uploader | Validation + drag events; progress needs XHR; object-URL cleanup | Chunked/resumable uploads, retry, parallel limit |
| Image carousel | Wrap-around index; autoplay pause + reduced motion; accessible controls | Swipe, lazy-loading, preloading next slide |
| Nested comments | Recursive rendering; normalised data for deep updates; safe text rendering | Lazy-loaded replies, collapse threads, optimistic posting |

### Autocomplete / typeahead

- **Race conditions:** a slow response for `"re"` must not overwrite the result for `"rea"`. Abort the previous request (`AbortController`) or compare a request id. Debounce input by ~200–300 ms and enforce `minChars`.
- **Combobox ARIA:** the input has `role="combobox"`, `aria-expanded`, `aria-controls` (pointing at the listbox) and `aria-activedescendant` (the active option's id); options are `role="option"` with `aria-selected`. Focus **stays in the input**.
- **Blur before click:** clicking an option blurs the input first, which may close the list before the click registers. Use `onMouseDown={(e) => e.preventDefault()}` on the list, or close on blur only when focus leaves the whole widget.

### Modal / dialog

- **Focus:** move focus into the dialog on open, keep Tab inside it, and **return focus to the trigger** on close. Escape closes it.
- **Prefer native `<dialog>` with `showModal()`**: it renders in the top layer, makes the rest of the page inert and handles Escape (via the `cancel` event). Otherwise: a portal, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, a focus trap and `inert` on the background.
- **Backdrop click:** close only when `e.target === e.currentTarget`, so clicks inside the content don't close it. Lock body scroll while open.

### Tabs

- **Roles and roving tabindex:** `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, `role="tabpanel"` with `aria-labelledby`. Only the active tab has `tabIndex={0}`; the others `-1`. Left/Right arrows move between tabs, Home/End jump.
- **API:** support controlled (`value` + `onChange`) and uncontrolled (`defaultValue`). A compound API (`<Tabs><Tabs.List>…`) using context is a nice senior touch.
- **Mounting:** hidden panels unmounted lose their state; kept mounted (with `hidden`) they keep it but cost memory. Say which you chose.

### Data table with sort, filter and pagination

- **Derive, don't store:** keep only `sortKey`, `direction`, `filter` and `page` in state; compute `paginate(sort(filter(rows)))` in render (`useMemo` if the data is large). Never sort the state array in place.
- **Page bookkeeping:** reset to page 1 when the filter changes and clamp the page when results shrink. Compare numbers numerically and strings with `localeCompare` or `Intl.Collator`; add a tie-breaker for stable ordering.
- **Accessibility:** a real `<table>` with `<caption>` and `<th scope="col">`; put the sort control as a `<button>` inside the header and set `aria-sort` on the `th`.

### Infinite scroll

- **Trigger with `IntersectionObserver`** on a sentinel element below the list, not a scroll listener. Disconnect it on unmount.
- **Guard against duplicate fetches:** don't request while `loading` or when `!hasMore`; use cursor-based pagination and **dedupe by id** when items shift between pages.
- **Failure and access:** show an inline error with "Retry"; offer a "Load more" button (keyboard users can't reach a footer below an endless list). Thousands of rows need **virtualisation**.

### Todo list / Kanban board

- **Identity:** stable ids (`crypto.randomUUID()`), never array indices, for keys and updates. Many action types point to `useReducer`.
- **Drag and drop:** the HTML Drag and Drop API doesn't work on touch screens; pointer events or a library do. Provide a **keyboard/button alternative** for moving cards (WCAG 2.2 criterion 2.5.7, Dragging Movements).
- **Persistence and optimism:** `localStorage` in `try/catch`; optimistic moves with rollback on server error.

### Star rating

- **Semantics:** a radio group: `fieldset` + `legend` + visually hidden `input type="radio"` with star labels gives arrow-key support for free. Otherwise `role="radiogroup"` and `role="radio"` with `aria-checked`. Each option's name reads like "3 out of 5 stars".
- **Two values:** a transient `hoverValue` for preview and the committed `value`; reset hover on `mouseleave`. Support `readOnly`, `max` and a controlled API.

### File uploader

- **Input and drop zone:** a styled `<label>` for a hidden `input type="file" multiple accept="…"`, plus a drop zone that calls `preventDefault()` on `dragover` and `drop` (otherwise the browser opens the file). Validate type and size client-side, and say the server must validate too.
- **Progress:** `fetch` has no upload-progress event; use `XMLHttpRequest` and `xhr.upload.onprogress`, with `xhr.abort()` for cancel. Track per-file status (`queued | uploading | done | error`) and limit parallel uploads.
- **Previews:** `URL.createObjectURL(file)` and `URL.revokeObjectURL` in cleanup to avoid leaks. Announce completion with `aria-live`.

### Image carousel

- **Index math:** `(i + 1) % n` and `(i - 1 + n) % n`. Clear the autoplay interval on unmount.
- **Motion:** pause autoplay on hover and focus, provide a visible pause button (WCAG 2.2.2, Pause, Stop, Hide, applies to auto-moving content lasting over 5 seconds), and respect `prefers-reduced-motion`. Animate with `transform`, not `left`.
- **Controls and images:** buttons with accessible names ("Next slide"), meaningful `alt` text, lazy-load off-screen images and preload the next one.

### Nested comments

- **Recursion:** a `Comment` component renders its replies with itself; cap visual indentation at a depth.
- **Data shape:** a nested tree makes "add a reply 5 levels deep" a recursive immutable update. Normalised data (`byId` + `childIds`) makes it O(1). Mention the trade-off.
- **Safety and scale:** render user text as text (never `dangerouslySetInnerHTML` without sanitising); lazy-load long reply threads; keys by comment id.

## When you're running out of time

Triage in this order, and **say what you're cutting**:

1. Make the core flow work end-to-end, even ugly.
2. Loading and error states (one line each is fine).
3. Keyboard support for the main interaction.
4. Leave `// TODO:` comments for the rest and mention them in your summary.

> [!MISTAKE]
> Spending 15 minutes on CSS. Unless the prompt is explicitly about layout, interviewers care about structure, state and behaviour. Flex, a gap, and move on.

> [!MISTAKE]
> Storing derived state, e.g. `const [filtered, setFiltered] = useState([])` updated in an effect whenever `items` or `query` changes. It renders twice and drifts out of sync. Compute it during render.

> [!MISTAKE]
> Reaching for `useMemo`/`useCallback` everywhere "for performance" before anything is slow. Say "I'd profile first; if this list were large I'd memoise the row component."

## Key takeaways

- Follow the plan: **requirements → tree & state → static → interactions → async states → a11y → polish**, and announce each phase.
- Minimal state, lowest common owner, derived values computed in render.
- Model async as a discriminated union; cancel stale requests; render loading, error and empty.
- Semantic HTML first, then the ARIA pattern for the widget, then keyboard and focus.
- Know the 2–3 gotchas for each common prompt; naming them early is half the grade.
- Cut scope out loud and finish with a summary of what you'd do next.
