#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Best-effort resolver for official AIson news visuals.

For recent stories that do not already define `visual`, this script:
1. looks only at allow-listed official publisher/company pages from sourceUrl/references,
2. reads the page's Open Graph/Twitter image metadata,
3. downloads and normalizes the image to a local WebP asset,
4. writes a deployment-time `visual` object back into the source JSON.

Network/image failures are intentionally non-fatal per story: AIson's existing branded
social-card fallback remains in place, so a missing official image can never block news
publication.
"""
from __future__ import annotations

from dataclasses import dataclass
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
import argparse
import ipaddress
import json
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DAILY_DIR = ROOT / "content" / "daily"
LEGACY_NEWS = ROOT / "content" / "news.json"
AUTO_DIR = ROOT / "assets" / "editorial" / "auto"
REPORT_PATH = ROOT / "data" / "visual-auto-report.json"

USER_AGENT = "AIsonNewsBot/1.0 (+https://aison.news)"
MAX_HTML_BYTES = 2 * 1024 * 1024
MAX_IMAGE_BYTES = 10 * 1024 * 1024
DEFAULT_LIMIT = 20
MIN_WIDTH = 600
MIN_HEIGHT = 300
MAX_OUTPUT_WIDTH = 1600

# Only pages on these first-party domains can seed automatic visuals.
# Non-official news outlets (Reuters, The Verge, etc.) are intentionally excluded
# to avoid automatically republishing third-party editorial photography.
OFFICIAL_DOMAINS = {
    "openai.com": "OpenAI",
    "anthropic.com": "Anthropic",
    "blog.google": "Google",
    "google.com": "Google",
    "deepmind.google": "Google DeepMind",
    "microsoft.com": "Microsoft",
    "nvidia.com": "NVIDIA",
    "about.fb.com": "Meta",
    "meta.com": "Meta",
    "x.ai": "xAI",
    "tesla.com": "Tesla",
    "spacex.com": "SpaceX",
    "aws.amazon.com": "AWS",
    "amazon.com": "Amazon",
    "apple.com": "Apple",
    "github.blog": "GitHub",
    "github.com": "GitHub",
    "huggingface.co": "Hugging Face",
    "mistral.ai": "Mistral AI",
    "cohere.com": "Cohere",
    "stability.ai": "Stability AI",
    "adobe.com": "Adobe",
    "news.adobe.com": "Adobe",
    "canva.com": "Canva",
    "runwayml.com": "Runway",
    "perplexity.ai": "Perplexity",
}


@dataclass(frozen=True)
class MetaImage:
    url: str
    alt: str = ""


class SocialMetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.values: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag.lower() != "meta":
            return
        pairs = {str(k).lower(): str(v) for k, v in attrs if k and v is not None}
        key = (pairs.get("property") or pairs.get("name") or "").strip().lower()
        content = pairs.get("content", "").strip()
        if key and content and key not in self.values:
            self.values[key] = content

    def best_image(self, page_url: str) -> MetaImage | None:
        raw = (
            self.values.get("og:image:secure_url")
            or self.values.get("og:image")
            or self.values.get("twitter:image")
            or self.values.get("twitter:image:src")
        )
        if not raw:
            return None
        image_url = urllib.parse.urljoin(page_url, raw)
        alt = self.values.get("og:image:alt") or self.values.get("twitter:image:alt") or ""
        return MetaImage(image_url, alt.strip())


def _host(url: str) -> str:
    try:
        return (urllib.parse.urlparse(url).hostname or "").lower().rstrip(".")
    except Exception:
        return ""


def _is_subdomain(host: str, root: str) -> bool:
    return host == root or host.endswith("." + root)


def official_credit(url: str) -> str | None:
    host = _host(url)
    for root, label in OFFICIAL_DOMAINS.items():
        if _is_subdomain(host, root):
            return label
    return None


def _safe_https_url(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname:
            return False
        host = parsed.hostname.lower().rstrip(".")
        if host in {"localhost", "localhost.localdomain"} or host.endswith(".local"):
            return False
        try:
            ip = ipaddress.ip_address(host)
        except ValueError:
            return True
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved)
    except Exception:
        return False


def official_page_candidates(story: dict) -> list[tuple[str, str]]:
    urls: list[str] = []
    primary = str(story.get("sourceUrl", "")).strip()
    if primary:
        urls.append(primary)
    refs = story.get("references")
    if isinstance(refs, list):
        for item in refs:
            if isinstance(item, dict):
                url = str(item.get("url", "")).strip()
                if url:
                    urls.append(url)

    result: list[tuple[str, str]] = []
    seen: set[str] = set()
    for url in urls:
        if url in seen or not _safe_https_url(url):
            continue
        seen.add(url)
        credit = official_credit(url)
        if credit:
            result.append((url, credit))
    return result


def fetch_bytes(url: str, *, max_bytes: int, accept: str) -> tuple[bytes, str, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": accept,
            "Accept-Language": "en-US,en;q=0.8,zh-HK;q=0.6",
        },
    )
    with urllib.request.urlopen(req, timeout=12) as response:
        final_url = response.geturl()
        if not _safe_https_url(final_url):
            raise ValueError("redirected to unsafe URL")
        content_type = (response.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
        content_length = response.headers.get("Content-Length")
        if content_length and content_length.isdigit() and int(content_length) > max_bytes:
            raise ValueError("response too large")
        payload = response.read(max_bytes + 1)
        if len(payload) > max_bytes:
            raise ValueError("response too large")
        return payload, final_url, content_type


def discover_social_image(page_url: str) -> MetaImage | None:
    payload, final_url, content_type = fetch_bytes(
        page_url,
        max_bytes=MAX_HTML_BYTES,
        accept="text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    )
    if content_type and content_type not in {"text/html", "application/xhtml+xml"}:
        return None
    text = payload.decode("utf-8", errors="replace")
    parser = SocialMetaParser()
    parser.feed(text)
    return parser.best_image(final_url)


def _slug(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-")
    return value or "story"


def download_normalize_image(image_url: str, story_id: str) -> str:
    try:
        from PIL import Image
    except Exception as exc:  # deployment installs Pillow before this step
        raise RuntimeError(f"Pillow is required: {exc}") from exc
    if not _safe_https_url(image_url):
        raise ValueError("image URL is not safe HTTPS")
    payload, _final_url, content_type = fetch_bytes(
        image_url,
        max_bytes=MAX_IMAGE_BYTES,
        accept="image/avif,image/webp,image/apng,image/png,image/jpeg,*/*;q=0.2",
    )
    if content_type and not content_type.startswith("image/"):
        raise ValueError(f"unexpected image content-type: {content_type}")
    with Image.open(BytesIO(payload)) as image:
        image.load()
        width, height = image.size
        if width < MIN_WIDTH or height < MIN_HEIGHT:
            raise ValueError(f"image too small: {width}x{height}")
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        if width > MAX_OUTPUT_WIDTH:
            new_height = max(1, round(height * MAX_OUTPUT_WIDTH / width))
            image = image.resize((MAX_OUTPUT_WIDTH, new_height), Image.Resampling.LANCZOS)
        if image.mode == "RGBA":
            background = Image.new("RGB", image.size, "white")
            background.paste(image, mask=image.getchannel("A"))
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")
        AUTO_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{_slug(story_id)}.webp"
        target = AUTO_DIR / filename
        image.save(target, "WEBP", quality=84, method=6)
    return target.relative_to(ROOT).as_posix()


def _source_files() -> list[Path]:
    daily = sorted(DAILY_DIR.glob("*.json"), key=lambda p: p.stem, reverse=True) if DAILY_DIR.exists() else []
    files = daily
    if LEGACY_NEWS.is_file():
        files.append(LEGACY_NEWS)
    return files


def enrich(limit: int) -> dict:
    resolved: list[dict] = []
    skipped: list[dict] = []
    attempted = 0

    for path in _source_files():
        try:
            stories = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            skipped.append({"file": str(path.relative_to(ROOT)), "reason": f"invalid json: {exc}"})
            continue
        if not isinstance(stories, list):
            continue

        changed = False
        for story in stories:
            if attempted >= limit:
                break
            if not isinstance(story, dict) or story.get("visual"):
                continue
            candidates = official_page_candidates(story)
            if not candidates:
                continue
            attempted += 1
            story_id = str(story.get("id", "story"))
            success = False
            last_error = ""
            for page_url, credit in candidates:
                try:
                    meta = discover_social_image(page_url)
                    if not meta:
                        last_error = "no og/twitter image"
                        continue
                    local_src = download_normalize_image(meta.url, story_id)
                    story["visual"] = {
                        "kind": "official-press",
                        "src": local_src,
                        "alt": meta.alt or f"{story.get('title', 'AIson 新聞')}｜官方圖片",
                        "credit": credit,
                        "sourceUrl": page_url,
                        "autoResolved": True,
                    }
                    changed = True
                    success = True
                    resolved.append({"id": story_id, "pageUrl": page_url, "src": local_src, "credit": credit})
                    print(f"[visual] {story_id}: {credit} -> {local_src}")
                    break
                except Exception as exc:
                    last_error = str(exc)
            if not success:
                skipped.append({"id": story_id, "reason": last_error or "no usable official image"})
                print(f"[visual] {story_id}: fallback ({last_error or 'no usable official image'})")

        if changed:
            path.write_text(json.dumps(stories, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        if attempted >= limit:
            break

    report = {
        "attempted": attempted,
        "resolved": len(resolved),
        "fallback": len(skipped),
        "resolvedStories": resolved,
        "fallbackStories": skipped,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[visual] done: {len(resolved)}/{attempted} official images resolved; fallback remains available")
    return report


def self_test() -> None:
    html_doc = """<!doctype html><html><head>
    <meta property="og:image" content="/media/hero.jpg">
    <meta property="og:image:alt" content="Official product screenshot">
    <meta name="twitter:image" content="https://cdn.example.com/other.jpg">
    </head></html>"""
    parser = SocialMetaParser()
    parser.feed(html_doc)
    best = parser.best_image("https://openai.com/index/example/")
    assert best and best.url == "https://openai.com/media/hero.jpg"
    assert best.alt == "Official product screenshot"
    assert official_credit("https://openai.com/index/x") == "OpenAI"
    assert official_credit("https://cdn.openai.com/assets/x") == "OpenAI"
    assert official_credit("https://www.reuters.com/world/x") is None
    candidates = official_page_candidates(
        {
            "sourceUrl": "https://www.reuters.com/world/x",
            "references": [
                {"label": "OpenAI", "url": "https://openai.com/index/x/"},
                {"label": "The Verge", "url": "https://www.theverge.com/x"},
            ],
        }
    )
    assert candidates == [("https://openai.com/index/x/", "OpenAI")]
    assert _safe_https_url("https://openai.com/index/x")
    assert not _safe_https_url("http://openai.com/index/x")
    assert not _safe_https_url("https://127.0.0.1/x")
    print("Official visual resolver self-test passed.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="maximum recent stories with official candidates to try")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.limit < 1 or args.limit > 100:
        raise SystemExit("--limit must be between 1 and 100")
    enrich(args.limit)


if __name__ == "__main__":
    main()
