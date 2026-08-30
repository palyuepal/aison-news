#!/usr/bin/env python3
"""Import one AIson daily edition, preserve the archive, then rebuild the site.

Usage: python tools/import_batch.py /path/to/edition.json
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
NEWS_PATH = ROOT / "content/news.json"
REQUIRED = {
    "id", "rank", "title", "excerpt", "summary", "category", "tags", "date",
    "readTime", "featured", "verified", "freshness", "whatHappened", "reportingContext",
    "whyImportant", "whatToWatch", "hkImpact", "take", "sourceLabel", "sourceUrl", "sourceType",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate_story(story: dict) -> None:
    missing = REQUIRED - set(story)
    unexpected = set(story) - REQUIRED
    if missing or unexpected:
        raise SystemExit(
            f"{story.get('id', '?')}: missing={sorted(missing)}, unexpected={sorted(unexpected)}"
        )
    if not isinstance(story["id"], str) or not story["id"]:
        raise SystemExit("Every story needs a non-empty string id")
    if not isinstance(story["rank"], int):
        raise SystemExit(f"{story['id']}: rank must be an integer")
    if not isinstance(story["tags"], list) or not isinstance(story["hkImpact"], list):
        raise SystemExit(f"{story['id']}: tags and hkImpact must be arrays")
    if not isinstance(story["featured"], bool) or not isinstance(story["verified"], bool):
        raise SystemExit(f"{story['id']}: featured and verified must be booleans")
    source = urlsplit(story["sourceUrl"])
    if source.scheme != "https" or not source.netloc:
        raise SystemExit(f"{story['id']}: sourceUrl must be a valid https URL")
    if story["sourceType"] not in {"官方來源", "可靠媒體"}:
        raise SystemExit(f"{story['id']}: invalid sourceType")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python tools/import_batch.py /path/to/edition.json")

    batch_path = Path(sys.argv[1])
    news = read_json(NEWS_PATH)
    batch = read_json(batch_path)
    if not isinstance(batch, list) or len(batch) != 10:
        raise SystemExit("Daily edition must be a JSON array with exactly 10 stories")

    for story in batch:
        if not isinstance(story, dict):
            raise SystemExit("Every story must be a JSON object")
        validate_story(story)

    edition_dates = {story["date"] for story in batch}
    if len(edition_dates) != 1:
        raise SystemExit("A daily edition must use exactly one date")
    edition_date = edition_dates.pop()
    if sorted(story["rank"] for story in batch) != list(range(1, 11)):
        raise SystemExit("Daily edition ranks must be exactly 1 through 10")
    ids = [story["id"] for story in batch]
    if len(ids) != len(set(ids)):
        raise SystemExit("Daily edition contains duplicate ids")

    # A re-import replaces the same edition; every other historical story remains.
    old = [story for story in news if story.get("date") != edition_date and story.get("id") not in ids]
    old.sort(
        key=lambda story: (story.get("date", ""), -int(story.get("rank", 999))),
        reverse=True,
    )
    for rank, story in enumerate(old, start=11):
        story["rank"] = rank

    latest = []
    for rank, story in enumerate(sorted(batch, key=lambda item: item["rank"]), start=1):
        row = dict(story)
        row["rank"] = rank
        row["featured"] = rank <= 3
        latest.append(row)

    merged = latest + old
    NEWS_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    subprocess.check_call([sys.executable, str(ROOT / "tools/build.py")])
    print(f"Imported {edition_date}: 10 new stories; archive total {len(merged)}")


if __name__ == "__main__":
    main()
