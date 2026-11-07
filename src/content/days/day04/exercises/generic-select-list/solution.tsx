import { useState, type Key, type KeyboardEvent, type ReactNode } from 'react';

export interface SelectListProps<T> {
  /** The items to show. `readonly` so callers can pass `as const` arrays and frozen state. */
  items: readonly T[];
  /** Stable identity for each item: used for React keys and for selection. */
  getKey: (item: T) => Key;
  /** How to render one item. Receives the item with its real type, plus UI state. */
  renderItem: (item: T, state: { selected: boolean }) => ReactNode;
  /** Controlled selection: the key of the selected item (or null). */
  selectedKey?: Key | null;
  /** Called with the original item (not an index or a string). */
  onSelect: (item: T) => void;
  /** Accessible name for the list. */
  label: string;
  /** Rendered instead of the list when there are no items. */
  emptyState?: ReactNode;
}

// A function declaration can be generic in .tsx without any tricks.
// For an arrow function you'd write `const SelectList = <T,>(props: SelectListProps<T>) => …`.
export function SelectList<T>({ items, getKey, renderItem, selectedKey = null, onSelect, label, emptyState = 'No items' }: SelectListProps<T>) {
  if (items.length === 0) {
    return <p role="status">{emptyState}</p>;
  }

  return (
    <ul role="listbox" aria-label={label}>
      {items.map((item) => {
        const key = getKey(item);
        const selected = key === selectedKey;

        function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); // stop Space from scrolling the page
            onSelect(item);
          }
        }

        return (
          <li key={key} role="option" aria-selected={selected} tabIndex={0} onClick={() => onSelect(item)} onKeyDown={handleKeyDown}>
            {renderItem(item, { selected })}
          </li>
        );
      })}
    </ul>
  );
}

// ---- Live preview ---------------------------------------------------------
interface User {
  id: number;
  name: string;
  role: 'admin' | 'editor';
}

const USERS: User[] = [
  { id: 1, name: 'Ada', role: 'admin' },
  { id: 2, name: 'Grace', role: 'editor' },
  { id: 3, name: 'Linus', role: 'editor' },
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
        onSelect={setSelected} // T is inferred as User, so setSelected fits exactly
        renderItem={(u, { selected: isSelected }) => (
          <span>
            {isSelected ? '✓ ' : ''}
            {u.name} <small>({u.role})</small>
          </span>
        )}
      />
      <p>Selected: {selected ? selected.name : 'nobody'}</p>
    </div>
  );
}
