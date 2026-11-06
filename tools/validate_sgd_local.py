#!/usr/bin/env python3
"""Fail-closed local semantic/checkpoint validator. Not a substitute for official JSON schema."""
import json, pathlib, collections, hashlib, os
R=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(os.environ.get('SWSE_SGD_LEDGER',str(R/'data/canonical/droids/source-books/sgd.json')))
evidence=pathlib.Path(os.environ.get('SWSE_SGD_EVIDENCE',str(R/'data/audits/droids/sgd-field-evidence.json')))
ledger=json.loads(source.read_text()); data=ledger['sourceEntries']; ev=json.loads(evidence.read_text())['records']
visual=R/'data/audits/droids/sgd-visual-field-review.json'
visualdata=json.loads(visual.read_text()) if visual.exists() else {'items': []}
visualids={item['sourceEntryKey'] for item in visualdata['items']}
errs=[];warn=[]
def chk(ok,msg):
 if not ok:errs.append(msg)
root={'schemaVersion','recordType','identity','publication','classification','challenge','geometry','abilities','progression','defenses','durability','movement','anatomy','processor','programming','combat','capacity','systems','equipment','modifications','pcConstruction','vehicleLink','economics','text','exceptions','fieldStates','rules','certification'}
chk(len(data)==46,'Expected 46 source entries')
chk(len(ev)==46,'Expected 46 PDF text evidence rows')
ids=[r['identity']['sourceEntryKey'] for r in data]
chk(len(set(ids))==46,'duplicate source identity')
chk(set(ids)=={f'SGD-DROID-{i:03}' for i in range(1,47)},'SGD identity set mismatch')
for i,r in enumerate(data,1):
 id=r['identity']['sourceEntryKey']; x=ev[i-1]
 chk(set(r)==root,f'{id} schema required-root mismatch {set(r)^root}')
 chk(id==x['sourceEntryKey'],f'{id} evidence alignment')
 chk(r['publication']['bookId']=='SGD',f'{id} bookId incorrect')
 page=66+2*i

 for conflict in r['exceptions'].get('sourceContradictions',[]):
  chk(isinstance(conflict,dict) and isinstance(conflict.get('issueId'),str),f'{id}: contradiction must be structured object with issueId')
  if isinstance(conflict,dict):
   chk(conflict.get('resolutionStatus') in ('unresolved','approved-effective','errata',None),f'{id}: invalid contradiction resolution status')
   chk(bool(conflict.get('statements')),f'{id}: contradiction missing published competing statements')
   for quote in conflict.get('statements',[]):
    chk(quote.get('page')==page if isinstance(quote,dict) else False,f'{id}: contradiction source page mismatch')
 for move in r['movement'].get('locomotionSystems',[]):
  chk(move.get('restricted') in (None,'exclusive','limited','other','none'),f'{id}: invalid locomotion restriction enum')
 for rule in r['rules'].get('conditionalMechanics',[]):
  chk(rule.get('executionStatus')=='source-only',f'{id}: uncertified conditional rule execution leak')
  chk((rule.get('source') or {}).get('sourceEntryKey')==id,f'{id}: source rule provenance key mismatch')
  chk((rule.get('source') or {}).get('page')==page,f'{id}: source rule provenance page mismatch')
 cite=f'SGD:p{page}:PDF-p{page+1}:visual-statblock-field-review'
 chk(cite in r['certification'].get('reviewerEvidenceRefs',[]),f'{id}: missing selected-field PDF review evidence reference')
 chk(r['publication']['printedPageStart']==page,f'{id} printed page start')
 chk(r['publication']['pdfPageStart1Based']==page+1,f'{id} PDF page start')
 chk(r['publication']['printedPageEnd']==page+1,f'{id} printed page end')
 chk(r['certification']['mechanicalStatus']!='certified',f'{id} premature mechanical certification')
 chk(r['certification']['runtimeStatus']=='not-tested',f'{id} premature runtime certification')
 chk(r['rules'].get('mechanicalExecutionStatus')=='source-only',f'{id} premature rule-execution permission')
 chk(r['pcConstruction'].get('heroEligibility') in ('allowed','prohibited'),f'{id} missing/unreviewed model hero eligibility')
 chk('heroEligibility' in x['fieldTranscriptions'].get('/pcConstruction/heroEligibility','') or bool(x['fieldTranscriptions'].get('/pcConstruction/heroEligibility')),f'{id} missing eligibility textual evidence')
 chk(not r['vehicleLink'].get('vehicleSourceEntryKey'),f'{id} vehicle link invented')
 chk(r['classification']['primaryActorAuthority'] in ('droid','vehicle'),f'{id} invalid actor authority')
 if i==8:
  chk(r['classification']['primaryActorAuthority']=='vehicle',f'{id} DP2 primary Vehicle authority mismatch')
  for field in ('defenses','durability','movement','combat','geometry'):
   chk(not r[field],f'{id} DP2 duplicated vehicle-owned {field}')
 else:
  chk(r['classification']['statblockFormat']=='droid-actor',f'{id} non-DP2 format mismatch')
  chk(r['abilities'].get('con') is None and r['fieldStates'].get('/abilities/con')=='explicitly-none',f'{id} droid CON dash state')
 for att in r['combat'].get('attackGroups',[]):
  chk(att.get('operationStatus')=='source-only',f'{id} attack execution authority leak')
  chk(not att.get('weaponComponentId'),f'{id} uncertified weapon instance ref')
 for group in ('feats','talents'):
  for trait in r['progression'].get(group,[]):
   chk(trait.get('enabledInRuntime') is not True,f'{id} unverified {group} enabled')
 chk(not isinstance(r['text'].get('sourceWarnings'),str),f'{id} text.sourceWarnings must be array')
 # Every explicit null is attested. Unreviewed fields absent, not nullable facts.
 def scan(node,p):
  if node is None:
   chk(r['fieldStates'].get(p) in ('explicitly-none','not-stated','unclear-source','not-applicable'),f'{id}: unqualified NULL at {p}')
  elif isinstance(node,dict):
   for key,val in node.items():
    if p=='' and key=='fieldStates':continue
    scan(val,p+'/'+key)
  elif isinstance(node,list):
   if not node:chk(r['fieldStates'].get(p)=='explicitly-none',f'{id}: empty array without positive absent source at {p}')
   for j,val in enumerate(node):scan(val,p+'/'+str(j))
 scan(r,'')
 chk(x['printedPage']==page, f'{id}: source evidence page mismatch')
 # Reject obviously garbled OCR defenses even when the field is otherwise type-valid.
 defensive=r['defenses']
 for dkey in ('reflex','flatFootedReflex','fortitude','will'):
  v=defensive.get(dkey)
  if v is not None:chk(isinstance(v,int) and -10 <= v <= 80,f'{id}: implausible {dkey} from OCR ({v})')
 if isinstance(defensive.get('flatFootedReflex'),int) and isinstance(defensive.get('reflex'),int):
  chk(defensive['flatFootedReflex'] <= defensive['reflex'],f'{id}: flat-footed Reflex exceeds normal Reflex')
 # Independently compare each approved visual numeric value with current ledger.
 check=x.get('pdfVisualStatblockChecks')
 if id in visualids:
  chk(bool(check) and x['pdfVisualLayoutChecked'],f'{id}: missing visually verified field evidence')
  chk(id in {a['sourceEntryKey'] for a in visualdata['items']}, f'{id}: missing visual item reference')
  if check:
   chk(check.get('pdfPage1Based')==page+1, f'{id}: visual evidence cites wrong PDF page')
   for ptr,expected in check.get('fieldValues',{}).items():
    parts=ptr.strip('/').split('/')
    cur=r
    for part in parts:cur=cur.get(part) if isinstance(cur,dict) else None
    chk(cur==expected,f'{id}: reviewed visual field {ptr} changed to {cur}, expected {expected}')
 else:chk(check is None,f'{id}: unchecked record claims visually reviewed numeric fields')

