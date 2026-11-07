import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from './solution';

function renderModal(open = true) {
  const onClose = vi.fn();
  const ui = (isOpen: boolean) => (
    <Modal open={isOpen} onClose={onClose} title="Delete file?">
      <p>This cannot be undone.</p>
      <button type="button">Delete</button>
    </Modal>
  );
  const utils = render(ui(open));
  return { onClose, ...utils, setOpen: (isOpen: boolean) => utils.rerender(ui(isOpen)) };
}

describe('Modal (portal)', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders nothing while closed', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders a labelled, modal dialog', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Delete file?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('This cannot be undone.');
  });

  it('is portalled into document.body, outside the component’s own container', () => {
    const { container } = renderModal();
    const backdrop = screen.getByTestId('modal-backdrop');
    expect(container).toBeEmptyDOMElement();
    expect(backdrop.parentElement).toBe(document.body);
    expect(backdrop).toContainElement(screen.getByRole('dialog'));
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on a backdrop click, but not on clicks inside the dialog', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByText('This cannot be undone.'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has a close button that calls onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the dialog when it opens', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('locks body scroll while open and restores the previous value on close', () => {
    document.body.style.overflow = 'auto';
    const { setOpen } = renderModal(false);
    setOpen(true);
    expect(document.body.style.overflow).toBe('hidden');
    setOpen(false);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('stops listening for Escape once closed', async () => {
    const user = userEvent.setup();
    const { onClose, setOpen } = renderModal();
    setOpen(false);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
