# Range Coach V2 — requirements traceability matrix

Date: August 17, 2026  
Source of truth: [`v2-requirements.md`](./v2-requirements.md)

## 1. Purpose and status legend

This matrix connects approved goals and user stories to requirements, design responsibilities, implementation increments, acceptance criteria and verification evidence. A release candidate must not contain an orphan feature, untested requirement or active scenario outside the content gate.

Implementation status values:

- **Planned** — approved but not yet implemented.
- **In development** — code or content is incomplete.
- **Implemented** — implementation exists but may not have passed the release gate.
- **Verified** — acceptance evidence is recorded for the exact release candidate.
- **Deferred** — explicitly outside the V2 beta baseline.

At this requirements gate, all implementation rows are **Planned**. Status changes require evidence from the same version/commit being released.

## 2. Design and implementation responsibility map

| ID | Design responsibility | Planned implementation responsibility |
|---|---|---|
| `DES-001` | Resume-first training home and honest device-local storage notice. | Training shell, selection rationale, local-storage availability handling. |
| `DES-002` | Phone-first hand context and Range → Plan → Action → Confidence sequence. | Diagnostic hand state machine and accessible controls. |
| `DES-003` | Verdict-first result with one correction, one table cue and one deeper disclosure. | Deterministic evaluation renderer. |
| `DES-004` | Changed-fact interstitial and immediate twin flow. | Twin registry, diff validator and transfer linkage. |
| `DES-005` | Reasoning profile with link, confidence and transfer—not one opaque score. | Profile aggregation and progress UI. |
| `DES-006` | Baseline/exploit comparison, reversal condition and claim provenance. | Claim renderer and content-contract validator. |
| `DES-007` | Due-review treatment and reason for the selected exercise. | Adaptive selector and controlled-clock scheduler. |
| `DES-008` | Safe local reset and persistence limitation messaging. | Namespaced local repository, migrations and reset boundary. |
| `ENG-001` | — | Versioned scenario/content registry for 12 base/twin families. |
| `ENG-002` | — | Deterministic first-broken-link evaluator and six-code taxonomy. |
| `ENG-003` | — | Versioned local Attempt, Evaluation, Transfer, Profile and Retest repository. |
| `ENG-004` | — | Catalogue, claim, twin and release validation tooling. |
| `ENG-005` | — | Automated functional, visual, accessibility and deterministic-output suite. |

## 3. Functional traceability

