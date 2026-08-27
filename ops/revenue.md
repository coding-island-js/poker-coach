# Poker Coach — revenue model

Written 2026-08-27, for Raj's decision. Nothing here is built yet.

---

## The thing that decides it: our costs are near zero per user

This matters more than any pricing theory, so it goes first.

The product is a **static JSON file**. The expensive part — dealing 75,000 hands and
measuring every action by 250 engine replays — happens on this laptop, once, before deploy.
Serving a learner costs a CDN hit. There is no LLM call per user, no per-request compute, no
per-user simulation.

The only per-user cost is the account: a row per attempt in Neon. A heavy user doing all 100
hands twice generates about 400 rows. A thousand of them is 400,000 rows, which sits inside
free or near-free tiers.

**So "we can't afford lifetime access" is not true here.** That argument applies to products
that burn compute per user. This one does not. That frees the decision to be about what
people will actually pay for rather than what we can afford.

---

## Recommendation

**Free: the first 10 hands, no account needed. Paid: $39 one time for the rest, forever.**

### Why free-then-paid rather than a trial or a paywall

The product cannot be explained, only experienced. "A poker coach that grades your reasoning
and counts every hand your opponent can have" is a sentence nobody believes until they have
answered three questions and seen the count. Ten hands is enough to feel it and not enough to
finish it.

It also solves the landing-page problem: the best demonstration is the thing itself.

### Why one time rather than a subscription

- **The audience.** We deliberately retargeted away from serious/GTO players toward
  low-stakes recreational ones. Recreational players buy things; they are famously bad at
  subscribing to study tools. A subscription optimises for the audience we walked away from.
- **The shape of the product.** A hundred fixed hands is a *product*, not a *service*.
  Charging monthly for a finite thing invites the question "what am I paying for this month?"
  and the honest answer today is "nothing new".
- **What it saves us building.** No dunning, no cancellation flow, no proration, no failed-
  payment recovery, no "your card expired" email. That is real work we do not have to do.
- **We can afford it.** See above.

### Why the account is the paid half

This resolves the database worry cleanly. Free users get localStorage - progress lives in
their browser, costs us nothing, and is genuinely useful. **Paying users get the account**:
progress that follows them across devices, the leak profile, the calibration number. So
database cost only ever attaches to someone who has paid, and the account becomes a reason to
pay rather than an expense to cover.

### Price

$39. Reference points: a poker strategy book is around $30 and teaches less specifically; the
serious-player subscriptions run far higher but serve a different customer. $39 is an easy
yes for someone who loses that in one bad call, and it does not invite the comparison to a
$10/month tool.

I am confident about the *shape* of this recommendation and less confident about the exact
number. $29 and $49 are both defensible; the right way to settle it is to ship one and watch.

---

## The subscription that might make sense later

**Not now, and only on evidence.** If people finish the hundred and ask for more, then a
"new hands every month" tier is honest recurring value - and cheap for us, because generating
another hundred is compute we already run. Roughly $7-9/month alongside the one-time
purchase, not instead of it.

**The trigger to revisit:** learners completing the set and coming back. We will know because
the account already records it.

---

## What I would NOT do

- **A pure subscription as the only option.** Wrong audience, and it makes the finite content
  a liability rather than a product.
- **Drop the backend to avoid costs.** The backend is built, working, and nearly free. It is
  also the paid feature - removing it removes the reason to pay.
- **Export to Google Sheets as the "database".** It is a workaround for a cost problem we do
  not have, and it is more work than the thing it replaces.
- **Fake scarcity, fake testimonials, countdown timers, "trusted by 10,000 players".** Raj
  2026-08-27: nothing fake. The product's whole claim is that its numbers are honest; the
  page selling it cannot be the place we start lying.

---

## What this means for the build

The landing page and the account pages should be built **with a paid tier in mind but not
blocked on it**: a price on the page, a "Get all 100 hands" button that can be wired to
Stripe when the keys exist, and the hand gate written so free-versus-paid is one flag rather
than a rewrite.

**Blocked on Raj:** Stripe keys for the poker-coach account, into `.env.master` as
`STRIPE_SECRET_POKERCOACH` / `STRIPE_PRICE_POKERCOACH`. Nothing else is blocked.
