#!/usr/bin/env python3
"""Local-only SGD working hydration from printed OCR PDF pages. Never certify from OCR."""
from __future__ import annotations
import fitz, json, re, pathlib, os
ROOT=pathlib.Path(__file__).resolve().parents[1]
PDF=pathlib.Path(os.environ.get("SWSE_SGD_PDF", "/mnt/data/SW Saga - Scavenger's Guide to Droids (optimized).pdf"))
TXT=pathlib.Path(os.environ.get("SWSE_SGD_TXT", "/mnt/data/Scavenger's Guide to Droids_djvu.txt"))
BOOK="Scavenger's Guide to Droids"
NAMES=[
"8D Smelter Droid","A9G-Series Archive Droid","AD-Series Weapons Maintenance Droid","Annihilator Droid",
"BLX Labor Droid","Colicoid Infiltrator-Series Droid","CZ-Series Secretary Droid","DP-2 Probe Droid",
"Droideka Mark II",'DT-16 "Destructor" Battle Droid',"Duelist Elite Training Droid","E522 Assassin Droid",
"EI-9 Network Security Droid","EV-Series Supervisor Droid","FLTCH-Series Battle Droid","G2 Repair Droid",
"GD16-Series Pilot Droid","GX1-Series Battle Droid","GY-I Information Analysis Droid","H-1ME Battle Mechanic Droid",
"HK-77 Assassin Droid","HKB-3 Hunter-Killer Droid","KM1 Mining Droid","M38 Explorer Droid",
"MEV-Series Medical Evacuation Droid","MK-Series Maintenance Droid","Model 88-Series Administration Droid",
"PG-5 Gunnery Droid","PLNK-Series Power Droid","RO-D-Series Droid","R8-Series Astromech Droid",
"RWW-Series Protocol Droid","RX-Series Pilot Droid","S19 Astromech Droid","SD-9-Series Battle Droid",
"SD-X-Series Stealth Battle Droid","LEP-Series Service Droid","Shadow Droid","Colicoid T4 Turret Droid",
"TC-SC Infiltration Droid","TT-8L Gatekeeper Droid","V2-Series Commando Droid","V6-Series Pilot Droid",
"X-1 Viper Droid","XLT-014 Labor Droid","YVH-Series Battle Droid"]
assert len(NAMES)==46
VISUAL={1,7,8,9,10,11,12}  # rendered PDF pages visually checked; *not* individual mechanical certification
HEADINGS=('Init','Languages','Defenses','hp ','Immune','Speed','Melee','Ranged','Fighting Space','Base Atk',
          'Atk Options','Special Actions','Abilities','Special Qualities','Talents','Feats','Skills','Systems',
          'Possessions','Availability','Crew','Cargo','Payload','Force ','CL ','DR ','Senses')
LABELS=('Init','Languages','Defenses','hp','Immune','Speed','Melee','Ranged','Fighting Space','Base Atk',
          'Atk Options','Special Actions','Abilities','Special Qualities','Talents','Feats','Skills','Systems',
          'Possessions','Availability','Crew','Cargo','Payload','Force')
# The conversion has OCR errors: never silently convert ambiguous letters to digits.
def number(s):
    s=s.strip().replace(' ','')
    return int(s) if re.fullmatch(r'[+-]?\d+',s) else None

def flatten_lines(t):
    return [re.sub(r'\s+',' ',s).strip() for s in t.splitlines() if s.strip()]

def join_field(lines,label):
    start=next((i for i,s in enumerate(lines) if re.match(r'^'+re.escape(label)+r'\b',s,re.I)),None)
    if start is None:return None
    st=lines[start]
    seq=[st]
    for line in lines[start+1:start+10]:
        if any(re.match(r'^'+re.escape(h)+r'\b',line,re.I) for h in HEADINGS):break
        if len(line)>190:break
        seq.append(line)
    return ' '.join(seq)

def extract_statblock(lines):
    # From first printed stat line to Availability; fallback whole page before narrative.
    start=next((i for i,s in enumerate(lines) if re.match(r'^(?:Fine|Diminutive|Tiny|Smal\s*l|Small|Medium|Large|Huge|Gargantuan|Colossal) (?:droid|starfighter|ground vehicle)',s,re.I)),None)
    if start is None:return lines[:65]
    end=next((i for i in range(start,len(lines)) if re.match(r'^Availability\b',lines[i],re.I)),len(lines)-1)
    return lines[start:end+1]

