-- MIFASK Daily WhatsApp Reminders: subscriber consent, preferences, delivery logs
create table if not exists public.ie_reminder_subscribers (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  timezone text not null default 'Africa/Lagos',
  preferred_time time not null default '06:00',
  reminder_types text[] not null default array['quran','hadith','reflection']::text[],
  weekdays smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  consent boolean not null default false,
  consent_at timestamptz,
  consent_source text,
  status text not null default 'pending' check (status in ('pending','active','paused','unsubscribed')),
  verification_token_hash text,
  verified_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ie_reminder_phone_format check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint ie_reminder_time_types check (cardinality(reminder_types) between 1 and 3),
  constraint ie_reminder_days check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[])
);
create index if not exists ie_reminder_due_idx on public.ie_reminder_subscribers(status, preferred_time, timezone) where status = 'active';
create table if not exists public.ie_reminder_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.ie_reminder_subscribers(id) on delete set null,
  phone_e164 text,
  content_type text,
  content_reference text,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sent','delivered','failed','skipped')),
  error_message text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists ie_reminder_delivery_subscriber_idx on public.ie_reminder_delivery_logs(subscriber_id, created_at desc);
alter table public.ie_reminder_subscribers enable row level security;
alter table public.ie_reminder_delivery_logs enable row level security;
drop policy if exists "IE reminder signup public insert" on public.ie_reminder_subscribers;
create policy "IE reminder signup public insert" on public.ie_reminder_subscribers for insert to anon, authenticated with check (consent = true and status = 'pending' and consent_at is not null and phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
-- No public read, update, or delete policies: subscriber details stay private.
