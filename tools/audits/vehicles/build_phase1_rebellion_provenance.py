#!/usr/bin/env python3
"""Append Rebellion Era PDF-page-checked provenance to rolling Phase 1 files.

This script uses explicitly reviewed printed statblock-start pages, NOT
statistic scraping or a guessed text-page offset. Existing source entries
are carried forward without changing their data.
"""
from __future__ import annotations
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import copy
import json
import re

ROOT=Path('/mnt/data')
P1_PATH=ROOT/'swse-phase1-vehicle-provenance.json'
P1_MD=ROOT/'swse-phase1-vehicle-provenance.md'
C0_PATH=ROOT/'swse-phase0-ship-census.json'
C0_MD=ROOT/'swse-phase0-ship-census.md'
BOOK='Rebellion Era Campaign Guide'
PREF='re'

# (census name, printed statblock page, printed section start page, family hint, review notes)
REVIEWED=[
 ('AEG-77 "Vigo" Gunship',146,146,None,[]),
 ('Assassin-class Corvette',130,130,None,[]),
 ('Assault Gunboat',131,131,None,[]),
 ('Corellian Engineering Corporation YM-2800 Limpet Ship',114,113,None,['Ship description and heading begin p113; full CL 7 statblock begins p114.']),
 ('Corellian YV-545',69,69,None,[]),
 ('G1-M4-C Dunelizard Fighter',63,63,None,['Printed body identifies the craft as a starfighter even though the appendix also lists it in the vehicle table. The model prefix is G1, not OCR GI.']),
 ('Hoersch-Kessel T-Wing Interceptor',114,114,None,[]),
 ('Imperial Cargo Ship',132,132,None,[]),
 ('Imperial II-class Frigate',133,132,None,['The frigate section begins p132; its printed CL 17 statblock begins p133. Not the Imperial II-class Star Destroyer from another book.']),
 ('Incom X4 Gunship',115,115,None,[]),
 ('IRD Starfighter',156,156,'ird-starfighter',['Printed IRD statblock is separate from the IRD-A statblock on the same page.']),
 ('IRD-A Starfighter',156,156,'ird-starfighter',['Printed IRD-A statblock is separate from the IRD statblock on the same page.']),
 ('Ixiyen-class Fast Attack Craft',64,63,None,['Section and art begin p63; printed ship statblock begins p64.']),
 ('Keldabe-class Battleship',154,154,None,[]),
 ('Kihraxz Light Fighter',146,146,'kihraxz',['The source describes the Vaksai as a modified Kihraxz, but prints distinct CL/ship statblocks.']),
 ('M12-L Kimogila Heavy Fighter',64,64,None,[]),
 ('M22-T Krayt Gunship',65,65,None,[]),
 ('Missile Boat',134,134,None,[]),
 ('Mobquet Medium Transport',68,67,None,['Model description begins p67; ship statblock begins p68.']),
 ('Pinook Fighter',66,66,None,[]),
 ('Razor-class Fighter',66,66,None,['Its statblock begins on p66 and continues on p67.']),
 ('Rihkxyrk Assault Fighter',148,148,None,[]),
 ('Royal Guard Starfighter',134,134,None,[]),
 ('Supa Fighter',147,147,None,[]),
 ('TIE Aggressor',135,135,None,[]),
 ('TIE Experimental M2',136,136,'tie-experimental',['The M2 and M3 have distinct printed statblocks on p136.']),
 ('TIE Experimental M3',136,136,'tie-experimental',['The M2 and M3 have distinct printed statblocks on p136.']),
 ('TIE Oppressor',136,136,None,[]),
 ('TIE Phantom',137,137,None,['Statblock begins p137 and continues on the facing page.']),
 ('TIE Scout',138,138,None,[]),
 ('TIE Shuttle',138,138,None,[]),
 ('Vaksai',147,147,'kihraxz',['The source calls the Vaksai a modified Kihraxz; it has its own distinct statblock.']),
 ('VT-49 Decimator',139,139,None,[]),
 ('YE-4 Gunship',139,139,None,[]),
 ('YKL-37R Nova Courier',69,68,None,['Section text begins p68; CL 8 statblock begins p69.']),
]

