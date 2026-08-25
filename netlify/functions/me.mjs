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

  const user = await currentUser(request);
  if (!user) return json({ signedIn: false });

  const [leaks, calibration, totals] = await Promise.all([
    sql`select leak, attempts, clean, read_missed, action_missed
        from leak_profile where user_id = ${user.id}::uuid`,
    sql`select confidence, answered, correct
        from calibration where user_id = ${user.id}::uuid`,
    sql`select count(*)::int as attempts,
               count(distinct hand_id)::int as hands
        from attempts where user_id = ${user.id}::uuid`,
  ]);

  return json({
    signedIn: true,
    user: { email: user.email, name: user.display_name },
    totals: totals[0],
    leaks,
    calibration,
  });
};

export const config = { path: ["/api/me", "/api/logout"] };
