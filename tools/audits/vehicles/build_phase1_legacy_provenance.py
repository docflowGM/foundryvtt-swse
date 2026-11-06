#!/usr/bin/env python3
"""Append the PDF-checked Legacy Era publication entries to the local Phase 1 ledger.

Source checks: Legacy Era Campaign Guide PDF (printed pages) and its _djvu.txt.
This script handles provenance only, not source-stat transcription or mechanics.
"""
import copy
import datetime
import hashlib
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path('/mnt/data')
JP = ROOT / 'swse-phase1-vehicle-provenance.json'
MP = ROOT / 'swse-phase1-vehicle-provenance.md'
CP = ROOT / 'swse-phase0-ship-census.json'
BOOK = 'Legacy Era Campaign Guide'

# Printed statblock-start pages visually checked against the rendered book PDF.
# Second number is the section-heading start (where different).
PAGES = {
 'A519 Invader Close Support Starfighter': (218,217),
 'Ardent-class Fast Frigate': (189,189),
 'BB-2 Starfire Fighter/Bomber': (142,141),
 'Besh-Type Personal Starfighter': (83,82),
 'CF9 Crossfire Starfighter': (143,142),
 'Crimson Axe': (200,200),
 'Crix-class Assault Shuttle': (146,146),
 'Crix-class Diplomatic Courier Shuttle': (146,145),
 'Fury-class Starfighter': (186,185),
 'Gladius-class Light Freighter': (87,86),
 'GPE-7300 Space Transport': (87,87),
 'Helot-class Medium Transport': (88,88),
 'I4 Ionizer Starfighter': (143,143),
 'Imperious-class Star Destroyer': (191,190),
 'Indomitable (Scythe-class Battle Cruiser)': (150,150),
 'J-1 Shuttle': (89,88),
 'Jumpstar HPF Starfighter': (144,144),
 'MC-24a Light Shuttle': (89,89),
 'MT Dropship': (147,146),
 'Nemesis-class Patrol Ship': (218,218),
 'Neutralizer-class Bomber': (187,187),
 'Nune-class Imperial Shuttle': (188,187),
 'Pellaeon-class Star Destroyer': (190,189),
 'Phoebos-class Starfighter': (84,83),
 'Predator-class Starfighter': (186,186),
 'R-28 Starfighter': (85,84),
 'RC-2 Twilight Scoutship': (145,144),
 'Sabertooth-class Assault & Rescue Vessel': (148,147),
 'Scarlet Star (Modified YT-2400 Transport)': (147,147),
 'Scythe-class Battle Cruiser': (150,149),
 'ShaShore-class Frigate': (148,148),
 'Sigma-class Long-Range Shuttle': (188,188),
 'Spinward-class Tender': (152,152),
 'The Grinning Liar': (219,219),
 'The Mynock': (220,219),
 'Tri-Scythe-class Frigate': (151,151),
 'X-83 TwinTail Starfighter': (86,85),
 'YX-1980 Space Transport': (91,89),
 'YZ-2500 Heavy Transport': (91,91)
}
FAMILY = {
 'Crix-class Assault Shuttle': 'crix-class-shuttle',
 'Crix-class Diplomatic Courier Shuttle': 'crix-class-shuttle',
 'Indomitable (Scythe-class Battle Cruiser)': 'scythe-class-battle-cruiser',
 'Scythe-class Battle Cruiser': 'scythe-class-battle-cruiser',
 'Scarlet Star (Modified YT-2400 Transport)': 'yt-2400',
 'The Grinning Liar': 'yx-1980',
 'YX-1980 Space Transport': 'yx-1980',
 'The Mynock': 'helot-class-medium-transport',
 'Helot-class Medium Transport': 'helot-class-medium-transport',
 'X-83 TwinTail Starfighter': 'x83-twintail'
}
NOTE = {
 'A519 Invader Close Support Starfighter': ['Heading on printed p217; distinct CL8 statblock starts p218. PDF confirms A519 (letter A, digit 5), not OCR AS19.'],
 'BB-2 Starfire Fighter/Bomber': ['The PDF statblock names BB-2 Starfire; back-of-book index OCR appears as BB-2 Torrent. Retain the printed statblock heading.'],
 'I4 Ionizer Starfighter': ['PDF section and statblock use I4 Ionizer; OCR/index sometimes renders the leading capital I as digit 1.'],
 'Crix-class Assault Shuttle': ['Shares a family heading with the distinct Crix-class Diplomatic Courier Shuttle, both on p146.'],
 'Crix-class Diplomatic Courier Shuttle': ['Distinct statblock from Crix-class Assault Shuttle on the same printed page.'],
 'Indomitable (Scythe-class Battle Cruiser)': ['Named Scythe-class configuration with a distinct CL23 statblock alongside the standard CL22 Scythe on p150.'],
 'Scythe-class Battle Cruiser': ['Standard CL22 statblock; named Indomitable CL23 appears on the same printed page.'],
 'Scarlet Star (Modified YT-2400 Transport)': ['Named modified YT-2400 statblock; retain distinct from generic YT-2400 entry in Starships of the Galaxy.'],
 'The Grinning Liar': ['Named YX-1980 configuration; standard YX-1980 statblock begins on printed p91.'],
 'The Mynock': ['Named modified Helot-class transport; its CL9 statblock starts p220 while its section begins p219.'],
 'Gladius-class Light Freighter': ['Section begins on p86; actual CL9 statblock starts p87.'],
 'YX-1980 Space Transport': ['Model description begins p89; its standalone CL8 statblock begins on p91.'],
 'Crimson Axe': ['Named grounded capital ship with a standalone CL17 statblock on printed p200.'],
 'Fury-class Starfighter': ['Section begins p185; CL12 statblock begins p186.'],
 'Pellaeon-class Star Destroyer': ['Section begins p189; CL28 statblock begins p190.'],
 'Imperious-class Star Destroyer': ['Section begins p190; CL29 statblock begins p191.'],
}
RELATIONSHIPS = {
 'Indomitable (Scythe-class Battle Cruiser)': ('NAMED_CONFIGURATION_OF','Scythe-class Battle Cruiser'),
 'The Grinning Liar': ('NAMED_CONFIGURATION_OF','YX-1980 Space Transport'),
 'The Mynock': ('NAMED_CONFIGURATION_OF','Helot-class Medium Transport'),
 'Scarlet Star (Modified YT-2400 Transport)': ('NAMED_MODIFIED_CONFIGURATION_OF','Corellian YT-2400'),
}