| Requirement | Goals | User stories | Design / engineering | Data | Acceptance | Verification | Status |
|---|---|---|---|---|---|---|---|
| `FR-001` Start/resume priority | `GOAL-003`, `GOAL-005` | `US-001`, `US-007` | `DES-001`, `DES-007` | `DATA-006`, `DATA-009` | `AC-001`, `AC-013` | `TEST-001`, `TEST-013` | Planned |
| `FR-002` Twelve base hands and twins | `GOAL-001`, `GOAL-002` | `US-002`, `US-005` | `DES-004`, `ENG-001`, `ENG-004` | `DATA-001`, `DATA-002` | `AC-002`, `AC-020` | `TEST-002`, `TEST-020` | Planned |
| `FR-003` First Range/Plan/Action | `GOAL-001` | `US-002` | `DES-002`, `ENG-002` | `DATA-003` | `AC-003`, `AC-004` | `TEST-003`, `TEST-004` | Planned |
| `FR-004` Confidence before feedback | `GOAL-001`, `GOAL-003` | `US-003` | `DES-002`, `DES-005` | `DATA-003`, `DATA-006` | `AC-003`, `AC-012` | `TEST-003`, `TEST-012` | Planned |
| `FR-005` First-broken-link evaluator | `GOAL-001` | `US-002`, `US-004` | `DES-003`, `ENG-002` | `DATA-004` | `AC-004`, `AC-005`, `AC-022` | `TEST-004`, `TEST-005`, `TEST-022` | Planned |
| `FR-006` Controlled leak taxonomy | `GOAL-001`, `GOAL-003` | `US-004`, `US-007` | `DES-005`, `ENG-002` | `DATA-004`, `DATA-006` | `AC-004`, `AC-011` | `TEST-004`, `TEST-011` | Planned |
| `FR-007` Offer linked twin | `GOAL-002`, `GOAL-005` | `US-005`, `US-009` | `DES-004`, `ENG-001` | `DATA-002`, `DATA-005` | `AC-006`, `AC-007` | `TEST-006`, `TEST-007` | Planned |
| `FR-008` Exactly-one-change validation | `GOAL-002`, `GOAL-004` | `US-005`, `US-008` | `DES-004`, `ENG-004` | `DATA-002` | `AC-002`, `AC-006`, `AC-020` | `TEST-002`, `TEST-006`, `TEST-020` | Planned |
| `FR-009` Separate transfer result | `GOAL-002`, `GOAL-003` | `US-005`, `US-007` | `DES-004`, `DES-005`, `ENG-003` | `DATA-003`, `DATA-005`, `DATA-006` | `AC-007`, `AC-012` | `TEST-007`, `TEST-012` | Planned |
| `FR-010` Baseline versus exploit | `GOAL-001`, `GOAL-004` | `US-006`, `US-008` | `DES-006` | `DATA-001`, `DATA-007` | `AC-008` | `TEST-008` | Planned |
| `FR-011` Claim provenance | `GOAL-004` | `US-008` | `DES-006`, `ENG-004` | `DATA-007` | `AC-009`, `AC-020` | `TEST-009`, `TEST-020` | Planned |
| `FR-012` Device-local persistence | `GOAL-003` | `US-001`, `US-007` | `DES-001`, `DES-008`, `ENG-003` | `DATA-003`, `DATA-005`, `DATA-006`, `DATA-008`, `DATA-009`, `DATA-010` | `AC-010`, `AC-021` | `TEST-010`, `TEST-021` | Planned |
| `FR-013` Exact content/evaluator versions | `GOAL-004` | `US-008` | `ENG-001`, `ENG-002`, `ENG-003` | `DATA-003`, `DATA-004`, `DATA-008` | `AC-011`, `AC-022` | `TEST-011`, `TEST-022` | Planned |
| `FR-014` Reasoning profile | `GOAL-003`, `GOAL-005` | `US-007`, `US-009` | `DES-005`, `ENG-003` | `DATA-005`, `DATA-006` | `AC-012` | `TEST-012` | Planned |
| `FR-015` Adaptive selector | `GOAL-003`, `GOAL-005` | `US-001`, `US-007` | `DES-001`, `DES-007`, `ENG-003` | `DATA-006`, `DATA-009` | `AC-001`, `AC-013` | `TEST-001`, `TEST-013` | Planned |
| `FR-016` Six-to-eight-day retest | `GOAL-002`, `GOAL-003` | `US-007` | `DES-007`, `ENG-003` | `DATA-006`, `DATA-009` | `AC-014` | `TEST-014` | Planned |
| `FR-017` Verdict-first result | `GOAL-001`, `GOAL-005` | `US-004`, `US-009` | `DES-003` | `DATA-004` | `AC-015`, `AC-018` | `TEST-015`, `TEST-018`, `TEST-023` | Planned |
| `FR-018` Alternatives and sizing humility | `GOAL-001`, `GOAL-004` | `US-002`, `US-008` | `DES-003`, `DES-006`, `ENG-002` | `DATA-001`, `DATA-004`, `DATA-007` | `AC-005`, `AC-016` | `TEST-005`, `TEST-016` | Planned |
| `FR-019` Honest progress | `GOAL-002`, `GOAL-003` | `US-007` | `DES-005`, `DES-007` | `DATA-005`, `DATA-006`, `DATA-009` | `AC-012`, `AC-013` | `TEST-012`, `TEST-013` | Planned |
| `FR-020` Retrospective education only | `GOAL-004` | `US-008` | `DES-001`, `DES-002` | `DATA-010` | `AC-019` | `TEST-019` | Planned |
| `FR-021` Confirmed local reset | `GOAL-003`, `GOAL-004` | `US-001` | `DES-008`, `ENG-003` | `DATA-008`, `DATA-010` | `AC-017` | `TEST-017` | Planned |
| `FR-022` Active-content gate | `GOAL-004` | `US-008` | `DES-006`, `ENG-001`, `ENG-004` | `DATA-001`, `DATA-002`, `DATA-007` | `AC-020` | `TEST-020`, `TEST-024` | Planned |

