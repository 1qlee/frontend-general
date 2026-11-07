## Why interviewers ask about these

Context, portals and error boundaries are React's ways of **jumping across the tree**: data skips levels, DOM output lands somewhere else, errors travel up to a boundary. Interviewers use them to check that you understand *which* tree each mechanism follows: *"Why does every consumer re-render?"*, *"Why did my click-outside handler fire for a click inside the modal?"*, *"Why didn't the error boundary catch this?"* Forms close the loop: the most common real-world UI, and the foundation for React 19 Actions on Day 7.

## Context is dependency injection, not state management

Context **transports** a value from a provider to any descendant without prop drilling. It doesn't store, update or optimise anything — the state lives in a `useState`/`useReducer` (or an external store) inside the provider component.

```tsx
type Theme = 'light' | 'dark';
const ThemeContext = createContext<Theme>('light'); // default: used only when there is NO provider above

function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  return (
    <ThemeContext value={theme}>          {/* React 19: the context is its own provider */}
      <Toolbar onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
    </ThemeContext>
  );
}
// Before React 19: <ThemeContext.Provider value={theme}> — still works.

function ThemedButton() {
  const theme = useContext(ThemeContext); // or `use(ThemeContext)` — which may be called conditionally
  return <button className={`btn-${theme}`}>Save</button>;
}
```

**Good fits:** theme, locale, text direction; current user, session and permissions; **services** (API client, analytics, feature flags — the DI use case, also great for injecting fakes in tests); compound-component internals. **Poor fits:** high-frequency, widely read state — a large form's values, pointer position, a big normalised cache — because of how context re-renders.

The default value is subtle: it applies only when there is **no provider at all**. A provider with `value={undefined}` passes `undefined`. That's why the `createContext<T | null>(null)` + throwing-hook pattern from lesson 2 is popular: no fake default, and a clear error for a missing provider.

## How context re-renders

When a provider's `value` changes (compared with `Object.is`), React re-renders **every component that reads that context** below it — **even inside `memo`**, and even if it only uses one field of the value. There's no built-in selector.

The classic bug is an inline object:

```tsx
function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // ❌ A new object on every AuthProvider render → every consumer re-renders,
  //    even when `user` didn't change (e.g. AuthProvider's parent re-rendered).
  return <AuthContext value={{ user, setUser }}>{children}</AuthContext>;
}
```

Mitigations, roughly in the order you'd reach for them:

1. **Memoise the value:** `const value = useMemo(() => ({ user, setUser }), [user]);` (`setUser` is stable).
2. **Split contexts** by change frequency, or into **state and dispatch**. `dispatch` never changes, so components that only *send* updates never re-render when state changes:

   ```tsx
   const TodosContext = createContext<Todo[] | null>(null);
   const TodosDispatchContext = createContext<Dispatch<TodoAction> | null>(null);

   function TodosProvider({ children }: { children: ReactNode }) {
     const [todos, dispatch] = useReducer(todosReducer, []);
     return (
       <TodosContext value={todos}>
         <TodosDispatchContext value={dispatch}>{children}</TodosDispatchContext>
       </TodosContext>
     );
   }
   ```

3. **Pass `children` through the provider** (as above). The `children` elements were created by the provider's *parent*, so when the provider's own state changes they aren't re-rendered — only the actual consumers are.
4. **Keep consumers small:** read the context in a leaf component, not at the top of a big subtree.
5. **Put a store in context, not the state.** Context carries a *stable* store object; components subscribe to slices with `useSyncExternalStore`, and only components whose selected slice changed re-render. That's how react-redux and Zustand's context mode work:

   ```tsx
   const StoreContext = createContext<Store<AppState> | null>(null);

   export function useAppSelector<T>(selector: (state: AppState) => T): T {
     const store = useContext(StoreContext); // the store object never changes
     if (!store) throw new Error('useAppSelector must be used inside <StoreProvider>');
     return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
   }

   const itemCount = useAppSelector((s) => s.cart.items.length); // re-renders only when the count changes
   ```

   (The selector must return a primitive or a cached value — see lesson 1. Day 7 compares Redux Toolkit, Zustand, Jotai and TanStack Query.)

> [!MISTAKE]
> "Wrap the consumer in `React.memo` to stop context re-renders." `memo` only skips re-renders caused by a parent rendering with equal props. A context change re-renders the consumer regardless.

{{quiz:memo-context-consumer}}

> [!INTERVIEW] Say it like this
> "Context is dependency injection: it passes a value down without prop drilling, but it isn't a state manager and has no selectors. When the provider's value changes by Object.is, every consumer re-renders, memo or not. So I use it for low-frequency values like theme, auth and services, memoise the provider value, split state and dispatch into separate contexts, and for high-frequency shared state I use an external store with useSyncExternalStore selectors — which is what Redux and Zustand do."

