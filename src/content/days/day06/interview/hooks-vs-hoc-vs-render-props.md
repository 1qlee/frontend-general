**One-liner:** all three share stateful logic; custom hooks are the default today because they compose without changing the component tree, while render props and HOCs survive for specific cases.

**Custom hooks** are functions that call hooks; the caller gets values back and renders everything. The data flow is explicit (you can see where `user` comes from), they compose by calling each other, and they're easy to type. Limits: function components only, and a hook can't decide *where* UI goes in someone else's tree.

**Render props** — a component owns behaviour and calls a function prop to render. They're still the right fit when the component must place the caller's UI at a specific spot in its own tree: `renderItem` in a virtualised list, `renderOption` in a combobox. They're also used for state-based styling, like React Router's `NavLink className={({ isActive }) => …}`, and they work for class components.

**HOCs** — `withX(Component)` returns a wrapped component with injected props. The problems are why hooks replaced them: implicit props, name collisions between HOCs, wrapper hell in DevTools, ref forwarding before React 19, and awkward generic typing. You still see them in legacy code (`connect`, `withRouter`), for cross-cutting wrappers applied at definition time (`withErrorBoundary`, auth guards), and `memo`/`lazy` are HOC-shaped.

**How I choose:** a hook by default; a render prop when caller UI has to render inside my component; an HOC only to fit an existing codebase or wrap many components uniformly. And when several components share implicit UI state, compound components with context.
