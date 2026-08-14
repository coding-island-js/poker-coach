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

## Phase 8 — facts first, plain-English coaching

### Problem found in player testing

The learner had to open a disclosure to see the betting history even though the first question depended on it. The opening player read also supplied conclusions before the learner formed a baseline range. In Learn mode, phrases such as “passive line,” “range inference,” “apply pressure,” and “control the pot” read like coach notes rather than instruction. Question two did not clearly separate Hero's actual hand from the strong hands Hero might represent.

### Coaching decision

- The complete hand history is evidence and remains visible before every decision question.
- A neutral opponent description belongs with the factual hand. Player-specific tendencies appear later as raw observations with sample size and uncertainty.
- The learner first identifies the opponent's likely hands, then asks what their actual hand beats, then gives the next action a concrete purpose.
- Building the pot is explicitly taught as a reason to bet when weaker hands or draws can continue. On the flop and turn, bets can also charge draws; on the river, the bet is value or a bluff.
- Range representation is a later credibility check: “What strong hands could you credibly have after taking this line?” It cannot replace evaluation of the learner's actual hand.

### Changes

- Replaced collapsible prose histories with a compact, always-visible street timeline on desktop and mobile.
- Removed archetype labels from the opening and labeled the opponent unknown when no reliable read exists.
- Added a range check after Question 1 with Most often, Sometimes, and Still possible buckets.
- Reworded Question 2 for the river hand to “If you check, what does A♣ 5♣ beat?”
- Introduced the river-fold sample only after the baseline range and actual-hand questions.
- Added a bluff-credibility question before sizing for the river scenario.
- Rewrote Learn mode in complete sentences around four actions: estimate hands, compare the actual hand, define the bet's purpose, and choose the play.
- Replaced “control the pot” instructions with concrete outcomes such as seeing the next card without raising or keeping weaker hands available.

### Gate tests

- Completed the river lesson through all five decisions and confirmed the result contains five distinct feedback rows.
- Completed both turn lessons through their four-step paths.
- Verified the full street history remains visible at 375 pixels and on desktop.
- Verified the player evidence does not appear in Question 1 and appears before the goal and action decisions.
- Verified all layouts have no horizontal overflow, and the production build, rendered-page tests, and lint checks pass.

## Phase 9 — teach the decision, then name the theory

### Coach-and-trainee review

- **Beginner trainee:** could often identify the intended option from answer wording without understanding the poker. Re-reading definitions also interrupted the decision.
- **Poker coach:** confirmed that the essential chain is likely opponent hands → what the actual hand beats → value or bluff target → action and size. Bluff representation matters later, but it cannot make an otherwise unprofitable bluff work.
- **UX review:** recommended immediate feedback, one compact result, corrected reasoning carried into the next question, and a second hand to test whether the lesson transfers.

### Changes

- Reduced Learn mode to four plain-language questions and one table-ready rule.
- Replaced clue-bearing answer descriptions with short, neutral choices.
- Added immediate one-sentence feedback after each choice.
- Carry the coach's corrected foundation forward so an early mistake does not corrupt the remaining questions.
- Keep the complete street-by-street history visible before Question 1. Later questions scroll to a compact sticky reminder while the full history remains available above.
- Introduce the observed river-fold sample only when it can change the purpose or action.
- Removed the graded bluff-story question. A short, ungraded believability check now appears only after the learner chooses a bluffing goal.
- Grade the strategic category separately from exact sizing. Results say “matches this authored example” or “defensible alternative,” never that an unverified size is objectively correct.
- Removed the numeric score and duplicate decision chain from results. The learner now sees one verdict, four comparison rows, and one takeaway.
- Added a river value-bet transfer hand with fewer clues to test application rather than recall.
- Moved jargon, cap terminology, and sizing math behind post-decision disclosure.

### Gate tests

- Verified the full bluff lesson, including immediate feedback and the $150 defensible-alternative result.
- Verified the coherent check branch does not appear as a broken reasoning link.
- Completed the transfer hand and confirmed the learner must identify a value target rather than repeat the bluff pattern.
- Verified no horizontal overflow at 375 pixels and 1280 pixels.
- Verified the production build, rendered-page tests, and lint checks pass.

## Phase 10 — first attempts, trustworthy poker logic, and curriculum navigation

### Second coach-and-trainee audit