## Portals

`createPortal(children, domNode, key?)` from `react-dom` renders `children` into a **different DOM node** while keeping them at the **same place in the React tree**.

**Why:** to escape ancestors' `overflow: hidden`, `z-index` stacking contexts and `transform` containing blocks — modals, tooltips, popovers, dropdown menus, toasts.

```tsx
import { createPortal } from 'react-dom';

function Toast({ children }: { children: ReactNode }) {
  return createPortal(<div role="status" className="toast">{children}</div>, document.body);
}
```

With SSR, `document` doesn't exist on the server: render the portal only after mount (or into a container that exists on the client).

### React tree vs DOM tree

| Follows the **React** tree | Follows the **DOM** tree |
|---|---|
| Context — portal content reads providers above the component that rendered it | CSS inheritance and selectors (`.sidebar .item` won't match) |
| React synthetic events (`onClick`, `onKeyDown`, …) **bubble to React ancestors** | Native listeners added with `addEventListener` |
| Error boundaries and Suspense boundaries | `element.contains()`, `closest()`, focus order |

That first row surprises people:

```tsx
function ProjectRow({ project }: { project: Project }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <tr onClick={() => navigate(`/projects/${project.id}`)}>
      <td>{project.name}</td>
      <td>
        <button onClick={(e) => { e.stopPropagation(); setConfirming(true); }}>Delete</button>
        <Modal open={confirming} onClose={() => setConfirming(false)} title="Delete project?">
          {/* Portalled into <body>, but clicking here still triggers <tr onClick> → navigates! */}
          <button onClick={() => deleteProject(project.id)}>Delete</button>
        </Modal>
      </td>
    </tr>
  );
}
```

Consequences you should be able to name:

- A parent's `onClick`/`onKeyDown` (row navigation, keyboard shortcuts) fires for interactions **inside** a modal rendered from within it. Fix: render the modal outside the row, `stopPropagation` at the portal root, or check `e.target`.
- **"Click outside" detection** with a native `document` listener and `ref.current.contains(e.target)` treats clicks in a *nested* portal (a dropdown inside a modal) as outside — DOM-wise they aren't contained. Libraries keep a stack of layers (Radix's DismissableLayer) or detect inside-clicks through React events.
- A portal doesn't make a modal *modal*. You still need `role="dialog"`, `aria-modal`, a label, focus management, Escape, and an inert background (Day 9). Native `<dialog>.showModal()` and the Popover API render in the browser's **top layer**, which solves stacking without a portal (Day 8).

{{quiz:portal-bubbling}}

## Error boundaries

Since React 16, an error thrown during rendering that nobody catches **unmounts the whole root** — a blank page. An **error boundary** catches errors from its subtree and renders a fallback instead, so one broken widget doesn't take the app down.

They are **still class components** (as of React 19 there is no hook equivalent):

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  // Render phase — must be pure. Switch to the fallback.
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  // Commit phase — side effects allowed. Report it.
  componentDidCatch(error: Error, info: ErrorInfo) {
    logToMonitoring(error, info.componentStack);
  }

  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}
```

**They catch** errors thrown while React is working on the subtree: **rendering** (function component bodies), class **lifecycle methods** and constructors, and **effects**. In React 19 they also receive rejections read with `use(promise)` and errors thrown inside **Actions/transitions**.

**They don't catch:**

| Not caught | Why | What to do |
|---|---|---|
| **Event handlers** | They run after rendering, outside React's render/commit work | `try/catch` in the handler and set error state |
| **Async code** — `setTimeout`, `.then` callbacks, `await` after the effect returned | By the time it throws, React isn't rendering that component | Catch and store in state, or rethrow into render (below) |
| **Server-side rendering** | No fallback is rendered by boundaries on the server; with streaming SSR React emits the nearest **Suspense** fallback and retries on the client, where a boundary can then catch it | Handle in the server framework; rely on client retry |
| **Errors in the boundary itself** | A boundary can't catch its own render error | It propagates to the next boundary up |

Routing an async error into a boundary:

```tsx
const [, setState] = useState();
// …
fetchStats().catch((error: unknown) => {
  setState(() => { throw error; }); // the updater runs during render → the nearest boundary catches it
});
```

Or, more readably, with the **`react-error-boundary`** package, which also gives you reset support:

```tsx
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  FallbackComponent={ErrorFallback}        // receives { error, resetErrorBoundary }
  onError={(error, info) => logError(error, info.componentStack)}
  onReset={() => queryClient.resetQueries()}
  resetKeys={[userId]}                     // auto-reset when the user changes
>
  <Profile userId={userId} />
</ErrorBoundary>;

