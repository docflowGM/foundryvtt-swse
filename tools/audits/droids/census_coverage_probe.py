#!/usr/bin/env python3
"""Compare 14-book droid census's published formats to proposed universal source record vocabulary.
Identity-only dry run. Nothing written to the repo or canonical corpus.
"""
from pathlib import Path
from collections import Counter
import json,copy
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[3] / 'data/audits/droids'
census=json.loads((ROOT/'droid-publication-census.json').read_text())
schema=json.loads((ROOT/'universal-droid-source-entry.schema.json').read_text())
blank=json.loads((ROOT/'universal-droid-source-entry.blank.json').read_text())
bookTitles={b['bookId']:b['title'] for b in census['bookLedger'] if b['status']=='INITIAL_CENSUS_COMPLETE'}
normalizations={
 'droid-actor':('droid-actor','droid'),
 'vehicle-scale-droid':('vehicle','vehicle'),
 'starship-scale-droid':('vehicle','vehicle'),
 'vehicle':('vehicle','vehicle'),
 'droid-squad':('squad','squad-aggregation'),
 'replica-droid-actor':('droid-actor','droid'),
}
unknown=[]
records=[]
for row in census['listings']:
 raw=row['statblockFormat']
 if raw not in normalizations:unknown.append({'listing':row['listingId'],'format':raw});continue
 format_,authority=normalizations[raw]
 r=copy.deepcopy(blank)
 r['identity']={'sourceEntryKey':row['listingId'],'printedName':row['name']}
 r['publication']={'book':bookTitles[row['bookId']],'bookId':row['bookId'],'printedPageStart':row['printedPageStart'],'printedPageEnd':row['printedPageEnd'],'pdfPageStart1Based':row['pdfPageStart1Based']}
 r['classification']={'sourceStatblockFormat':raw,'statblockFormat':format_,'primaryActorAuthority':authority}
 # The census is only identity reviewed. Do NOT manufacture absent numeric stats.
 r['certification']={'identityStatus':'pdf-reviewed' if 'PDF' in str(row.get('evidenceStatus','')) else 'txt-indexed','mechanicalStatus':'unreviewed','runtimeStatus':'not-tested'}
 errors=list(Draft202012Validator(schema).iter_errors(r))
 if errors:raise AssertionError((row['listingId'],errors[0].message))
 records.append(r)

print('Census records',len(census['listings']),'schema identity-only probes validated',len(records))
print('Raw formats:',dict(Counter(v['statblockFormat'] for v in census['listings'])))
print('Normalized actor types:',dict(Counter(v['classification']['statblockFormat'] for v in records)))
print('Identity-only probes contain ZERO converted numeric mechanics; all mechanicalStatus=unreviewed')
print('Unknown formats:',unknown)
assert len(records)==234 and not unknown
assert len({r['identity']['sourceEntryKey'] for r in records})==234
assert all(r['certification']['mechanicalStatus']=='unreviewed' for r in records)
