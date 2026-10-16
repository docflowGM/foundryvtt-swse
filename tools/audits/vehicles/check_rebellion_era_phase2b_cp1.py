#!/usr/bin/env python3
"""Rebellion Era Phase2B CP1 audit gate: 10 printed-source reviews / 35 identities.
Run: python tools/audits/vehicles/check_rebellion_era_phase2b_cp1.py --source-pdf /path/to/Rebellion.pdf
Optionally pass --phase1 path/to/swse-phase1-vehicle-provenance.json for exact remote Phase1 comparison.
Audit only: this is not an authorization to write production packs or certify complete physical mounts.
"""
import argparse, hashlib, json, pathlib, sys
BOOK='Rebellion Era Campaign Guide'
SOURCE_SHA='60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8'
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
EXPECTED={'re-g1-m4-c-dunelizard-fighter': ('G1-M4-C Dunelizard Fighter', 63, 64, 63), 're-ixiyen-class-fast-attack-craft': ('Ixiyen-class Fast Attack Craft', 64, 65, 63), 're-m12-l-kimogila-heavy-fighter': ('M12-L Kimogila Heavy Fighter', 64, 65, 64), 're-m22-t-krayt-gunship': ('M22-T Krayt Gunship', 65, 66, 65), 're-pinook-fighter': ('Pinook Fighter', 66, 67, 66), 're-razor-class-fighter': ('Razor-class Fighter', 66, 67, 66), 're-mobquet-medium-transport': ('Mobquet Medium Transport', 68, 69, 67), 're-corellian-yv-545': ('Corellian YV-545', 69, 70, 69), 're-ykl-37r-nova-courier': ('YKL-37R Nova Courier', 69, 70, 68), 're-corellian-engineering-corporation-ym-2800-limpet-ship': ('Corellian Engineering Corporation YM-2800 Limpet Ship', 114, 115, 113), 're-hoersch-kessel-t-wing-interceptor': ('Hoersch-Kessel T-Wing Interceptor', 114, 115, 114), 're-incom-x4-gunship': ('Incom X4 Gunship', 115, 116, 115), 're-assassin-class-corvette': ('Assassin-class Corvette', 130, 131, 130), 're-assault-gunboat': ('Assault Gunboat', 131, 132, 131), 're-imperial-cargo-ship': ('Imperial Cargo Ship', 132, 133, 132), 're-imperial-ii-class-frigate': ('Imperial II-class Frigate', 133, 134, 132), 're-missile-boat': ('Missile Boat', 134, 135, 134), 're-royal-guard-starfighter': ('Royal Guard Starfighter', 134, 135, 134), 're-tie-aggressor': ('TIE Aggressor', 135, 136, 135), 're-tie-experimental-m2': ('TIE Experimental M2', 136, 137, 136), 're-tie-experimental-m3': ('TIE Experimental M3', 136, 137, 136), 're-tie-oppressor': ('TIE Oppressor', 136, 137, 136), 're-tie-phantom': ('TIE Phantom', 137, 138, 137), 're-tie-scout': ('TIE Scout', 138, 139, 138), 're-tie-shuttle': ('TIE Shuttle', 138, 139, 138), 're-vt-49-decimator': ('VT-49 Decimator', 139, 140, 139), 're-ye-4-gunship': ('YE-4 Gunship', 139, 140, 139), 're-aeg-77-vigo-gunship': ('AEG-77 "Vigo" Gunship', 146, 147, 146), 're-kihraxz-light-fighter': ('Kihraxz Light Fighter', 146, 147, 146), 're-supa-fighter': ('Supa Fighter', 147, 148, 147), 're-vaksai': ('Vaksai', 147, 148, 147), 're-rihkxyrk-assault-fighter': ('Rihkxyrk Assault Fighter', 148, 149, 148), 're-keldabe-class-battleship': ('Keldabe-class Battleship', 154, 155, 154), 're-ird-a-starfighter': ('IRD-A Starfighter', 156, 157, 156), 're-ird-starfighter': ('IRD Starfighter', 156, 157, 156)}
REVIEWED=['re-g1-m4-c-dunelizard-fighter', 're-ixiyen-class-fast-attack-craft', 're-m12-l-kimogila-heavy-fighter', 're-m22-t-krayt-gunship', 're-pinook-fighter', 're-razor-class-fighter', 're-mobquet-medium-transport', 're-corellian-yv-545', 're-ykl-37r-nova-courier', 're-corellian-engineering-corporation-ym-2800-limpet-ship']
STATES={'PDF_VERIFIED','SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED','SCHEMA_INCOMPATIBLE','NOT_REVIEWED'}
FILES={
'ledger':'data/audits/vehicles/swse-phase2b-rebellion-era-cp1-per-entry-source-review-ledger.json',
'backlog':'data/audits/vehicles/swse-phase2b-rebellion-era-cp1-weapon-mount-backlog.json',
'discovery':'data/audits/vehicles/swse-phase2c-rebellion-era-cp1-schema-discovery.json',
'report':'docs/audits/vehicles/swse-phase2b-rebellion-era-cp1-source-review.md'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--repo-root',default='.',type=pathlib.Path);ap.add_argument('--source-pdf',type=pathlib.Path);ap.add_argument('--phase1',type=pathlib.Path);ap.add_argument('--require-phase1',action='store_true');args=ap.parse_args()
 if args.require_phase1 and not args.phase1:ap.error('--require-phase1 needs --phase1')
 base=args.repo_root
 def load(k):return json.loads((base/FILES[k]).read_text(encoding='utf-8'))
 l,b,d=load('ledger'),load('backlog'),load('discovery');rep=(base/FILES['report']).read_text(encoding='utf-8')
 assert l['sourceBook']==b['sourceBook']==d['sourceBook']==BOOK
 assert l['sourcePdfSha256']==b['sourcePdfSha256']==SOURCE_SHA
 assert l['phase1ProvenanceBlobSha']==PHASE1_SHA
 assert len(l['entries'])==35 and len(b['records'])==35
 assert len(set(x['sourceEntryKey'] for x in l['entries']))==35
 assert len(set(x['sourceEntryKey'] for x in b['records']))==35
 assert len(d['discoveries'])==17 and d['schemaFrozen'] is False and d['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION'
 llookup={x['sourceEntryKey']:x for x in l['entries']}
 assert set(llookup)==set(EXPECTED)
 assert [x['sourceEntryKey'] for x in b['records']]==[x['sourceEntryKey'] for x in l['entries']]
 for key,(name,page,pdf,section) in EXPECTED.items():
  x=llookup[key]
  assert (x['printedName'],x['printedStatblockStartPage'],x['phase1PdfPhysicalPage'],x['phase1SectionStartPage'])==(name,page,pdf,section),key
  assert x['fullFieldCertified'] is False and x['fullWeaponMountReconciled'] is False
  assert set(x['fieldGroups'])==set(l['fieldGroups'])
  assert set(x['fieldGroups'].values())<=STATES
  assert x['endPageReviewStatus']==('PDF_VERIFIED' if key in REVIEWED else 'NOT_REVIEWED'),key
  if key in REVIEWED:
   assert x['printedFacts'] and x['sourceEvidence'] and x['mountAndFiringGroups']
   assert x['sourceFieldStates']['weaponFiringArc']=='SOURCE_SILENT_CONFIRMED'
   assert x['sourceFieldStates']['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
   for w in x['mountAndFiringGroups']:
    assert w['weaponLabel'] and w['sourcePage'] in x['reviewedPDFPages'],(key,w)
    assert w['firingArc']=='SOURCE_SILENT_CONFIRMED' and w['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
  else:
   assert x['printedFacts'] is None and not x['mountAndFiringGroups'] and x['sourceEvidence'] is None
   assert all(v=='NOT_REVIEWED' for v in x['fieldGroups'].values())
 assert sum(x['endPageReviewStatus']=='PDF_VERIFIED' for x in l['entries'])==10
 assert sum(len(x['mountAndFiringGroups']) for x in l['entries'])==20
 assert sum(len(x['sourceConflicts']) for x in l['entries'])==1
 counts=l['counts'];assert counts['publicationShipClaims']==35 and counts['primaryPdfCloseReads']==10 and counts['primaryPdfCloseReadsOutstanding']==25
 assert counts['attackGroupRowsReviewed']==20 and counts['sourceConflictRecordCount']==1 and counts['strictFullFieldAndPhysicalWeaponMountCertificates']==0 and counts['strictCertificatesOutstanding']==35
 assert b['counts']==counts
 assert '10 / 35' in rep and 'YM-2800' in rep
 kr=llookup['re-m22-t-krayt-gunship'];assert kr['sourceConflicts'][0]['kind']=='NARRATIVE_VS_STATBLOCK_PASSENGERS'
 assert '+1 equipment bonus' in str(kr['configurationAndRuleFindings'])
 ykl=llookup['re-ykl-37r-nova-courier'];assert '2 turrets' in str(ykl['mountAndFiringGroups'][0]['hardwareCount']) and '3 small' in str(ykl['mountAndFiringGroups'][1]['hardwareCount'])
 ym=llookup['re-corellian-engineering-corporation-ym-2800-limpet-ship'];assert ym['sourceFieldStates']['hyperdrive']=='SOURCE_SILENT_CONFIRMED' and 'grapple +38' in ym['mountAndFiringGroups'][1]['damage']
 assert all(not str(k).startswith('system.') for e in l['entries'] for k in e.keys())
 if args.source_pdf:
  assert hashlib.sha256(args.source_pdf.read_bytes()).hexdigest()==SOURCE_SHA,'Primary PDF content fingerprint mismatch'
  print('PASS: scanned primary PDF SHA-256 matches reviewed source')
 if args.phase1:
  p=json.loads(args.phase1.read_text(encoding='utf-8'))
  book=next(b for b in p['books'] if b['book']==BOOK)
  m={e['sourceEntryKey']:(e['shipName'],e['printedStatblockPage'],e['pdfPhysicalPage'],e['sectionStartPage']) for e in book['entries']}
  assert m==EXPECTED,'Phase1 publication identity or page mapping drift'
  print('PASS: exact 35-key Phase1 provenance identity/name/printed/PDF/section mappings')
 else:print('NOTE: --phase1 omitted; complete remote provenance comparison not included in this local invocation')
 print('PASS: 35 original source claims (10 source-verified; 25 not reviewed); 20 weapon groups; 1 preserved print conflict')
 print('PASS: YKL physical counts; YM-2800 cutter; Krayt station scope and printed conflict')
 print('PASS: 17 discovery-only cases; zero strict mechanical certificates; no production changes')
if __name__=='__main__':main()