## 4. Data traceability

| Data requirement | Produced or used by | Acceptance / verification |
|---|---|---|
| `DATA-001` Versioned Scenario | `FR-002`, `FR-010`, `FR-018`, `FR-022`; `ENG-001` | `AC-002`, `AC-008`, `AC-016`, `AC-020`; `TEST-002`, `TEST-008`, `TEST-016`, `TEST-020` |
| `DATA-002` TwinLink | `FR-002`, `FR-007`, `FR-008`, `FR-022`; `DES-004` | `AC-002`, `AC-006`, `AC-020`; `TEST-002`, `TEST-006`, `TEST-020` |
| `DATA-003` Attempt | `FR-003`, `FR-004`, `FR-009`, `FR-012`, `FR-013`; `ENG-003` | `AC-003`, `AC-007`, `AC-010`, `AC-011`; `TEST-003`, `TEST-007`, `TEST-010`, `TEST-011` |
| `DATA-004` Evaluation | `FR-005`, `FR-006`, `FR-013`, `FR-017`, `FR-018`; `ENG-002` | `AC-004`, `AC-005`, `AC-011`, `AC-015`, `AC-016`, `AC-022`; `TEST-004`, `TEST-005`, `TEST-011`, `TEST-015`, `TEST-016`, `TEST-022` |
| `DATA-005` Transfer | `FR-009`, `FR-012`, `FR-014`, `FR-019`; `ENG-003` | `AC-007`, `AC-010`, `AC-012`; `TEST-007`, `TEST-010`, `TEST-012` |
| `DATA-006` LearnerProfile | `FR-001`, `FR-004`, `FR-006`, `FR-009`, `FR-012`, `FR-014`–`FR-016`, `FR-019`; `DES-005` | `AC-001`, `AC-012`–`AC-014`; `TEST-001`, `TEST-012`–`TEST-014` |
| `DATA-007` Claim | `FR-010`, `FR-011`, `FR-018`, `FR-022`; `DES-006` | `AC-008`, `AC-009`, `AC-016`, `AC-020`; `TEST-008`, `TEST-009`, `TEST-016`, `TEST-020`, `TEST-024` |
| `DATA-008` Local schema version | `FR-012`, `FR-013`, `FR-021`; `DES-008`, `ENG-003` | `AC-010`, `AC-011`, `AC-017`; `TEST-010`, `TEST-011`, `TEST-017` |
| `DATA-009` Retest | `FR-001`, `FR-012`, `FR-015`, `FR-016`, `FR-019`; `DES-007` | `AC-001`, `AC-010`, `AC-013`, `AC-014`; `TEST-001`, `TEST-010`, `TEST-013`, `TEST-014` |
| `DATA-010` Local privacy boundary | `FR-012`, `FR-020`, `FR-021`; `DES-008` | `AC-010`, `AC-017`, `AC-019`, `AC-021`; `TEST-010`, `TEST-017`, `TEST-019`, `TEST-021` |

## 5. Non-functional traceability

