## Prototypes: how inheritance actually works

JavaScript objects have a hidden link, `[[Prototype]]`, to another object (or `null`). When you read a property that isn't on the object itself, the engine follows that link — the **prototype chain** — until it finds the property or reaches `null`.

```ts run
const animal = {
  describe() {
    return `${this.name} says ${this.sound}`;
  },
};

const dog = Object.create(animal); // dog.[[Prototype]] === animal
dog.name = 'Rex';
dog.sound = 'woof';

console.log(dog.describe()); // found on the prototype, `this` is still dog
console.log(Object.getPrototypeOf(dog) === animal, Object.hasOwn(dog, 'describe'));
console.log(Object.getPrototypeOf(Object.getPrototypeOf(animal))); // end of the chain
```

Three things that confuse people — get them straight:

| Thing | What it is |
|---|---|
| `obj.[[Prototype]]` | The internal link used for property lookup. Read it with `Object.getPrototypeOf(obj)` (`__proto__` is a legacy accessor). |
| `Fn.prototype` | A regular property on **functions**: the object that becomes `[[Prototype]]` of instances created with `new Fn()`. |
| `instance.constructor` | Usually inherited from `Fn.prototype.constructor`, pointing back at `Fn`. Not reliable — it's just a property. |

> [!INTERVIEW] Say it like this
> "Every object has an internal prototype link. Property reads walk that chain until they find the key or hit null; writes go on the object itself. `new F()` creates an object whose prototype is `F.prototype`, which is how methods are shared between instances. `class` syntax is mostly sugar over the same mechanism, plus some real additions like private fields and stricter semantics."

### Classes are (mostly) sugar

```ts run
class Shape {
  #id = Math.random().toString(36).slice(2, 7); // truly private (not just TS-private)
  constructor(public name: string) {}
  area(): number {
    return 0;
  }
  toString() {
    return `${this.name} with area ${this.area().toFixed(2)}`;
  }
}

class Circle extends Shape {
  constructor(private r: number) {
    super('circle'); // must call super() before using `this`
  }
  override area() {
    return Math.PI * this.r ** 2;
  }
}

const c = new Circle(2);
console.log(String(c));
console.log(Object.getPrototypeOf(c) === Circle.prototype);
console.log(Object.getPrototypeOf(Circle.prototype) === Shape.prototype);
console.log(typeof Circle, Object.getOwnPropertyNames(Shape.prototype));
```

What `class` adds beyond sugar: class bodies are always strict mode; classes can't be called without `new`; class declarations are in the TDZ until evaluated; methods are non-enumerable; `#private` fields and `static` blocks; `super` property access.

> [!NOTE] TypeScript `private` vs `#private`
> TS `private` is **compile-time only** — the property is a normal public property at runtime. `#field` is enforced by the JavaScript engine. Interviewers love this distinction.

## Types, equality and coercion

You don't need to memorise the whole coercion table, but you must know the rules that produce interview questions.

**Primitive types** (7): `string`, `number`, `bigint`, `boolean`, `undefined`, `symbol`, `null`. Everything else is an object (including arrays and functions).

`typeof` quirks: `typeof null === 'object'` (a historic bug), `typeof function(){} === 'function'`, `typeof [] === 'object'` (use `Array.isArray`), `typeof undeclaredVariable === 'undefined'` (no ReferenceError — except in the TDZ).

### `===` vs `==` vs `Object.is`

| | `NaN` vs `NaN` | `+0` vs `-0` | `'1'` vs `1` | `null` vs `undefined` |
|---|---|---|---|---|
| `===` (strict) | false | true | false | false |
| `==` (loose) | false | true | **true** | **true** |
| `Object.is` (SameValue) | **true** | **false** | false | false |

React uses `Object.is` to decide whether state changed and to compare hook dependencies — which is why mutating an array and calling `setItems(items)` does nothing.

The only `==` worth using deliberately: `value == null` checks for both `null` and `undefined`.

### Truthiness

Falsy values: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. **Everything else is truthy** — including `'0'`, `'false'`, `[]`, `{}`.

React gotcha: `{items.length && <List />}` renders a literal `0` when the list is empty, because `0` is falsy but still a renderable value. Use `items.length > 0 && …`.

### `??` vs `||`, and `?.`

```ts run
const settings = { volume: 0, title: '', theme: undefined as string | undefined };

console.log('||', settings.volume || 50, JSON.stringify(settings.title || 'Untitled'));
console.log('??', settings.volume ?? 50, JSON.stringify(settings.title ?? 'Untitled'));
console.log('theme', settings.theme ?? 'system');

const user: { profile?: { avatar?: { url: string } } } = {};
console.log('optional chaining:', user.profile?.avatar?.url);
```

`||` falls back on **any falsy** value; `??` only on `null`/`undefined`. Using `||` for numeric settings is a classic bug.

### Coercion rules that show up in "what does this print?"

- `+` with a string operand concatenates: `1 + '2' === '12'`; other arithmetic operators convert to numbers: `'6' / '2' === 3`.
- Objects convert to primitives via `Symbol.toPrimitive`, then `valueOf`, then `toString`: `[] + [] === ''`, `[1, 2] + '' === '1,2'`, `({}) + '' === '[object Object]'`.
- `Number('')`, `Number(' ')`, `Number(null)`, `Number([])` are all `0`; `Number(undefined)` and `Number('x')` are `NaN`.

```ts run
const show = (label: string, value: unknown) => console.log(label.padEnd(18), JSON.stringify(value));
show("1 + '2'", (1 as any) + '2');
show("'3' * '4'", ('3' as any) * ('4' as any));
show('[] + []', ([] as any) + []);
show('[1,2] + [3]', ([1, 2] as any) + [3]);
show('true + 1', (true as any) + 1);
show("Number('')", Number(''));
show('Number(null)', Number(null));
show('Number(undefined)', Number(undefined));
show('0.1 + 0.2', 0.1 + 0.2);
```

> [!MISTAKE]
> Comparing floats with `===`. `0.1 + 0.2 !== 0.3` because numbers are IEEE-754 doubles. Compare with a tolerance (`Math.abs(a - b) < Number.EPSILON`) or work in integer cents.

### Value vs reference

Primitives are compared and copied by value. Objects are compared by **reference** (`{} !== {}`), and assignment copies the reference. Function arguments are passed by "sharing": the function gets a copy of the reference, so it can mutate the object but can't reassign the caller's variable.

This is the foundation of React's immutable-update rule: React compares references (`Object.is`), so you must create a new object/array to signal a change.

{{quiz:proto-shared-method}}

## Key takeaways

- Property lookup walks the `[[Prototype]]` chain; `new F()` links instances to `F.prototype`.
- `class` is mostly sugar over prototypes, plus strict mode, TDZ, `#private` fields and `super`.
- TS `private` is compile-time only; `#private` is a runtime guarantee.
- Know the falsy list, `??` vs `||`, `===` vs `Object.is` (React uses `Object.is`).
- Objects compare by reference — which is why React needs immutable updates.
