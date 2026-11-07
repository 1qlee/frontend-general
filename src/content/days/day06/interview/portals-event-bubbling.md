**One-liner:** `createPortal(children, domNode)` renders children into a different DOM node while keeping them at the same position in the **React** tree.

**Why:** to escape ancestors' `overflow: hidden`, `z-index` stacking contexts or `transform`s. Modals, tooltips, popovers, menus and toasts usually go to `document.body`.

**Events and context follow the React tree.** React's synthetic events bubble along the component tree, so a click inside a modal portalled to `<body>` still reaches the `onClick` of whatever rendered the modal — for example a table row that navigates when clicked. Context and error boundaries follow the React tree too, which is usually what you want: the modal still sees the theme and the auth context.

**The DOM tree governs the rest:** native `addEventListener` listeners, `element.contains()`, CSS inheritance and selectors, and focus order all see `<body>` as the parent.

**Practical consequences:**
- Stop propagation at the portal root, or render the modal outside clickable containers.
- Click-outside logic based on `ref.current.contains(event.target)` breaks for nested portals — a dropdown inside a modal looks "outside" the modal — so libraries keep a stack of dismissable layers.
- With SSR, `document` doesn't exist on the server; only portal after mount.

**Not enough on its own:** a portal doesn't make a dialog accessible. You still need `role="dialog"`, `aria-modal`, a label, a focus trap and restoration, and an inert background. The native `<dialog>.showModal()` and the Popover API render in the browser's top layer, which solves stacking without a portal at all.
