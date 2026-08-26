# Range Coach V2 — implementation, QA, and release report

> **Superseded in part, 2026-08-25.** This document describes the six-leak taxonomy designed for
> the hand-authored V2 content. The shipped app now generates its hands from simulation, and that
> taxonomy did not survive the change: `removes-strength` never fired at all and `bluffs-showdown`
> reached three hands in a hundred. The shipped categories were re-derived from the content and are
> listed in the root `README.md` and in `tools/curate.mjs`. The *reasoning* here still stands - the
> product thesis, the boundaries, and the honesty rules are unchanged - but the leak names and the
> hand IDs no longer match what ships.

Date: August 17, 2026  
Release candidate: V2 Reasoning Diagnostic Beta  
Requirements baseline: [`v2-requirements.md`](./v2-requirements.md)  
Traceability source: [`v2-traceability.md`](./v2-traceability.md)  
UX/QA contract: [`v2-ux-qa.md`](./v2-ux-qa.md)

## 1. Outcome

The active application is now a deterministic reasoning diagnostic rather than a four-hand linear lesson. It implements the learner-facing loop:

```text
Range → Plan → Action → Confidence → First weak link → Changed-hand transfer → Retest
```

The app makes no network call for evaluation. It records device-local first attempts, confidence, versioned link results, the first broken link, immediate transfer attempts, an adaptive recommendation, and a seven-day retest timestamp.

## 2. Active content trace

| Requirement hand | Active base ID | Active twin ID | Primary leak |
|---|---|---|---|
| `H01` | `value-river-aq` | `value-river-a5-twin` | `LEAK-02` |
| `H02` | `thin-value-kq` | `thin-value-kq-twin` | `LEAK-02` |
| `H03` | `showdown-bluff-a5` | `showdown-bluff-six-high-twin` | `LEAK-03` |
| `H04` | `queen-high-showdown` | `seven-high-showdown-twin` | `LEAK-03` |
| `H05` | `passive-not-proof` | `passive-bet-twin` | `LEAK-01` |
| `H06` | `strong-remains-turn` | `strong-discounted-turn-twin` | `LEAK-01` |
| `H07` | `plan-value-action` | `plan-value-action-twin` | `LEAK-04` |
| `H08` | `plan-bluff-size` | `plan-bluff-size-twin` | `LEAK-04` |
| `H09` | `draw-good-price` | `draw-bad-price-twin` | `LEAK-05` |
| `H10` | `river-catch-price` | `river-catch-large-twin` | `LEAK-05` |
| `H11` | `read-small-sample` | `read-no-sample-twin` | `LEAK-06` |
| `H12` | `read-caller` | `read-caller-twin` | `LEAK-06` |

The runtime catalogue gate blocks startup unless it finds 12 unique base hands, 12 one-to-one twins, exactly two bases per leak, declared twin changes, answer models, baselines, reversal conditions, and provenance.

## 3. Requirement disposition

### Implemented in the beta

- `FR-001`–`FR-007`: one-action resume, 12 base/12 twin catalogue, hidden first choices, confidence before feedback, dependency-ordered first-link diagnosis, controlled taxonomy, immediate twin.
- `FR-010`–`FR-012`: baseline/exploit/reversal copy, authored provenance, namespaced device-local persistence.
- `FR-014`–`FR-020`: link profile, adaptive recommendation, seven-day scheduling, verdict-first result, accepted action bands, honest progress, educational-use boundary.
- `FR-021`–`FR-022`: destructive reset confirmation and runtime content gate.
- `NFR-001`, `NFR-002`, `NFR-004`, `NFR-007`–`NFR-010`, `NFR-012`: deterministic local core, phone layout, reduced motion, fail-closed provenance, concrete-first copy, original authored material, and local-storage disclosure.

### Implemented with a beta limitation

- `FR-008`: the runtime validates one declared changed fact and one twin per base. It does not yet perform a semantic field-by-field diff of every unchanged fact.
- `FR-009`: twin attempts are stored separately and linked to the latest family base attempt. The UI reports pass/fail transfer; the four-label correction/persistence/regression/inconclusive taxonomy is not yet exposed.
- `FR-013`: attempts store scenario, taxonomy, and evaluator versions. This beta does not ship a migration from a prior V2 schema because no prior V2 schema exists.
- `FR-015`–`FR-016`: due retests, unfinished twins, unseen coverage, and weak-leak reinforcement are prioritized. The due retest reuses the approved twin; a larger altered-hand retest pool is deferred.
- `NFR-003`: semantic buttons, labels, visible focus styles, non-color status labels, and 44px primary targets are implemented. Automated in-app keyboard traversal could not be observed reliably and remains a manual release check.
- `NFR-005`–`NFR-006`: the flow is four answer taps to feedback and was interactively exercised, but formal mid-range-device performance and moderated 70% under-ten-minute studies require beta users.
- `NFR-011`: build-time/runtime catalogue validation and regression tests ship. Automated screenshot comparison and axe coverage are follow-up automation.

### Intentionally not claimed

- No scenario or exact bet-size mix is represented as independently human-expert reviewed or solver-verified.
- No cloud sync, account recovery, cross-device progress, arbitrary-hand grading, real-time assistance, tournament ICM, voice capture, opponent notebook, or licensed solver integration is included.

## 4. Verification evidence

| Evidence | Result |
|---|---|
| ESLint | Pass, zero warnings/errors |
| Production build | Pass |
| Server-render and V2 contract tests | 2/2 pass |
| Catalogue runtime gate | Pass: 12 base, 12 twins, two bases per leak |
| Fresh dashboard smoke | Pass |
| Correct base path | Pass: connected three-link verdict |
| Incorrect base path | Pass: earliest incorrect Range link shown first |
| Confidence timing | Pass: feedback remained hidden through Range/Plan/Action |
| Twin hand | Pass: single changed fact is visually pinned before the decision |
| Device-local reload | Pass: saved attempt/profile restored after reload |
| Interrupted hand | Pass: resumed at Plan after submitting Range |
| Mobile overflow | Pass in browser audit; document width did not exceed viewport |
| Mobile result hierarchy | Pass: verdict, correction chain, table cue, primary twin action |
| Console errors/warnings | None observed |
| Desktop/narrow responsive smoke | Pass |

## 5. Poker-content safeguards

- Exact sizes are accepted as bands or labeled provisional; they are not mastery truth.
- Passive checks do not prove a capped range.
- Uncapped means the strongest hands remain possible; it does not mean the opponent is ahead overall.
- A read changes expected frequencies and responses; it does not rewrite the factual action history.
- Bluff lessons name better folding hands and preserve the showdown value of hands that already beat misses.
- Call lessons show the amount to call and the pot after the bet.

## 6. User test for tonight

1. Open the production site on a phone-sized screen.
2. Start or continue the recommended hand without choosing a mode.
3. On the first hand, intentionally choose one answer you believe is wrong and finish the other links normally.
4. Choose an honest confidence level.
5. Verify the result tells you exactly which link to fix first and gives one replacement thought.
6. Open the changed hand and confirm the single changed fact is obvious before answering.
7. Leave a new hand after the Range answer, reload the page, and press Continue. Confirm it resumes at Plan.
8. Check the dashboard: link evidence, transfer status, saved-on-device boundary, and next-hand reason should all be understandable without opening help text.

Questions to answer after testing:

- Could you explain `Range → Plan → Action` in your own words?
- Did the first correction feel specific enough to use at a table?
- Did the changed hand test understanding or just memory?
- Was any text visible that did not help the current decision?
- Did you trust what the coach knew, and understand what remained provisional?

