# Poker Coach — next actions

Live: https://pokercoach.withmagic.ai · Repo: coding-island-js/poker-coach (private)
Last groomed: 2026-08-25

This file is the single source of truth for what to do next. Read it first on any new
session. Durable context lives in memory (`~/.claude/projects/C--Users-raj-Projects-poker-coach/memory/`).

---

## Where it stands (2026-08-25)

Shipped and working: 100 hands across flop/turn/river, all six seats named, opponent range
shown broken into hand classes, EV measured by 250 replays per action, magic-link accounts
over Neon with progress sync, content gate + audit wired into the build. 20 tests passing.

**The honest gap:** every spot is heads-up and a single decision. Real low-stakes hands are
3-5 ways, and the most valuable coaching is planning a street ahead. Hungry Horse's quiz
(analysed 2026-08-25, 20 questions, 58k views) does both, and three of his twenty questions
are preflop, which we cannot answer at all.

---

## 🔥 NOW — the next build

### 1. Same-hand continuation: turn → river  `#now`
Ask the turn, then the river **of the same hand**, as one lesson. Hungry Horse pairs his
questions this way (his Q11-12) and it is the single most valuable thing in his video: it
teaches planning a street ahead rather than reacting to a snapshot.

Cheap for us — the rollout already plays the hand to completion, so the continuation is a
second decision point on a line we already simulated.

- Generator: when a turn spot is scored, keep playing to the river decision and score that too
- Emit as a linked pair (`chainId`, `step: 1|2`)
- App: after the turn result, "Now the river" instead of "Next hand"
- Watch: the river spot must be conditioned on the action the LEARNER chose, not the one the
  bot took, or the second question is about a hand that never happened. This is the hard part
  and the reason to do it first rather than bolt it on later.

### 2. Multiway spots (3-5 players)  `#now`
Biggest realism gap. Every current spot is heads-up; real $1/$2 pots are not.
- Rollout already handles multiway — it plays whatever table it is given
- The hard part is the range maths: `showdownSplit` and `rangeBreakdown` compare against ONE
  opponent. Multiway needs "beats you" to mean "beats you and everyone else still in"
- Decide how the read question reads with two opponents ("where do you stand against the field")

---

## ⏳ NEXT

### 3. Weight the fallback range instead of uniform  `#v2`
About a third of hands fall back to `plausibleRange`, which is now uniform over every dealable
holding and therefore overstates how weak he is. Weighting air down (~0.35) is more accurate
but needs `showdownSplit` to sum weights rather than count combos — which costs the clean
integer count the copy depends on ("87 of his 105"). Decide the trade before building.
added:2026-08-25

### 4. Regenerate the second pool with the new generator  `#v2`
`work/candidates-b.stale.json` is river-only and pre-dates streets/positions/breakdown.
Regenerate it (`npm run generate:more`) and merge, which lifted the median EV gap from $60 to
$82 last time. Pure variety win, no design decisions. added:2026-08-25

### 5. Named seats shown as a table, not a line of text  `#v2`
Hungry Horse draws the 6-max table with every seat named and stacked. Seeing the layout
teaches position better than "You're in the small blind, he's in the big blind." Pairs
naturally with multiway (3). added:2026-08-25

### 6. Turn Google sign-in on  `#track`
Two steps, both recorded in `netlify/functions/auth-google.mjs`: register
`https://pokercoach.withmagic.ai/api/auth/google/callback` on the OAuth client in GCP project
`1093236447839`, then set `GOOGLE_SIGNIN_ENABLED=true` in Netlify. Deferred by Raj
2026-08-25; magic link works and is verified. added:2026-08-25

### 7. Play 15 hands and read the calibration number  `#track`
The confidence-before-grading data is captured and syncing but says nothing until there is
volume. Raj is signed in. This is a product-validation task, not a build task. added:2026-08-25

---

## 💤 SOMEDAY

- **A countdown timer on the action question.** Hungry Horse gives a few seconds then reveals.
  Forces commitment; we currently allow unlimited deliberation, which is not the game. `#idea`
- **`bet-no-caller` is the thinnest leak (14 of 100).** Not broken, just the least common shape
  in the pool. Revisit if a bigger pool does not even it out. `#idea`
- **Rewrite `docs/` rather than annotate it.** The four V2 documents are annotated as superseded
  where they describe Codex's old six leaks. The reasoning in them still stands. `#idea`
- **A landing page.** The app is the whole site; there is no explanation for a first-time
  visitor who has not been told what it is. `#idea`

---

## 🧊 PARKED

- **Preflop questions.** Raj: "nothing preflop, or preflop would be something totally
  different" (2026-08-25). Worth noting Hungry Horse spends 3 of 20 questions there and low
  stakes leaks a lot of money preflop, so this is a deliberate scope call rather than a
  settled truth. Revisit only if the postflop set feels complete.
- **A solver baseline layer.** Free solvers (TexasSolver, WASM Postflop) could compute a GTO
  baseline next to our exploit line. Decided 2026-08-25 not worth it: GTO output serves the
  audience we deliberately retargeted away from, and TexasSolver is slow and unmaintained.
  Hand-check a dozen baselines in WASM Postflop instead if credibility is ever questioned.

---

## ✅ RECENTLY DONE (2026-08-25)

Rebuilt the whole product in one day, from a Codex/OpenAI-Sites React scaffold to a vanilla
site on the standard stack.

- Vanilla rewrite, Netlify, `pokercoach.withmagic.ai` via Cloudflare (`9366132`)
- Content pipeline: poker-sim deals the hands, EV measured by 250 replays, coaching templated
  over the measured numbers. 75k hands dealt across pools
- Accounts: magic link over Neon, progress sync, 16 e2e checks against production (`a0262d8`)
- Email moved Resend → Cloudflare Email Sending; verified delivered to inbox (`53cbb80`)
- Google gated off behind a flag rather than left erroring (`61518e9`)
- Audit tool that re-derives every claim from the cards; found 4 real content bugs (`0c69e10`)
- Leak taxonomy rebuilt from what the content actually contains (`7626a01`)
- Flop/turn/river spots, named positions, range breakdown shown (`c80cd8c`, `df7f019`)
