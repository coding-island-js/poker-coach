"use client";

import { useMemo, useState } from "react";

type Mode = "learn" | "quick" | "coach";
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
    shortTitle: "A river bluff target",
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
      "You raise to $20 on the Button. Villain calls from the Big Blind.",
      "Villain checks the flop. You bet $25. Villain calls.",
      "Both players check the turn.",
      "Villain checks the river. It is your turn.",
    ],
    streetHistory: [
      { street: "Preflop", actions: ["You (Button) raise to $20.", "Opponent (Big Blind) calls."] },
      { street: "Flop", board: ["K♦", "8♣", "3♠"], actions: ["Opponent checks.", "You bet $25.", "Opponent calls."] },
      { street: "Turn", board: ["2♥"], actions: ["Opponent checks.", "You check."] },
      { street: "River", board: ["Q♠"], actions: ["Opponent checks.", "Action is on you."] },
    ],
    decisionFact: "Big Blind called the flop, then checked the turn and river.",
    observedEvidence: "In four similar river spots, this opponent folded three times to a large bet. That is useful evidence, but still a small sample.",
    takeaway: "Do not bluff hands with no pair that you already beat. Bluff only when enough better one-pair hands can fold. Repeated checks make very strong hands less likely, not impossible.",
    lessonTitle: "Use the betting history to decide what your bet must accomplish.",
    lessonDefinition:
      "Start with what happened in the hand. Estimate what the opponent can hold, compare your actual hand with those hands, and then decide whether betting would build value or make a better hand fold.",
    lessonWhy:
      "Your ace-high beats some missed draws but loses to every pair. A river bet is therefore a bluff, and it only helps when enough better one-pair hands fold.",
    lessonChecks: [
      "Name the strongest hands Villain could have.",
      "Ask whether those strong hands would normally check and call this way.",
      "Confirm which better hands would fold to your chosen size.",
    ],
    rangePrompt: "Which groups of hands can Villain reasonably reach the river with?",
    rangeOptions: [
      { id: "kx", label: "One-pair kings", examples: "KJ through K9", coachNote: "A large, natural part of the flop-calling range." },
      { id: "mid", label: "Medium showdown hands", examples: "8x and 99–JJ", coachNote: "Often call once, then try to reach showdown cheaply." },
      { id: "missed", label: "Turn draws that missed", examples: "65s and 54s", coachNote: "Some backdoor floats pick up a turn draw, then miss the river." },
      { id: "traps", label: "Occasional strong traps", examples: "Sets or two pair", coachNote: "Still possible, but the repeated checks reduce their frequency." },
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
    dominantRangeExplanation: "The flop call keeps many one-pair hands. Some hands with no pair and occasional strong hands remain, so the checks do not prove weakness.",
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
    miniSummary: "River · Pot $92 · You have ace-high and act last. The opponent called the flop, then checked twice.",
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
      "The checks are facts, not proof that the opponent is capped.",
      "The range center comes from the complete betting line, not a player label.",
      "The bluff adjustment comes from a small observed sample of large river folds.",
    ],
    reversal:
      "Check instead if Villain traps strong hands, dislikes folding pairs, or has not shown an overfolding tendency.",
    questions: [
      "Which value hands would you bet for the same large size?",
      "What real observation supports the claim that Villain folds too much?",
      "Which river cards would give Villain more strong hands?",
    ],
  },
  {
    id: "turn-probe",
    shortTitle: "A small turn lead",
    format: "Tournament · 32 BB",
    street: "Turn",
    difficulty: "Intermediate",
    heroPosition: "Cutoff — two seats before the Button",
    villainPosition: "Big Blind",
    opponent: "No reliable player-specific read",
    pot: "7.8 BB",
    effective: "28 BB",
    hero: ["Q♠", "J♥"],
    board: ["A♠", "7♦", "2♣", "K♣"],
    action: [
      "You raise to 2.2 BB from the Cutoff. Villain calls from the Big Blind.",
      "Both players check the flop.",
      "Villain bets 2.4 BB on the turn. It is your turn.",
    ],
    streetHistory: [
      { street: "Preflop", actions: ["You (Cutoff) raise to 2.2 BB.", "Opponent (Big Blind) calls."] },
      { street: "Flop", board: ["A♠", "7♦", "2♣"], actions: ["Opponent checks.", "You check."] },
      { street: "Turn", board: ["K♣"], actions: ["Opponent bets 2.4 BB.", "Action is on you."] },
    ],
    decisionFact: "Big Blind checked the flop, then led 2.4 BB into 7.8 BB on the turn.",
    takeaway: "A small bet can still contain strong hands. Use position and price before escalating the pot.",
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
    rangePrompt: "What can Villain lead after both players checked the flop?",
    rangeOptions: [
      { id: "ax", label: "Slow-played aces", examples: "Ax", coachNote: "Villain can check top pair on the flop and lead later." },
      { id: "kx", label: "Turned kings", examples: "Kx", coachNote: "The turn creates a new pair and natural value bets." },
      { id: "pairs", label: "Weak pairs", examples: "7x and pocket pairs", coachNote: "Small leads can seek protection or thin value." },
      { id: "draws", label: "Draws and bluffs", examples: "Clubs, QJ, JT, floats", coachNote: "The small size allows many low-cost stabs." },
      { id: "strong", label: "Two pair and sets", examples: "A7, A2, K7, 77, 22", coachNote: "Low frequency, but not removed by the action." },
    ],
    rangeAnswer: ["ax", "kx", "pairs", "draws", "strong"],
    rangeStory: [
      "Flop check: Villain keeps slow-played Ax and other strong hands.",
      "Small turn lead: Villain may bet Kx, weak pairs, draws, and bluffs without excluding strong value.",
      "Turn result: the range is wide, but its strongest hands remain—so there is not enough evidence to call it capped.",
    ],
    dominantRangeOptions: [
      { id: "mixed", label: "A mix of pairs, unfinished hands, and hands with no pair", detail: "The small lead is wide, but strong hands still remain." },
      { id: "bluffs", label: "Mostly hands with no pair", detail: "The small size proves weakness." },
      { id: "nuts", label: "Mostly two pair and sets", detail: "The lead is heavily value-weighted." },
    ],
    dominantRangeAnswer: "mixed",
    dominantRangeExplanation: "A small lead can contain many weak hands without removing Ax, two pair, or sets.",
    rangeBuckets: [
      { label: "Most often", detail: "Kx, weaker pairs, draws, and bluffs" },
      { label: "Sometimes", detail: "Slow-played Ax" },
      { label: "Still possible", detail: "Two pair and sets" },
    ],
    rangeQuestion: "After both players checked the flop and the opponent made a small turn bet, what do they have most often?",
    handPrompt: "What does Q♠ J♥ have right now?",
    handPositionOptions: [
      { id: "value", label: "You have a strong made hand", detail: "QJ is ahead and wants value." },
      { id: "draw", label: "You are usually behind, but a ten makes a straight", detail: "QJ has a gutshot and may improve to a straight." },
      { id: "dead", label: "No river card can help you", detail: "No river can improve the hand." },
    ],
    handPositionAnswer: "draw",
    handPositionExplanation: "QJ is usually behind made hands, but a ten completes a straight and position helps Hero realize that equity.",
    goalOptions: [
      { id: "value", label: "Raise to build the pot", detail: "Choose this only if weaker hands and draws can continue." },
      { id: "realize", label: "See the river at a manageable price", detail: "Call and use position." },
      { id: "bluff", label: "Force every pair to fold now", detail: "Turn the draw into a large bluff." },
    ],
    goalAnswer: "realize",
    goalExplanation: "Calling preserves weaker bets, uses position, and gives the gutshot a chance to improve without inflating the pot.",
    goalPrompt: "What should your next action accomplish?",
    actionHelp: "You can fold, call 2.4 big blinds to see the river, or raise and build a larger pot.",
    miniSummary: "Turn · Pot 7.8 big blinds · You have queen-jack and act last. The opponent made a small bet.",
    strengthAnswer: "Unclear",
    strengthExplanation:
      "Villain's range is wide, but the flop check preserves enough strong Ax, two pair, and sets that we cannot confidently call the range capped.",
    actionOptions: [
      { id: "fold", label: "Fold", detail: "Give up the gutshot." },
      { id: "call", label: "Call 2.4 BB", detail: "Continue in position and see the river without raising." },
      { id: "raise", label: "Raise to 7.7 BB", detail: "Turn the draw into immediate pressure." },
    ],
    actionAnswer: "call",
    actionGrade: "Plausible continuation; exact frequency is unverified",
    actionExplanation:
      "Calling uses position and keeps Villain's weaker bets in the pot. Exact tournament advice requires payout and stack-distribution context, so this example remains provisional.",
    evidence: [
      "A small lead can be made with both weak hands and strong hands.",
      "Villain's flop check does not remove Ax, two pair, or sets.",
      "QJ has a gutshot and position, but tournament risk can change the preferred frequency.",
    ],
    reversal:
      "Fold more if payout pressure is severe or Villain under-bluffs this line. Raise only with evidence that the small lead is weak and overfolds.",
    questions: [
      "Which river cards improve your range more than Villain's?",
      "What additional tournament information would make this answer trustworthy?",
      "What does the small size suggest—and what does it fail to prove?",
    ],
  },
  {
    id: "false-cap",
    shortTitle: "The false cap",
    format: "Live cash · $5/$10",
    street: "Turn",
    difficulty: "Advanced",
    heroPosition: "Cutoff",
    villainPosition: "Button — acts last after the flop",
    opponent: "No reliable player-specific read",
    pot: "$485",
    effective: "$1,760",
    hero: ["Q♥", "Q♦"],
    board: ["J♣", "7♠", "2♦", "T♠"],
    action: [
      "UTG raises to $35. You re-raise to $120 from the Cutoff.",
      "Villain calls from the Button. UTG folds.",
      "You bet $80 on the flop. Villain calls.",
      "The T♠ arrives on the turn. It is your turn.",
    ],
    streetHistory: [
      { street: "Preflop", actions: ["UTG raises to $35.", "You (Cutoff) re-raise to $120.", "Opponent (Button) calls; UTG folds."] },
      { street: "Flop", board: ["J♣", "7♠", "2♦"], actions: ["You bet $80.", "Opponent calls."] },
      { street: "Turn", board: ["T♠"], actions: ["Action is on you."] },
    ],
    decisionFact: "Button cold-called preflop and called the flop; the T♠ improves several strong hands.",
    takeaway: "Calling does not remove every strong hand. One pair should not automatically build a huge pot.",
    lessonTitle: "Calling does not remove the opponent's strongest hands.",
    lessonDefinition:
      "Calling can preserve traps, sets, suited two pair, straights, top pair, and strong draws—especially when Villain has position.",
    lessonWhy:
      "If Villain retains the strongest hands, an overpair should not automatically build a huge pot. Hero needs a plan for raises and later streets.",
    lessonChecks: [
      "Start with Villain's preflop calling range.",
      "Update it after the flop call and turn card.",
      "Check for new straights, sets, two pair, and draws before betting.",
    ],
    rangePrompt: "Which hands can Villain still hold on this turn?",
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
      "Turn result: 98 makes a straight and TT or JT improve, so Villain remains uncapped.",
    ],
    dominantRangeOptions: [
      { id: "weak", label: "Mostly weak pairs and draws", detail: "Villain rarely has a strong made hand." },
      { id: "capped", label: "Mostly medium hands with no nuts", detail: "The calls remove straights, sets, and traps." },
      { id: "uncapped", label: "Medium and very strong hands remain", detail: "Straights, sets, two pair, traps, and draws are all possible." },
    ],
    dominantRangeAnswer: "uncapped",
    dominantRangeExplanation: "Calling does not remove Villain's strongest hands, and the turn improves several of them.",
    rangeBuckets: [
      { label: "Most often", detail: "One-pair hands and strong draws" },
      { label: "Sometimes", detail: "Trapped AA or KK" },
      { label: "Still possible", detail: "Straights, sets, and two pair" },
    ],
    rangeQuestion: "After the opponent called before the flop and called again on the flop, what can they still have on this turn?",
    handPrompt: "What does Q♥ Q♦ beat right now?",
    handPositionOptions: [
      { id: "nuts", label: "You have the strongest possible hand", detail: "QQ is effectively unbeatable." },
      { id: "onepair", label: "You have a strong but vulnerable one-pair hand", detail: "QQ beats many hands but loses to the top of the opponent's range." },
      { id: "bluff", label: "Your pair cannot win if you check", detail: "QQ has no showdown value." },
    ],
    handPositionAnswer: "onepair",
    handPositionExplanation: "QQ is often ahead, but it is not strong enough to ignore straights, sets, two pair, and raises.",
    goalOptions: [
      { id: "stack", label: "Build a large pot now", detail: "Choose this only if enough weaker hands can continue." },
      { id: "control", label: "Check and keep weaker hands available", detail: "Avoid forcing the opponent to continue mainly with stronger hands." },
      { id: "bluff", label: "Turn QQ into a bluff", detail: "Try to fold out stronger hands." },
    ],
    goalAnswer: "control",
    goalExplanation: "Checking respects Villain's uncapped range, protects Hero's checks, and keeps weaker hands and bluffs available.",
    goalPrompt: "What should your next action accomplish?",
    actionHelp: "You can check, make a smaller bet, or make a very large bet. Ask which weaker hands would continue.",
    miniSummary: "Turn · Pot $485 · You have a pair of queens. The opponent called before the flop and on the flop.",
    strengthAnswer: "Uncapped",
    strengthExplanation:
      "Villain can credibly hold a straight, sets, two pair, and trapped overpairs. The strongest part of the range is fully present.",
    actionOptions: [
      { id: "check", label: "Check", detail: "Keep weaker hands and bluffs available without building a larger pot." },
      { id: "small", label: "Bet $195", detail: "About 40% of the pot." },
      { id: "large", label: "Bet $605", detail: "An overbet of about 125% of the pot." },
    ],
    actionAnswer: "check",
    actionGrade: "Strong conceptual choice; exact strategy is unverified",
    actionExplanation:
      "Checking respects Villain's strong turn range and avoids turning one pair into an automatic stack-off. It also keeps worse hands and bluffs available on later streets.",
    evidence: [
      "Villain's preflop cold-call can contain traps and suited connected hands.",
      "The flop call preserves sets, top pairs, and 98 suited.",
      "The turn completes 98 suited and improves TT and JT suited.",
    ],
    reversal:
      "Bet more often only if Villain arrives with many weaker hands and raises too rarely. Do not infer that from one passive action alone.",
    questions: [
      "Which worse hands can call another bet comfortably?",
      "What is your plan if Villain makes a large bet after you check?",
      "Why is 98 suited more important on this turn than it was on the flop?",
    ],
  },
  {
    id: "transfer-value",
    shortTitle: "Transfer: river value",
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
    miniSummary: "River · Pot $61 · You have a pair of queens with an ace kicker and act last. The opponent called the flop, then checked twice.",
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

  if (scenario.id === "river-pressure" && actionId === "check") {
    return {
      status: "reasonable",
      label: "Defensible alternative",
      explanation:
        "Checking keeps your chance to beat a missed hand without risking more money. It passes on the possible bluff suggested by the observed folds.",
    };
  }

  if (scenario.id === "transfer-value" && actionId === "small") {
    return {
      status: "reasonable",
      label: "Defensible alternative",
      explanation: "A smaller value bet may receive more calls from weaker pairs. The value-betting idea matters more than the exact authored size.",
    };
  }

  if (scenario.id === "river-pressure" && actionId === "half") {
    return {
      status: "review",
      label: "Needs work",
      explanation:
        "A $50 bet may fold hands with no pair that ace-high already beats while failing to pressure a pair of eights or a pocket pair. If the goal is to fold a better one-pair hand, the bet must feel costly enough to call.",
    };
  }

  return {
    status: "review",
    label: "Needs work",
    explanation: scenario.actionExplanation,
  };
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
    const question = document.querySelector(".coach-view");
    if (!question) return;
    const top = question.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: "smooth" });
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
      <div className="decision-now"><strong>{scenario.villainPosition.split(" —")[0]} acted. Your decision.</strong><span>Pot {scenario.pot}</span></div>
    </div>
  );
}

