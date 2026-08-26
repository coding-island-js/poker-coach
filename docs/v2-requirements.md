# Range Coach V2 — Reasoning Diagnostic Beta requirements

> **Superseded in part, 2026-08-25.** This document describes the six-leak taxonomy designed for
> the hand-authored V2 content. The shipped app now generates its hands from simulation, and that
> taxonomy did not survive the change: `removes-strength` never fired at all and `bluffs-showdown`
> reached three hands in a hundred. The shipped categories were re-derived from the content and are
> listed in the root `README.md` and in `tools/curate.mjs`. The *reasoning* here still stands - the
> product thesis, the boundaries, and the honesty rules are unchanged - but the leak names and the
> hand IDs no longer match what ships.

Date: August 17, 2026  
Status: Approved scope baseline; implementation acceptance source

## 1. Product outcome

Range Coach V2 helps an improving live-cash No-Limit Hold'em player discover the first weak link in their reasoning, correct it, and demonstrate the correction on an altered hand.

The product loop is:

```text
Diagnose → Correct → Test transfer → Remember → Retest later
```

The learner-facing decision model remains deliberately small:

```text
Opponent's likely range → Hero's plan → Hero's action
```

The evaluator may inspect a richer internal chain—facts, range, Hero's hand versus range, target hands, action and size—but feedback leads with the first material error rather than every possible criticism.

## 2. Scope baseline and assumptions

### Included in this beta

- Twelve authored live-cash diagnostic hands.
- One approved, one-variable twin for each base hand.
- Six controlled reasoning-leak categories.
- Confidence capture before feedback.
- Deterministic first-broken-link evaluation.
- Immediate transfer testing on an altered hand.
- A persistent reasoning profile and adaptive next-hand selection.
- A delayed retest when a due exercise exists.
- Baseline-versus-exploit teaching and reversal conditions.
- Claim provenance and scenario versioning.
- Phone-first training with desktop support.

### Explicit beta persistence assumption

V2 beta persistence is **device-local**. Attempts, progress, confidence and retest scheduling are stored in the current browser on the current device. The beta has no account, login, cloud synchronization or cross-device recovery. Clearing browser/site data, using private browsing, or changing browsers/devices can remove or isolate progress. The interface must disclose this limitation before the learner relies on saved history.

This is a conscious beta scope decision, not a claim of production-grade durable storage. The data model must preserve stable IDs and versions so that a later account-backed store can migrate the records without changing evaluation semantics.

### Deferred

- Voice or free-form hand capture.
- Opponent notebook and population database.
- Human-coach workspaces.
- Solver browser or licensed solver integration.
- Open-ended AI strategy generation or definitive grading of arbitrary hands.
- Tournament, PLO, multiway and real-time active-hand assistance.
- Bankroll, wagering, leaderboards and social competition.

## 3. Goals

| ID | Goal | Measurable outcome |
|---|---|---|
| `GOAL-001` | Diagnose reasoning, not merely the final action. | Every completed base hand identifies the first material reasoning link as correct or needing work. |
| `GOAL-002` | Demonstrate transfer rather than answer repetition. | Every base hand can lead to an approved twin that changes exactly one decision-relevant fact and records a separate transfer result. |
| `GOAL-003` | Behave like a coach that remembers the learner. | The same device resumes progress and prioritizes recurring or confidently held errors. |
| `GOAL-004` | Make coaching claims auditable and appropriately uncertain. | Every strategic claim and scenario version has provenance; unverified exact sizing is never graded as objective truth. |
| `GOAL-005` | Make useful practice fast and understandable on a phone. | A learner can start in one primary action and finish a base-hand diagnosis plus immediate twin in under ten minutes. |

## 4. Primary user and user stories

Primary user: an improving live-cash NLHE player, commonly playing $1/$2 through $5/$10, who understands basic actions and hand rankings but is inconsistent in postflop reasoning. Copy remains accessible to a motivated beginner; advanced learners receive assumptions and provenance without making the primary flow dense.

