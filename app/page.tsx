"use client";

import { useState } from "react";

type SupportLevel = "guided" | "table" | "deep";
type TrainingView = "home" | "trainer";
type TrainingPace = "coach" | "table";
type CoachStep = "range" | "hand" | "goal" | "action" | "review";

type StreetHistory = {
  street: string;
  board?: string[];
  actions: string[];
};

type RangeOption = {
  id: string;
  label: string;
  examples: string;
  coachNote: string;
};

type ActionOption = {
  id: string;
  label: string;
  detail: string;
};

type ActionAssessment = {
  status: "matched" | "reasonable" | "review";
  label: string;
  explanation: string;
};

type ThoughtOption = {
  id: string;
  label: string;
  detail: string;
};

type Scenario = {
  id: string;
  shortTitle: string;
  format: string;
  street: string;
  difficulty: string;
  heroPosition: string;
  villainPosition: string;
  opponent: string;
  pot: string;
  effective: string;
  hero: string[];
  board: string[];
  action: string[];
  streetHistory: StreetHistory[];
  decisionFact: string;
  decisionNow: string;
  observedEvidence?: string;
  takeaway: string;
  lessonTitle: string;
  lessonDefinition: string;
  lessonWhy: string;
  lessonChecks: string[];
  rangePrompt: string;
  rangeOptions: RangeOption[];
  rangeAnswer: string[];
  rangeStory: string[];
  dominantRangeOptions: ThoughtOption[];
  dominantRangeAnswer: string;
  rangeFeedbackTitle: string;
  dominantRangeExplanation: string;
  rangeBuckets: { label: string; detail: string }[];
  rangeQuestion: string;
  handPrompt: string;
  handPositionOptions: ThoughtOption[];
  handPositionAnswer: string;
  handPositionExplanation: string;
  goalOptions: ThoughtOption[];
  goalAnswer: string;
  goalExplanation: string;
  goalPrompt: string;
  actionHelp: string;
  miniSummary: string;
  coachConfidence: string;
  transfer?: boolean;
  strengthAnswer: "Mostly capped" | "Unclear" | "Uncapped";
  strengthExplanation: string;
  actionOptions: ActionOption[];
  actionAnswer: string;
  actionGrade: string;
  actionExplanation: string;
  evidence: string[];
  reversal: string;
  questions: string[];
};

