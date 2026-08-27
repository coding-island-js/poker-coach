# Plan — same-hand continuation (turn → river)

Status: proposed, not started. Written 2026-08-26.
Board item: `ops/next-actions.md` 🔥NOW #1.

> **Amended 2026-08-27.** Deferred behind the opponent-range fix, which came out
> of Raj dogfooding the app. `rollout()` never re-dealt the opponent's hole
> cards, so every EV measured one specific opponent hand rather than his range —
> see [[poker-coach-pipeline-gotchas]]. Two knock-ons for this plan:
>
> - **A continuation must sample opponents too.** `rollout` now takes
>   `opponents: [{playerId, holdings}]`, and step 2 needs its OWN holdings,
>   re-estimated on the river from the villain's decisions *in that branch*.
>   Reusing the turn's range would count hands he has since represented away.
> - **Branch selection got cheaper to justify.** The villain's turn reply is now
>   a distribution, not a single fixed action, so "he calls" has a measured
>   frequency behind it — `answered` — and the branch shown can say how typical
>   it was instead of presenting one sample as the story.

## What we are building

A turn lesson becomes four questions instead of two. The learner reads the turn,
acts on the turn, is told what the opponent did in response, then reads and acts
on **the river of that same hand** — the one that followed *their* action, not the
one the bot took.

The point is planning a street ahead. Right now every spot is a snapshot, and the
learner never finds out that the turn bet they picked was the reason the river was
unplayable.

## The three hard problems

### 1. The river must follow the learner's action, not the bot's

There is no engine in the browser — `hands.json` is static. So every branch a
learner can pick has to be precomputed. Turn spots ship with 3 options on average
after dropping `fold`, so a chained turn hand carries up to 3 continuations.

A branch ends in one of three ways, and all three are content:

| outcome | what step 2 is |
|---|---|
| villain calls/checks, river dealt, hero has a decision | the second question pair |
| villain folds | a terminal panel: "He folds. You take the $186." |
| villain raises — hero's next decision is still on the turn | a second question pair, labelled by its real street |

Allow the raise case rather than dropping it. "He raises. Now what?" is a better
lesson than a dead branch, and dropping it would silently starve chain yield on
exactly the branches where the learner bet.

`fold` is terminal by definition — panel, no question.

### 2. The turn EV came from 250 runouts. The river we show is ONE.

This is the credibility risk, and it needs handling in three places.

- **Never select the runout on whether hero's turn play looks good.** That is
  cherry-picking, and this pipeline's whole claim is that it does not do that.
- **Do select on whether there is a decision worth teaching** — the same pot
  floor, ≥2 candidate actions, and EV-gap threshold used everywhere else. Try up
  to K continuation seeds, take the first that yields a teachable spot, and record
  `seedsTried` in the data so the selection is visible rather than hidden.
- **Say it in the copy, on the step-2 screen:** the turn number came from 250
  runouts; this is one of them. A learner who plays the turn correctly and then
  watches the river punish them must not conclude the turn answer was wrong.

### 3. "Your bet narrowed his range" is only true for modelled ranges

The payoff of chaining is showing the range shrink: he had 990 combos, you bet
$40, he called, now it is 313 and everything that folds to a turn bet is gone.

But about a third of spots fall back to `plausibleRange`, which is uniform over
every dealable holding. On those the count changes between turn and river *only
because a card came off the deck* — his call did nothing to it. Writing "your bet
narrowed his range" over a heuristic range would be a fabricated read on the one
screen that exists to teach reading ranges.

