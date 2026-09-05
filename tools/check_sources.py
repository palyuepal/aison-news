#!/usr/bin/env python3
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import load_news

TIMEOUT = 12
USER_AGENT = "AIson-source-check/1.0 (+https://aison.hk/)"


def request_status(url: str):
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"}
    for method in ("HEAD", "GET"):
        req = urllib.request.Request(url, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                return response.getcode(), response.geturl(), None
        except urllib.error.HTTPError as exc:
            if method == "HEAD" and exc.code in {403, 405}:
                continue
            return exc.code, exc.geturl() or url, str(exc)
        except Exception as exc:
            if method == "HEAD":
                continue
            return None, url, str(exc)
    return None, url, "No response"


def main() -> int:
    stories = load_news()
    dates = [story.get("date") for story in stories if story.get("date")]
    if not dates:
        print("No dated stories found")
        return 1

    edition = max(dates)
    latest = [story for story in stories if story.get("date") == edition and story.get("verified")]
    print(f"Checking {len(latest)} verified source links for edition {edition}")

    hard_failures = []
    warnings = []

    for story in latest:
        story_id = story.get("id", "(missing id)")
        url = str(story.get("sourceUrl", "")).strip()
        parsed = urlparse(url)

        if parsed.scheme != "https" or not parsed.netloc:
            hard_failures.append(f"{story_id}: invalid HTTPS sourceUrl: {url!r}")
            continue

        status, final_url, error = request_status(url)
        if status is not None and 200 <= status < 400:
            print(f"OK   {story_id}: {status} {final_url}")
        elif status in {404, 410}:
            hard_failures.append(f"{story_id}: source returned HTTP {status}: {url}")
        elif status is not None and 400 <= status < 500:
            warnings.append(f"{story_id}: HTTP {status} (may be bot/auth/rate limiting): {url}")
        elif status is not None and status >= 500:
            warnings.append(f"{story_id}: server HTTP {status}: {url}")
        else:
            warnings.append(f"{story_id}: could not verify now ({error}): {url}")

    for warning in warnings:
        print(f"::warning::{warning}")

    if hard_failures:
        for failure in hard_failures:
            print(f"::error::{failure}")
        print(f"Source check failed with {len(hard_failures)} hard failure(s).")
        return 1

    print(f"Source check passed: {len(latest)} checked, {len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
