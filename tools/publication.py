#!/usr/bin/env python3
"""Strict paired-edition gate and deterministic publication receipt."""
import argparse
import hashlib
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
try:
    from editorial import validate_daily, validate_meta
except ModuleNotFoundError:
    from tools.editorial import validate_daily, validate_meta

ROOT = Path(__file__).resolve().parents[1]

# Mirror of the story schema that tools/build.py enforces at build time.
# The paired-edition gate must reject the same violations up front, in one
# pass, instead of letting the build fail on the first bad field it meets.
AUDIENCE_KEYS = {'worker', 'sme', 'creator', 'developer'}
ACTION_VERDICTS = {'try-now', 'watch', 'wait', 'skip'}


def due_date(now=None):
    now = now or datetime.now(ZoneInfo('Asia/Hong_Kong'))
    now = now.astimezone(ZoneInfo('Asia/Hong_Kong'))
    # Before 08:00 the previous edition is still due; delayed runs keep today's date.
    return (now.date() - timedelta(days=now.hour < 8)).isoformat()


def validate_pair(date, root=ROOT):
    datetime.strptime(date, '%Y-%m-%d')
    daily = root / 'content/daily' / (date + '.json')
    editorial = root / 'content/editorial' / (date + '.json')
    rows = validate_daily(daily)
    try:
        from read_time import read_minutes
    except ModuleNotFoundError:
        from tools.read_time import read_minutes
    schema_errors = []
    for row in rows:
        for key in ('id', 'title', 'excerpt', 'category', 'sourceUrl', 'sourceLabel',
                    'summary', 'whatHappened', 'reportingContext', 'deepDive',
                    'whyImportant', 'whatToWatch', 'take'):
            if not isinstance(row.get(key), str) or not row[key].strip():
                raise ValueError(f"{row.get('id')}: missing/non-string {key}")
        if read_minutes(row.get('readTime')) is None:
            raise ValueError('readTime must be positive minutes')
        if type(row['rank']) is not int or row.get('verified') is not True:
            raise ValueError('rank must be integer and verified must be true')
        if not row['sourceUrl'].startswith('https://'):
            raise ValueError('sourceUrl must use HTTPS')
        if not isinstance(row.get('hkImpact'), list) or len(row['hkImpact']) < 3 or not all(isinstance(x, str) and x.strip() for x in row['hkImpact']):
            raise ValueError('hkImpact requires at least three entries')
        audience = row.get('audienceImpact')
        if audience is not None:
            if not isinstance(audience, dict) or set(audience) - AUDIENCE_KEYS:
                schema_errors.append(f"{row.get('id')}: audienceImpact must use worker/sme/creator/developer")
            else:
                for audience_key, value in audience.items():
                    if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 5:
                        schema_errors.append(f"{row.get('id')}: audienceImpact.{audience_key} must be an integer 1..5")
        verdict = row.get('actionVerdict')
        if verdict is not None and verdict not in ACTION_VERDICTS:
            schema_errors.append(f"{row.get('id')}: actionVerdict must be one of {sorted(ACTION_VERDICTS)}")
        score = row.get('aisonScore')
        if score is not None and (isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 10):
            schema_errors.append(f"{row.get('id')}: aisonScore must be a number between 0 and 10")
    if schema_errors:
        raise ValueError('story schema violations: ' + '; '.join(schema_errors))
    meta = validate_meta(json.loads(editorial.read_text()), date, rows)
    if any(next(r for r in rows if r['id'] == i).get('featured') is not True for i in meta['top3Ids']):
        raise ValueError('top3Ids must refer to featured stories')
    return rows, meta


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':')).encode()).hexdigest()


def receipt(date, root=ROOT):
    rows, meta = validate_pair(date, root)
    return {'schemaVersion': 1, 'editionDate': date, 'storyCount': len(rows),
            'dailySha256': digest(rows), 'editorialSha256': digest(meta),
            'top3Ids': meta['top3Ids']}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--date', default='')
    p.add_argument('--write', type=Path)
    p.add_argument('--artifact-root', type=Path, default=ROOT)
    p.add_argument('--source-root', type=Path, default=ROOT)
    args = p.parse_args()
    result = receipt(args.date or due_date(), args.source_root)
    if args.write:
        result.update(commitSha=os.environ.get('GITHUB_SHA', ''),
                      runUrl=os.environ.get('GITHUB_SERVER_URL', 'https://github.com') + '/' +
                      os.environ.get('GITHUB_REPOSITORY', 'palyuepal/aison-news') + '/actions/runs/' +
                      os.environ.get('GITHUB_RUN_ID', 'local'), state='built')
        result['artifacts'] = {name: hashlib.sha256((args.artifact_root / name).read_bytes()).hexdigest()
                               for name in ('data/latest.js', 'data/editorial.js', 'index.html', 'daily.html')}
        args.write.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
