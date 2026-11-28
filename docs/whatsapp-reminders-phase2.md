# MIFASK Daily Reminders — WhatsApp Phase 2 setup

## Required Vercel environment variables

Set these in Vercel Project Settings → Environment Variables (Production):
- `SUPABASE_SERVICE_ROLE_KEY`: server-side Supabase service role key (never expose to browser).
- `REMINDERS_CRON_SECRET`: long random secret used to authorize the reminder sender with `Authorization: Bearer <secret>`. Configure the exact same value as a GitHub Actions repository secret named `REMINDERS_CRON_SECRET`.
- `WHATSAPP_ACCESS_TOKEN`: Meta Cloud API token with WhatsApp messaging permissions.
- `WHATSAPP_PHONE_NUMBER_ID`: sender phone-number ID.
- `WHATSAPP_APP_SECRET`: Meta app secret used to validate webhook signatures.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`: random string used for webhook verification.
- `WHATSAPP_TEMPLATE_NAME`: approved template name configured in WhatsApp Manager.
- `WHATSAPP_TEMPLATE_LANGUAGE`: template locale (default `en`).
- `WHATSAPP_GRAPH_VERSION`: Graph API version (default `v23.0`).
- `REMINDER_CARD_IMAGE_URL`: optional public image URL if template has an image header.
- `WHATSAPP_SEND_ENABLED`: keep unset or `false` until credentials, template, test recipient and content are verified. Sending is intentionally disabled by default.

Never put secrets in source control, workflow YAML, client-side variables, issue comments, or chat messages. Add GitHub's scheduler secret under Repository → Settings → Secrets and variables → Actions → New repository secret.

## Webhook

Configure Meta webhook URL:
`https://mifask-islamic-encyclopedia-liha.vercel.app/api/reminders/webhook`

Subscribe to the `messages` field. GET verification uses the configured verify token; POST validates `X-Hub-Signature-256` with the app secret. Missing app-secret configuration and invalid/missing signatures fail closed with HTTP 401; invalid GET verification returns HTTP 403.

Incoming `START` or `SUBSCRIBE` activates a pending signup; `STOP`/`UNSUBSCRIBE` unsubscribes; `PAUSE` pauses; `RESUME` reactivates. Delivery status events update delivery logs.

## Scheduler

The repository includes a GitHub Actions scheduler at `.github/workflows/daily-reminders.yml`, running every five minutes. GitHub Actions is used instead of Vercel Cron because the previous five-minute Vercel schedule was incompatible with the project's Vercel Hobby plan.

To activate the scheduler:
1. Add a strong random repository Actions secret named `REMINDERS_CRON_SECRET`.
2. Add the exact same value as the Vercel Production environment variable `REMINDERS_CRON_SECRET`.
3. Redeploy production after adding the Vercel variable.
4. Confirm scheduled workflow runs authenticate successfully. While `WHATSAPP_SEND_ENABLED` is unset or `false`, the sender returns its explicit `sending_disabled` response before querying subscribers; the workflow treats that response as a safe no-op.

The sender matches each subscriber's local preferred time within the five-minute scheduler window and records the intended local scheduled time for deduplication. This avoids requiring a Vercel Cron job.

## Current sender limitations and production gate

The sender is a technical integration scaffold. Before enabling production sending:
- Replace generic template parameters with verified daily content selection.
- Render/upload the branded reflection card if the approved template uses an image header.
- Create and approve the matching WhatsApp template.
- Verify the template parameter schema exactly matches the approved template.
- Validate webhook signature handling and delivery-status updates.
- Complete a controlled end-to-end test using a designated test recipient, not real subscribers.
- Confirm unsubscribe handling and idempotent delivery behavior.

Do not set `WHATSAPP_SEND_ENABLED=true` until every item above is verified. Keep it unset or false during deployment and scheduler verification.
