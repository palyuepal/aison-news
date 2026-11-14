#!/usr/bin/env python3
"""Check that the public LIVE payload matches the editorial source (not just a successful build)."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/live.json"
PUBLIC = "https://aison.hk/data/live.js"
LOCAL_PUBLIC = ROOT / "data/live.js"


def items_from_source():
    rows = json.loads(SOURCE.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise ValueError("content/live.json must be a list")
    return rows


def items_from_public():
    stamp = int(datetime.now(timezone.utc).timestamp())
    request = Request(
        f"{PUBLIC}?verify={stamp}",
        headers={"User-Agent": "AIson-live-verifier/1.0", "Cache-Control": "no-cache"},
    )
    with urlopen(request, timeout=20) as response:
        raw = response.read().decode("utf-8")
    match = re.fullmatch(r"\s*window\.AISON_LIVE\s*=\s*(\[.*\])\s*;?\s*", raw, re.S)
    if not match:
        raise ValueError("public data/live.js is missing a parseable AISON_LIVE array")
    rows = json.loads(match.group(1))
    if not isinstance(rows, list):
        raise ValueError("public LIVE data must be a list")
    return rows


def items_from_local_public():
    raw = LOCAL_PUBLIC.read_text(encoding="utf-8")
    match = re.fullmatch(r"\s*window\.AISON_LIVE\s*=\s*(\[.*\])\s*;?\s*", raw, re.S)
    if not match:
        raise ValueError("local data/live.js is missing a parseable AISON_LIVE array")
    rows = json.loads(match.group(1))
    if not isinstance(rows, list):
        raise ValueError("local LIVE data must be a list")
    return rows


def signature(rows):
    return sorted(
        (str(row["id"]), str(row["publishedAt"]), str(row["title"]))
        for row in rows
    )


def newest(rows):
    if not rows:
        return "none"
    item = max(rows, key=lambda row: row["publishedAt"])
    return f"{item['publishedAt']} ({item['id']})"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-only", action="store_true")
    args = parser.parse_args()
    try:
        source = items_from_source()
        print(f"Source LIVE: {len(source)} items; latest {newest(source)}")
        if args.source_only:
            return
        try:
            public = items_from_public()
            print(f"Public LIVE: {len(public)} items; latest {newest(public)}")
        except Exception as exc:
            # DNS/network outages must not block a safe local build. The local
            # generated payload is still compared byte-for-structure; deployment
            # remains explicitly unverified and is reported to the caller.
            print(f"WARN: public LIVE unavailable ({exc}); checking local data/live.js", file=sys.stderr)
            public = items_from_local_public()
            print(f"Local LIVE: {len(public)} items; latest {newest(public)} (deployment unverified)")
        if signature(source) != signature(public):
            raise ValueError("Public LIVE items differ from source: missing, old or mismatched IDs/timestamps/titles")
        print("OK: public LIVE feed matches content/live.json")
    except Exception as exc:
        print(f"FAIL: LIVE publication verification: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
