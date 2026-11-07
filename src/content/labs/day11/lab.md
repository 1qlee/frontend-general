## Goal

Turn Claude into a **strict mock interviewer** for frontend system design. You'll write a reusable `/mock-sd` command that asks one question at a time, pushes back on hand-waving, enforces a time plan and scores you against RADIO at the end. You'll run a 25-minute mock for **"Design a notifications center"**, then deliberately work against the model's tendency to agree with you by asking for the strongest objections to your design. Finally, you'll record one decision as an Architecture Decision Record (ADR) using plan mode.

> [!NOTE]
> Don't open the model answer for the notifications question in today's drill until you've finished this lab. You'll compare against it afterwards.

## Why this matters professionally

System design rounds reward *driving*: clarifying scope, structuring out loud, stating trade-offs and defending them under pressure. That takes reps with someone who pushes back, and peers aren't always available. An AI interviewer is available at 11 pm, but by default it's **too nice**: models tend to go along with the person they're talking to (sycophancy). The professional skill here goes beyond interview prep. It's knowing how to get honest critique out of an assistant, in design reviews, RFCs and architecture decisions, instead of applause.

## 1. Write the interviewer command (4 min)

You built custom commands on Day 3. Create `.claude/commands/mock-sd.md`:

```md
---
description: Strict frontend system design mock interviewer (RADIO, timed, scored)
argument-hint: <design prompt>
---
You are a strict senior frontend interviewer at a large product company, running a 25-minute
frontend system design round. The prompt is: "$ARGUMENTS".

Rules for the round:
- Do NOT design anything for me, give hints, or show example answers. Don't read or edit files.
- ONE question or follow-up per message, under 60 words.
- Open by restating the prompt in one sentence and saying "Go ahead." Then wait.
- Answer my clarifying questions briefly, like a real interviewer. Invent reasonable product
  constraints when I ask, and keep them consistent.
- Push back when I skip requirements, hand-wave ("we'll cache it"), pick a technology without a
  reason, or ignore failure modes, accessibility, performance or security. Ask "why?",
  "what breaks first?" and "what would make you change that?".
- No praise. Neutral acknowledgements only ("OK.", "Noted.").
- Time: I prefix each message with the elapsed time, e.g. [07:30]. Plan: Requirements 0-5,
  Architecture 5-10, Data model 10-14, Interface 14-18, Optimizations 18-23, wrap-up 23-25.
  If I overrun a phase by more than 2 minutes, say so and move me on.

When I write END, or the time passes 25:00, stop interviewing and score me:
- Each RADIO dimension 1-4 (1 missing, 2 shallow, 3 solid, 4 senior), each with a short quote
  from my answers as evidence.
- Communication: signposting, trade-off phrasing, time management.
- Overall: strong hire / hire / lean no hire / no hire, with the single biggest reason.
- The 3 most important things to practise, concrete enough to drill tomorrow.
- For my weakest dimension only: 3 bullets a strong candidate would have covered.
```

Start a session in **plan mode**, so the interviewer can't wander off and edit files:

```bash
claude --permission-mode plan
```

## 2. Run the mock (25 min)

Start a real timer. Open `notes/day11-mock.md` as your "whiteboard": requirements, a component tree in words, entities, endpoints. **Say each answer out loud first**, then type a condensed version. The goal is the speaking habit, not polished prose.

```text
/mock-sd Design a notifications center for a web app: a bell icon with an unread count in the header and a dropdown list of notifications that updates in real time.
```

Keep the `[mm:ss]` prefix honest. Claude can't see your clock, so if you don't report the time, it can't keep you on schedule. When it pushes back, do what you'd do in the room: answer, or say "Good point, I'd change X because Y". Don't argue just to win. Type `END` at 25:00 and read the scorecard without defending yourself. Save it in `notes/day11-scorecard.md`, not in the whiteboard file, so it can't bias step 3.

> [!TIP]
> If Claude slips into helping ("You might consider WebSockets…"), point it to the rule: "Rule check: no hints. Ask me the next question." Stepping back into the role on request is easy for the model. Noticing that it broke character is your job.

## 3. Ask for the strongest objections (3 min)

Run `/clear`. A fresh context matters here, because the same conversation that just scored you is anchored on its own earlier judgements. Then ask about your design **in the third person**, without revealing that it's yours or which option you prefer:

