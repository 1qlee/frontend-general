import { describe, it, expect } from 'vitest';
import { classNames } from './solution';

describe('classNames', () => {
  it('joins strings with single spaces', () => {
    expect(classNames('btn', 'btn-primary', 'btn-lg')).toBe('btn btn-primary btn-lg');
  });

  it('returns an empty string when called with nothing usable', () => {
    expect(classNames()).toBe('');
    expect(classNames(null, undefined, false, '', 0)).toBe('');
  });

  it('skips every falsy value, keeps non-zero numbers, and ignores `true`', () => {
    expect(classNames('a', null, undefined, false, 0, Number.NaN, '', 'b')).toBe('a b');
    expect(classNames(1, 0, 'col')).toBe('1 col');
    expect(classNames(true, 'x')).toBe('x');
  });

  it('supports the `condition && "class"` pattern', () => {
    const isActive = false;
    const isOpen = true;
    expect(classNames('tab', isActive && 'tab--active', isOpen && 'tab--open')).toBe('tab tab--open');
  });

  it('includes object keys whose values are truthy', () => {
    expect(classNames({ active: true, disabled: false, 'has-icon': 1, empty: '', nil: null })).toBe('active has-icon');
  });

  it('flattens nested arrays (any depth), including objects inside them', () => {
    expect(classNames('a', ['b', ['c', { d: true, e: false }, [['f']]]])).toBe('a b c d f');
  });

  it('never produces double, leading or trailing spaces (empty arrays/objects contribute nothing)', () => {
    expect(classNames('', 'a', [], {}, [[], ['']], { off: false }, 'b', '')).toBe('a b');
  });

  it('only uses OWN keys of objects, not inherited ones', () => {
    const base = { inherited: true };
    const flags: Record<string, boolean> = Object.create(base);
    flags.own = true;
    expect(classNames(flags)).toBe('own');
  });

  it('works for a realistic component', () => {
    const buttonClass = (variant: 'primary' | 'ghost', size: 'sm' | 'md', disabled: boolean) =>
      classNames('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, { 'btn--disabled': disabled, 'btn--loading': false });
    expect(buttonClass('ghost', 'sm', true)).toBe('btn btn--ghost btn--sm btn--disabled');
    expect(buttonClass('primary', 'md', false)).toBe('btn btn--primary');
  });
});
