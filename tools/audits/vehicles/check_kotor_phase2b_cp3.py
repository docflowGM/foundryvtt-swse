#!/usr/bin/env python3
"""KOTOR Phase 2B CP3 source-review closure, NOT strict mount/field certification."""
from __future__ import annotations
import argparse,hashlib,json,pathlib,zipfile
BOOK='Knights of the Old Republic Campaign Guide'
SOURCE_SHA='fd6a61b0ca0d5d8aeec722d033a6652cb23c932f119d4298f523394f96efa419'
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
ROSTER=[['kotor-amalgamated-hyperdyne-578-r-space-transport', 'Amalgamated Hyperdyne 578-R Space Transport', 98, 99, 98], ['kotor-arakyd-industries-lethisk-class-armed-freighter', 'Arakyd Industries Lethisk-class Armed Freighter', 99, 100, 99], ['kotor-corellia-stardrive-quartermaster-class-supply-carrier', 'Corellia StarDrive Quartermaster-class Supply Carrier', 100, 101, 100], ['kotor-corellian-engineering-corporation-s-100-stinger-class-starfighter', 'Corellian Engineering Corporation S-100 Stinger-class Starfighter', 95, 96, 95], ['kotor-corellian-engineering-corporation-s-250-chela-class-starfighter', 'Corellian Engineering Corporation S-250 Chela-class Starfighter', 181, 182, 181], ['kotor-davaab-type-starfighter', 'Davaab-type Starfighter', 204, 205, 204], ['kotor-ebon-hawk', 'Ebon Hawk', 220, 221, 220], ['kotor-eleaor-propulsion-baronial-class-yacht', 'Eleaor Propulsion Baronial-class Yacht', 143, 144, 143], ['kotor-eleaor-propulsion-starscape-class-yacht', 'Eleaor Propulsion Starscape-class Yacht', 222, 223, 221], ['kotor-hoersch-kessel-drive-g-type-light-shuttle', 'Hoersch-Kessel Drive G-Type Light Shuttle', 98, 99, 98], ['kotor-jehavey-ir-type-assault-ship', "Jehavey'ir-type Assault Ship", 206, 207, 205], ['kotor-kandosii-type-dreadnaught', 'Kandosii-type Dreadnaught', 207, 208, 206], ['kotor-koros-spaceworks-cx-133-chaos-fighter', 'Koros Spaceworks CX-133 Chaos Fighter', 220, 221, 220], ['kotor-koros-spaceworks-supremacy-class-attack-ship', 'Koros Spaceworks Supremacy-class Attack Ship', 221, 222, 221], ['kotor-kyramud-type-battleship', 'Kyramud-type Battleship', 206, 207, 206], ['kotor-pelagia-duplex-command-assault-gunship', 'Pelagia Duplex Command Assault Gunship', 100, 101, 100], ['kotor-rendili-hyperworks-hammerhead-class-cruiser', 'Rendili Hyperworks Hammerhead-class Cruiser', 184, 185, 184], ['kotor-rendili-hyperworks-inexpugnable-class-tactical-command-vessel', 'Rendili Hyperworks Inexpugnable-class Tactical Command Vessel', 185, 186, 184], ['kotor-rendili-hyperworks-praetorian-class-frigate', 'Rendili Hyperworks Praetorian-class Frigate', 101, 102, 101], ['kotor-republic-fleet-systems-aurek-tactical-strikefighter', 'Republic Fleet Systems Aurek Tactical Strikefighter', 181, 182, 181], ['kotor-republic-fleet-systems-conductor-class-short-haul-landing-craft', 'Republic Fleet Systems Conductor-class Short-haul Landing Craft', 182, 183, 181], ['kotor-republic-fleet-systems-foray-class-blockade-runner', 'Republic Fleet Systems Foray-class Blockade Runner', 183, 184, 183], ['kotor-republic-fleet-systems-kt-400-military-droid-carrier', 'Republic Fleet Systems KT-400 Military Droid Carrier', 183, 184, 183], ['kotor-republic-fleet-systems-star-saber-xc-01-starfighter', 'Republic Fleet Systems Star Saber XC-01 Starfighter', 96, 97, 96], ['kotor-shaadlar-type-troopship', 'Shaadlar-type Troopship', 205, 206, 204], ['kotor-star-forge-manufacture-centurion-class-battlecruiser', 'Star Forge Manufacture Centurion-class Battlecruiser', 163, 164, 162], ['kotor-star-forge-manufacture-derriphan-class-battleship', 'Star Forge Manufacture Derriphan-class Battleship', 163, 164, 163], ['kotor-star-forge-manufacture-herald-class-shuttle', 'Star Forge Manufacture Herald-class Shuttle', 164, 165, 164], ['kotor-star-forge-manufacture-interdictor-class-warship', 'Star Forge Manufacture Interdictor-class Warship', 161, 162, 161], ['kotor-star-forge-manufacture-sith-interceptor', 'Star Forge Manufacture Sith Interceptor', 164, 165, 164], ['kotor-teroch-type-fast-attack-gunship', 'Teroch-type Fast Attack Gunship', 205, 206, 205], ['kotor-zentine-dynamics-ministry-class-orbital-shuttle', 'Zentine Dynamics Ministry-class Orbital Shuttle', 182, 183, 182]]
CP1=['kotor-corellian-engineering-corporation-s-100-stinger-class-starfighter', 'kotor-republic-fleet-systems-star-saber-xc-01-starfighter', 'kotor-amalgamated-hyperdyne-578-r-space-transport', 'kotor-hoersch-kessel-drive-g-type-light-shuttle', 'kotor-arakyd-industries-lethisk-class-armed-freighter', 'kotor-corellia-stardrive-quartermaster-class-supply-carrier', 'kotor-pelagia-duplex-command-assault-gunship', 'kotor-rendili-hyperworks-praetorian-class-frigate', 'kotor-eleaor-propulsion-baronial-class-yacht', 'kotor-star-forge-manufacture-interdictor-class-warship']
CP2=['kotor-star-forge-manufacture-centurion-class-battlecruiser', 'kotor-star-forge-manufacture-derriphan-class-battleship', 'kotor-star-forge-manufacture-herald-class-shuttle', 'kotor-star-forge-manufacture-sith-interceptor', 'kotor-corellian-engineering-corporation-s-250-chela-class-starfighter', 'kotor-republic-fleet-systems-aurek-tactical-strikefighter', 'kotor-republic-fleet-systems-conductor-class-short-haul-landing-craft', 'kotor-zentine-dynamics-ministry-class-orbital-shuttle', 'kotor-republic-fleet-systems-foray-class-blockade-runner', 'kotor-republic-fleet-systems-kt-400-military-droid-carrier']
CP3=['kotor-rendili-hyperworks-hammerhead-class-cruiser', 'kotor-rendili-hyperworks-inexpugnable-class-tactical-command-vessel', 'kotor-davaab-type-starfighter', 'kotor-shaadlar-type-troopship', 'kotor-teroch-type-fast-attack-gunship', 'kotor-jehavey-ir-type-assault-ship', 'kotor-kyramud-type-battleship', 'kotor-kandosii-type-dreadnaught', 'kotor-ebon-hawk', 'kotor-koros-spaceworks-cx-133-chaos-fighter', 'kotor-koros-spaceworks-supremacy-class-attack-ship', 'kotor-eleaor-propulsion-starscape-class-yacht']
FILES={'ledger': 'data/audits/vehicles/swse-phase2b-kotor-cp3-book-source-closure-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-kotor-cp3-book-source-closure-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-kotor-cp3-schema-discovery.json', 'validator': 'tools/audits/vehicles/check_kotor_phase2b_cp3.py', 'report': 'docs/audits/vehicles/swse-phase2b-kotor-cp3-book-source-closure.md'}
PRIOR={'ledger': 'data/audits/vehicles/swse-phase2b-kotor-cp2-per-entry-source-review-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-kotor-cp2-weapon-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-kotor-cp2-schema-discovery.json'}
COUNTS={'publicationShipClaims': 32, 'primaryPdfCloseReads': 32, 'primaryPdfCloseReadsOutstanding': 0, 'strictFullFieldAndPhysicalWeaponMountCertificates': 0, 'strictCertificatesOutstanding': 32, 'attackGroupRowsReviewed': 69, 'sourceConflictRecordCount': 7, 'phase1PageMappingDiscrepancyCount': 1}
DISCOVERY_COUNT=84
STATES={'PDF_VERIFIED','SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED','SCHEMA_INCOMPATIBLE','NOT_REVIEWED'}

