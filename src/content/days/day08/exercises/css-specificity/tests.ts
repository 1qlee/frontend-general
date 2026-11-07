import { describe, it, expect } from 'vitest';
import { specificity, compareSpecificity } from './solution';

describe('compareSpecificity', () => {
  it('compares column by column — 11 classes never beat 1 id', () => {
    expect(compareSpecificity([1, 0, 0], [0, 11, 0])).toBeGreaterThan(0);
    expect(compareSpecificity([0, 1, 0], [0, 0, 25])).toBeGreaterThan(0);
    expect(compareSpecificity([0, 1, 2], [0, 1, 3])).toBeLessThan(0);
    expect(compareSpecificity([0, 2, 1], [0, 2, 1])).toBe(0);
  });
});

describe('specificity: simple selectors', () => {
  it.each([
    ['*', [0, 0, 0]],
    ['li', [0, 0, 1]],
    ['.btn', [0, 1, 0]],
    ['#app', [1, 0, 0]],
    ['li.red.level', [0, 2, 1]],
    ['a#cta.btn', [1, 1, 1]],
  ])('%s', (selector, expected) => {
    expect(specificity(selector)).toEqual(expected);
  });
});

describe('specificity: combinators count for nothing', () => {
  it.each([
    ['ul li', [0, 0, 2]],
    ['ul ol+li', [0, 0, 3]],
    ['ul > li ~ li', [0, 0, 3]],
    ['#nav > .menu a', [1, 1, 1]],
    ['  main   article  ', [0, 0, 2]],
  ])('%s', (selector, expected) => {
    expect(specificity(selector)).toEqual(expected);
  });
});

describe('specificity: attributes, pseudo-classes, pseudo-elements', () => {
  it.each([
    ['h1 + *[rel=up]', [0, 1, 1]],
    ['input[type="text"]:focus-visible', [0, 2, 1]],
    ['a:hover::before', [0, 1, 2]],
    ['p::first-line', [0, 0, 2]],
    ['p:first-line', [0, 0, 2]],
    ['nav > a:nth-child(2n+1)', [0, 1, 2]],
    ['li:not(:last-child)::after', [0, 1, 2]],
  ])('%s', (selector, expected) => {
    expect(specificity(selector)).toEqual(expected);
  });

  it('does not count ".", "#" or ":" inside attribute values', () => {
    expect(specificity('[data-path="a.b#c:d"]')).toEqual([0, 1, 0]);
    expect(specificity("a[href^='#top']")).toEqual([0, 1, 1]);
  });
});

describe('specificity: :where, :is, :not, :has (stretch)', () => {
  it(':where() always contributes zero', () => {
    expect(specificity(':where(#app .nav) a')).toEqual([0, 0, 1]);
    expect(specificity(':where(.card)')).toEqual([0, 0, 0]);
  });

  it(':is() takes its most specific argument, whichever one matched', () => {
    expect(specificity(':is(h1, .title, #main) > span')).toEqual([1, 0, 1]);
    expect(specificity('.foo :is(.bar, #baz)')).toEqual([1, 1, 0]);
  });

  it(':not() works the same way (and the pseudo-class itself adds nothing)', () => {
    expect(specificity('#s12:not(FOO)')).toEqual([1, 0, 1]);
    expect(specificity('a:not(.btn, #cta)')).toEqual([1, 0, 1]);
  });

  it(':has() counts its argument, including relative selectors', () => {
    expect(specificity('.card:has(> img)')).toEqual([0, 1, 1]);
    expect(specificity('form:has(input:invalid)')).toEqual([0, 1, 2]);
  });
});
