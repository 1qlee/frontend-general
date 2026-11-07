import { useId, useRef, useState, type CSSProperties } from 'react';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
}

interface TodoRowProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  style: CSSProperties;
  onRender?: (id: string) => void;
}

function TodoRow({ todo, onToggle, onRename, style, onRender }: TodoRowProps) {
  // Test instrumentation: counts renders of this row. Keep this line.
  onRender?.(todo.id);
  return (
    <li style={style}>
      <input type="checkbox" aria-label={`Done: ${todo.title}`} checked={todo.done} onChange={() => onToggle(todo.id)} />
      <input aria-label="Edit title" value={todo.title} onChange={(e) => onRename(todo.id, e.target.value)} />
    </li>
  );
}

export interface TodoEditorProps {
  initialTodos: Todo[];
  /** Called every time a TodoRow renders, with that row's id. */
  onRowRender?: (id: string) => void;
}

/**
 * Works correctly, but EVERY row re-renders on EVERY keystroke — in the "New todo" field
 * and in any row's title field. Make it so that only rows whose data changed re-render.
 * Keep the markup and behaviour the same.
 */
export default function TodoEditor({ initialTodos, onRowRender }: TodoEditorProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const draftId = useId();

  const toggle = (id: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const rename = (id: string, title: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, title } : t)));
  };

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    setTodos([...todos, { id: `new-${nextId.current++}`, title, done: false }]);
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
          <TodoRow
            key={todo.id}
            todo={todo}
            onToggle={toggle}
            onRename={rename}
            style={{ opacity: todo.done ? 0.6 : 1 }}
            onRender={onRowRender}
          />
        ))}
      </ul>
      <p>
        {doneCount} of {todos.length} done
      </p>
    </div>
  );
}
