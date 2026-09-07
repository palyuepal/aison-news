#!/usr/bin/env python3
from pathlib import Path
import html
import json
from datetime import datetime, timezone
from email.utils import format_datetime
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
DAILY_DIR = ROOT / "content" / "daily"
SITE = ROOT / "content" / "site.json"
OUT = ROOT / "newsletter.xml"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def cdata(value):
    return str(value).replace("]]>", "]]]]><![CDATA[>")


def latest_editions(limit=30):
    files = sorted(DAILY_DIR.glob("*.json"), key=lambda p: p.stem, reverse=True)
    editions = []
    for path in files[:limit]:
        try:
            datetime.strptime(path.stem, "%Y-%m-%d")
        except ValueError as exc:
            raise SystemExit(f"invalid daily edition filename: {path.name}") from exc

        stories = read_json(path)
        if not isinstance(stories, list) or len(stories) != 10:
            raise SystemExit(f"{path}: newsletter feed requires exactly 10 stories")

        try:
            stories = sorted(stories, key=lambda story: int(story["rank"]))
        except Exception as exc:
            raise SystemExit(f"{path}: every story needs an integer rank") from exc

        ranks = [int(story["rank"]) for story in stories]
        if ranks != list(range(1, 11)):
            raise SystemExit(f"{path}: ranks must be exactly 1..10")

        for story in stories:
            if str(story.get("date", "")) != path.stem:
                raise SystemExit(f"{path}: story date must match edition date")
            if not story.get("id") or not story.get("title") or not story.get("excerpt"):
                raise SystemExit(f"{path}: story missing id/title/excerpt")

        editions.append((path.stem, stories))
    return editions


def digest_html(date, stories, base):
    parts = [
        f"<p><strong>AIson｜今日 AI 10 件事</strong>｜{html.escape(date)}</p>",
        "<p>每日幫香港人篩選全球最值得知道嘅 AI 大事，重點講清楚發生咩事、點解重要，同香港人／做生意／創作者有咩關係。</p>",
    ]
    for story in stories:
        title = html.escape(str(story["title"]))
        excerpt = html.escape(str(story["excerpt"]))
        url = html.escape(urljoin(base, f"news/{story['id']}.html"), quote=True)
        parts.append(f'<h2>{int(story["rank"])}. <a href="{url}">{title}</a></h2>')
        parts.append(f"<p>{excerpt}</p>")

        impacts = story.get("hkImpact") or []
        if impacts:
            parts.append(
                f"<p><strong>🇭🇰 同香港有咩關係：</strong>{html.escape(str(impacts[0]))}</p>"
            )
        take = story.get("take")
        if take:
            parts.append(
                f"<p><strong>AIson Take：</strong>{html.escape(str(take))}</p>"
            )

    parts.append(
        f'<p><a href="{html.escape(urljoin(base, "daily.html"), quote=True)}">睇完整今日 AI 10 件事 →</a></p>'
    )
    return "".join(parts)


def build():
    site = read_json(SITE)
    base = str(site.get("baseUrl", "https://aison.hk/")).strip()
    if not base.endswith("/"):
        base += "/"

    editions = latest_editions()
    if not editions:
        raise SystemExit("no daily editions found for newsletter feed")

    items = []
    for date, stories in editions:
        dt = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        digest = digest_html(date, stories, base)
        first = stories[0]
        preview = html.escape(
            f"{first['title']}；另外仲有 9 件今日值得香港人知道嘅 AI 大事。"
        )
        items.append(
            "<item>"
            f"<title>AIson｜今日 AI 10 件事｜{html.escape(date)}</title>"
            f"<link>{html.escape(urljoin(base, 'daily.html'))}</link>"
            f"<guid isPermaLink=\"false\">aison-daily-{html.escape(date)}</guid>"
            f"<pubDate>{format_datetime(dt)}</pubDate>"
            f"<description>{preview}</description>"
            f"<content:encoded><![CDATA[{cdata(digest)}]]></content:encoded>"
            "</item>"
        )

    self_url = urljoin(base, "newsletter.xml")
    channel_link = urljoin(base, "daily.html")
    title = html.escape(str(site.get("name", "AIson")))
    description = html.escape(
        "AIson 每日 AI 10 件事 Email 專用 feed：香港視點、重點摘要與 AIson Take。"
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0" '
        'xmlns:content="http://purl.org/rss/1.0/modules/content/" '
        'xmlns:atom="http://www.w3.org/2005/Atom">'
        "<channel>"
        f"<title>{title}｜每日 AI 10 件事 Newsletter</title>"
        f"<link>{html.escape(channel_link)}</link>"
        f"<description>{description}</description>"
        "<language>zh-HK</language>"
        f'<atom:link href="{html.escape(self_url, quote=True)}" rel="self" type="application/rss+xml"/>'
        "<ttl>60</ttl>"
        f"{''.join(items)}"
        "</channel></rss>\n"
    )
    OUT.write_text(xml, encoding="utf-8")
    print(f"Built newsletter feed: {len(editions)} editions / latest {editions[0][0]}")


if __name__ == "__main__":
    build()
