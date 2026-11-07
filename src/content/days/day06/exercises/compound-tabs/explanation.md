**Structure.** `Tabs` owns `selected` (controlled or internal), creates a `baseId` with `useId`, and provides a memoised `{ selected, select, baseId }`. Every child reads it through `useTabsContext(name)`, which throws outside `<Tabs>`. Ids are derived — `${baseId}-tab-${value}` / `${baseId}-panel-${value}` — so tabs and panels can find each other without registering anything, and they're identical on server and client. (Values become part of an id, so keep them id-safe; a production version would sanitise them or map them to indices.)

**Controlled vs uncontrolled.** `isControlled = value !== undefined`; `select(next)` updates internal state only when uncontrolled and always calls `onValueChange`. In a real codebase this is one line with the `useControllableState` hook from the previous exercise.

**Keyboard.** The handler lives on `TabList` and reads the tab order **from the DOM** (`currentTarget.querySelectorAll('[role="tab"]')`), finds the event target, computes the next index with wrap-around, focuses it and selects its `data-value`. Reading the DOM means wrappers, fragments and conditionally rendered tabs all just work. The alternatives are registering tabs in context (complex: order comes from effects) or passing a `values` array down (duplicated configuration).

**Choices worth saying out loud**

- **Automatic vs manual activation.** Arrow keys select immediately here (*automatic activation*, the APG's recommendation when panels render fast). If showing a panel is expensive (a fetch), use *manual activation*: arrows move focus only; Enter/Space selects.
- **Panels:** kept in the DOM with `hidden` (so `aria-controls` always resolves) but only the selected panel renders its children — lazy, but inactive panels lose their state. Radix offers `forceMount` for the opposite trade-off.
- **`tabIndex={0}` on the panel** lets keyboard users reach the panel even when it has no focusable content (APG guidance).
- `e.preventDefault()` on Home/End stops the page from scrolling.

**Follow-ups you may get**

- *Disabled tabs* → skip them in the query (`:not(:disabled)`) and in the wrap-around.
- *Vertical tabs* → `aria-orientation="vertical"` on the tablist and Up/Down keys; *RTL* → swap Left/Right.
- *Sync with the URL* → controlled mode: `value={searchParams.get('tab') ?? 'account'}`, `onValueChange={(v) => setSearchParams({ tab: v })}`.
- *A team wants their own markup* → extract a headless `useTabs()` returning `getTabListProps`, `getTabProps(value)`, `getPanelProps(value)`; the compound components become a thin styled layer on top.
- *How would you test it?* → exactly like these tests: query by role and accessible name, drive it with `user-event` (clicks, `{ArrowRight}`, `tab()`), and assert ARIA state and focus — never class names.
