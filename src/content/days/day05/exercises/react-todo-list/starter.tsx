import { useState } from 'react';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export type Filter = 'all' | 'active' | 'completed';

/**
 * A todo list.
 *
 * - A form with a text input labelled "New todo" and an "Add" button. Submitting (click or Enter)
 *   adds the trimmed text as a new, not-done todo and clears the input. Blank input is ignored.
 * - A list labelled "Todos": each row has a checkbox labelled with the todo's text (toggles `done`)
 *   and a button labelled "Delete <text>".
 * - "<n> item(s) left" — the number of todos that are not done ("1 item left", "2 items left").
 * - Filter buttons "All" / "Active" / "Completed"; the current one has aria-pressed="true".
 */
export default function TodoApp({ initialTodos = [] }: { initialTodos?: Todo[] }) {
  // TODO: what is the MINIMAL state this component needs? Everything else should be derived.
  const [todos] = useState<Todo[]>(initialTodos);

  return (
    <section>
      {/* TODO: form with a controlled "New todo" input and an "Add" button */}

      <ul aria-label="Todos">
        {todos.map((todo) => (
          // TODO: checkbox + delete button. Think about which `key` to use.
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>

      {/* TODO: "<n> items left" and the All / Active / Completed filter buttons */}
    </section>
  );
}
