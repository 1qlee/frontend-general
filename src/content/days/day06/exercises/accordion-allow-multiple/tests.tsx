import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Accordion, AccordionItem, type AccordionProps } from './solution';

function Faq(props: Omit<AccordionProps, 'children'>) {
  return (
    <Accordion {...props}>
      <AccordionItem value="shipping" title="Shipping">
        <p>We ship worldwide.</p>
      </AccordionItem>
      <AccordionItem value="returns" title="Returns">
        <p>30-day returns.</p>
      </AccordionItem>
    </Accordion>
  );
}

const header = (name: string) => screen.getByRole('button', { name });
const panel = (name: string) => screen.queryByRole('region', { name });

describe('Accordion', () => {
  beforeEach(() => {
    // React logs the error from the "outside <Accordion>" test; keep the output readable.
    vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
  });

  it('renders one heading button per item, all collapsed by default', () => {
    render(<Faq />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Returns')).toHaveAttribute('aria-expanded', 'false');
    expect(panel('Shipping')).toBeNull();
    expect(panel('Returns')).toBeNull();
  });

  it('expands a panel on click: aria-expanded, a region named by its header, aria-controls wiring', async () => {
    const user = userEvent.setup();
    render(<Faq />);
    await user.click(header('Shipping'));
    expect(header('Shipping')).toHaveAttribute('aria-expanded', 'true');
    const region = panel('Shipping');
    expect(region).toHaveTextContent('We ship worldwide.');
    expect(header('Shipping').getAttribute('aria-controls')).toBe(region?.id);
  });

  it('single mode: opening another item closes the open one', async () => {
    const user = userEvent.setup();
    render(<Faq />);
    await user.click(header('Shipping'));
    await user.click(header('Returns'));
    expect(panel('Returns')).toBeInTheDocument();
    expect(panel('Shipping')).toBeNull();
    expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking an open header collapses it', async () => {
    const user = userEvent.setup();
    render(<Faq />);
    await user.click(header('Shipping'));
    await user.click(header('Shipping'));
    expect(panel('Shipping')).toBeNull();
    expect(header('Shipping')).toHaveAttribute('aria-expanded', 'false');
  });

  it('allowMultiple: items open and close independently', async () => {
    const user = userEvent.setup();
    render(<Faq allowMultiple />);
    await user.click(header('Shipping'));
    await user.click(header('Returns'));
    expect(panel('Shipping')).toBeInTheDocument();
    expect(panel('Returns')).toBeInTheDocument();
    await user.click(header('Shipping'));
    expect(panel('Shipping')).toBeNull();
    expect(panel('Returns')).toBeInTheDocument();
  });

  it('defaultValue opens the listed items on mount', () => {
    render(<Faq allowMultiple defaultValue={['shipping', 'returns']} />);
    expect(panel('Shipping')).toBeInTheDocument();
    expect(panel('Returns')).toBeInTheDocument();
  });

  it('AccordionItem outside <Accordion> throws a helpful error', () => {
    expect(() =>
      render(
        <AccordionItem value="x" title="Orphan">
          content
        </AccordionItem>,
      ),
    ).toThrow(/Accordion/);
  });
});
