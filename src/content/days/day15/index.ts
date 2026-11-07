import type { Day, Exercise } from '../../types';

import performInTheLoop from './lessons/perform-in-the-loop.md?raw';
import behaviouralStoryBank from './lessons/behavioural-story-bank.md?raw';
import labFullMockLoop from './lessons/lab-full-mock-loop.md?raw';

import classNamesStarter from './exercises/class-names/starter.ts?raw';
import classNamesSolution from './exercises/class-names/solution.ts?raw';
import classNamesTests from './exercises/class-names/tests.ts?raw';
import flattenStarter from './exercises/flatten/starter.ts?raw';
import flattenSolution from './exercises/flatten/solution.ts?raw';
import flattenTests from './exercises/flatten/tests.ts?raw';
import emitterStarter from './exercises/event-emitter/starter.ts?raw';
import emitterSolution from './exercises/event-emitter/solution.ts?raw';
import emitterTests from './exercises/event-emitter/tests.ts?raw';
import deepCloneStarter from './exercises/deep-clone/starter.ts?raw';
import deepCloneSolution from './exercises/deep-clone/solution.ts?raw';
import deepCloneTests from './exercises/deep-clone/tests.ts?raw';

const classNames: Exercise = {
  id: 'final-class-names',
  title: 'classNames(...args)',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 5,
  tags: ['recursion', 'react', 'utilities', 'typescript'],
  prompt: `Implement \`classNames(...args)\`, the small utility behind the \`classnames\` and \`clsx\` packages that nearly every React codebase uses for conditional classes.

\`\`\`ts
classNames('btn', isPrimary && 'btn--primary', { 'btn--disabled': disabled }, ['icon', size === 'sm' && 'icon--sm']);
// e.g. → 'btn btn--primary icon icon--sm'
\`\`\`

Rules:
- Strings and non-zero numbers are included.
- Falsy values (\`false\`, \`null\`, \`undefined\`, \`0\`, \`''\`, \`NaN\`) and \`true\` are skipped.
- Objects contribute each **own** key whose value is truthy.
- Arrays are flattened recursively, to any depth.
- The output uses single spaces, with no leading or trailing whitespace. Duplicates are kept (as in \`clsx\`), so don't spend time deduplicating.

**What the interviewer is looking for:** a clean recursive walk that joins once at the end, correct truthiness (\`0\` is skipped but \`'0'\` is kept), iterating own keys only, and a recursive \`ClassValue\` type. **Budget: 5 minutes.** It's a warm-up, so state your plan in one sentence and go.`,
  starter: classNamesStarter,
  solution: classNamesSolution,
  tests: classNamesTests,
  hints: [
    "Collect class names into one array and `join(' ')` once at the end. Joining at every level is where double spaces come from.",
    'Write an inner `visit(value)`. Return early on falsy values and `true`, push strings and numbers, recurse into arrays, and otherwise loop over the object\'s keys.',
    'Use `Object.keys(obj)` (own enumerable keys) rather than a bare `for...in`, which also visits inherited enumerable keys. Check `Array.isArray` before the generic object branch, because arrays are objects too.',
  ],
  explanation: `**Approach:** one accumulator, one recursive \`visit\`, and one \`join\`. It's O(n) in the total number of values and keys visited.

**Order of checks matters:** falsy first (\`!value\`), then \`true\` (a boolean, not a class name), then strings and numbers, then \`Array.isArray\` *before* the generic object branch, since arrays are objects as well.

**Edge cases interviewers probe:** \`0\` is skipped but \`'0'\` is kept (a non-empty string). \`{ a: 0 }\` doesn't include \`a\`. Inherited keys from \`Object.create(proto)\` are ignored. \`[]\`, \`['']\` and \`{}\` contribute nothing and produce no extra spaces.

**Follow-ups:**
- *"Deduplicate the output."* → collect into a \`Set\` (it keeps insertion order) and join. The \`classnames/dedupe\` variant goes further: a later \`{ active: false }\` *removes* an earlier \`'active'\`.
- *"Why use this at all?"* → conditional classes without string-concatenation bugs (\`'btn ' + (active ? 'active' : '')\` leaves trailing spaces and gets unreadable fast).
- *"How does it interact with Tailwind?"* → conflicting utilities (\`p-2\` and \`p-4\`) both end up in the string, and CSS source order decides which wins, not argument order. \`tailwind-merge\` resolves conflicts semantically, which is why many codebases wrap \`twMerge(clsx(...))\` in a \`cn()\` helper.
- *"Make invalid class combinations impossible."* → a variant API (as in \`cva\`): \`variants: { size: { sm: '…', md: '…' } }\` typed so that only valid variant values compile.`,
};

const flatten: Exercise = {
  id: 'final-flatten',
  title: 'flatten(arr, depth) without .flat()',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 8,
  tags: ['recursion', 'arrays', 'classic implementation'],
  prompt: `Implement \`flatten(arr, depth = Infinity)\`: the behaviour of \`Array.prototype.flat\`, **without** using \`flat\` or \`flatMap\`.

\`\`\`ts
flatten([1, [2, [3, [4]]]]);    // [1, 2, 3, 4]
flatten([1, [2, [3, [4]]]], 1); // [1, 2, [3, [4]]]
flatten([1, [2]], 0);           // [1, [2]], as a new array
\`\`\`

- \`depth\` defaults to \`Infinity\`. \`0\` or a negative depth returns a shallow copy.
- Never mutate the input.
- Only real arrays are flattened. Strings, \`Set\`s and other iterables are kept as values.
- Empty slots in sparse arrays are skipped, as \`flat()\` does.

**What the interviewer is looking for:** recursion with a decreasing depth (or an explicit stack), \`Array.isArray\` rather than an "is it iterable?" check, no mutation, and then the follow-up: an iterative version and why you'd want one. **Budget: 8 minutes.**`,
  starter: flattenStarter,
  solution: flattenSolution,
  tests: flattenTests,
  hints: [
    'Recursion: `visit(items, remaining)` pushes non-arrays into a shared result array, and recurses into arrays while `remaining > 0`, passing `remaining - 1`.',
    '`Infinity - 1` is still `Infinity`, so the default "flatten everything" case needs no special handling.',
    '`forEach` skips holes in sparse arrays. `for...of` and index loops visit them as `undefined`.',
  ],
  explanation: `**Approach (recursive):** walk each element. If it's an array and depth remains, recurse with \`depth - 1\`; otherwise push it. One shared accumulator avoids the repeated copying of \`result = result.concat(flatten(item))\` at every level. Time is O(n) over all the elements visited; extra space is O(d) for the call stack, where d is the nesting depth.

**Why \`Array.isArray\` and not "is iterable"?** Strings are iterable. An iterable check would split \`'ab'\` into \`'a', 'b'\`, and then recurse forever, because \`'a'\` is itself an iterable that yields \`'a'\`.

**The usual follow-up: "What if it's nested 100,000 levels deep?"** Recursion depth equals nesting depth, so pathological input can overflow the call stack. Replace the call stack with an explicit one. Keeping an index per frame preserves order without reversing anything:

\`\`\`ts
function flattenIterative<T>(arr: readonly Nested<T>[], depth = Infinity): Nested<T>[] {
  const result: Nested<T>[] = [];
  const stack = [{ items: arr, depth, i: 0 }];
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.i >= frame.items.length) { stack.pop(); continue; }
    const index = frame.i++;
    if (!(index in frame.items)) continue; // hole in a sparse array
    const item = frame.items[index];
    if (Array.isArray(item) && frame.depth > 0) stack.push({ items: item, depth: frame.depth - 1, i: 0 });
    else result.push(item);
  }
  return result;
}
\`\`\`

**Typing:** the overloads return \`T[]\` when no depth is given (fully flat) and \`Nested<T>[]\` otherwise, because partially flattened arrays can remain. The built-in typing goes further: \`flat\` returns \`FlatArray<Arr, Depth>[]\`, a recursive conditional type that counts down through a tuple of depths.

**Where this shows up in React:** \`children\` can be nested arrays. React flattens them when rendering, and \`React.Children.toArray\` flattens them and assigns keys.`,
};

