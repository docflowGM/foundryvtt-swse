#!/usr/bin/env python3
"""Seed Clone Wars publication identity source ledger from the verified 40-row census.

Local-only. Do not overwrite. PDF is image-only; TXT is an OCR index, not final authority.
The source mechanical fields are intentionally restricted to unambiguous text and
never certify an executable rule, weapon mount, vehicle actor, or PC permission.
"""
from pathlib import Path
import hashlib, json, re
ROOT=Path(__file__).resolve().parents[1]
SRC=Path('/mnt/data/Clone Wars Campaign Guide_djvu.txt')
PDF=Path('/mnt/data/SAGA EDITION - Clone Wars Campaign Guide.pdf')
BOOK='Clone Wars Campaign Guide'
# name | printed page | TXT line anchor | degree | size | challenge level | format
ROWS=r'''DD-13 Medical Assistant Droid|66|5673|1|Medium|1|actor
EW-3 Midwife Droid|67|5730|1|Medium|0|actor
IM-6 Medical Droid|67|5778|1|Small|1|actor
SP-4 Analysis Droid|68|5862|1|Small|1|actor
LE Series Repair Droid|69|5955|2|Medium|1|actor
P2 Series Astromech Droid|69|6013|2|Medium|0|actor
Serv-O-Droid Pit Droid|70|6083|2|Small|0|actor
5YQ Protocol Droid|70|6157|3|Medium|0|actor
BCA-11/X Training Droid|71|6214|4|Medium|2|actor
IG-86 Sentinel Droid|71|6241|4|Medium|1|actor
CLL-6 Binary Load Lifter|72|6390|5|Large|1|actor
FA-5 Valet Droid|72|6434|5|Medium|0|actor
IW-37 Pincer Loader Droid|73|6483|5|Large|1|actor
B1-Series Battle Droid Squad|95|8396|4|Large|3|squad
FX-6 Medical Assistance Droid|160|15307|1|Medium|1|actor
FA-4 Pilot Droid|161|15367|2|Small|0|actor
Marksman-H Combat Remote|162|15508|4|Diminutive|0|actor
A-DSD Advanced Dwarf Spider Droid|188|18087|4|Huge|6|actor
A-Series Assassin Droid|189|18169|4|Medium|11|actor
B1-A Series Air Battle Droid|190|18260|4|Medium|4|actor
Battle Droid Assassin|190|18268|4|Medium|4|actor
Cold Assault Battle Droid|191|18397|4|Large|2|actor
C-B3 Cortosis Battle Droid|192|18479|4|Medium|5|actor
Droid Commando|192|18559|4|Medium|6|actor
IG Lancer Combat Droid|193|18628|4|Medium|2|actor
IG-110 Lightsaber Droid|193|18688|4|Medium|6|actor
JK-13 Security Droid|194|18778|4|Large|12|actor
LM-432 Assault Crab Droid|194|18869|4|Huge|6|actor
LR-57 Combat Droid|195|18948|4|Large|3|actor
Octuptarra Combat Tri-Droid|196|19035|4|Large|3|actor
OOM-Series Battle Droid|196|19104|4|Medium|2|actor
Spelunker Probe Droid|197|19175|4|Medium|6|actor
Ultra Droideka|198|19251|4|Huge|6|actor
Ground Armored Tank|198|19329||Huge|10|vehicle
IG-227 Hailfire-class Droid Tank|199|19395||Huge|12|vehicle
Manta Droid Subfighter|200|19475||Huge|9|vehicle
OG-9 Homing Spider Droid|201|19615||Huge|7|vehicle
Persuader-class Droid Enforcer|201|19662||Huge|14|vehicle
Tri-Droid|202|19825||Gargantuan|9|vehicle
Hyena-class Bomber|208|20483||Huge|7|starship'''
COLUMNS=[row.split('|') for row in ROWS.splitlines()]
assert len(COLUMNS)==40 and all(len(row)==7 for row in COLUMNS)
rawlines=SRC.read_text(errors='replace').splitlines()
root_keys='classification challenge geometry abilities progression defenses durability movement anatomy processor programming combat capacity systems equipment modifications pcConstruction vehicleLink economics text exceptions fieldStates rules'.split()
items=[]; evid=[]; registry=[]
for i,(name,pp,anchor,degree,size,cl,fmt) in enumerate(COLUMNS,1):
    pp=int(pp);anchor=int(anchor);pid=f'CLONE-DROID-{i:03d}'
    # TXT line ranges are only extraction neighborhoods: PDF may be two-column/interleaved.
    limit=int(COLUMNS[i][2])-1 if i<40 else min(len(rawlines), anchor+280)
    block=rawlines[anchor-1:limit]
    excerpt='\n'.join(block)
    kind='squad' if fmt=='squad' else ('vehicle-format-droid' if fmt in ('vehicle','starship') else 'model')
    groups={k:{} for k in root_keys}
    r={'schemaVersion':'swse.droid.universal-source/0.1-draft','recordType':'droid-publication-source-entry',
       'identity':{'sourceEntryKey':pid,'printedName':name},
       'publication':{'book':BOOK,'bookId':'CLONE','printedPageStart':pp,'printedPageEnd':pp,
            'pdfPageStart1Based':pp+1,'textLineAnchor1Based':anchor,'publicationKind':kind},**groups,
       'certification':{'identityStatus':'txt-indexed','mechanicalStatus':'partial','runtimeStatus':'not-tested',
          'reviewNotes':'Identity from upstream census. TXT/OCR field draft pending PDF visual confirmation, complete source and runtime reconciliation.',
          'reviewerEvidenceRefs':[f'CLONE-CENSUS:{pid}',f'{BOOK}:printed-p{pp}:TXT-line-{anchor}']}}
    r['challenge']['challengeLevel']=int(cl) # census identity only; not runtime challenge authority
    r['classification']['size']=size
    if degree:r['classification']['publishedDegree']=int(degree)
    if fmt=='actor':
        r['classification'].update({'statblockFormat':'droid-actor','sourceStatblockFormat':'droid-actor','ruleEntityNature':'standard-droid','primaryActorAuthority':'droid'})
    elif fmt=='squad':
        r['classification'].update({'statblockFormat':'squad','sourceStatblockFormat':'droid-squad','ruleEntityNature':'standard-droid','primaryActorAuthority':'squad-aggregation'})
        r['text']['sourceWarnings']=['Squad template/aggregation is not a stock droid individual, squad attack/HP/space are not an individual actor grant.']
    else:
        r['classification'].update({'statblockFormat':'vehicle','sourceStatblockFormat':('starship-scale-droid' if fmt=='starship' else 'vehicle-scale-droid'),
             'ruleEntityNature':'vehicle-format-droid','primaryActorAuthority':'vehicle'})
        r['text']['sourceWarnings']=['Vehicle/starship primary actor authority. Printed vehicle stats and weapon firing groups retained in evidence only; no duplicated droid actor mechanics.']
    r['rules']['mechanicalExecutionStatus']='source-only'
    r['exceptions']['notes']='Canonical feat/talent IDs, full stock systems, mounts, localized rules, and independent model hero eligibility remain pending certification.'
    # Exact page-format is not guaranteed by an OCR segment. At most carry high confidence raw observations.
    raw_eligibility=re.search(r'[^\n]{0,100}\b(?:can\s*[’\']?t|cannot|can)\s+be\s+played\s+as\s+droid\s+heroes\b[^\n]*',excerpt,re.I)
    # NEVER infer hero eligibility from the TXT segment; source columns interleave.
    # The candidate is only a search hint and must be assigned by PDF visual review.
    # Do not parse full mechanics on an interleaved or very short TXT segment.
    ambiguous=(i in {20,21} or len(block)<18)
    source_fields={}
    if fmt=='actor' and not ambiguous:
        # Only statblock lines with exact beginning labels. Retain raw expression and no inferred equipment.
        flat=[re.sub(r'\s+',' ',a).strip() for a in block]
        def one(label):return next((x for x in flat if re.match(r'^'+label+r'\b',x,re.I)),None)
        for label in ['Init','Languages','Defenses','hp','Speed','Melee','Ranged','Base Atk','Abilities','Talents','Feats','Skills','Systems','Possessions','Availability']:
            val=one(label)
            if val:source_fields[label]=val
        # Exact lexical ability scores only, no OCR normalization or guesswork.
        if (line:=one('Abilities')):
            for attr,abbr in [('str','Str'),('dex','Dex'),('con','Con'),('int','Int'),('wis','Wis'),('cha','Cha')]:
                m=re.search(r'\b'+abbr+r'\s*([+\-]?\d+|[=—–-])(?=\s|,|$)',line,re.I)
                if m:
                    token=m.group(1)
                    if attr=='con' and token in '=—–-':
                        r['abilities']['con']=None
                        r['fieldStates']['/abilities/con']='explicitly-none'
                    elif re.fullmatch(r'[+-]?\d+',token):r['abilities'][attr]=int(token)
        if (line:=one('Defenses')):
            for key,pat in [('reflex',r'\bRef\s*(\d+)'),('flatFootedReflex',r'flat-footed\s*(\d+)'),('fortitude',r'\bFort\s*(\d+)'),('will',r'\bWill\s*(\d+)')]:
                m=re.search(pat,line,re.I)
                if m and int(m.group(1))<=80:r['defenses'][key]=int(m.group(1))
        if (line:=one('hp')):
            m=re.match(r'^hp\s*(\d+)',line,re.I)
            if m:r['durability']['hitPoints']=int(m.group(1))
            m=re.search(r'\bThreshold\s*(\d+)',line,re.I)
            if m:r['durability']['damageThreshold']=int(m.group(1))
        if (line:=one('Speed')):r['movement']['speedLineRaw']=line
        if (line:=one('Base Atk')):
            m=re.search(r'^Base Atk\s*([+-]?\d+)',line,re.I)
            if m:r['combat']['baseAttackBonusPrinted']=int(m.group(1))
        if (line:=one('Systems')):r['systems']['sourceSystemsRaw']=re.sub(r'^Systems\s*','',line,flags=re.I)
        if (line:=one('Availability')):
            m=re.search(r'\bCost\s*([\d,]+)\s*(?:credits)?\b',line,re.I)
            if m:r['economics']['newCredits']=int(m.group(1).replace(',',''))
            m=re.search(r'^Availability\s+(Licensed|Restricted|Military|Illegal)',line,re.I)
            if m:r['economics']['availability']=m.group(1)
        # Printed attack lines are source-only, and *not* weapon grants or physical mounts.
        attacks=[]
        for line in flat:
            if re.match(r'^(Melee|Ranged)\b',line,re.I):
                attacks.append({'attackId':f'printed-attack-{len(attacks)+1:02d}','raw':line,'operationStatus':'source-only'})
        if attacks:r['combat']['attackGroups']=attacks
    if ambiguous:r['exceptions']['transcriptionWarnings']=['SOURCE_INTERLEAVE_OR_SHORT_OCR_SEGMENT: skip mechanical extraction; inspect rendered PDF.']
    evid.append({'sourceEntryKey':pid,'printedName':name,'printedPage':pp,'pdfPage1Based':pp+1,'textAnchor1Based':anchor,
        'textWindowRange1Based':[anchor,limit], 'textWindowSha256':hashlib.sha256(excerpt.encode()).hexdigest(),
        'ocrTextExcerpt':excerpt,'ocrSelectedFields':source_fields,'txtEligibilityStatementUnassignedCandidate':raw_eligibility.group(0).strip() if raw_eligibility else None,
        'sourceFormat':fmt,'warnings':(['OCR two-column or short text window: manual separation required'] if ambiguous else []),
        'pdfVisualFieldChecks':{},'sourceReviewStatus':'TXT_PROVISIONAL'})
    registry.append({'sourceEntryKey':pid,'name':name,'printedPage':pp,'textAnchor1Based':anchor,'format':fmt,'challengeLevelCensus':int(cl)})
    items.append(r)
