import type { Day, Exercise } from '../../types';

import renderingReconciliation from './lessons/rendering-reconciliation.md?raw';
import designingState from './lessons/designing-state.md?raw';
import effectsRefs from './lessons/effects-refs.md?raw';

import todoStarter from './exercises/react-todo-list/starter.tsx?raw';
import todoSolution from './exercises/react-todo-list/solution.tsx?raw';
import todoTests from './exercises/react-todo-list/tests.tsx?raw';
import debounceStarter from './exercises/use-debounced-value/starter.tsx?raw';
import debounceSolution from './exercises/use-debounced-value/solution.tsx?raw';
import debounceTests from './exercises/use-debounced-value/tests.tsx?raw';
import searchStarter from './exercises/search-race-condition/starter.tsx?raw';
import searchSolution from './exercises/search-race-condition/solution.tsx?raw';
import searchTests from './exercises/search-race-condition/tests.tsx?raw';
import stopwatchStarter from './exercises/react-stopwatch/starter.tsx?raw';
import stopwatchSolution from './exercises/react-stopwatch/solution.tsx?raw';
import stopwatchTests from './exercises/react-stopwatch/tests.tsx?raw';
import standupStarter from './exercises/fix-standup-board-bugs/starter.tsx?raw';
import standupSolution from './exercises/fix-standup-board-bugs/solution.tsx?raw';
import standupTests from './exercises/fix-standup-board-bugs/tests.tsx?raw';
import counterTestsStarter from './exercises/write-tests-counter/starter.tsx?raw';
import counterTestsSolution from './exercises/write-tests-counter/solution.tsx?raw';
import counterSubject from './exercises/write-tests-counter/subject.tsx?raw';
import counterMutantMax from './exercises/write-tests-counter/mutant-max-off-by-one.tsx?raw';
import counterMutantReset from './exercises/write-tests-counter/mutant-reset-to-zero.tsx?raw';
import counterMutantOnChange from './exercises/write-tests-counter/mutant-stale-onchange.tsx?raw';

const todoList: Exercise = {
  id: 'react-todo-list',
  title: 'Todo list: add, toggle, delete, filter',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 20,
  preview: true,
  tags: ['react', 'state design', 'keys', 'forms', 'ui-build'],
  prompt: `Build the classic interview todo list. The default export is \`TodoApp({ initialTodos? })\`, and the \`Todo\` type is in the starter.

**Requirements.** The tests query by role and label, so accessible names matter.
- A form with an input labelled **"New todo"** (use a real \`<label>\`) and a submit button **"Add"**. Pressing Enter or clicking Add appends the *trimmed* text as a not-done todo and clears the input. Blank input is ignored.
- A \`<ul aria-label="Todos">\`. Each \`<li>\` has a checkbox whose accessible name is the todo's text (wrap it in a \`<label>\`) and a button whose accessible name is **"Delete "** followed by the todo's text (e.g. "Delete Buy milk").
- A line reading **"N items left"** / **"1 item left"** (as plain text in one element, e.g. a \`<p>\`) that counts *all* not-done todos, whatever the current filter.
- Filter buttons **All / Active / Completed**. The current one has \`aria-pressed="true"\`.

**The tests also check that:** the input is controlled; keys are stable (deleting a row must not remount the rows after it); and ids stay unique after deletes.

**What the interviewer is looking for:** that you name the *minimal* state out loud before you code (\`todos\`, \`draft\`, \`filter\`; the visible list and the count are derived), immutable functional updates, ids created in the add handler and used as keys, accessible markup (a real \`<form>\`, labels, \`aria-pressed\`), and narration of your trade-offs as you go.`,
  starter: todoStarter,
  solution: todoSolution,
  tests: todoTests,
  hints: [
    'Three pieces of state: `todos`, `draft` and `filter`. `visibleTodos` and `activeCount` are computed during render, so don\'t store them.',
    'Use `<form onSubmit>` and call `event.preventDefault()`, which gives you Enter-to-submit for free. Create the id inside the submit handler (a module-level counter or `crypto.randomUUID()`). Never create it during render, and never base it on the index or `todos.length`.',
    'Toggle: `setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))`. Delete: `prev.filter(t => t.id !== id)`. Each row: `<li key={todo.id}>` containing `<label><input type="checkbox" checked={todo.done} onChange={…} />{todo.text}</label>` and a button with `aria-label={\'Delete \' + todo.text}`.',
  ],
  explanation: `**State design (say this first):** \`todos: Todo[]\`, \`draft: string\` and \`filter: 'all' | 'active' | 'completed'\`. Everything else, such as \`visibleTodos\` and \`activeCount\`, is derived during render. Storing \`visibleTodos\` in state would need an effect to keep it in sync, would render a stale frame first, and could end up contradicting \`todos\`.

**Updates** are immutable and functional (\`setTodos(prev => …)\`), so batched updates never build on a stale snapshot.

**Keys and ids.** The id is created once, in the add handler. Index keys fail the "stable keys" test: delete the first row and React reuses row 0's \`<li>\` for the next todo and removes the *last* \`<li>\`, so any per-row state (focus, an inline-edit input, an animation) jumps to the wrong todo. \`id: String(todos.length)\` fails the "unique ids" test, because deleting and then adding can produce a duplicate id. Toggling one todo would then toggle both.

**Accessibility = testability.** A real \`<form>\` gives you Enter-to-submit. \`<label>\`s give the inputs accessible names, and \`aria-pressed\` exposes the filter buttons' toggle state. Those same names are what the tests (and screen-reader users) rely on.

**Follow-ups you may get:**
- *"Persist to localStorage."* Use lazy initial state, \`useState(() => load())\`, plus \`useEffect(() => save(todos), [todos])\`. That effect is legitimate because localStorage is an external system.
- *"Make the filter shareable."* Move it into the URL (\`?filter=active\`), per Lesson 2's decision guide.
- *"Add inline editing."* Keep an \`editingId\` in the parent (one row at a time) or local state inside a \`TodoItem\`. Now stable keys really matter.
- *"Clear completed / toggle all."* Use \`prev.filter(t => !t.done)\` and \`prev.map(t => ({ ...t, done: !allDone }))\`, with \`allDone\` derived.
- *"10,000 todos?"* Filtering during render is still fine. Rendering 10k rows isn't: virtualize (Day 10) and memoize rows with stable callbacks (Day 7).`,
};

const debouncedValue: Exercise = {
  id: 'use-debounced-value',
  title: 'useDebouncedValue(value, delay)',
  runtime: 'dom',
  difficulty: 'warm-up',
  estMinutes: 10,
  tags: ['react', 'hooks', 'effects', 'timers', 'custom hooks'],
  prompt: `Write a hook that returns a **debounced copy** of a value:

\`\`\`tsx
const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query, 300);
// query changes on every keystroke; debouncedQuery changes only once typing pauses for 300 ms
\`\`\`

- Return the initial value immediately.
- Once the value has stopped changing for \`delay\` ms, return the latest value. Every change restarts the timer, so intermediate values are never returned.
- Changing \`delay\` restarts the pending timer with the new delay.
- Unmounting cancels the pending update (no leaked timers).

The tests use \`renderHook\`, fake timers, and \`act(() => { vi.advanceTimersByTime(ms); })\`.

**What the interviewer is looking for:** that you see this as *state plus an effect that synchronizes with a timer*, that the cleanup does all the work, and that the dependency array is correct. Contrast it with a classic \`debounce(fn)\` utility: that one debounces a *function call*, while this one debounces a *value* across renders.`,
  starter: debounceStarter,
  solution: debounceSolution,
  tests: debounceTests,
  hints: [
    'The value you return is state: `const [debounced, setDebounced] = useState(value)`.',
    'In an effect that depends on `[value, delay]`, start a `setTimeout` that calls `setDebounced(value)`.',
    'Return `() => clearTimeout(id)` from the effect. That cleanup runs before every re-run (the value changed, so the timer restarts) and on unmount. That\'s the whole debounce.',
  ],
  explanation: `\`\`\`tsx
const [debounced, setDebounced] = useState(value);
useEffect(() => {
  const id = setTimeout(() => setDebounced(value), delay);
  return () => clearTimeout(id);
}, [value, delay]);
return debounced;
\`\`\`

The cleanup does the real work. Each change of \`value\` (or \`delay\`) runs the previous cleanup, which cancels the pending timer, before scheduling a new one. Only a value that stays unchanged for \`delay\` ms gets through.

**Why state and not a ref?** Consumers must re-render when the debounced value changes, and only state updates trigger renders.

**Edge cases:** the effect also runs on mount and schedules \`setDebounced(value)\` with the value it already has, so React bails out. Objects work as long as the caller passes stable references. A fresh \`{}\` on every render would restart the timer forever (the \`Object.is\` rule again).

**Follow-ups you may get:**
- *"Debounce a callback instead (\`useDebouncedCallback\`)?"* Keep the timer id in a ref and the latest callback in a ref (or use \`useEffectEvent\`), and clear the timer on unmount.
- *"Leading edge or maxWait?"* Those are lodash \`debounce\` options. Track the last invocation time in a ref.
- *"Does debouncing a search prevent race conditions?"* No. It cuts the number of requests, but two can still overlap. You still need the ignore flag and abort from the next exercise.
- *"How is this different from \`useDeferredValue\`?"* \`useDeferredValue\` keeps typing responsive while an expensive *render* lags behind. It has no fixed delay and doesn't reduce network requests (Day 7).`,
};

