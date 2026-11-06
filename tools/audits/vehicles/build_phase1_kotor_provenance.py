#!/usr/bin/env python3
"""Append PDF-checked KOTOR ship-source identities to local rolling Phase 0/1 files.

Idempotent; preserves finished publication entries. Does not contact GitHub.
"""
import copy
import datetime
import json
import re
from pathlib import Path

DIR = Path('/mnt/data')
BOOK = 'Knights of the Old Republic Campaign Guide'
PREFIX = 'kotor'

def slug(x):
    return re.sub(r'(^-|-$)', '', re.sub(r'[^a-z0-9]+', '-', x.lower()))

# (name, statblock-start printed page, section-start page, review note)
SOURCE = [
 ('Amalgamated Hyperdyne 578-R Space Transport',98,98,None),
 ('Arakyd Industries Lethisk-class Armed Freighter',99,99,None),
 ('Corellia StarDrive Quartermaster-class Supply Carrier',100,100,None),
 ('Corellian Engineering Corporation S-100 Stinger-class Starfighter',95,95,None),
 ('Corellian Engineering Corporation S-250 Chela-class Starfighter',181,181,None),
 ('Davaab-type Starfighter',204,204,'CL appears after the category text in TXT OCR; PDF statblock confirms identity.'),
 ('Ebon Hawk',220,220,'Named ship has its own published CL 8 statblock; preserve independently from any generic chassis.'),
 ('Eleaor Propulsion Baronial-class Yacht',143,143,'Presented under the descriptive section title "Jedi Covenant Shuttle"; the printed CL 6 statblock uses the Baronial-class identity.'),
 ('Eleaor Propulsion Starscape-class Yacht',222,221,'Section text begins p221; CL 13 statblock starts p222.'),
 ('Hoersch-Kessel Drive G-Type Light Shuttle',98,98,'The escape-shuttle variant is supplied as changes to this statblock, not a second complete printed CL block; preserve variant note for subsequent phase.'),
 ("Jehavey'ir-type Assault Ship",206,205,'Introductory section begins p205; CL 18 statblock starts p206.'),
 ('Kandosii-type Dreadnaught',207,206,'Introductory section begins p206; CL 20 statblock starts p207.'),
 ('Koros Spaceworks CX-133 Chaos Fighter',220,220,None),
 ('Koros Spaceworks Supremacy-class Attack Ship',221,221,None),
 ('Kyramud-type Battleship',206,206,None),
 ('Pelagia Duplex Command Assault Gunship',100,100,None),
 ('Rendili Hyperworks Hammerhead-class Cruiser',184,184,None),
 ('Rendili Hyperworks Inexpugnable-class Tactical Command Vessel',185,184,'Section begins p184; CL 19 statblock begins p185.'),
 ('Rendili Hyperworks Praetorian-class Frigate',101,101,None),
 ('Republic Fleet Systems Aurek Tactical Strikefighter',181,181,None),
 ('Republic Fleet Systems Conductor-class Short-haul Landing Craft',182,181,'Section begins p181; CL 7 statblock begins p182.'),
 ('Republic Fleet Systems Foray-class Blockade Runner',183,183,None),
 ('Republic Fleet Systems KT-400 Military Droid Carrier',183,183,None),
 ('Republic Fleet Systems Star Saber XC-01 Starfighter',96,96,None),
 ('Shaadlar-type Troopship',205,204,'Description begins p204; CL 15 statblock begins p205.'),
 ('Star Forge Manufacture Centurion-class Battlecruiser',163,162,'Section begins p162; CL 20 statblock begins p163.'),
 ('Star Forge Manufacture Derriphan-class Battleship',163,163,'New census discovery: independent printed CL 14 statblock adjacent to Centurion-class Battlecruiser, p163.'),
 ('Star Forge Manufacture Herald-class Shuttle',164,164,None),
 ('Star Forge Manufacture Interdictor-class Warship',161,161,None),
 ('Star Forge Manufacture Sith Interceptor',164,164,'TXT OCR places CL after the category; PDF confirms CL 5 starfighter on p164.'),
 ('Teroch-type Fast Attack Gunship',205,205,None),
 ('Zentine Dynamics Ministry-class Orbital Shuttle',182,182,None),
]
assert len(SOURCE)==32
assert len(set(n for n,_,_,_ in SOURCE))==32
assert len(set(pg for _,pg,_,_ in SOURCE))==22

