# Range Coach redesign lifecycle

Date: August 13, 2026

This log records the requirement, test, decision and scope change at each redesign gate.

## Phase 1 — comprehension audit

### Findings

- The exercise presented range, classification and action simultaneously.
- The result appeared below the exercise and required the learner to reconstruct context by scrolling.
- Labels such as “2/4 key groups,” “classification,” “coherent,” and “the story holds together” described the system rather than helping the learner.
- Too many small labels, all-caps treatments, borders and type sizes competed for attention.
- The answer did not name the exact hand groups the learner included or missed.
- Scenario advice looked more authoritative than its prototype-level provenance justified.

### Decision

Replace the long dashboard with a two-part workspace: a persistent hand card and one focused learning task. Results become a dedicated view. Numerical range scores are removed from the learner-facing interface.

### New requirements

- The learner must always see Hero, Villain, cards, board, pot and effective stack.
- Every result must name included, missed and unlikely hand groups.
- Advanced explanations must use progressive disclosure.
- Every scenario must disclose whether its exact action is solver verified.
- Use one font family and a restrained type scale.

## Phase 2 — interaction and content model

### Implemented

- Learn, Quick Decision and Thinking Coach modes.
- Thinking Coach uses three sequential decisions instead of one dense form.
- Quick Decision hides the answer until submission and reveals it on a separate result view.
- Review feedback describes the learner's reasoning in plain language.
- Scenario three now includes the completed 98-suited straight that the original prototype omitted.
- The tournament scenario no longer claims complete bubble/ICM authority without payout information.

### Gate test

- Verified that Learn transitions into Thinking Coach.
- Verified all three guided steps, disabled continue states and back navigation structure.
- Submitted an intentionally incomplete range, incorrect cap judgment and incorrect action.
- Review named the included, missed and unlikely hand groups without a numerical score.
- Defect found: step changes preserved the previous scroll position and could clip the new heading.
- Fix: each mode, scenario and step now brings the work card heading back into view.

## Phase 3 — information and visual design

### Implemented

- One persistent hand-context card.
- Dedicated work card for the current task.
- Consistent Hero/Villain language.
- One sans-serif family; no decorative mono-label system.
- Included/missed hand groups shown as compact chips.
- Evidence and reversal condition appear with the recommendation.
- Detailed range reasoning is collapsed by default.

### Gate test

- Desktop hierarchy reviewed visually.
- Persistent hand card keeps Hero, Villain, cards, board and stakes next to the result.
- Advanced range explanations remain collapsed until requested.
- Mobile layout keeps the full hand card above the exercise, then repeats a compact Hero, board and Villain reminder beside each task.

## Phase 4 — validation and iteration

### Browser tests

- Fresh load begins at the page header on a 375-pixel viewport and has no horizontal overflow.
- Learn, Quick Decision and Thinking Coach all transition to the expected focused view.
- Quick Decision prevents revealing an unanswered prompt, then compares the learner's action with the coach's action.
- Thinking Coach prevents empty submissions and supports forward and back navigation.
- An intentionally poor submission produced specific feedback for included, missed and unlikely hands, then compared cap status and action.
- Detailed range reasoning remains collapsed until the learner requests it.

### Defects found and fixed

- Step transitions could inherit the old scroll position. Intentional mode, hand and step changes now bring the next work-card heading into view.
- Mobile range labels and examples could run together. They now render as separate lines.
- The full mobile hand context was too far away during long exercises. A compact hand reminder now stays directly above the current task.

### Scope decisions

- Keep authored scenarios deterministic for this prototype so feedback is inspectable and testable.
- Do not present a numerical score for range construction; name the actual reasoning gap instead.
- Do not claim solver-grade exact actions until a licensed solver dataset and poker expert review are added.
- Do not add live table assistance. This is a study product for reviewing constructed scenarios away from real-money play.

## Phase 5 — coaching clarity revision

### Problem found in player testing

The review made learners read the full range breakdown before they could tell whether their action matched the lesson. It also used “polarized” as though it were a bet size, and did not distinguish hands a bluff should target from missed draws that ace-high may already beat.

