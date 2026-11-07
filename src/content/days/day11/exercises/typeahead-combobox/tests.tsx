import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Typeahead, type Suggestion } from './solution';

const items = (...labels: string[]): Suggestion[] => labels.map((label) => ({ id: label.toLowerCase(), label }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Search = (query: string, signal: AbortSignal) => Promise<Suggestion[]>;

function setup(search: Search = async () => items('React', 'Redux', 'Remix')) {
  const searchMock = vi.fn(search);
  const onSelect = vi.fn();
  // advanceTimers lets user-event's own small delays work while fake timers are on
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Typeahead search={searchMock} onSelect={onSelect} />);
  const input = screen.getByRole('combobox', { name: 'Search' });
  return { user, search: searchMock, onSelect, input };
}

/** Advance fake time (e.g. past the debounce) and flush resolved promises + React updates. */
const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

const optionLabels = () => screen.getAllByRole('option').map((o) => o.textContent);

beforeEach(() => {
  vi.useFakeTimers();
});

describe('Typeahead', () => {
  it('renders a labelled, collapsed combobox and does not search on mount', async () => {
    const { input, search } = setup();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    await wait(1000);
    expect(search).not.toHaveBeenCalled();
  });

  it('debounces: one search with the trimmed query, debounceMs after the LAST keystroke', async () => {
    const { user, input, search } = setup();
    await user.type(input, 're');
    await wait(299);
    expect(search).not.toHaveBeenCalled();
    await user.type(input, 'a '); // typing again restarts the timer
    await wait(299);
    expect(search).not.toHaveBeenCalled();
    await wait(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0]).toBe('rea');
  });

  it('shows "Loading…" while the request is in flight, then the results as options', async () => {
    const d = deferred<Suggestion[]>();
    const { user, input } = setup(() => d.promise);
    await user.type(input, 're');
    await wait(300);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await act(async () => {
      d.resolve(items('React', 'Redux'));
    });
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(optionLabels()).toEqual(['React', 'Redux']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
  });

  it('shows "No results" for an empty response (and no listbox)', async () => {
    const { user, input } = setup(async () => []);
    await user.type(input, 'zzz');
    await wait(300);
    expect(screen.getByText(/no results/i)).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows an alert when the search fails', async () => {
    const { user, input } = setup(async () => {
      throw new Error('503');
    });
    await user.type(input, 're');
    await wait(300);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('latest wins: aborts the superseded request and ignores its late response', async () => {
    const pending: Array<{ query: string; signal: AbortSignal; d: ReturnType<typeof deferred<Suggestion[]>> }> = [];
    const { user, input } = setup((query, signal) => {
      const d = deferred<Suggestion[]>();
      pending.push({ query, signal, d });
      return d.promise;
    });
    await user.type(input, 're');
    await wait(300);
    await user.type(input, 'd');
    await wait(300);
    expect(pending.map((p) => p.query)).toEqual(['re', 'red']);
    expect(pending[0].signal.aborted).toBe(true);
    await act(async () => {
      pending[1].d.resolve(items('Redux'));
    });
    await act(async () => {
      pending[0].d.resolve(items('React', 'Redux', 'Remix')); // slow + stale
    });
    expect(optionLabels()).toEqual(['Redux']);
  });

  it('ArrowDown/ArrowUp move the active option (wrapping) and drive aria-activedescendant', async () => {
    const { user, input } = setup();
    await user.type(input, 're');
    await wait(300);
    const options = screen.getAllByRole('option');
    expect(new Set(options.map((o) => o.id)).size).toBe(3);
    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}'); // 1 → 2 → wraps to 0
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}'); // wraps to the last option
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id);
    expect(input).toHaveFocus(); // focus never leaves the input
  });

  it('Enter selects the active option: onSelect, fills the input, closes — and does not search again', async () => {
    const { user, input, search, onSelect } = setup();
    await user.type(input, 're');
    await wait(300);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith({ id: 'redux', label: 'Redux' });
    expect(input).toHaveValue('Redux');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await wait(1000);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('Escape closes without selecting; ArrowDown re-opens; clicking an option selects it', async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, 're');
    await wait(300);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('re');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // (matched by text: jsdom computes "Re mix" as the accessible name when part of it is in a <mark>)
    const remix = screen.getAllByRole('option').find((o) => o.textContent === 'Remix');
    await user.click(remix!);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({ id: 'remix', label: 'Remix' });
  });

  it('whitespace-only or cleared input never searches and shows nothing', async () => {
    const { user, input, search } = setup();
    await user.type(input, '   ');
    await wait(1000);
    expect(search).not.toHaveBeenCalled();
    await user.type(input, 're');
    await user.clear(input); // cleared before the debounce fired
    await wait(1000);
    expect(search).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