| NFR | Design / engineering responsibility | Acceptance / verification |
|---|---|---|
| `NFR-001` Offline deterministic core | `ENG-001`–`ENG-003` | `AC-022`; `TEST-022` plus network-disabled end-to-end run |
| `NFR-002` Phone layout and targets | `DES-001`–`DES-005`, `ENG-005` | `AC-018`; `TEST-018` |
| `NFR-003` Keyboard and semantics | `DES-001`–`DES-008`, `ENG-005` | `AC-018`; `TEST-018` |
| `NFR-004` Non-color meaning and reduced motion | `DES-003`, `DES-005`, `ENG-005` | `AC-018`; `TEST-018` |
| `NFR-005` Interactive performance | `ENG-001`, `ENG-003`, `ENG-005` | Release performance budget and recorded browser trace |
| `NFR-006` Under-ten-minute usability | `DES-001`–`DES-005` | `TEST-023`; beta completion-time measure |
| `NFR-007` Deterministic result | `ENG-002`, `ENG-005` | `AC-022`; `TEST-022` |
| `NFR-008` Fail-closed provenance | `DES-006`, `ENG-004` | `AC-009`, `AC-020`; `TEST-009`, `TEST-020` |
| `NFR-009` Concrete-first language | `DES-002`, `DES-003`, `DES-006` | `AC-015`; `TEST-015`, `TEST-023` |
| `NFR-010` Copyright/originality | `ENG-001`, content review | `TEST-024` |
| `NFR-011` Automated release validation | `ENG-004`, `ENG-005` | `AC-020`; `TEST-002`, `TEST-020` |
| `NFR-012` Honest local-storage disclosure | `DES-001`, `DES-008` | `AC-021`; `TEST-021` |

## 6. Goal coverage audit

| Goal | Covered by functional requirements | Principal evidence |
|---|---|---|
| `GOAL-001` Diagnose thinking | `FR-002`–`FR-006`, `FR-010`, `FR-017`, `FR-018` | `AC-002`–`AC-005`, `AC-008`, `AC-015`, `AC-016`; `TEST-002`–`TEST-005`, `TEST-008`, `TEST-015`, `TEST-016` |
| `GOAL-002` Prove transfer | `FR-002`, `FR-007`–`FR-009`, `FR-016`, `FR-019` | `AC-002`, `AC-006`, `AC-007`, `AC-012`, `AC-014`; `TEST-002`, `TEST-006`, `TEST-007`, `TEST-012`, `TEST-014` |
| `GOAL-003` Remember learner | `FR-001`, `FR-004`, `FR-006`, `FR-009`, `FR-012`, `FR-014`–`FR-016`, `FR-019`, `FR-021` | `AC-001`, `AC-010`–`AC-014`, `AC-017`, `AC-021`; `TEST-001`, `TEST-010`–`TEST-014`, `TEST-017`, `TEST-021` |
| `GOAL-004` Auditable trust | `FR-008`, `FR-010`, `FR-011`, `FR-013`, `FR-018`, `FR-020`–`FR-022` | `AC-008`, `AC-009`, `AC-011`, `AC-016`, `AC-017`, `AC-019`–`AC-022`; `TEST-008`–`TEST-011`, `TEST-016`, `TEST-017`, `TEST-019`–`TEST-022`, `TEST-024` |
| `GOAL-005` Fast and clear | `FR-001`, `FR-007`, `FR-014`, `FR-015`, `FR-017` | `AC-001`, `AC-006`, `AC-012`, `AC-013`, `AC-015`, `AC-018`; `TEST-001`, `TEST-006`, `TEST-012`, `TEST-013`, `TEST-015`, `TEST-018`, `TEST-023` |

## 7. Scenario-family coverage

