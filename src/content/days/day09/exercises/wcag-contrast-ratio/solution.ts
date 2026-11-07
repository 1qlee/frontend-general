export type WcagLevel = 'AA' | 'AAA';
export type TextSize = 'normal' | 'large';

/**
 * Parses '#rgb' or '#rrggbb' (case-insensitive, leading '#' required) into
 * 0–255 channels. Throws an Error for anything else.
 */
export function parseHex(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Invalid hex colour: "${hex}"`);
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits
      .split('')
      .map((d) => d + d)
      .join(''); // '#f80' → 'ff8800'
  }
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

/** sRGB transfer function: turn an encoded 0–255 channel into linear light (0–1). */
function linearize(channel: number): number {
  const c = channel / 255;
  // WCAG 2.2 uses the sRGB threshold 0.04045 (older texts say 0.03928 — identical for 8-bit values).
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * WCAG relative luminance of an sRGB colour: 0 for black, 1 for white.
 * Each channel is linearised (gamma-decoded) before weighting:
 *   L = 0.2126 R + 0.7152 G + 0.0722 B
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * (L1 + 0.05) / (L2 + 0.05), where L1 is the luminance of the LIGHTER colour.
 * Ranges from 1 (same colour) to 21 (black on white). Argument order must not matter.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

const THRESHOLDS: Record<WcagLevel, Record<TextSize, number>> = {
  AA: { normal: 4.5, large: 3 },
  AAA: { normal: 7, large: 4.5 },
};

/**
 * Does `ratio` meet WCAG 2.2 for text of the given size?
 * AA (SC 1.4.3): 4.5 normal / 3 large.  AAA (SC 1.4.6): 7 normal / 4.5 large.
 * Thresholds are exact — never round the ratio.
 */
export function meetsWCAG(ratio: number, level: WcagLevel, size: TextSize): boolean {
  return ratio >= THRESHOLDS[level][size];
}