- **Beginner trainee:** found that immediate feedback could be answer-hunted, Retry preserved prior selections, later questions omitted the board, and the calling lesson did not show enough price information.
- **Poker coach:** found an unsupported four-out call, an incorrect turn pot, an incorrect action-order label, and two overclaims: that an uncapped range implies checking and that one exact bet size is objectively best.

### Changes

- Added Choose → Check answer → lock first attempt → Continue for the first three reasoning questions.
- Results now explicitly label each answer as the learner's first try.
- Retry from memory clears every answer and hides all prior feedback.
- Corrected foundations identify whether the next step uses the learner's answer or a coach correction.
- Added cards, board, street, pot, and decisive action to the sticky phone reminder.
- Added Hand X of 4 beside Step X of 4 and reposition the screen when moving to a new hand.
- Added scenario-specific decision statements instead of inferring that the opponent acted.
- Reframed Learn as a post-flop method and added a calling-price rule for facing bets.
- Changed the tournament draw to queen-jack of clubs, corrected the post-bet pot to 10.2 big blinds, and explained the combined flush and inside-straight draw.
- Corrected the connected-turn pot to $450 and the displayed bet percentages.
- Explicitly taught that uncapped means the strongest hands remain possible, not that the opponent is ahead overall.
- Made both checking and a small value bet defensible with queens, provided the learner's purpose and action agree.
- Treated $50, $100, and $150 river bluffs as different conditional sizes rather than claiming one is categorically correct.
- Renamed lesson titles so they no longer reveal “bluff,” “false cap,” or “value” before the learner reasons through the hand.
- Added coach-confidence copy and a one-line spoken transfer chain to each review.

### Gate tests

- Selected a wrong range, locked it, and verified every option became immutable while the coach correction carried forward with clear ownership.
- Completed the lesson and verified Retry from memory returned to an unselected, unanswered Question 1.
- Completed the corrected combined-draw hand with explicit pot-before-bet, bet, pot-now, and call-cost information.
- Completed the connected-turn hand through the small-value-bet branch and received a defensible alternative instead of a false error.
- Moved from Hand 3 to Hand 4 and verified new-hand positioning, orientation, and reset state.
- Verified no horizontal overflow at 375 and 1280 pixels, and passed the production build, rendered-page tests, and lint checks.

## Phase 11 — coaching support, not interface modes

### Cross-level research and review

- **Beginner trainee:** the opening lesson was too advanced, the phone repeated the same hand context, and the learner had to decode poker terms while making a decision.
- **Intermediate trainee:** four answer-check cycles felt slow; the useful review was the first weak reasoning link, the assumption, and what would reverse the play.
- **Advanced trainee:** binary right-or-wrong grading was misleading for mixed, unverified actions; useful analysis requires assumptions, alternatives, math, and provenance.
- **Poker coach:** recommended likely-hand buckets before combination detail and teaching capped or uncapped only after the learner identifies whether the strongest hands still fit the action.
- **UX review:** found three competing navigation axes—mode, hand, and question—and recommended one curriculum with one obvious next lesson.

### Changes

- Replaced Learn / Quick / Guided and the global hand carousel with a single “How much coaching?” curriculum.
- Added Guided, Table practice, and Deep analysis as support choices, with plain descriptions of what changes.
- Made the clear ace-queen river value hand the first Guided lesson; the uncertain ace-high exploit is no longer the default beginner problem.
- Added a one-time setup screen with the complete hand history. Question screens retain one compact card, board, pot, and action reminder.
- Guided keeps four questions and immediate locked feedback. Its result shows one verdict, one takeaway, and Next lesson before optional details.
- Table practice uses three decisions and delays coaching until review so the first weak link can be diagnosed.
- Deep analysis asks for an action and its job, then compares assumptions, alternatives, confidence, reversal conditions, and available sizing math.
- Removed capped/uncapped from the Guided path. Intermediate introduces “uncapped” only after a concrete hand demonstrates that the strongest hands still fit.
- Reduced the visual system to a white surface, warm-gray page, one green accent, one correction color, one border radius, and restrained typography.
- Removed duplicated sticky context, colorful status systems, the scenario carousel, and competing navigation tabs.

### Gate tests

- Verified the 375-pixel curriculum, complete-history setup, first Guided question, immediate feedback, simplified result, Table practice, and Deep analysis.
- Confirmed the first Guided question and first choices appear in the initial phone viewport with no horizontal overflow.
- Confirmed the full hand history is present before Question 1 and the lesson itself has only one compact context reminder.
- Confirmed Deep analysis does not claim solver-backed frequencies and Intermediate teaches uncapped only after the decision.
- Passed the production build, rendered-page regression tests, and lint checks.

