"use client";

import { useMemo, useState } from "react";

type Mode = "learn" | "quick" | "coach";
type CoachStep = "range" | "hand" | "goal" | "story" | "action" | "review";

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
  handPrompt: string;
  handPositionOptions: ThoughtOption[];
  handPositionAnswer: string;
  handPositionExplanation: string;
  goalOptions: ThoughtOption[];
  goalAnswer: string;
  goalExplanation: string;
  credibilityPrompt?: string;
  credibilityOptions?: ThoughtOption[];
  credibilityAnswer?: string;
  credibilityExplanation?: string;
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
    observedEvidence: "Small sample: this opponent folded to 3 of 4 comparable river bets of at least 75% of the pot.",
    takeaway: "Do not bluff missed draws you already beat. Bet only if better pairs fold often enough; checks alone do not prove a cap.",
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
      { id: "pairs", label: "Mostly one-pair hands", detail: "Kx, 8x, and 99–JJ; plus some missed 65s/54s and rare traps." },
      { id: "air", label: "Mostly missed draws and air", detail: "Very few made hands reach the river." },
      { id: "strong", label: "Many sets and two-pair hands", detail: "Villain often slow-played a very strong hand." },
    ],
    dominantRangeAnswer: "pairs",
    dominantRangeExplanation: "The flop call keeps many one-pair hands. Missed backdoor draws and occasional strong hands remain, so the checks do not prove weakness.",
    rangeBuckets: [
      { label: "Most often", detail: "Kx, 8x, and 99–JJ" },
      { label: "Sometimes", detail: "Missed 65s and 54s" },
      { label: "Still possible", detail: "Sets and two pair" },
    ],
    handPrompt: "If you check, what does A♣ 5♣ beat?",
    handPositionOptions: [
      { id: "ahead", label: "One-pair hands", detail: "Kx, 8x, and pocket pairs." },
      { id: "mixed", label: "Unpaired missed draws", detail: "A♣5♣ loses to every pair but can beat hands such as missed 65s." },
      { id: "value", label: "Nothing", detail: "This would mean ace-high has no showdown value." },
    ],
    handPositionAnswer: "mixed",
    handPositionExplanation: "A♣5♣ loses to every pair. It can still beat unpaired missed draws, so it is not pure air.",
    goalOptions: [
      { id: "value", label: "Build the pot for value", detail: "Choose this only if weaker hands can call." },
      { id: "bluff", label: "Make better one-pair hands fold", detail: "A successful bluff must fold hands that currently beat A♣5♣." },
      { id: "showdown", label: "Check and take the showdown", detail: "Keep your chance of beating a missed draw." },
    ],
    goalAnswer: "bluff",
    goalExplanation: "The observed river folds support trying to make better one-pair hands fold. Without that evidence, checking the ace-high showdown value is reasonable.",
    credibilityPrompt: "What strong hands could you credibly have after taking this line?",
    credibilityOptions: [
      { id: "credible", label: "KQ, QQ, and some slow-played strong hands", detail: "These hands can raise preflop, bet the flop, check the turn, and bet the river." },
      { id: "none", label: "No strong hands", detail: "Checking the turn removes every strong hand from your range." },
      { id: "any", label: "Any two cards", detail: "A large bet can represent strength regardless of the earlier action." },
    ],
    credibilityAnswer: "credible",
    credibilityExplanation: "Your earlier actions can credibly lead to KQ, QQ, and some slow-played strong hands. That makes the bluff believable, but it does not guarantee that the opponent folds.",
    strengthAnswer: "Unclear",
    strengthExplanation:
      "The opponent can still hold strong hands. The line looks one-pair-heavy, but the checks alone do not prove that the strongest hands are absent.",
    actionOptions: [
      { id: "check", label: "Check behind", detail: "Keep your ace-high showdown value." },
      { id: "half", label: "Bet $50", detail: "54% pot · may not pressure enough one-pair hands." },
      { id: "large", label: "Overbet $100", detail: "109% pot · the default exploit in this lesson." },
      { id: "huge", label: "Overbet $150", detail: "163% pot · a higher-risk exploit if Villain overfolds." },
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
      { id: "mixed", label: "A mix of pairs, draws, and bluffs", detail: "The small lead is wide, but strong hands still remain." },
      { id: "bluffs", label: "Mostly bluffs", detail: "The small size proves weakness." },
      { id: "nuts", label: "Mostly two pair and sets", detail: "The lead is heavily value-weighted." },
    ],
    dominantRangeAnswer: "mixed",
    dominantRangeExplanation: "A small lead can contain many weak hands without removing Ax, two pair, or sets.",
    rangeBuckets: [
      { label: "Most often", detail: "Kx, weaker pairs, draws, and bluffs" },
      { label: "Sometimes", detail: "Slow-played Ax" },
      { label: "Still possible", detail: "Two pair and sets" },
    ],
    handPrompt: "What does Q♠ J♥ have right now?",
    handPositionOptions: [
      { id: "value", label: "You have a strong made hand", detail: "QJ is ahead and wants value." },
      { id: "draw", label: "You have a draw with little showdown value", detail: "QJ has a gutshot and may improve to a straight." },
      { id: "dead", label: "You are drawing dead", detail: "No river can improve the hand." },
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
    handPrompt: "What does Q♥ Q♦ beat right now?",
    handPositionOptions: [
      { id: "nuts", label: "You have the nuts", detail: "QQ is effectively unbeatable." },
      { id: "onepair", label: "You have a strong but vulnerable one-pair hand", detail: "QQ beats many hands but loses to the top of the opponent's range." },
      { id: "bluff", label: "You have only a bluff", detail: "QQ has no showdown value." },
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
];

function assessAction(scenario: Scenario, actionId: string): ActionAssessment {
  if (actionId === scenario.actionAnswer) {
    return {
      status: "matched",
      label: "Correct",
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
        "Checking keeps the showdown value of ace-high and avoids overreacting to a small sample. It passes on the possible exploit suggested by the observed folds.",
    };
  }

  if (scenario.id === "river-pressure" && actionId === "half") {
    return {
      status: "review",
      label: "Needs work",
      explanation:
        "A $50 bet may fold missed draws that ace-high already beats while failing to pressure enough Kx and 8x. If the goal is to fold out better one-pair hands, the size must credibly threaten those hands.",
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

function LearnMode({ scenario, onPractice }: { scenario: Scenario; onPractice: () => void }) {
  return (
    <section className="work-card learn-view">
      <span className="section-kicker">Learn the idea</span>
      <h2>{scenario.lessonTitle}</h2>
      <p className="lead-copy">{scenario.lessonDefinition}</p>

      <div className="thought-framework">
        <div><span>1</span><p><strong>Estimate their hands</strong> Use every action to decide what the opponent holds most often.</p></div>
        <div><span>2</span><p><strong>Compare your hand</strong> Ask what your actual cards beat if you check or call.</p></div>
        <div><span>3</span><p><strong>Give the bet a purpose</strong> Build the pot with weaker callers or bluff better hands that can fold.</p></div>
        <div><span>4</span><p><strong>Choose the play</strong> Pick the action and size that can accomplish that purpose.</p></div>
      </div>

      <div className="simple-rule">
        <strong>What a bet can accomplish</strong>
        <p><b>Build the pot:</b> bet when weaker hands or draws can continue.</p>
        <p><b>Bluff:</b> bet when enough better hands can fold.</p>
        <p><b>See the next card or showdown:</b> check or call when betting would mostly keep stronger hands and lose weaker ones.</p>
        <p><b>Flop and turn:</b> a bet can also charge draws. On the river, there is no next card—the bet is value or a bluff.</p>
      </div>

      <details className="details-block">
        <summary>Poker term: capped and uncapped</summary>
        <div className="definition-grid nested-definition">
          <div><span className="definition-word">Mostly capped</span><p>The earlier actions make the opponent&apos;s very strongest hands less likely, but not impossible.</p></div>
          <div><span className="definition-word">Uncapped</span><p>The opponent&apos;s earlier actions can still lead naturally to the strongest hands.</p></div>
        </div>
      </details>

      <div className="lesson-callout">
        <span>Why it matters in this hand</span>
        <p>{scenario.lessonWhy}</p>
      </div>

      <div className="checklist-block">
        <h3>Questions to ask at the table</h3>
        <ol>{scenario.lessonChecks.map((item) => <li key={item}>{item}</li>)}</ol>
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
      <div className="choice-list action-choice-list">
        {scenario.actionOptions.map((option) => (
          <button key={option.id} className={choice === option.id ? "selected" : ""} onClick={() => setChoice(option.id)} aria-pressed={choice === option.id}>
            <span><strong>{option.label}</strong><small>{option.detail}</small></span>
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
  const [credibility, setCredibility] = useState("");
  const [action, setAction] = useState("");

  const selectedRange = scenario.dominantRangeOptions.find((option) => option.id === rangeChoice)!;
  const selectedHandPosition = scenario.handPositionOptions.find((option) => option.id === handPosition)!;
  const selectedGoal = scenario.goalOptions.find((option) => option.id === goal)!;
  const selectedCredibility = scenario.credibilityOptions?.find((option) => option.id === credibility);
  const correctRange = scenario.dominantRangeOptions.find((option) => option.id === scenario.dominantRangeAnswer)!;
  const correctHandPosition = scenario.handPositionOptions.find((option) => option.id === scenario.handPositionAnswer)!;
  const correctGoal = scenario.goalOptions.find((option) => option.id === scenario.goalAnswer)!;
  const correctCredibility = scenario.credibilityOptions?.find((option) => option.id === scenario.credibilityAnswer);
  const rangeMatches = rangeChoice === scenario.dominantRangeAnswer;
  const handMatches = handPosition === scenario.handPositionAnswer;
  const goalMatches = goal === scenario.goalAnswer;
  const credibilityMatches = !scenario.credibilityOptions || credibility === scenario.credibilityAnswer;
  const playerAction = scenario.actionOptions.find((option) => option.id === action)!;
  const coachAction = scenario.actionOptions.find((option) => option.id === scenario.actionAnswer)!;
  const actionAssessment = assessAction(scenario, action);
  const reasoningAligned = rangeMatches && handMatches && goalMatches && credibilityMatches;

  const goToStep = (nextStep: CoachStep) => {
    setStep(nextStep);
    moveToWorkArea();
  };

  if (step === "review") {
    const firstFix = !rangeMatches
      ? { label: "Opponent's likely hands", answer: correctRange.label, explanation: scenario.dominantRangeExplanation }
      : !handMatches
        ? { label: "Your hand", answer: correctHandPosition.label, explanation: scenario.handPositionExplanation }
        : !goalMatches
          ? { label: "Goal", answer: correctGoal.label, explanation: scenario.goalExplanation }
          : !credibilityMatches && correctCredibility
            ? { label: "Bluff story", answer: correctCredibility.label, explanation: scenario.credibilityExplanation ?? "Your previous actions must support the strength you represent." }
          : actionAssessment.status === "review"
            ? { label: "Action", answer: coachAction.label, explanation: actionAssessment.explanation }
            : null;
    const gradedSteps = [rangeMatches, handMatches, goalMatches, ...(scenario.credibilityOptions ? [credibilityMatches] : []), actionAssessment.status === "matched"];
    const correctSteps = gradedSteps.filter(Boolean).length;
    const resultHeadline = reasoningAligned && actionAssessment.status === "reasonable"
      ? `Good read. Your ${playerAction.label} is plausible, not proven.`
      : reasoningAligned && actionAssessment.status === "matched"
        ? "Good read. Your action matches the lesson."
        : `Fix ${firstFix?.label.toLowerCase()} first.`;
    const resultSummary = `${correctSteps} correct${actionAssessment.status === "reasonable" ? " · 1 defensible alternative" : firstFix ? " · review the first broken link" : ""}`;

    return (
      <section className="work-card review-view" aria-live="polite">
        <div className="review-heading">
          <div>
            <span className="section-kicker">{resultSummary}</span>
            <h2>{resultHeadline}</h2>
          </div>
        </div>

        <div className="answer-review-list" aria-label="Your answers and coach feedback">
          <div className={`answer-review-row ${rangeMatches ? "row-correct" : "row-fix"}`}>
            <span className="row-status">{rangeMatches ? "✓" : "!"}</span>
            <div><span>Opponent&apos;s likely hands</span><strong>{selectedRange.label}</strong>{!rangeMatches && <small>Coach: {correctRange.label}</small>}</div>
            <b>{rangeMatches ? "Correct" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${handMatches ? "row-correct" : "row-fix"}`}>
            <span className="row-status">{handMatches ? "✓" : "!"}</span>
            <div><span>Your hand</span><strong>{selectedHandPosition.label}</strong>{!handMatches && <small>Coach: {correctHandPosition.label}</small>}</div>
            <b>{handMatches ? "Correct" : "Needs work"}</b>
          </div>
          <div className={`answer-review-row ${goalMatches ? "row-correct" : "row-fix"}`}>
            <span className="row-status">{goalMatches ? "✓" : "!"}</span>
            <div><span>Goal</span><strong>{selectedGoal.label}</strong>{!goalMatches && <small>Coach: {correctGoal.label}</small>}</div>
            <b>{goalMatches ? "Correct" : "Needs work"}</b>
          </div>
          {scenario.credibilityOptions && selectedCredibility && correctCredibility && (
            <div className={`answer-review-row ${credibilityMatches ? "row-correct" : "row-fix"}`}>
              <span className="row-status">{credibilityMatches ? "✓" : "!"}</span>
              <div><span>Bluff story</span><strong>{selectedCredibility.label}</strong>{!credibilityMatches && <small>Coach: {correctCredibility.label}</small>}</div>
              <b>{credibilityMatches ? "Correct" : "Needs work"}</b>
            </div>
          )}
          <div className={`answer-review-row ${actionAssessment.status === "matched" ? "row-correct" : actionAssessment.status === "reasonable" ? "row-alternative" : "row-fix"}`}>
            <span className="row-status">{actionAssessment.status === "matched" ? "✓" : actionAssessment.status === "reasonable" ? "△" : "!"}</span>
            <div><span>Action &amp; size</span><strong>{playerAction.label}</strong>{actionAssessment.status !== "matched" && <small>Lesson baseline: {coachAction.label}</small>}</div>
            <b>{actionAssessment.label}</b>
          </div>
        </div>

        {firstFix && <div className="first-fix"><span>First place to fix</span><strong>{firstFix.label}: {firstFix.answer}</strong><p>{firstFix.explanation}</p></div>}

        {!firstFix && actionAssessment.status === "reasonable" && <div className="alternative-note"><span>Why the extra size needs more evidence</span><p>{actionAssessment.explanation}</p>{scenario.id === "river-pressure" && <p><strong>$150 must work about 62% of the time.</strong> Use it only when the extra $50 makes meaningfully more pairs fold than $100.</p>}</div>}

        {!firstFix && actionAssessment.status === "matched" && <div className="alternative-note"><span>Why it works in this lesson</span><p>{actionAssessment.explanation}</p></div>}

        <div className="takeaway-card"><span>Takeaway</span><p>{scenario.takeaway}</p></div>

        <details className="details-block full-review-details">
          <summary>Why this answer</summary>
          <ol className="line-story">{scenario.rangeStory.map((item) => <li key={item}>{item}</li>)}</ol>
          {scenario.id === "river-pressure" && <p><strong>Bluff target:</strong> 8x and 99–JJ, plus weak Kx only if the overfold read is strong. A5 already beats many missed draws.</p>}
        </details>

        <details className="details-block full-review-details">
          <summary>When the play changes</summary>
          <ul>{scenario.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
          <p><strong>Change the play when:</strong> {scenario.reversal}</p>
        </details>

        <details className="details-block full-review-details"><summary>Advanced coach question</summary><p>{scenario.questions[0]}</p></details>

        <div className="button-row">
          <button className="primary-button" onClick={onNext}>Next hand <span aria-hidden="true">→</span></button>
          <button className="secondary-button" onClick={() => goToStep("range")}>Try again</button>
        </div>
      </section>
    );
  }

  const totalSteps = scenario.credibilityOptions ? 5 : 4;
  const stepNumber = step === "range" ? 1 : step === "hand" ? 2 : step === "goal" ? 3 : step === "story" ? 4 : totalSteps;

  return (
    <section className="work-card coach-view">
      <div className="progress-block" aria-label={`Step ${stepNumber} of ${totalSteps}`}>
        <div><span style={{ width: `${(stepNumber / totalSteps) * 100}%` }} /></div>
        <p>Step {stepNumber} of {totalSteps}</p>
      </div>
      {step === "hand" && (
        <div className={`range-check ${rangeMatches ? "range-check-correct" : "range-check-fix"}`}>
          <div><span>Range check</span><strong>{rangeMatches ? "Good foundation" : `Adjust toward: ${correctRange.label}`}</strong></div>
          <div className="range-buckets">
            {scenario.rangeBuckets.map((bucket) => <p key={bucket.label}><b>{bucket.label}</b><span>{bucket.detail}</span></p>)}
          </div>
          <small>Very strong hands can remain possible even when they are not the center of the range.</small>
        </div>
      )}
      {step !== "range" && step !== "hand" && <div className="thinking-breadcrumb"><span>Your reasoning so far</span><p>{selectedRange?.label} <b>→</b> {selectedHandPosition?.label}{step !== "goal" && <> <b>→</b> {selectedGoal?.label}</>}{step === "action" && selectedCredibility && <> <b>→</b> {selectedCredibility.label}</>}</p></div>}
      {scenario.observedEvidence && (step === "goal" || step === "story" || step === "action") && (
        <div className="observed-evidence"><span>Observed at this table</span><p>{scenario.observedEvidence}</p><small>Use this small sample as evidence, not certainty.</small></div>
      )}

      {step === "range" && (
        <>
          <span className="section-kicker">1 · Opponent&apos;s likely hands</span>
          <h2>After the complete action, what does the opponent hold most often?</h2>
          <p className="lead-copy">Choose the center of the range—not every hand that remains possible.</p>
          <div className="choice-list strength-choice-list">
            {scenario.dominantRangeOptions.map((option) => (
              <button key={option.id} className={rangeChoice === option.id ? "selected" : ""} onClick={() => setRangeChoice(option.id)} aria-pressed={rangeChoice === option.id}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <span className="radio-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button className="primary-button" disabled={!rangeChoice} onClick={() => goToStep("hand")}>Continue <span aria-hidden="true">→</span></button>
        </>
      )}

      {step === "hand" && (
        <>
          <span className="section-kicker">2 · Your actual hand</span>
          <h2>{scenario.handPrompt}</h2>
          <p className="lead-copy">Use your real cards—not the strong hands your betting line might represent.</p>
          <div className="choice-list strength-choice-list">
            {scenario.handPositionOptions.map((option) => (
              <button key={option.id} className={handPosition === option.id ? "selected" : ""} onClick={() => setHandPosition(option.id)} aria-pressed={handPosition === option.id}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <span className="radio-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => goToStep("range")}>Back</button>
            <button className="primary-button" disabled={!handPosition} onClick={() => goToStep("goal")}>Continue <span aria-hidden="true">→</span></button>
          </div>
        </>
      )}

      {step === "goal" && (
        <>
          <span className="section-kicker">3 · The action&apos;s job</span>
          <h2>What should your next action accomplish?</h2>
          <p className="lead-copy">Build a pot with weaker callers, make better hands fold, or continue without raising.</p>
          <div className="choice-list strength-choice-list">
            {scenario.goalOptions.map((option) => (
              <button key={option.id} className={goal === option.id ? "selected" : ""} onClick={() => setGoal(option.id)} aria-pressed={goal === option.id}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <span className="radio-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => goToStep("hand")}>Back</button>
            <button className="primary-button" disabled={!goal} onClick={() => goToStep(scenario.credibilityOptions ? "story" : "action")}>Continue <span aria-hidden="true">→</span></button>
          </div>
        </>
      )}

      {step === "story" && scenario.credibilityOptions && (
        <>
          <span className="section-kicker">4 · Is the bluff believable?</span>
          <h2>{scenario.credibilityPrompt}</h2>
          <p className="lead-copy">Your previous actions limit the strong hands you can credibly represent. A believable story still needs an opponent who will fold.</p>
          <div className="choice-list strength-choice-list">
            {scenario.credibilityOptions.map((option) => (
              <button key={option.id} className={credibility === option.id ? "selected" : ""} onClick={() => setCredibility(option.id)} aria-pressed={credibility === option.id}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <span className="radio-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => goToStep("goal")}>Back</button>
            <button className="primary-button" disabled={!credibility} onClick={() => goToStep("action")}>Continue <span aria-hidden="true">→</span></button>
          </div>
        </>
      )}

      {step === "action" && (
        <>
          <span className="section-kicker">{totalSteps} · Choose the action</span>
          <h2>What should you do with {scenario.hero.join(" ")}?</h2>
          <p className="lead-copy">Choose the action that serves the goal you just named.</p>
          <div className="choice-list action-choice-list">
            {scenario.actionOptions.map((option) => (
              <button key={option.id} className={action === option.id ? "selected" : ""} onClick={() => setAction(option.id)} aria-pressed={action === option.id}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <span className="radio-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => goToStep(scenario.credibilityOptions ? "story" : "goal")}>Back</button>
            <button className="primary-button" disabled={!action} onClick={() => goToStep("review")}>Review my reasoning</button>
          </div>
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
