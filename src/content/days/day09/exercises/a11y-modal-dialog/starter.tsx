import { useState, type ReactNode, type RefObject } from 'react';

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

/**
 * Looks like a modal. Behaves like a div. TODO:
 * - role="dialog", aria-modal="true", aria-labelledby → the title
 * - move focus in on open; trap Tab / Shift+Tab; Escape → onClose
 * - restore focus to whatever was focused before opening
 */
export function Dialog({ open, title, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="backdrop" style={{ position: 'fixed', inset: 0, background: 'rgb(0 0 0 / 0.4)', display: 'grid', placeItems: 'center' }}>
      <div className="dialog" style={{ background: 'white', color: '#111', padding: 24, borderRadius: 8, minWidth: 280 }}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
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
