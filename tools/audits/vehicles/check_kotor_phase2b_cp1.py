#!/usr/bin/env python3
"""KOTOR Phase 2B Checkpoint 1 audit-only gate: 10/32 PDF source close-reads.

Strict mechanical certification is NOT implied. No production data is mutated.
Standalone use:
  python tools/audits/vehicles/check_kotor_phase2b_cp1.py --repo-root . --source-pdf /path/to/KOTOR.pdf
Optionally provide --phase1 /path/to/full/swse-phase1-vehicle-provenance.json
for independent unchanged identity/locator validation against the original Git blob.
"""
from __future__ import annotations
import argparse, hashlib, json, pathlib, sys, zipfile
BOOK='Knights of the Old Republic Campaign Guide'
SOURCE_SHA='fd6a61b0ca0d5d8aeec722d033a6652cb23c932f119d4298f523394f96efa419'
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
ROSTER=[('kotor-amalgamated-hyperdyne-578-r-space-transport',
  'Amalgamated Hyperdyne 578-R Space Transport',
  98,
  99,
  98),
 ('kotor-arakyd-industries-lethisk-class-armed-freighter',
  'Arakyd Industries Lethisk-class Armed Freighter',
  99,
  100,
  99),
 ('kotor-corellia-stardrive-quartermaster-class-supply-carrier',
  'Corellia StarDrive Quartermaster-class Supply Carrier',
  100,
  101,
  100),
 ('kotor-corellian-engineering-corporation-s-100-stinger-class-starfighter',
  'Corellian Engineering Corporation S-100 Stinger-class Starfighter',
  95,
  96,
  95),
 ('kotor-corellian-engineering-corporation-s-250-chela-class-starfighter',
  'Corellian Engineering Corporation S-250 Chela-class Starfighter',
  181,
  182,
  181),
 ('kotor-davaab-type-starfighter', 'Davaab-type Starfighter', 204, 205, 204),
 ('kotor-ebon-hawk', 'Ebon Hawk', 220, 221, 220),
 ('kotor-eleaor-propulsion-baronial-class-yacht', 'Eleaor Propulsion Baronial-class Yacht', 143, 144, 143),
 ('kotor-eleaor-propulsion-starscape-class-yacht', 'Eleaor Propulsion Starscape-class Yacht', 222, 223, 221),
 ('kotor-hoersch-kessel-drive-g-type-light-shuttle', 'Hoersch-Kessel Drive G-Type Light Shuttle', 98, 99, 98),
 ('kotor-jehavey-ir-type-assault-ship', "Jehavey'ir-type Assault Ship", 206, 207, 205),
 ('kotor-kandosii-type-dreadnaught', 'Kandosii-type Dreadnaught', 207, 208, 206),
 ('kotor-koros-spaceworks-cx-133-chaos-fighter', 'Koros Spaceworks CX-133 Chaos Fighter', 220, 221, 220),
 ('kotor-koros-spaceworks-supremacy-class-attack-ship',
  'Koros Spaceworks Supremacy-class Attack Ship',
  221,
  222,
  221),
 ('kotor-kyramud-type-battleship', 'Kyramud-type Battleship', 206, 207, 206),
 ('kotor-pelagia-duplex-command-assault-gunship', 'Pelagia Duplex Command Assault Gunship', 100, 101, 100),
 ('kotor-rendili-hyperworks-hammerhead-class-cruiser',
  'Rendili Hyperworks Hammerhead-class Cruiser',
  184,
  185,
  184),
 ('kotor-rendili-hyperworks-inexpugnable-class-tactical-command-vessel',
  'Rendili Hyperworks Inexpugnable-class Tactical Command Vessel',
  185,
  186,
  184),
 ('kotor-rendili-hyperworks-praetorian-class-frigate',
  'Rendili Hyperworks Praetorian-class Frigate',
  101,
  102,
  101),
 ('kotor-republic-fleet-systems-aurek-tactical-strikefighter',
  'Republic Fleet Systems Aurek Tactical Strikefighter',
  181,
  182,
  181),
 ('kotor-republic-fleet-systems-conductor-class-short-haul-landing-craft',
  'Republic Fleet Systems Conductor-class Short-haul Landing Craft',
  182,
  183,
  181),
 ('kotor-republic-fleet-systems-foray-class-blockade-runner',
  'Republic Fleet Systems Foray-class Blockade Runner',
  183,
  184,
  183),
 ('kotor-republic-fleet-systems-kt-400-military-droid-carrier',
  'Republic Fleet Systems KT-400 Military Droid Carrier',
  183,
  184,
  183),
 ('kotor-republic-fleet-systems-star-saber-xc-01-starfighter',
  'Republic Fleet Systems Star Saber XC-01 Starfighter',
  96,
  97,
  96),
 ('kotor-shaadlar-type-troopship', 'Shaadlar-type Troopship', 205, 206, 204),
 ('kotor-star-forge-manufacture-centurion-class-battlecruiser',
  'Star Forge Manufacture Centurion-class Battlecruiser',
  163,
  164,
  162),
 ('kotor-star-forge-manufacture-derriphan-class-battleship',
  'Star Forge Manufacture Derriphan-class Battleship',
  163,
  164,
  163),
 ('kotor-star-forge-manufacture-herald-class-shuttle',
  'Star Forge Manufacture Herald-class Shuttle',
  164,
  165,
  164),
 ('kotor-star-forge-manufacture-interdictor-class-warship',
  'Star Forge Manufacture Interdictor-class Warship',
  161,
  162,
  161),
 ('kotor-star-forge-manufacture-sith-interceptor', 'Star Forge Manufacture Sith Interceptor', 164, 165, 164),
 ('kotor-teroch-type-fast-attack-gunship', 'Teroch-type Fast Attack Gunship', 205, 206, 205),
 ('kotor-zentine-dynamics-ministry-class-orbital-shuttle',
  'Zentine Dynamics Ministry-class Orbital Shuttle',
  182,
  183,
  182)]