const eventEmitter: Exercise = {
  id: 'final-event-emitter',
  title: 'Typed EventEmitter<Events>',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 10,
  tags: ['classes', 'generics', 'pub-sub', 'classic implementation'],
  prompt: `Implement a **typed** \`EventEmitter<Events>\`: the pub/sub primitive behind DOM events, Node's \`events\` module, and most hand-rolled stores and WebSocket clients.

\`\`\`ts
type ChatEvents = { message: [text: string, from: string]; typing: [userId: string]; close: [] };
const chat = new EventEmitter<ChatEvents>();
const unsubscribe = chat.on('message', (text, from) => console.log(from, text)); // text: string, from: string
chat.once('close', () => console.log('bye'));
chat.emit('message', 'hi', 'ada'); // ✅
chat.emit('message', 42);          // ❌ compile error
unsubscribe();
\`\`\`

Requirements:
- \`on(event, fn)\` registers a listener and **returns an unsubscribe function**. \`off(event, fn)\` removes one.
- \`once(event, fn)\` runs at most once, **and \`off(event, fn)\` with the original \`fn\` must remove it** before it fires.
- \`emit(event, ...args)\` calls listeners in registration order and returns whether any were called.
- **It must be safe to change listeners during an emit.** A listener that removes itself (or a \`once\` listener) must not cause the next listener to be skipped. Listeners added during an emit run from the next emit onwards.
- A \`once\` listener that re-emits the same event must still run only once.
- \`listenerCount(event)\` returns the current number of listeners.

**Clarify out loud (not tested):** what happens if the same function is registered twice? (Node calls it twice; DOM \`addEventListener\` deduplicates.) What happens if a listener throws?

**What the interviewer is looking for:** the data structure (\`Map<event, listeners[]>\`), generics that tie each event name to its argument tuple, the snapshot-before-iterating fix, and how \`once\` and \`off\` interact (the wrapper-function trap). **Budget: 10 minutes.**`,
  starter: emitterStarter,
  solution: emitterSolution,
  tests: emitterTests,
  hints: [
    'Store a `Map<keyof Events, Entry[]>` where each entry is `{ listener, once }`. Keeping the original function, rather than a wrapper, is what lets `off(event, fn)` find once-listeners.',
    'In `emit`, iterate over a copy: `for (const entry of [...entries])`. Removing items from the live array while iterating over it shifts the indexes and skips the next listener.',
    'For `once`, remove the entry *before* calling the listener. Otherwise a listener that emits the same event calls itself again. `on` can return `() => remove(event, entry)`.',
  ],
  explanation: `**Data structure:** \`Map<keyof Events, Entry[]>\`. Arrays keep registration order and allow duplicates. Each entry is a \`{ listener, once }\` object, so \`off\` can compare against the original function, and the unsubscribe closure removes exactly *its own* registration. Delete the map key when the last listener goes, so one-off event names like \`request:123\` don't leave empty arrays behind.

**The three classic bugs (each one has a test):**
1. **Mutating during iteration.** Calling \`entries.forEach(...)\` while a \`once\` listener \`splice\`s itself out shifts the array, and the next listener is skipped. Fix: iterate a snapshot, or use copy-on-write (replace the array on every add or remove instead of mutating it).
2. **The once-wrapper trap.** If \`once\` is implemented as \`on(event, wrapper)\`, then \`off(event, original)\` can't find it. Fix: store the original function plus a flag, or tag the wrapper with the original. Node does the latter: its once-wrapper has a \`listener\` property that \`removeListener\` checks.
3. **Re-entrancy.** If a once-listener is called before it's removed, a nested \`emit\` inside it calls it again. Remove first, then call.

**Typing:** \`Events extends Record<keyof Events, unknown[]>\` maps event names to argument tuples, and this self-referencing constraint accepts \`interface\`s as well as \`type\` aliases. \`K extends keyof Events\` on each method links the name to \`Events[K]\`, so \`emit('message', 42)\` is a compile error and listener parameters are inferred. Labelled tuple elements (\`[text: string, from: string]\`) give readable parameter names in IntelliSense. The internal map erases the per-event types; one cast at the call site, hidden behind a typed public API, is the standard trade-off.

**Semantics worth naming:** with a snapshot, a listener removed by an *earlier* listener during the same emit still runs this time (Node's behaviour). DOM \`EventTarget\` skips listeners removed mid-dispatch instead. Both make newly added listeners wait for the next dispatch. On errors, Node throws synchronously and later listeners don't run (and an \`'error'\` event with no listener throws). A UI event bus might wrap each call in \`try/catch\` and report the error, so one broken subscriber can't break the others.

**Follow-ups:** wildcard listeners (\`'*'\`); an async \`emit\` that awaits its listeners; \`AbortSignal\` support (\`on(event, fn, { signal })\`, as \`addEventListener\` has); max-listener leak warnings; and the React tie-in: subscribe in \`useEffect\` and return the unsubscribe function as the cleanup, or connect the emitter to \`useSyncExternalStore\`.`,
};

