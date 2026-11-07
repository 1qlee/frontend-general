import { describe, it, expect } from 'vitest';
import { compareSemver, satisfies } from './solution';

describe('compareSemver', () => {
  it('compares each part numerically, not as strings', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBe(1);
    expect(compareSemver('0.0.2', '0.0.10')).toBe(-1);
    expect(compareSemver('2.0.0', '10.0.0')).toBe(-1);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('works as an Array#sort comparator', () => {
    expect(['1.10.0', '1.2.0', '0.9.0', '1.9.9', '1.2.10'].sort(compareSemver)).toEqual([
      '0.9.0',
      '1.2.0',
      '1.2.10',
      '1.9.9',
      '1.10.0',
    ]);
  });

  it('ranks prereleases below the release and orders them by the spec', () => {
    // The exact example list from semver.org, §11.
    const ordered = [
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta',
      '1.0.0-beta.2',
      '1.0.0-beta.11',
      '1.0.0-rc.1',
      '1.0.0',
    ];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(compareSemver(ordered[i], ordered[i + 1])).toBe(-1);
      expect(compareSemver(ordered[i + 1], ordered[i])).toBe(1);
    }
    expect([...ordered].reverse().sort(compareSemver)).toEqual(ordered);
  });

  it('ignores build metadata', () => {
    expect(compareSemver('1.0.0+build.1', '1.0.0+build.2')).toBe(0);
  });

  it('throws a TypeError for invalid versions', () => {
    for (const bad of ['1.2', '1.2.3.4', 'x.y.z', '', '01.2.3', '1.2.3-']) {
      expect(() => compareSemver(bad, '1.0.0')).toThrow(TypeError);
    }
  });
});

describe('satisfies', () => {
  it('handles exact versions with and without "="', () => {
    expect(satisfies('1.2.3', '1.2.3')).toBe(true);
    expect(satisfies('1.2.3', '=1.2.3')).toBe(true);
    expect(satisfies('1.2.4', '1.2.3')).toBe(false);
  });

  it('handles >=', () => {
    expect(satisfies('1.2.3', '>=1.2.3')).toBe(true);
    expect(satisfies('5.0.0', '>=1.2.3')).toBe(true);
    expect(satisfies('1.2.2', '>=1.2.3')).toBe(false);
  });

  it('~ allows patch updates only', () => {
    expect(satisfies('1.2.9', '~1.2.3')).toBe(true);
    expect(satisfies('1.2.2', '~1.2.3')).toBe(false);
    expect(satisfies('1.3.0', '~1.2.3')).toBe(false);
  });

  it('^ allows minor and patch updates from 1.0.0 up', () => {
    expect(satisfies('1.2.3', '^1.2.3')).toBe(true);
    expect(satisfies('1.9.0', '^1.2.3')).toBe(true);
    expect(satisfies('1.2.2', '^1.2.3')).toBe(false);
    expect(satisfies('2.0.0', '^1.2.3')).toBe(false);
  });

  it('^ is stricter below 1.0.0: it locks the left-most non-zero part', () => {
    expect(satisfies('0.2.9', '^0.2.3')).toBe(true);
    expect(satisfies('0.3.0', '^0.2.3')).toBe(false);
    expect(satisfies('0.0.3', '^0.0.3')).toBe(true);
    expect(satisfies('0.0.4', '^0.0.3')).toBe(false);
  });

  it('only lets a prerelease match a range that opts into the same version tuple', () => {
    expect(satisfies('1.3.0-beta.1', '^1.2.0')).toBe(false);
    expect(satisfies('1.3.0-beta.1', '>=1.0.0')).toBe(false);
    expect(satisfies('1.2.0-beta.2', '^1.2.0-beta.1')).toBe(true);
    expect(satisfies('1.2.0', '^1.2.0-beta.1')).toBe(true);
    expect(satisfies('1.2.0-alpha', '^1.2.0-beta.1')).toBe(false);
  });

  it('throws a TypeError for unsupported ranges', () => {
    for (const bad of ['<2.0.0', '1.x', '*', '']) {
      expect(() => satisfies('1.0.0', bad)).toThrow(TypeError);
    }
  });
});