## Phase 12 — one fast habit, organized by poker skill

### Full UX, coach, and trainee review

- **UX review:** the product looked cleaner but still made the learner choose an interface mode before showing what skill they would gain. A coached hand required about 13 taps and repeated the setup before the first decision.
- **Beginner trainee:** needed one short question at a time, immediate plain-language coaching, and one memorable takeaway rather than several collapsed explanations.
- **Intermediate trainee:** needed the same reasoning chain at table speed, a corrected answer after a miss, and fewer remedial screens.
- **Advanced trainee:** needed action-and-reason coherence, assumptions, uncertainty, and math on demand rather than a long fixed report labeled advanced.
- **Poker coach:** confirmed that the transferable habit is range → plan → action, that concrete hand buckets should precede capped/uncapped terminology, and that exact unverified sizing must not count as objective mastery.

### Changes

- Reorganized the home around poker skills and progress instead of Guided, Table, and Deep as separate curricula.
- Added one explicit promise: estimate likely hands, choose the bet's job, and take the action that performs that job.
- Made the primary path one tap from the home screen and removed the separate hand-setup page.
- Reduced every hand to three decisions: Range, Plan, and Action.
- Coached pace now uses select → one-line feedback → Next, reaching a result in six taps instead of roughly thirteen.
- Table-speed practice puts the same three decisions on one page and reaches review in four taps.
- Kept the complete compact hand history visible before the first decision; later coached steps retain only the decision-critical context.
- Added visible Most often / Sometimes / Still possible range buckets after the first coached answer.
- Replaced the repeated result stack with one verdict, one corrected three-row chain, one table cue, and one optional Why disclosure.
- Moved deeper assumptions, comparison, confidence, reversal, and sizing math into one focused review reached from the result.
- Added action-plan coherence checking so a correct-looking action with a contradictory reason cannot pass.
- Added progress by skill and reasoning link while keeping exact unverified bet sizes outside objective mastery claims.
- Kept capped/uncapped out of the beginner decision path. The intermediate cue first says what remains concretely, then introduces the theory label and its limit.

### Gate tests

- Completed the coached value hand in six decisions and verified that feedback, range buckets, result chain, and table cue remain understandable without opening details.
- Completed the table-speed path in four decisions and verified the full history and all three reasoning questions stay in one continuous flow.
- Tested an action that contradicted its stated plan and verified the result identifies the contradiction before comparing actions.
- Opened the focused deep review and confirmed it exposes assumptions and uncertainty without pretending the authored spot is solver-verified.
- Verified the phone home, coached question, coached result, and table-speed practice at 375 pixels with no horizontal overflow.
- Passed lint, the production build, and rendered-page regression tests.

## Phase 13 — scan the hand instead of reading a paragraph

### Problem found in the phone walkthrough

- The factual information was correct, but cards, pot, positions, the current decision, and the street history all had nearly the same visual weight.
- Hole cards and the board were rendered as small text rather than recognizable poker cards.
- The decisive river state and the hand history repeated the same sentence.
- Ten- and eleven-pixel action text forced the trainee to read carefully before they could begin reasoning.
- The terms Hero and Villain remained in the active questions even though the interface used You and Opponent elsewhere.

### Changes

- Added a prominent decision bar that answers three questions first: which street, who acts now, and how large the pot is.
- Rendered the learner's cards and board as large, suit-colored playing cards with explicit You and Opponent positions.
- Replaced the prose history with a four-row visual action sequence. The learner's actions are emphasized and arrows preserve order.
- Removed the repeated board cards from the history because the full board is already visible above it.
- Removed the repeated “line so far” summary from the first step; it remains on later steps where the full history is intentionally absent.
- Increased phone history text to thirteen pixels and kept the complete history visible before the first range question.
- Replaced Hero and Villain in the active training questions with You and Opponent.
- Rewrote each skill goal as a short table rule, such as “Bet when a worse hand can call.”

### Gate tests

- Verified the full value hand at 375 × 812: the decision, hole cards, complete board, positions, pot, and most of the action sequence fit in the first viewport; the range question begins immediately below it.
- Verified that the complete phone page has no horizontal overflow and is shorter than the prior text-first version.
- Verified the compact context on later steps retains the board and decisive line without repeating the full history.
- Verified the same shared context component renders correctly in coached and table-speed practice at desktop width.
- Passed lint, the production build, and rendered-page regression tests.
