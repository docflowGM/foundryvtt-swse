#!/usr/bin/env python3
"""Data-derived 14-sourcebook rolling counters; local only, no GitHub writes."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
books=[('SGD',"Scavenger's Guide to Droids",46),('CLONE','Clone Wars Campaign Guide',40),('THREATS','Threats of the Galaxy',29),('KOTOR','Knights of the Old Republic Campaign Guide',24),('GAW','Galaxy at War',22),('REBELLION','Rebellion Era Campaign Guide',15),('CORE','Saga Edition Core Rulebook',13),('LEGACY','Legacy Era Campaign Guide',12),('FORCE','Force Unleashed Campaign Guide',11),('GOI','Galaxy of Intrigue',8),('UNKNOWN','The Unknown Regions',6),('SCUM','Scum and Villainy',5),('SOTG','Starships of the Galaxy',3),('JATM','Jedi Academy Training Manual',0)]
assert len(books)==14 and sum(b[2] for b in books)==234
pct=lambda x,n:round(100*x/n,1) if n else 0.0
counts={};reviews={};comparisons={};certs={};passes=[]
for priority,(id,title,total) in enumerate(books,1):
 ledger=R/f'data/canonical/droids/source-books/{id.lower()}.json'
 visual=R/f'data/audits/droids/{id.lower()}-visual-field-review.json'
 recs=json.loads(ledger.read_text())['sourceEntries'] if ledger.exists() else []
 review=json.loads(visual.read_text()) if visual.exists() else {'items':[]}
 items=review['items']
 assert len(recs) in (0,total),(id,len(recs),total)
 assert len({r['identity']['sourceEntryKey'] for r in recs})==len(recs)
 assert len(items)<=len(recs)
 assert len({r['sourceEntryKey'] for r in items})==len(items)
 counts[id]=len(recs);reviews[id]=len(items)
 comparisons[id]=sum(x['verifiedFieldCount'] for x in items)
 certs[id]=sum(x['certification']['mechanicalStatus']=='certified' for x in recs)
 passes.append({'priority':priority,'bookId':id,'title':title,'claimCount':total,
   'status':('IN_PROGRESS' if recs else ('RULES_ONLY_NO_SOURCE_CLAIMS' if not total else 'NOT_STARTED')),
   'mechanicallyCertified':certs[id],
   'localSourceRecords':f'data/canonical/droids/source-books/{id.lower()}.json' if recs else None,
   'selectedFirstPageVisualReviews':reviews[id],
   'sourceDraftCount':len(recs),'selectedPdfFieldComparisons':comparisons[id]})
active=next(id for id,title,n in reversed(books) if counts[id])
name,n=next((title,n) for id,title,n in books if id==active)
source=sum(counts.values());selected=sum(reviews.values());certified=sum(certs.values())
finished=sum(1 for id,title,total in books if total>0 and certs[id]==total)
status={'schema':'swse.droid.mechanical-hydration.local-overlay/0.3',
 'originalQueue':'data/audits/droids/droid-mechanical-hydration-queue.json',
 'note':'LOCAL ONLY. This is not the GitHub queue or system data. Published identities remain separate.',
 'expectedPublishedClaims':234,'localSourceDrafts':source,'selectedFirstPageVisualReviews':selected,
 'totalMechanicallyCertified':certified,'sourcebookPasses':passes,
 'productionMutationAuthorized':False,'gitHubWriteAuthorization':False}
(R/'data/audits/droids/droid-hydration-progress.local.json').write_text(json.dumps(status,indent=2)+'\n')
previous={id:{'draftSourceEntries':counts[id],
   'selectedPdfFieldsReviewedEntries':reviews[id],
   'directPdfVisualFieldComparisons':comparisons[id],
   'mechanicallyCertifiedEntries':certs[id]}
   for id,title,total in books if counts[id] and id!=active}
progress={'schema':'swse.droid.local-progress-counter/0.3','workingBookId':active,
 'workstream':'droid-mechanical-hydration','sourceBookTotal':14,
 'sourceBooksMechanicallyComplete':finished,
 'overall':{'publicationClaimsTotal':234,'draftSourceEntries':source,'draftSourceCoveragePercent':pct(source,234),
  'selectedFieldPdfVisuallyReviewedEntries':selected,'selectedFieldPdfCoveragePercent':pct(selected,234),
  'independentlyMechanicalCertifiedEntries':certified,'mechanicalCertificationPercent':pct(certified,234),
  'directPdfVisualFieldComparisons':sum(comparisons.values())},
 'currentBook':{'id':active,'title':name,'publishedClaimsTotal':n,
  'draftSourceEntries':counts[active], 'selectedFieldPdfVisuallyReviewedEntries':reviews[active],
  'selectedFieldPdfPercent':pct(reviews[active],n),'directPdfVisualFieldComparisons':comparisons[active],
  'mechanicallyCertifiedEntries':certs[active],'mechanicalCertificationPercent':pct(certs[active],n),
  'status':'IN_PROGRESS_NOT_CERTIFIED','remainingUnvisuallyReviewedFirstPages':n-reviews[active],
  'mechanicalCertificationsStillNeeded':n-certs[active]},
 'previousBooks':previous,'remainingUndraftedPublicationClaims':234-source,
 'caveat':'Draft source records and selected printed-PDF fields are not complete mechanical certification. Equipment, feats, talents, full rules, and Foundry V13 execution remain gated.',
 'githubWritesAuthorized':False,'repositorySyncState':'LOCAL_ONLY_UNPUSHED'}
(R/'data/audits/droids/droid-progress-counter.local.json').write_text(json.dumps(progress,indent=2)+'\n')
md=f'''# SWSE Droid Publication Mechanical Hydration - Rolling local progress

**Current book: {name} (priority {next(i for i,(bid,_,__) in enumerate(books,1) if bid==active)}/14).** No GitHub write, Foundry import or runtime mechanical certification is authorized.

| Measure | {name} | All 14 sourcebooks |
|---|---:|---:|
| Draft publication identities | **{counts[active]}/{n} ({pct(counts[active],n)}%)** | **{source}/234 ({pct(source,234)}%)** |
| Selected first-page visual field reviews | **{reviews[active]}/{n} ({pct(reviews[active],n)}%)** | **{selected}/234 ({pct(selected,234)}%)** |
| Independent mechanical certifications | **{certs[active]}/{n} ({pct(certs[active],n)}%)** | **{certified}/234 ({pct(certified,234)}%)** |
| Mechanically complete sourcebooks | -- | **{finished}/14** |

**Direct selected-field PDF comparisons:** {comparisons[active]} current book; {sum(comparisons.values())} across reviewed books.

**Previous books:**
'''
for id,d in previous.items():
 md+=f"- {id}: {d['draftSourceEntries']} identities, {d['selectedPdfFieldsReviewedEntries']} selected PDF reviews, {d['mechanicallyCertifiedEntries']} certified.\n"
md+='\nThese are separate completion gates. A visually reviewed statblock does not verify all narrative rules, legal PC creation, or Foundry execution.\n\n## Sourcebook queue\n\n| Priority | Book | Draft identities | Selected PDF reviews | Mechanically certified |\n|---:|---|---:|---:|---:|\n'
for b in passes:
 md+=f"| {b['priority']} | {b['title']} | {b['sourceDraftCount']}/{b['claimCount']} | {b['selectedFirstPageVisualReviews']}/{b['claimCount']} | {b['mechanicallyCertified']}/{b['claimCount']} |\n"
md+='\n**GitHub:** Local only. Upload only when explicitly authorized by owner.\n'
(R/'docs/audits/droids/droid-progress-rolling.md').write_text(md)
print('ROLLING:',source,'/234 drafted;',selected,'/234 selected-PDF reviewed;',certified,'certified. Current',active,':',reviews[active],'/',n,'; compared',sum(comparisons.values()),'fields.')
