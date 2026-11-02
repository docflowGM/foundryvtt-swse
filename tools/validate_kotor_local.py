#!/usr/bin/env python3
"""KOTOR local source/visual semantic checks. NOT upstream schema or V13 certification."""
from pathlib import Path
import hashlib,json,sys,os
R=Path(__file__).resolve().parents[1]
L=Path(os.environ.get('SWSE_KOTOR_LEDGER',R/'data/canonical/droids/source-books/kotor.json'))
E=Path(os.environ.get('SWSE_KOTOR_EVIDENCE',R/'data/audits/droids/kotor-field-evidence.json'))
V=Path(os.environ.get('SWSE_KOTOR_VISUAL',R/'data/audits/droids/kotor-visual-field-review.json'))
OUT=Path(os.environ.get('SWSE_KOTOR_VALIDATION',R/'docs/audits/droids/kotor-local-validation.json'))
ROOT_KEYS=set('schemaVersion recordType identity publication classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules certification'.split())
HERO={1:'allowed',2:'prohibited',3:'allowed',4:'allowed',5:'allowed',6:'prohibited',7:'conditional',8:'prohibited',9:'prohibited',10:'prohibited',11:'prohibited',12:'prohibited',13:'allowed',14:'prohibited',15:'prohibited',16:'allowed',17:'prohibited',18:'prohibited',23:'prohibited'}
NAMED={20,21,22}

