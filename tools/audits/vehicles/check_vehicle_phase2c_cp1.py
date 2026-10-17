#!/usr/bin/env python3
"""Phase 2C CP1 discovery-only gate: identity evidence + source semantics.

Scope: verifies *evidence bookkeeping*, not full vehicle mechanical certification.
Do not use this as authorization to migrate production compendium records.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from collections import Counter
import zipfile

BASE = Path(__file__).resolve().parents[3]
ID_FILE='data/audits/vehicles/swse-phase2c-cp1-identity-candidates.json'
CONTRACT_FILE='data/audits/vehicles/swse-phase2c-cp1-evidence-semantics-pressure.json'
PHASE1_BLOB='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
PDF_HASHES={'Unknown Regions':'43a69aa7974ed4aeb52b57ba28b3466c2ed9f54bd73fe5d5295b744bfe1bd55b','Scum and Villainy':'74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399'}
STATES={'PRINTED_VALUE','EXPLICIT_NONE','SOURCE_SILENT_CONFIRMED','PUBLISHED_CONFLICT','NOT_REVIEWED','CONFIGURATION_CONDITIONAL'}

def require(pred,msg):
    if not pred: raise AssertionError(msg)

def load_data(root):
    return json.loads((root/ID_FILE).read_text(encoding='utf-8')),json.loads((root/CONTRACT_FILE).read_text(encoding='utf-8'))

def check_identity(data):
    require(data['mode']=='SOURCE_EVIDENCE_ONLY_NO_PRODUCTION_MUTATION','identity file must remain discovery-only')
    b=data['baseline']
    require(b['phase1ProvenanceBlobSha']==PHASE1_BLOB and b['immutablePublicationClaims']==316,'immutable Phase1 identity scope changed')
    require(b['newPublicationClaimsAdded']==0 and b['correctedPublicationCensusApproved'] is False,'unauthorized census amendment')
    candidates=data['candidates']
    require(data['candidateCount']==len(candidates)==2,'expect exactly two missing statblock candidates')
    require(data['proposedFutureEnumeratedTotalIfBothIndependentlyApproved']==318 and data['futureTotalIsNotApprovedCurrentCensus'] is True,'unapproved total must stay hypothetical')
    require({x['candidateId'] for x in candidates}=={'P2C-ID-001','P2C-ID-002'},'candidate ID mismatch')
    require({x['sourceBook'] for x in candidates}==set(PDF_HASHES),'sourcebook coverage mismatch')
    for c in candidates:
        require(c['phase1SourceEntryKey'] is None,'cannot mint provisional sourceEntryKey')
        require(c['status']=='PENDING_FORMAL_PHASE1_CENSUS_AMENDMENT','candidate must remain pending')
        require(c['phase1Disposition']=='NOT_CHANGED','frozen Phase1 must remain unchanged')
        require(c['printedStatblockExists'] is True,'requires independent printed statblock')
        require(c['sourceReviewState']=='PDF_STATBLOCK_VISUALLY_VERIFIED','missing primary PDF confirmation')
        require(c['certificationState']=='NOT_STRICTLY_CERTIFIED','candidate prematurely certified')
        require(c['pdfPhysicalPage']==c['printedPage']+1,'page offset mismatch')
        require(c['pdfSha256']==PDF_HASHES[c['sourceBook']],'original PDF SHA mismatch')
        require(c['printedCL']>0 and c['sourceFacts']['hitPoints']>0,'missing published core printed field')
        require(c['sourceFacts']['reflex']>0 and c['sourceFacts']['damageThreshold']>0,'incomplete published defense evidence')
    deep=next(x for x in candidates if x['candidateId']=='P2C-ID-001')
    hornet=next(x for x in candidates if x['candidateId']=='P2C-ID-002')
    require((deep['printedPage'],deep['printedCL'],deep['sourceFacts']['physicallyStatedCannons'],deep['sourceFacts']['attackGroups'])==(51,5,2,1),'Deep-X statblock or hardware distinction drift')
    require(deep['sourceFacts']['requiredGunnersForBothCannons']==2,'Deep-X gunner condition drift')
    require((hornet['printedPage'],hornet['printedCL'])==(125,12),'Hornet source locator drift')
    conf=hornet['sourceFacts']['configurations']
    require(len(conf)==2 and {x['configurationId'] for x in conf}=={'printed-default','printed-alternate'},'Hornet must have two configurations on one source identity')
    require(conf[0]['malfunction']['naturalAttackRoll']==1 and conf[1]['malfunction'] is None,'Hornet natural-one malfunction scoped to default configuration')
    return True

def check_contract(data):
    require(data['status']=='DRAFT_DISCOVERY_ONLY_NOT_SCHEMA_FREEZE','Phase2C schema may not be frozen')
    require(data['baseline']['phase0bVehicleSchemaId']=='swse.vehicle.phase0b.draft-0.5','wrong historical schema authority')
    require(data['phase0bSchemaFrozen'] is False and data['strictCertificatesAwardedByThisFile']==0,'no certification or schema freeze allowed')
    states=data['canonicalStates']
    require({x['state'] for x in states}==STATES,'missing or unrecognized evidence state')
    byname={x['state']:x for x in states}
    require(byname['EXPLICIT_NONE']['canonicalNullAllowed'] is True,'explicit absence must be representable')
    for state in STATES-{'EXPLICIT_NONE'}:
        require(byname[state]['canonicalNullAllowed'] is False,f'{state} cannot map to canonical null')
    require('not-stated' in byname['SOURCE_SILENT_CONFIRMED']['phase0bFieldStatesTranslation'],'source silence must map to not-stated')
    require('unclear-source' in byname['PUBLISHED_CONFLICT']['phase0bFieldStatesTranslation'],'source conflicts must remain unresolved')
    fixtures=data['pressureFixtures']
    require(len(fixtures)==data['fixtureCount']==16,'expected sixteen pressure cases')
    require(len({x['caseId'] for x in fixtures})==16,'duplicate case IDs')
    for f in fixtures:
        require(f['evidenceState'] in STATES,'invalid evidence state')
        require(f['pointer'].startswith('/'),'invalid JSON pointer')
        require(f['printedPage']>0 and bool(f['observation']),'page/evidence missing')
        require(f['valueDisposition'].strip(),'required future authority disposition')
        if f['evidenceState']=='PUBLISHED_CONFLICT':
            require('readings' in f or f['caseId']=='P2C-C13','numeric source conflict readings must be preserved')
            require('resolvedValue' not in f,'source conflict must not be silently corrected')
        if f['evidenceState']=='SOURCE_SILENT_CONFIRMED':
            require('canonicalNull' not in f and 'resolvedValue' not in f,'source-silent fields must not be materialized')
    byid={x['caseId']:x for x in fixtures}
    require(byid['P2C-C01']['physicalMountCount']==2 and byid['P2C-C01']['attackGroupCount']==1,'Deep-X group/mount mismatch')
    require(byid['P2C-C16']['physicalMountCount']==38 and byid['P2C-C16']['attackGroupCount']==8,'Royal Fortune hardware/battery distinction drift')
    require(byid['P2C-C04']['readings'][0]['value']!=byid['P2C-C04']['readings'][1]['value'],'source mismatch lost')
    return True

def check_phase2b_archive(path, identities):
    require(path.is_file(),'Phase 2B source-review archive missing')
    with zipfile.ZipFile(path) as z:
        names=z.namelist()
        require(len(names)==53 and len(set(names))==53,'expected untouched 53-file Phase2B audit package')
        require(z.testzip() is None,'archive CRC failure')
        pairs={
            'Unknown Regions':'data/audits/vehicles/swse-phase2b-unknown-regions-book-source-closure-ledger.json',
            'Scum and Villainy':'data/audits/vehicles/swse-phase2b-scum-and-villainy-book-source-closure-ledger.json'
        }
        for book,p in pairs.items():
            require(p in names,f'missing book closeout {book}')
            data=json.loads(z.read(p))
            count=12 if book=='Unknown Regions' else 11
            require(len(data['entries'])==count,f'{book}: Phase1 source review count drift')
            require(data['sourcePdfSha256']==PDF_HASHES[book],f'{book}: source PDF hash drift')
            require(data['phase1ProvenanceBlobSha']==PHASE1_BLOB,f'{book}: provenance authority drift')
            norm={x['printedName'].casefold() for x in data['entries']}
            candidate=next(x for x in identities['candidates'] if x['sourceBook']==book)
            require(candidate['printedName'].casefold() not in norm,f'{book}: candidate already in frozen Phase1 roster')
        final=json.loads(z.read('data/audits/vehicles/swse-phase2b-final17-book-counts.json'))
        require(final['finalSourceReviewedCount']==316,'historical fixed census count drift')

def check_pdf(path,expected):
    require(path.is_file(),f'PDF not found: {path}')
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):
            h.update(b)
    require(h.hexdigest()==expected,f'PDF hash mismatch: {path.name}')

def check_negative_controls(identity,contract):
    # Intentionally corrupt representative records: validator must reject them.
    x=copy.deepcopy(identity);x['candidates'][0]['phase1SourceEntryKey']='ur-premature-key'
    try:check_identity(x)
    except AssertionError:pass
    else:raise AssertionError('negative control: provisional Phase1 key accepted')
    x=copy.deepcopy(identity);x['candidates'][1]['sourceFacts']['configurations'][1]['malfunction']={'naturalAttackRoll':1}
    try:check_identity(x)
    except AssertionError:pass
    else:raise AssertionError('negative control: Hornet alternate inherited malfunction')
    x=copy.deepcopy(contract);x['pressureFixtures'][0]['attackGroupCount']=2
    try:check_contract(x)
    except AssertionError:pass
    else:raise AssertionError('negative control: physical cannon count collapsed into groups')
    x=copy.deepcopy(contract);x['phase0bSchemaFrozen']=True
    try:check_contract(x)
    except AssertionError:pass
    else:raise AssertionError('negative control: unapproved schema freeze accepted')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--repo-root',type=Path,default=BASE)
    p.add_argument('--phase2b-zip',type=Path)
    p.add_argument('--unknown-regions-pdf',type=Path)
    p.add_argument('--scum-and-villainy-pdf',type=Path)
    p.add_argument('--cp1-zip',type=Path)
    args=p.parse_args()
    identity,contract=load_data(args.repo_root)
    check_identity(identity)
    check_contract(contract)
    check_negative_controls(identity,contract)
    if args.phase2b_zip:check_phase2b_archive(args.phase2b_zip,identity)
    if args.unknown_regions_pdf:check_pdf(args.unknown_regions_pdf,PDF_HASHES['Unknown Regions'])
    if args.scum_and_villainy_pdf:check_pdf(args.scum_and_villainy_pdf,PDF_HASHES['Scum and Villainy'])
    if args.cp1_zip:
        with zipfile.ZipFile(args.cp1_zip) as z:
            assert z.testzip() is None,'CP1 zip CRC failed'
            expected={ID_FILE,CONTRACT_FILE,'docs/audits/vehicles/swse-phase2c-cp1-evidence-semantics-and-census-reconciliation.md','tools/audits/vehicles/check_vehicle_phase2c_cp1.py'}
            assert set(z.namelist())==expected,'CP1 ZIP unexpected/missing paths'
            for name in expected:
                assert z.read(name)==(args.repo_root/name).read_bytes(),f'CP1 ZIP contents drift: {name}'
    print('PASS: Phase 2C CP1; 2 source-PDF-confirmed pending census candidates; 16 schema pressure fixtures; 6 evidence states; 4 mutation-rejection controls; zero schema freezes/production/strict certificates.')
    print(f'Phase2B ZIP checked: {bool(args.phase2b_zip)}; primary PDF SHA checked: {bool(args.unknown_regions_pdf and args.scum_and_villainy_pdf)}; CP1 ZIP verified: {bool(args.cp1_zip)}.')
    print('Scope warning: validates evidence semantics and continuity, not independently exhaustive ship census or Foundry runtime producer/consumer parity.')

if __name__=='__main__':main()
