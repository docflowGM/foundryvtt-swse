#!/usr/bin/env python3
"""TFU Phase 2B primary-source closure structural validator, NOT a production-mechanics certificate.

Usage: python tools/audits/vehicles/check_force_unleashed_phase2b_book.py --repo-root . \
  --source-pdf '/path/to/SAGA EDITION - Force Unleashed Campaign Guide.pdf'
An original Phase 1 JSON can be provided for exact blob/identity validation: --phase1-full /path/...json
"""
import argparse,hashlib,json,pathlib,zipfile
BOOK='Force Unleashed Campaign Guide'
PHASE1_BLOB='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
SOURCE_SHA='0ef4b47b2bf55091c13c1960e4ea367675cb7d84a776f0b9f6dc8fc27c57840c'
STATES={'PDF_VERIFIED','SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED','SCHEMA_INCOMPATIBLE','NOT_REVIEWED'}
EXPECTED={'fucg-a-7-hunter-interceptor': ('A-7 Hunter Interceptor', 204, 205, 204), 'fucg-escort-carrier': ('Escort Carrier', 207, 208, 207), 'fucg-gladiator-class-star-destroyer': ('Gladiator-class Star Destroyer', 208, 209, 208), 'fucg-guardian-class-light-cruiser': ('Guardian-class Light Cruiser', 205, 206, 205), 'fucg-h-60-tempest-bomber': ('H-60 Tempest Bomber', 114, 115, 114), 'fucg-hwk-290': ('HWK-290', 118, 119, 118), 'fucg-m3-a-scyk-fighter': ('M3-A Scyk Fighter', 115, 116, 115), 'fucg-maka-eekai-l4000-transport': ('Maka-Eekai L4000 Transport', 120, 121, 120), 'fucg-neutron-star-bulk-cruiser': ('Neutron Star Bulk Cruiser', 121, 122, 121), 'fucg-novasword-space-superiority-fighter': ('NovaSword Space Superiority Fighter', 115, 116, 115), 'fucg-r-41-starchaser': ('R-41 Starchaser', 116, 117, 116), 'fucg-rogue-shadow': ('Rogue Shadow', 206, 207, 206), 'fucg-sentinel-class-landing-shuttle': ('Sentinel-class Landing Shuttle', 207, 208, 207), 'fucg-tartan-class-patrol-cruiser': ('Tartan-class Patrol Cruiser', 209, 210, 209), 'fucg-tie-prototype': ('TIE Prototype', 205, 206, 205), 'fucg-toscan-8-q': ('Toscan 8-Q', 116, 117, 116), 'fucg-venator-class-star-destroyer': ('Venator-class Star Destroyer', 210, 211, 210), 'fucg-victory-i-class-star-destroyer': ('Victory I-class Star Destroyer', 211, 212, 211), 'fucg-zebra-starfighter': ('Zebra Starfighter', 118, 119, 117)}
PATHS={'ledger': 'data/audits/vehicles/swse-phase2b-force-unleashed-book-source-closure-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-force-unleashed-book-source-closure-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-force-unleashed-book-schema-discovery.json', 'validator': 'tools/audits/vehicles/check_force_unleashed_phase2b_book.py', 'report': 'docs/audits/vehicles/swse-phase2b-force-unleashed-book-source-closure.md'}
COUNTS={'publicationShipClaims':19,'primaryPdfCloseReads':19,'primaryPdfCloseReadsOutstanding':0,
        'strictFullFieldAndPhysicalWeaponMountCertificates':0,'strictCertificatesOutstanding':19,
        'attackGroupRowsReviewed':41,'sourceConflictRecordCount':5,'phase1PageMappingDiscrepancyCount':0}
