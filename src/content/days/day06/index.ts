import type { Day, Exercise } from '../../types';

import hooksInDepth from './lessons/hooks-in-depth.md?raw';
import componentApiPatterns from './lessons/component-api-patterns.md?raw';
import contextPortalsBoundariesForms from './lessons/context-portals-boundaries-forms.md?raw';

import accordionPrompt from './exercises/accordion-allow-multiple/prompt.md?raw';
import accordionExplanation from './exercises/accordion-allow-multiple/explanation.md?raw';
import accordionStarter from './exercises/accordion-allow-multiple/starter.tsx?raw';
import accordionSolution from './exercises/accordion-allow-multiple/solution.tsx?raw';
import accordionTests from './exercises/accordion-allow-multiple/tests.tsx?raw';
import controllablePrompt from './exercises/use-controllable-state/prompt.md?raw';
import controllableExplanation from './exercises/use-controllable-state/explanation.md?raw';
import controllableStarter from './exercises/use-controllable-state/starter.tsx?raw';
import controllableSolution from './exercises/use-controllable-state/solution.tsx?raw';
import controllableTests from './exercises/use-controllable-state/tests.tsx?raw';
import tabsPrompt from './exercises/compound-tabs/prompt.md?raw';
import tabsExplanation from './exercises/compound-tabs/explanation.md?raw';
import tabsStarter from './exercises/compound-tabs/starter.tsx?raw';
import tabsSolution from './exercises/compound-tabs/solution.tsx?raw';
import tabsTests from './exercises/compound-tabs/tests.tsx?raw';
import asyncPrompt from './exercises/use-async-status/prompt.md?raw';
import asyncExplanation from './exercises/use-async-status/explanation.md?raw';
import asyncStarter from './exercises/use-async-status/starter.tsx?raw';
import asyncSolution from './exercises/use-async-status/solution.tsx?raw';
import asyncTests from './exercises/use-async-status/tests.tsx?raw';
import modalPrompt from './exercises/portal-modal-basic/prompt.md?raw';
import modalExplanation from './exercises/portal-modal-basic/explanation.md?raw';
import modalStarter from './exercises/portal-modal-basic/starter.tsx?raw';
import modalSolution from './exercises/portal-modal-basic/solution.tsx?raw';
import modalTests from './exercises/portal-modal-basic/tests.tsx?raw';
import boundaryPrompt from './exercises/error-boundary-reset/prompt.md?raw';
import boundaryExplanation from './exercises/error-boundary-reset/explanation.md?raw';
import boundaryStarter from './exercises/error-boundary-reset/starter.tsx?raw';
import boundarySolution from './exercises/error-boundary-reset/solution.tsx?raw';
import boundaryTests from './exercises/error-boundary-reset/tests.tsx?raw';

import iqRulesOfHooks from './interview/why-rules-of-hooks.md?raw';
import iqReducerVsState from './interview/usereducer-vs-usestate.md?raw';
import iqHooksHocRenderProps from './interview/hooks-vs-hoc-vs-render-props.md?raw';
import iqControlledApi from './interview/controlled-uncontrolled-api.md?raw';
import iqContextPerf from './interview/context-performance.md?raw';
import iqPortals from './interview/portals-event-bubbling.md?raw';
import iqBoundaryLimits from './interview/error-boundary-limits.md?raw';
import iqUseSyncExternalStore from './interview/use-sync-external-store-purpose.md?raw';
import iqLayoutEffect from './interview/layout-effect-vs-effect.md?raw';
import iqDesignTabs from './interview/design-reusable-tabs.md?raw';

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

const accordion: Exercise = {
  id: 'accordion-allow-multiple',
  title: 'Accordion with allowMultiple (compound components)',
  runtime: 'dom',
  difficulty: 'warm-up',
  estMinutes: 10,
  preview: true,
  tags: ['compound components', 'context', 'aria', 'state design'],
  prompt: accordionPrompt,
  starter: accordionStarter,
  solution: accordionSolution,
  tests: accordionTests,
  hints: [
    'Store which items are open as ONE `string[]` — single mode is just "at most one element".',
    'Create `AccordionContext` with a `null` default and a `useAccordionContext()` hook that throws when it reads `null`. Provide `{ isOpen(value), toggle(value) }`.',
    'Toggle: if `prev.includes(value)` remove it, otherwise `allowMultiple ? [...prev, value] : [value]`. In each item, `const id = useId()` → `${id}-button` / `${id}-panel` for `aria-controls` and `aria-labelledby`.',
  ],
  explanation: accordionExplanation,
};

const useControllableStateExercise: Exercise = {
  id: 'use-controllable-state',
  title: 'useControllableState(): one hook, two APIs',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['custom hooks', 'controlled vs uncontrolled', 'refs', 'component api'],
  prompt: controllablePrompt,
  starter: controllableStarter,
  solution: controllableSolution,
  tests: controllableTests,
  hints: [
    'Start with `const isControlled = value !== undefined` and `const current = isControlled ? value : internal`. Why is `value ?? internal` wrong?',
    'To keep the setter stable, create it once with `useCallback(…, [])` and have it read `current`, `isControlled` and `onChange` from a ref that a `useLayoutEffect` (no deps) refreshes after every render.',
    'In the setter: resolve the updater against `ref.current.current` and return early on `Object.is`. Uncontrolled: write the new value into the ref BEFORE `setInternal`, so a second updater in the same event builds on it. Controlled: only call `onChange`.',
  ],
  explanation: controllableExplanation,
};