def top_level_comma_split(s):
    result=[];level=0;start=0
    for i,c in enumerate(s):
        if c=='(': level+=1
        if c==')': level=max(0,level-1)
        if c==',' and level==0:
            result.append(s[start:i].strip());start=i+1
    result.append(s[start:].strip())
    return [x for x in result if x]

def make_record(i,pdf):
    pid=f'SGD-DROID-{i:03d}';name=NAMES[i-1];page=66+2*i; pnum=page+1
    t=pdf[pnum-1].get_text()   # printed page 68 = 1-based PDF page 69
    lines=flatten_lines(t)
    block=extract_statblock(lines)
    evidence={"sourceEntryKey":pid,"printedPage":page,"pdfPage1Based":pnum,"sourceMethod":"PDF_OCR_TEXT_FIRST_PASS_NOT_NUMERIC_CERTIFICATION", "statblockText":"\n".join(block),"fieldTranscriptions":{},"warnings":[],"pdfVisualLayoutChecked":i in VISUAL}
    typeLine=next((l for l in block if re.match(r'^(Fine|Diminutive|Tiny|Smal\s*l|Small|Medium|Large|Huge|Gargantuan|Colossal)\b',l,re.I)),None)
    info={"sourceEntryKey":pid,"printedName":name,"sourcePresentationIds":[f'{pid}-PROTOCOL']}
    pub={"book":BOOK,"bookId":"SGD","printedPageStart":page,"printedPageEnd":page+1,"pdfPageStart1Based":pnum,
         "publicationKind":"vehicle-format-droid" if i==8 else "model", "sourceViews":[{"viewId":f'{pid}-PROTOCOL',"format":"protocol","source":{"book":BOOK,"page":page,"pdfPage1Based":pnum,"sourceEntryKey":pid}}]}
    groups={k:{} for k in ['classification','challenge','geometry','abilities','progression','defenses','durability','movement',
                         'anatomy','processor','programming','combat','capacity','systems','equipment','modifications','pcConstruction','vehicleLink',
                         'economics','text','exceptions','fieldStates','rules']}
    r={"schemaVersion":"swse.droid.universal-source/0.1-draft","recordType":"droid-publication-source-entry", "identity":info,"publication":pub,**groups,
       "certification":{"identityStatus":"pdf-reviewed" if i in VISUAL else "txt-indexed","mechanicalStatus":"partial","runtimeStatus":"not-tested",
                        "reviewNotes":"PDF-OCR transcription is provisional; per-field visual verification and source-rules reconciliation outstanding.",
                        "reviewerEvidenceRefs":[f'{BOOK}:printed-p{page}:PDF-page-{pnum}',f'SGD-CENSUS:{pid}']}}
    r['rules']['mechanicalExecutionStatus']='source-only'
    is_vehicle=(i==8)
    r['classification'].update({"statblockFormat":"vehicle" if is_vehicle else "droid-actor", "sourceStatblockFormat":"vehicle-scale-droid" if is_vehicle else "droid-actor", "ruleEntityNature":"vehicle-format-droid" if is_vehicle else "standard-droid", "primaryActorAuthority":"vehicle" if is_vehicle else "droid"})
    if typeLine:
        pub['printedTypeLine']=typeLine
        evidence['fieldTranscriptions']['/publication/printedTypeLine']=typeLine
        sz=re.match(r'^(Fine|Diminutive|Tiny|Smal\s*l|Small|Medium|Large|Huge|Gargantuan|Colossal)\b',typeLine,re.I)
        if sz:r['classification']['size']=sz.group(1).replace(' ','').capitalize()
        degree=re.search(r'\((\d)\s*(?:st|nd|rd|th)\s*-\s*deg\s*ree\)',typeLine,re.I)
        if degree:r['classification']['publishedDegree']=int(degree.group(1))
        else:evidence['warnings'].append('No printed degree in primary heading; do not infer from protocol view.')
        if not is_vehicle:
            m=re.search(r'(?:non\s*heroic|scoundrel|soldier|scout|noble|jedi)\b.+$',typeLine,re.I)
            if m:r['progression']['classLineRaw']=m.group(0)
    else:evidence['warnings'].append('No parseable type line')
    # The lines containing challenge labels are frequently out of order in this OCR.
    cls=[n for n in lines if re.fullmatch(r'CL\s*\d{1,2}',n,re.I)]
    if cls:r['challenge']['challengeLevel']=int(re.findall(r'\d+',cls[0])[0]);evidence['fieldTranscriptions']['/challenge/challengeLevel']=cls[0]
    else:evidence['warnings'].append('CL missing or OCR ambiguity')
    # Retain source text verbatim in side evidence for all major fields. Commit values only on clean lexical read.
    fieldmap={label:join_field([x.replace('Abiliti es','Abilities') for x in block],label) for label in LABELS}
    evidence['fieldTranscriptions'].update({f'/raw/{label}':v for label,v in fieldmap.items() if v})
    # If PDF OCR is incorrect or uncertain, preserve the raw text without inventing values.
    if fieldmap['Abilities']:
        ab=fieldmap['Abilities']
        for field,token in [('str','Str'),('dex','Dex'),('con','Con'),('int','Int'),('wis','Wis'),('cha','Cha')]:
            match=re.search(r'\b'+token+r'\s*([^,\s;]+)',ab,re.I)
            if match:
                raw=match.group(1)
                if field=='con' and raw in ('-','—','–'):
                    r['abilities']['con']=None;r['fieldStates']['/abilities/con']='explicitly-none'
                elif number(raw) is not None:r['abilities'][field]=number(raw)
                else:evidence['warnings'].append(f'Uncertain OCR ability {field}={raw}; not stored mechanically')
    else:evidence['warnings'].append('Abilities line missing from PDF OCR')
    d=fieldmap['Defenses']
    if d:
        for key,pat in [('reflex',r'\bRef\s*([+-]?\s*\d+)'),('flatFootedReflex',r'flat-footed\s*([+-]?\s*\d+)'),('fortitude',r'\bFort\s*([+-]?\s*\d+)'),('will',r'\bWill\s*([+-]?\s*\d+)')]:
            m=re.search(pat,d,re.I)
            if m and number(m.group(1)) is not None:r['defenses'][key]=number(m.group(1))
    hp=fieldmap['hp']
    if hp:
        for key,pat,grp in [('hitPoints',r'^hp\s*([+-]?\s*\d+)',r['durability']),('damageThreshold',r'\bThreshold\s*([+-]?\s*\d+)',r['durability']),('damageReduction',r'\bDR\s*([+-]?\s*\d+)',r['defenses']),('shieldRating',r'\bSR\s*([+-]?\s*\d+)',r['defenses'])]:
            m=re.search(pat,hp,re.I)
            if m and number(m.group(1)) is not None:grp[key]=number(m.group(1))
    if (s:=fieldmap['Speed']):
        r['movement']['speedLineRaw']=s
        # Movement is still raw; no inferred mode transition/mount actions.
    if (s:=fieldmap['Systems']):
        r['systems']['sourceSystemsRaw']=re.sub(r'^Systems\s*','',s,flags=re.I)
    if (s:=fieldmap['Availability']):
        m=re.search(r'Availability\s+([A-Za-z]+)\s*;\s*Cost\s*([\d, ]+)\s*credi\s*ts',s,re.I)
        if m:
            r['economics']['availability']=m.group(1).capitalize()
            r['economics']['newCredits']=int(m.group(2).replace(',','').replace(' ',''))
        else:evidence['warnings'].append(f'Cost/availability OCR requires inspection: {s[:80]}')
    if (s:=fieldmap['Base Atk']):
        for key,pat in [('baseAttackBonusPrinted',r'Base Atk\s*([+\-]?\s*\d+)'),('grapplePrinted',r'\bGrp\s*([+\-]?\s*\d+)')]:
            m=re.search(pat,s,re.I)
            if m and number(m.group(1)) is not None:r['combat'][key]=number(m.group(1))
    if (s:=fieldmap['Force']):
        m=re.search(r'Force\s+(\d+)',s)
        if m:r['progression']['forcePoints']=int(m.group(1))
    if (s:=fieldmap['Fighting Space']):
        m=re.search(r'Fighting Space\s+([\dxX]+)',s)
        if m:r['geometry']['fightingSpace']=m.group(1)
        m=re.search(r'Reach\s+(\d+)\s+square',s)
        if m:r['geometry']['reachSquares']=int(m.group(1))
    # Printed attack rows, NOT installed weapon authority or executable attacks.
    attacklines=[]
    for line in block:
        if re.match(r'^(Melee|Ranged)\b',line,re.I):attacklines.append(line)
    if attacklines and not is_vehicle:
        attacks=[]
        for j,line in enumerate(attacklines):
            attack={'attackId':f'printed-attack-{j+1:02d}','raw':line,'operationStatus':'source-only'}
            matches=re.findall(r'(?<!\w)([+-]\s*\d+)(?:\s*/\s*[+-]\s*\d+)?',line)
            # Total bonus only if a single attack is syntactically unambiguous.
            if not re.search(r'[+-]\s*\d+\s*/\s*[+-]\s*\d+',line) and matches:
                val=number(matches[0]);
                if val is not None:attack['attackBonus']=val
            attacks.append(attack)
        r['combat']['attackGroups']=attacks
    elif is_vehicle:
        r['text']['sourceWarnings']=['Vehicle-format source: all vehicle-owned numeric mechanics and firing groups require canonical Vehicle-source link; not copied as droid-authoritative stats.']
        r['exceptions']['notes']='DP-2 vehicleSourceEntryKey not certified; vehicle defenses, movement, attack groups, crew, cargo and damage remain vehicle-owned.'
    # Selective source-verified transcription corrections: backed by rendered pages / original txt, not blanket OCR rewriting.
    if i==1:
        r['abilities'].update({'str':18,'dex':10,'int':8,'cha':8})
        r['defenses']['conditionalDefenseRules']=[{'ruleId':'SGD-8D-HEAT-RESISTANT',
            'statement':'When exposed to fire/extreme heat, half damage if attack succeeds, none if attack fails; no condition track movement.',
            'scope':'8D Smelter Droid','source':{'book':BOOK,'page':68,'pdfPage1Based':69,'verifiedBy':'pdf-visual','sourceEntryKey':pid},
            'executionStatus':'source-only'}]
        r['defenses']['armorNote']='Duravlex shell (+4 armor)'
        evidence['warnings']=[w for w in evidence['warnings'] if not w.startswith('Uncertain OCR ability')]
        evidence['fieldTranscriptions']['/abilities/str']='18 [visually verified]'
        evidence['fieldTranscriptions']['/abilities/dex']='10 [visually verified]'
        evidence['fieldTranscriptions']['/abilities/int']='8 [visually verified]'
        evidence['fieldTranscriptions']['/abilities/cha']='8 [visually verified]'
    if i==8:
        r['classification']['contextualDegreeHeading']=2
        evidence['fieldTranscriptions']['/classification/contextualDegreeHeading']='Large droid (2nd-degree) - protocol view, printed p82'
        # Vehicle-owned data must live ONLY in Vehicle source authority; keep source evidence here, not duplicate stats.
        r['defenses']={};r['durability']={};r['movement']={};r['combat']={};r['geometry']={}
        r['vehicleLink']={} # no fabricated vehicle source key
        r['text']['sourceWarnings']=['Vehicle-owned HP, defenses, speeds, cargo and attack groups remain sidecar evidence; no duplicate Vehicle Actor or executable weapon rights.']
    if i==9:
        r['movement']['speedLineRaw']='Speed 2 squares (walking), 10 squares (wheeled)'
        r['movement']['locomotionSystems']=[
            {'instanceId':'sgd-009-walking','mode':'walking','speedSquares':2},
            {'instanceId':'sgd-009-wheeled','mode':'wheeled','speedSquares':10,'restricted':'exclusive',
             'requiresAction':'Two swift actions in one turn per printed protocol Move action'}]
        r['defenses']['armorNote']='bronzium shell (+5 armor; treat as quadanium plating)'
        r['text']['mechanicsNotes']='Two laser cannons and two ion cannons printed as possessions; weapon mount/location reconciliation and executable attacks not certified.'
    if i==12 and 'will' not in r['defenses']:
        r['defenses']['will']=17
        evidence['fieldTranscriptions']['/defenses/will']='Wi ll 17 (PDF OCR split verified against source TXT)'
    if i==25:
        r['rules']['conditionalMechanics']=[{'ruleId':'SGD-MEV-FOLDING-BED',
            'statement':'Deploy folding bed as move action; deployed bed required to carry passenger; while deployed fighting space is 1 by 2 squares.',
            'scope':'MEV-Series Medical Evacuation Droid only; bed deployed',
            'source':{'book':BOOK,'page':116,'pdfPage1Based':117,'sourceEntryKey':pid},'executionStatus':'source-only'}]
        r['geometry']['fightingSpace']='1x2 (only when folding bed deployed)'
        r['text']['mechanicsNotes']='Deployment changes fighting space; default fighting space not inferred from condition-specific size.'
    if i==28:
        r['rules']['conditionalMechanics']=[{'ruleId':'SGD-PG5-BATTERY-FIRE',
            'statement':'Controls all vehicle weapons in one battery as if controlling one; -1 attack roll penalty per weapon in battery.',
            'scope':'PG-5 as gunner controlling a single vehicle weapon battery',
            'source':{'book':BOOK,'page':122,'pdfPage1Based':123,'sourceEntryKey':pid},'executionStatus':'source-only'}]
    if i==29:
        r['rules']['conditionalMechanics']=[{'ruleId':'SGD-PLNK-POWER-CHARGE',
            'statement':'DC 15 Mechanics check recharges depleted blaster power pack one shot per round; recharge shields restores 7 SR up to normal maximum.',
            'scope':'PLNK-Series Power Droid only',
            'source':{'book':BOOK,'page':124,'pdfPage1Based':125,'sourceEntryKey':pid},'executionStatus':'source-only'}]
    if i==38:
        r['movement']['locomotionSystems']=[
            {'instanceId':'sgd-038-ground','mode':'ground','speedSquares':6},
            {'instanceId':'sgd-038-flight','mode':'flying','speedSquares':16,'starshipSpeedSquares':4}]
        r['text']['mechanicsNotes']='Printed as droid-actor despite having starship-scale flight and weapons; preserve source format while auditing vehicle authority boundaries.'
    if i==41:
        r['movement']['locomotionSystems']=[{'instanceId':'sgd-041-stationary','mode':'stationary','speedSquares':0,'raw':'Speed 0 squares'}]
    if i==40 and not r['challenge']:
        # CLl in PDF OCR. The printed entry reads CL 1; preserve its unusual OCR as raw evidence.
        r['challenge']['challengeLevel']=1
        evidence['warnings']=[w for w in evidence['warnings'] if w!='CL missing or OCR ambiguity']
        evidence['fieldTranscriptions']['/challenge/challengeLevel']='CLl OCR -> CL 1 (source layout checked)'
    # A published statement is about the *model*; never grant arbitrary custom PC construction permissions.
    pgs=pdf[pnum-1].get_text()+'\n'+pdf[pnum].get_text()
    eligibility=re.findall(r'[^.\n]{0,75}\b(?:can\s*(?:not|[\'’]\s*t)|ca\s*n[\'’]\s*t|can)\s+be\s+played\s+as\s+droid\s+heroes',pgs,re.I)
    if len(eligibility)==1:
        claim=eligibility[0].strip()
        prohibited=bool(re.search(r'(?:cannot|can\s+not|can\s*[\'’]\s*t|ca\s*n[\'’]\s*t)',claim,re.I))
        r['pcConstruction']['heroEligibility']='prohibited' if prohibited else 'allowed'
        evidence['fieldTranscriptions']['/pcConstruction/heroEligibility']=claim
    else:
        evidence['warnings'].append(f'Hero eligibility cannot be uniquely confirmed from OCR: {len(eligibility)} clauses')

    # Exact raw feat/talent/skill statements retained in side evidence; don't split arbitrarily inside scoped parentheses.
    # Print-form feats/talents are source-local labels only. The scoped canonical feat/talent registry
    # must separately validate identity, expanded choices, prerequisites and runtime grants.
    for heading, key in [('Feats','feats'),('Talents','talents')]:
        if fieldmap.get(heading):
            body=re.sub(r'^'+heading+r'\s*','',fieldmap[heading],flags=re.I).strip()
            parts=top_level_comma_split(body)
            if parts and all(len(x)>1 for x in parts):
                r['progression'][key]=[{'traitId':f'{pid}-{key}-{j:02}', 'name':phrase, 
                    'source':{'book':BOOK,'page':page,'pdfPage1Based':pnum,'sourceEntryKey':pid}}
                    for j,phrase in enumerate(parts,1)]
    if fieldmap.get('Skills'):
        body=re.sub(r'^Skills\s*','',fieldmap['Skills'],flags=re.I).strip()
        parsed=[]
        for phrase in top_level_comma_split(body):
            m=re.match(r'^(.*?)\s*([+-]\s*\d+)(?:\b|$)',phrase)
            if m:
                value=number(m.group(2))
                if value is not None:parsed.append({'name':m.group(1).strip(),'printedTotal':value,'raw':phrase,
                    'source':{'book':BOOK,'page':page,'pdfPage1Based':pnum,'sourceEntryKey':pid}})
            else:
                evidence['warnings'].append('Unparsed printed skill OCR '+phrase[:45])
        if parsed:r['abilities']['skills']=parsed
    if fieldmap.get('Init'):
        m=re.search(r'\bInit\s*([+-]\s*\d+)',fieldmap['Init'],re.I)
        if m:r['abilities']['initiativePrinted']=number(m.group(1))
        m=re.search(r'\bPerception\s*([+-]\s*\d+)',fieldmap['Init'],re.I)
        if m:r['abilities']['perceptionPrinted']=number(m.group(1))
    if i==1:
        # OCR renders the digit 8 as S in this field; both primary searchable TXT and rendered PDF show +8.
        r['abilities'].setdefault('skills',[]).insert(0,{'name':'Endurance','printedTotal':8,'raw':'Endurance +8',
            'source':{'book':BOOK,'page':68,'pdfPage1Based':69,'verifiedBy':'pdf-visual','sourceEntryKey':pid}})
        evidence['warnings']=[w for w in evidence['warnings'] if w!='Unparsed printed skill OCR Endurance +S']
    if (s:=fieldmap['Languages']):r['text']['mechanicsNotes']='Source language line preserved in sidecar evidence; speaking vs understanding remains unverified.'


    if i in (1,9):
        r['text']['mechanicsNotes']=(r['text'].get('mechanicsNotes','')+' Sample from visually rendered statblock; full field/mechanical certification not yet granted.').strip()
    return r,evidence

