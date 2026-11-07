import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  /** The parent owns visibility. */
  open: boolean;
  /** Called on Escape, backdrop click and the close button. */
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name. */
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Latest-ref so the document listener always calls the current onClose
  // without re-subscribing when the parent passes a new inline function.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // scroll lock while open

    dialogRef.current?.focus(); // basic focus management (full trap + restore: Day 9)

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      data-testid="modal-backdrop"
      style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.45)', display: 'grid', placeItems: 'center' }}
      onClick={(e) => {
        // Only a click on the backdrop itself — not one that bubbled up from inside the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ background: 'white', color: '#111', padding: 24, borderRadius: 8, minWidth: 280, position: 'relative' }}
      >
        <h2 id={titleId} style={{ marginTop: 0 }}>
          {title}
        </h2>
        {children}
        <button type="button" aria-label="Close" onClick={onClose} style={{ position: 'absolute', top: 8, right: 8 }}>
          ×
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ---- Preview only -----------------------------------------------------------
export default function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ fontFamily: 'system-ui', overflow: 'hidden', border: '1px dashed #999', padding: 16 }}>
      <p>This box has overflow: hidden — the portal escapes it.</p>
      <button type="button" onClick={() => setOpen(true)}>
        Delete file…
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete report.pdf?">
        <p>This can't be undone.</p>
        <button type="button" onClick={() => setOpen(false)}>
          Delete
        </button>
      </Modal>
    </div>
  );
}
