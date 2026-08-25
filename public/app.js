// Poker Coach - a two-question reasoning loop over pre-computed spots.
//
// The whole product is: read the spot, say where you stand, say what you would
// do, and get told immediately - with counted numbers - whether the reasoning
// held. Feedback lands after EVERY question, not at the end, so nobody builds
// three answers on a broken first one.

const STORE_KEY = "poker-coach-v1";
const main = document.getElementById("main");

let content = null;
let profile = load();
let view = { screen: "hand", handIndex: 0, step: "read", answers: {}, confidence: null };

// ------------------------------------------------------------------ storage
function load() {
  const blank = { version: 1, attempts: [], lastHand: 0 };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return blank;
    const saved = JSON.parse(raw);
    if (saved?.version === 1 && Array.isArray(saved.attempts)) return saved;
    return blank;
  } catch {
    return blank; // private mode, blocked storage - the app still works
  }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(profile)); } catch { /* not fatal */ }
}

// ------------------------------------------------------------------ helpers
const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
};

const isRed = (card) => card.includes("♥") || card.includes("♦");
const cardEl = (card) => el("span", { class: `pc${isRed(card) ? " red" : ""}` }, card);
const scrollTop = () => window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));

const currentHand = () => content.hands[view.handIndex] ?? content.hands[0];

// --------------------------------------------------------------- hand parts
function feltEl(hand) {
  return el("div", { class: "felt" },
    el("div", { class: "felt-row" },
      el("span", {}, `${hand.street} · pot ${hand.pot}`),
      el("span", {}, hand.effective)),
    el("div", { class: "hands" },
      el("div", { class: "hand-group" },
        el("span", {}, `You · ${hand.heroPosition.split(" ·")[0]}`),
        el("div", { class: "cards" }, hand.hero.map(cardEl))),
      el("div", { class: "hand-group" },
        el("span", {}, "Board"),
        el("div", { class: "cards" }, hand.board.map(cardEl)))));
}

function contextEl(hand, { step } = {}) {
  return el("section", { class: "card" },
    feltEl(hand),
    el("div", { class: "factline" }, hand.decisionNow),
    // The betting line IS the evidence for the read - hiding it behind a summary
    // turned the first question into a guess. Shown always, formatted as a
    // timeline so it can be scanned rather than read.
    el("div", { class: "timeline", "aria-label": "How the hand played" },
      hand.history.map((street) =>
        el("div", { class: "street" },
          el("b", {}, street.street),
          el("span", {}, street.actions.join(" "))))),
    // The opponent read is an ASSUMPTION handed to the learner, not something
    // they worked out - so it appears only on the action step, where the answer
    // can actually depend on it, and it is labelled as given rather than known.
    // On the read step it is worse than useless: that question is pure
    // combinatorics, and a personality label invites the exact habit this app
    // calls a leak ("Treating a read as fact").
    step === "action"
      ? el("p", { class: "oppnote" },
          el("span", { class: "given" }, "Assume"), " ", el("b", {}, hand.opponentNote))
      : null);
}

function stepDots(active) {
  return el("div", { class: "stepdots" },
    el("span", { class: `dot${active >= 1 ? " on" : ""}` }),
    el("span", { class: `dot${active >= 2 ? " on" : ""}` }),
    el("span", {}, active === 1 ? "Step 1 of 2" : "Step 2 of 2"));
}

// ---------------------------------------------------------------- questions
function choiceButton({ option, chosen, locked, correct, onPick }) {
  const isChosen = chosen === option.id;
  let cls = "choice";
  if (locked) {
    if (correct) cls += " right";
    else if (isChosen) cls += " wrong";
    else cls += " dim";
  }
  const label = el("span", {},
    el("strong", {}, option.label),
    option.purpose ? el("span", { class: "purpose" }, `— to ${option.purpose}`) : null);
  const mark = locked
    ? el("span", { class: `mark ${correct ? "ok" : isChosen ? "no" : ""}` }, correct ? "✓" : isChosen ? "✕" : "")
    : null;
  return el("button", {
    class: cls, disabled: locked ? "disabled" : null,
    "aria-pressed": isChosen ? "true" : "false",
    onclick: () => { if (!locked) onPick(option.id); },
  }, label, mark);
}

