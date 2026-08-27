import assert from "node:assert/strict";
import test from "node:test";
import { showdownSplit } from "../tools/lib/engine.mjs";
import { standing, texture, select, purposeOf } from "../tools/curate.mjs";

// The showdown count is the product's central claim - "of the N hands he can
// have, K beat you" - so it gets a case with a hand-checked answer.
test("showdownSplit counts who actually beats the hero", () => {
  const board = ["Kd", "7s", "3c", "2h", "9d"];
  const hero = ["As", "Ah"]; // one pair, aces
  const holdings = [
    { cards: ["Kh", "Ks"], weight: 1 }, // trip kings - beats aces
    { cards: ["7h", "7d"], weight: 1 }, // trip sevens - beats aces
    { cards: ["Kc", "Qh"], weight: 1 }, // pair of kings - loses
    { cards: ["Jc", "Ts"], weight: 1 }, // nothing - loses
  ];
  const split = showdownSplit({ heroCards: hero, board, holdings });
  assert.equal(split.total, 4);
  assert.equal(split.beats, 2);
  assert.equal(split.loses, 2);
  assert.equal(split.ties, 0);
  assert.equal(split.beatsPct, 50);
});

test("showdownSplit spots a tie when the board plays", () => {
  const board = ["As", "Ks", "Qs", "Js", "Ts"]; // royal flush on board
  const split = showdownSplit({
    heroCards: ["2c", "3d"], board,
    holdings: [{ cards: ["4c", "5d"], weight: 1 }],
  });
  assert.equal(split.ties, 1);
  assert.equal(split.beats, 0);
});

test("standing turns a beaten percentage into plain language", () => {
  assert.equal(standing(5), "ahead");
  assert.equal(standing(30), "mixed");
  assert.equal(standing(80), "behind");
  assert.equal(standing(null), "unclear");
});

test("texture separates boards that look different to a learner", () => {
  assert.equal(texture(["Kd", "7s", "3c", "2h", "9d"]), "unpaired-rainbow");
  assert.equal(texture(["Kd", "Ks", "3c", "2h", "9d"]), "paired-rainbow");
  assert.equal(texture(["Kd", "7d", "3d", "2h", "9s"]), "unpaired-flushy");
});

test("purpose is stated in terms of what the bet is for", () => {
  assert.match(purposeOf("bet-big", "ahead"), /called by something worse/);
  assert.match(purposeOf("bet-big", "behind"), /better hand fold/);
  assert.match(purposeOf("fold", "behind"), /stop paying/);
});

// Selection has one job beyond ranking: stop one leak from swamping the set.
test("select spreads picks across leaks instead of taking the top N", () => {
  const make = (leak, gap, index) => ({
    leak, evGapPot: gap,
    boardCodes: ["Kd", "7s", "3c", "2h", "9d"],
    best: { id: `b${index}` }, tempting: { id: `t${index}` },
  });
  const candidates = [
    ...Array.from({ length: 20 }, (_, i) => make("weaker-callers", 9 - i * 0.01, i)),
    ...Array.from({ length: 5 }, (_, i) => make("call-price", 1 - i * 0.01, 100 + i)),
    ...Array.from({ length: 5 }, (_, i) => make("bluffs-showdown", 0.5 - i * 0.01, 200 + i)),
  ];
  const chosen = select(candidates, 9);
  const spread = {};
  for (const candidate of chosen) spread[candidate.leak] = (spread[candidate.leak] ?? 0) + 1;

  assert.equal(chosen.length, 9);
  assert.ok(Object.keys(spread).length >= 3, "should draw from at least three leaks");
  assert.ok(spread["weaker-callers"] <= 4, `one leak swamped the set: ${JSON.stringify(spread)}`);
});

test("select never returns more than asked for", () => {
  const candidates = Array.from({ length: 50 }, (_, i) => ({
    leak: "plan-action", evGapPot: 1,
    boardCodes: ["Kd", "7s", "3c", "2h", "9d"],
    best: { id: `b${i}` }, tempting: { id: `t${i}` },
  }));
  assert.equal(select(candidates, 12).length, 12);
});

// The FROM address is load-bearing: Cloudflare onboards withmagic.ai but NOT its
// subdomains, and mail from a subdomain reaches verified Email Routing
// destinations only while 400ing for everyone else. That fails silently in dev
// because Raj's own address IS a verified destination, so it gets a test.
import { assertSendableFrom, DEFAULT_FROM } from "../netlify/functions/_lib/email.mjs";

