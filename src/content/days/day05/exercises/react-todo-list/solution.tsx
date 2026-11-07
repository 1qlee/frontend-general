import { useId, useState, type FormEvent } from 'react';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export type Filter = 'all' | 'active' | 'completed';

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

// Stable, unique ids generated when the todo is CREATED (never during render, never the index).
// In an app you'd use crypto.randomUUID() or the id your API returns.
let lastId = 0;
const createId = (): string => `todo-${Date.now().toString(36)}-${++lastId}`;

function matchesFilter(todo: Todo, filter: Filter): boolean {
  if (filter === 'active') return !todo.done;
  if (filter === 'completed') return todo.done;
  return true;
}

export default function TodoApp({ initialTodos = [] }: { initialTodos?: Todo[] }) {
  // Minimal state: the list, the draft text (controlled input) and the filter. Nothing else.
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const inputId = useId();

  // Derived during render — never mirrored into state.
  const visibleTodos = todos.filter((todo) => matchesFilter(todo, filter));
  const activeCount = todos.filter((todo) => !todo.done).length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: createId(), text, done: false }]);
    setDraft('');
  }

  function toggle(id: string) {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  }

  function remove(id: string) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }

  return (
    <section>
      <form onSubmit={handleSubmit}>
        <label htmlFor={inputId}>New todo</label>{' '}
        <input id={inputId} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What needs doing?" />{' '}
        <button type="submit">Add</button>
      </form>

      <ul aria-label="Todos">
        {visibleTodos.map((todo) => (
          <li key={todo.id}>
            <label style={{ textDecoration: todo.done ? 'line-through' : undefined }}>
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
              {todo.text}
            </label>{' '}
            <button type="button" aria-label={`Delete ${todo.text}`} onClick={() => remove(todo.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>

      <p>{`${activeCount} ${activeCount === 1 ? 'item' : 'items'} left`}</p>

      <div role="group" aria-label="Filter">
        {FILTERS.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
