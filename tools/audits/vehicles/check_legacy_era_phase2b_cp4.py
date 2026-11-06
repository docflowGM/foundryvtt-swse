#!/usr/bin/env python3
"""Validate Legacy Era Phase 2B book-level SOURCE review closure (audit only)."""
import argparse, json, hashlib, pathlib, zipfile
R=pathlib.Path(__file__).resolve().parents[3]
D=R/'data/audits/vehicles'
SHA='344d172e21daa7fdb3e0b032671e6833122f95d1175cf943bb1bb4a8110c561d'
SIL='SOURCE_SILENT_CONFIRMED';VER='PDF_VERIFIED';CF='SOURCE_CONFLICT_PRESERVED'
def ck(x,msg):
 if not x:raise AssertionError(msg)
def main(a):
 l=json.loads((D/'swse-phase2b-legacy-era-cp4-book-source-closure-ledger.json').read_text())
 b=json.loads((D/'swse-phase2b-legacy-era-cp4-book-source-closure-mount-backlog.json').read_text())
 s=json.loads((D/'swse-phase2c-legacy-era-cp4-schema-discovery.json').read_text())
 es=l['entries'];I={e['sourceEntryKey']:e for e in es};keys=list(I)
 ck(len(es)==len(keys)==39 and len(set(keys))==39,'39 original separate source entries')
 ck(len([e for e in es if e['endPageReviewStatus']==VER])==39 and not any(e['endPageReviewStatus']=='NOT_REVIEWED' for e in es),'39 source verified')
 ck(l['counts']['publicationShipClaims']==39 and l['counts']['primaryPdfCloseReads']==39 and l['counts']['primaryPdfCloseReadsOutstanding']==0,'source closure counts')
 ck(l['counts']['strictFullFieldAndPhysicalWeaponMountCertificates']==0 and l['counts']['strictCertificatesOutstanding']==39,'strict mechanical review must remain open')
 ck(all(e['printedFacts'] is not None and not e['fullFieldCertified'] and not e['fullWeaponMountReconciled'] and e['mountAndFiringGroups'] for e in es),'no omissions or premature certifications')
 ck([e['printedStatblockStartPage'] for e in es[30:]]==[188,189,190,191,200,218,218,219,220],'final 9 Phase 1 page assignments')
 total=sum(len(e['mountAndFiringGroups']) for e in es)
 ck(total==92==l['counts']['attackGroupRowsReviewed']==b['counts']['weaponAttackGroups'],'weapon row total 92')
 ck(all(w['hardwareCount']==w['firingArc']==w['batteryComposition']==SIL for e in es for w in e['mountAndFiringGroups']),'uncertified physical mounts/arcs/battery composition')
 ck(len(b['entries'])==39 and b['counts']=={'publicationShipClaims':39,'reviewedShipClaims':39,'unreviewedShipClaims':0,'weaponAttackGroups':92,'fullStrictMechanicalCertificates':0},'mount backlog closure')
 for e,be in zip(es,b['entries']):
  ck(e['sourceEntryKey']==be['sourceEntryKey'] and len(e['mountAndFiringGroups'])==len(be['attackGroups']) and not be['strictMechanicalCertificate'],'mount backlog parity')
 ck(len(s['cases'])==74 and s['counts']['newCases']==20 and s['counts']['cumulativeLegacyEraCases']==74 and not s['productionMutationAuthorized'] and not s['schemaFrozen'],'74 discovery-only cases')
 ck(len({x['caseId'] for x in s['cases']})==74 and all(x['status']=='DISCOVERY_ONLY' and not x['productionMutationAuthorized'] and x['sourceEntryKey'] in I for x in s['cases']),'discovery not production')
 conflicts={'le-j-1-shuttle':'rangedAttack','le-bb-2-starfire-fighter-bomber':'crew','le-i4-ionizer-starfighter':'initiativeSenses','le-scarlet-star-modified-yt-2400-transport':'initiativeSenses','le-nemesis-class-patrol-ship':'rangedAttack'}
 for k,f in conflicts.items(): ck(I[k]['fieldGroups'][f]==CF,'source conflict lost '+k)
 ck(l['counts']['sourceConflictRecordCount']==5,'source conflict totals')
 ck(I['le-sigma-class-long-range-shuttle']['printedFacts']['supplementalPrintedFacts']['imperialKnightVariant']['carriedCraft']=='3 Predator-class starfighters','Sigma alternate ship configuration')
 ck(I['le-ardent-class-fast-frigate']['printedFacts']['supplementalPrintedFacts']['tacticalFire']['allDefensesPenalty']==-1,'Ardent enemy debuff')
 ck(I['le-pellaeon-class-star-destroyer']['printedFacts']['supplementalPrintedFacts']['tacticalFire']['allyAttackBonus']==2,'Pellaeon attack boost')
 imp=I['le-imperious-class-star-destroyer']['printedFacts']['supplementalPrintedFacts']
 ck(imp['shieldRechargeBonusSR']==10 and imp['gravityMine']['defenses']['reflex']==12 and imp['tacticalFire']['allyOnSuccessfulStarshipWeaponAttackBonusHP']==20,'Imperious shield, mine, temp HP')
 ck(I['le-crimson-axe']['printedFacts']['supplementalPrintedFacts']['groundedCondition']['reflex']==11,'Crimson Axe grounded')
 ck(I['le-a519-invader-close-support-starfighter']['printedFacts']['supplementalPrintedFacts']['burstFire']['usableWithoutFeatAtShortOrPointBlank'],'A519 Burst Fire')
 ck(I['le-nemesis-class-patrol-ship']['printedFacts']['supplementalPrintedFacts']['rangedLineHasDanglingOr'] and len(I['le-nemesis-class-patrol-ship']['mountAndFiringGroups'])==2,'Nemesis incomplete alternative')
 for k in ('le-the-grinning-liar','le-the-mynock'):
  e=I[k];ck(e['printedFacts']['supplementalPrintedFacts']['printedSizeRetained']=='Colossal' and len(e['printedFacts']['supplementalPrintedFacts']['treatedAsGargantuanStarfighterFor'])==3,k+' scoped size treatment')
 ck(I['le-the-mynock']['printedFacts']['supplementalPrintedFacts']['modifiedFrom']=='Helot-class medium transport','Mynock identity and origin')
 if a.cp3_zip:
  with zipfile.ZipFile(a.cp3_zip) as z:
   n=next(x for x in z.namelist() if x.endswith('cp3-per-entry-source-review-ledger.json'));o=json.loads(z.read(n))
  ck(o['entries'][:30]==es[:30],'CP1-3 reviewed object changed');ck([e['sourceEntryKey'] for e in o['entries']]==keys,'Phase1 identities/order changed')
  print('PASS: first 30 CP1-3 reviewed objects unchanged byte-equivalently')
 if a.phase1:
  p=json.loads(pathlib.Path(a.phase1).read_text());bk=next(x for x in p['books'] if x['book']=='Legacy Era Campaign Guide')
  original={e['sourceEntryKey']:(e['shipName'],e['printedStatblockPage'],e['pdfPhysicalPage']) for e in bk['entries']}
  got={e['sourceEntryKey']:(e['printedName'],e['printedStatblockStartPage'],e['phase1PdfPhysicalPage']) for e in es}
  ck(original==got,'Phase1 provenance changed');print('PASS: all 39 Phase1 keys, names, printed and physical pages matched')
 elif a.require_phase1:raise AssertionError('Missing Phase1 provenance')
 if a.source_pdf:
  ck(hashlib.sha256(pathlib.Path(a.source_pdf).read_bytes()).hexdigest()==SHA,'Primary source PDF fingerprint wrong')
  print('PASS: original scanned Legacy Era PDF fingerprint')
 print('PASS: 39/39 source reviews; 92 weapon attack rows; 74 discovery cases; 5 source ambiguities/conflicts; no mechanical certificates or production mutation')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cp3-zip');p.add_argument('--source-pdf');p.add_argument('--phase1');p.add_argument('--require-phase1',action='store_true');main(p.parse_args())