# All pages explicitly examined as PDF page images for this book, including
# contiguous spreads around statblocks and notable exclusions.
PDF_REVIEWED_PAGES=sorted(set(
 list(range(59,71))+list(range(109,117))+list(range(129,141))+list(range(144,157))
))
EXCLUSIONS=[
 ('TIE Crawler',135,'Ground vehicle statblock, not an independent spacefaring ship.'),
 ('TIE ap-1 Mauler',135,'Ground vehicle variant/statblock; do not count as a starship.'),
 ('LV-38 Spotter/Probe Droid',110,'Published as a droid NPC statblock, not a vehicle/ship; appendix column placement is misleading.'),
 ('Loratus MPTL-2A Mobile Proton Torpedo Launcher',110,'Mobile weapon emplacement, not a ship.'),
]


def slug(value:str)->str:
    value=value.lower().replace('"','').replace('“','').replace('”','').replace('’','')
    return re.sub(r'-+','-',re.sub('[^a-z0-9]+','-',value)).strip('-')


def dump_json(path, value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def run():
    provenance=json.loads(P1_PATH.read_text(encoding='utf-8'))
    census=json.loads(C0_PATH.read_text(encoding='utf-8'))
    old_entries=copy.deepcopy([x for b in provenance['books'] for x in b['entries']])
    assert [b['book'] for b in provenance['books']]==['Starships of the Galaxy','Clone Wars Campaign Guide','Legacy Era Campaign Guide'], 'Expected original three-book checkpoint; refusing re-append'
    book_census=next(x for x in census['books'] if x['book']==BOOK)
    census_names=book_census['ships']
    assert len(census_names)==35 and book_census['ship_count']==35
    names=[row[0] for row in REVIEWED]
    assert len(REVIEWED)==35 and len(set(names))==35
    assert set(census_names)==set(names),(set(census_names)-set(names),set(names)-set(census_names))
    assert names==census_names,'Keep records in census-defined order'
    assert sum(x['enteredCount'] for x in provenance['books'])==len(old_entries)==184
    entries=[]
    for name,page,section,family,notes in REVIEWED:
        assert page in PDF_REVIEWED_PAGES, (name,page)
        assert 0<page<=160 and section<=page
        key=f'{PREF}-{slug(name)}'
        entries.append({
            'sourceEntryKey':key,
            'book':BOOK,
            'shipName':name,
            'printedStatblockPage':page,
            'sectionStartPage':section,
            'pdfPhysicalPage':page+1,
            'pageEvidence':{
                'pageAssignmentBasis':'RENDERED_SOURCE_PDF_PAGE_REVIEW',
                'pdfVisualCheckComplete':True,
                'txtLookupMethod':'SOURCE_TXT_STATBLOCK_AND_BOOK_INDEX_RECONCILIATION',
            },
            'status':'PRINTED_STATBLOCK_PAGE_PDF_CHECKED',
            'identityDisposition':'PRESERVE_AS_SEPARATE_PUBLICATION_ENTRY',
            'variantFamilyHint':family,
            'reviewNotes':notes,
        })
    assert len(set(x['sourceEntryKey'] for x in entries))==len(entries)
    assert not set(x['sourceEntryKey'] for x in old_entries) & set(x['sourceEntryKey'] for x in entries)
    provenance['books'].append({
        'book':BOOK,
        'reportedCensusCount':35,
        'enteredCount':35,
        'bookAuditStatus':'PDF_CHECKED_ENUMERATED_STATBLOCK_PAGES; FULL_INDEPENDENT_CENSUS_NOT_CERTIFIED',
        'entries':entries,
    })
    for r in provenance['remainingBooks']:
        assert r['book']!=BOOK or r['censusCount']==35
    provenance['remainingBooks']=[r for r in provenance['remainingBooks'] if r['book']!=BOOK]
    new_entries=[x for b in provenance['books'] for x in b['entries']]
    assert new_entries[:184]==old_entries,'Old three books changed!'
    assert len(new_entries)==219
    summary=provenance['summary']
    summary['sourcebooksInPhase1']=4
    summary['sourcebookEntriesInPhase1']=219
    summary['remainingShipCensusEntries']=census['counts']['ship_statblock_claims']-219
    summary['printPageAssignments']=219
    summary['pdfPageVisuallyCheckedEntries']=219
    summary['distinctPrintedStatblockPagesChecked']+=len(set(x['printedStatblockPage'] for x in entries))
    summary['entriesWithReviewNote']=sum(bool(x['reviewNotes']) for x in new_entries)
    summary['entriesWithOCRReviewNote']=sum(any('OCR' in n for n in x['reviewNotes']) for x in new_entries)
    policy=provenance['policy']
    policy['pdfPageOffset']='For the four finished books, physical PDF page = printed page + 1.'
    policy['pdfVisualCheckScope']='All indexed statblock-start pages were visually checked in rendered PDF for the four finished books. This does not establish a full independent census of unindexed statblocks.'
    policy['pdfPageOffsetByBook'][BOOK]=1
    policy['pdfVisualCheckScopeByBook'][BOOK]=f'35 listed source records on {len(set(x["printedStatblockPage"] for x in entries))} distinct printed statblock pages; adjacent contents, ship model variants and ground-vehicle/droid exclusions reviewed visually.'
    provenance['asOfUtc']=datetime.now(timezone.utc).isoformat(timespec='seconds')
    provenance['auditFlags'].extend([
        {'book':BOOK,'code':'SECTION_PAGE_DIFFERS_FROM_STATBLOCK_PAGE','detail':'YM-2800 p113→114; Ixiyen p63→64; Mobquet p67→68; YKL-37R p68→69; Imperial II-class Frigate p132→133. Recorded the statblock-start page as the primary page.'},
        {'book':BOOK,'code':'PUBLISHED_VARIANTS_PRESERVED','detail':'TIE Experimental M2/M3 share p136; IRD/IRD-A share p156; Kihraxz/Vaksai are linked by model-family hint but remain separate source entries.'},
        {'book':BOOK,'code':'SOURCE_CLASSIFICATION_SCOPE','detail':'TIE Crawler and TIE ap-1 Mauler (p135) are ground-vehicle statblocks, not ship-count entries. LV-38 Spotter/Probe Droid (p110) is a droid NPC even though the appendix juxtaposes it with a starship list.'},
        {'book':BOOK,'code':'NAME_AND_OCR_REVIEW','detail':'PDF spells G1-M4-C Dunelizard (digit 1), not GI-M4-C; printed frigate name is Imperial II-class Frigate, not the separately published Star Destroyer.'},
        {'book':BOOK,'code':'CENSUS_NO_COUNT_CHANGE','detail':'All 35 listed Rebellion Era entries found and page-checked. No additional independent ship statblock discovered in the reviewed sections.'},
    ])
    book_census['review_status']='PAGES_REVIEWED_IN_PHASE_1'
    # Markdown: carry over the previous first three book sections verbatim.
    old_md=P1_MD.read_text(encoding='utf-8')
    m=re.search(r'(?m)^## Certification boundary and next work',old_md)
    assert m,'Expected old markdown footer'
    prior_sections=old_md[old_md.index('## Book 1:'):m.start()]
    coverage=[
        '# SWSE Phase 1 — Rolling Vehicle/Starship Publication Provenance',
        '',f'**Status:** `ROLLING_BOOK_BY_BOOK_PDF_PAGE_CHECKED` · Updated {provenance["asOfUtc"]}',
        '', '## Coverage','',
        '| Sourcebook | Phase 0 census | Phase 1 entries | State |',
        '|---|---:|---:|---|',
    ]
    counts={b['book']:b['enteredCount'] for b in provenance['books']}
    for cb in census['books']:
        done=counts.get(cb['book'],0)
        status='Statblock pages PDF-checked' if done else 'Not started'
        coverage.append(f'| {cb["book"]} | {cb["ship_count"]} | {done} | {status} |')
    coverage += [
        '',f'**Current progress: 219 / {census["counts"]["ship_statblock_claims"]} publication entries indexed ({219/census["counts"]["ship_statblock_claims"]:.1%}).**',
        '',
        'Counts are book-level publication statblock claims, not unique chassis. Variant family hints do not merge different source entries. Listed pages identify **where the statblock begins**, not necessarily where the preceding section begins. Physical PDF pages are printed + 1 for these four books.',
        '',
    ]
    section=[
        f'## Book 4: {BOOK}',
        '',
        '**35 / 35** preliminary census entries PDF-page-checked on **23** distinct printed pages.',
        '',
        '| # | Publication entry | Printed statblock page | Evidence | Variant family hint |',
        '|---:|---|---:|---|---|',
    ]
    for i,entry in enumerate(entries,1):
        hint=entry['variantFamilyHint'] or '—'
        section.append(f'| {i} | {entry["shipName"]} | {entry["printedStatblockPage"]} | PDF checked | {hint} |')
    section += [
        '', '**Rebellion Era source-review findings:**','',
        '- **Five section/statblock offsets:** YM-2800 p113→114, Ixiyen p63→64, Mobquet p67→68, YKL-37R p68→69, and Imperial II-class Frigate p132→133.',
        '- **Distinct variants:** TIE Experimental M2/M3 (p136), IRD/IRD-A (p156), and Kihraxz/Vaksai (pp146–147) remain separate publication entries.',
        '- **Name check:** The printed starfighter is **G1-M4-C** (number one), rather than the OCR variant GI-M4-C. The Imperial II-class **Frigate** is not an Imperial II-class Star Destroyer.',
        '- **Excluded nonships:** TIE Crawler and TIE ap-1 Mauler (p135) are ground vehicles. The LV-38 Spotter/Probe Droid (p110) is printed as a droid NPC; the mobile proton torpedo launcher (p110) is an emplacement.',
        '- **No ship-count adjustment:** All 35 previously indexed ship records were found; total remains 313 publication entries.',
        '',
    ]
    closing=[
        '## Certification boundary and next work','',
        '- These four books have PDF-checked printed statblock pages for their **enumerated** ship records; independent whole-book exhaustiveness is not claimed.',
        '- No source-stat hydration, weapon modeling, errata precedence decision, or cross-book canonical identity merge was performed.',
        '- **Next:** Knights of the Old Republic Campaign Guide (31 preliminary ship entries), then Force Unleashed Campaign Guide (19).',
        '- All changes stay local; no GitHub or production modification.','',
    ]
    updated_md='\n'.join(coverage)+'\n'+prior_sections.rstrip()+'\n\n'+'\n'.join(section+closing)
    assert updated_md.count('## Book 4:')==1
    assert prior_sections.startswith('## Book 1:')
    census_md=C0_MD.read_text(encoding='utf-8')
    original='| 4 | Rebellion Era Campaign Guide | 35 | Preliminary |'
    assert census_md.count(original)==1
    census_md=census_md.replace(original,'| 4 | Rebellion Era Campaign Guide | 35 | Pages reviewed in Phase 1 |')
    # Do not edit census total or listed entries.
    assert sum(b['ship_count'] for b in census['books'])==313
    assert sum(b['enteredCount'] for b in provenance['books'])==219
    assert summary['distinctPrintedStatblockPagesChecked']==176
    dump_json(P1_PATH,provenance)
    P1_MD.write_text(updated_md,encoding='utf-8')
    dump_json(C0_PATH,census)
    C0_MD.write_text(census_md,encoding='utf-8')
    report={
        'book':BOOK,'status':'ENUMERATED_PDF_PAGE_CHECKED','entries':35,
        'distinctStatblockPages':len(set(e['printedStatblockPage'] for e in entries)),
        'printedStatblockPages':sorted(set(e['printedStatblockPage'] for e in entries)),
        'physicallyReviewedPrintedPages':PDF_REVIEWED_PAGES,
        'excludedNonshipStatblocks':[{'name':n,'page':p,'reason':reason} for n,p,reason in EXCLUSIONS],
        'existingEntriesPreserved':len(old_entries),'priorCensus':313,'updatedCensus':313,
        'phase1Cumulative':219,'remaining':94,
        'nextBook':'Knights of the Old Republic Campaign Guide',
        'sourceBasis':['Rebellion Era Campaign Guide_djvu.txt','Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf'],
        'certificationBoundary':'Page-and-name provenance for enumerated records only; independent whole-book exhaustiveness and full cross-publication identity reconciliation remain open.'
    }
    dump_json(ROOT/'swse-phase1-rebellion-checkpoint.json',report)
    print(json.dumps({k:report[k] for k in ['entries','distinctStatblockPages','existingEntriesPreserved','priorCensus','updatedCensus','phase1Cumulative','remaining','nextBook']},indent=2))

if __name__=='__main__':run()
