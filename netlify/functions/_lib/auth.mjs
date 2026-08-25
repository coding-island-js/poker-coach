// Sessions, cookies and magic-link tokens. No dependencies beyond node:crypto.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "./db.mjs";

const SECRET = process.env.SESSION_SECRET_POKERCOACH ?? process.env.SESSION_SECRET;
if (!SECRET) throw new Error("SESSION_SECRET_POKERCOACH is not set");

export const COOKIE = "pc_session";
const SESSION_DAYS = 30;
const TOKEN_MINUTES = 20;

const hmac = (value) => createHmac("sha256", SECRET).update(value).digest("hex");

/** Compare without leaking length or position through timing. */
function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// ------------------------------------------------------------------ cookies
export function cookieHeader(sessionId, { clear = false } = {}) {
  const base = `${COOKIE}=`;
  if (clear) return `${base}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  const signed = `${sessionId}.${hmac(sessionId)}`;
  return `${base}${signed}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}`;
}

function readCookie(request) {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}

/** The signed-in user, or null. Verifies the signature before touching the DB. */
export async function currentUser(request) {
  const value = readCookie(request);
  if (!value) return null;
  const index = value.lastIndexOf(".");
  if (index < 1) return null;
  const id = value.slice(0, index);
  if (!safeEqual(value.slice(index + 1), hmac(id))) return null;

  const rows = await sql`
    select u.id, u.email, u.display_name
    from sessions s join users u on u.id = s.user_id
    where s.id = ${id}::uuid and s.expires_at > now()
    limit 1
  `;
  return rows[0] ?? null;
}

export async function startSession(userId) {
  const rows = await sql`
    insert into sessions (user_id, expires_at)
    values (${userId}::uuid, now() + make_interval(days => ${SESSION_DAYS}))
    returning id
  `;
  return rows[0].id;
}

export async function endSession(request) {
  const value = readCookie(request);
  if (!value) return;
  const id = value.slice(0, value.lastIndexOf("."));
  if (id) await sql`delete from sessions where id = ${id}::uuid`.catch(() => {});
}

// --------------------------------------------------------------- magic link
/**
 * Mint a single-use login token. Only the hash is stored, so a database leak
 * cannot be replayed as a login.
 */
export async function createLoginToken(email) {
  const token = randomBytes(32).toString("base64url");
  await sql`
    insert into login_tokens (token_hash, email, expires_at)
    values (${hmac(token)}, ${email}, now() + make_interval(mins => ${TOKEN_MINUTES}))
  `;
  return token;
}

/** Spend a token. Returns the email it was minted for, or null. */
export async function consumeLoginToken(token) {
  if (!token) return null;
  const rows = await sql`
    update login_tokens set used_at = now()
    where token_hash = ${hmac(token)} and used_at is null and expires_at > now()
    returning email
  `;
  return rows[0]?.email ?? null;
}

// ------------------------------------------------------------------- users
export async function upsertUser({ email, displayName = null, googleSub = null }) {
  const rows = await sql`
    insert into users (email, display_name, google_sub)
    values (${email.toLowerCase()}, ${displayName}, ${googleSub})
    on conflict (email) do update set
      last_seen_at = now(),
      display_name = coalesce(excluded.display_name, users.display_name),
      google_sub   = coalesce(excluded.google_sub, users.google_sub)
    returning id, email, display_name
  `;
  return rows[0];
}

// ------------------------------------------------------------------ helpers
export const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });

export const isEmail = (value) =>
  typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** The site's own origin, trusting Netlify's forwarded host rather than input. */
export function siteOrigin(request) {
  const configured = process.env.SITE_ORIGIN;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}
