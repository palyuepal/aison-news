#!/usr/bin/env bash
set -euo pipefail
python - <<'PY'
from urllib.request import urlretrieve
url = "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf"
urlretrieve(url, "/tmp/aison-noto-sans-tc.ttf")
urlretrieve("https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/OFL.txt", "/tmp/aison-noto-sans-tc-OFL.txt")
PY
export AISON_SOCIAL_FONT=/tmp/aison-noto-sans-tc.ttf
uv run --with pillow python tools/enrich_official_visuals.py --limit 20
uv run --with pillow python tools/build.py
uv run --with pillow python tools/build_light_payloads.py
rm -rf public
mkdir public
cp -a assets data news topics *.html *.css *.js CNAME public/
