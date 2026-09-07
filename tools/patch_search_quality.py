#!/usr/bin/env python3
from pathlib import Path
import argparse

ROOT=Path(__file__).resolve().parents[1]
SCRIPT='<script src="search-quality.js?v=20260907-search11"></script>'
MARKERS=('id="searchModal"',"id='searchModal'",'id="archiveSearch"',"id='archiveSearch'")


def patch(directory:Path):
    changed=[]
    for path in sorted(directory.glob('*.html')):
        text=path.read_text(encoding='utf-8')
        if 'search-quality.js' in text or not any(marker in text for marker in MARKERS):
            continue
        if '</body>' not in text:
            raise SystemExit(f'{path}: missing </body>')
        text=text.replace('</body>',SCRIPT+'</body>',1)
        path.write_text(text,encoding='utf-8')
        changed.append(path.name)
    return changed


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('directory',nargs='?',default=str(ROOT))
    args=parser.parse_args()
    directory=Path(args.directory)
    changed=patch(directory)
    print(f'Enhanced search injected into {len(changed)} pages: '+(', '.join(changed) if changed else 'none'))

if __name__=='__main__': main()
