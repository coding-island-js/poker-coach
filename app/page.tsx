"use client";

import { useMemo, useState } from "react";

type Mode = "learn" | "quick" | "coach";
type CoachStep = "range" | "hand" | "goal" | "action" | "review";

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
  handPositionOptions: ThoughtOption[];
  handPositionAnswer: string;
  handPositionExplanation: string;
  goalOptions: ThoughtOption[];
  goalAnswer: string;
  goalExplanation: string;
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
    shortTitle: "The third check",
    format: "Live cash · $2/$5",
    street: "River",
    difficulty: "Intermediate",
    heroPosition: "Button — acts last after the flop",
    villainPosition: "Big Blind",
    opponent: "A regular who often folds rivers",
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
    lessonTitle: "A capped range has lost most of its strongest hands.",
    lessonDefinition:
      "Villain is mostly capped when their actions make sets, two pair, and other very strong hands less likely—even though an occasional trap can remain.",
    lessonWhy:
      "When Villain has many one-pair hands and few strong hands, Hero can sometimes use a large value bet or bluff. The opponent must actually fold often enough for the bluff to work.",
    lessonChecks: [
      "Name the strongest hands Villain could have.",
      "Ask whether those hands usually take this passive line.",
      "Confirm which weaker hands would fold to your chosen size.",
    ],
    rangePrompt: "Which groups of hands can Villain reasonably reach the river with?",
    rangeOptions: [
      { id: "kx", label: "One-pair kings", examples: "KJ through K9", coachNote: "A large, natural part of the flop-calling range." },
      { id: "mid", label: "Medium showdown hands", examples: "8x and 99–JJ", coachNote: "Often call once, then try to reach showdown cheaply." },
      { id: "missed", label: "Missed straight draws", examples: "76s, 65s, 54s", coachNote: "Some draws call the flop and miss by the river." },
      { id: "traps", label: "Occasional strong traps", examples: "Sets or two pair", coachNote: "Still possible, but the repeated checks reduce their frequency." },
      { id: "air", label: "Completely unconnected hands", examples: "Hands with no pair or draw", coachNote: "Most pure air folds to the flop bet." },
    ],
    rangeAnswer: ["kx", "mid", "missed", "traps"],
    rangeStory: [
      "Flop call: Villain can still have Kx, 8x, 99–JJ, missed draws, and a few traps.",
      "Turn and river checks: sets and two pair become less likely, but they do not disappear.",
      "River result: mostly one-pair hands and missed draws, with few very strong hands—so the range is mostly capped.",
    ],
    dominantRangeOptions: [
      { id: "pairs", label: "Mostly one-pair hands", detail: "Kx, 8x, and 99–JJ; plus some missed draws and rare traps." },
      { id: "air", label: "Mostly missed draws and air", detail: "Very few made hands reach the river." },
      { id: "strong", label: "Many sets and two-pair hands", detail: "Villain often slow-played a very strong hand." },
    ],
    dominantRangeAnswer: "pairs",
    dominantRangeExplanation: "The flop call keeps many one-pair hands. Two later checks discount very strong hands, but do not remove them.",
    handPositionOptions: [
      { id: "ahead", label: "Hero is ahead of most of the range", detail: "Ace-high is usually the best hand." },
      { id: "mixed", label: "Hero loses to pairs but beats some missed draws", detail: "A♣5♣ has some showdown value, but not against made hands." },
      { id: "value", label: "Hero has a strong made hand", detail: "Hero can expect worse hands to call." },
    ],
    handPositionAnswer: "mixed",
    handPositionExplanation: "A♣5♣ loses to every pair. It can still beat unpaired missed draws, so it is not pure air.",
    goalOptions: [
      { id: "value", label: "Get called by worse", detail: "Bet for value." },
      { id: "bluff", label: "Make better one-pair hands fold", detail: "Bet as a bluff." },
      { id: "showdown", label: "Take the showdown", detail: "Check and try to beat missed draws." },
    ],
    goalAnswer: "bluff",
    goalExplanation: "This lesson assumes Villain overfolds rivers, so the exploit is to make better one-pair hands fold. Without that read, checking is reasonable.",
    strengthAnswer: "Mostly capped",
    strengthExplanation:
      "Villain still has an occasional trap, but the repeated checks make very strong hands less likely than one-pair hands and missed draws.",
    actionOptions: [
      { id: "check", label: "Check behind", detail: "Keep your ace-high showdown value." },
      { id: "half", label: "Bet $50", detail: "54% pot · may not pressure enough one-pair hands." },
      { id: "large", label: "Overbet $100", detail: "109% pot · the default exploit in this lesson." },
      { id: "huge", label: "Overbet $150", detail: "163% pot · a higher-risk exploit if Villain overfolds." },
    ],
    actionAnswer: "large",
    actionGrade: "Reasonable exploit—not a universal rule",
    actionExplanation:
      "Against the stated opponent, a large bluff can pressure one-pair hands. This exact hand and size are a provisional coaching example, not a solver-verified recommendation.",
    evidence: [
      "Villain called one flop bet and then checked twice.",
      "One-pair hands naturally take this line more often than sets or two pair.",
      "The large bluff depends on the stated read that Villain folds rivers too often.",
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
    opponent: "A capable tournament regular",
    pot: "7.8 BB",
    effective: "28 BB",
    hero: ["Q♠", "J♥"],
    board: ["A♠", "7♦", "2♣", "K♣"],
    action: [
      "You raise to 2.2 BB from the Cutoff. Villain calls from the Big Blind.",
      "Both players check the flop.",
      "Villain bets 2.4 BB on the turn. It is your turn.",
    ],
    lessonTitle: "A wide range is not automatically a capped range.",
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
    handPositionOptions: [
      { id: "value", label: "Hero has a strong made hand", detail: "QJ is ahead and wants value." },
      { id: "draw", label: "Hero has a draw with little showdown value", detail: "QJ has a gutshot and may improve to a straight." },
      { id: "dead", label: "Hero is drawing dead", detail: "No river can improve the hand." },
    ],
    handPositionAnswer: "draw",
    handPositionExplanation: "QJ is usually behind made hands, but a ten completes a straight and position helps Hero realize that equity.",
    goalOptions: [
      { id: "value", label: "Raise for value", detail: "Build the pot with the best hand." },
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
      { id: "call", label: "Call 2.4 BB", detail: "Continue in position and keep the pot controlled." },
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
    opponent: "A thoughtful cold-caller",
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
    lessonTitle: "Passive action does not prove that Villain is capped.",
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
    handPositionOptions: [
      { id: "nuts", label: "Hero has the nuts", detail: "QQ is effectively unbeatable." },
      { id: "onepair", label: "Hero has a strong but vulnerable one-pair hand", detail: "QQ beats many hands but loses to the top of Villain's range." },
      { id: "bluff", label: "Hero has only a bluff", detail: "QQ has no showdown value." },
    ],
    handPositionAnswer: "onepair",
    handPositionExplanation: "QQ is often ahead, but it is not strong enough to ignore straights, sets, two pair, and raises.",
    goalOptions: [
      { id: "stack", label: "Build the biggest possible pot", detail: "Overbet and play for stacks." },
      { id: "control", label: "Control the pot and keep worse hands in", detail: "Check and prepare to bluff-catch selectively." },
      { id: "bluff", label: "Turn QQ into a bluff", detail: "Try to fold out stronger hands." },
    ],
    goalAnswer: "control",
    goalExplanation: "Checking respects Villain's uncapped range, protects Hero's checks, and keeps weaker hands and bluffs available.",
    strengthAnswer: "Uncapped",
    strengthExplanation:
      "Villain can credibly hold a straight, sets, two pair, and trapped overpairs. The strongest part of the range is fully present.",
    actionOptions: [
      { id: "check", label: "Check", detail: "Control the pot and protect your checking range." },
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
      label: "Matches this lesson",
      explanation: scenario.actionExplanation,
    };
  }

  if (scenario.id === "river-pressure" && actionId === "huge") {
    return {
      status: "reasonable",
      label: "Reasonable exploit—higher burden",
      explanation:
        "A $150 overbet may fold more one-pair hands, but it risks $150 to win $92 and needs about 62% folds to break even. Use it only with strong evidence that Villain overfolds and with value hands that can use the same size.",
    };
  }

  if (scenario.id === "river-pressure" && actionId === "check") {
    return {
      status: "reasonable",
      label: "Reasonable low-variance alternative",
      explanation:
        "Checking keeps the showdown value of ace-high and avoids bluffing when Villain may call too often. It passes on the exploit assumed by this lesson.",
    };
  }

  if (scenario.id === "river-pressure" && actionId === "half") {
    return {
      status: "review",
      label: "Too small for this goal",
      explanation:
        "A $50 bet may fold missed draws that ace-high already beats while failing to pressure enough Kx and 8x. If the goal is to fold out better one-pair hands, the size must credibly threaten those hands.",
    };
  }

  return {
    status: "review",
    label: "Does not match this lesson",
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

function HandContext({ scenario }: { scenario: Scenario }) {
  const [showAction, setShowAction] = useState(false);

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
          <span>Opponent · Villain</span>
          <strong>{scenario.villainPosition}</strong>
          <small>{scenario.opponent}</small>
        </div>
      </div>

      <div className="context-stats">
        <div><span>Pot</span><strong>{scenario.pot}</strong></div>
        <div><span>Effective stack</span><strong>{scenario.effective}</strong></div>
      </div>

      <button className="text-button action-toggle" onClick={() => setShowAction((value) => !value)} aria-expanded={showAction}>
        {showAction ? "Hide" : "Show"} how the hand developed
      </button>
      {showAction && (
        <ol className="action-timeline">
          {scenario.action.map((line) => <li key={line}>{line}</li>)}
        </ol>
      )}

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
        <div><span>1</span><p><strong>Range</strong> What is most of Villain&apos;s range?</p></div>
        <div><span>2</span><p><strong>Hand</strong> How does your actual hand perform against it?</p></div>
        <div><span>3</span><p><strong>Goal</strong> Get called by worse, fold out better, or control the pot?</p></div>
        <div><span>4</span><p><strong>Action</strong> Check, call, fold, or bet—and what size?</p></div>
      </div>

      <div className="simple-rule">
        <strong>The simple rule</strong>
        <p>A stronger range lets you apply pressure more often. It does not mean every hand should bet. Your actual hand still needs a job: value, bluff, draw, or showdown.</p>
      </div>

      <details className="details-block">
        <summary>What do capped and uncapped mean?</summary>
        <div className="definition-grid nested-definition">
          <div><span className="definition-word">Mostly capped</span><p>Villain&apos;s strongest hands are unlikely, though a few traps can remain.</p></div>
          <div><span className="definition-word">Uncapped</span><p>Villain can still credibly hold the strongest hands available.</p></div>
        </div>
      </details>

      <div className="lesson-callout">
        <span>Why it matters in this hand</span>
        <p>{scenario.lessonWhy}</p>
      </div>

      <div className="checklist-block">
        <h3>Three checks to make at the table</h3>
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
          <summary>Why this answer depends on Villain&apos;s range</summary>
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
  const [action, setAction] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);

  const selectedRange = scenario.dominantRangeOptions.find((option) => option.id === rangeChoice)!;
  const selectedHandPosition = scenario.handPositionOptions.find((option) => option.id === handPosition)!;
  const selectedGoal = scenario.goalOptions.find((option) => option.id === goal)!;
  const correctRange = scenario.dominantRangeOptions.find((option) => option.id === scenario.dominantRangeAnswer)!;
  const correctHandPosition = scenario.handPositionOptions.find((option) => option.id === scenario.handPositionAnswer)!;
  const correctGoal = scenario.goalOptions.find((option) => option.id === scenario.goalAnswer)!;
  const rangeMatches = rangeChoice === scenario.dominantRangeAnswer;
  const handMatches = handPosition === scenario.handPositionAnswer;
  const goalMatches = goal === scenario.goalAnswer;
  const playerAction = scenario.actionOptions.find((option) => option.id === action)!;
  const coachAction = scenario.actionOptions.find((option) => option.id === scenario.actionAnswer)!;
  const actionAssessment = assessAction(scenario, action);
  const reasoningAligned = rangeMatches && handMatches && goalMatches;

  const goToStep = (nextStep: CoachStep) => {
    setStep(nextStep);
    moveToWorkArea();
  };

  if (step === "review") {
    const resultHeadline = actionAssessment.status === "matched"
      ? reasoningAligned ? "You built the decision correctly." : "Your action matched. Fix the thinking below."
      : actionAssessment.status === "reasonable"
        ? reasoningAligned ? "Your thinking works. The action is a reasonable alternative." : "The action may work. Fix the thinking below."
        : "Fix the thinking before choosing the action.";
    const resultLabel = reasoningAligned ? "Thinking matched" : "Thinking needs work";

    return (
      <section className="work-card review-view" aria-live="polite">
        <div className="review-heading">
          <div>
            <span className="section-kicker">Your result</span>
            <h2>{resultHeadline}</h2>
          </div>
          <span className={`status-badge ${reasoningAligned ? "status-good" : "status-learn"}`}>
            {resultLabel}
          </span>
        </div>

        <div className="result-scorecard" aria-label="Result by decision">
          <div className={rangeMatches ? "score-good" : "score-fix"}>
            <span>Villain&apos;s range</span>
            <strong>{rangeMatches ? "Matched" : "Fix this"}</strong>
            <small>{selectedRange.label}</small>
          </div>
          <div className={handMatches ? "score-good" : "score-fix"}>
            <span>Hero&apos;s hand</span>
            <strong>{handMatches ? "Matched" : "Fix this"}</strong>
            <small>{selectedHandPosition.label}</small>
          </div>
          <div className={goalMatches ? "score-good" : "score-fix"}>
            <span>Goal</span>
            <strong>{goalMatches ? "Matched" : "Fix this"}</strong>
            <small>{selectedGoal.label}</small>
          </div>
          <div className={actionAssessment.status === "review" ? "score-fix" : "score-good"}>
            <span>Action</span>
            <strong>{actionAssessment.status === "matched" ? "Matched" : actionAssessment.status === "reasonable" ? "Reasonable" : "Fix this"}</strong>
            <small>{playerAction.label}</small>
          </div>
        </div>

        {!reasoningAligned && <div className="correction-list">
          {!rangeMatches && <div><span>Range</span><strong>{correctRange.label}</strong><p>{scenario.dominantRangeExplanation}</p></div>}
          {!handMatches && <div><span>Hero&apos;s hand</span><strong>{correctHandPosition.label}</strong><p>{scenario.handPositionExplanation}</p></div>}
          {!goalMatches && <div><span>Goal</span><strong>{correctGoal.label}</strong><p>{scenario.goalExplanation}</p></div>}
        </div>}

        <div className="review-section">
          <span className="review-label">The decision in one chain</span>
          <div className="decision-chain">
            <div><span>Range</span><p>{correctRange.label}</p></div>
            <b aria-hidden="true">→</b>
            <div><span>Hand</span><p>{correctHandPosition.label}</p></div>
            <b aria-hidden="true">→</b>
            <div><span>Goal</span><p>{correctGoal.label}</p></div>
            <b aria-hidden="true">→</b>
            <div><span>Action</span><p>{coachAction.label}</p></div>
          </div>
          <p className="chain-explanation">{scenario.goalExplanation}</p>
        </div>

        <div className="review-section action-review">
          <span className="review-label">Your decision</span>
          <h3>{playerAction.label} · {actionAssessment.label}</h3>
          <p>{actionAssessment.explanation}</p>
          {scenario.id === "river-pressure" && (
            <div className="bluff-lesson">
              <strong>What is the bluff trying to fold?</strong>
              <p>Better hands: Kx, 8x, and 99–JJ. Missed draws are not the target—your ace-high may already beat them.</p>
              <details className="details-block">
                <summary>Could you overbet bigger than $100?</summary>
                <p>Yes, if the extra size makes enough better hands fold. $100 needs about 52% folds to break even; $150 needs about 62%. “Polarized” describes the hands you bet—strong value and bluffs—not the size itself.</p>
              </details>
            </div>
          )}
        </div>

        <details className="details-block full-review-details">
          <summary>Show how the action changed Villain&apos;s range</summary>
          <ol className="line-story">{scenario.rangeStory.map((item) => <li key={item}>{item}</li>)}</ol>
        </details>

        <details className="details-block full-review-details">
          <summary>Show assumptions and when the answer changes</summary>
          <ul>{scenario.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
          <p><strong>Change the play when:</strong> {scenario.reversal}</p>
        </details>

        <div className="coach-question">
          <span>One question to take to the table</span>
          <p>{scenario.questions[questionIndex]}</p>
          <button className="text-button" onClick={() => setQuestionIndex((questionIndex + 1) % scenario.questions.length)}>Show another</button>
        </div>

        <div className="button-row">
          <button className="secondary-button" onClick={() => goToStep("range")}>Try this hand again</button>
          <button className="primary-button" onClick={onNext}>Next hand <span aria-hidden="true">→</span></button>
        </div>
      </section>
    );
  }

  const stepNumber = step === "range" ? 1 : step === "hand" ? 2 : step === "goal" ? 3 : 4;

  return (
    <section className="work-card coach-view">
      <div className="progress-block" aria-label={`Step ${stepNumber} of 4`}>
        <div><span style={{ width: `${stepNumber * 25}%` }} /></div>
        <p>Step {stepNumber} of 4</p>
      </div>

      {step === "range" && (
        <>
          <span className="section-kicker">1 · Villain&apos;s range</span>
          <h2>What is most of Villain&apos;s range?</h2>
          <p className="lead-copy">Choose the main shape. You are not checking every hand that might be possible.</p>
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
          <span className="section-kicker">2 · Hero&apos;s actual hand</span>
          <h2>How does {scenario.hero.join(" ")} perform against that range?</h2>
          <p className="lead-copy">Compare your hand with the range you just chose.</p>
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
          <span className="section-kicker">3 · Your goal</span>
          <h2>What are you trying to accomplish?</h2>
          <p className="lead-copy">Name the job before choosing the poker action.</p>
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
            <button className="primary-button" disabled={!goal} onClick={() => goToStep("action")}>Continue <span aria-hidden="true">→</span></button>
          </div>
        </>
      )}

      {step === "action" && (
        <>
          <span className="section-kicker">4 · Choose the action</span>
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
            <button className="secondary-button" onClick={() => goToStep("goal")}>Back</button>
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
          <div className="mobile-context-strip" aria-label="Hand reminder">
            <div><span>You</span><strong>{scenario.hero.join(" ")}</strong></div>
            <div><span>Board</span><strong>{scenario.board.join(" ")}</strong></div>
            <div><span>Villain</span><strong>{scenario.villainPosition.split(" —")[0]}</strong></div>
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