const compoundTabs: Exercise = {
  id: 'compound-tabs',
  title: 'Compound Tabs: controlled + uncontrolled, ARIA, keyboard',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 20,
  preview: true,
  tags: ['compound components', 'context', 'controlled vs uncontrolled', 'aria', 'keyboard'],
  prompt: tabsPrompt,
  starter: tabsStarter,
  solution: tabsSolution,
  tests: tabsTests,
  hints: [
    'Start with the context: `{ selected, select, baseId }`. Derive ids from `baseId` plus the tab\'s `value` so a tab and its panel can reference each other without any registration.',
    'Controlled vs uncontrolled: `const isControlled = value !== undefined`; `select(next)` updates internal state only when uncontrolled, and always calls `onValueChange`. Roving tabindex is just `tabIndex={isSelected ? 0 : -1}`.',
    'Keyboard: in `TabList`\'s `onKeyDown`, take `e.currentTarget.querySelectorAll(\'[role="tab"]\')`, find the index of `e.target`, compute the next index with modulo (Home → 0, End → last), then `.focus()` that element and `select()` its `data-value`.',
  ],
  explanation: tabsExplanation,
};

const useAsyncExercise: Exercise = {
  id: 'use-async-status',
  title: 'useAsync(): a typed data hook with a status union',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['custom hooks', 'async', 'discriminated unions', 'race conditions', 'effects'],
  prompt: asyncPrompt,
  starter: asyncStarter,
  solution: asyncSolution,
  tests: asyncTests,
  hints: [
    'One `useEffect` keyed on `key`: if `key` is null set idle and return; otherwise create an `AbortController`, set loading, call the fetcher, and return a cleanup that aborts.',
    'In both `.then` callbacks, check `controller.signal.aborted` before setting state — that ignores stale responses (and stale errors) even when the fetcher ignores the signal.',
    "Don't make `fetcher` a dependency: keep it in `useRef(fetcher)`, refresh it in a `useLayoutEffect`, and call `fetcherRef.current(key, controller.signal)` inside the effect.",
  ],
  explanation: asyncExplanation,
};

const portalModal: Exercise = {
  id: 'portal-modal-basic',
  title: 'Modal via createPortal (Escape, backdrop, scroll lock)',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 10,
  preview: true,
  tags: ['portals', 'effects', 'events', 'cleanup'],
  prompt: modalPrompt,
  starter: modalStarter,
  solution: modalSolution,
  tests: modalTests,
  hints: [
    'Return `null` when closed; otherwise `return createPortal(<div data-testid="modal-backdrop">…</div>, document.body)` (import `createPortal` from react-dom).',
    'One `useEffect` depending on `open`: add a `keydown` listener to `document`, save and set `document.body.style.overflow`, focus the dialog (it needs a ref and `tabIndex={-1}`) — and undo the listener and overflow in the cleanup.',
    'Backdrop: `onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}`. Keep `onClose` in a latest ref so the effect does not depend on it.',
  ],
  explanation: modalExplanation,
};

const errorBoundary: Exercise = {
  id: 'error-boundary-reset',
  title: 'ErrorBoundary with fallbackRender, reset and resetKeys',
  runtime: 'dom',
  difficulty: 'stretch',
  estMinutes: 12,
  preview: true,
  tags: ['error boundaries', 'class components', 'lifecycles', 'resilience'],
  prompt: boundaryPrompt,
  starter: boundaryStarter,
  solution: boundarySolution,
  tests: boundaryTests,
  hints: [
    '`static getDerivedStateFromError(error)` returns `{ error }`; `render()` returns `fallbackRender({ error, resetErrorBoundary })` when `state.error` is set, otherwise `children`.',
    '`componentDidCatch(error, info)` is where `onError` goes. Define `resetErrorBoundary = () => { this.props.onReset?.(); this.setState({ error: null }); }` as an arrow-function class field.',
    'In `componentDidUpdate(prevProps, prevState)`, reset only when `this.state.error` AND `prevState.error` are non-null and the keys differ (different length, or any element fails `Object.is`).',
  ],
  explanation: boundaryExplanation,
};

// ---------------------------------------------------------------------------
// Day
// ---------------------------------------------------------------------------

