**One-liner:** mirror native inputs — `value` + `onValueChange` for controlled, `defaultValue` for uncontrolled — and route both through one internal hook that picks the source of truth.

**The API** for, say, a Disclosure: `open?`, `defaultOpen?`, `onOpenChange?(open)`.

**The rules that make it predictable:**
1. The mode is decided by whether `value` is `undefined`. `null` is a valid controlled value ("nothing selected"). The mode shouldn't change during the component's lifetime — I warn in development, like React does for inputs.
2. `defaultValue` is read once, on mount. To reset, the parent changes the `key`.
3. In controlled mode the component calls `onValueChange(next)` and keeps rendering the prop — the parent may reject or transform the change.
4. The callback fires in both modes, receives the value rather than an event (changes can come from the keyboard, a close button or code), and doesn't fire when nothing changed.

**Implementation:** a `useControllableState({ value, defaultValue, onChange })` hook that returns `[current, setValue]` like `useState`. The setter supports updater functions and keeps a stable identity by reading the latest props from a ref that's refreshed after each commit. Every stateful component in the design system uses it, so they all behave the same way.

**Why support both:** uncontrolled is the easiest thing for simple screens; controlled is needed to sync with the URL, reset after submit, open from somewhere else or validate before accepting. **The cost** is two modes to test, so I test every component both ways: interact uncontrolled; in controlled mode assert the callback fired *and* the UI didn't change until the parent re-rendered.