```text
Here is a candidate's frontend system design for a notifications center: @notes/day11-mock.md

Act as the most skeptical staff engineer on the hiring committee. List the 5 strongest objections,
ordered by severity. For each: a concrete failure scenario (numbers or a user story), why this design
doesn't handle it, and what a stronger answer would say. No strengths, no softening; treat anything
underspecified as a gap. If you're not sure a technical claim is correct (browser limits, protocol
behaviour), say so instead of guessing.
```

Then make it argue the other side:

```text
Steelman the strongest alternative to the candidate's real-time transport choice. Under which
concrete conditions does the alternative win? What evidence would change your recommendation?
```

Countering sycophancy, in short: **fresh context**, **third-person framing**, **ask for objections rather than opinions**, **hide your preference**, and ask **what would change its mind**. For a quick consistency check, ask the same question again in a new session while claiming the *opposite* preference. If the verdict flips with your stated preference, it was never a verdict.

## 4. Record the decision as an ADR (3 min, finish after the drill)

An ADR captures one significant decision: its context, the options considered, the choice and its consequences. Teams keep them in the repo so the *why* survives after the people involved move on. Switch to **plan mode** (Shift+Tab) if you aren't still in it:

```text
I want an Architecture Decision Record at docs/adr/0001-notifications-realtime-transport.md,
based on @notes/day11-mock.md and the objections above.
Sections: Title, Status (Proposed), Date, Context, Options considered (polling, long polling, SSE,
WebSocket, Web Push via a service worker) with pros and cons, Decision, Consequences (positive,
negative, follow-ups), When to revisit.
Plan first: show me the outline and list every factual claim you intend to make that I should
fact-check. Leave Decision as "TODO (me)". I'll write it.
```

Review the plan. Cut options that don't belong, and add the "when to revisit" trigger you'd actually use (for example, "if we add chat, revisit WebSocket"). Approve it and let Claude write the file. Then write the **Decision** section yourself in the "options → choice → reason → when to revisit" form from today's lesson, and check each flagged claim against MDN or the spec before you mark the ADR **Accepted**. Typical claims to verify are per-origin connection limits for SSE over HTTP/1.1 vs HTTP/2, and whether `EventSource` can send custom headers.

## The limits of an AI interviewer

- **It can't read your interviewer's mind.** Real rubrics vary by company and level. Real interviewers steer towards their favourite deep dive, and they read your body language. Treat the score as a way to compare your own runs, not as a prediction.
- **It's text, not a whiteboard.** You lose the diagramming skill and the pressure of silence. Do at least one mock a week with a person.
- **It can be confidently wrong.** Protocol details, browser limits and API behaviour should be verified, especially when they end up in an ADR other people will rely on.
- **Its strictness drifts.** Long conversations soften the persona. That's why the rules live in a command you rerun, and why the critique happened in a fresh context.

## Verify

- `.claude/commands/mock-sd.md` exists and `/mock-sd <prompt>` starts a round that asks one question at a time.
- `notes/day11-mock.md` holds your whiteboard, and `notes/day11-scorecard.md` has a score and evidence for each RADIO letter.
- You have the 5 objections and the steelman in your notes, plus your one-line response to each of the top two (concede or defend, with a reason).
- `docs/adr/0001-notifications-realtime-transport.md` exists, with a Decision section in your words and fact-checked claims.

## Reflect (write in `notes/day11.md`)

- Which RADIO letter scored lowest? What *specifically* will you say differently next time? Write the sentence.
- Where did Claude push back hardest, and did the pushback hold up when you compared it with the drill's model answer?
- Did you catch any sycophancy (praise, caving when you disagreed, a verdict that flipped)? What prompt change fixed it?
- Which factual claim in the ADR turned out to be wrong or more nuanced than stated?

> [!INTERVIEW] "How do you use AI tools for design work, not just code?"
> "Mostly as a sparring partner, and I set it up to disagree with me. I describe the design in the third person in a fresh session and ask for the strongest objections, with concrete failure scenarios, then ask it to steelman the alternative. Models tend to agree with whoever they're talking to, so I don't reveal my preference, and I check whether the verdict changes when I argue the other side. The output becomes an ADR: context, options, decision, consequences and when to revisit. I write the decision myself and fact-check any protocol or browser claims before it's accepted. The AI widens the set of objections I consider, but the decision and the accountability stay with the team."
