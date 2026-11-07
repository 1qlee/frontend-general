import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ToggleButton } from './subject';

function setup(defaultPressed?: boolean) {
  const user = userEvent.setup();
  const onPressedChange = vi.fn();
  render(<ToggleButton label="Mute" icon="🔇" defaultPressed={defaultPressed} onPressedChange={onPressedChange} />);
  // getByRole + name is itself an accessibility assertion: it throws if either is wrong.
  const button = screen.getByRole('button', { name: 'Mute' });
  return { user, onPressedChange, button };
}

describe('ToggleButton', () => {
  it('is exposed as a button with an accessible name even though it only shows an icon', () => {
    const { button } = setup();
    expect(button).toHaveAccessibleName('Mute');
  });

  it('starts unpressed and toggles aria-pressed on click', async () => {
    const { user, button, onPressedChange } = setup();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(onPressedChange).toHaveBeenLastCalledWith(true);
    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it('respects defaultPressed', () => {
    const { button } = setup(true);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('is reachable with Tab and operable with Enter and Space', async () => {
    const { user, button } = setup();
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the same accessible name when toggled (the state lives in aria-pressed)', async () => {
    const { user, button } = setup();
    await user.click(button);
    expect(button).toHaveAccessibleName('Mute');
    expect(screen.getByRole('button', { name: 'Mute', pressed: true })).toBe(button);
  });
});
