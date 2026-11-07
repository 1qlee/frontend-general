import { useState, type ReactNode } from 'react';

export interface DisclosureProps {
  /** Text of the toggle — it must become the toggle's accessible name. */
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Works with a mouse… and nothing else. A keyboard user can't reach it, a
 * screen reader announces plain text with no role or state, and the toggle
 * isn't linked to the content it controls.
 *
 * Rebuild it with the WAI-ARIA APG Disclosure pattern.
 */
export function Disclosure({ summary, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="disclosure">
      <div className="disclosure-trigger" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
        {open ? '▾' : '▸'} {summary}
      </div>
      {open && <div className="disclosure-panel">{children}</div>}
    </div>
  );
}

export default function DisclosureDemo() {
  return (
    <div>
      <Disclosure summary="What is your refund policy?">
        <p>Full refunds within 30 days, no questions asked.</p>
      </Disclosure>
      <Disclosure summary="Do you ship internationally?" defaultOpen>
        <p>Yes — to more than 40 countries.</p>
      </Disclosure>
    </div>
  );
}