DISCOVERY_COUNT=39
EXPECTED_CONFLICTS={
'fucg-toscan-8-q':{'Initiative'},
'fucg-hwk-290':{'blaster cannon attack bonus'},
'fucg-gladiator-class-star-destroyer':{'light turbolaser attack bonus','medium missile attack bonus','tractor attack bonus'},
}
def git_blob_sha(data:bytes)->str:
 return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--repo-root',type=pathlib.Path,default=pathlib.Path('.'))
 ap.add_argument('--source-pdf',type=pathlib.Path)
 ap.add_argument('--phase1-full',type=pathlib.Path)
 ap.add_argument('--require-phase1',action='store_true')
 ap.add_argument('--zip-file',type=pathlib.Path)
 args=ap.parse_args()
 if args.require_phase1 and not args.phase1_full:ap.error('--require-phase1 requires --phase1-full')
 base=args.repo_root
 rd=lambda key:json.loads((base/PATHS[key]).read_text(encoding='utf-8'))
 L,B,D=rd('ledger'),rd('backlog'),rd('discovery')
 report=(base/PATHS['report']).read_text(encoding='utf-8')
 assert L['sourceBook']==B['sourceBook']==D['sourceBook']==BOOK
 assert L['sourcePdfSha256']==B['sourcePdfSha256']==SOURCE_SHA
 assert L['phase1ProvenanceBlobSha']==PHASE1_BLOB
 assert L['counts']==B['counts']==COUNTS
 assert D['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION' and D['schemaFrozen'] is False
 assert D['counts']=={'discoveryCases':DISCOVERY_COUNT,'bookScopeReviewed':19}
 assert len(D['discoveries'])==DISCOVERY_COUNT
 assert len({d['id'] for d in D['discoveries']})==DISCOVERY_COUNT
 assert all(d['requiresFollowup'] is True for d in D['discoveries'])
 assert L['bookCloseout']['status']=='PRIMARY_PDF_SOURCE_REVIEW_COMPLETE_NOT_MECHANICALLY_CERTIFIED'
 assert len(L['entries'])==len(B['records'])==19
 assert [x['sourceEntryKey'] for x in L['entries']]==list(EXPECTED)
 assert [x['sourceEntryKey'] for x in B['records']]==list(EXPECTED)
 assert len(set(EXPECTED))==19
 assert set(L['fieldGroups'])=={'printedTypeLine','challenge','initiativeSenses','defenses','durability','speed','rangedAttack','meleeAttack','fightingSpace','baseAttack','attackOptions','abilities','skills','crew','capacity','payload','hyperdrive','cost','weaponAttackProfile'}
 assert sum(len(e['mountAndFiringGroups']) for e in L['entries'])==41
 assert sum(len(e['sourceConflicts']) for e in L['entries'])==5
 assert {e['sourceEntryKey']:{c['field'] for c in e['sourceConflicts']} for e in L['entries'] if e['sourceConflicts']}==EXPECTED_CONFLICTS
 for e,b in zip(L['entries'],B['records']):
  key=e['sourceEntryKey'];name,page,pdf,section=EXPECTED[key]
  assert (e['printedName'],e['printedStatblockStartPage'],e['phase1PdfPhysicalPage'],e['phase1SectionStartPage'])==(name,page,pdf,section),key
  assert e['endPageReviewStatus']=='PDF_VERIFIED' and b['reviewStatus']=='PDF_VERIFIED'
  assert e['narrativeMechanicsStatus']=='PDF_VERIFIED' and e['weaponMountReconciliationStatus']=='PDF_VERIFIED_PARTIAL'
  assert e['fullFieldCertified'] is False and e['fullWeaponMountReconciled'] is False and b['strictCertified'] is False
  assert e['printedFacts'] and e['printedFacts']['type'] and e['printedFacts']['cl']
  assert e['printedFacts']['combat']['ranged'] and e['printedFacts']['skills'] and e['printedFacts']['crewAndPassengers']
  assert e['printedFacts']['durability']['hitPoints']>0 and e['printedFacts']['movement']['starshipScaleFlySquares']>0
  assert e['printedFacts']['defenses']['reflex'] and e['printedFacts']['defenses']['fortitude']
  assert len(e['mountAndFiringGroups'])==len(b['weaponAttackGroups'])>0
  assert set(e['fieldGroups'])==set(L['fieldGroups']) and set(e['fieldGroups'].values())<=STATES
  assert e['fieldGroups']['meleeAttack']=='SOURCE_SILENT_CONFIRMED'
  assert e['sourceFieldStates']['weaponFiringArc']=='SOURCE_SILENT_CONFIRMED'
  assert e['sourceFieldStates']['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
  assert e['sourceEvidence']['printedPages'] and page in e['sourceEvidence']['printedPages']
  assert all(isinstance(i,int) and i>=0 for i in e['reviewedPDFPages'])
  assert b['sourceEntryKey']==key and b['printedName']==name and b['printedPage']==page
  assert b['blockingIssues']
  for w,bw in zip(e['mountAndFiringGroups'],b['weaponAttackGroups']):
   assert w['weaponLabel']==bw['label'] and w['attackBonus']==bw['attackBonus'] and w['station']==bw['station']
   assert w['damage'] and w['sourcePage']==bw['sourcePrintedPage']==page
   assert w['firingArc']==bw['firingArc']=='SOURCE_SILENT_CONFIRMED'
   assert w['batteryComposition']==bw['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
  for c in e['sourceConflicts']:
   assert c['status']=='SOURCE_CONFLICT_PRESERVED'
   assert c['printedFirstValue']!=c['printedSecondValue']
   assert c['resolution']=='RETAIN_BOTH_PENDING_AUTHORITY_POLICY'
 assert '19 / 19' in report and '41' in report and '39' in report
 assert '0 / 19' in report and '5' in report
 if args.source_pdf:
  assert hashlib.sha256(args.source_pdf.read_bytes()).hexdigest()==SOURCE_SHA,'Original source PDF does not match this audit!'
 if args.phase1_full:
  data=args.phase1_full.read_bytes();assert git_blob_sha(data)==PHASE1_BLOB,'Not original Phase 1 git blob'
  J=json.loads(data)
  book=next(x for x in J['books'] if x['book']==BOOK)
  assert book['enteredCount']==19 and len(book['entries'])==19
  assert [(x['sourceEntryKey'],x['shipName'],x['printedStatblockPage'],x['pdfPhysicalPage'],x['sectionStartPage']) for x in book['entries']]==[(k,*EXPECTED[k]) for k in EXPECTED]
 if args.zip_file:
  with zipfile.ZipFile(args.zip_file) as z:
   assert z.testzip() is None
   assert set(z.namelist())==set(PATHS.values()),'ZIP must contain exactly five changed-files-only repo-relative paths.'
   for p in PATHS.values():
    assert z.read(p)==(base/p).read_bytes(),p
 print('PASS: Force Unleashed Phase 2B: 19/19, 41 attack groups, 5 conflicts, 39 schema cases, 0/19 mechanical certifications')
 print('PASS: no Phase 1 identity mutation; weapon rows and backlog consistent; production data untouched by this package')
 print('Source PDF fingerprint:', 'verified' if args.source_pdf else 'not supplied')
 print('Original full Phase 1 blob:', 'verified' if args.phase1_full else 'not supplied (fixed Phase 1 19-record roster validated)')
 print('ZIP:', 'verified' if args.zip_file else 'not supplied')
if __name__=='__main__':main()