const scenarios: Scenario[] = [
  {
    id: "river-pressure",
    shortTitle: "Ace-high on the river",
    format: "Live cash · $2/$5",
    street: "River",
    difficulty: "Intermediate",
    heroPosition: "Button — acts last after the flop",
    villainPosition: "Big Blind",
    opponent: "Unknown opponent",
    pot: "$92",
    effective: "$940",
    hero: ["A♣", "5♣"],
    board: ["K♦", "8♣", "3♠", "2♥", "Q♠"],
    action: [
      "You raise to $20 on the Button. The opponent calls from the Big Blind.",
      "The opponent checks the flop. You bet $25. The opponent calls.",
      "Both players check the turn.",
      "The opponent checks the river. It is your turn.",
    ],
    streetHistory: [
      { street: "Preflop", actions: ["You (Button) raise to $20.", "Opponent (Big Blind) calls."] },
      { street: "Flop", board: ["K♦", "8♣", "3♠"], actions: ["Opponent checks.", "You bet $25.", "Opponent calls."] },
      { street: "Turn", board: ["2♥"], actions: ["Opponent checks.", "You check."] },
      { street: "River", board: ["Q♠"], actions: ["Opponent checks.", "Action is on you."] },
    ],
    decisionFact: "Big Blind called the flop, then checked the turn and river.",
    decisionNow: "Big Blind checks. Your river decision.",
    observedEvidence: "In four similar river spots, this opponent folded three times to a large bet. That is useful evidence, but still a small sample.",
    takeaway: "Do not bluff hands with no pair that you already beat. Bluff only when enough better one-pair hands can fold. The checks alone do not tell you how often strong hands remain.",
    lessonTitle: "Use the betting history to decide what your bet must accomplish.",
    lessonDefinition:
      "Start with what happened in the hand. Estimate what the opponent can hold, compare your actual hand with those hands, and then decide whether betting would build value or make a better hand fold.",
    lessonWhy:
      "Your ace-high beats some missed draws but loses to every pair. A river bet is therefore a bluff, and it only helps when enough better one-pair hands fold.",
    lessonChecks: [
      "Name the strongest hands the opponent could have.",
      "Ask whether those strong hands would normally check and call this way.",
      "Confirm which better hands would fold to your chosen size.",
    ],
    rangePrompt: "Which groups of hands can the opponent reasonably reach the river with?",
    rangeOptions: [
      { id: "kx", label: "One-pair kings", examples: "KJ through K9", coachNote: "A large, natural part of the flop-calling range." },
      { id: "mid", label: "Medium showdown hands", examples: "8x and 99–JJ", coachNote: "Often call once, then try to reach showdown cheaply." },
      { id: "missed", label: "Turn draws that missed", examples: "65s and 54s", coachNote: "Some backdoor floats pick up a turn draw, then miss the river." },
      { id: "traps", label: "Occasional strong traps", examples: "Sets or two pair", coachNote: "Still possible because checking from the Big Blind is normal with many hands." },
      { id: "air", label: "Completely unconnected hands", examples: "Hands with no pair or draw", coachNote: "Most pure air folds to the flop bet." },
    ],
    rangeAnswer: ["kx", "mid", "missed", "traps"],
    rangeStory: [
      "Hand history: the opponent called the flop, then checked the turn and river.",
      "Likely hands: many one-pair hands reach the river this way, alongside some misses and occasional strong hands.",
      "Observed evidence: a small sample of large river folds supports considering an exploit, but does not prove it.",
    ],
    dominantRangeOptions: [
      { id: "pairs", label: "Mostly one-pair hands", detail: "" },
      { id: "air", label: "Mostly hands with no pair", detail: "" },
      { id: "strong", label: "Mostly very strong hands", detail: "" },
    ],
    dominantRangeAnswer: "pairs",
    rangeFeedbackTitle: "Most likely: one-pair hands.",
    dominantRangeExplanation: "The flop call keeps many one-pair hands. Some hands with no pair and occasional strong hands remain. Checking from the Big Blind is normal, so the checks do not prove weakness.",
    rangeBuckets: [
      { label: "Most often", detail: "One pair: a king, an eight, or a pocket pair" },
      { label: "Sometimes", detail: "A hand with no pair that missed" },
      { label: "Still possible", detail: "Two pair or three of a kind" },
    ],
    rangeQuestion: "The opponent called $25 on the flop, then checked the turn and river. What type of hand do they have most often?",
    handPrompt: "If both players show their cards now, what can your ace-five beat?",
    handPositionOptions: [
      { id: "ahead", label: "One-pair hands too", detail: "" },
      { id: "mixed", label: "Only some hands with no pair", detail: "" },
      { id: "value", label: "None of the opponent's hands", detail: "" },
    ],
    handPositionAnswer: "mixed",
    handPositionExplanation: "Ace-five loses to every pair. It can still beat some missed hands with no pair, so checking can win sometimes.",
    goalOptions: [
      { id: "bluff", label: "One-pair hands—especially an eight or pocket nines through jacks", detail: "" },
      { id: "misses", label: "Hands with no pair that already missed", detail: "" },
      { id: "strong", label: "Two pair or three of a kind", detail: "" },
      { id: "showdown", label: "I would rather check and see who wins", detail: "" },
    ],
    goalAnswer: "bluff",
    goalExplanation: "You already beat many missed hands, while two pair and three of a kind usually call. The useful bluff target is a better one-pair hand. Without the folding clue, checking is reasonable.",
    goalPrompt: "If you bet, which better hands are you trying to make fold?",
    actionHelp: "The pot is $92. A bet larger than $92 is more than the pot (an overbet).",
    miniSummary: "You: A♣ 5♣ · Board: K♦ 8♣ 3♠ 2♥ Q♠ · River · Pot $92. The opponent called the flop, then checked twice.",
    coachConfidence: "Coach confidence: medium on the bluff purpose; low on the exact size.",
    strengthAnswer: "Unclear",
    strengthExplanation:
      "The opponent can still hold strong hands. The line looks one-pair-heavy, but the checks alone do not prove that the strongest hands are absent.",
    actionOptions: [
      { id: "check", label: "Check", detail: "" },
      { id: "half", label: "Bet $50", detail: "" },
      { id: "large", label: "Bet $100", detail: "" },
      { id: "huge", label: "Bet $150", detail: "" },
    ],
    actionAnswer: "large",
    actionGrade: "Reasonable exploit—not a universal rule",
    actionExplanation:
      "The small observed sample supports considering a large bluff against one-pair hands. This exact hand and size remain a provisional coaching example, not a solver-verified recommendation.",
    evidence: [
      "The checks are facts, not proof that strong hands are rare or absent.",
      "The range center comes from the complete betting line, not a player label.",
      "The bluff adjustment comes from a small observed sample of large river folds.",
    ],
    reversal:
      "Check instead if the opponent traps strong hands, dislikes folding pairs, or has not shown a reliable folding tendency.",
    questions: [
      "Which value hands would you bet for the same large size?",
      "What real observation supports the claim that the opponent folds too much?",
      "Which river cards would give the opponent more strong hands?",
    ],
  },
  {
    id: "turn-probe",
    shortTitle: "Facing a small turn bet",
    format: "Tournament · 32 BB",
    street: "Turn",
    difficulty: "Intermediate",
    heroPosition: "Cutoff — two seats before the Button",
    villainPosition: "Big Blind",
    opponent: "No reliable player-specific read",
    pot: "10.2 BB",
    effective: "28 BB",
    hero: ["Q♣", "J♣"],
    board: ["A♠", "7♦", "2♣", "K♣"],
    action: [
      "You raise to 2.2 BB from the Cutoff. The opponent calls from the Big Blind.",
      "Both players check the flop.",
      "The opponent bets 2.4 BB on the turn. It is your turn.",
    ],
    streetHistory: [
      { street: "Preflop", actions: ["You (Cutoff) raise to 2.2 BB.", "Opponent (Big Blind) calls."] },
      { street: "Flop", board: ["A♠", "7♦", "2♣"], actions: ["Opponent checks.", "You check."] },
      { street: "Turn", board: ["K♣"], actions: ["Opponent bets 2.4 BB.", "Action is on you."] },
    ],
    decisionFact: "Big Blind checked the flop, then led 2.4 BB into 7.8 BB on the turn.",
    decisionNow: "Big Blind bets 2.4 BB. Your turn decision.",
    takeaway: "A small bet can still contain strong hands. Here, the combined flush and straight draw receives a reasonable price to call.",
    lessonTitle: "A small bet can come from weak hands and strong hands.",
    lessonDefinition:
      "A small bet can contain weak hands and bluffs, but it can also contain slow-played top pair, turned two pair, and other strong hands.",
    lessonWhy:
      "Before attacking a small bet, keep the strongest plausible combinations alive. Sizing alone does not prove weakness.",
    lessonChecks: [
      "Separate 'many hands' from 'no strong hands.'",
      "List the strong hands preserved by the flop check.",
      "Use stack and tournament context before escalating the pot.",
    ],
    rangePrompt: "What can the opponent bet after both players checked the flop?",
    rangeOptions: [
      { id: "ax", label: "Slow-played aces", examples: "Ax", coachNote: "The opponent can check top pair on the flop and bet later." },
      { id: "kx", label: "Turned kings", examples: "Kx", coachNote: "The turn creates a new pair and natural value bets." },
      { id: "pairs", label: "Weak pairs", examples: "7x and pocket pairs", coachNote: "Small leads can seek protection or thin value." },
      { id: "draws", label: "Draws and bluffs", examples: "Clubs, QJ, JT, floats", coachNote: "The small size allows many low-cost stabs." },
      { id: "strong", label: "Two pair and sets", examples: "A7, A2, K7, 77, 22", coachNote: "Low frequency, but not removed by the action." },
    ],
    rangeAnswer: ["ax", "kx", "pairs", "draws", "strong"],
    rangeStory: [
      "Flop check: the opponent keeps slow-played aces and other strong hands.",
      "Small turn bet: the opponent may bet a king, weak pairs, draws, and bluffs without excluding strong value.",
      "Turn result: the range is wide, but its strongest hands remain—so there is not enough evidence to call it capped.",
    ],
    dominantRangeOptions: [
      { id: "mixed", label: "Pairs, draws, and some bluffs", detail: "" },
      { id: "bluffs", label: "Mostly unpaired bluffs", detail: "" },
      { id: "nuts", label: "Mostly two pair or better", detail: "" },
    ],
    dominantRangeAnswer: "mixed",
    rangeFeedbackTitle: "Most likely: a wide mix; strong hands still remain.",
    dominantRangeExplanation: "A small bet can come from pairs, draws, or bluffs. It does not remove a pair of aces, two pair, or three of a kind.",
    rangeBuckets: [
      { label: "Most often", detail: "Kx, weaker pairs, draws, and bluffs" },
      { label: "Sometimes", detail: "Slow-played Ax" },
      { label: "Still possible", detail: "Two pair and sets" },
    ],
    rangeQuestion: "After both players checked the flop and the opponent made a small turn bet, what do they have most often?",
    handPrompt: "What kind of hand do you have on the turn?",
    handPositionOptions: [
      { id: "value", label: "A made hand that is usually ahead", detail: "" },
      { id: "draw", label: "A drawing hand that can improve", detail: "" },
      { id: "dead", label: "A hand with little chance to improve", detail: "" },
    ],
    handPositionAnswer: "draw",
    handPositionExplanation: "Queen-jack of clubs has a flush draw and an inside straight draw. A club or a ten can improve the hand on the river.",
    goalOptions: [
      { id: "value", label: "Raise for value", detail: "" },
      { id: "realize", label: "Call for the price", detail: "" },
      { id: "bluff", label: "Raise as a bluff", detail: "" },
    ],
    goalAnswer: "realize",
    goalExplanation: "The pot is 10.2 big blinds after the bet, and calling costs 2.4. Your combined flush and straight draw improves often enough for a call to be reasonable in this chip-value example.",
    goalPrompt: "What is the best purpose for your next action?",
    actionHelp: "Pot before the bet: 7.8 BB. Opponent bets 2.4 BB. Pot now: 10.2 BB. Calling costs 2.4 BB.",
    miniSummary: "You: Q♣ J♣ · Board: A♠ 7♦ 2♣ K♣ · Turn. Pot before bet 7.8 BB; opponent bets 2.4 BB; pot now 10.2 BB.",
    coachConfidence: "Coach confidence: medium on the call with the combined draw; low on tournament adjustments without payout information.",
    strengthAnswer: "Unclear",
    strengthExplanation:
      "The opponent's range is wide, and the flop check still allows a pair of aces, two pair, or three of a kind. The small turn bet does not prove weakness.",
    actionOptions: [
      { id: "fold", label: "Fold", detail: "Give up the gutshot." },
      { id: "call", label: "Call 2.4 BB", detail: "Continue in position and see the river without raising." },
      { id: "raise", label: "Raise to 7.7 BB", detail: "Turn the draw into immediate pressure." },
    ],
    actionAnswer: "call",
    actionGrade: "Plausible continuation; exact frequency is unverified",
    actionExplanation:
      "Calling receives a reasonable price with a flush draw plus an inside straight draw. Exact tournament advice still requires payout and stack-distribution context, so this chip-value example remains provisional.",
    evidence: [
      "A small lead can be made with both weak hands and strong hands.",
      "The opponent's flop check does not remove a pair of aces, two pair, or three of a kind.",
      "Queen-jack of clubs has a flush draw plus an inside straight draw, but tournament risk can change the preferred frequency.",
    ],
    reversal:
      "This is a chip-value example with no payout pressure assumed. Fold more if payout pressure is severe or the opponent rarely bluffs. Raise only with evidence that the small bet folds too often.",
    questions: [
      "Which river cards improve your likely hands more than the opponent's?",
      "What additional tournament information would make this answer trustworthy?",
      "What does the small size suggest—and what does it fail to prove?",
    ],
  },
  {
    id: "false-cap",
    shortTitle: "A connected turn",
    format: "Live cash · $5/$10",
    street: "Turn",
    difficulty: "Advanced",
    heroPosition: "Cutoff — acts first on the turn",
    villainPosition: "Button — acts last after the flop",
    opponent: "No reliable player-specific read",
    pot: "$450",
    effective: "$1,760",
    hero: ["Q♥", "Q♦"],
    board: ["J♣", "7♠", "2♦", "T♠"],
    action: [
      "UTG raises to $35. You re-raise to $120 from the Cutoff.",
      "The opponent calls from the Button. UTG folds.",
      "You bet $80 on the flop. The opponent calls.",
      "The T♠ arrives on the turn. It is your turn.",
    ],
    streetHistory: [
      { street: "Preflop", actions: ["UTG raises to $35.", "You (Cutoff) re-raise to $120.", "Opponent (Button) calls; UTG folds."] },
      { street: "Flop", board: ["J♣", "7♠", "2♦"], actions: ["You bet $80.", "Opponent calls."] },
      { street: "Turn", board: ["T♠"], actions: ["Action is on you."] },
    ],
    decisionFact: "Button cold-called preflop and called the flop; the T♠ improves several strong hands.",
    decisionNow: "You act first on the turn.",
    takeaway: "Uncapped means the opponent can still have the strongest hands—not that they are ahead overall. With queens, checking and a small bet can both be plausible; plan for a raise.",
    lessonTitle: "Calling does not remove the opponent's strongest hands.",
    lessonDefinition:
      "Calling can preserve traps, three of a kind, two pair, straights, top pair, and strong draws—especially when the opponent has position.",
    lessonWhy:
      "If the opponent retains the strongest hands, an overpair should not automatically build a huge pot. You need a plan for raises and later streets.",
    lessonChecks: [
      "Start with the opponent's preflop calling range.",
      "Update it after the flop call and turn card.",
      "Check for new straights, sets, two pair, and draws before betting.",
    ],
    rangePrompt: "Which hands can the opponent still hold on this turn?",
    rangeOptions: [
      { id: "overpairs", label: "Trapped overpairs", examples: "AA and KK", coachNote: "A thoughtful player can sometimes protect a calling range with traps." },
      { id: "sets", label: "Sets", examples: "JJ, TT, 77", coachNote: "All remain possible after calling the flop." },
      { id: "straight", label: "Made straights", examples: "98 suited", coachNote: "The T♠ completes 98s using the 7-J runout." },
      { id: "two", label: "Two pair", examples: "JT suited", coachNote: "Top pair improves to two pair on the turn." },
      { id: "pairsdraws", label: "Pairs and strong draws", examples: "AJ, KJ, QJ and spades", coachNote: "Many worse hands still continue, but some have substantial equity." },
    ],
    rangeAnswer: ["overpairs", "sets", "straight", "two", "pairsdraws"],
    rangeStory: [
      "Preflop cold-call: a thoughtful Button can retain AA, KK, and suited connected hands.",
      "Flop call: sets, top pair, 98 suited, and strong draws all continue.",
      "Turn result: nine-eight makes a straight and pocket tens or jack-ten improve, so the opponent still has very strong hands.",
    ],
    dominantRangeOptions: [
      { id: "weak", label: "Mostly one-pair hands and draws", detail: "" },
      { id: "uncapped", label: "One-pair hands, draws, and some very strong hands", detail: "" },
      { id: "capped", label: "Mostly two pair or better", detail: "" },
    ],
    dominantRangeAnswer: "uncapped",
    rangeFeedbackTitle: "Medium and very strong hands still remain.",
    dominantRangeExplanation: "The calls do not remove a nine-eight straight, three of a kind, two pair, or slow-played aces and kings. Those hands remain possible alongside many one-pair hands and draws.",
    rangeBuckets: [
      { label: "Most often", detail: "One-pair hands and strong draws" },
      { label: "Sometimes", detail: "Trapped AA or KK" },
      { label: "Still possible", detail: "Straights, sets, and two pair" },
    ],
    rangeQuestion: "Which description best fits the opponent after the preflop and flop calls?",
    handPrompt: "What does Q♥ Q♦ beat right now?",
    handPositionOptions: [
      { id: "nuts", label: "The strongest possible hand", detail: "" },
      { id: "onepair", label: "A strong but vulnerable one-pair hand", detail: "" },
      { id: "bluff", label: "A weak hand that must bluff", detail: "" },
    ],
    handPositionAnswer: "onepair",
    handPositionExplanation: "QQ is often ahead, but it is not strong enough to ignore straights, sets, two pair, and raises.",
    goalOptions: [
      { id: "value", label: "Get called by weaker one-pair hands", detail: "" },
      { id: "control", label: "Check and keep the pot smaller", detail: "" },
      { id: "bluff", label: "Make stronger hands fold", detail: "" },
    ],
    goalAnswer: "control",
    goalExplanation: "Checking avoids automatically building a large pot when better hands remain. A small value bet is also plausible if enough weaker jacks, pairs, and draws continue and you have a plan for a raise.",
    goalPrompt: "Which plan best fits your one-pair hand?",
    actionHelp: "You can check, make a smaller bet, or make a very large bet. Ask which weaker hands would continue.",
    miniSummary: "You: Q♥ Q♦ · Board: J♣ 7♠ 2♦ T♠ · Turn · Pot $450. You act first after the opponent called preflop and on the flop.",
    coachConfidence: "Coach confidence: high that strong hands remain; medium on avoiding an overbet; low on check versus small-bet frequency.",
    strengthAnswer: "Uncapped",
    strengthExplanation:
      "The opponent can still hold a straight, three of a kind, two pair, and slow-played aces or kings. Coaches call this uncapped: the strongest hands remain possible.",
    actionOptions: [
      { id: "check", label: "Check", detail: "Keep weaker hands and bluffs available without building a larger pot." },
      { id: "small", label: "Bet $180", detail: "About 40% of the pot." },
      { id: "large", label: "Bet $600", detail: "About 133% of the pot." },
    ],
    actionAnswer: "check",
    actionGrade: "Strong conceptual choice; exact strategy is unverified",
    actionExplanation:
      "Checking avoids turning one pair into an automatic stack-off and keeps weaker hands available on later streets. A small value bet can also be defensible.",
    evidence: [
      "The opponent's preflop cold-call can contain traps and suited connected hands.",
      "The flop call preserves sets, top pairs, and 98 suited.",
      "The turn completes 98 suited and improves TT and JT suited.",
    ],
    reversal:
      "Bet small more often when enough weaker hands call and you know how you will respond to a raise. Avoid treating the large overbet as automatic just because queens are often ahead.",
    questions: [
      "Which worse hands can call another bet comfortably?",
      "What is your plan if the opponent makes a large bet after you check?",
      "Why is 98 suited more important on this turn than it was on the flop?",
    ],
  },
  {
    id: "transfer-value",
    shortTitle: "Paired river decision",
    format: "Live cash · $1/$3",
    street: "River",
    difficulty: "Transfer practice",
    heroPosition: "Button — acts last after the flop",
    villainPosition: "Big Blind",
    opponent: "Unknown opponent",
    pot: "$61",
    effective: "$360",
    hero: ["A♠", "Q♦"],
    board: ["Q♣", "7♥", "3♣", "2♠", "2♦"],
    action: [
      "You raise to $12 on the Button. The opponent calls from the Big Blind.",
      "The opponent checks the flop. You bet $18. The opponent calls.",
      "Both players check the turn.",
      "The opponent checks the river. It is your turn.",
    ],
    streetHistory: [
      { street: "Preflop", actions: ["You (Button) raise to $12.", "Opponent (Big Blind) calls."] },
      { street: "Flop", board: ["Q♣", "7♥", "3♣"], actions: ["Opponent checks.", "You bet $18.", "Opponent calls."] },
      { street: "Turn", board: ["2♠"], actions: ["Opponent checks.", "You check."] },
      { street: "River", board: ["2♦"], actions: ["Opponent checks.", "Action is on you."] },
    ],
    decisionFact: "The opponent called one flop bet, then checked the turn and river.",
    decisionNow: "Big Blind checks. Your river decision.",
    takeaway: "Build the pot when weaker hands can call. A bet is for value when you expect to be called by a hand you beat.",
    lessonTitle: "Use the same four questions on a new hand.",
    lessonDefinition: "This hand removes most of the teaching hints so you can test whether the decision method transfers.",
    lessonWhy: "Top pair with the best kicker can be called by weaker queens and other pairs.",
    lessonChecks: ["Estimate the opponent's most common hands.", "Decide what your hand beats.", "Name the weaker hands that can call."],
    rangePrompt: "What can the opponent reach the river with?",
    rangeOptions: [
      { id: "queens", label: "Weaker queens", examples: "QJ, QT, Q9", coachNote: "A queen can call the flop and check later streets." },
      { id: "pairs", label: "Other pairs", examples: "A seven or pocket pairs", coachNote: "These hands can call once and try to reach the river." },
      { id: "misses", label: "Missed hands", examples: "Missed clubs and straight draws", coachNote: "Some draws miss the river." },
      { id: "strong", label: "A few strong hands", examples: "Trips or a full house", coachNote: "Strong hands remain possible but are not the largest group." },
    ],
    rangeAnswer: ["queens", "pairs", "misses", "strong"],
    rangeStory: [
      "The flop call keeps weaker queens, other pairs, and some draws.",
      "The later checks keep many medium-strength hands in the range.",
      "A few very strong hands remain possible, but they are not the largest group.",
    ],
    dominantRangeOptions: [
      { id: "pairs", label: "Mostly one-pair hands", detail: "" },
      { id: "air", label: "Mostly hands with no pair", detail: "" },
      { id: "strong", label: "Mostly very strong hands", detail: "" },
    ],
    dominantRangeAnswer: "pairs",
    rangeFeedbackTitle: "Most likely: one-pair hands.",
    dominantRangeExplanation: "Most often, the opponent has one pair: a weaker queen, a seven, or a pocket pair. Some missed hands and a few strong hands remain.",
    rangeBuckets: [
      { label: "Most often", detail: "A weaker queen, a seven, or a pocket pair" },
      { label: "Sometimes", detail: "A hand with no pair that missed" },
      { label: "Still possible", detail: "Three of a kind or a full house" },
    ],
    rangeQuestion: "The opponent called $18 on the flop, then checked the turn and river. What type of hand do they have most often?",
    handPrompt: "If both players show their cards now, what can your ace-queen beat?",
    handPositionOptions: [
      { id: "value", label: "Many weaker one-pair hands", detail: "" },
      { id: "misses", label: "Only hands with no pair", detail: "" },
      { id: "none", label: "None of the opponent's hands", detail: "" },
    ],
    handPositionAnswer: "value",
    handPositionExplanation: "Your pair of queens with an ace kicker beats weaker queens, a pair of sevens, and many pocket pairs.",
    goalOptions: [
      { id: "value", label: "A weaker queen or another pair calls", detail: "" },
      { id: "bluff", label: "A stronger hand folds", detail: "" },
      { id: "check", label: "Nothing—I would rather check", detail: "" },
    ],
    goalAnswer: "value",
    goalExplanation: "This is a value bet: you want a weaker queen or another pair to call with a hand you beat.",
    goalPrompt: "If you bet, what do you want to happen?",
    actionHelp: "The pot is $61. Choose a size that weaker one-pair hands may still call.",
    miniSummary: "You: A♠ Q♦ · Board: Q♣ 7♥ 3♣ 2♠ 2♦ · River · Pot $61. The opponent called the flop, then checked twice.",
    coachConfidence: "Coach confidence: high on betting for value; low to medium on the exact size.",
    transfer: true,
    strengthAnswer: "Unclear",
    strengthExplanation: "Very strong hands remain possible, but the opponent's range contains many more one-pair hands.",
    actionOptions: [
      { id: "check", label: "Check", detail: "" },
      { id: "small", label: "Bet $20", detail: "" },
      { id: "medium", label: "Bet $40", detail: "" },
      { id: "large", label: "Bet $75", detail: "" },
    ],
    actionAnswer: "medium",
    actionGrade: "Value bet example; exact size is unverified",
    actionExplanation: "A medium bet can be called by weaker queens and other pairs. The value-betting idea is the lesson; the exact $40 size is not solver-verified.",
    evidence: [
      "The opponent called the flop with many one-pair hands and draws.",
      "Your ace-queen beats many of those one-pair hands.",
      "A value bet works when weaker hands call often enough.",
    ],
    reversal: "Check more often if the opponent calls the flop with very few weaker pairs or raises river bets aggressively.",
    questions: ["Which weaker queens can call?", "Would a much larger bet lose too many weaker callers?", "Which river cards would make value betting harder?"],
  },
];

