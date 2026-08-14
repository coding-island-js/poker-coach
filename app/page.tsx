"use client";

import { useMemo, useState } from "react";

type RangeOption = {
  id: string;
  label: string;
  detail: string;
};

type Scenario = {
  id: string;
  number: string;
  format: string;
  title: string;
  level: string;
  opponent: string;
  heroPosition: string;
  villainPosition: string;
  pot: string;
  effective: string;
  hero: string[];
  board: string[];
  action: string[];
  prompt: string;
  rangeOptions: RangeOption[];
  rangeAnswer: string[];
  capOptions: string[];
  capAnswer: string;
  responseOptions: string[];
  responseAnswer: string;
  feedback: string;
  caution: string;
  capEvidence: string[];
  questions: string[];
};

const scenarios: Scenario[] = [
  {
    id: "river-pressure",
    number: "01",
    format: "LIVE CASH · $2/$5",
    title: "The third check",
    level: "Intermediate",
    opponent: "Fit-or-fold regular",
    heroPosition: "Button (last to act after the flop)",
    villainPosition: "Big Blind",
    pot: "$92",
    effective: "$940",
    hero: ["A♣", "5♣"],
    board: ["K♦", "8♣", "3♠", "2♥", "Q♠"],
    action: [
      "Preflop: You (Button) raise to $20 · Villain (Big Blind) calls",
      "Flop: Villain checks · You bet $25 · Villain calls",
      "Turn: Villain checks · You check behind",
      "River: Villain checks · It is your turn",
    ],
    prompt: "Start with Villain: which hands could the opponent still have after this action?",
    rangeOptions: [
      { id: "kx", label: "One-pair Kx", detail: "KJ–K9 that took the passive line" },
      { id: "mid", label: "8x / 99–JJ", detail: "Showdown hands protecting pot size" },
      { id: "missed", label: "Missed draws", detail: "76s, 65s, 54s at some frequency" },
      { id: "traps", label: "Sets / two pair", detail: "Possible, but heavily discounted" },
      { id: "air", label: "Complete air", detail: "Rare after calling the flop" },
    ],
    rangeAnswer: ["kx", "mid", "missed", "traps"],
    capOptions: ["Mostly capped", "Unclear", "Uncapped"],
    capAnswer: "Mostly capped",
    responseOptions: ["Check back", "Bet 55%", "Polarize 110%"],
    responseAnswer: "Polarize 110%",
    feedback:
      "Good pressure point. Villain reaches the river with many one-pair hands and few natural raises. Your line still represents KQ, QQ and delayed strength. Against this specific overfolder, A♣5♣ is a reasonable low-showdown bluff candidate.",
    caution:
      "Capped is not empty. If this player traps or calls too wide, the exploit disappears—downgrade the bluff rather than forcing the label.",
    capEvidence: [
      "Villain called one small flop bet, then checked both later streets.",
      "Most sets and two-pair hands often raise or bet somewhere, so they are discounted—not impossible.",
      "The stated player profile overfolds rivers after passive lines; that read is what supports the large bluff.",
    ],
    questions: [
      "Which value hands would you use with the same size?",
      "What observed tendency makes this bluff better than checking?",
      "Which river cards would make villain's range less capped?",
    ],
  },
  {
    id: "bubble-discipline",
    number: "02",
    format: "MTT · 32 BB · BUBBLE",
    title: "Pressure has a price",
    level: "Intermediate",
    opponent: "Capable big blind",
    heroPosition: "Cutoff (two seats before the Button)",
    villainPosition: "Big Blind",
    pot: "7.8 BB",
    effective: "28 BB",
    hero: ["Q♠", "J♥"],
    board: ["A♠", "7♦", "2♣", "K♣"],
    action: [
      "Preflop: You (Cutoff) raise to 2.2 BB · Villain (Big Blind) calls",
      "Flop: Villain checks · You check behind",
      "Turn: Villain bets 2.4 BB · It is your turn",
    ],
    prompt: "Which hands could Villain lead after you both checked the flop? Keep the strongest hands in view.",
    rangeOptions: [
      { id: "ax", label: "Slow-played Ax", detail: "Still present after the flop check" },
      { id: "kx", label: "Turned Kx", detail: "Natural thin-value / protection leads" },
      { id: "pairs", label: "7x / pocket pairs", detail: "Small value and denial bets" },
      { id: "draws", label: "Draws and stabs", detail: "QJ, JT, clubs and floats" },
      { id: "sets", label: "Two pair / sets", detail: "Low frequency, never impossible" },
    ],
    rangeAnswer: ["ax", "kx", "pairs", "draws", "sets"],
    capOptions: ["Mostly capped", "Unclear", "Uncapped"],
    capAnswer: "Unclear",
    responseOptions: ["Fold", "Call in position", "Raise 3.2×"],
    responseAnswer: "Call in position",
    feedback:
      "The lead is wide, but not cleanly capped. Q♠J♥ has a gutshot, position and enough equity to continue without inflating a bubble pot. Calling preserves weaker bluffs and lets the river reveal more.",
    caution:
      "Tournament pressure changes risk, not hand-reading fundamentals. Add payout and stack context before converting every wide range into a raise target.",
    capEvidence: [
      "Villain's small turn bet can include weak pairs and bluffs, so the range is wide.",
      "Villain can still hold Ax, K7, A7, A2 or slow-played strong hands, so the top is not removed.",
      "Because the evidence points both ways, 'unclear' is more accurate than forcing a capped label.",
    ],
    questions: [
      "Which river cards improve your range more than villain's?",
      "How would a 12 BB stack behind you change the bubble pressure?",
      "What does the small sizing tell you—and what does it not tell you?",
    ],
  },
  {
    id: "false-cap",
    number: "03",
    format: "LIVE CASH · $5/$10",
    title: "Don’t invent the cap",
    level: "Advanced",
    opponent: "Thoughtful cold-caller",
    heroPosition: "Cutoff",
    villainPosition: "Button (last to act after the flop)",
    pot: "$485",
    effective: "$1,760",
    hero: ["Q♥", "Q♦"],
    board: ["J♣", "7♠", "2♦", "T♠"],
    action: [
      "Preflop: UTG raises $35 · You (Cutoff) re-raise to $120",
      "Villain (Button) calls your re-raise · UTG folds",
      "Flop: You bet $80 · Villain calls",
      "Turn: T♠ · It is your turn",
    ],
    prompt: "What could Villain have after calling your re-raise and flop bet—especially on this turn?",
    rangeOptions: [
      { id: "overpairs", label: "QQ–AA", detail: "Traps and protected cold-calls" },
      { id: "sets", label: "JJ / TT / 77", detail: "Strong hands that continue flop" },
      { id: "two", label: "JT suited", detail: "Now two pair at some frequency" },
      { id: "jacks", label: "AJ / KJ / QJ", detail: "Top-pair continues" },
      { id: "spades", label: "Spade draws", detail: "Equity-rich floats and calls" },
    ],
    rangeAnswer: ["overpairs", "sets", "two", "jacks", "spades"],
    capOptions: ["Mostly capped", "Unclear", "Uncapped"],
    capAnswer: "Uncapped",
    responseOptions: ["Check", "Bet 40%", "Overbet 125%"],
    responseAnswer: "Check",
    feedback:
      "This range keeps real nut combinations: slow-played overpairs, sets and JT suited. The T♠ also strengthens draws. Checking controls the pot, protects your checking range and avoids turning an overpair into an automatic stack-off.",
    caution:
      "A passive action does not prove a capped range. Build the combinations first; apply the label second.",
    capEvidence: [
      "Calling a re-raise can still contain trapped AA–QQ and strong suited hands.",
      "After the flop call, sets, top pair and spade draws all remain plausible.",
      "The T♠ creates two pair, a set of tens and stronger draws, so Villain can still hold the strongest hands.",
    ],
    questions: [
      "Which worse hands can comfortably call another bet?",
      "What is your plan versus a large turn bet after checking?",
      "Which blockers matter if you later turn QQ into a bluff-catcher?",
    ],
  },
];

