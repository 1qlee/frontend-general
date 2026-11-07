import { useId, useState, type ReactNode } from 'react';

export interface DisclosureProps {
  /** Text of the toggle — it must become the toggle's accessible name. */
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * WAI-ARIA APG Disclosure pattern:
 * - a native <button> (focusable, Enter + Space for free, role "button")
 * - aria-expanded reflects the state; aria-controls points at the panel
 * - the panel stays in the DOM and is hidden with the `hidden` attribute,
 *   so aria-controls always references a real element
 */
export function Disclosure({ summary, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId(); // unique per instance — never hard-code ids in reusable components

  return (
    <div className="disclosure">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        {/* Decorative: the state is already conveyed by aria-expanded */}
        <span aria-hidden="true">{open ? '▾' : '▸'}</span> {summary}
      </button>
      <div id={panelId} className="disclosure-panel" hidden={!open}>
        {children}
      </div>
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
