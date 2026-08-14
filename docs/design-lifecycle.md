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
