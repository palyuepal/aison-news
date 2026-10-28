#!/usr/bin/env bash
set -euo pipefail
apt-get update -qq
apt-get install -y --no-install-recommends fonts-noto-cjk
uv run --with pillow python tools/enrich_official_visuals.py --limit 20
uv run --with pillow python tools/build.py
uv run --with pillow python tools/build_light_payloads.py
rm -rf public
mkdir public
cp -a assets data news topics *.html *.css *.js CNAME public/
