import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  resolveCP21ApprovedPublicationReference,
  inspectCP21LegacyPackCandidate
} from '../scripts/domain/vehicles/vehicle-evidence-authority.js';
import {CP22_SOTG_REFERENCE_CATALOG as compiled} from '../scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup} from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const read=name=>JSON.parse(readFileSync(new URL('../data/audits/vehicles/'+name,import.meta.url),'utf8'));
const manifest=read('swse-sotg-cp21-owner-approved-adjudications.json');
const ledger=read('swse-phase2b-sotg-cp16-per-entry-certification-ledger.json');
const expectedStatus='APPROVED_PUBLICATION_REFERENCE_ONLY';

test('all fifteen CP21 source-book references resolve in source queue order with the original evidence intact',()=>{
  assert.equal(compiled.decisionCount,15);
  assert.equal(compiled.records.length,15);
  assert.equal(compiled.cp21ManifestSha,'98eb063d8f05c602806c708024f5108596abfd2e');
  assert.equal(compiled.cp16LedgerSha,'d08ca75b0b30e8b44896588edf3c5ce1cd335557');
  assert.ok(Object.isFrozen(compiled.records[0].originalPrintedFacts));
  assert.ok(Object.isFrozen(compiled.records[0].approvedDecision));
  for(const [i,entry] of manifest.approvedDecisions.entries()){
    const result=resolveCP21ApprovedPublicationReference(entry.sourceEntryKey);
    const original=ledger.entries[entry.cp16Index];
    assert.equal(result.status,expectedStatus,entry.decisionId);
    assert.equal(result.decisionId,entry.decisionId);
    assert.deepEqual(result.originalPrintedFacts,original.printedFacts);
    assert.deepEqual(result.originalAttackGroups,original.mountAndFiringGroups);
    assert.deepEqual(result.printedAlternatives,entry.printedAlternatives);
    assert.equal(result.mechanicalCertificationGranted,false);
    assert.equal(result.foundryStockAttackTrusted,false);
    assert.equal(result.actorMutationAllowed,false);
    assert.equal(result.productionHydrationPermitted,false);
    assert.equal(result.configurationSourceBindingVerified,false);
    for(const override of entry.fieldOverrides){
      let node=result.effectiveFacts;
      for(const segment of override.path.split('/').slice(1))node=node[segment];
      assert.deepEqual(node,override.newValue);
    }
    for(const override of entry.attackGroupOverrides){
      assert.deepEqual(result.effectiveAttackGroups[override.rowIndex][override.field],override.newValue);
    }
    assert.equal(compiled.records[i].sourceEntryKey,entry.sourceEntryKey);
  }
});

test('CP21 reference examples match approved effective interpretations without changing printed contradictions',()=>{
  const get=i=>resolveCP21ApprovedPublicationReference(manifest.approvedDecisions[i-1].sourceEntryKey);
  assert.equal(get(1).originalPrintedFacts.skills.initiative,8);
  assert.equal(get(1).effectiveFacts.skills.initiative,12);
  assert.deepEqual(get(2).effectiveAttackGroups.slice(3).map(x=>x.attackBonus),[14,12]);
  assert.equal(get(3).originalPrintedFacts.defenses.flatFootedReflex,47);
  assert.equal(get(3).effectiveFacts.defenses.flatFootedReflex,14);
  assert.equal(get(4).originalAttackGroups[1].areaPrintedWeaponRow,'4x4 starship squares');
  assert.equal(get(4).effectiveAttackGroups[1].areaPrintedWeaponRow,'3x3 starship squares');
  assert.equal(get(6).effectiveFacts.initiative,6);
  assert.equal(get(6).approvedPolicies[0].detail.printedPayloadCount,6);
  assert.equal(get(8).approvedPolicies[0].detail.ammoTypeEquivalence,'UNRESOLVED');
  assert.equal(get(9).approvedPolicies[0].detail.conditionalAttackBonus,-5);
  assert.equal(get(10).effectiveFacts.sensesPerception,6);
  assert.equal(get(11).effectiveFacts.initiative,4);
  assert.equal(get(12).effectiveAttackGroups[1].weaponLabel,'heavy proton torpedoes');
  assert.equal(get(13).originalAttackGroups[0].sourcePage,undefined);
  assert.equal(get(14).approvedPolicies[0].detail.jammer.damageAttack,false);
  assert.equal(Object.hasOwn(get(15).originalAttackGroups[0],'hardwareCount'),false);
  assert.equal(get(15).effectiveAttackGroups[0].hardwareCount,1);
});