| ID | User story |
|---|---|
| `US-001` | As a returning learner, I want to resume the most useful exercise immediately so that practice does not feel like setup work. |
| `US-002` | As a learner, I want to state the opponent's likely range, my plan and my action so that the coach evaluates how I arrived at the decision. |
| `US-003` | As a learner, I want to report how sure I am before seeing the answer so that confident mistakes receive the right attention. |
| `US-004` | As a learner who made several mistakes, I want one primary diagnosis so that I know what to fix first. |
| `US-005` | As a learner, I want a similar hand with one meaningful change so that I can prove I learned a principle rather than memorized an answer. |
| `US-006` | As a live-cash player, I want baseline advice separated from a player-specific exploit so that I do not treat a weak read as fact. |
| `US-007` | As a returning learner, I want the coach to remember my recurring weakness and schedule a later check so that improvement lasts. |
| `US-008` | As a skeptical or advanced learner, I want to see the assumptions and source type behind advice so that I know how much confidence it deserves. |
| `US-009` | As a phone user, I want the essential hand, decision and correction in a clear sequence so that I am not repeatedly scrolling to reconstruct context. |

## 5. Controlled reasoning taxonomy

The beta uses exactly these six primary leak codes. New permanent categories require content-owner approval and a versioned taxonomy migration.

| Code | Reasoning leak | Diagnostic evidence |
|---|---|---|
| `LEAK-01` | Removes strong hands too quickly. | The learner discounts or eliminates credible strong branches based on insufficient action evidence. |
| `LEAK-02` | Misidentifies which weaker hands can call. | A proposed value bet has no credible worse-hand target or omits meaningful weaker callers. |
| `LEAK-03` | Bluffs hands the learner already beats. | The learner names missed draws or weaker hands, rather than better folding hands, as the bluff target. |
| `LEAK-04` | Chooses an action that contradicts the plan. | The chosen action cannot achieve the learner's stated value, bluff, draw or pot-control purpose. |
| `LEAK-05` | Ignores the price of calling. | The learner does not compare price, equity sources and potentially dirty outs. |
| `LEAK-06` | Treats an opponent read as proven fact. | A player-specific exploit is selected without adequate, relevant evidence or without a reversal condition. |

## 6. Twelve-hand diagnostic content scope

Each base hand has one approved twin. A twin changes exactly one recorded fact; all unchanged facts and the teaching claim remain linked to the base scenario version. “Reviewed” means the internal content gate has passed. It must not be represented as independent human-expert or solver validation unless that provenance exists.

| Hand | Primary leak | Base teaching job | Required twin change |
|---|---|---|---|
| `H01` | `LEAK-02` | River value: name credible weaker one-pair callers. | Opponent calling tendency becomes meaningfully tighter. |
| `H02` | `LEAK-02` | Thin value: distinguish worse calls from hands that only beat Hero. | River card removes a group of weaker callers. |
| `H03` | `LEAK-03` | River bluff: name better hands that may fold, not missed draws Hero beats. | Hero loses remaining showdown value. |
| `H04` | `LEAK-03` | Showdown value: avoid turning a hand into an unnecessary bluff. | A river card makes a credible better-hand target foldable. |
| `H05` | `LEAK-01` | False cap: preserve traps and strong hands after a passive line. | One strong branch becomes inconsistent with the action. |
| `H06` | `LEAK-01` | Strong hands remain in a 3-bet-pot range. | Position changes while the action line remains otherwise fixed. |
| `H07` | `LEAK-04` | Value plan must lead to an action weaker hands can call. | Stack-to-pot ratio changes the supported action. |
| `H08` | `LEAK-04` | Bluff plan must lead to pressure on named better hands. | Opponent leads instead of checks on the decision street. |
| `H09` | `LEAK-05` | Small-bet call: compare price with draw and showdown equity. | Bet size changes the price. |
| `H10` | `LEAK-05` | Count equity sources without treating every out as clean. | Board change makes a subset of outs dirty. |
| `H11` | `LEAK-06` | Separate population baseline from an overfold exploit. | Reliable, relevant overfold evidence is added or removed. |
| `H12` | `LEAK-06` | Apply and abandon an exploit using an explicit stop condition. | New showdown evidence triggers the reversal condition. |

Each base/twin family must include at least one pair in which the best supported action changes. Across the full catalogue, at least four twins must preserve the action while changing the reasoning burden so the learner cannot use “always switch” as a shortcut.

