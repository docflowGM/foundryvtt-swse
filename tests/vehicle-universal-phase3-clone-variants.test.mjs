import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const j=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const stage=j('swse-universal-phase2c-clone-wars-staged.json'),risk=j('swse-universal-phase3-targeted-exceptions.json');
const sph=stage.records.find(x=>x.identity.sourceEntryKey==='cw-self-propelled-heavy-artillery');
const tx=stage.records.find(x=>x.identity.sourceEntryKey==='cw-tx-130t-saber-class-fighter-tank');
const riskCase=id=>risk.cases.find(x=>x.id===id);
test('Clone Wars 67 publication claims unchanged and source PDF provenance verified',()=>{
 assert.equal(stage.records.length,67);assert.equal(new Set(stage.records.map(x=>x.identity.sourceEntryKey)).size,67);
 assert.equal(stage.sourcePdfSha256,'3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6');
 assert.equal(stage.summary.publicationRecords,67);
 assert.equal(stage.productionPacksChanged,false);
 assert.equal(stage.generatedActorsChanged,false);
});
test('SPHA one identity, five exclusive primary variants and common support group never installed as a six-primary weapon set',()=>{
 assert.ok(sph);assert.equal(sph.challenge.cl,16);assert.equal(sph.publication.page,168);
 assert.equal(sph.armament.firingGroups.length,6);
 assert.deepEqual(sph.armament.firingGroups.slice(0,5).map(x=>x.attackBonusPrinted),[7,7,7,7,7]);
 assert.equal(sph.armament.firingGroups[5].attackBonusPrinted,2);
 assert.equal(sph.armament.carriedPayloads[0].value,48);
 assert.match(sph.combat.rangedAttackLine,/SPHA-T.*OR SPHA-I.*OR SPHA-V.*OR SPHA-C.*OR SPHA-M/);
 assert.match(sph.text.sourceNotes,/mutually exclusive primary SPHA-T\/I\/V\/C\/M/);
 assert.equal(riskCase('P3R-CW-SPHA').printedFacts.variantKeys.length,5);
});
test('Clone Wars TX-130T preserves two alternate source Ranged sequences and second-summary/detail conflict',()=>{
 assert.ok(tx);assert.equal(tx.challenge.cl,7);assert.equal(tx.publication.page,169);
 assert.match(tx.combat.rangedAttackLine,/laser cannons \+3 AND/);
 assert.match(tx.combat.rangedAttackLine,/OR Ranged laser cannons \+1 AND/);
 assert.match(tx.combat.rangedAttackLine,/composite beam cannon \+1/);
 assert.equal(tx.armament.firingGroups[0].attackBonusPrinted,3);
 assert.equal(tx.armament.firingGroups.length,4);
 assert.equal(tx.crew.crewCount,3);
 assert.equal(tx.armament.carriedPayloads[0].value,16);
 assert.match(tx.armament.notes,/source contradiction/);
 assert.match(tx.exceptions.specialRules[0].summary,/not default stock/);
 assert.equal(riskCase('P3R-CW-TX130').printedFacts.secondRangedPilotLaserBonus,1);
});
test('Source interpretations do not promote mechanical attack execution or bypass strict mount trust',()=>{
 for(const item of [sph,tx]){
  assert.equal(item.rules.reviewStatus,'partial-source-probe');
  assert.equal(item.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(item.armament,'weaponMounts'),false);
  assert.ok(item.armament.firingGroups.every(x=>x.mountKeys?.length===0));
 }
 for(const k of ['P3R-CW-SPHA','P3R-CW-TX130'])assert.equal(riskCase(k).allowExecutableAttacks,false);
});
