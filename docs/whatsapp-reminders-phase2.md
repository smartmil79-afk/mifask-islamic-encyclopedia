# MIFASK Daily Reminders — WhatsApp Phase 2 setup

## Required Vercel environment variables
Set these in Vercel Project Settings → Environment Variables (Production and Preview as appropriate):
- `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase service role key (never expose to browser).
- `REMINDERS_CRON_SECRET`: long random secret; Vercel Cron sends it as `Authorization: Bearer <secret>`.
- `WHATSAPP_ACCESS_TOKEN`: Meta Cloud API token with WhatsApp messaging permissions.
- `WHATSAPP_PHONE_NUMBER_ID`: sender phone-number ID.
- `WHATSAPP_APP_SECRET`: Meta app secret used to validate webhook signatures.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: random string used for webhook verification.
- `WHATSAPP_TEMPLATE_NAME`: approved template name configured in WhatsApp Manager.
- `WHATSAPP_TEMPLATE_LANGUAGE`: template locale (default `en`).
- `WHATSAPP_GRAPH_VERSION`: Graph API version (default `v23.0`).
- `REMINDER_CARD_IMAGE_URL`: optional public image URL if template has an image header.
- `WHATSAPP_SEND_ENABLED`: keep `false` until credentials, template, test recipient and content are verified. Sending is intentionally disabled by default.

## Webhook
Configure Meta webhook URL:
`https://mifask-islamic-encyclopedia-liha.vercel.app/api/reminders/webhook`
Subscribe to the `messages` field. GET verification uses the configured verify token; POST validates `X-Hub-Signature-256` with the app secret.

Incoming `START` or `SUBSCRIBE` activates a pending signup; `STOP`/ `UNSUBSCRIBE` unsubscribes; `PAUSE` pauses; `RESUME` reactivates. Delivery status events update delivery logs.

## Scheduler
Vercel Cron calls `/api/reminders/send` every five minutes. It is protected by `REMINDERS_CRON_SECRET`. It only selects active, opted-in records whose local preferred time and weekday match.

## Current sender limitations
The sender is a technical integration scaffold. Before enabling production sending, replace generic template parameters with verified daily content selection, render/upload the branded reflection card, create and approve the matching WhatsApp template, validate delivery and webhook status, and ensure the template parameter schema exactly matches the approved template. Do not enable sending before that end-to-end test.
