export type WcagLevel = 'AA' | 'AAA';
export type TextSize = 'normal' | 'large';

/**
 * Parses '#rgb' or '#rrggbb' (case-insensitive, leading '#' required) into
 * 0–255 channels. Throws an Error for anything else.
 */
export function parseHex(hex: string): [number, number, number] {
  throw new Error('Not implemented');
}

/**
 * WCAG relative luminance of an sRGB colour: 0 for black, 1 for white.
 * Each channel is linearised (gamma-decoded) before weighting:
 *   L = 0.2126 R + 0.7152 G + 0.0722 B
 */
export function relativeLuminance(hex: string): number {
  throw new Error('Not implemented');
}

/**
 * (L1 + 0.05) / (L2 + 0.05), where L1 is the luminance of the LIGHTER colour.
 * Ranges from 1 (same colour) to 21 (black on white). Argument order must not matter.
 */
export function contrastRatio(a: string, b: string): number {
  throw new Error('Not implemented');
}

/**
 * Does `ratio` meet WCAG 2.2 for text of the given size?
 * AA (SC 1.4.3): 4.5 normal / 3 large.  AAA (SC 1.4.6): 7 normal / 4.5 large.
 * Thresholds are exact — never round the ratio.
 */
export function meetsWCAG(ratio: number, level: WcagLevel, size: TextSize): boolean {
  throw new Error('Not implemented');
}
