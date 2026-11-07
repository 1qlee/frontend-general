import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LikeButton, { ERROR_MESSAGE } from './solution';

/** A promise the test resolves or rejects by hand — lets us look at the UI mid-request. */
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(initialLiked: boolean, initialCount: number) {
  const requests: ReturnType<typeof deferred>[] = [];
  const onToggle = vi.fn(() => {
    const d = deferred();
    requests.push(d);
    return d.promise;
  });
  const user = userEvent.setup();
  render(<LikeButton initialLiked={initialLiked} initialCount={initialCount} onToggle={onToggle} />);
  const button = () => screen.getByRole('button', { name: /like/i });
  return { user, onToggle, requests, button };
}

describe('LikeButton (optimistic)', () => {
  it('shows the initial state', () => {
    const { button } = setup(false, 10);
    expect(button()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('10 likes')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('updates immediately, before the server responds', async () => {
    const { user, button, onToggle, requests } = setup(false, 10);
    await user.click(button());
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(button()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('11 likes')).toBeInTheDocument();
    await act(async () => requests[0].resolve());
  });

  it('keeps the new state when the request succeeds', async () => {
    const { user, button, requests } = setup(false, 10);
    await user.click(button());
    await act(async () => requests[0].resolve());
    expect(button()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('11 likes')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rolls back and shows an error when the request fails', async () => {
    const { user, button, requests } = setup(false, 10);
    await user.click(button());
    await act(async () => requests[0].reject(new Error('500')));
    expect(button()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('10 likes')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGE);
  });

  it('unliking decrements immediately and sends false', async () => {
    const { user, button, onToggle, requests } = setup(true, 5);
    await user.click(button());
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(button()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('4 likes')).toBeInTheDocument();
    await act(async () => requests[0].resolve());
    expect(screen.getByText('4 likes')).toBeInTheDocument();
  });

  it('clears the error when the user tries again', async () => {
    const { user, button, requests } = setup(false, 10);
    await user.click(button());
    await act(async () => requests[0].reject(new Error('500')));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.click(button());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(button()).toHaveAttribute('aria-pressed', 'true');
    await act(async () => requests[1].resolve());
    expect(button()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('11 likes')).toBeInTheDocument();
  });
});