REVIEWED=['kotor-corellian-engineering-corporation-s-100-stinger-class-starfighter',
 'kotor-republic-fleet-systems-star-saber-xc-01-starfighter',
 'kotor-amalgamated-hyperdyne-578-r-space-transport',
 'kotor-hoersch-kessel-drive-g-type-light-shuttle',
 'kotor-arakyd-industries-lethisk-class-armed-freighter',
 'kotor-corellia-stardrive-quartermaster-class-supply-carrier',
 'kotor-pelagia-duplex-command-assault-gunship',
 'kotor-rendili-hyperworks-praetorian-class-frigate',
 'kotor-eleaor-propulsion-baronial-class-yacht',
 'kotor-star-forge-manufacture-interdictor-class-warship']
FILES={'backlog': 'data/audits/vehicles/swse-phase2b-kotor-cp1-weapon-mount-backlog.json',
 'discovery': 'data/audits/vehicles/swse-phase2c-kotor-cp1-schema-discovery.json',
 'ledger': 'data/audits/vehicles/swse-phase2b-kotor-cp1-per-entry-source-review-ledger.json',
 'report': 'docs/audits/vehicles/swse-phase2b-kotor-cp1-source-review.md',
 'validator': 'tools/audits/vehicles/check_kotor_phase2b_cp1.py'}
FIELD_GROUPS=['printedTypeLine',
 'challenge',
 'initiativeSenses',
 'defenses',
 'durability',
 'speed',
 'rangedAttack',
 'meleeAttack',
 'fightingSpace',
 'baseAttack',
 'attackOptions',
 'abilities',
 'skills',
 'crew',
 'capacity',
 'payload',
 'hyperdrive',
 'cost',
 'weaponAttackProfile']