def validate(l,e,v,external=True):
 errs=[]
 def chk(b,msg):
  if not b:errs.append(msg)
 recs=l.get('sourceEntries',[]);ev=e.get('records',[]);views=v.get('items',[])
 chk(l.get('bookId')=='KOTOR','Wrong sourcebook')
 chk(len(recs)==len(ev)==len(views)==24,'Source/evidence/review coverage not 24')
 chk(e.get('sourcePdfSha256')==v.get('sourcePdfHash'),'Review PDF source hash mismatch')
 chk(v.get('manualVisualReviews')==24,'Incorrect visual review count')
 chk(v.get('directFieldComparisons')==sum(i.get('verifiedFieldCount',0) for i in views),'Field count mismatch')
 if external:
  for label,path,k in [('PDF',Path('/mnt/data/SAGA EDITION - Knights of the Old Republic Campaign Guide.pdf'),'sourcePdfSha256'),('TXT',Path('/mnt/data/Knights of the Old Republic Campaign Guide_djvu.txt'),'sourceTxtSha256')]:
   chk(path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==e.get(k),label+' source missing or changed')
 for n,(r,x,item) in enumerate(zip(recs,ev,views),1):
  id=f'KOTOR-DROID-{n:03d}'
  p=r['publication']['printedPageStart'];cert=r['certification'];c=r['classification'];pc=r['pcConstruction']
  chk(set(r)==ROOT_KEYS,id+': schema root group drift')
  chk(id==r['identity']['sourceEntryKey']==x['sourceEntryKey']==item['sourceEntryKey'],id+': source identity altered')
  chk(r['recordType']=='droid-publication-source-entry',id+': record type not source')
  chk(r['publication'].get('bookId')=='KOTOR' and r['publication'].get('book')==l['book'],id+': publication authority drift')
  chk(p==x['printedPage']==item['printedPage'] and p+1==r['publication']['pdfPageStart1Based']==x['pdfPage1Based'],id+': printed/PDF page drift')
  chk(cert['identityStatus']=='pdf-reviewed',id+': visual not attributed')
  chk(cert['mechanicalStatus']!='certified' and cert['runtimeStatus']=='not-tested',id+': premature certification')
  chk(r['rules'].get('mechanicalExecutionStatus')=='source-only',id+': executable global mechanic')
  chk(pc.get('creationRoute') is None and pc.get('startingProfileRef') is None,id+': invented PC creation route/profile')
  chk(pc.get('heroEligibility')==HERO.get(n),id+': unsafe or missing printed hero restriction')
  chk(r['identity']['namedIndividual']==(n in NAMED),id+': factory vs named NPC conflation')
  chk(not r['combat'].get('attackGroups'),id+': attack action created without certified ownership')
  chk(not r['systems'].get('installed'),id+': installed systems inferred without provenance')
  chk(not r['progression'].get('feats') and not r['progression'].get('talents'),id+': uncertified feat or talent grant')
  chk(r['movement'].get('speedLineRaw') is None,id+': derived movement description represented as printed raw')
  if n==19:
   chk(c.get('primaryActorAuthority')=='vehicle' and c.get('statblockFormat')=='vehicle' and c.get('ruleEntityNature')=='vehicle-format-droid',id+': Basilisk actor authority changed')
   chk(not r['durability'] and not r['defenses'] and not r['combat'] and not r['movement'] and not r['vehicleLink'],id+': vehicle statblocks leaked into droid actor')
   chk(x.get('vehiclePrintedStatblock',{}).get('hitPoints')==70 and x.get('vehiclePrintedStatblock',{}).get('damageReduction')==5,id+': vehicle stats lost')
   chk(c.get('publishedDegree') is None,id+': invented Basilisk degree')
  else:
   chk(c.get('primaryActorAuthority')=='droid' and c.get('statblockFormat')=='droid-actor',id+': incorrect droid authority')
   chk(c.get('ruleEntityNature')=='standard-droid',id+': wrong droid nature')
   chk(c.get('publishedDegree') in (1,2,3,4,5),id+': absent degree')
  if n in (6,8):
   chk(pc['heroEligibility']=='prohibited',id+': HK factory model unblocked')
   chk(r['economics'].get('forSale') is False and r['economics'].get('estimatedValueCredits') is not None,id+': HK model sale prohibition lost')
  if n==7:
   chk(pc['heroEligibility']=='conditional' and pc.get('heroEligibilityCondition'),id+': Independent HK not GM conditional')
  if n==21:chk(r['identity'].get('baseModelSourceKey') is None,id+': HK-47 falsely derived from template')
  if n==20:chk(r['identity'].get('baseModelSourceKey')=='KOTOR-DROID-002',id+': GO-TO named/factory source link lost')
  if n==22:chk(r['identity'].get('baseModelSourceKey')=='KOTOR-DROID-003',id+': T3-M4 named/stock source link lost')
  checks=x.get('pdfVisualFieldChecks',{});vals=checks.get('fieldValues',{})
  chk(x.get('sourceReviewStatus')=='PDF_SELECTED_FIELDS_VISUAL',id+': review status unsupported')
  chk(checks.get('printedPage')==p and checks.get('pdfPage1Based')==p+1,id+': review page mismatch')
  chk(len(vals)==item['verifiedFieldCount']==checks.get('fieldComparisonCount'),id+': field count drift')
  for ptr,want in vals.items():
   obj=r
   for key in ptr[1:].split('/'):
    obj=obj.get(key,'__MISSING__') if isinstance(obj,dict) else '__MISSING__'
   chk(obj==want,id+': visual evidence mismatch '+ptr)
  def nullcheck(obj,ptr=''):
   if obj is None:
    chk(r['fieldStates'].get(ptr) in ('explicitly-none','not-applicable','not-stated','unclear-source','not-yet-reviewed'),id+': unsupported null '+ptr)
   elif isinstance(obj,dict):
    for k,vv in obj.items():
     if ptr=='' and k=='fieldStates':continue
     nullcheck(vv,ptr+'/'+k)
   elif isinstance(obj,list):
    if not obj:chk(r['fieldStates'].get(ptr)=='explicitly-none',id+': unjustified empty list '+ptr)
    for k,vv in enumerate(obj):nullcheck(vv,ptr+'/'+str(k))
  nullcheck(r)
  for rule in r['rules'].get('conditionalMechanics',[]):
   chk(rule.get('executionStatus')=='source-only' and rule.get('effectRef') is None,id+': source-only rule grants execution')
  if n!=19:
   for k in ['reflex','flatFootedReflex','fortitude','will']:
    val=r['defenses'].get(k)
    chk(isinstance(val,int) and 0<=val<=80,id+': missing/implausible defense '+k)
   chk(r['defenses']['flatFootedReflex']<=r['defenses']['reflex'],id+': flat-footed exceeds regular defense')
   chk(isinstance(r['durability'].get('hitPoints'),int) and 0<r['durability']['hitPoints']<=1000,id+': invalid actor source hp')
 chk(sum(r['certification']['mechanicalStatus']=='certified' for r in recs)==0,'Claimed mechanical certifications')
 return errs

if __name__=='__main__':
 l=json.loads(L.read_text());e=json.loads(E.read_text());v=json.loads(V.read_text())
 errors=validate(l,e,v)
 result={'schema':'swse.droid.kotor.local-validation/0.1',
  'status':'PASS' if not errors else 'FAIL',
  'scope':'LOCAL_SEMANTIC_AND_SELECTED_PDF_FIELD_VALIDATION_ONLY','errors':errors,
  'counts':{'publicationClaims':24,'selectedFieldVisualReviews':len(v['items']),
    'directFieldComparisons':v['directFieldComparisons'],'standardDroidActors':23,
    'vehiclePrimaryRecords':1,'namedIndividuals':3,'independentlyMechanicallyCertified':0},
  'fullUpstreamJsonSchema202012Validated':False,'foundryRuntimeCertified':False,
  'sourceLedgerSha256':hashlib.sha256(L.read_bytes()).hexdigest(),
  'limitations':'No complete secondary-page/feat/talent/PC-route/weapon-mount certification. No upstream JSON Schema or live V13 test.'}
 OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));sys.exit(0 if not errors else 1)
