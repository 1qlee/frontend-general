## Why behavioural rounds sink strong engineers

Behavioural rounds are scored against a rubric of competencies, often by someone outside the team. Vague, unstructured answers score low regardless of how good the underlying work was. Good engineers lose offers here because they **under-prepare** ("I'll just talk about my work") and then ramble, say "we" for everything, or forget the result.

The fix is mechanical: a structure (STAR), a prepared **story bank**, and practice out loud.

| Competency | What they're looking for |
|---|---|
| **Ownership** | You take responsibility end to end, including when things go wrong |
| **Collaboration & conflict** | You disagree productively, understand others' constraints, commit once decided |
| **Influence** | You move people and decisions without relying on a title |
| **Ambiguity** | You turn vague problems into a plan without waiting to be told |
| **Delivery** | You prioritise, cut scope sensibly, and communicate trade-offs early |
| **Technical judgement** | You weigh alternatives and choose for good reasons |
| **Growth** | You seek feedback, learn, and change behaviour |
| **Multiplying others** | You mentor, document, and raise the team's bar |

## STAR(R): the structure

| Part | What to cover | Share of answer | Tips |
|---|---|---|---|
| **S**ituation | Context in 1–2 sentences: team, product, what was at stake | ~10–15% | Only what's needed to understand the stakes |
| **T**ask | Your specific responsibility or goal | ~10% | "I owned…", "My goal was…" |
| **A**ction | What **you** did, step by step, and why | ~50–60% | The scoring happens here. Use "I". Mention alternatives you rejected |
| **R**esult | Outcome, ideally measurable | ~15% | Numbers, user impact, what happened next |
| **R**eflection | What you learned / would do differently | ~5–10% | Concrete changed behaviour, not "I learned communication matters" |

Target **2–3 minutes**, then stop and let them ask follow-ups. A crisp answer with room for questions beats a 6-minute monologue.

### A worked example

*(Illustrative: swap in your own story and real numbers.)*

> **Question:** "Tell me about a time you improved performance."
>
> **S:** "Our analytics dashboard felt frozen on mid-range Android phones. Field data showed interactions taking around 600 ms, and support tickets about 'stuck filters' were rising."
>
> **T:** "I owned the dashboard frontend, and my goal was to get interaction latency under the 200 ms 'good' INP threshold within a quarter, without a rewrite."
>
> **A:** "First I reproduced it with CPU throttling and profiled. The filter change re-rendered 5,000 table rows synchronously and recomputed aggregates on the main thread. I considered paginating the table but product needed scrolling, so I virtualised the rows, moved aggregation into a Web Worker, and marked the filter update as a transition so typing stayed responsive. I also added real-user INP tracking per route, because lab numbers on my laptop had hidden the problem. To get the time, I pitched it to my PM as two sprints, tied to ticket volume."
>
> **R:** "p75 INP dropped from about 600 to about 150 ms, freezing-related tickets fell by roughly 70%, and two other teams adopted the worker pattern."
>
> **R:** "I learned to measure in the field before optimising. I now add RUM metrics at the start of any performance project."

## "Tell me about yourself" in 60–90 seconds

This is your trailer, not your autobiography. About **150–200 words**. Structure: **present → past highlights → what you're known for → why this role**.

| Part | Length | Content |
|---|---|---|
| Present | 1–2 sentences | Role, years, domain, current scope |
| Past highlights | 2–3 sentences | Two achievements relevant to *this* job, with impact |
| Known for | 1 sentence | Your strength as colleagues would describe it |
| Why this role | 1–2 sentences | What you want next and why this company fits |

**Fill-in template:**

> "I'm a frontend engineer with [N] years building [kind of product], currently at [company], where I [scope: own X / lead Y]. Recently I [highlight with a number]. Before that, at [company], I [second highlight]. On teams I'm known for [strength, e.g. making complex UIs fast and accessible, or raising the quality bar with testing]. I'm now looking for [what you want], and [company]'s [specific product/engineering detail] is exactly that, which is why I'm excited to talk."

> [!MISTAKE]
> Starting from university and walking through every job. They have your CV. Pick the two highlights that match the job description and stop at 90 seconds.

## Story-bank template

