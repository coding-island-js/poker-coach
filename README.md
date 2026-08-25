# Poker Coach

A No-Limit Hold'em coach that grades your **reasoning**, not just your answer.

Every hand is a real spot dealt by a simulated cash game. Every number the app shows was
counted or measured, not asserted. Two questions per hand, feedback after each one:

```
Where does your hand stand?  →  counted answer
What do you do, and why?     →  EV of every option, measured by replay
                             →  one sentence to take to the table
```

Live at **https://pokercoach.withmagic.ai** · Study tool only, not for use during live play.

## How the content is made

Three layers, and only the last one is writing:

| Layer | Source | Why |
|---|---|---|
| The spot | `poker-sim`'s NLHE engine deals it | Authentic by construction — a real hand with real messy numbers |
| The answer | Measured by replaying the hand | Ground truth, not an opinion and not an LLM guess |
| The words | Templates over those numbers | Language is the only thing that needs authoring |

**No model decides what the right play is.** Each candidate action is forced at the real
decision point and the hand is replayed 250 times; the mean stack change is its EV. A spot
is only kept when the *tempting* play — what a naive archetype actually does there — is
measurably worse than the best one.

### The pipeline

```bash
npm run generate   # deal ~30k hands, score river spots, write work/candidates.json
npm run curate     # pick 100 varied instructive ones -> public/hands.json
npm run build      # content gate: fails the build rather than shipping a broken lesson
npm run content    # all three
```

`tools/lib/engine.mjs` is the only file that knows `poker-sim`'s shape. It expects a sibling
checkout at `../poker-sim`, and is a **build-time dependency only** — nothing from it ships
to the browser.

## Accounts

Google OAuth and magic-link sign-in over Neon Postgres, as Netlify Functions:

```
GET  /api/me                     who is signed in, + leak profile and calibration
POST /api/logout
GET  /api/auth/google            -> Google consent -> /api/auth/google/callback
POST /api/auth/magic  { email }  emails a single-use link
GET  /api/auth/verify?token=     spends it and starts a session
POST /api/sync  { attempts }     uploads local progress, idempotent
```

Progress is always written to `localStorage` first and uploaded afterwards, so the app keeps
working signed-out, offline, or when the API is down. Uploads are idempotent on the attempt's
client id, so the whole backlog can be re-sent safely the first time someone signs in.

Magic-link tokens are stored only as HMACs and are single-use with a 20-minute life. Session
cookies are HttpOnly, Secure, SameSite=Lax and signed, so a forged cookie is rejected before
the database is touched.

```bash
node tools/migrate.mjs   # applies db/schema.sql, idempotent, safe on every deploy
```

## Running it

```bash
npm run serve      # http://localhost:5173
npm test           # unit tests for the counting and selection logic
```

The app is vanilla JS with no dependencies and no build step. `public/` is what Netlify
publishes, as-is.

## Honesty rules

The app labels every claim with where it came from, and the content gate enforces it:

- **exact** — combination counts and showdown comparisons. Arithmetic; state them plainly.
- **modelled** — how often a player type folds. A model of a person, not a fact about one.
- **authored** — the coaching sentence.

Nothing may be upgraded from one tier to a stronger one. In particular this is **not** a
solver, does not claim GTO frequencies, and says so.

## Known limits

- **River spots only.** Turn and flop decisions need runout variance in the rollout, which
  the current EV measurement does not model.
- **Leak coverage is uneven.** The six-leak taxonomy was designed for hand-authored content;
  `removes-strength` never fires in generated river spots and `bluffs-showdown` is thin (3 of 100).
- **Opponent modelling is calibrated to judgement, not live data**, because published live
  low-stakes data does not exist. See `poker-sim/docs/DECISIONS.md`.
- **The fallback range is too strong.** About a third of hands use `plausibleRange`, which keeps
  every holding that made a pair and drops all air, so the opponent reads stronger than reality
  and the beats-you count is pessimistic. Labelled `opponent: heuristic` in the data.
- **No accounts.** Progress is per-browser `localStorage`. Google + magic-link auth over Neon
  is the next step.

## Layout

```
public/          the shipped app - index.html, style.css, app.js, hands.json
tools/           the content pipeline (generate -> curate -> verify), migrate, static server
db/              schema.sql - users, sessions, login_tokens, attempts + two views
netlify/         functions: auth, session, sync
tests/           unit tests for counting and selection
docs/            product research and requirements from the original build
```

`docs/` is the tool-agnostic handoff and outranks any chat transcript. Start with
`research-and-product-brief.md`, then `mvp-requirements.md`.
