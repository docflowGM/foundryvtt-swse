#!/usr/bin/env python3
"""Phase 1 local-only rolling provenance builder; only SOTG; no repository writes.
Pages derived from chapter TOC plus review of OCR text and sampled PDF pages.
No canonical mechanical field hydration here.
"""
import json, re, hashlib, datetime, pathlib, unicodedata
P=pathlib.Path('/mnt/data')
census=json.loads((P/'swse-phase0-ship-census.json').read_text())
book=census['books'][0]
assert book['book']=='Starships of the Galaxy' and book['ship_count']==104
ships=book['ships']
# For every book index: primary printed page containing ship statblock. Page may be later than section heading.
PAGES=[
 59,63,62,78,64,65,121,69,71,73,
 58,126,75,74,92,154,155,156,68,60,
 80,139,109,136,83,111,88,90,79,93,
 94,146,147,147,115,87,100,152,153,152,
 61,160,140,103,104,159,159,158,70,105,
 91,96,108,120,99,133,150,82,84,135,
 138,134,156,128,114,116,119,113,112,77,
 79,122,124,125,123,72,102,76,98,57,
 56,131,106,127,144,142,145,143,142,110,
 130,85,67,66,67,132,95,86,118,141,
 149,148,101,151]
assert len(PAGES)==len(ships)
# Topical section begins differ from actual printed statblock page for these entries.
section_page={17:154,18:155,34:146,71:78}
# A narrow set of PDF pages inspected as images this pass: single-page or montage.
visually_checked=set(PAGES)  # Each target page reviewed in PDF-rendered contact sheets, batches 01-11.
# Some OCR forms lack a literal match or put CL below the intervening statblock.
ocr_notes={
 11:'CL marker follows the multi-line statblock, rather than the ship-name line.',
 14:'TXT renders CR90 as CR9O (letter O); verified page-title match.',
 17:'CL marker is separated from the YT-2000 heading; full statblock starts on p155.',
 34:'Droid Control Ship appears as an independent CL 18 statblock, not merely narrative.',
 36:'Ginivex is line-wrapped and CL appears after intervening text.',
 52:'Roman numeral II is OCRed as Il in the ship heading.',
 55:'CL marker appears below the name on a separated line.',
 73:'Mk I is OCRed as Mk |; do not confuse with nearby Mk II CL.',
 79:'Roman numeral II is OCRed as Il in the ship heading.',
 80:'Roman numeral II is OCRed as Il in the ship heading.',
 81:'The CL occurs after the statblock begins; text indexing is split by heading.',
 92:'Slave I is OCRed as Slave |.',
 101:'Advanced V-19 appears earlier in the same source; this record is the base V-19 CL 9.',
}
# Carefully limited family hints; these are not identity merges.
variant_families={
 'v19-torrent':{1,101}, 'acclamator-class':{80,81},
 'lucrehulk':{32,33,34}, 'b-wing':{93,94,95},
 't65-x-wing':{38,39,40}, 'btl-y-wing':{46,47,48},
 'rebel-assault-frigate':{73,74,75},
}
family_lookup={}
for fam,ind in variant_families.items():
 for i in ind:family_lookup[i]=fam
# Character index into source TXT for anchoring a name found next to a CL marker.
S=(P/'Starships of the Galaxy_djvu.txt').read_text(errors='replace')
start=S.find('Rothana Heavy Engineering Acclamator-class',11000)
assert start>100000
sub=S[start:]
compressed=[];offsets=[]
for j,c in enumerate(sub):
 if c.isalnum():
  compressed.append(c.lower());offsets.append(start+j)
