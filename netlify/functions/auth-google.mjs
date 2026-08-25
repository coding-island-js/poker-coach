// GET /api/auth/google        -> bounce to Google's consent screen
// GET /api/auth/google/callback -> exchange the code, start a session
//
// State is a signed, expiring value rather than a random one kept server-side:
// it proves the callback belongs to a flow this site started, without needing a
// table or a second round trip.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookieHeader, startSession, upsertUser, siteOrigin, json } from "./_lib/auth.mjs";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SECRET = process.env.SESSION_SECRET_POKERCOACH ?? process.env.SESSION_SECRET;
const STATE_MINUTES = 10;

const sign = (value) => createHmac("sha256", SECRET).update(value).digest("base64url");

function makeState() {
  const body = `${Date.now()}.${randomBytes(12).toString("base64url")}`;
  return `${body}.${sign(body)}`;
}

function stateValid(state) {
  if (typeof state !== "string") return false;
  const index = state.lastIndexOf(".");
  if (index < 1) return false;
  const body = state.slice(0, index);
  const expected = sign(body);
  const given = state.slice(index + 1);
  if (given.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return false;
  const issued = Number(body.split(".")[0]);
  return Number.isFinite(issued) && Date.now() - issued < STATE_MINUTES * 60_000;
}

const redirectUri = (request) => `${siteOrigin(request)}/api/auth/google/callback`;

export default async (request) => {
  const url = new URL(request.url);
  const home = siteOrigin(request);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json({ error: "google_not_configured" }, { status: 503 });
  }

  // --- step 1: send them to Google -------------------------------------
  if (!url.pathname.endsWith("/callback")) {
    const consent = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    consent.searchParams.set("client_id", CLIENT_ID);
    consent.searchParams.set("redirect_uri", redirectUri(request));
    consent.searchParams.set("response_type", "code");
    consent.searchParams.set("scope", "openid email profile");
    consent.searchParams.set("state", makeState());
    consent.searchParams.set("prompt", "select_account");
    return Response.redirect(consent.toString(), 302);
  }

  // --- step 2: they came back -------------------------------------------
  if (url.searchParams.get("error")) return Response.redirect(`${home}/?signin=cancelled`, 302);
  if (!stateValid(url.searchParams.get("state"))) {
    return Response.redirect(`${home}/?signin=badstate`, 302);
  }
  const code = url.searchParams.get("code");
  if (!code) return Response.redirect(`${home}/?signin=nocode`, 302);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    console.error("[google] token exchange failed:", await tokenResponse.text());
    return Response.redirect(`${home}/?signin=failed`, 302);
  }
  const { id_token: idToken } = await tokenResponse.json();
  if (!idToken) return Response.redirect(`${home}/?signin=failed`, 302);

  // Google just minted this over TLS in a direct server-to-server call, so the
  // payload is read rather than re-verified against Google's JWKS.
  let claims;
  try {
    claims = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return Response.redirect(`${home}/?signin=failed`, 302);
  }
  if (!claims.email || claims.email_verified === false || claims.aud !== CLIENT_ID) {
    return Response.redirect(`${home}/?signin=failed`, 302);
  }

  const user = await upsertUser({
    email: claims.email,
    displayName: claims.name ?? null,
    googleSub: claims.sub ?? null,
  });
  const sessionId = await startSession(user.id);

  return new Response(null, {
    status: 302,
    headers: { location: `${home}/?signin=ok`, "set-cookie": cookieHeader(sessionId) },
  });
};

export const config = { path: ["/api/auth/google", "/api/auth/google/callback"] };
