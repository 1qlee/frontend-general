import type { Day } from '../../types';

import recursionTrees from './lessons/recursion-trees.md?raw';
import graphsHeaps from './lessons/graphs-heaps.md?raw';
import backtrackingDp from './lessons/backtracking-dp.md?raw';

import { coinChange, levelOrder, maxDepth, numIslands, shortestPath, subsets, topKFrequent } from './exercises';
import { dpChecks, graphChecks, quizQuestions, treeChecks } from './quiz';
import { flashcards, interviewQuestions } from './interview';

const day: Day = {
  number: 16,
  title: 'DS&A II: Recursion, Trees, Graphs & a First Look at DP',
  tagline: 'Trust the recursion, pick BFS or DFS on purpose, and recognise when a problem is DP.',
  summary:
    'DS&A I gave you the problem-solving framework and the linear patterns. Today covers the recursive half of a typical DS&A round: **recursion and trees** (DFS orders, BFS by level, BST bounds, the JS call-stack limit), **graphs and heaps** (adjacency lists, BFS shortest paths, components, cycles, grids, top-k), and **backtracking and an introduction to dynamic programming**. It ends with a cue-to-pattern map, so that in an interview you can name the pattern within the first few minutes and explain why it fits. All of it is in TypeScript, and much of it maps onto trees you already work with: the DOM, JSON and component trees.',
  objectives: [
    'Write recursive tree functions with a clear base case, and explain their O(h) stack cost and JS stack-overflow limits',
    'Choose between pre-, in- and post-order DFS and level-order BFS, and write each recursively and iteratively',
    'Validate a BST with bounds and solve height, path-sum and lowest-common-ancestor problems',
    'Build an adjacency list, use BFS for unweighted shortest paths, and use DFS for components and cycle detection (directed and undirected)',
    'Treat grids as implicit graphs and implement a MinHeap for top-k and k-way merge',
    'Apply the backtracking template (choose → explore → unchoose) with pruning',
    'Solve DP problems with the state → transition → base case recipe, top-down and bottom-up',
    'Map problem cues to patterns using a single recognition table',
  ],
  skills: ['algorithms', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'warm-up-review',
      title: 'Warm-up: spaced repetition',
      minutes: 15,
      intro:
        'Flashcards from earlier days. Pay extra attention to DS&A I (the framework, Big-O, hashing, stacks and queues) and to `memoize` from the JS-core day. Today\'s BFS needs a queue and today\'s DP *is* memoization.',
    },
    {
      kind: 'lesson',
      id: 'recursion-trees',
      title: 'Recursion & trees',
      minutes: 40,
      body: recursionTrees,
      checks: treeChecks,
    },
    {
      kind: 'lesson',
      id: 'graphs-heaps',
      title: 'Graphs & heaps',
      minutes: 35,
      body: graphsHeaps,
      checks: graphChecks,
    },
    {
      kind: 'lesson',
      id: 'backtracking-dp',
      title: 'Backtracking & intro dynamic programming',
      minutes: 35,
      body: backtrackingDp,
      checks: dpChecks,
    },
    {
      kind: 'quiz',
      id: 'dsa2-quiz',
      title: 'Quiz: traversals, complexity & recurrences',
      minutes: 15,
      intro:
        'Commit to an answer before you reveal it. For complexity questions, say the number *and* why (count the states, the branching, the stack depth). Run the snippets. Several of the wrong options are bugs that interviewers see all the time.',
      questions: quizQuestions,
    },
    {
      kind: 'exercise',
      id: 'dsa2-exercises',
      title: 'Trees, graphs, heaps, backtracking & DP',
      minutes: 65,
      intro: `Interview conditions, using the framework from DS&A I: **clarify → examples → brute force → bottleneck → pattern → code → test → complexity**. Say the pattern out loud before you type ("this is BFS because every edge costs the same"). Time-box each problem to about 10 minutes. If you are stuck after 5, take one hint, not three.

Order: the warm-up tree (\`maxDepth\`), then level order, islands, shortest path, top-k and subsets. Leave **coin change** (stretch) for last. The tree starters already include the \`TreeNode\` class and the \`fromLevelOrder\`/\`toLevelOrder\` helpers, so you only write the algorithm. After passing each one, read the explanation: it goes brute force → bottleneck → pattern → walk-through → complexity → edge cases → follow-ups, which is the order you should talk in.`,
      exercises: [maxDepth, levelOrder, numIslands, shortestPath, topKFrequent, subsets, coinChange],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–120 seconds before you reveal the model answer: one sentence first, then the mechanism, then a complexity or trade-off and an example. Where you can, connect the answer to frontend work (the DOM, bundlers, schedulers). Interviewers remember that.',
    },
  ],
  flashcards,
  interviewQuestions,
};

export default day;
