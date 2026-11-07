**Why a portal:** the modal must escape ancestors' `overflow: hidden`, `z-index` stacking contexts and `transform`s (which turn `position: fixed` into "fixed to that ancestor"). Rendering into `document.body` puts it above everything in the DOM, while it stays at the same place in the **React** tree — so it still reads context from where it's used.

**One effect, keyed on `open`,** does all the document-level work and undoes it in the cleanup: add the `keydown` listener, save and set `body.style.overflow`, focus the dialog. Because the cleanup restores the *saved* value, a page that already had `overflow: auto` gets it back.

**`onClose` through a latest ref.** Parents usually pass `onClose={() => setOpen(false)}` — a new function every render. Putting it in the effect deps would remove and re-add the listener (and re-run the scroll lock and focus) on every parent render. The ref keeps the effect keyed on `open` only while always calling the current callback.

**Backdrop clicks:** `e.target === e.currentTarget` is true only when the click landed on the backdrop itself; clicks inside the dialog bubble up with a different target. A known gotcha: pressing inside the dialog (e.g. selecting text) and releasing over the backdrop fires `click` on their nearest common ancestor — the backdrop — in most browsers, closing the modal mid-selection. Robust implementations record where the press *started* with `onPointerDown`.

**React tree vs DOM tree — say this in the interview:** clicks inside the modal **bubble to the React ancestors of `<Modal>`**, even though the DOM parent is `<body>`. If `<Modal>` is rendered inside a clickable table row, clicking "Delete" in the modal also triggers the row's `onClick`. Fix it by rendering the modal outside the row, or by stopping propagation at the backdrop.

**Edge cases and follow-ups**

- **Nested modals:** both listen on `document`, so one Escape closes both. Keep a stack of open layers and only let the top one react (or `stopPropagation` in the topmost handler). Scroll locking needs a counter so closing the inner modal doesn't unlock the page.
- **Layout shift:** hiding the scrollbar shifts content sideways — compensate with `padding-right` or `scrollbar-gutter: stable`. iOS Safari historically needed `position: fixed` on the body.
- **SSR:** `document` doesn't exist on the server; only portal after mount.
- **Day 9 completes it:** trap Tab/Shift+Tab inside, restore focus to the trigger on close, make siblings `inert`, or use `<dialog>.showModal()` — which gives you the top layer, Escape handling and an inert background natively.
