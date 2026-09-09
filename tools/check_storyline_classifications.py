#!/usr/bin/env python3
"""Exercise the Daily 10 storyline publication gate without changing content."""
from pathlib import Path
import json

from build import classify_storyline_assignment, load_storyline_registry, validate_daily_storyline_classifications

ROOT=Path(__file__).resolve().parents[1]


def expect_blocked(row, registry, message):
    try:
        classify_storyline_assignment(row,registry)
    except SystemExit:
        return
    raise SystemExit(f'{message}: invalid assignment was accepted')


def main():
    registry=load_storyline_registry()
    lines=registry.get('storylines',[])
    topics=registry.get('topics',[])
    active=next((line for line in lines if line.get('status','active')=='active'),None)
    if not active or not topics:
        raise SystemExit('registry needs at least one active storyline and one topic for validation checks')

    topic_id=active['topicId']
    if classify_storyline_assignment({'id':'new-event'},registry) != 'new-event':
        raise SystemExit('an unclassified story must remain a new event')
    if classify_storyline_assignment({'id':'topic-event','topicId':topic_id},registry) != 'topic-related-event':
        raise SystemExit('a valid topic-only story must remain topic-related')
    if classify_storyline_assignment({'id':'follow-up','storylineId':active['id'],'topicId':topic_id},registry) != 'storyline-follow-up':
        raise SystemExit('a valid follow-up was not recognised')

    expect_blocked({'id':'unknown-line','storylineId':'not-in-registry','topicId':topic_id},registry,'unknown storylineId')
    expect_blocked({'id':'unknown-topic','topicId':'not-in-registry'},registry,'unknown topicId')
    other_topic=next((topic['id'] for topic in topics if topic['id'] != topic_id),None)
    if other_topic:
        expect_blocked({'id':'mismatched-pair','storylineId':active['id'],'topicId':other_topic},registry,'mismatched IDs')
    expect_blocked({'id':'missing-follow-up-topic','storylineId':active['id']},registry,'follow-up without topicId')
    watching=next((line for line in lines if line.get('status')=='watching'),None)
    if watching:
        expect_blocked({'id':'watching-line','storylineId':watching['id'],'topicId':watching['topicId']},registry,'watching storyline')

    editions=sorted((ROOT/'content'/'daily').glob('*.json'))
    if not editions:
        raise SystemExit('no Daily 10 editions found')
    total={'new-event':0,'topic-related-event':0,'storyline-follow-up':0}
    for path in editions:
        counts=validate_daily_storyline_classifications(path,json.loads(path.read_text(encoding='utf-8')),registry)
        for key,value in counts.items(): total[key]+=value
    print(f"storyline publication gate ok: {len(editions)} editions / {total['storyline-follow-up']} follow-ups / {total['topic-related-event']} topic-linked / {total['new-event']} new events")


if __name__=='__main__':
    main()
