import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TodoEditor, { type Todo } from './solution';

const initialTodos: Todo[] = [
  { id: 'a', title: 'Write tests', done: false },
  { id: 'b', title: 'Ship it', done: false },
  { id: 'c', title: 'Celebrate', done: false },
];

function setup() {
  const onRowRender = vi.fn();
  const user = userEvent.setup();
  render(<TodoEditor initialTodos={initialTodos} onRowRender={onRowRender} />);
  const rows = () => screen.getAllByRole('listitem');
  /** Ids of the rows that rendered since the last mockClear(), in order. */
  const rendered = () => onRowRender.mock.calls.map((call) => call[0] as string);
  return { user, onRowRender, rows, rendered };
}

describe('TodoEditor re-renders', () => {
  it('renders every row once on mount', () => {
    const { rendered, rows } = setup();
    expect(rows()).toHaveLength(3);
    expect(rendered()).toEqual(['a', 'b', 'c']);
  });

  it('typing in the "New todo" field re-renders no rows', async () => {
    const { user, onRowRender, rendered } = setup();
    onRowRender.mockClear();
    await user.type(screen.getByLabelText('New todo'), 'milk');
    expect(screen.getByLabelText('New todo')).toHaveValue('milk');
    expect(rendered()).toEqual([]);
  });

  it('toggling a row re-renders only that row', async () => {
    const { user, onRowRender, rendered, rows } = setup();
    onRowRender.mockClear();
    await user.click(within(rows()[1]).getByRole('checkbox'));
    expect(within(rows()[1]).getByRole('checkbox')).toBeChecked();
    expect(rendered()).toEqual(['b']);
  });

  it('editing a title re-renders only the edited row (once per keystroke)', async () => {
    const { user, onRowRender, rendered, rows } = setup();
    onRowRender.mockClear();
    await user.type(within(rows()[2]).getByRole('textbox'), '!!');
    expect(within(rows()[2]).getByRole('textbox')).toHaveValue('Celebrate!!');
    expect(rendered()).toEqual(['c', 'c']);
  });

  it('toggles on different rows both stick (no stale closures)', async () => {
    const { user, rows } = setup();
    await user.click(within(rows()[0]).getByRole('checkbox'));
    await user.click(within(rows()[2]).getByRole('checkbox'));
    expect(within(rows()[0]).getByRole('checkbox')).toBeChecked();
    expect(within(rows()[2]).getByRole('checkbox')).toBeChecked();
    expect(screen.getByText('2 of 3 done')).toBeInTheDocument();
  });

  it('adding a todo renders only the new row', async () => {
    const { user, onRowRender, rendered, rows } = setup();
    await user.type(screen.getByLabelText('New todo'), 'Buy milk');
    onRowRender.mockClear();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(rows()).toHaveLength(4);
    expect(within(rows()[3]).getByRole('textbox')).toHaveValue('Buy milk');
    expect(rendered()).toHaveLength(1);
  });
});
