**One-liner:** every consumer re-renders whenever the provider's value changes by `Object.is` — regardless of `memo` — and there are no selectors, so context suits low-frequency values.

**Pitfalls:**
- **Inline object values.** `value={{ user, setUser }}` is a new object on every provider render, so all consumers re-render even when `user` didn't change.
- **Kitchen-sink contexts.** One context holding user, theme, cart and notifications means a cart change re-renders every theme consumer.
- **Hot state in context.** Form values or pointer position cause broad re-renders on every keystroke or move.

**Mitigations, roughly in order:**
1. `useMemo` the value, and make the functions inside it stable.
2. Split contexts by change frequency, and split state from dispatch — `dispatch` never changes, so components that only send updates never re-render.
3. Have the provider take `children`, so its own state changes don't re-render the subtree — only the real consumers. Keep consumers small and low in the tree.
4. For hot shared state, put a **store** in context instead of the state, and subscribe with `useSyncExternalStore` plus a selector. Only components whose selected slice changed re-render. That's how react-redux, Zustand and use-context-selector work.

**Process:** measure with the React DevTools Profiler before optimising. The React Compiler memoises values for you, but it doesn't add selectors to context — splitting and stores are still design decisions. And sometimes the answer is just to pass props: a couple of levels of prop drilling is explicit and cheap.
