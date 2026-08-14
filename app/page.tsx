"use client";

import { useMemo, useState } from "react";

type Mode = "learn" | "quick" | "coach";
type CoachStep = "range" | "strength" | "action" | "review";

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

const strengthOptions = [
  {
    id: "Mostly capped",
    label: "Mostly capped",
    detail: "Villain's very strongest hands are possible, but unlikely.",
  },
  {
    id: "Unclear",
    label: "Not enough evidence",
    detail: "The action has not clearly removed the strongest hands.",
  },
  {
    id: "Uncapped",
    label: "Uncapped",
    detail: "Villain can credibly hold the strongest hands on this board.",
  },
] as const;

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
    strengthAnswer: "Mostly capped",
    strengthExplanation:
      "Villain still has an occasional trap, but the repeated checks make very strong hands less likely than one-pair hands and missed draws.",
    actionOptions: [
      { id: "check", label: "Check behind", detail: "Take the showdown and avoid risking more chips." },
      { id: "half", label: "Bet $50", detail: "A little more than half the pot." },
      { id: "large", label: "Bet $100", detail: "A large, polarized bet—slightly more than the pot." },
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

      <div className="source-note">
        <span>Prototype coaching basis</span>
        <p>Fixed, authored answer. General concept checked; exact action awaits solver and expert review.</p>
      </div>
    </aside>
  );
}