## 7. Functional requirements

| ID | Requirement |
|---|---|
| `FR-001` | The home experience shall present one primary Start or Resume action selected from unfinished diagnostic work, due retests and the learner's weakest supported link. |
| `FR-002` | The beta shall provide exactly 12 active base diagnostic hands and 12 linked approved twins conforming to the catalogue in Section 6. |
| `FR-003` | Every hand shall collect the learner's first committed Range, Plan and Action choices without revealing correctness beforehand. |
| `FR-004` | Every hand shall collect confidence—Guessing, Somewhat sure or Very sure—before revealing evaluative feedback. |
| `FR-005` | A deterministic evaluator shall grade the internal reasoning chain in dependency order and return the first material broken link. |
| `FR-006` | Diagnostic outcomes shall use only the six versioned primary leak codes in Section 5, while allowing secondary observations that do not compete with the main correction. |
| `FR-007` | A completed base hand shall offer its linked immediate twin and state the single fact that changed. |
| `FR-008` | The system shall verify that a twin changes exactly one declared scenario variable and shall reject unapproved or structurally invalid twins from the active catalogue. |
| `FR-009` | The system shall score the twin separately as an immediate transfer result and distinguish correction, persistence, regression and inconclusive outcomes. |
| `FR-010` | When advice depends on a player read, feedback shall separate baseline strategy, evidence, inference, exploit adjustment and reversal condition. |
| `FR-011` | Every strategic claim shall carry a provenance type: Computed, Solver-verified, Expert-reviewed, Population assumption, Player-specific inference, Authored teaching example, or AI wording based on an approved claim. |
| `FR-012` | Attempts, progress, confidence, diagnoses, transfer results and retest schedules shall persist in browser-local storage on the same device. |
| `FR-013` | Every attempt shall retain the exact scenario ID, scenario version, taxonomy version and evaluator version used at submission. |
| `FR-014` | The learner profile shall summarize performance by reasoning link, confidence calibration, recurrence and transfer result without reducing all progress to one opaque score. |
| `FR-015` | The next-exercise selector shall prioritize, in order: due retest, unfinished immediate twin, confidently wrong recurring leak, unseen diagnostic coverage, then reinforcement; it shall explain the selection in plain language. |
| `FR-016` | A corrected or confidently missed leak shall receive a delayed altered-hand retest scheduled no sooner than six days and no later than eight days after the qualifying attempt. |
| `FR-017` | The result shall lead with a verdict, show the Range → Plan → Action chain, identify the first link needing work, give one replacement thought and one table cue, and place extended reasoning behind one disclosure. |
| `FR-018` | Evaluation shall support authored acceptable alternatives and shall not mark an unverified exact bet size or mixed frequency as objectively wrong. |
| `FR-019` | Progress shall show diagnostic coverage, transfer status and due-review state, and shall not imply mastery from completing a base hand alone. |
| `FR-020` | The beta shall identify itself as retrospective educational study for adults and shall not provide active-hand, wagering, wallet or real-money play functionality. |
| `FR-021` | The learner shall be able to reset device-local beta progress only after an explicit confirmation that describes the unrecoverable local data removal. |
| `FR-022` | Only scenario versions with a complete answer model, approved twin, reversal condition where applicable, provenance and internal review state may enter the active diagnostic catalogue. |

## 8. Data requirements

| ID | Requirement |
|---|---|
| `DATA-001` | A versioned Scenario record shall contain facts, positions, stacks, pot, cards, action log, assumptions, Range/Plan/Action options, answer model, accepted alternatives, leak mapping, claims, reversal condition and review state. |
| `DATA-002` | A TwinLink record shall contain base scenario/version, twin scenario/version, the one changed variable, before/after values, expected transfer principle and whether the supported action changes. |
| `DATA-003` | An Attempt record shall contain a pseudonymous local learner ID, first choices, confidence, timestamps, scenario/taxonomy/evaluator versions, completion state and any retry relationship. |
| `DATA-004` | An Evaluation record shall contain per-link results, first broken link, primary leak, secondary observations, action-purpose coherence, sizing confidence and explanation-template version. |
| `DATA-005` | A Transfer record shall link base and twin attempts and store correction, persistence, regression or inconclusive outcome. |
| `DATA-006` | A LearnerProfile record shall retain per-leak exposure, correctness, confident-error count, immediate-transfer result, delayed-retest result and next eligible review time. |
| `DATA-007` | A Claim record shall retain claim text or key, provenance type, source reference where permitted, verification state, reviewer, version and last-reviewed date. |
| `DATA-008` | A local schema-version record and deterministic migration path shall protect readable beta progress across compatible application releases. |
| `DATA-009` | Retest records shall store due time, source diagnosis, altered scenario family, completion time and outcome; scheduling shall use an absolute timestamp rather than session-count guesses. |
| `DATA-010` | Device-local records shall exclude real names, financial account credentials, exact casino location and raw audio; no beta record shall be transmitted to a server by the core training flow. |