census_path = DIR / 'swse-phase0-ship-census.json'
prov_path = DIR / 'swse-phase1-vehicle-provenance.json'
census = json.loads(census_path.read_text())
prov = json.loads(prov_path.read_text())
old_records = {b['book']:copy.deepcopy(b['entries']) for b in prov['books'] if b['book']!=BOOK}

cbook = next(b for b in census['books'] if b['book']==BOOK)
new_name = 'Star Forge Manufacture Derriphan-class Battleship'
if new_name not in cbook['ships']:
    assert cbook['ship_count']==31
    cbook['ships'].append(new_name)
    cbook['ships'].sort(key=str.casefold)
cbook['ship_count']=len(cbook['ships'])
assert cbook['ship_count']==32
assert set(cbook['ships'])==set(n for n,_,_,_ in SOURCE)
cbook['review_status']='PHASE1_PRINTED_STATBLOCK_PAGES_PDF_CHECKED'
census['counts']['ship_statblock_claims']=sum(b['ship_count'] for b in census['books'])
assert census['counts']['ship_statblock_claims']==314

notes='Phase 1 Knights of the Old Republic PDF review: confirmed 31 preliminary entries and recovered Star Forge Manufacture Derriphan-class Battleship (CL 14, printed p163). KOTOR 31->32 and rolling census 313->314. Page provenance is PDF-checked for all 32 entries on 22 distinct printed pages; separate G-Type escape shuttle variant is a modification overlay, not a separate full CL block.'
if notes not in census['review_notes']:
    census['review_notes'].append(notes)

book_records=[]
for name,print_page,section_page,note in sorted(SOURCE,key=lambda v:v[0].casefold()):
    entry={
      'sourceEntryKey':f'{PREFIX}-{slug(name)}',
      'book':BOOK,
      'shipName':name,
      'printedStatblockPage':print_page,
      'pdfPhysicalPage':print_page+1,
      'sectionStartPage':section_page,
      'variantFamilyHint':None,
      'identityDisposition':'PRESERVE_AS_SEPARATE_PUBLICATION_ENTRY',
      'pageEvidence':{
        'pageAssignmentBasis':'RENDERED_SOURCE_PDF_PAGE_REVIEW',
        'txtLookupMethod':'SOURCE_TXT_STATBLOCK_AND_PDF_PAGE_RECONCILIATION',
        'pdfVisualCheckComplete':True,
      },
      'status':'PRINTED_STATBLOCK_PAGE_PDF_CHECKED',
      'reviewNotes':[note] if note else [],
    }
    book_records.append(entry)
assert len({e['sourceEntryKey'] for e in book_records})==32
book_record={
  'book':BOOK,
  'reportedCensusCount':32,
  'previousCensusCount':31,
  'enteredCount':32,
  'bookAuditStatus':'PRINTED_STATBLOCK_PAGES_PDF_CHECKED',
  'entries':book_records,
}
prior=[b for b in prov['books'] if b['book']!=BOOK]
prov['books']=prior+[book_record]
for b in prior: assert b['entries']==old_records[b['book']]
prov['census']['allBooksShipClaims']=314
prov['summary']['sourcebooksInPhase1']=len(prov['books'])
prov['summary']['sourcebookEntriesInPhase1']=sum(len(b['entries']) for b in prov['books'])
prov['summary']['remainingShipCensusEntries']=314-prov['summary']['sourcebookEntriesInPhase1']
prov['summary']['printPageAssignments']=prov['summary']['sourcebookEntriesInPhase1']
prov['summary']['pdfPageVisuallyCheckedEntries']=prov['summary']['sourcebookEntriesInPhase1']
prov['summary']['distinctPrintedStatblockPagesChecked']=sum(len(set(e['printedStatblockPage'] for e in b['entries'])) for b in prov['books'])
prov['summary']['entriesWithReviewNote']=sum(bool(e.get('reviewNotes')) for b in prov['books'] for e in b['entries'])
# Other books may include OCR-review notes in previously established audits; preserve prior count.
prov['policy']['pdfPageOffsetByBook'][BOOK]=1
prov['policy']['pdfVisualCheckScopeByBook'][BOOK]='32 named ship statblocks on 22 distinct printed pages, including the independently statblocked Derriphan-class Battleship omitted from the preliminary census; checked visually against rendered PDF pages.'
prov['policy']['pdfPageOffset']='For the five finished books, physical PDF page = printed page + 1.'
prov['policy']['pdfVisualCheckScope']='All enumerated ship statblock-start pages were visually checked against the source PDFs for the five finished books; whole-book exhaustiveness is not certified.'
prov['remainingBooks']=[b for b in prov['remainingBooks'] if b['book']!=BOOK]
flags=[
 {'book':BOOK,'code':'CENSUS_OMISSION_CONFIRMED','shipName':new_name,'printedStatblockPage':163,'detail':'Additional independently printed CL14 ship statblock. KOTOR 31->32; all-books census 313->314.'},
 {'book':BOOK,'code':'SECTION_VS_STATBLOCK_PAGE','detail':'Shaadlar troopship section p204/statblock p205; Jehavey\'ir p205/p206; Kandosii p206/p207; Conductor landing craft p181/p182; Inexpugnable command vessel p184/p185; Starscape yacht p221/p222.'},
 {'book':BOOK,'code':'SECTION_TITLE_VS_STATBLOCK_NAME','detail':'Jedi Covenant Shuttle is a section heading for the Eleaor Propulsion Baronial-class Yacht CL6 record on p143; no second ship statblock.'},
 {'book':BOOK,'code':'PARTIAL_VARIANT_OVERLAY','detail':'G-Type escape shuttle variant is defined via changes to the base G-Type Light Shuttle statblock; record the variant relationship for later reconciliation rather than asserting a separate complete CL statblock.'},
 {'book':BOOK,'code':'CENSUS_SCOPE','detail':'Ground vehicles/droids outside the starship corpus remain excluded from this ship-only census; preserve for broader universal-vehicle enumeration.'}
]
prov['auditFlags']=[f for f in prov['auditFlags'] if f.get('book')!=BOOK]+flags
now=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
prov['asOfUtc']=now
census['generated_utc']=now
assert prov['summary']['sourcebookEntriesInPhase1']==251
assert prov['summary']['remainingShipCensusEntries']==63
assert prov['summary']['distinctPrintedStatblockPagesChecked']==198

