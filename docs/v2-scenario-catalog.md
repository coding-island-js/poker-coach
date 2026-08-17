# Range Coach V2 — scenario and twin catalogue

Status: authored content specification for the Reasoning Diagnostic Beta  
Scope: heads-up, live cash No-Limit Hold'em study after the session  
Validation state: all poker strategy is an independently authored teaching example; independent poker-expert and solver review are pending

## Purpose

This catalogue defines 12 base hands and 12 controlled twins. It is not a solved strategy library. Each family tests one of the six approved reasoning leaks, locates the first important break in the learner's chain, and then changes exactly one fact to test transfer.

The visible learner loop remains:

1. **Range** — What does the opponent have most often, and which strong hands remain?
2. **Plan** — Which weaker hands call, which better hands fold, or what price is Hero taking?
3. **Action** — Which action carries out that plan?

Internally, each answer can be diagnosed as facts → opponent range → Hero versus range → target hands → action → size. Exact sizes are teaching choices, not mastery facts, until validated.

## Content rules and review gates

- Pot figures ignore rake and jackpot drops so the action is reproducible.
- “Most often” describes the range center; it does not exclude discounted branches.
- A checked or called line never proves that strong hands are absent.
- A player tendency is an assumption unless supported by comparable observations.
- Accepted alternatives must remain visible. A mixed or close decision cannot be graded as binary without validated data.
- The twin may change one declared input field only. Stack and pot changes caused mechanically by a changed bet are consequences, not additional authored variables.
- AI may restate an approved explanation or select an approved twin. It may not create the strategic answer.
- Before release, every family requires an independent poker-content review. Numerical frequencies or exact sizes require licensed or independently generated solver evidence if presented as authoritative.

## Coverage matrix

| Leak ID | Reasoning leak | Base hands |
| --- | --- | --- |
| LEAK-01 | Removes strong hands from the opponent's range too quickly | SC-01, SC-02 |
| LEAK-02 | Misidentifies which weaker hands can call | SC-03, SC-04 |
| LEAK-03 | Bluffs hands Hero already beats | SC-05, SC-06 |
| LEAK-04 | Chooses an action that contradicts the stated plan | SC-07, SC-08 |
| LEAK-05 | Ignores the price of calling | SC-09, SC-10 |
| LEAK-06 | Treats an opponent read as a proven fact | SC-11, SC-12 |

---

## SC-01 — A check is not an empty range

**Traceability:** LEAK-01 · river range retention · value decision

**Facts**

- Game: $2/$5 live cash, nine-handed; $1,000 effective at the start.
- Positions: Hero is Button; opponent is Big Blind.
- Hero: A♠ Q♦.
- Board: Q♣ 7♥ 3♣ 2♠ 2♦.
- Pot and line: folds to Hero, who raises to $15; Big Blind calls. Pot $32. Big Blind checks the flop; Hero bets $20; Big Blind calls. Pot $72. Both check the turn. Big Blind checks the river; Hero acts with $965 behind.
- Opponent evidence: no reliable player-specific read.

**Coach model**

- Range center: one-pair hands—worse queens, sevens, and pocket pairs—plus missed club and straight-draw branches.
- Strongest hands still possible: 77, 33, 22, Q7s and occasional slow-played strong queens. They are discounted, not removed.
- Hero's role: strong one-pair value hand, ahead of much of the range but not invulnerable.
- Target hands: weaker Qx first; some 7x and pocket pairs at a size they will call. Missed draws are not value targets.
- Accepted baseline action: bet a medium amount for value; $35–$45 is an authored teaching band.
- Accepted alternatives: a smaller bet is coherent against a cautious caller; checking is a conservative alternative against a check-raising opponent. A large bet needs evidence that weaker queens still call it.
- Exploit adjustment: size up only with credible evidence that this opponent calls large river bets too widely with one pair.
- Reversal condition: check or bet smaller if the opponent check-raises rivers aggressively or reaches the river with very few weaker queens.

**Controlled twin SC-01T**

