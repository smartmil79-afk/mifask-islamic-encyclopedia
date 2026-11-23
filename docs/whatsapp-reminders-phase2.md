# MIFASK Daily Reminders — WhatsApp Phase 2 setup

## Required Vercel environment variables
Set these in Vercel Project Settings → Environment Variables (Production and Preview as appropriate):
- `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase service role key (never expose to browser).
- `REMINDERS_CRON_SECRET` (or `CRON_SECRET`): long random secret used to authorize the reminder sender with `Authorization: Bearer <secret>`.
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
No Vercel Cron job is currently configured (`vercel.json` is empty). The Vercel Hobby plan does not support the previous five-minute schedule, so it was removed to unblock deployments. The sender endpoint remains protected by `REMINDERS_CRON_SECRET` or the fallback `CRON_SECRET`. An external scheduler may call `/api/reminders/send` at the desired interval using that bearer secret, or the project can be upgraded to a plan that supports the required cron frequency. Do not configure a production scheduler until sending is fully tested and remains disabled.

## Current sender limitations
The sender is a technical integration scaffold. Before enabling production sending, replace generic template parameters with verified daily content selection, render/upload the branded reflection card, create and approve the matching WhatsApp template, validate delivery and webhook status, and ensure the template parameter schema exactly matches the approved template. Do not enable sending before that end-to-end test.
