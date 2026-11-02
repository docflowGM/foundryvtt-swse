#!/usr/bin/env python3
"""Local Threats droid ledger fail-closed semantics and selected PDF evidence check.

NOT full upstream JSON Schema 2020-12 validation. NOT Foundry runtime certification.
"""
from pathlib import Path
import collections,hashlib,json,os,sys
R=Path(__file__).resolve().parents[1]
L=Path(os.getenv('SWSE_THREATS_LEDGER',R/'data/canonical/droids/source-books/threats.json'))
E=Path(os.getenv('SWSE_THREATS_EVIDENCE',R/'data/audits/droids/threats-field-evidence.json'))
V=Path(os.getenv('SWSE_THREATS_VISUAL',R/'data/audits/droids/threats-visual-field-review.json'))
OUT=Path(os.getenv('SWSE_THREATS_VALIDATION',R/'docs/audits/droids/threats-local-validation.json'))
ledger=json.loads(L.read_text());evidence=json.loads(E.read_text());visual=json.loads(V.read_text())
records=ledger['sourceEntries'];ex=evidence['records'];seen=visual['items'];errors=[]
ROOT_KEYS=set('schemaVersion recordType identity publication classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules certification'.split())
EXPECTED_HERO={1:'prohibited',2:'prohibited',3:'allowed',4:'allowed',5:'allowed',6:'allowed',8:'prohibited',9:'prohibited',11:'prohibited',12:'prohibited',13:'prohibited',14:'prohibited',15:'prohibited',16:'allowed',17:'allowed',18:'allowed',19:'allowed',20:'allowed',21:'allowed',23:'prohibited',24:'prohibited',25:'prohibited',26:'prohibited',29:'allowed'}
def chk(test,msg):
 if not test:errors.append(msg)
chk(ledger.get('bookId')=='THREATS','wrong source book')
chk(len(records)==len(ex)==len(seen)==29,'publication source/evidence count drift')
chk([r['identity']['sourceEntryKey'] for r in records]==[f'THREATS-DROID-{i:03d}' for i in range(1,30)],'identity index drift')
chk(len({r['identity']['sourceEntryKey'] for r in records})==29,'duplicate source claim')
chk(evidence['sourcePdfSha256']==visual['sourcePdfHash'],'visual review PDF identity mismatch')
for label,path,k in [('pdf',Path('/mnt/data/SAGA EDITION - Threats of the Galaxy.pdf'),'sourcePdfSha256'),
                    ('text',Path('/mnt/data/Threats of the Galaxy_djvu.txt'),'sourceTxtSha256')]:
 chk(path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==evidence[k],label+' source bytes drift / missing')