test('consumer cannot change canonical or effective source by mutating a returned view',()=>{
  const id=manifest.approvedDecisions[0].sourceEntryKey;
  const view=resolveCP21ApprovedPublicationReference(id);
  view.effectiveFacts.skills.initiative=999;
  view.originalPrintedFacts.skills.initiative=999;
  view.approvedPolicies[0].detail.derivedInitiative=999;
  const again=resolveCP21ApprovedPublicationReference(id);
  assert.equal(again.originalPrintedFacts.skills.initiative,8);
  assert.equal(again.effectiveFacts.skills.initiative,12);
  assert.equal(again.approvedPolicies[0].detail.derivedInitiative,12);
});

test('unknown IDs and forged Foundry Actor context receive no mechanical authority',()=>{
  const unknown=resolveCP21ApprovedPublicationReference('sotg-fake-ship');
  assert.equal(unknown.status,'NOT_VERIFIED_FOR_OPERATION');
  assert.equal(unknown.foundryStockAttackTrusted,false);
  assert.equal(resolveCP21ApprovedPublicationReference({sourceEntryKey:manifest.approvedDecisions[0].sourceEntryKey}).status,'NOT_VERIFIED_FOR_OPERATION');
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
  assert.equal(resolveTrustedStockAttackGroup({system:{stockSourceEntryKey:manifest.approvedDecisions[0].sourceEntryKey}}, {id:'forged'}),null);
});

test('13 observed legacy pack records only produce advisory: no source/actor binding',()=>{
  assert.equal(compiled.legacyPackCandidates.length,13);
  for(const c of compiled.legacyPackCandidates){
    const notice=inspectCP21LegacyPackCandidate({packName:c.packName,documentId:c.documentId,name:c.name,sourceEntryKey:c.sourceEntryKey,sourceBindingVerified:true});
    assert.equal(notice.status,'LEGACY_PACK_MATCH_UNVERIFIED_SOURCE_BINDING');
    assert.equal(notice.mechanicalCertificationGranted,false);
    assert.equal(notice.actorMutationAllowed,false);
    assert.equal(notice.foundryStockAttackTrusted,false);
    assert.equal(notice.productionHydrationPermitted,false);
    assert.match(notice.message,/NOT verified/);
    assert.equal(inspectCP21LegacyPackCandidate({packName:c.packName,documentId:c.documentId,name:'Forged '+c.name}),null);
    assert.equal(inspectCP21LegacyPackCandidate({packName:'wrong',documentId:c.documentId,name:c.name}),null);
    assert.equal(inspectCP21LegacyPackCandidate({packName:c.packName,documentId:'wrong',name:c.name}),null);
  }
});

test('source warning is shown in import preview and confirmation, never imported as actor CP21 authority',()=>{
  const wizard=readFileSync(new URL('../scripts/apps/vehicle-import-wizard.js',import.meta.url),'utf8');
  const template=readFileSync(new URL('../templates/apps/vehicle-import-wizard.hbs',import.meta.url),'utf8');
  const importer=readFileSync(new URL('../scripts/engine/import/vehicle-import-engine.js',import.meta.url),'utf8');
  assert.match(wizard,/inspectCP21LegacyPackCandidate/);
  assert.match(wizard,/cp21Advisory/);
  assert.equal((template.match(/preview\.cp21Advisory/g)||[]).length,4);
  assert.doesNotMatch(importer,/cp21|CP21/);
  assert.doesNotMatch(wizard,/applyApprovedCP21|setCP21Trusted|cp21StockAttackGranted/);
});

test('generated catalogue enforces a single compilation source and no competing calculations',()=>{
  const files=['scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js','scripts/domain/vehicles/vehicle-cp22-source-view.js','scripts/domain/vehicles/vehicle-evidence-authority.js'];
  const contents=files.map(p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'));
  assert.match(contents[0],/GENERATED ONLY/);
  assert.match(contents[1],/APPROVED_PUBLICATION_REFERENCE_ONLY/);
  assert.match(contents[2],/export \{resolveCP21ApprovedPublicationReference,inspectCP21LegacyPackCandidate\}/);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
});
