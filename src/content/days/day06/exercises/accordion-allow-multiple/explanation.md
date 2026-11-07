**State shape is the whole exercise.** One `string[]` of open values covers both modes — single mode is just "at most one element". The only place the modes differ is the toggle:

```ts
setOpen((prev) =>
  prev.includes(value) ? prev.filter((v) => v !== value) : allowMultiple ? [...prev, value] : [value],
);
```

Two separate states (`openValue: string | null` *and* `openValues: string[]`) mean two code paths and a mode switch that has to convert between them. A `Set<string>` works too, but must be copied on every update (`new Set(prev)`) — mutating it in place keeps the same reference and React bails out.

**Compound structure:** `Accordion` provides `{ isOpen, toggle }`; `AccordionItem` reads it with a hook that throws outside the provider. Items identify themselves by `value`, never by index — wrapping an item in a permission check or a fragment must not break it.

**`hidden` vs unmounting:** `hidden` keeps the panel element (so `aria-controls` always points at something) and preserves state inside the panel (a half-filled form); unmounting saves work for heavy panels. Mention the trade-off.

**Details that earn credit**

- The context value here is a fresh object each render, so every item re-renders whenever `Accordion` does. Fine for five items; for many, `useMemo` the value and `useCallback` the toggle.
- Hard-coding `<h3>` is a simplification: a real component takes a `headingLevel` prop so it fits the page outline.
- Buttons give you focus, Enter and Space for free. The WAI-ARIA APG pattern optionally adds Up/Down/Home/End between headers.
- The platform has a native version: `<details name="faq">` elements sharing a `name` form an **exclusive accordion** in current browsers — worth knowing when the design allows it.

**Follow-ups**

- *"Make it controllable."* → `value` / `onValueChange` through the `useControllableState` hook you just wrote.
- *"Animate the height."* → measure in `useLayoutEffect` or use CSS `grid-template-rows: 0fr → 1fr`; `interpolate-size: allow-keywords` is the newer CSS answer where supported.
- *"Prevent collapsing the last open item?"* → a `collapsible={false}` option (Radix has exactly this) — the toggle simply ignores closing when it would leave nothing open.