# Synchronized, deterministic markdown from JSON (previously certified sections copied without modification).
census_md_path=DIR/'swse-phase0-ship-census.md'
cm=census_md_path.read_text()
cm=re.sub(r'\*\*Ship/statblock publication entries:\*\* \*\*\d+\*\*', '**Ship/statblock publication entries:** **314**',cm,count=1)
cm=cm.replace('Phase 1 Clone Wars PDF review found one omission (Diamond-class Cruiser, p206) and corrected one OCR name (Droch, not Oroch). The separately statblocked Seltiss-2 cabin is retained and explicitly labeled as a detachable component, not an unrelated starship.', 'Phase 1 Clone Wars PDF review found the Diamond-class Cruiser (p206) and corrected Droch/Oroch OCR. Phase 1 KOTOR review found the separately statblocked Derriphan-class Battleship (p163). The Seltiss-2 cabin is retained as a detachable component rather than an unrelated starship.')
for b in prov['books']:
    key=b['book'];cnt=len(b['entries'])
    regex=rf'(\| \d+ \| {re.escape(key)} \| )\d+( \| )(?:Preliminary|Pages reviewed in Phase 1)( \|)'
    cm,nsub=re.subn(regex,lambda m:f'{m.group(1)}{cnt}{m.group(2)}Pages reviewed in Phase 1{m.group(3)}',cm,count=1)
    assert nsub==1,key
cm=cm.replace(f'### {BOOK} — 31',f'### {BOOK} — 32')
block=cm.split(f'### {BOOK} — 32\n',1)
assert len(block)==2
part=block[1].split('\n### ',1)
assert len(part)==2
# overwrite only KOTOR list; all other book lists preserved.
cm=block[0]+f'### {BOOK} — 32\n\n'+''.join('- '+x+'\n' for x in cbook['ships'])+'\n### '+part[1]
cm=cm.replace('## Census review notes', '## Census review notes')
cm=cm.replace('**No GitHub changes; this census remains preliminary.**', '**No GitHub changes; this census remains preliminary.**')
if notes not in cm:cm=cm.replace('\n**No GitHub changes;',f'\n- {notes}\n\n**No GitHub changes;')

