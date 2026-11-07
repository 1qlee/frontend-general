import { describe, it, expect } from 'vitest';
import { deepClone } from './solution';

describe('deepClone', () => {
  it('returns primitives and functions as-is', () => {
    const fn = () => 1;
    const sym = Symbol('s');
    for (const v of [1, 'a', true, null, undefined, 10n, sym, fn]) {
      expect(deepClone(v)).toBe(v);
    }
    expect(deepClone(Number.NaN)).toBeNaN();
  });

  it('deep-copies nested objects and arrays', () => {
    const src = { user: { name: 'Ada', tags: ['admin', { level: 3 }] }, list: [[1, 2], [3]] };
    const copy = deepClone(src);
    expect(copy).toEqual(src);
    expect(copy).not.toBe(src);
    expect(copy.user).not.toBe(src.user);
    expect(copy.user.tags).not.toBe(src.user.tags);
    expect(copy.user.tags[1]).not.toBe(src.user.tags[1]);
    expect(copy.list[0]).not.toBe(src.list[0]);
    copy.user.name = 'Grace';
    copy.list[0].push(99);
    expect(src.user.name).toBe('Ada');
    expect(src.list[0]).toEqual([1, 2]);
  });

  it('copies Dates as new Date objects with the same time', () => {
    const src = { createdAt: new Date('2024-05-01T10:00:00Z') };
    const copy = deepClone(src);
    expect(copy.createdAt).toBeInstanceOf(Date);
    expect(copy.createdAt).not.toBe(src.createdAt);
    expect(copy.createdAt.getTime()).toBe(src.createdAt.getTime());
  });

  it('copies RegExps (source, flags and lastIndex)', () => {
    const re = /ab+c/gi;
    re.lastIndex = 3;
    const copy = deepClone({ re }).re;
    expect(copy).toBeInstanceOf(RegExp);
    expect(copy).not.toBe(re);
    expect(copy.source).toBe('ab+c');
    expect(copy.flags).toBe('gi');
    expect(copy.lastIndex).toBe(3);
  });

  it('deep-copies Maps (keys and values) and Sets', () => {
    const key = { id: 1 };
    const src = { byId: new Map([[key, { name: 'Ada' }]]), ids: new Set([{ id: 2 }]) };
    const copy = deepClone(src);
    expect(copy.byId).toBeInstanceOf(Map);
    expect(copy.byId).not.toBe(src.byId);
    expect(copy.byId).toEqual(src.byId);
    const [[copiedKey, copiedValue]] = [...copy.byId];
    expect(copiedKey).not.toBe(key);
    expect(copiedKey).toEqual(key);
    expect(copiedValue).not.toBe(src.byId.get(key));
    expect(copy.ids).toBeInstanceOf(Set);
    expect(copy.ids).toEqual(src.ids);
    expect([...copy.ids][0]).not.toBe([...src.ids][0]);
  });

  it('handles circular references without blowing the stack', () => {
    type Node = { name: string; self?: Node; children: Node[] };
    const root: Node = { name: 'root', children: [] };
    root.self = root;
    root.children.push(root);
    const copy = deepClone(root);
    expect(copy).not.toBe(root);
    expect(copy.self).toBe(copy);
    expect(copy.children[0]).toBe(copy);
  });

  it('handles cycles through Maps and Sets', () => {
    const m = new Map<string, unknown>();
    m.set('me', m);
    const s = new Set<unknown>();
    s.add(s);
    const copy = deepClone({ m, s });
    expect(copy.m.get('me')).toBe(copy.m);
    expect(copy.m).not.toBe(m);
    expect([...copy.s][0]).toBe(copy.s);
  });

  it('preserves shared references (the same object twice → the same copy twice)', () => {
    const shared = { n: 1 };
    const src = { a: shared, b: shared, list: [shared] };
    const copy = deepClone(src);
    expect(copy.a).toBe(copy.b);
    expect(copy.list[0]).toBe(copy.a);
    expect(copy.a).not.toBe(shared);
  });

  it('keeps the prototype of class instances and supports Object.create(null)', () => {
    class Point {
      x: number;
      y: number;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
      }
      length() {
        return Math.hypot(this.x, this.y);
      }
    }
    const p = deepClone(new Point(3, 4));
    expect(p).toBeInstanceOf(Point);
    expect(p.length()).toBe(5);

    const dict = Object.create(null) as Record<string, unknown>;
    dict.key = { value: 1 };
    const dictCopy = deepClone(dict);
    expect(Object.getPrototypeOf(dictCopy)).toBeNull();
    expect(dictCopy.key).toEqual({ value: 1 });
    expect(dictCopy.key).not.toBe(dict.key);
  });
});
