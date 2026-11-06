#!/usr/bin/env python3
"""SWSE Phase 2C CP3: approved source/evidence-contract audit gate; never mutates production."""
import argparse, hashlib, json, pathlib, subprocess, sys, zipfile

REQUIRED={
 'data/audits/vehicles/swse-phase2c-cp3-approved-decisions.json',
 'data/audits/vehicles/swse-phase2c-cp3-318-census-overlay.json',
 'data/audits/vehicles/swse-phase2c-cp3-authority-contract.json',
 'tools/audits/vehicles/phase2c-authority-policy.mjs',
 'tools/audits/vehicles/check_vehicle_phase2c_cp3.py',
 'tests/phase2c-vehicle-authority-policy.test.mjs',
 'docs/audits/vehicles/swse-phase2c-cp3-approved-policy-implementation.md'
}
ORIGINAL_BLOB_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
PDF_HASHES={
 'Unknown Regions':'43a69aa7974ed4aeb52b57ba28b3466c2ed9f54bd73fe5d5295b744bfe1bd55b',
 'Scum and Villainy':'74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399'
}

def sha256_file(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for chunk in iter(lambda:f.read(1024*1024), b''):h.update(chunk)
 return h.hexdigest()

def git_blob_hash(p):
 b=p.read_bytes();return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()

def audit(root,args):
 for f in REQUIRED:assert (root/f).is_file(),f'Missing contract file: {f}'
 read=lambda n:json.loads((root/'data/audits/vehicles'/n).read_text())
 decision=read('swse-phase2c-cp3-approved-decisions.json')
 overlay=read('swse-phase2c-cp3-318-census-overlay.json')
 contract=read('swse-phase2c-cp3-authority-contract.json')
 assert {d['id']:d['decision'] for d in decision['decisions']}=={x:'APPROVED' for x in ('P2C-D01','P2C-D02','P2C-D03')}
 assert decision['productionMutationAuthorizedByThisCheckpoint'] is False
 assert decision['frozenSchema'] is False
 assert overlay['immutablePhase1']['gitBlobSha']==ORIGINAL_BLOB_SHA
 assert (overlay['immutablePhase1']['historicalCount'],overlay['supplementalCount'],overlay['amendedClaimCount'])==(316,2,318)
 assert overlay['existing316EntriesModified']==0 and overlay['totalSourceReviewedClaimsInCorrectedScope']==318
 records=overlay['supplementalEntries'];assert len(records)==2
 keys={r['sourceEntryKey'] for r in records};assert keys=={'ur-uulshos-manufacturing-deep-x-explorer','sav-tenloss-corporation-hornet-class-interceptor'}
 assert len({r['candidateId'] for r in records})==2
 for r in records:
  assert r['pdfSha256']==PDF_HASHES[r['sourceBook']]
  assert r['pdfPhysicalPage']==r['printedStatblockPage']+1
  assert r['reviewEvidence']['medium']=='PRIMARY_PDF_VISUAL_PAGE'
  assert r['reviewEvidence']['primaryPages']==[r['printedStatblockPage']]
  assert r['sourceReviewState']=='SOURCE_COMPLETE_PRINTED_FACTS'
  assert r['certification']=={'sourceComplete':True,'operationallyCertified':False,'strictMechanicalCertified':False}
  assert r['attacks'] and all(x['arcEvidenceState']=='SOURCE_SILENT_CONFIRMED' for x in r['attacks'])
 deepx=next(r for r in records if r['sourceBook']=='Unknown Regions')
 hornet=next(r for r in records if r['sourceBook']=='Scum and Villainy')
 assert deepx['printedStatblockPage']==51 and deepx['printedCL']==5
 assert deepx['printedFacts']['hp']==60 and deepx['printedFacts']['dr']==10 and deepx['printedFacts']['baseAttack']==0
 assert len(deepx['attacks'])==1 and deepx['attacks'][0]['printedWeaponCount']==2
 assert deepx['attacks'][0]['sourceGroupCount']==1 and deepx['attacks'][0]['printedGunRequirement']==2
 assert hornet['printedStatblockPage']==125 and hornet['printedCL']==12
 assert hornet['printedFacts']['sr']==35 and hornet['printedFacts']['hp']==50
 assert hornet['printedFacts']['hyperdrive']=={'evidenceState':'SOURCE_SILENT_CONFIRMED','valueSupplied':False}
 assert len(hornet['configurationVariants'])==2
 assert len(hornet['attacks'])==2 and hornet['configurationVariants'][0]['onNaturalOne']['damageToOwnShip']=='6d10x2'
 assert hornet['configurationVariants'][1]['onNaturalOne'] is None
 assert contract['policyApprovalIds']==['P2C-D01','P2C-D02','P2C-D03']
 assert contract['unresolvedArc']['automaticArcDependentAttack']=='BLOCK'
 assert contract['unresolvedArc']['mustPersistReceiptAtRuntime'] is True
 assert contract['publishedConflict']['defaultNumericSelection'] is None
 assert contract['runtimeIntegrationGuardrails']['productionConsumerNotYetWired'] is True
 assert contract['runtimeIntegrationGuardrails']['hydrationApproved'] is False
 if args.phase1:
  p=pathlib.Path(args.phase1); assert git_blob_hash(p)==ORIGINAL_BLOB_SHA,'Phase1 immutable blob has changed'
  original=json.loads(p.read_text());historical=[e['sourceEntryKey'] for b in original['books'] for e in b['entries']]
  assert len(historical)==316 and len(set(historical))==316
  assert not keys.intersection(historical),'Supplemental source ID collides with original Phase1'
  print('PASS: original Phase1 blob and 316 distinct identities verified')
 else:
  print('NOTE: full original Phase1 Git blob not provided; independent GitHub roster check required')
 for book,path in [('Unknown Regions',args.unknown_regions_pdf),('Scum and Villainy',args.scum_villainy_pdf)]:
  if path:
   assert sha256_file(pathlib.Path(path))==PDF_HASHES[book],f'PDF source fingerprint drift: {book}'
   print(f'PASS: source PDF SHA-256 {book}')
  else: print(f'NOTE: original source PDF fingerprint not locally rechecked: {book}')
 run=subprocess.run(['node','--test',str(root/'tests/phase2c-vehicle-authority-policy.test.mjs')],capture_output=True,text=True)
 if run.returncode:print(run.stdout,run.stderr,file=sys.stderr);raise AssertionError('Node policy tests failed')
 assert '# fail 0' in run.stdout, 'Could not verify Node test output'
 print('PASS: 19 Node policy tests (including denial cases)')
 if args.zip:
  with zipfile.ZipFile(args.zip) as z:
   assert z.testzip() is None
   assert set(z.namelist())==REQUIRED, f'Changed-files ZIP shape mismatch: {set(z.namelist())^REQUIRED}'
   for name in REQUIRED:assert z.read(name)==(root/name).read_bytes(),f'ZIP bytes mismatch: {name}'
  print('PASS: 7-file changed-files ZIP integrity and exact equality')
 print('PASS: approved decisions, 318 overlay, identity uniqueness declaration, runtime-blocking contract; production untouched')

if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--repo-root',required=True)
 a.add_argument('--phase1');a.add_argument('--unknown-regions-pdf');a.add_argument('--scum-villainy-pdf');a.add_argument('--zip')
 args=a.parse_args();audit(pathlib.Path(args.repo_root),args)