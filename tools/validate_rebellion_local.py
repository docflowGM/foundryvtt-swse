#!/usr/bin/env python3
"""Fail-closed Rebellion selected-page semantic validator. NOT full schema or Foundry certification."""
from pathlib import Path
import hashlib,json,os,sys
R=Path(__file__).resolve().parents[1]
LP=Path(os.environ.get('SWSE_REBELLION_LEDGER',R/'data/canonical/droids/source-books/rebellion.json'))
EP=Path(os.environ.get('SWSE_REBELLION_EVIDENCE',R/'data/audits/droids/rebellion-field-evidence.json'))
VP=Path(os.environ.get('SWSE_REBELLION_VISUAL',R/'data/audits/droids/rebellion-visual-field-review.json'))
OP=Path(os.environ.get('SWSE_REBELLION_VALIDATION',R/'docs/audits/droids/rebellion-local-validation.json'))
ROOT=set('schemaVersion recordType identity publication classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules certification'.split())
ELIG={1:'prohibited',2:'allowed',3:'allowed',4:'allowed',5:'prohibited',6:'prohibited',7:'prohibited',8:None,9:'allowed',10:'prohibited',11:'prohibited',12:'prohibited',13:'allowed',14:None,15:None}
PAGES=[53,53,54,55,55,57,57,110,127,128,128,129,130,143,144]
NAMES=['FX-7 Medical Droid','R4-Series Agromech Droid','WED Treadwell Repair Droid','LOM-Series Protocol Droid','BT-16 Perimeter Security Droid','RHTC-560 Hunter Trainer','HT Drone','LV-38 Spotter/Probe Droid','Imperial Espionage Droid','Dark Trooper Phase I','Dark Trooper Phase II','Dark Trooper Phase III','Imperial City Maintenance Droid','4-LOM','IG-88']
PRICE={1:3800,2:2500,3:3000,4:2000,5:4100,6:5000,7:2000,9:5000,10:10000,11:50000,12:85000,13:500}
SPECIALS={1:'STATIONARY',5:'BOMARR-BRAIN',6:'HT-CONTROL',7:'LAST-COMMAND',10:'BLAST-SHIELD',11:'WEARABLE-ARMOR',12:'WEARABLE-ARMOR',14:'NAMED-LOM',15:'CONSCIOUSNESS'}