def check(flag,msg):
 if not flag:raise AssertionError(msg)
def sha256_file(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def git_blob_sha(raw):return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\x00'+raw).hexdigest()

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--repo-root',type=pathlib.Path,default=pathlib.Path('.'))
 ap.add_argument('--source-pdf',type=pathlib.Path)
 ap.add_argument('--cp2-root',type=pathlib.Path)
 ap.add_argument('--phase1-full',type=pathlib.Path)
 ap.add_argument('--phase1-projection',type=pathlib.Path)
 ap.add_argument('--zip-file',type=pathlib.Path)
 args=ap.parse_args()
 rd=lambda p:json.loads(p.read_text(encoding='utf8'))
 l,b,d=(rd(args.repo_root/FILES[k]) for k in ('ledger','backlog','discovery'))
 report=(args.repo_root/FILES['report']).read_text(encoding='utf8')
 check(l['schema'] and l['sourceBook']==b['sourceBook']==d['sourceBook']==BOOK,'book mismatch')
 check(l['sourcePdfSha256']==b['sourcePdfSha256']==SOURCE_SHA,'source PDF fingerprint mismatch')
 check(l['phase1ProvenanceBlobSha']==PHASE1_SHA,'Phase1 Git blob fingerprint drift')
 check(l['counts']==b['counts']==COUNTS,'authoritative audit counts mismatch')
 check(len(l['entries'])==len(b['records'])==len(ROSTER)==32,'not 32 source identities')
 check(CP1==l['checkpoint1']['trancheOrder'] and CP2==l['checkpoint2']['trancheOrder'] and CP3==l['checkpoint3']['trancheOrder'],'review tranche roster drift')
 check(len(CP1)==10 and len(CP2)==10 and len(CP3)==12 and set(CP1+CP2+CP3)==set(x[0] for x in ROSTER),'tranches do not cover all claims')
 check(l['checkpoint3']['bookSourceReviewComplete'] is True and l['checkpoint3']['mechanicalCertificationComplete'] is False,'false closure certification')
 check(not d['schemaFrozen'] and d['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION','schema discovery unexpectedly promoted')
 check(d['counts']=={'discoveryCases':DISCOVERY_COUNT,'bookScopeReviewed':32},'discovery count mismatch')
 check(len(d['discoveries'])==DISCOVERY_COUNT==len(set(x['id'] for x in d['discoveries'])),'duplicate or missing discoveries')
 check(len(l['fieldGroups'])==19,'19 field groups required')
 keys=[x[0] for x in ROSTER]
 check([e['sourceEntryKey'] for e in l['entries']]==keys,'Phase 1 roster/order mutated')
 check([x['sourceEntryKey'] for x in b['records']]==keys,'mount roster/order mutated')
 groups=conflicts=page_mismatches=0
 for expected,e,m in zip(ROSTER,l['entries'],b['records']):
  expected=tuple(expected)
  key,name,page,pdf,section=expected
  check((e['sourceEntryKey'],e['printedName'],e['printedStatblockStartPage'],e['phase1PdfPhysicalPage'],e['phase1SectionStartPage'])==expected,'Phase 1 identity/page changed: '+key)
  check((m['sourceEntryKey'],m['printedName'],m['printedPage'])==(key,name,page),'backlog identity/page changed: '+key)
  check(e['endPageReviewStatus']==m['reviewStatus']=='PDF_VERIFIED','unreviewed source entry: '+key)
  check(all(v in STATES and v!='NOT_REVIEWED' for v in e['fieldGroups'].values()) and set(e['fieldGroups'])==set(l['fieldGroups']),'missing field review state: '+key)
  check(e['narrativeMechanicsStatus']=='PDF_VERIFIED' and e['reviewedPDFPages'] and e['sourceEvidence'],'missing source close read: '+key)
  check(e['printedFacts'] and e['printedFacts']['cl'] is not None and e['printedFacts']['combat']['grappleBonus'] is not None,'essential printed fact missing: '+key)
  check(e['sourceEvidence']['printedPages']==e['reviewedPDFPages'],'source-page set mismatch: '+key)
  check(e['fullFieldCertified'] is False and e['fullWeaponMountReconciled'] is False and m['strictCertified'] is False,'unsupported strict certification: '+key)
  check(e['blockingFindings'] and m['blockingIssues'],'missing blocking certification rationale: '+key)
  check(e['sourceFieldStates']['weaponFiringArc']=='SOURCE_SILENT_CONFIRMED' and e['sourceFieldStates']['batteryComposition']=='SOURCE_SILENT_CONFIRMED','invented arcs/battery components: '+key)
  check(len(e['mountAndFiringGroups'])==len(m['weaponAttackGroups']),'weapon group count differs from backlog: '+key)
  if e['printedFacts']['defenses']['shieldRating'] is None:check(e['sourceFieldStates']['shieldRating']=='SOURCE_SILENT_CONFIRMED','unsourced SR value: '+key)
  if e['printedFacts']['hyperdrive'] is None:check(e['fieldGroups']['hyperdrive']=='SOURCE_SILENT_CONFIRMED','unsourced hyperdrive: '+key)
  for w,bb in zip(e['mountAndFiringGroups'],m['weaponAttackGroups']):
   check(w['weaponLabel']==bb['label'] and w['attackBonus']==bb['attackBonus'],'weapon/backlog mismatch: '+key)
   check(isinstance(w['attackBonus'],int) and w['damage'] is not None,'malformed detailed attack: '+key)
   check(w['sourcePage'] in e['reviewedPDFPages'],'weapon source page not reviewed: '+key)
   check(w['firingArc']==w['batteryComposition']=='SOURCE_SILENT_CONFIRMED','imagined weapon mount: '+key)
  groups+=len(e['mountAndFiringGroups']);conflicts+=len(e['sourceConflicts'])
  for c in e['sourceConflicts']:check(c['status']=='SOURCE_CONFLICT_PRESERVED' and c['firstPrintedValue'] and c['secondPrintedValue'] and c['resolution']=='UNRESOLVED_PRESERVE_BOTH_PRINTED_READINGS','source conflict altered: '+key)
  page_mismatches+=int(bool(e['sourceEvidence'].get('phase1PageMappingDiscrepancy')))
 check(groups==69 and conflicts==7 and page_mismatches==1,'derived weapon/conflict/page counts differ')
 st=next(e for e in l['entries'] if e['sourceEntryKey']=='kotor-corellian-engineering-corporation-s-100-stinger-class-starfighter')
 check(st['printedStatblockStartPage']==95 and st['specializedPublishedVariantsAndPageCorrections']['verifiedActualPrintedStatblockStartPage']==96,'Stinger provenance correction lost')
 shaad=next(e for e in l['entries'] if e['sourceEntryKey']=='kotor-shaadlar-type-troopship')
 check(shaad['printedFacts']['combat']['ranged'].endswith('batteries +14') and shaad['mountAndFiringGroups'][2]['attackBonus']==10,'Shaadlar published missile +14/+10 mismatch not preserved')
 yacht=next(e for e in l['entries'] if e['sourceEntryKey']=='kotor-eleaor-propulsion-starscape-class-yacht')
 check('light laser cannon batteries +10' in yacht['printedFacts']['combat']['ranged'] and 'medium laser cannon batteries +8' in yacht['printedFacts']['combat']['ranged'],'yacht main-line bonuses changed')
 check(yacht['mountAndFiringGroups'][0]['weaponLabel']=='medium laser cannon battery' and yacht['mountAndFiringGroups'][0]['attackBonus']==10 and yacht['mountAndFiringGroups'][1]['attackBonus']==8,'yacht detailed reciprocal bonus conflict hidden')
 hawk=next(e for e in l['entries'] if e['sourceEntryKey']=='kotor-ebon-hawk')
 check(hawk['printedFacts']['combat']['grappleBonus']==6 and len(hawk['mountAndFiringGroups'])==3 and 'character-scale only' in hawk['mountAndFiringGroups'][-1]['damage'],'Ebon Hawk special mechanisms altered')
 chaos=next(e for e in l['entries'] if e['sourceEntryKey']=='kotor-koros-spaceworks-cx-133-chaos-fighter')
 check(chaos['printedFacts']['supplementalPrintedFacts']['ramCollisionDamageDice'].startswith('8d6'),'Chaos fighter collision damage missing')
 check(all(x in report for x in ['32/32','69','84','7','0/32','p96','Shaadlar','Starscape']),'report missing results')
 if args.source_pdf:check(args.source_pdf.is_file() and sha256_file(args.source_pdf)==SOURCE_SHA,'source PDF SHA-256 mismatch')
 if args.cp2_root:
  l2,b2,d2=(rd(args.cp2_root/PRIOR[k]) for k in ('ledger','backlog','discovery'))
  m2={e['sourceEntryKey']:e for e in l2['entries']};n2={m['sourceEntryKey']:m for m in b2['records']}
  check(len(l2['entries'])==len(b2['records'])==32 and len(d2['discoveries'])==54,'prior CP2 wrong size')
  check(all(e==m2[e['sourceEntryKey']] for e in l['entries'] if e['sourceEntryKey'] not in CP3),'previous twenty ledger entries changed')
  check(all(e==n2[e['sourceEntryKey']] for e in b['records'] if e['sourceEntryKey'] not in CP3),'previous twenty backlog rows changed')
  check(d['discoveries'][:54]==d2['discoveries'],'previous CP2 discovery cases changed')
 if args.phase1_full:
  raw=args.phase1_full.read_bytes();check(git_blob_sha(raw)==PHASE1_SHA,'Phase1 full Git blob does not match')
  proj=json.loads(raw)
  rows=next(x['entries'] for x in proj['books'] if x['book']==BOOK)
  parsed=[(x['sourceEntryKey'],x['shipName'],x['printedStatblockPage'],x['pdfPhysicalPage'],x['sectionStartPage']) for x in rows]
  check(parsed==[tuple(x) for x in ROSTER],'full Phase1 roster mismatch')
 if args.phase1_projection:
  proj=rd(args.phase1_projection);rows=next(x['entries'] for x in proj['books'] if x['book']==BOOK)
  parsed=[(x['sourceEntryKey'],x['shipName'],x['printedStatblockPage'],x['pdfPhysicalPage'],x['sectionStartPage']) for x in rows]
  check(parsed==[tuple(x) for x in ROSTER],'Phase1 projection roster differs')
 if args.zip_file:
  with zipfile.ZipFile(args.zip_file) as z:
   check(sorted(z.namelist())==sorted(FILES.values()),'ZIP contains different paths')
   check(z.testzip() is None,'ZIP CRC failure')
   for k,path in FILES.items():check(z.read(path)==(args.repo_root/path).read_bytes(),'ZIP extracted file mismatch: '+k)
 print('PASS: KOTOR Phase 2B 32/32 source-reviewed; 69 weapon attack groups; 7 printed-source conflicts; 84 schema-discovery cases; strict mechanical certificates 0/32.')
 print('CP2 continuity:','verified' if args.cp2_root else 'not requested')
 print('PDF fingerprint:','verified' if args.source_pdf else 'not requested')
 print('Phase1 origin:','full Git blob verified' if args.phase1_full else ('roster projection verified' if args.phase1_projection else 'static original roster only'))
 print('ZIP integrity:','verified' if args.zip_file else 'not requested')
 print('This audit gate does NOT claim repo-wide tests or physical-mount certification.')

if __name__=='__main__':main()
