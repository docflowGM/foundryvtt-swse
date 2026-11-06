#!/usr/bin/env python3
"""Validate final fixed Phase1 vessel source-review census closeout.
This is a source-evidence/consistency validator; not a production/mechanical certificate.
"""
from pathlib import Path
import argparse,hashlib,json,zipfile
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
HEAD='49fabf107f287b8147a59b75a9dd09e49ed7426f'
EXPECTED={
 'core-rulebook':('Core Rulebook',10,22,36,2,[('core-arc-170-starfighter',180),('core-corellian-yt-1300-transport',182),('core-droid-tri-fighter',181),('core-eta-2-actis-interceptor',180),('core-imperial-i-class-star-destroyer',183),('core-incom-t-65b-x-wing-starfighter',178),('core-koensayr-y-wing-starfighter',178),('core-tie-fighter',179),('core-tie-interceptor',179),('core-vulture-class-droid-starfighter',180)]),
 'galaxy-at-war':('Galaxy at War',5,13,18,1,[('gaw-corona-class-armed-transport',67),('gaw-imperial-landing-craft',64),('gaw-koensayr-ilh-kk-citadel-class-cruiser',192),('gaw-penumbra-class-attack-shuttle',65),('gaw-yu-410-light-freighter',65)]),
 'galaxy-of-intrigue':('Galaxy of Intrigue',6,9,23,2,[('goi-modified-incom-a-24-sleuth',69),('goi-modified-sienar-fleet-systems-lambda-class-shuttle',186),('goi-ptv-2100-incarcerator',68),('goi-republic-engineering-corporation-ferret-class-reconnaissance-vessel',69),('goi-republic-engineering-corporation-prowler-class-reconnaissance-vessel',70),('goi-sabaoth-frigate-spy-ship',71)]),
 'jedi-academy-training-manual':('Jedi Academy Training Manual',1,1,4,0,[('jatm-chu-unthor',151)]),
 'threats-of-the-galaxy':('Threats of the Galaxy',1,1,3,0,[('tog-cec-vcx-350-light-freighter',89)])}
PDFS={'core-rulebook':'Star Wars Saga Edition.pdf','galaxy-at-war':'SW_Saga_Galaxy_at_War.pdf','galaxy-of-intrigue':'Galaxy of Intrigue.pdf','jedi-academy-training-manual':'SW Saga - Jedi Academy Training Manual (optimized).pdf','threats-of-the-galaxy':'SAGA EDITION - Threats of the Galaxy.pdf'}
def need(b,msg):
 if not b:raise AssertionError(msg)
