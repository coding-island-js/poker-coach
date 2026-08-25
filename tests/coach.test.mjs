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