function assessAction(scenario: Scenario, actionId: string): ActionAssessment {
  if (actionId === scenario.actionAnswer) {
    return {
      status: "matched",
      label: "Matches example",
      explanation: scenario.actionExplanation,
    };
  }

  if (scenario.id === "river-pressure" && actionId === "huge") {
    return {
      status: "reasonable",
      label: "Defensible alternative",
      explanation:
        "The bluff logic fits, but this lesson cannot prove that $150 is better than $100. The larger size needs stronger evidence that the extra $50 creates meaningfully more folds.",
    };
  }

  if (scenario.id === "river-pressure" && actionId === "half") {
    return {
      status: "reasonable",
      label: "Defensible alternative",
      explanation:
        "A $50 bluff risks less and needs fewer folds, but it may be called more often by the one-pair hands you want to fold. This authored scenario cannot establish which size earns more.",
    };
  }

  if (scenario.id === "river-pressure" && actionId === "check") {
    return {
      status: "reasonable",
      label: "Defensible alternative",
      explanation:
        "Checking keeps your chance to beat a missed hand without risking more money. It passes on the possible bluff suggested by the observed folds.",
    };
  }

  if (scenario.id === "false-cap" && actionId === "small") {
    return {
      status: "reasonable",
      label: "Defensible value option",
      explanation: "A small bet can be called by weaker jacks, pocket pairs, and draws. Decide in advance how you will respond if the opponent raises.",
    };
  }

  if (scenario.id === "false-cap" && actionId === "large") {
    return {
      status: "review",
      label: "Needs stronger support",
      explanation: "A large overbet may force the opponent to continue mainly with hands that perform well against queens. Being ahead of much of the range does not by itself justify building the largest pot.",
    };
  }

  if (scenario.id === "transfer-value" && actionId === "small") {
    return {
      status: "reasonable",
      label: "Defensible value size",
      explanation: "A $20 bet may receive calls from a wider group of weaker pairs. It wins less when called, but may be called more often than the authored $40 example.",
    };
  }

  if (scenario.id === "transfer-value" && actionId === "large") {
    return {
      status: "reasonable",
      label: "Conditional value size",
      explanation: "A $75 bet needs a player read that weaker queens call a large size. It may lose many calls from a seven or a pocket pair, so the value purpose is sound but the size needs stronger support.",
    };
  }

  return {
    status: "review",
    label: "Needs work",
    explanation: scenario.actionExplanation,
  };
}

