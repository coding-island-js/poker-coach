export type ReasoningLink = "range" | "plan" | "action";
export type Confidence = "guessing" | "somewhat" | "very";
export type LeakTag =
  | "removes-strength"
  | "weaker-callers"
  | "bluffs-showdown"
  | "plan-action"
  | "call-price"
  | "read-as-fact";

export type V2Option = { id: string; label: string };
export type V2Question = {
  prompt: string;
  options: V2Option[];
  correctIds: string[];
  explanation: string;
};

export type V2Hand = {
  id: string;
  familyId: string;
  version: 1;
  kind: "base" | "twin";
  baseId?: string;
  changedFact?: string;
  leak: LeakTag;
  module: string;
  title: string;
  objective: string;
  cue: string;
  street: string;
  pot: string;
  effective: string;
  heroPosition: string;
  opponentPosition: string;
  hero: string[];
  board: string[];
  decisionNow: string;
  decisionFact: string;
  history: { street: string; actions: string[] }[];
  rangeBuckets: { label: string; detail: string }[];
  range: V2Question;
  plan: V2Question;
  action: V2Question;
  baseline: string;
  exploit?: string;
  reversal: string;
  sourceNote: string;
};

const sourceNote = "Authored teaching example · external expert and solver review pending";

const options = {
  onePair: [
    { id: "pair", label: "Mostly one-pair hands" },
    { id: "miss", label: "Mostly hands with no pair" },
    { id: "strong", label: "Mostly two pair or better" },
  ],
  ceiling: [
    { id: "discounted", label: "Very strong hands are less common, but possible" },
    { id: "present", label: "Very strong hands still fit naturally" },
    { id: "gone", label: "Very strong hands are impossible" },
  ],
  plan: [
    { id: "value", label: "Bet so a weaker hand calls" },
    { id: "bluff", label: "Bet so a better hand folds" },
    { id: "showdown", label: "Check and keep my chance to win" },
  ],
};

const base = (hand: Omit<V2Hand, "version" | "sourceNote">): V2Hand => ({ ...hand, version: 1, sourceNote });