## 9. Non-functional requirements

| ID | Requirement |
|---|---|
| `NFR-001` | The core diagnostic, evaluation, persistence and twin flow shall operate without an AI or solver network call. |
| `NFR-002` | At a 375 px viewport, the interface shall have no horizontal overflow and all primary actions shall meet a 44 × 44 CSS-pixel target minimum. |
| `NFR-003` | All interactive controls shall be keyboard operable, visibly focused, semantically named and usable with screen-reader landmarks and status announcements. |
| `NFR-004` | Essential card meaning shall not depend on color alone, and reduced-motion preferences shall be honored. |
| `NFR-005` | On a typical broadband connection and mid-range phone, the initial training shell shall become interactive within two seconds after cached application assets are available. |
| `NFR-006` | A base hand plus immediate twin shall be completable in under ten minutes in moderated usability testing by at least 70% of target learners. |
| `NFR-007` | Deterministic evaluation of identical versioned input shall produce identical structured output. |
| `NFR-008` | Unsupported claims shall fail closed: the interface may identify an authored example or pending review but shall not upgrade it to solver-verified or expert-reviewed. |
| `NFR-009` | Learner-facing copy shall use concrete hand/action language before specialist labels such as capped, uncapped or polarized. |
| `NFR-010` | No copyrighted third-party course text, proprietary charts, branded frameworks or copied scenarios shall be included without permission. |
| `NFR-011` | The active catalogue and local data migrations shall be covered by automated validation before release. |
| `NFR-012` | The beta shall disclose device-local storage limitations and provide no misleading claim of cloud backup or cross-device availability. |

## 10. Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| `AC-001` | From a fresh state, one primary action begins `H01` or the selector's documented equivalent; from a saved state, it resumes the documented priority without a setup form. |
| `AC-002` | Catalogue validation finds 12 active base scenarios, 12 active linked twins, two base hands per leak, exactly one declared change per twin and at least four action-preserving twins. |
| `AC-003` | Feedback remains hidden until Range, Plan, Action and confidence have first committed values. |
| `AC-004` | For every answer-model branch, the evaluator returns the earliest material failure in the documented dependency order and a valid primary leak code. |
| `AC-005` | Deliberately contradictory Plan and Action choices are identified as incoherent even when the selected Action is an authored acceptable alternative in another context. |
| `AC-006` | A twin screen names the changed fact, preserves all undeclared facts and does not reveal whether the supported action changes. |
| `AC-007` | Completing a twin creates one linked transfer outcome and does not overwrite the base attempt. |
| `AC-008` | Every exploit-dependent result visibly states the no-read baseline, the evidence assumption, the adjustment and the stop/reversal condition. |
| `AC-009` | Every active claim has an allowed provenance value; missing or pending verification cannot render as Solver-verified or Expert-reviewed. |
| `AC-010` | Refreshing or closing/reopening the same browser restores completed work, current progress and due retests; a storage-disabled condition is explained without losing the current in-memory exercise. |
| `AC-011` | An attempt made against an older scenario remains interpretable by its saved versions after the active scenario is updated. |
| `AC-012` | The profile identifies the learner's weakest supported link, distinguishes confident mistakes from uncertain mistakes, and shows immediate and delayed transfer separately. |
| `AC-013` | The selector chooses due retests before new content and displays a truthful sentence explaining why that exercise was chosen. |
| `AC-014` | A qualifying attempt produces a retest due timestamp between 144 and 192 hours later; completing it records a delayed-transfer outcome. |
| `AC-015` | A result's initial viewport contains the overall verdict, link count, first correction and primary next action; there is no second competing reasoning disclosure. |
| `AC-016` | When exact sizing lacks solver/expert verification, grading evaluates the strategic purpose and accepted size band, labels precision as provisional and does not claim one exact amount is uniquely correct. |
| `AC-017` | Reset requires confirmation, removes only Range Coach device-local beta records, and immediately returns the learner to a fresh diagnostic state. |
| `AC-018` | At 375 px and desktop widths, the full base/twin flow has no clipped content or horizontal overflow and is completable by keyboard. |
| `AC-019` | The interface states adults-only retrospective education, contains no active-hand timing mode, and provides no wagering or financial transaction control. |
| `AC-020` | Release validation blocks an active scenario missing its twin, answer model, required provenance, review state or applicable reversal condition. |
| `AC-021` | Device-local persistence limitations are visible before or at the first saved result and are available later from the progress view. |
| `AC-022` | The same versioned inputs produce byte-equivalent structured evaluation fields across repeat runs, excluding display-only timestamps. |

