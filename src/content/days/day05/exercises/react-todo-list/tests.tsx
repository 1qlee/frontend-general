import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeAccessibleName } from 'dom-accessibility-api';
import { describe, it, expect } from 'vitest';
import TodoApp, { type Todo } from './solution';

const seed: Todo[] = [
  { id: 'a', text: 'Write tests', done: false },
  { id: 'b', text: 'Fix bug', done: true },
  { id: 'c', text: 'Ship it', done: false },
];

const list = () => screen.getByRole('list', { name: 'Todos' });
const rows = () => within(list()).queryAllByRole('listitem');
// each row is identified by its checkbox's accessible name (= the todo text)
const rowTexts = () => rows().map((row) => computeAccessibleName(within(row).getByRole('checkbox')));
const input = () => screen.getByLabelText('New todo');

describe('TodoApp', () => {
  it('adds a todo on Enter and clears the (controlled) input', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await user.type(input(), 'Buy milk{Enter}');
    expect(rowTexts()).toEqual(['Buy milk']);
    expect(input()).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked();
  });

  it('adds with the Add button, trims text, and ignores blank input', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await user.type(input(), '   ');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(rows()).toHaveLength(0);
    await user.clear(input());
    await user.type(input(), '  Walk dog  ');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(rowTexts()).toEqual(['Walk dog']);
  });

  it('toggles a todo with its checkbox', async () => {
    const user = userEvent.setup();
    render(<TodoApp initialTodos={seed} />);
    const box = screen.getByRole('checkbox', { name: 'Write tests' });
    await user.click(box);
    expect(screen.getByRole('checkbox', { name: 'Write tests' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Write tests' }));
    expect(screen.getByRole('checkbox', { name: 'Write tests' })).not.toBeChecked();
  });

  it('deletes a todo', async () => {
    const user = userEvent.setup();
    render(<TodoApp initialTodos={seed} />);
    await user.click(screen.getByRole('button', { name: 'Delete Fix bug' }));
    expect(rowTexts()).toEqual(['Write tests', 'Ship it']);
  });

  it('shows the number of active items left, with correct pluralisation', async () => {
    const user = userEvent.setup();
    render(<TodoApp initialTodos={seed} />);
    expect(screen.getByText('2 items left')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Ship it' }));
    expect(screen.getByText('1 item left')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Write tests' }));
    expect(screen.getByText('0 items left')).toBeInTheDocument();
  });

  it('filters All / Active / Completed and marks the current filter with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<TodoApp initialTodos={seed} />);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(rowTexts()).toEqual(['Write tests', 'Ship it']);
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    // the count is about ALL active todos, not the visible rows
    expect(screen.getByText('2 items left')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(rowTexts()).toEqual(['Fix bug']);
    expect(screen.getByText('2 items left')).toBeInTheDocument();

    // completing a todo while filtered to "Active" removes it from view
    await user.click(screen.getByRole('button', { name: 'Active' }));
    await user.click(screen.getByRole('checkbox', { name: 'Ship it' }));
    expect(rowTexts()).toEqual(['Write tests']);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(rowTexts()).toEqual(['Write tests', 'Fix bug', 'Ship it']);
  });

  it('uses stable keys: deleting a row keeps the DOM nodes of the rows after it', async () => {
    const user = userEvent.setup();
    render(<TodoApp initialTodos={seed} />);
    const shipRow = rows()[2];
    await user.click(screen.getByRole('button', { name: 'Delete Write tests' }));
    // With index keys React would reuse row #0 for "Fix bug", row #1 for "Ship it"
    // and throw away the original "Ship it" <li>.
    expect(shipRow).toBeInTheDocument();
    expect(within(shipRow).getByRole('checkbox', { name: 'Ship it' })).toBeInTheDocument();
  });

  it('gives every new todo a unique id (deleting then adding never collides)', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await user.type(input(), 'Alpha{Enter}');
    await user.type(input(), 'Beta{Enter}');
    await user.click(screen.getByRole('button', { name: 'Delete Alpha' }));
    await user.type(input(), 'Gamma{Enter}');
    await user.click(screen.getByRole('checkbox', { name: 'Gamma' }));
    expect(screen.getByRole('checkbox', { name: 'Gamma' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Beta' })).not.toBeChecked();
  });
});
