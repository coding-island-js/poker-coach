// Cloudflare Email Sending. Ported by SHAPE from pod-record's netlify/lib/email.js,
// which was itself ported from AutomationTools/email.js - that module is CommonJS
// outside this repo and reads .env.master off local disk, and neither survives a
// Netlify deploy. Keep the three in sync by shape, never by import.
//
// ── THE FROM ADDRESS IS LOAD-BEARING ──────────────────────────────────────────
// Onboarding a root domain does NOT authorise its subdomains. `coach@withmagic.ai`
// is authorised; anything `@pokercoach.withmagic.ai` delivers ONLY to verified Email
// Routing destinations and returns 400/10202 to everyone else.
//
// The app lives at pokercoach.withmagic.ai, so the natural thing to write is the
// broken thing - and it looks fine in testing, because Raj's own address IS a
// verified destination. Silent in dev, broken in prod, and only for strangers.
// assertSendableFrom() is why that cannot happen quietly here.

export const AUTHORISED_FROM_DOMAINS = ["withmagic.ai"];
export const DEFAULT_FROM = "coach@withmagic.ai";

/**
 * Throws unless the address sits on an onboarded domain EXACTLY.
 * `endsWith("." + d)` would pass pokercoach.withmagic.ai - that is the bug, not the check.
 */
export function assertSendableFrom(address) {
  const domain = String(address).split("@")[1]?.toLowerCase();
  if (!domain || !AUTHORISED_FROM_DOMAINS.includes(domain)) {
    throw new Error(
      `FROM "${address}" is not on an onboarded domain. Cloudflare authorises ` +
      `${AUTHORISED_FROM_DOMAINS.join(", ")} and NOT their subdomains - mail from a subdomain ` +
      `reaches verified Email Routing destinations only and 400s for everyone else.`,
    );
  }
  return address;
}

/** Send one message. Resolves { ok: true } or throws with a message worth reading. */
export async function send({ to, subject, text, html, from }) {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN_ACCOUNT; // the ACCOUNT token, not CLOUDFLARE_API_TOKEN
  if (!account || !token) throw new Error("email is not configured");

  const sender = assertSendableFrom(from || process.env.EMAIL_FROM_POKERCOACH || DEFAULT_FROM);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      // No `tags` field - Cloudflare rejects it outright, unlike Resend.
      body: JSON.stringify({ from: sender, to: [to], subject, text, ...(html ? { html } : {}) }),
    },
  );

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const detail = body.errors?.map((e) => `${e.code} ${e.message}`).join("; ") || response.status;
    throw new Error(`email send failed: ${detail}`);
  }

  // A 200 can still carry permanent bounces. Treat a non-empty array as a failure
  // rather than reporting success for mail that went nowhere.
  const bounces = body.result?.permanent_bounces;
  if (Array.isArray(bounces) && bounces.length) {
    throw new Error(`email bounced permanently: ${bounces.join(", ")}`);
  }
  return { ok: true };
}