def slug(s):
 s = unicodedata.normalize('NFKD', s)
 s = ''.join(c for c in s if not unicodedata.combining(c))
 return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',s.lower())).strip('-')

def checksum(o):
 return hashlib.sha256(json.dumps(o,ensure_ascii=False,sort_keys=True).encode()).hexdigest()

ledger=json.loads(JP.read_text())
census=json.loads(CP.read_text())
bookmeta=next(b for b in census['books'] if b['book']==BOOK)
assert bookmeta['ship_count']==len(bookmeta['ships'])==39
assert set(bookmeta['ships'])==set(PAGES), (set(bookmeta['ships'])-set(PAGES),set(PAGES)-set(bookmeta['ships']))
assert len(ledger['books']) in (2,3)
assert [b['book'] for b in ledger['books'][:2]]==['Starships of the Galaxy','Clone Wars Campaign Guide']
previous_hash=checksum(ledger['books'][:2])

records=[]
for name in bookmeta['ships']:
 page,section=PAGES[name]
 entry={
  'sourceEntryKey': 'le-'+slug(name),
  'book': BOOK,
  'shipName': name,
  'printedStatblockPage': page,
  'pdfPhysicalPage': page+1,
  'sectionStartPage': section,
  'variantFamilyHint': FAMILY.get(name),
  'identityDisposition': 'PRESERVE_AS_SEPARATE_PUBLICATION_ENTRY',
  'pageEvidence': {
   'pageAssignmentBasis':'RENDERED_SOURCE_PDF_PAGE_REVIEW',
   'txtLookupMethod':'SOURCE_TXT_STATBLOCK_AND_HEADING_REVIEW',
   'pdfVisualCheckComplete':True
  },
  'status':'PRINTED_STATBLOCK_PAGE_PDF_CHECKED',
  'reviewNotes':NOTE.get(name,[])
 }
 if name in RELATIONSHIPS:
  kind,parent=RELATIONSHIPS[name]
  # Cross-book model is a family hint only; not a same-identity merge decision.
  rel={'kind':kind,'parentShipName':parent}
  if parent in PAGES:rel['parentSourceEntryKey']='le-'+slug(parent)
  else: rel['crossBookLinkStatus']='FAMILY_HINT_ONLY_NOT_RECONCILED'
  entry['publicationRelationship']=rel
 records.append(entry)
assert len({r['sourceEntryKey'] for r in records})==39