const searchRace: Exercise = {
  id: 'search-race-condition',
  title: 'Race-safe search-as-you-type',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 15,
  preview: true,
  tags: ['react', 'effects', 'data fetching', 'race conditions', 'AbortController'],
  prompt: `Implement \`Search({ fetchResults })\`, a search-as-you-type component whose data source is injected:

\`\`\`ts
type FetchResults = (query: string, signal: AbortSignal) => Promise<string[]>;
\`\`\`

- An input labelled **"Search"**. Each change of the *trimmed* query calls \`fetchResults(query, signal)\`. An empty query never fetches and shows nothing.
- While the current query is loading, show \`<p role="status">Loading…</p>\`.
- On success, show \`<ul aria-label="Results">\` with one \`<li>\` per result. On failure, show \`<p role="alert">Something went wrong…</p>\`.
- **The screen only ever shows the response for the *current* query.** Responses can arrive out of order, and a slow response for an old query must be dropped, *even if the data source ignores the abort signal*.
- Abort the previous request when the query changes, and abort the in-flight request on unmount. An aborted request is not an error.

The tests use a fetcher whose promises they resolve by hand, in any order. The preview uses a fake API where *shorter queries are slower*, so type "ap" quickly to see the race.

**What the interviewer is looking for:** spotting the race condition before being told about it, an \`ignore\` flag plus \`AbortController\` in the cleanup, not reporting aborts as errors, a status model without contradictory booleans, and a follow-up discussion of debouncing, caching and TanStack Query.`,
  starter: searchStarter,
  solution: searchSolution,
  tests: searchTests,
  hints: [
    'Fetch in a `useEffect` that depends on `[trimmedQuery, fetchResults]`, and return early when the query is empty.',
    'Inside the effect: `let ignore = false; const controller = new AbortController();`. Pass `controller.signal` to the fetcher. In the cleanup, set `ignore = true` and call `controller.abort()`. Only call `setState` when `!ignore`.',
    'To make "results for the wrong query" impossible, store the response *tagged with its query*: `{ query, results } | { query, error: true }`. Then `loading = query !== "" && response?.query !== query` is derived, and there\'s no `isLoading` flag to keep in sync.',
  ],
  explanation: `**Two guards, two jobs.** The \`ignore\` flag guarantees correctness: once an effect's cleanup has run, that request's result is never applied, whatever order the promises settle in and whether or not the fetcher honours the signal. \`AbortController\` saves work: it cancels the request, and the resulting \`AbortError\` is silently dropped because \`ignore\` is already \`true\`.

**Derived loading state.** The reference solution stores the last accepted response *together with the query it belongs to* and derives everything else from it:

\`\`\`tsx
const current = trimmed && response?.query === trimmed ? response : null;
const loading = trimmed !== '' && current === null;
\`\`\`

This avoids calling \`setState({ status: 'loading' })\` synchronously at the top of the effect, which costs an extra render and gets flagged by newer versions of \`eslint-plugin-react-hooks\`. It also makes "showing results for the wrong query" unrepresentable. A \`status\` union set from the effect is a fine answer too, as long as you can say why you chose it.

**Why \`fetchResults\` is in the dependency array:** it's a prop, so it's a reactive value. The caller must pass a stable function (defined at module level or wrapped in \`useCallback\`), otherwise the effect re-runs on every render. State that contract out loud.

**Follow-ups you may get:**
- *"Reduce requests while typing."* Combine it with \`useDebouncedValue(query, 300)\` and depend on the debounced value. Debouncing doesn't remove the race, so the cleanup still matters.
- *"Cache results, so going back is instant."* Use a \`Map<query, results>\` in a ref or at module level. The real answer is TanStack Query or SWR, which give you caching, deduplication, retries and race safety.
- *"What does StrictMode do here?"* It mounts, cleans up and mounts again. The first request is aborted and ignored, so it's harmless.
- *"Make it an accessible combobox with keyboard navigation."* That's the autocomplete pattern (Day 9 a11y, Day 11 system design).`,
};

const stopwatch: Exercise = {
  id: 'react-stopwatch',
  title: 'Stopwatch: intervals, cleanup, functional updates',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 15,
  preview: true,
  tags: ['react', 'effects', 'timers', 'stale closures'],
  prompt: `Build a stopwatch (the default export is \`Stopwatch\`):

- \`<p role="timer">\` shows the elapsed time in seconds with one decimal: \`0.0s\`, \`1.5s\`, \`12.3s\`.
- One button reads **Start** while stopped and **Stop** while running. **Reset** stops the stopwatch and returns it to \`0.0s\`.
- Update at least every 100 ms. Stopping and then starting again resumes from the current time.
- There is never more than one interval at a time, and no interval keeps running after Stop or unmount.

The tests use fake timers, advance time inside \`act\`, and call \`vi.getTimerCount()\` to catch leaked or duplicate intervals.

**What the interviewer is looking for:** where the interval lives (an effect keyed on \`running\`, or a ref managed by handlers), the cleanup, functional updates so the interval callback never reads a stale \`elapsed\`, and awareness that \`setInterval\` drifts.`,
  starter: stopwatchStarter,
  solution: stopwatchSolution,
  tests: stopwatchTests,
  hints: [
    'State: `elapsedMs` and `running`. The button label is derived from `running`.',
    '`useEffect(() => { if (!running) return; const id = setInterval(…, 100); return () => clearInterval(id); }, [running])`. The cleanup handles Stop, Reset and unmount in one place.',
    'Inside the interval, use a functional update: `setElapsedMs(ms => ms + delta)`. For accuracy, measure `delta` with `Date.now()` instead of assuming exactly 100 ms passed.',
  ],
  explanation: `**Use an effect keyed on \`running\`.** Starting and stopping an interval is synchronization with an external system (the timer), driven by state. When \`running\` turns false (Stop or Reset) or the component unmounts, the cleanup clears the interval, so all three cases go through one code path. The alternative is an \`intervalRef\` managed by the Start/Stop handlers (see Lesson 3). It works, but then you must remember to clear the interval in Reset *and* on unmount, and to guard against starting twice.

**Use functional updates.** The interval callback is created once per start, so an \`elapsedMs\` read inside it would be stale (the stale closure bug). \`setElapsedMs(ms => ms + delta)\` always builds on the latest value.

**Drift.** \`setInterval(…, 100)\` doesn't fire exactly every 100 ms. A busy main thread delays callbacks, and background tabs throttle timers to about once a second or less. Measuring \`Date.now()\`/\`performance.now()\` deltas keeps the total accurate. A sturdier model stores \`startedAt\` and \`accumulatedMs\` and *derives* the display as \`accumulatedMs + (now - startedAt)\`. The interval then only forces re-renders.

**Follow-ups you may get:**
- *"Add laps."* Keep \`laps: number[]\` in state, append \`elapsedMs\` from a handler, and derive lap durations.
- *"Make the display smooth."* Run a \`requestAnimationFrame\` loop in the effect and cancel it in the cleanup.
- *"Why not \`setElapsedMs(elapsedMs + 100)\` with \`[running, elapsedMs]\` as dependencies?"* It works, but it tears down and recreates the interval on every tick and drifts more.
- *"Survive a page reload?"* Persist \`startedAt\` (a timestamp, not a count) to localStorage.`,
};

