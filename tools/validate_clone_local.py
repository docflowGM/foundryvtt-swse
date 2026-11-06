#!/usr/bin/env python3
"""Fail-closed local semantic/evidence checks. NOT an upstream JSON Schema certification."""
import json,pathlib,os,hashlib,collections,sys
R=pathlib.Path(__file__).resolve().parents[1]
lpath=pathlib.Path(os.getenv('SWSE_CLONE_LEDGER',R/'data/canonical/droids/source-books/clone.json'))
epath=pathlib.Path(os.getenv('SWSE_CLONE_EVIDENCE',R/'data/audits/droids/clone-field-evidence.json'))
ledger=json.loads(lpath.read_text())
ev=json.loads(epath.read_text())
vis=json.loads((R/'data/audits/droids/clone-visual-field-review.json').read_text())
records=ledger['sourceEntries'];sources=ev['records'];tests=[]
errors=[]
def chk(cond,msg):
 if not cond:errors.append(msg)
base=set('schemaVersion recordType identity publication classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules certification'.split())
chk(len(records)==40,'wrong source-claim count');chk(len(sources)==40,'wrong source-evidence row count')
chk(len({r['identity']['sourceEntryKey'] for r in records})==40,'duplicate source IDs')
chk([r['identity']['sourceEntryKey'] for r in records]==[f'CLONE-DROID-{i:03d}' for i in range(1,41)],'census ID drift')
expected={'droid':32,'squad-aggregation':1,'vehicle':7}
counts=collections.Counter(r['classification']['primaryActorAuthority'] for r in records)
chk(dict(counts)==expected,'actor/squad/vehicle count drift')
visual_ids={v['sourceEntryKey'] for v in vis['items']}
chk(len(visual_ids)==len(vis['items'])==vis['manualVisualReviews']==40,'visual evidence count mismatch')
chk(vis['directFieldComparisons']==528,'visual comparison count drift')
chk(ev['sourcePdfSha256']==vis['sourcePdfHash'],'visual PDF source identity mismatch')
chk(ev['sourcePdfSha256']==hashlib.sha256(pathlib.Path('/mnt/data/SAGA EDITION - Clone Wars Campaign Guide.pdf').read_bytes()).hexdigest(),'PDF source bytes changed')
chk(ev['sourceTxtSha256']==hashlib.sha256(pathlib.Path('/mnt/data/Clone Wars Campaign Guide_djvu.txt').read_bytes()).hexdigest(),'TXT source bytes changed')
reviewed_total=0
for i,(r,e) in enumerate(zip(records,sources),1):
 id=r['identity']['sourceEntryKey'];p=r['publication'];c=r['certification'];a=r['classification']
 chk(set(r)==base,f'{id}: missing/extraneous root keys')
 chk(id==e['sourceEntryKey'],f'{id}: evidence identity mismatch')
 chk(p['bookId']=='CLONE',f'{id}: source book ID mismatch')
 chk(p['printedPageStart']==e['printedPage'] or i==14,f'{id}: printed page mismatch')
 chk(p['pdfPageStart1Based']==p['printedPageStart']+1,f'{id}: pdf page offset mismatch')
 chk(c['mechanicalStatus']!='certified',f'{id}: premature mechanical certification')
 chk(c['runtimeStatus']=='not-tested',f'{id}: premature runtime certification')
 chk(r['rules'].get('mechanicalExecutionStatus')=='source-only',f'{id}: runtime rule execution leak')
 chk(r['pcConstruction'].get('creationRoute') is None,f'{id}: invented PC creation route')
 chk(not r['vehicleLink'],f'{id}: invented vehicle authority reference')
 chk(r['pcConstruction'].get('heroEligibility') in (None,'allowed','prohibited','conditional'),f'{id}: invalid hero eligibility')
 if id not in visual_ids:
  chk('heroEligibility' not in r['pcConstruction'],f'{id}: unchecked OCR hero permission')
  chk(c['identityStatus']=='txt-indexed',f'{id}: unreviewed record claims PDF evidence')
 else:
  reviewed_total+=1
  chk(c['identityStatus']=='pdf-reviewed',f'{id}: missing PDF identity review level')
  chk(e.get('sourceReviewStatus')=='PDF_SELECTED_FIELDS_VISUAL',f'{id}: evidence review status mismatch')
  audit=e.get('pdfVisualFieldChecks',{})
  chk(audit.get('pdfPage1Based')==p['pdfPageStart1Based'],f'{id}: visual PDF page mismatch')
  verified=audit.get('fieldValues',{})
  for path,want in verified.items():
   x=r
   for part in path.lstrip('/').split('/'):
    x=x.get(part,'__MISSING__') if isinstance(x,dict) else '__MISSING__'
   chk(x==want,f'{id}: reviewed field changed {path} expected {want!r}, got {x!r}')
  chk(audit.get('fieldComparisonCount')==len(verified),f'{id}: visual comparison accounting mismatch')
  receipt=next((item for item in vis['items'] if item['sourceEntryKey']==id),None)
  chk(receipt is not None and receipt['verifiedFieldCount']==len(verified),f'{id}: visual receipt comparison count mismatch')
  if receipt:
   chk(receipt.get('sourceOwnedNonActorValues',{})==audit.get('sourceOnlyPrintedValues',{}),f'{id}: source-owned PDF evidence mismatch')
  if a['primaryActorAuthority']!='droid':
   chk('hitPoints' in audit.get('sourceOnlyPrintedValues',{}) if i in (34,35,36,37,38,39,40) else True,f'{id}: missing vehicle/squad source-owned HP')
 for t in r['progression'].get('feats',[])+r['progression'].get('talents',[]):
  chk(t.get('enabledInRuntime') is not True,f'{id}: uncertified trait enabled')
 for rule in r['rules'].get('conditionalMechanics',[]):
  chk(rule.get('executionStatus') in ('source-only','pending-certification','blocked-conflict'),f'{id}: uncertified conditional source rule made executable')
  chk(not rule.get('effectRef'),f'{id}: guessed local effect/engine ref')
 if i in (18,27,30,37):
  chk(any(rule.get('ruleId')==f'{id}-SOURCE-LOCAL-01' for rule in r['rules'].get('conditionalMechanics',[])),f'{id}: printed local conditional mechanic lost')
 for att in r['combat'].get('attackGroups',[]):
  chk(att.get('operationStatus')=='source-only',f'{id}: attack execution leaked')
  chk(not att.get('weaponComponentId'),f'{id}: unverified installed weapon')
 def scan_null(node,path=''):
  if node is None:chk(r['fieldStates'].get(path) in ('explicitly-none','not-applicable','not-stated','unclear-source','not-yet-reviewed'),f'{id}: unqualified null at {path}')
  if isinstance(node,dict):
   for k,v in node.items():
    if path=='' and k=='fieldStates':continue
    scan_null(v,path+'/'+k)
  elif isinstance(node,list):
   if not node:chk(r['fieldStates'].get(path)=='explicitly-none',f'{id}: unsupported empty array at {path}')
   for j,x in enumerate(node):scan_null(x,path+'/'+str(j))
 scan_null(r)
 for key in ['reflex','flatFootedReflex','fortitude','will']:
  value=r['defenses'].get(key)
  if value is not None:chk(isinstance(value,int) and -10<=value<=80,f'{id}: implausible {key}')
 if r['defenses'].get('flatFootedReflex') is not None and r['defenses'].get('reflex') is not None:
  chk(r['defenses']['flatFootedReflex']<=r['defenses']['reflex'],f'{id}: flatfooted Reflex greater than normal')
 if a['primaryActorAuthority']!='droid':
  for g in ('defenses','durability','combat','movement','geometry'):
   chk(not r[g],f'{id}: illegal vehicle/squad mechanic copied into individual actor group {g}')
  chk('heroEligibility' not in r['pcConstruction'],f'{id}: squad/vehicle granted droid hero right')
 if i==14:
  chk(p['printedPageStart']==94 and p['pdfPageStart1Based']==95,f'{id}: B1 census p95 vs printed p94 correction lost')
 if i==18:
  chk(p['printedPageStart']==188 and p['printedPageEnd']==189,f'{id}: A-DSD split-page boundary lost')
 if i==15:
  chk(p['printedPageStart']==160 and p['printedPageEnd']==161,f'{id}: FX6 split-page boundary lost')
 if i==33:chk(r['pcConstruction'].get('heroEligibility')=='prohibited',f'{id}: printed Ultra-Droideka PC prohibition missing')
 if i==1:chk(r['economics'].get('newCredits')==4150,f'{id}: unsafe OCR price 4950 resurfaced')
 chk(not e.get('txtEligibilityStatement'),f'{id}: unsafe raw TXT ownership rediscovered')
