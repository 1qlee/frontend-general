/**
 * Coin change (minimum coins) — bottom-up DP.
 * State:      dp[a] = fewest coins that make amount a (Infinity = impossible)
 * Base case:  dp[0] = 0
 * Transition: dp[a] = min over coins c <= a of dp[a - c] + 1
 * O(amount · coins) time, O(amount) space.
 */
export function coinChange(coins: readonly number[], amount: number): number {
  const dp = new Array<number>(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