const standupBugs: Exercise = {
  id: 'fix-standup-board-bugs',
  title: 'Debug: stale interval, leaked timer, index keys',
  runtime: 'dom',
  difficulty: 'core',
  estMinutes: 12,
  preview: true,
  tags: ['react', 'debugging', 'stale closures', 'keys', 'effects', 'StrictMode'],
  prompt: `\`StandupBoard\` shows a meeting timer and one row per speaker. Each row has an **uncontrolled** notes \`<input>\` and a "Done" button. The component passed code review, but QA has filed three reports:

1. "The meeting timer gets stuck at **1s**."
2. "After I tick a speaker off, **the notes I typed jump to the wrong person**."
3. "In development the timer sometimes runs at **double speed**, and the interval keeps firing after the board is closed."

Find and fix every bug. Keep the notes inputs uncontrolled (making them controlled would hide bug 2 instead of fixing its cause), and keep the markup and labels as they are.

**What the interviewer is looking for:** in a debugging round, *narrate the diagnosis* before you type. Name each bug (stale closure, missing cleanup, index keys), explain the mechanism in React terms, then make the minimal fix. For a bonus, explain why StrictMode made bug 3 visible.`,
  starter: standupStarter,
  solution: standupSolution,
  tests: standupTests,
  hints: [
    'Bug 1: the interval callback was created during the first render. What value of `seconds` does it see, forever?',
    'Bug 3: what does the effect return? In development, StrictMode mounts, unmounts and mounts again, so a missing cleanup leaves two intervals running.',
    'Bug 2: an uncontrolled `<input>` keeps its value in the DOM node, and its `<li>` is matched by `key`. With `key={index}`, removing row 0 gives row 0\'s DOM to the next speaker. Use `key={speaker.id}`, and remove by id.',
  ],
  explanation: `**Bug 1: stale closure.** \`useEffect(…, [])\` runs once, so the interval callback closes over the first render's \`seconds\`, which is 0, forever. Every tick calls \`setSeconds(0 + 1)\`. The fix is a functional update, \`setSeconds(s => s + 1)\`. Adding \`seconds\` to the dependencies would also work, but it would recreate the interval every second.

**Bug 3: missing cleanup.** The effect never returned \`clearInterval\`, so the interval outlives the component. In development, StrictMode runs setup, cleanup, then setup again. With no cleanup that leaves two live intervals, hence double speed. The fix: \`const id = setInterval(…); return () => clearInterval(id);\`. The StrictMode symptom is a gift. The same leak would happen in production every time the board unmounted.

**Bug 2: index keys.** An uncontrolled input keeps its value in the DOM node, and React reuses DOM nodes by key. Remove Ada with \`key={index}\` and React keeps \`<li key=0>\` (Ada's DOM, including her input) and renders Grace's props into it, while the *last* \`<li>\` (Linus's input, with his notes) is removed. The fix is \`key={speaker.id}\`. Removing by id (\`prev.filter(s => s.id !== id)\`) is also sturdier than removing by index if the list can ever be reordered.

**Talk track:** symptom → mechanism → fix → prevention. The \`react-hooks/exhaustive-deps\` lint rule flags bug 1 (\`seconds\` is missing from the dependencies), and the right response is a functional update, not silencing the rule. StrictMode exposes bug 3. A lint rule (\`react/no-array-index-key\`) or a review checklist catches bug 2.`,
};

const counterTests: Exercise = {
  id: 'write-tests-counter',
  title: 'Write the tests: a bounded Counter',
  runtime: 'dom',
  difficulty: 'stretch',
  estMinutes: 12,
  mode: 'write-tests',
  tags: ['testing', 'react testing library', 'user-event', 'boundaries'],
  prompt: `Here's a finished \`Counter\` component. Import it with \`import { Counter } from './subject'\`.

\`\`\`tsx
<Counter initial={0} min={0} max={10} onChange={(value) => …} />
\`\`\`

- It shows \`Count: N\` and has three buttons: **Decrement**, **Increment** and **Reset**.
- Decrement is disabled at \`min\`, and Increment is disabled at \`max\` (both bounds inclusive).
- Reset returns the count to \`initial\`.
- \`onChange\` is called with the **new** value after every change.

Write React Testing Library tests that pass against the real component **and** catch three realistic bugs hidden in mutant versions of it. You won't see the mutants, so think about what a sloppy implementation could get wrong: boundaries, props versus hard-coded defaults, callbacks.

**What the interviewer is looking for:** user-centric queries (\`getByRole('button', { name: 'Increment' })\`), \`userEvent.setup()\` with \`await user.click(…)\`, \`vi.fn()\` for callbacks, tests of *boundaries* and not only the happy path, and one behaviour per test with a descriptive name. Day 13 covers testing strategy in depth.`,
  starter: counterTestsStarter,
  solution: counterTestsSolution,
  tests: '',
  subject: counterSubject,
  mutants: [
    { description: 'Increment\'s disabled check is off by one (`count > max`), so the count can reach max + 1.', code: counterMutantMax },
    { description: 'Reset hard-codes 0 instead of returning to the `initial` prop.', code: counterMutantReset },
    { description: '`onChange` receives the previous value (the stale `count` snapshot) instead of the new one.', code: counterMutantOnChange },
  ],
  hints: [
    'Render with props that make bugs observable, such as a non-zero `initial` and a small `max`.',
    'Boundary bugs hide at exactly `max`. Start one below it, click Increment, then assert the count *and* that the button is now disabled.',
    'For callbacks, use `const onChange = vi.fn()`, click, then `expect(onChange).toHaveBeenLastCalledWith(expectedNewValue)`. And test Reset starting from a non-zero `initial`.',
  ],
  explanation: `The three bugs: Increment's disabled check is off by one (\`count > max\`), so the count can reach \`max + 1\`. Reset hard-codes \`0\` instead of using \`initial\`. And \`onChange\` receives the previous value (\`count\`, a stale snapshot) instead of the new one.

**Patterns that catch them:**
- **Test the boundaries, not just the middle.** Start at \`max - 1\`, click up to \`max\`, assert that the button is disabled, then click once more to prove nothing changes.
- **Use non-default props.** With \`initial={0}\`, a Reset that hard-codes 0 still passes. \`initial={3}\` exposes it.
- **Assert callback arguments, not just calls.** \`toHaveBeenCalled()\` passes even with the stale-value bug. \`toHaveBeenLastCalledWith(3)\` doesn't.

**Style:** query by role and accessible name, the way users and screen readers find things. Prefer \`userEvent\` over \`fireEvent\`, because it simulates the whole interaction (pointer events, focus, disabled checks). Don't test implementation details such as internal state or class names.

**Follow-up:** *"Would you snapshot-test this?"* No. Snapshots assert markup rather than behaviour, and they tend to get rubber-stamped on update. Behavioural tests survive refactors.`,
};

