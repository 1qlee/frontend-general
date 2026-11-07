import { useState } from 'react';

export interface ComboboxProps {
  /** Visible label text — becomes the input's accessible name. */
  label: string;
  /** Options to filter (case-insensitive "contains" match). Assume they are unique. */
  options: string[];
  /** Called with the chosen option (Enter on the active option, or a click). */
  onSelect?: (value: string) => void;
}

/**
 * Editable combobox with a listbox popup (WAI-ARIA APG, "list autocomplete").
 *
 * TODO:
 * - input: role="combobox", aria-autocomplete="list", aria-expanded, aria-controls → listbox,
 *   aria-activedescendant → the active option's id (DOM focus never leaves the input)
 * - listbox: role="listbox", options: role="option" + unique id + aria-selected on the active one
 * - typing filters & opens; ArrowDown/ArrowUp move (and wrap); Enter selects; Escape closes
 */
export function Combobox({ label, options }: ComboboxProps) {
  const [value, setValue] = useState('');
  const filtered = options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()));
  return (
    <div className="combobox">
      <div>{label}</div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <ul>
        {value &&
          filtered.map((option) => (
            <li key={option} onClick={() => setValue(option)}>
              {option}
            </li>
          ))}
      </ul>
    </div>
  );
}

export default function ComboboxDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div>
      <Combobox
        label="Fruit"
        options={['Apple', 'Apricot', 'Banana', 'Cherry', 'Mango', 'Orange']}
        onSelect={setPicked}
      />
      <p>Selected: {picked ?? 'nothing yet'}</p>
    </div>
  );
}
