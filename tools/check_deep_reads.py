#!/usr/bin/env python3
"""Validate AIson Featured 3 / Deep Read quality against the live UI rules."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAILY_DIR = ROOT / "content" / "daily"
EDITORIAL_DIR = ROOT / "content" / "editorial"

THRESHOLDS = {
    "whatHappened": 300,
    "reportingContext": 400,
    "deepDive": 900,
    "whyImportant": 250,
    "whatToWatch": 180,
    "total": 2800,
    "hkImpact": 3,
}
TEXT_FIELDS = (
    "summary",
    "whatHappened",
    "reportingContext",
    "deepDive",
    "whyImportant",
    "whatToWatch",
    "take",
)


def text_len(value: object) -> int:
    return len(re.sub(r"\s+", "", str(value or "")))


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def latest_edition() -> str:
    files = sorted(DAILY_DIR.glob("20??-??-??.json"), key=lambda path: path.stem)
    if not files:
        raise SystemExit("No daily edition found")
    return files[-1].stem


def read_minutes(value: object) -> int | None:
    match = re.search(r"(\d+)\s*分鐘", str(value or ""))
    return int(match.group(1)) if match else None


def metrics(story: dict) -> dict[str, int]:
    impacts = story.get("hkImpact") if isinstance(story.get("hkImpact"), list) else []
    total = sum(text_len(story.get(field)) for field in TEXT_FIELDS)
    total += sum(text_len(item) for item in impacts)
    return {
        "whatHappened": text_len(story.get("whatHappened")),
        "reportingContext": text_len(story.get("reportingContext")),
        "deepDive": text_len(story.get("deepDive")),
        "whyImportant": text_len(story.get("whyImportant")),
        "whatToWatch": text_len(story.get("whatToWatch")),
        "total": total,
        "hkImpact": len(impacts),
    }


def deep_read_ready(story: dict) -> tuple[bool, dict[str, int]]:
    values = metrics(story)
    ready = bool(story.get("verified") and story.get("sourceUrl"))
    ready = ready and values["hkImpact"] >= THRESHOLDS["hkImpact"]
    ready = ready and all(
        values[field] >= THRESHOLDS[field]
        for field in ("whatHappened", "reportingContext", "deepDive", "whyImportant", "whatToWatch", "total")
    )
    return ready, values


def validate_reference_list(story: dict, errors: list[str]) -> None:
    refs = story.get("references")
    if refs is None:
        return
    if not isinstance(refs, list):
        errors.append(f"{story.get('id')}: references must be a list")
        return
    for index, item in enumerate(refs, 1):
        if not isinstance(item, dict) or not str(item.get("label", "")).strip():
            errors.append(f"{story.get('id')}: reference {index} is missing label")
            continue
        url = str(item.get("url", "")).strip()
        if not url.startswith("https://"):
            errors.append(f"{story.get('id')}: reference {index} must use an https URL")


def main() -> int:
    edition = latest_edition()
    daily_path = DAILY_DIR / f"{edition}.json"
    editorial_path = EDITORIAL_DIR / f"{edition}.json"
    if not editorial_path.exists():
        print(f"ERROR: missing editorial sidecar for {edition}", file=sys.stderr)
        return 1

    stories = load_json(daily_path)
    editorial = load_json(editorial_path)
    if not isinstance(stories, list) or len(stories) != 10:
        print(f"ERROR: {daily_path} must contain exactly 10 stories", file=sys.stderr)
        return 1

    by_id = {story.get("id"): story for story in stories if isinstance(story, dict)}
    top3_ids = editorial.get("top3Ids")
    errors: list[str] = []
    if not isinstance(top3_ids, list) or len(top3_ids) != 3 or len(set(top3_ids)) != 3:
        errors.append("editorial top3Ids must contain exactly 3 unique IDs")
        top3_ids = top3_ids if isinstance(top3_ids, list) else []

    ready_count = 0
    print(f"AIson Deep Read quality check: {edition}")
    for position, story_id in enumerate(top3_ids[:3], 1):
        story = by_id.get(story_id)
        if not story:
            errors.append(f"Featured {position}: missing story {story_id}")
            continue
        if story.get("featured") is not True:
            errors.append(f"{story_id}: Featured 3 story must set featured=true")
        validate_reference_list(story, errors)
        ready, values = deep_read_ready(story)
        minutes = read_minutes(story.get("readTime"))
        if ready:
            ready_count += 1
        if minutes is None:
            errors.append(f"{story_id}: readTime must contain a numeric minute estimate")
        elif minutes >= 8 and not ready:
            errors.append(
                f"{story_id}: claims {minutes} min but does not meet Deep Read thresholds "
                f"(what={values['whatHappened']}, context={values['reportingContext']}, "
                f"deep={values['deepDive']}, why={values['whyImportant']}, watch={values['whatToWatch']}, "
                f"hk={values['hkImpact']}, total={values['total']})"
            )
        elif ready and minutes < 8:
            errors.append(f"{story_id}: meets Deep Read thresholds but readTime is only {minutes} min")
        print(
            f"  Featured {position}: {'DEEP READ' if ready else 'FULL REPORT'} | "
            f"readTime={story.get('readTime')} | total={values['total']} | "
            f"what={values['whatHappened']} context={values['reportingContext']} "
            f"deep={values['deepDive']} why={values['whyImportant']} watch={values['whatToWatch']} "
            f"hk={values['hkImpact']}"
        )

    print(f"  Deep Reads ready: {ready_count}/3 (editorial target is 2–3 when evidence supports it; not a hard quota)")
    if errors:
        print("Deep Read quality gate failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Deep Read quality gate passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
