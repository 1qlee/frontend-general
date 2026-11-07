import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ToggleButton } from './subject';

// Usage: <ToggleButton label="Mute" icon="🔇" defaultPressed={false} onPressedChange={fn} />
//
// Toolbox:
//   screen.getByRole('button', { name: 'Mute' })      ← fails if the role or name is wrong
//   expect(el).toHaveAccessibleName('Mute')
//   expect(el).toHaveAttribute('aria-pressed', 'true')
//   expect(el).toHaveFocus()
//   const user = userEvent.setup();
//   await user.click(el); await user.tab(); await user.keyboard('{Enter}'); await user.keyboard(' ');

describe('ToggleButton', () => {
  it.todo('is exposed as a button with an accessible name');
  it.todo('exposes its state with aria-pressed and updates it');
  // What else could break for a keyboard user or a screen-reader user?
});