pm_path=DIR/'swse-phase1-vehicle-provenance.md'
pm=pm_path.read_text()
pm=re.sub(r'\*\*Status:\*\* `ROLLING_BOOK_BY_BOOK_PDF_PAGE_CHECKED` · Updated [^\n]+',f'**Status:** `ROLLING_BOOK_BY_BOOK_PDF_PAGE_CHECKED` · Updated {now}',pm,count=1)
pm,nsub=re.subn(r'(\| Knights of the Old Republic Campaign Guide \| )31 \| 0 \| Not started \|',r'\g<1>32 | 32 | Statblock pages PDF-checked |',pm,count=1)
assert nsub==1
pm=re.sub(r'\*\*Current progress: [^\n]+',f'**Current progress: 251 / 314 publication entries indexed ({251/314*100:.1f}%).**',pm,count=1)
pm=pm.replace('Physical PDF pages are printed + 1 for these four books.','Physical PDF pages are printed + 1 for these five books.')
start=pm.index('## Certification boundary and next work')
old_tail=pm[start:]
assert 'These four books' in old_tail
pm=pm[:start]
pm+=f'## Book 5: {BOOK}\n\n**32 / 32** source entries PDF-page-checked on **22** distinct printed statblock pages. Original preliminary census: 31.\n\n| # | Publication entry | Printed statblock page | Evidence | Variant family hint |\n|---:|---|---:|---|---|\n'
for i,e in enumerate(book_records,1):
    pm+=f"| {i} | {e['shipName']} | {e['printedStatblockPage']} | PDF checked | {e['variantFamilyHint'] or '—'} |\n"
pm+='\n**Knights of the Old Republic source-review findings:**\n\n'
pm+='- **Derriphan-class Battleship (p163):** independently printed CL14 statblock discovered beyond the preliminary census; KOTOR 31→32 and rolling all-books 313→314.\n'
pm+='- **Sith-era designs:** Interdictor-class Warship (p161), Centurion-class Battlecruiser and Derriphan-class Battleship (p163), Herald-class Shuttle and Sith Interceptor (p164) all retain separate source identities.\n'
pm+='- **Republic, Mandalorian, and named ships:** relevant statblocks were checked outside the primary vehicle chapter (printed pp143, 161–164, 181–185, 204–207, 220–222).\n'
pm+='- **Page offsets:** Shaadlar p204→205; Jehavey\'ir p205→206; Kandosii p206→207; Conductor p181→182; Inexpugnable p184→185; Starscape p221→222. Statblock-start pages are recorded.\n'
pm+='- **Jedi Covenant Shuttle:** printed CL6 ship is the Eleaor Propulsion Baronial-class Yacht (p143), so no duplicate identity is created from the section heading.\n'
pm+='- **G-Type escape shuttle:** the source gives a variant change list relative to the standard ship; it is flagged for subsequent variant handling rather than counted as an independent complete statblock.\n\n'
pm+='## Certification boundary and next work\n\n'
pm+='- These five books have PDF-checked printed statblock pages for their **enumerated** ship records; independent whole-book exhaustiveness is not claimed.\n'
pm+='- No source-stat hydration, weapon modeling, errata precedence decision, or cross-book canonical identity merge was performed.\n'
pm+='- **Next:** Force Unleashed Campaign Guide (19 preliminary ship entries), then Unknown Regions (12).\n'
pm+='- All changes stay local; no GitHub or production modification.\n'

census_path.write_text(json.dumps(census,ensure_ascii=False,indent=2)+'\n')
prov_path.write_text(json.dumps(prov,ensure_ascii=False,indent=2)+'\n')
census_md_path.write_text(cm)
pm_path.write_text(pm)

# Final cross-artifact and previous-state certification checks.
c_check=json.loads(census_path.read_text());p_check=json.loads(prov_path.read_text())
assert len(p_check['books'])==5
assert all(b['entries']==old_records[b['book']] for b in p_check['books'][:-1])
assert len(p_check['books'][-1]['entries'])==32
assert c_check['counts']['ship_statblock_claims']==sum(b['ship_count'] for b in c_check['books'])==314
assert sum(len(b['entries']) for b in p_check['books'])==251
assert all(e['pdfPhysicalPage']==e['printedStatblockPage']+1 for e in p_check['books'][-1]['entries'])
assert all(e['status']=='PRINTED_STATBLOCK_PAGE_PDF_CHECKED' for e in p_check['books'][-1]['entries'])
assert f'**Current progress: 251 / 314' in pm
assert f'### {BOOK} — 32' in cm
print(json.dumps({'book':BOOK,'entries':32,'newly_found':1,'distinct_printed_pages':22,'rolling_census':314,'rolling_provenance':251,'remaining':63,'previous_records_preserved':219,'files':[str(census_path),str(prov_path),str(census_md_path),str(pm_path)]},indent=2))
