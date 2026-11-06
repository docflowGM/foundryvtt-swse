#!/usr/bin/env python3
"""Apply directly sight-read Clone Wars fields from printed PDF pages.

This is a selective printed-page visual review. A FULL mechanical or semantic
certification is not asserted. Exact original publication assertions remain
in sidecar records for squad and vehicle entity ownership.
"""
import json,pathlib,hashlib,copy
R=pathlib.Path(__file__).resolve().parents[1]
led=R/'data/canonical/droids/source-books/clone.json'
evfile=R/'data/audits/droids/clone-field-evidence.json'
review=R/'data/audits/droids/clone-visual-field-review.json'
if review.exists():raise SystemExit('REFUSE rerun: visual batch already recorded. Inspect first.')
raw=json.loads(led.read_text()); ev=json.loads(evfile.read_text())
assert len(raw['sourceEntries'])==len(ev['records'])==40
# Remove *all* OCR-assigned hero permissions before granting any visually verified statement.
# Text lines are imperfectly segmented, often attaching the NEXT entry's eligibility
# to the previous record: false permissions are worse than unknowns.
for n,(rec,e) in enumerate(zip(raw['sourceEntries'],ev['records']),1):
    rec['pcConstruction'].pop('heroEligibility',None)
    e['txtEligibilityStatementUnassignedCandidate']=e.pop('txtEligibilityStatement',None)
    e['warnings'].append('Unassigned TXT eligibility candidate is NOT validated to belong to this model; PDF direct reading required.')
# Index -> visual verified main fields. Null for no CON; source degree/CL from census.
VIS={
 1:(66,'prohibited',9,11,15,14,8,10,10,9,12,8,9,4150),
 2:(67,'allowed',10,10,12,14,13,10,10,10,12,6,10,5870),
 3:(67,'allowed',10,14,14,14,13,13,11,10,12,7,12,11800),
 4:(68,'allowed',8,10,15,14,12,11,11,9,12,8,9,3100),
 5:(69,'allowed',10,8,13,12,12,13,13,10,11,7,10,6000),
 6:(69,'allowed',15,9,14,8,10,9,9,12,9,5,12,4200),
 7:(70,'allowed',15,14,10,8,12,13,11,12,9,5,12,1300),
 8:(70,'allowed',8,10,12,12,14,10,10,9,11,2,6,1460),
 9:(71,'prohibited',13,14,9,11,8,20,18,13,11,17,13,5860),
10:(71,'allowed',14,15,10,12,8,17,15,15,12,30,15,7800),
11:(72,'prohibited',28,10,8,10,5,9,9,19,10,23,19,4200),
12:(72,'allowed',12,15,10,10,12,12,10,11,10,3,10,1100),
13:(73,'prohibited',24,11,8,8,6,15,15,17,10,11,22,8000),
15:(160,'allowed',8,11,14,15,9,12,12,9,12,7,9,4300),
16:(161,'allowed',8,15,14,12,7,13,11,9,11,5,9,4200),
17:(162,'prohibited',3,18,10,11,6,19,15,6,10,5,6,350),
33:(198,None,28,15,8,14,7,17,15,20,13,60,29,29000),
}
# Additional actor format is NOT enough to grant model hero eligibility.
SPECIAL={
14:{'page':94,'note':'Published squad sample and squad traits; aggregation is NOT a stock individual droid.',
     'sourceOnly':{'reflex':8,'flatFootedReflex':8,'fortitude':11,'will':11,'hitPoints':20,'damageThreshold':21}},
34:{'page':198,'note':'Printed vehicle statblock and two gunnery lines. Vehicle source authority only.',
     'sourceOnly':{'hitPoints':175,'damageReduction':10,'newCredits':17500,'usedCredits':11000}},
40:{'page':208,'note':'Printed starship format with separate laser cannons, proton torpedoes and concussion missiles. Starship authority only.',
     'sourceOnly':{'hitPoints':70,'damageReduction':5,'newCredits':23000}}
}
items=[]
for idx,(rec,e) in enumerate(zip(raw['sourceEntries'],ev['records']),1):
    pid=f'CLONE-DROID-{idx:03d}'
    if idx not in VIS and idx not in SPECIAL:continue
    if idx in VIS:
        (page,elig,str_,dex,int_,wis,cha,ref,ff,fort,will,hp,threshold,cost)=VIS[idx]
        assert rec['classification']['primaryActorAuthority']=='droid'
        fields={'/challenge/challengeLevel':rec['challenge']['challengeLevel'],
          '/classification/size':rec['classification']['size'],
          '/abilities/str':str_,'/abilities/dex':dex,'/abilities/int':int_,'/abilities/wis':wis,'/abilities/cha':cha,
          '/abilities/con':None,
          '/defenses/reflex':ref,'/defenses/flatFootedReflex':ff,'/defenses/fortitude':fort,'/defenses/will':will,
          '/durability/hitPoints':hp,'/durability/damageThreshold':threshold,'/economics/newCredits':cost}
        if elig:fields['/pcConstruction/heroEligibility']=elig
        groups= {'abilities':('str','dex','int','wis','cha','con'),'defenses':('reflex','flatFootedReflex','fortitude','will'),
             'durability':('hitPoints','damageThreshold'),'economics':('newCredits',)}
        for g,keys in groups.items():
            for key in keys:rec[g][key]=fields[f'/{g}/{key}']
        rec['fieldStates']['/abilities/con']='explicitly-none'
        if elig:rec['pcConstruction']['heroEligibility']=elig
        sourceOnly={}
    else:
        x=SPECIAL[idx];page=x['page'];sourceOnly=x['sourceOnly']
        fields={'/challenge/challengeLevel':rec['challenge']['challengeLevel'],'/classification/size':rec['classification']['size']}
        assert rec['classification']['primaryActorAuthority']!='droid'
        # Do not turn printed vehicle/squad total stats into droid actor stats.
        assert not any(rec[g] for g in ('defenses','durability','combat','movement','geometry'))
    if idx==14:
        assert rec['publication']['printedPageStart']==95
        rec['publication']['printedPageStart']=94
        rec['publication']['printedPageEnd']=94
        rec['publication']['pdfPageStart1Based']=95
        rec['exceptions']['transcriptionWarnings']=[
           'CENSUS PAGE CORRECTION: Original census says printed p95; printed PDF shows B1-Series Battle Droid Squad statblock on p94. Keep a correction receipt; do not alter upstream census until authorized.'
        ]
    if idx==15:
        rec['publication']['printedPageEnd']=161
        rec['exceptions']['transcriptionWarnings']=[
           'SPLIT STATBLOCK: FX-6 begins on printed p160 and continues at upper-left of p161; original census states p160 only.'
        ]
    rec['certification']['identityStatus']='pdf-reviewed'
    rec['certification']['mechanicalStatus']='partial'
    rec['certification']['reviewerEvidenceRefs'].append(f'CLONE:printed-p{page}:PDF-page-{page+1}:selected-visual-fields')
    if idx==15:rec['certification']['reviewerEvidenceRefs'].append('CLONE:printed-p161:PDF-page-162:continued-statblock')
    e['sourceReviewStatus']='PDF_SELECTED_FIELDS_VISUAL'
    e['pdfVisualLayoutChecked']=True
    e['pdfVisualFieldChecks']={'printedPage':page,'pdfPage1Based':page+1,'fieldValues':fields,
             'sourceOnlyPrintedValues':sourceOnly,'fieldComparisonCount':len(fields),
             'inspectionScope':'Selected visible source fields only; full mechanical source certification pending'}
    if idx==15:e['pdfVisualFieldChecks']['statblockContinuationPages']=[160,161]
    e['verifiedEligibility']='source-printed '+elig if idx in VIS and elig else None
    items.append({'sourceEntryKey':pid,'printedName':rec['identity']['printedName'],
                  'printedPage':page,'verifiedFieldCount':len(fields),
                  'sourceOwnedNonActorValues':sourceOnly,
                  'scope':'selected-fields' if idx in VIS else 'source-authority-format'})
