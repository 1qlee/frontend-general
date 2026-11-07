import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Counter } from './subject';

// Write tests for <Counter initial? min? max? onChange? />.
// Query like a user would: getByRole('button', { name: 'Increment' }), getByText('Count: 3').
// Replace each `it.todo` with a real test (and add more if you need them).

describe('Counter', () => {
  it.todo('renders the initial count (default 0)');
  it.todo('increments and decrements');
  it.todo('disables Decrement at min and Increment at max');
  it.todo('Reset returns to the initial value');
  it.todo('calls onChange with the new value');
});

