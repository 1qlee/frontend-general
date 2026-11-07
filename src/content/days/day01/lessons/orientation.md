## Why you underperform in interviews (and how this course fixes it)

Most experienced frontend developers who "do badly in interviews" are not missing knowledge. They are missing three things:

1. **Retrieval under pressure.** You *know* how closures work, but you've never had to explain them out loud, crisply, in 60 seconds, while someone watches. Knowledge you can't retrieve on demand doesn't count.
2. **Vocabulary.** Interviewers listen for specific words: *lexical scope*, *microtask queue*, *reconciliation*, *referential equality*, *discriminated union*, *stacking context*. Using the precise term signals depth instantly.
3. **Reps on the formats.** Coding rounds, UI "machine coding" rounds, system design and behavioural rounds each have a format. Doing each format 10+ times removes most of the anxiety.

This course is built around those three gaps. Every day mixes **reading** (mental models + vocabulary), **doing** (automated exercises, type challenges, React builds), **saying** (speak-aloud drills with model answers) and **reviewing** (spaced-repetition flashcards).

> [!INTERVIEW] The meta-skill
> Interviewers are not grading whether you reach the perfect answer. They are grading *signal*: how you clarify, how you reason, how you communicate trade-offs, and how you react to hints. A correct answer delivered silently scores lower than a mostly-correct answer explained well.

## How each day works (~4 hours)

| Block | What to do |
|---|---|
| **Warm-up review** | Flashcards from earlier days. Answer out loud *before* flipping. Be honest with your rating. |
| **Lessons** | Read actively. Run every ▶ snippet, then *change it* and predict the new output before re-running. Answer the inline checks without scrolling back. |
| **Quiz** | Commit to an answer before revealing. Read every explanation, even for questions you got right. |
| **Exercises** | Start a timer. Talk out loud as if an interviewer is listening. Use hints only after 5 stuck minutes. Read the explanation after passing — it contains the follow-up questions you'll get. |
| **Labs** | Hands-on work in your own practice repo (`fe-gym`), including the Claude Code track. |
| **Speak-aloud drill** | Answer each question out loud in 1–2 minutes, *then* reveal the model answer and grade yourself honestly. "Shaky" and "missed" answers come back in Mock Interview mode. |
| **Confidence check** | Rate yourself on the day's skills. The dashboard tracks how your confidence grows. |

## Ground rules

- **No AI during first attempts at drills and exercises.** Interviews (mostly) don't allow it, and retrieval practice only works when *you* retrieve. Use Claude Code afterwards to review your solution, and in the dedicated agentic labs.
- **Say it out loud.** Muttering counts. Silence doesn't.
- **Type the code yourself.** No copy-pasting solutions into the editor — recognition is not recall.
- **Timebox.** If an exercise takes more than ~1.5× its estimate, read the hints, finish it, and flag it to redo tomorrow.
- **Track what's shaky.** The app records it; you just need to be honest when self-grading.

## What "proficient" looks like at the end

By the last day you should be able to, without notes:

- Explain the event loop, closures, `this`, and prototypes precisely, and predict tricky output.
- Implement debounce, throttle, `Promise.all`, a concurrency-limited task pool, deep clone/equal, an event emitter, and memoization in TypeScript in under 15 minutes each.
- Write strict TypeScript fluently, including generics, discriminated unions, conditional and mapped types — and type React components, hooks and context properly.
- Explain React's rendering model, reconciliation, effects, and React 19 features; build common UI components (tabs, modal, autocomplete, data table) accessibly in 45 minutes.
- Talk through Core Web Vitals, caching, security (XSS/CSRF/CSP/CORS) and accessibility with concrete examples.
- Drive a frontend system design interview using a structured framework.
- Recognise the common algorithm patterns (hashing, two pointers, sliding window, BFS/DFS, binary search, simple DP) and talk through an unseen LeetCode-style problem methodically.
- Use Claude Code like a senior engineer: planning, context management, custom commands, subagents, hooks, MCP, CI — and talk credibly about AI-assisted development in interviews.

## Set up today (part of the lab later)

You'll create **`fe-gym`**, a personal practice repository (Vite + React + TypeScript + Vitest + Testing Library). Most labs happen there, and it becomes a portfolio of everything you build in these two weeks. The Claude Code lab at the end of today walks you through it.

> [!TIP]
> Use the ⏱ study timer in the top bar. It logs your study minutes per day so you can see whether you're actually putting in the four hours.

## Key takeaways

- Interview performance = knowledge × retrieval × communication × format familiarity. This course trains all four.
- Do things out loud, timeboxed, without AI on first attempts.
- Be honest in self-assessment; the app turns it into a targeted review list.