- Exact changed variable: opponent river action changes from **check** to **bet $55**. Every card, earlier action, position, stack, and player assumption remains the same.
- Expected effect: the range center becomes stronger and more polarized; strong value remains clearly present. Hero is no longer choosing a value-bet size. Calling is the accepted baseline; raising requires evidence that worse hands continue, while folding is too tight without an unusually strong read.
- Transfer question: “Did the opponent's bet change only the action, or did it also change which hands are most likely?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · no exact frequency verified

---

## SC-02 — The cold-caller can still be strong

**Traceability:** LEAK-01 · turn range retention · false-cap correction

**Facts**

- Game: $2/$5 live cash, eight-handed; $1,000 effective.
- Positions: Cutoff opens, Hero is Button, opponent is Big Blind.
- Hero: Q♠ Q♥.
- Board through the decision: J♣ 8♣ 3♦ 9♥.
- Pot and line: Cutoff raises to $20; Hero reraises to $70; Big Blind cold-calls; Cutoff folds. Pot $162. Big Blind checks the flop; Hero bets $80; Big Blind calls. Pot $322. Big Blind checks the turn; Hero acts with $850 behind.
- Opponent evidence: competent regular; no reliable tendency attached.

**Coach model**

- Range center: Jx, club draws, pair-plus-draw hands and some pocket pairs.
- Strongest hands still possible: slow-played AA/KK, JJ, 88, 99, J9s, T7s and QT suited where preflop behavior permits. Some branches are low-frequency but not zero.
- Hero's role: overpair with showdown value on a turn that improves several calling branches.
- Target hands: a value bet would seek calls from Jx and draws; a protection claim must name hands that have meaningful equity and may fold.
- Accepted baseline action: check back and retain the ability to call or value-bet suitable rivers.
- Accepted alternatives: a small bet can be coherent against a passive opponent who continues too widely and rarely check-raises. A large bet is unsupported without stronger range and response evidence.
- Exploit adjustment: bet small more often if observed calls contain many Jx/draws and turn check-raises are rare.
- Reversal condition: prefer checking when the cold-call range is tight, the player traps overpairs, or the player check-raises strong draws.

**Controlled twin SC-02T**

- Exact changed variable: the turn card changes from **9♥** to **2♠**. Nothing else changes.
- Expected effect: fewer two-pair and straight branches improve on the turn, so a small value/protection bet becomes a more attractive accepted baseline. The opponent is still not “capped”: AA, KK and sets remain possible.
- Transfer question: “Which hands disappeared because of the card, and which strong hands survive unchanged?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · exact size and frequencies unverified

---

## SC-03 — Name the weaker caller

**Traceability:** LEAK-02 · thin river value · target identification

**Facts**

- Game: $2/$5 live cash; $750 effective.
- Positions: Hero is Button; opponent is Big Blind.
- Hero: A♠ Q♦.
- Board: Q♣ 7♥ 3♣ 2♠ 2♦.
- Pot and line: Hero raises to $15; Big Blind calls. Pot $32. Big Blind checks; Hero bets $20; Big Blind calls. Pot $72. Both check the turn. Big Blind checks the river; Hero acts.
- Opponent evidence: ordinary loose preflop caller; no river-specific read.

**Coach model**

- Range center: worse Qx, 7x, pocket pairs and missed draws.
- Strongest hands still possible: trips, full houses and occasional slow-played two-pair/set branches from earlier streets.
- Hero's role: value hand.
- Target hands: QJ, QT and Q9 are the clearest weaker callers; some 7x and pocket pairs may call a small bet. “Make the pot bigger” is not the plan until the learner names who pays.
- Accepted baseline action: medium value bet, with $35–$45 used only as an authored example.
- Accepted alternatives: small bet is coherent if lower pairs call but fold to more; check is conservative against a player whose continuing range contains few worse queens.
- Exploit adjustment: size larger against a demonstrated one-pair calling tendency.
- Reversal condition: reduce size or check if weaker queens fold frequently or river check-raises are unusually common.