**Gate the narrowing copy on `rangeSource === "modelled"` for both steps.**
Heuristic chains keep the neutral phrasing already in use ("hands he could still
be dealt") and get no delta sentence.

## Architecture: a separate replay pass, not a bigger generator

Do **not** put continuation scoring inside `generate-hands.mjs`. It runs over
20-45k dealt hands to find ~570 spots; adding a second decision to every scored
turn candidate inflates the hot loop by roughly 70% for work that is discarded for
the ~95% of candidates that never get curated.

Instead, chain **after** curation, over the 35 turn hands that actually shipped.
About 35 hands x 3 branches x 3 options x 250 rollouts is ~79k rollouts — a minute
or two, against adding minutes to every generation run.

This works because generation is fully deterministic: `findSpot(handIndex, rng,
street)` seeded with `createSeededRng(SEED + handIndex * 104729)` reproduces the
exact game state. The chain pass replays the hand rather than storing it.

### Blocker to clear first

Candidates carry `handIndex` but not `SEED` — it lives at pool level in
`generatedFrom.seed` and is **lost when curate merges two pools**. The same gap
gives `id: gen-${handIndex}` a collision across pools: both emit `gen-17`, and the
merge dedupes on cards, so both survive wearing the same id.

Fix both at once — stamp `seed` on each candidate, make the id
`gen-${seed}-${handIndex}`. Small change, unblocks replay, and closes a latent bug
in the two-pool merge.

## Files

| file | change |
|---|---|
| `tools/generate-hands.mjs` | stamp `seed` per candidate; id becomes `gen-${seed}-${handIndex}` |
| `tools/lib/replay.mjs` | **new** — rebuild the exact game state at a candidate's decision point from `{seed, handIndex, street}` |
| `tools/chain-hands.mjs` | **new** — for each shipped Turn lesson, walk each non-fold branch forward and emit a continuation |
| `tools/curate.mjs` | export the lesson-building helpers so the chain pass writes step 2 in the identical shape |
| `tools/verify-content.mjs` | recurse into `continuations` — every check that applies to a hand applies to a continuation |
| `tools/audit-hands.mjs` | same: re-derive each continuation's count from its own cards |
| `public/app.js` | chain navigation, step dots 1-of-4, terminal branch panels, the "one runout" line |
| `package.json` | `content` becomes generate → generate:more → curate → **chain** → build |

## Data shape: nested, not flat

The board sketched `chainId` + `step: 1|2` as sibling entries. Don't — the app
navigates `hands[]` by index and `nextHand()` cycles it, so flat step-2 entries
would be reachable out of context as orphans.

Nest instead:

```jsonc
{
  "id": "h042", "street": "Turn", /* ...unchanged... */
  "chain": {
    "seedsTried": 1,
    "branches": {
      "bet-big": {
        "kind": "question",
        "villainResponse": "He calls $40.",
        "lesson": { /* a FULL lesson object: read, action, numbers, breakdown, ... */ }
      },
      "check": { "kind": "question", "villainResponse": "He checks.", "lesson": { } },
      "fold":  { "kind": "terminal", "outcome": "You fold. He takes the $124." }
    }
  }
}
```

**Make the continuation a complete lesson object.** Then `readStep()` and
`actionStep()` render it unchanged, and the only app work is navigation and copy.
That is the difference between a day and a week.

`hands.length` keeps meaning "lessons", the index maths is untouched, no orphans.

## Progress recording

`record()` fires twice for a chained hand. `attempts.hand_id` is a text column, so
nothing needs migrating to ship: write both rows with `handId: "h042"` and add
`step: 1|2` to the local attempt.

Do **not** give step 2 its own `handId` — the progress screen counts
`distinct hand_id` for "N of 100 hands seen", and it would read 135 of 100.

The server drops unknown fields, so `step` stays browser-only until we want it in
analytics; a nullable `step smallint` in `db/schema.sql` is a five-line migration
whenever that day comes.

## Order of work

1. **Stamp the seed, fix the id.** Regenerate or backfill. Small.
2. **`replay.mjs`, and the test that proves it.** Assert the replayed state's hero
   cards, board, and pot match the shipped candidate exactly, across all 100
   hands. **This is the load-bearing test** — if replay drifts by a single rng
   call, every continuation is about a hand that never happened and nothing
   downstream would notice. Checkpoint here before going further.
3. **`chain-hands.mjs`.** Branch walk, terminal handling, continuation scoring,
   seed retry. Checkpoint: report yield — how many of the 35 turn hands got a
   teachable river, and how many branches each.
4. **Gates.** Recurse `verify-content` and `audit-hands` into continuations before
   the app can render them. Half the content shipping ungated is not acceptable in
   a repo where a gate has already caught four real content bugs.
5. **App.** Navigation, step dots, terminal panels, the runout disclosure, and the
   range-delta sentence (modelled ranges only).
6. **Tests.** Extend `coach.test.mjs`; add a rendered-html case for a chained hand.

## Accepted limitations

- **Partial coverage.** Some turn hands will not produce a teachable river and
  stay 2-question. That is honest; the alternative is feeding chainability back
  into curation, which is a second pass and can wait.
- **Turn only, for now.** Flop → turn → river is the same machinery applied twice.
  Get one link right before building a chain.

## Open decisions for Raj

1. **Seed retry cap K.** Higher K means more chained hands but more selection.
   Suggest K=3, and print the distribution so we can see how hard it had to work.
2. **Does a chained hand count as one lesson or two in "N of 100 hands seen"?**
   Suggest one — it is one hand.
3. **Terminal `fold` branch: a panel, or just grey the option out?** Suggest the
   panel; it closes the loop on the learner's actual choice.