counts={
 'publicationClaims':len(data),'sourceBook':'SGD',
 'sourceIdentitySlotsVerified':len(set(ids)),
 'droidActorFormats':sum(r['classification']['statblockFormat']=='droid-actor' for r in data),
 'vehicleFormats':sum(r['classification']['statblockFormat']=='vehicle' for r in data),
 'visuallyInspectedPageLayouts':sum(x['pdfVisualLayoutChecked'] for x in ev),
 'manualVisualFieldReviewRows':len(visualids),
 'manualVisualFieldComparisons':sum(len(x.get('pdfVisualStatblockChecks',{}).get('fieldValues',{})) for x in ev),
 'pdfTextProvisionalRows':len(ev),
 'mechCertified':sum(r['certification']['mechanicalStatus']=='certified' for r in data),
 'runtimeCertified':sum(r['certification']['runtimeStatus']=='live-verified' for r in data),
 'heroAllowedUncertified':sum(r['pcConstruction'].get('heroEligibility')=='allowed' for r in data),
 'heroProhibitedUncertified':sum(r['pcConstruction'].get('heroEligibility')=='prohibited' for r in data),
 'recordsWithAbilities':sum(bool(r['abilities']) for r in data),
 'recordsWithDefenses':sum(bool(r['defenses']) for r in data),
 'recordsWithDurability':sum(bool(r['durability']) for r in data),
 'recordsWithAttackTranscription':sum(bool(r['combat'].get('attackGroups')) for r in data),
 'recordsWithFeatPrintedLabels':sum(bool(r['progression'].get('feats')) for r in data),
 'rawFeatPhrases':sum(len(r['progression'].get('feats',[])) for r in data),
 'rawTalentPhrases':sum(len(r['progression'].get('talents',[])) for r in data),
 'rawSkillRows':sum(len(r['abilities'].get('skills',[])) for r in data),
 'unresolvedOCRWarnings':sum(len(x['warnings']) for x in ev)}
