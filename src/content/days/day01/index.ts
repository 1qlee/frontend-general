import type { Day, Exercise } from '../../types';

import orientation from './lessons/orientation.md?raw';
import scopeClosures from './lessons/scope-closures.md?raw';
import thisBinding from './lessons/this-binding.md?raw';
import prototypesTypes from './lessons/prototypes-types.md?raw';
import labSetup from './lessons/lab-setup.md?raw';

import onceStarter from './exercises/once/starter.ts?raw';
import onceSolution from './exercises/once/solution.ts?raw';
import onceTests from './exercises/once/tests.ts?raw';
import memoizeStarter from './exercises/memoize/starter.ts?raw';
import memoizeSolution from './exercises/memoize/solution.ts?raw';
import memoizeTests from './exercises/memoize/tests.ts?raw';
import bindStarter from './exercises/my-bind/starter.ts?raw';
import bindSolution from './exercises/my-bind/solution.ts?raw';
import bindTests from './exercises/my-bind/tests.ts?raw';
import instanceofStarter from './exercises/my-instanceof/starter.ts?raw';
import instanceofSolution from './exercises/my-instanceof/solution.ts?raw';
import instanceofTests from './exercises/my-instanceof/tests.ts?raw';
import curryStarter from './exercises/curry/starter.ts?raw';
import currySolution from './exercises/curry/solution.ts?raw';
import curryTests from './exercises/curry/tests.ts?raw';
import getStarter from './exercises/typed-get/starter.ts?raw';
import getSolution from './exercises/typed-get/solution.ts?raw';
import getTests from './exercises/typed-get/tests.ts?raw';

const once: Exercise = {
  id: 'once',
  title: 'once(fn)',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 8,
  tags: ['closures', 'this', 'higher-order functions'],
  prompt: `Implement \`once(fn)\`: it returns a function that calls \`fn\` **at most once**. Later calls return the result of the first call.

\`\`\`ts
const init = once(() => { console.log('init!'); return 42; });
init(); // logs "init!", returns 42
init(); // returns 42, no log
\`\`\`

Requirements:
- Forward arguments and \`this\` to \`fn\`.
- If \`fn\` calls the wrapper again while it is running (re-entrancy), \`fn\` must not run twice.

**What the interviewer is looking for:** closure state, correct \`this\` forwarding (a regular \`function\` + \`apply\`, not an arrow), and noticing the re-entrancy edge case.`,
  starter: onceStarter,
  solution: onceSolution,
  tests: onceTests,
  hints: [
    'You need two pieces of private state that survive between calls. Where can state live after the outer function returns?',
    'An arrow function would capture the outer `this`. Return a regular `function (this: unknown, ...args)` and call `fn.apply(this, args)`.',
    'Set your `called` flag to true BEFORE calling `fn`, so a re-entrant call sees it.',
  ],
  explanation: `**Approach:** keep \`called\` and \`result\` in the closure. Return a regular function so \`this\` is whatever the caller supplies, and forward it with \`apply\`.

**Edge cases:** re-entrancy (set the flag before invoking), \`fn\` returning \`undefined\` (don't use \`result === undefined\` as the "not called" check), and \`fn\` throwing — with this implementation a throwing first call still counts as "called" and later calls return \`undefined\`. Lodash behaves the same way; mention it and ask which behaviour the interviewer wants.

**Follow-ups you may get:**
- *"Make it reset after N ms"* → store a timestamp, compare on each call.
- *"What about memory?"* → after the first call you can drop the reference to \`fn\` (\`fn = undefined\`) so whatever it closes over can be garbage-collected.
- *"Where is this used in React?"* → lazy initialisation, e.g. \`useState(() => expensive())\` or a module-level singleton client.`,
};

