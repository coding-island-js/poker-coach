# Range Coach — MVP requirements

## Goal

Help an intermediate No-Limit Hold'em player form a defensible opponent range, judge whether it is mostly capped, unclear or uncapped, and choose a coherent action for a live cash or tournament scenario.

## User scenarios

### Scenario A — Live river pressure

A live cash player reaches the river with no showdown value after a passive opponent checks three times. The learner must retain likely one-pair hands, missed draws and discounted traps; classify the range as mostly capped rather than empty; and choose a polarized bluff only when the stated opponent tendency supports it.

Success: the learner can name value hands using the same size and describe the opponent read that makes the bluff profitable.

### Scenario B — Tournament bubble discipline

A tournament player faces a small turn lead after a checked flop. The learner must avoid treating “wide” as “capped,” preserve slow-played top pair and two-pair branches, account for position and bubble pressure, and continue without unnecessarily inflating the pot.

Success: the learner identifies how ICM modifies risk while leaving basic range construction intact.

### Scenario C — The false cap

A live cash player has an overpair in a 3-bet pot against a cold-caller on a dynamic turn. The learner must keep traps, sets, two pair and strong draws in the opponent's range, classify it as uncapped and choose pot control.

Success: the learner stops using a passive action alone as proof of a capped range.

### Scenario D — Review a real hand (next release)

A learner enters positions, stacks, action, board, player read and their own decision. The system converts the hand into the same range → classification → response worksheet. The AI asks for missing evidence instead of inventing it.

Success: the learner leaves with a reusable decision note, not a verdict detached from assumptions.

## Functional requirements

### P0 — Included in the prototype

- Show a queue of at least three authored scenarios across live cash and tournaments.
- Show format, effective stack, pot, opponent profile, hole cards, board and complete action line.
- Allow the learner to select multiple plausible hand classes for the opponent.
- Require one cap-confidence classification: mostly capped, unclear or uncapped.
- Require one response/action selection.
- Disable review until all three decisions have input.
- Grade range coverage separately from classification and response.
- Explain why the chain is or is not coherent.
- Show a “watch-out” that names the exploit's reversal condition.
- Offer rotating Socratic questions.
- Reset the current hand when switching scenarios.
- Work on desktop and mobile with keyboard-accessible controls.
- State that the product is for adult study and does not offer real-money play.

### P1 — Production MVP

- Accounts and durable progress history.
- Scenario filters for cash/tournament, street, stack depth, position, player type and error pattern.
- Free-text “explain your read” input with bounded AI feedback.
- Scenario authoring schema and internal review state.
- “Confidence before reveal” input and calibration tracking.
- End-of-session reasoning-leak report.
- Responsible-play page and clear ban on use during active play.
- Analytics for completion, retry, hint use and misconception recurrence.

### P2 — Later

- Hand-history import for post-session review.
- Coach/team workspaces and private scenario packs.
- Independently licensed solver comparison layer.
- Spaced repetition based on error tags.
- Voice reflection for live players after a session.

## Coaching requirements

Each scenario must store:

- observable facts: game type, positions, stacks, action and board;
- opponent assumptions, clearly separated from facts;
- plausible hand classes and discount notes;
- cap-confidence answer with rationale;
- accepted actions, rejected actions and context-dependent alternatives;
- value/bluff mapping where a polarized action is accepted;
- reversal condition;
- two or more Socratic questions;
- author, reviewer, version and source provenance.

Feedback must never say an uncertain range “cannot” contain a hand when it is merely discounted.

## Non-functional requirements

- Initial page interactive within two seconds on a typical broadband connection.
- No external solver or AI call required for the core drill.
- All controls have visible focus and accessible labels.
- No gameplay, wagering, wallet or financial account features.
- Scenario content is versioned and independently authored.
- Mobile layout works at 375 px width.
- Product supports reduced-motion preferences.

## Data model sketch

```text
Scenario
  id, title, format, difficulty, street, positions
  pot, effectiveStack, heroCards, board, actionLog
  opponentProfile, factualContext[], assumedTendencies[]
  rangeBuckets[{ id, label, detail, weightBand, rationale }]
  expectedRangeBucketIds[]
  capClassification, capRationale, capConfidenceBand
  responseOptions[{ action, accepted, rationale }]
  feedback, reversalCondition, socraticQuestions[]
  provenance, authorId, reviewerId, version, status

Attempt
  userId, scenarioId, selectedRangeBucketIds[]
  capClassification, response, writtenReasoning
  rangeScore, coherenceScore, confidence, createdAt
```

## AI prompt contract

The model may:

- ask one question at a time;
- point to a missing or contradictory branch already present in the scenario record;
- adapt vocabulary and explanation length;
- create a counterfactual by changing one approved scenario variable;
- summarize the learner's recurring reasoning errors.

The model may not:

- invent missing stack, action, population or payout data;
- claim solver precision unless a licensed result is attached;
- provide real-time assistance during active play;
- turn uncertain author notes into facts;
- reproduce third-party course text or branded frameworks.

## MVP acceptance criteria

1. A new user can complete one drill without instructions in under three minutes.
2. Review cannot be requested before range, classification and response are selected.
3. Missing strong hand classes are visually identified after review.
4. Changing scenarios clears the previous attempt.
5. At least one scenario rewards aggression, one rewards patience and one corrects a false capped-range assumption.
6. Every scenario includes a reversal condition.
7. The build contains no copied third-party strategy text, images, charts or scenarios.
8. The interface remains usable at desktop and mobile widths.

## Prototype status

The current clickable prototype implements all P0 requirements except free-text reasoning, persistence and a live model connection. The “coach” is intentionally deterministic, demonstrating the interaction and content model before adding AI cost or strategy-risk.