const deepClone: Exercise = {
  id: 'final-deep-clone',
  title: 'deepClone with cycles, Map, Set, Date & RegExp',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 12,
  tags: ['recursion', 'objects', 'weakmap', 'classic implementation'],
  prompt: `Implement \`deepClone(value)\`: a copy that shares **no mutable objects** with the original.

\`\`\`ts
const state = { user: { name: 'Ada' }, seen: new Set([1]), at: new Date(), byId: new Map([[1, { n: 1 }]]) };
const copy = deepClone(state);
copy.user.name = 'Grace'; // state.user.name is still 'Ada'
\`\`\`

Support:
- primitives and functions (returned as-is), arrays, and plain objects **and class instances** (keep the same prototype; copy own enumerable string keys),
- \`Date\`, \`RegExp\` (source, flags and \`lastIndex\`), \`Map\` (clone keys **and** values) and \`Set\`,
- **circular references** (\`a.self = a\`) and **shared references** (if \`a.x === a.y\`, then \`copy.x === copy.y\`).

**What the interviewer is looking for:** a recursive walk with a type switch; a \`WeakMap\` from original to copy, registered **before** recursing (that one detail handles both cycles and shared references); and a clear comparison with \`structuredClone\` and \`JSON.parse(JSON.stringify(…))\`. **Budget: 12 minutes.** Get objects, arrays and cycles working first, then add the built-in types.`,
  starter: deepCloneStarter,
  solution: deepCloneSolution,
  tests: deepCloneTests,
  hints: [
    'Base case: if `typeof value !== \'object\' || value === null`, return it. Then branch on `instanceof Date / RegExp / Map / Set`, then `Array.isArray`, then "any other object".',
    'Cycles: keep a `WeakMap<object, unknown>` from original to copy. Check it first, and **store the new (still empty) copy before cloning its children**, so a child that points back to its parent finds it.',
    'For objects, use `Object.create(Object.getPrototypeOf(src))` and copy over `Object.keys(src)`. For a Map, register the empty Map in the WeakMap, then call `copy.set(clone(k), clone(v))` for each entry.',
  ],
  explanation: `**Approach:** a depth-first walk with a type switch and a memo \`WeakMap\` from original to copy. It's O(n) in time and space, where n is the number of reachable values. Registering the copy *before* recursing is what makes \`a.self = a\` terminate and keeps shared references shared. Returning a fresh clone every time would turn a graph with shared nodes into a tree, and a cycle into a stack overflow. A \`WeakMap\` makes sure the memo never keeps originals alive, though since it's local to one call a \`Map\` would also work. Say so.

**Compared with \`structuredClone\`** (built into browsers, workers and Node 17+): it handles cycles, \`Date\`, \`RegExp\`, \`Map\`, \`Set\`, \`ArrayBuffer\` and typed arrays, \`Blob\`/\`File\` and \`Error\`s, natively and quickly. But it **throws** a \`DataCloneError\` on functions, DOM nodes and symbols. It also **drops prototypes** (a class instance comes back as a plain object, without its methods), replaces getters with their current values, skips non-enumerable and symbol-keyed properties, and resets a RegExp's \`lastIndex\`. Our version keeps prototypes and functions, which is a deliberate choice with its own risk: copying a class instance without running its constructor can break invariants. In particular, private \`#fields\` are **not** copied, so a method that reads one throws a \`TypeError\` on the copy.

**Compared with \`JSON.parse(JSON.stringify(x))\`:** Dates become strings, \`Map\` and \`Set\` become \`{}\`, \`undefined\` and functions disappear, \`NaN\` and \`Infinity\` become \`null\`, and \`BigInt\` values and cycles throw. It's only safe for plain JSON data.

**In React apps** you rarely need a deep clone. Immutable updates copy only the path that changed (structural sharing), which keeps unchanged subtrees \`===\` so \`memo\` and selectors can bail out. Deep-cloning state throws that away. Use \`structuredClone\` for snapshots (undo stacks, drafts), and Immer when you want to write updates in a mutable style.

**Follow-ups:** clone typed arrays (\`new (src.constructor)(src)\`); copy symbol keys and property descriptors (\`Reflect.ownKeys\` plus \`Object.getOwnPropertyDescriptor\`); avoid stack overflows on very deep structures with an explicit stack; and *"Now write \`deepEqual\`"*, which is the same walk with a \`seen\` map of pairs.`,
};