test("the default sender is on the onboarded root domain", () => {
  assert.doesNotThrow(() => assertSendableFrom(DEFAULT_FROM));
  assert.match(DEFAULT_FROM, /@withmagic\.ai$/);
});

test("a subdomain sender is refused, not quietly accepted", () => {
  assert.throws(() => assertSendableFrom("coach@pokercoach.withmagic.ai"), /not on an onboarded domain/);
  assert.throws(() => assertSendableFrom("hello@mail.withmagic.ai"), /not on an onboarded domain/);
});

test("an unrelated domain is refused", () => {
  assert.throws(() => assertSendableFrom("coach@example.com"), /not on an onboarded domain/);
  assert.throws(() => assertSendableFrom("notanemail"), /not on an onboarded domain/);
});

test("a lookalike domain does not slip through", () => {
  assert.throws(() => assertSendableFrom("a@notwithmagic.ai"), /not on an onboarded domain/);
});

// The taxonomy is learner-facing copy and drives the profile screen, so the
// mapping from "what the mistake was" to "what it is called" gets tests.
import { classify } from "../tools/curate.mjs";

const spot = (over) => ({
  facingBet: false, villainChecks: 0,
  best: { id: "check" }, tempting: { id: "check" }, ...over,
});

test("facing a bet is always a pricing decision", () => {
  assert.equal(classify(spot({ facingBet: true, best: { id: "call" }, tempting: { id: "fold" } }), "behind"), "wrong-price");
  assert.equal(classify(spot({ facingBet: true, best: { id: "fold" }, tempting: { id: "call" } }), "ahead"), "wrong-price");
});

test("checking a hand that should bet is value or a bluff, by standing", () => {
  const wouldCheck = { tempting: { id: "check" }, best: { id: "bet-big" } };
  assert.equal(classify(spot(wouldCheck), "ahead"), "missed-value");
  assert.equal(classify(spot(wouldCheck), "behind"), "missed-bluff");
});

test("betting a hand that should check splits on whether it was winning", () => {
  const wouldBet = { tempting: { id: "bet-big" }, best: { id: "check" } };
  // Ahead and betting is worse: nothing worse was going to call.
  assert.equal(classify(spot(wouldBet), "ahead"), "bet-no-caller");
  // Not ahead: the hand still won sometimes, and betting threw that away.
  assert.equal(classify(spot(wouldBet), "mixed"), "bet-away-showdown");
  assert.equal(classify(spot(wouldBet), "behind"), "bet-away-showdown");
});

test("two different bet sizes is a sizing mistake, not a plan mistake", () => {
  assert.equal(classify(spot({ tempting: { id: "bet-small" }, best: { id: "bet-big" } }), "ahead"), "wrong-size");
  assert.equal(classify(spot({ tempting: { id: "raise" }, best: { id: "raise-big" } }), "behind"), "wrong-size");
});

test("every classification is a name the app can label", async () => {
  const { LEAK_LABELS } = await import("../tools/curate.mjs");
  const cases = [
    [spot({ facingBet: true }), "behind"],
    [spot({ tempting: { id: "check" }, best: { id: "bet-big" } }), "mixed"],
    [spot({ tempting: { id: "bet-big" }, best: { id: "check" } }), "ahead"],
    [spot({ tempting: { id: "bet-small" }, best: { id: "bet-big" } }), "ahead"],
    [spot({}), "ahead"],
    [spot({}), "behind"],
  ];
  for (const [candidate, standingNow] of cases) {
    assert.ok(LEAK_LABELS[classify(candidate, standingNow)], `unlabelled: ${classify(candidate, standingNow)}`);
  }
});

// Flop and turn spots are only measurable because a rollout reshuffles the
// undealt remainder. Without it every trial deals the same turn and river, and
// a flop decision gets scored against one predetermined card - silently, with
// the EV numbers still looking plausible. This is the assertion that keeps it.
import { reshuffleUndealt, createSeededRng } from "../tools/lib/engine.mjs";

const fakeGame = (deck) => ({ table: { currentHand: { deck, board: ["Kd", "7s", "3c"] } } });

test("reshuffleUndealt actually reorders the deck", () => {
  const deck = Array.from({ length: 36 }, (_, i) => `c${i}`);
  const shuffled = reshuffleUndealt(fakeGame(deck), createSeededRng(1234));
  const after = shuffled.table.currentHand.deck;
  assert.equal(after.length, deck.length, "no cards may be lost");
  assert.deepEqual([...after].sort(), [...deck].sort(), "same cards, different order");
  assert.notDeepEqual(after, deck, "order must actually change");
});

