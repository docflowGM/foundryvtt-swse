#!/usr/bin/env python3
"""Final source-phase checkpoint. All 234 drafted; zero mechanical certifications."""
from pathlib import Path
import json,hashlib,shutil
R=Path(__file__).resolve().parents[1]
books=[('sgd',46),('clone',40),('threats',29),('kotor',24),('gaw',22),('rebellion',15),('core',13),('legacy',12),('force',11),('goi',8),('unknown',6),('scum',5),('sotg',3)]
counts={};f={}
for book,number in books:
 l=json.loads((R/f'data/canonical/droids/source-books/{book}.json').read_text());assert len(l['sourceEntries'])==number
 review=json.loads((R/f'data/audits/droids/{book}-visual-field-review.json').read_text())
 assert len(review['items'])==number
 counts[book]=number;f[book]=sum(v['verifiedFieldCount'] for v in review['items'])
 assert all(x['rules']['mechanicalExecutionStatus']=='source-only' for x in l['sourceEntries'])
 assert all(x['certification']['mechanicalStatus']!='certified' for x in l['sourceEntries'])
assert sum(counts.values())==234
cumulative=sum(f.values());assert cumulative==3375+94+99+32+15,(cumulative,f)
new=sum(f[b] for b in ['goi','unknown','scum','sotg']);assert new==240
# Persistent reviewer-facing checkpoint, not a claim of mechanical certification.
receipt={'checkpoint':'11','scope':'ALL_FOURTEEN_BOOKS_SELECTED_SOURCE_FIELDS_REVIEWED__NOT_MECHANICALLY_CERTIFIED',
 'sourceBooks':14,'sourceBooksWithPublishedDroidClaims':13,'zeroClaimBooks':['JATM'],
 'sourcePublicationClaims':234,'sourceRecordsDrafted':234,'selectedFieldPdfReviews':234,
 'directSelectedPdfFieldComparisons':cumulative,'independentMechanicalCertifications':0,
 'foundryRuntimeCertified':False,'upstreamUniversalJsonSchemaValidated':False,
 'bookCounts':counts,'perBookSelectedChecks':f,'remainingSourceReviewQueue':0,
 'blockingWork':['Full printed mechanical fields and adjacent narrative pages','feat/talent canonical IDs and prerequisites',
  'physical mount and installation rights','model-specific PC construction/hero eligibility',
  'official upstream JSON Schema validator','Foundry V13 runtime execution and tests'],
 'productionPackMutations':False,'gitPushRequestedByOwner':True}
(R/'docs/audits/droids/checkpoint11-source-review-complete.json').write_text(json.dumps(receipt,indent=2)+'\n')
intro=f'''# SWSE Droid Source Review — Checkpoint 11 (2026-11-02)\n\n**SOURCE-REVIEW PHASE COMPLETE: 234/234 publication identities drafted, 234/234 selected-field PDF reviews, {cumulative:,} selected field comparisons across 13 books with droid statblocks plus JATM (rules-only).**\n\n**NOT MECHANICALLY CERTIFIED: 0/234 certified; 0/14 books mechanically certified.** Do not confuse selected-page visual review with field-by-field certification.\n\nThe prior nine-book checkpoint is preserved. Final books: Galaxy of Intrigue 8, Unknown Regions 6, Scum and Villainy 5, Starships of the Galaxy 3. They add {new} selected field receipts. Starships has three vehicle-primary records; attack groups and vehicle HP never become droid-actor rights.\n\n## Source coverage\n\n| Book | Publication identities | Selected-PDF reviews | Visual comparison receipts | Mechanical certifications |\n|---|---:|---:|---:|---:|\n'''
for b,n in books:intro+=f'| {b.upper()} | {n} | {n} | {f[b]} | 0 |\n'
intro+='| JATM | 0 | 0 | 0 | 0 |\n'
intro+=f'| **TOTAL** | **234** | **234** | **{cumulative}** | **0** |\n\n'
intro+='''## Source conflicts retained\n\n- Galaxy of Intrigue NR-1100 prose says unarmed while printed statblock supplies blaster attack and possession. Do not auto-resolve.\n- Galaxy of Intrigue 3D-4 stock narrative is unarmed while presented example carries a concealed hold-out blaster.\n- Unknown Regions F1 Force points/other printed class facts do not enable droid-wide Force mechanics.\n- Scum and Villainy Roche 8D8 heat resistance is its own factory component effect, not necessarily SGD 8D.\n- Starships three autonomous starfighters require Vehicle SSOT; printed attack groups do not establish physical mounts or extra attacks.\n- Earlier book discrepancies and exceptions remain in the separate rolling reports and evidence ledgers, including Core printed Droideka CL 4 vs census CL 6.\n\n## Acceptance gates and reproducibility\n\nThe local source review semantic and negative mutation suites are not the full upstream universal schema validator and are not Foundry runtime tests. Full source field verification, published effects, equipment, feat/talent identity and mounted weapon legality remain pending for all 234 records. No production compendium or actor records were changed.\n\nAll books remain `IN_PROGRESS` for mechanical certification; this handoff closes only the **selected-source-field review** queue.\n\n## Data paths\n\n- `data/canonical/droids/source-books/{book}.json` publication-specific source records (13 nonzero books).\n- `data/audits/droids/{book}-field-evidence.json` PDF hashes, indexed OCR excerpts and selected-field receipts.\n- `data/audits/droids/{book}-review-backlog.json` independent mechanical blockers per record.\n- `docs/audits/droids/hydration-{book}-rolling.md` source review reports.\n- `data/audits/droids/sotg-vehicle-source-evidence.json` vehicle-owned figures, separated from actor fields.\n\n**Repository push authorization:** User explicitly requested GitHub push of completed source-review checkpoint. No mechanical or production rollout implied.\n'''
(R/'docs/audits/droids/droid-source-review-final.md').write_text(intro)
prev=(R/'README_LOCAL.md').read_text()
(R/'README_LOCAL.md').write_text('# SWSE Droids — checkpoint 11\n\n**234/234 selected-field publication source reviews complete. Mechanical certifications 0/234.**\n\nThe local rolling workspace and source-only records are ready for source-stage archival. All model mechanics remain uncertified. See `docs/audits/droids/droid-source-review-final.md`.\n\n---\n\n'+prev)
print('FINAL REVIEW CHECKPOINT',len(books),'books;',sum(counts.values()),'records;',cumulative,'field receipts; 0 certified')
