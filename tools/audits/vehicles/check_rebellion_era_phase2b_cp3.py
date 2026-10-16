#!/usr/bin/env python3
"""Rebellion Era 35/35 primary source close-read gate. NOT a strict mechanical certification."""
import argparse,json,hashlib,pathlib
BOOK='Rebellion Era Campaign Guide'
SOURCE_SHA='60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8'
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
EXPECTED={'re-g1-m4-c-dunelizard-fighter': ('G1-M4-C Dunelizard Fighter', 63, 64, 63), 're-ixiyen-class-fast-attack-craft': ('Ixiyen-class Fast Attack Craft', 64, 65, 63), 're-m12-l-kimogila-heavy-fighter': ('M12-L Kimogila Heavy Fighter', 64, 65, 64), 're-m22-t-krayt-gunship': ('M22-T Krayt Gunship', 65, 66, 65), 're-pinook-fighter': ('Pinook Fighter', 66, 67, 66), 're-razor-class-fighter': ('Razor-class Fighter', 66, 67, 66), 're-mobquet-medium-transport': ('Mobquet Medium Transport', 68, 69, 67), 're-corellian-yv-545': ('Corellian YV-545', 69, 70, 69), 're-ykl-37r-nova-courier': ('YKL-37R Nova Courier', 69, 70, 68), 're-corellian-engineering-corporation-ym-2800-limpet-ship': ('Corellian Engineering Corporation YM-2800 Limpet Ship', 114, 115, 113), 're-hoersch-kessel-t-wing-interceptor': ('Hoersch-Kessel T-Wing Interceptor', 114, 115, 114), 're-incom-x4-gunship': ('Incom X4 Gunship', 115, 116, 115), 're-assassin-class-corvette': ('Assassin-class Corvette', 130, 131, 130), 're-assault-gunboat': ('Assault Gunboat', 131, 132, 131), 're-imperial-cargo-ship': ('Imperial Cargo Ship', 132, 133, 132), 're-imperial-ii-class-frigate': ('Imperial II-class Frigate', 133, 134, 132), 're-missile-boat': ('Missile Boat', 134, 135, 134), 're-royal-guard-starfighter': ('Royal Guard Starfighter', 134, 135, 134), 're-tie-aggressor': ('TIE Aggressor', 135, 136, 135), 're-tie-experimental-m2': ('TIE Experimental M2', 136, 137, 136), 're-tie-experimental-m3': ('TIE Experimental M3', 136, 137, 136), 're-tie-oppressor': ('TIE Oppressor', 136, 137, 136), 're-tie-phantom': ('TIE Phantom', 137, 138, 137), 're-tie-scout': ('TIE Scout', 138, 139, 138), 're-tie-shuttle': ('TIE Shuttle', 138, 139, 138), 're-vt-49-decimator': ('VT-49 Decimator', 139, 140, 139), 're-ye-4-gunship': ('YE-4 Gunship', 139, 140, 139), 're-aeg-77-vigo-gunship': ('AEG-77 "Vigo" Gunship', 146, 147, 146), 're-kihraxz-light-fighter': ('Kihraxz Light Fighter', 146, 147, 146), 're-supa-fighter': ('Supa Fighter', 147, 148, 147), 're-vaksai': ('Vaksai', 147, 148, 147), 're-rihkxyrk-assault-fighter': ('Rihkxyrk Assault Fighter', 148, 149, 148), 're-keldabe-class-battleship': ('Keldabe-class Battleship', 154, 155, 154), 're-ird-a-starfighter': ('IRD-A Starfighter', 156, 157, 156), 're-ird-starfighter': ('IRD Starfighter', 156, 157, 156)}
FILES={'ledger': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp3-book-source-closure-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp3-book-source-closure-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-rebellion-era-cp3-schema-discovery.json', 'validator': 'tools/audits/vehicles/check_rebellion_era_phase2b_cp3.py', 'report': 'docs/audits/vehicles/swse-phase2b-rebellion-era-cp3-book-source-closure.md'}
OLD={'ledger': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp2-per-entry-source-review-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-rebellion-era-cp2-weapon-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-rebellion-era-cp2-schema-discovery.json'}
SIL='SOURCE_SILENT_CONFIRMED'
STATES={'PDF_VERIFIED','SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED','SCHEMA_INCOMPATIBLE','NOT_REVIEWED'}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--repo-root',type=pathlib.Path,default=pathlib.Path('.'));ap.add_argument('--source-pdf',type=pathlib.Path);ap.add_argument('--phase1',type=pathlib.Path);ap.add_argument('--cp2-root',type=pathlib.Path);ap.add_argument('--require-phase1',action='store_true');args=ap.parse_args()
 if args.require_phase1 and not args.phase1:ap.error('--require-phase1 requires --phase1')
 rd=lambda p:json.loads(p.read_text(encoding='utf8'))
 L=rd(args.repo_root/FILES['ledger']);B=rd(args.repo_root/FILES['backlog']);D=rd(args.repo_root/FILES['discovery']);T=(args.repo_root/FILES['report']).read_text(encoding='utf8')
 assert L['sourceBook']==B['sourceBook']==D['sourceBook']==BOOK
 assert L['sourcePdfSha256']==B['sourcePdfSha256']==SOURCE_SHA and L['phase1ProvenanceBlobSha']==PHASE1_SHA
 assert L['counts']==B['counts']=={'publicationShipClaims':35,'primaryPdfCloseReads':35,'primaryPdfCloseReadsOutstanding':0,'strictFullFieldAndPhysicalWeaponMountCertificates':0,'strictCertificatesOutstanding':35,'attackGroupRowsReviewed':72,'sourceConflictRecordCount':4}
 assert D['counts']=={'discoveryCases':71,'bookScopeReviewed':35} and len(D['discoveries'])==71
 assert len(set(x['id'] for x in D['discoveries']))==71 and not D['schemaFrozen'] and D['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION'
 assert len(L['entries'])==len(B['records'])==35 and len(set(x['sourceEntryKey'] for x in L['entries']))==35
 assert [e['sourceEntryKey'] for e in L['entries']]==[r['sourceEntryKey'] for r in B['records']]
 assert set(e['sourceEntryKey'] for e in L['entries'])==set(EXPECTED)
 assert all(e['endPageReviewStatus']=='PDF_VERIFIED' for e in L['entries'])
 assert sum(len(e['mountAndFiringGroups']) for e in L['entries'])==72
 assert sum(len(e['sourceConflicts']) for e in L['entries'])==4
 assert all(e['fullFieldCertified'] is False and e['fullWeaponMountReconciled'] is False for e in L['entries'])
 assert all(r['strictCertified'] is False for r in B['records'])
 assert all(set(e['fieldGroups'])==set(L['fieldGroups']) and set(e['fieldGroups'].values())<=STATES for e in L['entries'])
 for e in L['entries']:
  key=e['sourceEntryKey'];name,printed,pdf,section=EXPECTED[key]
  assert (e['printedName'],e['printedStatblockStartPage'],e['phase1PdfPhysicalPage'],e['phase1SectionStartPage'])==(name,printed,pdf,section),key
  assert e['printedFacts'] and e['sourceEvidence'] and e['reviewedPDFPages'] and e['mountAndFiringGroups'] and e['configurationAndRuleFindings'],key
  assert e['sourceFieldStates']['weaponFiringArc']==SIL and e['sourceFieldStates']['batteryComposition']==SIL
  assert all(w['firingArc']==SIL and w['batteryComposition']==SIL and w['sourcePage'] in e['reviewedPDFPages'] for w in e['mountAndFiringGroups'])
  assert not any(k.startswith('system.') for k in e)
 if args.cp2_root:
  a=rd(args.cp2_root/OLD['ledger']);b=rd(args.cp2_root/OLD['backlog']);d=rd(args.cp2_root/OLD['discovery'])
  assert L['entries'][:20]==a['entries'][:20], 'first 20 reviewed records changed'
  assert B['records'][:20]==b['records'][:20], 'first 20 mount backlogs changed'
  assert D['discoveries'][:36]==d['discoveries'],'prior 36 discovery cases changed'
  print('PASS: CP1 and CP2 20 prior ledger/backlog records plus 36 discoveries unchanged')
 if args.phase1:
  p=rd(args.phase1);bk=next(z for z in p['books'] if z['book']==BOOK)
  m={z['sourceEntryKey']:(z['shipName'],z['printedStatblockPage'],z['pdfPhysicalPage'],z['sectionStartPage']) for z in bk['entries']}
  assert m==EXPECTED,'Phase 1 identity/page drift';print('PASS: live Phase1 original 35 canonical publication identities')
 else:print('NOTE: compared to embedded immutable Phase1 roster; live Phase1 not supplied')
 if args.source_pdf:assert hashlib.sha256(args.source_pdf.read_bytes()).hexdigest()==SOURCE_SHA;print('PASS: original scanned PDF fingerprint')
 ix={e['sourceEntryKey']:e for e in L['entries']}
 assert ix['re-tie-phantom']['printedFacts']['supplementalPrintedFacts']['cloakingFootnote'].startswith('Total concealment')
 assert ix['re-keldabe-class-battleship']['printedFacts']['defenses']['shieldRating']==150
 assert len(ix['re-vt-49-decimator']['sourceConflicts'])==2
 assert len(ix['re-rihkxyrk-assault-fighter']['sourceConflicts'])==1
 assert ix['re-ird-a-starfighter']['printedFacts']['combat']['grappleBonus']==3
 assert ix['re-ird-starfighter']['printedFacts']['combat']['grappleBonus']==33
 assert ix['re-m22-t-krayt-gunship']['sourceConflicts'][0]['kind']=='NARRATIVE_VS_STATBLOCK_PASSENGERS'
 assert len(ix['re-aeg-77-vigo-gunship']['mountAndFiringGroups'])==2
 assert D['scopeGuardrails'] and '35/35' in T
 print('PASS: 35/35 source reviews; 72 weapon rows; 4 printed conflicts; 71 discovery-only cases')
 print('PASS: no production hydration or mechanical certificates; shield-drain, cloak, variant identities and explicit no-hyperdrive evidence')
if __name__=='__main__':main()