def read(p):return json.loads(p.read_text())
def main():
 p=argparse.ArgumentParser();p.add_argument('--repo-root',default='.');p.add_argument('--pdf-dir');p.add_argument('--zip-file');a=p.parse_args();root=Path(a.repo_root).resolve();base=root/'data/audits/vehicles';total=0;new=0
 stats=read(base/'swse-phase2b-final17-book-counts.json')
 for slug,(book,count,weapons,disc,conflicts,roster) in EXPECTED.items():
  ledger=read(base/f'swse-phase2b-{slug}-book-source-closure-ledger.json')
  mounts=read(base/f'swse-phase2b-{slug}-book-source-closure-mount-backlog.json')
  discoveries=read(base/f'swse-phase2c-{slug}-book-source-closure-schema-discovery.json')
  need(book==ledger['sourceBook']==mounts['sourceBook']==discoveries['sourceBook'],f'{slug} book consistency')
  need(ledger['phase1ProvenanceBlobSha']==PHASE1_SHA and ledger['branchHeadAtInitialization']==HEAD,f'{slug} frozen authority')
  entries=ledger['entries'];need(len(entries)==count and len({e['sourceEntryKey'] for e in entries})==count,f'{slug} count/duplicates')
  need([(e['sourceEntryKey'],e['printedStatblockStartPage']) for e in entries]==roster,f'{slug} phase1 identity/page drift')
  need(all(e['phase1PdfPhysicalPage']==e['printedStatblockStartPage']+1 for e in entries),f'{slug} physical PDF offset')
  need(all(e['endPageReviewStatus']=='PDF_VERIFIED' and e['sourceEvidence']['pdfVisualCheckForThisCheckpoint'] for e in entries),f'{slug} unreviewed state')
  need(all(e['sourceEvidence']['pdfSha256']==ledger['sourcePdfSha256'] for e in entries),f'{slug} PDF fingerprint mismatch')
  need(all(not e['fullFieldCertified'] and not e['fullWeaponMountReconciled'] for e in entries),f'{slug} false certification')
  need(sum(len(e['mountAndFiringGroups']) for e in entries)==weapons,f'{slug} weapon group count')
  need(sum(len(e['sourceConflicts']) for e in entries)==conflicts,f'{slug} conflict count')
  need(ledger['counts']['publicationShipClaims']==count and ledger['counts']['primaryPdfCloseReads']==count and ledger['counts']['primaryPdfCloseReadsOutstanding']==0,f'{slug} counts')
  need(ledger['counts']['attackGroupRowsReviewed']==weapons and ledger['counts']['sourceConflictRecordCount']==conflicts and ledger['counts']['strictFullFieldAndPhysicalWeaponMountCertificates']==0,f'{slug} sourced counts')
  need(len(mounts['records'])==count and mounts['counts']['attackGroupRows']==weapons,f'{slug} mount count')
  need([x['sourceEntryKey'] for x in mounts['records']]==[x['sourceEntryKey'] for x in entries],f'{slug} mount order')
  need(all(len(e['mountAndFiringGroups'])==len(r['weaponAttackGroups']) for e,r in zip(entries,mounts['records'])),f'{slug} weapon mismatch')
  need(all(not r['strictCertified'] for r in mounts['records']),f'{slug} mount strict false')
  need(all(z['firingArc']=='SOURCE_SILENT_CONFIRMED' for r in mounts['records'] for z in r['weaponAttackGroups']),f'{slug} arc invented')
  need(discoveries['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION' and discoveries['schemaFrozen'] is False,f'{slug} schema authority')
  need(len(discoveries['discoveries'])==disc and discoveries['counts']['discoveryCases']==disc,f'{slug} discovery count')
  need(len(set(x['id'] for x in discoveries['discoveries']))==disc,f'{slug} discovery IDs')
  need(all(z['requiresFollowup'] for z in discoveries['discoveries']),f'{slug} discovery followup')
  if a.pdf_dir:
   src=Path(a.pdf_dir)/PDFS[slug];need(src.is_file(),f'Missing PDF: {src}')
   need(hashlib.sha256(src.read_bytes()).hexdigest()==ledger['sourcePdfSha256'],f'{slug} physical source hash')
  total+=count;new+=4 if slug=='core-rulebook' else count
  print(f'PASS {book}: {count}/{count} reviewed; {weapons} attack groups; {disc} discovery cases; {conflicts} source conflicts')
 cp=read(base/'swse-phase2b-core-rulebook-cp1-source-review-ledger.json');final=read(base/'swse-phase2b-core-rulebook-book-source-closure-ledger.json')
 need(cp['entries'][:6]==final['entries'][:6], 'Core cp1 first six entries changed')
 need(all(e['endPageReviewStatus']=='NOT_REVIEWED' for e in cp['entries'][6:]),'Core cp1 original pending states changed')
 need(total==23 and new==17,'new tranche totals')
 need(stats['phase1RecordCount']==316 and stats['previousSourceReviewedCount']==299 and stats['newSourceReviewedCount']==17 and stats['finalSourceReviewedCount']==316,'project closure 316')
 need(stats['newStrictCertificates']==0 and not stats['allSourceReviewedIsStrictCertified'],'strict cert semantics')
 need(len(stats['identityCandidatesOutsidePhase1'])==2,'missing known out-of-roster reconciliation candidates')
 if a.zip_file:
  with zipfile.ZipFile(a.zip_file) as z:
   need(z.testzip() is None,'ZIP integrity failure')
   names=sorted(x for x in z.namelist() if not x.endswith('/'))
   want=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
   need(names==want, f'ZIP manifest mismatch: {len(names)} vs {len(want)}')
   for name in names:need(z.read(name)==(root/name).read_bytes(),f'ZIP file mismatch {name}')
   print(f'PASS ZIP exact changed-file archive: {len(names)} files, CRC, byte match')
 print('PASS: final 17 source reviews; fixed Phase1 census 316/316; 4 Core CP1 entries stayed unreviewed in CP1; original Core first six preserved in book closure.')
 print('SCOPE: 316 is historical Phase1 set, NOT exhaustive claim; known Deep-X/Hornet candidates remain unmerged. No strict mechanical/runtime/production certification claimed.')
if __name__=='__main__':main()