Prepare **8 stories** that cover the themes below. Most stories can answer 2–3 questions, so 8 well-rehearsed stories cover almost any behavioural round. Keep a short (60 s) and a long (3 min) version of each.

| Theme | Situation (stakes, who) | Action (what *you* did, alternatives rejected) | Result (metric, outcome) | Learning (changed behaviour) | Also answers |
|---|---|---|---|---|---|
| 1. **Technical win / proudest project** | What was hard or important? | Key decisions and why | Users, performance, revenue, time saved | What you'd repeat | Hard technical decision, going above and beyond |
| 2. **Conflict / disagreement** | Who disagreed about what, and why it mattered | How you understood their view, used data, found shared goals | Decision made, relationship intact | How you handle disagreement now | Disagreeing with a manager/PM, difficult colleague |
| 3. **Failure / mistake** | A real mistake with real consequences | How you owned it, fixed it, communicated | Recovery + systemic fix (test, process, alert) | What you do differently since | Production incident, missed deadline |
| 4. **Influence without authority** | A change you believed in but couldn't mandate | Prototype, RFC, data, allies, incremental rollout | Adoption, outcome | How you build buy-in | Leading an initiative, driving a migration |
| 5. **Ambiguity** | Vague goal, unclear requirements or ownership | How you framed options, made assumptions explicit, set checkpoints | What shipped and how it was received | How you de-risk ambiguity | Working with little direction, startup-style work |
| 6. **Tight deadline / trade-off** | Fixed date, too much scope | What you cut, how you negotiated, how you protected quality | Shipped on time, follow-up plan | How you scope now | Prioritisation, pressure, saying no |
| 7. **Mentoring / growing others** | Someone who needed support, or a team skill gap | Pairing, reviews, docs, delegated stretch work | Their growth, team outcome | How you multiply impact | Leadership, onboarding, code-review culture |
| 8. **Hard feedback received** | Feedback that stung | How you listened, verified, acted | Observable change, later recognition | Your feedback habits | Biggest weakness, growth area, self-awareness |

**Raw material to mine:** a production incident, a migration (JavaScript to TypeScript, class components to hooks, Webpack to Vite), a performance project, an accessibility remediation, building or adopting a design system, pushing back on a deadline, a cross-team dependency, onboarding a new hire, a project you'd do differently, an AI-tooling rollout.

## The 15 most common questions

| # | Question | What they're really probing | Best story | The trap |
|---|---|---|---|---|
| 1 | Tell me about yourself. | Communication, relevance, self-awareness | Your pitch | Reciting your CV |
| 2 | Why this company / this role? | Motivation, research, likelihood to stay | Specifics about their product and engineering | Generic praise, or compensation as the reason |
| 3 | Why are you leaving? | Negativity, flight risk | Forward-looking: what you want next | Criticising your employer |
| 4 | What project are you most proud of? | Depth, ownership, impact | #1 Technical win | "We did…" with no personal contribution or metrics |
| 5 | Tell me about a conflict with a colleague. | Empathy, maturity, disagree-and-commit | #2 Conflict | A villain story where you were 100% right |
| 6 | Tell me about a failure or mistake. | Ownership, learning, honesty | #3 Failure | A fake failure, or blaming others |
| 7 | Tell me about disagreeing with your manager or PM. | Courage plus collaboration; data over opinion | #2 or #4 | Either caving instantly or going around them |
| 8 | Tell me about delivering under a tight deadline. | Prioritisation, trade-offs, early communication | #6 Deadline | Heroic all-nighters as the solution |
| 9 | Tell me about a time with unclear requirements. | Independence, structuring problems | #5 Ambiguity | Waiting for someone to clarify |
| 10 | Tell me about leading something without formal authority. | Leadership, influence | #4 Influence | Relying on your title |
| 11 | Tell me about critical feedback you received. | Coachability, self-awareness | #8 Feedback | "I can't think of any" |
| 12 | Tell me about mentoring someone. | Multiplying others (key for senior roles) | #7 Mentoring | "I answered their questions when asked" |
| 13 | What's your biggest weakness? | Self-awareness and a growth plan | #8 Feedback | Humblebrags such as "I'm a perfectionist" |
| 14 | Tell me about a difficult technical decision. | Judgement, trade-offs, alternatives | #1 or #4 | Only one option ever considered |
| 15 | Tell me about going beyond your role for users. | User focus, initiative (accessibility and performance are great here) | #1 or #4 | Work with no user or business impact |