assert len(vis['items'])==40
chk(sum(len(e['pdfVisualFieldChecks'].get('fieldValues',{})) for e in sources)==vis['directFieldComparisons'],'field-count mismatch between evidence and visual ledger')
chk(reviewed_total==40,'selected visual reviews lost')
chk(sum(r['pcConstruction'].get('heroEligibility') in ('allowed','prohibited') for r in records)==32,'PDF-verified individual droid eligibility count drift')
res={'schema':'swse.droid.clone.local-validation/0.1','scope':'LOCAL_TYPED_SEMANTIC_AND_SELECTED_PDF_FIELD_CHECKS_ONLY',
 'status':'PASS' if not errors else 'FAIL','errors':errors,
 'counts':{'publicationClaims':len(records),'selectedFieldVisualReviews':reviewed_total,'directFieldComparisons':vis['directFieldComparisons'],
   'individualDroidActors':counts['droid'],'squadAggregations':counts['squad-aggregation'],'vehicleAndStarshipSourceRecords':counts['vehicle'],
   'mechanicallyCertified':sum(r['certification']['mechanicalStatus']=='certified' for r in records),
   'printedHeroEligibilityVisuallyVerified':sum(r['pcConstruction'].get('heroEligibility') in ('allowed','prohibited') for r in records),
   'provisionalEntriesWithoutVisualReview':40-reviewed_total},
 'fullUpstreamJsonSchema202012Validated':False,'foundryRuntimeCertified':False,
 'sha256Ledger':hashlib.sha256(lpath.read_bytes()).hexdigest(),
 'limitation':'Source has image-only PDF; OCR segments may interleave columns and other droid headings. Fields not selected for manual review remain provisional. Official 2020-12 schema and Foundry runtime not run.'}
out=pathlib.Path(os.getenv('SWSE_CLONE_VALIDATION',R/'docs/audits/droids/clone-local-validation.json'));out.write_text(json.dumps(res,indent=2)+'\n')
print(json.dumps(res,indent=2))
sys.exit(0 if not errors else 1)
