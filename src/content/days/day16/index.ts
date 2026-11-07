import type { Day } from '../../types';

import framework from './lessons/framework.md?raw';
import arraysStringsHashing from './lessons/arrays-strings-hashing.md?raw';
import stacksQueuesListsSearch from './lessons/stacks-queues-lists-search.md?raw';

import {
  dailyTemperatures,
  groupAnagrams,
  longestUniqueSubstring,
  reverseLinkedList,
  searchInsert,
  subarraySumK,
  twoSum,
} from './exercises';
import { arraysChecks, frameworkChecks, quizQuestions, structuresChecks } from './quiz';
import { flashcards, interviewQuestions } from './interview';

const day: Day = {
  number: 16,
  title: 'Data Structures & Algorithms I: The Framework & Linear Structures',
  tagline: 'A repeatable method for any algorithm problem, Big-O you can defend, and the patterns behind most array, string, stack and search questions.',
  summary:
    'Most frontend loops include at least one LeetCode-style round, and strong engineers fail it through **process**, not knowledge: coding too early, going silent, missing edge cases, or not being able to justify the complexity. Today you learn an eight-step method with exact phrases to say, how to read constraints to know which complexity is expected, and the core linear-structure patterns: hashing, prefix sums, two pointers, sliding windows, stacks (including monotonic stacks), queues, linked lists and binary search. Then you solve seven classic problems in TypeScript, out loud.',
  objectives: [
    'Run the eight-step method (clarify → examples → brute force → bottleneck & pattern → plan → implement → trace → complexity) out loud, with the phrases interviewers listen for',
    'Analyse time and space for loops, hidden loops, recursion and amortised operations, and map input constraints to an expected complexity',
    'State the costs of common JavaScript operations (Map/Set, push/shift, includes, sort, string building) and avoid JS-specific traps',
    'Recognise hashing, prefix-sum, two-pointer, sliding-window and sort-first problems from their cues and write each template from memory',
    'Use stacks (bracket matching, monotonic stacks), index-pointer queues, linked-list pointer techniques and a single reliable binary-search template, including binary search on the answer space',
    'Solve Two Sum, Group Anagrams, Longest Unique Substring, Subarray Sum = K, Reverse Linked List, Search Insert and Daily Temperatures with optimal complexity',
  ],
  skills: ['algorithms', 'javascript', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'warm-up-review',
      title: 'Warm-up: spaced repetition',
      minutes: 15,
      intro:
        'Flashcards from earlier days. Pay attention to the JS core cards on closures and `memoize` (memoization comes back as a time/space trade-off today) and to the performance day\'s LRU cache (a hash map plus a linked list).',
    },
    {
      kind: 'lesson',
      id: 'algorithm-framework',
      title: 'A framework for any algorithm problem',
      minutes: 35,
      body: framework,
      checks: frameworkChecks,
    },
    {
      kind: 'lesson',
      id: 'arrays-strings-hashing',
      title: 'Arrays, strings & hashing: the five core patterns',
      minutes: 40,
      body: arraysStringsHashing,
      checks: arraysChecks,
    },
    {
      kind: 'lesson',
      id: 'stacks-queues-lists-search',
      title: 'Stacks, queues, linked lists & binary search',
      minutes: 35,
      body: stacksQueuesListsSearch,
      checks: structuresChecks,
    },
    {
      kind: 'quiz',
      id: 'complexity-patterns-quiz',
      title: 'Quiz: complexity analysis & pattern recognition',
      minutes: 15,
      intro:
        'For each question, say the complexity or pattern out loud *before* looking at the choices. That\'s the skill the interview tests. Then read the whole explanation, including why the tempting answers are wrong.',
      questions: quizQuestions,
    },
    {
      kind: 'exercise',
      id: 'dsa-linear-exercises',
      title: 'Seven classics, solved out loud',
      minutes: 65,
      intro: `Interview conditions: no AI, a timer per problem (about 8–12 minutes), and **talk out loud** through the method from the first lesson. Before you write any code, put these comments at the top of the editor and fill them in:

\`\`\`ts
// Clarify:      inputs, outputs, constraints, what to return when there's no answer
// Examples:     one normal case + edge cases (empty, single, duplicates, negatives)
// Brute force:  … → O(?) time, O(?) space
// Bottleneck:   what work is repeated? → pattern:
// Plan:         3–5 steps
\`\`\`

Then code, trace one example by hand, and state the complexity *before* you run the tests. Some tests check performance, so a correct but quadratic solution will fail them on purpose. Work in order. Daily Temperatures is the stretch. Read every explanation afterwards: the follow-ups are what interviewers ask next.`,
      exercises: [twoSum, groupAnagrams, longestUniqueSubstring, subarraySumK, reverseLinkedList, searchInsert, dailyTemperatures],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 60–120 seconds before revealing the model answer. Lead with a one-sentence answer, give a concrete example (a problem you solved today), and end with a trade-off.',
    },
  ],
  flashcards,
  interviewQuestions,
};

export default day;
