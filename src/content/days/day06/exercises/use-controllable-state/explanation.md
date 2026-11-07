**Approach.** Derive `isControlled = value !== undefined` and `current = isControlled ? value : internal`. Keep `{ current, isControlled, onChange }` in a ref that a `useLayoutEffect` (no deps) refreshes after every commit. Create the setter **once** with `useCallback(…, [])`; it reads everything from the ref:

- resolve the updater against `ref.current.current`, bail out on `Object.is`;
- **uncontrolled:** write the resolved value into the ref immediately (so a second updater in the same event builds on it), then `setInternal(resolved)`;
- **controlled:** don't touch internal state — just report with `onChange(resolved)`.

**Why not the obvious alternatives?**

| Attempt | Problem |
|---|---|
| `const current = value ?? internal` | `null` becomes "uncontrolled" — a controlled Select with no selection would show its default. |
| `useCallback(set, [current, onChange])` | Correct values, but a **new setter** whenever the value changes — and on *every* render when `onChange` is an inline arrow. Callers' effects that depend on it re-run. |
| `setInternal((prev) => { const next = …; onChange(next); return next; })` | A side effect inside an updater. Updaters must be pure; StrictMode calls them twice → `onChange` fires twice. It also doesn't help in controlled mode. |
| Writing `ref.current = …` during render | Impure render; with concurrent rendering a render can be discarded, leaving the ref pointing at props that never committed. A layout effect runs before any user event can call the setter. |

Why not React 19.2's `useEffectEvent`? Effect events are for calling from *inside effects*; they must not be returned to callers or passed to other components. A setter you hand out is exactly that, so the latest-ref pattern is the right tool here.

**Edge cases and follow-ups**

- *"What if a component switches from uncontrolled to controlled?"* → Store the initial mode in a ref and `console.warn` in development when it changes — the same warning React gives for `<input>`. Don't try to support it.
- *"What if `T` is itself a function?"* → `typeof next === 'function'` is ambiguous — the same limitation as `useState`. Wrap functions in an object.
- *"The parent ignores `onChange` — what happens?"* → The displayed value doesn't change. That's correct: it's how a parent "locks" a control or validates before accepting.
- *"How would you test a component built on this?"* → Render it both ways: uncontrolled (interact, assert the UI) and controlled (interact, assert the callback **and** that the UI didn't change until you re-render with the new value) — exactly what the Tabs exercise tests do.
