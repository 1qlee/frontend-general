import { useState, type Key, type ReactNode } from 'react';

/**
 * A generic, accessible single-select list.
 *
 * Requirements (see the tests for the exact spec):
 *  - Generic over the item type T: `renderItem`, `getKey` and `onSelect` all receive a real T.
 *  - Render a <ul role="listbox" aria-label={label}> with one <li role="option"> per item.
 *  - Use `getKey(item)` as the React key — never the array index.
 *  - The option whose key === selectedKey gets aria-selected="true" (others "false"), and
 *    renderItem receives { selected } so it can style itself.
 *  - Clicking an option, or pressing Enter / Space while it is focused, calls onSelect(item).
 *    Options must be focusable (tabIndex={0}).
 *  - With no items, render <p role="status">{emptyState}</p> (default text: "No items").
 */
export interface SelectListProps<T> {
  items: readonly T[];
  getKey: (item: T) => Key;
  renderItem: (item: T, state: { selected: boolean }) => ReactNode;
  selectedKey?: Key | null;
  onSelect: (item: T) => void;
  label: string;
  emptyState?: ReactNode;
}

export function SelectList<T>(props: SelectListProps<T>) {
  // TODO: implement
  return null;
}

// ---- Live preview (uses your component) -----------------------------------
interface User {
  id: number;
  name: string;
}

const USERS: User[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Linus' },
];

export default function Demo() {
  const [selected, setSelected] = useState<User | null>(null);
  return (
    <div>
      <SelectList
        label="Users"
        items={USERS}
        getKey={(u) => u.id}
        selectedKey={selected?.id ?? null}
        onSelect={setSelected}
        renderItem={(u, { selected: isSelected }) => (isSelected ? `✓ ${u.name}` : u.name)}
      />
      <p>Selected: {selected ? selected.name : 'nobody'}</p>
    </div>
  );
}