function LearnMode({ scenario, onPractice }: { scenario: Scenario; onPractice: () => void }) {
  return (
    <section className="work-card learn-view">
      <span className="section-kicker">Learn the idea</span>
      <h2>{scenario.lessonTitle}</h2>
      <p className="lead-copy">{scenario.lessonDefinition}</p>

      <div className="definition-grid">
        <div>
          <span className="definition-word">Mostly capped</span>
          <p>Villain&apos;s strongest hands are unlikely, though a few traps can remain.</p>
        </div>
        <div>
          <span className="definition-word">Uncapped</span>
          <p>Villain can still credibly hold the strongest hands available.</p>
        </div>
      </div>

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
    const matches = choice === scenario.actionAnswer;
    return (
      <section className="work-card quick-result" aria-live="polite">
        <span className="section-kicker">Answer</span>
        <h2>{matches ? "Your choice matches the coach's plan." : "The coach prefers a different action."}</h2>
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
        <div className="verdict-block">
          <span>{scenario.actionGrade}</span>
          <p>{scenario.actionExplanation}</p>
        </div>
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
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [strength, setStrength] = useState("");
  const [action, setAction] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);

  const expected = scenario.rangeOptions.filter((option) => scenario.rangeAnswer.includes(option.id));
  const included = expected.filter((option) => selectedRange.includes(option.id));
  const missed = expected.filter((option) => !selectedRange.includes(option.id));
  const unlikely = scenario.rangeOptions.filter((option) => selectedRange.includes(option.id) && !scenario.rangeAnswer.includes(option.id));
  const rangeComplete = missed.length === 0 && unlikely.length === 0;
  const strengthMatches = strength === scenario.strengthAnswer;
  const actionMatches = action === scenario.actionAnswer;
  const coachAction = scenario.actionOptions.find((option) => option.id === scenario.actionAnswer)!;
  const playerAction = scenario.actionOptions.find((option) => option.id === action)!;

  const goToStep = (nextStep: CoachStep) => {
    setStep(nextStep);
    moveToWorkArea();
  };

  const toggleRange = (id: string) => {
    setSelectedRange((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  if (step === "review") {
    return (
      <section className="work-card review-view" aria-live="polite">
        <div className="review-heading">
          <div>
            <span className="section-kicker">Coach review</span>
            <h2>{rangeComplete && strengthMatches && actionMatches ? "Your reasoning is aligned." : "Here is where your reasoning changed course."}</h2>
          </div>
          <span className={`status-badge ${rangeComplete && strengthMatches && actionMatches ? "status-good" : "status-learn"}`}>
            {rangeComplete && strengthMatches && actionMatches ? "Aligned" : "Review"}
          </span>
        </div>

        <div className="review-section">
          <span className="review-label">1 · Villain&apos;s possible hands</span>
          <h3>{rangeComplete ? "You covered the important parts of Villain's range." : missed.length ? `Your range missed ${missed.length === 1 ? "an important hand group" : "some important hand groups"}.` : "Your range included a group that rarely reaches this point."}</h3>
          <div className="range-summary">
            {included.length > 0 && <div><span>You included</span><div className="summary-chips">{included.map((item) => <span className="chip chip-good" key={item.id}>{item.label}</span>)}</div></div>}
            {missed.length > 0 && <div><span>You missed</span><div className="summary-chips">{missed.map((item) => <span className="chip chip-missed" key={item.id}>{item.label}</span>)}</div></div>}
            {unlikely.length > 0 && <div><span>Usually folds earlier</span><div className="summary-chips">{unlikely.map((item) => <span className="chip chip-muted" key={item.id}>{item.label}</span>)}</div></div>}
          </div>
          <details className="details-block compact-details">
            <summary>See why each hand group belongs</summary>
            <div className="range-detail-list">{expected.map((item) => <div key={item.id}><strong>{item.label}</strong><span>{item.examples}</span><p>{item.coachNote}</p></div>)}</div>
          </details>
        </div>

        <div className="review-section two-column-review">
          <div>
            <span className="review-label">2 · Can Villain have the strongest hands?</span>
            <p className="your-answer">You chose <strong>{strengthOptions.find((item) => item.id === strength)?.label}</strong></p>
            <h3>Coach: {strengthOptions.find((item) => item.id === scenario.strengthAnswer)?.label}</h3>
            <p>{scenario.strengthExplanation}</p>
          </div>
          <div>
            <span className="review-label">3 · Hero&apos;s action</span>
            <p className="your-answer">You chose <strong>{playerAction.label}</strong></p>
            <h3>Coach: {coachAction.label}</h3>
            <p>{scenario.actionExplanation}</p>
          </div>
        </div>

        <div className="evidence-block">
          <div>
            <span className="review-label">Why the coach says this</span>
            <ul>{scenario.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="reversal-card">
            <span>When the answer changes</span>
            <p>{scenario.reversal}</p>
          </div>
        </div>

        <div className="coach-question">
          <span>Coach asks</span>
          <p>{scenario.questions[questionIndex]}</p>
          <button className="text-button" onClick={() => setQuestionIndex((questionIndex + 1) % scenario.questions.length)}>Ask another question</button>
        </div>

        <div className="button-row">
          <button className="secondary-button" onClick={() => goToStep("range")}>Try this hand again</button>
          <button className="primary-button" onClick={onNext}>Next hand <span aria-hidden="true">→</span></button>
        </div>
      </section>
    );
  }

  const stepNumber = step === "range" ? 1 : step === "strength" ? 2 : 3;

  return (
    <section className="work-card coach-view">
      <div className="progress-block" aria-label={`Step ${stepNumber} of 3`}>
        <div><span style={{ width: `${stepNumber * 33.333}%` }} /></div>
        <p>Step {stepNumber} of 3</p>
      </div>

      {step === "range" && (
        <>
          <span className="section-kicker">Build Villain&apos;s range</span>
          <h2>{scenario.rangePrompt}</h2>
          <p className="lead-copy">Select every reasonable group. Include discounted strong hands when they remain possible.</p>
          <div className="choice-list range-choice-list">
            {scenario.rangeOptions.map((option) => (
              <button key={option.id} className={selectedRange.includes(option.id) ? "selected" : ""} onClick={() => toggleRange(option.id)} aria-pressed={selectedRange.includes(option.id)}>
                <span className="checkbox-mark" aria-hidden="true">{selectedRange.includes(option.id) ? "✓" : ""}</span>
                <span><strong>{option.label}</strong><small>{option.examples}</small></span>
              </button>
            ))}
          </div>
          <button className="primary-button" disabled={!selectedRange.length} onClick={() => goToStep("strength")}>Continue <span aria-hidden="true">→</span></button>
        </>
      )}

      {step === "strength" && (
        <>
          <span className="section-kicker">Judge the top of Villain&apos;s range</span>
          <h2>Can Villain still have the strongest hands?</h2>
          <p className="lead-copy">Choose the best description. This is a confidence judgment, not absolute certainty.</p>
          <div className="choice-list strength-choice-list">
            {strengthOptions.map((option) => (
              <button key={option.id} className={strength === option.id ? "selected" : ""} onClick={() => setStrength(option.id)} aria-pressed={strength === option.id}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <span className="radio-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => goToStep("range")}>Back</button>
            <button className="primary-button" disabled={!strength} onClick={() => goToStep("action")}>Continue <span aria-hidden="true">→</span></button>
          </div>
        </>
      )}

      {step === "action" && (
        <>
          <span className="section-kicker">Choose Hero&apos;s action</span>
          <h2>What should you do with {scenario.hero.join(" ")}?</h2>
          <p className="lead-copy">Choose the action that follows from your estimate of Villain&apos;s range.</p>
          <div className="choice-list action-choice-list">
            {scenario.actionOptions.map((option) => (
              <button key={option.id} className={action === option.id ? "selected" : ""} onClick={() => setAction(option.id)} aria-pressed={action === option.id}>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <span className="radio-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={() => goToStep("strength")}>Back</button>
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
    coach: "Thinking coach",
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
