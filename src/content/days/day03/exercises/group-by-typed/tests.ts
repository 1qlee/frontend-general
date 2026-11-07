import { describe, it, expect } from 'vitest';
import { groupBy } from './solution';

interface Person {
  name: string;
  team: 'core' | 'infra';
  age: number;
}

const people: Person[] = [
  { name: 'Ada', team: 'core', age: 36 },
  { name: 'Linus', team: 'infra', age: 28 },
  { name: 'Grace', team: 'core', age: 45 },
];

describe('groupBy', () => {
  it('groups by a string key and keeps the original order inside each group', () => {
    const byTeam = groupBy(people, (p) => p.team);
    expect(byTeam).toEqual({ core: [people[0], people[2]], infra: [people[1]] });
    expect(byTeam.core?.[0]).toBe(people[0]); // same references, not copies
  });

  it('passes the index as the second argument', () => {
    const evenOdd = groupBy(['a', 'b', 'c', 'd', 'e'], (_, i) => (i % 2 === 0 ? 'even' : 'odd'));
    expect(evenOdd).toEqual({ even: ['a', 'c', 'e'], odd: ['b', 'd'] });
  });

  it('supports numeric keys', () => {
    const byDecade = groupBy(people, (p) => Math.floor(p.age / 10) * 10);
    expect(byDecade[20]).toEqual([people[1]]);
    expect(byDecade[30]).toEqual([people[0]]);
    expect(byDecade[40]).toEqual([people[2]]);
  });

  it('supports symbol keys', () => {
    const VIP = Symbol('vip');
    const groups = groupBy(people, (p) => (p.age > 40 ? VIP : 'regular'));
    expect(groups[VIP]).toEqual([people[2]]);
    expect(groups.regular).toHaveLength(2);
  });

  it('returns an object with no keys for empty input', () => {
    const groups = groupBy([] as Person[], (p) => p.team);
    expect(Object.keys(groups)).toEqual([]);
    expect(groups.core).toBeUndefined();
  });

  it('accepts any iterable (Set, generator)', () => {
    expect(groupBy(new Set([1, 2, 3, 4]), (n) => (n % 2 ? 'odd' : 'even'))).toEqual({ odd: [1, 3], even: [2, 4] });
    function* words() {
      yield 'apple';
      yield 'avocado';
      yield 'banana';
    }
    expect(groupBy(words(), (w) => w[0] ?? '')).toEqual({ a: ['apple', 'avocado'], b: ['banana'] });
  });

  it("handles keys that collide with Object.prototype ('constructor', 'toString')", () => {
    const groups = groupBy(['constructor', 'toString', 'constructor'], (w) => w);
    expect(groups.constructor).toEqual(['constructor', 'constructor']);
    expect(groups.toString).toEqual(['toString']);
  });

  it("treats '__proto__' as an ordinary key", () => {
    const groups = groupBy(['__proto__', 'a'], (w) => w);
    expect(Object.keys(groups)).toEqual(['__proto__', 'a']);
    expect(groups['__proto__']).toEqual(['__proto__']);
  });
});
