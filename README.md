# -aison-news
    AIson｜香港人的每日 AI 新聞站

## Daily publication preflight

Before committing a new daily edition and its editorial sidecar, run:

```sh
python tools/check_deep_reads.py
python -m unittest discover -s tests -p 'test_read_time.py'
```

`readTime` accepts a positive integer minute count (e.g. `5`) or a Chinese
minute label (e.g. `"5 分鐘"`). Prefer the label when writing content. The shared
parser rejects booleans, fractions, zero, negative values, missing units in
strings, and arbitrary prose. The build formats both accepted forms as
`"5 分鐘"` without rewriting source archives. Every story in the latest edition is checked;
Featured stories claiming eight minutes or more still need the full Deep Read
thresholds. GitHub Pages runs the quality gate before building and deploying.

## Two-week variable edition pilot

From 2026-11-15 through 2026-11-28 (Hong Kong time), aim for 6–10 verified stories per day. This is an editorial target, not a publication minimum: a valid nonempty edition may contain 1–10 stories with consecutive local ranks. Do not pad the edition with weak or repeated stories. Keep historical editions unchanged. Record publication time, source and correction issues, and opens by story rank each day before deciding the long-term target. Use [PILOT-2026-11.md](PILOT-2026-11.md) for the daily record. The existing freshness check runs after the 08:00 target and verifies that the public edition has the same date and story count as its source.
