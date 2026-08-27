// GET  /api/me      -> who is signed in, plus their leak profile and calibration
// POST /api/logout   -> end the session
import { currentUser, endSession, cookieHeader, json } from "./_lib/auth.mjs";
import { sql } from "./_lib/db.mjs";

export default async (request) => {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/logout")) {
    await endSession(request);
    return json({ ok: true }, { headers: { "set-cookie": cookieHeader(null, { clear: true }) } });
  }

  const googleEnabled = process.env.GOOGLE_SIGNIN_ENABLED === "true";
  // The paywall exists but stays off until Stripe is wired and Raj turns it on.
  // Shipping the machinery dark means switching it on later is a flag, not a
  // rewrite - and nobody is locked out of anything in the meantime.
  const paywall = process.env.PAYWALL_ENABLED === "true";

  const user = await currentUser(request);
  if (!user) return json({ signedIn: false, googleEnabled, paywall, paid: false });

  const [leaks, calibration, totals, seen, entitlement] = await Promise.all([
    sql`select leak, attempts, clean, read_missed, action_missed
        from leak_profile where user_id = ${user.id}::uuid`,
    sql`select confidence, answered, correct
        from calibration where user_id = ${user.id}::uuid`,
    sql`select count(*)::int as attempts,
               count(distinct hand_id)::int as hands
        from attempts where user_id = ${user.id}::uuid`,
    // Which hands this account has already worked. The client uses this to
    // resume, so progress follows the ACCOUNT rather than the browser: signing
    // in on a phone used to start you back at hand one.
    sql`select distinct hand_id from attempts where user_id = ${user.id}::uuid`,
    sql`select plan, source from entitlements where user_id = ${user.id}::uuid`,
  ]);

  return json({
    signedIn: true,
    googleEnabled,
    paywall,
    // Read from the purchase record. Stripe will write the same row with
    // source 'stripe'; a hand-granted one looks identical to the app.
    paid: entitlement.length > 0,
    plan: entitlement[0]?.plan ?? "free",
    user: { email: user.email, name: user.display_name },
    totals: totals[0],
    leaks,
    calibration,
    seen: seen.map((row) => row.hand_id),
  });
};

export const config = { path: ["/api/me", "/api/logout"] };
