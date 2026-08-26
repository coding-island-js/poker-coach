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
