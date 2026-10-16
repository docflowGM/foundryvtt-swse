#!/usr/bin/env python3
"""Rebellion Era CP2 cumulative primary-source certification gate (20 of 35 reviews).
Use: python tools/audits/vehicles/check_rebellion_era_phase2b_cp2.py [--repo-root .] [--source-pdf /path/book.pdf] [--phase1 /path/provenance.json] [--cp1-root /path/previous/repo]
This tests source-review data, not strict mechanical certification or hydration.
"""
import argparse,copy,hashlib,json,pathlib
BOOK='Rebellion Era Campaign Guide'
SOURCE_SHA='60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8'
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
EXPECTED={'re-g1-m4-c-dunelizard-fighter': ('G1-M4-C Dunelizard Fighter', 63, 64, 63), 're-ixiyen-class-fast-attack-craft': ('Ixiyen-class Fast Attack Craft', 64, 65, 63), 're-m12-l-kimogila-heavy-fighter': ('M12-L Kimogila Heavy Fighter', 64, 65, 64), 're-m22-t-krayt-gunship': ('M22-T Krayt Gunship', 65, 66, 65), 're-pinook-fighter': ('Pinook Fighter', 66, 67, 66), 're-razor-class-fighter': ('Razor-class Fighter', 66, 67, 66), 're-mobquet-medium-transport': ('Mobquet Medium Transport', 68, 69, 67), 're-corellian-yv-545': ('Corellian YV-545', 69, 70, 69), 're-ykl-37r-nova-courier': ('YKL-37R Nova Courier', 69, 70, 68), 're-corellian-engineering-corporation-ym-2800-limpet-ship': ('Corellian Engineering Corporation YM-2800 Limpet Ship', 114, 115, 113), 're-hoersch-kessel-t-wing-interceptor': ('Hoersch-Kessel T-Wing Interceptor', 114, 115, 114), 're-incom-x4-gunship': ('Incom X4 Gunship', 115, 116, 115), 're-assassin-class-corvette': ('Assassin-class Corvette', 130, 131, 130), 're-assault-gunboat': ('Assault Gunboat', 131, 132, 131), 're-imperial-cargo-ship': ('Imperial Cargo Ship', 132, 133, 132), 're-imperial-ii-class-frigate': ('Imperial II-class Frigate', 133, 134, 132), 're-missile-boat': ('Missile Boat', 134, 135, 134), 're-royal-guard-starfighter': ('Royal Guard Starfighter', 134, 135, 134), 're-tie-aggressor': ('TIE Aggressor', 135, 136, 135), 're-tie-experimental-m2': ('TIE Experimental M2', 136, 137, 136), 're-tie-experimental-m3': ('TIE Experimental M3', 136, 137, 136), 're-tie-oppressor': ('TIE Oppressor', 136, 137, 136), 're-tie-phantom': ('TIE Phantom', 137, 138, 137), 're-tie-scout': ('TIE Scout', 138, 139, 138), 're-tie-shuttle': ('TIE Shuttle', 138, 139, 138), 're-vt-49-decimator': ('VT-49 Decimator', 139, 140, 139), 're-ye-4-gunship': ('YE-4 Gunship', 139, 140, 139), 're-aeg-77-vigo-gunship': ('AEG-77 "Vigo" Gunship', 146, 147, 146), 're-kihraxz-light-fighter': ('Kihraxz Light Fighter', 146, 147, 146), 're-supa-fighter': ('Supa Fighter', 147, 148, 147), 're-vaksai': ('Vaksai', 147, 148, 147), 're-rihkxyrk-assault-fighter': ('Rihkxyrk Assault Fighter', 148, 149, 148), 're-keldabe-class-battleship': ('Keldabe-class Battleship', 154, 155, 154), 're-ird-a-starfighter': ('IRD-A Starfighter', 156, 157, 156), 're-ird-starfighter': ('IRD Starfighter', 156, 157, 156)}
REVIEWED_CP1=['re-g1-m4-c-dunelizard-fighter', 're-ixiyen-class-fast-attack-craft', 're-m12-l-kimogila-heavy-fighter', 're-m22-t-krayt-gunship', 're-pinook-fighter', 're-razor-class-fighter', 're-mobquet-medium-transport', 're-corellian-yv-545', 're-ykl-37r-nova-courier', 're-corellian-engineering-corporation-ym-2800-limpet-ship']
REVIEWED_CP2=['re-hoersch-kessel-t-wing-interceptor', 're-incom-x4-gunship', 're-assassin-class-corvette', 're-assault-gunboat', 're-imperial-cargo-ship', 're-imperial-ii-class-frigate', 're-missile-boat', 're-royal-guard-starfighter', 're-tie-aggressor', 're-tie-experimental-m2']
STATES={'PDF_VERIFIED','SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED','SCHEMA_INCOMPATIBLE','NOT_REVIEWED'}
FILES={'ledger': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp2-per-entry-source-review-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp2-weapon-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-rebellion-era-cp2-schema-discovery.json', 'validator': 'tools/audits/vehicles/check_rebellion_era_phase2b_cp2.py', 'report': 'docs/audits/vehicles/swse-phase2b-rebellion-era-cp2-source-review.md'}
OLD={'ledger': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp1-per-entry-source-review-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp1-weapon-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-rebellion-era-cp1-schema-discovery.json'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--repo-root',type=pathlib.Path,default=pathlib.Path('.'));ap.add_argument('--source-pdf',type=pathlib.Path);ap.add_argument('--phase1',type=pathlib.Path);ap.add_argument('--cp1-root',type=pathlib.Path);ap.add_argument('--require-phase1',action='store_true');args=ap.parse_args()
 if args.require_phase1 and not args.phase1:ap.error('--require-phase1 requires --phase1')
 root=args.repo_root
 read=lambda p:json.loads(p.read_text(encoding='utf8'))
 ledger=read(root/FILES['ledger']);backlog=read(root/FILES['backlog']);disc=read(root/FILES['discovery']);report=(root/FILES['report']).read_text(encoding='utf8')
 assert ledger['sourceBook']==backlog['sourceBook']==disc['sourceBook']==BOOK
 assert ledger['sourcePdfSha256']==backlog['sourcePdfSha256']==SOURCE_SHA
 assert ledger['phase1ProvenanceBlobSha']==PHASE1_SHA
 assert len(ledger['entries'])==len(backlog['records'])==35
 assert len({e['sourceEntryKey'] for e in ledger['entries']})==35
 assert {e['sourceEntryKey'] for e in ledger['entries']}==set(EXPECTED)
 assert [e['sourceEntryKey'] for e in ledger['entries']]==[b['sourceEntryKey'] for b in backlog['records']]
 assert ledger['counts']==backlog['counts']
 assert ledger['counts']=={'publicationShipClaims':35,'primaryPdfCloseReads':20,'primaryPdfCloseReadsOutstanding':15,'strictFullFieldAndPhysicalWeaponMountCertificates':0,'strictCertificatesOutstanding':35,'attackGroupRowsReviewed':43,'sourceConflictRecordCount':1}
 assert disc['counts']=={'discoveryCases':36,'bookScopeReviewed':20}
 assert disc['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION' and disc['schemaFrozen'] is False
 assert len(disc['discoveries'])==36
 assert len(set(x['id'] for x in disc['discoveries']))==36
 assert len(REVIEWED_CP1)==len(REVIEWED_CP2)==10 and not set(REVIEWED_CP1)&set(REVIEWED_CP2)
 assert [e['sourceEntryKey'] for e in ledger['entries'] if e['endPageReviewStatus']=='PDF_VERIFIED']==REVIEWED_CP1+REVIEWED_CP2
 assert sum(len(e['mountAndFiringGroups']) for e in ledger['entries'])==43
 assert sum(len(e['sourceConflicts']) for e in ledger['entries'])==1
 assert '20/35' in report and 'M2' in report
 for e in ledger['entries']:
  key=e['sourceEntryKey'];name,p,pdf,section=EXPECTED[key]
  assert (e['printedName'],e['printedStatblockStartPage'],e['phase1PdfPhysicalPage'],e['phase1SectionStartPage'])==(name,p,pdf,section),key
  assert e['fullFieldCertified'] is False and e['fullWeaponMountReconciled'] is False
  assert set(e['fieldGroups'])==set(ledger['fieldGroups'])
  assert set(e['fieldGroups'].values()) <= STATES
  reviewed=key in REVIEWED_CP1 or key in REVIEWED_CP2
  assert e['endPageReviewStatus']==('PDF_VERIFIED' if reviewed else 'NOT_REVIEWED'),key
  if reviewed:
   assert e['printedFacts'] and e['sourceEvidence'] and e['mountAndFiringGroups'] and e['reviewedPDFPages'],key
   assert e['sourceFieldStates']['weaponFiringArc']=='SOURCE_SILENT_CONFIRMED'
   assert e['sourceFieldStates']['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
   for w in e['mountAndFiringGroups']:
    assert w['sourcePage'] in e['reviewedPDFPages'],key
    assert w['firingArc']=='SOURCE_SILENT_CONFIRMED' and w['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
  else:
   assert e['printedFacts'] is None and not e['mountAndFiringGroups'] and not e['sourceEvidence'],key
   assert all(v=='NOT_REVIEWED' for v in e['fieldGroups'].values())
  assert not any(str(f).startswith('system.') for f in e)
 index={e['sourceEntryKey']:e for e in ledger['entries']}
 assert index['re-royal-guard-starfighter']['printedFacts']['defenses']['shieldRating']==15
 assert index['re-tie-aggressor']['sourceFieldStates']['shieldRating']=='SOURCE_SILENT_CONFIRMED'
 assert index['re-tie-experimental-m2']['printedFacts']['crew']=='remote controlled (skilled)'
 assert index['re-tie-experimental-m3']['endPageReviewStatus']=='NOT_REVIEWED'
 assert index['re-incom-x4-gunship']['mountAndFiringGroups'][1]['hardwareCount'].startswith('six laser turrets')
 assert index['re-imperial-ii-class-frigate']['printedFacts']['movement']['characterScaleFlySquares'] is None
 assert index['re-imperial-ii-class-frigate']['mountAndFiringGroups'][3]['damage'].endswith('grappled +69)')
 assert index['re-assassin-class-corvette']['printedFacts']['supplementalPrintedFacts']['passengersTypical']==51
 assert 'SubLight Acceleration Motor' in str(index['re-missile-boat']['configurationAndRuleFindings'])
 assert index['re-m22-t-krayt-gunship']['sourceConflicts'][0]['kind']=='NARRATIVE_VS_STATBLOCK_PASSENGERS'
 if args.cp1_root:
  old=read(args.cp1_root/OLD['ledger']);b=read(args.cp1_root/OLD['backlog']);d=read(args.cp1_root/OLD['discovery'])
  assert ledger['entries'][:10]==old['entries'][:10], 'CP1 reviewed record mutation'
  assert backlog['records'][:10]==b['records'][:10], 'CP1 mounting backlog mutation'
  assert disc['discoveries'][:17]==d['discoveries'], 'CP1 discovery mutation'
  print('PASS: all 10 CP1 reviewed ledger/backlog objects and all 17 previous discovery cases unchanged')
 if args.phase1:
  p=read(args.phase1);book=next(z for z in p['books'] if z['book']==BOOK)
  m={z['sourceEntryKey']:(z['shipName'],z['printedStatblockPage'],z['pdfPhysicalPage'],z['sectionStartPage']) for z in book['entries']}
  assert m==EXPECTED,'Phase1 identity or mapping drift'
  print('PASS: original 35 Phase 1 source identities and printed/PDF/section mappings')
 elif args.require_phase1:raise AssertionError('missing --phase1')
 else:print('NOTE: Phase1 file not supplied; mapping compared against embedded Phase1 snapshot')
 if args.source_pdf:
  assert hashlib.sha256(args.source_pdf.read_bytes()).hexdigest()==SOURCE_SHA
  print('PASS: scanned source PDF SHA-256')
 print('PASS: 20/35 source close reads, 15 unreviewed; 43 attack groups; 1 original source conflict')
 print('PASS: M2 remote control; X4 turrets; capital battery groups; Assassin typical/max; SLAM and station guards')
 print('PASS: 36 discovery-only cases; 0 strict certs; no production hydration')
if __name__=='__main__':main()
