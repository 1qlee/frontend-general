/**
 * Returns an order in which the workspace packages can be built: every package
 * appears exactly once, after all of its workspace dependencies.
 *
 * - `packages` maps a package name to the names it depends on.
 * - Dependencies that are not keys of `packages` (e.g. 'react') are external:
 *   ignore them, and don't include them in the result.
 * - Any valid order is accepted.
 * - On a dependency cycle, throw an Error whose message is
 *   `Cycle detected: a -> b -> c -> a` (each name depends on the next one).
 */
export function buildOrder(packages: Record<string, string[]>): string[] {
  throw new Error('Not implemented');
}
