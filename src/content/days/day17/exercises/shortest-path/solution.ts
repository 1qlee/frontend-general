/**
 * Shortest path (fewest edges) in an undirected, unweighted graph — BFS.
 * O(V + E) time, O(V + E) space.
 */
export function shortestPath(n: number, edges: ReadonlyArray<readonly [number, number]>, start: number, target: number): number {
  if (start === target) return 0;

  // 1. Build the adjacency list ONCE: O(V + E).
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a); // undirected: add both directions
  }

  // 2. BFS from start. dist doubles as the visited set (-1 = not seen yet).
  const dist = new Array<number>(n).fill(-1);
  dist[start] = 0;
  const queue: number[] = [start];
  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];
    for (const next of adj[node]) {
      if (dist[next] !== -1) continue;
      dist[next] = dist[node] + 1; // mark on enqueue, so no node is queued twice
      if (next === target) return dist[next]; // the first time BFS reaches a node is the shortest way
      queue.push(next);
    }
  }
  return -1;
}
