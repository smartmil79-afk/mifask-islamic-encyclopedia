-- Add idempotency key for scheduled daily sends.
alter table public.ie_reminder_delivery_logs add column if not exists scheduled_for_local text;
create unique index if not exists ie_reminder_delivery_once_idx on public.ie_reminder_delivery_logs(subscriber_id, scheduled_for_local) where subscriber_id is not null and scheduled_for_local is not null;
