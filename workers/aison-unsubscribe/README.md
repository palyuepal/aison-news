# AIson unsubscribe worker

Keeps the Beehiiv list as the single source of truth while the Morning
Brief is sent through Resend (Route B, 2026-11-23).

## Deploy (one time, in the user's Cloudflare account)

1. Workers & Pages → Create Worker, name it `aison-unsubscribe`,
   paste `worker.js`, Deploy.
2. Worker → Settings → Variables, add secrets:
   - `BEEHIIV_API_KEY` (same key as the GitHub secret)
   - `BEEHIIV_PUBLICATION_ID`
   - `UNSUB_SECRET` (long random string; must match the GitHub secret)
   - `RESEND_WEBHOOK_SECRET` (optional; from the Resend webhook page)
3. Worker → Settings → Domains & Routes, add custom domain
   `unsub.aison.hk` (must match `UNSUBSCRIBE_BASE` used by
   `tools/send_morning_brief.py` and the GitHub workflow).
4. In Resend → Webhooks, add endpoint `https://unsub.aison.hk/webhook/resend`
   for `email.bounced` and `email.complained`, and copy its signing
   secret into `RESEND_WEBHOOK_SECRET`.

## Behaviour

- `GET /u?e=&t=` shows a confirmation page (never unsubscribes on GET,
  so mail-scanner prefetching cannot remove people).
- `POST /u` (form or one-click) verifies the HMAC token, then calls
  Beehiiv `PUT /publications/{id}/subscriptions/by_email/{email}` with
  `{"unsubscribe": true}`. A Beehiiv 404 counts as success.
- Resend bounce/complaint events unsubscribe the address in Beehiiv too.