test("reshuffleUndealt leaves the original snapshot alone", () => {
  const deck = Array.from({ length: 36 }, (_, i) => `c${i}`);
  const game = fakeGame(deck);
  const before = [...deck];
  reshuffleUndealt(game, createSeededRng(99));
  assert.deepEqual(game.table.currentHand.deck, before, "the snapshot is replayed many times over");
});

test("different seeds give different runouts", () => {
  const deck = Array.from({ length: 36 }, (_, i) => `c${i}`);
  const a = reshuffleUndealt(fakeGame(deck), createSeededRng(1)).table.currentHand.deck;
  const b = reshuffleUndealt(fakeGame(deck), createSeededRng(2)).table.currentHand.deck;
  assert.notDeepEqual(a, b, "two trials must not deal the same board");
});

test("a deck too short to shuffle is returned untouched", () => {
  const game = fakeGame([]);
  assert.equal(reshuffleUndealt(game, createSeededRng(7)), game);
});

// The opponent's hole cards are dealt before the decision point, and shuffling
// the undealt remainder does NOT touch them. So without re-dealing them every
// trial, the EV stops measuring an action against his RANGE and starts
// measuring it against the one hand he happened to hold - and on the river,
// where the runout has nothing left to vary, the answer is fixed before the
// question is asked. That shipped: hero folded a flush that beat 305 of the 355
// hands in the counted range, because this villain held one of the other 50.
//
// These are the assertions that keep the EV and the count describing the same
// opponent.
import { dealTo, dealableHoldings } from "../tools/lib/engine.mjs";

const tableWith = (players, deck) => ({ table: { currentHand: { players, deck } } });

test("dealTo puts the old cards back and takes the new ones out", () => {
  const game = tableWith(
    [{ id: "hero", holeCards: ["As", "Ks"] }, { id: "villain", holeCards: ["2c", "3c"] }],
    ["9h", "9d", "Qs"],
  );
  const after = dealTo(game, "villain", ["9h", "Qs"]).table.currentHand;
  assert.deepEqual(after.players.find((p) => p.id === "villain").holeCards, ["9h", "Qs"]);
  assert.deepEqual([...after.deck].sort(), ["2c", "3c", "9d"], "old cards return, new ones leave");
  assert.equal(after.deck.length, 3, "the deck may not change size");
});

test("dealTo never puts one card in two hands at once", () => {
  const game = tableWith(
    [{ id: "hero", holeCards: ["As", "Ks"] }, { id: "villain", holeCards: ["2c", "3c"] }],
    ["9h", "9d"],
  );
  const after = dealTo(game, "villain", ["2c", "9h"]).table.currentHand;
  const everywhere = [...after.deck, ...after.players.flatMap((p) => p.holeCards)];
  assert.equal(new Set(everywhere).size, everywhere.length, "no duplicate card anywhere");
});

test("dealTo leaves the original snapshot alone", () => {
  const game = tableWith([{ id: "villain", holeCards: ["2c", "3c"] }], ["9h", "9d"]);
  dealTo(game, "villain", ["9h", "9d"]);
  assert.deepEqual(game.table.currentHand.players[0].holeCards, ["2c", "3c"]);
  assert.deepEqual(game.table.currentHand.deck, ["9h", "9d"], "the snapshot is replayed many times over");
});

// A range is built from every card that is not on the board and not in the
// hero's hand - which includes cards sitting in FOLDED players' hands. Those
// are gone, and dealing one would duplicate it.
test("dealableHoldings drops holdings that need a card nobody has left", () => {
  const game = tableWith(
    [{ id: "villain", holeCards: ["2c", "3c"] }, { id: "folded", holeCards: ["Jd", "Jh"] }],
    ["9h", "9d", "Qs"],
  );
  const holdings = [
    { cards: ["9h", "Qs"] },  // both in the deck - dealable
    { cards: ["2c", "9d"] },  // one is already his own - dealable
    { cards: ["Jd", "9h"] },  // Jd is in a folded hand - not dealable
    { cards: ["Jd", "Jh"] },  // both folded away - not dealable
  ];
  const usable = dealableHoldings(game, "villain", holdings);
  assert.deepEqual(usable.map((h) => h.cards), [["9h", "Qs"], ["2c", "9d"]]);
});

