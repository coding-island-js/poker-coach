-- Poker Coach schema. Idempotent: safe to run on every deploy.
--
-- Shape follows what the app already records in localStorage, so migrating a
-- browser profile up to an account is a straight insert rather than a remap.

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text,
  google_sub    text unique,              -- Google's stable subject id, null for magic-link-only
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- Magic-link tokens. Single-use, short-lived, and stored hashed so a database
-- leak cannot be replayed as a login.
create table if not exists login_tokens (
  token_hash  text primary key,
  email       text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists login_tokens_email_idx on login_tokens (email);
create index if not exists login_tokens_expires_idx on login_tokens (expires_at);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- One row per answered hand. `client_id` is the app's own attempt id, which
-- makes the sync idempotent: replaying an upload cannot double-count.
create table if not exists attempts (
  id           bigserial primary key,
  user_id      uuid not null references users (id) on delete cascade,
  client_id    text not null,
  hand_id      text not null,
  leak         text not null,
  read_choice  text,
  read_ok      boolean not null,
  action_choice text,
  action_ok    boolean not null,
  confidence   text check (confidence in ('guessing', 'fairly', 'very')),
  answered_at  timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists attempts_user_idx on attempts (user_id, answered_at desc);
create index if not exists attempts_leak_idx on attempts (user_id, leak);

-- The two questions the profile screen asks of this data, as a view so the
-- app never hand-rolls the aggregation twice.
create or replace view leak_profile as
select
  user_id,
  leak,
  count(*)::int                                            as attempts,
  count(*) filter (where read_ok and action_ok)::int       as clean,
  count(*) filter (where not read_ok)::int                 as read_missed,
  count(*) filter (where read_ok and not action_ok)::int   as action_missed
from attempts
group by user_id, leak;

-- Calibration: what "very sure" is actually worth to this learner.
create or replace view calibration as
select
  user_id,
  confidence,
  count(*)::int                                      as answered,
  count(*) filter (where read_ok and action_ok)::int as correct
from attempts
where confidence is not null
group by user_id, confidence;

-- What a person has bought. One row per user, absent means free.
--
-- Deliberately its own table rather than a column on `users`: a purchase has a
-- source (stripe, or granted by hand) and a time, and when Stripe lands it will
-- want the payment id alongside. Keeping it separate means that is an insert
-- rather than a migration.
create table if not exists entitlements (
  user_id     uuid primary key references users (id) on delete cascade,
  plan        text not null default 'full',
  source      text not null default 'granted',   -- 'stripe' | 'granted'
  reference   text,                              -- Stripe payment id, once there is one
  granted_at  timestamptz not null default now()
);

-- The owner's own account, so the app can be tested against the full set
-- whatever the paywall flag says. Idempotent, and harmless if the account does
-- not exist yet - it becomes a no-op until that email signs in for the first
-- time, and can be re-run afterwards.
insert into entitlements (user_id, plan, source, reference)
select id, 'full', 'granted', 'owner'
from users where lower(email) = 'rajanlakhani@gmail.com'
on conflict (user_id) do nothing;