**Follow-ups to expect on any story:** "What would you do differently?" · "How did you measure that?" · "What did the other person think?" · "What was *your* part specifically?" · "What happened afterwards?"

## Senior-level signals

| Dimension | Mid-level answer | Senior answer |
|---|---|---|
| **Scope** | My ticket, my component | A team- or org-level problem, often crossing team boundaries |
| **Impact** | "It worked." | A measurable user or business outcome, plus second-order effects |
| **Decisions** | What I did | Options considered, why rejected, risks accepted |
| **People** | I fixed it myself | I aligned stakeholders, unblocked others, grew someone |
| **Conflict** | I convinced them | I understood their constraints, found the shared goal, and committed even when I lost |
| **Failure** | A small bug | Real stakes, transparent communication, and a **systemic** fix so it can't recur |
| **Ambiguity** | I asked for clearer requirements | I defined the problem, proposed options, and drove a decision |
| **Learning** | "I learned communication is important." | A specific habit that changed and evidence it stuck |

> [!INTERVIEW] Senior phrasing to borrow
> "There were two options: X, which was faster to ship, and Y, which was safer long term. I chose X with a guardrail, because the deadline was fixed and the guardrail limited the risk, and I scheduled Y for the following quarter, which we did."

## Scripts for awkward questions

| Question | Script |
|---|---|
| **Why are you leaving?** | "I've learned a lot at X, especially [skill]. I'm looking for [scope/product/growth] that isn't available there right now, and this role offers exactly that." |
| **Gap or layoff** | "My role was eliminated in a reorganisation affecting [N] people. I used the time to [course, project, rest], and I'm ready for [what's next]." Short, factual, forward. |
| **Biggest weakness** | A real but non-fatal weakness + what you do about it: "I used to go quiet during deep work and teammates found out late about blockers. Now I post a short async update daily and flag risks as soon as I see them." |
| **Salary expectations** (early) | "I'd like to understand the role and level first. I'm sure we can find a fair number. What's the range for this position?" |
| **"Do you have any questions?"** | Always yes. See the day-of checklist for questions by interviewer type. |

## Pitfalls

> [!MISTAKE]
> **"We" all the way through.** Interviewers can't hire your team. Say "we" for context and "I" for actions: "The team decided to migrate; *I* wrote the codemod and ran the rollout."

> [!MISTAKE]
> **Hypotheticals.** "Tell me about a time…" needs a real story. "I would…" signals you don't have one. If you truly don't, say so and offer the closest real example.

> [!MISTAKE]
> **No result.** Ending at the action leaves the interviewer guessing. If you have no numbers, give qualitative results: "the PM started using the dashboard in exec reviews".

> [!MISTAKE]
> **Badmouthing.** Even when a colleague or employer was genuinely difficult, describe their constraints charitably. Interviewers picture you describing *them* that way.

- **Rambling situations.** If you've talked for a minute and haven't reached the action, you've lost them.
- **One story for everything.** Using your single best project for five questions looks thin. Spread across the bank.
- **Sounding memorised.** Rehearse the bullet points, not a script, so it sounds like conversation.
- **Not answering the question.** If asked about conflict, the story must contain a real disagreement.

## How to practise

1. Write the 8 stories as bullet points in the story-bank table (20 minutes each, once).
2. Say each one out loud with a 3-minute timer. Record yourself; listen for "we", filler, and missing results.
3. Drill the question list with the **Behavioural** mode in this app's Mock interview, mapping each question to a story in under 5 seconds.
4. Do one mock with a friend who asks follow-ups ("what would you do differently?").

## Key takeaways

- Use **STAR(R)**: keep situation short, spend half the time on *your* actions, finish with a measurable result and a real learning.
- "Tell me about yourself" is a 60–90-second trailer: present, two highlights, strength, why this role.
- Prepare **8 stories** that each answer 2–3 questions; know which story fits each of the 15 common questions.
- Senior signals: wider scope, alternatives and trade-offs, aligning people, systemic fixes.
- Say "I", give numbers, never badmouth, and stop talking at 3 minutes.
