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
`"5 分鐘"` without rewriting source archives. All ten latest stories are checked;
Featured stories claiming eight minutes or more still need the full Deep Read
thresholds. GitHub Pages runs the quality gate before building and deploying.
