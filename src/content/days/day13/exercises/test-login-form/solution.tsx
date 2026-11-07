import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { LoginForm, type LoginValues } from './subject';

/** A promise you resolve from the test, so you can observe the "pending" state. */
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(onSubmit: (values: LoginValues) => void | Promise<void> = vi.fn()) {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={onSubmit} />);
  return {
    user,
    // getByLabelText throws if the label is not associated with a control: that IS an assertion.
    email: screen.getByLabelText('Email'),
    password: screen.getByLabelText('Password'),
    submit: screen.getByRole('button', { name: 'Sign in' }),
  };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>, email: HTMLElement, password: HTMLElement) {
  await user.type(email, 'ada@example.com');
  await user.type(password, 'correct horse');
}

describe('LoginForm', () => {
  it('exposes both fields by their accessible names', () => {
    setup();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    // type="password" inputs have no ARIA role, so the label is the way to find them.
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('shows validation messages and does not call onSubmit for an empty form', async () => {
    const onSubmit = vi.fn();
    const { user, submit, email } = setup(onSubmit);

    await user.click(submit);

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a malformed email even when the password is valid', async () => {
    const onSubmit = vi.fn();
    const { user, email, password, submit } = setup(onSubmit);

    await user.type(email, 'ada@example');
    await user.type(password, 'correct horse');
    await user.click(submit);

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit once with the entered values', async () => {
    const onSubmit = vi.fn();
    const { user, email, password, submit } = setup(onSubmit);

    await fillValid(user, email, password);
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct horse' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables submit while the request is pending and ignores extra clicks', async () => {
    const request = deferred();
    const onSubmit = vi.fn(() => request.promise);
    const { user, email, password, submit } = setup(onSubmit);

    await fillValid(user, email, password);
    await user.click(submit);

    const pendingButton = screen.getByRole('button', { name: /signing in/i });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    request.resolve();
    // findBy* retries until React has processed the settled promise.
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('shows an error and re-enables the form when sign-in fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('401'));
    const { user, email, password, submit } = setup(onSubmit);

    await fillValid(user, email, password);
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
