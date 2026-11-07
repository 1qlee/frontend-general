import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export interface DialogProps {
  open: boolean;
  /** Called on Escape (and, optionally, on backdrop click). The parent owns `open`. */
  onClose: () => void;
  /** Visible heading — must become the dialog's accessible name via aria-labelledby. */
  title: string;
  /** Optional supporting text, linked with aria-describedby. */
  description?: string;
  /** Element to focus when the dialog opens (defaults to the first focusable element). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children?: ReactNode;
}

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]',
].join(',');

/** Tabbable elements inside `root`, in DOM (= tab) order. */
function getTabbable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.closest('[hidden], [inert]'),
  );
}

export function Dialog({ open, onClose, title, description, initialFocusRef, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // 1. Remember what had focus so we can give it back on close.
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // 2. Make everything outside the dialog inert (no focus, no clicks, hidden from AT).
    //    The portal renders the backdrop as a direct child of <body>.
    const backdrop = dialog.parentElement;
    const madeInert: Element[] = [];
    for (const sibling of Array.from(document.body.children)) {
      if (sibling !== backdrop && !sibling.hasAttribute('inert')) {
        sibling.setAttribute('inert', '');
        madeInert.push(sibling);
      }
    }

    // 3. Move focus in: explicit target → first tabbable → the dialog itself (tabIndex={-1}).
    const target = initialFocusRef?.current ?? getTabbable(dialog)[0] ?? dialog;
    target.focus();

    return () => {
      // Order matters: an inert element can't receive focus, so un-inert first.
      madeInert.forEach((el) => el.removeAttribute('inert'));
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
    // `onClose` is deliberately NOT a dependency: parents usually pass an inline
    // arrow, and re-running this effect on every render would steal focus.
  }, [open, initialFocusRef]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation(); // don't also close a parent dialog/popover
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const tabbable = getTabbable(dialog);
    if (tabbable.length === 0) {
      event.preventDefault(); // nothing to move to — keep focus on the dialog
      return;
    }
    const first = tabbable[0];
    const last = tabbable[tabbable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
    // Otherwise let the browser move focus normally between elements inside the dialog.
  }

  if (!open) return null;

  return createPortal(
    <div
      className="backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.4)', display: 'grid', placeItems: 'center' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose(); // click outside = dismiss (non-critical dialogs only)
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="dialog"
        style={{ background: 'white', color: '#111', padding: 24, borderRadius: 8, minWidth: 280 }}
      >
        <h2 id={titleId}>{title}</h2>
        {description && <p id={descriptionId}>{description}</p>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Delete report…
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete report.pdf?" description="This cannot be undone.">
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button type="button" onClick={() => setOpen(false)}>
            Delete
          </button>
        </div>
      </Dialog>
    </div>
  );
}