export const v2Hands: V2Hand[] = [
  base({
    id: "value-river-aq", familyId: "weaker-callers-1", kind: "base", leak: "weaker-callers", module: "Value targets", title: "Top pair on a paired river", objective: "Name the weaker hands that pay a value bet.", cue: "Before value betting, name the weaker hands that can call.",
    street: "River", pot: "$61", effective: "$590 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♠", "Q♦"], board: ["Q♣", "7♥", "3♣", "2♠", "2♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Opponent called the flop, then checked the turn and river.",
    history: [{ street: "Preflop", actions: ["You raise to $12. Opponent calls."] }, { street: "Flop · Q♣ 7♥ 3♣", actions: ["Opponent checks. You bet $18. Opponent calls."] }, { street: "Turn · 2♠", actions: ["Opponent checks. You check."] }, { street: "River · 2♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "A weaker queen, a seven, or a pocket pair" }, { label: "Sometimes", detail: "A missed club draw" }, { label: "Still possible", detail: "Three of a kind or a full house" }],
    range: { prompt: "What does the opponent have most often?", options: options.onePair, correctIds: ["pair"], explanation: "The flop call keeps many one-pair hands in the range. Strong hands remain possible, but they are not the largest group." },
    plan: { prompt: "What is your bet trying to accomplish?", options: options.plan, correctIds: ["value"], explanation: "Ace-queen beats weaker queens, sevens, and pocket pairs. A bet is for value when enough of those hands call." },
    action: { prompt: "Which action fits that plan?", options: [{ id: "check", label: "Check" }, { id: "small", label: "Bet $20" }, { id: "medium", label: "Bet $40" }, { id: "large", label: "Bet $75" }], correctIds: ["small", "medium"], explanation: "$20 and $40 are both defensible value sizes. The important skill is targeting weaker callers; no unique size is solver-verified here." },
    baseline: "Bet for value with a size that weaker queens and pairs will still call.", reversal: "Check more often if this opponent reaches the river with very few weaker pairs or raises river bets aggressively."
  }),
  base({
    id: "value-river-a5-twin", familyId: "weaker-callers-1", kind: "twin", baseId: "value-river-aq", changedFact: "Only your cards changed: A♠Q♦ became A♠5♦.", leak: "weaker-callers", module: "Value targets", title: "Same line, different hand", objective: "Notice when the same opponent range no longer supports value.", cue: "The opponent's range can stay the same while your hand changes the job.",
    street: "River", pot: "$61", effective: "$590 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♠", "5♦"], board: ["Q♣", "7♥", "3♣", "2♠", "2♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Same actions as the previous hand; only your cards changed.",
    history: [{ street: "Preflop", actions: ["You raise to $12. Opponent calls."] }, { street: "Flop · Q♣ 7♥ 3♣", actions: ["Opponent checks. You bet $18. Opponent calls."] }, { street: "Turn · 2♠", actions: ["Opponent checks. You check."] }, { street: "River · 2♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed clubs" }, { label: "Still possible", detail: "Strong made hands" }],
    range: { prompt: "Did the opponent's likely hands change?", options: [{ id: "same", label: "No—their range is still one-pair-heavy" }, { id: "weaker", label: "Yes—my weaker hand makes their range weaker" }, { id: "stronger", label: "Yes—they now mostly have strong hands" }], correctIds: ["same"], explanation: "Your private cards changed, not the opponent's actions. Their likely range stays about the same." },
    plan: { prompt: "What can ace-high do against that range?", options: [{ id: "value", label: "Value bet because worse pairs call" }, { id: "showdown", label: "Check and beat some missed hands" }, { id: "always-bluff", label: "Always bluff because I cannot win" }], correctIds: ["showdown"], explanation: "Ace-high loses to pairs but can beat missed draws. Checking keeps that chance to win." },
    action: { prompt: "Which action fits the baseline?", options: [{ id: "check", label: "Check" }, { id: "bet", label: "Bet $40 for value" }, { id: "overbet", label: "Overbet without a player read" }], correctIds: ["check"], explanation: "Without evidence that better pairs fold too often, checking is the sound baseline." },
    baseline: "Check and keep your chance to beat missed hands.", exploit: "A bluff can become reasonable only after naming better pairs that this opponent folds too often.", reversal: "Bluff more often with strong evidence that one-pair hands fold; do not call it a value bet."
  }),

  base({
    id: "thin-value-kq", familyId: "weaker-callers-2", kind: "base", leak: "weaker-callers", module: "Thin value", title: "Top pair after two checks", objective: "Separate a value target from hands that fold.", cue: "A bigger value bet wins more when called, but can lose the weaker calls you need.",
    street: "River", pot: "$84", effective: "$430 behind", heroPosition: "Cutoff · acts last", opponentPosition: "Big Blind", hero: ["K♠", "Q♥"], board: ["K♦", "9♣", "4♠", "3♥", "7♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Opponent called a small flop bet; both players checked the turn.",
    history: [{ street: "Preflop", actions: ["You raise to $15. Opponent calls."] }, { street: "Flop · K♦ 9♣ 4♠", actions: ["Opponent checks. You bet $20. Opponent calls."] }, { street: "Turn · 3♥", actions: ["Opponent checks. You check."] }, { street: "River · 7♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "A king, a nine, or a pocket pair" }, { label: "Sometimes", detail: "A missed straight draw" }, { label: "Still possible", detail: "Two pair or a set" }],
    range: { prompt: "Which group is largest?", options: options.onePair, correctIds: ["pair"], explanation: "One-pair hands naturally call the flop and check later streets." },
    plan: { prompt: "Which weaker hands are the value target?", options: [{ id: "worse", label: "Weaker kings, nines, and pocket pairs" }, { id: "miss", label: "Only missed draws" }, { id: "strong", label: "Two pair and sets" }], correctIds: ["worse"], explanation: "The value comes from weaker made hands calling, not from missed draws or stronger hands." },
    action: { prompt: "Which action keeps that target in?", options: [{ id: "check", label: "Check" }, { id: "small", label: "Bet about one-third pot" }, { id: "pot", label: "Bet the full pot" }], correctIds: ["small"], explanation: "A smaller value bet is a defensible way to keep weaker pairs calling. Exact sizing is unverified." },
    baseline: "Make a smaller value bet aimed at weaker one-pair hands.", reversal: "Check more if the opponent rarely calls river bets with worse pairs; bet larger only with evidence those same hands pay larger sizes."
  }),
  base({
    id: "thin-value-kq-twin", familyId: "weaker-callers-2", kind: "twin", baseId: "thin-value-kq", changedFact: "Only the opponent clue changed: this player folds one-pair hands to river bets very often.", leak: "weaker-callers", module: "Thin value", title: "Same hand, fewer callers", objective: "Adjust value betting when weaker hands stop calling.", cue: "Value needs calls from worse—not just a strong-looking hand.",
    street: "River", pot: "$84", effective: "$430 behind", heroPosition: "Cutoff · acts last", opponentPosition: "Big Blind", hero: ["K♠", "Q♥"], board: ["K♦", "9♣", "4♠", "3♥", "7♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Observed: folded one pair in 5 of 6 similar river spots. Small sample, not proof.",
    history: [{ street: "Preflop", actions: ["You raise to $15. Opponent calls."] }, { street: "Flop · K♦ 9♣ 4♠", actions: ["Opponent checks. You bet $20. Opponent calls."] }, { street: "Turn · 3♥", actions: ["Both players check."] }, { street: "River · 7♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed draws" }, { label: "Still possible", detail: "Strong made hands" }],
    range: { prompt: "Does the read change which hands reached the river?", options: [{ id: "mostly-no", label: "Not much—the actions still define the starting range" }, { id: "none", label: "Yes—one-pair hands are now impossible" }, { id: "nuts", label: "Yes—the opponent now has only strong hands" }], correctIds: ["mostly-no"], explanation: "The read changes expected responses to a bet. It does not rewrite the factual line." },
    plan: { prompt: "What becomes less reliable?", options: [{ id: "value", label: "Getting called by weaker one-pair hands" }, { id: "strength", label: "Knowing that top pair beats a nine" }, { id: "position", label: "Acting last" }], correctIds: ["value"], explanation: "If weaker pairs fold too much, the thin-value target pays less often." },
    action: { prompt: "What is the disciplined adjustment?", options: [{ id: "check", label: "Check more often" }, { id: "huge", label: "Always bet bigger for value" }, { id: "same", label: "Ignore the clue" }], correctIds: ["check"], explanation: "Checking more is reasonable when the weaker hands needed for value do not call often enough." },
    baseline: "Value bet against an unknown opponent.", exploit: "Against a demonstrated overfolder, check this thin value hand more often.", reversal: "Return toward betting if the sample grows and shows weaker pairs actually call."
  }),

  base({
    id: "showdown-bluff-a5", familyId: "bluffs-showdown-1", kind: "base", leak: "bluffs-showdown", module: "Bluff targets", title: "Ace-high on the river", objective: "Do not bluff the hands you already beat.", cue: "A bluff needs a better hand to fold. Missed hands you beat are not the target.",
    street: "River", pot: "$92", effective: "$940 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♣", "5♣"], board: ["K♦", "8♣", "3♠", "2♥", "Q♠"], decisionNow: "Opponent checks. You act now.", decisionFact: "Opponent called the flop, then checked the turn and river.",
    history: [{ street: "Preflop", actions: ["You raise to $20. Opponent calls."] }, { street: "Flop · K♦ 8♣ 3♠", actions: ["Opponent checks. You bet $25. Opponent calls."] }, { street: "Turn · 2♥", actions: ["Both players check."] }, { street: "River · Q♠", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "A king, an eight, or pocket nines through jacks" }, { label: "Sometimes", detail: "Missed hands" }, { label: "Still possible", detail: "Two pair or three of a kind" }],
    range: { prompt: "What does the opponent have most often?", options: options.onePair, correctIds: ["pair"], explanation: "One-pair hands are a reasonable center, but the checks do not prove strong hands are gone." },
    plan: { prompt: "If you bet, which hands must fold?", options: [{ id: "pairs", label: "Better one-pair hands" }, { id: "misses", label: "Missed hands that ace-high already beats" }, { id: "monsters", label: "Only two pair or better" }], correctIds: ["pairs"], explanation: "Ace-high already beats many missed hands. A profitable bluff must fold enough better pairs." },
    action: { prompt: "Without a reliable folding read, what is the baseline?", options: [{ id: "check", label: "Check" }, { id: "small", label: "Bluff small" }, { id: "overbet", label: "Overbet" }], correctIds: ["check"], explanation: "Checking preserves the chance to beat missed hands. A bluff needs additional evidence that better pairs fold." },
    baseline: "Check ace-high without a reliable read.", exploit: "A large bluff may be reasonable against a proven river overfolder, but exact size and combo are unverified.", reversal: "Bluff only after naming the better one-pair hands that fold and the evidence supporting that response."
  }),
  base({
    id: "showdown-bluff-six-high-twin", familyId: "bluffs-showdown-1", kind: "twin", baseId: "showdown-bluff-a5", changedFact: "Only your cards changed: ace-high became six-high, so checking wins less often.", leak: "bluffs-showdown", module: "Bluff targets", title: "Same line, less showdown value", objective: "Recognize when a hand becomes a better bluff candidate.", cue: "Bluff candidates often come from hands that rarely win by checking.",
    street: "River", pot: "$92", effective: "$940 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["6♣", "5♣"], board: ["K♦", "8♣", "3♠", "2♥", "Q♠"], decisionNow: "Opponent checks. You act now.", decisionFact: "Same actions; only your private cards changed.",
    history: [{ street: "Preflop", actions: ["You raise to $20. Opponent calls."] }, { street: "Flop · K♦ 8♣ 3♠", actions: ["Opponent checks. You bet $25. Opponent calls."] }, { street: "Turn · 2♥", actions: ["Both players check."] }, { street: "River · Q♠", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed hands" }, { label: "Still possible", detail: "Very strong hands" }],
    range: { prompt: "What stayed the same?", options: [{ id: "range", label: "The opponent's likely range" }, { id: "showdown", label: "How often my hand wins at showdown" }, { id: "cards", label: "My private cards" }], correctIds: ["range"], explanation: "The opponent took the same actions, so their range does not change because your cards changed." },
    plan: { prompt: "Why is six-high a more natural bluff candidate?", options: [{ id: "rarely-wins", label: "It rarely wins by checking" }, { id: "value", label: "Many worse hands call" }, { id: "nuts", label: "It is the strongest hand" }], correctIds: ["rarely-wins"], explanation: "Unlike ace-high, six-high has very little chance to win at showdown." },
    action: { prompt: "What still must be true before bluffing?", options: [{ id: "fold", label: "Enough better one-pair hands must fold" }, { id: "miss", label: "Missed hands must fold" }, { id: "automatic", label: "Nothing—six-high must always bluff" }], correctIds: ["fold"], explanation: "Being a better bluff candidate is not enough. The opponent still needs to fold better hands often enough." },
    baseline: "Six-high is a more natural bluff candidate than ace-high, but checking can still be correct.", reversal: "Bluff less against opponents who call pairs; bluff more only with credible fold evidence."
  }),

  base({
    id: "strong-remains-turn", familyId: "removes-strength-1", kind: "base", leak: "removes-strength", module: "Range ceiling", title: "Overpair on a connected turn", objective: "Keep very strong hands in the range when the line allows them.", cue: "Uncapped means the strongest hands remain possible—not that the opponent is ahead overall.",
    street: "Turn", pot: "$450", effective: "$1,180 behind", heroPosition: "Small Blind · acts first", opponentPosition: "Button", hero: ["Q♠", "Q♦"], board: ["J♠", "7♦", "6♣", "T♥"], decisionNow: "You act first on the turn.", decisionFact: "Opponent cold-called a re-raise before the flop and called the flop.",
    history: [{ street: "Preflop", actions: ["UTG raises $35. You re-raise to $120. Button calls. UTG folds."] }, { street: "Flop · J♠ 7♦ 6♣", actions: ["You bet $80. Opponent calls."] }, { street: "Turn · T♥", actions: ["Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands and draws" }, { label: "Sometimes", detail: "Two pair and three of a kind" }, { label: "Still possible", detail: "A straight and slow-played premium pairs" }],
    range: { prompt: "Can the opponent still have very strong hands?", options: options.ceiling, correctIds: ["present"], explanation: "Straights, two pair, sets, and some slow-played premium pairs still fit. Coaches call this uncapped." },
    plan: { prompt: "What does that mean for your queens?", options: [{ id: "ahead-some", label: "Often ahead, but not ready to play for stacks automatically" }, { id: "always-behind", label: "Always behind because the range is uncapped" }, { id: "nuts", label: "Effectively unbeatable" }], correctIds: ["ahead-some"], explanation: "An uncapped range can still be mostly medium-strength hands. Range ceiling and average strength are different." },
    action: { prompt: "Which plans are defensible?", options: [{ id: "check", label: "Check and control the pot" }, { id: "small", label: "Bet small with a plan versus a raise" }, { id: "overbet", label: "Overbet and stack off automatically" }], correctIds: ["check", "small"], explanation: "Checking and a small value/protection bet are both defensible. An overbet needs much stronger support." },
    baseline: "Check or bet small, and decide in advance how to respond to a raise.", reversal: "Bet more confidently when weaker hands call often and raises are honest; check more when the opponent pressures capped ranges aggressively."
  }),
  base({
    id: "strong-discounted-turn-twin", familyId: "removes-strength-1", kind: "twin", baseId: "strong-remains-turn", changedFact: "Only the flop action changed: the opponent called a large check-raise instead of a small continuation bet.", leak: "removes-strength", module: "Range ceiling", title: "Same board, stronger action", objective: "Update the top of the range when one action changes.", cue: "Actions change weights. They rarely prove a hand impossible.",
    street: "Turn", pot: "$690", effective: "$940 behind", heroPosition: "Small Blind · acts first", opponentPosition: "Button", hero: ["Q♠", "Q♦"], board: ["J♠", "7♦", "6♣", "T♥"], decisionNow: "You act first on the turn.", decisionFact: "Opponent called your large flop check-raise.",
    history: [{ street: "Preflop", actions: ["UTG raises. You re-raise. Button calls. UTG folds."] }, { street: "Flop · J♠ 7♦ 6♣", actions: ["You check. Opponent bets. You raise large. Opponent calls."] }, { street: "Turn · T♥", actions: ["Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Strong one-pair hands and robust draws" }, { label: "Sometimes", detail: "Two pair and sets" }, { label: "Still possible", detail: "The strongest made hands" }],
    range: { prompt: "What did the large flop call do?", options: [{ id: "strengthen", label: "Shift more weight toward strong hands and strong draws" }, { id: "remove", label: "Remove every strong hand" }, { id: "nothing", label: "Change nothing" }], correctIds: ["strengthen"], explanation: "Calling a large raise is stronger evidence than calling a small bet, although weaker hands can remain." },
    plan: { prompt: "How should queens respond to that shift?", options: [{ id: "caution", label: "Use more pot control and avoid automatic stack-off" }, { id: "blast", label: "Bet bigger because the opponent looks strong" }, { id: "fold-always", label: "Fold immediately without facing a bet" }], correctIds: ["caution"], explanation: "Queens can still lead some hands, but the stronger range makes automatic aggression less attractive." },
    action: { prompt: "Which action best fits that adjustment?", options: [{ id: "check", label: "Check" }, { id: "small", label: "Bet small" }, { id: "jam", label: "Move all in" }], correctIds: ["check"], explanation: "Checking is the clearer controlled baseline in this authored example. Exact frequencies require solver review." },
    baseline: "Check more often after the stronger flop action.", reversal: "Bet more if the opponent reaches this point with many weaker one-pair hands and passive draws."
  }),

  base({
    id: "passive-not-proof", familyId: "removes-strength-2", kind: "base", leak: "removes-strength", module: "Range evidence", title: "Three checks out of position", objective: "Do not turn checking into proof of weakness.", cue: "Out-of-position checks are normal. Use the whole line, not the check count.",
    street: "River", pot: "$110", effective: "$520 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["K♣", "J♣"], board: ["K♥", "8♦", "4♠", "6♣", "2♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Opponent checked every street but called your flop bet.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · K♥ 8♦ 4♠", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 6♣", actions: ["Both players check."] }, { street: "River · 2♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed hands" }, { label: "Still possible", detail: "Strong hands played passively" }],
    range: { prompt: "What do the checks prove?", options: [{ id: "weight", label: "They may change the weights, but prove no exact hand" }, { id: "weak", label: "They prove the opponent is weak" }, { id: "nuts", label: "They prove a trap" }], correctIds: ["weight"], explanation: "The Big Blind is out of position and often checks to the raiser. Strong hands are less common in some strategies, not impossible." },
    plan: { prompt: "What is king-jack trying to do?", options: options.plan, correctIds: ["value"], explanation: "Weaker kings, eights, and pocket pairs may call a sensible value size." },
    action: { prompt: "Which action is defensible?", options: [{ id: "small", label: "Bet a modest size" }, { id: "jam", label: "Move all in because checks prove weakness" }, { id: "fold", label: "Fold even though no bet faces you" }], correctIds: ["small"], explanation: "A modest value bet targets weaker pairs without assuming the opponent can never be strong." },
    baseline: "Value bet modestly while keeping strong hands possible.", reversal: "Check more against opponents who check-raise rivers often or reach the river with very few weaker calls."
  }),
  base({
    id: "passive-bet-twin", familyId: "removes-strength-2", kind: "twin", baseId: "passive-not-proof", changedFact: "Only the river action changed: the opponent bets three-quarters pot instead of checking.", leak: "removes-strength", module: "Range evidence", title: "Same line, river bet", objective: "Let a new action update the range.", cue: "A new action should update the range before you decide.",
    street: "River", pot: "$192 after the bet", effective: "$438 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["K♣", "J♣"], board: ["K♥", "8♦", "4♠", "6♣", "2♦"], decisionNow: "Opponent bets $82 into $110. You act now.", decisionFact: "Same earlier line; the river check became a large bet.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · K♥ 8♦ 4♠", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 6♣", actions: ["Both players check."] }, { street: "River · 2♦", actions: ["Opponent bets $82. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Value hands and some bluffs" }, { label: "Sometimes", detail: "Weaker kings turned into value" }, { label: "Still possible", detail: "Two pair and sets" }],
    range: { prompt: "How should the river bet change your estimate?", options: [{ id: "stronger", label: "Shift weight toward value and credible bluffs" }, { id: "same", label: "Ignore it because the earlier checks matter more" }, { id: "only-bluff", label: "Assume it is always a bluff" }], correctIds: ["stronger"], explanation: "The large river bet is new evidence and should update the range." },
    plan: { prompt: "What role does king-jack have now?", options: [{ id: "catch", label: "A bluff-catcher: it beats bluffs but loses to stronger value" }, { id: "value", label: "A clear value raise" }, { id: "nuts", label: "The strongest possible hand" }], correctIds: ["catch"], explanation: "King-jack can beat bluffs and some thin value, but it does poorly against stronger made hands." },
    action: { prompt: "What information is missing for a confident call?", options: [{ id: "freq", label: "How often this opponent bluffs this size" }, { id: "position", label: "Which seat is the Button" }, { id: "suits", label: "The color of the chips" }], correctIds: ["freq"], explanation: "A bluff-catcher decision depends on the price and the opponent's bluff frequency; this example does not claim a unique action." },
    baseline: "Treat the hand as a bluff-catcher and compare price with plausible bluffs.", reversal: "Call more with strong bluff evidence; fold more against value-heavy river bettors."
  }),

  base({
    id: "draw-good-price", familyId: "call-price-1", kind: "base", leak: "call-price", module: "Call price", title: "Strong draw facing a small bet", objective: "Compare call cost with ways to improve.", cue: "Facing a bet: price first, then clean ways to win or improve.",
    street: "Turn", pot: "10.2 BB after the bet", effective: "54 BB behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["Q♣", "J♣"], board: ["A♠", "7♦", "2♣", "K♣"], decisionNow: "Opponent bets 2.4 BB. Calling costs 2.4 BB.", decisionFact: "Pot before bet: 7.8 BB. You have a club draw and an inside straight draw.",
    history: [{ street: "Preflop", actions: ["You raise to 2.5 BB. Opponent calls."] }, { street: "Flop · A♠ 7♦ 2♣", actions: ["Both players check."] }, { street: "Turn · K♣", actions: ["Opponent bets 2.4 BB into 7.8 BB. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Pairs, draws, and some bluffs" }, { label: "Sometimes", detail: "Two pair" }, { label: "Still possible", detail: "Three of a kind" }],
    range: { prompt: "What can the small bet contain?", options: [{ id: "mix", label: "A mix of pairs, draws, bluffs, and some strong hands" }, { id: "weak", label: "Only weak hands" }, { id: "strong", label: "Only very strong hands" }], correctIds: ["mix"], explanation: "A small size can come from many hand strengths. Size alone does not prove weakness." },
    plan: { prompt: "Why can calling be reasonable?", options: [{ id: "price", label: "The price is small and many river cards improve me" }, { id: "position", label: "Position makes the call free" }, { id: "always", label: "A draw must always call" }], correctIds: ["price"], explanation: "Calling 2.4 BB to contest 10.2 BB needs about 19% equity before future action. The combined draw makes continuing plausible, though some outs may be dirty." },
    action: { prompt: "Which baseline fits the price?", options: [{ id: "call", label: "Call" }, { id: "fold", label: "Fold" }, { id: "raise", label: "Raise without a fold or value plan" }], correctIds: ["call"], explanation: "Calling is the authored baseline. Exact tournament advice requires payout and stack context." },
    baseline: "Call the small bet with the combined draw.", reversal: "Fold more when the price grows, outs are often dirty, or tournament payout pressure is material."
  }),
  base({
    id: "draw-bad-price-twin", familyId: "call-price-1", kind: "twin", baseId: "draw-good-price", changedFact: "Only the bet size changed: 2.4 BB became 9 BB.", leak: "call-price", module: "Call price", title: "Same draw, much larger bet", objective: "Let price change the decision.", cue: "The same cards can call one size and fold to another.",
    street: "Turn", pot: "16.8 BB after the bet", effective: "47 BB behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["Q♣", "J♣"], board: ["A♠", "7♦", "2♣", "K♣"], decisionNow: "Opponent bets 9 BB. Calling costs 9 BB.", decisionFact: "Pot before bet: 7.8 BB. Same hand and board; only the bet grew.",
    history: [{ street: "Preflop", actions: ["You raise to 2.5 BB. Opponent calls."] }, { street: "Flop · A♠ 7♦ 2♣", actions: ["Both players check."] }, { street: "Turn · K♣", actions: ["Opponent bets 9 BB into 7.8 BB. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Stronger value and robust draws" }, { label: "Sometimes", detail: "Pressure bluffs" }, { label: "Still possible", detail: "Very strong hands" }],
    range: { prompt: "What changed strategically?", options: [{ id: "price", label: "The call price and likely range weights" }, { id: "cards", label: "My cards and the board" }, { id: "position", label: "Who acts last" }], correctIds: ["price"], explanation: "The larger size gives a worse price and often shifts the range toward stronger hands and selected bluffs." },
    plan: { prompt: "What must justify a call now?", options: [{ id: "enough", label: "Enough clean winning chances for the higher price" }, { id: "draw", label: "Simply having any draw" }, { id: "curiosity", label: "Wanting to see the river" }], correctIds: ["enough"], explanation: "The higher cost needs much more equity. A draw label alone is not enough." },
    action: { prompt: "Which baseline fits the authored assumptions?", options: [{ id: "fold", label: "Fold" }, { id: "call", label: "Call because the cards are unchanged" }, { id: "jam", label: "Move all in automatically" }], correctIds: ["fold"], explanation: "Folding is the conservative authored baseline. Exact strategy depends on clean outs and the betting range." },
    baseline: "Fold more often to the much larger bet.", reversal: "Continue if reliable range work shows more clean equity or strong implied value than this example assumes."
  }),

  base({
    id: "river-catch-price", familyId: "call-price-2", kind: "base", leak: "call-price", module: "Bluff-catching", title: "One pair facing a small river bet", objective: "Use both price and plausible bluffs.", cue: "A bluff-catcher wins against bluffs, not value. Price tells you how often that must happen.",
    street: "River", pot: "$150 after the bet", effective: "$360 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♣", "9♠"], board: ["A♦", "J♣", "6♥", "4♠", "T♣"], decisionNow: "Opponent bets $30 into $120. Calling costs $30.", decisionFact: "Opponent called the flop, checked the turn, then led small on the river.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♦ J♣ 6♥", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 4♠", actions: ["Both players check."] }, { street: "River · T♣", actions: ["Opponent bets $30. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair value and some bluffs" }, { label: "Sometimes", detail: "Two pair" }, { label: "Still possible", detail: "Three of a kind" }],
    range: { prompt: "What kind of hand is ace-nine now?", options: [{ id: "catch", label: "A bluff-catcher" }, { id: "nuts", label: "The strongest possible hand" }, { id: "air", label: "A hand with no pair" }], correctIds: ["catch"], explanation: "Ace-nine beats bluffs but can lose to stronger value bets." },
    plan: { prompt: "What two things matter for calling?", options: [{ id: "price-bluffs", label: "The call price and how many bluffs are plausible" }, { id: "cards-only", label: "Only the rank of my ace" }, { id: "emotion", label: "Whether folding feels weak" }], correctIds: ["price-bluffs"], explanation: "The small bet offers a good price, but the opponent still needs enough bluffs or thin value you beat." },
    action: { prompt: "Which authored baseline is defensible?", options: [{ id: "call", label: "Call" }, { id: "raise", label: "Raise for value" }, { id: "fold-always", label: "Always fold one pair" }], correctIds: ["call"], explanation: "Calling is defensible at this price against a range containing enough bluffs. It is not universally correct." },
    baseline: "Call the small bet when plausible bluffs support the price.", reversal: "Fold even to a small bet against opponents whose river leads are overwhelmingly value."
  }),
  base({
    id: "river-catch-large-twin", familyId: "call-price-2", kind: "twin", baseId: "river-catch-price", changedFact: "Only the river bet changed: $30 became $120.", leak: "call-price", module: "Bluff-catching", title: "Same pair, pot-sized river bet", objective: "Make the required bluff frequency visible.", cue: "A larger bet demands more bluffs before a bluff-catcher can call.",
    street: "River", pot: "$240 after the bet", effective: "$270 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♣", "9♠"], board: ["A♦", "J♣", "6♥", "4♠", "T♣"], decisionNow: "Opponent bets $120 into $120. Calling costs $120.", decisionFact: "Same hand and line; only the river bet is larger.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♦ J♣ 6♥", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 4♠", actions: ["Both players check."] }, { street: "River · T♣", actions: ["Opponent bets $120. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Polarized value and bluffs" }, { label: "Sometimes", detail: "Thin value" }, { label: "Still possible", detail: "The strongest hands" }],
    range: { prompt: "What does the larger size change?", options: [{ id: "price", label: "The price and the range needed to support a call" }, { id: "nothing", label: "Nothing; one pair is one pair" }, { id: "automatic", label: "It proves a bluff" }], correctIds: ["price"], explanation: "Calling a pot-sized bet needs the opponent to bluff much more often than calling the small bet." },
    plan: { prompt: "What must you estimate?", options: [{ id: "bluffs", label: "Whether at least about one-third of the betting range is bluffing" }, { id: "wins", label: "Whether you sometimes win" }, { id: "ego", label: "Whether folding looks cautious" }], correctIds: ["bluffs"], explanation: "Against a pot-sized bet, a call needs about 33% equity. That is a high burden for a bluff-catcher." },
    action: { prompt: "Without a strong bluff read, what is the baseline?", options: [{ id: "fold", label: "Fold" }, { id: "call", label: "Call because the first hand called" }, { id: "raise", label: "Raise" }], correctIds: ["fold"], explanation: "Folding is the disciplined baseline without enough evidence of bluffs." },
    baseline: "Fold the bluff-catcher to the large bet without a strong bluff read.", reversal: "Call when reliable evidence supports enough bluffs for the offered price."
  }),

  base({
    id: "plan-value-action", familyId: "plan-action-1", kind: "base", leak: "plan-action", module: "Plan → action", title: "Top pair with clear callers", objective: "Make the action perform the stated job.", cue: "After naming the job, check that the action actually does it.",
    street: "River", pot: "$72", effective: "$410 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["K♦", "T♦"], board: ["K♣", "8♥", "5♠", "3♦", "3♣"], decisionNow: "Opponent checks. You act now.", decisionFact: "Opponent called a small flop bet and checked twice.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · K♣ 8♥ 5♠", actions: ["Opponent checks. You bet small. Opponent calls."] }, { street: "Turn · 3♦", actions: ["Both players check."] }, { street: "River · 3♣", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Weaker kings, eights, and pocket pairs" }, { label: "Sometimes", detail: "Missed draws" }, { label: "Still possible", detail: "Three of a kind or better" }],
    range: { prompt: "What is the largest group?", options: options.onePair, correctIds: ["pair"], explanation: "The line contains many one-pair hands that king-ten beats." },
    plan: { prompt: "Choose the job.", options: options.plan, correctIds: ["value"], explanation: "A value bet aims to get paid by weaker kings and other pairs." },
    action: { prompt: "Which action performs that job?", options: [{ id: "bet", label: "Bet a modest size" }, { id: "check", label: "Check automatically" }, { id: "fold", label: "Fold" }], correctIds: ["bet"], explanation: "A modest bet gives weaker pairs a chance to call. Checking contradicts the selected value plan unless the caller assumption changes." },
    baseline: "Bet a modest size for value.", reversal: "Check if weaker pairs rarely call or the opponent check-raises too aggressively."
  }),
  base({
    id: "plan-value-action-twin", familyId: "plan-action-1", kind: "twin", baseId: "plan-value-action", changedFact: "Only your hand changed: top pair became ace-high.", leak: "plan-action", module: "Plan → action", title: "Same range, different job", objective: "Change the plan before changing the action.", cue: "Same opponent range, different hand: rebuild the plan.",
    street: "River", pot: "$72", effective: "$410 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♦", "T♦"], board: ["K♣", "8♥", "5♠", "3♦", "3♣"], decisionNow: "Opponent checks. You act now.", decisionFact: "Same actions; only your private cards changed.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · K♣ 8♥ 5♠", actions: ["Opponent checks. You bet small. Opponent calls."] }, { street: "Turn · 3♦", actions: ["Both players check."] }, { street: "River · 3♣", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed draws" }, { label: "Still possible", detail: "Strong made hands" }],
    range: { prompt: "What did not change?", options: [{ id: "range", label: "The opponent's likely range" }, { id: "hero", label: "Your hand strength" }, { id: "job", label: "The best plan" }], correctIds: ["range"], explanation: "The opponent took the same actions. Your different cards change how your hand performs, not their range." },
    plan: { prompt: "What is the sound baseline job?", options: options.plan, correctIds: ["showdown"], explanation: "Ace-high can beat misses but loses to pairs. Without fold evidence, checking is coherent." },
    action: { prompt: "Which action matches that job?", options: [{ id: "check", label: "Check" }, { id: "value", label: "Bet for value" }, { id: "bluff", label: "Bluff without identifying a folding target" }], correctIds: ["check"], explanation: "Checking performs the selected showdown plan." },
    baseline: "Check ace-high.", reversal: "Bluff only if better one-pair hands fold often enough; then label the plan as a bluff."
  }),

  base({
    id: "plan-bluff-size", familyId: "plan-action-2", kind: "base", leak: "plan-action", module: "Plan → size", title: "River bluff with a named target", objective: "Choose a size that fits the target and uncertainty.", cue: "A bluff size is not 'more correct' just because it is bigger.",
    street: "River", pot: "$100", effective: "$800 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["6♠", "5♠"], board: ["A♦", "9♣", "4♥", "2♣", "K♠"], decisionNow: "Opponent checks. You act now.", decisionFact: "Opponent called the flop, then checked the turn and river. Read: folds medium pairs to large river bets more than expected (6 observed hands).",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♦ 9♣ 4♥", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 2♣", actions: ["Both players check."] }, { street: "River · K♠", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Aces, nines, and pocket pairs" }, { label: "Sometimes", detail: "Missed draws" }, { label: "Still possible", detail: "Two pair and sets" }],
    range: { prompt: "Which group must the bluff target?", options: [{ id: "pairs", label: "Better one-pair hands" }, { id: "misses", label: "Worse missed hands" }, { id: "nuts", label: "Only the strongest hands" }], correctIds: ["pairs"], explanation: "Six-high rarely wins by checking. The useful target is a better one-pair hand that can fold." },
    plan: { prompt: "What job did you choose?", options: options.plan, correctIds: ["bluff"], explanation: "This is a bluff, conditional on the observed folding tendency." },
    action: { prompt: "Which actions are coherent with that plan?", options: [{ id: "check", label: "Check and abandon" }, { id: "large", label: "Bet a large, pressure-oriented size" }, { id: "tiny", label: "Bet tiny for value" }], correctIds: ["check", "large"], explanation: "A large bluff is coherent with the read; checking is also disciplined because the evidence is limited. A tiny value bet contradicts the plan." },
    baseline: "Check without a reliable read; with this limited read, a large bluff is plausible.", exploit: "The read changes the action mix, not the factual range construction.", reversal: "Abandon the bluff when this opponent calls one-pair hands or the sample is unreliable."
  }),
  base({
    id: "plan-bluff-size-twin", familyId: "plan-action-2", kind: "twin", baseId: "plan-bluff-size", changedFact: "Only the observed tendency changed: this opponent calls river bets with one pair too often.", leak: "plan-action", module: "Plan → size", title: "Same bluff, wrong audience", objective: "Let a response tendency change the plan.", cue: "A bluff is only a plan when better hands actually fold.",
    street: "River", pot: "$100", effective: "$800 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["6♠", "5♠"], board: ["A♦", "9♣", "4♥", "2♣", "K♠"], decisionNow: "Opponent checks. You act now.", decisionFact: "Observed: called 5 of 6 similar large river bets with one pair. Small sample, not proof.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♦ 9♣ 4♥", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 2♣", actions: ["Both players check."] }, { street: "River · K♠", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed hands" }, { label: "Still possible", detail: "Strong made hands" }],
    range: { prompt: "What did the read change?", options: [{ id: "response", label: "How often one-pair hands are expected to fold" }, { id: "history", label: "The cards and actions already dealt" }, { id: "certainty", label: "It makes the answer certain" }], correctIds: ["response"], explanation: "The observed calls change the expected response, not the factual hand history." },
    plan: { prompt: "Which job is least supported now?", options: [{ id: "bluff", label: "Bluffing to fold one pair" }, { id: "check", label: "Checking and giving up" }, { id: "study", label: "Updating the read with more evidence" }], correctIds: ["bluff"], explanation: "A target that calls too often is a poor bluff target." },
    action: { prompt: "Which action fits?", options: [{ id: "check", label: "Check" }, { id: "large", label: "Bet large because the first hand did" }, { id: "tiny", label: "Bet tiny without a value target" }], correctIds: ["check"], explanation: "Checking is coherent when better hands are not expected to fold." },
    baseline: "Check and give up.", reversal: "Bluff only after stronger evidence that better one-pair hands fold."
  }),

  base({
    id: "read-small-sample", familyId: "read-as-fact-1", kind: "base", leak: "read-as-fact", module: "Reads and evidence", title: "Three folds in four hands", objective: "Use a read without turning it into certainty.", cue: "A read changes frequencies. It does not prove a hand or an action.",
    street: "River", pot: "$96", effective: "$610 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["J♠", "T♠"], board: ["A♣", "8♦", "5♥", "3♣", "K♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Observed: folded to 3 of 4 large river bets in roughly similar spots.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♣ 8♦ 5♥", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 3♣", actions: ["Both players check."] }, { street: "River · K♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed draws" }, { label: "Still possible", detail: "Strong hands" }],
    range: { prompt: "What does the 3-of-4 sample tell you?", options: [{ id: "evidence", label: "Useful evidence with low confidence" }, { id: "proof", label: "Proof the opponent always folds" }, { id: "range", label: "Proof the opponent has one pair" }], correctIds: ["evidence"], explanation: "Four hands can justify a tentative adjustment, not certainty." },
    plan: { prompt: "How should the read affect a bluff?", options: [{ id: "nudge", label: "Make it somewhat more attractive" }, { id: "force", label: "Force a bluff every time" }, { id: "none", label: "Reads should never affect strategy" }], correctIds: ["nudge"], explanation: "The read shifts the decision. It does not remove the baseline or the risk of being wrong." },
    action: { prompt: "Which choices are disciplined?", options: [{ id: "check", label: "Check because the sample is small" }, { id: "bluff", label: "Bluff while labeling the read uncertain" }, { id: "certain", label: "Bluff and call it certain" }], correctIds: ["check", "bluff"], explanation: "Checking and a read-based bluff can both be defensible. Certainty is the reasoning error." },
    baseline: "Check without a read; the small sample can support a tentative bluff adjustment.", exploit: "Record the result, but do not let one new outcome redefine the player.", reversal: "Reduce the exploit as more observations contradict the folding tendency."
  }),
  base({
    id: "read-no-sample-twin", familyId: "read-as-fact-1", kind: "twin", baseId: "read-small-sample", changedFact: "Only the player evidence changed: there are no prior river observations.", leak: "read-as-fact", module: "Reads and evidence", title: "Same spot, unknown opponent", objective: "Return to the baseline when evidence disappears.", cue: "Baseline first. Exploit only when evidence earns it.",
    street: "River", pot: "$96", effective: "$610 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["J♠", "T♠"], board: ["A♣", "8♦", "5♥", "3♣", "K♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "No relevant observations on this opponent.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♣ 8♦ 5♥", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 3♣", actions: ["Both players check."] }, { street: "River · K♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed draws" }, { label: "Still possible", detail: "Strong hands" }],
    range: { prompt: "Which layer is missing?", options: [{ id: "read", label: "A player-specific read" }, { id: "facts", label: "The cards and actions" }, { id: "position", label: "The acting order" }], correctIds: ["read"], explanation: "The factual hand remains. Only the exploit evidence disappeared." },
    plan: { prompt: "What should guide the decision first?", options: [{ id: "baseline", label: "The baseline range and hand comparison" }, { id: "invent", label: "An invented player type" }, { id: "fear", label: "The most frightening hand" }], correctIds: ["baseline"], explanation: "Unknown players call for a baseline, not an imagined tendency." },
    action: { prompt: "Which authored baseline fits?", options: [{ id: "check", label: "Check" }, { id: "bluff", label: "Bluff because the earlier player folded" }, { id: "value", label: "Value bet jack-high" }], correctIds: ["check"], explanation: "Checking is the honest baseline in this authored example." },
    baseline: "Check against the unknown opponent.", reversal: "Introduce an exploit only after relevant evidence accumulates."
  }),

  base({
    id: "read-caller", familyId: "read-as-fact-2", kind: "base", leak: "read-as-fact", module: "Reads and evidence", title: "A sticky river caller", objective: "Use observed behavior at the decision where it matters.", cue: "Player evidence changes likely responses, not the cards already dealt.",
    street: "River", pot: "$130", effective: "$720 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♥", "Q♠"], board: ["Q♦", "9♥", "4♣", "4♠", "2♣"], decisionNow: "Opponent checks. You act now.", decisionFact: "Observed: called large river bets with one pair in 4 of 5 relevant hands.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · Q♦ 9♥ 4♣", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 4♠", actions: ["Both players check."] }, { street: "River · 2♣", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Weaker queens, nines, and pocket pairs" }, { label: "Sometimes", detail: "Missed hands" }, { label: "Still possible", detail: "Trips or a full house" }],
    range: { prompt: "What does the calling history change most?", options: [{ id: "response", label: "How often weaker pairs may call a river bet" }, { id: "cards", label: "Which cards are on the board" }, { id: "certainty", label: "Whether strong hands are impossible" }], correctIds: ["response"], explanation: "The observed calls make a value response more plausible, but the sample remains limited." },
    plan: { prompt: "How does ace-queen use that clue?", options: [{ id: "value", label: "Value bet because weaker pairs may pay" }, { id: "bluff", label: "Bluff to fold stronger hands" }, { id: "proof", label: "Assume every weaker hand calls" }], correctIds: ["value"], explanation: "Top pair can value bet when weaker made hands are unusually willing to call." },
    action: { prompt: "Which adjustment is reasonable?", options: [{ id: "bigger", label: "Choose a somewhat larger value size" }, { id: "check", label: "Always check because reads are imperfect" }, { id: "jam", label: "Move all in because one pair called before" }], correctIds: ["bigger"], explanation: "A somewhat larger value size is a plausible exploit. The exact size is not solver-verified." },
    baseline: "Value bet; the calling tendency can support a larger size.", exploit: "The exploit is confidence in weaker calls, not certainty about the opponent's exact hand.", reversal: "Return toward a smaller size if future observations show folds to larger bets."
  }),
  base({
    id: "read-caller-twin", familyId: "read-as-fact-2", kind: "twin", baseId: "read-caller", changedFact: "Only the observed tendency changed: this opponent folded one pair in 4 of 5 relevant hands.", leak: "read-as-fact", module: "Reads and evidence", title: "Same value hand, folding opponent", objective: "Change exploit direction when response evidence reverses.", cue: "Exploit the response you observed—without calling a small sample proof.",
    street: "River", pot: "$130", effective: "$720 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["A♥", "Q♠"], board: ["Q♦", "9♥", "4♣", "4♠", "2♣"], decisionNow: "Opponent checks. You act now.", decisionFact: "Observed: folded one pair to 4 of 5 relevant large river bets.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · Q♦ 9♥ 4♣", actions: ["Opponent checks. You bet. Opponent calls."] }, { street: "Turn · 4♠", actions: ["Both players check."] }, { street: "River · 2♣", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "Weaker queens, nines, and pocket pairs" }, { label: "Sometimes", detail: "Missed hands" }, { label: "Still possible", detail: "Strong made hands" }],
    range: { prompt: "What stays stable?", options: [{ id: "range", label: "The action-built range before the river bet" }, { id: "response", label: "Expected calls versus large sizes" }, { id: "size", label: "The best exploit size" }], correctIds: ["range"], explanation: "The read changes expected responses, not the historical actions that built the range." },
    plan: { prompt: "What is still true?", options: [{ id: "value", label: "Ace-queen can value bet against weaker pairs" }, { id: "bluff", label: "Ace-queen is now a bluff" }, { id: "nothing", label: "No weaker hand can ever call" }], correctIds: ["value"], explanation: "The hand remains a value hand, but the best size may shrink because weaker hands fold more." },
    action: { prompt: "Which adjustment is disciplined?", options: [{ id: "smaller", label: "Use a smaller value size or check more" }, { id: "bigger", label: "Bet bigger because folds are guaranteed" }, { id: "bluff", label: "Turn top pair into a bluff" }], correctIds: ["smaller"], explanation: "A smaller size can preserve weaker calls. Checking more is also plausible if the fold tendency is extreme." },
    baseline: "Value bet, but size down or check more against the overfolder.", reversal: "Size up again only when weaker hands demonstrate they will pay."
  }),

  base({
    id: "queen-high-showdown", familyId: "bluffs-showdown-2", kind: "base", leak: "bluffs-showdown", module: "Showdown value", title: "Queen-high after a missed river", objective: "Notice the worse hands that checking can still beat.", cue: "Before bluffing, ask which worse hands you already beat by checking.",
    street: "River", pot: "$78", effective: "$500 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["Q♠", "J♠"], board: ["A♦", "9♣", "4♥", "3♣", "2♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Opponent called a small flop bet, then both players checked the turn.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♦ 9♣ 4♥", actions: ["Opponent checks. You bet small. Opponent calls."] }, { street: "Turn · 3♣", actions: ["Both players check."] }, { street: "River · 2♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "An ace, a nine, or a pocket pair" }, { label: "Sometimes", detail: "Missed straight and club draws" }, { label: "Still possible", detail: "Two pair and three of a kind" }],
    range: { prompt: "What does the opponent have most often?", options: options.onePair, correctIds: ["pair"], explanation: "One-pair hands are the largest reasonable group, with some missed hands and a few strong hands." },
    plan: { prompt: "What can queen-high beat if you check?", options: [{ id: "some-misses", label: "Some missed hands with lower high cards" }, { id: "pairs", label: "Most one-pair hands" }, { id: "nothing", label: "Nothing at all" }], correctIds: ["some-misses"], explanation: "Queen-high loses to every pair but can beat some lower missed draws." },
    action: { prompt: "Without a folding read, which baseline is disciplined?", options: [{ id: "check", label: "Check" }, { id: "value", label: "Bet for value" }, { id: "automatic", label: "Bluff automatically because queen-high is not a pair" }], correctIds: ["check"], explanation: "Checking preserves a small chance to win. A bluff still needs enough better pairs to fold." },
    baseline: "Check queen-high against an unknown opponent.", exploit: "A bluff may be reasonable when better one-pair hands demonstrably overfold.", reversal: "Bluff more only after identifying the folding pairs and credible evidence."
  }),
  base({
    id: "seven-high-showdown-twin", familyId: "bluffs-showdown-2", kind: "twin", baseId: "queen-high-showdown", changedFact: "Only your cards changed: queen-high became seven-high.", leak: "bluffs-showdown", module: "Showdown value", title: "Same river, almost no showdown value", objective: "Use showdown value when selecting a bluff candidate.", cue: "The less often a hand wins by checking, the more natural it may be as a bluff candidate.",
    street: "River", pot: "$78", effective: "$500 behind", heroPosition: "Button · acts last", opponentPosition: "Big Blind", hero: ["7♠", "6♠"], board: ["A♦", "9♣", "4♥", "3♣", "2♦"], decisionNow: "Opponent checks. You act now.", decisionFact: "Same actions and board; only your private cards changed.",
    history: [{ street: "Preflop", actions: ["You raise. Opponent calls."] }, { street: "Flop · A♦ 9♣ 4♥", actions: ["Opponent checks. You bet small. Opponent calls."] }, { street: "Turn · 3♣", actions: ["Both players check."] }, { street: "River · 2♦", actions: ["Opponent checks. Action is on you."] }],
    rangeBuckets: [{ label: "Most often", detail: "One-pair hands" }, { label: "Sometimes", detail: "Missed hands" }, { label: "Still possible", detail: "Strong made hands" }],
    range: { prompt: "What stayed the same?", options: [{ id: "opponent", label: "The opponent's likely range" }, { id: "showdown", label: "How often your hand wins by checking" }, { id: "hero", label: "Your private cards" }], correctIds: ["opponent"], explanation: "The opponent took the same actions. Your cards change your showdown value, not their range." },
    plan: { prompt: "What improved about seven-high as a bluff candidate?", options: [{ id: "less-showdown", label: "It wins less often by checking" }, { id: "value", label: "More worse pairs can call" }, { id: "strong", label: "It became a strong made hand" }], correctIds: ["less-showdown"], explanation: "Seven-high gives up less winning chance when turned into a bluff than queen-high does." },
    action: { prompt: "What still decides whether to bluff?", options: [{ id: "folds", label: "Whether enough better hands fold" }, { id: "cards", label: "Only the fact that you hold seven-high" }, { id: "always", label: "Nothing—seven-high always bluffs" }], correctIds: ["folds"], explanation: "Bluff selection and bluff profitability are separate. Better hands must still fold often enough." },
    baseline: "Seven-high is the more natural bluff candidate, but no automatic bluff is claimed.", reversal: "Check against sticky callers; bluff more with reliable evidence of folds."
  }),
];

