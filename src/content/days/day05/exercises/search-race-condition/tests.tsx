import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Search } from './solution';

interface PendingRequest {
  query: string;
  signal: AbortSignal;
  resolve: (results: string[]) => void;
  reject: (error: unknown) => void;
}

/**
 * A fetcher whose promises WE settle, in whatever order we like.
 * `honourAbort: false` simulates a data source that ignores the AbortSignal.
 */
function controlledFetcher({ honourAbort = true } = {}) {
  const requests: PendingRequest[] = [];
  const fetchResults = vi.fn(
    (query: string, signal: AbortSignal) =>
      new Promise<string[]>((resolve, reject) => {
        requests.push({ query, signal, resolve, reject });
        if (honourAbort) {
          signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
        }
      }),
  );
  const request = (query: string) => {
    const found = requests.find((r) => r.query === query);
    if (!found) throw new Error(`fetchResults was never called with "${query}"`);
    return found;
  };
  return { fetchResults, requests, request };
}

/** Settle a promise and let React flush the resulting state updates. */
const settle = (fn: () => void) =>
  act(async () => {
    fn();
  });

const input = () => screen.getByLabelText('Search');
const resultTexts = () =>
  screen.queryByRole('list', { name: 'Results' })
    ? within(screen.getByRole('list', { name: 'Results' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    : [];

describe('Search', () => {
  it('does not fetch for an empty or whitespace-only query', async () => {
    const user = userEvent.setup();
    const { fetchResults } = controlledFetcher();
    render(<Search fetchResults={fetchResults} />);
    await user.type(input(), '   ');
    expect(fetchResults).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a loading state, then the results for the query', async () => {
    const user = userEvent.setup();
    const { fetchResults, request } = controlledFetcher();
    render(<Search fetchResults={fetchResults} />);
    await user.type(input(), 'a');
    expect(fetchResults).toHaveBeenLastCalledWith('a', expect.any(AbortSignal));
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

    await settle(() => request('a').resolve(['apple', 'avocado']));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(resultTexts()).toEqual(['apple', 'avocado']);
  });

  it('ignores a slow earlier response that arrives after the latest one (even if the fetcher ignores abort)', async () => {
    const user = userEvent.setup();
    const { fetchResults, request } = controlledFetcher({ honourAbort: false });
    render(<Search fetchResults={fetchResults} />);
    await user.type(input(), 'ap');
    expect(fetchResults).toHaveBeenCalledTimes(2);

    await settle(() => request('ap').resolve(['apple', 'apricot']));
    expect(resultTexts()).toEqual(['apple', 'apricot']);

    // the response for "a" finally arrives — it must be dropped
    await settle(() => request('a').resolve(['apple', 'avocado', 'banana']));
    expect(resultTexts()).toEqual(['apple', 'apricot']);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('aborts the previous request when the query changes', async () => {
    const user = userEvent.setup();
    const { fetchResults, request } = controlledFetcher();
    render(<Search fetchResults={fetchResults} />);
    await user.type(input(), 'ap');
    expect(request('a').signal.aborted).toBe(true);
    expect(request('ap').signal.aborted).toBe(false);
  });

  it('an aborted request does not show an error', async () => {
    const user = userEvent.setup();
    const { fetchResults, request } = controlledFetcher({ honourAbort: true });
    render(<Search fetchResults={fetchResults} />);
    await user.type(input(), 'ap'); // the "a" promise rejects with an AbortError
    await settle(() => request('ap').resolve(['apple']));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(resultTexts()).toEqual(['apple']);
  });

  it('shows an error message when the current request fails', async () => {
    const user = userEvent.setup();
    const { fetchResults, request } = controlledFetcher();
    render(<Search fetchResults={fetchResults} />);
    await user.type(input(), 'kiwi');
    await settle(() => request('kiwi').reject(new Error('500')));
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('clearing the input clears results and loading state', async () => {
    const user = userEvent.setup();
    const { fetchResults, request } = controlledFetcher();
    render(<Search fetchResults={fetchResults} />);
    await user.type(input(), 'a');
    await settle(() => request('a').resolve(['apple']));
    await user.clear(input());
    expect(resultTexts()).toEqual([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('aborts the in-flight request on unmount', async () => {
    const user = userEvent.setup();
    const { fetchResults, request } = controlledFetcher();
    const { unmount } = render(<Search fetchResults={fetchResults} />);
    await user.type(input(), 'a');
    unmount();
    expect(request('a').signal.aborted).toBe(true);
  });
});
