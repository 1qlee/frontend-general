import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SelectList, type SelectListProps } from './solution';

interface User {
  id: string;
  name: string;
}

const ada = { id: 'u1', name: 'Ada' };
const grace = { id: 'u2', name: 'Grace' };
const linus = { id: 'u3', name: 'Linus' };
const users: User[] = [ada, grace, linus];

function renderUsers(overrides: Partial<SelectListProps<User>> = {}) {
  const onSelect = vi.fn();
  const utils = render(
    <SelectList<User>
      label="Users"
      items={users}
      getKey={(u) => u.id}
      renderItem={(u, { selected }) => (selected ? `✓ ${u.name}` : u.name)}
      onSelect={onSelect}
      {...overrides}
    />,
  );
  return { onSelect, ...utils };
}

describe('SelectList<T>', () => {
  it('renders a labelled listbox with one option per item, via renderItem', () => {
    renderUsers();
    expect(screen.getByRole('listbox', { name: 'Users' })).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Ada');
    expect(options[2]).toHaveTextContent('Linus');
  });

  it('calls onSelect with the original item object when an option is clicked', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderUsers();
    await user.click(screen.getByRole('option', { name: 'Grace' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toBe(grace);
  });

  it('marks the option whose key equals selectedKey and tells renderItem', () => {
    renderUsers({ selectedKey: 'u2' });
    expect(screen.getByRole('option', { name: '✓ Grace' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Ada' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option', { name: 'Linus' })).toHaveAttribute('aria-selected', 'false');
  });

  it('selects the focused option with Enter and with Space', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderUsers();
    await user.tab();
    expect(screen.getByRole('option', { name: 'Ada' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(ada);
    await user.tab();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenLastCalledWith(grace);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('works as a controlled component inside a parent with state', async () => {
    const user = userEvent.setup();
    function Parent() {
      const [selected, setSelected] = useState<User | null>(null);
      return (
        <>
          <SelectList label="Users" items={users} getKey={(u) => u.id} selectedKey={selected?.id ?? null} onSelect={setSelected} renderItem={(u) => u.name} />
          <output>{selected ? selected.name : 'none'}</output>
        </>
      );
    }
    render(<Parent />);
    await user.click(screen.getByRole('option', { name: 'Linus' }));
    expect(screen.getByRole('status')).toHaveTextContent('Linus');
    expect(screen.getByRole('option', { name: 'Linus' })).toHaveAttribute('aria-selected', 'true');
  });

  it('uses getKey (not the index) as the React key, so DOM nodes follow their items', () => {
    const { rerender } = render(<SelectList label="Users" items={[grace, linus]} getKey={(u) => u.id} renderItem={(u) => u.name} onSelect={() => {}} />);
    const graceNode = screen.getByRole('option', { name: 'Grace' });
    // Prepend an item: with index keys React would reuse Grace's <li> to render Ada.
    rerender(<SelectList label="Users" items={[ada, grace, linus]} getKey={(u) => u.id} renderItem={(u) => u.name} onSelect={() => {}} />);
    expect(screen.getByRole('option', { name: 'Grace' })).toBe(graceNode);
  });

  it('renders the empty state when there are no items', () => {
    const { rerender } = render(<SelectList label="Users" items={[] as User[]} getKey={(u) => u.id} renderItem={(u) => u.name} onSelect={() => {}} />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No items');
    rerender(<SelectList label="Users" items={[] as User[]} getKey={(u) => u.id} renderItem={(u) => u.name} onSelect={() => {}} emptyState="Nobody here yet" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nobody here yet');
  });

  it('is generic: works with primitive items too', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SelectList label="Colours" items={['red', 'green'] as const} getKey={(c) => c} renderItem={(c) => c.toUpperCase()} onSelect={onSelect} />);
    await user.click(screen.getByRole('option', { name: 'GREEN' }));
    expect(onSelect).toHaveBeenCalledWith('green');
  });
});
