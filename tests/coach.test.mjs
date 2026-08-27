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

// The feedback lines used to state only the SIZE of a mistake ("costs about
// $190 against the best line"), which tells a learner how wrong they were and
// nothing about why. These cover the shapes that got the reasoning backwards
// when the explanations were first written.
import { reasonFor } from "../tools/curate.mjs";

const opt = (id, label, answered = {}) => ({
  id, label,
  answered: { fold: 0, call: 0, raise: 0, bet: 0, check: 0, ...answered },
});

test("betting a hand that is behind is a failed bluff, not a pot you already had", () => {
  const bet = opt("bet-small", "Bet $17", { call: 1 });
  const check = opt("check", "Check", { bet: 0.2, check: 0.8 });
  const why = reasonFor({
    chosen: bet, best: check, options: [check, bet], isCorrect: false,
    facing: false, standingNow: "behind", beats: 203, youBeat: 19, total: 222,
  });
  assert.doesNotMatch(why, /pot you already had/, "the pot was never his to keep");
  assert.match(why, /folds nothing out|raises this/, "it should name what the bet failed to do");
  assert.match(why, /203/, "and carry this hand's own count");
});

test("a bigger bet that gets called less is explained by the call rates, not asserted", () => {
  const small = opt("bet-small", "Bet $9", { call: 0.62, fold: 0.38 });
  const big = opt("bet-big", "Bet $20", { call: 0.11, fold: 0.89 });
  const why = reasonFor({
    chosen: big, best: small, options: [small, big], isCorrect: false,
    facing: false, standingNow: "ahead", beats: 84, youBeat: 352, total: 437,
  });
  assert.match(why, /62%/);
  assert.match(why, /11%/);
  assert.match(why, /fold to the bigger bet/);
});

// The mirror case. Getting this backwards printed "the worse hands fold to the
// bigger bet" over numbers showing he called the bigger bet MORE often.
test("a smaller bet that gets called just as often is explained as collecting less", () => {
  const small = opt("bet-small", "Bet $20", { call: 0.65 });
  const big = opt("bet-big", "Bet $47", { call: 0.69 });
  const why = reasonFor({
    chosen: small, best: big, options: [small, big], isCorrect: false,
    facing: false, standingNow: "ahead", beats: 74, youBeat: 204, total: 278,
  });
  assert.doesNotMatch(why, /fold to the bigger bet/, "he calls the bigger bet more, not less");
  assert.match(why, /same hands pay you|worth the extra folds/);
});

// When checking is the answer there is no "best bet" to quote a price from.
// Reaching for `best.label` printed "he folds 0% of the time against that much".
test("checking as the answer never quotes a price it does not have", () => {
  const check = opt("check", "Check", { bet: 0.868, check: 0.132 });
  const bet = opt("bet-small", "Bet $27", { call: 0.068, raise: 0.456 });
  const why = reasonFor({
    chosen: check, best: check, options: [check, bet], isCorrect: true,
    facing: false, standingNow: "mixed", beats: 61, youBeat: 140, total: 201,
  });
  assert.doesNotMatch(why, /that much/, "no unfilled placeholder");
  assert.match(why, /87%/, "checking wins because it lets him bet - say so");
});

test("folding to a bet is explained as a price, in plain fractions", () => {
  const fold = opt("fold", "Fold");
  const call = opt("call", "Call $30", { call: 1 });
  const why = reasonFor({
    chosen: fold, best: fold, options: [fold, call], isCorrect: true,
    facing: true, standingNow: "behind", beats: 300, youBeat: 55, total: 355,
    pot: 90, toCall: 30,
  });
  assert.match(why, /1 time in 4/, "$30 to win $90 is one in four");
  // The comparison a player can actually do: the price needed, next to the
  // share they have. Quoting how many hands BEAT them makes them do the
  // subtraction themselves.
  assert.match(why, /55 of his 355/);
  assert.match(why, /15%/);
});

test("every reason names a mechanism rather than quoting the money", () => {
  const a = opt("bet-big", "Bet $50", { call: 0.72, fold: 0.28 });
  const b = opt("check", "Check", { bet: 0.3, check: 0.7 });
  for (const [chosen, best, isCorrect, standingNow] of [
    [a, a, true, "ahead"], [b, a, false, "ahead"], [a, b, false, "behind"], [b, b, true, "behind"],
  ]) {
    const why = reasonFor({
      chosen, best, options: [a, b], isCorrect, facing: false, standingNow,
      beats: 109, youBeat: 234, total: 344,
    });
    assert.ok(why.length >= 70, `too thin to be a reason: "${why}"`);
    assert.match(why, /\d/, "a reason has to count something");
    assert.doesNotMatch(why, /that much|undefined|NaN/, `unfilled placeholder: "${why}"`);
  }
});

// A bluff and a value bet want opposite things from a size. Judging a bluff by
// its CALL rate printed "fewer hands call $105 than $46, and the ones that do
// pay a lot more" on a hand whose winning bet worked because he folded.
test("bet sizing on a bluff is judged by fold rate, not call rate", () => {
  const big = opt("bet-big", "Bet $105", { fold: 0.88, call: 0.12 });
  const small = opt("bet-small", "Bet $46", { fold: 0.08, call: 0.92 });
  const why = reasonFor({
    chosen: small, best: big, options: [small, big], isCorrect: false,
    facing: false, standingNow: "behind", beats: 435, youBeat: 27, total: 494,
  });
  assert.match(why, /88%/);
  assert.match(why, /8%/);
  assert.match(why, /fold him out/);
  assert.doesNotMatch(why, /pay a lot more|pay you/, "nobody is paying you when you are bluffing");
});

test("checking is never described as collecting value when the winning line is a bluff", () => {
  const check = opt("check", "Check", { bet: 0.1, check: 0.9 });
  const bet = opt("bet-big", "Bet $105", { fold: 0.88, call: 0.12 });
  const why = reasonFor({
    chosen: check, best: bet, options: [check, bet], isCorrect: false,
    facing: false, standingNow: "behind", beats: 435, youBeat: 27, total: 494,
  });
  assert.doesNotMatch(why, /collects none of that/, "there is nothing to collect from a bluff");
  assert.match(why, /gives up/);
});

// "The hands that beat you ALL call" is only true when he barely folds.
test("a failed bluff is not described as folding nothing out when it folds a third", () => {
  const bet = opt("bet-big", "Bet $35", { fold: 0.32, call: 0.68 });
  const check = opt("check", "Check", { bet: 0.2, check: 0.8 });
  const why = reasonFor({
    chosen: bet, best: check, options: [check, bet], isCorrect: false,
    facing: false, standingNow: "behind", beats: 271, youBeat: 150, total: 430,
  });
  assert.doesNotMatch(why, /all call/, "32% folding is not 'they all call'");
  assert.match(why, /not enough/);
});