function readStep(hand) {
  const chosen = view.answers.read ?? null;
  const locked = Boolean(chosen);
  const right = chosen === hand.read.correctId;
  const n = hand.numbers;

  const wrap = el("div", {},
    el("div", { class: "spot-head" }, el("p", { class: "eyebrow" }, hand.leakLabel), stepDots(1)),
    el("h1", {}, hand.title),
    contextEl(hand, { step: "read" }),
    el("section", { class: "card" },
      el("p", { class: "qprompt" }, hand.read.prompt),
      el("div", { class: "choices" },
        hand.read.options.map((option) => choiceButton({
          option, chosen, locked,
          correct: locked && option.id === hand.read.correctId,
          onPick: (id) => { view.answers.read = id; render(); scrollToFeedback(); },
        })))));

  if (locked) {
    const fb = el("div", { class: `feedback ${right ? "ok" : "no"}`, id: "fb", "aria-live": "polite" },
      el("div", { class: "verdict" }, right ? "✓ That matches the count" : "✕ Not what the count says"),
      el("div", { class: "countline" },
        el("span", {}, "Of the "), el("b", {}, n.total), el("span", {}, " hands he can hold here, "),
        el("b", {}, n.beats), el("span", {}, ` beat you — ${Math.round(n.beatsPct)}%.`)),
      el("p", { class: "small muted" }, hand.read.why[hand.read.correctId]),
      el("button", { class: "primary", onclick: () => { view.step = "action"; render(); scrollTop(); } },
        "Next: what do you do? →"));
    wrap.append(fb);
  }
  return wrap;
}

function actionStep(hand) {
  const chosen = view.answers.action ?? null;
  const locked = Boolean(chosen) && view.confidence !== null;
  const correctIds = hand.action.correctIds;
  const right = correctIds.includes(chosen);

  const wrap = el("div", {},
    el("div", { class: "spot-head" }, el("p", { class: "eyebrow" }, hand.leakLabel), stepDots(2)),
    el("h1", {}, hand.title),
    contextEl(hand, { step: "action" }),
    el("section", { class: "card" },
      el("p", { class: "qprompt" }, hand.action.prompt),
      el("div", { class: "choices" },
        hand.action.options.map((option) => choiceButton({
          option, chosen, locked,
          correct: locked && correctIds.includes(option.id),
          onPick: (id) => { view.answers.action = id; render(); scrollToFeedback(); },
        })))));

  // Confidence is asked once the answer is in but before it is graded, so it
  // records what the learner actually believed rather than how they felt after
  // being told.
  if (chosen && view.confidence === null) {
    wrap.append(el("div", { class: "feedback", id: "fb" },
      el("div", { class: "verdict" }, "Before the answer — how sure are you?"),
      el("div", { class: "confidence" },
        [["guessing", "Guessing"], ["fairly", "Fairly sure"], ["very", "Very sure"]].map(([id, label]) =>
          el("button", { class: "ghost", onclick: () => { view.confidence = id; record(hand); render(); scrollToFeedback(); } }, label)))));
  }

  if (locked) wrap.append(resultEl(hand, right));
  return wrap;
}

function resultEl(hand, right) {
  const chosen = view.answers.action;
  const best = hand.action.options[0];
  const evs = hand.action.options;
  const span = Math.max(...evs.map((o) => Math.abs(o.ev)), 1);

  return el("div", { class: `feedback ${right ? "ok" : "no"}`, id: "fb", "aria-live": "polite" },
    el("div", { class: "verdict" }, right ? "✓ That line holds up" : `✕ ${best.label} does better here`),
    el("p", { class: "small" }, hand.action.why[chosen]),

    el("p", { class: "eyebrow", style: "margin-top:14px" }, `Measured over ${hand.numbers.rollouts} play-outs`),
    el("div", { class: "evbar" },
      evs.map((option) => el("div", { class: "evrow" },
        el("span", {}, option.label),
        el("span", { class: "track" },
          el("i", { class: `fill${option.ev < 0 ? " neg" : ""}`, style: `width:${Math.round((Math.abs(option.ev) / span) * 100)}%` })),
        el("span", { class: "val" }, `${option.ev < 0 ? "−" : "+"}$${Math.abs(option.ev).toFixed(0)}`)))),

    el("div", { class: "takeaway" },
      el("span", {}, "Take this to the table"),
      el("p", {}, hand.takeaway)),

    el("div", { class: "evidence" },
      el("span", { class: "tag exact" }, "Counting: exact"),
      el("span", { class: "tag modelled" }, `Opponent: ${hand.evidence.opponent}`),
      el("span", { class: "tag" }, "Coaching: written")),

    el("button", { class: "primary", style: "margin-top:14px", onclick: nextHand }, "Next hand →"),
    el("button", { class: "linkish", onclick: () => { resetHand(); render(); scrollTop(); } }, "Try this one again"));
}

