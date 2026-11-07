/**
 * Count the islands in a grid of '1' (land) and '0' (water), connected 4-directionally.
 * The input is not mutated: visited cells are tracked in a separate Uint8Array.
 */
const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function numIslands(grid: readonly (readonly string[])[]): number {
  const rows = grid.length;
  if (rows === 0) return 0;
  const cols = grid[0].length;
  // One flat array instead of a Set of "r,c" strings: no string allocation per cell.
  const visited = new Uint8Array(rows * cols);
  let islands = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== '1' || visited[r * cols + c]) continue;
      islands++;
      // Flood-fill this island with an explicit stack (iterative DFS): no recursion-depth limit.
      visited[r * cols + c] = 1;
      const stack: Array<[number, number]> = [[r, c]];
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        for (const [dr, dc] of DIRECTIONS) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (grid[nr][nc] !== '1' || visited[nr * cols + nc]) continue;
          visited[nr * cols + nc] = 1; // mark when PUSHING, so a cell is never queued twice
          stack.push([nr, nc]);
        }
      }
    }
  }
  return islands;
}