| Leak | Base hands | Required coverage | Content gate evidence |
|---|---|---|---|
| `LEAK-01` Strong hands removed too quickly | `H05`, `H06` | Passive line and 3-bet-pot range; one action-changing or action-preserving twin as specified in content record. | Scenario/twin schema validation, internal poker-content review, provenance check. |
| `LEAK-02` Weaker callers misidentified | `H01`, `H02` | Clear value and thin value; name actual worse callers. | Answer-model branch tests and accepted-alternative review. |
| `LEAK-03` Bluff targets already beaten | `H03`, `H04` | No-showdown-value bluff and avoid-unnecessary-bluff contrast. | Action-purpose coherence tests. |
| `LEAK-04` Plan/action contradiction | `H07`, `H08` | Value and bluff contradictions; acceptable action in one context must still fail when paired with an incompatible stated plan. | `TEST-005` mandatory for both families. |
| `LEAK-05` Calling price ignored | `H09`, `H10` | Bet-size price change and dirty-out change. | Computed-claim provenance and boundary tests. |
| `LEAK-06` Read treated as fact | `H11`, `H12` | Evidence added/removed and reversal triggered. | Baseline/exploit contract and reversal tests. |

## 8. Acceptance-to-test index

| Acceptance | Required verification |
|---|---|
| `AC-001` | `TEST-001`, `TEST-013` |
| `AC-002` | `TEST-002`, `TEST-006`, `TEST-020` |
| `AC-003` | `TEST-003` |
| `AC-004` | `TEST-004` |
| `AC-005` | `TEST-005`, `TEST-016` |
| `AC-006` | `TEST-006` |
| `AC-007` | `TEST-007` |
| `AC-008` | `TEST-008` |
| `AC-009` | `TEST-009`, `TEST-020` |
| `AC-010` | `TEST-010` |
| `AC-011` | `TEST-011` |
| `AC-012` | `TEST-012` |
| `AC-013` | `TEST-013` |
| `AC-014` | `TEST-014` |
| `AC-015` | `TEST-015`, `TEST-023` |
| `AC-016` | `TEST-016` |
| `AC-017` | `TEST-017` |
| `AC-018` | `TEST-018` |
| `AC-019` | `TEST-019` |
| `AC-020` | `TEST-020`, `TEST-024` |
| `AC-021` | `TEST-021` |
| `AC-022` | `TEST-022` |

## 9. SDLC gates and change control

### Gate R — requirements ready

- All goals, stories, requirements, criteria and tests have stable IDs.
- Scope, device-local persistence and deferred features are explicit.
- The no-orphan audit in Sections 3–8 is complete.

### Gate C — content ready

- Twelve base and twelve twin records pass catalogue validation.
- Every twin has one declared change and a reviewed answer model.
- All claims carry their actual provenance; internal authorship is not mislabeled as independent validation.
- Every exploit lesson includes baseline, evidence, adjustment and reversal.

### Gate D — design ready

- `DES-001` through `DES-008` have phone and desktop states for fresh, saved, correct, incorrect, alternative, contradictory, twin and due-retest paths.
- A target learner passes the comprehension protocol before visual polish is considered final.

### Gate E — engineering ready

- `ENG-001` through `ENG-005` are implemented.
- Local schema migration and version retention tests pass.
- Deterministic evaluation snapshots pass without network access.

### Gate Q — QA ready

- `AC-001` through `AC-022` have evidence tied to the release candidate.
- No release-blocking functional, poker-content, accessibility, persistence or trust defect remains open.
- Any waived criterion names the owner, rationale, risk and follow-up version.

### Gate P — publish ready

- The deployed build matches the verified commit/version.
- Production smoke testing covers fresh start, incorrect diagnosis, correct twin, persistence reload and local-storage disclosure.
- Known limitations and the device-local beta boundary are visible to the learner.

### Change rule

Any change to a goal, leak code, evaluation dependency, scenario answer, provenance, persistence boundary or acceptance criterion requires:

1. A versioned change record.
2. Impact review against this matrix.
3. Updated requirements and tests before implementation is treated as complete.
4. Re-execution of affected content and regression gates.

No UI control, persisted field, evaluator branch or active scenario should ship without a traceable row. No requirement should be marked Verified without recorded evidence.

