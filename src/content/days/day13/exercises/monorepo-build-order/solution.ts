/**
 * Depth-first topological sort. A package is appended to the result only after
 * all of its dependencies have been appended (post-order), so dependencies come first.
 *
 * Three states per node: unvisited (absent), 'visiting' (on the current DFS path),
 * 'done'. Reaching a 'visiting' node again means we followed a back edge: a cycle.
 * The current path stack lets us report exactly which packages form it.
 */
export function buildOrder(packages: Record<string, string[]>): string[] {
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const path: string[] = [];

  const visit = (name: string): void => {
    const current = state.get(name);
    if (current === 'done') return;
    if (current === 'visiting') {
      const cycle = [...path.slice(path.indexOf(name)), name];
      throw new Error(`Cycle detected: ${cycle.join(' -> ')}`);
    }

    state.set(name, 'visiting');
    path.push(name);
    for (const dep of packages[name]) {
      if (Object.hasOwn(packages, dep)) visit(dep); // skip external packages
    }
    path.pop();
    state.set(name, 'done');
    order.push(name);
  };

  for (const name of Object.keys(packages)) visit(name);
  return order;
}
