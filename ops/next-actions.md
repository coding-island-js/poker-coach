# Poker Coach — next actions

Live: https://pokercoach.withmagic.ai · Repo: coding-island-js/poker-coach (private)
Last groomed: 2026-08-27 (decisions taken with Raj)

Single source of truth for what to do next. Read it first on any new session. Durable
context lives in memory (`~/.claude/projects/C--Users-raj-Projects-poker-coach/memory/`).

---

## Where it stands (2026-08-27)

100 hands, 22 of them three-handed, 25 turn hands chaining to a river decision on the line
the learner picked. Every EV measured against the opponent's whole range rather than the one
hand he was dealt. Feedback rewritten so the numbers sit in a facts table and the sentence
carries only the judgment. Three checking layers on every build — engine fuzzer, content
gate, correctness audit — plus 52 tests.

**The honest gap now:** position and the opponent read are shown on screen and never used in
a single coaching sentence. The app names your seat and tells you he is "loose and
aggressive", then explains the answer as if neither existed. Two independent reviewers and
Raj all noticed. That is the next real build.

---

## 🔄 IN FLIGHT

Regeneration running (started 2026-08-27). Carries the history fix (actions of players who
folded later were being deleted, leaving flops that read "You call $8" with nothing to call)
and the range-monotonicity gate. On completion: verify, commit, push, deploy.

---

## 🔥 NOW — no decision needed from Raj

### 1. Use position in the coaching  `#now`
Every seat is named and `inPosition` is known, but no reason, takeaway or purpose line ever
refers to it. Out of position, checking means facing a bet on a card you did not choose —
that is the sentence that makes position mean something, and it does not exist.

### 2. Use the opponent read in the coaching  `#now`
Settled 2026-08-27: the read STAYS. The EV is measured by simulating that specific player, so
the same cards against a station and a rock have opposite right answers - hiding it would
make the question unanswerable. It is already withheld on question 1, which is pure counting,
and shown only for question 2 where it changes the answer. The defect is that it is shown and
then never referenced: the explanation must say "he calls too much, which is why the bigger
bet works here." Reviewers also found hands where the stated read and the measured fold rate
point opposite ways - those need catching.

An advanced mode that HIDES the read and makes the learner infer it from the betting is the
realistic version of this, and is a later feature, not this one.

### 3. Re-run the learner panel on the fixed content  `#now`
`tools/render-lesson.mjs` renders a hand as the plain text a learner sees; five fresh
subagents review it with no repo access. Confirms the 13 fixes closed, and finds the next
tier. Cost roughly 155k tokens for 14 hands.

---

## ⏳ NEXT — 4 and 5 are decided and ready to build; 6-8 still open

### 4. Let flop hands continue to the turn  `#now`
Today only a TURN hand continues (turn, then river). A flop hand could continue to the turn
the same way, doubling how much "what happens next" content exists without making any hand
longer. Decided 2026-08-27 NOT to run a hand all the way flop-turn-river: three decisions
means up to 27 pre-computed versions of one hand, and every piece of feedback says the app
already asks a lot per hand.

### 5. Say the leak in plain English on the hand itself  `#now`
NOT a reference page. Raj 2026-08-27: a term read once is not learned - it has to appear in
context repeatedly, and flipping to a glossary is the frustrating part. So remove the thing
you would look up. "Betting with nothing worse to call" becomes, on that hand, "You bet, and
only better hands called." That IS the definition, in place, in the same words every time.
The category name survives underneath for the progress screen, where it groups results.

### 6. Ask "bet or check" first, "how much" second  `#v2`
One question currently mixes what to do with how much: Check / Bet $9 / Bet $20 / Fold.
Splitting it would score a right-idea-wrong-size answer differently from a wrong-idea one.
Rejected 2026-08-27: cleaner to measure, costs an extra tap on a third of hands, and buys
nothing a learner can feel. Revisit only if the progress screen feels blunt.

### 7. Check-raise is never an option  `#v2`
The passive choice is always framed as surrender ("keep the pot small"). Check-raise is the
standard line for a strong hand out of position facing an aggressor, and its absence is part
of why leading out looks mandatory. Raised by the poker reviewer, not yet verified.

### 8. Draws are never named  `#v2`
No coaching sentence mentions a flush or straight draw, on either side. On a two-tone board
"what calls has you beaten" is wrong — draws call and are behind. Raised by the poker
reviewer, not yet verified.

---

## 🗓️ RAJ ONLY — nobody else can do these

- **Test auth and login end to end.** Raj said 2026-08-27 he would do this. Magic link works
  and was verified in production on 2026-08-25.
- **Turn Google sign-in on.** DEFERRED AGAIN by Raj 2026-08-27 - magic link is enough for
  now. When wanted: register `https://pokercoach.withmagic.ai/api/auth/google/callback` on
  the OAuth client in GCP project `1093236447839`, then set `GOOGLE_SIGNIN_ENABLED=true` in
  Netlify.
- **Play 15 hands and read the calibration number.** The confidence-before-grading data has
  been captured and syncing since 2026-08-25 and says nothing until there is volume.

---

## 💤 SOMEDAY

- **Rake is deliberately zeroed** (`NO_RAKE` in `engine.mjs`) so EV is clean. At $1/$2 a $5
  drop changes thin spots. A known simplification, not a bug — revisit if it bites.
- **250 rollouts.** Reviewers argued gaps of $3 are noise presented as fact. Partly handled by
  raising the "worth teaching" floor to 8% of pot in all three components; more rollouts
  would narrow it further at a cost in generation time.
- **Weight the fallback range** instead of uniform. More accurate, costs the clean integer
  count the copy depends on. added:2026-08-25
- **Draw the six seats as a table** rather than a sentence. added:2026-08-25
- **A landing page.** The app is the whole site. added:2026-08-25
- **Countdown timer on the action question.** Forces commitment. added:2026-08-25
- **Rewrite `docs/`** rather than annotating the superseded V2 taxonomy. added:2026-08-25

---

## 🧊 PARKED

- **Preflop questions.** Raj 2026-08-25: "nothing preflop". A scope call, not settled truth.
- **A solver baseline layer.** Decided 2026-08-25: GTO serves the audience we retargeted away
  from, and TexasSolver is slow and unmaintained.

---

## ✅ DONE 2026-08-26 to 27

- **The opponent's cards were never re-dealt**, so every EV measured one specific hand rather
  than his range. It shipped a fold recommendation on a flush that beat 305 of 355 hands.
- **Feedback rewritten twice**: numbers into a facts table, sentence carries the judgment.
  Median eight words per sentence.
- **Three-handed spots** with exact field counting, verified against brute force.
- **Turn→river chains** on the learner's own line, with deterministic replay.
- **Engine fuzzer** (`npm run fuzz`) — property checks against random hands, on every build.
- **Learner panel**: five fresh reviewers over 14 rendered hands found 13 real defects no gate
  could see, including ties never being shown, "there isn't one" printed above 328 worse
  hands, and continuations that never narrowed the opponent's range.
