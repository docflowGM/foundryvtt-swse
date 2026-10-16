#!/usr/bin/env python3
"""Legacy Era CP1 source-review regression; never mutates production data."""
import argparse, pathlib, json, hashlib
BASE=pathlib.Path(__file__).resolve().parents[3]
D=BASE/'data/audits/vehicles'
N='legacy-era-cp1'
PDF_SHA='344d172e21daa7fdb3e0b032671e6833122f95d1175cf943bb1bb4a8110c561d'
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
def check(cond,msg):
 if not cond: raise AssertionError(msg)
def run(args):
 l=json.loads((D/'swse-phase2b-legacy-era-cp1-per-entry-source-review-ledger.json').read_text())
 b=json.loads((D/'swse-phase2b-legacy-era-cp1-weapon-mount-backlog.json').read_text())
 s=json.loads((D/'swse-phase2c-legacy-era-cp1-schema-discovery.json').read_text())
 entries=l['entries']; reviewed=[e for e in entries if e['endPageReviewStatus']=='PDF_VERIFIED']; pending=[e for e in entries if e['endPageReviewStatus']=='NOT_REVIEWED']
 keys=[x['sourceEntryKey'] for x in entries]
 check(len(entries)==len(keys)==len(set(keys))==39,'Phase1 identity roster: 39 distinct keys')
 check(len(reviewed)==10 and len(pending)==29,'Exactly 10 reviewed, 29 pending')
 check(l['counts']['primaryPdfCloseReads']==10 and l['counts']['primaryPdfCloseReadsOutstanding']==29,'Wrong declared source close reads')
 check(l['counts']['strictFullFieldAndPhysicalWeaponMountCertificates']==0,'No strict mechanical certification authorized')
 check([e['printedStatblockStartPage'] for e in reviewed]==[83,84,85,86,87,87,88,89,89,91],'Reviewed PDF pages not expected')
 check(all(not e['fullFieldCertified'] and not e['fullWeaponMountReconciled'] for e in entries),'Any forbidden strict certification')
 check(all(e['printedFacts'] is None and not e['mountAndFiringGroups'] for e in pending),'Pending ship given fabricated source facts')
 rows=sum(len(e['mountAndFiringGroups']) for e in reviewed)
 check(rows==12 and b['counts']['weaponAttackGroups']==rows==l['counts']['attackGroupRowsReviewed'],'Attack group inventory mismatch')
 check(len(b['entries'])==39 and {e['sourceEntryKey'] for e in b['entries']}==set(keys),'Mount backlog identities disagree')
 check(l['sourcePdfSha256']==PDF_SHA and b['sourcePdfSha256']==PDF_SHA,'PDF fingerprint mismatch in artifacts')
 check(not s['productionMutationAuthorized'] and not s['schemaFrozen'] and len(s['cases'])==16,'Discovery-only guard broken')
 check(all(c['sourceEntryKey'] in keys and not c['productionMutationAuthorized'] for c in s['cases']),'Discovery case mutation leak')
 look={e['sourceEntryKey']:e for e in entries}
 j=look['le-j-1-shuttle']; jf=j['printedFacts']['supplementalPrintedFacts']
 check(j['fieldGroups']['rangedAttack']=='SOURCE_CONFLICT_PRESERVED' and jf['printedMainRangedAttack']==4 and jf['printedWeaponRowAttack']==6 and jf['printedWeaponRowAutofire']==1,'J-1 attack discrepancy lost')
 check(look['le-helot-class-medium-transport']['sourceFieldStates']['shieldRating']=='NARRATIVE_CONFIRMED_ABSENT','Helot explicit shieldless narrative lost')
 m=look['le-mc-24a-light-shuttle']
 check(m['fieldGroups']['hyperdrive']=='SOURCE_SILENT_CONFIRMED' and m['printedFacts']['supplementalPrintedFacts']['specialShieldRecovery'].startswith('10 SR'),'MC-24a exceptional recovery or absent drive-line handling lost')
 x=look['le-x-83-twintail-starfighter']['printedFacts'];check(x['skills']['mechanicsWithAstromech']==13 and x['skills']['useComputerWithAstromech']==13 and x['payload']=='16 proton torpedoes','Astromech/payload rule lost')
 y=look['le-yx-1980-space-transport']['printedFacts']; check(y['supplementalPrintedFacts']['mechanicsInstallUpgradePenalty']==-5 and y['supplementalPrintedFacts']['deckPlanPrintedPage']==90,'YX-1980 special rules lost')
 check(len(look['le-r-28-starfighter']['mountAndFiringGroups'])==2 and len(look['le-x-83-twintail-starfighter']['mountAndFiringGroups'])==2,'Independent attack groups combined')
 check(all(w['hardwareCount']=='SOURCE_SILENT_CONFIRMED' and w['firingArc']=='SOURCE_SILENT_CONFIRMED' for e in reviewed for w in e['mountAndFiringGroups']),'Invented physical mounts/arcs')
 if args.source_pdf:
  p=pathlib.Path(args.source_pdf);check(p.is_file(),'Source PDF missing')
  check(hashlib.sha256(p.read_bytes()).hexdigest()==PDF_SHA,'Source PDF bytes differ')
  print('PASS: original scanned PDF SHA-256 verified')
 if args.phase1:
  p=pathlib.Path(args.phase1);check(p.is_file(),'Phase1 provenance not found')
  phase=json.loads(p.read_text());b1=next(x for x in phase['books'] if x['book']=='Legacy Era Campaign Guide')
  expected={x['sourceEntryKey']:(x['shipName'],x['printedStatblockPage'],x['pdfPhysicalPage']) for x in b1['entries']}
  actual={x['sourceEntryKey']:(x['printedName'],x['printedStatblockStartPage'],x['phase1PdfPhysicalPage']) for x in entries}
  check(expected==actual,'Entries differ from Phase 1 names, keys or page references')
  print('PASS: all 39 keys/names/pages verified against Phase1 provenance')
 elif args.require_phase1:
  raise AssertionError('--require-phase1 needs --phase1 <path>')
 else: print('NOTE: optional independent Phase1 provenance comparison not provided')
 print('PASS: 10/39 primary PDF reads; 29 pending; 12 attack rows; 0 strict certificates')
 print('PASS: printed J-1 +4/+6 conflict, Helot shield absence, MC-24a, X-83, YX-1980 verified')
 print('PASS: 16 discovery-only schema cases; no production mutation or mount inference')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--source-pdf');p.add_argument('--phase1');p.add_argument('--require-phase1',action='store_true');run(p.parse_args())