**Controlled twin SC-03T**

- Exact changed variable: Hero's cards change from **A♠ Q♦** to **Q♠ 8♦**. Board, line, opponent and pot remain identical.
- Expected effect: the list of weaker Qx shrinks substantially, while better queens remain. Checking becomes the accepted baseline; a small exploitative bet needs evidence that sevens and pocket pairs call often enough.
- Transfer question: “Which specific worse queens still call now?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · exact sizing unverified

---

## SC-04 — Top pair is not automatically a value bet

**Traceability:** LEAK-02 · out-of-position river value · value threshold

**Facts**

- Game: $2/$5 live cash; $800 effective.
- Positions: opponent is Button; Hero is Big Blind.
- Hero: Q♠ J♦.
- Board: Q♥ 8♠ 4♣ 2♦ 2♣.
- Pot and line: Button raises to $15; Hero calls. Pot $32. Hero checks; Button bets $20; Hero calls. Pot $72. Both check the turn. Hero acts first on the river.
- Opponent evidence: no reliable read.

**Coach model**

- Range center: Qx, 8x, pocket pairs and missed broadway/straight branches after the turn check-back.
- Strongest hands still possible: AQ/KQ, 88, 44, 22 and occasional slow plays.
- Hero's role: medium-strength one-pair hand near the thin-value boundary.
- Target hands: QT/Q9 and perhaps 8x or pocket pairs at a small size. A learner who cannot name a caller has not yet established a value plan.
- Accepted baseline action: small value bet or check; both remain approved until population or solver evidence resolves the threshold.
- Accepted alternatives: check-call a modest bet can be coherent if missed hands bluff; bet-fold can be coherent against a passive raise range.
- Exploit adjustment: favor a small bet against a player who checks back many pairs and calls river leads too widely.
- Reversal condition: favor checking if Button value-bets worse hands when checked to, folds lower pairs to leads, or raises rivers aggressively.

**Controlled twin SC-04T**

- Exact changed variable: Hero's cards change from **Q♠ J♦** to **Q♠ 9♦**.
- Expected effect: fewer worse queens can call and more queens beat Hero. Check becomes the preferred authored baseline; a small bet is now explicitly exploit-dependent.
- Transfer question: “Did the board change, or did Hero simply cross the value threshold?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · close decision intentionally not binary

---

## SC-05 — A bluff must fold a better hand

**Traceability:** LEAK-03 · river bluff target · showdown-value recognition

**Facts**

- Game: $2/$5 live cash; $1,000 effective.
- Positions: Hero is Button; opponent is Big Blind.
- Hero: A♣ 5♣.
- Board: K♦ 8♣ 3♣ 2♥ Q♠.
- Pot and line: Hero raises to $15; Big Blind calls. Pot $32. Big Blind checks; Hero bets $20; Big Blind calls. Pot $72. Both check the turn. Big Blind checks the river; Hero acts.
- Opponent evidence: none in the baseline.

**Coach model**

- Range center: Kx, 8x, pocket pairs and missed draws.
- Strongest hands still possible: KQ, sets, two pair and occasional traps.
- Hero's role: ace-high with some showdown value against missed draws, but behind every pair.
- Target hands: a bluff must fold better hands—especially 8x or pocket pairs. Missed draws are not targets because ace-high may already beat them.
- Accepted baseline action: check without a reliable overfold read.
- Accepted alternatives: a large polarized bluff is coherent only if the learner names better one-pair targets, identifies value hands using the same size, and supplies credible overfold evidence. Exact size is not graded.
- Exploit adjustment: bluff large against documented river overfolding by comparable one-pair hands.
- Reversal condition: check when this player calls pairs, traps strong hands, or the read is based on too few observations.

**Controlled twin SC-05T**

- Exact changed variable: the river card changes from **Q♠** to **A♦**.
- Expected effect: Hero improves to a pair of aces and should no longer describe the action as a bluff. Checking is acceptable; a value bet must identify worse one-pair callers. A large “make pairs fold” bet now contradicts Hero's new showdown role.
- Transfer question: “Which hands that were bluff targets are now hands Hero beats?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · exploit frequency and size unverified

