**One-liner:** React identifies hooks by the **order** they're called in, so that order has to be identical on every render.

**The mechanism.** Each component instance has a fiber, and the fiber stores an ordered list of hook cells — state and its update queue, effects and their deps, refs, memoised values. There are no names or keys. On the first render each hook call appends a cell; on every re-render the n-th call reads the n-th cell.

**What breaks.** If a hook is skipped because of an `if` or an early `return`, every later hook reads its neighbour's cell: state appears in the wrong variable, an effect compares the wrong dependencies. React catches part of it — a different hook *count* throws "Rendered more hooks than during the previous render" (or "fewer… accidental early return"), and in development it warns when the *kind* of hook at a position changes — but two `useState`s swapping would silently corrupt state. So the rule has to hold statically, which is what the `rules-of-hooks` ESLint rule checks and what the React Compiler assumes.

**The second rule** — only call hooks from components or custom hooks — exists because a hook needs a *currently rendering* component to attach its cell to. From an event handler or a utility function there isn't one ("Invalid hook call"). The `use` prefix is how the linter recognises custom hooks.

**In practice:** move hooks above early returns, or split the component so each piece always calls the same hooks. The one exception is React 19's `use`, which may be called conditionally.