// inside a child: const { showBoundary } = useErrorBoundary(); … .catch(showBoundary)
```

**Resetting:** a "Try again" button (`resetErrorBoundary`), `resetKeys`, or changing the boundary's `key` (remounts the subtree). Always **fix the cause** first — refetch, clear bad state — or it throws again immediately.

**Placement:** around routes, around independent widgets (a failing chart shouldn't blank the dashboard) and one at the root as the last resort. Pair them with Suspense so a region has both a loading and an error state: `<ErrorBoundary><Suspense fallback={<Spinner />}>…</Suspense></ErrorBoundary>`.

**React 19 changes:** caught errors are reported once (not re-thrown and logged twice), and `createRoot(el, { onCaughtError, onUncaughtError, onRecoverableError })` gives you one place to send them to monitoring.

> [!INTERVIEW] Say it like this
> "An error boundary catches errors thrown while React renders its subtree — render, lifecycles, effects — and shows a fallback instead of unmounting the whole app. It's still a class with getDerivedStateFromError for the fallback and componentDidCatch for logging. It doesn't catch errors in event handlers or async callbacks, because those don't happen during rendering, nor SSR errors or errors in the boundary itself. For those I use try/catch and state, or push the error into render with react-error-boundary's showBoundary."

{{quiz:boundary-event-handler}}

## Forms: controlled vs uncontrolled

| | Controlled | Uncontrolled |
|---|---|---|
| Source of truth | React state (`value` + `onChange`) | The DOM (`defaultValue`), read on submit |
| Re-renders | On every keystroke | Only when you choose |
| Good for | Instant validation, derived UI (character count, enabling a button), masking/formatting, programmatic changes | Simple forms, big forms, native validation, progressive enhancement, React 19 form Actions |

Reading an uncontrolled form with `FormData`:

```tsx
function SignupForm({ onSubmit }: { onSubmit: (data: { email: string; plan: string }) => void }) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? ''); // get() returns FormDataEntryValue | null (string | File)
    const plan = String(form.get('plan') ?? 'free');
    onSubmit({ email, plan });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <select name="plan" defaultValue="free">
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>
      <button>Sign up</button>
    </form>
  );
}
```

TypeScript point: `FormData` is untyped (`Object.fromEntries(form)` gives `{ [k: string]: FormDataEntryValue }`). **Parse** it — with narrowing or a schema library like Zod — rather than casting it to your type.

Libraries: **react-hook-form** is uncontrolled-first (registers refs, re-renders only fields with errors or subscribed values) — the usual choice for large forms; Formik is controlled; TanStack Form is headless and type-safe.

### Validation strategy

- **Layers:** native constraints (`required`, `type="email"`, `min`, `pattern`) for free and accessible basics → a schema (Zod/Valibot) **shared with the server** → the server as the source of truth. Client validation is UX, not security.
- **Timing — "reward early, punish late":** don't show an error while someone is still typing their first attempt; validate a field **on blur**, and once it has an error, re-validate **on change** so the message disappears as soon as it's fixed. Always validate everything on submit.
- **Accessibility:** connect messages with `aria-describedby`, mark fields `aria-invalid`, move focus to the first invalid field (or an error summary) on submit, don't rely on colour alone (Day 9).
- **Prefer an enabled submit button** that reveals errors over a disabled one that doesn't explain itself.
- The **Constraint Validation API** (`form.checkValidity()`, `input.validity.valueMissing`, `setCustomValidity()`) works with `<form noValidate>` when you want native rules but your own messages.

### Preview: React 19 form Actions (Day 7)

```tsx
const [error, submitAction, isPending] = useActionState(
  async (_prev: string | null, formData: FormData) => {
    const result = await subscribe(String(formData.get('email') ?? ''));
    return result.ok ? null : result.message;
  },
  null,
);

<form action={submitAction}>…</form>;
```

`<form action={fn}>` calls `fn` with the `FormData`, runs it in a transition (pending state via `useActionState` or `useFormStatus` in a child), and resets uncontrolled fields after success. The takeaway for today: **uncontrolled inputs + FormData** is the direction React's own form APIs are going.

## Key takeaways

- **Context = dependency injection.** Value changes re-render *every* consumer (memo doesn't help). Memoise the value, split state/dispatch, pass `children` through, and use a store + `useSyncExternalStore` selectors for hot state.
- The context **default** is used only with no provider at all; `createContext<T | null>(null)` + a throwing hook is the safe pattern.
- **Portals** move DOM output, not React position: context and synthetic events follow the **React** tree; CSS, native listeners and `contains()` follow the **DOM** tree.
- **Error boundaries** (classes: `getDerivedStateFromError` + `componentDidCatch`) catch render, lifecycle and effect errors — **not** event handlers, async callbacks, SSR or their own errors. Reset with `resetKeys`, a button, or `key`.
- **Forms:** controlled for instant feedback, uncontrolled + `FormData` for simplicity and React 19 Actions; validate on blur, re-validate on change after an error, always on submit, and wire errors accessibly.
