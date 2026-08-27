// GET /api/auth/verify?token=... -> spends the token, starts a session, redirects to the trainer.
import { consumeLoginToken, cookieHeader, startSession, upsertUser, siteOrigin } from "./_lib/auth.mjs";

export default async (request) => {
  const token = new URL(request.url).searchParams.get("token");
  const home = siteOrigin(request);

  const email = await consumeLoginToken(token);
  if (!email) {
    return Response.redirect(`${home}/play?signin=expired`, 302);
  }

  const user = await upsertUser({ email });
  const sessionId = await startSession(user.id);

  return new Response(null, {
    status: 302,
    headers: { location: `${home}/play?signin=ok`, "set-cookie": cookieHeader(sessionId) },
  });
};

export const config = { path: "/api/auth/verify" };
