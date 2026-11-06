#!/usr/bin/env python3
"""Append final nine SWSE ship-provenance book audits to rolling local files.
Source evidence: PDF statblock pages reviewed from the supplied 14 book corpus.
Do not write or upload to GitHub. Idempotent, no stat hydration.
"""
import copy
import datetime as dt
import json
import re
from pathlib import Path

ROOT=Path('/mnt/data')
C=ROOT/'swse-phase0-ship-census.json'
P=ROOT/'swse-phase1-vehicle-provenance.json'

def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')

# printed statblock-start page; optional section page and evidence note
SOURCE = {
'Force Unleashed Campaign Guide':[
 ('A-7 Hunter Interceptor',204),('Escort Carrier',207),('Gladiator-class Star Destroyer',208),
 ('Guardian-class Light Cruiser',205),('H-60 Tempest Bomber',114),('HWK-290',118),
 ('M3-A Scyk Fighter',115),('Maka-Eekai L4000 Transport',120),('Neutron Star Bulk Cruiser',121),
 ('NovaSword Space Superiority Fighter',115),('R-41 Starchaser',116),('Rogue Shadow',206),
 ('Sentinel-class Landing Shuttle',207),('Tartan-class Patrol Cruiser',209),('TIE Prototype',205),
 ('Toscan 8-Q',116),('Venator-class Star Destroyer',210),('Victory I-class Star Destroyer',211),
 ('Zebra Starfighter',118,117,'Section starts p117; CL statblock starts p118.')],
'Unknown Regions':[
 ('Hoersch-Kessel Vaya-class Scout Ship',59),('JumpMaster 5000 Scout Ship',52),
 ('Killik Dartship',133),('Kuat Drive Yards Star Seeder-class Colony Ship',58),
 ('Loronar Corporation SkyBlind Recon Ship',57),('Mesens Corporation SCT Scout Craft',56),
 ('MRX-BR Pacifier Combat/Contact Vessel',55),('Royal Fortune Light Clipper',151),
 ('Sienar Fleet Systems Mu-2 Model 2 Shuttle',55),
 ('SoroSuub Drexl-class "Planetary Defender" Starfighter',52),
 ('SoroSuub Preybird-class Starfighter',56),('Surfeik Cruiser',154)],
'Scum and Villainy':[
 ('C-wing Ugly Fighter',66),('Clutch Ugly Fighter',67),
 ('Corellian Engineering Corporation YT-1250 Transport',64),
 ('Corellian Engineering Corporation YT-1930 Transport',66),
 ('CorelliaSpace Gymsnor-3 Light Freighter',62),('Errant Venture',128,127,'Section starts p127; CL statblock is on p128.'),
 ('Kaloth-style Battlecruiser',126),('Kazellis Corporation Light Freighter',62),
 ('Surronian Conqueror-class Assault Ship',64),('X-TIE Ugly Fighter',67),
 ('Y164 Thalassian Slave Transport',127)],
'Core Rulebook':[
 ('ARC-170 Starfighter',180),('Corellian YT-1300 Transport',182),
 ('Droid Tri-Fighter',181),('Eta-2 Actis Interceptor',180),
 ('Imperial I-class Star Destroyer',183),('Incom T-65B X-wing Starfighter',178),
 ('Koensayr Y-wing Starfighter',178),('TIE Fighter',179),
 ('TIE Interceptor',179),('Vulture-class Droid Starfighter',180)],
'Galaxy at War':[
 ('Corona-class Armed Transport',67,66,'Section calls this ship Corona-class Armed Frigate; CL17 record labels it Armed Transport.'),
 ('Imperial Landing Craft',64),('Koensayr ILH-KK Citadel-class Cruiser',192,192,'Adventure fixture explicitly states baseline stats from Starships of the Galaxy; source record remains distinct.'),
 ('Penumbra-class Attack Shuttle',65),('YU-410 Light Freighter',65)],
'Galaxy of Intrigue':[
 ('Modified Incom A-24 Sleuth',69,68,'Section p68, CL statblock p69.'),
 ('Modified Sienar Fleet Systems Lambda-class Shuttle',186),
 ('PTV-2100 Incarcerator',68),
 ('Sabaoth Frigate Spy Ship',71,70,'Section p70, CL statblock p71.'),
 ('Republic Engineering Corporation Ferret-class Reconnaissance Vessel',69,69,'Newly discovered independent CL12 statblock; absent from initial census.'),
 ('Republic Engineering Corporation Prowler-class Reconnaissance Vessel',70,70,'Newly discovered independent CL12 statblock; absent from initial census.')],
'Jedi Academy Training Manual':[("Chu'unthor",151,150,'Description starts p150; CL15 station-scale capital-ship statblock p151.')],
'Threats of the Galaxy':[('CEC VCX-350 Light Freighter',89,89,'Appears alongside Talon Karrde material, not a dedicated starship chapter.')],
"Scavenger's Guide to Droids":[],
}
BOOK_PREFIX={'Force Unleashed Campaign Guide':'fucg','Unknown Regions':'ur','Scum and Villainy':'sav','Core Rulebook':'core','Galaxy at War':'gaw','Galaxy of Intrigue':'goi','Jedi Academy Training Manual':'jatm','Threats of the Galaxy':'tog',"Scavenger's Guide to Droids":'sgtd'}
BOOK_NOTES={
'Force Unleashed Campaign Guide':[
 'Two distinct blocks of published ship statblocks: printed pp114-121 and pp204-211. Both inventoried.',
 'Toscan 8-Q has its own CL8 printed statblock on p116; not just narrative commentary.',
 'Guardian-class section and CL11 statblock both begin p205.'
],
'Unknown Regions':[
 'Corrected Drexi to Drexl from the printed Drexl-class section and CL10 statblock (p52).',
 'SkyBlind and Star Seeder occur on pp57-58; Landing Sphere (p58) is an air vehicle and outside the ship tally.',
 'The later faction ships Killik Dartship (p133), Royal Fortune (p151) and Surfeik Cruiser (p154) are included.'
],
'Scum and Villainy':[
 'OCR extraction is degraded; printed pp62-67 and pp126-128 were checked against the image-based PDF.',
 'Kaloth-style Battlecruiser p126, Y164 Slave Transport p127, and named Errant Venture p128 remain independent entries.',
 'C-wing, Clutch, and X-TIE are independent ugly-fighter statblocks, not a generic shared entry.'
],
'Core Rulebook':[
 'Core starship entries occur on printed pp178-183; ground walkers, speeders and other land vehicles are not included in this ship-only tally.',
 'The printed Y-wing and X-wing records are preserved independently of later-book publications.'
],
'Galaxy at War':[
 'The Corona section says Armed Frigate but the statblock identifies Armed Transport; preserve printed CL-block identity.',
 'The Citadel-class cruiser on p192 is a baseline adventure fixture explicitly referencing Starships of the Galaxy. Keep the source entry, but flag its derivative status for identity reconciliation.'
],
'Galaxy of Intrigue':[
 'New census discoveries: Ferret-class Reconnaissance Vessel (p69) and Prowler-class Reconnaissance Vessel (p70), both with complete CL12 statblocks.',
 'The modified Lambda-class shuttle on p186 is a distinct modified-source claim, not a replacement for the Starships of the Galaxy baseline.',
 'PTV-2100, modified A-24 Sleuth, and Sabaoth frigate occur pp68-71, including section/statblock page differences.'
],
'Jedi Academy Training Manual':["Chu'unthor is printed as a Colossal (station) capital ship (p151); do not exclude merely because its size subtype says station."],
'Threats of the Galaxy':['CEC VCX-350 is a fully printed ship statblock p89 within named NPC material; the previous zero-ship census was corrected in Phase 0.'],
"Scavenger's Guide to Droids":["No ordinary ship statblock is in this rolling ship census. DP-2 Probe Droid remains a separately tracked droid-vehicle/hybrid source claim; it belongs in the later universal vehicle/droid-vehicle provenance track."],
}

