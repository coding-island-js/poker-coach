// POST /api/sync { attempts: [...] }
//
// Uploads locally-recorded attempts. Idempotent on (user_id, client_id), so the
// browser can keep its copy and re-send freely - including the whole backlog the
// first time someone signs in after training anonymously.
import { currentUser, json } from "./_lib/auth.mjs";
import { sql } from "./_lib/db.mjs";

const MAX_BATCH = 500;
const CONFIDENCE = new Set(["guessing", "fairly", "very"]);

const clean = (value, max = 64) =>
  typeof value === "string" && value.length <= max ? value : null;

export default async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, { status: 405 });

  const user = await currentUser(request);
  if (!user) return json({ error: "not_signed_in" }, { status: 401 });

  let attempts;
  try {
    ({ attempts } = await request.json());
  } catch {
    return json({ error: "bad_json" }, { status: 400 });
  }
  if (!Array.isArray(attempts)) return json({ error: "bad_payload" }, { status: 400 });
  if (attempts.length > MAX_BATCH) return json({ error: "batch_too_large", max: MAX_BATCH }, { status: 413 });

  let written = 0;
  let skipped = 0;
  for (const attempt of attempts) {
    const handId = clean(attempt?.handId);
    const leak = clean(attempt?.leak);
    const at = Number(attempt?.at);
    // client_id is what makes the upload idempotent; without a stable one the
    // row would duplicate on every re-send, so those are dropped rather than
    // guessed at.
    const clientId = clean(attempt?.id) ?? (handId && Number.isFinite(at) ? `${handId}-${at}` : null);
    if (!handId || !leak || !clientId || !Number.isFinite(at)) { skipped += 1; continue; }

    const confidence = CONFIDENCE.has(attempt?.confidence) ? attempt.confidence : null;
    const result = await sql`
      insert into attempts
        (user_id, client_id, hand_id, leak, read_choice, read_ok, action_choice, action_ok, confidence, answered_at)
      values (
        ${user.id}::uuid, ${clientId}, ${handId}, ${leak},
        ${clean(attempt?.read)}, ${Boolean(attempt?.readOk)},
        ${clean(attempt?.action)}, ${Boolean(attempt?.actionOk)},
        ${confidence}, to_timestamp(${at} / 1000.0)
      )
      on conflict (user_id, client_id) do nothing
      returning id
    `;
    if (result.length) written += 1; else skipped += 1;
  }

  const totals = await sql`
    select count(*)::int as attempts, count(distinct hand_id)::int as hands
    from attempts where user_id = ${user.id}::uuid
  `;
  return json({ ok: true, written, skipped, totals: totals[0] });
};

export const config = { path: "/api/sync" };
