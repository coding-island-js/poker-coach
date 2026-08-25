// POST /api/auth/magic { email } -> emails a single-use sign-in link.
import { createLoginToken, isEmail, json, siteOrigin } from "./_lib/auth.mjs";

const FROM = process.env.EMAIL_FROM_POKERCOACH ?? process.env.EMAIL_FROM;

export default async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, { status: 405 });

  let email;
  try {
    ({ email } = await request.json());
  } catch {
    return json({ error: "bad_json" }, { status: 400 });
  }
  if (!isEmail(email)) return json({ error: "bad_email" }, { status: 400 });

  const address = email.trim().toLowerCase();
  const token = await createLoginToken(address);
  const link = `${siteOrigin(request)}/api/auth/verify?token=${encodeURIComponent(token)}`;

  const key = process.env.RESEND_API_KEY;
  if (!key || !FROM) {
    // Without a sender configured the flow still works locally: the link is
    // logged rather than silently dropped, and the caller is told plainly.
    console.log(`[magic-link] ${address} -> ${link}`);
    return json({ ok: true, delivered: false, reason: "email_not_configured" });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [address],
      subject: "Your Poker Coach sign-in link",
      text: [
        "Here is your sign-in link for Poker Coach:",
        "",
        link,
        "",
        "It works once and expires in 20 minutes.",
        "If you did not ask for it, ignore this email - nothing has changed.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[magic-link] resend failed:", response.status, detail.slice(0, 300));
    return json({ ok: false, error: "send_failed" }, { status: 502 });
  }
  // Never echo the link back to the browser - that would make the mailbox
  // pointless as a proof of ownership.
  return json({ ok: true, delivered: true });
};

export const config = { path: "/api/auth/magic" };