def validate(ledger,evidence,visual,external=False):
 errors=[]
 def check(ok,message):
  if not ok:errors.append(message)
 rr=ledger.get('sourceEntries',[]);ee=evidence.get('records',[]);vv=visual.get('items',[])
 check(ledger.get('bookId')=='REBELLION' and ledger.get('expectedPublicationClaims')==15,'sourcebook identity/count changed')
 check(len(rr)==len(ee)==len(vv)==15,'must have 15 aligned claims')
 if len(rr)!=15 or len(ee)!=15 or len(vv)!=15:return errors
 check(visual.get('manualVisualReviews')==15,'visual review count mismatch')
 check(visual.get('directFieldComparisons')==sum(i.get('verifiedFieldCount',0) for i in vv),'visual comparison count mismatch')
 check(visual.get('sourcePdfHash')==evidence.get('sourcePdfSha256'),'source PDF hash receipt mismatch')
 if external:
  for p,k in [(Path('/mnt/data/Star Wars Saga Edition - Rebellion Era Campaign Guide.pdf'),'sourcePdfSha256'),(Path('/mnt/data/Rebellion Era Campaign Guide_djvu.txt'),'sourceTxtSha256')]:
   check(p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==evidence.get(k),'source missing/mismatched '+p.name)
 for ix,(r,e,v) in enumerate(zip(rr,ee,vv),1):
  key=f'REBELLION-DROID-{ix:03d}';name=NAMES[ix-1];p=PAGES[ix-1]
  c=r['classification'];pc=r['pcConstruction'];cert=r['certification'];fields=e.get('pdfVisualFieldChecks',{}).get('fieldValues',{})
  check(set(r)==ROOT,key+' schema root drift')
  check(r.get('recordType')=='droid-publication-source-entry',key+' recordType drift')
  check(key==r['identity']['sourceEntryKey']==e['sourceEntryKey']==v['sourceEntryKey'],key+' stable identity drift')
  check(name==r['identity']['printedName']==e['printedName']==v['printedName'],key+' name drift')
  check(r['identity'].get('namedIndividual')==(ix in (14,15)),key+' named status drift')
  check(r['identity'].get('baseModelSourceKey') is None,key+' unproven factory/named mechanical inheritance')
  check(r['publication'].get('bookId')=='REBELLION' and r['publication'].get('book')==ledger['book'],key+' publication drift')
  check(r['publication'].get('printedPageStart')==p==e['printedPage']==v['printedPage'],key+' printed page drift')
  check(r['publication'].get('pdfPageStart1Based')==p+1==e['pdfPage1Based'],key+' PDF index drift')
  check(c.get('primaryActorAuthority')=='droid' and c.get('statblockFormat')=='droid-actor' and c.get('ruleEntityNature')=='standard-droid',key+' actor authority changed')
  check(c.get('size') in ('Small','Medium','Large','Huge','Gargantuan','Colossal','Diminutive','Tiny','Fine'),key+' invalid size')
  check(cert.get('identityStatus')=='pdf-reviewed' and cert.get('mechanicalStatus')=='partial' and cert.get('runtimeStatus')=='not-tested',key+' certification bypass')
  check(r['rules'].get('mechanicalExecutionStatus')=='source-only',key+' global source rule made executable')
  check(not r['combat'],key+' printed attack converted into executable combat data')
  check(not r['systems'].get('installed') and not r['systems'].get('factorySystems'),key+' unverified physical systems installed')
  check(not r['progression'].get('feats') and not r['progression'].get('talents'),key+' uncertified feat/talent grant')
  check(not r['movement'].get('locomotionSystems'),key+' locomotion instance without component provenance')
  check(not r['equipment'],key+' source possessions upgraded to installed equipment')
  check(not r['vehicleLink'],key+' invented vehicle relationship')
  check(pc.get('heroEligibility')==ELIG[ix],key+' published hero eligibility drift')
  check(pc.get('creationRoute') is None and pc.get('startingProfileRef') is None and pc.get('baseTraitPackageRef') is None,key+' manufactured legal PC route')
  check(e.get('sourceReviewStatus')=='PDF_SELECTED_FIELDS_VISUAL',key+' source evidence status drift')
  check(e['pdfVisualFieldChecks'].get('sourceImage')==f'work/rebellion_pdf_review/printed_p{p}.png',key+' source image path drift')
  check(v.get('sourceImage')==e['pdfVisualFieldChecks']['sourceImage'],key+' visual image receipt drift')
  check(len(fields)==v.get('verifiedFieldCount')==e['pdfVisualFieldChecks'].get('fieldComparisonCount'),key+' visual field count drift')
  for ptr,want in fields.items():
   obj=r
   for part in ptr.strip('/').split('/'):
    obj=obj.get(part,'__MISSING__') if isinstance(obj,dict) else '__MISSING__'
   check(obj==want,key+' visually reviewed fact changed: '+ptr)
  def nullcheck(obj,path=''):
   if obj is None:
    check(r['fieldStates'].get(path) in ('explicitly-none','not-applicable','not-stated','unclear-source','not-yet-reviewed'),key+' untracked null '+path)
   elif isinstance(obj,dict):
    for k,val in obj.items():
     if path=='' and k=='fieldStates':continue
     nullcheck(val,path+'/'+k)
   elif isinstance(obj,list):
    if not obj:check(r['fieldStates'].get(path)=='explicitly-none',key+' unjustified empty list '+path)
    for k,val in enumerate(obj):nullcheck(val,path+'/'+str(k))
  nullcheck(r)
  check(r['abilities'].get('con') is None and r['fieldStates'].get('/abilities/con')=='explicitly-none',key+' droid CON explicit absence lost')
  for k in ('reflex','flatFootedReflex','fortitude','will'):
   check(isinstance(r['defenses'].get(k),int) and 0<=r['defenses'][k]<=80,key+' invalid printed defense '+k)
  check(r['defenses'].get('flatFootedReflex',999)<=r['defenses'].get('reflex',-1),key+' flat-footed defense > normal')
  check(isinstance(r['durability'].get('hitPoints'),int) and 0<r['durability']['hitPoints']<1000,key+' invalid printed HP')
  if ix in PRICE:check(r['economics'].get('newCredits')==PRICE[ix],key+' printed price changed')
  else:check('newCredits' not in r['economics'],key+' inferred missing published price')
  for rule in r['rules'].get('conditionalMechanics',[]):
   check(rule.get('executionStatus')=='source-only' and not rule.get('effectRef') and not rule.get('precedenceDecisionId'),key+' executed source-specific rule')
   check(rule.get('source',{}).get('book')==ledger['book'] and rule.get('source',{}).get('verifiedBy')=='pdf-visual',key+' rule provenance changed')
  for rule in r['defenses'].get('conditionalDefenseRules',[]):
   check(rule.get('executionStatus')=='source-only' and not rule.get('effectRef'),key+' conditional defense activated')
  if ix in SPECIALS:check(any(SPECIALS[ix] in x.get('ruleId','') for x in r['rules'].get('conditionalMechanics',[])),key+' crucial source-only exception lost')
  if ix==1:check(r['movement'].get('speedLineRaw')=='0 (stationary)',key+' FX7 speed erroneously set mobile')
  if ix==6:check(r['economics'].get('newCredits')==5000 and any('DRONE-PRICE' in x['ruleId'] for x in r['rules'].get('conditionalMechanics',[])),key+' drone cost mistakenly included')
  if ix==7:check('hovering' in r['movement'].get('speedLineRaw','') and 'walking' in r['movement'].get('speedLineRaw',''),key+' HT drone dual movement lost')
  if ix==10:check(bool(r['defenses'].get('conditionalDefenseRules')),key+' Phase I conditional blast shield lost')
  if ix in (11,12):
   check('WEARABLE-ARMOR' in ' '.join(x['ruleId'] for x in r['rules'].get('conditionalMechanics',[])),key+' separable wearable armor rule lost')
  if ix==12:check(r['defenses'].get('shieldRating')==20,key+' Phase III source shield rating altered')
  if ix in (14,15):check(pc['heroEligibility'] is None and not r['identity'].get('baseModelSourceKey'),key+' named NPC made generic PC model')
 check(sum(r['certification']['mechanicalStatus']=='certified' for r in rr)==0,'falsely mechanically certified')
 return errors

if __name__=='__main__':
 l=json.loads(LP.read_text());e=json.loads(EP.read_text());v=json.loads(VP.read_text())
 errors=validate(l,e,v,True)
 status={'schema':'swse.droid.rebellion.local-validation/0.1','status':'PASS' if not errors else 'FAIL','scope':'LOCAL_SEMANTIC_AND_SELECTED_PDF_FIELD_VALIDATION_ONLY',
  'errors':errors,'counts':{'publicationClaims':15,'selectedFirstPageVisualReviews':len(v['items']),'directFieldComparisons':v['directFieldComparisons'],
   'droidActorSourceRecords':15,'independentlyMechanicalCertified':0},
  'fullUpstreamJsonSchema202012Validated':False,'foundryRuntimeCertified':False,
  'sourceLedgerSha256':hashlib.sha256(LP.read_bytes()).hexdigest(),
  'limitations':'Printed pages selected fields only; full rules, feats, talents, components/mounts, legal chargen, upstream schema and V13 runtime not verified.'}
 OP.parent.mkdir(parents=True,exist_ok=True);OP.write_text(json.dumps(status,indent=2)+'\n')
 print(json.dumps(status,indent=2));sys.exit(0 if not errors else 1)
