import { useState, type ReactNode } from 'react';

export interface ModalProps {
  /** The parent owns visibility. */
  open: boolean;
  /** Called on Escape, backdrop click and the close button. */
  onClose: () => void;
  /** Visible heading; also the dialog's accessible name. */
  title: string;
  children: ReactNode;
}

/**
 * TODO:
 * - Render nothing when closed.
 * - When open, createPortal() into document.body:
 *     <div data-testid="modal-backdrop">            ← click here (not inside the dialog) → onClose
 *       <div role="dialog" aria-modal="true" aria-labelledby → the <h2> title>
 *         <h2>{title}</h2> {children} <button aria-label="Close">×</button>
 * - Escape anywhere → onClose (only while open; clean the listener up).
 * - Lock body scroll while open (body.style.overflow = 'hidden') and restore the previous value.
 * - Move focus to the dialog when it opens.
 */
export function Modal({ open, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.45)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: 'white', color: '#111', padding: 24, borderRadius: 8, minWidth: 280 }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
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
