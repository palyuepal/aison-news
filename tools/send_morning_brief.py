#!/usr/bin/env python3
"""AIson Morning Brief — daily auto-send (Route B, 2026-11-23).

Beehiiv (free plan) stays the signup form + subscriber list. This script
runs after the daily edition is deployed: it pulls the active subscriber
list from the Beehiiv API, composes the Morning Brief from the edition
JSON, and sends it through Resend. Unsubscribe links point at the
aison-unsubscribe Cloudflare Worker, which writes unsubscribes back to
Beehiiv, so the Beehiiv list remains the single source of truth.

Required env (GitHub secrets in production):
  BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID, RESEND_API_KEY, UNSUB_SECRET
Optional env:
  BRIEF_FROM          default "AIson Morning Brief <brief@send.aison.hk>"
  UNSUBSCRIBE_BASE    default "https://unsub.aison.hk"
  BRIEF_SITE          default "https://aison.hk"

Safety behaviour:
  - Missing config -> prints "not configured" and exits 0 (never breaks CI).
  - Edition older than yesterday (Asia/Hong_Kong) -> skips unless --force.
  - A per-date marker in the Actions cache prevents double sends.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import html
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAILY_DIR = ROOT / "content" / "daily"
HKT = timezone(timedelta(hours=8))
SITE = os.environ.get("BRIEF_SITE", "https://aison.hk").rstrip("/")
UNSUB_BASE = os.environ.get("UNSUBSCRIBE_BASE", "https://unsub.aison.hk").rstrip("/")
FROM = os.environ.get("BRIEF_FROM", "AIson Morning Brief <brief@send.aison.hk>")


def http_json(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_subscribers(api_key: str, publication_id: str) -> list[str]:
    emails: list[str] = []
    cursor = ""
    while True:
        url = (
            f"https://api.beehiiv.com/v2/publications/{publication_id}"
            f"/subscriptions?status=active&limit=100"
        )
        if cursor:
            url += f"&cursor={cursor}"
        page = http_json("GET", url, api_key)
        for sub in page.get("data", []):
            email = str(sub.get("email") or "").strip()
            if email:
                emails.append(email)
        cursor = str(page.get("next_cursor") or page.get("cursor") or "")
        if not page.get("has_more") or not cursor:
            break
    return emails


def unsub_url(email: str, secret: str) -> str:
    token = hmac.new(
        secret.encode("utf-8"), email.lower().encode("utf-8"), hashlib.sha256
    ).hexdigest()
    from urllib.parse import quote

    return f"{UNSUB_BASE}/u?e={quote(email)}&t={token}"


def load_edition(date: str | None) -> tuple[str, list[dict]]:
    if date:
        path = DAILY_DIR / f"{date}.json"
    else:
        path = sorted(DAILY_DIR.glob("*.json"))[-1]
        date = path.stem
    stories = json.loads(path.read_text(encoding="utf-8"))
    stories = sorted(stories, key=lambda s: int(s.get("rank", 99)))
    return date, stories


def article_url(story: dict) -> str:
    return f"{SITE}/news/{story.get('id')}.html"


def compose(date: str, stories: list[dict], email: str, secret: str) -> tuple[str, str, str]:
    lead = stories[0]
    pretty_date = datetime.strptime(date, "%Y-%m-%d").strftime("%Y年%m月%d日")
    subject = f"AIson Morning Brief｜{pretty_date}：{lead.get('title', '')}"
    unsub = unsub_url(email, secret)

    rows = []
    for s in stories:
        rows.append(
            f"""<tr><td style="padding:14px 0;border-bottom:1px solid #e7ecf3">
<span style="display:inline-block;background:#081426;color:#f2a900;font-weight:900;border-radius:999px;padding:2px 10px;font-size:12px">#{s.get('rank')} · 評分 {s.get('aisonScore', '')}</span>
<div style="margin-top:7px;font-size:17px;line-height:1.45;font-weight:800;color:#0b2345"><a href="{article_url(s)}" style="color:#0b2345;text-decoration:none">{html.escape(str(s.get('title', '')))}</a></div>
<div style="margin-top:4px;font-size:14px;line-height:1.6;color:#42506a">{html.escape(str(s.get('excerpt', '')))}</div>
<div style="margin-top:5px;font-size:12px;color:#8494ad">{html.escape(str(s.get('category', '')))} · {html.escape(str(s.get('sourceLabel', '')))}</div>
</td></tr>"""
        )
    html_body = f"""<!DOCTYPE html><html lang="zh-Hant"><body style="margin:0;background:#f4f1ea;padding:24px 12px;font-family:-apple-system,'PingFang HK','Microsoft JhengHei',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e8ef">
