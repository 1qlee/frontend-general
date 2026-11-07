import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stopwatch from './solution';

const display = () => screen.getByRole('timer');
const button = (name: string) => screen.getByRole('button', { name });
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('Stopwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts at 0.0s with a Start button and nothing scheduled', () => {
    render(<Stopwatch />);
    expect(display()).toHaveTextContent(/^0\.0s$/);
    expect(button('Start')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('counts up while running and the button reads Stop', async () => {
    const user = userEvent.setup();
    render(<Stopwatch />);
    await user.click(button('Start'));
    expect(button('Stop')).toBeInTheDocument();
    advance(1000);
    expect(display()).toHaveTextContent(/^1\.0s$/);
    advance(1500);
    expect(display()).toHaveTextContent(/^2\.5s$/);
  });

  it('Stop freezes the time and clears the interval', async () => {
    const user = userEvent.setup();
    render(<Stopwatch />);
    await user.click(button('Start'));
    advance(1200);
    await user.click(button('Stop'));
    expect(vi.getTimerCount()).toBe(0);
    advance(5000);
    expect(display()).toHaveTextContent(/^1\.2s$/);
    expect(button('Start')).toBeInTheDocument();
  });

  it('resumes from where it stopped', async () => {
    const user = userEvent.setup();
    render(<Stopwatch />);
    await user.click(button('Start'));
    advance(1000);
    await user.click(button('Stop'));
    await user.click(button('Start'));
    advance(500);
    expect(display()).toHaveTextContent(/^1\.5s$/);
  });

  it('never runs more than one interval at a time', async () => {
    const user = userEvent.setup();
    render(<Stopwatch />);
    await user.click(button('Start'));
    expect(vi.getTimerCount()).toBe(1);
    await user.click(button('Stop'));
    await user.click(button('Start'));
    expect(vi.getTimerCount()).toBe(1);
    advance(1000);
    expect(display()).toHaveTextContent(/^1\.0s$/);
  });

  it('Reset stops and returns to 0.0s', async () => {
    const user = userEvent.setup();
    render(<Stopwatch />);
    await user.click(button('Start'));
    advance(3000);
    await user.click(button('Reset'));
    expect(display()).toHaveTextContent(/^0\.0s$/);
    expect(button('Start')).toBeInTheDocument();
    advance(1000);
    expect(display()).toHaveTextContent(/^0\.0s$/);
  });

  it('clears the interval when unmounted while running', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Stopwatch />);
    await user.click(button('Start'));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