---

## SC-06 — Preserve useful showdown value

**Traceability:** LEAK-03 · river showdown comparison · bluff selection

**Facts**

- Game: $2/$5 live cash; $900 effective.
- Positions: Hero is Cutoff; opponent is Big Blind.
- Hero: 9♣ 9♥.
- Board: A♠ 7♦ 3♦ K♣ 2♠.
- Pot and line: Hero raises to $20; Big Blind calls. Pot $42. Big Blind checks; Hero bets $25; Big Blind calls. Pot $92. Both check the turn. Big Blind checks the river; Hero acts.
- Opponent evidence: unknown.

**Coach model**

- Range center: weak Ax, Kx that continued once or improved, 7x, pocket pairs and missed diamond/straight draws.
- Strongest hands still possible: two pair, sets and slow-played strong aces.
- Hero's role: showdown hand that beats 7x, lower pocket pairs and missed draws but loses to Ax, Kx and TT–QQ.
- Target hands: a bluff would need better hands such as TT–QQ or weak Kx to fold. Betting merely to fold missed draws burns value Hero already owns.
- Accepted baseline action: check.
- Accepted alternatives: a bluff needs strong evidence that the named better pairs exist at meaningful weight and overfold; otherwise it is not approved.
- Exploit adjustment: bluff only against an unusually face-up opponent who both reaches the river with better medium pairs and folds them.
- Reversal condition: check whenever worse hands do not call and better hands do not fold often enough.

**Controlled twin SC-06T**

- Exact changed variable: Hero's cards change from **9♣ 9♥** to **6♦ 5♦**. Board, line and opponent remain unchanged.
- Expected effect: Hero now has six-high after missing the diamond draw and beats almost nothing. Bluffing becomes a coherent candidate because even missed higher draws can win at showdown; checking remains allowed absent fold evidence.
- Transfer question: “Why can the same bet be wasteful with nines but coherent with six-high?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · no bluff frequency verified

---

## SC-07 — A value plan must end in a value action

**Traceability:** LEAK-04 · plan/action coherence · strong-hand river play

**Facts**

- Game: $2/$5 live cash; $1,000 effective.
- Positions: opponent is Cutoff; Hero is Button.
- Hero: 8♣ 7♣.
- Board: 6♦ 5♠ K♣ 4♥ Q♦.
- Pot and line: Cutoff limps $5; Hero raises to $25; Cutoff calls. Pot $57. Cutoff checks; Hero bets $30; Cutoff calls. Pot $117. Cutoff checks the turn; Hero bets $80; Cutoff calls. Pot $277. Cutoff checks the river; Hero acts with $865 behind.
- Opponent evidence: loose-passive recreational player, based on several observed limp-calls; river calling tendency unknown.

**Coach model**

- Range center: Kx, pair-plus-draw hands, two pair and sets; some missed draws remain.
- Strongest hands still possible: 87 for the same nut straight. Lower straights, sets and two pair can also reach the river but are behind Hero; full houses are impossible on this unpaired board.
- Hero's role: very strong made straight seeking value.
- Target hands: Kx, two pair, sets and lower straights. Missed draws do not pay a value bet.
- Accepted baseline action: bet for value. A medium-to-large authored size is acceptable if the learner names callers.
- Accepted alternatives: a smaller bet is coherent if one-pair hands are price-sensitive. Checking contradicts a stated plan to get called by worse unless a specific check-raise risk dominates.
- Exploit adjustment: size up against a demonstrated inelastic caller; size down against a player who folds one pair to large river bets.
- Reversal condition: stop increasing size when calls become concentrated in tied or stronger hands.

**Controlled twin SC-07T**

