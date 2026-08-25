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
npm run audit      # re-derive every claim from the cards; fails on any disagreement
npm run build      # stamp assets, content gate, audit
npm run content    # all of it
```

`npm run audit` is the one that matters. The content gate checks a hand is well *formed*; the
audit checks it is *true* - it recounts the showdown from the cards, re-derives which answer
should be correct, and fails if any sentence disagrees with the numbers under it. It also
reports variety, so a hundred hands that are secretly ten hands cannot pass quietly.

`tools/lib/engine.mjs` is the only file that knows `poker-sim`'s shape. It expects a sibling
checkout at `../poker-sim`, and is a **build-time dependency only** — nothing from it ships
to the browser.

## Accounts

Magic-link sign-in over Neon Postgres, as Netlify Functions. Google OAuth is written and
deployed but **gated off** (`GOOGLE_SIGNIN_ENABLED`), because the shared OAuth client has no
redirect URI registered for this site — a live button that fails at Google is worse than none.
To turn on: register `https://pokercoach.withmagic.ai/api/auth/google/callback` on the client
in GCP project `1093236447839`, then set the flag.

```
GET  /api/me                     who is signed in, + leak profile and calibration
POST /api/logout
GET  /api/auth/google            deferred - 503 unless GOOGLE_SIGNIN_ENABLED=true
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

**Email goes through Cloudflare Email Sending, not Resend**, and the FROM address is
load-bearing: Cloudflare onboards `withmagic.ai` but **not its subdomains**. Mail from
`@pokercoach.withmagic.ai` reaches verified Email Routing destinations only and 400s for
everyone else - which looks fine while you test it and is broken for strangers.
`assertSendableFrom()` in `netlify/functions/_lib/email.mjs` refuses a subdomain sender
outright, and the test suite asserts it. Send from `coach@withmagic.ai`.

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

## Deploying

```bash
netlify deploy --prod --skip-functions-cache
```

**The flag is not optional when a function changed.** Netlify reuses a functions cache and will
happily report a successful deploy while serving the previous code — "Deploying functions from
cache", then "CDN requesting 0 files and 0 functions".

## Known limits

- **River spots only.** Turn and flop decisions need runout variance in the rollout, which
  the current EV measurement does not model.
- **Leak coverage is uneven.** The six-leak taxonomy was designed for hand-authored content;
  `removes-strength` never fires in generated river spots and `bluffs-showdown` is thin (3 of 100).
- **Opponent modelling is calibrated to judgement, not live data**, because published live
  low-stakes data does not exist. See `poker-sim/docs/DECISIONS.md`.
- **The fallback range is uniform.** About a third of hands use `plausibleRange`, which is every
  holding the opponent could still be dealt, weighted evenly - so it overstates how weak he is.
  It previously excluded "air", which was worse: any hero holding air then lost to 100% of the
  range by construction. Labelled `opponent: heuristic` in the data.
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
