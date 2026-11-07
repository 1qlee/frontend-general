/** [ids, classes/attributes/pseudo-classes, types/pseudo-elements] */
export type Specificity = [number, number, number];

/**
 * Compare two specificities column by column (no "carrying" between columns).
 * Returns a negative number if `a` is lower, 0 if equal, positive if `a` is higher.
 */
export function compareSpecificity(a: Specificity, b: Specificity): number {
  throw new Error('Not implemented');
}

/**
 * Compute the specificity of ONE complex selector (no top-level commas), e.g.
 *   specificity('#nav > a.active:hover') // [1, 2, 1]
 *
 * - `#id`                                   → column A
 * - `.class`, `[attr]`, `:pseudo-class`     → column B
 * - `type`, `::pseudo-element`              → column C
 *   (legacy single-colon `:before`, `:after`, `:first-line`, `:first-letter` are pseudo-elements)
 * - `*` and combinators (` `, `>`, `+`, `~`) count for nothing
 *
 * Stretch:
 * - `:where(...)` counts as 0
 * - `:is(...)`, `:not(...)`, `:has(...)` count as their MOST specific argument
 */
export function specificity(selector: string): Specificity {
  throw new Error('Not implemented');
}