function scrollToFeedback() {
  window.requestAnimationFrame(() => {
    document.getElementById("fb")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

// ----------------------------------------------------------------- progress
function record(hand) {
  profile.attempts.push({
    // Stable id so uploading the same attempt twice cannot double-count it.
    id: (crypto.randomUUID?.() ?? `${hand.id}-${Date.now()}-${Math.round(performance.now())}`),
    handId: hand.id,
    leak: hand.leak,
    read: view.answers.read,
    readOk: view.answers.read === hand.read.correctId,
    action: view.answers.action,
    actionOk: hand.action.correctIds.includes(view.answers.action),
    confidence: view.confidence,
    at: Date.now(),
  });
  profile.lastHand = view.handIndex;
  save();
  syncSoon();
}

// ------------------------------------------------------------------ account
// Progress is always written locally first and uploaded afterwards, so the app
// keeps working signed-out, offline, or when the API is down.
let account = { signedIn: false };
let syncTimer = null;

async function loadAccount() {
  try {
    const response = await fetch("/api/me", { credentials: "same-origin" });
    if (!response.ok) return;
    account = await response.json();
    if (account.signedIn) syncNow();
  } catch { /* stay anonymous */ }
}

function syncSoon() {
  if (!account.signedIn) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 1200);
}

async function syncNow() {
  if (!account.signedIn || !profile.attempts.length) return;
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attempts: profile.attempts.slice(-500) }),
    });
    if (!response.ok) return;
    const result = await response.json();
    account.totals = result.totals;
    if (view.screen === "progress") render();
  } catch { /* try again next time */ }
}

async function signOut() {
  try { await fetch("/api/logout", { method: "POST", credentials: "same-origin" }); } catch { /* ignore */ }
  account = { signedIn: false };
  render();
}

async function requestMagicLink(email, statusNode) {
  statusNode.textContent = "Sending…";
  try {
    const response = await fetch("/api/auth/magic", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => ({}));
    statusNode.textContent = response.ok && result.ok
      ? "Check your email — the link works once and lasts 20 minutes."
      : "Could not send that. Check the address and try again.";
  } catch {
    statusNode.textContent = "Could not reach the server. Try again in a moment.";
  }
}

function accountCard() {
  if (account.signedIn) {
    const totals = account.totals ?? {};
    return el("section", { class: "card" },
      el("p", { class: "eyebrow" }, "Account"),
      el("h2", {}, account.user?.name || account.user?.email || "Signed in"),
      el("p", { class: "small muted" },
        `Progress is saved to your account${totals.attempts ? ` — ${totals.attempts} attempts across ${totals.hands} hands.` : "."}`),
      el("button", { class: "linkish", onclick: signOut }, "Sign out"));
  }

  const status = el("p", { class: "small muted", "aria-live": "polite" }, "");
  const input = el("input", {
    type: "email", class: "email-input", placeholder: "you@example.com",
    "aria-label": "Email address", autocomplete: "email",
  });
  const send = () => {
    const email = input.value.trim();
    if (!email.includes("@")) { status.textContent = "That does not look like an email address."; return; }
    requestMagicLink(email, status);
  };
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") send(); });

  return el("section", { class: "card" },
    el("p", { class: "eyebrow" }, "Keep your progress"),
    el("h2", {}, "Save it to an account"),
    el("p", { class: "small muted" },
      "Right now your progress lives only in this browser. Get a sign-in link by email and it follows you to any device."),
    // The Google button appears only when the server confirms that flow works.
    // A live button that fails at Google is worse than no button.
    account.googleEnabled ? el("a", { class: "primary google-button", href: "/api/auth/google" }, "Continue with Google") : null,
    account.googleEnabled ? el("p", { class: "or-line" }, "or") : null,
    el("div", { class: "email-row" }, input, el("button", { class: "primary send-link", onclick: send }, "Email me a sign-in link")),
    status);
}

function resetHand() {
  view.step = "read";
  view.answers = {};
  view.confidence = null;
}

function nextHand() {
  view.handIndex = (view.handIndex + 1) % content.hands.length;
  resetHand();
  profile.lastHand = view.handIndex;
  save();
  render();
  scrollTop();
}