const day: Day = {
  number: 6,
  title: 'React II: Hooks & Component Patterns',
  tagline: 'How hooks really work, how to design component APIs other teams can use, and React’s escape hatches: context, portals and error boundaries.',
  summary:
    'Senior React interviews stop asking *what* a hook does and start asking *why* it works that way and *how* you would design a reusable component. Today you learn the mechanism behind the Rules of Hooks, the remaining built-in hooks (`useReducer`, `useRef`, `useId`, `useLayoutEffect`, `useImperativeHandle`, `useSyncExternalStore`), the API patterns interviewers name — compound components, controlled vs uncontrolled, headless components and prop getters — and the tree-jumping tools: context, portals and error boundaries. Then you build Tabs, an Accordion, a portal modal, an error boundary and two reusable hooks.',
  objectives: [
    'Explain the Rules of Hooks from the mechanism (call order → hook cells), not from the linter',
    'Choose between useState and useReducer, and model state machines with discriminated unions',
    'Explain useRef, useId, useLayoutEffect, useImperativeHandle and useSyncExternalStore (including tearing)',
    'Design custom hooks: naming, return shape, stable callbacks, options objects and the latest-ref pattern',
    'Build compound components with context that support both controlled and uncontrolled use',
    'Compare custom hooks, render props, HOCs and headless hooks with prop getters — and justify a choice',
    'Explain context re-render behaviour, how events bubble out of portals, and what error boundaries miss',
  ],
  skills: ['react', 'react-advanced', 'typescript', 'accessibility', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'review',
      title: 'Warm-up: spaced review',
      minutes: 15,
      intro: 'Flashcards from Days 1–5. Say each answer out loud before flipping — Day 5’s rendering and effects cards are the foundation for today.',
    },
    {
      kind: 'lesson',
      id: 'hooks-in-depth',
      title: 'Hooks in depth: the mechanism, the built-ins, designing your own',
      minutes: 40,
      body: hooksInDepth,
      checks: [
        {
          id: 'conditional-hook-order',
          prompt: 'In the toy runtime from the lesson, what does the **second** render log?',
          code: `const cells: unknown[] = [];
let cursor = 0;

function useState<T>(initial: T): [T, (value: T) => void] {
  const i = cursor++;
  if (cells.length <= i) cells[i] = initial;
  return [cells[i] as T, (value: T) => { cells[i] = value; }];
}

function render<P>(component: (props: P) => string, props: P) {
  cursor = 0;
  console.log(component(props));
}

function Profile({ showAge }: { showAge: boolean }) {
  const [name] = useState('Ada');
  let age: unknown = '(hidden)';
  if (showAge) {
    [age] = useState(36);
  }
  const [city] = useState('London');
  return 'name=' + name + ' age=' + age + ' city=' + city;
}

render(Profile, { showAge: true });
render(Profile, { showAge: false });`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'name=Ada age=(hidden) city=London',
            'name=Ada age=36 city=36',
            'name=Ada age=(hidden) city=36',
            'name=Ada age=36 city=London',
          ],
          answer: 2,
          explanation:
            "After the first render the cells are `['Ada', 36, 'London']`. On the second render `showAge` is false, so the `city` call is now the **second** hook call and reads cell #1 — the cell that belonged to `age`. `age` itself is never read from a cell, so it stays `'(hidden)'`. The toy silently shows wrong data; real React would throw here because the hook **count** changed (\"Rendered fewer hooks than expected\") — but it can't detect two hooks of the same kind swapping places, which is why the rule must hold statically.",
        },
        {
          id: 'layout-effect-choice',
          prompt: "A dropdown menu must flip upward when there isn't enough room below its trigger. Where should you measure the menu and set the flipped position?",
          choices: [
            'In the component body during render, using `ref.current.getBoundingClientRect()`',
            '`useEffect` — it runs after the DOM is updated',
            '`useLayoutEffect` — measure after the DOM update and re-render before the browser paints',
            '`useInsertionEffect` — it runs earliest',
          ],
          answer: 2,
          explanation:
            '`useLayoutEffect` runs synchronously after React mutates the DOM and **before paint**, and a state update inside it is processed before paint too — the user only ever sees the final position. `useEffect` usually runs after paint, so the menu would flash below and then jump. Reading layout during render is impure (and on the first render the ref is still `null`). `useInsertionEffect` runs before refs are attached and exists for CSS-in-JS style injection.',
        },
        {
          id: 'get-snapshot-cached',
          prompt: 'What happens when a component uses this hook?',
          code: `const store = { user: { name: 'Ada' } };

function useUser() {
  return useSyncExternalStore(
    subscribeToStore, // stable, defined at module level
    () => ({ ...store.user }),
  );
}`,
          codeLang: 'tsx',
          choices: [
            'It works — React compares snapshots deeply',
            'React re-renders in a loop and errors, because getSnapshot returns a new object on every call',
            'It never re-renders, because the object is copied',
            'It tears during concurrent rendering',
          ],
          answer: 1,
          explanation:
            'React calls `getSnapshot` on every render and again to check for changes, comparing results with `Object.is`. A fresh object always looks "changed", so React keeps re-rendering and finally errors: *"The result of getSnapshot should be cached to avoid an infinite loop."* Return the stored object itself (`() => store.user`) and replace it immutably on updates, or select a primitive. There is no deep comparison — and preventing tearing is the whole point of `useSyncExternalStore`.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'component-api-patterns',
      title: 'Component API patterns: compound, controlled, headless',
      minutes: 35,
      body: componentApiPatterns,
      checks: [
        {
          id: 'clone-element-fragile',
          prompt:
            '`TabList` assigns indices with `Children.map(children, (child, i) => isValidElement(child) ? cloneElement(child, { index: i }) : child)`. What happens with this usage?',
          code: `function AdminOnly({ children }: { children: ReactNode }) {
  return useIsAdmin() ? children : null;
}

<TabList>
  <Tab>Overview</Tab>
  <AdminOnly>
    <Tab>Billing</Tab>
  </AdminOnly>
</TabList>`,
          codeLang: 'tsx',
          choices: [
            'It works: `Children.map` walks the whole subtree',
            "React throws because `cloneElement` can't clone function components",
            'It works, but only in development',
            'The Billing tab never gets an index — it is injected into `<AdminOnly>`, which ignores it',
          ],
          answer: 3,
          explanation:
            "`Children.map` and `cloneElement` only see the parent's **direct children** as elements; they can't look inside other components (whose output doesn't exist yet) and they don't traverse fragments. So `<AdminOnly>` receives `index={1}` and drops it, and the inner `Tab` has no index at all. That's why robust compound components identify children with an explicit `value` prop and share state through context, which reaches any depth.",
        },
        {
          id: 'controlled-mode-switch',
          prompt:
            'A parent renders `<Tabs value={selectedTab} onValueChange={setSelectedTab}>`, where `selectedTab` is `undefined` until data loads. What is the problem?',
          choices: [
            'The component starts uncontrolled and switches to controlled mid-life, so its internal state and the prop can disagree — the reason React warns about this for inputs',
            'None — `undefined` simply means "no tab selected"',
            'TypeScript forbids passing `undefined` to an optional prop',
            '`onValueChange` is never called while `value` is `undefined`',
          ],
          answer: 0,
          explanation:
            'By convention `value === undefined` **means uncontrolled**. The first renders use internal state (from `defaultValue`), then the component flips to controlled when the data arrives — two sources of truth in one lifetime. React warns about exactly this for inputs ("changing an uncontrolled input to be controlled"). Fix: be controlled from the start with a real value — `null` for "nothing selected" — or render the component once the value is known. `onValueChange` fires in both modes.',
        },
        {
          id: 'prop-getter-why',
          prompt:
            'A hook returns `toggleProps = { onClick: toggle, "aria-expanded": open }`. A consumer writes `<button {...toggleProps} onClick={() => track("open")}>`. What happens on click?',
          choices: [
            'Both handlers run — React merges duplicate props',
            'Only `track("open")` runs: the later `onClick` silently replaces the toggle',
            'Only `toggle` runs because spread props take precedence',
            'React throws because of the duplicate prop',
          ],
          answer: 1,
          explanation:
            "JSX props behave like an object literal: a later key overwrites an earlier one. The consumer's `onClick` replaces the hook's, so the disclosure stops toggling — with no error. **Prop getters** fix this: `getToggleProps({ onClick: track })` receives the consumer's props and composes the handlers (`callAll(onClick, toggle)`), and the hook decides which props can be overridden.",
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'context-portals-boundaries-forms',
      title: 'Context, portals, error boundaries & forms',
      minutes: 30,
      body: contextPortalsBoundariesForms,
      checks: [
        {
          id: 'memo-context-consumer',
          prompt: 'The user clicks "Count". Does `Sidebar` re-render?',
          code: `const ThemeContext = createContext<{ theme: string; toggle: () => void } | null>(null);

const Sidebar = memo(function Sidebar() {
  const ctx = useContext(ThemeContext);
  return <aside className={ctx?.theme}>…</aside>;
});

function App() {
  const [theme, setTheme] = useState('light');
  const [count, setCount] = useState(0);
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return (
    <ThemeContext value={{ theme, toggle }}>
      <button onClick={() => setCount((c) => c + 1)}>Count {count}</button>
      <Sidebar />
    </ThemeContext>
  );
}`,
          codeLang: 'tsx',
          choices: [
            'No — `Sidebar` is memoised and has no props',
            "No — `theme` didn't change, and React compares context values deeply",
            'Yes — the context value is a new object on every `App` render, and consumers re-render regardless of `memo`',
            'Yes — but only because `toggle` is not wrapped in `useCallback`',
          ],
          answer: 2,
          explanation:
            "Clicking re-renders `App`, which creates a new `{ theme, toggle }` object. React compares the provider value with `Object.is` → changed → **every consumer re-renders**, and `memo` can't block a context-triggered render (it only blocks the parent-triggered one). Fix: `useMemo(() => ({ theme, toggle }), [theme, toggle])` with a `useCallback`-ed `toggle`. The last option is half right — an unstable `toggle` would also break it — but the new object literal alone is enough.",
        },
        {
          id: 'portal-bubbling',
          prompt: 'The button is rendered with `createPortal` into `document.body`. What is logged when it is clicked?',
          code: `function Toolbar() {
  return (
    <div onClick={() => console.log('toolbar')}>
      {createPortal(
        <button onClick={() => console.log('button')}>OK</button>,
        document.body,
      )}
    </div>
  );
}`,
          codeLang: 'tsx',
          choices: [
            "'button' only — in the DOM the button isn't inside the div",
            "'button' then 'toolbar' — React events bubble through the React tree",
            "'toolbar' then 'button'",
            "Nothing — portalled elements don't receive React events",
          ],
          answer: 1,
          explanation:
            "React dispatches synthetic events along the **React component tree**, where the portal is a child of the `div`. So the click bubbles from the button's handler to the div's handler even though the DOM parent is `<body>`. A **native** listener added with `div.addEventListener('click', …)` would *not* fire, because native events follow the DOM tree. This is why clicks inside a modal can trigger a parent table row's `onClick`.",
        },
        {
          id: 'boundary-event-handler',
          prompt: 'Clicking "Save" throws. What does the user see?',
          code: `function SaveButton() {
  return (
    <button onClick={() => { throw new Error('Save failed'); }}>
      Save
    </button>
  );
}

<ErrorBoundary fallback={<p>Something went wrong</p>}>
  <SaveButton />
</ErrorBoundary>`,
          codeLang: 'tsx',
          choices: [
            'The button stays on screen: the error is not caught by the boundary and surfaces as an uncaught error',
            '"Something went wrong" — the boundary catches it',
            'A blank page — the whole root unmounts',
            'React retries the click once, then shows the fallback',
          ],
          answer: 0,
          explanation:
            "Error boundaries only catch errors thrown while React is **rendering** the subtree (plus lifecycles and effects). An event handler runs later, in response to a browser event, so the throw is an ordinary uncaught error and the UI stays as it was. Catch it in the handler (`try/catch` → error state) or forward it into render with `react-error-boundary`'s `showBoundary(error)`. The root doesn't unmount either — that only happens for uncaught *render* errors.",
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'hooks-patterns-quiz',
      title: 'Quiz: hooks, patterns & escape hatches',
      minutes: 15,
      intro:
        "These snippets need React, so they aren't runnable — reason from the mechanism: hook cells and call order, `Object.is` comparisons, render vs commit, React tree vs DOM tree. Commit to an answer before revealing, and read every explanation.",
      questions: [
        {
          id: 'hooks-early-return',
          prompt: '`user` changes from `null` to an object on a re-render. What happens?',
          code: `function ProfileCard({ user }: { user: User | null }) {
  const [tab, setTab] = useState<'posts' | 'likes'>('posts');
  if (!user) return <SignInPrompt />;
  const [draft, setDraft] = useState(user.bio);
  return <Editor tab={tab} onTab={setTab} value={draft} onChange={setDraft} />;
}`,
          codeLang: 'tsx',
          choices: [
            'It works — `draft` is initialised from `user.bio` on that render',
            '`draft` is `undefined` on the first render with a user',
            'React throws "Rendered more hooks than during the previous render"',
            'Only the linter complains; at runtime it is fine',
          ],
          answer: 2,
          explanation:
            'The previous render called one hook; this one calls two. On an update React expects every call to find an existing cell; the second call finds none and React throws *"Rendered more hooks than during the previous render."* (The reverse throws *"Rendered fewer hooks than expected… accidental early return"*.) Move both hooks above the early return, or split into `<SignInPrompt />` vs `<ProfileEditor user={user} />` so each component always calls the same hooks. It is a real runtime error, not just a lint warning.',
        },
        {
          id: 'reducer-mutation-bailout',
          prompt: 'What does the paragraph show after one click?',
          code: `function reducer(state: { items: string[] }, action: { type: 'add'; item: string }) {
  state.items.push(action.item);
  return state;
}

function List() {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  return (
    <>
      <button onClick={() => dispatch({ type: 'add', item: 'x' })}>Add</button>
      <p>{state.items.length}</p>
    </>
  );
}`,
          codeLang: 'tsx',
          choices: [
            '1',
            '2 — StrictMode runs the reducer twice',
            'It throws because React freezes state',
            '0 — the reducer returned the same reference, so React bails out of the update',
          ],
          answer: 3,
          explanation:
            "React compares the reducer's result with the previous state using `Object.is`. The same object came back, so React treats it as \"no change\" and the screen keeps showing `0` — even though the array was mutated (the count will \"jump\" later when something else re-renders, and StrictMode's double call pushes twice in development). Return a new object: `{ ...state, items: [...state.items, action.item] }`. React doesn't freeze state; immutability is your job.",
        },
        {
          id: 'ref-click-counter',
          prompt: 'After three clicks, what is logged and what does the button say?',
          code: `function Clicker() {
  const clicks = useRef(0);
  return (
    <button onClick={() => { clicks.current += 1; console.log(clicks.current); }}>
      Clicked {clicks.current} times
    </button>
  );
}`,
          codeLang: 'tsx',
          choices: [
            'Logs 1, 2, 3; the button says "Clicked 3 times"',
            'Logs 1, 2, 3; the button still says "Clicked 0 times"',
            'Logs 0, 0, 0; the button says "Clicked 0 times"',
            'Logs 1, 1, 1; the button says "Clicked 1 times"',
          ],
          answer: 1,
          explanation:
            "Mutating `ref.current` is immediate, so the log counts up — but it **doesn't trigger a re-render**, so the JSX that read `clicks.current` during the first render is never updated. Anything shown on screen belongs in state. This is also why reading `ref.current` during render is discouraged: the output silently goes stale.",
        },
        {
          id: 'uses-inline-subscribe',
          prompt: 'What is the main problem with this hook?',
          code: `function useWindowWidth() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange);
      return () => window.removeEventListener('resize', onChange);
    },
    () => window.innerWidth,
  );
}`,
          codeLang: 'tsx',
          choices: [
            'getSnapshot returns a new value on every call, causing an infinite loop',
            "`resize` events can't be used with useSyncExternalStore",
            '`subscribe` is a new function every render, so React resubscribes after each render — and without getServerSnapshot, server rendering throws',
            'It tears under concurrent rendering',
          ],
          answer: 2,
          explanation:
            "`window.innerWidth` is a number, so the snapshot is stable — no loop. But React treats a different `subscribe` function as a new subscription: it unsubscribes and subscribes again on every re-render. Hoist `subscribe` to module level (or `useCallback` it). Omitting the third argument also means rendering on the server throws; pass a sensible default like `() => 1024`. Preventing tearing is what `useSyncExternalStore` is for.",
        },
        {
          id: 'effect-phase-order',
          prompt: 'In what order are these logged on mount (no StrictMode)?',
          code: `function Demo() {
  useEffect(() => console.log('effect'));
  useLayoutEffect(() => console.log('layout effect'));
  console.log('render');
  return <div />;
}`,
          codeLang: 'tsx',
          choices: [
            'render, layout effect, effect',
            'effect, layout effect, render',
            'render, effect, layout effect',
            'layout effect, render, effect',
          ],
          answer: 0,
          explanation:
            "Order is by **phase**, not by where the hooks are written: the component body runs during render → React commits the DOM → layout effects run synchronously before paint → passive effects (`useEffect`) run after. Declaring `useEffect` first doesn't make it run first. (In StrictMode development, effects additionally run setup → cleanup → setup on mount.)",
        },
        {
          id: 'context-default-vs-undefined',
          prompt: 'What does this render?',
          code: `const LocaleContext = createContext<string | undefined>('en-US');

function Price() {
  const locale = useContext(LocaleContext);
  return <span>[{locale ?? 'none'}]</span>;
}

<>
  <Price />
  <LocaleContext value={undefined}>
    <Price />
  </LocaleContext>
</>`,
          codeLang: 'tsx',
          choices: ['[en-US][en-US]', '[en-US][none]', '[none][none]', '[none][en-US]'],
          answer: 1,
          explanation:
            "The default passed to `createContext` is used **only when there is no provider above** — true for the first `Price`. The second has a provider whose value is `undefined`, and that's what it reads; providers never \"fall back\" to the default. That's why teams often use `createContext<T | null>(null)` plus a hook that throws when the provider is missing.",
        },
        {
          id: 'portal-reads-context',
          prompt:
            'A `Tooltip` renders its content with `createPortal(…, document.body)` and calls `useContext(ThemeContext)` inside it. `<ThemeContext value="dark">` wraps the component that renders `<Tooltip>`, not `document.body`. Which theme does the tooltip read?',
          choices: [
            "'dark' — context follows the React tree, and the portal is still a React child of its owner",
            "The context default — the portal's DOM container is outside the provider",
            "It throws: context can't cross a portal",
            "'dark' only if the provider is portalled too",
          ],
          answer: 0,
          explanation:
            "A portal changes where the **DOM** goes, not where the component sits in the **React** tree. Context, synthetic events and error boundaries all follow the React tree, so the tooltip reads `'dark'` from the nearest provider above `<Tooltip>`. What does *not* follow: CSS inheritance and selectors, native DOM listeners and `contains()` checks — those see `<body>` as the parent.",
        },
        {
          id: 'boundary-promise-callback',
          prompt: '`loadStats()` rejects. What does the user see?',
          code: `function StatsWidget() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    loadStats().then(setStats, (error) => {
      throw error;
    });
  }, []);
  return stats ? <Chart data={stats} /> : <p>Loading…</p>;
}

<ErrorBoundary fallback={<p>Stats unavailable</p>}>
  <StatsWidget />
</ErrorBoundary>`,
          codeLang: 'tsx',
          choices: [
            '"Loading…" forever — the throw happens in a promise callback after the effect returned, so the boundary never sees it',
            '"Stats unavailable" — errors in effects are caught by boundaries',
            'A blank page — the root unmounts',
            '"Stats unavailable", but only in production builds',
          ],
          answer: 0,
          explanation:
            'Boundaries *do* catch errors thrown **synchronously** inside an effect — which makes the second option tempting. But this effect returned long ago; the `throw` happens inside a promise callback and just becomes an unhandled promise rejection. Nothing re-renders, so the UI is stuck on "Loading…". Forward the error instead: `setState(() => { throw error; })`, `showBoundary(error)` from `react-error-boundary`, or an error state you render. (With React 19 you could read the promise with `use()` under Suspense — then the rejection does reach the boundary.)',
        },
        {
          id: 'controlled-input-no-onchange',
          prompt: 'What happens when the user types into this input?',
          code: `function Search() {
  const [query, setQuery] = useState('react');
  return <input value={query} />;
}`,
          codeLang: 'tsx',
          choices: [
            'The text changes normally; React syncs the state on blur',
            'The input becomes uncontrolled after the first keystroke',
            'React throws an error on the first keystroke',
            'Nothing changes — it is controlled with no onChange, so React keeps it at "react" (and warns you to add onChange, readOnly or use defaultValue)',
          ],
          answer: 3,
          explanation:
            "Passing `value` makes the input **controlled**: after every event React forces the DOM value back to match state. With no `onChange` updating `query`, every keystroke is reverted, and in development React warns that you provided `value` without `onChange` — use `defaultValue` for an uncontrolled input, or `readOnly` if it's intentional.",
        },
        {
          id: 'custom-hook-independent-state',
          prompt: "Clicking A's button toggles A. What happens to B?",
          code: `function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((o) => !o), []);
  return [on, toggle] as const;
}

function A() {
  const [on, toggle] = useToggle();
  return <button onClick={toggle}>A is {on ? 'on' : 'off'}</button>;
}

function B() {
  const [on] = useToggle();
  return <p>B is {on ? 'on' : 'off'}</p>;
}`,
          codeLang: 'tsx',
          choices: [
            'Nothing — each call to useToggle has its own state',
            'B toggles too — they use the same hook',
            'B toggles only if A and B are siblings',
            'B toggles because useCallback shares the function between components',
          ],
          answer: 0,
          explanation:
            'A custom hook is just a function that calls hooks, so its `useState` cell lives in whichever component called it — `A` and `B` each get their own `on`. Custom hooks share **logic**, not state. To share the state, lift it to a common parent, put it in context, or use an external store.',
        },
        {
          id: 'usecallback-equivalent',
          prompt: 'Which is exactly equivalent to `useCallback(fn, deps)`?',
          choices: ['`useMemo(fn, deps)`', '`useMemo(() => fn, deps)`', '`useRef(fn).current`', '`useEffect(fn, deps)`'],
          answer: 1,
          explanation:
            '`useCallback` caches the **function itself**; `useMemo` caches the **result of calling** its argument. `useMemo(() => fn, deps)` returns and caches `fn` — identical semantics. `useMemo(fn, deps)` would *call* `fn` and cache its return value. A ref keeps the *first* function forever (a stale closure), and `useEffect` runs a side effect after commit and returns nothing. When memoisation is worth it is Day 7.',
        },
        {
          id: 'pattern-headless-combobox',
          prompt:
            'A design-system team needs a Combobox that product teams will style with their own CSS and lay out very differently (inline, inside a popover, with custom option rows), while keyboard and ARIA behaviour must stay correct everywhere. Which API fits best?',
          choices: [
            'One `<Combobox>` with a prop for every variation (`layout`, `optionClassName`, `showIcons`, …)',
            'A higher-order component, `withCombobox(Component)`',
            'A headless `useCombobox()` hook returning prop getters, optionally wrapped by unstyled compound components',
            "A global context holding every combobox's state",
          ],
          answer: 2,
          explanation:
            '"Behaviour fixed, markup and styling free" is the definition of **headless**. Prop getters (`getInputProps()`, `getOptionProps(item)`) attach ARIA attributes and handlers to whatever elements a team renders and compose the team\'s own handlers — the Downshift / React Aria approach — and compound components on top give a convenient default. A configuration-prop component grows with every design; an HOC hides where props come from and still doesn\'t give markup control; a global context is a state-management choice, not a component API.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'build-hooks-and-patterns',
      title: 'Build: compound components, reusable hooks, escape hatches',
      minutes: 60,
      intro:
        "Interview conditions: timer on, talk out loud, no AI. Work in order — the Accordion warms up the compound pattern, `useControllableState` is the idea behind the controlled/uncontrolled Tabs, then the escape hatches. Warm-up plus core is about an hour (if you're short on time, skip the Accordion — Tabs covers the same pattern); the error boundary is the stretch. After each pass, read the explanation: the follow-up questions are where senior signal lives. The preview pane renders each component's demo.",
      exercises: [accordion, useControllableStateExercise, compoundTabs, useAsyncExercise, portalModal, errorBoundary],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–90 seconds before revealing the model answer — one-sentence answer, then the mechanism, then a trade-off or example. For the Tabs design question, take 3 minutes and sketch the JSX API first.',
    },
  ],
  flashcards: [
    {
      id: 'hooks-identified-by-call-order',
      front: 'How does React know which `useState` call is which?',
      back: 'By **call order**. Each component fiber stores an ordered list of hook cells; on every render the n-th hook call reads the n-th cell. There are no names or keys.',
    },
    {
      id: 'rules-of-hooks-two',
      front: 'The two Rules of Hooks?',
      back: '1. Call hooks only at the top level — not in conditions, loops, nested functions or after an early return. 2. Call them only from function components or custom hooks (`useX`).',
    },
    {
      id: 'use-api-conditional',
      front: 'Which React API may be called inside an `if` or a loop?',
      back: '`use` (React 19), for promises and context. It must still be called while a component or hook is rendering, and not inside `try/catch`.',
    },
    {
      id: 'custom-hooks-share-logic',
      front: 'Do two components using the same custom hook share state?',
      back: "No. A custom hook shares **logic**; its hook cells live in each calling component, so every call site gets independent state. To share state: lift it, use context, or an external store.",
    },
    {
      id: 'usereducer-when',
      front: 'When is `useReducer` a better fit than `useState`?',
      back: 'When several values change together, transitions are non-trivial or deserve names, you want logic testable without React, or you pass the updater deep (`dispatch` is stable).',
    },
    {
      id: 'reducer-purity',
      front: 'Why must reducers be pure, and how do you bail out?',
      back: 'React may call them more than once (StrictMode calls them twice in dev). No side effects, no mutation — return a new object, or the **same reference** to signal "no change" (`Object.is` bail-out).',
    },
    {
      id: 'ref-vs-state',
      front: '`useRef` vs `useState` in one line?',
      back: "Both persist across renders; setting state re-renders, mutating `ref.current` doesn't. If it's rendered, it's state; refs are for DOM nodes, timer ids, controllers and latest-value boxes.",
    },
    {
      id: 'react19-ref-as-prop',
      front: 'How does a function component receive a `ref` in React 19?',
      back: 'As a regular prop: `function Input({ ref, ...props })`. `forwardRef` is no longer needed, and ref callbacks may return a cleanup function.',
    },
    {
      id: 'useid-purpose',
      front: 'What is `useId` for — and not for?',
      back: "Stable, SSR-safe unique ids to link elements (`htmlFor`, `aria-describedby`, `aria-controls`). Not for list keys, and don't parse it or use it as a CSS selector.",
    },
    {
      id: 'layout-effect-timing',
      front: '`useLayoutEffect` vs `useEffect` timing?',
      back: 'Layout effects run synchronously after DOM mutation and **before paint** (state updates inside them also land before paint). `useEffect` usually runs after paint. Use layout effects only to measure and reposition without flicker.',
    },
    {
      id: 'tearing-definition',
      front: 'What is **tearing**?',
      back: 'One render showing different values of the same external store in different components, because a mutable store changed during an interruptible (concurrent) render. `useSyncExternalStore` prevents it.',
    },
    {
      id: 'get-snapshot-rule',
      front: 'The rule for `getSnapshot` in `useSyncExternalStore`?',
      back: 'Return the same value (`Object.is`) until the store changes. A new object per call looks like a change every time → infinite re-render loop. Also keep `subscribe` stable.',
    },
    {
      id: 'custom-hook-return-shape',
      front: 'Tuple or object from a custom hook?',
      back: 'Tuple for ~2 values callers will rename (`[isOpen, toggle]`). Object for 3+ values, optional extras or a growing API. A discriminated union for async status.',
    },
    {
      id: 'compound-components-definition',
      front: 'What are compound components?',
      back: 'Components that work together (Tabs/TabList/Tab/TabPanel) sharing implicit state through a context owned by the root, while the consumer controls markup and order — like `<select>` and `<option>`.',
    },
    {
      id: 'controlled-uncontrolled-conventions',
      front: 'Controlled vs uncontrolled component API conventions?',
      back: "`value` + `onValueChange` = controlled (parent owns state); `defaultValue` = uncontrolled (read once on mount). Mode is decided by `value === undefined`; in controlled mode, report changes — don't apply them.",
    },
    {
      id: 'prop-getters-definition',
      front: 'What is a prop getter, and why not just return a props object?',
      back: "A function like `getToggleProps(userProps)` that returns props for an element, **merging** the consumer's props and composing handlers. With a spread object, the consumer's `onClick` silently replaces yours.",
    },
    {
      id: 'context-rerender-rule',
      front: 'Which components re-render when a context value changes?',
      back: 'Every component that reads that context below the provider — **even inside `memo`** — whenever the value changes by `Object.is`. There are no built-in selectors.',
    },
    {
      id: 'portal-react-vs-dom-tree',
      front: 'Portals: what follows the React tree vs the DOM tree?',
      back: 'React tree: context, synthetic event bubbling, error boundaries. DOM tree: CSS inheritance and selectors, native listeners, `contains()`, focus order.',
    },
    {
      id: 'error-boundary-not-caught',
      front: "What don't error boundaries catch?",
      back: "Errors in event handlers, async callbacks (timeouts, promise callbacks), server rendering, and the boundary's own render. They do catch render, lifecycle and effect errors.",
    },
    {
      id: 'gdsfe-vs-componentdidcatch',
      front: '`getDerivedStateFromError` vs `componentDidCatch`?',
      back: '`getDerivedStateFromError`: static, render phase, pure — return state to show the fallback. `componentDidCatch`: commit phase — side effects like logging `info.componentStack`.',
    },
  ],
  interviewQuestions: [
    {
      id: 'why-rules-of-hooks',
      kind: 'concept',
      question: 'Why do the Rules of Hooks exist? What actually breaks if you call a hook conditionally?',
      answer: iqRulesOfHooks,
      followUps: [
        'Why do two components using the same custom hook not share state?',
        'How would you fix a component that needs a hook only when a prop is present?',
        'Why is `use` allowed inside conditions?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'usereducer-vs-usestate',
      kind: 'concept',
      question: 'When would you choose `useReducer` over `useState`?',
      answer: iqReducerVsState,
      followUps: [
        'Where do side effects go when you use a reducer?',
        'How does useReducer + context compare to Redux?',
        'What happens if a reducer mutates and returns the same object?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'hooks-vs-hoc-vs-render-props',
      kind: 'concept',
      question: 'Compare custom hooks, higher-order components and render props for sharing logic. When would you still use each?',
      answer: iqHooksHocRenderProps,
      followUps: [
        'Write a typed `withLogger` HOC.',
        'Can a render prop do something a hook cannot?',
        'Why are HOCs awkward to type in TypeScript?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'controlled-uncontrolled-api',
      kind: 'concept',
      question: 'How would you design a component — say a Disclosure or a Select — to support both controlled and uncontrolled usage?',
      answer: iqControlledApi,
      followUps: [
        'What happens if a parent passes `value={undefined}` first and a string later?',
        'How do you keep the setter stable without stale closures?',
        'Should `onValueChange` fire when the user re-selects the current value?',
      ],
      minutes: 2,
      level: 'senior',
    },
    {
      id: 'context-performance',
      kind: 'concept',
      question: 'What are the performance pitfalls of React context, and how do you mitigate them?',
      answer: iqContextPerf,
      followUps: [
        "Why doesn't `memo` prevent context re-renders?",
        'How does react-redux avoid re-rendering every connected component?',
        'When is prop drilling better than context?',
      ],
      minutes: 2,
      level: 'senior',
    },
    {
      id: 'portals-event-bubbling',
      kind: 'concept',
      question: 'What is a portal, why would you use one, and how do events behave inside it?',
      answer: iqPortals,
      followUps: [
        'How would you implement click-outside for nested popovers?',
        'When would you use `<dialog>` instead of a portal?',
        'Does a portalled component read context from its owner?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'error-boundary-limits',
      kind: 'concept',
      question: "What do error boundaries catch, what don't they catch, and how do you handle the rest?",
      answer: iqBoundaryLimits,
      followUps: [
        'Why is there no hook version of an error boundary?',
        'How does `resetKeys` differ from changing `key`?',
        'How do you report errors to monitoring in React 19?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'use-sync-external-store-purpose',
      kind: 'concept',
      question: 'What problem does `useSyncExternalStore` solve? Why not just `useState` + `useEffect`?',
      answer: iqUseSyncExternalStore,
      followUps: [
        'Why must getSnapshot return a cached value?',
        'How would you build `useMediaQuery`?',
        'How do selector-based stores avoid re-rendering every subscriber?',
      ],
      minutes: 2,
      level: 'senior',
    },
    {
      id: 'layout-effect-vs-effect',
      kind: 'concept',
      question: "What's the difference between `useLayoutEffect` and `useEffect`? When do you need the layout version?",
      answer: iqLayoutEffect,
      followUps: [
        'Why can useLayoutEffect hurt performance?',
        'What is useInsertionEffect for?',
        'What does the server render for a component that measures itself?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'design-reusable-tabs',
      kind: 'ui-build',
      question: 'Design and build a reusable Tabs component for a design system. What API would you choose, and why?',
      answer: iqDesignTabs,
      followUps: [
        'How does a Tab know its position for arrow-key navigation?',
        'Automatic vs manual activation — when would you choose each?',
        'How would you support vertical orientation and right-to-left layouts?',
        'How would you use it from a React Server Component?',
      ],
      minutes: 3,
      level: 'senior',
    },
  ],
};

export default day;