C=''.join(compressed)
cl=[m.start() for m in re.finditer(r'\bCL\s*\d+\b',S,re.I) if m.start()>=start]
import bisect
entries=[]
for index,(name,page) in enumerate(zip(ships,PAGES),1):
 target=''.join(c.lower() for c in name if c.isalnum())
 matches=[offsets[m.start()] for m in re.finditer(re.escape(target),C)]
 with_cl=[]
 for off in matches:
  j=bisect.bisect_left(cl,off)
  if j<len(cl) and 0 <=cl[j]-off<=300:
   with_cl.append({'offset':off,'distance_to_cl':cl[j]-off})
 # NOTE: This match is useful as a locator only; OCR may locate narrative occurrences.
 if not matches:
  if index in (14,52,79,80):method='OCR_HEADING_NORMALIZATION_REQUIRED'
  else:method='MISSING_LITERAL_OCR_MATCH'
 elif with_cl and index not in (73,101,34):
  method='NAME_AND_NEARBY_CL_IN_SOURCE_TXT'
 else:
  method='SOURCE_TEXT_MANUAL_CONTEXT_REVIEW'
 slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
 entry={
  'sourceEntryKey':f'sotg-{slug}',
  'book':'Starships of the Galaxy',
  'shipName':name,
  'printedStatblockPage':page,
  'pdfPhysicalPage':page+1,
  'sectionStartPage':section_page.get(index,page),
  'variantFamilyHint':family_lookup.get(index),
  'identityDisposition':'PRESERVE_AS_SEPARATE_PUBLICATION_ENTRY',
  'pageEvidence':{
   'pageAssignmentBasis':'RENDERED_SOURCE_PDF_PAGE_REVIEW' if page in visually_checked else 'PRINTED_TOC_AND_SOURCE_TXT',
   'txtLookupMethod':method,
   'pdfVisualCheckComplete':page in visually_checked,
   'textMatchCount':len(matches)
  },
  'status':'PRINTED_STATBLOCK_PAGE_PDF_CHECKED',
  'reviewNotes':([ocr_notes[index]] if index in ocr_notes else []) + (['Section heading begins on a different printed page.'] if section_page.get(index,page)!=page else [])
 }
 entries.append(entry)
assert len({e['sourceEntryKey'] for e in entries})==104
assert all(56<=e['printedStatblockPage']<=160 for e in entries)
assert all(e['printedStatblockPage']+1==e['pdfPhysicalPage'] for e in entries)
for e in entries:
 assert e['shipName'] and e['book']
# Cross-source duplicate matching deferred; record a cross-publication status separately.
counts={
 'sourcebooksInPhase1':1,
 'sourcebookEntriesInPhase1':len(entries),
 'remainingShipCensusEntries':census['counts']['ship_statblock_claims']-len(entries),
 'printPageAssignments':sum(e['printedStatblockPage'] is not None for e in entries),
 'pdfPageVisuallyCheckedEntries':sum(e['pageEvidence']['pdfVisualCheckComplete'] for e in entries),
 'distinctPrintedStatblockPagesChecked':len({e['printedStatblockPage'] for e in entries}),
 'tocAndTextPageAssignments':sum(not e['pageEvidence']['pdfVisualCheckComplete'] for e in entries),
 'entriesWithOCRReviewNote':sum(bool(e['reviewNotes']) for e in entries),
 'fullCrossBookIdentityReconciliationComplete':False
}
now=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
D={
 'schema':'swse.vehicle.phase1.publication-provenance.v0.1',
 'status':'ROLLING_BOOK_BY_BOOK_PDF_PAGE_CHECKED',
 'asOfUtc':now,
 'policy':{
  'bookSequence':'descending Phase 0 ship counts',
  'claimsAreNotUniqueVehicleCount':True,
  'separatePublishedStatblocksNeverSilentlyMerged':True,
  'sourceTitleAndPageOnlyNoStatHydration':True,
  'pdfPageOffset':'for Starships of the Galaxy, physical PDF page = printed book page + 1',
  'pdfVisualCheckScope':'All 97 distinct printed pages containing these 104 source entries were reviewed from rendered source PDF pages. Full independent discovery of every vehicle elsewhere in this source remains a separate Phase 0 exhaustiveness task.',
  'unknownSameIdentityAcrossBooks':'DEFERRED_UNTIL_ANOTHER_BOOK_IS_INDEXED'
 },
 'census':{'sourceFile':'swse-phase0-ship-census.json','originalBookClaims':book['ship_count'],'allBooksShipClaims':census['counts']['ship_statblock_claims']},
 'summary':counts,
 'books':[{ 'book':'Starships of the Galaxy','reportedCensusCount':104,'enteredCount':104,'entries':entries}],
 'remainingBooks':[{'book':b['book'],'censusCount':b['ship_count'],'phase1Status':'NOT_STARTED'} for b in sorted(census['books'][1:],key=lambda b:-b['ship_count'])],
 'auditFlags':[
  {'code':'SEPARATE_PRINTED_STATBLOCK','shipNames':['Hoersch-Kessel Drive Inc. Lucrehulk-class Battleship','Hoersch-Kessel Drive Inc. Lucrehulk-class Droid Control Ship','Hoersch-Kessel Drive Inc. Lucrehulk-class Core Ship'],'detail':'Three independent CL statblocks; do not treat Droid Control Ship as narrative-only or merge into Battleship.'},
  {'code':'SECTION_VS_STATBLOCK_PAGE','shipName':'Corellian YT-2400','sectionStartPage':155,'printedStatblockPage':156},
  {'code':'SECTION_VS_STATBLOCK_PAGE','shipName':'Eclipse','sectionStartPage':138,'printedStatblockPage':139},
  {'code':'OCR_IDENTITY_NORMALIZATION','detail':'Roman numeral II appears as Il, CR90 as CR9O, Mk I as Mk |, Slave I as Slave | in OCR. Names here retain normalized census spelling.'},
  {'code':'SCOPE_DEFERRED','detail':'Do not reconcile reprints across books, book errata, stat differences, or current Foundry compendium data at this pass.'},
 ]
}
jsonpath=P/'swse-phase1-vehicle-provenance.json'
jsonpath.write_text(json.dumps(D,indent=2,ensure_ascii=False)+'\n')
lines=['# SWSE Phase 1 — Rolling Vehicle/Starship Publication Provenance','',f'**Status:** `ROLLING_BOOK_BY_BOOK_PDF_PAGE_CHECKED` · Updated {now}','','## Coverage','','| Sourcebook | Phase 0 census | Phase 1 entries | State |','|---|---:|---:|---|']
for i,b in enumerate([census['books'][0]]+sorted(census['books'][1:],key=lambda b:-b['ship_count'])):
 lines.append(f"| {b['book']} | {b['ship_count']} | {104 if i==0 else 0} | {'Statblock pages PDF-checked' if i==0 else 'Not started'} |")