function isGoalAlternative(scenario: Scenario, goalId: string) {
  return (scenario.id === "river-pressure" && goalId === "showdown") ||
    (scenario.id === "false-cap" && goalId === "value");
}

function actionMatchesGoal(scenario: Scenario, goalId: string, actionId: string) {
  if (scenario.id === "river-pressure") return goalId === "showdown" ? actionId === "check" : goalId !== "bluff" || actionId !== "check";
  if (scenario.id === "turn-probe") return goalId === "realize" ? actionId === "call" : goalId === "value" || goalId === "bluff" ? actionId === "raise" : false;
  if (scenario.id === "false-cap") return goalId === "control" ? actionId === "check" : goalId === "value" ? actionId === "small" : actionId === "large";
  if (scenario.id === "transfer-value") return goalId === "check" ? actionId === "check" : goalId === "value" || goalId === "bluff" ? actionId !== "check" : false;
  return true;
}

function isRedCard(card: string) {
  return card.includes("♥") || card.includes("♦");
}

function moveToWorkArea() {
  window.requestAnimationFrame(() => {
    const workArea = document.querySelector(".work-area");
    if (!workArea) return;
    const top = workArea.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: "smooth" });
  });
}

function moveToQuestion() {
  window.requestAnimationFrame(() => {
    const question = document.querySelector(".coach-view, .review-view");
    if (!question) return;
    const top = question.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: "smooth" });
  });
}

function moveToScenarioStart() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const workspace = document.querySelector(".workspace");
      if (!workspace) return;
      window.scrollTo({ top: workspace.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" });
      const title = document.querySelector<HTMLElement>(".context-heading h1");
      title?.focus({ preventScroll: true });
    });
  });
}

function Card({ value, small = false }: { value: string; small?: boolean }) {
  return <span className={`card ${small ? "card-small" : ""} ${isRedCard(value) ? "card-red" : ""}`}>{value}</span>;
}

function HandTimeline({ scenario, compact = false }: { scenario: Scenario; compact?: boolean }) {
  return (
    <div className={`street-timeline ${compact ? "street-timeline-compact" : ""}`} aria-label="Complete hand history">
      {scenario.streetHistory.map((street) => (
        <section className="street-row" key={street.street}>
          <div className="street-label">
            <strong>{street.street}</strong>
            {street.board && <span>{street.board.join(" ")}</span>}
          </div>
          <div className="street-actions">
            {street.actions.map((line) => <p key={line}>{line}</p>)}
          </div>
        </section>
      ))}
      <div className="decision-now"><strong>{scenario.decisionNow}</strong><span>Pot {scenario.pot}</span></div>
    </div>
  );
}

function HandContext({ scenario }: { scenario: Scenario }) {
  return (
    <aside className="hand-context" aria-label="Current hand">
      <div className="context-heading">
        <div>
          <span className="context-kicker">Current hand</span>
          <h1 tabIndex={-1}>{scenario.shortTitle}</h1>
        </div>
        <span className="street-pill">{scenario.street}</span>
      </div>

      <div className="player-row hero-row">
        <div>
          <span>You</span>
          <strong>{scenario.heroPosition}</strong>
        </div>
        <div className="cards-inline">{scenario.hero.map((card) => <Card value={card} key={card} />)}</div>
      </div>

      <div className="board-block">
        <span>Board</span>
        <div className="cards-inline">{scenario.board.map((card, index) => <Card value={card} key={`${card}-${index}`} />)}</div>
      </div>

      <div className="player-row villain-row">
        <div>
          <span>Opponent</span>
          <strong>{scenario.villainPosition}</strong>
          <small>{scenario.opponent}</small>
        </div>
      </div>

      <div className="context-stats">
        <div><span>Pot now</span><strong>{scenario.pot}</strong></div>
        <div><span>Stack behind</span><strong>{scenario.effective}</strong></div>
      </div>

      <div className="history-heading"><span>Complete hand history</span><small>Facts used for every answer</small></div>
      <HandTimeline scenario={scenario} />

      <details className="source-note">
        <summary>How this coaching answer was built</summary>
        <p>Fixed, authored answer. General concept checked; exact action awaits solver and expert review.</p>
      </details>
    </aside>
  );
}

function LearnMode({ onPractice }: { scenario: Scenario; onPractice: () => void }) {
  return (
    <section className="work-card learn-view">
      <span className="section-kicker">The beginner method</span>
      <h2>Use four questions for post-flop decisions.</h2>
      <p className="lead-copy">Connect the opponent&apos;s likely hands to your hand, your purpose, and your action. You do not need to memorize poker vocabulary first.</p>

      <div className="thought-framework">
        <div><span>1</span><p><strong>What does the opponent have most often?</strong></p></div>
        <div><span>2</span><p><strong>What can my hand beat right now?</strong></p></div>
        <div><span>3</span><p><strong>If I bet, will a weaker hand call or will a better hand fold?</strong></p></div>
        <div><span>4</span><p><strong>Which action and size does that job?</strong></p></div>
      </div>

      <div className="simple-rule">
        <strong>The rule to carry to the table</strong>
        <p><b>A weaker hand calls</b> → bet to build value.</p>
        <p><b>A better hand folds</b> → bluff.</p>
        <p><b>Neither is likely</b> → checking or folding is often better.</p>
        <p>On the flop or turn, a bet can also make a drawing hand pay to see the next card.</p>
        <p><b>Facing a bet?</b> Compare the cost of calling with how often you expect to win or improve.</p>
      </div>

      <button className="primary-button" onClick={onPractice}>Practice this hand <span aria-hidden="true">→</span></button>
    </section>
  );
}

