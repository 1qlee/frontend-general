import { describe, it, expect } from 'vitest';
import { parseHex, relativeLuminance, contrastRatio, meetsWCAG } from './solution';

describe('parseHex', () => {
  it('parses 6-digit hex, case-insensitively', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0]);
    expect(parseHex('#FF8000')).toEqual([255, 128, 0]);
  });

  it('expands 3-digit shorthand (#f80 → #ff8800)', () => {
    expect(parseHex('#f80')).toEqual([255, 136, 0]);
    expect(parseHex('#777')).toEqual([119, 119, 119]);
  });

  it('throws on invalid input', () => {
    expect(() => parseHex('red')).toThrow();
    expect(() => parseHex('#12345')).toThrow();
    expect(() => parseHex('#ggg')).toThrow();
    expect(() => parseHex('ffffff')).toThrow();
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000')).toBeCloseTo(0, 6);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6);
  });

  it('weights green most and blue least (0.2126 / 0.7152 / 0.0722)', () => {
    expect(relativeLuminance('#f00')).toBeCloseTo(0.2126, 4);
    expect(relativeLuminance('#0f0')).toBeCloseTo(0.7152, 4);
    expect(relativeLuminance('#00f')).toBeCloseTo(0.0722, 4);
  });

  it('linearises channels first: #808080 is ~21.6% luminance, not 50%', () => {
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 3);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 6);
    expect(contrastRatio('#3366cc', '#3366cc')).toBeCloseTo(1, 6);
  });

  it('does not depend on argument order', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(contrastRatio('#000', '#fff'), 10);
    expect(contrastRatio('#ffcc00', '#1a1a1a')).toBeCloseTo(contrastRatio('#1a1a1a', '#ffcc00'), 10);
  });

  it('matches known values: #777 on white ≈ 4.48, #767676 on white ≈ 4.54', () => {
    expect(contrastRatio('#777', '#fff')).toBeCloseTo(4.48, 2);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

describe('meetsWCAG', () => {
  it.each([
    [4.5, 'AA', 'normal', true],
    [4.49, 'AA', 'normal', false],
    [3, 'AA', 'large', true],
    [2.99, 'AA', 'large', false],
    [7, 'AAA', 'normal', true],
    [6.99, 'AAA', 'normal', false],
    [4.5, 'AAA', 'large', true],
    [4.4, 'AAA', 'large', false],
  ] as const)('ratio %s at %s/%s → %s', (ratio, level, size, expected) => {
    expect(meetsWCAG(ratio, level, size)).toBe(expected);
  });

  it('never rounds: #777 on white (4.48:1) FAILS AA for normal text but passes for large text', () => {
    const ratio = contrastRatio('#777', '#fff');
    expect(meetsWCAG(ratio, 'AA', 'normal')).toBe(false);
    expect(meetsWCAG(ratio, 'AA', 'large')).toBe(true);
    expect(meetsWCAG(contrastRatio('#767676', '#fff'), 'AA', 'normal')).toBe(true);
  });
});