def main():
 census=json.loads(C.read_text());prov=json.loads(P.read_text())
 assert len(prov['books'])>=5
 original_five=copy.deepcopy(prov['books'][:5]);assert sum(len(b['entries']) for b in original_five)==251
 for b in original_five:
  assert b['book'] not in SOURCE
  assert b['enteredCount']==len(b['entries'])
 # From core census adjust confirmed printer names and additions only.
 cib={b['book']:b for b in census['books']}
 ur=cib['Unknown Regions']['ships']
 old='SoroSuub Drexi-class "Planetary Defender" Starfighter';new='SoroSuub Drexl-class "Planetary Defender" Starfighter'
 if old in ur:ur[ur.index(old)]=new
 goi=cib['Galaxy of Intrigue']['ships']
 for name in ['Republic Engineering Corporation Ferret-class Reconnaissance Vessel','Republic Engineering Corporation Prowler-class Reconnaissance Vessel']:
  if name not in goi:goi.append(name)
 for book,items in SOURCE.items():
  c=cib[book];c['ships'].sort(key=str.casefold);c['ship_count']=len(c['ships'])
  assert len(c['ships'])==len(items),(book,len(c['ships']),len(items))
  assert set(c['ships'])==set(x[0] for x in items),(book,sorted(set(c['ships'])^set(x[0] for x in items)))
  c['review_status']='PHASE1_PRINTED_STATBLOCK_PAGES_PDF_CHECKED' if items else 'NO_SHIPS_IN_ROLLING_SHIP_CENSUS_REVIEWED'
 census['counts']['ship_statblock_claims']=sum(b['ship_count'] for b in census['books'])
 assert census['counts']['ship_statblock_claims']==316
 census['generated_utc']=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
 census['review_notes'] += [
  'Phase 1 final-book review: Unknown Regions Drexi corrected to printed Drexl-class; Galaxy of Intrigue Ferret and Prowler independent CL12 ships added at pp69 and 70. Overall 314->316.',
  'Phase 1 ship census is a list of enumerated printed ship statblocks; zero counts for Scavenger\'s Guide do not certify absence of droid-vehicles or ground vehicle rules.'
 ]
 census['review_notes']=list(dict.fromkeys(census['review_notes']))
 existing={b['book']:b for b in prov['books']}
 generated=[]
 for book in [b['book'] for b in census['books'] if b['book'] in SOURCE]:
  items=SOURCE[book];rows=[]
  for x in sorted(items,key=lambda z:z[0].casefold()):
   name,page=x[:2]; section=x[2] if len(x)>2 else page; note=x[3] if len(x)>3 else None
   rows.append({
     'sourceEntryKey':BOOK_PREFIX[book]+'-'+slug(name),
     'book':book,'shipName':name,'printedStatblockPage':page,'pdfPhysicalPage':page+1,
     'sectionStartPage':section,'variantFamilyHint':None,
     'identityDisposition':'PRESERVE_AS_SEPARATE_PUBLICATION_ENTRY',
     'pageEvidence':{'pageAssignmentBasis':'RENDERED_SOURCE_PDF_PAGE_REVIEW',
       'txtLookupMethod':'PDF_VISUAL_STATBLOCK_START_CHECK_AND_SOURCE_TXT_CROSSREFERENCE',
       'pdfVisualCheckComplete':True},
     'status':'PRINTED_STATBLOCK_PAGE_PDF_CHECKED','reviewNotes':[note] if note else []
   })
  assert len(rows)==len(set(z['sourceEntryKey'] for z in rows))
  generated.append({'book':book,'reportedCensusCount':len(rows),'enteredCount':len(rows),
    'bookAuditStatus':'PRINTED_STATBLOCK_PAGES_PDF_CHECKED' if rows else 'ZERO_SHIP_ENTRIES_REVIEWED',
    'entries':rows,'reviewFindings':BOOK_NOTES[book]})
 all_books=original_five+generated
 assert len(all_books)==14, [b['book'] for b in all_books]
 assert sum(len(b['entries']) for b in all_books)==316
 prov['books']=all_books
 prov['remainingBooks']=[]
 prov['status']='PHASE1_BOOK_BY_BOOK_SHIP_PAGE_PROVENANCE_COMPLETE_ENUMERATED_ENTRIES'
 prov['asOfUtc']=census['generated_utc']
 prov['census']['allBooksShipClaims']=316
 prov['summary'].update({
  'sourcebooksInPhase1':14,'sourcebookEntriesInPhase1':316,'remainingShipCensusEntries':0,
  'printPageAssignments':316,'pdfPageVisuallyCheckedEntries':316,
  'distinctPrintedStatblockPagesChecked':sum(len(set(e['printedStatblockPage'] for e in b['entries'])) for b in all_books),
  'entriesWithReviewNote':sum(bool(e.get('reviewNotes')) for b in all_books for e in b['entries']),
  'fullCrossBookIdentityReconciliationComplete':False,
  'zeroShipCensusBooksReviewed':1
 })
 for b in generated:
  book=b['book'];prov['policy']['pdfPageOffsetByBook'][book]=1
  prov['policy']['pdfVisualCheckScopeByBook'][book]=(f"{len(b['entries'])} enumerated entries; rendered statblock-start pages reviewed; whole-book exhaustiveness not independently established." if b['entries'] else 'Zero ordinary ship entries in this census; droid-vehicles tracked outside this ship tally.')
 prov['policy']['pdfPageOffset']='For all fourteen books audited, physical PDF page is printed page +1 for the statblock-page references used.'
 prov['policy']['pdfVisualCheckScope']='All 316 listed ship statblock-start pages have been reviewed against the supplied PDF pages; this audits enumerated publication records, not a guaranteed exhaustive independent book-wide search.'
 prov['policy']['sourceClaimScope']='Ship statblocks, including separately published named configurations and some separately statblocked ship components. Not a full census of ground/air vehicles and droid-vehicles.'
 prov['auditFlags'] += [
  {'book':'Galaxy of Intrigue','code':'TWO_CENSUS_OMISSIONS_CONFIRMED', 'detail':'Ferret-class and Prowler-class CL12 reconnaissance vessels on pp69-70; total 314 -> 316.'},
  {'book':'Unknown Regions','code':'OCR_MODEL_NAME_CORRECTED','detail':'Drexl-class, not Drexi-class (p52).'},
  {'book':'Galaxy at War','code':'DERIVATIVE_BASELINE_STARSHIP_STATBLOCK','shipName':'Koensayr ILH-KK Citadel-class Cruiser','detail':'Adventure p192 reprints baseline from Starships of the Galaxy and instructs GM to adjust abilities; keep publication row until phase identity reconciliation.'},
  {'book':"Scavenger's Guide to Droids",'code':'SHIP_SCOPE_EXCLUSION','detail':'DP-2 probe droid hybrid is separately tracked, not included in ordinary starship tally; should enter later universal vehicle provenance.'},
  {'book':'Jedi Academy Training Manual','code':'STATION_SUBTYPE_AS_SHIP','detail':"Chu'unthor has published Colossal (station) capital ship statblock; included in ship census by printed classification."}
 ]
 # cross-artifact + source-page checks
 assert all(len(set(x['sourceEntryKey'] for x in b['entries']))==len(b['entries']) for b in all_books)
 assert len({e['sourceEntryKey'] for b in all_books for e in b['entries']})==316
 assert all(e['printedStatblockPage']>=1 and e['pdfPhysicalPage']==e['printedStatblockPage']+1 for b in all_books for e in b['entries'])
 assert all(b==v for b,v in zip(prov['books'][:5],original_five))
 C.write_text(json.dumps(census,ensure_ascii=False,indent=2)+'\n')
 P.write_text(json.dumps(prov,ensure_ascii=False,indent=2)+'\n')
 # Derive both Markdown docs from the machine-readable authority; do not manually maintain count cells.
 cm=['# SWSE Phase 0 — Rolling Ship/Starship Statblock Census','',
   f'**Scope:** {census["scope"]}','',
   f'**Census: {census["counts"]["ship_statblock_claims"]} publication entries, 14 books.** These are not unique chassis.','',
   '> Phase 1 has checked the page location of each enumerated ship record. This does not certify independent whole-book exhaustiveness or include ground vehicles and droid-vehicles.','',
   '## Counts by book (descending)','', '| Sourcebook | Ship entries | Phase 1 state |','|---|---:|---|']
 for b in sorted(census['books'],key=lambda z:-z['ship_count']):
  cm.append(f"| {b['book']} | {b['ship_count']} | {'Page checked' if b['ship_count'] else 'No ordinary ship entries'} |")
 cm += ['','## Full enumeration','']
 for b in sorted(census['books'],key=lambda z:-z['ship_count']):
  cm += [f"### {b['book']} — {b['ship_count']}",'']
  cm += ['- '+x for x in b['ships']] if b['ships'] else ['No ordinary ship statblocks indexed in this ship-only census.']
  cm += ['']
 cm += ['## Separate, out-of-scope space/vehicle entries','']
 for category,its in census.get('outside_ship_tally',{}).items():
  cm += [f'### {category.replace("_"," ").title()}','']+[f"- {a['book']} — {a['name']}" for a in its]+['']
 cm += ['## Rolling review notes','']+['- '+x for x in census.get('review_notes',[])]+['','**No GitHub uploads or commits.**','']
 (ROOT/'swse-phase0-ship-census.md').write_text('\n'.join(cm))
 pm=['# SWSE Phase 1 — Rolling Ship/Vehicle Publication Provenance','',
  f'**Status:** `{prov["status"]}` · Updated {prov["asOfUtc"]}','',
  f'**Progress: 316 / 316 enumerated ship publication records page-checked, 14 / 14 books reviewed.**','',
  'The scope is the Phase 0 **ship** census, not a universal ground-vehicle census. Publication variants and same-name reprints are distinct source claims. Printed statblock page takes precedence over section-start page.','',
  '## Book summary','', '| Book | Entries | PDF-check status |','|---|---:|---|']
 for b in prov['books']:
  pm.append(f"| {b['book']} | {len(b['entries'])} | {'PDF statblock page checked' if b['entries'] else 'Zero ordinary ship entries'} |")
 pm += ['','## Book-by-book provenance','']
 for number,b in enumerate(prov['books'],1):
  pm += [f"### Book {number}: {b['book']} — {len(b['entries'])} entries",'',
    '| # | Printed ship identity | Statblock page | Section page | Notes |',
    '|---:|---|---:|---:|---|']
  for i,e in enumerate(b['entries'],1):
   note='; '.join(e['reviewNotes']).replace('|','\\|') or '—'
   pm.append(f"| {i} | {e['shipName'].replace('|','\\|')} | {e['printedStatblockPage']} | {e.get('sectionStartPage') or '—'} | {note} |")
  if not b['entries']: pm.append('| — | No ordinary ship statblock in ship census | — | — | DP-2 tracked separately |')
  pm += ['','**Book findings:**','']+['- '+x for x in b.get('reviewFindings', ['See original PDF-page provenance and per-entry review notes.'])]+['']
 pm += ['## Phase 1 certification boundary','',
  '- All **316 enumerated ship statblock entries** have sourcebook and printed-page assignments from the source PDFs.',
  '- The initial census was refined during source review; two Galaxy of Intrigue ships and the previously identified Diamond and Derriphan records were added in their respective passes.',
  '- These 316 are **book-publication claims**, not unique ship identities. Cross-book identity reconciliation remains later work.',
  '- Whole-book exhaustiveness, especially for OCR-degraded materials, is not guaranteed by this pagination pass.',
  '- The universal-vehicle scope still needs a separate ground/air/station/droid-vehicle enumeration; the DP-2 is deliberately outside this ship tally.',
  '- No canonical mechanical statistics, weapon details, rules, or Foundry compendiums were changed.',
  '- Nothing was uploaded or committed to GitHub.','']
 (ROOT/'swse-phase1-vehicle-provenance.md').write_text('\n'.join(pm))
 # sourcebook-specific evidence flag report
 report={
  'status':'PHASE1_ENUMERATED_SHIP_PAGES_COMPLETE','sourcebooks':14,
  'ship_publication_entries':316,'first_five_preserved':251,
  'final_nine_appended':65,'unverified_ship_page_assignments':0,
  'two_new_Galaxy_of_Intrigue_ships':['Ferret-class Reconnaissance Vessel','Prowler-class Reconnaissance Vessel'],
  'name_correction':{'book':'Unknown Regions','from':'Drexi','to':'Drexl','printed_page':52},
  'scope_limits':['ship-only, not ground/air/droid-vehicle universal coverage','whole-book independent exhaustive discovery not asserted','cross-book identity reconciliation pending','mechanical hydration not performed'],
  'counts_by_book':[{'book':b['book'],'entries':len(b['entries']),'distinct_pages':len(set(e['printedStatblockPage'] for e in b['entries']))} for b in prov['books']],
 }
 (ROOT/'swse-phase1-completion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(report,indent=2))

if __name__=='__main__':main()