test("dealableHoldings on an empty range returns nothing rather than throwing", () => {
  const game = tableWith([{ id: "villain", holeCards: ["2c", "3c"] }], []);
  assert.deepEqual(dealableHoldings(game, "villain", []), []);
  assert.deepEqual(dealableHoldings(game, "villain", undefined), []);
});

// The feedback has been rewritten three times and each rewrite broke something
// these now hold in place.
//
// The current contract: `decidingFacts` carries the NUMBERS, `reasonFor` carries
// the JUDGMENT, and neither repeats the other. That split exists because showing
// both the wrong answer's reason and the right answer's reason printed the same
// count twice whenever they hinged on the same fact - which fold against call
// always does.
import { reasonFor, decidingFacts, voiceFor } from "../tools/curate.mjs";

const opt = (id, label, answered = {}, uncontested = 0) => ({
  id, label, uncontested,
  answered: { fold: 0, call: 0, raise: 0, bet: 0, check: 0, ...answered },
});

const shape = (over = {}) => ({
  facing: false, standingNow: "ahead", beats: 84, youBeat: 352, total: 437,
  pot: 60, toCall: 0, players: 2, ...over,
});

test("facing a bet, the facts are the price and the share, side by side", () => {
  const facts = decidingFacts({
    ...shape({ facing: true, standingNow: "behind", beats: 210, youBeat: 124, total: 334, pot: 26, toCall: 13 }),
    options: [], best: null, street: "River",
  });
  assert.equal(facts.length, 2, "one comparison, two rows");
  // The threshold has to say what it is a threshold FOR. "You need 26%" was
  // read as an unmoored number sitting in a row identical to the one below it.
  assert.equal(facts[0].label, "Calling needs");
  assert.equal(facts[0].value, "33%", "$13 into a $26 pot needs a third");
  assert.equal(facts[1].label, "You win");
  assert.equal(facts[1].value, "37%", "124 of 334");
});

// On the flop and turn the count is how much of his range you are AHEAD OF, with
// cards still to come. Labelling it "You win" was read - correctly, from the
// words - as "I win that often", which is a different and false claim.
test("only the river may say you win; earlier streets say you are ahead", () => {
  const args = shape({ facing: true, standingNow: "behind", beats: 210, youBeat: 124, total: 334, pot: 26, toCall: 13 });
  for (const street of ["Flop", "Turn"]) {
    const facts = decidingFacts({ ...args, options: [], best: null, street });
    assert.equal(facts[1].label, "You're ahead of", `${street} must not claim a win`);
  }
  const river = decidingFacts({ ...args, options: [], best: null, street: "River" });
  assert.equal(river[1].label, "You win", "the river has nothing left to come");
});

test("the reason never repeats the numbers the facts already show", () => {
  const why = reasonFor({
    ...shape({ facing: true, standingNow: "behind", beats: 210, youBeat: 124, total: 334, pot: 39, toCall: 13 }),
    chosen: opt("fold", "Fold"), best: opt("call", "Call $13"), isCorrect: false,
  });
  assert.doesNotMatch(why, /\d+ of (his|the)/, "counts belong in the facts block");
  assert.match(why, /folding gives up/i);
});

test("betting a hand that is behind is a failed bluff, not a pot you already had", () => {
  const bet = opt("bet-small", "Bet $17", { call: 1 });
  const check = opt("check", "Check", { bet: 0.2, check: 0.8 });
  const why = reasonFor({
    ...shape({ standingNow: "behind", beats: 203, youBeat: 19, total: 222 }),
    chosen: bet, best: check, options: [check, bet], isCorrect: false,
  });
  assert.doesNotMatch(why, /pot you already had/, "the pot was never his to keep");
});

test("checking as the answer is never described as collecting value from a bluff", () => {
  const check = opt("check", "Check", { bet: 0.1, check: 0.9 });
  const bet = opt("bet-big", "Bet $105", { fold: 0.88, call: 0.12 });
  const why = reasonFor({
    ...shape({ standingNow: "behind", beats: 435, youBeat: 27, total: 494 }),
    chosen: check, best: bet, options: [check, bet], isCorrect: false,
  });
  assert.doesNotMatch(why, /collects none/, "there is nothing to collect from a bluff");
  assert.match(why, /gives up/);
});