assert len(items)==40 and len({r['identity']['sourceEntryKey'] for r in items})==40
assert sum(x['sourceFormat']=='actor' for x in evid)==32
assert sum(x['sourceFormat']=='squad' for x in evid)==1
assert sum(x['sourceFormat'] in ('vehicle','starship') for x in evid)==7
out={'schema':'swse.droid.source-book-hydration-ledger/0.1-partial','bookId':'CLONE','book':BOOK,
 'draftSourceEntrySchema':'swse.droid.universal-source/0.1-draft','sourceBookPdf':PDF.name,
 'scope':'Source-census identity seeded for 40 claims; OCR-derived selected fields remain unverified, visual PDF field review in progress.',
 'expectedPublicationClaims':40,'sourceEntries':items}
base=ROOT/'data/canonical/droids/source-books/clone.json'
evpath=ROOT/'data/audits/droids/clone-field-evidence.json'
reg=ROOT/'data/audits/droids/clone-census-identity.json'
for path,payload in [(base,out),(evpath,{'schema':'swse.droid.clone.source-text-evidence/0.1','book':BOOK,
 'sourceTxt':SRC.name,'sourceTxtSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'sourcePdf':PDF.name,
 'sourcePdfSha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'records':evid}),
 (reg,{'schema':'swse.droid.clone.census-parity/0.1','source':'data/audits/droids/droid-publication-census.json',
 'note':'Rows transcribed from read-only GitHub census branch. Independently not modified.','claims':registry})]:
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():raise SystemExit('REFUSE overwrite current working data: '+str(path))
    path.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+'\n')
print('Seeded',len(items),'Clone Wars identities; actor=32 squad=1 vehicle/starship=7; PDF/TXT SHA captured.')
print('Raw OCR source-only; no runtime grants, no certification, no GitHub writes.')