## 11. Test catalogue

| ID | Test |
|---|---|
| `TEST-001` | Fresh-start and resume-priority end-to-end test. |
| `TEST-002` | Catalogue cardinality, leak coverage and twin invariant validator. |
| `TEST-003` | Input gating test for Range, Plan, Action and confidence. |
| `TEST-004` | Table-driven first-broken-link evaluator unit tests for all answer branches. |
| `TEST-005` | Plan/action contradiction regression test. |
| `TEST-006` | Twin diff validator and changed-fact presentation test. |
| `TEST-007` | Base/twin attempt linkage and transfer-state integration test. |
| `TEST-008` | Baseline/exploit/reversal content contract test for `LEAK-06` scenarios. |
| `TEST-009` | Provenance allow-list, downgrade and fail-closed test. |
| `TEST-010` | Same-device refresh, restart, unavailable-storage and schema-migration persistence tests. |
| `TEST-011` | Scenario/taxonomy/evaluator version retention regression test. |
| `TEST-012` | Learner-profile aggregation and confidence-calibration tests. |
| `TEST-013` | Adaptive selection priority and human-readable rationale tests. |
| `TEST-014` | Delayed-retest boundary tests at 144 and 192 hours using a controlled clock. |
| `TEST-015` | Correct, incorrect, reasonable-alternative and contradictory result visual tests. |
| `TEST-016` | Unverified sizing and accepted-alternative grading tests. |
| `TEST-017` | Confirmed local reset and scope-of-deletion test. |
| `TEST-018` | 375 px, desktop, keyboard, screen-reader-name and reduced-motion QA. |
| `TEST-019` | Educational-use, no-active-assistance and prohibited-feature release audit. |
| `TEST-020` | Active-content completeness release-gate test. |
| `TEST-021` | Device-local storage disclosure content and placement test. |
| `TEST-022` | Deterministic structured-output snapshot test. |
| `TEST-023` | Moderated usability protocol: start, complete base, explain correction, complete twin and state what changed. |
| `TEST-024` | Copyright/originality and source-permission content audit. |

## 12. Release and outcome gates

### Required engineering and content gates

- All `AC-001` through `AC-022` pass or have an explicitly approved, documented exception.
- Every active hand family passes `TEST-002`, `TEST-006`, `TEST-008` where applicable, `TEST-009` and `TEST-020`.
- No severe accessibility, persistence, data-corruption or unsupported-claim defect remains open.
- Poker content is labeled according to actual provenance. Internal review must not be described as independent professional validation.

### Beta outcome measures

- At least 70% of target learners complete a base plus immediate twin in under ten minutes.
- Target-link performance improves by at least 20 percentage points on the immediate twin across the beta cohort.
- At least 60% of learners who return for a due retest retain the corrected link on an altered hand.
- At least 80% of moderated participants can state their diagnosed weakness without reopening the long explanation.
- Diagnostic agreement with a future independent poker-coach review reaches at least 85% before claims of coach-level validity.

These are product validation goals, not pre-release automated acceptance criteria. Small beta samples must be reported with sample size rather than presented as definitive evidence.

