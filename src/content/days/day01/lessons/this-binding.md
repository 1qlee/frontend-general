## Why interviewers ask about `this`

`this` questions test whether you understand that **`this` is determined by how a function is called, not where it is defined** (arrow functions being the exception). It shows up in output-prediction questions, in "implement `bind`/`call`" questions, and in practical bugs: passing a method as a callback, class components, event handlers, and libraries that call your functions.

## The rules, in priority order

For a regular (non-arrow) function, `this` is decided at **call time** by these rules, highest priority first:

| # | Call form | `this` is… | Example |
|---|---|---|---|
| 1 | `new fn()` | the newly created object | `new User()` |
| 2 | `fn.call(obj)` / `fn.apply(obj)` / bound function | `obj` (explicit binding) | `greet.call(ada)` |
| 3 | `obj.fn()` | `obj` — the object **left of the dot at the call site** (implicit binding) | `user.greet()` |
| 4 | `fn()` (plain call) | `undefined` in strict mode / modules / classes; `globalThis` in sloppy scripts (default binding) | `const g = user.greet; g()` |

**Arrow functions don't have their own `this`.** They resolve `this` lexically from the enclosing scope, like any other variable — and `call`/`apply`/`bind` can't change it.

```ts run
'use strict';

const user = {
  name: 'Ada',
  regular() {
    return this?.name;
  },
  arrow: () => {
    // `this` here is the module's top-level `this`, NOT `user`
    return typeof this;
  },
};

console.log('implicit:', user.regular());

const detached = user.regular;
console.log('default (lost):', detached());

console.log('explicit:', user.regular.call({ name: 'Grace' }));
console.log('arrow ignores call:', user.arrow.call({ name: 'nope' }));
```

> [!INTERVIEW] Say it like this
> "`this` is a call-time binding. With `new` it's the new object; with `call`, `apply` or `bind` it's whatever you pass; when you call `obj.method()` it's `obj`; and a plain function call gets `undefined` in strict mode. Arrow functions are the exception — they don't bind `this` at all, they close over the `this` of the surrounding scope."

## Losing `this`: the most common real bug

Implicit binding only happens at the **call site**. As soon as you pass `obj.method` somewhere as a value — a callback, an event handler, `setTimeout`, `array.map` — the receiver is gone.

```ts run
class Clock {
  seconds = 0;
  tick() {
    this.seconds++;
    return this.seconds;
  }
  // Class field with an arrow function: `this` is captured per instance at construction time
  tickArrow = () => {
    this.seconds++;
    return this.seconds;
  };
}

const clock = new Clock();
const callbacks = [clock.tick, clock.tickArrow];

for (const cb of callbacks) {
  try {
    console.log(cb.name || 'arrow', '→', cb());
  } catch (e) {
    console.log('TypeError:', (e as Error).message);
  }
}
```

Three ways to fix it, and their trade-offs:

1. **Wrap at the call site:** `setTimeout(() => clock.tick())` — clear and cheap.
2. **`bind` once:** `this.tick = this.tick.bind(this)` in the constructor (the class-component era idiom).
3. **Arrow class fields:** `tick = () => {…}` — always bound, but creates **one function per instance** (not on the prototype), so it can't be overridden via `super.tick()` and uses more memory with many instances.

> [!NOTE]
> In function components you rarely think about `this` — handlers are closures, not methods. But interviewers still ask it because it reveals how well you understand the language underneath React, and because DOM/event APIs and many libraries still use it (`addEventListener` calls the handler with `this === event.currentTarget` for regular functions).

## `call`, `apply`, `bind`

| Method | Invokes immediately? | Arguments | Returns |
|---|---|---|---|
| `fn.call(thisArg, a, b)` | Yes | listed individually | fn's result |
| `fn.apply(thisArg, [a, b])` | Yes | as an array | fn's result |
| `fn.bind(thisArg, a)` | No | presets (partial application) | a new **bound function** |

Properties of bound functions you should know (you'll implement them today):

- A bound function **can't be re-bound** — `bind` on a bound function keeps the original `this` (only extra arguments are added).
- When called with `new`, the bound `this` is **ignored** and a new instance is created (`new` has higher priority).
- Arrow functions can't be bound to a different `this` at all.

```ts run
function introduce(this: { name: string }, greeting: string, punctuation: string) {
  return `${greeting}, I'm ${this.name}${punctuation}`;
}

const ada = { name: 'Ada' };
console.log(introduce.call(ada, 'Hi', '!'));
console.log(introduce.apply(ada, ['Hello', '.']));

const hey = introduce.bind(ada, 'Hey');
console.log(hey('?'));

const rebound = hey.bind({ name: 'Grace' });
console.log('re-bound still uses Ada →', rebound('…'));
```

## `this` with `new`

`new Fn(args)` does roughly this (you'll be asked to implement it):

1. Create a new object whose `[[Prototype]]` is `Fn.prototype`.
2. Call `Fn` with `this` set to that object.
3. If `Fn` returns an **object**, that object is the result; otherwise the new object is returned.

```ts run
function myNew<T>(Ctor: (...args: any[]) => any, ...args: unknown[]): T {
  const obj = Object.create(Ctor.prototype);
  const result = Ctor.apply(obj, args);
  return (result !== null && (typeof result === 'object' || typeof result === 'function') ? result : obj) as T;
}

function Person(this: { name: string }, name: string) {
  this.name = name;
}
Person.prototype.hello = function () {
  return 'hi from ' + this.name;
};

const p = myNew<{ name: string; hello(): string }>(Person, 'Linus');
console.log(p.name, '|', p.hello(), '|', p instanceof (Person as any));
```

## TypeScript and `this`

TypeScript lets you declare the expected `this` as a fake first parameter — it's erased at compile time, but catches detached calls:

```ts
function area(this: { w: number; h: number }) {
  return this.w * this.h;
}
area(); // ❌ error: The 'this' context of type 'void' is not assignable to method's 'this'
area.call({ w: 2, h: 3 }); // ✅
```

With `"noImplicitThis": true` (part of `strict`), TypeScript errors when `this` would be implicitly `any`. Also useful: `ThisParameterType<F>` and `OmitThisParameter<F>` utility types.

## Edge cases interviewers like

- **Callbacks given by APIs:** `[1, 2].map(function () { return this; }, ctx)` — many array methods accept a `thisArg`.
- **Getters and methods on prototypes** get `this` = the object the property was looked up on, even if found up the prototype chain.
- **Event listeners:** for a regular function, `this === event.currentTarget`; for an arrow function, it's the lexical `this`.
- **`globalThis`** is the standard way to reach the global object in any environment (window, worker, Node).

{{quiz:this-method-extracted}}

## Key takeaways

- `this` is decided at **call time**: `new` > explicit (`call/apply/bind`) > implicit (`obj.fn()`) > default (`undefined` in strict code).
- Arrow functions have **lexical** `this` and ignore `call/apply/bind`.
- Passing `obj.method` as a value loses the receiver; fix with a wrapper arrow, `bind`, or an arrow class field (one function per instance).
- Bound functions can't be re-bound, and `new` overrides the bound `this`.
- TypeScript's `this` parameter makes detached-method bugs compile-time errors.
