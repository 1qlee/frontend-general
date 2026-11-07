import { useId, useState, type KeyboardEvent } from 'react';

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
 * DOM focus stays on the input; the "active" option is communicated with
 * aria-activedescendant and highlighted visually.
 */
export function Combobox({ label, options, onSelect }: ComboboxProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const labelId = `${id}-label`;
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Derived state — don't store `filtered` in state, compute it.
  const query = value.trim().toLowerCase();
  const filtered = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
  const expanded = open && filtered.length > 0;
  const activeId = expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function select(option: string) {
    setValue(option);
    close();
    onSelect?.(option);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = filtered.length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault(); // stop the caret jumping to the end
        if (count === 0) return;
        if (!expanded) {
          setOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((i) => (i + 1) % count);
        }
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (count === 0) return;
        if (!expanded) {
          setOpen(true);
          setActiveIndex(count - 1);
        } else {
          setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
        }
        return;
      case 'Enter':
        if (expanded && activeIndex >= 0) {
          event.preventDefault(); // don't submit a surrounding form
          select(filtered[activeIndex]);
        }
        return;
      case 'Escape':
        if (expanded) {
          event.preventDefault();
          close();
        }
        return;
    }
  }

  return (
    <div className="combobox" style={{ position: 'relative', width: 240 }}>
      <label id={labelId} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        autoComplete="off" // the browser's own autofill popup would fight ours
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActiveIndex(-1); // the list changed — the old index means nothing now
        }}
        onKeyDown={handleKeyDown}
        onBlur={close}
        style={{ width: '100%' }}
      />
      <ul
        id={listboxId}
        role="listbox"
        aria-labelledby={labelId}
        hidden={!expanded}
        style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #767676' }}
      >
        {filtered.map((option, index) => (
          <li
            key={option}
            id={optionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            // Keep DOM focus in the input: without this, mousedown blurs it and closes the list.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => select(option)}
            style={{ padding: '4px 8px', cursor: 'pointer', background: index === activeIndex ? '#dbe7ff' : undefined }}
          >
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