chk(visual['manualVisualReviews']==29,'review receipt count drift')
chk(visual['directFieldComparisons']==sum(len(x['pdfVisualFieldChecks']['fieldValues']) for x in ex),'visual comparison total drift')
chk(visual['directFieldComparisons']==sum(x['verifiedFieldCount'] for x in seen),'review-item comparison count drift')
for i,(r,x,v) in enumerate(zip(records,ex,seen),1):
 id=f'THREATS-DROID-{i:03d}';pp=r['publication']['printedPageStart'];status=r['certification'];c=r['classification']
 chk(set(r)==ROOT_KEYS,id+': root key drift / missing group')
 chk(id==x['sourceEntryKey']==v['sourceEntryKey'],id+': local identity drift')
 chk(r['recordType']=='droid-publication-source-entry',id+': wrong recordType')
 chk(r['publication']['bookId']=='THREATS' and r['publication']['book']=='Threats of the Galaxy',id+': source authority changed')
 chk(pp==x['printedPage']==v['printedPage'],id+': printed page drift')
 chk(r['publication']['pdfPageStart1Based']==pp+1==x['pdfPage1Based'],id+': PDF offset drift')
 chk(c.get('primaryActorAuthority')=='droid' and c.get('statblockFormat')=='droid-actor',id+': actor authority drift')
 chk(status.get('identityStatus')=='pdf-reviewed',id+': selected visual review not attributed')
 chk(status.get('mechanicalStatus')!='certified',id+': premature mechanical certification')
 chk(status.get('runtimeStatus')=='not-tested',id+': runtime claim without live test')
 chk(r['rules'].get('mechanicalExecutionStatus')=='source-only',id+': source rules executable')
 chk(r['pcConstruction'].get('creationRoute') is None,id+': invented hero creation route')
 chk(r['pcConstruction'].get('heroEligibility')==EXPECTED_HERO.get(i),id+': hero eligibility not source-confirmed')
 chk(not r['vehicleLink'],id+': invented vehicle ref')
 chk(not r['systems'].get('installed'),id+': guessed installed component refs')
 chk(not r['combat'].get('attackGroups'),id+': unexpected attack grant without mount certification')
 chk(x.get('sourceReviewStatus')=='PDF_SELECTED_FIELDS_VISUAL',id+': missing visual evidence state')
 checks=x.get('pdfVisualFieldChecks',{});vals=checks.get('fieldValues',{})
 chk(checks.get('pdfPage1Based')==pp+1 and checks.get('printedPage')==pp,id+': incorrect image citation')
 chk(checks.get('fieldComparisonCount')==len(vals)==v['verifiedFieldCount'],id+': visual field comparison drift')
 for ptr,want in vals.items():
  item=r
  for segment in ptr[1:].split('/'):
   item=item.get(segment,'__MISSING__') if isinstance(item,dict) else '__MISSING__'
  chk(item==want,id+': PDF-verified field value differs '+ptr)
 chk(r['challenge'].get('challengeLevel')==int(r['challenge'].get('challengeLevel') or -1),id+': missing CL')
 for key in ['reflex','flatFootedReflex','fortitude','will']:
  n=r['defenses'].get(key)
  if n is not None:chk(isinstance(n,int) and 0<=n<=80,id+': implausible defense '+key)
 if r['defenses'].get('flatFootedReflex') is not None:
  chk(r['defenses']['flatFootedReflex']<=r['defenses'].get('reflex',100),id+': flatfooted defense > total')
 def nullcheck(node,path=''):
  if node is None:
   chk(r['fieldStates'].get(path) in ('explicitly-none','not-applicable','not-stated','unclear-source','not-yet-reviewed'),id+': unsupported null '+path)
  elif isinstance(node,dict):
   for k,y in node.items():
    if path=='' and k=='fieldStates':continue
    nullcheck(y,path+'/'+k)
  elif isinstance(node,list):
   if not node:chk(r['fieldStates'].get(path)=='explicitly-none',id+': unjustified empty array '+path)
   for k,y in enumerate(node):nullcheck(y,path+'/'+str(k))
 nullcheck(r)
 for seq in ['conditionalMechanics']:
  for rule in r['rules'].get(seq,[]):
   chk(rule.get('executionStatus')=='source-only' and not rule.get('effectRef'),id+': source rule execution/guessed engine authority')
 for t in r['progression'].get('feats',[])+r['progression'].get('talents',[]):
  chk(t.get('enabledInRuntime') is not True,id+': uncertified feat or talent enabled')
 if i in (21,22):
  chk(c['ruleEntityNature']=='replica-droid' and r['pcConstruction'].get('pcIdentityKind')=='replica-droid',id+': replica identity not preserved')
  chk(any('Replica Droid Species Traits' in x for x in r['rules'].get('globalRuleReferences',[])),id+': species-rule source pointer missing')
 else:chk(c['ruleEntityNature']=='standard-droid',id+': standard droid incorrectly made replica')
 if i==21:
  chk(r['identity']['printedName']=='Replica Droid' and r['identity'].get('namedIndividual') is False,id+': generic replica identity corrupted')
 if i==22:
  chk(r['identity']['printedName']=='Guri' and r['identity'].get('namedIndividual') is True,id+': named individual identity corrupted')
  chk(r['identity'].get('baseModelSourceKey') is None,id+': unproven factory identity invented')
 if i==27:
  chk(r['defenses'].get('damageReduction')==3,id+': SD-6 printed DR 3 lost')
  chk('damageReduction' not in r['durability'],id+': SD-6 DR stored in wrong schema group')
chk(sum(r['certification']['mechanicalStatus']=='certified' for r in records)==0,'incorrect certification state')
res={'schema':'swse.droid.threats.local-validation/0.1','status':'PASS' if not errors else 'FAIL',
 'scope':'LOCAL_TYPED_SEMANTIC_AND_SELECTED_PDF_FIELD_CHECKS_ONLY','errors':errors,
 'counts':{'publicationClaims':29,'selectedFieldVisualReviews':len(seen),
 'directFieldComparisons':visual['directFieldComparisons'],
 'replicaModelAndNamedIndividual':2,'standardDroids':27,'confirmedHeroEligibilityStatements':len(EXPECTED_HERO),
 'mechanicallyCertified':0},'fullUpstreamJsonSchema202012Validated':False,'foundryRuntimeCertified':False,
 'sha256Ledger':hashlib.sha256(L.read_bytes()).hexdigest(),
 'limitations':'Selected printed first-page statistics only; TXT remains search index; full official JSON Schema 2020-12 and V13 execution gates outstanding.'}
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(res,indent=2)+'\n')
print(json.dumps(res,indent=2));sys.exit(0 if not errors else 1)