test("bet sizing on a bluff is judged by folding them out, not by getting paid", () => {
  const big = opt("bet-big", "Bet $105", { fold: 0.88, call: 0.12 });
  const small = opt("bet-small", "Bet $46", { fold: 0.08, call: 0.92 });
  const why = reasonFor({
    ...shape({ standingNow: "behind", beats: 435, youBeat: 27, total: 494 }),
    chosen: small, best: big, options: [small, big], isCorrect: false,
  });
  assert.doesNotMatch(why, /pay you|paying you|collects more/, "nobody is paying you when you are bluffing");
  assert.match(why, /move him off|not enough/i);

  // And the facts beside it must quote FOLD rates, not call rates.
  const facts = decidingFacts({
    ...shape({ standingNow: "behind", beats: 435, youBeat: 27, total: 494 }),
    options: [small, big], best: big,
  });
  assert.ok(facts.some((fact) => /folds to \$105/.test(fact.label) && fact.value === "88%"), JSON.stringify(facts));
});

test("bet sizing for value is judged by who keeps calling", () => {
  const small = opt("bet-small", "Bet $9", { call: 0.62, fold: 0.38 });
  const big = opt("bet-big", "Bet $20", { call: 0.11, fold: 0.89 });
  const why = reasonFor({
    ...shape({ standingNow: "ahead" }),
    chosen: big, best: small, options: [small, big], isCorrect: false,
  });
  assert.match(why, /fold to this|keeps them in/i);
  const facts = decidingFacts({ ...shape({ standingNow: "ahead" }), options: [small, big], best: small });
  assert.ok(facts.some((fact) => /calls \$9/.test(fact.label) && fact.value === "62%"), JSON.stringify(facts));
});

// Three-handed, the reply tally only records the NEXT player to act, so it says
// nothing about the field. The honest number is how often everyone folded.
test("three-handed facts use the field, not one player's reply", () => {
  const small = opt("bet-small", "Bet $22", { call: 0.35 }, 0.53);
  const big = opt("bet-big", "Bet $51", { call: 0.32 }, 0.61);
  const facts = decidingFacts({
    ...shape({ players: 3, standingNow: "ahead", beats: 60792, youBeat: 1009398, total: 1070190 }),
    options: [small, big], best: small,
  });
  assert.ok(facts.some((fact) => /Everyone folds to \$22/.test(fact.label) && fact.value === "53%"), JSON.stringify(facts));
  assert.match(facts[0].note, /ways/, "the count is over ways the field can be dealt");
  assert.doesNotMatch(facts[0].note, /\bhis\b/, "there is no single 'his' range three-handed");
});

test("three-handed value sizing knows that folding the field out is the failure", () => {
  const small = opt("bet-small", "Bet $22", {}, 0.53);
  const big = opt("bet-big", "Bet $51", {}, 0.61);
  const why = reasonFor({
    ...shape({ players: 3, standingNow: "ahead", beats: 60792, youBeat: 1009398, total: 1070190 }),
    chosen: big, best: small, options: [small, big], isCorrect: false,
  });
  assert.match(why, /folds out the players you want paying you/);
});

test("voice switches from he to they once there is a field", () => {
  assert.equal(voiceFor(2).subj, "he");
  assert.equal(voiceFor(3).subj, "they");
  assert.equal(voiceFor(3).plural, true);
});

test("every reason is a sentence, with no unfilled placeholders", () => {
  const a = opt("bet-big", "Bet $50", { call: 0.72, fold: 0.28 });
  const b = opt("check", "Check", { bet: 0.3, check: 0.7 });
  for (const players of [2, 3]) {
    for (const [chosen, best, isCorrect, standingNow] of [
      [a, a, true, "ahead"], [b, a, false, "ahead"], [a, b, false, "behind"], [b, b, true, "behind"],
    ]) {
      const why = reasonFor({
        ...shape({ players, standingNow, beats: 109, youBeat: 234, total: 344 }),
        chosen, best, options: [a, b], isCorrect,
      });
      assert.ok(why.length >= 30, `too thin: "${why}"`);
      assert.doesNotMatch(why, /that much|undefined|NaN|\$-/, `unfilled placeholder: "${why}"`);
      assert.match(why, /\.$/, `not a sentence: "${why}"`);
    }
  }
});


// would poison every multiway hand while still looking like a plausible number.
import { showdownVsField, cardIndexes, scoreCards } from "../tools/lib/engine.mjs";

const bruteForce = (hero, board, A, B) => {
  const bi = cardIndexes(board);
  const heroScore = scoreCards([...cardIndexes(hero), ...bi]);
  let total = 0, beats = 0;
  for (const a of A) {
    for (const b of B) {
      if (a.cards.some((card) => b.cards.includes(card))) continue;
      total += 1;
      const sa = scoreCards([...cardIndexes(a.cards), ...bi]);
      const sb = scoreCards([...cardIndexes(b.cards), ...bi]);
      if (sa > heroScore || sb > heroScore) beats += 1;
    }
  }
  return { total, beats };
};