newbook={
 'book':BOOK,'reportedCensusCount':39,'enteredCount':39,
 'entries':records,
 'bookAuditStatus':'PDF_CHECKED_ENUMERATED_STATBLOCK_PAGES; FULL_INDEPENDENT_CENSUS_NOT_CERTIFIED'
}
if len(ledger['books'])==2: ledger['books'].append(newbook)
else:ledger['books'][2]=newbook
assert checksum(ledger['books'][:2])==previous_hash
ledger['remainingBooks']=[b for b in ledger['remainingBooks'] if b['book']!=BOOK]
ledger['policy']['pdfPageOffsetByBook'][BOOK]=1
ledger['policy']['pdfVisualCheckScopeByBook'][BOOK]=('39 listed ship statblocks checked against rendered book PDF pages in the chapter VI, Galactic Alliance, Galactic Empire, Underworld and Fringe ship sections; 28 distinct printed statblock pages.')
ledger['policy']['pdfVisualCheckScope']='All indexed statblock-start pages were visually checked in rendered PDF for the three finished books. This does not establish a full independent census of unindexed statblocks.'
ledger['policy']['pdfPageOffset']='For the three finished books, physical PDF page = printed page + 1.'
ledger['asOfUtc']=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
ledger['summary']['sourcebooksInPhase1']=len(ledger['books'])
ledger['summary']['sourcebookEntriesInPhase1']=sum(len(b['entries']) for b in ledger['books'])
ledger['summary']['remainingShipCensusEntries']=sum(b['ship_count'] for b in census['books'])-ledger['summary']['sourcebookEntriesInPhase1']
ledger['summary']['printPageAssignments']=ledger['summary']['sourcebookEntriesInPhase1']
ledger['summary']['pdfPageVisuallyCheckedEntries']=ledger['summary']['sourcebookEntriesInPhase1']
ledger['summary']['distinctPrintedStatblockPagesChecked']=sum(len({e['printedStatblockPage'] for e in b['entries']}) for b in ledger['books'])
ledger['summary']['tocAndTextPageAssignments']=0
ledger['summary']['entriesWithReviewNote']=sum(1 for b in ledger['books'] for e in b['entries'] if e['reviewNotes'])
ledger['summary']['entriesWithOCRReviewNote']=sum(1 for b in ledger['books'] for e in b['entries'] if any(re.search(r'\bOCR\b|garbl|spelling|misspell|read as|typo',n,re.I) for n in e['reviewNotes']))
ledger['census']['allBooksShipClaims']=sum(b['ship_count'] for b in census['books'])

# Remove previous Legacy flags if regenerating, leaving first two books untouched.
ledger['auditFlags']=[x for x in ledger['auditFlags'] if x.get('book')!=BOOK]
flags=[
 ('SECTION_VS_STATBLOCK_PAGE','Several entries begin on one printed page and the statblock starts on the following page (e.g. Gladius 86/87, A519 Invader 217/218, Mynock 219/220).'),
 ('SEPARATE_NAMED_CONFIGURATION','Indomitable CL23 and Scythe-class Battle Cruiser CL22 have distinct statblocks on p150. The Mynock and Grinning Liar also have separate records from their generic parent designs.'),
 ('OCR_TITLE_REVIEW','Confirmed A519 Invader (not AS19), I4 Ionizer (not 14), and BB-2 Starfire (rather than the garbled appendix rendering).'),
 ('NONSHIP_INSTALLATIONS_OUTSIDE_TALLY','Golan VIII Space Defense Platform p152 and Rendili Star Drive Mobile Spacedock 220 p153 are kept outside ship tally, matching Phase 0 station inventory.'),
 ('CROSS_BOOK_POSSIBLE_FAMILY','X-83 TwinTail also has a Starships of the Galaxy publication entry. Do not merge or presume stats are identical.'),
 ('CENSUS_NO_COUNT_CHANGE','All 39 previously enumerated ship entries located with PDF-checked statblock pages; no additional ship statblock added in this pass.')]
ledger['auditFlags'] += [{'book':BOOK,'code':code,'detail':detail} for code,detail in flags]

# Stable, human-readable Markdown from the same JSON, no separate transcriptions.
lines=[
 '# SWSE Phase 1 — Rolling Vehicle/Starship Publication Provenance',
 '',
 f"**Status:** `{ledger['status']}` · Updated {ledger['asOfUtc']}",
 '', '## Coverage','',
 '| Sourcebook | Phase 0 census | Phase 1 entries | State |',
 '|---|---:|---:|---|'
]
for cb in census['books']:
 found=next((b for b in ledger['books'] if b['book']==cb['book']),None)
 count=len(found['entries']) if found else 0
 state='Statblock pages PDF-checked' if found else 'Not started'
 lines.append(f"| {cb['book']} | {cb['ship_count']} | {count} | {state} |")