const memoize: Exercise = {
  id: 'memoize',
  title: 'memoize(fn, resolver?)',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['closures', 'caching', 'generics'],
  prompt: `Implement a typed \`memoize\` like lodash's:

- The cache key is the **first argument** by default; an optional \`resolver(...args)\` computes the key instead.
- The memoized function exposes its \`cache\` (a \`Map\`) so it can be inspected or cleared.
- Cached **falsy** results (\`0\`, \`''\`, \`undefined\`) must still be cache hits.
- Forward \`this\`.

\`\`\`ts
const slowSquare = (n: number) => n * n;
const fast = memoize(slowSquare);
fast(9); // computes
fast(9); // cached
fast.cache.clear();
\`\`\`

**What the interviewer is looking for:** closure-held cache, \`Map\` vs object keys, \`has()\` vs truthiness, and a discussion of cache invalidation / memory.`,
  starter: memoizeStarter,
  solution: memoizeSolution,
  tests: memoizeTests,
  hints: [
    'Create the Map once, outside the returned function, so all calls share it.',
    'Check `cache.has(key)` rather than `if (cache.get(key))` — falsy results must still count as cached.',
    'Assign the cache onto the function object: `memoized.cache = cache` (cast the function to the `Memoized` type).',
  ],
  explanation: `**Approach:** a \`Map\` in the closure; key = \`resolver ? resolver.apply(this, args) : args[0]\`; check \`has\`, otherwise compute, store, return.

**Why \`Map\` and not \`{}\`?** Object keys are coerced to strings — \`1\` and \`'1'\` collide, and objects all become \`'[object Object]'\`. A \`Map\` keeps keys by identity (SameValueZero).

**Discussion points interviewers love:**
- **Unbounded growth.** A memo cache is a memory leak if keys are unbounded. Options: an LRU with a max size (you'll build one on Day 10), TTL expiry, or a \`WeakMap\` when keys are objects (entries disappear when the key is garbage-collected — but \`WeakMap\` can't hold primitive keys).
- **Multi-argument keys.** \`JSON.stringify(args)\` works for simple data but is slow and breaks on functions/cycles; nested Maps (a trie keyed by each argument) handle identity properly.
- **React parallel:** \`useMemo\` is a cache of size 1 keyed by the dependency array, compared with \`Object.is\`.
- **Promises:** memoizing an async function caches the *promise*, which neatly dedupes concurrent requests — but you must evict on rejection or you'll cache the failure.`,
};

const myBind: Exercise = {
  id: 'my-bind',
  title: 'Implement bind() from scratch',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['this', 'prototypes', 'classic implementation'],
  prompt: `Implement \`myBind(fn, thisArg, ...presetArgs)\` — the behaviour of \`Function.prototype.bind\` — **without** using native \`bind\`.

1. Calling the bound function calls \`fn\` with \`this === thisArg\` and arguments \`[...presetArgs, ...callArgs]\`, returning its result.
2. The binding can't be overridden by calling it as a method of another object, and binding a bound function again keeps the original \`this\`.
3. **Stretch:** when called with \`new\`, \`thisArg\` is ignored, a new instance is created, and \`instance instanceof fn\` is \`true\`.

**What the interviewer is looking for:** \`apply\` with concatenated arguments, understanding that \`new\` beats explicit binding, and knowing how to detect a constructor call (\`new.target\`).`,
  starter: bindStarter,
  solution: bindSolution,
  tests: bindTests,
  hints: [
    'Return a function that calls `fn.apply(thisArg, [...presetArgs, ...args])`.',
    'Inside a regular function, `new.target` is defined only when it was invoked with `new`.',
    'For the `new` case use `Reflect.construct(fn, args, new.target)`, and set `bound.prototype = Object.create(fn.prototype)` so `instanceof` works.',
  ],
  explanation: `**Core:** \`return function bound(...args) { return fn.apply(thisArg, [...presetArgs, ...args]); }\` — that already satisfies requirements 1 and 2, because the inner call always uses \`thisArg\` regardless of how \`bound\` itself was called.

**The \`new\` case:** native bound functions ignore \`thisArg\` when constructed. Detect it with \`new.target\` (ES2015) — the older trick is \`this instanceof bound\`. Then construct \`fn\` with \`Reflect.construct\`, and link \`bound.prototype\` to \`fn.prototype\` so instances pass \`instanceof\` checks.

**Follow-ups:**
- *"Implement \`call\` without \`call\`/\`apply\`."* → temporarily attach the function to the object under a unique \`Symbol\` key, invoke it as a method (implicit binding), then delete the key.
- *"Why can't you re-bind?"* → the bound function ignores its own \`this\`; it always applies the captured \`thisArg\`.
- *"What does \`bound.name\` / \`bound.length\` return natively?"* → \`"bound fn"\` and \`max(0, fn.length - presetArgs.length)\` — a nice detail if you want extra credit.`,
};