test("showdownVsField counts pairs the way brute force does", () => {
  const board = ["Kd", "7s", "3c", "2h", "9d"];
  const hero = ["As", "Ah"];
  const A = [["Kh", "Ks"], ["7h", "7d"], ["Kc", "Qh"], ["Jc", "Ts"], ["4c", "5d"]].map((cards) => ({ cards }));
  const B = [["Kh", "Kc"], ["9h", "9c"], ["Qd", "Qc"], ["Jc", "Th"], ["6c", "5s"]].map((cards) => ({ cards }));
  const got = showdownVsField({ heroCards: hero, board, ranges: [A, B] });
  const want = bruteForce(hero, board, A, B);
  assert.equal(got.total, want.total);
  assert.equal(got.beats, want.beats);
});

test("showdownVsField never counts a pair that shares a card", () => {
  const board = ["Kd", "7s", "3c", "2h", "9d"];
  const hero = ["As", "Ah"];
  // Both ranges are the SAME single holding, so there is no legal pair at all.
  const one = [{ cards: ["Qc", "Qd"] }];
  const got = showdownVsField({ heroCards: hero, board, ranges: [one, one] });
  assert.equal(got.total, 0, "one holding cannot be dealt to two players at once");
});

test("showdownVsField agrees with brute force across random boards", () => {
  const rng = createSeededRng(4242);
  const deck = [];
  for (const rank of "23456789TJQKA") for (const suit of "cdhs") deck.push(rank + suit);

  for (let trial = 0; trial < 12; trial += 1) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const board = shuffled.slice(0, 5);
    const hero = shuffled.slice(5, 7);
    const rest = shuffled.slice(7);
    const all = [];
    for (let i = 0; i < rest.length; i += 1) {
      for (let j = i + 1; j < rest.length; j += 1) all.push({ cards: [rest[i], rest[j]] });
    }
    const draw = (n) => {
      const pool = [...all];
      return Array.from({ length: n }, () => pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    };
    const A = draw(25);
    const B = draw(25);
    const got = showdownVsField({ heroCards: hero, board, ranges: [A, B] });
    const want = bruteForce(hero, board, A, B);
    assert.equal(got.total, want.total, `board ${board.join(" ")}`);
    assert.equal(got.beats, want.beats, `board ${board.join(" ")}`);
  }
});

test("showdownVsField falls back to the heads-up count for one opponent", () => {
  const board = ["Kd", "7s", "3c", "2h", "9d"];
  const holdings = [["Kh", "Ks"], ["Kc", "Qh"]].map((cards) => ({ cards }));
  const got = showdownVsField({ heroCards: ["As", "Ah"], board, ranges: [holdings] });
  assert.equal(got.total, 2);
  assert.equal(got.beats, 1);
  assert.equal(got.ties, 0, "heads-up still reports ties");
});

test("showdownVsField refuses a field it cannot count exactly", () => {
  const holdings = [{ cards: ["Kh", "Ks"] }];
  assert.throws(
    () => showdownVsField({ heroCards: ["As", "Ah"], board: ["Kd", "7s", "3c", "2h", "9d"], ranges: [holdings, holdings, holdings] }),
    /one or two opponents/,
    "better to refuse than to quietly estimate under an 'exact' label",
  );
});

// Generation is deterministic, so a shipped hand does not carry its game state:
// it carries a seed and a hand index, and the state is rebuilt on demand. That
// makes this the load-bearing test for anything built on replay. A drift of a
// single rng call rebuilds a DIFFERENT hand, silently, and every continuation
// scored from it would be coaching about a hand that never happened.
import { replaySpot, matchesCandidate } from "../tools/lib/replay.mjs";
import { readFileSync } from "node:fs";

test("every shipped hand can be replayed back to the exact spot it describes", () => {
  const data = JSON.parse(readFileSync(new URL("../public/hands.json", import.meta.url), "utf8"));
  const withSource = data.hands.filter((hand) => hand.source?.seed !== null && hand.source?.handIndex !== null);
  assert.ok(withSource.length > 0, "hands must carry their source coordinates");

  const failures = [];
  for (const hand of withSource) {
    const spot = replaySpot(hand.source);
    // matchesCandidate wants the generator's field names.
    const asCandidate = {
      heroCodes: hand.hero.map(toEngineCode),
      boardCodes: hand.board.map(toEngineCode),
      potRaw: Number(String(hand.pot).replace(/[^0-9.]/g, "")),
    };
    if (!matchesCandidate(spot, asCandidate)) failures.push(hand.id);
  }
  assert.deepEqual(failures, [], `replay drifted for: ${failures.join(", ")}`);
});