COUNTS={'publicationShipClaims': 32,
 'primaryPdfCloseReads': 10,
 'primaryPdfCloseReadsOutstanding': 22,
 'strictFullFieldAndPhysicalWeaponMountCertificates': 0,
 'strictCertificatesOutstanding': 32,
 'attackGroupRowsReviewed': 17,
 'sourceConflictRecordCount': 0,
 'phase1PageMappingDiscrepancyCount': 1}
STATES={'PDF_VERIFIED','SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED','SCHEMA_INCOMPATIBLE','NOT_REVIEWED'}

def fail(msg):raise AssertionError(msg)
def check(ok,msg):
 if not ok:fail(msg)
def sha256_file(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def git_blob_sha(content):
 blob=b'blob '+str(len(content)).encode()+b'\x00'+content
 return hashlib.sha1(blob).hexdigest()

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--repo-root',type=pathlib.Path,default=pathlib.Path('.'))
 p.add_argument('--source-pdf',type=pathlib.Path,help='Full original source PDF; SHA-256 validated')
 p.add_argument('--phase1',type=pathlib.Path,help='Full original Phase 1 provenance JSON, checked against published Git blob')
 p.add_argument('--require-phase1',action='store_true')
 p.add_argument('--zip-file',type=pathlib.Path,help='Changed-files-only archive path to integrity-check')
 args=p.parse_args()
 if args.require_phase1 and args.phase1 is None:p.error('--require-phase1 requires --phase1')
 repo=args.repo_root
 r=lambda k:json.loads((repo/FILES[k]).read_text(encoding='utf8'))
 l,b,d=r('ledger'),r('backlog'),r('discovery')
 report=(repo/FILES['report']).read_text(encoding='utf8')
 check(l['sourceBook']==b['sourceBook']==d['sourceBook']==BOOK,'source book drift')
 check(l['sourcePdfSha256']==b['sourcePdfSha256']==SOURCE_SHA,'source PDF fingerprint drift')
 check(l['phase1ProvenanceBlobSha']==PHASE1_SHA,'phase1 Git blob hash drift')
 check(l['counts']==b['counts']==COUNTS,'ledger/backlog/count totals drift')
 check(d['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION' and d['schemaFrozen'] is False,'discovery was promoted to production')
 check(d['counts']=={'discoveryCases':27,'bookScopeReviewed':10} and len(d['discoveries'])==27,'discovery totals incorrect')
 check(len(set(x['id'] for x in d['discoveries']))==27,'duplicate discovery ID')
 check(len(l['entries'])==len(b['records'])==len(ROSTER)==32,'32-entry cumulative inventory required')
 keys=[x[0] for x in ROSTER]
 check(len(set(keys))==32,'invalid static roster')
 check([x['sourceEntryKey'] for x in l['entries']]==keys,'Phase 1 sourceEntryKey order/identity drift')
 check([x['sourceEntryKey'] for x in b['records']]==keys,'mount backlog key/order drift')
 check(l['fieldGroups']==FIELD_GROUPS,'field group checklist mutated')
 check(l['checkpoint1']['trancheOrder']==REVIEWED,'unexpected initial 10-ship selection')
 reviewed_count=groups_count=conflicts_count=page_mapping_count=0
 for origin,e,m in zip(ROSTER,l['entries'],b['records']):
  key,name,page,pdf,section=origin
  check((e['sourceEntryKey'],e['printedName'],e['printedStatblockStartPage'],e['phase1PdfPhysicalPage'],e['phase1SectionStartPage'])==origin,'Phase1 invariant changed: '+key)
  check((m['sourceEntryKey'],m['printedName'],m['printedPage'])==(key,name,page),'mount key/name/page mutated: '+key)
  check(set(e['fieldGroups'])==set(FIELD_GROUPS) and set(e['fieldGroups'].values())<=STATES,'invalid field evidence states: '+key)
  check(not e['fullFieldCertified'] and not e['fullWeaponMountReconciled'] and not m['strictCertified'],'unsupported strict certificate: '+key)
  check(len(m['weaponAttackGroups'])==len(e['mountAndFiringGroups']),'attack/backlog mismatch: '+key)
  check(e['sourceConflicts']==[],'no published contradictions independently verified for CP1: '+key)
  conflicts_count+=len(e['sourceConflicts'])
  reviewed=(key in REVIEWED)
  check(e['endPageReviewStatus']==m['reviewStatus']==('PDF_VERIFIED' if reviewed else 'NOT_REVIEWED'),'review mismatch: '+key)
  if reviewed:
   reviewed_count+=1
   check(e['printedFacts'] is not None and e['sourceEvidence'] is not None,'reviewed ship lacks facts or evidence: '+key)
   check(e['reviewedPDFPages'] and len(e['fieldGroups'])==19,'missing reviewed PDF pages: '+key)
   check(all(s!='NOT_REVIEWED' for s in e['fieldGroups'].values()),'reviewed entry left pending field state: '+key)
   check(e['narrativeMechanicsStatus']=='PDF_VERIFIED','narrative not source reviewed: '+key)
   check(e['sourceFieldStates']['weaponFiringArc']=='SOURCE_SILENT_CONFIRMED','unverified firing arc normalized: '+key)
   check(e['sourceFieldStates']['batteryComposition']=='SOURCE_SILENT_CONFIRMED','unverified battery mounts normalized: '+key)
   check(e['blockingFindings'],'must retain certification blockers: '+key)
   f=e['printedFacts']
   check(f['cl'] is not None and f['type'] and f['defenses'] and f['durability'] and f['skills'] and f['crew'],'incomplete reviewed core facts: '+key)
   check(f['combat']['grappleBonus'] is not None and f['abilities']['constitution']=='—','published stats missing: '+key)
   check(set(f['skills'])=={'initiative','mechanics','perception','pilot','useComputer'},'skill field drift: '+key)
   if f['defenses']['shieldRating'] is None:check(e['sourceFieldStates']['shieldRating']=='SOURCE_SILENT_CONFIRMED','unset shield should be source silent')
   if f['hyperdrive'] is None:check(e['fieldGroups']['hyperdrive']=='SOURCE_SILENT_CONFIRMED','unset hyperdrive should be source silent')
   for w,w2 in zip(e['mountAndFiringGroups'],m['weaponAttackGroups']):
    check(w['weaponLabel']==w2['label'] and w['attackBonus']==w2['attackBonus'],'attack-group name/attack mismatch: '+key)
    check(w['sourcePage'] in e['reviewedPDFPages'],'attack group outside actual PDF read: '+key)
    check(w['firingArc']=='SOURCE_SILENT_CONFIRMED' and w['batteryComposition']=='SOURCE_SILENT_CONFIRMED','invented weapon arc/battery composition: '+key)
    check(isinstance(w['attackBonus'],int) and w['damage'] is not None,'blank printed weapon: '+key)
   groups_count+=len(e['mountAndFiringGroups'])
   page_mapping_count+=int(bool(e['sourceEvidence'].get('phase1PageMappingDiscrepancy')))
  else:
   check(e['printedFacts'] is None and e['sourceEvidence'] is None,'unreviewed ship has facts: '+key)
   check(not e['reviewedPDFPages'] and not e['mountAndFiringGroups'],'unreviewed ship has PDF/weapon evidence: '+key)
   check(set(e['fieldGroups'].values())=={'NOT_REVIEWED'},'unreviewed field incorrectly certified: '+key)
   check(m['weaponAttackGroups']==[] and m['hardwareEvidenceStatus']=='NOT_REVIEWED','unreviewed backlog field: '+key)
 # Static extracted printed-statblock spot checks protect checkpoint-specific transcription against simple count-only validation.
 spot={
  's-100-stinger':(9,90,30,26,2),'star-saber-xc-01':(10,120,35,33,1),
  '578-r-space':(6,100,None,34,1),'g-type-light':(8,100,30,36,1),
  'lethisk-class':(10,150,30,40,2),'pelagia-duplex':(12,130,20,41,2),
  'quartermaster-class':(6,200,50,43,0),'praetorian-class':(14,850,100,47,3),
  'baronial-class':(6,115,10,37,1),'interdictor-class':(16,1250,110,62,4)}
 for part,(cl,hp,sr,gr,groupcount) in spot.items():
  e=next(x for x in l['entries'] if part in x['sourceEntryKey'])
  f=e['printedFacts']
  check((f['cl'],f['durability']['hitPoints'],f['defenses']['shieldRating'],f['combat']['grappleBonus'],len(e['mountAndFiringGroups']))==(cl,hp,sr,gr,groupcount),'printed stat block checkpoint changed: '+part)
 stinger=next(x for x in l['entries'] if 's-100-stinger' in x['sourceEntryKey'])
 check(stinger['printedStatblockStartPage']==95 and stinger['specializedPublishedVariantsAndPageCorrections']['verifiedActualPrintedStatblockStartPage']==96,'S100 phase1 page discrepancy not preserved')
 q=next(x for x in l['entries'] if 'quartermaster-class' in x['sourceEntryKey'])
 check(q['fieldGroups']['weaponAttackProfile']=='SOURCE_SILENT_CONFIRMED' and not q['mountAndFiringGroups'],'invented Quartermaster guns')
 g=next(x for x in l['entries'] if 'g-type-light' in x['sourceEntryKey'])
 check(g['specializedPublishedVariantsAndPageCorrections']['escapeShuttleVariant']['shieldRating']==50,'G-type escape variant missing')
 check(reviewed_count==10 and groups_count==17 and conflicts_count==0 and page_mapping_count==1,'actual derived counts failed')
 check(all(str(x) in report for x in ['10 / 32','17','27','95','96','0 / 32']),'markdown report totals/issue absent')
 if args.source_pdf:
  check(args.source_pdf.is_file() and sha256_file(args.source_pdf)==SOURCE_SHA,'source PDF SHA-256 mismatch')
 if args.phase1:
  raw=args.phase1.read_bytes()
  check(git_blob_sha(raw)==PHASE1_SHA,'provided Phase1 is not exact live Git blob')
  full=json.loads(raw)
  book=next(x for x in full['books'] if x['book']==BOOK)
  live=[(x['sourceEntryKey'],x['shipName'],x['printedStatblockPage'],x['pdfPhysicalPage'],x['sectionStartPage']) for x in book['entries']]
  check(live==ROSTER,'live Phase1 book identities diverge')
 if args.zip_file:
  with zipfile.ZipFile(args.zip_file,'r') as z:
   paths=sorted(z.namelist());expected=sorted(FILES.values())
   check(paths==expected,'changed-files-only ZIP contents mismatch')
   check(z.testzip() is None,'ZIP CRC check failed')
   for rel in expected:check(z.read(rel)==(repo/rel).read_bytes(),'ZIP file differs from local: '+rel)
 print('PASS: KOTOR CP1 32/32 stable publication identities; 10/32 PDF source reviews; 22 pending; 17 attack groups; 27 discovery cases; 1 preserved Phase1 page discrepancy; strict certifications 0/32.')
 print('Validation scope:', 'full original Phase1 verified' if args.phase1 else 'GitHub-verified 32-entry Phase1 projection embedded (full Phase1 not supplied)')
 print('PDF scope:', 'source PDF fingerprint verified' if args.source_pdf else 'source PDF fingerprint not independently checked in this invocation')
 print('Full repo regression suite / physical weapon mount certification NOT included.')

if __name__=='__main__':
 try:main()
 except (AssertionError, KeyError, ValueError, OSError, zipfile.BadZipFile) as ex:
  print('FAIL:',str(ex),file=sys.stderr);sys.exit(1)