export const baseHands = v2Hands.filter((hand) => hand.kind === "base");

export const leakLabels: Record<LeakTag, string> = {
  "removes-strength": "Removes strong hands too quickly",
  "weaker-callers": "Misses the weaker callers",
  "bluffs-showdown": "Bluffs hands already beaten",
  "plan-action": "Action contradicts the plan",
  "call-price": "Ignores the price of calling",
  "read-as-fact": "Treats a player read as fact",
};

export function twinFor(id: string) {
  return v2Hands.find((hand) => hand.kind === "twin" && hand.baseId === id);
}

function validateCatalog(hands: V2Hand[]) {
  const bases = hands.filter((hand) => hand.kind === "base");
  const twins = hands.filter((hand) => hand.kind === "twin");
  const ids = new Set(hands.map((hand) => hand.id));
  if (hands.length !== ids.size || bases.length !== 12 || twins.length !== 12) throw new Error("V2 catalogue must contain 12 unique base hands and 12 unique twins.");
  for (const baseHand of bases) {
    const linked = twins.filter((hand) => hand.baseId === baseHand.id);
    if (linked.length !== 1 || !linked[0].changedFact) throw new Error(`V2 base hand ${baseHand.id} needs one declared-change twin.`);
  }
  for (const hand of hands) {
    if (!hand.range.options.length || !hand.plan.options.length || !hand.action.options.length || !hand.range.correctIds.length || !hand.plan.correctIds.length || !hand.action.correctIds.length || !hand.baseline || !hand.reversal || !hand.sourceNote) throw new Error(`V2 hand ${hand.id} is missing its answer or provenance contract.`);
  }
  for (const leak of Object.keys(leakLabels) as LeakTag[]) if (bases.filter((hand) => hand.leak === leak).length !== 2) throw new Error(`V2 leak ${leak} must have exactly two base hands.`);
}

validateCatalog(v2Hands);