const SUIT_CODES = { "♣": "c", "♦": "d", "♥": "h", "♠": "s" };
function toEngineCode(pretty) {
  const suit = SUIT_CODES[pretty.slice(-1)];
  const rank = pretty.slice(0, -1) === "10" ? "T" : pretty.slice(0, -1);
  return `${rank}${suit}`;
}

// A chained hand asks the turn, then the river OF THE SAME HAND, on the line
// the learner picked. The thing that would break silently is the river being
// the one the BOT took rather than the one the learner's action produced, so
// these check the branch structure that keeps them apart.
test("a chain gives every action its own branch, and questions their own ids", () => {
  const data = JSON.parse(readFileSync(new URL("../public/hands.json", import.meta.url), "utf8"));
  const chained = data.hands.filter((hand) => hand.chain);
  if (!chained.length) return; // pools without turn spots are legitimate

  const ids = new Set();
  for (const hand of chained) {
    // Flop and turn hands both continue one street; the river has nothing after
    // it, and a hand is deliberately never carried flop-to-turn-to-river.
    assert.ok(["Flop", "Turn"].includes(hand.street),
      `${hand.id} chains from the ${hand.street}, which has nothing after it`);
    for (const option of hand.action.options) {
      assert.ok(hand.chain.branches[option.id], `${hand.id} has no branch for "${option.id}"`);
    }
    for (const [action, branch] of Object.entries(hand.chain.branches)) {
      if (branch.kind === "question") {
        assert.ok(branch.lesson, `${hand.id}/${action} is a question with no lesson`);
        assert.ok(branch.reply, `${hand.id}/${action} does not say what the opponent did`);
        assert.equal(branch.lesson.chainId, hand.id);
        assert.equal(branch.lesson.step, 2);
        assert.ok(!ids.has(branch.lesson.id), `duplicate continuation id ${branch.lesson.id}`);
        ids.add(branch.lesson.id);
        // The second decision is never earlier in the hand than the first.
        const order = { Flop: 0, Turn: 1, River: 2 };
        assert.ok(order[branch.lesson.street] >= order[hand.street],
          `${hand.id}/${action} continues backwards to the ${branch.lesson.street}`);
      } else {
        assert.ok(branch.outcome, `${hand.id}/${action} ends with nothing said`);
      }
    }
    // Folding can never lead to another decision.
    const fold = hand.chain.branches.fold;
    if (fold) assert.notEqual(fold.kind, "question", `${hand.id} asks a question after folding`);
  }
});

test("a continuation is a complete lesson, not a stub", () => {
  const data = JSON.parse(readFileSync(new URL("../public/hands.json", import.meta.url), "utf8"));
  const lessons = data.hands.flatMap((hand) =>
    Object.values(hand.chain?.branches ?? {})
      .filter((branch) => branch.kind === "question")
      .map((branch) => branch.lesson));
  if (!lessons.length) return;

  for (const lesson of lessons) {
    assert.ok(lesson.read?.correctId, `${lesson.id} has no read answer`);
    assert.ok(lesson.action?.correctIds?.length, `${lesson.id} has no action answer`);
    assert.ok(lesson.facts?.length, `${lesson.id} has no deciding facts`);
    assert.ok(lesson.takeaway, `${lesson.id} has no takeaway`);
    assert.ok(lesson.numbers?.total > 0, `${lesson.id} has no counted range`);
    assert.notEqual(lesson.action.correctIds.length, lesson.action.options.length,
      `${lesson.id} marks every option correct`);
  }
});

// ---- guards for the learner-panel findings -----------------------------
// Five reviewers reading only the rendered screens found these; none of them
// were catchable by a gate that checks whether a number is TRUE, because every
// number involved was true. These lock the labelling and the wording.
import { rangeIsCredible, handCategory } from "../tools/lib/engine.mjs";