- Exact changed variable: opponent's river action changes from **check** to **bet $220**. Cards, earlier line and player evidence remain identical.
- Expected effect: Hero no longer chooses whether to initiate a value bet. Raising for value is the authored baseline because Hero has the nut straight and can target sets, two pair and lower straights; calling is a conservative accepted alternative if those hands will not call a raise. Folding is unsupported.
- Transfer question: “The hand stayed strong—why did the action change?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · exact river sizing unverified

---

## SC-08 — Choose the action that matches the purpose

**Traceability:** LEAK-04 · flop plan/action coherence · draw management

**Facts**

- Game: $2/$5 live cash; $1,000 effective.
- Positions: opponent is Hijack; Hero is Button.
- Hero: A♠ J♠.
- Board through the decision: K♠ 8♠ 3♦.
- Pot and line: Hijack raises to $20; Hero calls; blinds fold. Pot $47. Hijack checks the flop; Hero acts.
- Opponent evidence: no reliable read.

**Coach model**

- Range center: Kx, pocket pairs, ace-high/broadway misses and some traps after the check.
- Strongest hands still possible: AA, KK, 88, 33 and strong Kx.
- Hero's role: nut-flush draw with overcard equity; not yet a made value hand.
- Target hands: if betting as a semi-bluff, name hands such as unpaired broadways and some pocket pairs that can fold. If checking, the purpose is to realize equity in position, not to “build the pot.”
- Accepted baseline action: both check back and a modest semi-bluff bet are coherent authored choices when paired with the matching plan.
- Accepted alternatives: overbetting is not accepted from a “take a free card” plan; checking is not evidence that Hero has abandoned the pot.
- Exploit adjustment: bet more often against documented flop overfolding; check more often against frequent check-raisers.
- Reversal condition: abandon the betting exploit when checks contain traps or check-raises are common.

**Controlled twin SC-08T**

- Exact changed variable: Hijack's flop action changes from **check** to **bet $35**. All cards, positions, stacks and assumptions remain unchanged.
- Expected effect: taking a free card is no longer available. Calling is the accepted baseline at the offered price; raising can be a coherent semi-bluff plan, while folding the nut draw to this size is too tight absent unusual information.
- Transfer question: “Which plans disappeared when the opponent bet?”

**Provenance:** independently authored teaching example · expert review pending · solver review pending · mixed frequencies and raise size unverified

---

## SC-09 — The price can change the answer

**Traceability:** LEAK-05 · turn pot odds · draw continuation

**Facts**

- Game: $2/$5 live cash; $500 effective.
- Positions: opponent is Cutoff; Hero is Button.
- Hero: 9♣ 8♣.
- Board through the decision: J♣ 7♦ 2♣ 6♠.
- Pot and line: Cutoff raises to $20; Hero calls; blinds fold. Pot $47. Both check the flop. Cutoff bets $20 on the turn; Hero acts with $480 behind.
- Opponent evidence: no reliable read.

**Coach model**

- Range center: one-pair hands, overcards, draws and occasional strong hands making a delayed bet.
- Strongest hands still possible: sets, two pair and made straights such as T8 where preflop permits.
- Hero's role: open-ended straight draw plus flush draw; some apparent outs may tie or lose and should not all be called “clean.”
- Target/price: calling $20 creates a final pot of $87, so raw break-even equity is about 23% before future action and imperfect outs. The draw is strong enough to continue in this authored spot.
- Accepted baseline action: call.
- Accepted alternatives: a raise can be coherent as a semi-bluff if the learner names fold targets and a response to a reraise. Folding is too conservative at this price without unusual evidence.
- Exploit adjustment: raise more often against excessive delayed-bet/folding behavior.
- Reversal condition: prefer calling when the bettor continues strongly, traps, or will not fold one pair.

**Controlled twin SC-09T**

- Exact changed variable: the turn bet changes from **$20** to **$75**. The pre-bet pot, cards, stack, position and opponent assumption remain the same.
- Expected effect: calling $75 creates a final pot of $197, requiring about 38% raw equity before future action. A call is no longer automatic; folding becomes accepted, and raising needs a credible fold case rather than “I have many outs.”
- Transfer question: “The cards did not change. Why can the decision change?”