assert len(items)==20
# Reject any invented or leaked runtime rights.
for r in raw['sourceEntries']:
 assert r['rules']['mechanicalExecutionStatus']=='source-only'
 assert r['certification']['mechanicalStatus']!='certified'
 for a in r['combat'].get('attackGroups',[]):assert a['operationStatus']=='source-only' and not a.get('weaponComponentId')
# Create a single backup of the first checkpoint for audit durability.
work=R/'work';work.mkdir(exist_ok=True)
for path in [led,evfile]:
 bak=work/('clone-initial-'+path.name)
 if not bak.exists():bak.write_bytes(path.read_bytes())
led.write_text(json.dumps(raw,indent=2,ensure_ascii=False)+'\n')
evfile.write_text(json.dumps(ev,indent=2,ensure_ascii=False)+'\n')
review.write_text(json.dumps({'schema':'swse.droid.clone.visual-review/0.1',
 'sourceBook':'Clone Wars Campaign Guide','manualVisualReviews':len(items),
 'directFieldComparisons':sum(x['verifiedFieldCount'] for x in items),
 'visualMethod':'Direct inspection of image-only original PDF pages, selected fields, printed-page labels',
 'sourcePdfHash':ev['sourcePdfSha256'],'items':items},indent=2,ensure_ascii=False)+'\n')
print('PDF reviews',len(items),'field comparisons',sum(x['verifiedFieldCount'] for x in items))
print('B1 squad p94 corrected, FX-6 split p160-161 corrected. All unverified OCR eligibility cleared.')
