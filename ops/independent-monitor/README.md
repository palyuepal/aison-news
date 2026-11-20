# Independent publication watchdog

A read-only Cloudflare Worker checks the existing public AIson site and public GitHub source every five minutes, independently of GitHub Actions and the desktop editor. It does not generate news, merge PRs, deploy the news site or hold GitHub credentials.

The scheduled handler verifies the due Hong Kong edition, all four publication-receipt artifact hashes, story count/ranks/verification, editorial metadata, every source DAILY field, and the full LIVE array. It also verifies the newest active, verified LIVE item is at most 24 hours old; a matching-but-stale source is an editorial incident, **not** a reason to redeploy unchanged files or fabricate a publication timestamp. `latestLiveAt` and `liveAgeHours` are included in status for triage. The 08:00–09:15 preparation window accepts only yesterday's fully verified edition, never arbitrarily old content. Responses have a 15-second timeout and a 1MiB cap.

State is stored in a dedicated KV namespace under `status`. Two consecutive failures open an incident; an unchanged incident can send at most one reminder per six hours. A successful delivery is tracked separately; delivery failure remains visible and recovery notification failure is retried. KV is eventually consistent, so delivery deduplication is best effort, not an exactly-once guarantee.

`GET /health` only reads saved status and cannot send mail or trigger upstream requests. It returns 503 when no check exists, monitoring stopped for over twelve minutes, or the site is not verified healthy. It exposes no recipient addresses or credentials. Other paths/methods return 404.

Deployment through the connected Cloudflare API requires:

- Dedicated script `aison-publication-watchdog`, ES module `worker.mjs`, compatibility date 2026-11-20.
- `MONITOR_STATE` KV binding to a dedicated namespace.
- Cron `*/5 * * * *` in UTC; one scheduled trigger.
- Logs/traces enabled with bounded sampling; no domain route or DNS migration.
- Optional `ALERT_EMAIL` send_email binding restricted to the user's explicit address, plus runtime-only `ALERT_TO` and `ALERT_FROM` values. Never commit recipient addresses. Without these, status explicitly reports alerts not configured; deployment alone does not prove email delivery.

No paid-plan upgrade is required by this code. Approximately 288 scheduled invocations and KV writes per day, shared with existing account quotas. Actual charges depend on account plan and aggregate usage. Runtime state is operational evidence; a configured cron alone is not proof it has fired. Read back the `status` key after the first real scheduled event.

Tests: `node --test ops/independent-monitor/worker.test.mjs`. They cover midnight/deadline behavior, artifact and LIVE mismatch, network failure, stopped monitor, notification deduplication and failed recovery-mail retry. Full required repository checks remain in force.

This closes independent monitoring, not independent editorial production. Research still needs an online editor with available capacity, or a separately authorized cloud research system. GitHub's sentinel remains responsible for bounded redeployment when source is valid.
