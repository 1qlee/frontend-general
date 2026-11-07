## Why interviewers ask about graphs

A graph is a tree with the rules removed: nodes can have any number of connections, edges can point both ways, and **cycles are allowed**. That last part is what makes graph problems different — every graph algorithm needs a **visited set**, or it loops forever.

Interviewers like graph questions because they test whether you can *model* a problem. "Can the user get from screen A to screen B?", "In what order should these packages build?", "How many separate regions are in this image?" — none of them say "graph", but all of them are. A strong candidate says *"this is a graph problem: the nodes are X, the edges are Y"* within the first two minutes, then picks BFS or DFS deliberately.

For frontend roles the bar is: build an adjacency list, run BFS and DFS correctly, handle grids, and know what topological sort and heaps are for. Dijkstra, union-find and minimum spanning trees are follow-up territory, not core.

## Representations: build an adjacency list

Problems usually hand you an **edge list** — `[[0, 1], [1, 2]]` — because it's easy to print. Algorithms need fast "who are my neighbours?" lookups, so the first step is almost always converting to an **adjacency list**.

| Representation | Space | "Neighbours of u" | "Is there an edge u→v?" | Use when |
|---|---|---|---|---|
| Edge list `[a, b][]` | O(E) | O(E) scan | O(E) | Input format; Kruskal's algorithm |
| **Adjacency list** `number[][]` / `Map<K, K[]>` | O(V + E) | O(degree) | O(degree) | **Default choice** — most graphs are sparse |
| Adjacency matrix `boolean[][]` | O(V²) | O(V) | O(1) | Small dense graphs |

```ts run
// Nodes are 0..n-1 → arrays. Nodes are strings/ids → Map.
function buildAdjacency(n: number, edges: Array<[number, number]>, directed = false): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []); // NOT new Array(n).fill([]) — that shares ONE array
  for (const [a, b] of edges) {
    adj[a].push(b);
    if (!directed) adj[b].push(a);
  }
  return adj;
}
console.log(buildAdjacency(4, [[0, 1], [1, 2], [2, 0], [2, 3]]));

// String ids: Map<string, string[]>
const follows = new Map<string, string[]>();
for (const [from, to] of [['ada', 'bob'], ['bob', 'cy'], ['ada', 'cy']]) {
  if (!follows.has(from)) follows.set(from, []);
  follows.get(from)!.push(to);
}
console.log(follows);
```

> [!MISTAKE]
> `new Array(n).fill([])` fills every slot with **the same array object** — pushing a neighbour for node 0 adds it to every node. Use `Array.from({ length: n }, () => [])`. This bug costs candidates real interview minutes.

Clarifying questions for any graph problem: *Directed or undirected? Can there be cycles, self-loops, duplicate edges? Is it connected? Weighted? How many nodes/edges?* — each answer changes the algorithm or the edge cases.

## BFS: shortest paths in unweighted graphs

BFS explores in **rings**: everything 1 edge away, then 2, then 3. So the first time BFS reaches a node, it has found a path with the **fewest edges**. That's the property to state out loud.

```ts run
function bfsDistances(adj: number[][], start: number): number[] {
  const dist = new Array<number>(adj.length).fill(-1); // -1 = unvisited; doubles as the visited set
  dist[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    for (const next of adj[node]) {
      if (dist[next] !== -1) continue;
      dist[next] = dist[node] + 1; // mark when ENQUEUING, not when dequeuing
      queue.push(next);
    }
  }
  return dist;
}
//   0 — 1 — 2
//   |       |
//   3 — 4 ——┘     5 (isolated)
const adj = [[1, 3], [0, 2], [1, 4], [0, 4], [3, 2], []];
console.log(bfsDistances(adj, 0)); // [0, 1, 2, 1, 2, -1]
```

Two details separate a correct BFS from a buggy one:

1. **Mark visited when you enqueue.** If you mark on dequeue, the same node can be enqueued many times by different neighbours — still correct for distances, but slower and a red flag.
2. **O(1) dequeue.** The `head` index above; `shift()` is O(n).

**Weighted edges?** BFS no longer works — a 1-edge path of weight 100 is worse than a 3-edge path of weight 3. That's **Dijkstra's algorithm** (BFS with a min-heap keyed by distance). Know the name and the one-sentence idea; you'll rarely be asked to code it in a frontend round.

{{quiz:dsa2-bfs-vs-dfs-shortest}}

## DFS: connectivity, components and cycles

DFS goes deep first. It answers *reachability* questions ("is there any path?") and is the natural tool for exploring a whole connected region.

### Counting connected components

Loop over every node; each time you find an unvisited one, that's a new component — count it, and DFS (or BFS) to mark everything reachable from it.