const myInstanceOf: Exercise = {
  id: 'my-instanceof',
  title: 'Implement instanceof',
  runtime: 'logic',
  difficulty: 'warm-up',
  estMinutes: 8,
  tags: ['prototypes'],
  prompt: `Implement \`myInstanceOf(value, Ctor)\` with the same result as \`value instanceof Ctor\`, without using \`instanceof\`.

- Walk \`value\`'s prototype chain (\`Object.getPrototypeOf\`) looking for \`Ctor.prototype\`.
- Primitives and \`null\` are never instances.
- Throw a \`TypeError\` if \`Ctor\` is not callable.

**What the interviewer is looking for:** that you know the chain ends at \`null\`, that \`instanceof\` checks \`Ctor.prototype\` (not \`constructor\`), and primitive handling.`,
  starter: instanceofStarter,
  solution: instanceofSolution,
  tests: instanceofTests,
  hints: [
    'Start from `Object.getPrototypeOf(value)` and loop until you reach `null`.',
    'Compare each prototype with `Ctor.prototype` using `===`.',
    'Return false early for anything that is not an object or function (typeof check), including null.',
  ],
  explanation: `A simple loop up the chain comparing against \`Ctor.prototype\`; O(depth of chain).

**Gotchas worth mentioning:** \`instanceof\` fails across realms (an array from an iframe isn't \`instanceof Array\` in the parent — use \`Array.isArray\`); \`Symbol.hasInstance\` lets classes customise \`instanceof\`; and \`Object.create(null)\` objects have no chain at all.`,
};

const curry: Exercise = {
  id: 'curry',
  title: 'curry(fn)',
  runtime: 'logic',
  difficulty: 'stretch',
  estMinutes: 15,
  tags: ['closures', 'higher-order functions', 'recursion'],
  prompt: `Implement \`curry(fn)\` using \`fn.length\` as the arity. The curried function accepts arguments in any grouping, and partially-applied functions must be **reusable**.

\`\`\`ts
const add3 = (a: number, b: number, c: number) => a + b + c;
const c = curry(add3);
c(1)(2)(3);  // 6
c(1, 2)(3);  // 6
const add1 = c(1);
add1(2)(3);  // 6
add1(10)(10); // 21  ← add1 must not have been "used up"
\`\`\`

**What the interviewer is looking for:** recursion over accumulated arguments, and *not* mutating a shared args array (the reuse bug).`,
  starter: curryStarter,
  solution: currySolution,
  tests: curryTests,
  hints: [
    'Write an inner `curried(...args)` that either calls `fn` (enough args) or returns another function.',
    'The returned function should call `curried(...args, ...moreArgs)` — build a new array each time.',
    'If you push into one shared array, `add1(2)` will poison `add1(10)`. Keep it immutable.',
  ],
  explanation: `**Approach:** \`curried(...args)\` → if \`args.length >= fn.length\` call \`fn\`, else return \`(...more) => curried(...args, ...more)\`. Each partial application closes over its *own* \`args\` array, so partials are independent.

**Follow-ups:**
- *"\`fn.length\` is 0 for rest parameters and stops at the first default parameter — how would you support variadic functions?"* → accept an explicit arity, or support a terminating call like \`sum(1)(2)(3)()\`.
- *"Add placeholder support (\`_\`)"* — the lodash-style stretch question.
- *"Type it in TypeScript"* — doable with recursive conditional types over tuples; you'll see techniques for that on Day 4.`,
};

const typedGet: Exercise = {
  id: 'typed-get',
  title: 'Safe get(obj, "a.b.c")',
  runtime: 'logic',
  difficulty: 'core',
  estMinutes: 15,
  tags: ['objects', 'optional chaining', 'typescript'],
  prompt: `Implement \`get(obj, path)\` for dot-separated paths (like lodash \`get\`):

\`\`\`ts
const user = { name: 'Ada', address: { city: 'London' }, manager: null };
get(user, 'address.city'); // 'London'
get(user, 'manager.name'); // undefined — never throws
\`\`\`

- Return \`undefined\` as soon as a segment is missing or a value is \`null\`/\`undefined\`.
- Preserve falsy values (\`0\`, \`''\`, \`false\`).
- Empty path returns the object itself.

**Stretch (types):** the starter declares \`Path<T>\` and \`PathValue<T, P>\`. Make \`Path<T>\` a union of all valid dot paths and \`PathValue\` the type at that path, so \`get(user, 'address.city')\` is typed \`string\` and a typo is a compile error. The tests only check runtime behaviour; the type checker panel will show you whether your types hold up. (You'll learn the techniques properly on Day 4 — come back to this.)`,
  starter: getStarter,
  solution: getSolution,
  tests: getTests,
  hints: [
    "Split the path on '.' and walk segment by segment.",
    'Before reading each segment, check whether the current value is null or undefined and bail out with undefined.',
    'Types: `Path<T>` can be a mapped type over `keyof T & string` that produces `K | `${K}.${Path<T[K]>}``, indexed with `[keyof T & string]` to turn it into a union.',
  ],
  explanation: `**Runtime:** a loop with an early return on \`null\`/\`undefined\` — essentially what optional chaining (\`a?.b?.c\`) does for static paths. Don't use \`||\`/truthiness checks or you'll lose falsy values.

**Types:** \`Path<T>\` is a recursive mapped type that builds template-literal unions (\`'address' | 'address.city' | …\`), and \`PathValue\` uses \`infer\` on \`\${infer Head}.\${infer Rest}\` to walk the type. Treat arrays and other built-ins as leaves to avoid infinite or huge unions. This is the same technique used by typed form libraries (e.g. react-hook-form's \`Path\` types).

**Follow-ups:** support array indices (\`'items.0.id'\` or \`'items[0].id'\`), implement \`set(obj, path, value)\` immutably (copy every object along the path — exactly what a reducer does), and discuss why you'd prefer optional chaining in application code.`,
};

