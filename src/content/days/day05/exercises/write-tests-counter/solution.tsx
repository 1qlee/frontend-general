import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Counter } from './subject';

const button = (name: 'Increment' | 'Decrement' | 'Reset') => screen.getByRole('button', { name });

describe('Counter', () => {
  it('renders the initial count (default 0)', () => {
    render(<Counter />);
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });

  it('renders a custom initial count', () => {
    render(<Counter initial={4} />);
    expect(screen.getByText('Count: 4')).toBeInTheDocument();
  });

  it('increments and decrements', async () => {
    const user = userEvent.setup();
    render(<Counter initial={5} />);
    await user.click(button('Increment'));
    await user.click(button('Increment'));
    expect(screen.getByText('Count: 7')).toBeInTheDocument();
    await user.click(button('Decrement'));
    expect(screen.getByText('Count: 6')).toBeInTheDocument();
  });

  it('disables Decrement at min', () => {
    render(<Counter initial={0} min={0} />);
    expect(button('Decrement')).toBeDisabled();
    expect(button('Increment')).toBeEnabled();
  });

  it('never goes past max: Increment is disabled exactly at max', async () => {
    const user = userEvent.setup();
    render(<Counter initial={1} max={2} />);
    expect(button('Increment')).toBeEnabled();
    await user.click(button('Increment'));
    expect(screen.getByText('Count: 2')).toBeInTheDocument();
    expect(button('Increment')).toBeDisabled();
    await user.click(button('Increment')); // clicking a disabled button does nothing
    expect(screen.getByText('Count: 2')).toBeInTheDocument();
  });

  it('Reset returns to the initial value (not 0)', async () => {
    const user = userEvent.setup();
    render(<Counter initial={3} />);
    await user.click(button('Increment'));
    await user.click(button('Reset'));
    expect(screen.getByText('Count: 3')).toBeInTheDocument();
  });

  it('calls onChange with the NEW value after each change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Counter initial={2} onChange={onChange} />);
    await user.click(button('Increment'));
    expect(onChange).toHaveBeenLastCalledWith(3);
    await user.click(button('Decrement'));
    await user.click(button('Decrement'));
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