```ts run
function countComponents(n: number, edges: Array<[number, number]>): number {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }

  const seen = new Array<boolean>(n).fill(false);
  let components = 0;
  for (let start = 0; start < n; start++) {
    if (seen[start]) continue;
    components++;
    const stack = [start];          // iterative DFS: an explicit stack
    seen[start] = true;
    while (stack.length) {
      const node = stack.pop()!;
      for (const next of adj[node]) {
        if (!seen[next]) { seen[next] = true; stack.push(next); }
      }
    }
  }
  return components;
}
console.log(countComponents(6, [[0, 1], [1, 2], [3, 4]])); // 3: {0,1,2} {3,4} {5}
```

Notice that iterative DFS and BFS differ by **one line**: `stack.pop()` (LIFO) versus `queue[head++]` (FIFO). For "visit everything reachable", either works.

### Detecting a cycle

The answer depends on the graph type — say so before you code:

| Graph | Technique | The rule |
|---|---|---|
| **Undirected** | DFS remembering the parent | Seeing an already-visited neighbour that is **not your parent** = cycle (or union-find: an edge joining two nodes already in the same set) |
| **Directed** | DFS with **three colours**: unvisited / in progress (on the current path) / done | Reaching a node that is **in progress** = a back edge = cycle. Reaching a *done* node is fine (that's just a shared dependency) |
| **Directed** (alternative) | Kahn's topological sort | If fewer than V nodes get output, the leftovers are in a cycle |

```ts run
// Directed cycle detection with three states.
function hasCycle(graph: Record<string, string[]>): boolean {
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (node: string): boolean => {
    if (state.get(node) === 'visiting') return true; // back edge → cycle
    if (state.get(node) === 'done') return false;    // already fully explored
    state.set(node, 'visiting');
    for (const next of graph[node] ?? []) if (visit(next)) return true;
    state.set(node, 'done');
    return false;
  };
  return Object.keys(graph).some((node) => visit(node));
}

console.log(hasCycle({ app: ['ui', 'utils'], ui: ['utils'], utils: [] })); // false (a diamond isn't a cycle)
console.log(hasCycle({ a: ['b'], b: ['c'], c: ['a'] }));                   // true
```

> [!MISTAKE]
> Using a single `visited` set for **directed** cycle detection. In the diamond above, `utils` is reached twice (via `app` and via `ui`), so a plain visited check would report a cycle that doesn't exist. You need to know whether the node is on the **current path**, not merely seen before.

## Grids are implicit graphs

Many "graph" questions arrive as a 2-D grid: islands, flood fill, rotting oranges, shortest path in a maze. You never build an adjacency list — each cell `(r, c)` is a node and its neighbours are computed on the fly.

```ts
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const; // 4-directional (add diagonals for 8)

for (const [dr, dc] of DIRS) {
  const nr = r + dr, nc = c + dc;
  if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue; // bounds
  if (grid[nr][nc] === '0' || visited[nr][nc]) continue;      // walls / seen
  // ...visit (nr, nc)
}
```

Checklist for grid problems:

- **Visited:** a `boolean[][]`, a flat `Uint8Array(rows * cols)` indexed by `r * cols + c`, or a `Set` of `` `${r},${c}` `` strings (simplest, slowest). Or mutate the grid — **only after asking** whether that's allowed.
- **Which search?** "How many regions / how big" → DFS or BFS. "Fewest steps from A to B" → **BFS**. "Spreads simultaneously from many sources" (rotting oranges, distance to nearest exit) → **multi-source BFS**: put every source in the queue at distance 0.
- **Recursion depth:** a recursive flood fill on a large all-land grid can recurse rows × cols deep. Prefer an explicit stack or BFS in JS.

## Topological sort (brief)

A **topological order** of a directed acyclic graph (DAG) lists every node after all of its dependencies: build orders, task scheduling, course prerequisites, spreadsheet recalculation, and the order a bundler evaluates modules. You implemented one with cycle detection — `buildOrder` for a monorepo — on the testing & tooling day, so here is just the summary:

- **Kahn's algorithm (BFS):** count in-degrees; queue every node with in-degree 0; pop, output, and decrement its dependents' in-degrees, queueing any that hit 0. If the output is shorter than V, there's a cycle.
- **DFS post-order:** run three-colour DFS; append each node when it is *done*; the result (reversed, depending on edge direction) is a topological order.
- Both are **O(V + E)**. Recognition cue: *"order", "prerequisites", "depends on", "before/after"*.

## Heaps and priority queues

A **heap** is a complete binary tree stored in an array where every parent is ≤ its children (a **min-heap**) — so the smallest item is always at index 0. It's the standard implementation of a **priority queue**.

| Operation | Heap | Sorted array | Unsorted array |
|---|---|---|---|
| Peek min | O(1) | O(1) | O(n) |
| Insert | **O(log n)** | O(n) | O(1) |
| Remove min | **O(log n)** | O(1) / O(n) | O(n) |
| Build from n items | O(n) heapify | O(n log n) | — |

The array layout means no pointers: for index `i`, the parent is `(i - 1) >> 1` and the children are `2i + 1` and `2i + 2`. Insert = push at the end and **sift up**; remove = move the last item to the root and **sift down**.

JavaScript has **no built-in heap or priority queue**. In an interview, ask: *"May I assume a MinHeap with push/pop/peek, or would you like me to implement it?"* — many interviewers let you assume one. Be ready to write this one in about five minutes:

```ts run
class MinHeap<T> {
  private items: T[] = [];
  constructor(private compare: (a: T, b: T) => number) {}
  get size() { return this.items.length; }
  peek(): T | undefined { return this.items[0]; }

  push(item: T): void {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {                                   // sift up
      const parent = (i - 1) >> 1;
      if (this.compare(a[i], a[parent]) >= 0) break;
      [a[i], a[parent]] = [a[parent], a[i]];
      i = parent;
    }
  }

  pop(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {                                      // sift down
        const l = 2 * i + 1, r = l + 1;
        let smallest = i;
        if (l < a.length && this.compare(a[l], a[smallest]) < 0) smallest = l;
        if (r < a.length && this.compare(a[r], a[smallest]) < 0) smallest = r;
        if (smallest === i) break;
        [a[i], a[smallest]] = [a[smallest], a[i]];
        i = smallest;
      }
    }
    return top;
  }
}

const h = new MinHeap<number>((a, b) => a - b);
for (const n of [5, 3, 8, 1, 9, 2]) h.push(n);
const out: number[] = [];
while (h.size) out.push(h.pop()!);
console.log(out.join(' ')); // 1 2 3 5 8 9
```

### Top-k: the size-k heap trick

"Find the k largest" with a **min**-heap sounds backwards, but it's the key idea: keep the k best seen so far; the heap's top is the *worst* of them, so it's the one to evict when something better arrives. The heap never exceeds k items: **O(n log k)** time, **O(k)** space — and it works on a **stream** where you can't see all the data at once.

```ts
for (const x of stream) {
  heap.push(x);
  if (heap.size > k) heap.pop(); // evict the smallest → heap holds the k largest
}
```

### k-way merge

Merging k sorted lists (paginated results from k shards, log files from k servers): put the head of each list in a min-heap; pop the smallest, output it, push the next item from that same list. **O(N log k)** for N total items — versus O(N log N) for "concatenate and sort".

### When you don't need a heap

- **n is small** (a few hundred items in a UI): `[...items].sort(cmp).slice(0, k)` is clearer and fast enough. Say "O(n log n), fine at this size; I'd switch to a heap for a stream or huge n".
- **Keys are small integers** (frequencies bounded by n, scores 0–100): **bucket sort** is O(n) — today's top-k exercise.
- **You need the k-th element once:** Quickselect is O(n) on average.

{{quiz:dsa2-heap-topk}}

### Heaps in frontend work

- A **task scheduler**: React's scheduler keeps work in a min-heap ordered by expiration time, so the most urgent task is always O(1) to peek — a great fact to drop in an interview.
- Rendering the **top 10** of a live leaderboard or trending list fed by a WebSocket.
- **Merging** sorted, paginated feeds from several sources into one timeline.
- Timers/animation queues ordered by "next fire time".

## Complexity cheat sheet

| Algorithm | Time | Space |
|---|---|---|
| Build adjacency list | O(V + E) | O(V + E) |
| BFS / DFS (whole graph) | O(V + E) | O(V) visited + queue/stack |
| Grid BFS / DFS | O(R · C) | O(R · C) |
| Connected components | O(V + E) | O(V) |
| Cycle detection (3-colour DFS) | O(V + E) | O(V) |
| Topological sort (Kahn / DFS) | O(V + E) | O(V) |
| Dijkstra with a binary heap | O((V + E) log V) | O(V) |
| Heap push / pop / peek | O(log n) / O(log n) / O(1) | — |
| Top-k with a size-k heap | O(n log k) | O(k) |
| k-way merge of N items | O(N log k) | O(k) |

> [!INTERVIEW] Say it like this
> "This is a graph problem: each user is a node and each 'follows' relation is a directed edge. I'll build an adjacency list from the edge list — O(V + E) — and since every edge has the same cost and we want the fewest hops, BFS gives the shortest path: it explores in rings of increasing distance, so the first time I reach the target is optimal. I'll mark nodes visited when I enqueue them so cycles can't loop forever. Overall O(V + E) time and space. If edges had weights I'd switch to Dijkstra with a min-heap."

## Key takeaways

- Model first: *"nodes are X, edges are Y"*. Then build an **adjacency list** (`Array.from`, never `fill([])`).
- **BFS** = fewest edges in an unweighted graph, levels, nearest match, multi-source spreading. **DFS** = reachability, components, cycle detection, topological order, exhaustive exploration.
- Every graph traversal needs a **visited** set; mark on enqueue/push.
- Directed cycle detection needs **three states** (on the current path vs finished), not just visited.
- Grids are implicit graphs: 4 directions, bounds checks, don't mutate the input without asking.
- A **heap** gives O(log n) insert/remove-min; JS has none built in. Size-k min-heap for top-k on streams; sorting or bucket sort when n is small or keys are bounded.
