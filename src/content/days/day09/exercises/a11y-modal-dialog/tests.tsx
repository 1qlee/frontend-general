import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Dialog } from './solution';

/** A realistic page: a trigger, another control outside, and a dialog with two actions. */
function Page({ focusDelete = false }: { focusDelete?: boolean }) {
  const [open, setOpen] = useState(false);
  const deleteRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete file…
      </button>
      <button type="button">Outside</button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete file?"
        initialFocusRef={focusDelete ? deleteRef : undefined}
      >
        <p>This cannot be undone.</p>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="button" ref={deleteRef}>
          Delete
        </button>
      </Dialog>
    </>
  );
}

async function openPage(focusDelete = false) {
  const user = userEvent.setup();
  render(<Page focusDelete={focusDelete} />);
  const trigger = screen.getByRole('button', { name: 'Delete file…' });
  await user.click(trigger);
  return { user, trigger };
}

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(<Page />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a modal dialog labelled by its visible title', async () => {
    await openPage();
    const dialog = screen.getByRole('dialog', { name: 'Delete file?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)).toHaveTextContent('Delete file?');
  });

  it('moves focus to the first focusable element on open', async () => {
    await openPage();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('moves focus to initialFocusRef when one is provided', async () => {
    await openPage(true);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('focuses the dialog itself when it contains nothing focusable', () => {
    render(
      <Dialog open onClose={() => {}} title="Saved">
        <p>Your changes were saved.</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Saved' })).toHaveFocus();
  });

  it('wraps Tab from the last element back to the first', async () => {
    const { user } = await openPage();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('wraps Shift+Tab from the first element to the last', async () => {
    const { user } = await openPage();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Settings">
        <button type="button">OK</button>
      </Dialog>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the trigger when closed from inside', async () => {
    const { user, trigger } = await openPage();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('This cannot be undone.')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user, trigger } = await openPage(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('This cannot be undone.')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