function QuickMode({ scenario, onNext }: { scenario: Scenario; onNext: () => void }) {
  const [choice, setChoice] = useState("");
  const [revealed, setRevealed] = useState(false);
  const coachAction = scenario.actionOptions.find((option) => option.id === scenario.actionAnswer)!;
  const playerAction = scenario.actionOptions.find((option) => option.id === choice);

  if (revealed) {
    const assessment = assessAction(scenario, choice);
    return (
      <section className="work-card quick-result" aria-live="polite">
        <span className="section-kicker">Your result</span>
        <h2>{assessment.label}</h2>
        <div className="answer-comparison">
          <div>
            <span>Your choice</span>
            <strong>{playerAction?.label}</strong>
          </div>
          <div className="coach-choice">
            <span>Authored example</span>
            <strong>{coachAction.label}</strong>
          </div>
        </div>
        <div className={`verdict-block verdict-${assessment.status}`}>
          <span>{assessment.label}</span>
          <p>{assessment.explanation}</p>
        </div>
        {scenario.id === "river-pressure" && (
          <details className="details-block">
            <summary>How the bluff sizes differ</summary>
            <p>$50 risks less and needs about 35% folds. $100 needs about 52%; $150 needs about 62%. A larger bet is better only if the extra size creates enough additional folds.</p>
          </details>
        )}
        <details className="details-block">
          <summary>Why this answer depends on the opponent&apos;s likely hands</summary>
          <p>{scenario.strengthExplanation}</p>
          <ul>{scenario.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
        <div className="button-row">
          <button className="secondary-button" onClick={() => { setChoice(""); setRevealed(false); moveToWorkArea(); }}>Try again</button>
          <button className="primary-button" onClick={onNext}>Next hand <span aria-hidden="true">→</span></button>
        </div>
      </section>
    );
  }

  return (
    <section className="work-card quick-view">
      <span className="section-kicker">Quick decision</span>
      <h2>What should you do?</h2>
      <p className="lead-copy">Choose first. The coach&apos;s answer and reasoning stay hidden until you submit.</p>
      <p className="decision-definition">{scenario.actionHelp}</p>
      <div className="choice-list action-choice-list">
        {scenario.actionOptions.map((option) => (
          <button key={option.id} className={choice === option.id ? "selected" : ""} onClick={() => setChoice(option.id)} aria-pressed={choice === option.id}>
            <span><strong>{option.label}</strong></span>
            <span className="radio-dot" aria-hidden="true" />
          </button>
        ))}
      </div>
      <button className="primary-button" disabled={!choice} onClick={() => { setRevealed(true); moveToWorkArea(); }}>Reveal the answer</button>
    </section>
  );
}

function CoachMode({ scenario, onNext, handNumber, handCount }: { scenario: Scenario; onNext: () => void; handNumber: number; handCount: number }) {
  const [step, setStep] = useState<CoachStep>("range");
  const [rangeChoice, setRangeChoice] = useState("");
  const [handPosition, setHandPosition] = useState("");
  const [goal, setGoal] = useState("");
  const [action, setAction] = useState("");
  const [rangeChecked, setRangeChecked] = useState(false);
  const [handChecked, setHandChecked] = useState(false);
  const [goalChecked, setGoalChecked] = useState(false);

  const selectedRange = scenario.dominantRangeOptions.find((option) => option.id === rangeChoice)!;
  const selectedHandPosition = scenario.handPositionOptions.find((option) => option.id === handPosition)!;
  const selectedGoal = scenario.goalOptions.find((option) => option.id === goal)!;
  const correctRange = scenario.dominantRangeOptions.find((option) => option.id === scenario.dominantRangeAnswer)!;
  const correctHandPosition = scenario.handPositionOptions.find((option) => option.id === scenario.handPositionAnswer)!;
  const correctGoal = scenario.goalOptions.find((option) => option.id === scenario.goalAnswer)!;
  const rangeMatches = rangeChoice === scenario.dominantRangeAnswer;
  const handMatches = handPosition === scenario.handPositionAnswer;
  const goalMatches = goal === scenario.goalAnswer;
  const goalAlternative = isGoalAlternative(scenario, goal);
  const goalSound = goalMatches || goalAlternative;
  const goalAlternativeExplanation = scenario.id === "false-cap"
    ? "A small value bet is coherent when enough weaker one-pair hands and draws call. Decide in advance how you will respond to a raise."
    : "Checking keeps your chance to beat a missed hand. If you do bet, the useful target is a better one-pair hand.";
  const playerAction = scenario.actionOptions.find((option) => option.id === action)!;
  const coachAction = scenario.actionOptions.find((option) => option.id === scenario.actionAnswer)!;
  const baseActionAssessment = assessAction(scenario, action);
  const actionContradictsPlan = Boolean(goal && action && !actionMatchesGoal(scenario, goal, action));
  const actionAssessment: ActionAssessment = actionContradictsPlan
    ? { status: "review", label: "Does not match your plan", explanation: "Your final action should match the purpose you chose. Revisit whether you wanted a weaker hand to call, a better hand to fold, or to check and continue without betting." }
    : baseActionAssessment;
  const goToStep = (nextStep: CoachStep) => {
    setStep(nextStep);
    moveToQuestion();
  };
  const resetCoach = () => {
    setRangeChoice("");
    setHandPosition("");
    setGoal("");
    setAction("");
    setRangeChecked(false);
    setHandChecked(false);
    setGoalChecked(false);
    goToStep("range");
  };

  if (step === "review") {
    const firstFix = !rangeMatches
      ? { label: "Opponent's likely hands", answer: correctRange.label, explanation: scenario.dominantRangeExplanation }
      : !handMatches
        ? { label: "What your hand beats", answer: correctHandPosition.label, explanation: scenario.handPositionExplanation }
        : !goalSound
          ? { label: scenario.id === "river-pressure" ? "Bet target" : "Purpose", answer: correctGoal.label, explanation: scenario.goalExplanation }
          : actionAssessment.status === "review"
            ? { label: "Action", answer: coachAction.label, explanation: actionAssessment.explanation }
            : null;
    const resultHeadline = firstFix
      ? `Fix this first: ${firstFix.label.toLowerCase()}.`
      : scenario.id === "river-pressure" && goalAlternative && action === "check"
        ? "Your reasoning is coherent. Checking is a defensible alternative."
        : scenario.id === "false-cap" && goalAlternative && action === "small"
          ? "Your reasoning is coherent. A small value bet is defensible."
        : actionAssessment.status === "reasonable"
          ? "Your plan makes sense. The exact size is uncertain."
          : "Your plan makes sense.";

    return (
      <section className="work-card review-view" aria-live="polite">
        <div className="review-heading"><div><span className="section-kicker">Coach review</span><h2>{resultHeadline}</h2></div></div>

        <details className="details-block answer-audit-details">
          <summary>Review all four answers</summary>
          <div className="answer-review-list" aria-label="Your reasoning and coach feedback">
          <div className={`answer-review-row ${rangeMatches ? "row-correct" : "row-fix"}`}>
            <span className="row-status">{rangeMatches ? "✓" : "!"}</span>
            <div><span>Opponent — first try</span><strong>{selectedRange.label}</strong>{!rangeMatches && <small>Coach correction: {correctRange.label}</small>}</div>
            <b>{rangeMatches ? "Sound" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${handMatches ? "row-correct" : "row-fix"}`}>
            <span className="row-status">{handMatches ? "✓" : "!"}</span>
            <div><span>Your hand — first try</span><strong>{selectedHandPosition.label}</strong>{!handMatches && <small>Coach correction: {correctHandPosition.label}</small>}</div>
            <b>{handMatches ? "Sound" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${goalMatches ? "row-correct" : goalAlternative ? "row-alternative" : "row-fix"}`}>
            <span className="row-status">{goalMatches ? "✓" : goalAlternative ? "△" : "!"}</span>
            <div><span>{scenario.id === "river-pressure" ? "Bet target — first try" : "Purpose — first try"}</span><strong>{selectedGoal.label}</strong>{!goalSound && <small>Coach correction: {correctGoal.label}</small>}</div>
            <b>{goalMatches ? "Sound" : goalAlternative ? "Coherent alternative" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${actionAssessment.status === "matched" ? "row-correct" : actionAssessment.status === "reasonable" ? "row-alternative" : "row-fix"}`}>
            <span className="row-status">{actionAssessment.status === "matched" ? "✓" : actionAssessment.status === "reasonable" ? "△" : "!"}</span>
            <div><span>Action and size — first try</span><strong>{playerAction.label}</strong>{actionAssessment.status !== "matched" && <small>Authored example: {coachAction.label}</small>}</div>
            <b>{actionAssessment.label}</b>
          </div>
          </div>
        </details>

        {firstFix && <div className="first-fix"><span>First place to fix</span><strong>{firstFix.answer}</strong><p>{firstFix.explanation}</p></div>}
        {!firstFix && <div className="alternative-note"><span>{scenario.id === "transfer-value" ? "About the size" : "Coach note"}</span><p>{actionAssessment.explanation}</p></div>}
        <div className="coach-confidence"><strong>{scenario.coachConfidence}</strong></div>

        <div className="takeaway-card"><span>Takeaway</span><p>{scenario.takeaway}</p></div>
        <div className="transfer-prompt"><span>Say the chain aloud</span><p>Likely hands → what I beat → who calls or folds → action.</p></div>

        <details className="details-block full-review-details">
          <summary>More detail about this hand</summary>
          <ol className="line-story">{scenario.rangeStory.map((item) => <li key={item}>{item}</li>)}</ol>
          {scenario.id === "river-pressure" && <p><strong>Useful bluff target:</strong> a pair of eights or pocket nines through jacks. You already beat many hands with no pair, while two pair and three of a kind usually call.</p>}
        </details>
        {scenario.id === "river-pressure" && (
          <details className="details-block full-review-details">
            <summary>Poker terms after the decision</summary>
            <p><strong>Range:</strong> all reasonable hands the opponent may hold, weighted by how likely they are.</p>
            <p><strong>Overbet:</strong> a bet larger than the pot.</p>
            <p><strong>Showdown value:</strong> your hand can still win sometimes if you check.</p>
            <p><strong>Sizing math:</strong> a $100 bluff into $92 needs about 52% folds; $150 needs about 62%. Exact sizing remains unverified.</p>
          </details>
        )}
        <details className="details-block full-review-details"><summary>When the play changes</summary><p>{scenario.reversal}</p></details>

        <div className="button-row">
          <button className="primary-button" onClick={onNext}>Next lesson <span aria-hidden="true">→</span></button>
          <button className="secondary-button" onClick={resetCoach}>Retry from memory</button>
        </div>
      </section>
    );
  }

  const stepNumber = step === "range" ? 1 : step === "hand" ? 2 : step === "goal" ? 3 : 4;
  const correctedRangeLabel = correctRange.label;
  const correctedHandLabel = correctHandPosition.label;

  return (
    <section className="work-card coach-view">
      <div className="coach-mini-context"><span>{scenario.transfer ? "Transfer hand" : "Keep these facts with you"}</span><p>{scenario.miniSummary}</p>{scenario.transfer && <small>Fewer clues are provided. Apply the same four questions.</small>}</div>
      <div className="progress-block" aria-label={`Hand ${handNumber} of ${handCount}, step ${stepNumber} of 4`}><div><span style={{ width: `${stepNumber * 25}%` }} /></div><p>Hand {handNumber} of {handCount} · Step {stepNumber} of 4</p></div>

      {step !== "range" && <div className="thinking-breadcrumb">
        <span>Reasoning used for the next step</span>
        <p><b>{rangeMatches ? "Your range answer" : "Coach range correction"}:</b> {correctedRangeLabel}</p>
        {step !== "hand" && <p><b>{handMatches ? "Your hand answer" : "Coach hand correction"}:</b> {correctedHandLabel}</p>}
        {step === "action" && <p><b>{goalSound ? "Your purpose" : "Coach purpose correction"}:</b> {goalSound ? selectedGoal.label : correctGoal.label}</p>}
      </div>}
      {scenario.observedEvidence && (step === "goal" || step === "action") && <div className="observed-evidence"><span>Opponent clue</span><p>{scenario.observedEvidence}</p></div>}

      {step === "range" && (
        <>
          <span className="section-kicker">1 · Opponent&apos;s likely hands</span>
          <h2>{scenario.rangeQuestion}</h2>
          <p className="lead-copy">{scenario.transfer ? "Choose the biggest group." : "The opponent's likely hands are sometimes called their range. Choose the biggest group, not every possibility."}</p>
          <div className="choice-list strength-choice-list">
            {scenario.dominantRangeOptions.map((option) => <button key={option.id} className={rangeChoice === option.id ? "selected" : ""} onClick={() => setRangeChoice(option.id)} aria-pressed={rangeChoice === option.id} disabled={rangeChecked}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          {rangeChecked && <div className={`inline-feedback ${rangeMatches ? "feedback-sound" : "feedback-fix"}`}><strong>{rangeMatches ? scenario.rangeFeedbackTitle : `Coach correction: ${correctRange.label}.`}</strong><p>{scenario.dominantRangeExplanation}</p></div>}
          {!rangeChecked
            ? <button className="primary-button" disabled={!rangeChoice} onClick={() => setRangeChecked(true)}>Check answer</button>
            : <button className="primary-button" onClick={() => goToStep("hand")}>Continue <span aria-hidden="true">→</span></button>}
        </>
      )}

      {step === "hand" && (
        <>
          <span className="section-kicker">2 · What your hand beats</span>
          <h2>{scenario.handPrompt}</h2>
          <p className="lead-copy">{scenario.id === "river-pressure" ? "A pair beats ace-high. Ace-high can beat a lower hand with no pair." : "Compare your actual cards with the opponent's likely hands."}</p>
          <div className="choice-list strength-choice-list">
            {scenario.handPositionOptions.map((option) => <button key={option.id} className={handPosition === option.id ? "selected" : ""} onClick={() => setHandPosition(option.id)} aria-pressed={handPosition === option.id} disabled={handChecked}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          {handChecked && <div className={`inline-feedback ${handMatches ? "feedback-sound" : "feedback-fix"}`}><strong>{handMatches ? "That comparison works." : `Coach correction: ${correctHandPosition.label}.`}</strong><p>{scenario.handPositionExplanation}</p></div>}
          <div className="button-row"><button className="secondary-button" onClick={() => goToStep("range")}>Back</button>{!handChecked
            ? <button className="primary-button" disabled={!handPosition} onClick={() => setHandChecked(true)}>Check answer</button>
            : <button className="primary-button" onClick={() => goToStep("goal")}>Continue <span aria-hidden="true">→</span></button>}</div>
        </>
      )}

      {step === "goal" && (
        <>
          <span className="section-kicker">3 · Purpose of your next action</span>
          <h2>{scenario.goalPrompt}</h2>
          <p className="lead-copy">{scenario.id === "turn-probe" ? "When facing a bet, compare the calling cost with how often you can win or improve." : "A weaker hand calls = value. A better hand folds = bluff."}</p>
          <div className="choice-list strength-choice-list">
            {scenario.goalOptions.map((option) => <button key={option.id} className={goal === option.id ? "selected" : ""} onClick={() => setGoal(option.id)} aria-pressed={goal === option.id} disabled={goalChecked}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          {goalChecked && <div className={`inline-feedback ${goalSound ? "feedback-sound" : "feedback-fix"}`}><strong>{goalMatches ? "That purpose fits the hand." : goalAlternative ? "That is a coherent alternative." : `Coach correction: ${correctGoal.label}.`}</strong><p>{goalAlternative ? goalAlternativeExplanation : scenario.goalExplanation}</p></div>}
          <div className="button-row"><button className="secondary-button" onClick={() => goToStep("hand")}>Back</button>{!goalChecked
            ? <button className="primary-button" disabled={!goal} onClick={() => setGoalChecked(true)}>Check answer</button>
            : <button className="primary-button" onClick={() => goToStep("action")}>Continue <span aria-hidden="true">→</span></button>}</div>
        </>
      )}

      {step === "action" && (
        <>
          <span className="section-kicker">4 · Choose the action</span>
          <h2>What should you do?</h2>
          <p className="decision-definition">{scenario.actionHelp}</p>
          {scenario.id === "river-pressure" && goal === "bluff" && <div className="belief-note"><span>Why a large bluff may look believable</span><p>The opponent cannot see your ace-five. For example, king-queen would be two pair and two queens in your hand would make three of a kind. Those strong hands could reach the river this way, but a believable story does not guarantee a fold.</p></div>}
          {scenario.id === "false-cap" && <div className="belief-note"><span>Important distinction</span><p>Uncapped does not mean the opponent is ahead overall. It means the opponent can still have the strongest hands. Queens may still lead most of the range.</p></div>}
          <div className="choice-list action-choice-list">
            {scenario.actionOptions.map((option) => <button key={option.id} className={action === option.id ? "selected" : ""} onClick={() => setAction(option.id)} aria-pressed={action === option.id}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          <div className="button-row"><button className="secondary-button" onClick={() => goToStep("goal")}>Back</button><button className="primary-button" disabled={!action} onClick={() => goToStep("review")}>Review my reasoning</button></div>
        </>
      )}
    </section>
  );
}

// Retained temporarily while authored scenario content migrates into the new curriculum.
void moveToScenarioStart;
void HandContext;
void LearnMode;
void QuickMode;

const curriculum: Record<SupportLevel, number[]> = {
  guided: [3, 0],
  table: [1, 2],
  deep: [0, 2, 1, 3],
};

const supportCopy: Record<SupportLevel, { label: string; level: string; description: string }> = {
  guided: { label: "Guided", level: "Beginner-friendly", description: "Teach each step and correct the foundation before moving on." },
  table: { label: "Table practice", level: "Intermediate", description: "Let me reason through the hand, then coach the first weak link." },
  deep: { label: "Deep analysis", level: "Advanced", description: "Show assumptions, alternatives, math, and what is not verified." },
};

const reasonOptions = [
  { id: "value", label: "A weaker hand calls" },
  { id: "bluff", label: "A better hand folds" },
  { id: "price", label: "The call price is worth it" },
  { id: "control", label: "Avoid building a bigger pot" },
];

function CompactContext({ scenario }: { scenario: Scenario }) {
  return (
    <div className="compact-context" aria-label="Hand reminder">
      <p><strong>You:</strong> {scenario.hero.join(" ")} <span>·</span> <strong>Board:</strong> {scenario.board.join(" ")}</p>
      <p><strong>{scenario.street}:</strong> {scenario.decisionFact} <span>·</span> <strong>Pot:</strong> {scenario.pot}</p>
    </div>
  );
}

function LessonSetup({ scenario, level, lessonNumber, lessonCount, onStart, onBack }: {
  scenario: Scenario; level: SupportLevel; lessonNumber: number; lessonCount: number; onStart: () => void; onBack: () => void;
}) {
  return (
    <div className="lesson-shell lesson-setup" id="main-workspace">
      <button className="back-link" onClick={onBack}>← Curriculum</button>
      <p className="lesson-meta">{supportCopy[level].label} · Lesson {lessonNumber} of {lessonCount}</p>
      <h1>{scenario.shortTitle}</h1>
      <p className="setup-lead">Read the full hand once. These actions are the evidence for every decision that follows.</p>

      <section className="setup-hand" aria-label="Current hand">
        <div className="setup-summary">
          <div><span>You · {scenario.heroPosition}</span><div className="cards-inline">{scenario.hero.map((card) => <Card value={card} key={card} />)}</div></div>
          <div><span>Board</span><div className="cards-inline">{scenario.board.map((card, index) => <Card value={card} key={`${card}-${index}`} />)}</div></div>
        </div>
        <div className="setup-facts">
          <p><span>Opponent</span><strong>{scenario.villainPosition}</strong></p>
          <p><span>Pot now</span><strong>{scenario.pot}</strong></p>
          <p><span>Stack behind</span><strong>{scenario.effective}</strong></p>
        </div>
        <h2>Complete hand history</h2>
        <HandTimeline scenario={scenario} />
      </section>

      <button className="primary-button setup-start" onClick={onStart}>Start the hand →</button>
    </div>
  );
}

function GuidedLesson({ scenario, onNext, lessonNumber, lessonCount }: { scenario: Scenario; onNext: () => void; lessonNumber: number; lessonCount: number }) {
  const guidedScenario = { ...scenario, transfer: false };
  return <CoachMode scenario={guidedScenario} onNext={onNext} handNumber={lessonNumber} handCount={lessonCount} />;
}

function TablePractice({ scenario, onNext, lessonNumber, lessonCount }: { scenario: Scenario; onNext: () => void; lessonNumber: number; lessonCount: number }) {
  const [step, setStep] = useState(0);
  const [range, setRange] = useState("");
  const [purpose, setPurpose] = useState("");
  const [action, setAction] = useState("");
  const choices = [range, purpose, action];
  const setters = [setRange, setPurpose, setAction];
  const optionGroups = [scenario.dominantRangeOptions, scenario.goalOptions, scenario.actionOptions];
  const questions = ["Describe the opponent's range now.", scenario.goalPrompt, "Choose the action and size."];
  const labels = ["Likely hands", "Purpose", "Decision"];

  if (step === 3) {
    const rangeSound = range === scenario.dominantRangeAnswer;
    const purposeSound = purpose === scenario.goalAnswer || isGoalAlternative(scenario, purpose);
    const assessment = assessAction(scenario, action);
    const actionSound = !actionMatchesGoal(scenario, purpose, action) ? false : assessment.status !== "review";
    const firstFix = !rangeSound ? scenario.dominantRangeExplanation : !purposeSound ? scenario.goalExplanation : !actionSound ? assessment.explanation : null;
    return (
      <section className="lesson-shell practice-card result-simple" aria-live="polite">
        <p className="lesson-meta">Table practice · Lesson {lessonNumber} of {lessonCount}</p>
        <h1>{firstFix ? "One link needs revision." : "Your reasoning holds together."}</h1>
        <p className="result-summary">{firstFix || "The range, purpose, and action form a coherent plan under this lesson's assumptions."}</p>
        <div className="simple-audit">
          <p><span>{rangeSound ? "✓" : "!"}</span><b>Range</b><strong>{scenario.dominantRangeOptions.find((item) => item.id === range)?.label}</strong></p>
          <p><span>{purposeSound ? "✓" : "!"}</span><b>Purpose</b><strong>{scenario.goalOptions.find((item) => item.id === purpose)?.label}</strong></p>
          <p><span>{actionSound ? "✓" : "△"}</span><b>Decision</b><strong>{scenario.actionOptions.find((item) => item.id === action)?.label}</strong></p>
        </div>
        <div className="takeaway-simple"><strong>Take to the table</strong><p>{scenario.takeaway}</p></div>
        <div className="button-row result-actions"><button className="primary-button" onClick={onNext}>Next lesson →</button><button className="secondary-button" onClick={() => { setStep(0); setRange(""); setPurpose(""); setAction(""); }}>Retry</button></div>
        {scenario.id === "false-cap" && <details className="details-block"><summary>Poker term after the decision: uncapped</summary><p>The strongest hands still fit the action. Coaches call that <strong>uncapped</strong>. It does not mean most of the opponent&apos;s hands are strong or that the opponent is ahead overall.</p></details>}
        <details className="details-block"><summary>Assumption and reversal</summary><p>{scenario.reversal}</p></details>
      </section>
    );
  }

  const options = optionGroups[step];
  return (
    <section className="lesson-shell practice-card">
      <CompactContext scenario={scenario} />
      <div className="quiet-progress"><span>Table practice · Lesson {lessonNumber} of {lessonCount}</span><b>{step + 1} / 3</b></div>
      <p className="step-label">{labels[step]}</p>
      <h1>{questions[step]}</h1>
      {step === 0 && <p className="question-help">Include the main group and remember that a few stronger hands may remain.</p>}
      {scenario.observedEvidence && step > 0 && <p className="plain-clue"><strong>Opponent evidence:</strong> {scenario.observedEvidence}</p>}
      <div className="choice-list">
        {options.map((option) => <button key={option.id} className={choices[step] === option.id ? "selected" : ""} onClick={() => setters[step](option.id)}><strong>{option.label}</strong><span className="radio-dot" /></button>)}
      </div>
      <div className="button-row"><button className="secondary-button" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button><button className="primary-button" disabled={!choices[step]} onClick={() => setStep(step + 1)}>{step === 2 ? "Review reasoning" : "Continue →"}</button></div>
    </section>
  );
}

function DeepAnalysis({ scenario, onNext, lessonNumber, lessonCount }: { scenario: Scenario; onNext: () => void; lessonNumber: number; lessonCount: number }) {
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState(false);
  const assessment = action ? assessAction(scenario, action) : null;
  const selectedAction = scenario.actionOptions.find((item) => item.id === action);
  if (revealed && assessment) {
    return (
      <section className="lesson-shell practice-card deep-result" aria-live="polite">
        <p className="lesson-meta">Deep analysis · Lesson {lessonNumber} of {lessonCount}</p>
        <h1>{assessment.status === "review" ? "Revisit the action-purpose link." : "Consistent with these assumptions."}</h1>
        <p className="result-summary"><strong>Your decision:</strong> {selectedAction?.label} · {reasonOptions.find((item) => item.id === reason)?.label}</p>
        <div className="analysis-grid">
          <section><h2>Range assumptions</h2><p>{scenario.strengthExplanation}</p><ul>{scenario.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><h2>Action tree</h2><p>{assessment.explanation}</p><p><strong>Authored baseline:</strong> {scenario.actionOptions.find((item) => item.id === scenario.actionAnswer)?.label}. This is a comparison point, not a solver frequency.</p></section>
          <section><h2>Confidence</h2><p>{scenario.coachConfidence}</p><p>Concept analysis only. No solver-backed mix is available for this exact spot.</p></section>
          <section><h2>What changes it</h2><p>{scenario.reversal}</p></section>
        </div>
        {scenario.id === "river-pressure" && <details className="details-block" open><summary>Break-even bluff math</summary><p>$50 needs about 35% folds, $100 about 52%, and $150 about 62%. Bigger is better only when the added pressure creates enough extra folds.</p></details>}
        {scenario.id === "false-cap" && <details className="details-block" open><summary>Capped and uncapped</summary><p><strong>Uncapped</strong> means the strongest hands still fit the line. It does not mean the opponent is ahead overall. <strong>Mostly capped</strong> means top hands are heavily discounted, not guaranteed impossible.</p></details>}
        <div className="button-row result-actions"><button className="primary-button" onClick={onNext}>Next analysis →</button><button className="secondary-button" onClick={() => { setAction(""); setReason(""); setRevealed(false); }}>Retry</button></div>
      </section>
    );
  }

  return (
    <section className="lesson-shell practice-card deep-practice">
      <CompactContext scenario={scenario} />
      <div className="quiet-progress"><span>Deep analysis · Lesson {lessonNumber} of {lessonCount}</span><b>Decision</b></div>
      <h1>Choose a line and state its job.</h1>
      <p className="question-help">There may be more than one defensible action. The review compares assumptions instead of pretending an unverified mix is exact.</p>
      <h2>Action and size</h2>
      <div className="choice-list compact-choices">{scenario.actionOptions.map((option) => <button key={option.id} className={action === option.id ? "selected" : ""} onClick={() => setAction(option.id)}><strong>{option.label}</strong><span className="radio-dot" /></button>)}</div>
      <h2>Primary reason</h2>
      <div className="choice-list compact-choices">{reasonOptions.map((option) => <button key={option.id} className={reason === option.id ? "selected" : ""} onClick={() => setReason(option.id)}><strong>{option.label}</strong><span className="radio-dot" /></button>)}</div>
      <button className="primary-button" disabled={!action || !reason} onClick={() => setRevealed(true)}>Compare assumptions</button>
    </section>
  );
}

function CurriculumHome({ selected, onSelect, onContinue }: { selected: SupportLevel; onSelect: (level: SupportLevel) => void; onContinue: () => void }) {
  return (
    <div className="curriculum-home" id="main-workspace">
      <section className="curriculum-intro">
        <p className="eyebrow">Poker thinking, one decision at a time</p>
        <h1>How much coaching do you want?</h1>
        <p>Start with plain-language guidance, practice at table speed, or inspect the assumptions behind the answer.</p>
      </section>
      <div className="support-options" role="radiogroup" aria-label="Choose coaching support">
        {(Object.keys(supportCopy) as SupportLevel[]).map((level) => {
          const item = supportCopy[level];
          return <button key={level} role="radio" aria-checked={selected === level} className={selected === level ? "selected" : ""} onClick={() => onSelect(level)}><span>{item.level}</span><strong>{item.label}</strong><p>{item.description}</p><b>{selected === level ? "Selected" : "Choose"}</b></button>;
        })}
      </div>
      <section className="continue-card">
        <div><span>Recommended next</span><h2>{selected === "guided" ? "Value: which weaker hands will call?" : selected === "table" ? "A drawing hand facing a small bet" : "Ace-high river pressure"}</h2><p>{selected === "guided" ? "A clear first hand for learning the four-question habit." : supportCopy[selected].description}</p></div>
        <button className="primary-button" onClick={onContinue}>Start {supportCopy[selected].label} →</button>
      </section>
      <details className="method-preview"><summary>The four-question habit</summary><ol><li>What does the opponent have most often?</li><li>What can my hand beat?</li><li>Will a weaker hand call or a better hand fold?</li><li>Which action and size do that job?</li></ol></details>
    </div>
  );
}

// Legacy v10 flows remain only as authored-content references during scenario migration.
void curriculum;
void LessonSetup;
void GuidedLesson;
void TablePractice;
void DeepAnalysis;
void CurriculumHome;

type TrainingLesson = { scenarioIndex: number; module: string; skill: string; goal: string; cue: string };
type TrainingAttempt = { lesson: number; range: boolean; plan: boolean; action: boolean };

const trainingLessons: TrainingLesson[] = [
  { scenarioIndex: 3, module: "Foundations", skill: "Value betting", goal: "Learn when weaker hands can call.", cue: "Value bet when enough weaker hands can call. Choose a size those hands will still pay." },
  { scenarioIndex: 0, module: "Foundations", skill: "Bluff or check", goal: "Name the better hands your bluff must fold.", cue: "Do not bluff missed hands you already beat. Bluff only when better pairs fold often enough." },
  { scenarioIndex: 1, module: "Price and draws", skill: "Calling a small bet", goal: "Connect the price with your chance to improve.", cue: "Facing a bet, compare the call price with how often you can improve or already win." },
  { scenarioIndex: 2, module: "Range reading", skill: "Strong hands remain", goal: "Separate the top of a range from its average strength.", cue: "Uncapped means strong hands remain—not that Villain is ahead. Plan for a raise before betting." },
];

function TrainingHistory({ scenario }: { scenario: Scenario }) {
  return (
    <div className="training-history" aria-label="Complete hand history">
      {scenario.streetHistory.map((street) => (
        <div key={street.street}><strong>{street.street}{street.board ? ` · ${street.board.join(" ")}` : ""}</strong><span>{street.actions.join(" ")}</span></div>
      ))}
    </div>
  );
}

function TrainingContext({ scenario, showHistory = false }: { scenario: Scenario; showHistory?: boolean }) {
  return (
    <section className="training-context" aria-label="Current poker hand">
      <div className="training-cards">
        <p><span>You</span><strong>{scenario.hero.join(" ")}</strong></p>
        <p><span>Board</span><strong>{scenario.board.join(" ")}</strong></p>
        <p><span>Pot</span><strong>{scenario.pot}</strong></p>
      </div>
      <p className="training-clue"><strong>{scenario.street}:</strong> {scenario.decisionFact} You act now.</p>
      {showHistory && <TrainingHistory scenario={scenario} />}
    </section>
  );
}

function TrainingHome({ pace, setPace, completed, attempts, onStart }: { pace: TrainingPace; setPace: (pace: TrainingPace) => void; completed: Set<number>; attempts: TrainingAttempt[]; onStart: (lesson: number) => void }) {
  const nextLesson = trainingLessons.findIndex((_, index) => !completed.has(index));
  const recommended = nextLesson === -1 ? 0 : nextLesson;
  const dimensions = [{ key: "range" as const, label: "Range read" }, { key: "plan" as const, label: "Plan" }, { key: "action" as const, label: "Action" }];
  return (
    <div className="training-home" id="main-workspace">
      <section className="training-hero"><p className="eyebrow">Train the decision, not the vocabulary</p><h1>Build one poker habit until it works at table speed.</h1><p>Read Villain&apos;s likely hands, choose what your hand is trying to accomplish, then make the play.</p></section>
      <section className="resume-training">
        <div className="resume-copy"><span>{completed.size} of {trainingLessons.length} skills complete</span><h2>{completed.size === trainingLessons.length ? "Run the session again" : `Continue: ${trainingLessons[recommended].skill}`}</h2><p>{trainingLessons[recommended].goal} · About 2 minutes</p></div>
        <button className="primary-button" onClick={() => onStart(recommended)}>{completed.size === 0 ? "Start training" : "Continue training"} →</button>
      </section>
      <section className="pace-control" aria-labelledby="pace-title">
        <div><span id="pace-title">Training pace</span><small>Change the feedback, not the skill.</small></div>
        <div role="radiogroup" aria-label="Training pace">
          <button role="radio" aria-checked={pace === "coach"} className={pace === "coach" ? "active" : ""} onClick={() => setPace("coach")}><strong>Coach me</strong><span>Feedback after each choice</span></button>
          <button role="radio" aria-checked={pace === "table"} className={pace === "table" ? "active" : ""} onClick={() => setPace("table")}><strong>Table speed</strong><span>Three decisions, then review</span></button>
        </div>
      </section>
      <section className="training-path" aria-labelledby="path-title">
        <div className="section-heading"><span>Training path</span><h2 id="path-title">Four skills. One decision habit.</h2></div>
        <div className="lesson-list">{trainingLessons.map((lesson, index) => <button key={lesson.skill} onClick={() => onStart(index)}><span className={`lesson-number ${completed.has(index) ? "complete" : ""}`}>{completed.has(index) ? "✓" : index + 1}</span><span><small>{lesson.module}</small><strong>{lesson.skill}</strong><p>{lesson.goal}</p></span><b>Start →</b></button>)}</div>
      </section>
      {attempts.length > 0 && <section className="session-progress"><div className="section-heading"><span>This session</span><h2>What to strengthen next</h2></div><div>{dimensions.map((dimension) => { const correct = attempts.filter((attempt) => attempt[dimension.key]).length; return <p key={dimension.key}><strong>{dimension.label}</strong><span>{correct} of {attempts.length}</span><b>{correct === attempts.length ? "Solid" : "Keep training"}</b></p>; })}</div></section>}
    </div>
  );
}

function TrainingQuestion({ label, question, options, selected, locked, onSelect }: { label: string; question: string; options: ThoughtOption[] | ActionOption[]; selected: string; locked: boolean; onSelect: (id: string) => void }) {
  return <section className="training-question"><p className="step-label">{label}</p><h2>{question}</h2><div className="training-choices">{options.map((option) => <button key={option.id} disabled={locked} aria-pressed={selected === option.id} className={selected === option.id ? "selected" : ""} onClick={() => onSelect(option.id)}><strong>{option.label}</strong><span className="radio-dot" aria-hidden="true" /></button>)}</div></section>;
}

function TrainingResult({ scenario, lesson, lessonIndex, range, plan, action, onNext, onRetry }: { scenario: Scenario; lesson: TrainingLesson; lessonIndex: number; range: string; plan: string; action: string; onNext: (attempt: TrainingAttempt) => void; onRetry: () => void }) {
  const [deep, setDeep] = useState(false);
  const rangeSound = range === scenario.dominantRangeAnswer;
  const planSound = plan === scenario.goalAnswer || isGoalAlternative(scenario, plan);
  const assessment = assessAction(scenario, action);
  const coherent = actionMatchesGoal(scenario, plan, action);
  const actionSound = coherent && assessment.status !== "review";
  const rangeChoice = scenario.dominantRangeOptions.find((option) => option.id === range);
  const planChoice = scenario.goalOptions.find((option) => option.id === plan);
  const actionChoice = scenario.actionOptions.find((option) => option.id === action);
  const correctRange = scenario.dominantRangeOptions.find((option) => option.id === scenario.dominantRangeAnswer)!;
  const correctPlan = scenario.goalOptions.find((option) => option.id === scenario.goalAnswer)!;
  const coachAction = scenario.actionOptions.find((option) => option.id === scenario.actionAnswer)!;
  const headline = !rangeSound ? "Fix the range read first." : !planSound ? "Fix the plan first." : !coherent ? "Your action and plan contradict each other." : actionSound ? "Good plan." : "Revisit the action.";
  if (deep) return <section className="trainer-card deep-review"><button className="back-link" onClick={() => setDeep(false)}>← Result</button><p className="lesson-meta">Deep review · {lesson.skill}</p><h1>Why this decision changes</h1><div className="deep-review-grid"><section><span>Range assumption</span><p>{scenario.strengthExplanation}</p></section><section><span>Action comparison</span><p>{assessment.explanation}</p><p><strong>Coach comparison:</strong> {coachAction.label}</p></section><section><span>Confidence</span><p>{scenario.coachConfidence}</p></section><section><span>Change course when</span><p>{scenario.reversal}</p></section></div>{scenario.id === "river-pressure" && <p className="key-math"><strong>Key math:</strong> $50 needs about 35% folds, $100 about 52%, and $150 about 62%.</p>}</section>;
  return (
    <section className="trainer-card training-result" aria-live="polite">
      <p className="lesson-meta">Result · {lesson.skill}</p><h1>{headline}</h1>
      <p className="result-summary">{!rangeSound ? scenario.dominantRangeExplanation : !planSound ? `${scenario.handPositionExplanation} ${scenario.goalExplanation}` : !coherent ? "Choose an action that performs the job in your plan." : assessment.explanation}</p>
      <div className="result-chain">
        <p className={rangeSound ? "sound" : "fix"}><span>{rangeSound ? "✓" : "!"}</span><b>Range</b><strong>{rangeChoice?.label}</strong>{!rangeSound && <small>Use instead: {correctRange.label}</small>}</p>
        <p className={planSound ? "sound" : "fix"}><span>{planSound ? "✓" : "!"}</span><b>Plan</b><strong>{planChoice?.label}</strong>{!planSound && <small>Use instead: {correctPlan.label}</small>}</p>
        <p className={actionSound ? "sound" : !coherent || assessment.status === "review" ? "fix" : "alternative"}><span>{actionSound ? "✓" : !coherent ? "!" : "△"}</span><b>Action</b><strong>{actionChoice?.label}</strong>{!actionSound && <small>Coach comparison: {coachAction.label}</small>}</p>
      </div>
      <div className="table-cue"><span>Take to the table</span><p>{lesson.cue}</p></div>
      <div className="result-buttons"><button className="primary-button" onClick={() => onNext({ lesson: lessonIndex, range: rangeSound, plan: planSound, action: actionSound })}>Next hand →</button><button className="secondary-button" onClick={onRetry}>Retry</button></div>
      <div className="result-links"><button onClick={() => setDeep(true)}>Review deeply</button></div>
      <details className="why-answer"><summary>Why this answer</summary><ul><li><strong>Range:</strong> {scenario.dominantRangeExplanation}</li><li><strong>Plan:</strong> {scenario.goalExplanation}</li><li><strong>Changes when:</strong> {scenario.reversal}</li></ul></details>
    </section>
  );
}

function TrainingHand({ scenario, lesson, lessonNumber, pace, onComplete, onExit }: { scenario: Scenario; lesson: TrainingLesson; lessonNumber: number; pace: TrainingPace; onComplete: (attempt: TrainingAttempt) => void; onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [range, setRange] = useState("");
  const [plan, setPlan] = useState("");
  const [action, setAction] = useState("");
  const [locked, setLocked] = useState(false);
  const [review, setReview] = useState(false);
  const correctRange = scenario.dominantRangeOptions.find((option) => option.id === scenario.dominantRangeAnswer)!;
  const correctPlan = scenario.goalOptions.find((option) => option.id === scenario.goalAnswer)!;
  const currentChoice = [range, plan, action][step];
  const reset = () => { setStep(0); setRange(""); setPlan(""); setAction(""); setLocked(false); setReview(false); window.scrollTo({ top: 0 }); };
  const choose = (value: string) => { if (locked) return; if (step === 0) setRange(value); if (step === 1) setPlan(value); if (step === 2) setAction(value); setLocked(true); };
  const next = () => { if (step === 2) setReview(true); else { setStep(step + 1); setLocked(false); } window.scrollTo({ top: 0 }); };
  if (review) return <TrainingResult scenario={scenario} lesson={lesson} lessonIndex={lessonNumber - 1} range={range} plan={plan} action={action} onNext={onComplete} onRetry={reset} />;
  if (pace === "table") return <section className="trainer-card table-speed"><div className="trainer-topline"><button className="back-link" onClick={onExit}>← Training</button><span>Hand {lessonNumber} of {trainingLessons.length}</span></div><div className="skill-banner"><span>{lesson.module}</span><h1>{lesson.skill}</h1><p>{lesson.goal}</p></div><TrainingContext scenario={scenario} showHistory /><TrainingQuestion label="1 · Range" question="What does Villain have most often?" options={scenario.dominantRangeOptions} selected={range} locked={false} onSelect={setRange} /><TrainingQuestion label="2 · Plan" question="Against that range, what is Hero trying to accomplish?" options={scenario.goalOptions} selected={plan} locked={false} onSelect={setPlan} /><TrainingQuestion label="3 · Action" question="Which action and size does that job?" options={scenario.actionOptions} selected={action} locked={false} onSelect={setAction} /><button className="primary-button full-button" disabled={!range || !plan || !action} onClick={() => { setReview(true); window.scrollTo({ top: 0 }); }}>Review the hand</button></section>;
  const selectedRangeSound = range === scenario.dominantRangeAnswer;
  const selectedPlanSound = plan === scenario.goalAnswer || isGoalAlternative(scenario, plan);
  const feedback = step === 0 ? { sound: selectedRangeSound, title: selectedRangeSound ? scenario.rangeFeedbackTitle : `Use instead: ${correctRange.label}`, body: scenario.dominantRangeExplanation } : step === 1 ? { sound: selectedPlanSound, title: selectedPlanSound ? "That plan fits." : `Use instead: ${correctPlan.label}`, body: `${scenario.handPositionExplanation} ${scenario.goalExplanation}` } : { sound: assessAction(scenario, action).status !== "review" && actionMatchesGoal(scenario, plan, action), title: "Decision recorded.", body: assessAction(scenario, action).explanation };
  const questions = ["What does Villain have most often?", "Against that range, what is Hero trying to accomplish?", "Which action and size does that job?"];
  const options = [scenario.dominantRangeOptions, scenario.goalOptions, scenario.actionOptions][step];
  return <section className="trainer-card coached-hand"><div className="trainer-topline"><button className="back-link" onClick={onExit}>← Training</button><span>Hand {lessonNumber} of {trainingLessons.length} · Step {step + 1} of 3</span></div><div className="skill-banner"><span>{lesson.module} · Today&apos;s skill</span><h1>{lesson.skill}</h1><p>{lesson.goal}</p></div><TrainingContext scenario={scenario} showHistory={step === 0} /><TrainingQuestion label={`${step + 1} · ${["Range", "Plan", "Action"][step]}`} question={questions[step]} options={options} selected={currentChoice} locked={locked} onSelect={choose} />{locked && <div className={`fast-feedback ${feedback.sound ? "sound" : "fix"}`}><strong>{feedback.sound ? "✓ " : "→ "}{feedback.title}</strong><p>{feedback.body}</p>{step === 0 && <div className="range-bucket-strip">{scenario.rangeBuckets.map((bucket) => <span key={bucket.label}><b>{bucket.label}</b>{bucket.detail}</span>)}</div>}</div>}<button className="primary-button full-button" disabled={!locked} onClick={next}>{step === 2 ? "See result" : "Next"} →</button></section>;
}

export default function Home() {
  const [view, setView] = useState<TrainingView>("home");
  const [pace, setPace] = useState<TrainingPace>("coach");
  const [lessonPosition, setLessonPosition] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const lesson = trainingLessons[lessonPosition];
  const scenario = scenarios[lesson.scenarioIndex];
  const start = (lessonIndex: number) => { setLessonPosition(lessonIndex); setView("trainer"); window.scrollTo({ top: 0 }); };
  const complete = (attempt: TrainingAttempt) => {
    setCompleted((current) => new Set(current).add(lessonPosition));
    setAttempts((current) => [...current, attempt]);
    if (lessonPosition < trainingLessons.length - 1) setLessonPosition(lessonPosition + 1);
    else setView("home");
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="app-shell">
      <header className="app-header simple-header">
        <button className="brand brand-button" onClick={() => setView("home")} aria-label="Range Coach training home"><span className="brand-mark">RC</span><span>Range Coach</span></button>
        <span className="study-only">Study only · not for live hands</span>
      </header>

      {view === "home" && <TrainingHome pace={pace} setPace={setPace} completed={completed} attempts={attempts} onStart={start} />}
      {view === "trainer" && <div className="trainer-shell" id="main-workspace"><TrainingHand key={`${lessonPosition}-${pace}`} scenario={scenario} lesson={lesson} lessonNumber={lessonPosition + 1} pace={pace} onComplete={complete} onExit={() => { setView("home"); window.scrollTo({ top: 0 }); }} /></div>}

      <footer className="app-footer"><p>Educational training. Exact actions and frequencies are not solver-verified.</p><p>Adults 18+ · No real-money play</p></footer>
    </main>
  );
}