function HandContext({ scenario }: { scenario: Scenario }) {
  return (
    <aside className="hand-context" aria-label="Current hand">
      <div className="context-heading">
        <div>
          <span className="context-kicker">Current hand</span>
          <h1>{scenario.shortTitle}</h1>
        </div>
        <span className="street-pill">{scenario.street}</span>
      </div>

      <div className="player-row hero-row">
        <div>
          <span>You · Hero</span>
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
      <h2>Every poker decision in four questions.</h2>
      <p className="lead-copy">Use the information on the table. You do not need to memorize poker vocabulary before making the decision.</p>

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
            <span>Coach&apos;s choice</span>
            <strong>{coachAction.label}</strong>
          </div>
        </div>
        <div className={`verdict-block verdict-${assessment.status}`}>
          <span>{assessment.label}</span>
          <p>{assessment.explanation}</p>
        </div>
        {scenario.id === "river-pressure" && (
          <details className="details-block">
            <summary>Could a bigger overbet work?</summary>
            <p>Yes, if it makes more better hands fold. A $100 bluff needs about 52% folds; $150 needs about 62%. “Polarized” describes a range of strong value hands and bluffs—it is not a maximum bet size.</p>
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

function CoachMode({ scenario, onNext }: { scenario: Scenario; onNext: () => void }) {
  const [step, setStep] = useState<CoachStep>("range");
  const [rangeChoice, setRangeChoice] = useState("");
  const [handPosition, setHandPosition] = useState("");
  const [goal, setGoal] = useState("");
  const [action, setAction] = useState("");

  const selectedRange = scenario.dominantRangeOptions.find((option) => option.id === rangeChoice)!;
  const selectedHandPosition = scenario.handPositionOptions.find((option) => option.id === handPosition)!;
  const selectedGoal = scenario.goalOptions.find((option) => option.id === goal)!;
  const correctRange = scenario.dominantRangeOptions.find((option) => option.id === scenario.dominantRangeAnswer)!;
  const correctHandPosition = scenario.handPositionOptions.find((option) => option.id === scenario.handPositionAnswer)!;
  const correctGoal = scenario.goalOptions.find((option) => option.id === scenario.goalAnswer)!;
  const rangeMatches = rangeChoice === scenario.dominantRangeAnswer;
  const handMatches = handPosition === scenario.handPositionAnswer;
  const goalMatches = goal === scenario.goalAnswer;
  const goalAlternative = scenario.id === "river-pressure" && goal === "showdown";
  const goalSound = goalMatches || goalAlternative;
  const playerAction = scenario.actionOptions.find((option) => option.id === action)!;
  const coachAction = scenario.actionOptions.find((option) => option.id === scenario.actionAnswer)!;
  const baseActionAssessment = assessAction(scenario, action);
  const actionContradictsPlan = scenario.id === "river-pressure" && ((goal === "showdown" && action !== "check") || (goal === "bluff" && action === "check"));
  const actionAssessment: ActionAssessment = actionContradictsPlan
    ? { status: "review", label: "Does not match your plan", explanation: "Your final action should match the purpose you chose. Check preserves your chance to beat a missed hand; a bluff must use a bet." }
    : baseActionAssessment;
  const goToStep = (nextStep: CoachStep) => {
    setStep(nextStep);
    moveToQuestion();
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
      : goalAlternative && action === "check"
        ? "Your reasoning is coherent. Checking is a defensible alternative."
        : actionAssessment.status === "reasonable"
          ? "Your reasoning was sound. The exact size is uncertain."
          : "Your reasoning was sound. This action matches the authored example.";

    return (
      <section className="work-card review-view" aria-live="polite">
        <div className="review-heading"><div><span className="section-kicker">Coach review</span><h2>{resultHeadline}</h2></div></div>

        <div className="answer-review-list" aria-label="Your reasoning and coach feedback">
          <div className={`answer-review-row ${rangeMatches ? "row-correct" : "row-fix"}`}>
            <span className="row-status">{rangeMatches ? "✓" : "!"}</span>
            <div><span>Opponent most often</span><strong>{selectedRange.label}</strong>{!rangeMatches && <small>Coach foundation: {correctRange.label}</small>}</div>
            <b>{rangeMatches ? "Sound" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${handMatches ? "row-correct" : "row-fix"}`}>
            <span className="row-status">{handMatches ? "✓" : "!"}</span>
            <div><span>Your hand beats</span><strong>{selectedHandPosition.label}</strong>{!handMatches && <small>Coach foundation: {correctHandPosition.label}</small>}</div>
            <b>{handMatches ? "Sound" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${goalMatches ? "row-correct" : goalAlternative ? "row-alternative" : "row-fix"}`}>
            <span className="row-status">{goalMatches ? "✓" : goalAlternative ? "△" : "!"}</span>
            <div><span>{scenario.id === "river-pressure" ? "Bet target" : "Purpose"}</span><strong>{selectedGoal.label}</strong>{!goalSound && <small>Coach foundation: {correctGoal.label}</small>}</div>
            <b>{goalMatches ? "Sound" : goalAlternative ? "Coherent alternative" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${actionAssessment.status === "matched" ? "row-correct" : actionAssessment.status === "reasonable" ? "row-alternative" : "row-fix"}`}>
            <span className="row-status">{actionAssessment.status === "matched" ? "✓" : actionAssessment.status === "reasonable" ? "△" : "!"}</span>
            <div><span>Action and size</span><strong>{playerAction.label}</strong>{actionAssessment.status !== "matched" && <small>Authored example: {coachAction.label}</small>}</div>
            <b>{actionAssessment.label}</b>
          </div>
        </div>

        {firstFix && <div className="first-fix"><span>First place to fix</span><strong>{firstFix.answer}</strong><p>{firstFix.explanation}</p></div>}
        {!firstFix && <div className="alternative-note"><span>What the coach can and cannot claim</span><p>{actionAssessment.explanation}</p></div>}

        <div className="takeaway-card"><span>Takeaway</span><p>{scenario.takeaway}</p></div>

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
            <p><strong>Mostly capped:</strong> very strong hands are less common, but still possible.</p>
            <p><strong>Showdown value:</strong> your hand can still win sometimes if you check.</p>
            <p><strong>Sizing math:</strong> a $100 bluff into $92 needs about 52% folds; $150 needs about 62%. Exact sizing remains unverified.</p>
          </details>
        )}
        <details className="details-block full-review-details"><summary>When the play changes</summary><p>{scenario.reversal}</p></details>

        <div className="button-row">
          <button className="primary-button" onClick={onNext}>{scenario.transfer ? "Start over" : "Next hand"} <span aria-hidden="true">→</span></button>
          <button className="secondary-button" onClick={() => goToStep("range")}>Try again</button>
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
      <div className="progress-block" aria-label={`Step ${stepNumber} of 4`}><div><span style={{ width: `${stepNumber * 25}%` }} /></div><p>Step {stepNumber} of 4</p></div>

      {step !== "range" && <div className="thinking-breadcrumb"><span>Coach foundation carried forward</span><p>{correctedRangeLabel}{step !== "hand" && <> <b>→</b> {correctedHandLabel}</>}{step === "action" && <> <b>→</b> {goalAlternative ? selectedGoal.label : correctGoal.label}</>}</p></div>}
      {scenario.observedEvidence && (step === "goal" || step === "action") && <div className="observed-evidence"><span>Opponent clue</span><p>{scenario.observedEvidence}</p></div>}

      {step === "range" && (
        <>
          <span className="section-kicker">1 · Opponent&apos;s likely hands</span>
          <h2>{scenario.rangeQuestion}</h2>
          <p className="lead-copy">{scenario.transfer ? "Choose the biggest group." : "The opponent's likely hands are sometimes called their range. Choose the biggest group, not every possibility."}</p>
          <div className="choice-list strength-choice-list">
            {scenario.dominantRangeOptions.map((option) => <button key={option.id} className={rangeChoice === option.id ? "selected" : ""} onClick={() => setRangeChoice(option.id)} aria-pressed={rangeChoice === option.id}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          {rangeChoice && <div className={`inline-feedback ${rangeMatches ? "feedback-sound" : "feedback-fix"}`}><strong>{rangeMatches ? "Most likely: one pair." : `Use this foundation: ${correctRange.label}.`}</strong><p>{scenario.dominantRangeExplanation}</p></div>}
          <button className="primary-button" disabled={!rangeChoice} onClick={() => goToStep("hand")}>Continue <span aria-hidden="true">→</span></button>
        </>
      )}

      {step === "hand" && (
        <>
          <span className="section-kicker">2 · What your hand beats</span>
          <h2>{scenario.handPrompt}</h2>
          <p className="lead-copy">{scenario.id === "river-pressure" ? "A pair beats ace-high. Ace-high can beat a lower hand with no pair." : "Compare your actual cards with the opponent's likely hands."}</p>
          <div className="choice-list strength-choice-list">
            {scenario.handPositionOptions.map((option) => <button key={option.id} className={handPosition === option.id ? "selected" : ""} onClick={() => setHandPosition(option.id)} aria-pressed={handPosition === option.id}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          {handPosition && <div className={`inline-feedback ${handMatches ? "feedback-sound" : "feedback-fix"}`}><strong>{handMatches ? "That comparison works." : `Use this foundation: ${correctHandPosition.label}.`}</strong><p>{scenario.handPositionExplanation}</p></div>}
          <div className="button-row"><button className="secondary-button" onClick={() => goToStep("range")}>Back</button><button className="primary-button" disabled={!handPosition} onClick={() => goToStep("goal")}>Continue <span aria-hidden="true">→</span></button></div>
        </>
      )}

      {step === "goal" && (
        <>
          <span className="section-kicker">3 · What the bet must accomplish</span>
          <h2>{scenario.goalPrompt}</h2>
          <p className="lead-copy">A weaker hand calls = value. A better hand folds = bluff.</p>
          <div className="choice-list strength-choice-list">
            {scenario.goalOptions.map((option) => <button key={option.id} className={goal === option.id ? "selected" : ""} onClick={() => setGoal(option.id)} aria-pressed={goal === option.id}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          {goal && <div className={`inline-feedback ${goalSound ? "feedback-sound" : "feedback-fix"}`}><strong>{goalMatches ? "That gives the bet a clear job." : goalAlternative ? "Checking is a coherent alternative." : `Use this foundation: ${correctGoal.label}.`}</strong><p>{goalAlternative ? "Checking keeps your chance to beat a missed hand. If you do bet, the useful target is a better one-pair hand." : scenario.goalExplanation}</p></div>}
          <div className="button-row"><button className="secondary-button" onClick={() => goToStep("hand")}>Back</button><button className="primary-button" disabled={!goal} onClick={() => goToStep("action")}>Continue <span aria-hidden="true">→</span></button></div>
        </>
      )}

      {step === "action" && (
        <>
          <span className="section-kicker">4 · Choose the action</span>
          <h2>What should you do?</h2>
          <p className="decision-definition">{scenario.actionHelp}</p>
          {scenario.id === "river-pressure" && goal === "bluff" && <div className="belief-note"><span>Why a large bluff may look believable</span><p>The opponent cannot see your ace-five. Your earlier actions could also fit a hand that improved to two pair or three of a kind on the queen river. This helps the story, but it does not guarantee a fold.</p></div>}
          <div className="choice-list action-choice-list">
            {scenario.actionOptions.map((option) => <button key={option.id} className={action === option.id ? "selected" : ""} onClick={() => setAction(option.id)} aria-pressed={action === option.id}><span><strong>{option.label}</strong></span><span className="radio-dot" aria-hidden="true" /></button>)}
          </div>
          <div className="button-row"><button className="secondary-button" onClick={() => goToStep("goal")}>Back</button><button className="primary-button" disabled={!action} onClick={() => goToStep("review")}>Review my reasoning</button></div>
        </>
      )}
    </section>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("learn");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const scenario = scenarios[scenarioIndex];

  const nextScenario = () => {
    setScenarioIndex((current) => (current + 1) % scenarios.length);
  };

  const modeCopy = useMemo(() => ({
    learn: "Learn",
    quick: "Quick decision",
    coach: "Guided hand",
  }), []);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    moveToWorkArea();
  };

  const changeScenario = (nextIndex: number) => {
    setScenarioIndex(nextIndex);
    window.requestAnimationFrame(() => {
      const workspace = document.querySelector(".workspace");
      if (!workspace) return;
      window.scrollTo({ top: workspace.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" });
    });
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main-workspace" aria-label="Range Coach home">
          <span className="brand-mark">RC</span>
          <span>Range Coach</span>
        </a>
        <nav className="mode-nav" aria-label="Practice mode">
          {(Object.keys(modeCopy) as Mode[]).map((item) => (
            <button key={item} className={mode === item ? "active" : ""} onClick={() => changeMode(item)} aria-pressed={mode === item}>
              {modeCopy[item]}
            </button>
          ))}
        </nav>
        <span className="study-only">Study only · not for live play</span>
      </header>

      <section className="scenario-bar" aria-label="Choose a hand">
        <span className="scenario-label">Choose a hand</span>
        <div className="scenario-tabs">
          {scenarios.map((item, index) => (
            <button key={item.id} className={scenarioIndex === index ? "active" : ""} onClick={() => changeScenario(index)} aria-pressed={scenarioIndex === index}>
              <span>{index + 1}</span>
              <strong>{item.shortTitle}</strong>
              <small>{item.format}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="workspace" id="main-workspace">
        <HandContext key={scenario.id} scenario={scenario} />
        <div className="work-area" key={`${scenario.id}-${mode}`}>
          <div className="mobile-context-strip" aria-label="Decision now">
            <div className="mobile-context-heading"><strong>{scenario.shortTitle}</strong><span>{scenario.street} · Pot {scenario.pot} · {scenario.effective} behind</span></div>
            <div className="mobile-context-cards">
              <div><span>You</span><strong>{scenario.hero.join(" ")}</strong></div>
              <div><span>Board</span><strong>{scenario.board.join(" ")}</strong></div>
              <div><span>Opponent</span><strong>{scenario.villainPosition.split(" —")[0]}</strong></div>
            </div>
            <div className="mobile-history-title"><strong>Complete hand history</strong><span>Facts used for every answer</span></div>
            <HandTimeline scenario={scenario} compact />
          </div>
          {mode === "learn" && <LearnMode scenario={scenario} onPractice={() => changeMode("coach")} />}
          {mode === "quick" && <QuickMode scenario={scenario} onNext={nextScenario} />}
          {mode === "coach" && <CoachMode scenario={scenario} onNext={nextScenario} />}
        </div>
      </div>

      <footer className="app-footer">
        <p>Prototype lessons use fixed authored answers. Exact actions are not solver-verified yet.</p>
        <p>Adults 18+ · Educational use only · No real-money play</p>
      </footer>
    </main>
  );
}
