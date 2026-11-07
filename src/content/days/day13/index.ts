import type { Day } from '../../types';

import testingStrategyRtl from './lessons/testing-strategy-rtl.md?raw';
import e2eQuality from './lessons/e2e-quality.md?raw';
import frontendTooling from './lessons/frontend-tooling.md?raw';

import { monorepoBuildOrder, semverSatisfies, testDebounce, testFormatDuration, testLoginForm } from './exercises';
import { e2eChecks, quizQuestions, testingChecks, toolingChecks } from './quiz';
import { flashcards, interviewQuestions } from './interview';

const day: Day = {
  number: 13,
  title: 'Testing & Tooling',
  tagline: 'Test behaviour, not implementation. Know your build pipeline from the dev server to production.',
  summary:
    'Senior interviews probe whether you can **own quality and the build**, not just write a test. Today you learn a testing strategy you can defend (the testing trophy, Testing Library\'s query priority, Vitest mocks and fake timers, MSW), how to keep end-to-end suites fast and trustworthy with Playwright and a methodical approach to flaky tests, and how the modern toolchain works: Vite, bundlers, transpilers, ESLint flat config, pnpm, monorepos, CI/CD and releases. In the exercises **you write the tests**, and they have to catch real bugs.',
  objectives: [
    'Explain the testing trophy and decide what to test, and at which level, for a React feature',
    'Choose the right Testing Library query and variant (getBy / queryBy / findBy), use user-event, and fix "not wrapped in act" warnings properly',
    'Use vi.fn, vi.spyOn, hoisted vi.mock, fake timers and MSW appropriately',
    'Write Playwright tests with role-based locators and web-first assertions, and diagnose a flaky test step by step',
    'Explain how Vite works in dev and build, why isolatedModules exists, and how pnpm prevents phantom dependencies',
    'Describe a frontend CI/CD pipeline, monorepo task graphs and caching, semver ranges and Changesets',
    'Write test suites that catch every planted bug, and implement semver range matching and a monorepo build order',
  ],
  skills: ['testing', 'tooling', 'react', 'agentic'],
  blocks: [
    {
      kind: 'review',
      id: 'warm-up-review',
      title: 'Warm-up: spaced repetition',
      minutes: 15,
      intro:
        'Flashcards from earlier days. Pay extra attention to async (Day 2) and accessibility (Day 9): today\'s fake timers, `findBy*` queries and role-based locators build directly on them.',
    },
    {
      kind: 'lesson',
      id: 'testing-strategy-rtl',
      title: 'Testing strategy, Vitest & React Testing Library',
      minutes: 40,
      body: testingStrategyRtl,
      checks: testingChecks,
    },
    {
      kind: 'lesson',
      id: 'e2e-quality',
      title: 'End-to-end testing & quality engineering',
      minutes: 30,
      body: e2eQuality,
      checks: e2eChecks,
    },
    {
      kind: 'lesson',
      id: 'frontend-tooling',
      title: 'Tooling: Vite, bundlers, linting, packages, monorepos & CI',
      minutes: 40,
      body: frontendTooling,
      checks: toolingChecks,
    },
    {
      kind: 'quiz',
      id: 'testing-tooling-quiz',
      title: 'Quiz: queries, flaky tests & tooling trade-offs',
      minutes: 15,
      intro: 'Commit to an answer before you reveal it, then read the whole explanation. The wrong options are the answers interviewers hear most often.',
      questions: quizQuestions,
    },
    {
      kind: 'exercise',
      id: 'testing-tooling-exercises',
      title: 'Write the tests, then build the tools',
      minutes: 65,
      intro: `The first three exercises flip the usual format: **you write the tests**, and they must pass on the correct implementation *and* fail on every planted bug. Before writing any code, list the rules in the contract and the inputs where a buggy version would behave differently. One behaviour per \`it\`, with names that read like a spec.

Then implement two pieces of tooling logic you rely on every day: semver range matching and a monorepo build order. Talk out loud and time-box each exercise (about 15 minutes). Read every explanation afterwards. The follow-up questions are what interviewers ask next.`,
      exercises: [testFormatDuration, testLoginForm, testDebounce, semverSatisfies, monorepoBuildOrder],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill',
      minutes: 15,
      intro:
        'Answer each question out loud in 90–120 seconds before you reveal the model answer: a one-sentence answer first, then mechanism, then a trade-off or an example from your own work. For the flaky-test and CI questions, name the tools and commands you would actually use.',
    },
  ],
  flashcards,
  interviewQuestions,
};

export default day;
