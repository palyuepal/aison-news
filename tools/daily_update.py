#!/usr/bin/env python3
"""AIson V4 daily newsroom updater.

- Uses OpenAI Responses API + hosted web_search.
- Produces exactly 10 Hong Kong Traditional Chinese AI news stories.
- Preserves historical stories in content/news.json.
- Re-runs safely on the same Hong Kong calendar date.
- New edition occupies global ranks 1-10 so the existing V3 frontend shows
  the newest edition first without a frontend rewrite.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo
import json
import os
import re

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
NEWS_PATH = ROOT / "content/news.json"
HK = ZoneInfo("Asia/Hong_Kong")
MODEL = os.getenv("AISON_MODEL", "gpt-5.6-terra")

SCHEMA = {
    "type": "object",
    "properties": {
        "stories": {
            "type": "array",
            "minItems": 10,
            "maxItems": 10,
            "items": {
                "type": "object",
                "properties": {
                    "slug": {"type": "string", "minLength": 3},
                    "title": {"type": "string", "minLength": 8},
                    "excerpt": {"type": "string", "minLength": 20},
                    "summary": {"type": "string", "minLength": 20},
                    "category": {"type": "string", "minLength": 2},
                    "tags": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 5,
                        "items": {"type": "string"},
                    },
                    "readTime": {"type": "string"},
                    "freshness": {"type": "string"},
                    "whatHappened": {"type": "string", "minLength": 40},
                    "whyImportant": {"type": "string", "minLength": 40},
                    "hkImpact": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 4,
                        "items": {"type": "string", "minLength": 10},
                    },
                    "take": {"type": "string", "minLength": 20},
                    "sourceLabel": {"type": "string", "minLength": 2},
                    "sourceUrl": {"type": "string", "pattern": "^https://"},
                    "sourceType": {
                        "type": "string",
                        "enum": ["官方來源", "可靠媒體"],
                    },
                },
                "required": [
                    "slug", "title", "excerpt", "summary", "category", "tags",
                    "readTime", "freshness", "whatHappened", "whyImportant",
                    "hkImpact", "take", "sourceLabel", "sourceUrl", "sourceType",
                ],
                "additionalProperties": False,
            },
        }
    },
    "required": ["stories"],
    "additionalProperties": False,
}


def load_existing():
    if not NEWS_PATH.exists():
        return []
    return json.loads(NEWS_PATH.read_text(encoding="utf-8"))


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"https?://", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:72] or "ai-news"


def source_key(url: str):
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").lower().removeprefix("www.")
        path = re.sub(r"/+$", "", parsed.path or "/")
        return host, path
    except Exception:
        return "", ""


def source_matches(candidate: str, consulted_urls: set[str]) -> bool:
    candidate_key = source_key(candidate)
    if not candidate_key[0]:
        return False
    return any(candidate_key == source_key(url) for url in consulted_urls)


def extract_consulted_urls(response) -> set[str]:
    data = response.model_dump()
    urls = set()
    for item in data.get("output", []):
        if item.get("type") != "web_search_call":
            continue
        action = item.get("action") or {}
        for source in action.get("sources") or []:
            url = source.get("url")
            if isinstance(url, str) and url.startswith("https://"):
                urls.add(url)
    return urls


def recent_story_context(existing, today: str) -> str:
    rows = []
    # Keep the prompt compact while still preventing obvious repeats.
    for story in sorted(
        existing,
        key=lambda item: (item.get("date", ""), -(item.get("rank", 999))),
        reverse=True,
    )[:80]:
        rows.append(
            {
                "title": story.get("title", ""),
                "sourceUrl": story.get("sourceUrl", ""),
                "date": story.get("date", ""),
            }
        )
    return json.dumps(rows, ensure_ascii=False)


def build_prompt(today: str, existing) -> str:
    return f"""
你係 AIson 香港 AI 新聞台嘅資深新聞編輯。今日香港日期係 {today}。

請使用 web search 即時搜尋及核實全球 AI / 科技新聞，產出「今日 AI 10 件事」。

編採規則：
1. 優先過去 24 小時；不足 10 件先擴展至 72 小時內仍然重要的更新。
2. 優先：OpenAI、Google、Anthropic、Microsoft、Meta、Apple、NVIDIA、
   AI models、AI Agents、AI video、晶片/算力、重大政策/安全、香港有實際影響的 AI 商業資訊。
3. 官方公司 newsroom / blog / docs / earnings / regulator 原文優先。
   只有官方原文不足時先用 Reuters、Bloomberg、AP、FT、WSJ、The Verge 等可靠媒體。