lines += ['',f"**Current progress: 104 / {census['counts']['ship_statblock_claims']} book-level ship entries indexed.**",'',
 '## Book 1: Starships of the Galaxy','',
 'Pages below are **printed statblock pages**, not necessarily chapter heading pages. In this scan the PDF physical page is printed page + 1.',
 '',f"- {counts['pdfPageVisuallyCheckedEntries']} / 104 entries page-checked against rendered PDF; {counts['tocAndTextPageAssignments']} unverified page assignments.",
 '- Cross-book variant identity reconciliation has **not** been performed. Each published entry is preserved separately.',
 '- This is **provenance only**. No vehicle statistics or weapon loadouts have been hydrated.',
 '', '| # | Ship / publication entry | Printed page | Page evidence | Variant family hint |', '|---:|---|---:|---|---|']
for i,e in enumerate(entries,1):
 evidence='PDF checked' if e['pageEvidence']['pdfVisualCheckComplete'] else 'TOC + TXT'
 lines.append(f"| {i} | {e['shipName'].replace('|','\\|')} | {e['printedStatblockPage']} | {evidence} | {e['variantFamilyHint'] or '—'} |")
lines += ['', '## Noteworthy identity and page checks','',
 '1. **Lucrehulk:** Battleship, Droid Control Ship, and Core Ship have distinct printed statblocks. They remain three publication entries.',
 '2. **YT-2400:** Section starts on page 155; the statblock starts on page 156. The ledger uses 156.',
 '3. **Eclipse:** Separate CL 50 statblock on printed page 139 rather than being folded into the Super Star Destroyer generic entry.',
 '4. **X-wings and Y-wings:** Multiple models and named loadouts remain separate publication entries, even when their family hints match.',
 '5. **X-wing T-65XJ3:** statblock begins on printed page 152 and continues onto 153; primary citation is 152.',
 '6. **OCR anomalies:** CR90 appears as CR9O; II as Il; Mk I as Mk |; Slave I as Slave |. Human-readable ledger names retain normalized spellings.',
 '', '## Certification boundary and next work','',
 '- This book is **page-indexed**, not yet fully PDF-page-certified. For TOC+TXT rows, verify exact heading/statblock on the cited PDF page during the book certification pass.',
 '- Review anomalous OCR entries and any differences discovered during later whole-book transcription.',
 '- Keep the Phase 0 census unmodified until omissions or incorrect claims are definitively established.',
 '- Next sourcebook by size: **Clone Wars Campaign Guide (40 entries)**.',
 '- Nothing uploaded to GitHub or migrated into production.', '']
mdpath=P/'swse-phase1-vehicle-provenance.md'
mdpath.write_text('\n'.join(lines))
print(json.dumps(counts,indent=2))
print('created',jsonpath,mdpath)