### Changes

- Lead with one verdict: action matched, reasonable alternative, or needs review.
- Show separate Range, Cap Read, and Action results immediately.
- Put only the required range correction in the open view; move the complete breakdown behind disclosure.
- Teach the action sequence as a three-step street-by-street story.
- Add a $150 overbet option and compare its approximate break-even fold rate with the $100 overbet.
- Explain that polarization describes range composition, while an overbet describes size.
- Name the better hands the bluff is trying to fold and clarify that missed draws are not the target.
- Collapse provenance, assumptions, and advanced notes by default.

### Gate tests

- Replayed the exact confusing answer: two missed groups, one unlikely group, correct cap read, and $100 overbet.
- The first screen now says the action matched and the range needs correction, then names the additions and removal.
- Verified the $150 answer is graded as a reasonable higher-burden exploit rather than simply wrong.
- Verified the revised result at desktop and 375-pixel mobile widths with no horizontal overflow.

## Phase 6 — replace range checklists with decisions

### Problem found in player testing

Selecting every plausible hand group rewarded “check all.” The learner could not tell which part of the range mattered most or how to connect the range to Hero's actual hand and action.

### New mental model

1. **Range:** What is most of Villain's range?
2. **Hand:** How does Hero's actual hand perform against it?
3. **Goal:** Get called by worse, make better fold, realize equity, or control the pot?
4. **Action:** Choose the play and size that serves that goal.

Range advantage and hand strength are intentionally separated. A stronger overall range can support more frequent aggression, but each actual hand still needs a role such as value, bluff, draw, bluff-catcher, or showdown.

### Changes

- Replaced multi-select range checkboxes with one dominant-range judgment.
- Added explicit Hero-hand and goal steps before the action.
- Renamed Thinking Coach to Guided Hand.
- Added a four-part result card and a visible Range → Hand → Goal → Action chain.
- Wrong answers now show one coach correction per broken link in the chain.
- Moved exact combination breakdowns out of the beginner path.

### Gate tests

- Selected two different range answers and verified only one remains selected.
- Submitted an intentionally wrong range, hand comparison, goal, and action; all four corrections appeared independently.
- Submitted the complete intended chain; all four decisions reported Matched.
- Verified desktop and 375-pixel mobile layouts with no horizontal overflow.

## Phase 7 — phone-first result and auditable inference

### Three-perspective audit

- **UX designer:** found the same four decisions repeated in scorecards, a second chain, and an action section.
- **Poker coach:** found that repeated out-of-position checks do not independently prove a capped range and that $100 versus $150 is not objectively solved by the lesson.
- **Trainee:** needed the decisive hand facts and player read before question one, followed by one verdict and one takeaway.

### Changes

- On phones, replaced the full hand panel with a compact Decision Now card containing cards, board, pot, fact, player read, and optional full history.
- Added Fact and Player Read to the guided questions so the inference is auditable.
- Replaced the scorecard, duplicate decision chain, and repeated action section with one four-row answer comparison.
- Standardized feedback to Correct, Defensible alternative, and Needs work.
- Show only the first broken reasoning link in the open view.
- Added one memorable takeaway and moved range evolution, assumptions, sizing detail, and the advanced coach question behind disclosure.
- Reframed the $150 overbet as plausible but unproven; $100 is a lesson baseline rather than an objective answer.
- Corrected the first scenario so checks are facts, while the rare-trapping player read supports the one-pair-heavy inference.
- Removed 76s from the missed-draw group and relabeled 65s/54s as backdoor floats that picked up turn draws.

### Gate tests

- Replayed the exact correct Range, Hand, and Goal chain with a $150 action; the result reports three correct and one defensible alternative.
- Confirmed that $100 appears only as the lesson baseline where the size differs.
- Submitted four wrong decisions; all four rows show their status while only Villain's range appears as the first correction.
- Verified the compact Decision Now card, full text wrapping, disclosures, and no horizontal overflow at 375 pixels.
- Verified the streamlined desktop result visually.
