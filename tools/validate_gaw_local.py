#!/usr/bin/env python3
"""Fail-closed local semantic and selected PDF-field validation only (NOT JSON schema or Foundry V13)."""
from pathlib import Path
import json,hashlib,os,sys
R=Path(__file__).resolve().parents[1]
L=Path(os.environ.get('SWSE_GAW_LEDGER',R/'data/canonical/droids/source-books/gaw.json'))
E=Path(os.environ.get('SWSE_GAW_EVIDENCE',R/'data/audits/droids/gaw-field-evidence.json'))
V=Path(os.environ.get('SWSE_GAW_VISUAL',R/'data/audits/droids/gaw-visual-field-review.json'))
OUT=Path(os.environ.get('SWSE_GAW_VALIDATION',R/'docs/audits/droids/gaw-local-validation.json'))
ROOT_KEYS=set('schemaVersion recordType identity publication classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules certification'.split())
ELIG={1:'allowed',2:'allowed',3:'allowed',4:'prohibited',5:'prohibited',6:'prohibited',7:'prohibited',8:'allowed',9:'prohibited',10:'prohibited',11:'prohibited'}
REPEATS={8:[213],14:[212],15:[212],16:[218]}

def validate(ledger,evidence,visual,external=False):
 errors=[]
 def check(pred,msg):
  if not pred:errors.append(msg)
 rlist=ledger.get('sourceEntries',[]);elist=evidence.get('records',[]);vlist=visual.get('items',[])
 check(ledger.get('bookId')=='GAW','bookId changed')
 check(len(rlist)==len(elist)==len(vlist)==22,'coverage must be exactly 22')
 if not (len(rlist)==len(elist)==len(vlist)==22):return errors
 check(visual.get('manualVisualReviews')==22,'printed page review count changed')
 check(visual.get('directFieldComparisons')==sum(x.get('verifiedFieldCount',0) for x in vlist),'comparison count mismatch')
 check(visual.get('sourcePdfHash')==evidence.get('sourcePdfSha256'),'PDF identity hash mismatch')
 if external:
  for path,ref in [(Path('/mnt/data/SW_Saga_Galaxy_at_War.pdf'),'sourcePdfSha256'),(Path('/mnt/data/Galaxy At War_djvu.txt'),'sourceTxtSha256')]:
   check(path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==evidence.get(ref),'source unavailable or altered: '+path.name)
 for i,(r,x,v) in enumerate(zip(rlist,elist,vlist),1):
  ident=f'GAW-DROID-{i:03d}';c=r['classification'];pc=r['pcConstruction'];auth=c.get('primaryActorAuthority');cert=r['certification'];p=r['publication']['printedPageStart'];vals=x.get('pdfVisualFieldChecks',{}).get('fieldValues',{})
  check(set(r)==ROOT_KEYS,ident+' schema root drift')
  check(r['recordType']=='droid-publication-source-entry',ident+' wrong record type')
  check(ident==r['identity']['sourceEntryKey']==x['sourceEntryKey']==v['sourceEntryKey'],ident+' identity mismatch')
  check(r['publication']['bookId']=='GAW' and r['publication']['book']==ledger['book'],ident+' book authority mismatch')
  check(p==x['printedPage']==v['printedPage'] and r['publication']['pdfPageStart1Based']==x['pdfPage1Based']==p+1,ident+' page mismatch')
  check(c['size'] in ('Small','Medium','Large','Huge','Gargantuan','Colossal','Diminutive','Tiny','Fine'),ident+' invalid size')
  check(cert['identityStatus']=='pdf-reviewed' and cert['mechanicalStatus']!='certified' and cert['runtimeStatus']=='not-tested',ident+' certification gate bypass')
  check(r['rules'].get('mechanicalExecutionStatus')=='source-only',ident+' global rule activation')
  check(pc.get('creationRoute') is None and pc.get('startingProfileRef') is None,ident+' fabricated chargen route')
  check(pc.get('heroEligibility')==ELIG.get(i),ident+' hero permission drift')
  check(r['identity']['namedIndividual'] is False,ident+' invented named character')
  check(not r['identity'].get('baseModelSourceKey'),ident+' unproven auto-inheritance from other book')
  for key in ['attackGroups','specialActions','firingDelegation']:
   check(not r['combat'].get(key),ident+' executable combat data without mount authority: '+key)
  check(not r['systems'].get('installed'),ident+' fabricated installed component')
  check(not r['progression'].get('feats') and not r['progression'].get('talents'),ident+' uncertified progression grant')
  check(not r['movement'].get('locomotionSystems'),ident+' unproven locomotion component')
  check(not r['vehicleLink'],ident+' unverified vehicle mapping')
  check(x.get('sourceReviewStatus')=='PDF_SELECTED_FIELDS_VISUAL',ident+' source review status altered')
  check(x.get('pdfVisualFieldChecks',{}).get('sourceImage')==f'work/gaw_pdf_review/printed_p{p}.png',ident+' visual source receipt mismatch')
  check(len(vals)==v['verifiedFieldCount']==x['pdfVisualFieldChecks']['fieldComparisonCount'],ident+' selected-field count mismatch')
  check(vals.get('/identity/printedName')==r['identity']['printedName'],ident+' printed name mismatch')
  for ptr,want in vals.items():
   obj=r
   for key in ptr[1:].split('/'):
    obj=obj.get(key,'__MISSING__') if isinstance(obj,dict) else '__MISSING__'
   check(obj==want,ident+' altered visual source field '+ptr)
  def nullcheck(obj,ptr=''):
   if obj is None:
    check(r['fieldStates'].get(ptr) in ('explicitly-none','not-applicable','not-stated','unclear-source','not-yet-reviewed'),ident+' untracked null '+ptr)
   elif isinstance(obj,dict):
    for key,val in obj.items():
     if ptr=='' and key=='fieldStates':continue
     nullcheck(val,ptr+'/'+key)
   elif isinstance(obj,list):
    if not obj:check(r['fieldStates'].get(ptr)=='explicitly-none',ident+' unjustified empty list '+ptr)
    for index,val in enumerate(obj):nullcheck(val,ptr+'/'+str(index))
  nullcheck(r)
  for rule in r['rules'].get('conditionalMechanics',[]):
   check(rule.get('executionStatus')=='source-only' and not rule.get('effectRef') and not rule.get('precedenceDecisionId'),ident+' conditional source rule activated')
  for rule in r['defenses'].get('conditionalDefenseRules',[]):
   check(rule.get('executionStatus')=='source-only' and not rule.get('effectRef'),ident+' conditional defense activated')
  if i==19:expected='vehicle'
  elif i==20:expected='squad-aggregation'
  else:expected='droid'
  check(auth==expected,ident+' authority changed')
  if expected in ('vehicle','squad-aggregation'):
   check(not r['abilities'] and not r['defenses'] and not r['durability'] and not r['combat'] and not r['economics'] and not r['movement'],ident+' vehicle/squad values leaked into actor')
   check(x.get('nonActorPrintedStatblock',{}).get('owner')==expected and x['nonActorPrintedStatblock'].get('nonTransferableToDroidActor') is True,ident+' nonactor stat evidence lost')
  else:
   check(auth=='droid' and c['statblockFormat']=='droid-actor' and c['ruleEntityNature']=='standard-droid',ident+' wrong droid format')
   for k in ['reflex','flatFootedReflex','fortitude','will']:
    check(isinstance(r['defenses'].get(k),int) and 0<=r['defenses'][k]<=80,ident+' invalid defense '+k)
   check(r['defenses'].get('flatFootedReflex',999)<=r['defenses'].get('reflex',-1),ident+' flatfooted defense greater than base')
   check(isinstance(r['durability'].get('hitPoints'),int) and 0<r['durability']['hitPoints']<=2000,ident+' invalid actor hp')
   check(isinstance(r['economics'].get('newCredits'),int) and r['economics']['newCredits']>0,ident+' invalid printed price')
   if r['economics'].get('usedCredits') is not None:
    check(0<r['economics']['usedCredits']<r['economics']['newCredits'],ident+' invalid used price')
  if i==6:check(r['defenses'].get('damageReduction')==10,ident+' Purge Trooper DR not stored in defense authority')
  if i==12:
   check(r['defenses'].get('reflex')==15 and r['defenses'].get('flatFootedReflex')==14,ident+' sentry base Reflex rewritten by encounter cover')
   a=x.get('alternatePrintPresentation',{})
   check(a.get('printedPage')==175 and a.get('encounterReflex')==20 and a.get('encounterFlatFootedReflex')==19 and a.get('baseReflex')==15,ident+' contextual cover evidence lost')
   check(bool(r['defenses'].get('conditionalDefenseRules')),ident+' conditional cover rule removed')
  if i in REPEATS:
   check([t['printedPage'] for t in x.get('samePublicationPresentations',[])]==REPEATS[i],ident+' duplicate-page presentation lost')
  if i==20:
   check(not x.get('samePublicationPresentations'),ident+' p220 invented B1 squad duplicate')
   check(x.get('censusPresentationDiscrepancy',{}).get('pdfPrintedPageChecked')==220,ident+' p220 census correction removed')
   check(x['nonActorPrintedStatblock']['selectedFields'].get('hitPoints')==20,ident+' squad HP lost')
  if i==19:
   check(c.get('publishedDegree') is None and r['fieldStates'].get('/classification/publishedDegree')=='not-stated',ident+' GAT droid degree invented')
   check(x['nonActorPrintedStatblock']['selectedFields'].get('hitPoints')==175 and x['nonActorPrintedStatblock']['selectedFields'].get('damageReduction')==10,ident+' GAT vehicle HP/DR lost')
 check(sum(x['certification']['mechanicalStatus']=='certified' for x in rlist)==0,'claim certifications falsely assigned')
 return errors

if __name__=='__main__':
 l=json.loads(L.read_text());e=json.loads(E.read_text());v=json.loads(V.read_text())
 errs=validate(l,e,v,True)
 result={'schema':'swse.droid.gaw.local-validation/0.1','status':'PASS' if not errs else 'FAIL',
  'scope':'LOCAL_SEMANTIC_AND_SELECTED_PDF_FIELD_VALIDATION_ONLY','errors':errs,
  'counts':{'publicationClaims':22,'selectedFirstPageVisualReviews':len(v['items']),
   'directFieldComparisons':v['directFieldComparisons'],'droidActorSourceRecords':20,
   'vehiclePrimaryRecords':1,'squadPrimaryRecords':1,'independentlyMechanicalCertified':0},
  'fullUpstreamJsonSchema202012Validated':False,'foundryRuntimeCertified':False,
  'sourceLedgerSha256':hashlib.sha256(L.read_bytes()).hexdigest(),
  'limitations':'Selected pages only; source PDF/TXT hashes verified. No complete narrative, feat/talent, equipment, attack/mount, PC-route or Foundry V13 certification. Upstream schema not available in container.'}
 OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));sys.exit(0 if not errs else 1)