**Provenance:** independently authored teaching example · pot-odds math computed · expert review pending · equity/solver review pending

---

## SC-10 — A bluff-catcher is a price decision

**Traceability:** LEAK-05 · river pot odds · bluff-frequency threshold

**Facts**

- Game: $2/$5 live cash; $1,000 effective.
- Positions: Hero is Cutoff; opponent is Button.
- Hero: K♣ J♠.
- Board: J♥ 8♦ 4♣ 2♠ A♣.
- Pot and line: Hero raises to $20; Button calls; blinds fold. Pot $47. Hero bets $30 on the flop; Button calls. Pot $107. Hero bets $40 on the turn; Button calls. Pot $187. Hero checks the river; Button bets $45; Hero acts.
- Opponent evidence: no reliable bluff-frequency read.

**Coach model**

- Range center: Ax that floated or improved, Jx, two pair/sets and missed straight branches.
- Strongest hands still possible: AJ, A8s, 88, 44 and slow-played sets/two pair.
- Hero's role: bluff-catcher; worse made hands are unlikely to bet for value.
- Target/price: Hero calls $45 to create a final pot of $277, requiring about 16% equity. The question is whether bluffs and overplayed worse hands reach roughly that share, not whether Hero “likes” the river.
- Accepted baseline action: call is the authored baseline at the small price; fold remains a context-dependent alternative because bluff composition is unverified.
- Accepted alternatives: raising is unsupported without a clear value or bluff target.
- Exploit adjustment: fold against strong evidence of river underbluffing; call more readily against excessive stabbing.
- Reversal condition: change the exploit when comparable showdowns reveal a different bluff/value mix.

**Controlled twin SC-10T**

- Exact changed variable: Button's river bet changes from **$45** to **$150**. All prior facts remain the same.
- Expected effect: Hero calls $150 to create a final pot of $487, requiring about 31% equity. Fold becomes the accepted baseline without bluff evidence; “same hand, same opponent” is not enough to preserve the small-bet call.
- Transfer question: “What minimum bluff share did the larger price demand?”

**Provenance:** independently authored teaching example · pot-odds math computed · expert review pending · range and solver review pending

---

## SC-11 — Body language is not a database

**Traceability:** LEAK-06 · evidence quality · exploit calibration

**Facts**

- Game: $2/$5 live cash; $900 effective.
- Positions: Hero is Button; opponent is Big Blind.
- Hero: 6♥ 5♥.
- Board: K♠ 9♣ 4♦ 2♥ Q♣.
- Pot and line: Hero raises to $15; Big Blind calls. Pot $32. Both check the flop. Big Blind checks the turn; Hero bets $20; Big Blind calls. Pot $72. Big Blind checks the river; Hero acts.
- Opponent evidence: first orbit. Opponent glanced at their chips before checking. No comparable showdown has been observed.

**Coach model**

- Range center: Kx/9x, pocket pairs, ace-high and missed straight branches.
- Strongest hands still possible: KQ, sets, two pair and occasional traps.
- Hero's role: six-high with essentially no showdown value; a plausible bluff candidate, but not proof of a profitable bluff.
- Target hands: 9x and pocket pairs are the most plausible better-hand fold targets. Kx generally needs stronger pressure/evidence.
- Accepted baseline action: check because no reliable overfold evidence is supplied.
- Accepted alternatives: a bluff is coherent as a hypothesis, but cannot be graded as the uniquely correct exploit from a chip glance.
- Exploit adjustment: bluff larger only after repeated, comparable evidence that one-pair hands fold.
- Reversal condition: stop when the opponent calls pairs, traps, or the supposed tell fails at showdown.

**Controlled twin SC-11T**

- Exact changed variable: opponent evidence changes to **“In three prior comparable heads-up rivers, this opponent folded a face-up pair twice to pot-sized bets; the third hand did not reach showdown.”** All hand facts remain the same.
- Expected effect: a large bluff becomes an accepted exploitative action, while checking remains the baseline-safe alternative. Confidence should be “somewhat sure,” not “proven,” because the sample is small.
- Transfer question: “What did the observation justify, and what did it still fail to prove?”