function isRedCard(card: string) {
  return card.includes("♥") || card.includes("♦");
}

export default function Home() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [capChoice, setCapChoice] = useState("");
  const [responseChoice, setResponseChoice] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const scenario = scenarios[scenarioIndex];

  const rangeScore = useMemo(() => {
    const correct = selectedRange.filter((id) => scenario.rangeAnswer.includes(id)).length;
    const extras = selectedRange.filter((id) => !scenario.rangeAnswer.includes(id)).length;
    return Math.max(0, correct - extras);
  }, [scenario, selectedRange]);

  const reset = (nextIndex = scenarioIndex) => {
    setScenarioIndex(nextIndex);
    setSelectedRange([]);
    setCapChoice("");
    setResponseChoice("");
    setReviewed(false);
    setQuestionIndex(0);
  };

  const toggleRange = (id: string) => {
    setReviewed(false);
    setSelectedRange((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const ready = selectedRange.length > 0 && capChoice && responseChoice;
  const classificationCorrect = capChoice === scenario.capAnswer;
  const responseCorrect = responseChoice === scenario.responseAnswer;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Range Coach home">
          <span className="brand-mark">RC</span>
          <span>RANGE COACH</span>
        </a>
        <div className="session-label">
          <span className="live-dot" />
          DECISION LAB · SESSION 04
        </div>
        <button className="quiet-button" onClick={() => reset()}>
          Reset hand
        </button>
      </header>

      <div className="workspace" id="top">
        <aside className="scenario-rail" aria-label="Scenario queue">
          <div className="rail-heading">
            <span>SCENARIO QUEUE</span>
            <strong>{String(scenarios.length).padStart(2, "0")}</strong>
          </div>
          <div className="scenario-list">
            {scenarios.map((item, index) => (
              <button
                key={item.id}
                className={`scenario-card ${index === scenarioIndex ? "active" : ""}`}
                onClick={() => reset(index)}
                aria-current={index === scenarioIndex ? "true" : undefined}
              >
                <span className="scenario-number">{item.number}</span>
                <span className="scenario-copy">
                  <small>{item.format}</small>
                  <strong>{item.title}</strong>
                  <em>{item.level}</em>
                </span>
                <span className="scenario-arrow">↗</span>
              </button>
            ))}
          </div>
          <div className="rail-note">
            <span>COACHING LOOP</span>
            <p>Observe → Range → Classify → Respond → Explain</p>
          </div>
        </aside>

        <section className="main-stage">
          <div className="hand-header">
            <div>
              <div className="eyebrow">{scenario.format}</div>
              <h1>{scenario.title}</h1>
              <p>{scenario.prompt}</p>
            </div>
            <div className="hand-meta">
              <div><span>POT</span><strong>{scenario.pot}</strong></div>
              <div><span>EFFECTIVE</span><strong>{scenario.effective}</strong></div>
            </div>
          </div>

          <div className="role-strip" aria-label="Players in this hand">
            <div className="role-you">
              <span>YOU · HERO</span>
              <strong>{scenario.heroPosition}</strong>
            </div>
            <div className="role-vs">VERSUS</div>
            <div className="role-villain">
              <span>OPPONENT · VILLAIN</span>
              <strong>{scenario.villainPosition} · {scenario.opponent}</strong>
            </div>
          </div>

          <div className="table-card">
            <div className="felt-glow" />
            <div className="opponent-tag">
              <span>OPPONENT · VILLAIN</span>
              <strong>{scenario.villainPosition}</strong>
            </div>
            <div className="board" aria-label={`Board: ${scenario.board.join(" ")}`}>
              {scenario.board.map((card, index) => (
                <div className={`playing-card ${isRedCard(card) ? "red" : ""}`} key={`${card}-${index}`}>
                  {card}
                </div>
              ))}
            </div>
            <div className="hero-hand">
              <span>YOU · HERO · {scenario.heroPosition.split(" (")[0].toUpperCase()}</span>
              <div>
                {scenario.hero.map((card) => (
                  <div className={`playing-card hero-card ${isRedCard(card) ? "red" : ""}`} key={card}>
                    {card}
                  </div>
                ))}
              </div>
            </div>
            <div className="action-log">
              {scenario.action.map((line) => <span key={line}>{line}</span>)}
            </div>
          </div>

          <div className="decision-grid">
            <section className="decision-panel range-panel">
              <div className="panel-title">
                <span>01</span>
                <div><small>VILLAIN'S POSSIBLE HANDS</small><h2>What could the opponent have?</h2></div>
              </div>
              <p className="panel-instruction">Select every hand group Villain could reasonably hold—not just the hands you hope they have.</p>
              <div className="range-options">
                {scenario.rangeOptions.map((option) => {
                  const selected = selectedRange.includes(option.id);
                  const missed = reviewed && scenario.rangeAnswer.includes(option.id) && !selected;
                  return (
                    <button
                      key={option.id}
                      className={`${selected ? "selected" : ""} ${missed ? "missed" : ""}`}
                      onClick={() => toggleRange(option.id)}
                      aria-pressed={selected}
                    >
                      <span className="check-mark">{selected ? "✓" : "+"}</span>
                      <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="decision-panel">
              <div className="panel-title">
                <span>02</span>
                <div><small>READ THE TOP OF THE RANGE</small><h2>Can Villain still have the strongest hands?</h2></div>
              </div>
              <div className="cap-guide">
                <p><strong>Mostly capped</strong><span>Strongest hands are unlikely, but not impossible.</span></p>
                <p><strong>Unclear</strong><span>The action does not give enough evidence yet.</span></p>
                <p><strong>Uncapped</strong><span>Villain can still credibly have the strongest hands.</span></p>
              </div>
              <div className="segmented-control">
                {scenario.capOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => { setCapChoice(option); setReviewed(false); }}
                    className={capChoice === option ? "selected" : ""}
                    aria-pressed={capChoice === option}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="microcopy">This is a confidence judgment based on the action, board and player—not a proven fact.</p>

              <div className="panel-title response-title">
                <span>03</span>
                <div><small>YOUR PLAY · HERO</small><h2>What should you do with your hand?</h2></div>
              </div>
              <div className="response-options">
                {scenario.responseOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => { setResponseChoice(option); setReviewed(false); }}
                    className={responseChoice === option ? "selected" : ""}
                    aria-pressed={responseChoice === option}
                  >
                    <span>{option}</span><b>→</b>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <button
            className="review-button"
            disabled={!ready}
            onClick={() => setReviewed(true)}
          >
            Show the coach's range &amp; plan <span>⌘ ↵</span>
          </button>

          {reviewed && (
            <section className="coach-review" aria-live="polite">
              <div className="review-kicker">HAND RECAP + COACH EXPLANATION</div>
              <div className="review-context">
                <div>
                  <span>YOU · HERO</span>
                  <strong>{scenario.hero.join(" ")} · {scenario.heroPosition}</strong>
                </div>
                <div className="review-board">
                  <span>BOARD</span>
                  <strong>{scenario.board.join("  ")}</strong>
                </div>
                <div>
                  <span>OPPONENT · VILLAIN</span>
                  <strong>{scenario.villainPosition} · {scenario.opponent}</strong>
                </div>
              </div>
              <div className="review-action">
                <span>HOW WE GOT HERE</span>
                <p>{scenario.action.join("  →  ")}</p>
              </div>
              <div className="score-row">
                <div className={rangeScore === scenario.rangeAnswer.length ? "pass" : "adjust"}>
                  <span>VILLAIN RANGE</span><strong>{rangeScore}/{scenario.rangeAnswer.length} key groups</strong>
                </div>
                <div className={classificationCorrect ? "pass" : "adjust"}>
                  <span>CAN VILLAIN HAVE THE NUTS?</span><strong>{classificationCorrect ? `${capChoice} fits` : `Coach: ${scenario.capAnswer}`}</strong>
                </div>
                <div className={responseCorrect ? "pass" : "adjust"}>
                  <span>YOUR PLAY</span><strong>{responseCorrect ? `${responseChoice} fits` : `Coach: ${scenario.responseAnswer}`}</strong>
                </div>
              </div>
              <div className="comparison-row">
                <div>
                  <span>YOUR READ</span>
                  <p>Villain is <strong>{capChoice.toLowerCase()}</strong>; you chose <strong>{responseChoice}</strong>.</p>
                </div>
                <div>
                  <span>COACH'S READ</span>
                  <p>Villain is <strong>{scenario.capAnswer.toLowerCase()}</strong>; the suggested play is <strong>{scenario.responseAnswer}</strong>.</p>
                </div>
              </div>
              <div className="coach-copy">
                <div className="coach-avatar">C</div>
                <div>
                  <h3>{classificationCorrect && responseCorrect ? "The story holds together." : "Tighten the chain of reasoning."}</h3>
                  <p>{scenario.feedback}</p>
                  <div className="caution"><span>WATCH-OUT</span>{scenario.caution}</div>
                </div>
              </div>
              <div className="coach-basis">
                <div className="basis-heading">
                  <span>WHY THE COACH SAYS THIS</span>
                  <p>This answer comes from the card combinations still possible, the betting action, the board, and the stated player profile. It is an authored poker judgment—not a hidden AI certainty.</p>
                </div>
                <ol>
                  {scenario.capEvidence.map((item) => <li key={item}>{item}</li>)}
                </ol>
              </div>
              <div className="socratic-row">
                <p>{scenario.questions[questionIndex]}</p>
                <button onClick={() => setQuestionIndex((questionIndex + 1) % scenario.questions.length)}>
                  Ask another question ↻
                </button>
              </div>
            </section>
          )}
        </section>

        <aside className="coach-rail">
          <div className="coach-status">
            <span className="coach-orb">C</span>
            <div><small>COACH MODE</small><strong>Socratic</strong></div>
            <span className="online-pill">ONLINE</span>
          </div>
          <div className="lesson-card">
            <span className="lesson-index">THIS HAND</span>
            <h2>“Capped” describes Villain, not you.</h2>
            <p>You are Hero. The opponent is Villain. First list Villain's possible hands; then decide whether the strongest hands are unlikely, unclear, or still fully possible.</p>
          </div>
          <div className="terms-card">
            <span className="side-label">POKER TERMS</span>
            <p><strong>Hero</strong><span>You—the player making the decision.</span></p>
            <p><strong>Villain</strong><span>The opponent whose range you are estimating.</span></p>
            <p><strong>Button</strong><span>Dealer position; usually acts last after the flop.</span></p>
            <p><strong>Big Blind</strong><span>The forced blind two seats left of the Button.</span></p>
          </div>
          <div className="evidence-stack">
            <span className="side-label">EVIDENCE CHECK</span>
            <div><b>01</b><p><strong>Action</strong>What did each bet and check remove?</p></div>
            <div><b>02</b><p><strong>Board</strong>Which nut hands changed by the river?</p></div>
            <div><b>03</b><p><strong>Player</strong>What tendency supports the exploit?</p></div>
            <div><b>04</b><p><strong>Context</strong>Cash depth, ICM and position matter.</p></div>
          </div>
          <div className="guardrail-card">
            <span>RULE OF THE LAB</span>
            <p>Never overbet because a range “feels capped.” Name the hands that fold—and the evidence that they will.</p>
          </div>
          <p className="responsible-note">Study tool only · No real-money play · 18+</p>
        </aside>
      </div>
    </main>
  );
}
