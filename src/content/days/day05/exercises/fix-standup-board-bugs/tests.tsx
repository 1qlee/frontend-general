import { StrictMode } from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StandupBoard from './solution';

const meetingTime = () => screen.getByRole('timer', { name: 'Meeting time' });
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('StandupBoard (bug fixes)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('bug 1: the meeting timer keeps counting (no stale closure)', () => {
    render(<StandupBoard />);
    expect(meetingTime()).toHaveTextContent('Meeting time: 0s');
    advance(1000);
    expect(meetingTime()).toHaveTextContent('Meeting time: 1s');
    advance(2000);
    expect(meetingTime()).toHaveTextContent('Meeting time: 3s');
  });

  it('bug 2: the interval is cleared on unmount', () => {
    const { unmount } = render(<StandupBoard />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bug 2: runs at normal speed under <StrictMode> (dev mount → unmount → mount)', () => {
    render(
      <StrictMode>
        <StandupBoard />
      </StrictMode>,
    );
    advance(3000);
    expect(meetingTime()).toHaveTextContent('Meeting time: 3s');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('removing a speaker removes exactly that speaker', async () => {
    const user = userEvent.setup();
    render(<StandupBoard />);
    await user.click(screen.getByRole('button', { name: 'Done: Grace' }));
    const names = within(screen.getByRole('list', { name: 'Speakers' }))
      .getAllByRole('listitem')
      .map((li) => li.querySelector('strong')?.textContent);
    expect(names).toEqual(['Ada', 'Linus']);
  });

  it('bug 3: typed notes stay with the right speaker after someone is removed', async () => {
    const user = userEvent.setup();
    render(<StandupBoard />);
    await user.type(screen.getByLabelText('Notes for Grace'), 'Blocked on API review');
    await user.type(screen.getByLabelText('Notes for Linus'), 'Shipping the kernel patch');
    await user.click(screen.getByRole('button', { name: 'Done: Ada' }));
    expect(screen.getByLabelText('Notes for Grace')).toHaveValue('Blocked on API review');
    expect(screen.getByLabelText('Notes for Linus')).toHaveValue('Shipping the kernel patch');
  });

  it('bug 3: notes survive while the timer ticks and rows are removed', async () => {
    const user = userEvent.setup();
    render(<StandupBoard />);
    await user.type(screen.getByLabelText('Notes for Linus'), 'Out Friday');
    await user.click(screen.getByRole('button', { name: 'Done: Grace' }));
    advance(2000);
    expect(screen.getByLabelText('Notes for Linus')).toHaveValue('Out Friday');
    expect(screen.getByLabelText('Notes for Ada')).toHaveValue('');
  });
});
