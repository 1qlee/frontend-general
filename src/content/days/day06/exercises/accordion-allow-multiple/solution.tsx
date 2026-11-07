import { createContext, useContext, useId, useState, type ReactNode } from 'react';

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext(component: string): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Accordion>`);
  return ctx;
}

export interface AccordionProps {
  /** When true, items open and close independently. Default: one item open at a time. */
  allowMultiple?: boolean;
  /** Values of the items that start open (uncontrolled; read on mount only). */
  defaultValue?: string[];
  children: ReactNode;
}

export function Accordion({ allowMultiple = false, defaultValue = [], children }: AccordionProps) {
  // The whole state is one array of open values. Single mode is just "at most one element".
  const [openValues, setOpenValues] = useState<string[]>(() =>
    allowMultiple ? defaultValue : defaultValue.slice(0, 1),
  );

  const ctx: AccordionContextValue = {
    isOpen: (value) => openValues.includes(value),
    toggle: (value) =>
      setOpenValues((prev) => {
        if (prev.includes(value)) return prev.filter((v) => v !== value); // collapse
        return allowMultiple ? [...prev, value] : [value]; // expand
      }),
  };

  return (
    <div className="accordion">
      <AccordionContext value={ctx}>{children}</AccordionContext>
    </div>
  );
}

export interface AccordionItemProps {
  /** Unique identity of this item within its Accordion. */
  value: string;
  /** Header content — becomes the accessible name of the toggle button and of the panel. */
  title: ReactNode;
  children: ReactNode;
}

export function AccordionItem({ value, title, children }: AccordionItemProps) {
  const id = useId();
  const accordion = useAccordionContext('AccordionItem');
  const open = accordion.isOpen(value);
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  return (
    <div className="accordion-item">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => accordion.toggle(value)}
        >
          {title}
        </button>
      </h3>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        {children}
      </div>
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