function progressScreen() {
  const attempts = profile.attempts;
  const done = new Set(attempts.map((a) => a.handId)).size;
  const readOk = attempts.filter((a) => a.readOk).length;
  const actionOk = attempts.filter((a) => a.actionOk).length;

  const byLeak = {};
  for (const attempt of attempts) {
    const row = byLeak[attempt.leak] ?? (byLeak[attempt.leak] = { total: 0, ok: 0 });
    row.total += 1;
    if (attempt.readOk && attempt.actionOk) row.ok += 1;
  }
  const ranked = Object.entries(byLeak).sort((a, b) => (a[1].ok / a[1].total) - (b[1].ok / b[1].total));
  // Only call something a weak spot if it has actually been got wrong. Ranking
  // alone will happily nominate a leak the learner is three-for-three on.
  const weakest = ranked.find(([, row]) => row.ok < row.total) ?? null;

  // Calibration: what "very sure" is actually worth. This is the number the
  // confidence question exists to produce.
  const confident = attempts.filter((a) => a.confidence === "very");
  const confidentWrong = confident.filter((a) => !(a.readOk && a.actionOk)).length;

  return el("div", {},
    el("h1", {}, "Your progress"),
    view.notice ? el("div", { class: "notice", role: "status" }, view.notice) : null,
    accountCard(),
    attempts.length === 0
      ? el("div", { class: "card empty" },
          el("p", {}, "Nothing yet. Play a few hands and this fills in — which link in your thinking breaks first, and how often being sure means being right."),
          el("button", { class: "primary", onclick: () => { view.screen = "hand"; render(); scrollTop(); } }, "Start a hand →"))
      : [
          el("div", { class: "stats" },
            el("div", { class: "stat" }, el("b", {}, done), el("span", {}, `of ${content.hands.length} hands seen`)),
            el("div", { class: "stat" }, el("b", {}, `${Math.round((readOk / attempts.length) * 100)}%`), el("span", {}, "reads correct")),
            el("div", { class: "stat" }, el("b", {}, `${Math.round((actionOk / attempts.length) * 100)}%`), el("span", {}, "actions correct"))),

          ranked.length ? el("section", { class: "card" },
            el("p", { class: "eyebrow" }, weakest ? "First thing to fix" : "Where you stand"),
            el("h2", {}, weakest ? (content.leakLabels[weakest[0]] ?? weakest[0]) : "Nothing breaking yet"),
            el("p", { class: "small muted" }, weakest
              ? `You've got this right ${weakest[1].ok} of ${weakest[1].total} times.`
              : "You've got every hand so far. Keep going — the weak spot shows up as the set widens."),
            el("div", { class: "meters" },
              ranked.map(([leak, row]) => el("div", { class: "meter" },
                el("p", {}, el("span", { class: "name" }, content.leakLabels[leak] ?? leak), el("span", {}, `${row.ok}/${row.total}`)),
                el("div", { class: "track-lg" }, el("i", { style: `width:${Math.round((row.ok / row.total) * 100)}%` })))))) : null,

          confident.length >= 3 ? el("section", { class: "card" },
            el("p", { class: "eyebrow" }, "Calibration"),
            el("h2", {}, confidentWrong === 0 ? "When you're sure, you're right" : `${confidentWrong} of ${confident.length} "very sure" answers were wrong`),
            el("p", { class: "small muted" }, "Being confident and being correct are different skills. This tracks the gap.")) : null,

          el("button", { class: "primary", onclick: () => { view.screen = "hand"; render(); scrollTop(); } }, "Back to training →"),
          el("button", { class: "linkish", onclick: clearProfile }, "Clear my saved progress"),
        ]);
}

function clearProfile() {
  if (!window.confirm("Clear all progress saved in this browser? This cannot be undone.")) return;
  profile = { version: 1, attempts: [], lastHand: 0 };
  save();
  render();
}

// ------------------------------------------------------------------- render
function render() {
  main.replaceChildren();
  if (!content) {
    main.append(el("div", { class: "card empty" }, "Loading hands…"));
    return;
  }
  if (view.screen === "progress") { main.append(progressScreen()); return; }
  const hand = currentHand();
  main.append(view.step === "read" ? readStep(hand) : actionStep(hand));
}

document.getElementById("nav-progress").addEventListener("click", () => {
  view.screen = view.screen === "progress" ? "hand" : "progress";
  render();
  scrollTop();
});
document.getElementById("home-link").addEventListener("click", () => {
  view.screen = "hand";
  render();
  scrollTop();
});

// A sign-in round trip comes back as ?signin=... - say what happened, then
// tidy the URL so a refresh does not repeat the message.
function signinNotice() {
  const status = new URL(window.location.href).searchParams.get("signin");
  if (!status) return null;
  window.history.replaceState({}, "", window.location.pathname);
  const messages = {
    ok: "You're signed in. Your progress will sync from now on.",
    expired: "That link had already been used or had expired. Send yourself a new one.",
    cancelled: "Sign-in cancelled — nothing changed.",
    badstate: "That sign-in attempt did not look like it started here. Try again.",
    nocode: "Google did not send anything back. Try again.",
    failed: "Google sign-in did not complete. Try again.",
  };
  return messages[status] ?? null;
}

fetch("hands.json")
  .then((response) => response.json())
  .then((data) => {
    content = data;
    // Resume where they left off rather than restarting at hand one.
    view.handIndex = Math.min(profile.lastHand ?? 0, content.hands.length - 1);
    const notice = signinNotice();
    if (notice) { view.screen = "progress"; view.notice = notice; }
    render();
    loadAccount();
  })
  .catch(() => {
    main.replaceChildren(el("div", { class: "card empty" }, "Could not load the hands. Refresh to try again."));
  });