const day: Day = {
  number: 15,
  title: 'Interview Simulation Day',
  tagline: 'Run the whole loop under realistic conditions, then turn the results into a plan.',
  summary:
    'Knowledge is half of an offer. The other half is showing it on the day. Today you learn the skills interviewers actually score: running a coding round out loud, getting unstuck, taking hints, recovering from mistakes and sounding senior. You build a story bank for behavioural rounds and do a final gauntlet of four classic implementations. Then you sit a full mock loop from start to finish: rapid-fire, coding, UI build, system design and behavioural. You end with an honest debrief and a 30-day plan that keeps everything sharp until your real interviews.',
  objectives: [
    'Name the common frontend loop formats and what each round scores',
    'Run the six-step coding-round script out loud: clarify → examples → approach → code → test → optimise',
    'Get unstuck, take hints and recover from mistakes in ways that earn points',
    'Deliver a 60–90-second "tell me about yourself" and STAR+R stories from an eight-story bank',
    'Implement classNames, flatten, a typed EventEmitter and deepClone under time pressure',
    'Complete a full mock loop, debrief it with evidence, and turn the gaps into a 30-day maintenance plan',
  ],
  skills: ['interviewing', 'javascript', 'typescript', 'react', 'system-design', 'agentic'],
  blocks: [
    {
      kind: 'review',
      id: 'final-warm-up',
      title: 'Warm-up: mixed flashcards from all 14 days',
      minutes: 15,
      intro:
        "One last spaced-repetition pass across the whole course. If only a few cards are due, tick **Include cards that aren't due yet** and keep going until the 15 minutes are up. Answer every card **out loud, in one breath**, before flipping it. Today is about retrieval under mild pressure, not recognition. Write down any card you miss twice: it goes on your debrief's \"topics to drill\" list this afternoon.",
    },
    {
      kind: 'lesson',
      id: 'perform-in-the-loop',
      title: 'How to perform in the loop',
      minutes: 30,
      body: performInTheLoop,
      checks: [
        {
          id: 'stuck-twelve-minutes',
          prompt:
            "You're 12 minutes into a 35-minute coding round. Your approach isn't working and you've gone quiet. What's the best next move?",
          choices: [
            'Keep typing silently. Interviewers respect focus, and talking will slow you down.',
            "Say you're stuck, work a concrete example by hand or fall back to a simpler version that works, and ask a targeted question about the specific blocker.",
            'Ask the interviewer for the solution so you don\'t waste any more time.',
            'Delete everything and start a completely different approach without explaining why.',
          ],
          answer: 1,
          explanation:
            "Interviewers expect you to get stuck. They score **what you do next**. Saying it out loud, going back to an example, shrinking the problem and asking a *specific* question all produce visible problem-solving evidence, and they invite a well-aimed hint. Silent typing gives the interviewer nothing to write down and burns the time a hint could have saved. Asking for the solution gives up the problem-solving signal entirely. Restarting silently might be the right technical call, but without explaining *why* the old approach fails, it looks like flailing. Say what's wrong with it, and what you're keeping.",
        },
        {
          id: 'hint-response',
          prompt:
            'You wrote a nested loop. The interviewer asks: "What if you used a Map here?" Which response scores best?',
          choices: [
            '"I thought about that, but I prefer my approach."',
            '"Oh, yes: that turns the inner lookup into O(1), so the whole thing becomes O(n). Let me build the map in one pass first, then swap the inner loop for a lookup."',
            '"Sorry, I should have known that," and then silently rewrite the function.',
            '"Sure," and immediately delete the whole solution.',
          ],
          answer: 1,
          explanation:
            "The strong response **acknowledges, restates** (showing you understand *why* the hint helps: O(n²) → O(n)), and **applies it visibly** while keeping the working parts. Dismissing a hint is scored as poor collaboration, which is worse than having needed it. Apologising and going silent wastes the moment: the interviewer can't tell whether you understood. Deleting everything throws away correct code and suggests you didn't follow the hint's scope.",
        },
        {
          id: 'senior-signal-check',
          prompt: 'Which answer to "Should we use Redux for this app?" sounds most senior?',
          choices: [
            '"Yes. Redux is the industry standard for state management."',
            '"No. Redux is outdated, so I\'d use Zustand."',
            '"It depends on the state. Server data belongs in a query cache like TanStack Query. The little genuinely global client state, like theme or a draft, fits in context or a small store. I\'d reach for Redux if we had complex cross-cutting client state, or if the team already uses it well."',
            '"I\'d need to see the codebase before giving an opinion."',
          ],
          answer: 2,
          explanation:
            "The senior answer **finishes the \"it depends\" sentence**: it separates server state from client state, gives a default with reasons, and names the conditions that would change the decision, including team context. The first two answers are confident but unreasoned; \"industry standard\" and \"outdated\" are labels, not arguments. The last one sounds careful, but it avoids the question. A senior engineer gives a provisional answer and states their assumptions.",
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'behavioural-story-bank',
      title: 'Behavioural rounds & your story bank',
      minutes: 25,
      body: behaviouralStoryBank,
      checks: [
        {
          id: 'star-action-weight',
          prompt: 'In a 3-minute STAR answer, which part should take most of the time?',
          choices: ['Situation', 'Task', 'Action', 'Result'],
          answer: 2,
          explanation:
            "**Action**, at about 60%. It's the only part that shows what *you* did and how you think: your decisions, the alternatives you weighed, and how you brought people along. Situation and Task are context, so two or three sentences between them is enough, and the interviewer will ask if they need more. Result is essential and should be quantified, but it's short. A common failure is the reverse: three minutes of situation, then \"…and it went well.\"",
        },
        {
          id: 'weak-story-fix',
          prompt:
            'A candidate says: "We had a slow page, so we optimised it, and it got a lot faster." What is the most important fix?',
          choices: [
            'Add more background about the company and the product.',
            'Say what *they* specifically did and why, and quantify the result (e.g. "I profiled it, virtualised the list… p75 INP went from 450 to 120 ms").',
            'Make it even shorter, so the interviewer can ask questions.',
            'Replace "we" with "the team", to sound more humble.',
          ],
          answer: 1,
          explanation:
            "The answer has no **Action** (nothing the candidate personally decided or did) and no measurable **Result**, which are the two parts interviewers score most. More background makes it longer without adding signal. It's already too short to contain any evidence. \"The team\" is the same problem as \"we\": the interviewer still can't tell what *you* contributed.",
        },
      ],
    },
    {
      kind: 'drill',
      id: 'story-rehearsal',
      title: 'Rehearse: your stories, AI answers and closing questions',
      minutes: 20,
      intro:
        "Use the story cards you just drafted. For each question, answer **out loud with your own story** first: a one-sentence headline, then STAR + Reflection, in under 3 minutes. Then reveal the model answer and compare the *structure*, not the details. The model stories are examples; yours should be real. Prioritise **tell me about yourself**, then four behavioural questions that match your cards, then **questions for us**. Answer the AI questions if you have time (they also come up in the [AI-assisted round](#/mock/agentic)). Grade honestly: shaky answers come back in [weak-spots mode](#/mock/rapid-fire?weak=1).",
    },
    {
      kind: 'exercise',
      id: 'final-gauntlet',
      title: 'Final gauntlet: classics under time',
      minutes: 35,
      intro:
        'Four classics that come up in real frontend loops and haven\'t appeared earlier in the course. Treat them as back-to-back interview problems: **35 minutes in total**. Budget: `classNames` 5 → `flatten` 8 → `EventEmitter` 10 → `deepClone` 12. Run the full script **out loud for every one**, even the warm-up: at least one clarifying question, two examples, approach and complexity, code while narrating, run the tests, then one follow-up you\'d raise. Over budget? Note the overrun, open hint 1, and finish. Afterwards, read each explanation: the follow-ups are what the interviewer asks next.',
      exercises: [classNames, flatten, eventEmitter, deepClone],
    },
    {
      kind: 'lab',
      id: 'full-mock-loop',
      track: 'build',
      title: 'Full mock loop: run-sheet, debrief & 30-day plan',
      minutes: 135,
      body: labFullMockLoop,
      checklist: [
        'Setup: notes/day15-loop.md created with the debrief template, notifications off, clock started (recording optional but recommended)',
        'Round 1, rapid-fire: 8 questions answered out loud in about 75 s each and graded honestly; shaky/missed titles written down',
        'Round 2, coding: restated the problem and asked ≥ 2 clarifying questions, wrote examples, approach and complexity before coding; hard stop at 25 min; scored 1–4 on five signals',
        'Round 3, UI build: component tree and state sketched first; loading/empty/error states and keyboard handled (or explicitly deferred out loud); hard stop at 30 min; scored on six signals',
        'Break taken away from the screen, without reviewing any code',
        'Round 4, system design: requirements first, RADIO paced to 40 min with trade-offs named; compared with the reference; rubric scored and session saved',
        'Round 5, behavioural: two cold STAR+R stories under 3 min each, plus two questions asked out loud; each story scored out of 5',
        'Debrief filled in: scores table, three strengths, three gaps with evidence and a fix, sorted into knowledge / execution / communication',
        '30-day plan written, with daily and weekly sessions blocked in your calendar and a re-run of this loop scheduled for day 30',
      ],
    },
  ],
  flashcards: [
    {
      id: 'star-plus-r',
      front: 'What do the letters in **STAR+R** stand for?',
      back: '**S**ituation, **T**ask, **A**ction, **R**esult, plus **R**eflection: what you learned or would do differently. The reflection is where seniority shows.',
    },
    {
      id: 'star-time-split',
      front: 'How should a 2–3-minute STAR answer be split?',
      back: 'Situation + Task ≈ 20% (two or three sentences). **Action ≈ 60%** (what *you* did and why). Result + Reflection ≈ 20% (numbers, impact, the lesson).',
    },
    {
      id: 'coding-script-steps',
      front: 'The six steps of the coding-round script?',
      back: '1. **Clarify** 2. **Examples** (they become tests) 3. **Approach + complexity**, and get a nod 4. **Code while narrating** 5. **Test** the examples and edge cases 6. **Optimise** / discuss follow-ups.',
    },
    {
      id: 'clarify-checklist',
      front: 'What do you clarify before coding a utility such as `debounce` or `flatten`?',
      back: 'Restate the problem, then ask about: input types, output shape, edge cases (empty, null, nested, huge), mutation vs returning a new value, sync vs async, error behaviour, `this`/argument forwarding, and expected scale.',
    },
    {
      id: 'stuck-protocol',
      front: "You're stuck in a coding round. What do you do?",
      back: 'Say so, out loud. Work a concrete example by hand, shrink the problem (brute force first), then name the **specific** blocker and ask a targeted question. Silence is the only wrong move.',
    },
    {
      id: 'taking-hints',
      front: 'How do you take a hint well?',
      back: 'Pause, acknowledge it ("good point"), **restate it** in your own words, apply it visibly, and keep going. Ignoring or arguing with a hint scores worse than needing one.',
    },
    {
      id: 'recover-from-mistake',
      front: 'How do you recover from a bug you notice mid-interview?',
      back: '**Name it, fix it, move on:** "I\'m mutating the input here; let me copy it first." Calm self-correction scores *positively*. Hiding the bug or spiralling scores negatively.',
    },
    {
      id: 'rubric-signals',
      front: 'Which signals does a coding-round rubric typically score?',
      back: '**Problem solving** (clarify, decompose), **coding** (correct, idiomatic, typed), **verification** (tests, edge cases), **communication** (narrating decisions), **collaboration** (using hints). UI and design rounds add UX states and accessibility.',
    },
    {
      id: 'senior-sounds-like',
      front: 'What makes an answer sound **senior**?',
      back: 'Explicit trade-offs ("It depends on X; given Y, I\'d choose Z"), scoping and prioritising, raising failure modes without being asked, connecting decisions to user or business impact, and ownership language ("I decided…").',
    },
    {
      id: 'tmay-structure',
      front: 'Structure of a 60–90-second "tell me about yourself"?',
      back: '**Present** (role and scope) → **past** (two quantified highlights relevant to *this* job) → **strengths** (how you work) → **future** (why this role). Not your CV in chronological order.',
    },
    {
      id: 'story-bank-themes',
      front: 'The eight themes your story bank should cover?',
      back: 'Conflict, failure, ambiguity, impact, technical decision/trade-off, mentoring/leadership, cross-team collaboration, and adopting AI tools responsibly. About eight stories, each reusable for two or three themes.',
    },
    {
      id: 'we-vs-i',
      front: 'What is the "we vs I" pitfall?',
      back: 'Saying "we" throughout, so the interviewer can\'t tell what *you* did. Use "we" for the team\'s context and "I" for your own actions and decisions. They\'re hiring you, not your team.',
    },
    {
      id: 'ui-build-order',
      front: 'Order of work in a UI-build (machine coding) round?',
      back: 'Clarify → sketch the component tree and state → a skeleton that renders → happy path → loading/empty/error states → keyboard and ARIA → tests and polish. A working component beats a perfect, unfinished one.',
    },
    {
      id: 'radio-pacing',
      front: 'RADIO pacing in a 45-minute frontend system design round?',
      back: '**R**equirements 5–8 min → **A**rchitecture ~10 → **D**ata model 5–8 → **I**nterface (API) 5–8 → **O**ptimisations 10+. Lead the conversation, and check in at each transition.',
    },
    {
      id: 'ai-round-signals',
      front: 'What do AI-allowed interview rounds actually score?',
      back: 'How you **lead** the tool: breaking the task down, giving context, reading every diff, catching its mistakes, verifying with tests, and knowing when to write the code yourself. Accepting output blindly fails, even if the code works.',
    },
    {
      id: 'questions-to-ask',
      front: 'What makes a strong question to ask your interviewer?',
      back: "It's specific, about the real work, and not answered on the careers page. For example: \"What does the path from merged PR to production look like?\" or \"Which part of the frontend do people avoid touching, and why?\"",
    },
  ],
  interviewQuestions: [
    {
      id: 'tell-me-about-yourself',
      kind: 'behavioral',
      question: 'Tell me about yourself.',
      answer: `**Structure (60–90 s):** present → two highlights → how I work → why this role.

> "I'm a senior frontend engineer at a B2B SaaS company. I work on the web app our customers use to manage invoicing, in React and TypeScript on top of a Node BFF, and for the last two years I've owned our design system and the checkout flow.
>
> Two highlights. I led the migration of our public pages from a client-rendered SPA to server rendering with Next.js, which took our p75 LCP from about 4 seconds to 1.8, and sign-up conversion went up around 9%. And I rebuilt our form components to be accessible: we went from forty-odd axe violations to zero and passed a customer's WCAG 2.1 AA audit that had been blocking a deal.
>
> What I'm best at is the space between product and platform: taking a fuzzy problem, making the trade-offs explicit, and shipping something measurable, while bringing people along. I run our frontend guild and mentor two mid-level engineers. Recently I've also been setting up how our team uses AI coding agents safely, with project rules and review gates.
>
> I'm looking for a team where frontend performance and quality are product priorities. That's why this role stood out: you're rebuilding the editor experience, and that's exactly the kind of problem I want to work on next."

**Why it works:** it's about 80 seconds long. It has a headline, two quantified highlights chosen for *this* job, a "how I work" line that sets up later stories, and a close that answers "why us?" before they ask. Every sentence is a hook the interviewer can follow up on.

**Avoid:** reciting your CV in order, starting from university, or trailing off with "…so, yeah, that's me."`,
      followUps: [
        'Why are you leaving your current role?',
        'Tell me more about the SSR migration. What was the hardest part?',
        'What do you want to be doing in three years?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'disagreed-technical-decision',
      kind: 'behavioral',
      question: 'Tell me about a time you disagreed with a technical decision.',
      answer: `**Headline:** "This was when I disagreed with my tech lead about putting all our server data into Redux, and we ended up with a split that removed about 2,000 lines of code."

**Situation.** As part of a storefront rewrite, our lead proposed keeping all server data (products, profile, cart) in a global Redux store with hand-written thunks. The old app already suffered from stale data and loading-flag boilerplate.

**Task.** I was implementing the data layer, so I'd live with the decision. I wanted to raise my concern without stalling a project that was already scheduled.

**Action.** Instead of arguing in the planning thread, I asked for 30 minutes to make the case. I framed it as *server state* (cached copies of data the server owns) versus *client state*, and built a one-day spike: the product list page implemented both ways. I compared them on criteria the team already cared about: lines of code, how invalidation after "add to cart" worked, and request deduplication. The TanStack Query version was about 40% less code and handled refetch-on-focus and deduplication for free. I was honest about its costs too: a new dependency and a learning curve. I proposed a compromise: Query for server state, and Redux only for the few pieces of truly global client state.

**Result.** The lead agreed to the split. Over the next quarter we removed about 2,000 lines of thunk and reducer code, and "stale cart" bugs, previously our most common frontend support ticket, almost disappeared.

**Reflection.** What worked was making it about evidence and the team's own criteria, not opinions, and offering a path that kept the good parts of his plan. If the spike had shown that Redux was fine, I'd have committed to it fully: disagree and commit.`,
      followUps: [
        'What would you have done if the lead had still said no?',
        'How do you decide whether a disagreement is worth raising?',
        'Tell me about a time you were the one who was wrong.',
      ],
      minutes: 3,
      level: 'senior',
    },
    {
      id: 'production-incident',
      kind: 'behavioral',
      question: 'Tell me about a production incident you handled.',
      answer: `**Headline:** "A release that blank-screened our dashboard for Safari 15 users. I rolled it back in 12 minutes, then closed the gap that let it through."

**Situation.** On a Friday afternoon, a release of our React dashboard showed a blank white screen for about 8% of sessions, according to Sentry, all on Safari 15.

**Task.** I was on call for the web app. My job was to stop the damage first, then find the root cause, then make sure it couldn't happen the same way again.

**Action.** I started by mitigating, not debugging. I confirmed that the spike lined up with the deploy, posted in the incident channel with what we knew and when I'd next update, and rolled back to the previous build. Then I reproduced the problem on BrowserStack. A new dependency shipped untranspiled modern syntax, a class static block, which Safari 15 can't parse, so the whole bundle failed to evaluate. Because that happened before React mounted, our error boundary never ran, which is why users saw a white screen instead of a fallback. I fixed the build by adding the dependency to our transpilation step and aligning our browserslist with our actual support matrix.

**Result.** We recovered 12 minutes after the alert, and the fix shipped on Monday. In the blameless post-mortem I proposed two follow-ups, and we did both: a CI check (es-check) that verifies the production bundle's syntax against our browser targets, and a small inline script in \`index.html\` that shows a "please reload or update your browser" message if the app hasn't mounted within a few seconds.

**Reflection.** Mitigate first and investigate second. Rolling back before you understand the problem is the right call. The incident also showed a gap in our observability: failures that happen before React mounts need their own safety net.`,
      followUps: [
        'How did you communicate with stakeholders during the incident?',
        'What makes a good post-mortem?',
        'How do you decide between rolling back and fixing forward?',
      ],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'improved-performance',
      kind: 'behavioral',
      question: 'Tell me about a time you improved performance.',
      answer: `**Headline:** "I took our search page's mobile INP from about 450 ms to 120 ms, and the biggest lesson was that my first guess about the cause was wrong."

**Situation.** Our product search page felt sluggish. Field data showed a p75 INP of about 450 ms on mobile, close to the 500 ms "poor" threshold, and typing in the filter box lagged. The page rendered about 1,500 results as rich cards.

**Task.** I took ownership of getting it into the "good" range (≤ 200 ms) without a redesign.

**Action.** I measured before changing anything: a Performance-panel trace on a throttled mid-range Android profile, plus the React Profiler. Two causes stood out. First, every keystroke re-rendered all 1,500 cards, because the filter state lived at page level and each card received a new inline \`onSelect\` callback on every render. Second, the filtering ran synchronously in the change handler. I virtualised the list with TanStack Virtual so only about 20 cards are mounted, memoised the card component with a stable callback, and used \`useDeferredValue\` for the results so typing stays responsive while the list catches up. I also added an INP-by-page panel to our RUM dashboard so we'd catch regressions.

**Result.** Over the next four weeks of field data, p75 INP dropped from about 450 ms to about 120 ms. DOM nodes on the page fell by about 90%, and search-to-click rate rose about 6%. I wrote it up as a short internal guide to profiling React interactions.

**Reflection.** Measure in the field and profile before optimising. I'd assumed the filter algorithm was the problem, but it was under 10% of the cost. And I should have set up the RUM panel *before* starting, because I had to wait weeks for a clean baseline.`,
      followUps: [
        'Why useDeferredValue rather than debouncing the input?',
        'How do you measure INP in the field?',
        'What are the downsides of virtualisation (find-in-page, accessibility, scroll restoration)?',
      ],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'learned-quickly',
      kind: 'behavioral',
      question: 'Tell me about a time you had to learn something quickly.',
      answer: `**Headline:** "I had two weeks to get good enough at accessibility auditing to get our widget through a WCAG 2.1 AA audit, and we passed first time."

**Situation.** Two weeks before a contractual deadline, a customer required our embedded widget to pass a WCAG 2.1 AA audit, and the engineer who knew most about accessibility had just left. I knew the basics but had never done a formal audit.

**Task.** Get competent quickly enough for us to find and fix the issues ourselves, rather than miss the deadline.

**Action.** I timeboxed the learning and gave each day a deliverable. On day one I read the WCAG quick reference for the success criteria that applied to us, and the WAI-ARIA Authoring Practices for the three patterns we used: combobox, dialog and tabs. On day two I ran axe on every screen and did a keyboard-only pass and a VoiceOver pass, logging every issue in a spreadsheet mapped to a success criterion and sorted by severity. Then I fixed the systemic issues first (focus management in our dialog, missing labels in the shared form components), because fixing a shared component fixed dozens of screens at once. I also booked one hour with an external auditor to sanity-check my findings early. That caught two things I'd missed: invisible focus on our custom buttons, and status messages that weren't announced.

**Result.** We passed the audit on the first attempt, two days before the deadline, and the deal closed. I turned the spreadsheet into an accessibility checklist in our PR template.

**Reflection.** How I learn fast: go to primary sources, learn in the context of the real problem, get an expert to check my understanding early, and leave something behind so the team doesn't depend on one person again.`,
      followUps: [
        'How do you keep up with changes in frontend more generally?',
        'How did you decide which issues to fix first?',
        'What would you have done differently with more time?',
      ],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'mentoring-others',
      kind: 'behavioral',
      question: 'How do you mentor others? Give me an example.',
      answer: `**My approach in one line:** I try to grow people's judgement, not just answer their questions. So I ask before I tell, give real ownership, and keep feedback specific and frequent.

**Situation.** A junior engineer joined our team from a bootcamp. Three months in, her PRs were taking four or five rounds of review, and she'd stopped asking questions in public channels.

**Task.** As her assigned mentor, I wanted her shipping independently and confident enough to ask for help early.

**Action.** We set up a weekly 30-minute 1:1 with an agenda she owned. I noticed the review churn kept coming from the same few gaps: where to put state, effect dependencies, and testing. So instead of fixing them in comments, I paired with her for an hour on each topic, using her own PRs as the material. I also changed how I reviewed. I labelled comments as "blocking", "suggestion" or "nit", and asked questions ("What happens if this request fails?") instead of prescribing fixes. Then I gave her a small feature to own end to end, a saved-filters panel, including writing a short design doc and presenting it at our team review. I was there as backup, not as the lead.

**Result.** Within two months her PRs were landing in one or two rounds. She shipped the feature on time, and later ran the onboarding pairing sessions for the next new hire. The team adopted the comment labels in our review guidelines.

**Reflection.** I learned that code review is the most frequent mentoring channel we have, and that the tone and labelling of comments matter as much as their content.`,
      followUps: [
        'How do you give critical feedback to someone more senior than you?',
        'How do you mentor without becoming a bottleneck?',
        "Tell me about a time mentoring didn't work.",
      ],
      minutes: 3,
      level: 'senior',
    },
    {
      id: 'project-failed',
      kind: 'behavioral',
      question: "Tell me about a project that failed, or didn't go as planned.",
      answer: `**Headline:** "Our offline mode slipped by a quarter because I treated sync conflicts as an edge case. Now I test the riskiest assumption first."

**Situation.** I led the frontend for an offline-first mode in our field-service app, so technicians could fill in job reports without connectivity and sync later. We planned it for six weeks.

**Task.** I owned the client architecture: local storage, a sync queue, and conflict handling.

**Action.** I designed a service worker with an IndexedDB queue and built it carefully, with good test coverage. My mistake was in the scoping. I treated conflict resolution (two people editing the same job) as an edge case for later, and I didn't validate early with real technicians. In week five we ran a pilot and found that conflicts weren't rare at all: dispatchers routinely edited jobs while technicians were offline, and last-write-wins was silently losing data. We paused the rollout. I wrote up what we'd learned and worked with the product manager to cut scope to something we could ship safely: offline *read* access, plus drafts that are only submitted when the device is online, with clear UI showing offline status.

**Result.** The full feature missed its date by a quarter. That was a real cost, because sales had promised it to a customer. The reduced version shipped two weeks later and covered about 70% of what technicians needed. When we built full sync later, we designed field-level merging and a conflict UI from the start.

**Reflection.** I now apply two lessons to every project. Test the riskiest assumption first: a one-week pilot at the start would have exposed the conflict problem. And in anything involving data sync, treat the "edge cases" as core requirements until users prove otherwise.`,
      followUps: [
        'What would you do differently on day one?',
        'How did you communicate the delay to stakeholders?',
        'How do you decide whether to cut scope or move the deadline?',
      ],
      minutes: 3,
      level: 'core',
    },
    {
      id: 'ambiguous-requirements',
      kind: 'behavioral',
      question: 'Tell me about a time you had to deliver with ambiguous requirements.',
      answer: `**Headline:** "A VP asked for 'a usage dashboard' with no designs and no defined metrics. I turned it into a one-page brief and shipped a v1 to pilot customers in four weeks."

**Situation.** Our VP asked for "a dashboard so customers can see how they're using the product". There were no designs, no defined metrics, a target of "this quarter", and three different teams owned the underlying data.

**Task.** As frontend lead, I needed to turn this into something buildable without waiting for perfect requirements.

**Action.** First I reduced the ambiguity by asking who it was for and what decision it should help them make. I interviewed four customer-success managers and found the real need: account admins checking seat usage before renewals. I wrote a one-page brief with the problem, three candidate metrics, explicit non-goals (no custom date ranges and no exports in v1) and the open questions, and got the VP and the data team to sign it off in a 30-minute meeting. The data API didn't exist yet, so I agreed the response shape with the backend team, built against a mocked API (MSW) with loading, empty and error states, and shipped it behind a feature flag to five friendly customers in week four.

**Result.** v1 shipped to everyone in week seven. 60% of admins viewed it in the first month, and customer success told us renewal conversations got shorter. Pilot feedback shaped v2: exports, which we'd deliberately postponed, turned out to be the top request.

**Reflection.** When requirements are ambiguous, my job is to make decisions explicit and reversible: write down the assumptions, get them agreed, ship something small to real users, and let data settle the arguments.`,
      followUps: [
        'What would you have done if the stakeholders disagreed about the brief?',
        'How did you decide what went into v1?',
        'How do you handle requirements that change mid-sprint?',
      ],
      minutes: 3,
      level: 'senior',
    },
    {
      id: 'biggest-weakness',
      kind: 'behavioral',
      question: "What's your biggest weakness?",
      answer: `**Formula:** a real, non-fatal weakness → evidence that it cost something → what you're actively doing about it → proof that it's improving. Never a disguised strength ("I work too hard").

> "Historically, I've been slow to delegate. When something was important or ambiguous, my instinct was to take it on myself. That came to a head last year, when I was the bottleneck on our design-system migration: three engineers were waiting on my reviews, and I was working evenings to keep up. My manager pointed it out in a 1:1, and she was right.
>
> Since then I've changed a few concrete things. I write a short design doc for anything involving more than one person, so others can make decisions without me. I split the work so someone else owns each piece end to end, and I review against the doc rather than my personal preferences. At planning, I also ask myself: 'Is this something only I can do, or just something I enjoy doing?'
>
> It's working. On our last project, two engineers each owned a whole sub-area, my review turnaround dropped to under a day, and one of them presented the work at our all-hands. I still catch myself wanting to grab the hardest ticket, but now I pair on it instead."

**Why it works:** it's honest and specific, it shows self-awareness and a feedback loop, and the weakness isn't a core requirement of the role. Choose a weakness that's real for you. Interviewers can tell.`,
      followUps: [
        'What feedback have you received that was hard to hear?',
        'How would your current manager describe you?',
        'What are you working on improving right now?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'ai-tools-day-to-day',
      kind: 'agentic',
      question: 'How do you use AI coding tools day to day?',
      answer: `**One-liner:** I use an agent like Claude Code as a fast pair programmer that works in my repo, but I keep ownership. I scope the task, give it context and a way to check its own work, and review everything as I would a PR.

**Where it helps most:**
- **Exploring code.** "How does auth flow from the login form to the API client?" in an unfamiliar codebase, read-only, before I change anything.
- **Plan first, then implement.** For anything non-trivial I ask for a plan first (plan mode), correct it, then let it implement in small steps against tests.
- **Tests and mechanical changes.** Generating test cases for edge cases I list, large mechanical migrations, and fixing type errors.
- **Review.** A second pass over my own diff for missing error states, accessibility problems, or security smells.

**How I set it up:** a concise CLAUDE.md with commands, conventions and don'ts; custom slash commands for repeated workflows; hooks that run lint and type-check after edits; and permission rules so it can't run destructive commands or read secrets.

**Where I'm careful:** core architecture and security-sensitive code get my own reasoning first, and I don't use it for anything I can't verify.

**A concrete result:** we migrated about 120 files of hand-written data fetching to TanStack Query. We worked out the pattern on two files, encoded it in a slash command, and ran it one module at a time with the test suite as the gate. It took three days instead of the two weeks we'd estimated, and every PR was still reviewed by a person.`,
      followUps: [
        "How do you stop it from making changes you didn't ask for?",
        'How do you decide what context to give it?',
        'Has it ever made a mistake that reached review? What did you change afterwards?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'ai-code-correct-secure',
      kind: 'agentic',
      question: 'How do you make sure AI-generated code is correct and secure?',
      answer: `**One-liner:** I treat it like code from a new teammate whose work I don't know yet. I own it, so it goes through verification I'd trust even if a person had written it: tests, types, review and tooling, with extra scrutiny where AI tools are known to fail.

**Correctness:**
- **Verification built into the loop.** I ask for tests first (or write the key ones myself), and the agent has to get the tests and \`tsc\` passing. I check that the tests actually assert behaviour and weren't weakened to make them pass.
- **Read the whole diff.** I keep changes small and reviewable, and reject anything outside the task's scope.
- **Probe the edges.** "What happens on empty input, a network failure, a double click?" Generated code tends to get the happy path right and miss the rest.

**Security:**
- **Known failure modes:** \`dangerouslySetInnerHTML\` with unsanitised input, secrets in client bundles or logs, missing authorisation checks on the server, overly broad CORS, open redirects, and **hallucinated or typosquatted packages**. I check that every new dependency exists, is maintained, and is actually needed.
- **Tooling as a backstop:** lint rules (no \`eval\`, no unsafe HTML), dependency audits and secret scanning in CI, and a CSP so that any mistake that gets through is contained.
- **Agent guardrails:** permission rules that block reading \`.env\` files and running destructive commands. I treat content the agent reads, such as issues and web pages, as data rather than instructions, because prompt injection is a real risk.

**Accountability:** "the AI wrote it" is never an acceptable answer in a post-mortem. It merges under my name, and the review bar doesn't drop just because the code was quick to write.`,
      followUps: [
        'What is prompt injection, and how does it affect coding agents?',
        'How would you review a 2,000-line AI-generated PR?',
        'Would you let an agent merge to main unattended? Under what conditions?',
      ],
      minutes: 2,
      level: 'senior',
    },
    {
      id: 'questions-for-us',
      kind: 'concept',
      question: 'We have a few minutes left. What questions do you have for us?',
      answer: `**One-liner:** always have questions, because this part is scored too. Ask two or three that show you're seriously evaluating the job and already thinking like part of the team, and tailor them to who's in the room.

**To an engineer:**
- "What does the path from a merged PR to production look like, and how long does it take?"
- "Which part of the frontend codebase do people avoid touching, and why?"
- "When tech debt competes with features, how do product and engineering decide?"

**To a hiring manager:**
- "What would someone in this role have shipped after six months for you to call them exceptional?"
- "What's the team's biggest challenge this year?"
- "How do you give feedback, and how are promotions decided?"

**To a senior leader:**
- "How do frontend quality, performance and accessibility show up in the company's priorities?"
- "Where do you want the product to be in two years, and what does the team need to get there?"

**About tooling (increasingly worth asking):** "How does the team use AI coding tools, and what guardrails do you have?"

**Best move:** build a question on something they said earlier. "You mentioned the design system is being rebuilt. Who owns it, and how do product teams contribute?" It shows you were listening.

**Avoid:** questions answered on the careers page, compensation in technical rounds (save it for the recruiter), and "No, I think you covered everything."`,
      followUps: [
        'What are you looking for in your next team?',
        'Is there anything that would stop you from accepting an offer?',
      ],
      minutes: 2,
      level: 'core',
    },
    {
      id: 'closing-pitch',
      kind: 'concept',
      question: "Before we wrap up, is there anything else you'd like us to know? Why should we hire you?",
      answer: `**One-liner:** a 30–45-second close that connects your strongest evidence to *their* needs: three points, one sentence each, and then stop.

**Structure:** what they need (from the job description and what you heard today) → your matching evidence → genuine enthusiasm.

> "From what you've described, the team needs someone who can own the new editor end to end, raise the performance bar, and help the mid-level engineers grow. That's been the core of my last two years. I led our SSR migration, which took p75 LCP from 4 to 1.8 seconds. I own a design system used by six teams. And I mentor two engineers who now lead features on their own. You also mentioned that responsible AI tooling is on your roadmap, which is something I've been setting up on my current team. I'm genuinely excited about the editor problem: it's the work I want to be doing next."

**Use it to repair, too.** "One thing I'd like to add about the coding round: I realised afterwards that my solution re-scans the list on every keystroke. With an index map, each lookup would be O(1)." A short, calm correction shows self-awareness, and interviewers often score it positively.

**Avoid:** repeating your CV, starting to negotiate, or apologising for how the interview went.`,
      followUps: ['What would your first 90 days look like?', 'What concerns do you think we might have about you?'],
      minutes: 2,
      level: 'senior',
    },
  ],
};

export default day;
