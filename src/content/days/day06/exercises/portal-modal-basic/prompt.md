Build a **Modal** that renders through a portal.

```tsx
<Modal open={open} onClose={() => setOpen(false)} title="Delete report.pdf?">
  <p>This can't be undone.</p>
  <button onClick={handleDelete}>Delete</button>
</Modal>
```

**Requirements**

1. `open === false` → render nothing.
2. `open === true` → `createPortal(…, document.body)`: a backdrop `<div data-testid="modal-backdrop">` (the portal's root element) containing a `role="dialog"` element with `aria-modal="true"` and `aria-labelledby` → an `<h2>` showing `title`, the `children`, and a close button with `aria-label="Close"`.
3. **Escape** anywhere → `onClose()`. Listen only while open, and remove the listener on close/unmount.
4. A click on the **backdrop itself** → `onClose()`; clicks inside the dialog must not close it.
5. **Lock body scroll** while open (`document.body.style.overflow = 'hidden'`) and restore the previous value afterwards.
6. Move **focus to the dialog** when it opens (it needs `tabIndex={-1}`).

Out of scope until Day 9: trapping Tab inside the dialog, restoring focus to the trigger, making the background `inert`, and the native `<dialog>` element.

**What the interviewer is looking for:** `createPortal`, effects with proper cleanup, `e.target === e.currentTarget` for the backdrop, not re-subscribing when the parent passes an inline `onClose`, and an explanation of how React events from the portal still bubble through the React tree.
