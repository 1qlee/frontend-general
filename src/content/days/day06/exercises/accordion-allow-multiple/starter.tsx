import { type ReactNode } from 'react';

export interface AccordionProps {
  /** When true, items open and close independently. Default: one item open at a time. */
  allowMultiple?: boolean;
  /** Values of the items that start open (uncontrolled; read on mount only). */
  defaultValue?: string[];
  children: ReactNode;
}

/**
 * TODO:
 * - Own the "which items are open" state (hint: one `string[]` covers both modes).
 * - Share `isOpen(value)` / `toggle(value)` with the items through context.
 */
export function Accordion({ children }: AccordionProps) {
  return <div className="accordion">{children}</div>;
}

export interface AccordionItemProps {
  /** Unique identity of this item within its Accordion. */
  value: string;
  /** Header content — becomes the accessible name of the toggle button and of the panel. */
  title: ReactNode;
  children: ReactNode;
}

/**
 * TODO:
 * - Throw a helpful error when rendered outside <Accordion>.
 * - <h3><button aria-expanded aria-controls>title</button></h3>
 * - Panel: role="region", aria-labelledby → the button; not visible when collapsed.
 */
export function AccordionItem({ title, children }: AccordionItemProps) {
  return (
    <div className="accordion-item">
      <h3>
        <button type="button">{title}</button>
      </h3>
      <div>{children}</div>
    </div>
  );
}

// ---- Preview only -----------------------------------------------------------
export default function AccordionDemo() {
  return (
    <div style={{ display: 'grid', gap: 24, fontFamily: 'system-ui', maxWidth: 420 }}>
      <section>
        <h2 style={{ fontSize: 16 }}>One at a time</h2>
        <Accordion defaultValue={['shipping']}>
          <AccordionItem value="shipping" title="Do you ship internationally?">
            <p>Yes — to more than 40 countries.</p>
          </AccordionItem>
          <AccordionItem value="returns" title="What is your return policy?">
            <p>Free returns within 30 days.</p>
          </AccordionItem>
        </Accordion>
      </section>
      <section>
        <h2 style={{ fontSize: 16 }}>allowMultiple</h2>
        <Accordion allowMultiple>
          <AccordionItem value="a" title="Section A">
            <p>Opens independently.</p>
          </AccordionItem>
          <AccordionItem value="b" title="Section B">
            <p>So does this one.</p>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