<tr><td style="background:#081426;padding:26px 30px">
<div style="color:#f2a900;font-size:12px;font-weight:900;letter-spacing:.14em">AISON MORNING BRIEF</div>
<div style="color:#ffffff;font-size:24px;font-weight:900;margin-top:6px">{pretty_date} · 今日十大 AI 新聞</div>
<div style="color:#b9cce6;font-size:13px;margin-top:5px">頭條：{html.escape(str(lead.get('title', '')))}</div>
</td></tr>
<tr><td style="padding:8px 30px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{''.join(rows)}</table></td></tr>
<tr><td style="padding:18px 30px 26px">
<a href="{SITE}/daily.html" style="display:inline-block;background:#f2a900;color:#081426;font-weight:900;padding:11px 20px;border-radius:999px;text-decoration:none;font-size:14px">睇今日完整排行榜 →</a>
<div style="margin-top:18px;font-size:12px;line-height:1.7;color:#8494ad">你收到呢封信，係因為你喺 aison.hk 訂閱咗 Morning Brief。<br><a href="{unsub}" style="color:#8494ad">一鍵退訂</a> · <a href="{SITE}" style="color:#8494ad">aison.hk</a></div>
</td></tr></table></td></tr></table></body></html>"""

    lines = [f"AIson Morning Brief｜{pretty_date}", ""]
    for s in stories:
        lines.append(f"#{s.get('rank')}（評分 {s.get('aisonScore', '')}）{s.get('title', '')}")
        lines.append(str(s.get("excerpt", "")))
        lines.append(article_url(s))
        lines.append("")
    lines.append(f"完整排行榜：{SITE}/daily.html")
    lines.append(f"退訂：{unsub}")
    return subject, html_body, "\n".join(lines)


def send_one(api_key: str, to: str, subject: str, html_body: str, text_body: str, unsub: str) -> None:
    payload = {
        "from": FROM,
        "to": [to],
        "subject": subject,
        "html": html_body,
        "text": text_body,
        "headers": {
            "List-Unsubscribe": f"<{unsub}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    }
    http_json("POST", "https://api.resend.com/emails", api_key, payload)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", help="edition date YYYY-MM-DD (default: latest)")
    ap.add_argument("--to", help="test recipient; skips the Beehiiv list fetch")
    ap.add_argument("--dry-run", action="store_true", help="compose only; write preview files, send nothing")
    ap.add_argument("--preview-dir", default="/tmp/brief-preview")
    ap.add_argument("--force", action="store_true", help="ignore the edition-freshness guard")
    args = ap.parse_args()

    beehiiv_key = os.environ.get("BEEHIIV_API_KEY", "")
    publication = os.environ.get("BEEHIIV_PUBLICATION_ID", "")
    resend_key = os.environ.get("RESEND_API_KEY", "")
    secret = os.environ.get("UNSUB_SECRET", "")
    if not args.dry_run and not (beehiiv_key and publication and resend_key and secret):
        print("[brief] not configured (missing API keys) — skipping send")
        return 0
    if args.dry_run and not secret:
        secret = "preview-secret"

    date, stories = load_edition(args.date)
    edition_day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=HKT)
    if not args.force and not args.dry_run:
        if (datetime.now(HKT).date() - edition_day.date()).days > 1:
            print(f"[brief] edition {date} is stale — skipping (use --force to override)")
            return 0

    if args.to:
        recipients = [args.to]
    elif args.dry_run:
        recipients = ["preview@example.com"]
    else:
        recipients = fetch_subscribers(beehiiv_key, publication)
    print(f"[brief] edition {date}: {len(stories)} stories, {len(recipients)} recipient(s)")
    if len(recipients) > 100:
        print("[brief] WARNING: over 100 recipients — Resend free plan caps at 100/day")

    if args.dry_run:
        out = Path(args.preview_dir)
        out.mkdir(parents=True, exist_ok=True)
        subject, html_body, text_body = compose(date, stories, recipients[0], secret)
        (out / "brief.html").write_text(html_body, encoding="utf-8")
        (out / "brief.txt").write_text(text_body, encoding="utf-8")
        print(f"[brief] dry run — subject: {subject}")
        print(f"[brief] preview written to {out}")
        return 0

    sent, failed = 0, 0
    for email in recipients:
        subject, html_body, text_body = compose(date, stories, email, secret)
        try:
            send_one(resend_key, email, subject, html_body, text_body, unsub_url(email, secret))
            sent += 1
        except urllib.error.URLError as exc:
            failed += 1
            print(f"[brief] send failed for {email}: {exc}")
        time.sleep(0.15)
    print(f"[brief] done: {sent} sent, {failed} failed")
    if failed == 0 and sent > 0:
        # The workflow caches this marker per edition so a re-deploy of
        # the same edition never sends twice.
        (ROOT / ".brief-sent").write_text(date + "\n", encoding="utf-8")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