test("a range that strips out the hands beating the hero is refused", () => {
  const board = ["Ad", "5s", "5h", "Jh"];
  const hero = ["7s", "Jd"]; // jacks and fives
  const uniform = [
    { cards: ["Ac", "2d"] }, { cards: ["As", "7c"] }, { cards: ["Ah", "9s"] }, // aces up, all ahead
    { cards: ["2c", "3d"] }, { cards: ["4c", "6d"] }, { cards: ["8c", "9d"] },
  ];
  // The model kept only the hands the hero beats - every ace has vanished.
  const stripped = uniform.filter((h) => !h.cards.some((c) => c[0] === "A"));
  assert.equal(rangeIsCredible({ heroCards: hero, board, modelled: stripped, uniform }), false,
    "dropping every ace on an ace-high board is an artifact, not a read");
  assert.equal(rangeIsCredible({ heroCards: hero, board, modelled: uniform, uniform }), true);
});

test("a range that narrows towards being beaten is still a real read", () => {
  const board = ["Ad", "5s", "5h", "Jh"];
  const hero = ["7s", "Jd"];
  const uniform = [
    { cards: ["Ac", "2d"] }, { cards: ["2c", "3d"] }, { cards: ["4c", "6d"] }, { cards: ["8c", "9d"] },
  ];
  const strongOnly = [{ cards: ["Ac", "2d"] }];
  assert.equal(rangeIsCredible({ heroCards: hero, board, modelled: strongOnly, uniform }), true,
    "narrowing to the hands that beat you is what a read is supposed to do");
});

test("a percentage never rounds to a certainty it has not got", () => {
  // 452 of 453 is 99.8%, and printing "100%" contradicted the count beside it.
  const d = JSON.parse(readFileSync(new URL("../public/hands.json", import.meta.url), "utf8"));
  for (const hand of d.hands) {
    const prose = [hand.countSentence, hand.takeaway, ...Object.values(hand.read.why ?? {})].join(" ");
    // "almost 100%" and "under 1%" are the honest forms. A bare 100% or 0% is
    // the claim being guarded against: 452 of 453 rounded to "100%" told a
    // learner every hand beat them, one line after counting the one that did not.
    if (/(?<!almost )\b100%/.test(prose)) {
      assert.equal(hand.numbers.beats, hand.numbers.total,
        `${hand.id} says 100% but ${hand.numbers.beats} of ${hand.numbers.total} beat you`);
    }
    if (/(?<!under 1)\b0%/.test(prose)) {
      assert.equal(hand.numbers.beats, 0, `${hand.id} says 0% but ${hand.numbers.beats} beat you`);
    }
  }
});

test("two bet sizes never share one purpose", () => {
  const d = JSON.parse(readFileSync(new URL("../public/hands.json", import.meta.url), "utf8"));
  const lessons = [...d.hands, ...d.hands.flatMap((h) =>
    Object.values(h.chain?.branches ?? {}).filter((b) => b.kind === "question").map((b) => b.lesson))];
  for (const lesson of lessons) {
    const sized = lesson.action.options.filter((o) => /\$\d+/.test(o.label)
      && (o.id.startsWith("bet") || o.id.startsWith("raise")));
    if (sized.length < 2) continue;
    const purposes = new Set(sized.map((o) => o.purpose));
    assert.equal(purposes.size, sized.length,
      `${lesson.id}: ${sized.length} sizes share ${purposes.size} purpose(s) - "what is it for" cannot tell them apart`);
  }
});

test("the coaching never claims no worse hand exists while listing worse hands", () => {
  const d = JSON.parse(readFileSync(new URL("../public/hands.json", import.meta.url), "utf8"));
  const lessons = [...d.hands, ...d.hands.flatMap((h) =>
    Object.values(h.chain?.branches ?? {}).filter((b) => b.kind === "question").map((b) => b.lesson))];
  for (const lesson of lessons) {
    const prose = [lesson.takeaway, ...Object.values(lesson.action.why ?? {})].join(" ");
    assert.doesNotMatch(prose, /there isn't one|there is not one here|nothing worse will pay/,
      `${lesson.id} claims no worse hand exists; the breakdown lists them`);
    assert.doesNotMatch(prose, /the only way this hand wins/,
      `${lesson.id} claims a bet is the only way to win, which the check EV usually refutes`);
  }
});

test("hand-class labels do not contradict their own ordering", () => {
  // "Top pair or better" was printed BELOW "Three of a kind" and "Two pair".
  const board = ["Kd", "7s", "3c", "2h", "9d"];
  assert.equal(handCategory(["Kh", "Qs"], board).label, "Top pair");
  assert.equal(handCategory(["7h", "8s"], board).label, "A lower pair");
});
