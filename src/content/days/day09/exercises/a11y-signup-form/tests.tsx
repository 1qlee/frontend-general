import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SignupForm } from './solution';

/** The text a screen reader reads as the element's description (aria-describedby targets, in order). */
function description(el: HTMLElement): string {
  const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
  return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
}

function setup() {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<SignupForm onSubmit={onSubmit} />);
  return {
    user,
    onSubmit,
    // getByLabelText ignores placeholders — a placeholder is not a label.
    name: screen.getByLabelText(/^name/i),
    email: screen.getByLabelText(/^email/i),
    password: screen.getByLabelText(/^password/i),
    submit: screen.getByRole('button', { name: /create account/i }),
  };
}

describe('SignupForm', () => {
  it('gives every input a programmatically associated <label> (not just a placeholder)', () => {
    const { name, email, password } = setup();
    for (const input of [name, email, password]) {
      expect((input as HTMLInputElement).labels?.length ?? 0).toBeGreaterThan(0);
    }
    expect(screen.getByRole('textbox', { name: /^name/i })).toBe(name);
    expect(screen.getByRole('textbox', { name: /^email/i })).toBe(email);
    // type="password" has NO ARIA role, which is why we query it by label.
    expect(password).toHaveAttribute('type', 'password');
  });

  it('uses autocomplete tokens so browsers and password managers can help', () => {
    const { name, email, password } = setup();
    expect(name).toHaveAttribute('autocomplete', 'name');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
  });

  it('links the password hint with aria-describedby before any error', () => {
    const { password } = setup();
    expect(description(password)).toMatch(/at least 8 characters/i);
  });

  it('renders an empty role="alert" region up front (live regions must exist before they change)', () => {
    setup();
    expect(screen.getByRole('alert').textContent?.trim()).toBe('');
  });

  it('blocks an empty submit and marks every field aria-invalid', async () => {
    const { user, onSubmit, name, email, password, submit } = setup();
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await user.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-invalid', 'true');
  });

  it('moves focus to the first invalid field and announces a summary', async () => {
    const { user, name, submit } = setup();
    await user.click(submit);
    expect(name).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent(/3 errors/);
  });

  it('links each error message to its field (and keeps the password hint)', async () => {
    const { user, name, email, password, submit } = setup();
    await user.click(submit);
    expect(description(name)).toMatch(/enter your name/i);
    expect(description(email)).toMatch(/enter your email address/i);
    expect(description(password)).toMatch(/at least 8 characters/i);
    expect(description(password)).toMatch(/password must be at least 8 characters/i);
  });

  it('focuses the first INVALID field, not simply the first field', async () => {
    const { user, name, email, password, submit } = setup();
    await user.type(name, 'Ada Lovelace');
    await user.type(email, 'ada@');
    await user.type(password, 'short');
    await user.click(submit);
    expect(email).toHaveFocus();
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    expect(description(email)).toMatch(/correct format/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/2 errors/);
  });

  it('submits valid values and clears every error state', async () => {
    const { user, onSubmit, name, email, password, submit } = setup();
    await user.click(submit);
    await user.type(name, 'Ada Lovelace');
    await user.type(email, 'ada@example.com');
    await user.type(password, 'analytical-engine');
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'analytical-engine' });
    expect(screen.getByRole('alert').textContent?.trim()).toBe('');
    for (const field of [name, email, password]) {
      expect(field).not.toHaveAttribute('aria-invalid', 'true');
    }
    expect(description(email)).not.toMatch(/enter/i);
  });
});