const day: Day = {
  number: 1,
  title: 'JavaScript Core, the TypeScript Way',
  tagline: 'Scope, closures, this, prototypes and coercion — explained precisely and implemented from scratch.',
  summary:
    'Almost every frontend coding question rests on four ideas: lexical scope and closures, call-time `this`, the prototype chain, and how values compare and coerce. Today you make them automatic — explained in interview vocabulary, predicted in tricky output questions, and implemented (`once`, `memoize`, `bind`, `instanceof`, `curry`) in strict TypeScript. You also set up your practice repo and Claude Code.',
  objectives: [
    'Explain lexical scope, hoisting and the temporal dead zone in under a minute',
    'Define a closure precisely and connect it to stale closures in React',
    'Predict `this` for any call form and fix lost-`this` bugs three ways',
    'Describe the prototype chain and what `new` and `class` actually do',
    'Implement once, memoize, bind, instanceof and curry in TypeScript',
    'Set up fe-gym with Claude Code and a coaching-mode CLAUDE.md',
  ],
  skills: ['javascript', 'typescript', 'agentic', 'interviewing'],
  blocks: [
    { kind: 'lesson', id: 'orientation', title: 'How this course works (and why interviews go wrong)', minutes: 15, body: orientation },
    {
      kind: 'lesson',
      id: 'scope-closures',
      title: 'Scope, hoisting & closures',
      minutes: 40,
      body: scopeClosures,
      checks: [
        {
          id: 'tdz-typeof',
          prompt: 'What happens when this runs?',
          code: `function check() {\n  console.log(typeof value);\n  let value = 1;\n}\ncheck();`,
          codeLang: 'ts',
          runnable: true,
          choices: ['Logs "undefined"', 'Logs "number"', 'Throws a ReferenceError', 'Logs "object"'],
          answer: 2,
          explanation:
            "`value` is hoisted to the top of the function scope but stays **uninitialised** until `let value = 1` runs. Even `typeof` throws during the temporal dead zone. `typeof` only returns `'undefined'` safely for names that are not declared at all (or are `var`).",
        },
        {
          id: 'closure-captures-variables',
          prompt: 'What does this log?',
          code: `let message = 'hello';\nconst say = () => console.log(message);\nmessage = 'goodbye';\nsay();`,
          codeLang: 'ts',
          runnable: true,
          choices: ['hello', 'goodbye', 'undefined', 'ReferenceError'],
          answer: 1,
          explanation:
            'Closures capture **variables (bindings)**, not values. `say` reads `message` when it runs, after it was reassigned. If closures captured values, every stale-closure bug in React would behave differently.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'this-binding',
      title: '`this`, call/apply/bind and `new`',
      minutes: 35,
      body: thisBinding,
      checks: [
        {
          id: 'this-method-extracted',
          prompt: 'In an ES module (strict mode), what does this log?',
          code: `const counter = {\n  count: 10,\n  read() { return this?.count; },\n};\nconst read = counter.read;\nconsole.log(counter.read(), read());`,
          codeLang: 'ts',
          runnable: true,
          choices: ['10 10', '10 undefined', 'undefined undefined', 'Throws TypeError'],
          answer: 1,
          explanation:
            '`counter.read()` uses implicit binding (`this === counter`). `read()` is a plain call, so `this` is `undefined` in strict code; `this?.count` short-circuits to `undefined`. Without the `?.` it would throw a TypeError — which is what happens in real lost-`this` bugs.',
        },
      ],
    },
    {
      kind: 'lesson',
      id: 'prototypes-types',
      title: 'Prototypes, classes, equality & coercion',
      minutes: 30,
      body: prototypesTypes,
      checks: [
        {
          id: 'proto-shared-method',
          prompt: 'Two instances created with `new Dog()` share which of these?',
          code: `class Dog {\n  name = 'Rex';\n  bark() { return 'woof'; }\n  wag = () => 'wag';\n}\nconst a = new Dog();\nconst b = new Dog();\nconsole.log(a.bark === b.bark, a.wag === b.wag);`,
          codeLang: 'ts',
          runnable: true,
          choices: [
            'Both `bark` and `wag` (logs true true)',
            'Only `bark` (logs true false)',
            'Only `wag` (logs false true)',
            'Neither (logs false false)',
          ],
          answer: 1,
          explanation:
            '`bark` is a method defined on `Dog.prototype`, shared by all instances. `wag` is a **class field**, so it is created per instance in the constructor — a new arrow function for each object. That\'s the memory trade-off of arrow-function class fields.',
        },
      ],
    },
    {
      kind: 'quiz',
      id: 'output-prediction',
      title: 'Output prediction: JS core',
      minutes: 15,
      intro: 'Commit to an answer before revealing. Then run the code and read the explanation, even when you were right.',
      questions: [
        {
          id: 'var-loop-timeout',
          prompt: 'What does this log?',
          code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}`,
          codeLang: 'ts',
          runnable: true,
          choices: ['0 1 2', '3 3 3', '2 2 2', 'undefined ×3'],
          answer: 1,
          explanation:
            '`var` is function-scoped, so there is a single `i` shared by all three callbacks. The callbacks run after the loop finishes, when `i === 3`. With `let`, each iteration gets a fresh binding and you would see `0 1 2`.',
        },
        {
          id: 'hoisting-function-vs-var',
          prompt: 'What does this log?',
          code: `console.log(typeof greet, typeof greetFn);\nfunction greet() {}\nvar greetFn = function () {};`,
          codeLang: 'ts',
          runnable: true,
          choices: ['function function', 'function undefined', 'undefined undefined', 'ReferenceError'],
          answer: 1,
          explanation:
            'Function **declarations** are hoisted with their body. `greetFn` is a `var` holding a function **expression**: the binding is hoisted and initialised to `undefined`, and the assignment happens later.',
        },
        {
          id: 'arrow-this-object-literal',
          prompt: 'In strict mode, what does `obj.getName()` return?',
          code: `const obj = {\n  name: 'obj',\n  getName: () => this?.name,\n};\nconsole.log(obj.getName());`,
          codeLang: 'ts',
          runnable: true,
          choices: ["'obj'", 'undefined', "'' (empty string)", 'Throws TypeError'],
          answer: 1,
          explanation:
            'Arrow functions take `this` from the enclosing scope. An object literal does **not** create a scope, so `this` is the module/top-level `this` (`undefined` in modules). Use method shorthand `getName() { … }` instead.',
        },
        {
          id: 'equality-quirks',
          prompt: 'Which comparison is `true`?',
          choices: ['NaN === NaN', 'Object.is(0, -0)', 'null == undefined', "[] == []"],
          answer: 2,
          explanation:
            '`null == undefined` is true by the loose-equality rules (and nothing else is loosely equal to them) — the basis of the `x == null` idiom. `NaN` is never `===` itself, `Object.is` distinguishes `0` and `-0`, and two distinct array objects are never equal by reference.',
        },
        {
          id: 'nullish-vs-or',
          prompt: 'What does this log?',
          code: `const count = 0;\nconst label = '';\nconsole.log(count || 10, count ?? 10, label || 'none', label ?? 'none');`,
          codeLang: 'ts',
          runnable: true,
          choices: ["10 0 none ''", '10 10 none none', "0 0 '' ''", '10 0 none (empty string)'],
          answer: 3,
          explanation:
            '`||` falls back on any falsy value (`0`, `\'\'`), `??` only on `null`/`undefined`. So `count ?? 10` is `0` and `label ?? \'none\'` is the empty string (console.log prints it as nothing). This is why `??` is right for numeric/string defaults.',
        },
        {
          id: 'closure-counter-shared',
          prompt: 'What does this log?',
          code: `function makeCounter() {\n  let n = 0;\n  return () => ++n;\n}\nconst a = makeCounter();\nconst b = a;\nconst c = makeCounter();\na(); b(); c();\nconsole.log(a(), c());`,
          codeLang: 'ts',
          runnable: true,
          choices: ['3 2', '2 2', '3 1', '1 1'],
          answer: 0,
          explanation:
            '`b` is the same function as `a` (same closure), so `a(); b();` increments the same `n` to 2, and the final `a()` makes it 3. `c` has its own environment: `c()` → 1, then `c()` → 2.',
        },
        {
          id: 'prototype-shadowing',
          prompt: 'What does this log?',
          code: `const base = { greeting: 'hi', items: [] as string[] };\nconst child = Object.create(base);\nchild.greeting = 'hey';\nchild.items.push('x');\nconsole.log(base.greeting, base.items.length);`,
          codeLang: 'ts',
          runnable: true,
          choices: ['hi 0', 'hey 1', 'hi 1', 'hey 0'],
          answer: 2,
          explanation:
            '**Assignment** creates an own property on `child`, shadowing `base.greeting`. But `child.items.push` first **reads** `items` — found on the prototype — and mutates that shared array. Shared mutable state on prototypes is a classic bug.',
        },
        {
          id: 'new-returns-object',
          prompt: 'What does this log?',
          code: `function Thing(this: any) {\n  this.a = 1;\n  return { b: 2 };\n}\nconst t = new (Thing as any)();\nconsole.log(t.a, t.b);`,
          codeLang: 'ts',
          runnable: true,
          choices: ['1 undefined', 'undefined 2', '1 2', 'Throws TypeError'],
          answer: 1,
          explanation:
            'If a constructor returns an **object**, `new` returns that object instead of the newly created `this`. Returning a primitive is ignored. That is step 3 of the `new` algorithm.',
        },
        {
          id: 'coercion-plus',
          prompt: "What is `[1, 2] + [3]`?",
          choices: ["'1,23'", '[1, 2, 3]', '6', "'1,2,3'"],
          answer: 0,
          explanation:
            'Arrays convert to primitives via `toString()` (`[1, 2]` → `"1,2"`, `[3]` → `"3"`); with a string operand, `+` concatenates: `"1,2" + "3"` → `"1,23"`.',
        },
        {
          id: 'setstate-same-reference',
          prompt: 'In React, `items.push(newItem); setItems(items);` does not re-render. Why?',
          choices: [
            'React batches the update and drops it',
            'React compares the new and old state with Object.is; it is the same array reference, so React bails out',
            'push() is asynchronous',
            'setState only accepts primitives',
          ],
          answer: 1,
          explanation:
            'React uses `Object.is` to decide whether state changed. Mutating the array keeps the same reference, so the update is skipped (and you\'ve corrupted the previous render\'s snapshot). Create a new array: `setItems([...items, newItem])`.',
        },
      ],
    },
    {
      kind: 'exercise',
      id: 'implement-from-scratch',
      title: 'Implement from scratch',
      minutes: 55,
      intro:
        "Interview conditions: start the timer, talk out loud, no AI. Do the warm-ups first. Read each explanation after passing — the follow-up questions are what separates a 'pass' from a 'strong hire'. If you finish early, do the stretch exercise.",
      exercises: [once, memoize, myBind, myInstanceOf, curry, typedGet],
    },
    {
      kind: 'lab',
      id: 'agentic-setup',
      track: 'agentic',
      title: 'Claude Code: set up fe-gym and a coaching CLAUDE.md',
      minutes: 35,
      body: labSetup,
      checklist: [
        'fe-gym created with Vite (react-ts), Vitest, Testing Library; `npm test -- --run` passes',
        'Claude Code installed and started from the repo root',
        'CLAUDE.md generated with /init, then rewritten with commands, conventions and coaching-mode rules',
        'once/memoize re-typed from memory in src/drills/functions.ts with Claude-written tests',
        'Tried Shift+Tab to cycle permission modes and Esc to interrupt',
        'Reflection written in notes/day01.md',
      ],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro: 'Answer each question out loud in 60–90 seconds before revealing the model answer. Grade yourself honestly.',
    },
  ],
  flashcards: [
    { id: 'lexical-scope', front: 'What is **lexical scope**?', back: 'Variable resolution is determined by where code is **written** (its position in nested scopes), not where a function is called from.' },
    { id: 'closure-def', front: 'Define a **closure** in one sentence.', back: 'A function bundled with references to the **variables** of the scope where it was created, so it can use them after that scope has returned.' },
    { id: 'tdz', front: 'What is the **temporal dead zone**?', back: 'The period between entering a scope and the `let`/`const`/`class` declaration being evaluated. Accessing the binding then throws a `ReferenceError` (even with `typeof`).' },
    { id: 'var-vs-let-loop', front: 'Why does `for (let i…)` fix the setTimeout-in-a-loop bug?', back: '`for (let …)` creates a **new binding per iteration** (initialised from the previous one), so each closure captures its own `i`. `var` has one function-scoped binding.' },
    { id: 'this-rules', front: 'The four `this` binding rules, highest priority first?', back: '1. `new` → new object. 2. `call/apply/bind` → explicit object. 3. `obj.fn()` → `obj`. 4. Plain call → `undefined` (strict) / `globalThis` (sloppy). Arrows: lexical `this`.' },
    { id: 'arrow-this', front: 'Can you change an arrow function\'s `this` with `call` or `bind`?', back: 'No. Arrow functions have no own `this`; they resolve it lexically from the enclosing scope, and `call/apply/bind` only change arguments.' },
    { id: 'bind-rebind', front: 'What happens when you `bind` an already-bound function to a new object?', back: 'The original `this` wins — bound functions ignore the new `thisArg` (extra preset arguments are still appended). Only `new` overrides a bound `this`.' },
    { id: 'new-steps', front: 'What does `new F(...args)` do?', back: '1. Create an object with `[[Prototype]] = F.prototype`. 2. Call `F` with `this` = that object. 3. Return F\'s result if it is an object, otherwise the new object.' },
    { id: 'proto-vs-prototype', front: '`Object.getPrototypeOf(obj)` vs `F.prototype`?', back: 'The first is an object\'s internal `[[Prototype]]` link used for lookups. `F.prototype` is a property on functions: the object that instances created by `new F()` get as their `[[Prototype]]`.' },
    { id: 'ts-private-vs-hash', front: 'TypeScript `private x` vs `#x`?', back: '`private` is compile-time only — the property is public at runtime. `#x` is a JavaScript private field enforced by the engine (inaccessible outside the class body).' },
    { id: 'falsy-values', front: 'List all falsy values.', back: '`false`, `0`, `-0`, `0n`, `\'\'`, `null`, `undefined`, `NaN`. Everything else (including `[]`, `{}`, `\'0\'`) is truthy.' },
    { id: 'nullish-coalescing', front: '`a ?? b` vs `a || b`?', back: '`??` falls back only when `a` is `null`/`undefined`; `||` falls back on any falsy value (`0`, `\'\'`, `false`…). Use `??` for defaults where 0/empty are valid.' },
    { id: 'object-is', front: 'How does `Object.is` differ from `===`, and where does React use it?', back: '`Object.is(NaN, NaN)` is true and `Object.is(0, -0)` is false. React uses it to compare state and hook dependencies.' },
    { id: 'class-field-arrow', front: 'Trade-off of `handle = () => {}` class fields?', back: 'Always bound to the instance, but a **new function per instance** (not on the prototype): more memory and can\'t be called via `super.handle()`.' },
  ],
  interviewQuestions: [
    {
      id: 'explain-closure',
      kind: 'concept',
      question: 'What is a closure? Give a practical example from frontend work.',
      answer: `**One-liner:** a closure is a function together with references to the variables in the scope where it was defined, so it can keep using them after that outer function has returned.

**Why it exists:** JavaScript is lexically scoped and functions are first-class values, so when a function escapes its defining scope (returned, passed as a callback), its environment stays alive as long as the function is reachable.

**Practical examples:**
- \`debounce\`/\`throttle\` keep the timer id in a closure between calls.
- Private state: a \`createStore()\` factory exposing \`getState\`/\`subscribe\` while the state variable stays private.
- React hooks: every render's event handlers close over that render's props and state — that's why state is a snapshot and why you get **stale closures** in intervals/effects that aren't re-created (fix with functional updates or correct dependencies).

**Caveat to show depth:** closures capture *variables*, not values, and they keep memory alive — un-removed listeners and timers are a common leak, which is why effects return cleanup functions.`,
      followUps: ['What is a stale closure in React and how do you fix it?', 'Do closures capture values or variables?', 'How can closures cause memory leaks?'],
      minutes: 2,
    },
    {
      id: 'explain-hoisting',
      kind: 'concept',
      question: 'Explain hoisting. How do `var`, `let`, `const` and function declarations differ?',
      answer: `**One-liner:** when a scope is entered, bindings for all its declarations are created before any code runs — that's hoisting — but they're initialised differently.

- \`var\`: function-scoped, initialised to \`undefined\`, so reading it early gives \`undefined\`.
- \`let\`/\`const\`/\`class\`: block-scoped, the binding exists but is **uninitialised** until the declaration executes. Accessing it earlier throws a ReferenceError — the temporal dead zone. \`const\` additionally can't be reassigned (but the object it points to can be mutated).
- Function declarations: hoisted *with their body*, so you can call them before their line. Function expressions and arrow functions follow the rules of the variable they're assigned to.

**Why it matters:** the TDZ catches use-before-define bugs; \`var\`'s function scope causes the classic loop/closure bug; and in practice I use \`const\` by default, \`let\` when reassignment is needed, and never \`var\`.`,
      followUps: ['Why does `typeof` throw in the TDZ but not for undeclared variables?', 'Are classes hoisted?'],
      minutes: 2,
    },
    {
      id: 'explain-this',
      kind: 'concept',
      question: 'How is `this` determined in JavaScript?',
      answer: `**One-liner:** for normal functions, \`this\` is decided by *how the function is called*; arrow functions don't have their own \`this\` and use the surrounding one.

**The rules in priority order:**
1. Called with \`new\` → the newly created object.
2. \`call\`, \`apply\`, or a \`bind\`-ed function → the object passed explicitly.
3. Called as \`obj.method()\` → \`obj\`, the thing left of the dot at the call site.
4. Plain call → \`undefined\` in strict mode (modules and classes are strict), or the global object in sloppy scripts.

**The practical consequence:** passing \`obj.method\` as a callback loses \`this\` because the call site is now a plain call. Fixes: wrap it in an arrow (\`() => obj.method()\`), \`bind\` it, or define it as an arrow class field — which binds per instance at the cost of one function per instance.

**TypeScript tip:** declaring a \`this\` parameter (\`function f(this: Foo)\`) turns detached calls into compile errors.`,
      followUps: ['What does `this` refer to inside an event listener?', 'Why can\'t you re-bind a bound function?', 'Implement `call` without using call/apply.'],
      minutes: 2,
    },
    {
      id: 'explain-prototypes',
      kind: 'concept',
      question: 'Explain prototypal inheritance. Is `class` just syntactic sugar?',
      answer: `**One-liner:** every object has an internal link to a prototype object; property lookups that miss on the object walk that chain until they find the property or hit \`null\`.

**How \`new\` uses it:** \`new F()\` creates an object whose prototype is \`F.prototype\`, runs \`F\` with \`this\` bound to it, and returns it. Methods placed on \`F.prototype\` are therefore shared by all instances, while data set in the constructor is per-instance.

**Is \`class\` sugar?** Mostly — \`class A extends B\` still wires \`A.prototype\`'s prototype to \`B.prototype\`. But it adds real semantics: class bodies are strict, classes can't be called without \`new\`, they're in the TDZ until evaluated, methods are non-enumerable, and there are features with no ES5 equivalent: \`#private\` fields, \`static\` blocks, and \`super\` property access.

**Bonus detail:** TypeScript's \`private\` is compile-time only, while \`#private\` is enforced at runtime.`,
      followUps: ['What does `Object.create(null)` give you and why use it?', 'How does `instanceof` work?', 'What problem can shared mutable state on a prototype cause?'],
      minutes: 2,
    },
    {
      id: 'explain-equality',
      kind: 'concept',
      question: 'What is the difference between `==`, `===` and `Object.is`? Which does React use?',
      answer: `**\`===\` (strict equality):** no type coercion; different types are never equal. Two quirks: \`NaN !== NaN\` and \`+0 === -0\`.

**\`==\` (loose equality):** coerces operands first (e.g. \`'1' == 1\`, \`null == undefined\`). The rules are surprising enough that I avoid it — except \`x == null\`, a concise check for "null or undefined".

**\`Object.is\` (SameValue):** like \`===\` but \`Object.is(NaN, NaN)\` is true and \`Object.is(0, -0)\` is false.

**React:** uses \`Object.is\` to compare state for bail-outs, hook dependency arrays, and \`memo\` props (shallowly, per prop). Because objects are compared by reference, mutating state in place doesn't trigger a re-render — you must produce a new object or array. That's the practical reason React code is written immutably.`,
      followUps: ['Why does mutating an array in state not re-render?', 'What is a shallow comparison?'],
      minutes: 2,
    },
    {
      id: 'why-ai-coaching',
      kind: 'agentic',
      question: 'How do you set up an AI coding agent so it is useful in a real codebase rather than generating generic code?',
      answer: `**One-liner:** give it the same onboarding you'd give a new teammate — a concise project memory file with commands, conventions and guardrails — and keep that file in version control.

**What goes in it (CLAUDE.md for Claude Code):** how to build/test/type-check, the architecture in a few lines, coding conventions (strict TS, testing approach, component patterns), and explicit "don'ts" (don't touch generated files, don't add dependencies without asking). Keep it short — it's loaded every session, so every line costs context.

**How I use it day to day:** read-only exploration first ("explain how X works"), then planning before edits for anything non-trivial, and always a verification step — tests, type-check, or a screenshot — so the agent can check its own work.

**Accountability:** I review agent output like a PR; I own what gets merged.`,
      followUps: ['What would you never let an agent do unattended?', 'How do you keep the memory file from going stale?'],
      minutes: 2,
    },
  ],
};

export default day;