4. 不要傳聞、未證實 leak、純 PR 小更新、娛樂八卦、重複新聞。
5. sourceUrl 必須係你今次 web search 真正查閱過、可以支援該新聞核心事實的網址。
   不准自己猜 URL。
6. 不要抄原文長句；全部用香港繁體中文 / 廣東話自然改寫。
7. 每篇必須包括「同香港人／香港生意／創作者有咩關係」及 AIson Take。
8. 內容要客觀，AIson Take 可以有判斷，但唔好作投資承諾。
9. 10 件之間不可係同一件事拆成多篇。
10. slug 用短英文小寫連字號，避免日期，因為系統會自動加日期確保唯一。

以下係網站最近已有內容。除非今日有明確重大新進展，否則避免重複：
{recent_story_context(existing, today)}

請只按指定 JSON schema 輸出 exactly 10 stories，並按重要性排序。
freshness 用「24h」「48h」「72h」其中之一。
readTime 可用「3 分鐘」「4 分鐘」「5 分鐘」。
"""


def main():
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is missing")

    now = datetime.now(HK)
    today = now.strftime("%Y-%m-%d")
    existing = load_existing()

    client = OpenAI()
    response = client.responses.create(
        model=MODEL,
        reasoning={"effort": "medium"},
        tools=[{"type": "web_search"}],
        tool_choice="auto",
        include=["web_search_call.action.sources"],
        input=build_prompt(today, existing),
        text={
            "format": {
                "type": "json_schema",
                "name": "aison_daily_ai_10",
                "strict": True,
                "schema": SCHEMA,
            },
            "verbosity": "medium",
        },
    )

    result = json.loads(response.output_text)
    stories = result.get("stories", [])
    if len(stories) != 10:
        raise SystemExit(f"Expected 10 stories, got {len(stories)}")

    consulted = extract_consulted_urls(response)
    if not consulted:
        raise SystemExit("No web search sources were returned; refusing to publish.")

    # Remove the same-day edition so workflow_dispatch and retries are idempotent.
    old = [story for story in existing if story.get("date") != today]

    # Re-number historical content after the newest 10.
    old.sort(
        key=lambda item: (
            item.get("date", ""),
            -(item.get("editionRank", item.get("rank", 999)) or 999),
        ),
        reverse=True,
    )
    for index, story in enumerate(old, start=11):
        story["rank"] = index

    used_ids = {str(story.get("id", "")) for story in old}
    used_sources = {source_key(str(story.get("sourceUrl", ""))) for story in old}
    new_rows = []

    for edition_rank, story in enumerate(stories, start=1):
        source_url = story["sourceUrl"].strip()
        if not source_matches(source_url, consulted):
            raise SystemExit(
                f"Story {edition_rank} source was not found in consulted web-search sources: {source_url}"
            )

        source = source_key(source_url)
        if source in used_sources:
            raise SystemExit(f"Duplicate source already exists in archive: {source_url}")

        base_slug = slugify(story["slug"])
        story_id = f"{today}-{base_slug}"
        suffix = 2
        while story_id in used_ids:
            story_id = f"{today}-{base_slug}-{suffix}"
            suffix += 1

        row = {
            "id": story_id,
            "rank": edition_rank,
            "editionRank": edition_rank,
            "title": story["title"].strip(),
            "excerpt": story["excerpt"].strip(),
            "summary": story["summary"].strip(),
            "category": story["category"].strip(),
            "tags": [tag.strip() for tag in story["tags"] if tag.strip()],
            "date": today,
            "readTime": story["readTime"].strip(),
            "featured": edition_rank <= 3,
            "verified": True,
            "freshness": story["freshness"].strip(),
            "whatHappened": story["whatHappened"].strip(),
            "whyImportant": story["whyImportant"].strip(),
            "hkImpact": [item.strip() for item in story["hkImpact"] if item.strip()],
            "take": story["take"].strip(),
            "sourceLabel": story["sourceLabel"].strip(),
            "sourceUrl": source_url,
            "sourceType": story["sourceType"].strip(),
            "generatedBy": MODEL,
            "editionDate": today,
        }
        new_rows.append(row)
        used_ids.add(story_id)
        used_sources.add(source)

    final = new_rows + old
    NEWS_PATH.write_text(
        json.dumps(final, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"AIson daily edition written: {today} / 10 stories / archive {len(final)} stories")


if __name__ == "__main__":
    main()
