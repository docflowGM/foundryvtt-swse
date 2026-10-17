#!/usr/bin/env python3
"""The Unknown Regions Phase2B 12-identity book source review gate (not mechanical certification)."""
import argparse, json, pathlib, hashlib
BOOK='Unknown Regions'
PDF_SHA='43a69aa7974ed4aeb52b57ba28b3466c2ed9f54bd73fe5d5295b744bfe1bd55b'
PHASE_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
EXPECTED={'ur-hoersch-kessel-vaya-class-scout-ship': ['Hoersch-Kessel Vaya-class Scout Ship', 59, 60, 59], 'ur-jumpmaster-5000-scout-ship': ['JumpMaster 5000 Scout Ship', 52, 53, 52], 'ur-killik-dartship': ['Killik Dartship', 133, 134, 133], 'ur-kuat-drive-yards-star-seeder-class-colony-ship': ['Kuat Drive Yards Star Seeder-class Colony Ship', 58, 59, 58], 'ur-loronar-corporation-skyblind-recon-ship': ['Loronar Corporation SkyBlind Recon Ship', 57, 58, 57], 'ur-mesens-corporation-sct-scout-craft': ['Mesens Corporation SCT Scout Craft', 56, 57, 56], 'ur-mrx-br-pacifier-combat-contact-vessel': ['MRX-BR Pacifier Combat/Contact Vessel', 55, 56, 55], 'ur-royal-fortune-light-clipper': ['Royal Fortune Light Clipper', 151, 152, 151], 'ur-sienar-fleet-systems-mu-2-model-2-shuttle': ['Sienar Fleet Systems Mu-2 Model 2 Shuttle', 55, 56, 55], 'ur-sorosuub-drexl-class-planetary-defender-starfighter': ['SoroSuub Drexl-class "Planetary Defender" Starfighter', 52, 53, 52], 'ur-sorosuub-preybird-class-starfighter': ['SoroSuub Preybird-class Starfighter', 56, 57, 56], 'ur-surfeik-cruiser': ['Surfeik Cruiser', 154, 155, 154]}
FILES={'ledger': 'data/audits/vehicles/swse-phase2b-unknown-regions-book-source-closure-ledger.json', 'backlog': 'data/audits/vehicles/swse-phase2b-unknown-regions-book-source-closure-mount-backlog.json', 'discovery': 'data/audits/vehicles/swse-phase2c-unknown-regions-book-schema-discovery.json', 'validator': 'tools/audits/vehicles/check_unknown_regions_phase2b_book.py', 'report': 'docs/audits/vehicles/swse-phase2b-unknown-regions-book-source-closure.md'}
STATES={'PDF_VERIFIED','SOURCE_SILENT_CONFIRMED','SOURCE_CONFLICT_PRESERVED','SCHEMA_INCOMPATIBLE','NOT_REVIEWED'}
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--repo-root',type=pathlib.Path,default=pathlib.Path('.'))
    ap.add_argument('--source-pdf',type=pathlib.Path)
    ap.add_argument('--phase1',type=pathlib.Path)
    ap.add_argument('--require-phase1',action='store_true')
    a=ap.parse_args()
    if a.require_phase1 and not a.phase1: ap.error('--require-phase1 requires --phase1')
    read=lambda key:json.loads((a.repo_root/FILES[key]).read_text(encoding='utf8'))
    L,B,D=read('ledger'),read('backlog'),read('discovery')
    T=(a.repo_root/FILES['report']).read_text(encoding='utf8')
    assert L['sourceBook']==B['sourceBook']==D['sourceBook']==BOOK
    assert L['sourcePdfSha256']==B['sourcePdfSha256']==PDF_SHA
    assert L['phase1ProvenanceBlobSha']==PHASE_SHA
    assert L['counts']==B['counts']
    c=L['counts'];assert c['publicationShipClaims']==12 and c['primaryPdfCloseReads']==12
    assert c['primaryPdfCloseReadsOutstanding']==0
    assert c['strictCertificatesOutstanding']==12 and c['strictFullFieldAndPhysicalWeaponMountCertificates']==0
    assert c['phase1UncensusedShipCandidateCount']==1
    assert c['phase1PageMappingDiscrepancyCount']==0
    assert c['sourceConflictRecordCount']==2
    assert len(L['entries'])==len(B['records'])==len(EXPECTED)==12
    assert len(set(x['sourceEntryKey'] for x in L['entries']))==12
    assert [e['sourceEntryKey'] for e in L['entries']]==[b['sourceEntryKey'] for b in B['records']]==list(EXPECTED)
    rows=conflicts=0
    for e,b in zip(L['entries'],B['records']):
        k=e['sourceEntryKey'];exp=EXPECTED[k]
        assert [e['printedName'],e['printedStatblockStartPage'],e['phase1PdfPhysicalPage'],e['phase1SectionStartPage']]==exp,k
        assert e['endPageReviewStatus']=='PDF_VERIFIED' and e['sourceEvidence'] and e['printedFacts'],k
        assert set(e['fieldGroups'])==set(L['fieldGroups']) and set(e['fieldGroups'].values())<=STATES,k
        assert e['fullFieldCertified'] is False and e['fullWeaponMountReconciled'] is False,k
        assert e['weaponMountReconciliationStatus']=='PDF_VERIFIED_PARTIAL',k
        assert len(e['mountAndFiringGroups'])==len(b['weaponAttackGroups'])>0,k
        for m,z in zip(e['mountAndFiringGroups'],b['weaponAttackGroups']):
            assert m['weaponLabel']==z['label'] and m['attackBonus']==z['attackBonus']
            assert m['hardwareCount']==m['firingArc']==m['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
            assert z['physicalCount']==z['firingArc']==z['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
        assert b['strictCertified'] is False and b['reviewStatus']=='PDF_VERIFIED'
        assert e['sourceFieldStates']['weaponFiringArc']==e['sourceFieldStates']['batteryComposition']=='SOURCE_SILENT_CONFIRMED'
        rows+=len(e['mountAndFiringGroups']);conflicts+=len(e['sourceConflicts'])
    assert rows==c['attackGroupRowsReviewed']==22
    assert conflicts==c['sourceConflictRecordCount']==2
    assert len(D['discoveries'])==D['counts']['discoveryCases']
    assert D['counts']['bookScopeReviewed']==12 and D['counts']['uncensusedShipCandidateCount']==1
    assert D['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION' and D['schemaFrozen'] is False
    ids=[d['id'] for d in D['discoveries']];assert len(ids)==len(set(ids))
    extras=[x for x in D['discoveries'] if x['category']=='PHASE1_IDENTITY_RECONCILIATION_REQUIRED']
    assert len(extras)==1 and extras[0]['ship']=='Uulshos Manufacturing Deep-X Explorer'
    assert extras[0]['sourceEntryKey'] is None and extras[0]['sourcePrintedPages']==[51]
    assert L['bookCloseout']['sourceReviewCompleteForPhase1Identities'] is True
    assert L['bookCloseout']['strictMechanicalCertificationComplete'] is False
    assert '12/12' in T and 'Deep-X Explorer' in T and 'NOT' in T
    if a.source_pdf:
        assert hashlib.sha256(a.source_pdf.read_bytes()).hexdigest()==PDF_SHA,'Source PDF SHA256 differs'
    if a.phase1:
        p=json.loads(a.phase1.read_text(encoding='utf8'))
        b=next(x for x in p['books'] if x['book']==BOOK)
        assert b['enteredCount']==12
        mapping={e['sourceEntryKey']:[e['shipName'],e['printedStatblockPage'],e['pdfPhysicalPage'],e['sectionStartPage']] for e in b['entries']}
        assert mapping==EXPECTED,'Phase1 immutable baseline mismatch'
    print(f'PASS: {BOOK} 12/12 original identities, {rows} detailed attack rows, {conflicts} preserved conflicts, {len(D["discoveries"])} discoveries, 1 uncensused source-identity candidate; strict certificates 0/12')
if __name__=='__main__':main()
