import type { Day } from '../../types';

import howAgentsWork from './lessons/how-agents-work.md?raw';
import contextEngineering from './lessons/context-engineering.md?raw';
import teamAndInterviews from './lessons/team-and-interviews.md?raw';
import capstoneLab from './lessons/capstone-lab.md?raw';

import { hookGuardDecision, summarizeAgentRun } from './exercises';
import { agentChecks, contextChecks, quizQuestions, teamChecks } from './quiz';
import { flashcards, interviewQuestions } from './interview';

const day: Day = {
  number: 14,
  title: 'Agentic Development in Professional Frontend Work',
  tagline: 'One mental model for coding agents (context and verification), one professional workflow, and a feature shipped end to end.',
  summary:
    'Thirteen days of Claude Code labs taught the features one at a time. Today brings them together into a model you can explain in an interview: an agent is a model in a loop with tools, its context window is the scarce resource, and verification is the biggest quality lever. You will learn to design context (CLAUDE.md, skills, commands, subagents, hooks, MCP), pick the right workflow for each task, run agents safely on a team and in CI, review AI-generated code properly, and talk about all of it credibly. The capstone ships an accessible command palette from spec to reviewed PR.',
  objectives: [
    'Explain the agent loop, the context window and context rot, and why verification is the biggest quality lever',
    'Name the characteristic agent failure modes and the structural mitigation for each',
    'Design a team CLAUDE.md and choose correctly between CLAUDE.md, skills, commands, subagents, hooks, permissions and MCP',
    'Pick and run the right workflow: explore → plan → code → commit, TDD, visual iteration, vertical slices, writer/reviewer, worktrees, headless fan-out',
    'Set up least-privilege permissions, secrets handling, sandboxing, MCP vetting and CI review for a team',
    'Review AI-generated frontend code against a checklist and measure impact honestly',
    'Answer AI-related interview questions with specifics, and handle AI-allowed interview rounds well',
    'Ship a feature end to end with the full workflow and run a retro on the agent\'s performance',
  ],
  skills: ['agentic', 'security', 'testing', 'tooling', 'interviewing'],
  blocks: [
    {
      kind: 'review',
      id: 'warm-up-review',
      title: 'Warm-up: spaced repetition',
      minutes: 15,
      intro:
        'Flashcards from earlier days. When a card comes from a Claude Code lab, ask yourself which question it answers: a **context** question (what does the agent see?) or a **verification** question (how does it know it is right?). Today is built on that split.',
    },
    {
      kind: 'lesson',
      id: 'how-agents-work',
      title: 'How coding agents actually work',
      minutes: 35,
      body: howAgentsWork,
      checks: agentChecks,
    },
    {
      kind: 'lesson',
      id: 'context-engineering',
      title: 'Context engineering & workflow patterns',
      minutes: 40,
      body: contextEngineering,
      checks: contextChecks,
    },
    {
      kind: 'lesson',
      id: 'team-and-interviews',
      title: 'Agentic development on a team (and in interviews)',
      minutes: 35,
      body: teamAndInterviews,
      checks: teamChecks,
    },
    {
      kind: 'quiz',
      id: 'agentic-scenarios',
      title: 'Scenarios: what would you do?',
      minutes: 15,
      intro: 'Each question is a situation you will meet at work or in an interview. Commit to an answer, then read the whole explanation. The wrong options are mistakes people really make.',
      questions: quizQuestions,
    },
    {
      kind: 'exercise',
      id: 'agent-tooling-code',
      title: 'Agent tooling in code',
      minutes: 25,
      intro:
        'Two small pieces of the tooling teams build around agents: the decision logic of a PreToolUse guard hook, and a summary of a headless run log. Start a timer and talk out loud. These are ordinary interview-style data problems, so no AI on the first attempt. Afterwards, compare your guard with the hooks in your fe-gym `.claude/` folder.',
      exercises: [hookGuardDecision, summarizeAgentRun],
    },
    {
      kind: 'lab',
      id: 'capstone-command-palette',
      track: 'agentic',
      title: 'Capstone: ship a feature end-to-end with Claude Code',
      minutes: 60,
      body: capstoneLab,
      checklist: [
        'Branch feat/command-palette (or a worktree) created; format + typecheck hooks and react-reviewer / a11y-auditor subagents confirmed or added',
        'specs/command-palette.md written by you, critiqued by Claude (no code), and revised',
        'Plan approved in plan mode and saved as a checklist in notes/command-palette-plan.md with 2–3 vertical slices',
        'Slice 1: failing tests reviewed and committed BEFORE the implementation; implementation passes with no test-file changes',
        'Slice 2 done the same way after /clear, resuming from the plan file',
        'Every diff read by you and tests re-run yourself before each commit',
        'Reviewer subagent findings merged, triaged by you, and the chosen fixes applied with tests + typecheck green',
        'PR opened with a description; Claude GitHub Action review (or a fresh-session review) requested and each comment handled',
        'Retro written in notes/day14-retro.md and one CLAUDE.md improvement, based on a real mistake, committed',
      ],
    },
    {
      kind: 'drill',
      id: 'speak-aloud',
      title: 'Speak-aloud drill: AI-assisted development',
      minutes: 15,
      intro:
        'Answer each question out loud in 90 seconds to 2 minutes before revealing the model answer. Use **your own** examples: the capstone you just shipped is a ready-made story. Give yourself a point for each of: a concrete workflow, a verification step, a judgement call about when not to use the agent, and explicit ownership.',
    },
  ],
  flashcards,
  interviewQuestions,
};

export default day;
