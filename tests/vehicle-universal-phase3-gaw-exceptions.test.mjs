import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const j=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const stage=j('swse-universal-phase2g-galaxy-at-war-staged.json');
const phase1=j('swse-universal-phase1g-galaxy-at-war.json');
const risk=j('swse-universal-phase3-targeted-exceptions.json');
const byKey=k=>stage.records.find(x=>x.identity.sourceEntryKey===k);
const riskBy=k=>risk.cases.find(x=>x.id===k);
const yu=byKey('gaw-yu-410-light-freighter');
const wlo=byKey('gaw-wlo-5-speeder-tank');
const gat=byKey('gaw-ground-armored-tank');
test('Galaxy at War targeted sources remain 11 source claims, not expanded by four encounter GAT units',()=>{
 assert.equal(stage.records.length,11);assert.equal(phase1.existingSpacecraft.length,5);
 assert.equal(phase1.newVehicleEntries.length,6);
 assert.equal(new Set(stage.records.map(r=>r.identity.sourceEntryKey)).size,11);
 assert.equal(stage.sourcePdfSha256,'9829bea74df5dddad946b1f5514caf1838328333979eb573f9b565334258aa4a');
 assert.equal(riskBy('P3R-GAW-GAT-SHOCK').printedFacts.encounterInstances,4);
 assert.equal(riskBy('P3R-GAW-GAT-SHOCK').printedFacts.publicationStatblockCount,1);
});
test('YU-410 original source has two printed DR labels and conflicting initiative, never inferred SR',()=>{
 assert.equal(yu.defenses.damageReduction,15);
 assert.equal(Object.hasOwn(yu.defenses,'shieldRating'),false);
 assert.equal(yu.fieldStates['/defenses/shieldRating'],'not-stated');
 assert.equal(yu.abilities.initiativePrinted,-5);
 assert.equal(yu.abilities.skills.find(x=>x.name==='Initiative').printedModifier,-2);
 assert.match(yu.exceptions.ambiguities.join(' '),/DR 15; DR 20/);
 assert.equal(riskBy('P3R-GAW-YU410').printedFacts.damageReductionLabeled2,20);
 assert.equal(riskBy('P3R-GAW-YU410').printedFacts.explicitShieldRatingLabel,false);
});
test('WLO-5 malformed new price remains ambiguous while used cost remains verified',()=>{
 assert.equal(wlo.economics.priceNew.status,'ambiguous');
 assert.equal(wlo.economics.priceNew.raw,'115,00 credits');
 assert.equal(Object.hasOwn(wlo.economics.priceNew,'amountCredits'),false);
 assert.equal(wlo.economics.priceUsed.amountCredits,65000);
 assert.equal(riskBy('P3R-GAW-WLO5').printedFacts.parsedNewCost,null);
 assert.match(wlo.text.mechanicalNotes,/optional, not stock/);
});
test('GAT Shock and Awe is a contingent standard-action Fire Effect, not an executable ranged source group',()=>{
 assert.equal(gat.challenge.cl,10);
 assert.equal(gat.armament.firingGroups.length,2);
 assert.deepEqual(gat.armament.firingGroups.map(g=>g.attackBonusPrinted),[6,6]);
 assert.equal(gat.armament.carriedPayloads[0].value,24);
 assert.match(gat.exceptions.specialRules[0].summary,/standard action, forgo all attacks/);
 assert.match(gat.exceptions.specialRules[0].summary,/6-square radius/);
 assert.match(gat.exceptions.specialRules[0].summary,/damage threshold/);
 const c=riskBy('P3R-GAW-GAT-SHOCK');
 assert.equal(c.printedFacts.forgoAllAttacks,true);
 assert.equal(c.printedFacts.extraConditionStep,-1);
 assert.equal(c.allowExecutableAttacks,false);
 for(const r of [yu,wlo,gat]){
  assert.equal(r.rules.reviewStatus,'partial-source-probe');
  assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(r.armament,'weaponMounts'),false);
  assert.ok(r.armament.firingGroups.every(g=>g.mountKeys.length===0));
 }
});
