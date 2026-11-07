import { memo, useCallback, useId, useRef, useState } from 'react';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
}

interface TodoRowProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onRender?: (id: string) => void;
}

// memo: skip re-rendering when every prop is Object.is-equal to last time.
// That only helps if the parent passes STABLE props — see TodoEditor below.
const TodoRow = memo(function TodoRow({ todo, onToggle, onRename, onRender }: TodoRowProps) {
  // Test instrumentation: counts renders of this row. Keep this line.
  onRender?.(todo.id);
  return (
    // The style object is now created INSIDE the row from `todo.done`. A new object here is
    // fine: it goes to a DOM element, not to a memoized component's props.
    <li style={{ opacity: todo.done ? 0.6 : 1 }}>
      <input type="checkbox" aria-label={`Done: ${todo.title}`} checked={todo.done} onChange={() => onToggle(todo.id)} />
      <input aria-label="Edit title" value={todo.title} onChange={(e) => onRename(todo.id, e.target.value)} />
    </li>
  );
});

export interface TodoEditorProps {
  initialTodos: Todo[];
  /** Called every time a TodoRow renders, with that row's id. */
  onRowRender?: (id: string) => void;
}

export default function TodoEditor({ initialTodos, onRowRender }: TodoEditorProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const draftId = useId();

  // Stable identities (empty deps) are only correct because the updates are FUNCTIONAL:
  // they read the latest list from `prev` instead of closing over `todos` from the first render.
  // `map` keeps the same object for untouched rows, so their `todo` prop stays Object.is-equal.
  const toggle = useCallback((id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const rename = useCallback((id: string, title: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setTodos((prev) => [...prev, { id: `new-${nextId.current++}`, title, done: false }]);
    setDraft('');
  };

  const doneCount = todos.filter((t) => t.done).length;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor={draftId}>New todo</label>
        <input id={draftId} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((todo) => (
          <TodoRow key={todo.id} todo={todo} onToggle={toggle} onRename={rename} onRender={onRowRender} />
        ))}
      </ul>
      <p>
        {doneCount} of {todos.length} done
      </p>
    </div>
  );
}