total=ledger['summary']['sourcebookEntriesInPhase1'];grand=ledger['census']['allBooksShipClaims']
lines.extend(['',f'**Current progress: {total} / {grand} publication entries indexed ({total/grand:.1%}).**','',
 'Counts are book-level publication statblock claims, not unique chassis. Variant family hints do not merge different source entries. Listed pages identify **where the statblock begins**, not necessarily where the preceding section begins. Physical PDF pages are printed + 1 for these three books.',
 ''])
for idx,b in enumerate(ledger['books'],1):
 entries=b['entries']; pagecount=len({e['printedStatblockPage'] for e in entries})
 lines += [f"## Book {idx}: {b['book']}", '',
           f'**{len(entries)} / {len(entries)}** preliminary census entries PDF-page-checked on **{pagecount}** distinct printed pages.','',
           '| # | Publication entry | Printed statblock page | Evidence | Variant family hint |',
           '|---:|---|---:|---|---|']
 for i,e in enumerate(entries,1):
  n=e['shipName'].replace('|','\\|')
  hint=e.get('variantFamilyHint') or '—'
  lines.append(f"| {i} | {n} | {e['printedStatblockPage']} | PDF checked | {hint} |")
 lines.append('')
 if idx==1:
  lines += ['**Starships source-review findings:**','','- Lucrehulk Battleship, Droid Control Ship and Core Ship have distinct printed records.','- YT-2400 statblock begins on p156 although its section begins p155.','- X-wing and Y-wing named variants remain separate publication records.','']
 if idx==2:
  lines += ['**Clone Wars source-review findings:**','','- Diamond-class Cruiser p206 was added to the rolling Phase 0 census during this book review (40 → 41).','- Droch-class Boarding Ship p207 corrects an OCR spelling (“Oroch”).','- Detachable Seltiss-2 Caravel Cabin p81 has its own CL3 statblock, separate from the parent vessel p80.','- Named ships and modified variants remain independent from standard designs.','']
 if idx==3:
  lines += ['**Legacy Era source-review findings:**','',
 '- Printed p150 has distinct CL22 **Scythe-class Battle Cruiser** and CL23 **Indomitable** statblocks; both are indexed.',
 '- Named **Scarlet Star** (p147), **Crimson Axe** (p200), **The Grinning Liar** (p219), and **The Mynock** (p220) have separate published statblocks.',
 '- **A519 Invader** section starts p217 but its CL8 statblock begins p218. The PDF spells the name A519, not OCR “AS19”.',
 '- **Gladius-class Light Freighter** starts its text on p86 and its CL9 statblock on p87; the **YX-1980** statblock begins p91 after its earlier model discussion.',
 '- Appendix/OCR names require care: **I4 Ionizer** and **BB-2 Starfire** follow the printed statblock, not garbled indexing.',
 '- Nonship installations **Golan VIII** (p152) and **Mobile Spacedock 220** (p153) stay in the separately tracked installation inventory.',
 '- **X-83 TwinTail** is also indexed in *Starships of the Galaxy*. Cross-publication identity and statistics remain unmerged.',
 '- No new ship entries discovered in this pass; Legacy Era remains 39 and all-book total remains 313.','']
lines += ['## Certification boundary and next work','',
 '- These three books have PDF-checked printed statblock pages for the **enumerated** ship records; independent whole-book exhaustiveness is not claimed.',
 '- No source-stat hydration, weapon modeling, errata precedence decision, or cross-book canonical identity merge was performed.',
 '- **Next:** Rebellion Era Campaign Guide (35 preliminary ship entries), then Knights of the Old Republic (31).',
 '- All changes stay local; no GitHub or production modification.','']

newjson=json.dumps(ledger,ensure_ascii=False,indent=2)+'\n'
newmd='\n'.join(lines)
JP.write_text(newjson)
MP.write_text(newmd)

saved=json.loads(JP.read_text());assert saved['summary']['sourcebookEntriesInPhase1']==184
assert checksum(saved['books'][:2])==previous_hash
assert len(saved['books'][2]['entries'])==39
assert saved['summary']['distinctPrintedStatblockPagesChecked']==sum(len({e['printedStatblockPage'] for e in b['entries']}) for b in saved['books'])
assert all(e['pdfPhysicalPage']==e['printedStatblockPage']+1 for e in saved['books'][2]['entries'])
assert all(str(e['printedStatblockPage']) in newmd for e in saved['books'][2]['entries'])
print('PASS: 39 Legacy entries appended, old 145 entries intact; 184/313 total; Legacy distinct statblock pages',len({e['printedStatblockPage'] for e in records}))
print('SHA256 old 2-book records:',previous_hash)
print('Output:',JP,MP)