def main():
    p=fitz.open(PDF)
    entries=[];evidence=[]
    for i in range(1,47):
        r,e=make_record(i,p);entries.append(r);evidence.append(e)
    # Correct neither data nor source by extrapolation; record all OCR ambiguities for reconciliation.
    led={"schema":"swse.droid.source-book-hydration-ledger/0.1-partial","bookId":"SGD","book":BOOK,
         "draftSourceEntrySchema":"swse.droid.universal-source/0.1-draft","sourceBookPdf":"SW Saga - Scavenger's Guide to Droids (optimized).pdf",
         "scope":"46/46 SGD publication identities with provisional OCR-to-field hydration. Not field-by-field PDF visually certified.",
         "expectedPublicationClaims":46,"sourceEntries":entries}
    dest=ROOT/'data/canonical/droids/source-books/sgd.json'
    if dest.exists() and os.environ.get('SWSE_SGD_REBUILD')!='1':
        raise SystemExit('REFUSING to replace existing rolling ledger; set SWSE_SGD_REBUILD=1 only after manually reconciling retained edits.')
    dest.write_text(json.dumps(led,indent=2,ensure_ascii=False)+'\n')
    ev=ROOT/'data/audits/droids/sgd-field-evidence.json';ev.write_text(json.dumps({"bookId":"SGD","method":"pdf-ocr-text-preliminary", "records":evidence},indent=2,ensure_ascii=False)+'\n')
    print('records',len(entries),'visual',sum(e['pdfVisualLayoutChecked'] for e in evidence), 'warnings',sum(len(e['warnings']) for e in evidence))
    for f in ['challenge','abilities','defenses','durability','movement','systems','economics','combat']:
        print(f,sum(bool(r[f]) for r in entries),'of 46')
    print('OCR / field anomalies:')
    for e in evidence:
        if e['warnings']:print(e['sourceEntryKey'],':','; '.join(e['warnings']))
if __name__=='__main__':main()
