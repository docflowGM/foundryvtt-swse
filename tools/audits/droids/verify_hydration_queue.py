#!/usr/bin/env python3
"""Independent verification of the largest-book-first, source-only droid work queue."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3] / 'data/audits/droids'
Q=ROOT/'droid-mechanical-hydration-queue.json'
C=ROOT/'droid-publication-census.json'
q=json.loads(Q.read_text(encoding='utf-8'));c=json.loads(C.read_text(encoding='utf-8'))
assert q['schema']=='swse.droid.mechanical-hydration-queue/0.1'
books=[r for r in c['bookLedger'] if r['status']=='INITIAL_CENSUS_COMPLETE']
ordered=sorted(books,key=lambda r:(-r['listingCount'],r['sequence']))
assert len(q['books'])==len(books)==q['bookCount']==14
assert sum(r['listingCount'] for r in books)==len(c['listings'])==q['expectedPublicationClaims']==234
assert [r['bookId'] for r in q['books']]==[b['bookId'] for b in ordered]
statuses=set(q['statusVocabulary'])
for i,(r,b) in enumerate(zip(q['books'],ordered),1):
 assert r['priority']==i and r['bookId']==b['bookId']
 assert r['publicationClaimCount']==b['listingCount']
 actual=sum(x['bookId']==b['bookId'] for x in c['listings'])
 assert actual==r['publicationClaimCount']
 assert 0<=r['certifiedClaimCount']<=actual
 assert r['status'] in statuses
 if r['status']=='MECHANICALLY_CERTIFIED':assert actual and r['certifiedClaimCount']==actual
 if r['status']=='RULES_ONLY_CLOSED':assert actual==0
 for fname in ('sourcePdfFilename','searchableTxtFilename'):
  assert r[fname],r
assert q['books'][-1]['bookId']=='JATM' and q['books'][-1]['publicationClaimCount']==0
assert len({x['listingId'] for x in c['listings']})==234
print('PASS: ordered 14-book droid hydration queue, 234 unaltered source claims, independent book/ID/count/status checks')
for r in q['books']: print(f"{r['priority']:2}. {r['bookId']:<10} {r['publicationClaimCount']:>2} {r['status']}")