const day: Day = {
  number: 5,
  title: 'React I: The Rendering Model',
  tagline: 'What renders, when, and why: snapshots, keys, minimal state, and effects that clean up after themselves.',
  summary:
    'Most React interview questions ("what causes a re-render?", "why not index keys?", "when does the cleanup run?", "how do you fetch safely?") are the same handful of rules seen from different angles. Today you learn the rendering model precisely: render vs commit, reconciliation, state snapshots, batching and StrictMode. You also learn how to design minimal state and how to use effects and refs correctly. Then you build the UI-round classics, with tests: a todo list, a debounced-value hook, a race-safe search, a stopwatch, and a bug hunt.',
  objectives: [
    'Explain render vs commit, and list exactly what triggers a re-render and what does not',
    'Predict reconciliation outcomes: type changes, position, keys, components defined inside components',
    'Explain why index keys break stateful lists, and use `key` deliberately to reset state',
    'Solve state-snapshot and batching puzzles, and know when updater functions are needed',
    'Design minimal state: derive values, avoid mirroring props, and decide where state lives',
    'Write effects with correct dependencies and cleanups, including race-safe data fetching',
    'Spot "you might not need an effect" cases, and use refs and useLayoutEffect appropriately',
    'Build a todo list, a debounced hook, a race-safe search and a stopwatch that pass their tests',
  ],
  skills: ['react', 'typescript', 'testing', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'review-days-1-4',
      title: 'Warm-up: spaced review',
      minutes: 15,
      intro:
        'Flashcards from Days 1–4. Watch for connections: closures and `Object.is` from Day 1 come back today as stale closures, state bail-outs and dependency arrays, and discriminated unions from Days 3–4 come back as request status.',
    },
    {
      kind: 'lesson',
      id: 'rendering-reconciliation',
      title: 'Rendering, reconciliation, keys & state snapshots',
      minutes: 40,
      body: renderingReconciliation,
      checks: [
        {
          id: 'props-change-cause',
          prompt: '`<Price amount={amount} />` re-rendered and now shows a new amount. What actually *caused* `Price` to re-render?',
          choices: [
            'React detected that the `amount` prop changed',
            'Its parent re-rendered (because of a state or context change) and created a new `<Price>` element',
            'The DOM text node changed, which triggered a render',
            '`Price` subscribes to its own props',
          ],
          answer: 1,
          explanation:
            'Props can only change because the **parent rendered** and created new elements, so the parent\'s render is the cause. React doesn\'t watch props. By default it re-renders every child of a rendering component whether or not its props changed. Props start to *matter* only with `memo`, which lets React **skip** a render when the props are shallow-equal. The DOM never triggers renders. The flow is always render → commit → DOM.',
        },
        {
          id: 'key-reset-form',
          prompt: 'Given `<EditProfileForm key={userId} userId={userId} />`, the user switches from user 1 to user 2. What happens to the form\'s local `useState` values?',
          choices: [
            'They are kept, because only the `userId` prop changed',
            'They reset to their initial values: a new key means a new instance (the old one unmounts and its effects clean up)',
            'React throws, because `key` is only allowed on list items',
            'They reset only if the component has a `useEffect` with `[userId]` that resets them',
          ],
          answer: 1,
          explanation:
            'A `key` is part of an element\'s identity at that position. Change it and React treats the element as a different thing, so it unmounts the old instance (running cleanups and discarding its state) and mounts a fresh one. `key` works on any element, not just in lists. This is the idiomatic replacement for a "reset state when a prop changes" effect, which would render once with stale state before the reset.',
        },
        {
          id: 'functional-updater-three',
          prompt: 'The button shows `0`. What does it show after one click?',
          code: `const [count, setCount] = useState(0);

function handleClick() {
  setCount((c) => c + 1);
  setCount((c) => c + 1);
  setCount(count + 1);
}`,
          codeLang: 'tsx',
          choices: ['3', '2', '1', '0'],
          answer: 2,
          explanation:
            'React processes the queue in order. The two updaters take 0 → 1 → 2. Then `setCount(count + 1)` queues a **value**, and `count` is this render\'s snapshot (0), so the value is 1. A value **replaces** whatever is pending, so the result is 1. To get 3, every call must be an updater.',
        },
        {
          id: 'strictmode-purpose',
          prompt: 'In development only, your "connect" log appears twice on mount, with a "disconnect" between them. What is the best response?',
          choices: [
            'Remove `<StrictMode>`, since it\'s a development-only annoyance',
            'Add a `useRef` flag so the effect body only runs once',
            'Nothing, as long as the cleanup fully undoes the setup. StrictMode is checking exactly that, and production runs the effect once',
            'Move the connection into the render body so it runs before effects',
          ],
          answer: 2,
          explanation:
            'StrictMode deliberately runs setup → cleanup → setup on mount in development to prove your cleanup is symmetrical. If connect/disconnect/connect leaves you with exactly one connection, the effect is correct. Removing StrictMode or adding a "has run" ref hides real bugs: missing cleanups also show up when components unmount and remount in production. Side effects in the render body are worse still, because renders must be pure and can run any number of times.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'designing-state',
      title: 'Designing state: minimal, derived, colocated, immutable',
      minutes: 30,
      body: designingState,
      checks: [
        {
          id: 'redundant-state-check',
          prompt: 'A product search component has this state. Which piece is redundant?',
          code: `const [products, setProducts] = useState<Product[]>([]);
const [query, setQuery] = useState('');
const [selectedId, setSelectedId] = useState<string | null>(null);
const [matchCount, setMatchCount] = useState(0);`,
          codeLang: 'tsx',
          choices: ['`products`', '`query`', '`selectedId`', '`matchCount`'],
          answer: 3,
          explanation:
            '`matchCount` can be computed during render: `products.filter((p) => matches(p, query)).length`. Storing it means every update path must keep it in sync, usually with an effect that causes an extra render and can disagree with the list. `products` and `query` are genuine sources of truth. `selectedId` is the *right* way to store a selection (an id, not a copy of the object).',
        },
        {
          id: 'nested-update-check',
          prompt: 'Which update correctly marks the todo with `id` as done?',
          choices: [
            '`setTodos(todos => { todos.find(t => t.id === id)!.done = true; return [...todos]; })`',
            '`setTodos(todos => todos.map(t => t.id === id ? { ...t, done: true } : t))`',
            '`setTodos(todos => { const copy = [...todos]; copy[todos.findIndex(t => t.id === id)].done = true; return copy; })`',
            '`todos.find(t => t.id === id)!.done = true; setTodos(todos)`',
          ],
          answer: 1,
          explanation:
            'Only the `map` version creates a new array **and** a new object for the changed todo. Options A and C make a new array, but spread is shallow: they mutate the todo object that the previous state (and any memoized row) still shares, so a `memo` row comparing `todo` props sees "no change" and the old snapshot is corrupted. Option D passes back the same array reference, so React bails out and nothing re-renders.',
        },
        {
          id: 'controlled-undefined-value',
          prompt: 'This input logs "A component is changing an uncontrolled input to be controlled" once the user loads. Why?',
          code: `const [user, setUser] = useState<User | null>(null);
// …user is fetched later
<input value={user?.name} onChange={(e) => setUser({ ...user!, name: e.target.value })} />`,
          codeLang: 'tsx',
          choices: [
            '`onChange` must be wrapped in `useCallback`',
            'While `user` is null, `value` is `undefined`, so the input is uncontrolled. When a string arrives it becomes controlled',
            'Inputs can\'t be bound to nested object properties',
            'The input needs a `defaultValue` as well as a `value`',
          ],
          answer: 1,
          explanation:
            'React treats `value={undefined}` as "no value prop", which makes the input uncontrolled. Once `user.name` is a string, it becomes controlled, and React warns because the source of truth switched. Fix it with `value={user?.name ?? \'\'}` so the input is always controlled. Passing both `value` and `defaultValue` is a different warning, and `useCallback` has nothing to do with it.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'effects-refs',
      title: 'Effects, cleanup, race conditions & refs',
      minutes: 35,
      body: effectsRefs,
      checks: [
        {
          id: 'effect-object-dep',
          prompt: 'What happens when this component mounts?',
          code: `function Results({ query }: { query: string }) {
  const [items, setItems] = useState<string[]>([]);
  const params = { q: query, limit: 20 };

  useEffect(() => {
    search(params).then(setItems);
  }, [params]);

  return <List items={items} />;
}`,
          codeLang: 'tsx',
          choices: [
            'It fetches once per change of `query`',
            'It fetches after every render, and since each response sets new state (a new array), it keeps fetching forever',
            'It fetches only on mount',
            'React warns and skips the effect, because objects can\'t be dependencies',
          ],
          answer: 1,
          explanation:
            '`params` is a new object on every render, and `Object.is` compares by reference, so the dependency "changes" every time. Each response calls `setItems` with a new array, which causes a re-render, which creates a new `params`, which runs the effect again: an endless request loop. Fix it by building `params` inside the effect and depending on `[query]` (or memoizing `params` with `useMemo`). React doesn\'t warn at runtime. Only the lint rule can help.',
        },
        {
          id: 'effect-cleanup-order',
          prompt: 'Without StrictMode, `Room` is rendered with `id="a"`, then re-rendered with `id="b"`, then unmounted. What is logged?',
          code: `function Room({ id }: { id: string }) {
  useEffect(() => {
    console.log('connect', id);
    return () => console.log('disconnect', id);
  }, [id]);
  return null;
}`,
          codeLang: 'tsx',
          choices: [
            'connect a, connect b, disconnect b',
            'connect a, disconnect a, connect b, disconnect b',
            'connect a, disconnect b, connect b, disconnect b',
            'connect a, connect b, disconnect a, disconnect b',
          ],
          answer: 1,
          explanation:
            'When `id` changes, React runs the **previous** effect\'s cleanup before the new setup. That cleanup closed over the old render\'s `id`, so it logs "disconnect a", not "disconnect b". The new setup then connects to b. On unmount, the latest cleanup runs ("disconnect b"). Cleanups always see the values from the render that created them.',
        },
        {
          id: 'fetch-race-fix',
          prompt: 'A profile page sometimes shows the wrong user when you click quickly between profiles. Which change fixes the bug *on its own*, even if the API client ignores `AbortSignal`?',
          choices: [
            'Add `userId` to the dependency array',
            'In the cleanup, set a local `ignore = true`, and only call `setState` when `!ignore`',
            'Wrap the fetch function in `useCallback`',
            'Switch to `useLayoutEffect` so the fetch starts sooner',
          ],
          answer: 1,
          explanation:
            'This is a race: an older request resolves after a newer one and overwrites it. The ignore flag makes every response from a superseded effect a no-op, whatever order the responses arrive in. Aborting is a good addition, but only helps if the client honours the signal. `userId` should already be a dependency (that\'s why the effect re-runs at all), `useCallback` changes nothing about ordering, and `useLayoutEffect` only changes *when* the request starts.',
        },
        {
          id: 'layout-effect-when',
          prompt: 'Which task genuinely calls for `useLayoutEffect` instead of `useEffect`?',
          choices: [
            'Fetching the user\'s profile on mount',
            'Measuring a popover\'s height and flipping it above its anchor before the user sees it',
            'Subscribing to a WebSocket',
            'Updating `document.title`',
          ],
          answer: 1,
          explanation:
            '`useLayoutEffect` runs after DOM mutations but **before paint**, and state set inside it re-renders synchronously, so a measure-then-adjust step never shows the wrong position. The other tasks don\'t depend on layout, so running them before paint would only delay the frame. Default to `useEffect`.',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'react-rendering-puzzles',
      title: 'Puzzles: renders, keys, batching & effect order',
      minutes: 15,
      intro:
        'Interviewers love "what does the screen show?" questions. Commit to an answer before you reveal it, and trace the model out loud: snapshot → queue → render → commit → effects. All answers were verified against React 19.',
      questions: [
        {
          id: 'snapshot-triple-set',
          prompt: 'What does the button show after it has been clicked **twice**?',
          code: `function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return <button onClick={handleClick}>{count}</button>;
}`,
          codeLang: 'tsx',
          choices: ['2', '6', '3', '1'],
          answer: 0,
          explanation:
            'Within one click, all three calls compute `count + 1` from the same snapshot, so each click adds exactly 1: the first click gives 0 → 1 and the second gives 1 → 2. "6" assumes each call sees the previous call\'s result, which only happens with updater functions (`setCount(c => c + 1)`).',
        },
        {
          id: 'updater-then-value',
          prompt: 'Starting from 0, what is `count` after one click?',
          code: `const [count, setCount] = useState(0);

function handleClick() {
  setCount((c) => c + 1);
  setCount(count + 10);
  setCount((c) => c * 2);
}`,
          codeLang: 'tsx',
          choices: ['2', '11', '20', '22'],
          answer: 2,
          explanation:
            'The queue is processed in order: `c => c + 1` gives 1, then the **value** `count + 10` (the snapshot 0 + 10 = 10) **replaces** it, then `c => c * 2` doubles the pending 10 to 20. "22" forgets that a plain value replaces whatever came before. "11" ignores the last updater.',
        },
        {
          id: 'log-after-set',
          prompt: 'What is logged after one click?',
          code: `function Greeting() {
  const [name, setName] = useState('Ada');

  function handleClick() {
    setName('Grace');
    console.log(name);
    setTimeout(() => console.log(name), 1000);
  }

  return <button onClick={handleClick}>{name}</button>;
}`,
          codeLang: 'tsx',
          choices: ['Ada, then Grace', 'Grace, then Grace', 'Ada, then Ada', 'undefined, then Grace'],
          answer: 2,
          explanation:
            '`name` is a constant in this render\'s closure. `setName` schedules a new render, where a *new* `name` will be `"Grace"`, but it can never change the variable this handler closed over. The timeout callback was created in the same render, so it sees "Ada" too, even a second later. The button does show "Grace". This is "state as a snapshot", not "setState is async".',
        },
        {
          id: 'async-batching-renders',
          prompt: 'In React 19, how many times is "render" logged after one click (not counting the initial mount)? `fetchUser` resolves successfully.',
          code: `function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  console.log('render');

  async function load() {
    setLoading(true);
    const data = await fetchUser();
    setUser(data);
    setLoading(false);
    setError(null);
  }

  return <button onClick={load}>Load</button>;
}`,
          codeLang: 'tsx',
          choices: ['1', '2', '3', '4'],
          answer: 1,
          explanation:
            '`setLoading(true)` is flushed at the end of the click handler\'s synchronous part (render #1). After the `await`, the three updates run in the same continuation, and React 18+ **batches them automatically** into one render (#2). In React 17, updates after an `await` weren\'t batched, so each one that changed state rendered separately. One render for all three is the "automatic batching" headline feature.',
        },
        {
          id: 'children-prop-bailout',
          prompt: 'After mount (no StrictMode), the user clicks the button once. What is logged?',
          code: `function Child() {
  console.log('Child');
  return <p>child</p>;
}

function Leaf() {
  console.log('Leaf');
  return <p>leaf</p>;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const [n, setN] = useState(0);
  console.log('Wrapper');
  return (
    <div>
      <button onClick={() => setN(n + 1)}>{n}</button>
      <Child />
      {children}
    </div>
  );
}

function App() {
  return (
    <Wrapper>
      <Leaf />
    </Wrapper>
  );
}`,
          codeLang: 'tsx',
          choices: ['Wrapper, Child, Leaf', 'Wrapper, Child', 'Wrapper', 'App, Wrapper, Child, Leaf'],
          answer: 1,
          explanation:
            '`Wrapper`\'s state changed, so it re-renders, and `<Child />` is a **new element created by Wrapper**, so Child re-renders too (no props needed). `<Leaf />` was created by **App**, which didn\'t re-render, so `children` is the *same element object* as last time and React skips it. This is the "lift content up / pass children" optimisation, and it\'s why "props didn\'t change" is not what decides re-renders.',
        },
        {
          id: 'index-key-uncontrolled-input',
          prompt: 'The user types "hi" into **Ada\'s** input, then clicks "Remove first". What is on screen?',
          code: `function Row({ label }: { label: string }) {
  return (
    <li>
      {label} <input />
    </li>
  );
}

function List() {
  const [items, setItems] = useState(['Ada', 'Grace', 'Linus']);
  return (
    <>
      <ul>
        {items.map((item, i) => (
          <Row key={i} label={item} />
        ))}
      </ul>
      <button onClick={() => setItems(items.slice(1))}>Remove first</button>
    </>
  );
}`,
          codeLang: 'tsx',
          choices: [
            'Grace [ ] and Linus [ ]: Ada\'s text left with Ada',
            'Grace [hi] and Linus [ ]: Ada\'s typed text now sits next to Grace',
            'Grace [ ] and Linus [hi]',
            'Ada [hi] and Grace [ ]: nothing was removed',
          ],
          answer: 1,
          explanation:
            'With index keys, the new list `[Grace, Linus]` has keys 0 and 1. React keeps the instances (and DOM) for keys 0 and 1, gives them the new labels, and removes key 2, which was Linus\'s original row. The `<input>` in row 0 is still Ada\'s DOM node holding "hi", now labelled Grace. With `key={item}` (or an id), Ada\'s row and its input would be removed.',
        },
        {
          id: 'same-position-state-preserved',
          prompt: 'The user clicks "A: 0" three times, then clicks "Switch". What does the first button show?',
          code: `function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{label}: {count}</button>;
}

function App() {
  const [showB, setShowB] = useState(false);
  return (
    <div>
      {showB ? <Counter label="B" /> : <Counter label="A" />}
      <button onClick={() => setShowB((s) => !s)}>Switch</button>
    </div>
  );
}`,
          codeLang: 'tsx',
          choices: ['B: 0', 'B: 3', 'A: 3', 'A: 0'],
          answer: 1,
          explanation:
            'Both branches render the **same component type at the same position**, so React keeps the existing instance and just passes a new `label`. State belongs to the instance, so the count stays 3. To reset it, give the two branches different keys (`key="A"` / `key="B"`) or render them in different positions (`{showB && …}{!showB && …}`).',
        },
        {
          id: 'component-defined-inside',
          prompt: 'The user clicks into the input and types "Ada". What happens?',
          code: `function Form() {
  const [name, setName] = useState('');

  function NameInput() {
    return <input value={name} onChange={(e) => setName(e.target.value)} />;
  }

  return <NameInput />;
}`,
          codeLang: 'tsx',
          choices: [
            'The input shows "Ada". It works, just inefficiently',
            'The input shows "A" and has lost focus, because each render creates a new `NameInput` type and React remounts the `<input>`',
            'The input stays empty because `name` is a stale closure',
            'React throws: components can\'t be declared inside components',
          ],
          answer: 1,
          explanation:
            'Typing "A" updates state, `Form` re-renders, and `NameInput` is a brand-new function, which to React is a different component **type**. Different type at the same position means unmount and remount, so the new `<input>` shows "A" but isn\'t focused, and "da" goes nowhere. React doesn\'t throw; it just can\'t preserve anything. Define components at module level.',
        },
        {
          id: 'effect-order-mount',
          prompt: 'In what order are these logged on mount (no StrictMode)?',
          code: `function Child() {
  console.log('render Child');
  useLayoutEffect(() => console.log('layout Child'));
  useEffect(() => console.log('effect Child'));
  return null;
}

function Parent() {
  console.log('render Parent');
  useLayoutEffect(() => console.log('layout Parent'));
  useEffect(() => console.log('effect Parent'));
  return <Child />;
}`,
          codeLang: 'tsx',
          choices: [
            'render Parent, render Child, layout Child, layout Parent, effect Child, effect Parent',
            'render Parent, layout Parent, effect Parent, render Child, layout Child, effect Child',
            'render Parent, render Child, layout Parent, layout Child, effect Parent, effect Child',
            'render Parent, render Child, layout Child, effect Child, layout Parent, effect Parent',
          ],
          answer: 0,
          explanation:
            'Rendering goes top-down (Parent calls into Child). Effects run **after the whole tree commits**, children first, because a child finishes before its parent. All layout effects run (synchronously, before paint) before any passive effect. "Parent effects first" is the most common wrong answer.',
        },
        {
          id: 'strictmode-effect-sequence',
          prompt: 'In development inside `<StrictMode>`, `Room` mounts with `id="a"` and then re-renders with `id="b"`. What is logged?',
          code: `function Room({ id }: { id: string }) {
  useEffect(() => {
    console.log('connect', id);
    return () => console.log('disconnect', id);
  }, [id]);
  return null;
}`,
          codeLang: 'tsx',
          choices: [
            'connect a, connect b',
            'connect a, disconnect a, connect b',
            'connect a, disconnect a, connect a, disconnect a, connect b',
            'connect a, connect a, disconnect a, connect b, connect b',
          ],
          answer: 2,
          explanation:
            'On **mount**, StrictMode runs setup → cleanup → setup: "connect a, disconnect a, connect a". The update to `b` is a normal dependency change: the cleanup for a, then the setup for b. StrictMode\'s extra cycle only happens on mount, not on every update. In production you\'d see "connect a, disconnect a, connect b".',
        },
        {
          id: 'deps-object-every-render',
          prompt: 'The parent mounts `<Search query="react" />`, then re-renders 3 times, passing the same query each time. How many times is "fetch" logged (no StrictMode)?',
          code: `function Search({ query }: { query: string }) {
  const options = { query, limit: 10 };

  useEffect(() => {
    console.log('fetch');
  }, [options]);

  return null;
}`,
          codeLang: 'tsx',
          choices: ['1', '2', '4', 'Infinitely'],
          answer: 2,
          explanation:
            '`options` is a new object on every render, and dependencies are compared with `Object.is` (by reference), so the effect runs after the mount and after each of the 3 re-renders: 4 times. It isn\'t infinite, because this effect doesn\'t set state. Fix it with `[query]`, building the object inside the effect.',
        },
        {
          id: 'ref-does-not-render',
          prompt: 'The user clicks the first button 3 times, then clicks "Refresh". What does the first button\'s label say after the 3 clicks, and after Refresh?',
          code: `function Clicker() {
  const clicks = useRef(0);
  const [, setTick] = useState(0);
  return (
    <>
      <button onClick={() => { clicks.current += 1; }}>Clicked {clicks.current} times</button>
      <button onClick={() => setTick((t) => t + 1)}>Refresh</button>
    </>
  );
}`,
          codeLang: 'tsx',
          choices: ['3, then 3', '0, then 0', '0, then 3', '1, then 4'],
          answer: 2,
          explanation:
            'Mutating `ref.current` doesn\'t trigger a render, so the label stays "Clicked 0 times" even though the ref holds 3. "Refresh" causes a render, and that render reads the current ref value, 3. That\'s why reading refs during render is discouraged: the UI only *accidentally* reflects them. If it\'s shown on screen, it should be state.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'react-ui-builds',
      title: 'Build it: UI-round classics',
      minutes: 65,
      intro:
        'Interview conditions: set a timer for each exercise, talk out loud, no AI. **Before coding a component, say your state design out loud**: what\'s state, what\'s derived, where it lives. Do the warm-up and the four core exercises in order. The write-tests exercise is a stretch, so do it if you have time or save it for Day 13. Open the preview for the visual ones and try to break them (type fast, click fast, delete while filtered).',
      exercises: [debouncedValue, todoList, searchRace, stopwatch, standupBugs, counterTests],
    },
    {
      kind: 'drill',
      id: 'speak-aloud-react-rendering',
      title: 'Speak-aloud drill: React rendering',
      minutes: 15,
      intro:
        'Answer out loud in 60–120 seconds before revealing each model answer. For the UI-build question, spend 3–4 minutes talking through state, structure and edge cases as if you were at a whiteboard. Lead with the one-sentence answer and grade yourself honestly.',
    },
  ],
  flashcards: [
    { id: 'render-vs-commit', front: '**Render** vs **commit** in React?', back: 'Render: React calls your components to compute the new element tree. It\'s pure and may happen more than once. Commit: React applies the minimal DOM changes, attaches refs and runs layout effects. Passive effects run after.' },
    { id: 'rerender-triggers', front: 'What makes a component re-render?', back: 'Its **state** changes, its **parent** re-renders, a **context** it reads changes, or an **external store** it subscribes to changes. "Props changed" is a consequence of the parent rendering, never the cause.' },
    { id: 'element-vs-instance', front: 'React **element** vs component **instance**?', back: 'Element: an immutable description, `{ type, props, key }`, created by JSX. Instance (fiber): React\'s record for a component at a position in the tree, holding its state, hooks and effects.' },
    { id: 'reconcile-type-change', front: 'What happens when the element **type** at a position changes (`<div>` → `<section>`, `<A>` → `<B>`)?', back: 'React unmounts the whole old subtree (state destroyed, effects cleaned up, DOM removed) and mounts the new one from scratch.' },
    { id: 'component-inside-component', front: 'Why never define a component inside another component?', back: 'Each render creates a new function, which is a new component **type**, so React remounts it on every render. State is lost and inputs lose focus after each keystroke.' },
    { id: 'index-key-bug', front: 'What actually breaks with `key={index}`?', back: 'State attaches to **positions** instead of items. After a reorder, insert or delete, `useState`, uncontrolled input values and focus end up on the wrong row. Correctness first, performance second.' },
    { id: 'key-reset-state', front: 'How do you reset a component\'s state when an id prop changes?', back: 'Give it `key={id}`. A new key means a new instance, which mounts with its initial state. No reset effect needed.' },
    { id: 'state-snapshot', front: '`setCount(count + 1)` three times in one handler. What\'s the result?', back: '+1. `count` is this render\'s constant snapshot, so every call computes the same value. `setCount(c => c + 1)` three times gives +3.' },
    { id: 'automatic-batching-react18', front: 'What is automatic batching (React 18+)?', back: 'Updates in the same event, promise continuation, timeout or native listener are flushed in **one** re-render. React 17 batched only inside React event handlers. `flushSync` is the escape hatch.' },
    { id: 'strictmode-dev-checks', front: 'What does `<StrictMode>` do in development?', back: 'It double-invokes renders, initializers, updaters and reducers, and runs mount effects (and, in React 19, ref callbacks) setup → cleanup → setup, to expose impure renders and missing cleanups. It does nothing in production.' },
    { id: 'derived-values-in-render', front: 'Where should values you can compute from props/state live?', back: 'Nowhere. Compute them during render (with `useMemo` only if it\'s measurably expensive). Storing them in state and syncing with an effect means extra renders and contradictions.' },
    { id: 'usestate-initial-once', front: 'Why is `useState(props.value)` a trap?', back: 'The argument is only read on **mount**, so later prop changes are ignored. Use the prop directly, rename it `initialValue`, reset with a `key`, or lift the state up.' },
    { id: 'controlled-vs-uncontrolled-input', front: 'Controlled vs uncontrolled input?', back: 'Controlled: React state is the source of truth (`value` + `onChange`). Uncontrolled: the DOM is (`defaultValue`, read it via a ref or `FormData`). Never let `value` flip between `undefined` and a string.' },
    { id: 'spread-is-shallow', front: 'Is `[...todos]` enough to update one todo immutably?', back: 'No. Spread is **shallow**, so the todo objects are still shared. Copy the changed item too: `todos.map(t => t.id === id ? { ...t, done: true } : t)`.' },
    { id: 'effect-deps-object-is', front: 'How are effect dependencies compared, and why do object deps re-run every render?', back: 'Each one is compared with `Object.is` against the previous render\'s value. Objects and functions created during render are new references every time, so the effect always runs.' },
    { id: 'effect-cleanup-timing', front: 'When does an effect\'s cleanup run?', back: '**Before the effect re-runs** (with the previous render\'s values) and **on unmount**, plus once extra on mount under StrictMode in development.' },
    { id: 'effect-mount-order', front: 'On mount, do parent or child effects run first?', back: '**Child first.** Rendering is parent → child, but effects run once the tree has committed, children before parents. All layout effects run before any `useEffect`.' },
    { id: 'fetch-race-pattern', front: 'What\'s the race-safe pattern for fetching in an effect?', back: '`let ignore = false` plus an `AbortController`. Set state only if `!ignore`. The cleanup sets `ignore = true` and calls `abort()`. The flag gives correctness, and abort saves wasted work.' },
    { id: 'useref-vs-usestate', front: '`useRef` vs `useState`?', back: 'Both persist across renders. Changing a ref does **not** re-render, and its value is live rather than a snapshot. Use refs for DOM nodes, timer ids and the like, and don\'t read or write them during render.' },
    { id: 'uselayouteffect-when', front: 'When should you use `useLayoutEffect`?', back: 'When you must measure layout and adjust **before the browser paints** (tooltips, popovers) to avoid a flicker. It blocks paint, so default to `useEffect`.' },
  ],
  interviewQuestions: [
    {
      id: 'what-causes-rerender',
      kind: 'concept',
      question: 'What causes a React component to re-render?',
      answer: `**One-liner:** a component re-renders when its own state changes, when its parent re-renders, or when a context or external store it reads changes. Props changing is never the cause on its own.

**The detail:**
- **State:** a \`useState\` setter or \`useReducer\` dispatch with a value that isn't \`Object.is\`-equal to the current one. If it's equal, React bails out.
- **Parent:** by default, when a component renders, React renders all its children recursively, whether or not their props changed. Props only change *because* the parent rendered.
- **Context:** consumers re-render when the provider's \`value\` changes by reference, even through a memoized parent.
- **External stores** via \`useSyncExternalStore\`. That's how Redux and Zustand trigger renders.

**What doesn't cause one:** mutating a ref, mutating state in place (same reference, so React bails out), or reassigning ordinary variables.

**The nuance that shows depth:** a render isn't a DOM update. React calls the function, diffs the result, and commits only what changed. To avoid unnecessary renders I restructure first: move state down, or pass expensive subtrees as \`children\` so they keep the same element reference. Only after profiling would I reach for \`memo\` with stable props.`,
      followUps: ['What does `React.memo` change about this?', 'Why does a context value object cause re-renders, and how do you fix it?', 'How do you find out why a component re-rendered?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'reconciliation-and-keys',
      kind: 'concept',
      question: 'Explain reconciliation. What role do keys play?',
      answer: `**One-liner:** reconciliation is how React compares the new render's element tree with the previous one to decide which instances to keep, update or recreate. Keys are how it matches children in a list.

**The heuristics (O(n) instead of O(n³)):**
1. A **different type** at the same position: unmount the old subtree (state lost, effects cleaned up) and mount a new one.
2. The **same type** at the same position: keep the instance and its state, and update props or DOM attributes.
3. **Lists** are matched by \`key\`, or by index when there are no keys.

**Keys** give an item its identity among its siblings. With stable keys, React can tell that an item moved, was inserted or was removed, and keep each item's state and DOM attached to it. Keys must be unique among siblings and stable across renders, ideally an id from the data. Never generate them during render.

**Two consequences worth mentioning:** state is tied to *type plus position*, so conditionally rendering the same component in the same slot keeps its state, and changing a \`key\` on purpose resets a component. That's the clean way to reset a form when the selected user changes. Also, defining a component inside another component creates a new type every render, so it remounts every time. That's the classic "input loses focus on every keystroke" bug.`,
      followUps: ['What happens if two siblings have the same key?', 'Why is `key={Math.random()}` bad?', 'How would you reset a component\'s state when a prop changes?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'why-not-index-keys',
      kind: 'concept',
      question: 'Why shouldn\'t you use the array index as a key?',
      answer: `**One-liner:** an index identifies a *position*, not an item. When the list is reordered or filtered, or something is inserted or removed anywhere but the end, state attached to a position lands on the wrong item.

**The mechanism:** React matches old and new children by key. With index keys, deleting the first of three rows leaves keys 0 and 1 in place, so React keeps those two instances, gives them the props of the items now at those positions, and removes the instance with key 2. Anything stored in those instances (\`useState\`, an uncontrolled input's typed value, focus, scroll position, a CSS transition) stays with its position and appears to jump to another item. The bug is about correctness first.

**Performance comes second:** with index keys, inserting at the top changes every row's props, so every row re-renders and React patches every row's DOM instead of inserting one node.

**When it's acceptable:** a static list that's never reordered or filtered, only appended to, with stateless rows. Even then, a real id costs nothing.

**What I use:** ids from the data, or ids created once when the item is created (\`crypto.randomUUID()\` in the add handler), never ids generated during render.`,
      followUps: ['Show me a concrete bug that index keys cause.', 'What if the data has no ids?', 'Is `key={item.name}` OK?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'controlled-vs-uncontrolled-inputs',
      kind: 'concept',
      question: 'What\'s the difference between controlled and uncontrolled inputs? When would you use each?',
      answer: `**One-liner:** in a controlled input, React state is the source of truth (\`value\` + \`onChange\`). In an uncontrolled input, the DOM is (\`defaultValue\`, read through a ref or \`FormData\`).

**Controlled:** every keystroke goes through state, so I can validate or format as the user types, disable submit until the form is valid, derive other UI from the value, and reset or prefill it from code. The cost is one re-render of the owning component per keystroke, which is fine for typical forms.

**Uncontrolled:** less code and no re-render per keystroke. It's great for simple forms read on submit, especially with React 19 form actions, where \`<form action={fn}>\` hands you \`FormData\` and resets the fields afterwards. File inputs are always uncontrolled. Libraries like react-hook-form use uncontrolled inputs plus refs for performance.

**Gotchas:** \`value\` without \`onChange\` makes the field read-only. A \`value\` that starts as \`undefined\` and later becomes a string flips the input from uncontrolled to controlled, and React warns, so I write \`value ?? ''\`.

**The same idea applies to components:** an API is controlled when the parent owns the state (\`<Tabs value onChange>\`) and uncontrolled when the component manages it (\`<Tabs defaultValue>\`). Good reusable components often support both.`,
      followUps: ['How would you build a component that supports both controlled and uncontrolled use?', 'What does React 19 change about forms?', 'Why do form libraries prefer uncontrolled inputs?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'useeffect-lifecycle-cleanup',
      kind: 'concept',
      question: 'Walk me through how `useEffect` works. When does it run, and when does the cleanup run?',
      answer: `**One-liner:** an effect synchronizes a component with an external system. React runs the setup after the commit, and runs the cleanup before re-running the effect and on unmount.

**Timing:** after React commits DOM changes, layout effects run synchronously before paint, then the browser paints, then \`useEffect\` setups run. On mount, child effects run before parent effects.

**Dependencies:** with no array, it runs after every commit. With \`[]\`, once after mount. With \`[a, b]\`, whenever a dependency changed according to \`Object.is\`. The array isn't a scheduling knob. It lists every reactive value the effect reads, and the lint rule enforces that. Objects and functions created during render are new every time, so I move them inside the effect or depend on primitives.

**Cleanup:** it runs before the next setup, with the *previous* render's values (so it disconnects from the old room), and on unmount. On an update, all cleanups run before any new setups. In development, StrictMode also runs setup, cleanup, setup on mount to prove the cleanup is symmetrical.

**I'd add:** I think per effect, not per lifecycle ("while this component shows room X, stay connected to room X"). And most logic doesn't need an effect at all: derived data is computed during render, and user-triggered logic belongs in event handlers.`,
      followUps: ['What is the difference between useEffect and useLayoutEffect?', 'Why is my effect running in an infinite loop?', 'How do you read the latest value in an effect without re-running it?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'fetch-in-effect-safely',
      kind: 'debugging',
      question: 'Our search page sometimes shows results for an older query. How would you fetch data in an effect safely?',
      answer: `**One-liner:** that's a race condition, where responses arrive out of order. The fix is a cleanup that marks the previous request as stale (an \`ignore\` flag) and aborts it.

**Why it happens:** each keystroke starts a request, and nothing guarantees they resolve in order. If the response for "r" arrives after the one for "re", a naive \`.then(setResults)\` overwrites the newer results.

**The pattern:** inside the effect, declare \`let ignore = false\` and \`const controller = new AbortController()\`. Pass \`controller.signal\` to \`fetch\`, and only call \`setState\` when \`!ignore\`. The cleanup sets \`ignore = true\` and calls \`controller.abort()\`. Aborting saves bandwidth, while the flag guarantees correctness even if the client ignores the signal or the response is already being processed. An aborted request rejects with an \`AbortError\`, which must not be shown as an error. This also makes StrictMode's double mount harmless.

**Also:** I'd model status as a union (\`idle | loading | success | error\`) instead of booleans, debounce the input to cut the number of requests (that reduces races but doesn't remove them), and check \`res.ok\`, since \`fetch\` only rejects on network errors.

**The bigger picture:** effect-based fetching has no caching, deduplication, retries or SSR, and it creates waterfalls. In production I'd use the framework's data loading or TanStack Query, which handle all of that. But I want to be able to write the effect version correctly.`,
      followUps: ['Why do you need the ignore flag if you already abort?', 'How would you add caching?', 'What happens under StrictMode?'],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'strictmode-double-invoke',
      kind: 'concept',
      question: 'Why does React run my components and effects twice in development?',
      answer: `**One-liner:** that's StrictMode, a development-only stress test. It double-invokes renders and runs mount effects as setup, cleanup, setup, to surface impure renders and missing cleanups before users hit them.

**What it does:** it calls component functions, state initializers, updater functions and reducers twice and discards one result, so an impure render (mutating a prop, pushing to a module-level array) behaves differently and you notice. It runs each effect's setup, its cleanup, then the setup again on mount, so if you subscribed without unsubscribing, you now have two subscriptions. React 19 does the same for ref callbacks. None of this happens in production.

**Why it exists:** React reserves the right to render more than once (concurrent rendering can throw work away) and to unmount and remount components while keeping their state. Fast Refresh does this, and so does \`<Activity>\` in React 19.2. Code that passes StrictMode is resilient to all of that.

**What I do about it:** fix the root cause, by adding the missing cleanup or making the render pure. I don't remove StrictMode or add a "has run" ref, because that hides a real bug. The one legitimate exception is genuinely once-per-app-load work, such as initializing analytics, which belongs at module level.`,
      followUps: ['My fetch runs twice in development. Is that a problem?', 'Does StrictMode affect production builds?', 'What kinds of bugs has StrictMode found for you?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'derived-state-anti-pattern',
      kind: 'concept',
      question: 'What\'s wrong with copying props into state, or keeping derived values in sync with an effect?',
      answer: `**One-liner:** it creates two sources of truth that drift apart. Derived data should be computed during render, and props should be used directly.

**Copying props:** \`useState(props.color)\` only reads the prop on mount, so later changes are ignored. The usual "fix", an effect that calls \`setColor(props.color)\`, adds an extra render, shows a stale frame first, and still conflicts if the user has edited the value.

**Syncing derived values:** storing \`filteredTodos\` or \`fullName\` in state and updating them in effects means every update path has to remember to keep them in sync, and they can contradict their source.

**What I do instead:**
- Compute it during render: \`const visible = todos.filter(…)\`. If it's genuinely expensive, use \`useMemo\`, after measuring rather than assuming.
- If the prop is just a starting value, name it \`initialColor\` and let the component own the state.
- If the state should reset when an identity changes, use \`key={userId}\`.
- If parent and child both need to change it, lift the state up and make the child controlled.

**Why interviewers care:** it's the most common cause of "the UI shows stale data" bugs, and it's on the "You might not need an effect" list along with event logic in effects and chains of effects.`,
      followUps: ['When is storing a derived value in state justified?', 'How would you reset some, but not all, state when a prop changes?', 'What does useMemo give you over computing in render?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'state-as-snapshot',
      kind: 'concept',
      question: 'Why does `console.log(count)` right after `setCount(count + 1)` print the old value? And what do three `setCount(count + 1)` calls do?',
      answer: `**One-liner:** state is a snapshot. Each render gets its own constant \`count\`, and \`setCount\` doesn't change it. It queues an update and schedules a new render.

**So:** the log prints the old value because \`count\` is a \`const\` captured by this render's closure. It isn't about setState being "asynchronous" like a promise. Even if React re-rendered instantly, this function's \`count\` would never change. Three \`setCount(count + 1)\` calls all compute \`0 + 1\`, so the result is 1.

**Updater functions:** \`setCount(c => c + 1)\` queues a function. On the next render React processes the queue in order: values replace the pending state, and functions receive it. So three updaters give 3. I use updaters when the next state depends on the previous one and I'm queuing several updates, or when I'm in a closure that might be stale: intervals, effects with \`[]\` dependencies, callbacks after an \`await\`.

**Batching:** since React 18, updates in the same event, promise continuation or timeout are batched into one render. Batching doesn't change the snapshot, so every line of the handler still sees the same \`count\`.

**The connection:** this is also the stale-closure bug. An interval created on the first render reads the first render's snapshot forever.`,
      followUps: ['What does `setCount(count + 5); setCount(c => c + 1)` give?', 'When do you need flushSync?', 'How is this different from class component setState?'],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'build-todo-list-ui',
      kind: 'ui-build',
      question: 'Build a todo list in about 30 minutes: add, toggle, delete, filter All/Active/Completed, and show how many items are left. Walk me through your component and state design as you go.',
      answer: `**Clarify first (1–2 minutes):** persistence? Editing? Accessibility requirements? I'd assume in-memory, no editing, accessible markup, and say those assumptions out loud.

**State (stated before I code):** three pieces. \`todos: Todo[]\` with \`{ id, text, done }\`, \`draft: string\` for the controlled input, and \`filter: 'all' | 'active' | 'completed'\`. Everything else is derived during render: \`visibleTodos\` and \`activeCount\`. I deliberately *don't* store the filtered list or the count, so there's nothing to sync and nothing to contradict.

**Where it lives:** \`todos\` and \`filter\` go in \`TodoApp\`, because the list, the counter and the filter buttons all need them. As it grows I'd extract \`TodoForm\` (which owns \`draft\`, colocated, and calls \`onAdd(text)\`), \`TodoItem\` and \`FilterBar\`, passing data down and callbacks up. If the filter should survive reloads or be shareable, it moves to the URL.

**Updates:** immutable and functional. Add with \`prev => [...prev, todo]\`, toggle with \`map\` plus spread, delete with \`filter\`. Ids are created once in the add handler (\`crypto.randomUUID()\`), never from the index or the length, and used as keys, so deleting or filtering never moves per-row state to the wrong item.

**Markup and a11y:** a real \`<form onSubmit>\` with \`preventDefault\` gives Enter-to-submit. The input gets a \`<label>\`, each checkbox sits inside a label with the todo's text, delete buttons get names like "Delete Buy milk", and filter buttons use \`aria-pressed\`. I trim the input and ignore blanks.

**Verify:** I'd walk through the edge cases out loud (empty input, deleting while filtered, completing the last active item) and mention Testing Library tests that query by role.

**Extensions if there's time:** localStorage persistence with lazy initial state and an effect that writes on change; "clear completed" and "toggle all"; inline editing, where stable keys really matter; virtualization and memoized rows for thousands of items.`,
      followUps: ['How would you persist todos to localStorage?', 'How would you add inline editing?', 'How would you test this?', 'What changes if the todos come from an API?'],
      minutes: 5,
      level: 'core',
    },
  ],
};

export default day;