chk(counts['heroAllowedUncertified']+counts['heroProhibitedUncertified']==46,'eligibility counts not 46')
chk(len(visualids)==len(visualdata['items']),'duplicate visual review identity')
chk(counts['manualVisualFieldReviewRows']==46,'SGD 46/46 source first-page visual reviews incomplete')
chk(counts['manualVisualFieldComparisons']==visualdata.get('fieldComparisons'),'visual field comparison count drift')
chk(counts['manualVisualFieldComparisons']==sum(x.get('verifiedFieldCount',0) for x in visualdata['items']),'evidence comparison count drift')
chk(counts['visuallyInspectedPageLayouts']==46,'missing printed page visual inspection')
chk(counts['droidActorFormats']==45 and counts['vehicleFormats']==1,'SGD format counts incorrect')
chk(counts['mechCertified']==0,'mechanical certification must be zero')
state={"validationScope":"LOCAL_SEMANTIC_GUARDS_ONLY","fullUpstreamJsonSchemaValidation":"NOT_RUN_upstream_schema_not_locally_mirrored",
       "status":"PASS" if not errs else "FAIL", "errors":errs,"warnings":warn,
       "counts":counts,"sha256Ledger":hashlib.sha256(source.read_bytes()).hexdigest(),
       "nextGate":"First-page selected-field PDF verification is complete. Reconcile secondary/protocol text, mounts, scoped traits and exact full schema/independent runtime certification before any promotion."}
out=pathlib.Path(os.environ.get('SWSE_SGD_VALIDATION',str(R/'docs/audits/droids/sgd-local-validation.json')))
out.write_text(json.dumps(state,indent=2)+'\n')
print(json.dumps(state,indent=2))
raise SystemExit(bool(errs))
