**One-liner:** same API, different timing — `useLayoutEffect` runs synchronously after React updates the DOM but **before the browser paints**; `useEffect` usually runs after paint.

**The pipeline:** render (call components) → commit (mutate the DOM) → layout effects (synchronous; state updates inside them are also processed before paint) → paint → passive effects.

**When I need the layout version:** when I must read layout and immediately change what's on screen, and showing the intermediate frame would flicker:
- positioning a tooltip or popover relative to its anchor, flipping it if there's no room;
- measuring text or a container to decide on truncation or a layout;
- scroll restoration, or keeping a chat pinned to the bottom when messages arrive;
- FLIP animations that start from a measured position.

**Everything else uses `useEffect`:** fetching, subscriptions, logging, analytics, syncing with non-visual systems. None of it should block a frame.

**Costs and caveats:** layout effects block paint, so heavy work there causes jank. Neither kind runs on the server, so server HTML shows the pre-measurement state (React 19 dropped the old warning about it). `useInsertionEffect` is a third, earlier variant meant for CSS-in-JS libraries to inject styles before layout is read.

**Example to give:** a tooltip that should flip above its anchor. With `useEffect` it paints below for one frame, then jumps; with `useLayoutEffect` the user only ever sees the final position.