**Provenance:** independently authored teaching example · player-specific inference · expert review pending · solver and population review pending

---

## SC-12 — A player label cannot decide a river raise

**Traceability:** LEAK-06 · read calibration · river check-raise response

**Facts**

- Game: $2/$5 live cash; $1,200 effective.
- Positions: Hero is Hijack; opponent is Big Blind.
- Hero: K♣ Q♦.
- Board: K♥ Q♠ 7♣ 2♣ 4♥.
- Pot and line: Hero raises to $20; Big Blind calls. Pot $42. Big Blind checks; Hero bets $30; Big Blind calls. Pot $102. Big Blind checks; Hero bets $70; Big Blind calls. Pot $242. Big Blind checks the river; Hero bets $150; Big Blind check-raises to $500. Hero must call $350; Hero acts.
- Opponent evidence: described by the table as a “quiet older regular,” with no logged comparable river raises.

**Coach model**

- Range center after the raise: sets and two pair for value, with missed clubs as the natural bluff source. Hero's blockers reduce some Kx/Qx value branches but do not erase sets.
- Strongest hands still possible: 77, 22, 44 and occasional strangely played stronger/tied two-pair branches.
- Hero's role: very strong bluff-catcher facing a polarized line.
- Target/price: Hero calls $350 to create a final pot of $1,242, requiring about 28% equity. The decision depends on whether missed-club bluffs are present often enough.
- Accepted baseline action: both call and fold remain reviewable alternatives pending a validated population model; the app should grade the reasoning and evidence, not claim certainty.
- Accepted alternatives: calling is coherent when missed clubs plausibly bluff; folding is coherent if the learner cites independently supported underbluffing rather than the opponent's age or demeanor.
- Exploit adjustment: fold more against comparable, repeated evidence that this opponent's large river check-raises are value-heavy.
- Reversal condition: return toward calling when a bluff is shown, missed draws are observed taking this line, or the sizing pattern changes.

**Controlled twin SC-12T**

- Exact changed variable: opponent evidence changes to **“Across eight comparable river check-raises that reached showdown, this opponent showed value every time; in two other similar missed-draw hands, the opponent checked rather than raised.”** Cards and action remain identical.
- Expected effect: folding becomes the stronger accepted exploit, but the coach must still call the read high-confidence evidence rather than a law. A later shown bluff should reduce confidence and trigger review.
- Transfer question: “How did comparable evidence change confidence without making the range certain?”

**Provenance:** independently authored teaching example · player-specific inference · expert review pending · population and solver review pending

---

## Authoring QA checklist

Before a scenario version becomes eligible for the app, reviewers must confirm:

1. Cards are legal and action order matches position.
2. Pot and stack arithmetic is reproducible under the stated no-rake convention.
3. The range center is distinct from the strongest hands still possible.
4. Hero's role is stated relative to the range, not as an absolute label.
5. Value lessons name weaker callers; bluff lessons name better folders; calls state the price.
6. The accepted action follows from the approved plan, and coherent alternatives are retained.
7. Baseline, exploit evidence and reversal condition are separate.
8. The twin changes exactly one declared variable and records the expected reasoning effect.
9. No exact size, mix or frequency is described as solver truth without attached evidence.
10. An independent reviewer can locate the intended first broken link without seeing the author's answer.

## Release limitations

- These 24 hands are a beta content specification, not a substitute for a complete cash-game curriculum.
- Multiway pots, limped-pot strategy, straddles, very deep stacks and preflop range training remain later modules.
- SC-04 and SC-12 intentionally preserve close alternatives so the evaluator can test reasoning without manufacturing certainty.
- “Expert review pending” must remain visible in content operations until a qualified independent reviewer signs a specific scenario version.
- “Solver review pending” must remain visible anywhere an exact size, frequency or equilibrium comparison could otherwise be inferred.
